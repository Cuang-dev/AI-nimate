/**
 * AI-nimate Broadcast Documentary Stage & Motion Engine
 * 
 * Generates deterministic, broadcast-grade HTML stage files for video rendering
 * and keyframe inspection, adhering to Kausal Media's aged papyrus aesthetic.
 * 
 * Features:
 * - Asset Deduplication Registry (eliminates multi-megabyte Base64 HTML bloat)
 * - 5-Layer Documentary Choreography:
 *     Layer 1: Multiplane Environment Canvas (Archival paper, watermark, vignette, SVG film grain, 2px progress bar)
 *     Layer 2: Multiplane Exhibit Viewport (.layout-hero, .layout-fullscreen, .layout-split with beat-driven continuous camera motion)
 *     Layer 3: Archival Stamp / Source Citation Pill (Crisp top-right classification badge with spring-in entrance)
 *     Layer 4: Procedural Financial Metric Callout / Odometer Card (Lower-left glassmorphic card with kinetic tabular-num count-up)
 *     Layer 5: Kinetic Subtitle Pill (Smooth rolling word window, active word highlight elevation, webfonts)
 * - Choreographed Scene Transitions (Directional blur/scale settle)
 * - Deterministic Clock API (window.seekToBeat, window.seekToTime, window.startStage)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const MIME_MAP = {
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

/**
 * Resolve an asset source path into a bulletproof Base64 Data URI
 * to eliminate broken image placeholders and Chromium 404s.
 */
function resolveAssetAsDataUri(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  const candidates = [
    path.isAbsolute(src) ? src : null,
    path.resolve(REPO_ROOT, src),
    path.resolve(REPO_ROOT, 'assets', src),
    path.resolve(REPO_ROOT, 'assets', 'props', 'items', path.basename(src)),
    path.resolve(process.cwd(), src),
    path.resolve(process.cwd(), 'assets', src)
  ].filter(Boolean);

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      const ext = path.extname(cand).toLowerCase();
      const mime = MIME_MAP[ext] || 'image/png';
      const b64 = fs.readFileSync(cand).toString('base64');
      return `data:${mime};base64,${b64}`;
    }
  }

  return src;
}

function generateStageHtml({
  storyboard = { scenes: [] },
  timings = { words: [], duration: 10 },
  format = '16:9',
  channelId = 'kausalmedia',
  testMode = false
}) {
  const isShort = format === '9:16';
  const width = isShort ? 1080 : 1920;
  const height = isShort ? 1920 : 1080;
  const channelTag = String(channelId || 'kausalmedia').toUpperCase().replace(/[^A-Z0-9_]/g, '');

  // Helper to extract clean subject prompt without system prompt boilerplate
  function extractCleanPrompt(rawText) {
    if (!rawText) return 'Visual exhibit representation';
    let text = String(rawText).trim();
    text = text.replace(/^(editorial comic art illustration of|editorial comic art spot illustration of|vector icon of)\s*/i, '');
    text = text.replace(/:\s*bold clean black ink contour.*$/i, '');
    text = text.replace(/:\s*bold 4px clean black ink.*$/i, '');
    text = text.replace(/,\s*(full 16:9 wide scene composition|isolated on a solid warm cream|clean illustration without baked arrows).*$/i, '');
    return text.trim() || rawText;
  }

  // Deduplication Registry: Map unique assets to asset IDs (assetId -> dataUri)
  const assetRegistry = {};
  const pathToAssetId = new Map();
  const dataUriToAssetId = new Map();
  let assetSeq = 0;

  function registerAsset(rawSrc) {
    if (!rawSrc) return null;
    if (pathToAssetId.has(rawSrc)) {
      return pathToAssetId.get(rawSrc);
    }
    const dataUri = resolveAssetAsDataUri(rawSrc);
    if (!dataUri) return null;

    if (dataUriToAssetId.has(dataUri)) {
      const existingId = dataUriToAssetId.get(dataUri);
      pathToAssetId.set(rawSrc, existingId);
      return existingId;
    }

    assetSeq++;
    const assetId = `asset_${String(assetSeq).padStart(3, '0')}`;
    assetRegistry[assetId] = dataUri;
    dataUriToAssetId.set(dataUri, assetId);
    pathToAssetId.set(rawSrc, assetId);
    return assetId;
  }

  // Process scenes: Preserve data & annotations, register deduplicated assets
  const processedScenes = (storyboard.scenes || []).map(sc => {
    const sceneCopy = Object.assign({}, sc);
    sceneCopy.isTestMode = Boolean(testMode || sc.isTestMode || sc.exhibit?.isPromptBox);
    sceneCopy.data = sc.data !== undefined ? sc.data : null;
    sceneCopy.annotation = sc.annotation !== undefined ? sc.annotation : null;

    if (sceneCopy.isTestMode) {
      const subjectDesc = sc.exhibit?.description || sc.exhibit?.nanoBananaPrompt || sc.subtitle || 'Scene visual asset prompt';
      sceneCopy.cleanPrompt = extractCleanPrompt(subjectDesc);
      sceneCopy.systemTag = `[SYSTEM_PROMPT_${channelTag}]`;
      if (sceneCopy.exhibit) {
        sceneCopy.exhibit = Object.assign({}, sceneCopy.exhibit, {
          description: sceneCopy.cleanPrompt,
          nanoBananaPrompt: sceneCopy.cleanPrompt
        });
      }
    } else if (sceneCopy.exhibit && sceneCopy.exhibit.src) {
      const assetId = registerAsset(sceneCopy.exhibit.src);
      const labeledAssetId = sceneCopy.exhibit.src_labeled ? registerAsset(sceneCopy.exhibit.src_labeled) : null;
      sceneCopy.exhibit = Object.assign({}, sceneCopy.exhibit, {
        src: assetId,
        assetId: assetId,
        src_labeled: labeledAssetId,
        labeledAssetId: labeledAssetId
      });
    }

    if (sceneCopy.secondaryExhibit && sceneCopy.secondaryExhibit.src) {
      const secAssetId = registerAsset(sceneCopy.secondaryExhibit.src);
      sceneCopy.secondaryExhibit = Object.assign({}, sceneCopy.secondaryExhibit, {
        src: secAssetId,
        assetId: secAssetId
      });
    }

    return sceneCopy;
  });

  const scenesJson = JSON.stringify(processedScenes);
  const timingsJson = JSON.stringify(timings.words || []);
  const assetRegistryJson = JSON.stringify(assetRegistry);
  const totalDuration = timings.duration || 10;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kausal Media Stage</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body, html {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background-color: #faf6ee;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1c1917;
      position: relative;
    }

    /* LAYER 1: Multiplane Environment Canvas */
    #canvas-environment {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      background: radial-gradient(circle at 50% 45%, rgba(255, 253, 245, 0.45) 0%, rgba(240, 230, 210, 0.72) 65%, rgba(215, 200, 175, 0.95) 100%);
    }

    #batik-watermark {
      position: absolute;
      inset: 0;
      opacity: 0.06;
      background-image: repeating-linear-gradient(45deg, #1c1917 0, #1c1917 2px, transparent 0, transparent 40px);
      z-index: 2;
      pointer-events: none;
    }

    #archival-border {
      position: absolute;
      top: 24px;
      left: 24px;
      right: 24px;
      bottom: 24px;
      border: 1px solid rgba(45, 35, 25, 0.35);
      z-index: 3;
      pointer-events: none;
    }
    #archival-border-inner {
      position: absolute;
      top: 32px;
      left: 32px;
      right: 32px;
      bottom: 32px;
      border: 1px solid rgba(180, 83, 9, 0.25);
      z-index: 3;
      pointer-events: none;
    }

    #film-grain {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 4;
      opacity: 0.045;
    }

    #doc-progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 2px;
      width: 0%;
      background: linear-gradient(90deg, #b45309 0%, #d97706 60%, #f59e0b 100%);
      box-shadow: 0 0 8px rgba(180, 83, 9, 0.5);
      z-index: 1000;
      pointer-events: none;
      transition: width 0.08s linear;
    }

    /* LAYER 2: Stage Exhibit Viewport */
    #stage-viewport {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .scene-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transform: scale(0.97) translateY(8px);
      filter: blur(4px);
      transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                  filter 0.16s ease-out,
                  visibility 0.18s;
      pointer-events: none;
    }
    .scene-container.active {
      opacity: 1;
      visibility: visible;
      transform: scale(1.0) translateY(0);
      filter: blur(0px);
      pointer-events: auto;
    }
    .scene-container.exiting {
      opacity: 0;
      transform: scale(1.02) translateY(-6px);
      filter: blur(3px);
      visibility: hidden;
      pointer-events: none;
    }

    /* VARIATION 1: Hero Centered Exhibit */
    .scene-container.layout-hero .exhibit-image {
      max-width: ${isShort ? '82%' : '58%'};
      max-height: ${isShort ? '56%' : '66%'};
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: contrast(1.05);
      will-change: transform;
    }

    /* VARIATION 2: Fullscreen Cinematic Exhibit */
    .scene-container.layout-fullscreen,
    .scene-container.layout-fullsize,
    .scene-container.layout-fullbleed {
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .scene-container.layout-fullscreen .exhibit-image,
    .scene-container.layout-fullsize .exhibit-image,
    .scene-container.layout-fullbleed .exhibit-image {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      filter: contrast(1.02) brightness(0.96);
      will-change: transform;
    }
    .scene-container.layout-fullscreen::after,
    .scene-container.layout-fullsize::after,
    .scene-container.layout-fullbleed::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(to top, rgba(20, 16, 12, 0.88) 0%, rgba(20, 16, 12, 0.45) 28%, transparent 55%);
      z-index: 5;
    }

    /* VARIATION 3: Split 2-Pane Exhibit */
    .scene-container.layout-split {
      display: flex;
      flex-direction: ${isShort ? 'column' : 'row'};
      align-items: center;
      justify-content: center;
      gap: ${isShort ? '32px' : '64px'};
      padding: ${isShort ? '80px 40px' : '60px 100px'};
    }
    .scene-container.layout-split .split-pane {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: ${isShort ? '90%' : '48%'};
      height: ${isShort ? '42%' : '75%'};
      will-change: transform;
    }
    .scene-container.layout-split .split-pane img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: contrast(1.05);
      will-change: transform;
    }

    /* Dual-Asset Progressive Label Reveal */
    .exhibit-labeled {
      position: absolute;
      opacity: 0;
      transition: opacity 0.4s ease-in-out;
      pointer-events: none;
      z-index: 6;
    }
    .scene-container.show-labels .exhibit-labeled {
      opacity: 1;
    }
    .scene-container.show-labels .exhibit-clean {
      opacity: 0;
    }

    /* Test Mode Visual Prompt Card Box */
    .test-prompt-card {
      background: rgba(255, 253, 248, 0.96);
      border: 2px dashed rgba(180, 83, 9, 0.45);
      border-radius: 14px;
      padding: ${isShort ? '28px 24px' : '36px 44px'};
      box-shadow: 0 14px 36px rgba(45, 35, 25, 0.12);
      text-align: left;
      position: relative;
      will-change: transform;
    }
    .test-prompt-card.card-hero {
      width: ${isShort ? '86%' : '66%'};
      max-width: 1100px;
    }
    .test-prompt-card.card-fullscreen {
      width: ${isShort ? '92%' : '86%'};
      max-width: 1450px;
      border: 2px solid rgba(180, 83, 9, 0.65);
      box-shadow: 0 16px 44px rgba(45, 35, 25, 0.18);
    }
    .test-prompt-body {
      font-size: ${isShort ? '22px' : '26px'};
      line-height: 1.6;
      color: #1c1917;
      font-weight: 500;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .test-prompt-tag {
      background: #b45309;
      color: #faf6ee;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: ${isShort ? '16px' : '20px'};
      font-weight: 800;
      letter-spacing: 0.8px;
      margin-right: 12px;
      display: inline-block;
      vertical-align: middle;
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
    }
    .test-prompt-text {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }

    /* LAYER 3: Archival Stamp / Source Citation Pill */
    .archival-stamp-badge {
      position: absolute;
      top: ${isShort ? '52px' : '46px'};
      right: ${isShort ? '36px' : '52px'};
      background: rgba(255, 253, 248, 0.94);
      border: 1.5px solid rgba(180, 83, 9, 0.6);
      border-radius: 8px;
      padding: ${isShort ? '8px 16px' : '7px 18px'};
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(45, 35, 25, 0.12);
      backdrop-filter: blur(8px);
      z-index: 35;
      pointer-events: none;
      transform: translateY(-8px) scale(0.92);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease;
    }
    .scene-container.active .archival-stamp-badge {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #b91c1c;
      box-shadow: 0 0 6px rgba(185, 28, 28, 0.6);
      flex-shrink: 0;
    }
    .badge-text {
      font-family: 'JetBrains Mono', 'SF Mono', Monaco, Menlo, Consolas, monospace;
      font-size: ${isShort ? '13px' : '14px'};
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #1c1917;
    }

    /* LAYER 4: Procedural Financial Metric Callout / Odometer Card */
    .financial-metric-card {
      position: absolute;
      left: ${isShort ? '48px' : '64px'};
      bottom: ${isShort ? '240px' : '72px'};
      background: rgba(255, 253, 248, 0.94);
      border: 1px solid rgba(180, 83, 9, 0.35);
      border-left: 4px solid #b45309;
      border-radius: 12px;
      padding: ${isShort ? '14px 20px' : '16px 24px'};
      box-shadow: 0 12px 32px rgba(45, 35, 25, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      z-index: 45;
      min-width: ${isShort ? '220px' : '260px'};
      max-width: ${isShort ? '320px' : '360px'};
      pointer-events: none;
      transform: translateY(10px) scale(0.96);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease;
    }
    .scene-container.active .financial-metric-card {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .metric-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .metric-pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #b45309;
      box-shadow: 0 0 6px rgba(180, 83, 9, 0.6);
      flex-shrink: 0;
    }
    .metric-label {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: ${isShort ? '11px' : '12px'};
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #78716c;
    }
    .metric-value {
      font-family: 'JetBrains Mono', 'SF Mono', Monaco, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      font-size: ${isShort ? '28px' : '34px'};
      font-weight: 800;
      color: #1c1917;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .metric-subnote {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 11px;
      color: #a8a29e;
      margin-top: 4px;
    }

    /* LAYER 5: Word-by-Word Kinetic Subtitle Pill */
    #subtitle-anchor {
      position: absolute;
      ${isShort ? 'top: 68%; transform: translateY(-50%);' : 'bottom: 64px;'}
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;
      pointer-events: none;
    }

    .subtitle-pill {
      background: rgba(255, 253, 248, 0.96);
      border: 1.5px solid rgba(180, 83, 9, 0.38);
      border-radius: 40px;
      padding: ${isShort ? '14px 32px' : '12px 36px'};
      box-shadow: 0 10px 30px rgba(45, 35, 25, 0.16), 0 2px 6px rgba(45, 35, 25, 0.08);
      backdrop-filter: blur(10px);
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: ${isShort ? '90%' : '75%'};
      min-height: ${isShort ? '68px' : '60px'};
      transition: all 0.2s ease;
    }

    .subtitle-word {
      display: inline-block;
      margin: 0 7px;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      font-size: ${isShort ? '34px' : '30px'};
      font-weight: 800;
      letter-spacing: -0.4px;
      transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1),
                  color 0.12s ease,
                  opacity 0.15s ease,
                  text-shadow 0.15s ease;
      white-space: nowrap;
    }
    .subtitle-word.spoken {
      color: #292524;
      opacity: 0.85;
      transform: translateY(0) scale(1);
    }
    .subtitle-word.active {
      color: #b45309;
      transform: translateY(-2px) scale(1.08);
      text-shadow: 0 2px 10px rgba(180, 83, 9, 0.35);
      font-weight: 900;
      opacity: 1;
    }
    .subtitle-word.upcoming {
      color: rgba(41, 37, 36, 0.35);
      opacity: 0.55;
      transform: translateY(0) scale(0.98);
    }
  </style>
</head>
<body>

  <!-- LAYER 1: Background, Framing, Film Grain & Progress Bar -->
  <div id="doc-progress-bar"></div>
  <div id="canvas-environment"></div>
  <div id="batik-watermark"></div>
  <div id="archival-border"></div>
  <div id="archival-border-inner"></div>
  <svg id="film-grain" xmlns="http://www.w3.org/2000/svg">
    <filter id="grain-filter">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#grain-filter)"/>
  </svg>

  <!-- LAYER 2: Exhibit Viewport -->
  <div id="stage-viewport"></div>

  <!-- LAYER 5: Word-by-Word Kinetic Subtitle Pill -->
  <div id="subtitle-anchor">
    <div class="subtitle-pill" id="subtitle-box">
      <span class="subtitle-word active">Kausal</span>
      <span class="subtitle-word spoken">Media</span>
    </div>
  </div>

  <script>
    window.ASSET_REGISTRY = ${assetRegistryJson};

    function getAssetUri(srcOrId) {
      if (!srcOrId) return '';
      if (window.ASSET_REGISTRY && window.ASSET_REGISTRY[srcOrId]) {
        return window.ASSET_REGISTRY[srcOrId];
      }
      return srcOrId;
    }

    const scenes = ${scenesJson};
    const timings = ${timingsJson};
    const totalDuration = ${totalDuration};
    const isShort = ${isShort};
    const windowSize = isShort ? 4 : 6;

    const viewport = document.getElementById('stage-viewport');
    const subtitleBox = document.getElementById('subtitle-box');

    function isFullscreenLayout(sc) {
      const l = (sc?.layout || sc?.exhibit?.layout || '').toLowerCase();
      return l === 'fullscreen' || l === 'fullsize' || l === 'full-bleed' || l === 'full_bleed';
    }

    function isSplitLayout(sc) {
      const l = (sc?.layout || sc?.exhibit?.layout || '').toLowerCase();
      return l === 'split' || l === 'split-screen' || l === 'side-by-side' || l === 'two-column';
    }

    // Layer 3: Extract Archival Stamp / Citation Badge
    function extractCitation(sc) {
      if (sc.annotation) {
        if (typeof sc.annotation === 'string') return sc.annotation;
        if (sc.annotation.text) return sc.annotation.text;
        if (sc.annotation.label) return sc.annotation.label;
        if (sc.annotation.source) return sc.annotation.source;
        if (sc.annotation.authority) return sc.annotation.authority;
      }

      const raw = ((sc.subtitle || '') + ' ' + (sc.exhibit?.description || '') + ' ' + (sc.exhibit?.concept || '')).trim();
      if (!raw) return null;

      const matchPojk = raw.match(/\\b(POJK\\s*(?:NO\\.?|NOMOR)?\\s*[\\d\\w\\/\\.\\-]+)\\b/i);
      if (matchPojk) return 'DOKUMEN: ' + matchPojk[1].toUpperCase();

      const matchUu = raw.match(/\\b(UU\\s*(?:NO\\.?|NOMOR)?\\s*[\\d\\w\\/\\.\\-]+)\\b/i);
      if (matchUu) return 'REGULASI: ' + matchUu[1].toUpperCase();

      const matchBei = raw.match(/\\b(B-E-I|BEI|BURSA EFEK INDONESIA|IDX)\\b/i);
      if (matchBei) return 'KLASIFIKASI: BURSA EFEK INDONESIA';

      const matchOjk = raw.match(/\\b(OJK|OTORITAS JASA KEUANGAN)\\b/i);
      if (matchOjk) return 'PENGAWASAN: OTORITAS JASA KEUANGAN';

      const matchBi = raw.match(/\\b(BANK INDONESIA|BI)\\b/i);
      if (matchBi) return 'KLASIFIKASI: BANK INDONESIA';

      const matchKpk = raw.match(/\\b(KPK|KOMISI PEMBERANTASAN KORUPSI)\\b/i);
      if (matchKpk) return 'BUKTI ARSIP: BERKAS KPK';

      const matchKemenkeu = raw.match(/\\b(KEMENKEU|KEMENTERIAN KEUANGAN)\\b/i);
      if (matchKemenkeu) return 'ARSIP NEGARA: KEMENKEU RI';

      const matchMedia = raw.match(/\\b(BLOOMBERG|REUTERS|KONTAN|BISNIS INDONESIA)\\b/i);
      if (matchMedia) return 'SUMBER: ' + matchMedia[1].toUpperCase();

      return null;
    }

    // Layer 4: Extract Procedural Financial Metric Callout
    function extractFinancialMetric(sc) {
      if (sc.data) {
        if (typeof sc.data === 'string') {
          return { value: sc.data, label: 'METRIK UTAMA', note: '' };
        }
        if (typeof sc.data === 'object' && sc.data !== null) {
          return {
            value: sc.data.value || sc.data.metric || sc.data.amount || sc.data.stat || '0',
            label: sc.data.label || sc.data.title || 'ANALISIS DATA',
            note: sc.data.note || sc.data.source || sc.data.change || ''
          };
        }
      }

      const raw = ((sc.subtitle || '') + ' ' + (sc.exhibit?.description || '')).trim();
      if (!raw) return null;

      const matchRupiah = raw.match(/\\b(Rp\\s*[-+]?[\\d\\.,]+(?:\\s*(?:Triliun|Miliar|Juta|Ribu|T|M|B))?)\\b/i);
      if (matchRupiah) {
        let label = 'VALUASI / NILAI';
        if (/kontrak/i.test(raw)) label = 'NILAI KONTRAK';
        else if (/rugi|loss|menguap|ambles|anjlok|boncos/i.test(raw)) label = 'KERUGIAN INVESTOR';
        else if (/transaksi|volume/i.test(raw)) label = 'NILAI TRANSAKSI';
        else if (/utang|liabilitas|debt/i.test(raw)) label = 'BEBAN UTANG';
        else if (/laba|keuntungan|profit/i.test(raw)) label = 'LABA BERSIH';
        else if (/modal|kapitalisasi|market cap/i.test(raw)) label = 'KAPITALISASI PASAR';
        return { value: matchRupiah[1].trim(), label: label, note: 'Bursa Efek Indonesia' };
      }

      const matchPct = raw.match(/([-+]?\\d+(?:[\\.,]\\d+)?\\s*%)/);
      if (matchPct) {
        let label = 'FLUKTUASI HARGA';
        if (/margin/i.test(raw)) label = 'MARGIN OPERASIONAL';
        else if (/rugi|turun|jatuh|crash|menguap|ambles|anjlok/i.test(raw)) label = 'PENURUNAN NILAI';
        else if (/naik|lonjakan|growth|melejit/i.test(raw)) label = 'PERTUMBUHAN';
        return { value: matchPct[1].trim(), label: label, note: 'Perubahan Relatif' };
      }

      const matchMult = raw.match(/\\b(\\d+(?:[\\.,]\\d+)?\\s*x)\\b/i);
      if (matchMult) {
        return { value: matchMult[1].trim(), label: 'FAKTOR PENGALI', note: 'Rasio Valuasi' };
      }

      const matchUsd = raw.match(/(\\$\\s*[-+]?[\\d\\.,]+(?:\\s*(?:Trillion|Billion|Million|T|B|M))?)/i);
      if (matchUsd) {
        return { value: matchUsd[1].trim(), label: 'VALUASI GLOBAL', note: 'Estimasi Pasar' };
      }

      return null;
    }

    function parseNumericParts(str) {
      if (!str) return null;
      const m = String(str).match(/^([^\\d\\-+]*)([-+]?\\d+(?:[\\.,]\\d+)?)(.*)$/);
      if (!m) return null;
      const prefix = m[1];
      const rawNumStr = m[2];
      const suffix = m[3];
      const numForParse = rawNumStr.replace(',', '.');
      const targetNum = parseFloat(numForParse);
      if (isNaN(targetNum)) return null;

      const hasCommaDecimal = rawNumStr.includes(',') && !rawNumStr.includes('.');
      const hasDotDecimal = rawNumStr.includes('.');
      const decimalPlaces = (hasCommaDecimal ? rawNumStr.split(',')[1] : (hasDotDecimal ? rawNumStr.split('.')[1] : '')).length;

      return {
        prefix: prefix,
        targetNum: targetNum,
        suffix: suffix,
        decimalPlaces: decimalPlaces,
        useComma: hasCommaDecimal,
        original: str
      };
    }

    function updateOdometerCard(container, sc, progressPct) {
      const cardValEl = container.querySelector('.metric-value');
      if (!cardValEl) return;
      const originalStr = cardValEl.getAttribute('data-target');
      if (!originalStr) return;

      const parts = parseNumericParts(originalStr);
      if (!parts) {
        cardValEl.textContent = originalStr;
        return;
      }

      const animProgress = Math.min(1, progressPct / 0.35);
      if (animProgress >= 1) {
        cardValEl.textContent = parts.original;
        return;
      }

      const ease = 1 - Math.pow(1 - animProgress, 3);
      const currentNum = (parts.targetNum * ease).toFixed(parts.decimalPlaces);
      const displayNum = parts.useComma ? currentNum.replace('.', ',') : currentNum;
      cardValEl.textContent = parts.prefix + displayNum + parts.suffix;
    }

    function getCameraMotionType(sc, idx) {
      if (sc.cameraMotion) return sc.cameraMotion;
      if (sc.motion) return sc.motion;
      if (sc.camera) return sc.camera;
      const motions = ['push-in', 'pan-right', 'tilt-drift', 'pull-back', 'pan-left'];
      return motions[idx % motions.length];
    }

    function applyCameraMotion(container, sc, idx, progressPct) {
      const motionTargets = container.querySelectorAll('.exhibit-image, .test-prompt-card, .split-pane');
      if (!motionTargets || motionTargets.length === 0) return;

      const motionType = getCameraMotionType(sc, idx);
      const e = 1 - Math.pow(1 - progressPct, 2.2);

      let transformStr = '';
      switch (motionType) {
        case 'push-in':
          transformStr = 'scale(' + (1.0 + 0.06 * e) + ') translateY(' + (-8 * e) + 'px)';
          break;
        case 'pull-back':
          transformStr = 'scale(' + (1.06 - 0.06 * e) + ') translateY(' + (-8 * (1 - e)) + 'px)';
          break;
        case 'pan-right':
          transformStr = 'scale(1.03) translateX(' + (-16 + 32 * e) + 'px)';
          break;
        case 'pan-left':
          transformStr = 'scale(1.03) translateX(' + (16 - 32 * e) + 'px)';
          break;
        case 'tilt-drift':
        default:
          transformStr = 'scale(' + (1.01 + 0.04 * e) + ') translate(' + (-6 + 12 * e) + 'px, ' + (-10 * e) + 'px)';
          break;
      }
      motionTargets.forEach(target => {
        target.style.transform = transformStr;
      });
    }

    function createTestPromptCard(sc, isFull) {
      const card = document.createElement('div');
      card.className = 'test-prompt-card ' + (isFull ? 'card-fullscreen' : 'card-hero');

      const body = document.createElement('div');
      body.className = 'test-prompt-body';

      const tag = document.createElement('span');
      tag.className = 'test-prompt-tag';
      tag.textContent = sc.systemTag || (isFull ? '[FULLSCREEN_SCENE: SYSTEM_PROMPT_KAUSALMEDIA]' : '[HERO_PROP: SYSTEM_PROMPT_KAUSALMEDIA]');

      const textSpan = document.createElement('span');
      textSpan.className = 'test-prompt-text';
      textSpan.textContent = ' ' + (sc.cleanPrompt || sc.exhibit?.artistPrompt || sc.exhibit?.description || sc.subtitle || 'Scene visual asset prompt');

      body.appendChild(tag);
      body.appendChild(textSpan);
      card.appendChild(body);
      return card;
    }

    // Build scene DOM elements across all 5 layers
    scenes.forEach((sc, idx) => {
      const isTestMode = Boolean(sc.isTestMode || sc.exhibit?.isPromptBox);
      const isFull = isFullscreenLayout(sc);
      const isSplit = isSplitLayout(sc);
      let layoutCls = 'layout-hero';
      if (isFull) layoutCls = 'layout-fullscreen';
      else if (isSplit) layoutCls = 'layout-split';

      const container = document.createElement('div');
      container.className = 'scene-container ' + layoutCls + (idx === 0 ? ' active' : '');
      container.id = 'scene-' + (sc.id || idx);

      // Layer 3: Archival Stamp / Source Citation Pill (top-right)
      const citation = extractCitation(sc);
      if (citation) {
        const badge = document.createElement('div');
        badge.className = 'archival-stamp-badge';
        badge.id = 'badge-' + (sc.id || idx);

        const dot = document.createElement('span');
        dot.className = 'badge-dot';

        const txt = document.createElement('span');
        txt.className = 'badge-text';
        txt.textContent = citation;

        badge.appendChild(dot);
        badge.appendChild(txt);
        container.appendChild(badge);
      }

      // Layer 4: Procedural Financial Metric Callout / Odometer Card (lower-left)
      const finMetric = extractFinancialMetric(sc);
      if (finMetric) {
        const card = document.createElement('div');
        card.className = 'financial-metric-card';
        card.id = 'metric-card-' + (sc.id || idx);

        const header = document.createElement('div');
        header.className = 'metric-card-header';

        const pDot = document.createElement('span');
        pDot.className = 'metric-pill-dot';

        const pLabel = document.createElement('span');
        pLabel.className = 'metric-label';
        pLabel.textContent = finMetric.label;

        header.appendChild(pDot);
        header.appendChild(pLabel);
        card.appendChild(header);

        const valEl = document.createElement('div');
        valEl.className = 'metric-value';
        valEl.setAttribute('data-target', finMetric.value);
        valEl.textContent = finMetric.value;
        card.appendChild(valEl);

        if (finMetric.note) {
          const noteEl = document.createElement('div');
          noteEl.className = 'metric-subnote';
          noteEl.textContent = finMetric.note;
          card.appendChild(noteEl);
        }

        container.appendChild(card);
      }

      // Layer 2: Multiplane Exhibit Layout
      if (isSplit) {
        const leftPane = document.createElement('div');
        leftPane.className = 'split-pane split-left';
        const rightPane = document.createElement('div');
        rightPane.className = 'split-pane split-right';

        if (isTestMode) {
          const promptCard = createTestPromptCard(sc, isFull);
          leftPane.appendChild(promptCard);
        } else if (sc.exhibit && sc.exhibit.src) {
          const img = document.createElement('img');
          img.className = 'exhibit-image exhibit-clean';
          img.src = getAssetUri(sc.exhibit.src);
          img.alt = sc.exhibit.description || 'Exhibit';
          leftPane.appendChild(img);
        }

        if (sc.secondaryExhibit && sc.secondaryExhibit.src) {
          const img2 = document.createElement('img');
          img2.className = 'exhibit-image';
          img2.src = getAssetUri(sc.secondaryExhibit.src);
          rightPane.appendChild(img2);
        } else if (isTestMode) {
          const noteCard = document.createElement('div');
          noteCard.className = 'test-prompt-card card-hero';
          noteCard.innerHTML = '<div class="test-prompt-body"><span class="test-prompt-tag">[SPLIT_DATA_PANE]</span><span class="test-prompt-text">' + (sc.subtitle || 'Comparison Evidence') + '</span></div>';
          rightPane.appendChild(noteCard);
        }

        container.appendChild(leftPane);
        container.appendChild(rightPane);
      } else if (isTestMode) {
        const card = createTestPromptCard(sc, isFull);
        container.appendChild(card);
      } else if (sc.exhibit && sc.exhibit.src) {
        const img = document.createElement('img');
        img.className = 'exhibit-image exhibit-clean';
        img.src = getAssetUri(sc.exhibit.src);
        img.alt = sc.exhibit.description || 'Exhibit';
        container.appendChild(img);

        if (sc.exhibit.src_labeled) {
          const imgLabeled = document.createElement('img');
          imgLabeled.className = 'exhibit-image exhibit-labeled';
          imgLabeled.src = getAssetUri(sc.exhibit.src_labeled);
          imgLabeled.alt = (sc.exhibit.description || 'Exhibit') + ' (Labeled)';
          container.appendChild(imgLabeled);
        }
      }

      viewport.appendChild(container);
    });

    let startTime = null;
    let autoPlaying = true;
    let currentBeatIndex = -1;

    function cleanWord(str) {
      if (!str) return '';
      return str
        .replace(/\\[([^\\|\\]]+)\\|[^\\]]+\\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
    }

    function renderSubtitlesAtTime(seconds) {
      if (!timings || timings.length === 0) {
        if (scenes[currentBeatIndex] && scenes[currentBeatIndex].subtitle) {
          const sc = scenes[currentBeatIndex];
          const scStart = sc ? (sc.startTime || 0) : 0;
          const scDur = sc ? Math.max(0.5, (sc.endTime || (scStart + 5)) - scStart) : 5;
          const progress = Math.min(1, Math.max(0, (seconds - scStart) / scDur));
          renderSceneSubtitlesFallback(sc.subtitle, progress);
        }
        return;
      }

      let activeIdx = -1;
      for (let i = 0; i < timings.length; i++) {
        if (seconds >= timings[i].start && seconds < timings[i].end) {
          activeIdx = i;
          break;
        }
        if (timings[i].start > seconds) {
          activeIdx = Math.max(0, i - 1);
          break;
        }
      }
      if (activeIdx === -1) {
        activeIdx = seconds >= timings[timings.length - 1].start ? timings.length - 1 : 0;
      }

      let startIdx = Math.max(0, activeIdx - 1);
      if (startIdx + windowSize > timings.length) {
        startIdx = Math.max(0, timings.length - windowSize);
      }
      const endIdx = Math.min(timings.length, startIdx + windowSize);
      const windowWords = timings.slice(startIdx, endIdx);

      subtitleBox.innerHTML = windowWords.map((t, i) => {
        const globalIdx = startIdx + i;
        const wordText = cleanWord(t.word);
        if (globalIdx === activeIdx) {
          return '<span class="subtitle-word active">' + wordText + '</span>';
        } else if (globalIdx < activeIdx) {
          return '<span class="subtitle-word spoken">' + wordText + '</span>';
        } else {
          return '<span class="subtitle-word upcoming">' + wordText + '</span>';
        }
      }).join(' ');
    }

    function renderSceneSubtitlesFallback(rawText, progressPct) {
      if (!rawText) { subtitleBox.innerHTML = ''; return; }
      const clean = cleanWord(rawText);
      const words = clean.split(/\\s+/).filter(Boolean);
      if (words.length === 0) { subtitleBox.innerHTML = ''; return; }

      const currentWordIdx = Math.min(words.length - 1, Math.max(0, Math.floor(progressPct * words.length)));
      let startIdx = Math.max(0, currentWordIdx - 1);
      if (startIdx + windowSize > words.length) {
        startIdx = Math.max(0, words.length - windowSize);
      }
      const endIdx = Math.min(words.length, startIdx + windowSize);
      const windowWords = words.slice(startIdx, endIdx);

      subtitleBox.innerHTML = windowWords.map((w, i) => {
        const globalIdx = startIdx + i;
        if (globalIdx === currentWordIdx) {
          return '<span class="subtitle-word active">' + w + '</span>';
        } else if (globalIdx < currentWordIdx) {
          return '<span class="subtitle-word spoken">' + w + '</span>';
        } else {
          return '<span class="subtitle-word upcoming">' + w + '</span>';
        }
      }).join(' ');
    }

    function updateProgressBar(seconds) {
      const bar = document.getElementById('doc-progress-bar');
      if (!bar) return;
      const pct = Math.min(100, Math.max(0, (seconds / Math.max(0.1, totalDuration)) * 100));
      bar.style.width = pct + '%';
    }

    function updateSceneState(activeIdx, seconds) {
      if (activeIdx < 0 || activeIdx >= scenes.length) return;
      const sc = scenes[activeIdx];
      const scStart = sc ? (sc.startTime || 0) : 0;
      const scEnd = sc ? (sc.endTime || (scStart + 5)) : (scStart + 5);
      const beatDuration = Math.max(0.5, scEnd - scStart);
      const beatElapsed = Math.max(0, seconds - scStart);
      const progressPct = Math.min(1, Math.max(0, beatElapsed / beatDuration));
      const shouldShowLabels = beatElapsed >= (sc.labelDelay !== undefined ? sc.labelDelay : 2.0);

      const all = document.querySelectorAll('.scene-container');
      all.forEach((el, i) => {
        const scItem = scenes[i];
        const isFull = isFullscreenLayout(scItem);
        const isSplit = isSplitLayout(scItem);
        let layoutCls = 'layout-hero';
        if (isFull) layoutCls = 'layout-fullscreen';
        else if (isSplit) layoutCls = 'layout-split';

        const baseClass = 'scene-container ' + layoutCls;
        const isActive = (i === activeIdx);
        const isPrevious = (i === activeIdx - 1);

        let cls = baseClass;
        if (isActive) {
          cls += ' active';
          if (shouldShowLabels) cls += ' show-labels';
        } else if (isPrevious) {
          cls += ' exiting';
        }
        el.className = cls;

        if (isActive) {
          applyCameraMotion(el, sc, i, progressPct);
          updateOdometerCard(el, sc, progressPct);
        }
      });
    }

    function stepToTime(seconds) {
      const activeIdx = scenes.findIndex((sc, i) => {
        const nextStart = scenes[i + 1] ? scenes[i + 1].startTime : 99999;
        return seconds >= (sc.startTime || 0) && seconds < nextStart;
      });
      if (activeIdx >= 0) {
        currentBeatIndex = activeIdx;
        updateSceneState(activeIdx, seconds);
      }
      renderSubtitlesAtTime(seconds);
      updateProgressBar(seconds);
    }

    // Deterministic API: Seek to specific beat index or ID with progressPct
    window.seekToBeat = function(target, progressPct = 0) {
      autoPlaying = false;
      let idx = typeof target === 'number' ? target : scenes.findIndex(s => s.id === target);
      if (idx < 0) idx = 0;

      currentBeatIndex = idx;
      const sc = scenes[idx];
      const scStart = sc ? (sc.startTime || 0) : 0;
      const scDur = sc ? Math.max(0.5, (sc.endTime || (scStart + 5)) - scStart) : 5;
      const targetTime = scStart + (progressPct * scDur);
      updateSceneState(idx, targetTime);
      renderSubtitlesAtTime(targetTime);
      updateProgressBar(targetTime);
    };

    // Deterministic API: Seek to exact second timestamp
    window.seekToTime = function(seconds) {
      autoPlaying = false;
      stepToTime(seconds);
    };

    // Deterministic API: Start live playback from t=0
    window.startStage = function() {
      startTime = performance.now();
      autoPlaying = true;
      currentBeatIndex = -1;
      stepToTime(0);
    };

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      if (autoPlaying) {
        const elapsedSec = (timestamp - startTime) / 1000;
        stepToTime(elapsedSec);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

module.exports = {
  generateStageHtml,
  resolveAssetAsDataUri,
  resolveAssetUri: resolveAssetAsDataUri
};
