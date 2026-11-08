#!/usr/bin/env node
/**
 * One command for a v2 episode. Runs every stage in order, skips stages whose inputs did
 * not change, and stops at the first failure with the file to fix and how.
 *
 *   node scripts/v2/make_episode.mjs <vid_id>                    run / resume
 *   node scripts/v2/make_episode.mjs <vid_id> --status           where is it, what failed last
 *   node scripts/v2/make_episode.mjs <vid_id> --from=storyboard  redo from a stage on
 *   node scripts/v2/make_episode.mjs <vid_id> --until=mix        stop after a stage
 *   node scripts/v2/make_episode.mjs <vid_id> --only=review      one stage
 *   node scripts/v2/make_episode.mjs <vid_id> --init --slug=<slug> [--channel=kausalmedia] [--series="POV:"]
 *
 * Stages: script lint narration music storyboard assets thumbnail crops mix scaffold render qa review
 * Exit codes: 0 done (or stopped at --until), 1 a stage failed, 2 usage error.
 * State: production/<id>/pipeline_state.json. Long runs: start in the background and poll --status.
 */
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkCrops, checkJargon, checkNumbers, checkSchema, checkStoryboard, loadEpisode } from './lint_episode.mjs';

const MC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = path.dirname(MC);
const PY = path.join(REPO, '.venv', 'bin', 'python');
const REGISTRY = path.join(REPO, 'projects', 'projects_config.json');

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const opt = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const flag = (k) => args.includes(`--${k}`);
if (!id || !/^vid_\d{8}_\d{3}$/.test(id)) {
  console.error('usage: make_episode.mjs <vid_YYYYMMDD_NNN> [--status|--init|--from=|--until=|--only=]');
  process.exit(2);
}
const PROD = path.join(MC, 'production', id);
const P = (f) => path.join(PROD, f);
const STATE = P('pipeline_state.json');
const rel = (f) => path.relative(REPO, f);

// ---------------------------------------------------------------- helpers
function sha(...parts) {
  const h = crypto.createHash('sha256');
  for (const p of parts) {
    if (typeof p === 'string' && p.startsWith('file:')) {
      const f = p.slice(5);
      h.update(f);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        for (const x of fs.readdirSync(f).sort()) h.update(sha(`file:${path.join(f, x)}`));
      } else h.update(fs.existsSync(f) ? fs.readFileSync(f) : 'MISSING');
    } else h.update(JSON.stringify(p) ?? 'undefined');
  }
  return h.digest('hex').slice(0, 16);
}
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const loadState = () => readJson(STATE, { stages: {} });
function saveState(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n'); }
function registry() { return readJson(REGISTRY, { projects: {} }); }
function entry() { return Object.values(registry().projects || {}).find((p) => p.id === id) || null; }

function run(cmd, cmdArgs, cwd = MC) {
  console.log(`  $ ${[cmd, ...cmdArgs].map((x) => (/\s/.test(x) ? JSON.stringify(x) : x)).join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit' });
  return r.status === 0 ? null : `command exited with ${r.status ?? r.signal}`;
}
// Google Drive/Sheets mirror (scripts/v2/google_workspace.py). Only after the one-time sign-in; never fails a run.
const GOOGLE_ON = fs.existsSync(path.join(process.env.HOME || '', '.config', 'ainimate', 'google_token.json'));
function google(...a) {
  if (!GOOGLE_ON) return;
  const r = spawnSync(PY, ['scripts/v2/google_workspace.py', ...a], { cwd: MC, stdio: 'inherit', timeout: 15 * 60 * 1000 });
  if (r.status !== 0) console.log(`  [google] ${a[0]} did not complete (logged locally, retried next run)`);
}

const check = (results) => {
  const bad = results.filter((r) => !r.passed);
  for (const r of results) console.log(`  ${r.passed ? 'PASS' : 'FAIL'} ${r.name}: ${r.passed ? r.detail : ''}`);
  return bad.length ? bad.flatMap((r) => r.items.length ? r.items : [r.detail]) : null;
};
const script = () => readJson(P('script.json'), {});
const chapterMoods = () => (script().chapters || []).map((c) => c.music);

// ---------------------------------------------------------------- stages
// inputs(): what the stage depends on (hashed). outputs: files that must exist to count as done.
// always: cheap checks that run every time. fix: who edits what when the stage fails.
const STAGES = [
  {
    name: 'script', fix: `Edit ${rel(P('script_source.txt'))} at the lines named above, then rerun.`,
    inputs: () => [`file:${P('script_source.txt')}`, entry()?.voice],
    outputs: [P('script.json')],
    run: () => run('node', ['scripts/v2/compile_script.mjs', id]),
  },
  {
    name: 'lint', always: true,
    fix: `Numbers: every figure on screen must be in ${rel(P('numbers.json'))} ("display" or "aliases"); add it there with its source, or change the script. Jargon: replace the word with plain Indonesian in script_source.txt. Schema: follow the "fix:" in each line.`,
    run: () => { const ep = loadEpisode(id); return check([checkSchema(ep), checkNumbers(ep), checkJargon(ep)]); },
  },
  {
    name: 'narration', costly: true,
    fix: 'TTS or alignment failed. "TTS stopped" = the free Audio keys hit their limit (3 RPM, 10 RPD per key per model): wait until the time printed and rerun; never add or swap keys. Transient API errors: rerun. "anchor match rate" low: the [display|spoken] tokens do not match what was read; check spelled-out numbers in script_source.txt.',
    inputs: () => { const s = script(); return [s.voice, s.tts_style_prompt, (s.chapters || []).map((c) => c.sentences)]; },
    outputs: [P('timings.json'), path.join(MC, 'public/audio', `${id}_narration.wav`)],
    run: () => run(PY, ['scripts/v2/synth_narration.py', id]),
  },
  {
    name: 'music', fix: 'No licensed track for a mood, or a track without its .license.txt. Add royalty-free tracks to motion-canvas/music_library/<mood>/ as described in motion-canvas/music_library/README.md, then rerun.',
    inputs: () => [...new Set(chapterMoods())],
    outputs: () => [...new Set(chapterMoods())].map((m) => path.join(MC, 'public/audio', `${id}_music_${m}.wav`)),
    run: () => run(PY, ['scripts/v2/generate_music.py', id]),
  },
  {
    name: 'storyboard', always: true,
    fix: `Edit ${rel(P('storyboard.json'))} as each line says (contract: docs/pipeline_v2_contract.md). Images referenced there must be in assets_manifest.json.`,
    run: () => {
      if (!fs.existsSync(P('storyboard.json'))) return [`${rel(P('storyboard.json'))} missing: write it (shots per chapter, see docs/pipeline_v2_contract.md)`];
      const ep = loadEpisode(id); return check([checkSchema(ep), checkStoryboard(ep)]);
    },
  },
  {
    name: 'assets', always: true, costly: true,
    fix: `Asset-director job: for each failed image, rewrite its "prompt" in ${rel(P('assets_manifest.json'))} (follow the QA defects listed; simplify the scene, fewer people, subject large and central), then rerun. Full history: ${rel(P('asset_qa.json'))}.`,
    run: () => {
      if (!fs.existsSync(P('assets_manifest.json'))) return [`${rel(P('assets_manifest.json'))} missing: write it (see .agents/agents/asset-director/agent.md)`];
      const bad = check([checkSchema(loadEpisode(id))]);
      return bad || run(PY, ['scripts/v2/generate_assets.py', '--id', id]);
    },
  },
  {
    name: 'thumbnail', costly: true,
    fix: `Change "@thumbnail_scene" (and maybe "@thumbnail_text") in script_source.txt, rerun with --from=script.`,
    // 3 title + hook options (Sonnet, checked like the script), then one thumbnail per hook
    inputs: () => [script().title, script().thumbnail, `file:${P('publish_options.json')}`],
    outputs: [1, 2, 3].map((n) => path.join(MC, 'public/assets', id, `thumbnail_option_${n}.jpg`)),
    done: () => readJson(P('asset_qa.json'), {})?.thumbnail?.pass === true && fs.existsSync(P('publish_options.json')),
    run: () => run(PY, ['scripts/v2/publish_options.py', id]) || run(PY, ['scripts/v2/generate_thumbnail.py', id]),
  },
  {
    name: 'crops', always: true,
    fix: 'A side card would cut its subject. Do what each line says (regenerate with a central subject, or use mode "full").',
    run: () => check([checkCrops(loadEpisode(id))]),
  },
  {
    name: 'mix', fix: 'Mixing failed; read the error above (usually a missing music or narration file: rerun from narration/music).',
    inputs: () => [`file:${P('timings.json')}`, `file:${P('storyboard.json')}`, `file:${path.join(MC, 'public/audio', `${id}_narration.wav`)}`,
      ...[...new Set(chapterMoods())].map((m) => `file:${path.join(MC, 'public/audio', `${id}_music_${m}.wav`)}`)],
    outputs: [P('final_mix.wav')],
    run: () => run(PY, ['scripts/v2/mix_audio.py', id]),
  },
  { name: 'scaffold', always: true, fix: 'Scaffold failed; check storyboard.json parses.', run: () => run('node', ['scripts/v2/scaffold_project.mjs', id]) },
  {
    name: 'render',
    fix: 'Render failed. Read logs above. Out of memory: close other browsers and rerun (finished chapters are cached). Never delete .cache by hand.',
    inputs: () => [`file:${P('storyboard.json')}`, `file:${P('timings.json')}`, `file:${P('final_mix.wav')}`, `file:${P('image_focus.json')}`,
      `file:${path.join(MC, 'src/shared/v2')}`, `file:${path.join(MC, 'public/assets', id)}`],
    outputs: () => { const e = entry(); return e ? [path.join(REPO, 'projects', e.dirName, 'video_16x9.mp4')] : ['(no registry entry)']; },
    run: () => { const s = script(); return run('node', ['render.mjs', `--project=${id}`, `--channel=${s.channel}`, `--slug=${s.slug}`, '--aspects=16x9']); },
  },
  {
    name: 'qa', always: true,
    fix: 'Open the failing check above; the detail says which file. Fix it, then rerun with --from=<the stage that writes that file>.',
    run: () => run('node', ['scripts/qa_verify.mjs', id, '--aspects=16x9']),
  },
  {
    name: 'review', // never adopted: it must look at the video that was just rendered
    fix: `Each confirmed issue above has a "fix:" line and a frame in ${rel(P('review_frames'))}/. Apply it, then rerun with --from=storyboard (or --from=assets for image problems).`,
    inputs: () => { const e = entry(); return e ? [`file:${path.join(REPO, 'projects', e.dirName, 'video_16x9.mp4')}`] : []; },
    outputs: [P('frame_review.json')],
    done: () => readJson(P('frame_review.json'), {})?.pass === true,
    run: () => run(PY, ['scripts/v2/review_frames.py', id]),
  },
];
const NAMES = STAGES.map((s) => s.name);

// ---------------------------------------------------------------- init
function init() {
  const slug = opt('slug');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { console.error('--init needs --slug=lowercase-words-with-dashes'); process.exit(2); }
  const channel = opt('channel') || 'kausalmedia';
  const reg = registry();
  if (Object.values(reg.projects).some((p) => p.id === id)) { console.error(`${id} already registered; pick the next free number`); process.exit(2); }
  if (fs.existsSync(PROD)) { console.error(`${rel(PROD)} already exists; pick the next free number`); process.exit(2); }
  const date = `${id.slice(4, 8)}-${id.slice(8, 10)}-${id.slice(10, 12)}`;
  const dirName = `${channel}_${id.slice(4, 12)}_${slug}`;
  // copy voice/style from the newest v2 project so every episode uses the same locked voice
  const base = Object.values(reg.projects).filter((p) => p.pipeline === 'v2').sort((a, b) => (a.id < b.id ? 1 : -1))[0];
  if (!base) { console.error('no v2 project in projects_config.json to copy the voice from'); process.exit(2); }
  reg.projects[dirName] = {
    id, dirName, channel, series: opt('series') || base.series, date, slug,
    title: 'TODO', subtitle: '', topicSummary: '', coreAngle: '',
    voice: base.voice, style: base.style, prompts: base.prompts,
    paths: {
      productionDir: `motion-canvas/production/${id}`, scenesDir: `motion-canvas/src/scenes/${id}`,
      assetsDir: `motion-canvas/public/assets/${id}`, audioFile: `motion-canvas/public/audio/${id}_narration.wav`,
      outputDir: `projects/${dirName}`,
    },
    aspects: ['16:9'], pipeline: 'v2',
  };
  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + '\n');
  fs.mkdirSync(PROD, { recursive: true });
  fs.writeFileSync(P('research_dossier.md'), `# ${id} research dossier\n\nEvery claim: source URL, date, what it says. Mark estimates as estimates.\n`);
  fs.writeFileSync(P('numbers.json'), JSON.stringify({ video_id: id, figures: {} }, null, 2) + '\n');
  fs.writeFileSync(P('script_source.txt'), `@channel: ${channel}
@series: ${opt('series') || base.series}
@slug: ${slug}
@title: TODO
@subtitle: TODO
@description: TODO
@thumbnail_text: TODO
@thumbnail_scene: TODO

# ch01 | TODO judul bab | tense
TODO kalimat pertama. Angka selalu ditulis sebagai token: [Rp45 ribu|empat puluh lima ribu rupiah].
`);
  console.log(`[init] registered ${dirName} in projects_config.json and created ${rel(PROD)}/ with
  research_dossier.md, numbers.json, script_source.txt (fill the TODOs).
  Next: research -> numbers.json -> script_source.txt, then: node scripts/v2/make_episode.mjs ${id}`);
}

// ---------------------------------------------------------------- status
function status() {
  const st = loadState();
  console.log(`[status] ${id}${st.running ? ` RUNNING stage "${st.running}" since ${st.runningSince}` : ''}`);
  for (const n of NAMES) {
    const s = st.stages[n];
    console.log(`  ${n.padEnd(11)} ${s ? `${s.status.padEnd(7)} ${s.at}` : 'never run'}`);
  }
  if (st.failed) {
    console.log(`\nLAST FAILURE at stage "${st.failed.stage}":`);
    for (const p of st.failed.problems.slice(0, 15)) console.log(`  - ${p}`);
    console.log(`FIX: ${st.failed.fix}`);
  }
}

// ---------------------------------------------------------------- main
if (flag('init')) { init(); process.exit(0); }
if (!fs.existsSync(PROD)) { console.error(`${rel(PROD)} missing. Start with --init --slug=...`); process.exit(2); }
if (flag('status')) { status(); process.exit(0); }

const only = opt('only'), from = opt('from'), until = opt('until');
for (const n of [only, from, until]) if (n && !NAMES.includes(n)) { console.error(`unknown stage "${n}"; stages: ${NAMES.join(' ')}`); process.exit(2); }
const st = loadState();
let started = !from;
for (const stage of STAGES) {
  if (only && stage.name !== only) continue;
  if (stage.name === from) started = true;
  if (!started) continue;
  const forced = (from && stage.name === from) || only === stage.name;
  const outs = typeof stage.outputs === 'function' ? stage.outputs() : stage.outputs || [];
  const have = outs.every((f) => fs.existsSync(f)) && (!stage.done || stage.done());
  const hash = stage.inputs ? sha(...stage.inputs()) : null;
  const prev = st.stages[stage.name];
  if (!stage.always && !forced && have) {
    if (prev?.hash === hash) { console.log(`[${stage.name}] up to date`); if (stage.name === until) break; continue; }
    if (!prev && stage.costly) { // finished before this runner existed: adopt instead of paying again
      st.stages[stage.name] = { status: 'adopted', hash, at: new Date().toISOString() };
      saveState(st);
      console.log(`[${stage.name}] existing output adopted (rerun with --from=${stage.name} to redo)`);
      if (stage.name === until) break;
      continue;
    }
  }
  console.log(`\n[${stage.name}] running`);
  st.running = stage.name; st.runningSince = new Date().toISOString(); saveState(st);
  const t0 = Date.now();
  let problems = stage.run();
  if (typeof problems === 'string') problems = [problems];
  const secs = String(Math.round((Date.now() - t0) / 1000));
  delete st.running; delete st.runningSince;
  google('event', id, stage.name, problems && problems.length ? 'FAILED' : 'ok',
    problems && problems.length ? problems.slice(0, 3).join(' | ') : '', secs);
  if (problems && problems.length) {
    st.stages[stage.name] = { status: 'FAILED', hash: null, at: new Date().toISOString() };
    st.failed = { stage: stage.name, problems, fix: stage.fix };
    saveState(st);
    console.log(`\n=== STOPPED at stage "${stage.name}" ===`);
    for (const p of problems.slice(0, 25)) console.log(`  - ${p}`);
    if (problems.length > 25) console.log(`  ... ${problems.length - 25} more (see ${rel(STATE)})`);
    console.log(`FIX: ${stage.fix}`);
    console.log(`THEN: node scripts/v2/make_episode.mjs ${id}`);
    google('push', id);
    process.exit(1);
  }
  st.stages[stage.name] = { status: 'ok', hash: stage.inputs ? sha(...stage.inputs()) : null, at: new Date().toISOString() };
  delete st.failed;
  saveState(st);
  if (stage.name === until) break;
}
console.log(`\n[done] ${id}${until ? ` (stopped after ${until})` : ''}`);
if (!until && fs.existsSync(P('publish_options.json'))) run(PY, ['scripts/v2/publish_options.py', id, '--sheet']);
google('push', id); // Docs (script, research, log), packaging, QA and the video in the episode's Drive folder
