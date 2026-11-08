import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import { loadEpisode, computeShots } from './scripts/v2/lint_episode.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

const REPO_ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.resolve(REPO_ROOT, 'projects');
const CACHE_ROOT = path.resolve(__dirname, '.cache');

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
  let channel = 'kausalmedia';
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
    'anatomi-saham-gorengan-di-bei': 'vid_20261021_001',
  };
  const PROJECT_TO_SLUG = {
    'vid_20261031_002': 'knp-saham-teknologi-runtuh',
    'vid_20261031_001': 'knp-bursa-kita-terancam-diboikot-dunia',
    'vid_20261029_002': 'the-ai-bubble-explained',
    'vid_20261024_001': 'offshore-investing-tax-traps-indonesia',
    'vid_20261021_001': 'anatomi-saham-gorengan-di-bei',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project' && i + 1 < args.length) {
      projectId = args[++i];
      projectExplicit = true;
    } else if (arg.startsWith('--project=')) {
      projectId = arg.split('=')[1];
      projectExplicit = true;
    } else if (arg === '--channel' && i + 1 < args.length) {
      channel = args[++i];
    } else if (arg.startsWith('--channel=')) {
      channel = arg.split('=')[1];
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

  // Attempt reading slug from production/<projectId>/script.json if not explicit
  if (!slugExplicit) {
    const prodScriptPath = path.join(__dirname, 'production', projectId, 'script.json');
    if (fs.existsSync(prodScriptPath)) {
      try {
        const sData = JSON.parse(fs.readFileSync(prodScriptPath, 'utf8'));
        if (sData.slug) {
          slug = sData.slug;
        }
      } catch (e) {}
    }
    if (!slug) {
      slug = PROJECT_TO_SLUG[projectId] || projectId;
    }
  }

  // Extract compact date (YYYYMMDD) from projectId or current date
  const dateMatch = projectId.match(/vid_(\d{8})/);
  const dateCompact = dateMatch
    ? dateMatch[1]
    : new Date().toISOString().slice(0, 10).replace(/-/g, '');

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

  return { projectId, channel, dateCompact, slug, force, beatsToRender, allBeats, port, aspects };
}

// ---------------------------------------------------------------------------
// v2 helpers: detection, cache hashing, QA status, captions
// ---------------------------------------------------------------------------
function isV2Episode(projectId) {
  return fs.existsSync(path.join(__dirname, 'production', projectId, 'storyboard.json'));
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

function hashParts(parts) {
  const h = crypto.createHash('sha256');
  for (const p of parts) {
    if (typeof p === 'string' && p.startsWith('\0file:')) {
      const f = p.slice(6);
      h.update(`file:${path.relative(__dirname, f)}\n`);
      if (fs.existsSync(f)) h.update(fs.readFileSync(f));
      else h.update('MISSING');
    } else {
      h.update(typeof p === 'string' ? p : JSON.stringify(p));
    }
    h.update('\n--\n');
  }
  return h.digest('hex');
}

/** Content hash of everything that determines one chapter clip. */
function computeClipHash(projectId, beatName, aspectDir) {
  const idx = (parseInt(beatName.replace(/\D/g, ''), 10) || 1) - 1;
  const parts = [`aspect:${aspectDir}`];
  const beatTs = path.join(__dirname, 'src', 'projects', projectId, `${projectId}_${beatName}.ts`);
  parts.push('\0file:' + beatTs);
  if (isV2Episode(projectId)) {
    const prod = path.join(__dirname, 'production', projectId);
    for (const f of listFilesRecursive(path.join(__dirname, 'src', 'shared', 'v2'))) parts.push('\0file:' + f);
    const timings = readJsonSafe(path.join(prod, 'timings.json')) || {};
    const storyboard = readJsonSafe(path.join(prod, 'storyboard.json')) || {};
    const tChaps = timings.chapters || timings.beats || [];
    const tCh = tChaps[idx] || null;
    const chId = tCh?.chapter_id || tCh?.id || `ch${String(idx + 1).padStart(2, '0')}`;
    const sbCh = (storyboard.chapters || []).find((c) => c.id === chId) || (storyboard.chapters || [])[idx] || null;
    parts.push({ storyboardChapter: sbCh });
    parts.push('\0file:' + path.join(prod, 'image_focus.json'));
    parts.push({
      timingsChapter: tCh,
      sentences: (timings.sentences || []).filter((x) => x.chapter_id === chId),
      words: (timings.words || []).filter((x) => x.beat_id === tCh?.beat_id || x.chapter_id === chId),
      chunks: (timings.subtitle_chunks || []).filter((x) => x.beat_id === tCh?.beat_id),
    });
    const srcs = new Set();
    for (const shot of sbCh?.shots || []) if (shot.image?.src) srcs.add(shot.image.src);
    for (const shot of sbCh?.shots || []) for (const it of shot.explainer?.items || []) if (it.icon) srcs.add(`icons/${it.icon}.png`);
    for (const src of [...srcs].sort()) parts.push('\0file:' + path.join(__dirname, 'public', 'assets', projectId, src));
  } else {
    const sceneDir = path.join(__dirname, 'src', 'scenes', projectId);
    parts.push('\0file:' + path.join(sceneDir, `beat_${String(idx + 1).padStart(2, '0')}.tsx`));
    parts.push('\0file:' + path.join(sceneDir, 'layout.tsx'));
  }
  return hashParts(parts);
}

function readQaStatus(projectOutputDir) {
  const p = path.join(projectOutputDir, 'qa_report.json');
  if (!fs.existsSync(p)) return 'NOT RUN';
  const rep = readJsonSafe(p);
  if (!rep) return 'NOT RUN';
  // A report older than the master video describes a previous render.
  try {
    const v = path.join(projectOutputDir, 'video_16x9.mp4');
    if (fs.existsSync(v) && fs.statSync(v).mtimeMs > fs.statSync(p).mtimeMs + 1000) return 'NOT RUN';
  } catch (e) {}
  if (rep.status) return rep.status;
  return rep.passed === rep.total ? `${rep.total}/${rep.total} PASS` : 'FAIL';
}

function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

function ytTime(sec) {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor(t / 60) % 60;
  const s = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function writeCaptionsAndChapters(projectOutputDir, projectId) {
  const timings = readJsonSafe(path.join(__dirname, 'production', projectId, 'timings.json'));
  if (!timings) {
    console.warn('[Pipeline] WARNING: no timings.json, skipping captions.srt / youtube_chapters.txt');
    return;
  }
  const chunks = timings.subtitle_chunks || [];
  const srt = chunks
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join('\n');
  fs.writeFileSync(path.join(projectOutputDir, 'captions.srt'), srt);
  const beats = timings.beats || timings.chapters || [];
  const lines = beats.map((b, i) => `${ytTime(i === 0 ? 0 : b.start)} ${b.title || `Bagian ${i + 1}`}`);
  fs.writeFileSync(path.join(projectOutputDir, 'youtube_chapters.txt'), lines.join('\n') + '\n');
  console.log(`[Pipeline] Wrote captions.srt (${chunks.length} cues) and youtube_chapters.txt (${lines.length} chapters)`);
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
  const cacheAspectDir = path.join(CACHE_ROOT, projectId, aspectDir);
  fs.mkdirSync(cacheAspectDir, { recursive: true });

  const finalBeatPath = path.join(cacheAspectDir, `${fullProjectName}.mp4`);
  const hashPath = `${finalBeatPath}.hash`;
  const wantHash = computeClipHash(projectId, beatName, aspectDir);
  if (!force && isValidVideo(finalBeatPath, 5)) {
    const haveHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf8').trim() : null;
    if (haveHash === wantHash) {
      console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} cached and hash-fresh. Skipping.`);
      return;
    }
    if (haveHash === null && !isV2Episode(projectId)) {
      // Legacy clip rendered before hashing existed: adopt it once rather than re-rendering whole episodes.
      fs.writeFileSync(hashPath, wantHash);
      console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} legacy clip without hash; adopted current hash. Skipping.`);
      return;
    }
    console.log(`[Sequential Render] ${aspectDir}/${fullProjectName} cache STALE (${haveHash ? 'source changed' : 'no hash'}). Re-rendering.`);
    try { fs.unlinkSync(finalBeatPath); } catch (e) {}
  }
  try { fs.unlinkSync(hashPath); } catch (e) {}

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
    const maxWaitSeconds = 3600;
    let renderCompleted = false;
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
        renderCompleted = true;
        break;
      }
    }
    if (!renderCompleted) {
      // Never move a half-written file into the cache.
      throw new Error(`Render of ${aspectDir}/${fullProjectName} did not finish within ${maxWaitSeconds}s`);
    }

    // Fast File Flush: Poll rawOutputPath size stability every 300ms
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
            if (stableCount >= 2) break;
          } else {
            stableCount = 0;
            lastSize = curSize;
          }
        } catch (e) {}
      }
    }

    if (!fs.existsSync(rawOutputPath)) {
      throw new Error(`Raw output not found at ${rawOutputPath}`);
    }

    // Move to cache directory
    fs.renameSync(rawOutputPath, finalBeatPath);
    console.log(`[Sequential Render] Saved to ${finalBeatPath} (${fs.statSync(finalBeatPath).size} bytes)`);

    if (!isValidVideo(finalBeatPath, 5)) {
      throw new Error(`Rendered video ${finalBeatPath} is invalid or too short!`);
    }
    fs.writeFileSync(hashPath, wantHash);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function renderAspectPass(serverPort, aspectName, width, height, projectId, beatsToRender, allBeats, force, projectOutputDir) {
  console.log(`\n############################################################`);
  console.log(`[Pipeline] STARTING PASS: ${aspectName} (${width}x${height})`);
  console.log(`############################################################`);

  configureMeta(projectId, allBeats, width, height);

  const cacheAspectDir = path.join(CACHE_ROOT, projectId, aspectName);
  fs.mkdirSync(cacheAspectDir, { recursive: true });

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

  // Check if all beats are ready for concatenation
  const missingBeats = allBeats.filter((beat) => {
    const beatFile = path.join(cacheAspectDir, `${projectId}_${beat}.mp4`);
    return !fs.existsSync(beatFile) || !isValidVideo(beatFile);
  });

  if (missingBeats.length > 0) {
    console.log(
      `[Pipeline] Partial batch complete. Cached ${allBeats.length - missingBeats.length}/${allBeats.length} beats. ` +
      `Missing: ${missingBeats.join(', ')}. Skipping final assembly until remaining beats finish.`
    );
    return null;
  }

  // Create concat list from allBeats in cache
  const concatListPath = path.join(cacheAspectDir, 'concat_list.txt');
  const concatLines = allBeats.map((beat) => {
    const beatFile = path.join(cacheAspectDir, `${projectId}_${beat}.mp4`);
    return `file '${beatFile}'`;
  }).join('\n');
  fs.writeFileSync(concatListPath, concatLines);

  const concatenatedVideo = path.join(cacheAspectDir, `${projectId}_concat.mp4`);
  console.log(`[Pipeline] Concatenating ${aspectName} beats losslessly...`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedVideo}"`,
    { stdio: 'inherit' }
  );

  const finalMixPath = path.join(__dirname, 'production', projectId, 'final_mix.wav');
  let masterAudio = path.join(__dirname, 'public', 'audio', projectId, 'narration.wav');
  if (fs.existsSync(finalMixPath)) {
    masterAudio = finalMixPath;
    console.log(`[Pipeline] Using final_mix.wav (music + narration mix) for audio.`);
  }
  if (!fs.existsSync(masterAudio)) {
    masterAudio = path.join(projectOutputDir, 'narration.wav');
  }
  if (!fs.existsSync(masterAudio)) {
    masterAudio = path.join(__dirname, 'public', 'audio', `${projectId}.wav`);
  }
  if (!fs.existsSync(masterAudio)) {
    masterAudio = path.join(__dirname, 'public', 'audio', `${projectId}_narration.wav`);
  }

  const finalMaster = path.join(projectOutputDir, `video_${aspectName}.mp4`);

  // The Motion Canvas exporter converts RGBA to yuv420p with swscale defaults (BT.601 matrix,
  // limited range) and writes no colour tags. Tag the stream (bitstream filter, no re-encode)
  // so players decode with the matrix that was actually used: matrix_coefficients=6 (SMPTE 170M = BT.601).
  const COLOUR_BSF = '-bsf:v h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=6:video_full_range_flag=0';
  console.log(`[Pipeline] Muxing ${path.basename(masterAudio)} into master: ${finalMaster}...`);
  execSync(
    `ffmpeg -y -i "${concatenatedVideo}" -i "${masterAudio}" -c:v copy ${COLOUR_BSF} -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart "${finalMaster}"`,
    { stdio: 'inherit' }
  );

  if (fs.existsSync(concatenatedVideo)) {
    fs.unlinkSync(concatenatedVideo);
  }

  // Keep cached beat clips and concat_list.txt in cacheAspectDir so partial --beats=... re-renders can stitch immediately!
  console.log(`[Pipeline] Preserving cached beat clips in ${cacheAspectDir} for incremental beat re-renders.`);

  // Clean legacy motion-canvas/output if created
  const mcOutput = path.join(__dirname, 'output');
  if (fs.existsSync(mcOutput)) {
    try {
      fs.rmSync(mcOutput, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log(`[Pipeline] ${aspectName} master complete: ${finalMaster} (${fs.statSync(finalMaster).size} bytes)`);
  return finalMaster;
}

function extractShotFrames(qaFramesDir, projectId, master16x9, master9x16) {
  const src = master16x9 && fs.existsSync(master16x9) ? master16x9 : master9x16;
  if (!src || !fs.existsSync(src)) return;
  const ep = loadEpisode(projectId);
  const shotsDir = path.join(qaFramesDir, 'shots');
  fs.rmSync(shotsDir, { recursive: true, force: true });
  fs.mkdirSync(shotsDir, { recursive: true });
  let n = 0;
  for (const s of computeShots(ep)) {
    if (s.start == null) {
      console.warn(`[Pipeline] WARNING: shot ${s.chapter}#${s.n} has an unresolved 'at'; no QA frame.`);
      continue;
    }
    let t = s.start + 0.6;
    if (s.end != null && t > s.end - 0.05) t = Math.max(s.start, s.end - 0.05);
    const out = path.join(shotsDir, `${s.chapter}_${s.n}.jpg`);
    try {
      execSync(`ffmpeg -y -v error -ss ${t.toFixed(3)} -i "${src}" -frames:v 1 -q:v 2 "${out}"`, { stdio: 'inherit' });
      n++;
    } catch (e) {
      console.warn(`[Pipeline] WARNING: failed shot frame ${s.chapter}_${s.n}`);
    }
  }
  console.log(`[Pipeline] Extracted ${n} per-shot QA frames to ${shotsDir}`);
}

export function extractQaFrames(projectOutputDir, projectId, allBeats, aspects, master16x9, master9x16) {
  const qaFramesDir = path.join(projectOutputDir, 'qa_frames');
  fs.mkdirSync(qaFramesDir, { recursive: true });
  console.log(`[Pipeline] Extracting QA keyframes to ${qaFramesDir}...`);

  let timingsFile = path.join(projectOutputDir, 'timings.json');
  if (!fs.existsSync(timingsFile)) {
    timingsFile = path.join(__dirname, 'production', projectId, 'timings.json');
  }

  let beatTimes = [];
  if (fs.existsSync(timingsFile)) {
    try {
      const tData = JSON.parse(fs.readFileSync(timingsFile, 'utf8'));
      if (tData.beats && tData.beats.length > 0) {
        beatTimes = tData.beats.map((b, idx) => {
          const midTime = Math.max(b.start + 0.5, b.start + (b.end - b.start) * 0.85);
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
    const defaultBeat = path.join(qaFramesDir, `${bt.beatName}.jpg`);
    const sourceVideo = (aspects.includes('9x16') && master9x16) ? master9x16 : master16x9;
    if (sourceVideo && fs.existsSync(sourceVideo)) {
      execSync(`ffmpeg -y -ss ${bt.time} -i "${sourceVideo}" -frames:v 1 -q:v 2 "${defaultBeat}"`, { stdio: 'inherit' });
    }
  }

  if (isV2Episode(projectId)) {
    try {
      extractShotFrames(qaFramesDir, projectId, master16x9, master9x16);
    } catch (e) {
      console.warn(`[Pipeline] WARNING: per-shot QA frame extraction failed: ${e.message}`);
    }
  }
}

function updateMetaAndManifest(projectOutputDir, projectDirName, channel, dateCompact, slug, projectId, aspects, thumbnailSource = null) {
  console.log(`[Pipeline] Generating standardized meta.json and updating manifest.json...`);
  const dateFormatted = `${dateCompact.slice(0, 4)}-${dateCompact.slice(4, 6)}-${dateCompact.slice(6, 8)}`;

  let scriptData = {};
  const scriptPath = path.join(projectOutputDir, 'script.json');
  if (fs.existsSync(scriptPath)) {
    try {
      scriptData = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
    } catch (e) {}
  }

  let timingsData = {};
  const timingsPath = path.join(projectOutputDir, 'timings.json');
  if (fs.existsSync(timingsPath)) {
    try {
      timingsData = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    } catch (e) {}
  }

  const title = scriptData.title || slug;
  const isKnp = title.startsWith('Knp?') || (scriptData.series === 'Knp?');

  const beats = (timingsData.beats || []).map((b, idx) => ({
    beat: String(idx + 1).padStart(2, '0'),
    title: b.title || `Beat ${idx + 1}`,
    startSec: round(b.start || 0, 3),
    endSec: round(b.end || 0, 3),
    durationSec: round(b.duration || ((b.end || 0) - (b.start || 0)), 3),
    narration: b.spoken_text || b.narration || '',
    keyframe: `qa_frames/beat${idx + 1}.jpg`,
  }));

  // Sync per-project project_config.json from projects_config.json
  const projectsConfigPath = path.join(PROJECTS_DIR, 'projects_config.json');
  let projectConfig = null;
  if (fs.existsSync(projectsConfigPath)) {
    try {
      const projectsConfig = JSON.parse(fs.readFileSync(projectsConfigPath, 'utf8'));
      const projEntry = (projectsConfig.projects && projectsConfig.projects[projectDirName]) ||
        Object.values(projectsConfig.projects || {}).find(p => p.id === projectId || p.slug === slug);
      if (projEntry) {
        projectConfig = projEntry;
        fs.writeFileSync(path.join(projectOutputDir, 'project_config.json'), JSON.stringify(projEntry, null, 2));
        console.log(`[Pipeline] Synced project_config.json to ${projectOutputDir}`);
      }
    } catch (e) {
      console.warn(`[Pipeline] Failed syncing project_config.json:`, e);
    }
  }

  const files = {};
  for (const root of [projectOutputDir]) {
    for (const f of fs.readdirSync(root)) {
      const full = path.join(root, f);
      if (fs.statSync(full).isFile()) {
        files[f] = fs.statSync(full).size;
      }
    }
  }

  const primaryVideo = aspects.includes('9x16') ? 'video_9x16.mp4' : 'video_16x9.mp4';

  const meta = {
    id: projectId,
    dirName: projectDirName,
    channel,
    channelLabel: channel === 'kausalmedia' ? 'Kausal Media' : channel,
    series: scriptData.series || (isKnp ? 'Knp?' : 'Forensic Deep-Dive'),
    date: dateFormatted,
    dateCompact,
    slug,
    title,
    subtitle: scriptData.subtitle || '',
    description: scriptData.description || scriptData.core_angle || '',
    language: scriptData.language || (isKnp ? 'ID' : 'EN'),
    durationSec: timingsData.duration_seconds || 0,
    aspects: aspects.map((a) => a.replace('x', ':')),
    primaryVideo,
    files,
    qaStatus: readQaStatus(projectOutputDir),
    thumbnailSource,
    beats,
    projectConfig: projectConfig || null,
  };

  fs.writeFileSync(path.join(projectOutputDir, 'meta.json'), JSON.stringify(meta, null, 2));

  // Update manifest.json
  const manifestPath = path.join(PROJECTS_DIR, 'manifest.json');
  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {}
  }

  manifest = manifest.filter((m) => m.id !== projectId && m.dirName !== projectDirName);
  manifest.push(meta);
  manifest.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function round(val, dec = 2) {
  return Number(Math.round(Number(val + 'e' + dec)) + 'e-' + dec);
}

async function main() {
  const { projectId, channel, dateCompact, slug, force, beatsToRender, allBeats, port, aspects } = parseArgs();

  const projectDirName = `${channel}_${dateCompact}_${slug}`;
  const projectOutputDir = path.join(PROJECTS_DIR, projectDirName);
  fs.mkdirSync(projectOutputDir, { recursive: true });

  console.log(`[Pipeline] Project: ${projectId} (Slug: ${slug}, Channel: ${channel})`);
  console.log(`[Pipeline] Target Output Dir: ${projectOutputDir}`);
  console.log(`[Pipeline] Aspects: ${aspects.join(', ')}`);
  console.log(`[Pipeline] All Beats: ${allBeats.join(', ')}`);
  console.log(`[Pipeline] Beats To Render: ${beatsToRender.join(', ')}`);
  console.log(`[Pipeline] Force: ${force}`);

  // Copy audio & data to destination directory before rendering
  const prodDir = path.join(__dirname, 'production', projectId);
  if (fs.existsSync(prodDir)) {
    for (const f of ['script.json', 'timings.json']) {
      const src = path.join(prodDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(projectOutputDir, f));
      }
    }
  }

  const narrationSrcCandidates = [
    path.join(__dirname, 'public', 'audio', projectId, 'narration.wav'),
    path.join(__dirname, 'public', 'audio', `${projectId}.wav`),
    path.join(prodDir, 'narration.wav'),
  ];
  for (const src of narrationSrcCandidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(projectOutputDir, 'narration.wav'));
      break;
    }
  }

  const finalMixSrc = path.join(prodDir, 'final_mix.wav');
  if (fs.existsSync(finalMixSrc)) {
    fs.copyFileSync(finalMixSrc, path.join(projectOutputDir, 'final_mix.wav'));
  }

  console.log(`[Pipeline] Launching Vite dev server on port ${port}...`);
  const server = await createServer({
    root: __dirname,
    server: { port },
  });
  await server.listen();
  console.log(`[Pipeline] Server listening on http://localhost:${port}`);

  const startTime = Date.now();

  try {
    let master9x16 = null;
    let master16x9 = null;

    if (aspects.includes('9x16')) {
      master9x16 = await renderAspectPass(port, '9x16', 1080, 1920, projectId, beatsToRender, allBeats, force, projectOutputDir);
      if (master9x16) fs.copyFileSync(master9x16, path.join(projectOutputDir, 'video.mp4'));
    } else {
      const existing = path.join(projectOutputDir, 'video_9x16.mp4');
      if (fs.existsSync(existing)) master9x16 = existing;
    }

    if (aspects.includes('16x9')) {
      master16x9 = await renderAspectPass(port, '16x9', 1920, 1080, projectId, beatsToRender, allBeats, force, projectOutputDir);
      if (master16x9 && !aspects.includes('9x16')) {
        const primaryLink = path.join(projectOutputDir, 'video.mp4');
        try { fs.unlinkSync(primaryLink); } catch (e) {}
        try {
          fs.symlinkSync('video_16x9.mp4', primaryLink);
        } catch (e) {
          fs.copyFileSync(master16x9, primaryLink);
        }
      }
    } else {
      const existing = path.join(projectOutputDir, 'video_16x9.mp4');
      if (fs.existsSync(existing)) master16x9 = existing;
    }

    if (!master16x9 && !master9x16) {
      console.log(`[Pipeline] Specified beats rendered to cache. Final assembly deferred until all beats are complete.`);
      return;
    }

    // Transcode dedicated WhatsApp inline stream (< 4.5 MB, 540x960, Profile Main 3.1)
    const whatsappVideo = path.join(projectOutputDir, 'video_whatsapp.mp4');
    const sourceForWa = master9x16;
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
    const v2 = isV2Episode(projectId);
    const assetsDir = path.join(__dirname, 'public', 'assets', projectId);
    const designedV2 = path.join(assetsDir, 'thumbnail_16x9.jpg');
    const kongloThumb = path.join(assetsDir, 'thumbnail_konglo_16x9.jpg');
    let designedThumb = null;
    let thumbnailSource = null;
    const pickDesigned = () => {
      if (fs.existsSync(designedV2)) return [designedV2, 'designed'];
      if (fs.existsSync(kongloThumb)) return [kongloThumb, 'designed-legacy'];
      return [null, null];
    };
    [designedThumb, thumbnailSource] = pickDesigned();

    if (!designedThumb && v2) {
      const py = '/home/agent/orca/AI-nimate/.venv/bin/python';
      const gen = path.join(__dirname, 'scripts', 'v2', 'generate_thumbnail.py');
      if (!fs.existsSync(gen)) {
        console.warn(`[Pipeline] WARNING: no designed thumbnail and ${gen} is missing; falling back to a video frame.`);
      } else {
        console.log(`[Pipeline] No designed thumbnail; running generate_thumbnail.py ${projectId}...`);
        const r = spawnSync(py, [gen, projectId], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', timeout: 300000 });
        if (r.status !== 0) {
          console.warn(`[Pipeline] WARNING: generate_thumbnail.py failed (status ${r.status}${r.error ? ', ' + r.error.message : ''}); falling back to a video frame.`);
        }
        [designedThumb, thumbnailSource] = pickDesigned();
        if (designedThumb) thumbnailSource = 'generated';
      }
    }

    if (designedThumb) {
      console.log(`[Pipeline] Installing designed thumbnail from ${designedThumb} (${thumbnailSource})...`);
      fs.copyFileSync(designedThumb, thumb16x9Path);
      fs.copyFileSync(designedThumb, thumbPath);
      fs.copyFileSync(designedThumb, thumbnailPath);
      // OG / WhatsApp preview: cover-resize to 1200x630, keep under ~150 KB
      let ogOk = false;
      for (const q of [3, 6, 10]) {
        try {
          execSync(
            `ffmpeg -y -v error -i "${designedThumb}" -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" -frames:v 1 -q:v ${q} "${thumbnailOgPath}"`,
            { stdio: 'inherit' }
          );
          ogOk = true;
          if (fs.statSync(thumbnailOgPath).size <= 150 * 1024) break;
        } catch (e) { ogOk = false; break; }
      }
      if (!ogOk) {
        console.warn('[Pipeline] WARNING: OG resize failed; copying designed thumbnail as thumbnail_og.jpg.');
        fs.copyFileSync(designedThumb, thumbnailOgPath);
      }
    } else {
      thumbnailSource = 'frame';
      const dur = (readJsonSafe(path.join(__dirname, 'production', projectId, 'timings.json')) || {}).duration_seconds || 40;
      const frameT = (v2 ? dur / 2 : Math.min(20, dur / 2)).toFixed(3);
      const frameOf = (video, out, vf = '') => {
        try {
          execSync(`ffmpeg -y -v error -ss ${frameT} -i "${video}" ${vf} -frames:v 1 -q:v 2 "${out}"`, { stdio: 'inherit' });
        } catch (e) {
          console.warn(`[Pipeline] WARNING: frame thumbnail failed for ${path.basename(out)}`);
        }
      };
      if (aspects.includes('16x9') && master16x9 && fs.existsSync(master16x9)) frameOf(master16x9, thumb16x9Path);
      if (aspects.includes('9x16') && master9x16 && fs.existsSync(master9x16)) frameOf(master9x16, thumb9x16Path);

      if (fs.existsSync(thumb16x9Path)) {
        fs.copyFileSync(thumb16x9Path, thumbPath);
        fs.copyFileSync(thumb16x9Path, thumbnailPath);
      } else if (fs.existsSync(thumb9x16Path)) {
        fs.copyFileSync(thumb9x16Path, thumbPath);
        fs.copyFileSync(thumb9x16Path, thumbnailPath);
      }

      // WhatsApp landscape preview (1200x630, with play badge)
      try {
        if (aspects.includes('16x9') && master16x9 && fs.existsSync(master16x9)) {
          execSync(
            `ffmpeg -y -v error -ss ${frameT} -i "${master16x9}" -i "${playBadgePngPath}" ` +
            '-filter_complex "[0:v]scale=1200:675,crop=1200:630[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
            `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
            { stdio: 'inherit' }
          );
        } else if (master9x16 && fs.existsSync(master9x16) && (!fs.existsSync(thumbnailOgPath) || aspects.includes('9x16'))) {
          execSync(
            `ffmpeg -y -v error -ss ${frameT} -i "${master9x16}" -i "${playBadgePngPath}" ` +
            '-filter_complex "[0:v]scale=1200:2133,crop=1200:630:0:750[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
            `-frames:v 1 -q:v 3 "${thumbnailOgPath}"`,
            { stdio: 'inherit' }
          );
        }
      } catch (e) {
        console.warn('[Pipeline] WARNING: OG thumbnail from frame failed.');
      }
    }

    // WhatsApp Square Thumbnail (1080x1080, < 150 KB)
    if (master9x16 && fs.existsSync(master9x16) && (aspects.includes('9x16') || !fs.existsSync(thumbnailSquarePath))) {
      console.log(`[Pipeline] Generating WhatsApp square preview thumbnail at ${thumbnailSquarePath}...`);
      execSync(
        `ffmpeg -y -ss 00:00:20.000 -i "${master9x16}" -i "${playBadgePngPath}" ` +
        '-filter_complex "[0:v]crop=1080:1080:0:420[base]; [base][1:v]overlay=(W-w)/2:(H-h)/2" ' +
        `-frames:v 1 -q:v 3 "${thumbnailSquarePath}"`,
        { stdio: 'inherit' }
      );
    }

    // Extract QA keyframes
    extractQaFrames(projectOutputDir, projectId, allBeats, aspects, master16x9, master9x16);

    // Update meta.json and manifest.json
    if (isV2Episode(projectId)) {
      try { writeCaptionsAndChapters(projectOutputDir, projectId); } catch (e) { console.warn(`[Pipeline] WARNING: captions/chapters failed: ${e.message}`); }
    }
    updateMetaAndManifest(projectOutputDir, projectDirName, channel, dateCompact, slug, projectId, aspects, thumbnailSource);

    // Build and update discovery hub portal and per-project walkthrough pages
    const { buildPortal } = await import('./scripts/build_portal.mjs');
    await buildPortal();

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n============================================================`);
    console.log(`[Pipeline] Render Pipeline completed in ${elapsed}s!`);
    console.log(`[Pipeline] Outputs written directly to: ${projectOutputDir}`);
    console.log(`============================================================`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error('[Pipeline Fatal Error]', err);
  process.exit(1);
});
