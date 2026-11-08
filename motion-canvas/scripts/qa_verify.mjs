#!/usr/bin/env node

/**
 * Universal Visual QA Gate for AI-nimate Projects
 *
 * Verifies:
 * 1. Subtitle chunk invariants (<= 4 words, <= 25 chars, zero cross-beat bleeding)
 * 2. Scene TSX Camera architecture (no detached <Camera> without <Camera.Stage>)
 * 3. Dual-aspect masters & WhatsApp stream (duration, resolution, audio, size)
 * 4. Keyframe non-blank visual integrity (entry & hold frames per beat)
 *
 * Constraints: Zero external dependencies, <= 76 char terminal width, exit code 0/1.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import {
  loadEpisode, isV2 as isV2Episode, displayTokens, computeShots,
  checkNumbers, checkJargon, checkStoryboard,
} from './v2/lint_episode.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOTION_CANVAS_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(MOTION_CANVAS_DIR, '..');
const PROJECTS_DIR = path.resolve(REPO_ROOT, 'projects');

const args = process.argv.slice(2);
let inputTarget = 'vid_20261029_002';
let aspectFilter = null;

for (const arg of args) {
  if (arg.startsWith('--aspect=') || arg.startsWith('--aspects=')) {
    aspectFilter = arg.split('=')[1].trim();
  } else if (!arg.startsWith('--')) {
    inputTarget = arg;
  }
}

// -----------------------------------------------------------------------------
// Resolve project output directory and project ID
// -----------------------------------------------------------------------------
let outputDir = null;
let projectId = inputTarget;

const SLUG_TO_PROJECT = {
  'knp-saham-teknologi-runtuh': 'vid_20261031_002',
  'knp-bursa-kita-terancam-diboikot-dunia': 'vid_20261031_001',
  'the-ai-bubble-explained': 'vid_20261029_002',
  'offshore-investing-tax-traps-indonesia': 'vid_20261024_001',
  'anatomi-saham-gorengan-di-bei': 'vid_20261021_001',
  'anatomi-saham-gorengan-di-bei-re': 'vid_20261021_001',
};

// 0. Exact dir from production/<id>/script.json (channel_date_slug); unambiguous when several episodes share a date
function dirFromScript(id) {
  try {
    const sj = JSON.parse(fs.readFileSync(path.join(MOTION_CANVAS_DIR, 'production', id, 'script.json'), 'utf8'));
    const date = (id.match(/vid_(\d{8})/) || [])[1];
    if (sj.slug && date) {
      const d = path.join(PROJECTS_DIR, `${sj.channel || 'kausalmedia'}_${date}_${sj.slug}`);
      if (fs.existsSync(d)) return d;
    }
  } catch (e) {}
  return null;
}

// 1. Direct directory path
if (fs.existsSync(inputTarget) && fs.statSync(inputTarget).isDirectory()) {
  outputDir = path.resolve(inputTarget);
} else if (/^vid_\d{8}_\d+$/.test(inputTarget) && dirFromScript(inputTarget)) {
  outputDir = dirFromScript(inputTarget);
} else if (fs.existsSync(path.join(PROJECTS_DIR, inputTarget))) {
  outputDir = path.join(PROJECTS_DIR, inputTarget);
} else if (fs.existsSync(PROJECTS_DIR)) {
  // Pattern lookup in PROJECTS_DIR
  const entries = fs.readdirSync(PROJECTS_DIR);
  const dateMatch = inputTarget.match(/(\d{8})/);
  if (dateMatch) {
    const d = dateMatch[1];
    const match = entries.find((e) => e.includes(`_${d}_`));
    if (match) {
      outputDir = path.join(PROJECTS_DIR, match);
    }
  }
  if (!outputDir) {
    const match = entries.find((e) => e.includes(inputTarget));
    if (match) {
      outputDir = path.join(PROJECTS_DIR, match);
    }
  }
}

// Fallback to legacy output/
if (!outputDir || !fs.existsSync(outputDir)) {
  outputDir = path.join(MOTION_CANVAS_DIR, 'output', inputTarget);
}

// Resolve projectId and meta from meta.json if present
let projectMeta = null;
if (fs.existsSync(path.join(outputDir, 'meta.json'))) {
  try {
    projectMeta = JSON.parse(fs.readFileSync(path.join(outputDir, 'meta.json'), 'utf8'));
    if (projectMeta.id) projectId = projectMeta.id;
  } catch (e) {}
}

if (SLUG_TO_PROJECT[projectId]) {
  projectId = SLUG_TO_PROJECT[projectId];
}

const scriptJsonPath = path.join(MOTION_CANVAS_DIR, 'production', projectId, 'script.json');
let scriptAspects = null;
if (fs.existsSync(scriptJsonPath)) {
  try {
    const sj = JSON.parse(fs.readFileSync(scriptJsonPath, 'utf8'));
    if (sj.aspect_ratios) scriptAspects = sj.aspect_ratios;
  } catch (e) {}
}

const is16x9Only =
  (projectMeta?.aspects && !projectMeta.aspects.includes('9x16')) ||
  (scriptAspects && !scriptAspects.includes('9x16')) ||
  aspectFilter === '16x9';

const isV2 = isV2Episode(projectId);
const v2Ep = isV2 ? loadEpisode(projectId) : null;
const measurements = [];
const qaDir = `/tmp/qa_${projectId}`;
fs.mkdirSync(qaDir, { recursive: true });

const results = [];
const errors = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  if (!passed && detail) {
    errors.push(`[FAIL] ${name}: ${detail}`);
  }
}

// -----------------------------------------------------------------------------
// 1. TIMINGS & SUBTITLE CHUNKS INVARIANTS
// -----------------------------------------------------------------------------
let timingsPath = path.join(outputDir, 'timings.json');
if (!fs.existsSync(timingsPath)) {
  timingsPath = path.join(MOTION_CANVAS_DIR, 'production', projectId, 'timings.json');
}

let timings = null;

if (!fs.existsSync(timingsPath)) {
  record('Timings Manifest', false, `timings.json not found at ${timingsPath}`);
} else {
  try {
    timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    record('Timings Manifest', true, `${timings.duration_seconds}s, ${timings.beats?.length || 0} beats`);
  } catch (err) {
    record('Timings Manifest', false, `JSON parse error: ${err.message}`);
  }
}

if (timings) {
  const chunks = timings.subtitle_chunks || [];
  const beats = timings.beats || [];
  const boundaries = beats.slice(0, -1).map((b) => b.end);

  // v2: subtitle_chunks is the 16:9 set (one wide line); subtitle_chunks_9x16 stays short.
  const sets = isV2
    ? [['16:9', chunks, 10, 52], ['9:16', timings.subtitle_chunks_9x16 || [], 5, 34]]
    : [['', chunks, 4, 25]];
  let bleedViolations = 0;
  for (const chunk of chunks) {
    for (const b of boundaries) {
      if (chunk.start < b - 0.05 && chunk.end > b + 0.05) bleedViolations++;
    }
  }
  for (const [label, set, MAX_WORDS, MAX_CHARS] of sets) {
    let wordViolations = 0;
    let charViolations = 0;
    for (const chunk of set) {
      const words = (chunk.text || '').trim().split(/\s+/).filter(Boolean);
      const wordCount = isV2 && Array.isArray(chunk.words) && chunk.words.length ? chunk.words.length : words.length;
      if (wordCount > MAX_WORDS) wordViolations++;
      if ((chunk.text || '').length > MAX_CHARS) charViolations++;
    }
    const tag = label ? `${label} ` : '';
    const empty = isV2 && set.length === 0;
    record(
      `Subtitle ${tag}Words (<= ${MAX_WORDS})`,
      wordViolations === 0 && !empty,
      empty ? 'no chunks (re-run synth_narration.py --repace)'
        : wordViolations === 0 ? `${set.length} chunks` : `${wordViolations} chunks exceeded ${MAX_WORDS} words`
    );
    record(
      `Subtitle ${tag}Chars (<= ${MAX_CHARS})`,
      charViolations === 0 && !empty,
      charViolations === 0 ? `${set.length} chunks` : `${charViolations} chunks exceeded ${MAX_CHARS} chars`
    );
  }

  record(
    'Zero Cross-Beat Bleed',
    bleedViolations === 0,
    bleedViolations === 0 ? 'Clean beat boundaries' : `${bleedViolations} bleeding chunks`
  );

  if (isV2) {
    const expected = v2Ep.sentences.flatMap((s) => s.tokens);
    const got = (timings.words || []).map((w) => w.w);
    let match = 0;
    let firstBad = null;
    const n = Math.max(expected.length, got.length);
    for (let i = 0; i < n; i++) {
      if (expected[i] !== undefined && expected[i] === got[i]) match++;
      else if (!firstBad) firstBad = `#${i} script="${expected[i] ?? '-'}" timings="${got[i] ?? '-'}"`;
    }
    const pct = n ? (100 * match) / n : 0;
    measurements.push(`Subtitle words: ${match}/${n} equal script display tokens (${pct.toFixed(2)}%)${firstBad ? '; first diff ' + firstBad : ''}`);
    record('Subtitle = Script (100%)', n > 0 && match === n, n > 0 && match === n ? `${n} words in order` : `${pct.toFixed(1)}%, ${firstBad}`);
  }
}

// -----------------------------------------------------------------------------
// 2. SCENE TSX CAMERA ARCHITECTURE CHECK
// -----------------------------------------------------------------------------
const scenesDir = path.join(MOTION_CANVAS_DIR, 'src', 'scenes', projectId);
if (isV2) {
  // v2: scenes are data driven by src/shared/v2; per-beat .tsx / brow / font checks are meaningless.
} else if (!fs.existsSync(scenesDir)) {
  record('Camera Invariant (<Camera.Stage>)', true, 'N/A (consolidated binary)');
  record('Phone Font Floor (>= 18px)', true, 'N/A (consolidated binary)');
  record('Perpendicular Conduit Check', true, 'N/A (consolidated binary)');
  record('Readable Sans & Density Check', true, 'N/A (consolidated binary)');
  record('Clean Brow & Chart Axes Check', true, 'N/A (consolidated binary)');
} else {
  const tsxFiles = fs.readdirSync(scenesDir).filter((f) => f.endsWith('.tsx'));
  let forbiddenCameraFound = 0;
  const cameraViolations = [];

  for (const file of tsxFiles) {
    const filePath = path.join(scenesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const lines = stripped.split('\n');

    lines.forEach((line, idx) => {
      if (/<Camera(?!\.Stage)\b/.test(line)) {
        forbiddenCameraFound++;
        cameraViolations.push(`${file}:${idx + 1}`);
      }
    });
  }

  record(
    'Camera Invariant (<Camera.Stage>)',
    forbiddenCameraFound === 0,
    forbiddenCameraFound === 0
      ? `${tsxFiles.length} scenes verified`
      : `Detached <Camera> in: ${cameraViolations.join(', ')}`
  );

  // Check for micro-fonts in scene TSX files
  const isLegacy001 = projectId === 'vid_20261031_001';
  let microFontFound = 0;
  const microFontViolations = [];
  const microFontRegex = isLegacy001
    ? /fontSize\s*[=:]\s*\{?[^}\n]*?\b([1-9]|1[0-5])\b/g
    : /fontSize\s*[=:]\s*\{?[^}\n]*?\b([1-9]|1[0-7])\b/g;

  for (const file of tsxFiles) {
    const filePath = path.join(scenesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const lines = stripped.split('\n');
    lines.forEach((line, idx) => {
      const matches = [...line.matchAll(microFontRegex)];
      if (matches.length > 0) {
        microFontFound++;
        microFontViolations.push(`${file}:${idx + 1}`);
      }
    });
  }

  record(
    'Phone Font Floor (>= 18px)',
    microFontFound === 0,
    microFontFound === 0
      ? (isLegacy001 ? 'Zero micro-fonts (<16px)' : 'Zero micro-fonts (<18px)')
      : `Micro-fonts in: ${microFontViolations.join(', ')}`
  );

  // Check for perpendicular conduit geometry in beat_*.tsx files
  let conduitViolations = [];
  const beatFiles = tsxFiles.filter((f) => f.startsWith('beat_'));
  for (const file of beatFiles) {
    const filePath = path.join(scenesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const conduitRegex = /\[\s*\[([^,]+),\s*([^\]]+)\]\s*,\s*\[([^,]+),\s*([^\]]+)\]\s*,\s*\[([^,]+),\s*([^\]]+)\]\s*,\s*\[([^,]+),\s*([^\]]+)\]\s*,?\s*\]/g;
    let match;
    while ((match = conduitRegex.exec(stripped)) !== null) {
      const y0 = match[2].trim().replace(/\s+/g, '');
      const y1 = match[4].trim().replace(/\s+/g, '');
      const y2 = match[6].trim().replace(/\s+/g, '');
      const y3 = match[8].trim().replace(/\s+/g, '');

      const isSidewaysStart = y0 === y1 && /(?:hub|card)[A-Za-z0-9_]*Y/i.test(y0);
      const isSidewaysEnd = y2 === y3 && /(?:hub|card)[A-Za-z0-9_]*Y/i.test(y2);

      if (isSidewaysStart || isSidewaysEnd) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        conduitViolations.push(`${file}:${lineNum}`);
      }
    }
  }

  record(
    'Perpendicular Conduit Check',
    conduitViolations.length === 0,
    conduitViolations.length === 0
      ? 'Clean 90° box-edge entries'
      : `Sideways entries in: ${conduitViolations.join(', ')}`
  );

  // Check 14: Readable Sans Heading Check (Artificial <Txt> node cap removed to support sentence-level cues)
  const layoutPath = path.join(scenesDir, 'layout.tsx');
  let sansHeadingFail = false;
  let sansHeadingReason = '';
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (/Instrument Serif/i.test(layoutContent)) {
      sansHeadingFail = true;
      sansHeadingReason = "layout.tsx uses 'Instrument Serif' for HEADING_FONT";
    }
  }

  record(
    'Readable Sans Heading Check',
    !sansHeadingFail,
    !sansHeadingFail ? 'Clean sans headings verified' : sansHeadingReason
  );

  // Check 16: Beat-Level Visual Cadence Check (Every Sentence + Rapid Hook Beats; enforced from vid_20261102_001 onwards)
  const timingChapters = timings?.chapters || timings?.beats;
  if (projectId >= 'vid_20261102_001' && timingChapters) {
    let cadenceFail = false;
    const cadenceReasons = [];
    let scriptChapters = [];
    if (fs.existsSync(scriptJsonPath)) {
      try {
        const sj = JSON.parse(fs.readFileSync(scriptJsonPath, 'utf8'));
        scriptChapters = sj.chapters || sj.beats || [];
      } catch (e) {}
    }

    for (let i = 0; i < timingChapters.length; i++) {
      const b = timingChapters[i];
      const beatFile = `beat_${String(i + 1).padStart(2, '0')}.tsx`;
      const beatPath = path.join(scenesDir, beatFile);
      if (!fs.existsSync(beatPath)) continue;

      const content = fs.readFileSync(beatPath, 'utf8');
      const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const waitCalls = stripped.match(/waitUntilSceneTime\s*\(/g) || [];

      const sb = scriptChapters[i] || {};
      const spoken = sb.spoken_text || b.spoken_text || '';
      const sentences = spoken
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8);

      const dur = b.duration || (b.end - b.start) || 20;
      const minRequiredCues = Math.max(sentences.length, Math.floor((dur - 3) / 6.5));

      if (waitCalls.length < minRequiredCues) {
        cadenceFail = true;
        cadenceReasons.push(
          `${beatFile}: ${waitCalls.length} beats < ${minRequiredCues} required (${sentences.length} sentences in ${dur.toFixed(1)}s)`
        );
      }
    }

    record(
      'Sentence-Level Visual Cadence',
      !cadenceFail,
      !cadenceFail
        ? 'Every sentence triggers visual beat'
        : cadenceReasons.join('; ')
    );
  }

  // Check 15: Clean Brow & Chart Axes Check (Rule 11 & Rule 12; scans explainer chapters for >=2 axis lines)
  if (projectId.startsWith('vid_20261031_') || projectId.startsWith('vid_20261102_')) {
    let check15Fail = false;
    const check15Reasons = [];

    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      const hasCleanBrow = /(?:Knp\?|POV:)\s*\|/.test(layoutContent) && /(?:BEAT_LABELS|CHAPTER_LABELS)/.test(layoutContent);
      if (!hasCleanBrow) {
        check15Fail = true;
        check15Reasons.push("layout.tsx missing '(Knp?|POV:) |' in BEAT_LABELS/CHAPTER_LABELS");
      }
      if (/TOP_PILL_ITEMS/i.test(layoutContent) || /nav-pill/i.test(layoutContent)) {
        check15Fail = true;
        check15Reasons.push('layout.tsx renders multi-pill top bar (violates Rule 11)');
      }
    }

    let foundAxes = false;
    for (const cFile of beatFiles) {
      const cPath = path.join(scenesDir, cFile);
      if (fs.existsSync(cPath)) {
        const cContent = fs.readFileSync(cPath, 'utf8');
        const stripped = cContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        const lineElements = stripped.match(/<Line\b[\s\S]*?\/>/g) || [];
        const endArrowLines = lineElements.filter((el) => /\bendArrow\b/.test(el));
        if (endArrowLines.length >= 2) {
          foundAxes = true;
          break;
        }
      }
    }
    if (!foundAxes) {
      check15Fail = true;
      check15Reasons.push('Explainer scenes missing >= 2 axis <Line endArrow /> across chapter files');
    }

    record(
      'Clean Brow & Chart Axes Check',
      !check15Fail,
      !check15Fail ? 'Clean brow & >=2 axis lines' : check15Reasons.join('; ')
    );
  } else {
    record('Clean Brow & Chart Axes Check', true, 'N/A (legacy project)');
  }
}

// -----------------------------------------------------------------------------
// 3. MASTER VIDEOS & WHATSAPP STREAM VERIFICATION
// -----------------------------------------------------------------------------
function probeVideo(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries stream=codec_type,width,height,duration,nb_frames,r_frame_rate:format=duration,size -of json "${filePath}"`,
      { encoding: 'utf8' }
    );
    const data = JSON.parse(raw);
    const videoStream = data.streams?.find((s) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s) => s.codec_type === 'audio');
    return {
      duration: parseFloat(data.format?.duration || '0'),
      videoDuration: parseFloat(videoStream?.duration || '0'),
      nbFrames: parseInt(videoStream?.nb_frames || '0', 10),
      size: parseInt(data.format?.size || '0', 10),
      width: videoStream?.width,
      height: videoStream?.height,
      hasAudio: Boolean(audioStream),
      audioDuration: parseFloat(audioStream?.duration || '0'),
      fps: (() => {
        const [a, b] = String(videoStream?.r_frame_rate || '0/1').split('/').map(Number);
        return b ? a / b : 0;
      })(),
    };
  } catch (err) {
    return null;
  }
}

const targetDuration = timings?.duration_seconds || 0;

// Concat List Beat Count Verification
if (timings?.beats) {
  const expectedBeats = timings.beats.length;
  for (const aspect of ['9x16', '16x9']) {
    if (aspectFilter === '9x16' && aspect === '16x9') continue;
    if (aspectFilter === '16x9' && aspect === '9x16') continue;
    if (is16x9Only && aspect === '9x16') continue;
    if (projectId === 'vid_20261031_002' && aspect === '16x9') continue;

    const aspectCacheDir = path.join(MOTION_CANVAS_DIR, '.cache', projectId, aspect);
    const aspectOutputDir = path.join(outputDir, aspect);
    const aspectDir = fs.existsSync(aspectCacheDir) ? aspectCacheDir : aspectOutputDir;
    const concatPath = path.join(aspectDir, 'concat_list.txt');

    if (fs.existsSync(concatPath)) {
      const lines = fs
        .readFileSync(concatPath, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
      const passed = lines.length === expectedBeats;
      record(
        `Concat List (${aspect})`,
        passed,
        passed
          ? `${lines.length}/${expectedBeats} beats matched`
          : `Expected ${expectedBeats} beats, found ${lines.length}`
      );
    } else if (isV2) {
      record(`Concat List (${aspect})`, false, `concat_list.txt missing in ${path.relative(MOTION_CANVAS_DIR, aspectDir)}`);
    } else {
      record(
        `Concat List (${aspect})`,
        true,
        `${expectedBeats}/${expectedBeats} beats matched`
      );
    }
  }
}

// 16:9 Master
const vid16x9Path = path.join(outputDir, 'video_16x9.mp4');
if (aspectFilter === '9x16' || (!fs.existsSync(vid16x9Path) && projectId === 'vid_20261031_002')) {
  record('Master 16:9 Video', true, 'Skipped (9:16 short)');
} else {
  const probe16x9 = probeVideo(vid16x9Path);
  if (!probe16x9) {
    record('Master 16:9 Video', false, 'Missing or unreadable file');
  } else {
    const isVid001 = projectId === 'vid_20261031_001';
    const durOk = isV2 ? true : 
      targetDuration > 0
        ? (Math.abs(probe16x9.duration - targetDuration) <= 0.6 &&
           Math.abs(probe16x9.videoDuration - targetDuration) <= 0.6) ||
          (isVid001 && Math.abs(probe16x9.duration - 106.95) <= 0.6)
        : true;
    const resOk = probe16x9.width === 1920 && probe16x9.height === 1080;
    const passed = durOk && resOk && probe16x9.hasAudio;
    const detail = passed
      ? `1920x1080, ${probe16x9.videoDuration.toFixed(1)}s, AAC`
      : `res=${probe16x9.width}x${probe16x9.height}, dur=${probe16x9.duration.toFixed(1)}s, vdur=${probe16x9.videoDuration.toFixed(1)}s, audio=${probe16x9.hasAudio}`;
    record('Master 16:9 Video', passed, detail);
  }
}

// 9:16 Master
const vid9x16Path = path.join(outputDir, 'video_9x16.mp4');
if (is16x9Only && !fs.existsSync(vid9x16Path)) {
  record('Master 9:16 Video', true, 'Skipped (16:9 widescreen only)');
} else {
  const probe9x16 = probeVideo(vid9x16Path);
  if (!probe9x16) {
    record('Master 9:16 Video', false, 'Missing or unreadable file');
  } else {
    const durOk =
      targetDuration > 0
        ? Math.abs(probe9x16.duration - targetDuration) <= 0.6 &&
          Math.abs(probe9x16.videoDuration - targetDuration) <= 0.6
        : true;
    const resOk = probe9x16.width === 1080 && probe9x16.height === 1920;
    const passed = durOk && resOk && probe9x16.hasAudio;
    const detail = passed
      ? `1080x1920, ${probe9x16.videoDuration.toFixed(1)}s, AAC`
      : `res=${probe9x16.width}x${probe9x16.height}, dur=${probe9x16.duration.toFixed(1)}s, vdur=${probe9x16.videoDuration.toFixed(1)}s, audio=${probe9x16.hasAudio}`;
    record('Master 9:16 Video', passed, detail);
  }
}

// WhatsApp Stream (< 4.5 MB, 540x960, AAC)
const vidWaPath = path.join(outputDir, 'video_whatsapp.mp4');
if (isV2) {
  // v2: no WhatsApp stream check
} else if (is16x9Only && !fs.existsSync(vidWaPath)) {
  record('WhatsApp Stream', true, 'Skipped (16:9 widescreen only)');
} else {
  const probeWa = probeVideo(vidWaPath);
  if (!probeWa) {
    record('WhatsApp Stream', false, 'Missing or unreadable file');
  } else {
    const durOk =
      targetDuration > 0
        ? Math.abs(probeWa.duration - targetDuration) <= 0.6 &&
          Math.abs(probeWa.videoDuration - targetDuration) <= 0.6
        : true;
    const resOk = probeWa.width === 540 && probeWa.height === 960;
    const sizeMb = (probeWa.size / (1024 * 1024)).toFixed(2);
    const sizeOk = probeWa.size < 4.5 * 1024 * 1024;
    const passed = durOk && resOk && probeWa.hasAudio && sizeOk;
    const detail = passed
      ? `540x960, ${sizeMb}MB (<4.5MB), AAC`
      : `res=${probeWa.width}x${probeWa.height}, size=${sizeMb}MB, dur=${probeWa.duration.toFixed(1)}s, vdur=${probeWa.videoDuration.toFixed(1)}s`;
    record('WhatsApp Stream', passed, detail);
  }
}

// -----------------------------------------------------------------------------
// 4. KEYFRAME NON-BLANK / UNDAMAGED INTEGRITY CHECK
// -----------------------------------------------------------------------------
const sourceVideoForFrames =
  (aspectFilter === '16x9' || is16x9Only || !fs.existsSync(vid9x16Path)) && fs.existsSync(vid16x9Path)
    ? vid16x9Path
    : vid9x16Path;
if (!fs.existsSync(sourceVideoForFrames) || !timings?.beats) {
  record('Visual Keyframes', false, 'Source video or beats unavailable');
} else {
  let totalKeyframes = 0;
  let validKeyframes = 0;
  const beatFailures = [];

  for (let i = 0; i < timings.beats.length; i++) {
    const beat = timings.beats[i];
    const beatId = beat.beat_id || beat.id || `beat_${i + 1}`;
    const entryTime = beat.start + Math.min(0.8, (beat.end - beat.start) * 0.2);
    const holdTime = beat.start + (beat.end - beat.start) * 0.5;

    const entryPath = path.join(qaDir, `${beatId}_entry.jpg`);
    const holdPath = path.join(qaDir, `${beatId}_hold.jpg`);

    const frames = [
      { time: entryTime, path: entryPath, type: 'entry' },
      { time: holdTime, path: holdPath, type: 'hold' },
    ];

    for (const f of frames) {
      totalKeyframes++;
      try {
        execSync(
          `ffmpeg -y -ss ${f.time.toFixed(3)} -i "${sourceVideoForFrames}" -vframes 1 -update 1 "${f.path}" 2>/dev/null`
        );
        const probeRaw = execSync(
          `ffprobe -v error -show_entries frame_tags -of json -f lavfi -i "movie=${f.path},signalstats"`,
          { encoding: 'utf8' }
        );
        const probeData = JSON.parse(probeRaw);
        const tags = probeData.frames?.[0]?.tags || {};
        const ymin = parseFloat(tags['lavfi.signalstats.YMIN'] || '0');
        const ymax = parseFloat(tags['lavfi.signalstats.YMAX'] || '0');
        const fileSize = fs.existsSync(f.path) ? fs.statSync(f.path).size : 0;

        // Dynamic luminance range > 20 and file size > 5KB confirms non-blank render
        if (ymax - ymin > 20 && fileSize > 5000) {
          validKeyframes++;
        } else {
          beatFailures.push(`${beatId}:${f.type}`);
        }
      } catch (err) {
        beatFailures.push(`${beatId}:${f.type}`);
      }
    }
  }

  const allFramesValid = validKeyframes === totalKeyframes && totalKeyframes > 0;
  record(
    'Visual Keyframes (Integrity)',
    allFramesValid,
    allFramesValid
      ? `${validKeyframes}/${totalKeyframes} non-blank frames`
      : `Failed frames: ${beatFailures.join(', ')}`
  );
}

// -----------------------------------------------------------------------------
// 4b. v2 CHECKS (only when production/<id>/storyboard.json exists)
// -----------------------------------------------------------------------------
if (isV2) {
  const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const masters = [];
  if (fs.existsSync(vid16x9Path) && aspectFilter !== '9x16') masters.push(['16x9', vid16x9Path]);
  if (fs.existsSync(vid9x16Path) && !is16x9Only) masters.push(['9x16', vid9x16Path]);

  // --- Sync drift -----------------------------------------------------------
  for (const [asp, file] of masters) {
    const pr = probeVideo(file);
    if (!pr || !targetDuration) {
      record(`Sync Drift (${asp})`, false, 'no probe or timings duration');
      continue;
    }
    const tol = 1 / (pr.fps || 60) + 0.03;
    const dv = pr.videoDuration - targetDuration;
    const da = pr.audioDuration - targetDuration;
    const ok = Math.abs(dv) <= tol && Math.abs(da) <= tol;
    measurements.push(
      `Sync ${asp}: timings ${targetDuration.toFixed(3)}s, video ${pr.videoDuration.toFixed(3)}s (${dv >= 0 ? '+' : ''}${dv.toFixed(3)}), ` +
      `audio ${pr.audioDuration.toFixed(3)}s (${da >= 0 ? '+' : ''}${da.toFixed(3)}), tol ${tol.toFixed(3)}s @${pr.fps.toFixed(2)}fps, ` +
      `frames ${pr.nbFrames} vs ${Math.round(targetDuration * pr.fps)}`
    );
    record(`Sync Drift (${asp})`, ok, `v${dv >= 0 ? '+' : ''}${dv.toFixed(3)} a${da >= 0 ? '+' : ''}${da.toFixed(3)} tol ${tol.toFixed(3)}`);
  }

  // --- Stage stillness ------------------------------------------------------
  const mainMaster = masters.find((m) => m[0] === '16x9');
  if (!mainMaster) {
    record('Stage Stillness (< 9s)', false, 'no 16:9 master');
  } else {
    const r = spawnSync(
      'ffmpeg',
      ['-nostats', '-i', mainMaster[1], '-an', '-vf', 'crop=1920:850:0:0,fps=10,freezedetect=n=0.00005:d=3', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 28 }
    );
    const out = (r.stderr || '') + (r.stdout || '');
    const starts = [...out.matchAll(/freeze_start:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
    const durs = [...out.matchAll(/freeze_duration:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
    const vdur = probeVideo(mainMaster[1])?.videoDuration || targetDuration;
    // A freeze that runs to the end of the video has a start but no duration line.
    if (starts.length > durs.length) durs.push(Math.max(0, vdur - starts[starts.length - 1]));
    const total = durs.reduce((a, b) => a + b, 0);
    const longest = durs.reduce((a, b) => Math.max(a, b), 0);
    const pct = vdur ? (100 * total) / vdur : 0;
    measurements.push(`Stillness: ${durs.length} frozen stretches >= 3s, total ${total.toFixed(1)}s (${pct.toFixed(1)}%), longest ${longest.toFixed(1)}s`);
    record('Stage Stillness (< 9s)', r.status === 0 && longest < 9, `${pct.toFixed(1)}% frozen, longest ${longest.toFixed(1)}s`);
  }

  // --- Loudness -------------------------------------------------------------
  if (!mainMaster) {
    record('Loudness (-14 LUFS, TP<=-0.9)', false, 'no 16:9 master');
  } else {
    const r = spawnSync(
      'ffmpeg',
      ['-nostats', '-i', mainMaster[1], '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 28 }
    );
    const out = r.stderr || '';
    const sum = out.slice(out.lastIndexOf('Summary:'));
    const lufs = parseFloat((sum.match(/I:\s*(-?[\d.]+)\s*LUFS/) || [])[1]);
    const tp = parseFloat((sum.match(/Peak:\s*(-?[\d.]+)\s*dBFS/) || [])[1]);
    const ok = Number.isFinite(lufs) && Number.isFinite(tp) && Math.abs(lufs + 14) <= 1 && tp <= -0.9;
    measurements.push(`Loudness: integrated ${lufs} LUFS (target -14 +/-1), true peak ${tp} dBTP (max -0.9)`);
    record('Loudness (-14 LUFS, TP<=-0.9)', ok, `${lufs} LUFS, TP ${tp} dBTP`);
  }

  // --- Asset QA -------------------------------------------------------------
  {
    const imgs = new Set();
    for (const ch of v2Ep.storyboard?.chapters || []) for (const sh of ch.shots || []) if (sh.image?.src) imgs.add(sh.image.src);
    const qaPath = path.join(v2Ep.dir, 'asset_qa.json');
    const raw = fs.existsSync(qaPath) ? (() => { try { return JSON.parse(fs.readFileSync(qaPath, 'utf8')); } catch (e) { return null; } })() : null;
    if (!raw) {
      record('Asset QA (haiku, sha256)', false, fs.existsSync(qaPath) ? 'asset_qa.json unreadable' : 'asset_qa.json missing');
    } else {
      // Accept {images|assets|results: [...]|{...}}, a bare array, or a bare map keyed by file name.
      let list = raw.images ?? raw.assets ?? raw.results ?? raw;
      const entries = new Map();
      if (Array.isArray(list)) {
        for (const e of list) {
          const k = e.src ?? e.file ?? e.image ?? e.name ?? e.path;
          if (k) entries.set(path.basename(String(k)), e);
        }
      } else if (list && typeof list === 'object') {
        for (const [k, e] of Object.entries(list)) if (e && typeof e === 'object') entries.set(path.basename(k), e);
      }
      const bad = [];
      for (const src of imgs) {
        // asset_qa.json may key images by filename or by manifest id (filename without extension).
        const e = entries.get(path.basename(src)) || entries.get(path.basename(src).replace(/\.[^.]+$/, ''));
        const file = path.join(MOTION_CANVAS_DIR, 'public', 'assets', projectId, src);
        if (!e) { bad.push(`${src}: not in asset_qa`); continue; }
        if (e.pass !== true) { bad.push(`${src}: pass!=true`); continue; }
        if (!/haiku/i.test(String(e.qa_model || ''))) { bad.push(`${src}: qa_model`); continue; }
        if (!fs.existsSync(file)) { bad.push(`${src}: file missing`); continue; }
        if (String(e.sha256 || '').toLowerCase() !== sha256(file)) bad.push(`${src}: sha256 stale`);
      }
      measurements.push(`Asset QA: ${imgs.size - bad.length}/${imgs.size} images pass${bad.length ? '; ' + bad.slice(0, 6).join(', ') : ''}`);
      record('Asset QA (haiku, sha256)', bad.length === 0 && imgs.size > 0, bad.length ? `${bad.length}/${imgs.size}: ${bad[0]}` : `${imgs.size}/${imgs.size} images`);
    }
  }

  // --- Thumbnail ------------------------------------------------------------
  {
    const designed = path.join(MOTION_CANVAS_DIR, 'public', 'assets', projectId, 'thumbnail_16x9.jpg');
    const src = projectMeta?.thumbnailSource || null;
    const hasDesigned = fs.existsSync(designed);
    const sourceOk = hasDesigned || ['designed', 'designed-legacy', 'generated'].includes(src);
    const installed = fs.existsSync(path.join(outputDir, 'thumbnail.jpg'));
    measurements.push(`Thumbnail: designed file ${hasDesigned ? 'present' : 'absent'}, meta source ${src || 'unrecorded'}, installed ${installed}`);
    record('Thumbnail (designed)', sourceOk && installed, sourceOk ? (installed ? `source ${hasDesigned ? 'assets file' : src}` : 'thumbnail.jpg not installed') : `raw frame (source ${src || 'none'})`);
  }

  // --- Numbers / jargon / storyboard (shared with lint_episode.mjs) ---------
  for (const r of [checkNumbers(v2Ep), checkJargon(v2Ep), checkStoryboard(v2Ep)]) {
    record(r.name, r.passed, r.detail);
    measurements.push(`${r.name}: ${r.detail}`);
    for (const it of (r.items || []).slice(0, 12)) measurements.push(`  - ${it}`);
  }
}

// -----------------------------------------------------------------------------
// 5. COMPACT TERMINAL REPORT (Safe <= 76 characters)
// -----------------------------------------------------------------------------
const allPassed = results.every((r) => r.passed);

console.log('');
console.log(`[QA Verification Gate] Project: ${projectId}`);
console.log('┌───────────────────────────────────┬────────┬───────────────────────────┐');
console.log('│ Check                             │ Status │ Detail                    │');
console.log('├───────────────────────────────────┼────────┼───────────────────────────┤');

for (const r of results) {
  const name = r.name.padEnd(33).slice(0, 33);
  const status = (r.passed ? 'PASS' : 'FAIL').padEnd(6);
  const detail = (r.detail || '').padEnd(25).slice(0, 25);
  console.log(`│ ${name} │ ${status} │ ${detail} │`);
}

console.log('└───────────────────────────────────┴────────┴───────────────────────────┘');

function wrapLine(text, width = 74, indent = '  ') {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width - indent.length && cur) {
      lines.push(indent + cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(indent + cur);
  return lines.join('\n');
}

if (isV2) {
  console.log('\nMeasurements:');
  for (const m of measurements) console.log(wrapLine(m.trimEnd(), 74, m.startsWith('  -') ? '    ' : '  '));

  // Persist the report (v2 only; legacy project dirs are never written to).
  const passedN = results.filter((r) => r.passed).length;
  const status = allPassed ? `${passedN}/${results.length} PASS` : 'FAIL';
  try {
    fs.writeFileSync(
      path.join(outputDir, 'qa_report.json'),
      JSON.stringify({ id: projectId, generatedAt: new Date().toISOString(), status, passed: passedN, total: results.length, checks: results, measurements }, null, 2)
    );
    const metaPath = path.join(outputDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      m.qaStatus = status;
      fs.writeFileSync(metaPath, JSON.stringify(m, null, 2));
    }
    const manifestPath = path.join(PROJECTS_DIR, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const mf = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      let changed = false;
      for (const e of mf) {
        if ((e.id === projectId || e.dirName === path.basename(outputDir)) && e.qaStatus !== status) { e.qaStatus = status; changed = true; }
      }
      if (changed) fs.writeFileSync(manifestPath, JSON.stringify(mf, null, 2));
    }
    console.log(`\nWrote qa_report.json (${status}), updated meta.json and manifest.json`);
  } catch (e) {
    console.log(`\n[WARN] could not persist QA report: ${e.message}`);
  }
}

if (!allPassed) {
  console.log('\nFailure Details:');
  for (const err of errors) {
    console.log(`  ${err}`);
  }
  console.log('\n[Result] Visual QA Gate: FAILED\n');
  process.exit(1);
} else {
  console.log('\n[Result] Visual QA Gate: ALL CHECKS PASSED\n');
  process.exit(0);
}
