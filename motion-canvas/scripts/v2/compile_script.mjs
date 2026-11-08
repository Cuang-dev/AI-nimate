#!/usr/bin/env node
/**
 * Compile production/<id>/script_source.txt into production/<id>/script.json.
 *
 *   node scripts/v2/compile_script.mjs <vid_id>
 *
 * script_source.txt format (see docs/pipeline_v2_contract.md):
 *   @title: POV: ...                 header lines, "@key: value" (keys in HEADER_KEYS)
 *   # ch01 | Chapter title | tense   chapter line: id | title | music mood (tense|light|warm)
 *   One sentence per line.           optional " | 0.6" at the end = extra pause (seconds)
 * Blank lines are ignored. Sentence ids are generated (s01_01, s01_02, ...).
 * Voice, TTS model and style prompt always come from projects/projects_config.json (locked per channel).
 * Header keys missing from the file keep their value from an existing script.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = path.join(MC, '..', 'projects', 'projects_config.json');
export const HEADER_KEYS = ['channel', 'series', 'slug', 'title', 'subtitle', 'description',
  'thumbnail_text', 'thumbnail_scene'];
// Voice, model and TTS style prompt are channel-level (projects_config.json), never per episode,
// so every video sounds the same.
export const MOODS = ['tense', 'light', 'warm'];

export function registryEntry(id) {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  return Object.values(reg.projects || {}).find((p) => p.id === id) || null;
}

/** Returns { script, errors[] }. errors are "line N: problem. fix: ..." strings. */
export function compile(id, sourceText, existing = {}) {
  const errors = [];
  const head = {};
  const chapters = [];
  let ch = null;
  sourceText.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const where = `script_source.txt line ${i + 1}`;
    if (!line) return;
    if (line.startsWith('@')) {
      const m = line.match(/^@([a-z_]+):\s*(.*)$/);
      if (!m || !HEADER_KEYS.includes(m[1])) {
        errors.push(`${where}: unknown header "${line.slice(0, 40)}". fix: use one of @${HEADER_KEYS.join(', @')}`);
      } else head[m[1]] = m[2].trim();
      return;
    }
    if (line.startsWith('#')) {
      const parts = line.replace(/^#\s*/, '').split('|').map((s) => s.trim());
      const [cid, title, mood] = parts;
      if (parts.length !== 3 || !/^ch\d{2}$/.test(cid) || !title || !MOODS.includes(mood)) {
        errors.push(`${where}: bad chapter line "${line.slice(0, 60)}". fix: write "# ch01 | Judul bab | tense" (mood: ${MOODS.join('|')})`);
        return;
      }
      const want = `ch${String(chapters.length + 1).padStart(2, '0')}`;
      if (cid !== want) errors.push(`${where}: chapter id ${cid} out of order. fix: rename it to ${want}`);
      ch = { id: cid, title, music: mood, sentences: [] };
      chapters.push(ch);
      return;
    }
    if (!ch) {
      errors.push(`${where}: sentence before the first chapter line. fix: add "# ch01 | Judul | tense" above it`);
      return;
    }
    let text = line;
    let pause;
    const pm = line.match(/^(.*?)\s+\|\s*(\d+(?:\.\d+)?)$/);
    if (pm) { text = pm[1].trim(); pause = Number(pm[2]); }
    if (pause !== undefined && !(pause > 0 && pause <= 3)) {
      errors.push(`${where}: pause ${pause} out of range. fix: use a number between 0.1 and 3`);
    }
    const open = (text.match(/\[/g) || []).length, close = (text.match(/\]/g) || []).length;
    const tokens = text.match(/\[[^\]]*\]/g) || [];
    if (open !== close || tokens.some((t) => !/^\[[^|\]]+\|[^|\]]+\]$/.test(t))) {
      errors.push(`${where}: broken [display|spoken] token. fix: write it like [Rp45 ribu|empat puluh lima ribu rupiah]`);
    }
    if (/\|/.test(text.replace(/\[[^\]]*\]/g, ''))) {
      errors.push(`${where}: stray "|" outside brackets. fix: only "[a|b]" tokens and a final " | 0.5" pause may use "|"`);
    }
    const sid = `s${ch.id.slice(2)}_${String(ch.sentences.length + 1).padStart(2, '0')}`;
    const s = { id: sid, text };
    if (pause !== undefined) s.pause_after = pause;
    ch.sentences.push(s);
  });
  if (!chapters.length) errors.push('script_source.txt: no chapters. fix: add "# ch01 | Judul | tense" and sentences below it');
  chapters.forEach((c) => {
    if (!c.sentences.length) errors.push(`${c.id}: chapter has no sentences. fix: add sentences or remove the chapter line`);
  });

  const reg = registryEntry(id);
  if (!reg) errors.push(`projects_config.json has no project with id ${id}. fix: run "node scripts/v2/make_episode.mjs ${id} --init ..." first`);
  const pick = (k, fallback) => head[k] ?? fallback;
  const thumb = existing.thumbnail || {};
  const script = {
    video_id: id,
    channel: pick('channel', existing.channel ?? reg?.channel),
    series: pick('series', existing.series ?? reg?.series),
    slug: pick('slug', existing.slug ?? reg?.slug),
    title: pick('title', existing.title),
    subtitle: pick('subtitle', existing.subtitle),
    description: pick('description', existing.description),
    language: 'ID',
    aspect_ratios: existing.aspect_ratios || ['16x9'],
    voice: reg?.voice ? { model: reg.voice.model, voiceName: reg.voice.voiceName } : existing.voice,
    tts_style_prompt: reg?.voice?.ttsStylePrompt ?? existing.tts_style_prompt,
    thumbnail: { text: pick('thumbnail_text', thumb.text), scene: pick('thumbnail_scene', thumb.scene) },
    chapters,
  };
  return { script, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (!id) { console.error('usage: compile_script.mjs <vid_id>'); process.exit(2); }
  const dir = path.join(MC, 'production', id);
  const src = path.join(dir, 'script_source.txt');
  if (!fs.existsSync(src)) { console.error(`missing ${src}`); process.exit(2); }
  const outPath = path.join(dir, 'script.json');
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const { script, errors } = compile(id, fs.readFileSync(src, 'utf8'), existing);
  if (errors.length) {
    console.error(`[compile] ${errors.length} problem(s), script.json NOT written:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  fs.writeFileSync(outPath, JSON.stringify(script, null, 2) + '\n');
  const n = script.chapters.reduce((a, c) => a + c.sentences.length, 0);
  console.log(`[compile] wrote ${outPath}: ${script.chapters.length} chapters, ${n} sentences`);
}
