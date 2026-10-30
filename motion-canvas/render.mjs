import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderHeadless() {
  const projectParam = process.argv[2] || 'src/projects/vid_20261021_001/vid_20261021_001';
  const projectName = path.basename(projectParam);

  console.log(`[Motion Canvas] Target project: ${projectParam} (${projectName})`);
  console.log('[Motion Canvas] Starting Vite development server...');
  const server = await createServer({
    root: __dirname,
    server: { port: 9100 },
  });
  await server.listen();
  console.log('[Motion Canvas] Server listening on http://localhost:9100');

  console.log('[Motion Canvas] Launching headless browser with V8 memory optimization flags...');
  const browser = await chromium.launch({
    executablePath:
      '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
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
      if (!txt.includes('Download the React DevTools')) {
        console.log(`[Browser Console] ${txt}`);
      }
    });
    page.on('pageerror', (err) => console.error('[Browser PageError]', err));

    const targetUrl = `http://localhost:9100/${projectParam}`;
    console.log(`[Motion Canvas] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl);

    // Wait for editor UI to initialize
    console.log('[Motion Canvas] Waiting for editor UI to load...');
    await page.waitForTimeout(5000);

    // Switch exporter to Video (FFmpeg) if not already selected
    console.log('[Motion Canvas] Configuring exporter to Video (FFmpeg)...');
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
    console.log('[Motion Canvas] Triggering render button...');
    await page.click('#render');

    // Poll until render finishes (Render button toggles ABORT -> RENDER)
    let renderingStarted = false;
    const maxWaitSeconds = 1800; // allow up to 30 minutes for multi-minute videos
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
          console.log('[Motion Canvas] Rendering has started...');
        }
        if (Date.now() - lastLogTime > 10000) {
          console.log(`[Motion Canvas] Rendering in progress (${sec}s elapsed)...`);
          lastLogTime = Date.now();
        }
      } else if (renderingStarted && state.includes('RENDER')) {
        console.log(`[Motion Canvas] Rendering completed successfully in ${sec}s!`);
        break;
      }
    }

    // Wait for FFmpeg exporter process to finalize writing file
    await page.waitForTimeout(4000);

    const rawOutputPath = path.join(__dirname, 'output', `${projectName}.mp4`);
    const projectOutputDir = path.join(__dirname, 'output', projectName);
    fs.mkdirSync(projectOutputDir, { recursive: true });
    const outputPath = path.join(projectOutputDir, `${projectName}.mp4`);
    console.log(`[Motion Canvas] Checking output at: ${rawOutputPath}`);

    if (fs.existsSync(rawOutputPath)) {
      fs.renameSync(rawOutputPath, outputPath);
      console.log(`[Motion Canvas] Moved rendered file to ${outputPath}, size: ${fs.statSync(outputPath).size} bytes`);

      // Verify audio stream presence
      let hasAudio = false;
      try {
        const ffprobeOut = execSync(
          `ffprobe -i "${outputPath}" -show_streams -select_streams a -loglevel error`,
          { encoding: 'utf8' }
        );
        hasAudio = ffprobeOut.includes('codec_type=audio');
      } catch (e) {
        console.warn('[Motion Canvas] ffprobe check warning:', e.message);
      }

      console.log(`[Motion Canvas] Audio stream present: ${hasAudio}`);
      if (!hasAudio) {
        console.log('[Motion Canvas] Muxing narration audio via ffmpeg...');
        const audioSrc = path.join(__dirname, 'public', 'audio', `${projectName}.wav`);
        const fallbackAudio = path.join(__dirname, 'production', projectName, 'narration.wav');
        const finalAudio = fs.existsSync(audioSrc) ? audioSrc : fallbackAudio;

        const muxedPath = path.join(projectOutputDir, `${projectName}_muxed.mp4`);
        execSync(
          `ffmpeg -y -i "${outputPath}" -i "${finalAudio}" -c:v copy -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart -shortest "${muxedPath}"`,
          { stdio: 'inherit' }
        );
        fs.renameSync(muxedPath, outputPath);
        console.log('[Motion Canvas] Audio successfully muxed into output video.');
      }

      // Encode Intel VAAPI HEVC Master
      const hevcPath = path.join(projectOutputDir, `${projectName}_hevc.mp4`);
      const hevcCmd =
        'ffmpeg -y -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi ' +
        `-i "${outputPath}" ` +
        '-c:v hevc_vaapi -qp 20 -tag:v hvc1 ' +
        '-colorspace bt709 -color_primaries bt709 -color_trc bt709 ' +
        `-c:a copy -movflags +faststart "${hevcPath}"`;
      console.log(`[Motion Canvas] Encoding Intel VAAPI HEVC master: ${hevcCmd}`);
      try {
        execSync(hevcCmd, { stdio: 'inherit' });
        console.log(`[Motion Canvas] HEVC master created at ${hevcPath}`);
      } catch (err) {
        console.warn('[Motion Canvas] VAAPI HEVC encoding warning:', err.message);
      }
    } else {
      throw new Error(`Output file not found at ${rawOutputPath}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

renderHeadless().catch((err) => {
  console.error('[Motion Canvas] Render failed:', err);
  process.exit(1);
});
