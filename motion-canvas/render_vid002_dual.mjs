import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

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
  let projectExplicit = false;
  let slug = null;
  let slugExplicit = false;
  let force = false;
  let beatsArg = null;
  let port = 9102;
  let aspects = ['9x16', '16x9'];

  const SLUG_TO_PROJECT = {
    'knp-saham-teknologi-runtuh': 'vid_20261031_002',
    'knp-bursa-kita-terancam-diboikot-dunia': 'vid_20261031_001',
    'the-ai-bubble-explained': 'vid_20261029_002',
    'offshore-investing-tax-traps-indonesia': 'vid_20261024_001',
  };
  const PROJECT_TO_SLUG = {
    'vid_20261031_002': 'knp-saham-teknologi-runtuh',
    'vid_20261031_001': 'knp-bursa-kita-terancam-diboikot-dunia',
    'vid_20261029_002': 'the-ai-bubble-explained',
    'vid_20261024_001': 'offshore-investing-tax-traps-indonesia',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project' && i + 1 < args.length) {
      projectId = args[++i];
      projectExplicit = true;
    } else if (arg.startsWith('--project=')) {
      projectId = arg.split('=')[1];
      projectExplicit = true;
    } else if (arg === '--slug' && i + 1 < args.length) {
      slug = args[++i];
      slugExplicit = true;
    } else if (arg.startsWith('--slug=')) {
      slug = arg.split('=')[1];
      slugExplicit = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--beats' && i + 1 < args.length) {
      beatsArg = args[++i].split(',').map((b) => b.trim()).filter(Boolean);
    } else if (arg.startsWith('--beats=')) {
      beatsArg = arg.split('=')[1].split(',').map((b) => b.trim()).filter(Boolean);
    } else if (arg === '--aspects' && i + 1 < args.length) {
      aspects = args[++i].split(',').map((a) => a.trim()).filter(Boolean);
    } else if (arg.startsWith('--aspects=')) {
      aspects = arg.split('=')[1].split(',').map((a) => a.trim()).filter(Boolean);
    } else if (arg === '--aspect' && i + 1 < args.length) {
      aspects = args[++i].split(',').map((a) => a.trim()).filter(Boolean);
    } else if (arg.startsWith('--aspect=')) {
      aspects = arg.split('=')[1].split(',').map((a) => a.trim()).filter(Boolean);
    } else if (arg === '--port' && i + 1 < args.length) {
      port = parseInt(args[++i], 10);
    } else if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1], 10);
    }
  }

  if (slugExplicit && !projectExplicit) {
    projectId = SLUG_TO_PROJECT[slug] || slug;
  }
  if (!slugExplicit) {
    slug = PROJECT_TO_SLUG[projectId] || projectId;
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

  return { projectId, slug, force, beatsToRender, allBeats, port, aspects };
}

function isValidVideo(filePath, minDuration = 5) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.size < 100000) return false;
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
  if (!force && isValidVideo(finalBeatPath, 5)) {
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

    if (!isValidVideo(finalBeatPath, 5)) {
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

export function extractQaFrames(projectOutputDir, projectId, allBeats, aspects, master16x9, master9x16) {
  const qaFramesDir = path.join(projectOutputDir, 'qa_frames');
  fs.mkdirSync(qaFramesDir, { recursive: true });
  console.log(`[Pipeline] Extracting QA keyframes to ${qaFramesDir}...`);

  const timingsFile = path.join(__dirname, 'production', projectId, 'timings.json');
  let beatTimes = [];
  if (fs.existsSync(timingsFile)) {
    try {
      const tData = JSON.parse(fs.readFileSync(timingsFile, 'utf8'));
      if (tData.beats && tData.beats.length > 0) {
        beatTimes = tData.beats.map((b, idx) => {
          const midTime = Math.max(b.start + 0.5, b.end - 1.0);
          return {
            beatName: `beat${idx + 1}`,
            time: midTime.toFixed(3),
          };
        });
      }
    } catch (e) {}
  }
  if (beatTimes.length === 0) {
    beatTimes = allBeats.map((b, idx) => ({
      beatName: b,
      time: (10 + idx * 20).toFixed(3),
    }));
  }

  for (const bt of beatTimes) {
    if (aspects.includes('16x9') && master16x9 && fs.existsSync(master16x9)) {
      const out16 = path.join(qaFramesDir, `${bt.beatName}_16x9.jpg`);
      execSync(`ffmpeg -y -ss ${bt.time} -i "${master16x9}" -frames:v 1 -q:v 2 "${out16}"`, { stdio: 'inherit' });
    }
    if (aspects.includes('9x16') && master9x16 && fs.existsSync(master9x16)) {
      const out9 = path.join(qaFramesDir, `${bt.beatName}_9x16.jpg`);
      execSync(`ffmpeg -y -ss ${bt.time} -i "${master9x16}" -frames:v 1 -q:v 2 "${out9}"`, { stdio: 'inherit' });
    }
  }
}

async function main() {
  const { projectId, slug, force, beatsToRender, allBeats, port, aspects } = parseArgs();

  console.log(`[Dual-Aspect Pipeline] Project: ${projectId} (Slug: ${slug})`);
  console.log(`[Dual-Aspect Pipeline] Aspects: ${aspects.join(', ')}`);
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
    let master9x16 = null;
    let master16x9 = null;

    if (aspects.includes('9x16')) {
      // PASS 1: 9:16 (1080x1920) Vertical Master
      master9x16 = await renderAspectPass(port, '9x16', 1080, 1920, projectId, beatsToRender, allBeats, force);
      fs.copyFileSync(master9x16, path.join(projectOutputDir, 'video.mp4'));
    } else {
      const existing = path.join(projectOutputDir, 'video_9x16.mp4');
      if (fs.existsSync(existing)) master9x16 = existing;
    }

    if (aspects.includes('16x9')) {
      // PASS 2: 16:9 (1920x1080) Widescreen Master
      master16x9 = await renderAspectPass(port, '16x9', 1920, 1080, projectId, beatsToRender, allBeats, force);
      if (!aspects.includes('9x16')) {
        fs.copyFileSync(master16x9, path.join(projectOutputDir, 'video.mp4'));
      }
    } else {
      const existing = path.join(projectOutputDir, 'video_16x9.mp4');
      if (fs.existsSync(existing)) master16x9 = existing;
    }

    // Transcode dedicated WhatsApp inline stream (< 4.5 MB, 540x960, Profile Main 3.1)
    const whatsappVideo = path.join(projectOutputDir, 'video_whatsapp.mp4');
    const sourceForWa = master9x16 || master16x9;
    if (sourceForWa && fs.existsSync(sourceForWa)) {
      console.log(`[Pipeline] Transcoding dedicated WhatsApp inline stream (< 4.5 MB) to ${whatsappVideo}...`);
      const scaleFilter = sourceForWa === master9x16 ? 'scale=540:960' : 'scale=960:540';
      execSync(
        `ffmpeg -y -i "${sourceForWa}" ` +
        `-vf "${scaleFilter}" ` +
        '-c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p ' +
        '-b:v 260k -maxrate 340k -bufsize 600k ' +
        '-c:a aac -profile:a aac_low -ar 48000 -ac 1 -b:a 48k ' +
        `-movflags +faststart "${whatsappVideo}"`,
        { stdio: 'inherit' }
      );
      console.log(`[Pipeline] WhatsApp video size: ${fs.statSync(whatsappVideo).size} bytes`);
    }

    // Play badge overlay
    const playBadgeSvgPath = path.join(projectOutputDir, 'play_badge.svg');
    const playBadgePngPath = path.join(projectOutputDir, 'play_badge.png');
    const svgContent = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="46.5" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <polygon points="38,32 66,48 38,64" fill="#ffffff"/>
</svg>`;
    fs.writeFileSync(playBadgeSvgPath, svgContent);
    execSync(`ffmpeg -y -i "${playBadgeSvgPath}" "${playBadgePngPath}"`, { stdio: 'inherit' });

    // Thumbnails: thumb.jpg, thumb_16x9.jpg, thumb_9x16.jpg, thumbnail.jpg
    const thumb16x9Path = path.join(projectOutputDir, 'thumb_16x9.jpg');
    const thumb9x16Path = path.join(projectOutputDir, 'thumb_9x16.jpg');
    const thumbPath = path.join(projectOutputDir, 'thumb.jpg');
    const thumbnailPath = path.join(projectOutputDir, 'thumbnail.jpg');
    const thumbnailOgPath = path.join(projectOutputDir, 'thumbnail_og.jpg');
    const thumbnailSquarePath = path.join(projectOutputDir, 'thumbnail_square.jpg');

    console.log(`[Pipeline] Generating base thumbnails...`);
    if (aspects.includes('16x9') && master16x9 && fs.existsSync(master16x9)) {
      execSync(`ffmpeg -y -ss 00:00:20.000 -i "${master16x9}" -frames:v 1 -q:v 2 "${thumb16x9Path}"`, { stdio: 'inherit' });
    }
    if (aspects.includes('9x16') && master9x16 && fs.existsSync(master9x16)) {
      execSync(`ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -frames:v 1 -q:v 2 "${thumb9x16Path}"`, { stdio: 'inherit' });
    }

    if (fs.existsSync(thumb16x9Path)) {
      fs.copyFileSync(thumb16x9Path, thumbPath);
      fs.copyFileSync(thumb16x9Path, thumbnailPath);
    } else if (fs.existsSync(thumb9x16Path)) {
      fs.copyFileSync(thumb9x16Path, thumbPath);
      fs.copyFileSync(thumb9x16Path, thumbnailPath);
    }

    // WhatsApp Landscape Thumbnail (1200x630, < 150 KB)
    if (master16x9 && fs.existsSync(master16x9) && aspects.includes('16x9')) {
      console.log(`[Pipeline] Generating WhatsApp landscape preview thumbnail at ${thumbnailOgPath}...`);
      execSync(
        `ffmpeg -y -ss 00:00:20.000 -i "${master16x9}" -i "${playBadgePngPath}" ` +
        '-filter_complex "[0:v]scale=1200:675,crop=1200:630[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
        `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
        { stdio: 'inherit' }
      );
      console.log(`[Pipeline] thumbnail_og.jpg size: ${fs.statSync(thumbnailOgPath).size} bytes`);
    } else if (master9x16 && fs.existsSync(master9x16) && (!fs.existsSync(thumbnailOgPath) || aspects.includes('9x16'))) {
      console.log(`[Pipeline] Generating WhatsApp landscape preview thumbnail from 9:16 at ${thumbnailOgPath}...`);
      execSync(
        `ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -i "${playBadgePngPath}" ` +
        '-filter_complex "[0:v]scale=1200:2133,crop=1200:630:0:750[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
        `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
        { stdio: 'inherit' }
      );
      console.log(`[Pipeline] thumbnail_og.jpg size: ${fs.statSync(thumbnailOgPath).size} bytes`);
    }

    // WhatsApp Square Thumbnail (1080x1080, < 150 KB, generated from 9:16 master at t=20s)
    if (master9x16 && fs.existsSync(master9x16) && (aspects.includes('9x16') || !fs.existsSync(thumbnailSquarePath))) {
      console.log(`[Pipeline] Generating WhatsApp square preview thumbnail at ${thumbnailSquarePath}...`);
      execSync(
        `ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -i "${playBadgePngPath}" ` +
        '-filter_complex "[0:v]crop=1080:1080:0:420[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
        `-frames:v 1 -q:v 3 "${thumbnailSquarePath}"`,
        { stdio: 'inherit' }
      );
      console.log(`[Pipeline] thumbnail_square.jpg size: ${fs.statSync(thumbnailSquarePath).size} bytes`);
    }

    // Extract QA keyframes for Beat 1..5 for both 16:9 and 9:16 into output/${projectId}/qa_frames/
    extractQaFrames(projectOutputDir, projectId, allBeats, aspects, master16x9, master9x16);

    // Deploy to public directory for cuang.dev and rsync to docker-host
    // Target 1: /home/agent/orca/AI-nimate/public/projects/ainimate/${projectId}/
    // Target 2: /home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/${slug}/
    const publishDirProject = path.join('/home/agent/orca/AI-nimate/public/projects/ainimate', projectId);
    const publishDirSlug = path.join('/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia', slug);

    const targetDirs = [publishDirProject, publishDirSlug];
    for (const pDir of targetDirs) {
      fs.mkdirSync(pDir, { recursive: true });
      console.log(`[Pipeline] Deploying artifacts to ${pDir}...`);
      if (master9x16 && fs.existsSync(master9x16)) {
        fs.copyFileSync(master9x16, path.join(pDir, 'video.mp4'));
        fs.copyFileSync(master9x16, path.join(pDir, 'video_9x16.mp4'));
      }
      if (master16x9 && fs.existsSync(master16x9)) {
        fs.copyFileSync(master16x9, path.join(pDir, 'video_16x9.mp4'));
      }
      if (fs.existsSync(whatsappVideo)) {
        fs.copyFileSync(whatsappVideo, path.join(pDir, 'video_whatsapp.mp4'));
      }
      if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(pDir, 'thumb.jpg'));
      if (fs.existsSync(thumb16x9Path)) fs.copyFileSync(thumb16x9Path, path.join(pDir, 'thumb_16x9.jpg'));
      if (fs.existsSync(thumb9x16Path)) fs.copyFileSync(thumb9x16Path, path.join(pDir, 'thumb_9x16.jpg'));
      if (fs.existsSync(thumbnailPath)) fs.copyFileSync(thumbnailPath, path.join(pDir, 'thumbnail.jpg'));
      if (fs.existsSync(thumbnailOgPath)) fs.copyFileSync(thumbnailOgPath, path.join(pDir, 'thumbnail_og.jpg'));
      if (fs.existsSync(thumbnailSquarePath)) fs.copyFileSync(thumbnailSquarePath, path.join(pDir, 'thumbnail_square.jpg'));

      // Copy QA frames to public targets
      const qaFramesSource = path.join(projectOutputDir, 'qa_frames');
      if (fs.existsSync(qaFramesSource)) {
        const qaFramesTarget = path.join(pDir, 'qa_frames');
        fs.mkdirSync(qaFramesTarget, { recursive: true });
        for (const file of fs.readdirSync(qaFramesSource)) {
          fs.copyFileSync(path.join(qaFramesSource, file), path.join(qaFramesTarget, file));
        }
      }
    }

    // Ensure convenient symlinks exist
    const kausalProjSymlink = path.join('/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia', projectId);
    if (!fs.existsSync(kausalProjSymlink)) {
      try {
        fs.symlinkSync(slug, kausalProjSymlink);
      } catch (e) {}
    }
    const publicSlugSymlink = path.join('/home/agent/orca/AI-nimate/public/projects/ainimate', slug);
    if (!fs.existsSync(publicSlugSymlink)) {
      try {
        fs.symlinkSync(`kausalmedia/${slug}`, publicSlugSymlink);
      } catch (e) {}
    }

    console.log('[Pipeline] Syncing to docker-host...');
    execSync(
      'rsync -avz /home/agent/orca/AI-nimate/public/projects/ainimate/ docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/',
      { stdio: 'inherit' }
    );
    console.log('[Pipeline] Successfully deployed and synced to docker-host!');

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
