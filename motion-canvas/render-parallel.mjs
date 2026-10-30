import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderPart(projectParam, port) {
  const projectName = path.basename(projectParam);
  console.log(`[Worker ${port}] Target project: ${projectParam} (${projectName})`);

  // Ensure output directory exists and remove any stale output file for this part
  const outputDir = path.join(__dirname, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${projectName}.mp4`);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  console.log(`[Worker ${port}] Starting Vite server on port ${port}...`);
  const server = await createServer({
    root: __dirname,
    server: { port },
  });
  await server.listen();
  console.log(`[Worker ${port}] Server listening on http://localhost:${port}`);

  console.log(`[Worker ${port}] Launching headless Chromium...`);
  const browser = await chromium.launch({
    executablePath:
      '/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=egl',
      '--enable-gpu-rasterization',
      '--enable-accelerated-2d-canvas',
      '--enable-zero-copy',
      '--ignore-gpu-blocklist',
    ],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const txt = msg.text();
      if (!txt.includes('Download the React DevTools')) {
        console.log(`[Worker ${port} Console] ${txt}`);
      }
    });
    page.on('pageerror', (err) => console.error(`[Worker ${port} PageError]`, err));

    const targetUrl = `http://localhost:${port}/${projectParam}`;
    console.log(`[Worker ${port}] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl);

    // Wait for editor UI to initialize
    console.log(`[Worker ${port}] Waiting for editor UI to load...`);
    await page.waitForTimeout(5000);

    // Switch exporter to Video (FFmpeg) if not already selected
    console.log(`[Worker ${port}] Configuring exporter to Video (FFmpeg)...`);
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
    console.log(`[Worker ${port}] Triggering render button...`);
    await page.click('#render');

    // Poll until render finishes (Render button toggles ABORT -> RENDER)
    let renderingStarted = false;
    const maxWaitSeconds = 1800; // allow up to 30 minutes for multi-minute 60fps videos
    let lastLogTime = Date.now();
    let completed = false;

    for (let sec = 0; sec < maxWaitSeconds; sec++) {
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => {
        const btn = document.querySelector('#render');
        return btn ? btn.innerText.toUpperCase() : '';
      });

      if (state.includes('ABORT')) {
        if (!renderingStarted) {
          renderingStarted = true;
          console.log(`[Worker ${port}] Rendering has started...`);
        }
        if (Date.now() - lastLogTime > 15000) {
          console.log(`[Worker ${port}] Rendering in progress (${sec}s elapsed)...`);
          lastLogTime = Date.now();
        }
      } else if (renderingStarted && state.includes('RENDER')) {
        console.log(`[Worker ${port}] Rendering completed successfully in ${sec}s!`);
        completed = true;
        break;
      }
    }

    if (!completed) {
      throw new Error(`[Worker ${port}] Timed out after ${maxWaitSeconds}s waiting for render to finish.`);
    }

    // Wait for FFmpeg exporter process to finalize writing file
    await page.waitForTimeout(3000);

    console.log(`[Worker ${port}] Checking output at: ${outputPath}`);
    if (fs.existsSync(outputPath)) {
      console.log(`[Worker ${port}] Rendered file exists, size: ${fs.statSync(outputPath).size} bytes`);
      return outputPath;
    } else {
      throw new Error(`Output file not found at ${outputPath}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const startTime = Date.now();
  const projectId = process.argv[2] || 'vid_20261021_001';
  const projectOutputDir = path.join(__dirname, 'output', projectId);
  fs.mkdirSync(projectOutputDir, { recursive: true });

  console.log(`[Motion Canvas Parallel] Launching 2-core parallel render workers for ${projectId}...`);

  // Sequential mode (--sequential) renders one part at a time. Use it on low-RAM hosts:
  // two headless Chromium + two ffmpeg encoders at 1080x1920 exceed ~4 GB and thrash swap.
  const sequential = process.argv.includes('--sequential');
  let part1Path, part2Path;
  if (sequential) {
    console.log('[Motion Canvas Parallel] Sequential mode: rendering parts one at a time.');
    part1Path = await renderPart(`src/projects/${projectId}/${projectId}_part1`, 9101);
    part2Path = await renderPart(`src/projects/${projectId}/${projectId}_part2`, 9102);
  } else {
    [part1Path, part2Path] = await Promise.all([
      renderPart(`src/projects/${projectId}/${projectId}_part1`, 9101),
      renderPart(`src/projects/${projectId}/${projectId}_part2`, 9102),
    ]);
  }

  console.log('[Motion Canvas Parallel] Both parts rendered. Storing concat list...');
  const concatListPath = path.join(projectOutputDir, 'concat_list.txt');
  fs.writeFileSync(
    concatListPath,
    `file '${part1Path}'\nfile '${part2Path}'\n`
  );

  const h264Out = `output/${projectId}/${projectId}.mp4`;
  const hevcOut = `output/${projectId}/${projectId}_hevc.mp4`;
  const audioPath = fs.existsSync(path.join(__dirname, `public/audio/${projectId}.wav`))
    ? `public/audio/${projectId}.wav`
    : `production/${projectId}/narration.wav`;

  const rawStitchCmd =
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -i "${audioPath}" ` +
    `-c:v copy -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart -shortest "${h264Out}"`;
  console.log(`[Motion Canvas Parallel] Stitching lossless H.264 Master: ${rawStitchCmd}`);
  execSync(rawStitchCmd, { cwd: __dirname, stdio: 'inherit' });

  const hevcMasterCmd =
    'ffmpeg -y -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi ' +
    `-i "${h264Out}" ` +
    '-c:v hevc_vaapi -qp 20 -tag:v hvc1 ' +
    '-colorspace bt709 -color_primaries bt709 -color_trc bt709 ' +
    `-c:a copy -movflags +faststart "${hevcOut}"`;
  console.log(`[Motion Canvas Parallel] Executing iGPU VAAPI HEVC Master encode: ${hevcMasterCmd}`);
  execSync(hevcMasterCmd, { cwd: __dirname, stdio: 'inherit' });

  // Clean up temporary part files and concat list
  for (const tempFile of [part1Path, part2Path, concatListPath]) {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Motion Canvas Parallel] Render & stitch complete in ${elapsed}s -> ${projectOutputDir}/`);
}

main().catch((err) => {
  console.error('[Motion Canvas Parallel] Render failed:', err);
  process.exit(1);
});
