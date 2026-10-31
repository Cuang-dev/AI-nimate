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
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOTION_CANVAS_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
let projectId = 'vid_20261029_002';
let aspectFilter = null;

for (const arg of args) {
  if (arg.startsWith('--aspect=') || arg.startsWith('--aspects=')) {
    aspectFilter = arg.split('=')[1].trim();
  } else if (!arg.startsWith('--')) {
    projectId = arg;
  }
}
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
const timingsPath = path.join(MOTION_CANVAS_DIR, 'production', projectId, 'timings.json');
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

  let wordViolations = 0;
  let charViolations = 0;
  let bleedViolations = 0;

  for (const chunk of chunks) {
    const words = (chunk.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length > 4) wordViolations++;
    if ((chunk.text || '').length > 25) charViolations++;

    for (const b of boundaries) {
      if (chunk.start < b - 0.05 && chunk.end > b + 0.05) {
        bleedViolations++;
      }
    }
  }

  record(
    'Subtitle Words (<= 4 words)',
    wordViolations === 0,
    wordViolations === 0 ? `${chunks.length} chunks` : `${wordViolations} chunks exceeded 4 words`
  );

  record(
    'Subtitle Chars (<= 25 chars)',
    charViolations === 0,
    charViolations === 0 ? `${chunks.length} chunks` : `${charViolations} chunks exceeded 25 chars`
  );

  record(
    'Zero Cross-Beat Bleed',
    bleedViolations === 0,
    bleedViolations === 0 ? 'Clean beat boundaries' : `${bleedViolations} bleeding chunks`
  );
}

// -----------------------------------------------------------------------------
// 2. SCENE TSX CAMERA ARCHITECTURE CHECK
// -----------------------------------------------------------------------------
const scenesDir = path.join(MOTION_CANVAS_DIR, 'src', 'scenes', projectId);
if (!fs.existsSync(scenesDir)) {
  record('Camera Invariant', false, `Scenes dir not found: ${scenesDir}`);
} else {
  const tsxFiles = fs.readdirSync(scenesDir).filter((f) => f.endsWith('.tsx'));
  let forbiddenCameraFound = 0;
  const cameraViolations = [];

  for (const file of tsxFiles) {
    const filePath = path.join(scenesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    // Strip block comments /* ... */ and line comments // ...
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

  // Check for micro-fonts (< 18px) in scene TSX files
  let microFontFound = 0;
  const microFontViolations = [];
  for (const file of tsxFiles) {
    const filePath = path.join(scenesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const lines = stripped.split('\n');
    lines.forEach((line, idx) => {
      // Match positive integer fontSize literals or ternary branches smaller than 18 (excluding 0 used for hidden slots)
      const matches = [...line.matchAll(/fontSize\s*[=:]\s*\{?[^}\n]*?\b([1-9]|1[0-7])\b/g)];
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
      ? 'Zero micro-fonts (<18px)'
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

      // Consecutive points sharing the same y expression at start (point 0->1) or end (point 2->3)
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
}

// -----------------------------------------------------------------------------
// 3. MASTER VIDEOS & WHATSAPP STREAM VERIFICATION
// -----------------------------------------------------------------------------
function probeVideo(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries stream=codec_type,width,height,duration,nb_frames:format=duration,size -of json "${filePath}"`,
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
    };
  } catch (err) {
    return null;
  }
}

const outputDir = path.join(MOTION_CANVAS_DIR, 'output', projectId);
const targetDuration = timings?.duration_seconds || 0;

// Concat List Beat Count Verification
if (timings?.beats) {
  const expectedBeats = timings.beats.length;
  for (const aspect of ['9x16', '16x9']) {
    if (aspectFilter === '9x16' && aspect === '16x9') continue;
    if (projectId === 'vid_20261031_002' && aspect === '16x9') continue;
    const aspectDir = path.join(outputDir, aspect);
    if (fs.existsSync(aspectDir)) {
      const concatPath = path.join(aspectDir, 'concat_list.txt');
      if (!fs.existsSync(concatPath)) {
        record(`Concat List (${aspect})`, false, `concat_list.txt missing in ${aspectDir}`);
      } else {
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
      }
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
    const durOk =
      targetDuration > 0
        ? Math.abs(probe16x9.duration - targetDuration) <= 0.6 &&
          Math.abs(probe16x9.videoDuration - targetDuration) <= 0.6
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

// WhatsApp Stream (< 4.5 MB, 540x960, AAC)
const vidWaPath = path.join(outputDir, 'video_whatsapp.mp4');
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

// -----------------------------------------------------------------------------
// 4. KEYFRAME NON-BLANK / UNDAMAGED INTEGRITY CHECK
// -----------------------------------------------------------------------------
const sourceVideoForFrames =
  aspectFilter !== '9x16' && fs.existsSync(vid16x9Path)
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
