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

const PROJECT_ID = 'vid_20261024_001';
const BEATS = ['beat1', 'beat2', 'beat3', 'beat4', 'beat5', 'beat6'];

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

function isValidVideo(filePath, minDuration = 10) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.size < 1000000) return false; // At least 1MB
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

async function renderBeat(serverPort, beatName, getBrowser) {
  const fullProjectName = `${PROJECT_ID}_${beatName}`;
  const projectParam = `src/projects/${PROJECT_ID}/${fullProjectName}`;
  const projectOutputDir = path.join(__dirname, 'output', PROJECT_ID);
  fs.mkdirSync(projectOutputDir, { recursive: true });

  const finalBeatPath = path.join(projectOutputDir, `${fullProjectName}.mp4`);
  if (isValidVideo(finalBeatPath)) {
    console.log(`[Sequential Render] ${fullProjectName} already exists and is valid. Skipping.`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`[Sequential Render] Starting ${fullProjectName}...`);
  console.log(`========================================`);

  let browser = await getBrowser();
  let page = null;
  try {
    page = await browser.newPage();
  } catch (err) {
    console.warn(`[Sequential Render] Error creating page (${err.message}). Relaunching browser...`);
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
    const maxWaitSeconds = 600; // 10 minutes per beat is generous for ~30s
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
          console.log(`[Sequential Render] ${fullProjectName} rendering started...`);
        }
        if (Date.now() - lastLogTime > 10000) {
          console.log(`  [Rendering] ${fullProjectName}: ${sec}s elapsed...`);
          lastLogTime = Date.now();
        }
      } else if (renderingStarted && state.includes('RENDER')) {
        console.log(`[Sequential Render] ${fullProjectName} completed in ${sec}s!`);
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

    // Move to project output directory
    fs.renameSync(rawOutputPath, finalBeatPath);
    console.log(`[Sequential Render] Saved to ${finalBeatPath} (${fs.statSync(finalBeatPath).size} bytes)`);

    if (!isValidVideo(finalBeatPath, 15)) {
      throw new Error(`Rendered video ${finalBeatPath} is invalid or too short!`);
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function runMaster() {
  console.log(`[Master Pipeline] Starting sequential render pipeline for ${PROJECT_ID}...`);
  console.log('[Master Pipeline] Launching Vite dev server...');
  const server = await createServer({
    root: __dirname,
    server: { port: 9100 },
  });
  await server.listen();
  console.log('[Master Pipeline] Server listening on http://localhost:9100');

  const startTime = Date.now();

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
      console.log('[Master Pipeline] Launching Chromium browser instance...');
      browser = await launchBrowser();
    }
    return browser;
  };

  try {
    for (const beat of BEATS) {
      await renderBeat(9100, beat, getOrRelaunchBrowser);
    }

    console.log('\n========================================');
    console.log('[Master Pipeline] All 6 beats rendered successfully!');
    console.log('========================================');

    const projectOutputDir = path.join(__dirname, 'output', PROJECT_ID);
    const concatListPath = path.join(projectOutputDir, 'concat_list_beats.txt');
    const concatLines = BEATS.map((beat) => {
      const beatFile = path.join(projectOutputDir, `${PROJECT_ID}_${beat}.mp4`);
      return `file '${beatFile}'`;
    }).join('\n');
    fs.writeFileSync(concatListPath, concatLines);
    console.log(`[Master Pipeline] Concat list created at ${concatListPath}`);

    // Lossless concat of video streams
    const concatenatedVideo = path.join(projectOutputDir, `${PROJECT_ID}_video_concat.mp4`);
    console.log('[Master Pipeline] Concatenating beats losslessly...');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideo}"`,
      { stdio: 'inherit' }
    );

    // Mux master narration audio
    const masterAudio = path.join(__dirname, 'public', 'audio', `${PROJECT_ID}.wav`);
    const masterH264 = path.join(projectOutputDir, `${PROJECT_ID}.mp4`);
    console.log(`[Master Pipeline] Muxing master narration audio from ${masterAudio}...`);
    execSync(
      `ffmpeg -y -i "${concatenatedVideo}" -i "${masterAudio}" -c:v copy -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart "${masterH264}"`,
      { stdio: 'inherit' }
    );
    console.log(`[Master Pipeline] Master H.264 video saved to ${masterH264}`);

    // Intel VAAPI HEVC Master
    const masterHEVC = path.join(projectOutputDir, `${PROJECT_ID}_hevc.mp4`);
    console.log(`[Master Pipeline] Encoding Intel VAAPI HEVC master to ${masterHEVC}...`);
    const hevcCmd =
      'ffmpeg -y -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi ' +
      `-i "${masterH264}" ` +
      '-c:v hevc_vaapi -qp 20 -tag:v hvc1 ' +
      '-colorspace bt709 -color_primaries bt709 -color_trc bt709 ' +
      `-c:a copy -movflags +faststart "${masterHEVC}"`;
    try {
      execSync(hevcCmd, { stdio: 'inherit' });
      console.log(`[Master Pipeline] VAAPI HEVC master completed: ${masterHEVC}`);
    } catch (e) {
      console.warn('[Master Pipeline] VAAPI warning, falling back to libx265:', e.message);
      execSync(
        `ffmpeg -y -i "${masterH264}" -c:v libx265 -crf 22 -tag:v hvc1 -c:a copy -movflags +faststart "${masterHEVC}"`,
        { stdio: 'inherit' }
      );
    }

    // Clean up temporary concat video
    if (fs.existsSync(concatenatedVideo)) {
      fs.unlinkSync(concatenatedVideo);
    }

    // Transcode web stream (faststart, WhatsApp / Web friendly)
    const webVideo = path.join(projectOutputDir, 'video_web.mp4');
    console.log(`[Master Pipeline] Transcoding faststart web/WhatsApp video to ${webVideo}...`);
    execSync(
      `ffmpeg -y -i "${masterH264}" ` +
      '-c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -crf 24 -preset fast ' +
      '-c:a aac -b:a 128k -ar 44100 -ac 2 ' +
      `-movflags +faststart "${webVideo}"`,
      { stdio: 'inherit' }
    );

    // Dedicated Fast-Start WhatsApp Inline Stream (< 4.5 MB, 540x960, Profile Main 3.1)
    const whatsappVideo = path.join(projectOutputDir, 'video_whatsapp.mp4');
    console.log(`[Master Pipeline] Transcoding dedicated WhatsApp inline stream (< 4.5 MB) to ${whatsappVideo}...`);
    execSync(
      `ffmpeg -y -i "${masterH264}" ` +
      '-vf "scale=540:960" ' +
      '-c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p ' +
      '-b:v 125k -maxrate 160k -bufsize 320k ' +
      '-c:a aac -profile:a aac_low -ar 48000 -ac 1 -b:a 56k ' +
      `-movflags +faststart "${whatsappVideo}"`,
      { stdio: 'inherit' }
    );

    // Extract high-res thumbnail (< 300KB for WhatsApp)
    const thumbnailPath = path.join(projectOutputDir, 'thumbnail.jpg');
    console.log(`[Master Pipeline] Generating thumbnail at ${thumbnailPath}...`);
    execSync(
      `ffmpeg -y -ss 00:00:01.500 -i "${masterH264}" -frames:v 1 -q:v 3 "${thumbnailPath}"`,
      { stdio: 'inherit' }
    );

    // Play Badge vector overlay for WhatsApp rich link preview cards
    const playBadgeSvgPath = path.join(projectOutputDir, 'play_badge.svg');
    const playBadgePngPath = path.join(projectOutputDir, 'play_badge.png');
    const svgContent = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="46.5" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <polygon points="38,32 66,48 38,64" fill="#ffffff"/>
</svg>`;
    fs.writeFileSync(playBadgeSvgPath, svgContent);
    execSync(`ffmpeg -y -i "${playBadgeSvgPath}" "${playBadgePngPath}"`, { stdio: 'inherit' });

    // WhatsApp Landscape Thumbnail (1200x630, < 150 KB)
    const thumbnailOgPath = path.join(projectOutputDir, 'thumbnail_og.jpg');
    console.log(`[Master Pipeline] Generating WhatsApp landscape preview thumbnail at ${thumbnailOgPath}...`);
    execSync(
      `ffmpeg -y -ss 00:00:21.500 -i "${masterH264}" -i "${playBadgePngPath}" ` +
      '-filter_complex "[0:v]crop=1080:567:0:540,scale=1200:630[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
      `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
      { stdio: 'inherit' }
    );

    // WhatsApp Square Thumbnail (1080x1080, < 150 KB)
    const thumbnailSquarePath = path.join(projectOutputDir, 'thumbnail_square.jpg');
    console.log(`[Master Pipeline] Generating WhatsApp square preview thumbnail at ${thumbnailSquarePath}...`);
    execSync(
      `ffmpeg -y -ss 00:00:21.500 -i "${masterH264}" -i "${playBadgePngPath}" ` +
      '-filter_complex "[0:v]crop=1080:1080:0:300[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
      `-frames:v 1 -q:v 3 "${thumbnailSquarePath}"`,
      { stdio: 'inherit' }
    );

    // Deploy to public directory for cuang.dev
    const publishDir = '/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/offshore-investing-tax-traps-indonesia';
    if (fs.existsSync(publishDir)) {
      console.log(`[Master Pipeline] Deploying artifacts to ${publishDir}...`);
      fs.copyFileSync(webVideo, path.join(publishDir, 'video.mp4'));
      fs.copyFileSync(whatsappVideo, path.join(publishDir, 'video_whatsapp.mp4'));
      fs.copyFileSync(masterH264, path.join(publishDir, 'video_master_1080p.mp4'));
      fs.copyFileSync(masterHEVC, path.join(publishDir, 'video_hevc.mp4'));
      fs.copyFileSync(thumbnailPath, path.join(publishDir, 'thumbnail.jpg'));
      fs.copyFileSync(thumbnailOgPath, path.join(publishDir, 'thumbnail_og.jpg'));
      fs.copyFileSync(thumbnailSquarePath, path.join(publishDir, 'thumbnail_square.jpg'));

      console.log('[Master Pipeline] Syncing to docker-host...');
      execSync(
        'rsync -avz /home/agent/orca/AI-nimate/public/projects/ainimate/ docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/',
        { stdio: 'inherit' }
      );
      console.log('[Master Pipeline] Successfully deployed and synced to docker-host!');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log('\n========================================');
    console.log(`[Master Pipeline] Pipeline fully finished in ${elapsed}s!`);
    console.log('========================================');

    // Run ffprobe verification
    console.log('\n--- Final Verification: H.264 Master ---');
    execSync(
      `ffprobe -i "${masterH264}" -hide_banner`,
      { stdio: 'inherit' }
    );

    console.log('\n--- Final Verification: HEVC Master ---');
    execSync(
      `ffprobe -i "${masterHEVC}" -hide_banner`,
      { stdio: 'inherit' }
    );

  } finally {
    if (browser) {
      console.log('[Master Pipeline] Closing Chromium browser instance...');
      await browser.close().catch(() => {});
      browser = null;
    }
    await server.close();
  }
}

runMaster().catch((err) => {
  console.error('[Master Pipeline] Fatal Error:', err);
  process.exit(1);
});
