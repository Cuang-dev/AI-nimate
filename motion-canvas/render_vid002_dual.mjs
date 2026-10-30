import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH =
  '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';

const PROJECT_ID = 'vid_20261029_002';
const BEATS = ['beat1', 'beat2', 'beat3', 'beat4', 'beat5'];
const PORT = 9102;

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

function configureMeta(width, height) {
  console.log(`[Config] Setting canvas resolution to ${width}x${height} for all beats...`);
  const projectDir = path.join(__dirname, 'src', 'projects', PROJECT_ID);
  for (const beat of BEATS) {
    const metaPath = path.join(projectDir, `${PROJECT_ID}_${beat}.meta`);
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

async function renderBeat(serverPort, beatName, aspectDir) {
  const fullProjectName = `${PROJECT_ID}_${beatName}`;
  const projectParam = `src/projects/${PROJECT_ID}/${fullProjectName}`;
  const aspectOutputDir = path.join(__dirname, 'output', PROJECT_ID, aspectDir);
  fs.mkdirSync(aspectOutputDir, { recursive: true });

  const finalBeatPath = path.join(aspectOutputDir, `${fullProjectName}.mp4`);
  if (isValidVideo(finalBeatPath, 12)) {
    console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} already exists and is valid. Skipping.`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`[Sequential Render] Starting ${aspectDir}/${fullProjectName}...`);
  console.log(`========================================`);

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--js-flags=--max-old-space-size=4096',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    const page = await browser.newPage();
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

    console.log('[Sequential Render] Waiting for editor UI...');
    await page.waitForTimeout(5000);

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

    await page.waitForTimeout(1000);

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

    // Wait for FFmpeg process to close output file
    await page.waitForTimeout(3000);

    const rawOutputPath = path.join(__dirname, 'output', `${fullProjectName}.mp4`);
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
    await browser.close();
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function renderAspectPass(serverPort, aspectName, width, height) {
  console.log(`\n############################################################`);
  console.log(`[Pipeline] STARTING PASS: ${aspectName} (${width}x${height})`);
  console.log(`############################################################`);

  configureMeta(width, height);

  const aspectOutputDir = path.join(__dirname, 'output', PROJECT_ID, aspectName);
  fs.mkdirSync(aspectOutputDir, { recursive: true });

  for (const beat of BEATS) {
    await renderBeat(serverPort, beat, aspectName);
  }

  // Create concat list
  const concatListPath = path.join(aspectOutputDir, 'concat_list.txt');
  const concatLines = BEATS.map((beat) => {
    const beatFile = path.join(aspectOutputDir, `${PROJECT_ID}_${beat}.mp4`);
    return `file '${beatFile}'`;
  }).join('\n');
  fs.writeFileSync(concatListPath, concatLines);

  const concatenatedVideo = path.join(aspectOutputDir, `${PROJECT_ID}_concat.mp4`);
  console.log(`[Pipeline] Concatenating ${aspectName} beats losslessly...`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideo}"`,
    { stdio: 'inherit' }
  );

  const masterAudio = path.join(__dirname, 'public', 'audio', PROJECT_ID, 'narration.wav');
  const finalMaster = path.join(__dirname, 'output', PROJECT_ID, `video_${aspectName}.mp4`);

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
  console.log(`[Dual-Aspect Pipeline] Launching Vite dev server on port ${PORT}...`);
  const server = await createServer({
    root: __dirname,
    server: { port: PORT },
  });
  await server.listen();
  console.log(`[Dual-Aspect Pipeline] Server listening on http://localhost:${PORT}`);

  const startTime = Date.now();
  const projectOutputDir = path.join(__dirname, 'output', PROJECT_ID);
  fs.mkdirSync(projectOutputDir, { recursive: true });

  try {
    // PASS 1: 9:16 (1080x1920) Vertical Master
    const master9x16 = await renderAspectPass(PORT, '9x16', 1080, 1920);

    // Also copy to video.mp4
    fs.copyFileSync(master9x16, path.join(projectOutputDir, 'video.mp4'));

    // PASS 2: 16:9 (1920x1080) Widescreen Master
    const master16x9 = await renderAspectPass(PORT, '16x9', 1920, 1080);

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
    const publishDir = '/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained';
    if (fs.existsSync(publishDir)) {
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
