#!/usr/bin/env node

/**
 * AI-nimate Video Renderer & Keyframe Capture
 * 
 * Records HTML/SVG animations to MP4 using Playwright (Chromium) and FFmpeg.
 * Implements low-memory image2pipe frame streaming with virtual clock deterministic stepping.
 * Also provides keyframe capture for Multimodal Visual QA auditing.
 * 
 * Usage CLI:
 *   node scripts/render.js --html stage.html --audio voiceover.mp3 --duration 120 --output video.mp4
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn, execSync } = require('node:child_process');
const { masterProjectAudio } = require('./audio-mixer');

// MIME types for static asset serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

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

/**
 * Checks whether childPath is contained strictly inside parentDir (path traversal prevention).
 * 
 * @param {string} parentDir
 * @param {string} childPath
 * @returns {boolean}
 */
function isPathInside(parentDir, childPath) {
  const rel = path.relative(parentDir, childPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Starts an ephemeral local HTTP server to serve static assets from rootDir (and fallback project assets)
 * bound to 127.0.0.1:0. Prevents path traversal and eliminates Base64 data URI memory bloat.
 * 
 * @param {string} rootDir Directory containing stage.html and local assets
 * @returns {Promise<{ server: http.Server, port: number, baseUrl: string, close: () => Promise<void> }>}
 */
function startStaticAssetServer(rootDir) {
  let resolvedRootDir = path.resolve(rootDir);
  try {
    if (fs.existsSync(resolvedRootDir) && fs.statSync(resolvedRootDir).isFile()) {
      resolvedRootDir = path.dirname(resolvedRootDir);
    }
  } catch (_) {}

  const projectRoot = path.resolve(__dirname, '..');
  const projectAssetsDir = path.resolve(projectRoot, 'assets');

  return new Promise((resolve, reject) => {
    const openSockets = new Set();

    const server = http.createServer((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      let pathname = '/';
      try {
        const parsed = new URL(req.url, 'http://127.0.0.1');
        pathname = decodeURIComponent(parsed.pathname);
      } catch (_) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
      }

      // Default root path to stage.html
      if (pathname === '/' || pathname === '') {
        pathname = '/stage.html';
      }

      let targetFile = null;

      // 1. Try finding file inside rootDir
      const candidateInRoot = path.resolve(resolvedRootDir, '.' + pathname);
      if (isPathInside(resolvedRootDir, candidateInRoot)) {
        if (fs.existsSync(candidateInRoot)) {
          const stat = fs.statSync(candidateInRoot);
          if (stat.isFile()) {
            targetFile = candidateInRoot;
          } else if (stat.isDirectory()) {
            const indexFile = path.join(candidateInRoot, 'stage.html');
            if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
              targetFile = indexFile;
            }
          }
        }
      }

      // 2. Fallback to project root /assets if requested or if shared asset
      if (!targetFile) {
        let assetSub = pathname;
        if (assetSub.startsWith('/assets/')) {
          assetSub = assetSub.slice('/assets/'.length);
        } else if (assetSub.startsWith('/assets')) {
          assetSub = assetSub.slice('/assets'.length);
        }
        const candidateInAssets = path.resolve(projectAssetsDir, '.' + (assetSub.startsWith('/') ? assetSub : '/' + assetSub));
        if (isPathInside(projectAssetsDir, candidateInAssets) && fs.existsSync(candidateInAssets) && fs.statSync(candidateInAssets).isFile()) {
          targetFile = candidateInAssets;
        }
      }

      // If file not found or path traversal attempted
      if (!targetFile) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(targetFile);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Server Error');
        }
      });
      stream.pipe(res);
    });

    server.on('connection', (sock) => {
      openSockets.add(sock);
      sock.on('close', () => openSockets.delete(sock));
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = addr.port;
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({
        server,
        port,
        baseUrl,
        close: () => new Promise((resClose) => {
          for (const s of openSockets) {
            try { s.destroy(); } catch (_) {}
          }
          openSockets.clear();
          try {
            server.close(() => resClose());
          } catch (_) {
            resClose();
          }
        })
      });
    });
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    html: null,
    audio: null,
    storyboard: null,
    projectDir: null,
    duration: null,
    output: 'output.mp4',
    width: 1920,
    height: 1080,
    fps: 24,
    crf: 23,
    jpegQuality: 85,
    ffmpegThreads: 2,
    chromiumMaxHeapMb: 512,
    keyframes: null,
    keyframesDir: null,
    warmup: 0,
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
    else if (arg === '--quality' || arg === '--jpegQuality') options.jpegQuality = parseInt(args[++i], 10);
    else if (arg === '--threads' || arg === '--ffmpegThreads') options.ffmpegThreads = parseInt(args[++i], 10);
    else if (arg === '--heap' || arg === '--chromiumMaxHeapMb') options.chromiumMaxHeapMb = parseInt(args[++i], 10);
    else if (arg === '--keyframes') options.keyframes = args[++i];
    else if (arg === '--keyframesDir') options.keyframesDir = args[++i];
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
  --html <file>         HTML stage file to render (required)
  --audio <file>        Audio file to mix in (optional)
  --storyboard <file>   Storyboard JSON for transition cues (optional)
  --projectDir <dir>    Project directory (optional)
  --duration <sec>      Duration of video in seconds (default: auto from stage)
  --output <file>       Output file path (default: output.mp4)
  --width <pixels>      Viewport width (default: 1920)
  --height <pixels>     Viewport height (default: 1080)
  --fps <number>        Target framerate (default: 24)
  --crf <number>        x264 CRF quality level (default: 23)
  --quality <number>    JPEG screenshot quality 50-95 (default: 85)
  --threads <number>    FFmpeg encoding threads (default: 2)
  --keyframes <dir>     Directory to save scene midpoint keyframes (optional)
  --help, -h            Show this help message
`);
}

/**
 * Capture keyframe snapshots for each scene beat to pass to Visual QA.
 * Uses startStaticAssetServer to load relative assets cleanly without Base64 overhead.
 */
async function captureKeyframes({ htmlPath, beats = [], outputDir, width = 1920, height = 1080 }) {
  const { chromium } = getPlaywright();
  const chromeExecutable = getChromiumPath();
  const absHtml = path.resolve(htmlPath);
  const framesDir = path.resolve(outputDir);
  fs.mkdirSync(framesDir, { recursive: true });

  const rootDir = path.dirname(absHtml);
  const htmlFilename = path.basename(absHtml);
  let assetServer = null;

  const launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };
  if (chromeExecutable) launchOptions.executablePath = chromeExecutable;

  let browser = null;
  let context = null;
  let page = null;

  try {
    try {
      assetServer = await startStaticAssetServer(rootDir);
    } catch (e) {
      console.warn(`[captureKeyframes Warning] Static server fallback: ${e.message}`);
    }

    browser = await chromium.launch(launchOptions);
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1
    });
    page = await context.newPage();

    const targetUrl = assetServer ? `${assetServer.baseUrl}/${encodeURIComponent(htmlFilename)}` : `file://${absHtml}`;
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 120000 });

    // Ensure fonts and images are fully ready before keyframe extraction
    await page.evaluate(async () => {
      if (document.fonts) {
        try { await document.fonts.ready; } catch (_) {}
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

    await page.evaluate(() => {
      window.__MANUAL_SEEK_MODE__ = true;
    }).catch(() => {});

    await page.waitForTimeout(200);

    const results = [];
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

      await page.evaluate(({ target, beatStartMs }) => {
        if (typeof window.__seekTo === 'function' && typeof beatStartMs === 'number') {
          window.__seekTo(beatStartMs);
        } else if (typeof window.seekToBeat === 'function') {
          window.seekToBeat(target);
        }
      }, {
        target: beat.id || i,
        beatStartMs: beat.startMs ?? (beat.startTime ? Math.round(beat.startTime * 1000) : null)
      });

      await page.waitForTimeout(160);
      await page.screenshot({ path: framePath });

      results.push({
        beatId,
        timestamp: beat.startTime || (beat.startMs ? beat.startMs / 1000 : 0),
        framePath
      });
    }

    return results;
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (context) {
      try { await context.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (assetServer) {
      try { await assetServer.close(); } catch (_) {}
    }
  }
}

/**
 * Low-Memory Deterministic Video Renderer using image2pipe & virtual clock
 * 
 * @param {Object} options
 * @returns {Promise<{ outputPath: string, keyframes: string[], durationMs: number, duration: number, sizeBytes: number, sizeMB: string }>}
 */
async function renderStageToVideo(options = {}) {
  const rawHtml = options.html || options.htmlPath || options.stageHtml;
  if (!rawHtml) {
    throw new Error('renderStageToVideo: HTML file path is required');
  }
  const htmlPath = path.resolve(rawHtml);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }

  const outputPath = path.resolve(options.output || options.outputPath || 'output.mp4');
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const rootDir = path.dirname(htmlPath);
  const htmlFilename = path.basename(htmlPath);

  const fps = Math.min(60, Math.max(15, Number(options.fps || options.render?.fps || 24)));
  const jpegQuality = Math.min(95, Math.max(50, Number(options.jpegQuality || options.render?.jpegQuality || 85)));
  const ffmpegThreads = Math.min(4, Math.max(1, Number(options.ffmpegThreads || options.render?.ffmpegThreads || 2)));
  const chromiumMaxHeapMb = Math.min(768, Math.max(256, Number(options.chromiumMaxHeapMb || options.render?.chromiumMaxHeapMb || 512)));
  const crf = Number(options.crf || 23);

  const isShort = options.aspectRatio === '9:16' || options.format === '9:16';
  const width = options.width || (isShort ? 1080 : 1920);
  const height = options.height || (isShort ? 1920 : 1080);

  const { chromium } = getPlaywright();
  const chromeExecutable = getChromiumPath();
  const ffmpegBin = getFfmpegPath();

  let assetServer = null;
  let browser = null;
  let context = null;
  let page = null;
  let ffmpegProc = null;

  try {
    // 1. Start static asset server for rootDir
    assetServer = await startStaticAssetServer(rootDir);

    // 2. Launch Chromium with low-memory flags
    const launchArgs = [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--mute-audio',
      `--js-flags=--max-old-space-size=${chromiumMaxHeapMb}`
    ];
    const launchOptions = { args: launchArgs };
    if (chromeExecutable) launchOptions.executablePath = chromeExecutable;

    browser = await chromium.launch(launchOptions);
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1
    });
    page = await context.newPage();

    // 3. Load stage.html via HTTP
    const stageUrl = `${assetServer.baseUrl}/${encodeURIComponent(htmlFilename)}`;
    await page.goto(stageUrl, { waitUntil: 'load', timeout: 120000 });

    // Wait for fonts & images
    await page.evaluate(async () => {
      if (document.fonts) {
        try { await document.fonts.ready; } catch (_) {}
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

    // Wait for window.__STAGE_READY
    await page.waitForFunction(() => window.__STAGE_READY === true, { timeout: 15000 }).catch(() => {});

    // Set manual seek mode
    await page.evaluate(() => {
      window.__MANUAL_SEEK_MODE__ = true;
    });

    // Determine duration
    let durationSec = options.duration ?? options.durationSec ?? (options.durationMs ? options.durationMs / 1000 : null);
    if (!durationSec) {
      const pageDurationMs = await page.evaluate(() => {
        if (typeof window.__TOTAL_DURATION_MS__ === 'number' && window.__TOTAL_DURATION_MS__ > 0) {
          return window.__TOTAL_DURATION_MS__;
        }
        if (Array.isArray(window.__SCENES__) && window.__SCENES__.length > 0) {
          const last = window.__SCENES__[window.__SCENES__.length - 1];
          return last.endMs || (last.startMs + (last.durationMs || 5000));
        }
        return null;
      });
      if (pageDurationMs) {
        durationSec = pageDurationMs / 1000;
      } else {
        durationSec = 10;
      }
    }
    const durationMs = Math.round(durationSec * 1000);
    const totalFrames = Math.max(1, Math.round(durationSec * fps));

    // Resolve audio mastering
    let finalAudioPath = null;
    if (options.audio && fs.existsSync(options.audio)) {
      const rawAudioPath = path.resolve(options.audio);
      finalAudioPath = rawAudioPath;

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
          durationSec
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

    // Configure keyframe capture at scene midpoints
    let targetKeyframesDir = null;
    if (typeof options.keyframesDir === 'string') {
      targetKeyframesDir = path.resolve(options.keyframesDir);
    } else if (typeof options.keyframes === 'string') {
      targetKeyframesDir = path.resolve(options.keyframes);
    } else if (options.keyframes === true) {
      targetKeyframesDir = path.join(outputDir, 'keyframes');
    }
    if (targetKeyframesDir) {
      fs.mkdirSync(targetKeyframesDir, { recursive: true });
    }

    let scenes = options.scenes || options.beats || (options.storyboard && options.storyboard.scenes);
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      try {
        scenes = await page.evaluate(() => {
          return (window.__SCENES__ && Array.isArray(window.__SCENES__)) ? window.__SCENES__ : [];
        });
      } catch (_) {
        scenes = [];
      }
    }

    const keyframeMap = new Map();
    const savedKeyframes = [];
    if (Array.isArray(scenes) && scenes.length > 0) {
      scenes.forEach((sc, idx) => {
        const sceneId = sc.id || `scene-${String(idx + 1).padStart(2, '0')}`;
        const startMs = sc.startMs ?? (sc.startTime ? Math.round(sc.startTime * 1000) : 0);
        const endMs = sc.endMs ?? (startMs + (sc.durationMs || (sc.duration ? Math.round(sc.duration * 1000) : 5000)));
        const midMs = Math.round((startMs + endMs) / 2);
        const targetFrame = Math.min(totalFrames - 1, Math.max(0, Math.round((midMs / 1000) * fps)));
        if (!keyframeMap.has(targetFrame)) {
          keyframeMap.set(targetFrame, []);
        }
        keyframeMap.get(targetFrame).push({ sceneId, midMs, index: idx });
      });
    }

    // Spawn ffmpeg with image2pipe
    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-r', String(fps),
      '-i', '-'
    ];

    if (finalAudioPath && fs.existsSync(finalAudioPath)) {
      ffmpegArgs.push(
        '-i', finalAudioPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-threads', String(ffmpegThreads),
        '-crf', String(crf),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputPath
      );
    } else {
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-threads', String(ffmpegThreads),
        '-crf', String(crf),
        outputPath
      );
    }

    ffmpegProc = spawn(ffmpegBin, ffmpegArgs, {
      stdio: ['pipe', 'inherit', 'inherit']
    });

    let ffmpegErrored = null;
    ffmpegProc.on('error', (err) => {
      ffmpegErrored = err;
    });

    const ffmpegPromise = new Promise((resolve, reject) => {
      ffmpegProc.on('error', reject);
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    ffmpegProc.stdin.on('error', (err) => {
      if (err.code !== 'EPIPE' && err.code !== 'ERR_STREAM_DESTROYED') {
        console.warn(`[render] ffmpeg stdin error: ${err.message}`);
      }
    });

    console.log(`[render] Beginning deterministic render: ${totalFrames} frames @ ${fps}fps (${durationSec.toFixed(1)}s)...`);

    // Frame-by-frame loop with deterministic __seekTo and backpressure handling
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (ffmpegErrored) {
        throw ffmpegErrored;
      }

      const timeMs = Math.round((frameIdx / fps) * 1000);
      await page.evaluate((t) => {
        if (typeof window.__seekTo === 'function') {
          window.__seekTo(t);
        }
      }, timeMs);

      const jpegBuffer = await page.screenshot({
        type: 'jpeg',
        quality: jpegQuality
      });

      if (targetKeyframesDir && keyframeMap.has(frameIdx)) {
        const items = keyframeMap.get(frameIdx);
        for (const item of items) {
          const kfPath = path.join(targetKeyframesDir, `${item.sceneId}.jpg`);
          fs.writeFileSync(kfPath, jpegBuffer);
          savedKeyframes.push(kfPath);
        }
      }

      if (!ffmpegProc.stdin.writable) {
        throw new Error('ffmpeg stdin stream is no longer writable');
      }

      const canWrite = ffmpegProc.stdin.write(jpegBuffer);
      if (!canWrite) {
        await new Promise(resolve => ffmpegProc.stdin.once('drain', resolve));
      }
    }

    await new Promise(resolve => {
      if (ffmpegProc.stdin.writable) {
        ffmpegProc.stdin.end(resolve);
      } else {
        resolve();
      }
    });

    await ffmpegPromise;

    const stats = fs.statSync(outputPath);
    return {
      outputPath,
      duration: durationSec,
      durationMs,
      keyframes: savedKeyframes,
      sizeBytes: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2)
    };
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (context) {
      try { await context.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (assetServer) {
      try { await assetServer.close(); } catch (_) {}
    }
  }
}

// Aliases for compatibility
const renderVideo = renderStageToVideo;
const captureFrames = captureKeyframes;
const renderAnimation = renderStageToVideo;

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
  if (options.duration) {
    console.log(`Duration:     ${options.duration}s`);
  }

  const res = await renderStageToVideo(options);
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
  renderStageToVideo,
  renderAnimation,
  captureKeyframes,
  captureFrames,
  startStaticAssetServer,
  getPlaywright,
  getChromiumPath,
  getFfmpegPath,
  masterProjectAudio
};
