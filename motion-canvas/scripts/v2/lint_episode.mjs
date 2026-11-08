#!/usr/bin/env node
/**
 * v2 episode lint: numbers, jargon, storyboard. No video needed.
 *
 *   node scripts/v2/lint_episode.mjs <vid_id | path/to/dir-with-script.json>
 *
 * Imported by scripts/qa_verify.mjs. See docs/pipeline_v2_contract.md.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MC_DIR = path.resolve(__dirname, '..', '..');

export const BANNED_JARGON = [
  'capex', 'opex', 'margin', 'roi', 'bep', 'cash cow', 'loss leader',
  'high churn', 'revenue', 'leakage', 'f&b', 'hpp', 'unit economics',
  'gross', 'net profit',
]; // "omzet" is deliberately allowed.

// ---------------------------------------------------------------------------
// Tokenising: "[display|spoken]" is ONE display word even when display has spaces.
// ---------------------------------------------------------------------------
export function splitTokens(text) {
  const raw = [];
  let cur = '';
  let depth = 0;
  for (const ch of String(text || '')) {
    if (ch === '[') depth++;
    if (ch === ']') depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (cur) raw.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) raw.push(cur);
  return raw.map((t) => ({
    display: t.replace(/\[([^|\]]*)\|[^\]]*\]/g, '$1'),
    spoken: t.replace(/\[[^|\]]*\|([^\]]*)\]/g, '$1'),
  }));
}
export const displayTokens = (text) => splitTokens(text).map((t) => t.display);
export const displayText = (text) => displayTokens(text).join(' ');
export const spokenText = (text) => splitTokens(text).map((t) => t.spoken).join(' ');

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { __error: e.message }; }
}

export function loadEpisode(arg) {
  let dir;
  if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) dir = path.resolve(arg);
  else dir = path.join(MC_DIR, 'production', arg);
  const script = readJson(path.join(dir, 'script.json'));
  const id = script?.video_id || path.basename(dir);
  const ep = {
    id,
    dir,
    script,
    storyboard: readJson(path.join(dir, 'storyboard.json')),
    numbers: readJson(path.join(dir, 'numbers.json')),
    timings: readJson(path.join(dir, 'timings.json')),
    manifest: readJson(path.join(dir, 'assets_manifest.json')),
    assetQa: readJson(path.join(dir, 'asset_qa.json')),
    focus: readJson(path.join(dir, 'image_focus.json')),
  };
  ep.sentences = [];
  for (const ch of script?.chapters || []) {
    for (const s of ch.sentences || []) {
      ep.sentences.push({
        id: s.id, chapter: ch.id, idx: ep.sentences.length, raw: s.text || '',
        tokens: displayTokens(s.text || ''),
      });
    }
  }
  return ep;
}

export function isV2(idOrDir) {
  const dir = fs.existsSync(idOrDir) && fs.statSync(idOrDir).isDirectory()
    ? path.resolve(idOrDir) : path.join(MC_DIR, 'production', idOrDir);
  return fs.existsSync(path.join(dir, 'storyboard.json'));
}

// ---------------------------------------------------------------------------
// `at` resolution
// ---------------------------------------------------------------------------
export function resolveAt(ep, at) {
  if (typeof at !== 'string' || !at) return { ok: false, error: 'missing at' };
  const [sid, word] = at.split('@');
  const s = ep.sentences.find((x) => x.id === sid);
  if (!s) return { ok: false, error: `unknown sentence '${sid}'` };
  let wordIdx = 0;
  if (word !== undefined && word !== '') {
    const w = word.toLowerCase();
    wordIdx = s.tokens.findIndex((t) => t.replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase().startsWith(w));
    if (wordIdx < 0) return { ok: false, error: `no word starting '${word}' in ${sid}` };
  }
  let time = null;
  const tm = ep.timings;
  if (tm && !tm.__error) {
    const sent = (tm.sentences || []).find((x) => x.id === sid);
    const ws = (tm.words || []).filter((x) => x.sentence_id === sid);
    if (word && ws[wordIdx]) time = ws[wordIdx].start;
    else if (sent) time = sent.start;
    else if (ws[0]) time = ws[0].start;
  }
  return { ok: true, sentIdx: s.idx, wordIdx, key: s.idx * 1000 + wordIdx, sentenceId: sid, chapter: s.chapter, time };
}

/** Flat shot list in storyboard order with resolved start/end (times null without timings). */
export function computeShots(ep) {
  const shots = [];
  for (const ch of ep.storyboard?.chapters || []) {
    (ch.shots || []).forEach((shot, i) => {
      shots.push({ chapter: ch.id, n: i + 1, shot, at: resolveAt(ep, shot.at) });
    });
  }
  const total = ep.timings?.duration_seconds ?? null;
  // Mirror the engine: a chapter's first shot is on screen from the chapter (clip) start,
  // and its last shot runs to the chapter end.
  const beat = (ch) => (ep.timings?.beats || []).find((b) => b.chapter_id === ch);
  shots.forEach((s, i) => {
    const next = shots[i + 1];
    s.start = s.at.ok ? s.at.time : null;
    if (s.n === 1 && beat(s.chapter)) s.start = beat(s.chapter).start;
    s.end = next && next.chapter === s.chapter ? (next.at.ok ? next.at.time : null) : (beat(s.chapter)?.end ?? total);
    s.duration = s.start != null && s.end != null ? s.end - s.start : null;
  });
  return shots;
}

// ---------------------------------------------------------------------------
// Text collection
// ---------------------------------------------------------------------------
function storyboardTexts(ep) {
  const out = [];
  const push = (where, v) => { if (v !== undefined && v !== null && v !== '') out.push({ where, text: String(v) }); };
  for (const ch of ep.storyboard?.chapters || []) {
    (ch.shots || []).forEach((shot, i) => {
      const w = `${ch.id}#${i + 1}`;
      const ex = shot.explainer;
      if (!ex) return;
      push(`${w} title`, ex.title); push(`${w} yLabel`, ex.yLabel); push(`${w} xLabel`, ex.xLabel);
      (ex.columns || []).forEach((c) => push(`${w} column`, c));
      (ex.items || []).forEach((it, j) => {
        for (const k of ['label', 'value', 'note', 'a', 'b']) push(`${w} item${j + 1}.${k}`, it[k]);
      });
    });
  }
  return out;
}

function allTexts(ep) {
  const out = [];
  for (const s of ep.sentences) {
    out.push({ where: s.id, text: displayText(s.raw) });
    if (spokenText(s.raw) !== displayText(s.raw)) out.push({ where: `${s.id} (spoken)`, text: spokenText(s.raw) });
  }
  return out.concat(storyboardTexts(ep));
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
const NUM_RE = new RegExp(
  [
    'Rp\\.?\\s?\\d[\\d.,]*(?:\\s?(?:triliun|miliar|juta|ribu|rb|jt)(?![\\p{L}]))?',
    '\\d[\\d.,]*\\s?%',
    '\\d[\\d.,]*\\s?(?:triliun|miliar|juta|ribu)(?![\\p{L}])',
    '\\d[\\d.,]*\\s?jam(?![\\p{L}])',
  ].join('|'),
  'giu'
);
const normNum = (s) => s.toLowerCase().replace(/\s+/g, '').replace(/^rp\./, 'rp').replace(/[.,]+$/, '');

export function extractNumberTokens(text) {
  return [...String(text).matchAll(NUM_RE)].map((m) => m[0].replace(/[.,\s]+$/, ''));
}

export function checkNumbers(ep) {
  if (!ep.numbers || ep.numbers.__error) {
    return { name: 'Numbers vs numbers.json', passed: false, detail: ep.numbers ? 'numbers.json parse error' : 'numbers.json missing', items: [] };
  }
  const allowed = new Set();
  for (const f of Object.values(ep.numbers.figures || {})) {
    if (f.display) allowed.add(normNum(String(f.display)));
    for (const a of f.aliases || []) allowed.add(normNum(String(a)));
  }
  const bad = [];
  let total = 0;
  const seen = new Set();
  for (const { where, text } of [...ep.sentences.map((s) => ({ where: s.id, text: displayText(s.raw) })), ...storyboardTexts(ep)]) {
    for (const tok of extractNumberTokens(text)) {
      total++;
      if (!allowed.has(normNum(tok)) && !seen.has(where + tok)) {
        seen.add(where + tok);
        bad.push(`${where}: "${tok}"`);
      }
    }
  }
  return {
    name: 'Numbers vs numbers.json', passed: bad.length === 0,
    detail: bad.length ? `${bad.length} unknown of ${total}: ${bad.slice(0, 3).join('; ')}` : `${total} tokens, ${allowed.size} figures`,
    items: bad,
  };
}

/** Numbers + jargon on extra texts (titles, thumbnail hooks). Returns problem strings. */
export function checkExtraTexts(ep, texts) {
  const allowed = new Set();
  for (const f of Object.values(ep.numbers?.figures || {})) {
    if (f.display) allowed.add(normNum(String(f.display)));
    for (const a of f.aliases || []) allowed.add(normNum(String(a)));
  }
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(${BANNED_JARGON.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  const out = [];
  for (const { where, text } of texts) {
    for (const tok of extractNumberTokens(text)) if (!allowed.has(normNum(tok))) out.push(`${where}: figure "${tok}" is not in numbers.json`);
    for (const m of String(text).matchAll(re)) out.push(`${where}: banned jargon "${m[1]}"`);
  }
  return out;
}

export function checkJargon(ep) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(${BANNED_JARGON.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  const hits = [];
  for (const { where, text } of allTexts(ep)) {
    for (const m of text.matchAll(re)) hits.push(`${where}: "${m[1]}"`);
  }
  return {
    name: 'Banned Jargon', passed: hits.length === 0,
    detail: hits.length ? `${hits.length} hits: ${hits.slice(0, 3).join('; ')}` : `0 hits (${BANNED_JARGON.length} terms)`,
    items: hits,
  };
}

export const MIN_SHOT_SEC = 1.2;

export function checkStoryboard(ep) {
  const errs = [];
  const sb = ep.storyboard;
  if (!sb || sb.__error) {
    return { name: 'Storyboard Structure', passed: false, detail: sb ? 'storyboard.json parse error' : 'storyboard.json missing', items: [] };
  }
  const scriptChapters = (ep.script?.chapters || []).map((c) => c.id);
  const sbIds = (sb.chapters || []).map((c) => c.id);
  for (const id of sbIds) if (!scriptChapters.includes(id)) errs.push(`chapter ${id} not in script`);
  for (const id of scriptChapters) {
    const c = (sb.chapters || []).find((x) => x.id === id);
    if (!c || !(c.shots || []).length) errs.push(`chapter ${id} has no shots`);
  }

  const shots = computeShots(ep);
  let lastKey = -1;
  let nTimed = 0;
  let shortest = Infinity;
  for (const s of shots) {
    const w = `${s.chapter}#${s.n}`;
    const { shot } = s;
    if (!s.at.ok) { errs.push(`${w} at: ${s.at.error}`); continue; }
    if (s.at.chapter !== s.chapter) errs.push(`${w} at ${shot.at} is in ${s.at.chapter}`);
    if (s.at.key <= lastKey) errs.push(`${w} at ${shot.at} not after previous shot`);
    lastKey = s.at.key;
    if (!shot.image && !shot.explainer) errs.push(`${w} has neither image nor explainer`);
    const mode = shot.image?.mode;
    if (shot.image && mode !== 'full' && mode !== 'side') errs.push(`${w} image.mode '${mode}'`);
    if (mode === 'full' && shot.explainer) errs.push(`${w} full image shot has explainer overlay`);
    if (mode === 'side' && !shot.explainer) errs.push(`${w} side image needs explainer`);
    ((shot.explainer || {}).items || []).forEach((it, j) => {
      const r = resolveAt(ep, it.at);
      if (!r.ok) errs.push(`${w} item${j + 1} at: ${r.error}`);
      else if (r.key < s.at.key) errs.push(`${w} item${j + 1} at before shot start`);
    });
    if (s.duration != null) {
      nTimed++;
      shortest = Math.min(shortest, s.duration);
      if (s.duration < MIN_SHOT_SEC) errs.push(`${w} only ${s.duration.toFixed(2)}s`);
    }
  }
  // Every sentence must fall under a shot: the first shot has to open at sentence 0 word 0.
  const first = shots[0];
  if (ep.sentences.length && (!first || !first.at.ok || first.at.key > 0)) {
    errs.push(`sentence ${ep.sentences[0].id} not under any shot`);
  }
  const timedNote = nTimed ? `, min ${shortest.toFixed(2)}s` : ', durations n/a';
  return {
    name: 'Storyboard Structure', passed: errs.length === 0,
    detail: errs.length ? `${errs.length} errors: ${errs.slice(0, 3).join('; ')}` : `${shots.length} shots ok${timedNote}`,
    items: errs,
  };
}

// ---------------------------------------------------------------------------
// Schemas. Every error reads "<file> <where>: <problem>. fix: <what to write>"
// so a small model can repair the file without knowing the engine.
// ---------------------------------------------------------------------------
const MOODS = ['tense', 'light', 'warm'];
const TONES = ['neutral', 'good', 'bad', 'warn'];
const TRANSITIONS = ['cut', 'crossfade', 'collapse', 'expand'];
const MOTIONS = ['pushIn', 'pushOut', 'panLeft', 'panRight'];
/** Per explainer type: required item fields, max items, max chars per field. */
export const EXPLAINERS = {
  stack:   { need: ['label', 'value'], max: 6, len: { label: 32, value: 32, note: 40 } },
  bars:    { need: ['label', 'value'], max: 6, len: { label: 24, value: 14, note: 40 } },
  stat:    { need: ['value'], max: 3, len: { label: 48, value: 18, note: 48 } },
  compare: { need: ['label', 'a', 'b'], max: 6, len: { label: 24, a: 20, b: 20, note: 40 } },
  line:    { need: ['label', 'value'], max: 8, len: { label: 12, value: 14, note: 40 } },
  flow:    { need: ['label'], max: 5, len: { label: 26, value: 14, note: 40 } },
  receipt: { need: ['label', 'value'], max: 8, len: { label: 28, value: 14, note: 40 } },
};
const TITLE_MAX = 44;
const ITEM_KEYS = ['at', 'label', 'value', 'numeric', 'tone', 'note', 'a', 'b', 'win', 'series', 'icon'];
const isStr = (v) => typeof v === 'string' && v.trim() !== '';

function schemaScript(ep, errs) {
  const F = 'script.json';
  const s = ep.script;
  if (!s || s.__error) { errs.push(`${F}: ${s ? 'invalid JSON' : 'missing'}. fix: run compile_script.mjs (make_episode stage "script")`); return; }
  for (const k of ['video_id', 'channel', 'slug', 'title', 'description', 'tts_style_prompt']) {
    if (!isStr(s[k]) || /TODO/.test(s[k])) errs.push(`${F} ${k}: missing or TODO. fix: set "@${k}: ..." in script_source.txt`);
  }
  if (!isStr(s.voice?.model) || !isStr(s.voice?.voiceName)) errs.push(`${F} voice: missing. fix: the episode needs a projects_config.json entry with a voice block (make_episode --init)`);
  if (!isStr(s.thumbnail?.text) || /TODO/.test(s.thumbnail?.text)) errs.push(`${F} thumbnail.text: missing. fix: set "@thumbnail_text: 2-4 WORDS" in script_source.txt`);
  else if (s.thumbnail.text.split(/\s+/).length > 5) errs.push(`${F} thumbnail.text: "${s.thumbnail.text}" is over 5 words. fix: 2-4 words`);
  if (!isStr(s.thumbnail?.scene) || /TODO/.test(s.thumbnail?.scene)) errs.push(`${F} thumbnail.scene: missing. fix: set "@thumbnail_scene: one sentence" in script_source.txt`);
  const ids = new Set();
  (s.chapters || []).forEach((c, i) => {
    if (!/^ch\d{2}$/.test(c.id || '')) errs.push(`${F} chapters[${i}].id "${c.id}": fix: ch01, ch02, ...`);
    if (!MOODS.includes(c.music)) errs.push(`${F} ${c.id}.music "${c.music}": fix: one of ${MOODS.join('|')}`);
    (c.sentences || []).forEach((x) => {
      if (ids.has(x.id)) errs.push(`${F} sentence id ${x.id} duplicated. fix: recompile from script_source.txt`);
      ids.add(x.id);
      if (!isStr(x.text)) errs.push(`${F} ${x.id}: empty text`);
      if (/\d/.test(String(x.text).replace(/\[[^\]]*\]/g, ''))) {
        errs.push(`${F} ${x.id}: digit outside a [display|spoken] token ("${x.text.slice(0, 50)}"). fix: wrap figures like [Rp45 ribu|empat puluh lima ribu rupiah]`);
      }
    });
  });
  if (!(s.chapters || []).length) errs.push(`${F}: no chapters`);
}

function schemaNumbers(ep, errs) {
  const F = 'numbers.json';
  const n = ep.numbers;
  if (!n || n.__error) { errs.push(`${F}: ${n ? 'invalid JSON' : 'missing'}. fix: write {"video_id": "...", "figures": {"key": {"value": 45000, "display": "Rp45 ribu", "basis": "sourced", "source": "https://...", "aliases": []}}}`); return; }
  for (const [k, f] of Object.entries(n.figures || {})) {
    if (typeof f.value !== 'number') errs.push(`${F} figures.${k}.value: must be a number (no quotes, no "Rp")`);
    if (!isStr(f.display)) errs.push(`${F} figures.${k}.display: missing. fix: the exact text shown on screen, e.g. "Rp45 ribu"`);
    if (!['sourced', 'estimate'].includes(f.basis)) errs.push(`${F} figures.${k}.basis "${f.basis}": fix: "sourced" or "estimate"`);
    if (f.basis === 'sourced' && !/https?:\/\//.test(f.source || '')) errs.push(`${F} figures.${k}.source: sourced figure needs a URL. fix: add the URL or set basis "estimate"`);
    if (f.basis === 'estimate' && !isStr(f.source)) errs.push(`${F} figures.${k}.source: say how the estimate was made (e.g. "8 meja x Rp15,9 juta")`);
  }
  if (!Object.keys(n.figures || {}).length) errs.push(`${F} figures: empty`);
}

function schemaStoryboard(ep, errs) {
  const F = 'storyboard.json';
  const sb = ep.storyboard;
  if (!sb || sb.__error) return; // checkStoryboard reports missing/invalid
  const manifestIds = new Set((ep.manifest?.images || []).map((m) => `${m.id}.png`));
  const iconIds = new Set((ep.manifest?.icon_sets || []).flatMap((s) => (s.icons || []).map((i) => i.id)));
  for (const ch of sb.chapters || []) {
    (ch.shots || []).forEach((shot, i) => {
      const w = `${F} ${ch.id} shot ${i + 1}`;
      for (const k of Object.keys(shot)) if (!['at', 'transition', 'image', 'explainer'].includes(k)) errs.push(`${w}: unknown key "${k}". fix: remove it`);
      if (shot.transition && !TRANSITIONS.includes(shot.transition)) errs.push(`${w} transition "${shot.transition}": fix: one of ${TRANSITIONS.join('|')}`);
      if (shot.transition === 'collapse' && shot.image?.mode !== 'side') errs.push(`${w}: "collapse" shrinks an image into the side card. fix: image.mode "side" or another transition`);
      if (shot.transition === 'expand' && shot.image?.mode !== 'full') errs.push(`${w}: "expand" grows the side card to full screen. fix: image.mode "full" or another transition`);
      const im = shot.image;
      if (im) {
        if (!isStr(im.src)) errs.push(`${w} image.src: missing`);
        else if (ep.manifest && !manifestIds.has(im.src)) errs.push(`${w} image.src "${im.src}": not in assets_manifest.json. fix: add an image with id "${im.src.replace(/\.png$/, '')}" or use an existing one`);
        if (im.motion && !MOTIONS.includes(im.motion)) errs.push(`${w} image.motion "${im.motion}": fix: one of ${MOTIONS.join('|')}`);
        if (im.focus && !['hold', 'dim'].includes(im.focus)) errs.push(`${w} image.focus "${im.focus}": fix: "hold" (image still discussed) or "dim"`);
        if (im.focusX !== undefined && !(im.focusX >= 0 && im.focusX <= 1)) errs.push(`${w} image.focusX: fix: remove it (Haiku sets the focal point) or use 0..1`);
      }
      const ex = shot.explainer;
      if (!ex) return;
      const spec = EXPLAINERS[ex.type];
      if (!spec) { errs.push(`${w} explainer.type "${ex.type}": fix: one of ${Object.keys(EXPLAINERS).join('|')}`); return; }
      if (ex.title && ex.title.length > TITLE_MAX) errs.push(`${w} explainer.title is ${ex.title.length} chars: fix: max ${TITLE_MAX}`);
      const items = ex.items || [];
      if (!items.length) errs.push(`${w} explainer.items: empty. fix: at least one item with an "at"`);
      if (items.length > spec.max) errs.push(`${w} ${ex.type} has ${items.length} items: fix: max ${spec.max}, split into two shots`);
      if (ex.type === 'compare' && (!Array.isArray(ex.columns) || ex.columns.length !== 2)) errs.push(`${w} compare needs "columns": ["left head", "right head"]`);
      if (ex.type === 'line' && items.some((it) => it.series === 'b') && (!Array.isArray(ex.columns) || ex.columns.length !== 2)) errs.push(`${w} line with series "b" needs "columns": ["series a name", "series b name"]`);
      items.forEach((it, j) => {
        const iw = `${w} item ${j + 1}`;
        for (const k of Object.keys(it)) if (!ITEM_KEYS.includes(k)) errs.push(`${iw}: unknown key "${k}". fix: remove it (allowed: ${ITEM_KEYS.join(', ')})`);
        for (const k of spec.need) if (!isStr(it[k])) errs.push(`${iw}: ${ex.type} items need "${k}"`);
        for (const [k, max] of Object.entries(spec.len)) if (isStr(it[k]) && it[k].length > max) errs.push(`${iw} ${k} "${it[k]}" is ${it[k].length} chars: fix: max ${max} for ${ex.type}`);
        if (it.tone && !TONES.includes(it.tone)) errs.push(`${iw} tone "${it.tone}": fix: one of ${TONES.join('|')}`);
        if (it.win && !['a', 'b'].includes(it.win)) errs.push(`${iw} win "${it.win}": fix: "a" or "b"`);
        if (it.series && !['a', 'b'].includes(it.series)) errs.push(`${iw} series "${it.series}": fix: "a" or "b"`);
        if (it.numeric !== undefined && typeof it.numeric !== 'number') errs.push(`${iw} numeric: must be a number`);
        if (it.icon !== undefined) {
          if (ex.type !== 'flow') errs.push(`${iw} icon: only flow steps can have icons. fix: remove "icon"`);
          else if (!iconIds.has(it.icon)) errs.push(`${iw} icon "${it.icon}": not in any assets_manifest.json icon_sets. fix: add {"id": "${it.icon}", "prompt": "..."} to an icon set`);
        }
        if ((ex.type === 'bars' || ex.type === 'line') && it.numeric === undefined && !/\d/.test(it.value || '')) errs.push(`${iw}: ${ex.type} needs a number in "value" or "numeric"`);
      });
    });
  }
}

function schemaManifest(ep, errs) {
  const F = 'assets_manifest.json';
  const m = ep.manifest;
  if (!m) return; // optional until the assets stage
  if (m.__error) { errs.push(`${F}: invalid JSON (${m.__error})`); return; }
  if (!isStr(m.style_notes)) errs.push(`${F} style_notes: missing. fix: 1-3 sentences on setting, palette and mood`);
  const chars = new Set((m.characters || []).map((c) => c.id));
  (m.characters || []).forEach((c, i) => {
    if (!/^[a-z][a-z0-9_]*$/.test(c.id || '')) errs.push(`${F} characters[${i}].id "${c.id}": fix: lowercase like "owner"`);
    if (!isStr(c.prompt)) errs.push(`${F} characters[${i}].prompt: missing. fix: age, hair, skin, clothes, one sentence`);
  });
  const seen = new Set();
  (m.images || []).forEach((im, i) => {
    const w = `${F} images[${i}] (${im.id})`;
    if (!/^[a-z0-9_]+$/.test(im.id || '')) errs.push(`${w} id: fix: lowercase letters, digits, "_" (file becomes <id>.png)`);
    if (seen.has(im.id)) errs.push(`${w} id duplicated`);
    seen.add(im.id);
    if (!['full', 'side'].includes(im.mode)) errs.push(`${w} mode "${im.mode}": fix: "full" or "side"`);
    if (!isStr(im.prompt)) errs.push(`${w} prompt: missing`);
    if (!isStr(im.brief)) errs.push(`${w} brief: missing. fix: one line saying what QA must see, e.g. "Raka alone at a desk"`);
    for (const u of im.uses || []) if (!chars.has(u)) errs.push(`${w} uses "${u}": not a character id. fix: one of ${[...chars].join(', ') || '(none defined)'}`);
  });
  const iconSeen = new Set();
  (m.icon_sets || []).forEach((set, i) => {
    const w = `${F} icon_sets[${i}] (${set.id})`;
    if (!/^[a-z0-9_]+$/.test(set.id || '')) errs.push(`${w} id: fix: lowercase letters, digits, "_"`);
    const n = (set.icons || []).length;
    if (n < 2 || n > 6) errs.push(`${w}: has ${n} icons. fix: 2 to 6 icons per set (one image call draws them all)`);
    (set.icons || []).forEach((ic, j) => {
      if (!/^[a-z0-9_]+$/.test(ic.id || '')) errs.push(`${w} icons[${j}].id "${ic.id}": fix: lowercase letters, digits, "_"`);
      if (iconSeen.has(ic.id)) errs.push(`${w} icon id "${ic.id}" used twice in the manifest`);
      iconSeen.add(ic.id);
      if (!isStr(ic.prompt)) errs.push(`${w} icons[${j}].prompt: missing. fix: one simple object, e.g. "a stack of four ivory tiles"`);
      else if (ic.prompt.split(/\s+/).length > 18) errs.push(`${w} icons[${j}].prompt: too long for an icon. fix: one simple object in under 18 words`);
    });
  });
}

export function checkSchema(ep) {
  const errs = [];
  schemaScript(ep, errs);
  schemaNumbers(ep, errs);
  schemaStoryboard(ep, errs);
  schemaManifest(ep, errs);
  return {
    name: 'Schemas', passed: errs.length === 0,
    detail: errs.length ? `${errs.length} problems: ${errs[0]}` : 'script, numbers, storyboard, manifest ok',
    items: errs,
  };
}

// ---------------------------------------------------------------------------
// Side-card crops: the collapsed card must show the image's focal subject.
// Geometry mirrors src/shared/v2/images.tsx (CARD 560x750, cover fit, offset clamped).
// ---------------------------------------------------------------------------
const CARD_W = 560, CARD_H = 750;
function pngSize(file) {
  try {
    const b = fs.readFileSync(file).subarray(0, 24);
    return b.toString('ascii', 12, 16) === 'IHDR' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
  } catch { return null; }
}

export function checkCrops(ep) {
  const errs = [];
  const focus = ep.focus && !ep.focus.__error ? ep.focus : {};
  const assetDir = path.join(MC_DIR, 'public', 'assets', ep.storyboard?.assetDir || ep.id);
  const done = new Set();
  for (const ch of ep.storyboard?.chapters || []) {
    const shots = ch.shots || [];
    shots.forEach((shot, i) => {
      if (shot.image?.mode !== 'side') return;
      const src = shot.image.src;
      // storyboard override on any shot that shows the same image in this run
      const override = shots.map((s) => (s.image?.src === src ? s.image.focusX : undefined)).find((x) => x !== undefined);
      const fx = override ?? focus[src];
      const key = `${ch.id}:${src}`;
      if (done.has(key)) return;
      done.add(key);
      const w = `${ch.id} shot ${i + 1} (${src})`;
      if (fx === undefined) { errs.push(`${w}: no focal point. fix: run "generate_assets.py --id ${ep.id} --focus-only"`); return; }
      const dim = pngSize(path.join(assetDir, src));
      if (!dim) { errs.push(`${w}: image file missing or not PNG`); return; }
      const sc = Math.max(CARD_W / dim.w, CARD_H / dim.h);
      const vis = CARD_W / (dim.w * sc); // visible fraction of the width
      const centre = Math.min(Math.max(fx, vis / 2), 1 - vis / 2);
      const lo = centre - vis / 2, hi = centre + vis / 2;
      const margin = vis * 0.12;
      if (fx < lo + margin || fx > hi - margin) {
        errs.push(`${w}: focal point x=${fx.toFixed(2)} falls at the card edge (card shows ${lo.toFixed(2)}-${hi.toFixed(2)}). fix: regenerate the image with the subject nearer the centre, or use mode "full"`);
      }
    });
  }
  return {
    name: 'Side-card Crops', passed: errs.length === 0,
    detail: errs.length ? `${errs.length} problems: ${errs[0]}` : `${done.size} side cards centred on their subject`,
    items: errs,
  };
}

export function lintEpisode(ep) {
  return [checkSchema(ep), checkNumbers(ep), checkJargon(ep), checkStoryboard(ep), checkCrops(ep)];
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: lint_episode.mjs <vid_id | dir>');
    process.exit(2);
  }
  const ep = loadEpisode(target);
  if (!ep.script || ep.script.__error) {
    console.error(`script.json missing/invalid in ${ep.dir}`);
    process.exit(2);
  }
  const ct = process.argv.find((a) => a.startsWith('--check-texts='));
  if (ct) { // JSON list of {where, text} -> {"problems": [...]} (used by publish_options.py)
    console.log(JSON.stringify({ problems: checkExtraTexts(ep, JSON.parse(fs.readFileSync(ct.slice(14), 'utf8'))) }));
    process.exit(0);
  }
  if (process.argv.includes('--shots')) { // machine-readable shot list for review_frames.py
    console.log(JSON.stringify(computeShots(ep).map((s) => ({
      chapter: s.chapter, n: s.n, start: s.start, end: s.end,
      image: s.shot.image ? { src: s.shot.image.src, mode: s.shot.image.mode } : null,
      explainer: s.shot.explainer ? { type: s.shot.explainer.type, title: s.shot.explainer.title ?? '' } : null,
    }))));
    process.exit(0);
  }
  const results = lintEpisode(ep);
  console.log(`[lint] ${ep.id} (${ep.dir})`);
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
    if (!r.passed) for (const it of r.items) console.log(`      - ${it}`);
  }
  process.exit(results.every((r) => r.passed) ? 0 : 1);
}
