#!/usr/bin/env node

/**
 * AI-nimate Broadcast Audio Mastering & Procedural SFX Pipeline
 * 
 * Features:
 * - Dynamic sidechain ducking (-22dB) under narration
 * - High-pass filtering (80Hz) and broadcast compression on voiceover
 * - Procedural documentary ambient drone/pulse synthesis (aevalsrc) or custom BGM
 * - Procedural documentary transition cues (whoosh/thud on beat transitions,
 *   crisp tick on data/financial metrics)
 * - Bulletproof try/catch fallback ensuring video rendering never fails
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Locate ffmpeg executable (ffmpeg-static or system PATH)
 */
function getFfmpegPath() {
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch (_) {}

  const knownPaths = [
    '/home/agent/.local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg'
  ];
  for (const p of knownPaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const fromPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
    if (fromPath) return fromPath;
  } catch (_) {}
  throw new Error('ffmpeg binary not found in PATH or standard directories.');
}

/**
 * Probe audio file duration in seconds
 */
function probeAudioDuration(filePath, ffmpegBin) {
  try {
    const output = execSync(`"${ffmpegBin}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch (err) {
    const combined = (err.stdout || '') + (err.stderr || '');
    const match = combined.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
    }
  }
  return null;
}

/**
 * Check if a beat contains financial or quantitative data metrics
 */
function hasDataMetrics(beat) {
  if (!beat) return false;

  // Direct data object with fields
  if (beat.data && typeof beat.data === 'object' && Object.keys(beat.data).length > 0) {
    return true;
  }

  // Layout indicators
  if (typeof beat.layout === 'string') {
    const l = beat.layout.toLowerCase();
    if (l.includes('data') || l.includes('chart') || l.includes('metric') || l.includes('table')) {
      return true;
    }
  }

  // Exhibit checks
  if (beat.exhibit && typeof beat.exhibit === 'object') {
    const t = String(beat.exhibit.type || '').toLowerCase();
    if (t === 'data' || t === 'chart' || t === 'table' || t === 'metric') {
      return true;
    }
  }

  // Textual corpus check for financial tokens, currency, percentages, ratios
  const textCorpus = [
    beat.subtitle,
    beat.annotation,
    beat.labels,
    beat.concept,
    beat.exhibit?.concept,
    beat.exhibit?.description
  ].filter(Boolean).map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');

  const financialRegex = /(Rp[\s\d]|[\d,.]+%|\b(triliun|miliar|juta|persen|percent|saham|ihsg|idx|ebitda|margin|rasio|ratio|chart|grafik|inflasi|valuasi|dividen|per|pbv)\b)/i;
  return financialRegex.test(textCorpus);
}

/**
 * Create standard 44-byte RIFF WAV header for 16-bit PCM mono
 */
function createWavHeader(numSamples, sampleRate = 44100, numChannels = 1) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * blockAlign, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * blockAlign, 40);
  return buffer;
}

/**
 * Procedurally synthesize SFX cues stem based on storyboard beat transitions
 * and data metric detections.
 * 
 * - Beat transitions: soft low-frequency whoosh/thud
 * - Data metrics: subtle crisp high-frequency tick
 */
function generateSfxCuesStem(storyboardPath, durationSec, sampleRate = 44100) {
  const totalSamples = Math.ceil(Math.max(1, durationSec) * sampleRate);
  const audioData = new Float32Array(totalSamples);

  let beats = [];
  if (storyboardPath && fs.existsSync(storyboardPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(storyboardPath, 'utf8'));
      beats = parsed.scenes || parsed.beats || [];
    } catch (err) {
      console.warn(`[audio-mixer] Notice: could not parse storyboard at ${storyboardPath}:`, err.message);
    }
  }

  // Pre-calculate whoosh/thud waveform (0.35s)
  const whooshDur = 0.35;
  const whooshSamples = Math.floor(whooshDur * sampleRate);
  const whooshWave = new Float32Array(whooshSamples);
  for (let i = 0; i < whooshSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.03);
    const decay = Math.exp(-7.5 * t);
    const freq = 95 - 60 * (t / whooshDur);
    // Swept sub-bass sine + warm harmonic
    whooshWave[i] = (Math.sin(2 * Math.PI * freq * t) * 0.75 + Math.sin(2 * Math.PI * 52 * t) * 0.25)
      * attack * decay * 0.22;
  }

  // Pre-calculate crisp data tick waveform (0.06s)
  const tickDur = 0.06;
  const tickSamples = Math.floor(tickDur * sampleRate);
  const tickWave = new Float32Array(tickSamples);
  for (let i = 0; i < tickSamples; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-60 * t);
    // Dual high-frequency sine click
    tickWave[i] = (Math.sin(2 * Math.PI * 2600 * t) * 0.7 + Math.sin(2 * Math.PI * 5200 * t) * 0.3)
      * decay * 0.14;
  }

  // Place cues on timeline
  let lastWhooshTime = -1.0;
  for (let idx = 0; idx < beats.length; idx++) {
    const beat = beats[idx];
    const startTime = typeof beat.startTime === 'number' ? beat.startTime : (parseFloat(beat.startTime) || 0);

    // Beat transition cue (skip initial start < 0.1s; debounce within 0.25s)
    if (startTime >= 0.1 && startTime < durationSec && (startTime - lastWhooshTime >= 0.25)) {
      lastWhooshTime = startTime;
      const startSample = Math.floor(startTime * sampleRate);
      for (let i = 0; i < whooshSamples; i++) {
        if (startSample + i < totalSamples) {
          audioData[startSample + i] += whooshWave[i];
        }
      }
    }

    // Crisp data metric tick
    if (hasDataMetrics(beat) && startTime < durationSec) {
      const tickOffset = startTime >= 0.1 ? startTime + 0.05 : startTime;
      const startSample = Math.floor(tickOffset * sampleRate);
      for (let i = 0; i < tickSamples; i++) {
        if (startSample + i < totalSamples) {
          audioData[startSample + i] += tickWave[i];
        }
      }
    }
  }

  // Convert Float32 buffer to 16-bit PCM Buffer
  const pcm16 = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, audioData[i]));
    pcm16.writeInt16LE(Math.floor(clamped < 0 ? clamped * 32768 : clamped * 32767), i * 2);
  }

  const header = createWavHeader(totalSamples, sampleRate, 1);
  return Buffer.concat([header, pcm16]);
}

/**
 * Master project audio:
 * Narration voiceover + ducked ambient underscore + beat transition & data SFX cues
 */
async function masterProjectAudio({
  projectDir = null,
  voiceoverPath = null,
  storyboardPath = null,
  outputPath = null,
  durationSec = null
} = {}) {
  const ffmpegBin = getFfmpegPath();

  // 1. Resolve project directory
  let resolvedProjectDir = projectDir ? path.resolve(projectDir) : null;
  if (!resolvedProjectDir && voiceoverPath) {
    const parent = path.dirname(path.resolve(voiceoverPath));
    resolvedProjectDir = path.basename(parent) === 'audio' ? path.dirname(parent) : parent;
  }
  if (!resolvedProjectDir && storyboardPath) {
    const parent = path.dirname(path.resolve(storyboardPath));
    resolvedProjectDir = path.basename(parent) === 'visual' ? path.dirname(parent) : parent;
  }
  if (!resolvedProjectDir) {
    resolvedProjectDir = process.cwd();
  }

  // 2. Resolve voiceover path
  let resolvedVoiceover = voiceoverPath ? path.resolve(voiceoverPath) : null;
  if (!resolvedVoiceover || !fs.existsSync(resolvedVoiceover)) {
    const candidates = [
      path.join(resolvedProjectDir, 'audio', 'voiceover.mp3'),
      path.join(resolvedProjectDir, 'audio', 'narration.mp3'),
      path.join(resolvedProjectDir, 'audio', 'voiceover.wav'),
      path.join(resolvedProjectDir, 'voiceover.mp3')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        resolvedVoiceover = c;
        break;
      }
    }
  }

  // 3. Resolve storyboard path
  let resolvedStoryboard = storyboardPath ? path.resolve(storyboardPath) : null;
  if (!resolvedStoryboard || !fs.existsSync(resolvedStoryboard)) {
    const candidates = [
      path.join(resolvedProjectDir, 'visual', 'storyboard.json'),
      path.join(resolvedProjectDir, 'storyboard.json')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        resolvedStoryboard = c;
        break;
      }
    }
  }

  // 4. Resolve output path
  let resolvedOutput = outputPath
    ? path.resolve(outputPath)
    : path.join(resolvedProjectDir, 'audio', 'mastered-audio.m4a');
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

  // 5. If no voiceover exists, we cannot proceed with full mastering
  if (!resolvedVoiceover || !fs.existsSync(resolvedVoiceover)) {
    console.warn('[audio-mixer] Warning: voiceover file not found. Skipping audio mastering.');
    return resolvedVoiceover || resolvedOutput;
  }

  // 6. Determine final duration
  let finalDuration = durationSec && durationSec > 0 ? parseFloat(durationSec) : null;
  if (!finalDuration) {
    finalDuration = probeAudioDuration(resolvedVoiceover, ffmpegBin);
  }
  if (!finalDuration || finalDuration <= 0) {
    finalDuration = 10.0;
  }

  const tempDir = path.join(path.dirname(resolvedOutput), `.tmp_mastering_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const bgmStemPath = path.join(tempDir, 'bgm_stem.wav');
  const sfxStemPath = path.join(tempDir, 'sfx_stem.wav');

  try {
    // 7. Check if custom BGM exists in projectDir/audio/bgm.mp3 or assets/audio/bgm.mp3
    const bgmCandidates = [
      path.join(resolvedProjectDir, 'audio', 'bgm.mp3'),
      path.join(resolvedProjectDir, 'audio', 'bgm.wav'),
      path.join(__dirname, '../assets/audio/bgm.mp3'),
      path.join(__dirname, '../assets/audio/bgm.wav'),
      path.join(process.cwd(), 'assets', 'audio', 'bgm.mp3')
    ];
    let customBgmPath = null;
    for (const candidate of bgmCandidates) {
      if (fs.existsSync(candidate)) {
        customBgmPath = candidate;
        break;
      }
    }

    if (customBgmPath) {
      console.log(`[audio-mixer] Using custom BGM underscore: ${customBgmPath}`);
      // Loop or trim custom BGM to durationSec
      const bgmCmd = `"${ffmpegBin}" -y -stream_loop -1 -i "${customBgmPath}" -t ${finalDuration} -af "volume=0.25" "${bgmStemPath}"`;
      execSync(bgmCmd, { stdio: 'pipe' });
    } else {
      console.log(`[audio-mixer] Procedurally synthesizing warm documentary ambient drone (${finalDuration.toFixed(1)}s)...`);
      // Synthesize subtle, warm investigative documentary ambient drone/pulse track
      const synthCmd = `"${ffmpegBin}" -y -f lavfi -i "aevalsrc=exprs='sin(55*2*PI*t)*0.35+sin(110*2*PI*t)*0.20+sin(82.41*2*PI*t)*0.15':s=44100:d=${finalDuration}" -af "lowpass=f=280,aecho=0.8:0.88:60:0.4,volume=0.08" -t ${finalDuration} "${bgmStemPath}"`;
      execSync(synthCmd, { stdio: 'pipe' });
    }

    // 8. Generate procedural documentary SFX cues stem
    console.log(`[audio-mixer] Generating procedural beat transition & metric cues from storyboard...`);
    const sfxBuffer = generateSfxCuesStem(resolvedStoryboard, finalDuration);
    fs.writeFileSync(sfxStemPath, sfxBuffer);

    // 9. Full Master Mix with Dynamic Sidechain Ducking
    // - Voiceover: High-passed at 80Hz + broadcast compression / boost
    // - Underscore: Sidechain ducked under voiceover (-22dB relative)
    // - SFX cues: Layered crisp transitions and metrics
    // - Master output: alimiter to prevent digital clipping
    console.log(`[audio-mixer] Executing dynamic sidechain ducking & broadcast mastering...`);
    const isMp3 = resolvedOutput.toLowerCase().endsWith('.mp3');
    const codecArgs = isMp3 ? '-c:a libmp3lame -b:a 192k' : '-c:a aac -b:a 192k';

    const filtergraph = [
      '[0:a]aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=15:release=150:makeup=2.5dB,asplit=2[vo_master][vo_sidechain]',
      '[1:a]aformat=channel_layouts=stereo[bgm_in]',
      '[bgm_in][vo_sidechain]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=350[ducked_bgm]',
      '[ducked_bgm]volume=-3dB[bgm_master]',
      '[2:a]aformat=channel_layouts=stereo,volume=0.85[sfx_master]',
      '[vo_master][bgm_master][sfx_master]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.98[mastered]'
    ].join(';');

    const masterCmd = `"${ffmpegBin}" -y -i "${resolvedVoiceover}" -i "${bgmStemPath}" -i "${sfxStemPath}" -filter_complex "${filtergraph}" -map "[mastered]" -t ${finalDuration} ${codecArgs} "${resolvedOutput}"`;
    execSync(masterCmd, { stdio: 'pipe' });

    console.log(`[audio-mixer] Mastered broadcast audio generated: ${resolvedOutput}`);
    return resolvedOutput;

  } catch (err) {
    // Bulletproof fallback: If mastering fails, gracefully copy or return voiceoverPath
    console.warn(`[audio-mixer Warning] Mastering pipeline failed: ${err.message}. Gracefully falling back to raw voiceover.`);
    try {
      if (fs.existsSync(resolvedVoiceover)) {
        if (path.resolve(resolvedOutput) !== path.resolve(resolvedVoiceover)) {
          fs.copyFileSync(resolvedVoiceover, resolvedOutput);
          return resolvedOutput;
        }
      }
    } catch (_) {}
    return resolvedVoiceover;

  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

// CLI test harness
async function main() {
  const args = process.argv.slice(2);
  let projectDir = null;
  let voiceoverPath = null;
  let storyboardPath = null;
  let outputPath = null;
  let durationSec = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--project') projectDir = args[++i];
    else if (a === '--voiceover' || a === '--audio') voiceoverPath = args[++i];
    else if (a === '--storyboard') storyboardPath = args[++i];
    else if (a === '--output' || a === '-o') outputPath = args[++i];
    else if (a === '--duration' || a === '-d') durationSec = parseFloat(args[++i]);
  }

  if (!voiceoverPath && !projectDir) {
    console.log(`Usage: node scripts/audio-mixer.js --voiceover <path> [--storyboard <path>] [--output <path>] [--duration <sec>]`);
    process.exit(0);
  }

  const result = await masterProjectAudio({ projectDir, voiceoverPath, storyboardPath, outputPath, durationSec });
  console.log(`Audio Mastering Complete: ${result}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Audio Mixer Error:', err);
    process.exit(1);
  });
}

module.exports = {
  masterProjectAudio,
  getFfmpegPath,
  probeAudioDuration,
  hasDataMetrics,
  generateSfxCuesStem
};
