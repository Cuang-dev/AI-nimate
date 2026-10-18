#!/usr/bin/env node

/**
 * AI-nimate Video Renderer & Keyframe Capture
 * 
 * Records HTML/SVG animations to MP4/WebM using Playwright (Chromium) and ffmpeg.
 * Also provides keyframe capture for Multimodal Visual QA auditing.
 * 
 * Usage CLI:
 *   node scripts/render.js --html stage.html --audio voiceover.mp3 --duration 480 --output video.mp4
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { masterProjectAudio } = require('./audio-mixer');

// Dynamic resolver for playwright-core
function getPlaywright() {
  const possiblePaths = [
    'playwright-core',
    path.join(__dirname, '../node_modules/playwright-core'),
    '/home/agent/orca/motion-canvas-mcp/node_modules/playwright-core'
  ];
  for (const p of possiblePaths) {
    try {
      return require(p);
    } catch (_) {}
  }
  throw new Error('playwright-core not found. Run npm install or ensure motion-canvas-mcp is present.');
}

// Locate Chromium executable
function getChromiumPath() {
  const knownPaths = [
    '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    process.env.CHROME_BIN,
    process.env.CHROMIUM_PATH
  ].filter(Boolean);

  for (const p of knownPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Locate ffmpeg executable
function getFfmpegPath() {
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch (_) {}

  const known = [
    '/home/agent/.local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg'
  ];
  for (const p of known) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const fromPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
    if (fromPath) return fromPath;
  } catch (_) {}
  throw new Error('ffmpeg binary not found in PATH or standard directories.');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    html: null,
    audio: null,
    storyboard: null,
    projectDir: null,
    duration: 10,
    output: 'output.mp4',
    width: 1920,
    height: 1080,
    fps: 60,
    crf: 19,
    warmup: 1.0,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--html') options.html = args[++i];
    else if (arg === '--audio') options.audio = args[++i];
    else if (arg === '--storyboard') options.storyboard = args[++i];
    else if (arg === '--projectDir' || arg === '--project') options.projectDir = args[++i];
    else if (arg === '--duration') options.duration = parseFloat(args[++i]);
    else if (arg === '--output' || arg === '-o') options.output = args[++i];
    else if (arg === '--width') options.width = parseInt(args[++i], 10);
    else if (arg === '--height') options.height = parseInt(args[++i], 10);
    else if (arg === '--fps') options.fps = parseInt(args[++i], 10);
    else if (arg === '--crf') options.crf = parseInt(args[++i], 10);
    else if (arg === '--warmup') options.warmup = parseFloat(args[++i]);
  }
  return options;
}

function showHelp() {
  console.log(`
AI-nimate Headless Video Renderer

Usage:
  node scripts/render.js [options]

Options:
  --html <file>         HTML file to render (required)
  --audio <file>        Audio file to mix in (optional)
  --storyboard <file>   Storyboard JSON for transition cues (optional)
  --projectDir <dir>    Project directory (optional)
  --duration <sec>      Duration of video in seconds (default: 10)
  --output <file>       Output file path (default: output.mp4)
  --width <pixels>      Viewport width (default: 1920)
  --height <pixels>     Viewport height (default: 1080)
  --fps <number>        Target framerate (default: 60)
  --crf <number>        x264 CRF quality level (default: 19)
  --warmup <sec>        Warm-up wait before capture (default: 1.0)
  --help, -h            Show this help message
`);
}

/**
 * Capture keyframe snapshots for each scene beat to pass to Visual QA
 */
async function captureKeyframes({ htmlPath, beats = [], outputDir, width = 1920, height = 1080 }) {
  const { chromium } = getPlaywright();
  const chromeExecutable = getChromiumPath();
  const absHtml = path.resolve(htmlPath);
  const framesDir = path.resolve(outputDir);
  fs.mkdirSync(framesDir, { recursive: true });

  const launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (chromeExecutable) launchOptions.executablePath = chromeExecutable;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width, height }
  });
  const page = await context.newPage();
  await page.goto(`file://${absHtml}`, { waitUntil: 'load', timeout: 120000 });

  // Ensure fonts and images are fully ready before keyframe extraction
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  });

  await page.waitForTimeout(400); // initial render latch

  const results = [];
  // For QA audit, sample up to 24 representative keyframes across the timeline to keep QA fast
  const targetBeats = beats.length <= 24 ? beats : (() => {
    const step = (beats.length - 1) / 23;
    const sampled = [];
    const used = new Set();
    for (let k = 0; k < 24; k++) {
      const idx = Math.min(beats.length - 1, Math.round(k * step));
      if (!used.has(idx)) {
        used.add(idx);
        sampled.push(beats[idx]);
      }
    }
    return sampled;
  })();

  for (let i = 0; i < targetBeats.length; i++) {
    const beat = targetBeats[i];
    const beatId = beat.id || `beat_${String(i + 1).padStart(3, '0')}`;
    const framePath = path.join(framesDir, `${beatId}.png`);

    // If the stage has a seek/goToBeat function, evaluate it
    await page.evaluate((target) => {
      if (typeof window.seekToBeat === 'function') {
        window.seekToBeat(target);
      }
    }, beat.id || i);

    await page.waitForTimeout(160); // settle transition cleanly (0.18s CSS transition)
    await page.screenshot({ path: framePath });

    results.push({
      beatId,
      timestamp: beat.startTime || 0,
      framePath
    });
  }

  await page.close();
  await context.close();
  await browser.close();

  return results;
}

/**
 * Render complete video using Playwright video recording + FFmpeg
 */
async function renderVideo(options = {}) {
  const htmlPath = path.resolve(options.html);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }

  const outputPath = path.resolve(options.output || 'output.mp4');
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const rawDir = path.join(outputDir, `.raw_render_${Date.now()}`);
  fs.mkdirSync(rawDir, { recursive: true });

  const width = options.width || 1920;
  const height = options.height || 1080;
  const fps = options.fps || 60;
  const crf = options.crf || 19;
  const warmup = options.warmup ?? 1.0;
  const duration = options.duration || 10;

  const { chromium } = getPlaywright();
  const chromeExecutable = getChromiumPath();
  const ffmpegBin = getFfmpegPath();

  const launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-fast-unload']
  };
  if (chromeExecutable) launchOptions.executablePath = chromeExecutable;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    recordVideo: {
      dir: rawDir,
      size: { width, height }
    },
    viewport: { width, height }
  });

  const page = await context.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 120000 });

  // Ensure fonts and images are fully ready before starting warmup timer
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  });

  if (warmup > 0) {
    await page.waitForTimeout(warmup * 1000);
  }

  // Synchronously trigger stage animation at the exact end of warmup
  await page.evaluate(() => {
    if (typeof window.startStage === 'function') {
      window.startStage();
    }
  });

  // Record for duration + 1s buffer
  const recordMs = (duration + 1.0) * 1000;
  await page.waitForTimeout(recordMs);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const recordedRawPath = await video.path();

  let finalAudioPath = null;
  if (options.audio && fs.existsSync(options.audio)) {
    const rawAudioPath = path.resolve(options.audio);
    finalAudioPath = rawAudioPath;

    // Resolve project directory and storyboard for audio mastering
    const projectDir = options.projectDir ? path.resolve(options.projectDir) : (() => {
      const parent = path.dirname(rawAudioPath);
      if (path.basename(parent) === 'audio') return path.dirname(parent);
      const htmlParent = path.dirname(htmlPath);
      if (path.basename(htmlParent) === 'visual') return path.dirname(htmlParent);
      return path.dirname(outputPath);
    })();

    const storyboardPath = options.storyboard ? path.resolve(options.storyboard) : (() => {
      const candidates = [
        path.join(projectDir, 'visual', 'storyboard.json'),
        path.join(projectDir, 'storyboard.json'),
        path.join(path.dirname(htmlPath), 'storyboard.json')
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return null;
    })();

    const masteredAudioPath = path.join(projectDir, 'audio', 'mastered-audio.m4a');

    try {
      console.log('[render] Mastering broadcast audio with ambient underscore & dynamic ducking...');
      const mastered = await masterProjectAudio({
        projectDir,
        voiceoverPath: rawAudioPath,
        storyboardPath,
        outputPath: masteredAudioPath,
        durationSec: duration
      });
      if (mastered && fs.existsSync(mastered)) {
        finalAudioPath = mastered;
        console.log(`[render] Mastered broadcast audio ready: ${mastered}`);
      }
    } catch (err) {
      console.warn(`[render Warning] Audio mastering failed: ${err.message}. Gracefully falling back to raw voiceover.`);
      finalAudioPath = rawAudioPath;
    }
  }

  let ffmpegCmd = '';
  if (finalAudioPath && fs.existsSync(finalAudioPath)) {
    ffmpegCmd = `${ffmpegBin} -y -ss ${warmup} -i "${recordedRawPath}" -i "${finalAudioPath}" -t ${duration} -map 0:v:0 -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -r ${fps} -crf ${crf} -preset medium -c:a aac -b:a 192k "${outputPath}"`;
  } else {
    ffmpegCmd = `${ffmpegBin} -y -ss ${warmup} -i "${recordedRawPath}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r ${fps} -crf ${crf} -preset medium "${outputPath}"`;
  }

  execSync(ffmpegCmd, { stdio: 'inherit' });
  fs.rmSync(rawDir, { recursive: true, force: true });

  const stats = fs.statSync(outputPath);
  return {
    outputPath,
    duration,
    sizeBytes: stats.size,
    sizeMB: (stats.size / 1024 / 1024).toFixed(2)
  };
}

async function main() {
  const options = parseArgs();
  if (options.help || !options.html) {
    showHelp();
    if (!options.html && !options.help) {
      console.error('\nError: --html argument is required.\n');
      process.exit(1);
    }
    return;
  }

  console.log('== AI-nimate Video Rendering Pipeline ==');
  console.log(`HTML Source:  ${path.resolve(options.html)}`);
  console.log(`Output Video: ${path.resolve(options.output)}`);
  console.log(`Resolution:   ${options.width}x${options.height} @ ${options.fps}fps`);
  console.log(`Duration:     ${options.duration}s`);

  const res = await renderVideo(options);
  console.log(`\nRendering Complete! Output: ${res.outputPath} (${res.sizeMB} MB)\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal render error:', err);
    process.exit(1);
  });
}

module.exports = {
  renderVideo,
  captureKeyframes,
  getPlaywright,
  getChromiumPath,
  getFfmpegPath,
  masterProjectAudio
};
