#!/usr/bin/env node

/**
 * AI-nimate Video Renderer
 * 
 * Records HTML/SVG animations to MP4/WebM using Playwright (Chromium) and ffmpeg.
 * Supports audio multiplexing, custom duration, resolution, fps, and quality.
 * 
 * Usage CLI:
 *   node scripts/render.js --html examples/cafe-explainer/cafe-animation.html \
 *                          --audio examples/cafe-explainer/cafe-assets/audio/master_voiceover.mp3 \
 *                          --duration 40.55 \
 *                          --output output.mp4
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  --html <file>       HTML file to render (required)
  --audio <file>      Audio file to mix in (optional)
  --duration <sec>    Duration of video in seconds (default: 10)
  --output <file>     Output file path (default: output.mp4)
  --width <pixels>    Viewport width (default: 1920)
  --height <pixels>   Viewport height (default: 1080)
  --fps <number>      Target framerate (default: 60)
  --crf <number>      x264 CRF quality level (default: 19)
  --warmup <sec>      Warm-up wait before capture (default: 1.0)
  --help, -h          Show this help message
`);
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

  const htmlPath = path.resolve(options.html);
  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found: ${htmlPath}`);
    process.exit(1);
  }

  const outputPath = path.resolve(options.output);
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const rawDir = path.join(outputDir, `.raw_render_${Date.now()}`);
  fs.mkdirSync(rawDir, { recursive: true });

  const { chromium } = getPlaywright();
  const chromeExecutable = getChromiumPath();
  const ffmpegBin = getFfmpegPath();

  console.log('== AI-nimate Video Rendering Pipeline ==');
  console.log(`HTML Source:  ${htmlPath}`);
  console.log(`Output Video: ${outputPath}`);
  console.log(`Resolution:   ${options.width}x${options.height} @ ${options.fps}fps`);
  console.log(`Duration:     ${options.duration}s (Warmup: ${options.warmup}s)`);
  if (options.audio) console.log(`Audio Track:  ${path.resolve(options.audio)}`);

  console.log('\n[1/3] Launching Headless Chromium & recording viewport...');
  const launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-fast-unload']
  };
  if (chromeExecutable) launchOptions.executablePath = chromeExecutable;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    recordVideo: {
      dir: rawDir,
      size: { width: options.width, height: options.height }
    },
    viewport: { width: options.width, height: options.height }
  });

  const page = await context.newPage();
  await page.goto(`file://${htmlPath}`);

  if (options.warmup > 0) {
    await page.waitForTimeout(options.warmup * 1000);
  }

  // Record for duration + 2s buffer to avoid missing final tail
  const recordMs = (options.duration + 2.0) * 1000;
  console.log(`[2/3] Capturing animation frames (${(recordMs / 1000).toFixed(1)}s)...`);
  await page.waitForTimeout(recordMs);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const recordedRawPath = await video.path();
  console.log(`Raw capture saved to temporary file: ${recordedRawPath}`);

  console.log('[3/3] Encoding & multiplexing with ffmpeg...');
  let ffmpegCmd = '';
  if (options.audio && fs.existsSync(options.audio)) {
    const audioPath = path.resolve(options.audio);
    ffmpegCmd = `${ffmpegBin} -y -ss ${options.warmup} -i "${recordedRawPath}" -i "${audioPath}" -t ${options.duration} -map 0:v:0 -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -r ${options.fps} -crf ${options.crf} -preset medium -c:a aac -b:a 192k "${outputPath}"`;
  } else {
    ffmpegCmd = `${ffmpegBin} -y -ss ${options.warmup} -i "${recordedRawPath}" -t ${options.duration} -c:v libx264 -pix_fmt yuv420p -r ${options.fps} -crf ${options.crf} -preset medium "${outputPath}"`;
  }

  execSync(ffmpegCmd, { stdio: 'inherit' });

  // Cleanup raw files
  fs.rmSync(rawDir, { recursive: true, force: true });

  const stats = fs.statSync(outputPath);
  console.log(`\nRendering Complete!`);
  console.log(`Final File: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)\n`);
}

main().catch(err => {
  console.error('Fatal render error:', err);
  process.exit(1);
});
