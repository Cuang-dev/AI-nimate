import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH =
  process.env.CHROME_BIN ||
  '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

function parseArgs() {
  const args = process.argv.slice(2);
  let projectId = 'vid_20261029_002';
  let force = false;
  let beatsArg = null;
  let port = 9102;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project' && i + 1 < args.length) {
      projectId = args[++i];
    } else if (arg.startsWith('--project=')) {
      projectId = arg.split('=')[1];
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--beats' && i + 1 < args.length) {
      beatsArg = args[++i].split(',').map((b) => b.trim()).filter(Boolean);
    } else if (arg.startsWith('--beats=')) {
      beatsArg = arg.split('=')[1].split(',').map((b) => b.trim()).filter(Boolean);
    } else if (arg === '--port' && i + 1 < args.length) {
      port = parseInt(args[++i], 10);
    } else if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1], 10);
    }
  }

  // Always discover allBeats
  let allBeats = [];
  const projectDir = path.join(__dirname, 'src', 'projects', projectId);
  if (fs.existsSync(projectDir)) {
    const files = fs.readdirSync(projectDir);
    const beatRegex = new RegExp(`^${projectId}_(beat\\d+)\\.ts$`);
    const matched = [];
    for (const f of files) {
      const m = f.match(beatRegex);
      if (m) matched.push(m[1]);
    }
    if (matched.length > 0) {
      matched.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
      allBeats = matched;
    }
  }

  if (allBeats.length === 0) {
    allBeats = ['beat1', 'beat2', 'beat3', 'beat4', 'beat5'];
  }

  const beatsToRender = beatsArg && beatsArg.length > 0 ? beatsArg : allBeats;

  return { projectId, force, beatsToRender, allBeats, port };
}

function isValidVideo(filePath, minDuration = 10) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.size < 500000) return false;
  try {
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    const duration = parseFloat(probe);
    return !isNaN(duration) && duration >= minDuration;
  } catch (e) {
    return false;
  }
}

function configureMeta(projectId, beats, width, height) {
  console.log(`[Config] Setting canvas resolution to ${width}x${height} for all beats (${projectId})...`);
  const projectDir = path.join(__dirname, 'src', 'projects', projectId);
  for (const beat of beats) {
    const metaPath = path.join(projectDir, `${projectId}_${beat}.meta`);
    const metaContent = {
      version: 0,
      shared: {
        background: null,
        range: [0, null],
        size: { x: width, y: height },
        audioOffset: 0,
      },
      preview: { fps: 30, resolutionScale: 1 },
      rendering: {
        fps: 60,
        resolutionScale: 1,
        colorSpace: 'srgb',
        exporter: {
          name: '@motion-canvas/ffmpeg',
          options: { fastStart: true, includeAudio: true },
        },
      },
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));
  }
}

async function renderBeat(serverPort, beatName, aspectDir, projectId, force, getBrowser) {
  const fullProjectName = `${projectId}_${beatName}`;
  const projectParam = `src/projects/${projectId}/${fullProjectName}`;
  const aspectOutputDir = path.join(__dirname, 'output', projectId, aspectDir);
  fs.mkdirSync(aspectOutputDir, { recursive: true });

  const finalBeatPath = path.join(aspectOutputDir, `${fullProjectName}.mp4`);
  if (!force && isValidVideo(finalBeatPath, 12)) {
    console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} already exists and is valid. Skipping.`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`[Sequential Render] Starting ${aspectDir}/${fullProjectName}...`);
  console.log(`========================================`);

  let browser = await getBrowser();
  let page = null;
  try {
    page = await browser.newPage();
  } catch (err) {
    console.warn(`[Sequential Render] Failed to create page (${err.message}). Relaunching browser...`);
    browser = await getBrowser();
    page = await browser.newPage();
  }

  try {
    page.on('console', (msg) => {
      const txt = msg.text();
      if (!txt.includes('Download the React DevTools') && !txt.includes('[vite]')) {
        console.log(`  [Browser] ${txt}`);
      }
    });
    page.on('pageerror', (err) => console.error('  [Browser PageError]', err));

    const targetUrl = `http://localhost:${serverPort}/${projectParam}`;
    console.log(`[Sequential Render] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl);

    console.log('[Sequential Render] Waiting for editor UI (#render)...');
    await page.waitForSelector('#render', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Switch exporter to Video (FFmpeg) if not selected
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const opts = Array.from(s.options).map((o) => o.text);
        if (opts.includes('Video (FFmpeg)')) {
          const idx = opts.indexOf('Video (FFmpeg)');
          s.selectedIndex = idx;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await page.waitForTimeout(600);

    // Trigger Render
    console.log('[Sequential Render] Triggering render...');
    await page.click('#render');

    let renderingStarted = false;
    const maxWaitSeconds = 600;
    let lastLogTime = Date.now();

    for (let sec = 0; sec < maxWaitSeconds; sec++) {
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => {
        const btn = document.querySelector('#render');
        return btn ? btn.innerText.toUpperCase() : '';
      });

      if (state.includes('ABORT')) {
        if (!renderingStarted) {
          renderingStarted = true;
          console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} rendering started...`);
        }
        if (Date.now() - lastLogTime > 10000) {
          console.log(`  [Rendering] ${aspectDir}/${fullProjectName}: ${sec}s elapsed...`);
          lastLogTime = Date.now();
        }
      } else if (renderingStarted && state.includes('RENDER')) {
        console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} completed in ${sec}s!`);
        break;
      }
    }

    // Fast File Flush: Poll rawOutputPath size stability every 300ms (up to 3000ms)
    const rawOutputPath = path.join(__dirname, 'output', `${fullProjectName}.mp4`);
    const pollStart = Date.now();
    let lastSize = -1;
    let stableCount = 0;

    while (Date.now() - pollStart < 3000) {
      await page.waitForTimeout(300);
      if (fs.existsSync(rawOutputPath)) {
        try {
          const curSize = fs.statSync(rawOutputPath).size;
          if (curSize > 0 && curSize === lastSize) {
            stableCount++;
            if (stableCount >= 2) {
              // File size stable across consecutive 300ms intervals
              break;
            }
          } else {
            stableCount = 0;
            lastSize = curSize;
          }
        } catch (e) {
          // ignore transient stat locks
        }
      }
    }

    if (!fs.existsSync(rawOutputPath)) {
      throw new Error(`Raw output not found at ${rawOutputPath}`);
    }

    // Move to aspect output directory
    fs.renameSync(rawOutputPath, finalBeatPath);
    console.log(`[Sequential Render] Saved to ${finalBeatPath} (${fs.statSync(finalBeatPath).size} bytes)`);

    if (!isValidVideo(finalBeatPath, 12)) {
      throw new Error(`Rendered video ${finalBeatPath} is invalid or too short!`);
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function renderAspectPass(serverPort, aspectName, width, height, projectId, beatsToRender, allBeats, force) {
  console.log(`\n############################################################`);
  console.log(`[Pipeline] STARTING PASS: ${aspectName} (${width}x${height})`);
  console.log(`############################################################`);

  configureMeta(projectId, allBeats, width, height);

  const aspectOutputDir = path.join(__dirname, 'output', projectId, aspectName);
  fs.mkdirSync(aspectOutputDir, { recursive: true });

  let browser = null;
  const launchBrowser = async () => {
    return await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: BROWSER_ARGS,
    });
  };

  const getOrRelaunchBrowser = async () => {
    if (!browser || !browser.isConnected()) {
      if (browser) {
        try {
          await browser.close().catch(() => {});
        } catch (e) {}
      }
      console.log(`[Pipeline] Launching Chromium browser instance for ${aspectName}...`);
      browser = await launchBrowser();
    }
    return browser;
  };

  try {
    for (const beat of beatsToRender) {
      await renderBeat(serverPort, beat, aspectName, projectId, force, getOrRelaunchBrowser);
    }
  } finally {
    if (browser) {
      console.log(`[Pipeline] Closing Chromium browser instance for ${aspectName}...`);
      await browser.close().catch(() => {});
      browser = null;
    }
  }

  // Create concat list from allBeats
  const concatListPath = path.join(aspectOutputDir, 'concat_list.txt');
  for (const beat of allBeats) {
    const beatFile = path.join(aspectOutputDir, `${projectId}_${beat}.mp4`);
    if (!fs.existsSync(beatFile)) {
      throw new Error(`[Pipeline] Cannot concatenate: missing beat file ${beatFile}`);
    }
    if (!isValidVideo(beatFile)) {
      throw new Error(`[Pipeline] Cannot concatenate: beat file is invalid or too small ${beatFile}`);
    }
  }
  const concatLines = allBeats.map((beat) => {
    const beatFile = path.join(aspectOutputDir, `${projectId}_${beat}.mp4`);
    return `file '${beatFile}'`;
  }).join('\n');
  fs.writeFileSync(concatListPath, concatLines);

  const concatenatedVideo = path.join(aspectOutputDir, `${projectId}_concat.mp4`);
  console.log(`[Pipeline] Concatenating ${aspectName} beats losslessly...`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideo}"`,
    { stdio: 'inherit' }
  );

  const masterAudio = path.join(__dirname, 'public', 'audio', projectId, 'narration.wav');
  const finalMaster = path.join(__dirname, 'output', projectId, `video_${aspectName}.mp4`);

  console.log(`[Pipeline] Muxing narration audio into master: ${finalMaster}...`);
  execSync(
    `ffmpeg -y -i "${concatenatedVideo}" -i "${masterAudio}" -c:v copy -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart "${finalMaster}"`,
    { stdio: 'inherit' }
  );

  if (fs.existsSync(concatenatedVideo)) {
    fs.unlinkSync(concatenatedVideo);
  }

  console.log(`[Pipeline] ${aspectName} master complete: ${finalMaster} (${fs.statSync(finalMaster).size} bytes)`);
  return finalMaster;
}

async function main() {
  const { projectId, force, beatsToRender, allBeats, port } = parseArgs();

  console.log(`[Dual-Aspect Pipeline] Project: ${projectId}`);
  console.log(`[Dual-Aspect Pipeline] All Beats: ${allBeats.join(', ')}`);
  console.log(`[Dual-Aspect Pipeline] Beats To Render: ${beatsToRender.join(', ')}`);
  console.log(`[Dual-Aspect Pipeline] Force: ${force}`);
  console.log(`[Dual-Aspect Pipeline] Launching Vite dev server on port ${port}...`);

  const server = await createServer({
    root: __dirname,
    server: { port },
  });
  await server.listen();
  console.log(`[Dual-Aspect Pipeline] Server listening on http://localhost:${port}`);

  const startTime = Date.now();
  const projectOutputDir = path.join(__dirname, 'output', projectId);
  fs.mkdirSync(projectOutputDir, { recursive: true });

  try {
    // PASS 1: 9:16 (1080x1920) Vertical Master
    const master9x16 = await renderAspectPass(port, '9x16', 1080, 1920, projectId, beatsToRender, allBeats, force);

    // Also copy to video.mp4
    fs.copyFileSync(master9x16, path.join(projectOutputDir, 'video.mp4'));

    // PASS 2: 16:9 (1920x1080) Widescreen Master
    const master16x9 = await renderAspectPass(port, '16x9', 1920, 1080, projectId, beatsToRender, allBeats, force);

    // Transcode dedicated WhatsApp inline stream (< 4.5 MB, 540x960, Profile Main 3.1)
    const whatsappVideo = path.join(projectOutputDir, 'video_whatsapp.mp4');
    console.log(`[Pipeline] Transcoding dedicated WhatsApp inline stream (< 4.5 MB) to ${whatsappVideo}...`);
    execSync(
      `ffmpeg -y -i "${master9x16}" ` +
      '-vf "scale=540:960" ' +
      '-c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p ' +
      '-b:v 260k -maxrate 340k -bufsize 600k ' +
      '-c:a aac -profile:a aac_low -ar 48000 -ac 1 -b:a 48k ' +
      `-movflags +faststart "${whatsappVideo}"`,
      { stdio: 'inherit' }
    );
    console.log(`[Pipeline] WhatsApp video size: ${fs.statSync(whatsappVideo).size} bytes`);

    // Play badge overlay
    const playBadgeSvgPath = path.join(projectOutputDir, 'play_badge.svg');
    const playBadgePngPath = path.join(projectOutputDir, 'play_badge.png');
    const svgContent = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="46.5" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <polygon points="38,32 66,48 38,64" fill="#ffffff"/>
</svg>`;
    fs.writeFileSync(playBadgeSvgPath, svgContent);
    execSync(`ffmpeg -y -i "${playBadgeSvgPath}" "${playBadgePngPath}"`, { stdio: 'inherit' });

    // WhatsApp Landscape Thumbnail (1200x630, < 150 KB, generated directly from 16:9 master at t=20s)
    const thumbnailOgPath = path.join(projectOutputDir, 'thumbnail_og.jpg');
    console.log(`[Pipeline] Generating WhatsApp landscape preview thumbnail at ${thumbnailOgPath}...`);
    execSync(
      `ffmpeg -y -ss 00:00:20.000 -i "${master16x9}" -i "${playBadgePngPath}" ` +
      '-filter_complex "[0:v]scale=1200:675,crop=1200:630[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
      `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
      { stdio: 'inherit' }
    );
    console.log(`[Pipeline] thumbnail_og.jpg size: ${fs.statSync(thumbnailOgPath).size} bytes`);

    // WhatsApp Square Thumbnail (1080x1080, < 150 KB, generated from 9:16 master at t=20s)
    const thumbnailSquarePath = path.join(projectOutputDir, 'thumbnail_square.jpg');
    console.log(`[Pipeline] Generating WhatsApp square preview thumbnail at ${thumbnailSquarePath}...`);
    execSync(
      `ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -i "${playBadgePngPath}" ` +
      '-filter_complex "[0:v]crop=1080:1080:0:420[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
      `-frames:v 1 -q:v 3 "${thumbnailSquarePath}"`,
      { stdio: 'inherit' }
    );
    console.log(`[Pipeline] thumbnail_square.jpg size: ${fs.statSync(thumbnailSquarePath).size} bytes`);

    // Extract test frames for visual verification: t=20.0s and t=58.0s from BOTH masters
    console.log('[Pipeline] Extracting test verification frames...');
    execSync(`ffmpeg -y -ss 00:00:20.000 -i "${master16x9}" -frames:v 1 /tmp/ai_16x9_t20.jpg`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -ss 00:00:58.000 -i "${master16x9}" -frames:v 1 /tmp/ai_16x9_t58.jpg`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -frames:v 1 /tmp/ai_9x16_t20.jpg`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -ss 00:00:58.000 -i "${master9x16}" -frames:v 1 /tmp/ai_9x16_t58.jpg`, { stdio: 'inherit' });

    // Deploy to public directory for cuang.dev and rsync to docker-host
    const basePublish = '/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia';
    const candidateDirs = [
      path.join(basePublish, projectId),
      path.join(basePublish, 'the-ai-bubble-explained'),
    ];
    const publishDir = candidateDirs.find((d) => fs.existsSync(d));

    if (publishDir) {
      console.log(`[Pipeline] Deploying artifacts to ${publishDir}...`);
      fs.copyFileSync(master9x16, path.join(publishDir, 'video.mp4'));
      fs.copyFileSync(master9x16, path.join(publishDir, 'video_9x16.mp4'));
      fs.copyFileSync(master16x9, path.join(publishDir, 'video_16x9.mp4'));
      fs.copyFileSync(whatsappVideo, path.join(publishDir, 'video_whatsapp.mp4'));
      fs.copyFileSync(thumbnailOgPath, path.join(publishDir, 'thumbnail_og.jpg'));
      fs.copyFileSync(thumbnailSquarePath, path.join(publishDir, 'thumbnail_square.jpg'));

      console.log('[Pipeline] Syncing to docker-host...');
      execSync(
        'rsync -avz /home/agent/orca/AI-nimate/public/projects/ainimate/ docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/',
        { stdio: 'inherit' }
      );
      console.log('[Pipeline] Successfully deployed and synced to docker-host!');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n============================================================`);
    console.log(`[Pipeline] Dual-Aspect Render Pipeline completed in ${elapsed}s!`);
    console.log(`============================================================`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error('[Pipeline Fatal Error]', err);
  process.exit(1);
});
