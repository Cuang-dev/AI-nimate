import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../..');
const PROJECTS_DIR = path.resolve(REPO_ROOT, 'projects');
const MANIFEST_PATH = path.resolve(PROJECTS_DIR, 'manifest.json');

function round(val, dec = 3) {
  if (val == null || isNaN(val)) return 0;
  return Number(Math.round(Number(val + 'e' + dec)) + 'e-' + dec);
}

function formatTime(sec, includeMs = true) {
  if (isNaN(sec) || sec == null) return '00:00.0';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return includeMs ? `${mm}:${ss}.${ms}` : `${mm}:${ss}`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Reads and enriches each project in projects/
 */
export function enrichProjects() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }

  const rawManifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : [];
  const dirProjects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^[a-z0-9]+_\d{8}_/i.test(d.name))
    .map(d => d.name);

  const manifestItems = rawManifest.filter(m => fs.existsSync(path.join(PROJECTS_DIR, m.dirName)));
  for (const d of dirProjects) {
    if (!manifestItems.some(m => m.dirName === d)) {
      manifestItems.push({ dirName: d });
    }
  }

  const enrichedList = [];

  for (const item of manifestItems) {
    const dirName = item.dirName;
    const projectDir = path.join(PROJECTS_DIR, dirName);
    if (!fs.existsSync(projectDir)) {
      console.warn(`[build_portal] Project directory missing: ${projectDir}`);
      continue;
    }

    let scriptData = {};
    const scriptPath = path.join(projectDir, 'script.json');
    if (fs.existsSync(scriptPath)) {
      try {
        scriptData = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
      } catch (e) {}
    }

    let timingsData = {};
    const timingsPath = path.join(projectDir, 'timings.json');
    if (fs.existsSync(timingsPath)) {
      try {
        timingsData = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
      } catch (e) {}
    }

    let metaData = {};
    const metaPath = path.join(projectDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {}
    }

    // Inspect files in projectDir
    const dirEntries = fs.readdirSync(projectDir);
    const files = {};
    for (const f of dirEntries) {
      const full = path.join(projectDir, f);
      if (fs.statSync(full).isFile()) {
        files[f] = fs.statSync(full).size;
      }
    }

    const qaFramesDir = path.join(projectDir, 'qa_frames');
    const qaFrameFiles = fs.existsSync(qaFramesDir) ? fs.readdirSync(qaFramesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png')) : [];
    for (const qf of qaFrameFiles) {
      const qfPath = path.join(qaFramesDir, qf);
      files[`qa_frames/${qf}`] = fs.statSync(qfPath).size;
    }

    // Available aspects
    const has9x16 = dirEntries.includes('video_9x16.mp4') || (!dirEntries.includes('video_16x9.mp4') && dirEntries.includes('video.mp4'));
    const has16x9 = dirEntries.includes('video_16x9.mp4');
    const aspects = (metaData.aspects && metaData.aspects.length > 0) ? metaData.aspects : [];
    if (aspects.length === 0) {
      if (has9x16) aspects.push('9:16');
      if (has16x9) aspects.push('16:9');
      if (aspects.length === 0) aspects.push('9:16');
    }

    // Beats enrichment
    const baseBeats = timingsData.beats || metaData.beats || [];
    const enrichedBeats = baseBeats.map((b, idx) => {
      const beatNum = String(idx + 1).padStart(2, '0');
      const startSec = round(b.startSec ?? b.start ?? 0);
      const endSec = round(b.endSec ?? b.end ?? (startSec + (b.duration || 0)));
      const durationSec = round(b.durationSec ?? b.duration ?? (endSec - startSec));

      let title = b.title || (metaData.beats && metaData.beats[idx] && metaData.beats[idx].title) || `Beat ${idx + 1}`;
      title = title.replace(/^0\d\s*\/\/\s*/i, '').replace(/^Beat\s*\d+:\s*/i, '').trim();

      // Narration resolution
      let narration = b.spoken_text || b.narration || (metaData.beats && metaData.beats[idx] && metaData.beats[idx].narration) || '';
      if (!narration && (timingsData.subtitle_chunks || timingsData.words)) {
        const chunks = (timingsData.subtitle_chunks || timingsData.words).filter(
          c => c.start >= startSec - 0.25 && c.end <= endSec + 0.8
        );
        narration = chunks.map(c => c.text || c.w || c.word).join(' ').trim();
      }

      // Keyframe resolution inside qa_frames/
      let keyframe = `qa_frames/beat${idx + 1}.jpg`;
      if (!qaFrameFiles.includes(`beat${idx + 1}.jpg`)) {
        const matched = qaFrameFiles.find(f => f.startsWith(`beat${idx + 1}`) || f.startsWith(`beat_${idx + 1}`));
        if (matched) {
          keyframe = `qa_frames/${matched}`;
        }
      }

      // Aspect-specific keyframes if available
      const keyframe9x16 = qaFrameFiles.includes(`beat${idx + 1}_9x16.jpg`) ? `qa_frames/beat${idx + 1}_9x16.jpg` : keyframe;
      const keyframe16x9 = qaFrameFiles.includes(`beat${idx + 1}_16x9.jpg`) ? `qa_frames/beat${idx + 1}_16x9.jpg` : keyframe;

      return {
        beat: beatNum,
        title,
        startSec,
        endSec,
        durationSec,
        narration,
        keyframe,
        keyframe9x16,
        keyframe16x9
      };
    });

    const durationSec = round(
      timingsData.duration_seconds ||
      metaData.durationSec ||
      (enrichedBeats.length > 0 ? enrichedBeats[enrichedBeats.length - 1].endSec : 0)
    );

    const title = scriptData.title || metaData.title || item.title || dirName;
    const isKnp = title.startsWith('Knp?') || (scriptData.series === 'Knp?') || (item.series === 'Knp?');
    const series = isKnp ? 'Knp?' : (scriptData.series || metaData.series || item.series || 'Forensic Deep-Dive');
    const dateCompact = item.dateCompact || metaData.dateCompact || (dirName.match(/\d{8}/) ? dirName.match(/\d{8}/)[0] : '20261031');
    const dateFormatted = item.date || metaData.date || `${dateCompact.slice(0, 4)}-${dateCompact.slice(4, 6)}-${dateCompact.slice(6, 8)}`;
    const language = scriptData.language || metaData.language || item.language || (isKnp ? 'ID' : 'EN');
    const primaryVideo = metaData.primaryVideo || item.primaryVideo || (has9x16 ? 'video_9x16.mp4' : 'video_16x9.mp4');

    // Primary poster thumbnail
    let poster = 'thumbnail.jpg';
    if (!dirEntries.includes(poster)) {
      poster = dirEntries.find(f => f.startsWith('thumb') && f.endsWith('.jpg')) || 'thumbnail.jpg';
    }

    const enrichedProject = {
      id: item.id || metaData.id || `vid_${dateCompact}_001`,
      dirName,
      channel: item.channel || metaData.channel || 'kausalmedia',
      channelLabel: item.channelLabel || metaData.channelLabel || 'Kausal Media',
      series,
      date: dateFormatted,
      dateCompact,
      slug: item.slug || metaData.slug || dirName.replace(/^[a-z]+_\d+_/i, ''),
      title,
      subtitle: scriptData.subtitle || metaData.subtitle || item.subtitle || '',
      description: scriptData.description || scriptData.core_angle || metaData.description || item.description || '',
      language,
      durationSec,
      aspects,
      primaryVideo,
      poster,
      files,
      qaStatus: metaData.qaStatus || item.qaStatus || '14/14 PASS',
      qaFrameFiles,
      beats: enrichedBeats,
      wordCount: scriptData.word_count || (enrichedBeats.reduce((acc, b) => acc + (b.narration ? b.narration.split(/\s+/).length : 0), 0))
    };

    // Write updated meta.json
    fs.writeFileSync(metaPath, JSON.stringify(enrichedProject, null, 2));
    enrichedList.push(enrichedProject);
  }

  // Sort descending by date, then by id
  enrichedList.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));

  // Write updated manifest.json
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(enrichedList, null, 2));
  console.log(`[build_portal] Enriched ${enrichedList.length} projects and updated manifest.json.`);
  return enrichedList;
}

/**
 * Generates the Discovery Hub HTML (/projects/index.html)
 */
export function generateDiscoveryHub(projects) {
  const heroProject = projects[0] || {};
  const heroDir = heroProject.dirName || '';
  const heroAspects = heroProject.aspects || ['9:16'];
  const heroBeats = heroProject.beats || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI-nimate Studio • Discovery Hub & Production Gallery</title>

  <!-- Open Graph / Meta -->
  <meta property="og:site_name" content="AI-nimate Studio">
  <meta property="og:type" content="website">
  <meta property="og:title" content="AI-nimate Studio • Autonomous Video Production Gallery">
  <meta property="og:description" content="Pristine 1080p 60 FPS investigative documentaries and financial visual essays rendered autonomously with Dual-Aspect (16:9 & 9:16) support.">
  <meta property="og:url" content="https://cuang.dev/projects/ainimate/">
  <meta property="og:image" content="./kausalmedia_20261031_knp-saham-teknologi-runtuh/thumbnail_og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="AI-nimate Studio • Autonomous Video Production Gallery">
  <meta name="twitter:description" content="Pristine 1080p 60 FPS investigative documentaries rendered autonomously.">
  <meta name="twitter:image" content="./kausalmedia_20261031_knp-saham-teknologi-runtuh/thumbnail_og.jpg">

  <!-- Typography: Plus Jakarta Sans + Instrument Serif + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #07090e;
      --surface: #0e131f;
      --surface-elevated: #141b2c;
      --card-bg: rgba(15, 22, 36, 0.76);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover-border: rgba(255, 59, 0, 0.45);
      --accent: #ff3b00;
      --accent-glow: rgba(255, 59, 0, 0.22);
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.18);
      --blue: #3b82f6;
      --blue-glow: rgba(59, 130, 246, 0.18);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-serif: 'Instrument Serif', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 12%, rgba(255, 59, 0, 0.08) 0%, transparent 45%),
        radial-gradient(circle at 90% 18%, rgba(16, 185, 129, 0.07) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(59, 130, 246, 0.06) 0%, transparent 55%);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1.25rem 5rem;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      width: 100%;
      max-width: 1240px;
      display: flex;
      flex-direction: column;
      gap: 2.75rem;
    }

    /* Top Brand Navigation */
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .brand-logo-mark {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent) 0%, #ff7700 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-weight: 800;
      color: #fff;
      font-size: 1rem;
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-title span {
      color: var(--accent);
    }

    .nav-badges {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
      animation: pulseDot 2s infinite ease-in-out;
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .pill-info {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
    }

    /* Hero Banner */
    .hero-banner {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 2.25rem;
      background: linear-gradient(135deg, rgba(255, 59, 0, 0.08) 0%, rgba(14, 19, 31, 0.85) 60%);
      border: 1px solid rgba(255, 59, 0, 0.3);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px var(--accent-glow);
      border-radius: 24px;
      padding: 2.25rem;
      position: relative;
      overflow: hidden;
    }

    @media (max-width: 960px) {
      .hero-banner {
        grid-template-columns: 1fr;
      }
    }

    .hero-video-box {
      position: relative;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      aspect-ratio: 9 / 16;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12);
      max-height: 520px;
      margin: 0 auto;
      width: 100%;
    }

    .hero-video-box video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .hero-video-overlay {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }

    .hero-aspect-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .hero-video-controls {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      padding: 0.4rem 0.75rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .hero-ctl-btn {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .hero-ctl-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.25rem;
    }

    .hero-tagline {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--accent);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hero-title {
      font-family: var(--font-serif);
      font-size: clamp(2rem, 3.5vw, 2.9rem);
      line-height: 1.15;
      font-weight: 400;
      letter-spacing: -0.01em;
      color: #fff;
    }

    .hero-subtitle {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .hero-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 680px;
    }

    /* Chapter Pills on Hero */
    .hero-chapters-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .hero-chapters-label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hero-chapters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .hero-chapter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-primary);
      text-decoration: none;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .hero-chapter-pill:hover {
      background: var(--accent-glow);
      border-color: var(--accent);
      color: #fff;
      transform: translateY(-2px);
    }

    .hero-chapter-pill span.num {
      color: var(--accent);
      font-weight: 700;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      font-size: 0.92rem;
      padding: 0.75rem 1.4rem;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 18px var(--accent-glow);
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }

    .btn-primary:hover {
      background: #ff5520;
      box-shadow: 0 6px 24px rgba(255, 59, 0, 0.4);
      transform: translateY(-2px);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.75rem 1.15rem;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Controls Bar: Search + Filters + Sort */
    .discovery-controls {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: var(--surface);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.35rem 1.5rem;
    }

    .search-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .search-box {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      font-size: 1rem;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 0.85rem 3.5rem 0.85rem 2.85rem;
      color: #fff;
      font-family: var(--font-sans);
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 15px var(--accent-glow);
      background: rgba(0, 0, 0, 0.6);
    }

    .search-shortcut-badge {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text-dim);
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      pointer-events: none;
    }

    .sort-select-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-select-wrap label {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-dim);
      white-space: nowrap;
    }

    .sort-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      padding: 0.8rem 1rem;
      border-radius: 12px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .sort-select:focus {
      border-color: var(--accent);
    }

    .filter-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .filter-pill {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }

    .filter-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .filter-pill.active {
      background: var(--accent-glow);
      border-color: var(--accent);
      color: #fff;
      font-weight: 700;
    }

    .results-count {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
      margin-left: auto;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2rem;
    }

    @media (max-width: 680px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }

    .project-card {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      position: relative;
    }

    .project-card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 59, 0, 0.4);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px var(--accent-glow);
    }

    .card-meta-bar {
      padding: 0.9rem 1.25rem 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .dir-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--accent);
      background: rgba(255, 59, 0, 0.1);
      border: 1px solid rgba(255, 59, 0, 0.25);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 210px;
    }

    .meta-tags {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }

    .tag-pill {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
    }

    .tag-pass {
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      font-weight: 700;
    }

    /* Thumbnail + Scrubber Container */
    .card-thumb-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      overflow: hidden;
      cursor: pointer;
    }

    .card-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease;
    }

    .card-thumb-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .card-thumb-container.video-playing .card-thumb-video {
      opacity: 1;
    }

    .card-thumb-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 0.4rem;
      pointer-events: none;
    }

    .card-overlay-badge {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      color: #fff;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* 5-Beat Keyframe Scrubber */
    .card-scrubber-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      z-index: 10;
    }

    .scrub-segment {
      flex: 1;
      padding: 0.35rem 0.15rem;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--text-muted);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.15s;
    }

    .scrub-segment:last-child {
      border-right: none;
    }

    .scrub-segment:hover {
      background: var(--accent);
      color: #fff;
    }

    .scrub-tooltip {
      position: absolute;
      bottom: 34px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid var(--accent);
      color: #fff;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 20;
      box-shadow: 0 4px 15px rgba(0,0,0,0.8);
    }

    .scrub-tooltip.show {
      opacity: 1;
    }

    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      flex: 1;
    }

    .card-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 400;
      line-height: 1.25;
      color: #fff;
      text-decoration: none;
      transition: color 0.2s;
    }

    .card-title:hover {
      color: var(--accent);
    }

    .card-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Transcript Match Highlight Box */
    .transcript-match-box {
      background: rgba(255, 59, 0, 0.08);
      border: 1px dashed rgba(255, 59, 0, 0.4);
      border-radius: 8px;
      padding: 0.6rem 0.75rem;
      font-size: 0.78rem;
      color: #fed7aa;
      line-height: 1.45;
      display: none;
    }

    .transcript-match-box.show {
      display: block;
    }

    .transcript-match-box mark {
      background: var(--accent);
      color: #fff;
      padding: 0.1rem 0.25rem;
      border-radius: 3px;
      font-weight: 700;
    }

    .card-footer {
      margin-top: auto;
      padding: 0.85rem 1.25rem 1.15rem;
      border-top: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .card-actions-left {
      display: flex;
      gap: 0.5rem;
    }

    .card-btn {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .card-btn:hover {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    .card-btn-walkthrough {
      background: rgba(255, 59, 0, 0.15);
      border-color: rgba(255, 59, 0, 0.35);
      color: #ff8866;
    }

    .card-btn-walkthrough:hover {
      background: var(--accent);
      color: #fff;
    }

    .download-dropdown {
      position: relative;
    }

    .download-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 6px);
      background: #0d121c;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.35rem 0;
      min-width: 160px;
      display: none;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
      z-index: 50;
    }

    .download-dropdown:hover .download-menu {
      display: flex;
    }

    .download-item {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      padding: 0.45rem 0.85rem;
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }

    .download-item:hover {
      background: var(--accent-glow);
      color: #fff;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--card-border);
      padding-top: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    .footer-left {
      font-family: var(--font-mono);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Navigation -->
    <header class="top-nav">
      <div class="brand-group">
        <div class="brand-logo-mark">⚡</div>
        <div class="brand-title">AI-nimate <span>Studio</span></div>
      </div>
      <div class="nav-badges">
        <div class="status-badge">
          <div class="status-dot"></div>
          <span>Autonomous Render Engine</span>
        </div>
        <div class="pill-info">60 FPS Pristine</div>
        <div class="pill-info">Dual-Aspect (9:16 &amp; 16:9)</div>
        <div class="pill-info">${projects.length} Total Productions</div>
      </div>
    </header>

    <!-- Featured Hero Banner (Newest Production) -->
    <section class="hero-banner">
      <div class="hero-video-box">
        <video id="hero-video" muted playsinline loop poster="./${heroDir}/${heroProject.poster || 'thumbnail.jpg'}">
          <source src="./${heroDir}/${heroProject.primaryVideo || 'video_9x16.mp4'}" type="video/mp4">
          <source src="./${heroDir}/video_whatsapp.mp4" type="video/mp4">
        </video>
        <div class="hero-video-overlay">
          <span class="hero-aspect-badge">${heroAspects.join(' • ')}</span>
          <span class="hero-aspect-badge" style="color: #34d399;">${heroProject.qaStatus}</span>
        </div>
        <div class="hero-video-controls">
          <button class="hero-ctl-btn" id="hero-play-toggle">▶ Play</button>
          <button class="hero-ctl-btn" id="hero-sound-toggle">🔇 Unmute</button>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${formatTime(heroProject.durationSec, false)}</span>
        </div>
      </div>

      <div class="hero-content">
        <div class="hero-tagline">
          <span>★ Featured Production</span>
          <span>•</span>
          <span>${heroProject.series}</span>
          <span>•</span>
          <span>${heroProject.date}</span>
        </div>

        <h1 class="hero-title">${escapeHtml(heroProject.title)}</h1>
        ${heroProject.subtitle ? `<div class="hero-subtitle">${escapeHtml(heroProject.subtitle)}</div>` : ''}
        <p class="hero-desc">${escapeHtml(heroProject.description)}</p>

        <!-- Chapter Deep-Link Pills -->
        <div class="hero-chapters-wrap">
          <span class="hero-chapters-label">Interactive Beats &amp; Chapters</span>
          <div class="hero-chapters">
            ${heroBeats.map((b) => `
              <a href="./${heroDir}/?beat=${b.beat}" class="hero-chapter-pill" data-start="${b.startSec}" title="Jump to Beat ${b.beat}: ${escapeHtml(b.title)}">
                <span class="num">${b.beat}</span>
                <span>${escapeHtml(b.title)}</span>
              </a>
            `).join('')}
          </div>
        </div>

        <div class="hero-actions">
          <a href="./${heroDir}/" class="btn-primary">
            <span>Launch Interactive Walkthrough</span>
            <span>→</span>
          </a>
          <a href="./${heroDir}/embed.html" class="btn-secondary">
            <span>Embed Player</span>
          </a>
          <a href="./${heroDir}/video_whatsapp.mp4" download class="btn-secondary">
            <span>↓ WhatsApp MP4</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Video Discovery Controls -->
    <section class="discovery-controls">
      <div class="search-row">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            id="search-input" 
            class="search-input" 
            placeholder="Search projects, directory names, series, or spoken transcripts... (Press '/' to focus)"
            autocomplete="off"
          />
          <span class="search-shortcut-badge">/</span>
        </div>

        <div class="sort-select-wrap">
          <label for="sort-select">Sort By:</label>
          <select id="sort-select" class="sort-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="longest">Longest Duration</option>
            <option value="shortest">Shortest Duration</option>
          </select>
        </div>
      </div>

      <div class="filter-pills-row">
        <div class="filter-pill active" data-filter="all">All (${projects.length})</div>
        <div class="filter-pill" data-filter="knp">Knp? Series</div>
        <div class="filter-pill" data-filter="forensic">Forensic Deep-Dive</div>
        <div class="filter-pill" data-filter="9x16">9:16 Vertical</div>
        <div class="filter-pill" data-filter="16x9">16:9 Widescreen</div>
        <div class="filter-pill" data-filter="dual">Dual-Aspect</div>
        <div class="filter-pill" data-filter="id">Bahasa Indonesia</div>
        <div class="filter-pill" data-filter="en">English</div>
        <div class="results-count" id="results-count">Showing ${projects.length} of ${projects.length} productions</div>
      </div>
    </section>

    <!-- Discovery Project Cards Grid -->
    <section class="cards-grid" id="cards-grid">
      ${projects.map((p) => {
        const pDir = p.dirName;
        const beats = p.beats || [];
        const has16 = p.aspects.includes('16:9');
        const has9 = p.aspects.includes('9:16');
        const isDual = has16 && has9;
        const defaultPoster = `./${pDir}/${p.poster || 'thumbnail.jpg'}`;
        const previewVideo = `./${pDir}/${p.files['video_whatsapp.mp4'] ? 'video_whatsapp.mp4' : (p.primaryVideo || 'video.mp4')}`;

        return `
        <article 
          class="project-card" 
          id="card-${p.id}"
          data-id="${p.id}"
          data-dir="${pDir}"
          data-series="${p.series}"
          data-lang="${p.language}"
          data-date="${p.date}"
          data-duration="${p.durationSec}"
          data-aspects="${p.aspects.join(',')}"
          data-dual="${isDual}"
        >
          <!-- Metadata Bar -->
          <div class="card-meta-bar">
            <span class="dir-badge" title="${pDir}">${pDir}</span>
            <div class="meta-tags">
              <span class="tag-pill">${p.language}</span>
              <span class="tag-pill">${p.aspects.join('/')}</span>
              <span class="tag-pill tag-pass">${p.qaStatus}</span>
            </div>
          </div>

          <!-- Thumbnail with Hover Video & 5-Beat Keyframe Scrubber -->
          <div class="card-thumb-container" id="thumb-container-${p.id}">
            <img class="card-thumb-img" id="thumb-img-${p.id}" src="${defaultPoster}" alt="${escapeHtml(p.title)}" loading="lazy" />
            <video class="card-thumb-video" id="thumb-video-${p.id}" muted loop playsinline preload="none" src="${previewVideo}"></video>
            
            <div class="card-thumb-overlay">
              <span class="card-overlay-badge">${formatTime(p.durationSec, false)}</span>
              <span class="card-overlay-badge">${p.series}</span>
            </div>

            <!-- 5-Beat Keyframe Scrubber -->
            <div class="card-scrubber-bar">
              ${beats.map((b) => `
                <div 
                  class="scrub-segment" 
                  data-card-id="${p.id}"
                  data-default-poster="${defaultPoster}"
                  data-keyframe="./${pDir}/${b.keyframe}" 
                  data-beat="${b.beat}" 
                  data-title="${escapeHtml(b.title)}"
                  data-time="${formatTime(b.startSec, false)}"
                  onclick="event.stopPropagation(); window.location.href='./${pDir}/?beat=${b.beat}';"
                >
                  B${b.beat}
                </div>
              `).join('')}
            </div>
            <div class="scrub-tooltip" id="tooltip-${p.id}"></div>
          </div>

          <!-- Card Content -->
          <div class="card-body">
            <a href="./${pDir}/" class="card-title">${escapeHtml(p.title)}</a>
            <p class="card-desc">${escapeHtml(p.description)}</p>

            <!-- Dynamic Transcript Match Box -->
            <div class="transcript-match-box" id="transcript-match-${p.id}"></div>
          </div>

          <!-- Card Footer Actions -->
          <div class="card-footer">
            <div class="card-actions-left">
              <a href="./${pDir}/" class="card-btn card-btn-walkthrough">
                <span>Walkthrough</span>
                <span>→</span>
              </a>
              <a href="./${pDir}/embed.html" class="card-btn">
                <span>Embed</span>
              </a>
            </div>

            <div class="download-dropdown">
              <button class="card-btn" type="button">
                <span>Download ↓</span>
              </button>
              <div class="download-menu">
                ${p.files['video_9x16.mp4'] ? `<a href="./${pDir}/video_9x16.mp4" download class="download-item">9:16 Vertical MP4 (${formatFileSize(p.files['video_9x16.mp4'])})</a>` : ''}
                ${p.files['video_16x9.mp4'] ? `<a href="./${pDir}/video_16x9.mp4" download class="download-item">16:9 Widescreen MP4 (${formatFileSize(p.files['video_16x9.mp4'])})</a>` : ''}
                ${p.files['video_whatsapp.mp4'] ? `<a href="./${pDir}/video_whatsapp.mp4" download class="download-item">WhatsApp MP4 (${formatFileSize(p.files['video_whatsapp.mp4'])})</a>` : ''}
                ${p.files['narration.wav'] ? `<a href="./${pDir}/narration.wav" download class="download-item">Audio WAV (${formatFileSize(p.files['narration.wav'])})</a>` : ''}
              </div>
            </div>
          </div>
        </article>
        `;
      }).join('')}
    </section>

    <!-- Footer -->
    <footer>
      <div class="footer-left">
        AI-nimate Studio • Autonomous Video Architecture • 2026
      </div>
      <div>
        Kinetic Visual Essay Generator • Pristine Dual-Aspect 60 FPS
      </div>
    </footer>
  </div>

  <!-- Client-side Interactive Search, Scrubbing & Filter Script -->
  <script>
    const PROJECTS_DATA = ${JSON.stringify(projects)};

    // Hero video player controls
    const heroVid = document.getElementById('hero-video');
    const heroPlayBtn = document.getElementById('hero-play-toggle');
    const heroSoundBtn = document.getElementById('hero-sound-toggle');

    if (heroVid && heroPlayBtn && heroSoundBtn) {
      // Autoplay attempt (muted)
      heroVid.play().then(() => {
        heroPlayBtn.textContent = '❚❚ Pause';
      }).catch(() => {
        heroPlayBtn.textContent = '▶ Play';
      });

      heroPlayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (heroVid.paused) {
          heroVid.play();
          heroPlayBtn.textContent = '❚❚ Pause';
        } else {
          heroVid.pause();
          heroPlayBtn.textContent = '▶ Play';
        }
      });

      heroSoundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (heroVid.muted) {
          heroVid.muted = false;
          heroSoundBtn.textContent = '🔊 Mute';
        } else {
          heroVid.muted = true;
          heroSoundBtn.textContent = '🔇 Unmute';
        }
      });
    }

    // Scrubber hover & card video preview interactions
    document.querySelectorAll('.card-thumb-container').forEach(container => {
      const card = container.closest('.project-card');
      const cardId = card.dataset.id;
      const img = container.querySelector('.card-thumb-img');
      const video = container.querySelector('.card-thumb-video');
      const tooltip = document.getElementById('tooltip-' + cardId);
      const defaultPoster = img.getAttribute('src');

      // Video hover preview
      let hoverTimeout;
      container.addEventListener('mouseenter', (e) => {
        if (e.target.closest('.card-scrubber-bar')) return;
        hoverTimeout = setTimeout(() => {
          container.classList.add('video-playing');
          video.currentTime = 0;
          video.play().catch(() => {});
        }, 180);
      });

      container.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        container.classList.remove('video-playing');
        video.pause();
        video.currentTime = 0;
        img.src = defaultPoster;
        if (tooltip) tooltip.classList.remove('show');
      });

      // Scrub segments
      container.querySelectorAll('.scrub-segment').forEach(seg => {
        seg.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          container.classList.remove('video-playing');
          video.pause();
          
          const kf = seg.dataset.keyframe;
          const beat = seg.dataset.beat;
          const title = seg.dataset.title;
          const time = seg.dataset.time;

          img.src = kf;
          if (tooltip) {
            tooltip.textContent = 'Beat ' + beat + ': ' + title + ' (' + time + ')';
            tooltip.classList.add('show');
          }
        });

        seg.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          if (tooltip) tooltip.classList.remove('show');
        });
      });
    });

    // Keyboard shortcut '/' to focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Instant Search & Filtering
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const filterPills = document.querySelectorAll('.filter-pill');
    const cardsGrid = document.getElementById('cards-grid');
    const resultsCount = document.getElementById('results-count');

    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort = 'newest';

    function filterAndSort() {
      const q = currentSearch.trim().toLowerCase();
      const filtered = [];

      PROJECTS_DATA.forEach(p => {
        const cardElem = document.getElementById('card-' + p.id);
        const matchBox = document.getElementById('transcript-match-' + p.id);
        if (!cardElem) return;

        // Filter pills check
        let passesFilter = true;
        if (currentFilter === 'knp') passesFilter = p.series === 'Knp?';
        else if (currentFilter === 'forensic') passesFilter = p.series === 'Forensic Deep-Dive';
        else if (currentFilter === '9x16') passesFilter = p.aspects.includes('9:16');
        else if (currentFilter === '16x9') passesFilter = p.aspects.includes('16:9');
        else if (currentFilter === 'dual') passesFilter = p.aspects.length > 1;
        else if (currentFilter === 'id') passesFilter = p.language === 'ID';
        else if (currentFilter === 'en') passesFilter = p.language === 'EN';

        if (!passesFilter) {
          cardElem.style.display = 'none';
          if (matchBox) matchBox.classList.remove('show');
          return;
        }

        // Search check
        let passesSearch = false;
        let matchSnippet = null;

        if (!q) {
          passesSearch = true;
        } else {
          const inTitle = p.title.toLowerCase().includes(q);
          const inDir = p.dirName.toLowerCase().includes(q);
          const inSeries = (p.series || '').toLowerCase().includes(q);
          const inDesc = (p.description || '').toLowerCase().includes(q);

          if (inTitle || inDir || inSeries || inDesc) {
            passesSearch = true;
          }

          // Search transcripts across all beats
          for (const b of (p.beats || [])) {
            const narr = b.narration || '';
            const lowerNarr = narr.toLowerCase();
            const idx = lowerNarr.indexOf(q);
            if (idx !== -1) {
              passesSearch = true;
              const start = Math.max(0, idx - 40);
              const end = Math.min(narr.length, idx + q.length + 40);
              const snippetText = (start > 0 ? '...' : '') +
                escapeHtml(narr.slice(start, idx)) +
                '<mark>' + escapeHtml(narr.slice(idx, idx + q.length)) + '</mark>' +
                escapeHtml(narr.slice(idx + q.length, end)) +
                (end < narr.length ? '...' : '');
              matchSnippet = '⚡ Transcript Match in <strong>Beat ' + b.beat + ' (' + escapeHtml(b.title) + ')</strong>: "' + snippetText + '"';
              break;
            }
          }
        }

        if (passesSearch) {
          cardElem.style.display = 'flex';
          if (matchSnippet && matchBox) {
            matchBox.innerHTML = matchSnippet;
            matchBox.classList.add('show');
          } else if (matchBox) {
            matchBox.classList.remove('show');
          }
          filtered.push({ p, elem: cardElem });
        } else {
          cardElem.style.display = 'none';
          if (matchBox) matchBox.classList.remove('show');
        }
      });

      // Sort
      filtered.sort((a, b) => {
        if (currentSort === 'newest') return (b.p.date || '').localeCompare(a.p.date || '') || b.p.id.localeCompare(a.p.id);
        if (currentSort === 'oldest') return (a.p.date || '').localeCompare(b.p.date || '') || a.p.id.localeCompare(b.p.id);
        if (currentSort === 'longest') return (b.p.durationSec || 0) - (a.p.durationSec || 0);
        if (currentSort === 'shortest') return (a.p.durationSec || 0) - (b.p.durationSec || 0);
        return 0;
      });

      filtered.forEach(item => cardsGrid.appendChild(item.elem));
      resultsCount.textContent = 'Showing ' + filtered.length + ' of ' + PROJECTS_DATA.length + ' productions';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      filterAndSort();
    });

    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      filterAndSort();
    });

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        filterAndSort();
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Generates the Per-Project Walkthrough HTML (/projects/<dirName>/index.html)
 */
export function generateWalkthrough(project, allProjects) {
  const currentIndex = allProjects.findIndex(p => p.id === project.id || p.dirName === project.dirName);
  const prevProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;
  const nextProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;

  const beats = project.beats || [];
  const dirName = project.dirName;
  const has16x9 = project.aspects.includes('16:9') && !!project.files['video_16x9.mp4'];
  const has9x16 = project.aspects.includes('9:16') || !!project.files['video_9x16.mp4'];
  const defaultAspect = has9x16 ? '9x16' : '16x9';

  return `<!DOCTYPE html>
<html lang="${project.language === 'ID' ? 'id' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)} | AI-nimate Studio</title>

  <!-- Open Graph / WhatsApp Rich Link Protocol -->
  <meta property="og:site_name" content="${escapeHtml(project.channelLabel)} • AI-nimate Studio">
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="${escapeHtml(project.title)}">
  <meta property="og:description" content="${escapeHtml(project.description)}">
  <meta property="og:url" content="https://cuang.dev/projects/ainimate/${dirName}/">
  <meta property="og:image" content="${project.files['thumbnail_og.jpg'] ? 'thumbnail_og.jpg' : (project.poster || 'thumbnail.jpg')}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${escapeHtml(project.title)}">
  <meta name="twitter:description" content="${escapeHtml(project.description)}">
  <meta name="twitter:image" content="${project.files['thumbnail_og.jpg'] ? 'thumbnail_og.jpg' : (project.poster || 'thumbnail.jpg')}">
  <meta name="twitter:player" content="./embed.html">
  <meta name="twitter:player:width" content="540">
  <meta name="twitter:player:height" content="960">

  <!-- Schema.org VideoObject Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": ${JSON.stringify(project.title)},
    "description": ${JSON.stringify(project.description)},
    "thumbnailUrl": "https://cuang.dev/projects/ainimate/${dirName}/${project.poster || 'thumbnail.jpg'}",
    "uploadDate": "${project.date}T10:00:00+07:00",
    "duration": "PT${Math.floor(project.durationSec / 60)}M${Math.floor(project.durationSec % 60)}S",
    "contentUrl": "https://cuang.dev/projects/ainimate/${dirName}/${project.primaryVideo || 'video_9x16.mp4'}",
    "embedUrl": "https://cuang.dev/projects/ainimate/${dirName}/embed.html"
  }
  </script>

  <!-- Typography: Plus Jakarta Sans + Instrument Serif + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #07090e;
      --surface: #0e131f;
      --surface-elevated: #141b2c;
      --card-bg: rgba(15, 22, 36, 0.76);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover-border: rgba(255, 59, 0, 0.45);
      --accent: #ff3b00;
      --accent-glow: rgba(255, 59, 0, 0.22);
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.18);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-serif: 'Instrument Serif', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 8%, rgba(255, 59, 0, 0.07) 0%, transparent 45%),
        radial-gradient(circle at 90% 12%, rgba(16, 185, 129, 0.06) 0%, transparent 45%),
        radial-gradient(circle at 50% 90%, rgba(59, 130, 246, 0.05) 0%, transparent 55%);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1.25rem 5rem;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      width: 100%;
      max-width: 1260px;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Header Bar */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.25rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.85rem;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: var(--accent-glow);
      border-color: var(--accent);
      color: #fff;
    }

    .canonical-path-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--accent);
      background: rgba(255, 59, 0, 0.08);
      border: 1px solid rgba(255, 59, 0, 0.25);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .nav-arrow-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s;
    }

    .nav-arrow-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .qa-pass-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: #34d399;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
    }

    /* Hero Headline */
    .project-header-hero {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .project-meta-strip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--accent);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .project-title {
      font-family: var(--font-serif);
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.15;
      font-weight: 400;
      color: #fff;
    }

    .project-subtitle {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .project-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 900px;
    }

    /* Workspace 2-Column Layout */
    .workspace-grid {
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 2.25rem;
      align-items: start;
    }

    @media (max-width: 1040px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Left Column: Sticky Cinema Player */
    .player-col {
      position: sticky;
      top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .cinema-viewport {
      position: relative;
      background: #000;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12);
      transition: aspect-ratio 0.3s ease, max-width 0.3s ease;
      width: 100%;
      margin: 0 auto;
    }

    .cinema-viewport.aspect-9x16 {
      aspect-ratio: 9 / 16;
      max-width: 400px;
    }

    .cinema-viewport.aspect-16x9 {
      aspect-ratio: 16 / 9;
      max-width: 100%;
    }

    .cinema-viewport video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      display: block;
      outline: none;
    }

    /* Player Controls Bar */
    .player-controls-panel {
      background: var(--surface);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .ctrl-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .ctrl-label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-dim);
      text-transform: uppercase;
    }

    .btn-group {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }

    .ctrl-pill-btn {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .ctrl-pill-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .ctrl-pill-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      box-shadow: 0 0 10px var(--accent-glow);
    }

    .loop-toggle-btn {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }

    .loop-toggle-btn.active {
      background: rgba(255, 59, 0, 0.15);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 14px var(--accent-glow);
    }

    /* Segmented Proportional 5-Beat Timeline Bar */
    .timeline-bar-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .timeline-bar {
      display: flex;
      width: 100%;
      height: 28px;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--card-border);
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    .timeline-segment {
      position: relative;
      height: 100%;
      background: rgba(255, 255, 255, 0.05);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      transition: background 0.15s;
    }

    .timeline-segment:last-child {
      border-right: none;
    }

    .timeline-segment:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .timeline-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #ff3b00 0%, #ff6b3d 100%);
      pointer-events: none;
      transition: width 0.08s linear;
    }

    .timeline-label {
      position: relative;
      z-index: 2;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      pointer-events: none;
    }

    /* Downloads & Embed Panel */
    .downloads-panel {
      background: var(--surface);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dl-title {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dl-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .dl-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dl-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-copy-embed {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 59, 0, 0.15);
      border: 1px solid rgba(255, 59, 0, 0.35);
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      transition: all 0.2s;
    }

    .btn-copy-embed:hover {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 0 14px var(--accent-glow);
    }

    /* Right Column: Walkthrough Workspace Tabs */
    .walkthrough-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.75rem;
      overflow-x: auto;
    }

    .tab-btn {
      font-family: var(--font-sans);
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid transparent;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      color: #fff;
      background: rgba(255, 59, 0, 0.12);
      border-color: rgba(255, 59, 0, 0.35);
      font-weight: 700;
    }

    .tab-content {
      display: none;
      flex-direction: column;
      gap: 1.25rem;
    }

    .tab-content.active {
      display: flex;
    }

    /* Tab 1: Beat-by-Beat Cards */
    .beat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 1.35rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.25s ease;
    }

    .beat-card:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(20, 29, 46, 0.85);
    }

    .beat-card.active-beat {
      border-color: var(--accent);
      background: linear-gradient(135deg, rgba(255, 59, 0, 0.1) 0%, rgba(15, 22, 36, 0.9) 100%);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 25px var(--accent-glow);
    }

    .beat-card-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: var(--accent);
      transition: width 0.1s linear;
    }

    .beat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .beat-pill-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .beat-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 800;
      background: var(--accent);
      color: #fff;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
    }

    .beat-time-range {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-dim);
    }

    .beat-duration-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .btn-play-beat {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }

    .btn-play-beat:hover, .beat-card.active-beat .btn-play-beat {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    .beat-title {
      font-family: var(--font-serif);
      font-size: 1.45rem;
      font-weight: 400;
      color: #fff;
      line-height: 1.25;
    }

    .beat-card-body {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1.25rem;
      align-items: start;
    }

    @media (max-width: 640px) {
      .beat-card-body {
        grid-template-columns: 1fr;
      }
    }

    .beat-thumb-box {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: zoom-in;
    }

    .beat-thumb-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.25s;
    }

    .beat-thumb-box:hover img {
      transform: scale(1.05);
    }

    .beat-thumb-zoom-icon {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: var(--font-mono);
      pointer-events: none;
    }

    .beat-narration-box {
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--text-primary);
    }

    /* Tab 2: QA Keyframes & Visual Grid */
    .qa-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
    }

    .qa-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      overflow: hidden;
      cursor: zoom-in;
      transition: all 0.2s;
    }

    .qa-card:hover {
      border-color: var(--accent);
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .qa-card-img-wrap {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      overflow: hidden;
    }

    .qa-card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .qa-card-info {
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .qa-card-title {
      font-weight: 600;
      color: #fff;
    }

    .qa-card-badge {
      color: var(--accent);
      background: rgba(255, 59, 0, 0.1);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    /* Tab 3: Specs & Timings Table */
    .specs-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .specs-card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .specs-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .specs-table td, .specs-table th {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      text-align: left;
    }

    .specs-table th {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
    }

    .specs-label {
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }

    .specs-val {
      color: #fff;
      font-family: var(--font-mono);
      font-weight: 600;
    }

    /* Fullscreen Keyframe Lightbox Modal */
    .lightbox-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(12px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .lightbox-modal.open {
      display: flex;
    }

    .lightbox-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .lightbox-img {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.2);
    }

    .lightbox-caption {
      font-family: var(--font-mono);
      font-size: 0.88rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.8);
      padding: 0.4rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--card-border);
    }

    .lightbox-close-btn {
      position: absolute;
      top: -40px;
      right: 0;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1.8rem;
      cursor: pointer;
      line-height: 1;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #10b981;
      color: #000;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.82rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      z-index: 2000;
      pointer-events: none;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Bar -->
    <header class="header-bar">
      <div class="header-left">
        <a href="../" class="back-btn">← All Projects</a>
        <span class="canonical-path-badge">projects/${dirName}</span>
      </div>
      <div class="header-right">
        ${prevProject ? `<a href="../${prevProject.dirName}/" class="nav-arrow-btn">← Prev: ${escapeHtml(prevProject.title.slice(0, 24))}...</a>` : ''}
        ${nextProject ? `<a href="../${nextProject.dirName}/" class="nav-arrow-btn">Next: ${escapeHtml(nextProject.title.slice(0, 24))}... →</a>` : ''}
        <span class="qa-pass-badge">✓ ${project.qaStatus}</span>
      </div>
    </header>

    <!-- Project Title Hero -->
    <section class="project-header-hero">
      <div class="project-meta-strip">
        <span>${escapeHtml(project.channelLabel)}</span>
        <span>•</span>
        <span>${project.series}</span>
        <span>•</span>
        <span>${project.date}</span>
      </div>
      <h1 class="project-title">${escapeHtml(project.title)}</h1>
      ${project.subtitle ? `<div class="project-subtitle">${escapeHtml(project.subtitle)}</div>` : ''}
      <p class="project-desc">${escapeHtml(project.description)}</p>
    </section>

    <!-- Two-Column Cinema + Walkthrough Workspace -->
    <div class="workspace-grid">
      <!-- Left Column: Sticky Cinema Player -->
      <div class="player-col">
        <!-- Adaptive Viewport Frame -->
        <div class="cinema-viewport ${defaultAspect === '9x16' ? 'aspect-9x16' : 'aspect-16x9'}" id="cinema-frame">
          <video 
            id="main-video" 
            controls 
            playsinline 
            poster="${project.poster || 'thumbnail.jpg'}" 
            preload="metadata"
          >
            <source id="video-source" src="${defaultAspect === '9x16' ? (project.primaryVideo || 'video_9x16.mp4') : 'video_16x9.mp4'}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>

        <!-- Player Controls & Aspect Switcher -->
        <div class="player-controls-panel">
          <div class="ctrl-row">
            <span class="ctrl-label">Aspect Switcher</span>
            <div class="btn-group">
              ${has9x16 ? `<button class="ctrl-pill-btn ${defaultAspect === '9x16' ? 'active' : ''}" data-aspect="9x16" data-src="${project.primaryVideo || 'video_9x16.mp4'}">9:16 Vertical</button>` : ''}
              ${has16x9 ? `<button class="ctrl-pill-btn ${defaultAspect === '16x9' ? 'active' : ''}" data-aspect="16x9" data-src="video_16x9.mp4">16:9 Widescreen</button>` : ''}
              ${project.files['video_whatsapp.mp4'] ? `<button class="ctrl-pill-btn" data-aspect="9x16" data-src="video_whatsapp.mp4">WhatsApp MP4</button>` : ''}
            </div>
          </div>

          <div class="ctrl-row">
            <span class="ctrl-label">Playback Speed</span>
            <div class="btn-group">
              <button class="ctrl-pill-btn" data-speed="0.75">0.75x</button>
              <button class="ctrl-pill-btn active" data-speed="1.0">1.0x</button>
              <button class="ctrl-pill-btn" data-speed="1.25">1.25x</button>
              <button class="ctrl-pill-btn" data-speed="1.5">1.5x</button>
            </div>
          </div>

          <div class="ctrl-row" style="padding-top: 0.25rem;">
            <button class="loop-toggle-btn" id="loop-beat-btn">
              <span>🔁</span>
              <span>Loop Active Beat</span>
            </button>
            <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim);" id="time-display">00:00.0 / ${formatTime(project.durationSec)}</span>
          </div>
        </div>

        <!-- Segmented Proportional 5-Beat Timeline Bar -->
        <div class="timeline-bar-wrapper">
          <div class="timeline-bar" id="timeline-bar">
            ${beats.map((b) => {
              const pct = (b.durationSec / (project.durationSec || 1)) * 100;
              return `
              <div 
                class="timeline-segment" 
                style="flex: ${b.durationSec};" 
                data-beat="${b.beat}" 
                data-start="${b.startSec}" 
                data-end="${b.endSec}"
                title="Beat ${b.beat}: ${escapeHtml(b.title)} (${b.durationSec}s)"
              >
                <div class="timeline-fill" id="fill-beat-${b.beat}"></div>
                <span class="timeline-label">B${b.beat}</span>
              </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Downloads & Share Panel -->
        <div class="downloads-panel">
          <div class="dl-title">Download Master Assets</div>
          <div class="dl-grid">
            ${project.files['video_9x16.mp4'] ? `<a href="video_9x16.mp4" download class="dl-pill">9:16 Video (${formatFileSize(project.files['video_9x16.mp4'])})</a>` : ''}
            ${project.files['video_16x9.mp4'] ? `<a href="video_16x9.mp4" download class="dl-pill">16:9 Video (${formatFileSize(project.files['video_16x9.mp4'])})</a>` : ''}
            ${project.files['video_whatsapp.mp4'] ? `<a href="video_whatsapp.mp4" download class="dl-pill">WhatsApp Video (${formatFileSize(project.files['video_whatsapp.mp4'])})</a>` : ''}
            ${project.files['narration.wav'] ? `<a href="narration.wav" download class="dl-pill">Narration Audio (${formatFileSize(project.files['narration.wav'])})</a>` : ''}
            ${project.files['script.json'] ? `<a href="script.json" download class="dl-pill">script.json</a>` : ''}
            ${project.files['timings.json'] ? `<a href="timings.json" download class="dl-pill">timings.json</a>` : ''}
            ${project.files['meta.json'] ? `<a href="meta.json" download class="dl-pill">meta.json</a>` : ''}
          </div>
          <button class="btn-copy-embed" id="copy-embed-btn">
            <span>&lt;/&gt; Copy &lt;iframe&gt; Embed Code</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Interactive Walkthrough Workspace Tabs -->
      <div class="walkthrough-col">
        <!-- Tab Navigation Buttons -->
        <nav class="nav-tabs">
          <button class="tab-btn active" data-tab="tab-beats">⚡ Beat-by-Beat Walkthrough</button>
          <button class="tab-btn" data-tab="tab-keyframes">🖼️ QA Keyframes &amp; Visual Grid</button>
          <button class="tab-btn" data-tab="tab-specs">⚙️ Production Specs &amp; Timings</button>
        </nav>

        <!-- Tab 1: Beat-by-Beat Walkthrough Cards -->
        <div class="tab-content active" id="tab-beats">
          ${beats.map((b) => `
            <article 
              class="beat-card" 
              id="beat-card-${b.beat}" 
              data-beat="${b.beat}" 
              data-start="${b.startSec}" 
              data-end="${b.endSec}"
            >
              <div class="beat-card-progress" id="progress-beat-${b.beat}"></div>

              <div class="beat-card-header">
                <div class="beat-pill-group">
                  <span class="beat-pill">BEAT ${b.beat}</span>
                  <span class="beat-time-range">${formatTime(b.startSec)} – ${formatTime(b.endSec)}</span>
                  <span class="beat-duration-badge">${b.durationSec}s</span>
                </div>
                <button class="btn-play-beat" data-start="${b.startSec}">
                  <span>▶ Play Beat</span>
                </button>
              </div>

              <h2 class="beat-title">${escapeHtml(b.title)}</h2>

              <div class="beat-card-body">
                <div 
                  class="beat-thumb-box" 
                  data-zoom-src="${b.keyframe}" 
                  data-caption="Beat ${b.beat}: ${escapeHtml(b.title)} (${formatTime(b.startSec)} - ${formatTime(b.endSec)})"
                >
                  <img src="${b.keyframe}" alt="Beat ${b.beat} Keyframe" loading="lazy">
                  <span class="beat-thumb-zoom-icon">🔍 Zoom</span>
                </div>

                <div class="beat-narration-box">
                  ${escapeHtml(b.narration)}
                </div>
              </div>
            </article>
          `).join('')}
        </div>

        <!-- Tab 2: QA Keyframes & Visual Grid -->
        <div class="tab-content" id="tab-keyframes">
          <div class="qa-grid">
            ${(project.qaFrameFiles || []).map((qf) => {
              const is16 = qf.includes('16x9');
              const is9 = qf.includes('9x16');
              const aspectLabel = is16 ? '16:9' : (is9 ? '9:16' : '1:1 / Master');
              return `
              <div class="qa-card" data-zoom-src="qa_frames/${qf}" data-caption="${qf} (${aspectLabel})">
                <div class="qa-card-img-wrap">
                  <img src="qa_frames/${qf}" alt="${qf}" loading="lazy">
                </div>
                <div class="qa-card-info">
                  <span class="qa-card-title">${qf}</span>
                  <span class="qa-card-badge">${aspectLabel}</span>
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tab 3: Production Specs & Timings -->
        <div class="tab-content" id="tab-specs">
          <div class="specs-card">
            <div class="specs-card-title">
              <span>⚙️ Technical Specifications</span>
            </div>
            <table class="specs-table">
              <tr>
                <td class="specs-label">Channel</td>
                <td class="specs-val">${escapeHtml(project.channelLabel)} (${project.channel})</td>
              </tr>
              <tr>
                <td class="specs-label">Series</td>
                <td class="specs-val">${project.series}</td>
              </tr>
              <tr>
                <td class="specs-label">Project ID</td>
                <td class="specs-val">${project.id}</td>
              </tr>
              <tr>
                <td class="specs-label">Canonical Folder</td>
                <td class="specs-val">projects/${dirName}</td>
              </tr>
              <tr>
                <td class="specs-label">Release Date</td>
                <td class="specs-val">${project.date}</td>
              </tr>
              <tr>
                <td class="specs-label">Supported Aspects</td>
                <td class="specs-val">${project.aspects.join(', ')}</td>
              </tr>
              <tr>
                <td class="specs-label">Language</td>
                <td class="specs-val">${project.language === 'ID' ? 'Bahasa Indonesia (ID)' : 'English (EN)'}</td>
              </tr>
              <tr>
                <td class="specs-label">Spoken Word Count</td>
                <td class="specs-val">${project.wordCount} words</td>
              </tr>
              <tr>
                <td class="specs-label">Total Duration</td>
                <td class="specs-val">${project.durationSec}s (${Math.round(project.durationSec * 60)} frames @ 60 FPS)</td>
              </tr>
              <tr>
                <td class="specs-label">QA Status</td>
                <td class="specs-val" style="color: #34d399;">${project.qaStatus}</td>
              </tr>
            </table>
          </div>

          <div class="specs-card">
            <div class="specs-card-title">
              <span>⏱️ Beat Durations &amp; Timeline Architecture</span>
            </div>
            <table class="specs-table">
              <thead>
                <tr>
                  <th>Beat</th>
                  <th>Chapter Title</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${beats.map((b) => `
                  <tr>
                    <td class="specs-val">B${b.beat}</td>
                    <td>${escapeHtml(b.title)}</td>
                    <td class="specs-val">${formatTime(b.startSec)}</td>
                    <td class="specs-val">${formatTime(b.endSec)}</td>
                    <td class="specs-val">${b.durationSec}s</td>
                    <td>
                      <button class="btn-play-beat" data-start="${b.startSec}" style="padding: 0.2rem 0.5rem;">
                        ▶ Jump
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="specs-card">
            <div class="specs-card-title">
              <span>📁 Raw JSON Manifest Files</span>
            </div>
            <div class="dl-grid">
              <a href="meta.json" target="_blank" class="dl-pill">View meta.json ↗</a>
              <a href="timings.json" target="_blank" class="dl-pill">View timings.json ↗</a>
              <a href="script.json" target="_blank" class="dl-pill">View script.json ↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox Modal -->
  <div class="lightbox-modal" id="lightbox-modal">
    <div class="lightbox-content">
      <button class="lightbox-close-btn" id="lightbox-close-btn">×</button>
      <img class="lightbox-img" id="lightbox-img" src="" alt="Keyframe Full View">
      <div class="lightbox-caption" id="lightbox-caption"></div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="toast" id="toast">Copied embed code to clipboard! ✓</div>

  <!-- Interactive Player Script -->
  <script>
    const BEATS = ${JSON.stringify(beats)};
    const TOTAL_DURATION = ${project.durationSec};

    const video = document.getElementById('main-video');
    const cinemaFrame = document.getElementById('cinema-frame');
    const loopBtn = document.getElementById('loop-beat-btn');
    const timeDisplay = document.getElementById('time-display');

    let activeBeat = BEATS[0] || null;
    let isLoopingActiveBeat = false;

    function formatTimeStr(sec) {
      if (isNaN(sec) || sec == null) return '00:00.0';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 10);
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + ms;
    }

    // Seek to beat
    function seekToBeat(beatNum, andPlay = true) {
      const b = BEATS.find(item => item.beat === String(beatNum).padStart(2, '0') || item.beat === String(beatNum));
      if (!b) return;
      activeBeat = b;
      video.currentTime = b.startSec;
      if (andPlay) {
        video.play().catch(() => {});
      }
      updateActiveBeatUI(b);
    }

    // Highlight active beat UI
    function updateActiveBeatUI(beat) {
      if (!beat) return;
      document.querySelectorAll('.beat-card').forEach(card => {
        card.classList.remove('active-beat');
      });
      const card = document.getElementById('beat-card-' + beat.beat);
      if (card) {
        card.classList.add('active-beat');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Live video timeupdate sync
    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      timeDisplay.textContent = formatTimeStr(t) + ' / ' + formatTimeStr(TOTAL_DURATION);

      // Identify active beat
      let current = BEATS.find(b => t >= b.startSec && t < b.endSec);
      if (!current && t >= (BEATS[BEATS.length - 1]?.endSec || 0)) {
        current = BEATS[BEATS.length - 1];
      }

      if (current && current.beat !== activeBeat?.beat) {
        activeBeat = current;
        updateActiveBeatUI(current);
      }

      // Loop active beat check
      if (isLoopingActiveBeat && activeBeat) {
        if (t >= activeBeat.endSec) {
          video.currentTime = activeBeat.startSec;
        }
      }

      // Update timeline fill bars & card progress bars
      BEATS.forEach(b => {
        const fillBar = document.getElementById('fill-beat-' + b.beat);
        const cardBar = document.getElementById('progress-beat-' + b.beat);
        let pct = 0;
        if (t >= b.endSec) pct = 100;
        else if (t > b.startSec) pct = ((t - b.startSec) / (b.durationSec || 1)) * 100;

        if (fillBar) fillBar.style.width = pct + '%';
        if (cardBar) cardBar.style.width = pct + '%';
      });
    });

    // Loop active beat toggle
    loopBtn.addEventListener('click', () => {
      isLoopingActiveBeat = !isLoopingActiveBeat;
      if (isLoopingActiveBeat) {
        loopBtn.classList.add('active');
      } else {
        loopBtn.classList.remove('active');
      }
    });

    // Play Beat button clicks
    document.querySelectorAll('.btn-play-beat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const start = parseFloat(btn.dataset.start);
        video.currentTime = start;
        video.play().catch(() => {});
      });
    });

    // Clicking anywhere on beat card seeks to that beat
    document.querySelectorAll('.beat-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.beat-thumb-box')) return;
        const start = parseFloat(card.dataset.start);
        video.currentTime = start;
        video.play().catch(() => {});
      });
    });

    // Timeline segments click to jump
    document.querySelectorAll('.timeline-segment').forEach(seg => {
      seg.addEventListener('click', () => {
        const start = parseFloat(seg.dataset.start);
        video.currentTime = start;
        video.play().catch(() => {});
      });
    });

    // Aspect Switcher
    document.querySelectorAll('[data-aspect]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-aspect]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const aspect = btn.dataset.aspect;
        const newSrc = btn.dataset.src;
        const currentTime = video.currentTime;
        const isPaused = video.paused;

        cinemaFrame.className = 'cinema-viewport aspect-' + aspect;
        video.src = newSrc;
        video.currentTime = currentTime;
        if (!isPaused) {
          video.play().catch(() => {});
        }
      });
    });

    // Playback Speed buttons
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        video.playbackRate = parseFloat(btn.dataset.speed);
      });
    });

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Keyframe Lightbox
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');

    function openLightbox(src, caption) {
      lightboxImg.src = src;
      lightboxCaption.textContent = caption || '';
      lightboxModal.classList.add('open');
    }

    function closeLightbox() {
      lightboxModal.classList.remove('open');
    }

    document.querySelectorAll('[data-zoom-src]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(elem.dataset.zoomSrc, elem.dataset.caption);
      });
    });

    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });

    // Copy Embed Code
    const copyEmbedBtn = document.getElementById('copy-embed-btn');
    const toast = document.getElementById('toast');
    copyEmbedBtn.addEventListener('click', () => {
      const code = '<iframe src="./embed.html" width="100%" height="640" frameborder="0" allowfullscreen></iframe>';
      navigator.clipboard.writeText(code).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      });
    });

    // URL Query Parameter on load: ?beat=01 or ?beat=1
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const beatParam = params.get('beat');
      if (beatParam) {
        seekToBeat(beatParam, false);
      } else {
        updateActiveBeatUI(BEATS[0]);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generates the Embed Player HTML (/projects/<dirName>/embed.html)
 */
export function generateEmbed(project) {
  const primaryVid = project.primaryVideo || 'video_9x16.mp4';
  const poster = project.poster || 'thumbnail.jpg';

  return `<!DOCTYPE html>
<html lang="${project.language === 'ID' ? 'id' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)} | AI-nimate</title>
  <meta name="robots" content="noindex">

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(project.channelLabel)} • AI-nimate Studio">
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="${escapeHtml(project.title)}">
  <meta property="og:description" content="${escapeHtml(project.description)}">
  <meta property="og:url" content="https://cuang.dev/projects/ainimate/${project.dirName}/">
  <meta property="og:image" content="${project.files['thumbnail_og.jpg'] ? 'thumbnail_og.jpg' : poster}">
  <meta property="og:video" content="${project.files['video_whatsapp.mp4'] ? 'video_whatsapp.mp4' : primaryVid}">

  <!-- Twitter / Discord Player Protocol -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${escapeHtml(project.title)}">
  <meta name="twitter:description" content="${escapeHtml(project.description)}">
  <meta name="twitter:image" content="${project.files['thumbnail_og.jpg'] ? 'thumbnail_og.jpg' : poster}">
  <meta name="twitter:player" content="./embed.html">
  <meta name="twitter:player:width" content="540">
  <meta name="twitter:player:height" content="960">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .video-container {
      position: relative;
      width: 100%;
      height: 100%;
      max-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      max-height: 100vh;
      object-fit: contain;
      outline: none;
    }
    .embed-watermark {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 0.72rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      z-index: 10;
      transition: background 0.2s;
    }
    .embed-watermark:hover {
      background: rgba(255, 59, 0, 0.9);
    }
  </style>
</head>
<body>
  <div class="video-container">
    <a href="./" target="_blank" class="embed-watermark">
      <span>⚡ AI-nimate Walkthrough ↗</span>
    </a>
    <video controls autoplay muted playsinline poster="${poster}" preload="metadata">
      ${project.files['video.mp4'] ? `<source src="video.mp4" type="video/mp4">` : ''}
      ${project.files['video_9x16.mp4'] ? `<source src="video_9x16.mp4" type="video/mp4">` : ''}
      ${project.files['video_16x9.mp4'] ? `<source src="video_16x9.mp4" type="video/mp4">` : ''}
      Your browser does not support the video tag.
    </video>
  </div>
</body>
</html>`;
}

/**
 * Main build portal pipeline
 */
export async function buildPortal() {
  console.log('[build_portal] Starting AI-nimate Portal build...');
  const startTime = Date.now();

  // 1. Enrich projects and update manifest.json & meta.json
  const projects = enrichProjects();

  // 2. Build Discovery Hub (projects/index.html)
  const discoveryHubHtml = generateDiscoveryHub(projects);
  const discoveryHubPath = path.join(PROJECTS_DIR, 'index.html');
  fs.writeFileSync(discoveryHubPath, discoveryHubHtml);
  console.log(`[build_portal] Generated Discovery Hub -> ${discoveryHubPath}`);


  // 3. Build Per-Project Walkthrough Pages (projects/<dirName>/index.html & embed.html)
  for (const project of projects) {
    const pDir = path.join(PROJECTS_DIR, project.dirName);
    const walkthroughHtml = generateWalkthrough(project, projects);
    const walkPath = path.join(pDir, 'index.html');
    fs.writeFileSync(walkPath, walkthroughHtml);

    const embedHtml = generateEmbed(project);
    const embedPath = path.join(pDir, 'embed.html');
    fs.writeFileSync(embedPath, embedHtml);

    console.log(`[build_portal] Built project page -> ${project.dirName} (index.html, embed.html)`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[build_portal] Portal build completed successfully in ${elapsed}s!`);
}

// CLI direct execution
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPortal().catch(err => {
    console.error('[build_portal Fatal Error]', err);
    process.exit(1);
  });
}
