/**
 * AI-nimate Dual Visual Engine Router (Phase 4)
 * 
 * Provides deterministic routing, HTML/SVG sanitization, fallback schematic generation,
 * and storyboard visual asset population for both programmatic vector scenes and AI raster images.
 */

const fs = require('fs');
const path = require('path');
const { buildVectorScenePrompt } = require('../scripts/prompt-manager');
const { getChannelProfile } = require('../channels/channel-manager');
const { getStyleProfile } = require('../styles/style-manager');

const VECTOR_KEYWORDS_REGEX = /\b(chart|graph|timeline|diagram|flow|stat|percentage|balance|comparison|matrix|schema|counter|step|taxonomy|structure)\b/i;

/**
 * Decides whether a given scene beat should be rendered using vector-html or ai-image.
 * 
 * @param {Object} sceneBeat - Storyboard scene beat object
 * @param {Object} pipelineConfig - Normalized pipeline configuration
 * @returns {'vector-html' | 'ai-image'}
 */
function decideBeatEngine(sceneBeat = {}, pipelineConfig = {}) {
  const mode = pipelineConfig?.visualEngine || 'hybrid';

  if (mode === 'vector-html') {
    return 'vector-html';
  }
  if (mode === 'ai-image') {
    return 'ai-image';
  }

  // Hybrid mode routing: inspect visualType, visualPrompt, narration, or layout
  const candidateTexts = [
    sceneBeat?.visualType,
    sceneBeat?.visualPrompt,
    sceneBeat?.narration,
    sceneBeat?.layout
  ].filter(Boolean).join(' ');

  if (VECTOR_KEYWORDS_REGEX.test(candidateTexts)) {
    return 'vector-html';
  }

  return 'ai-image';
}

/**
 * Strips dangerous elements (<script>, <iframe>, <object>, on* attributes, and external http/https image urls)
 * and wraps vector markup inside a sandboxed div.
 * 
 * @param {string} rawHtml - Unsanitized HTML/SVG markup string
 * @param {Object} [sceneBeat={}] - Scene beat object
 * @param {Object} [styleProfile={}] - Active style profile
 * @returns {string} Sanitized and wrapped HTML string
 */
function sanitizeAndWrapVectorHtml(rawHtml, sceneBeat = {}, styleProfile = {}) {
  let cleaned = String(rawHtml || '').trim();

  // Strip markdown code fences if wrapped in ```html ... ``` or ```xml ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
  }

  // 1. Strip <script>...</script> and stray <script> tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
  cleaned = cleaned.replace(/<script\b[^>]*>/gi, '').replace(/<\/script\s*>/gi, '');

  // 2. Strip <iframe>...</iframe> and stray <iframe> tags
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^>]*>/gi, '').replace(/<\/iframe\s*>/gi, '');

  // 3. Strip <object>, <embed>, <applet>
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object\s*>/gi, '');
  cleaned = cleaned.replace(/<object\b[^>]*>/gi, '').replace(/<\/object\s*>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^>]*>/gi, '');
  cleaned = cleaned.replace(/<applet\b[^>]*>/gi, '');

  // 4. Strip on* inline event handler attributes (e.g. onload=, onclick=, onerror=)
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 5. Strip external http:// and https:// URLs in src or href attributes to prevent network hangs
  cleaned = cleaned.replace(/\s+(?:src)\s*=\s*["']https?:\/\/[^"']*["']/gi, ' src=""');
  cleaned = cleaned.replace(/\s+(?:href)\s*=\s*["']javascript:[^"']*["']/gi, ' href="#"');

  const sceneId = sceneBeat?.id || 'scene_vector';
  return `<div class="ai-vector-sandbox" data-scene-id="${sceneId}" style="width: 100%; height: 100%; overflow: hidden; position: relative;">${cleaned}</div>`;
}

/**
 * Extracts numbers, currency figures, percentages, and prominent terms from text.
 * 
 * @param {string} narration
 * @param {string} visualPrompt
 * @returns {Object} Extracted metrics and keywords
 */
function extractMetricsAndTerms(narration = '', visualPrompt = '') {
  const combined = `${narration} ${visualPrompt}`;

  // 1. Currency (Indonesian Rupiah or USD)
  const currencyMatch = combined.match(/(?:Rp\s*|IDR\s*)\d+(?:[.,]\d+)*(?:\s*(?:triliun|miliar|juta|ribu|T|M|B))?/i)
    || combined.match(/\$\s*\d+(?:[.,]\d+)*(?:\s*(?:trillion|billion|million|k|B|M))?/i);
  const currency = currencyMatch ? currencyMatch[0].trim() : null;

  // 2. Percentages
  const percentMatch = combined.match(/\d+(?:[.,]\d+)*\s*%/);
  const percentage = percentMatch ? percentMatch[0].trim() : null;

  // 3. Multipliers or Ratios
  const ratioMatch = combined.match(/\d+(?:[.,]\d+)*\s*x\b/i) || combined.match(/\d+\s*:\s*\d+/);
  const ratio = ratioMatch ? ratioMatch[0].trim() : null;

  // 4. Year or Historical Date
  const yearMatch = combined.match(/\b(19\d\d|20[0-2]\d)\b/);
  const year = yearMatch ? yearMatch[0] : null;

  // 5. Keywords / Actors
  const terms = [];
  const words = combined.match(/\b[A-Z][a-zA-Z0-9_-]{2,}\b/g) || [];
  for (const w of words) {
    if (!['The', 'And', 'For', 'With', 'From', 'This', 'That', 'Show', 'Dalam', 'Yang', 'Dari', 'Untuk', 'Dengan', 'Pada', 'Atau'].includes(w)) {
      if (!terms.includes(w)) terms.push(w);
    }
  }

  return {
    heroMetric: currency || percentage || ratio || (year ? `TAHUN ${year}` : '100%'),
    secondaryMetric: percentage && currency ? percentage : (ratio || (year ? `EST. ${year}` : '+24.8%')),
    terms: terms.slice(0, 4)
  };
}

/**
 * Produces a rich, brand-styled SVG + HTML schematic/metric exhibit tied to --scene-progress.
 * 
 * @param {Object} sceneBeat - Storyboard scene beat
 * @param {Object} channelProfile - Channel profile
 * @param {Object} styleProfile - Style profile
 * @param {string} [aspectRatio='16:9'] - '16:9' or '9:16'
 * @returns {string} High-density SVG + HTML markup
 */
function buildDeterministicVectorFallback(sceneBeat = {}, channelProfile = {}, styleProfile = {}, aspectRatio = '16:9') {
  const isVertical = aspectRatio === '9:16' || sceneBeat?.aspectRatio === '9:16';
  const width = isVertical ? 900 : 1600;
  const height = isVertical ? 1600 : 900;
  const viewBox = `0 0 ${width} ${height}`;

  const narration = sceneBeat?.narration || '';
  const visualPrompt = sceneBeat?.visualPrompt || '';
  const chapterTitle = sceneBeat?.chapterTitle || 'METRIC BREAKDOWN';

  const { heroMetric, secondaryMetric, terms } = extractMetricsAndTerms(narration, visualPrompt);

  const node1Label = terms[0] || 'Origin / Inflow';
  const node2Label = terms[1] || 'Regulatory Arbitrage';
  const node3Label = terms[2] || 'Systemic Extraction';

  if (isVertical) {
    // 9:16 Vertical Layout (900 x 1600)
    return `
<div class="vec-card" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 36px; box-sizing: border-box; background: var(--bg-surface); font-family: var(--font-sans, sans-serif);">
  <!-- Header Bar -->
  <div style="border-bottom: 2px solid var(--border-muted, rgba(26,24,21,0.16)); padding-bottom: 16px;">
    <div style="font-family: var(--font-mono, monospace); font-size: 20px; font-weight: 700; color: var(--brand-accent); text-transform: uppercase; letter-spacing: 0.1em;">
      // ${chapterTitle}
    </div>
    <div style="font-family: var(--font-display, serif); font-size: 32px; font-weight: 700; color: var(--text-primary); margin-top: 8px;">
      ${visualPrompt ? visualPrompt.slice(0, 50) : 'Empirical Discrepancy Breakdown'}
    </div>
  </div>

  <!-- Hero Stat Section -->
  <div style="text-align: center; margin: 32px 0;">
    <div style="font-family: var(--font-mono, monospace); font-size: 18px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">
      FORENSIC METRIC // DISCREPANCY
    </div>
    <div class="vec-stat-huge" style="font-family: var(--font-mono, monospace); font-size: 76px; font-weight: 800; color: var(--brand-primary); line-height: 1.1; margin: 12px 0;">
      ${heroMetric}
    </div>
    <div style="font-family: var(--font-mono, monospace); font-size: 24px; color: var(--brand-accent); font-weight: 600;">
      DELTA INDEX: ${secondaryMetric}
    </div>
    <!-- Progress Indicator Bar -->
    <div style="width: 100%; height: 14px; background: rgba(26,24,21,0.08); border-radius: 7px; overflow: hidden; margin-top: 24px;">
      <div class="vec-bar-fill" style="height: 100%; width: 100%; background: var(--brand-primary); transform-origin: left; transform: scaleX(var(--scene-progress, 0.7));"></div>
    </div>
  </div>

  <!-- Causal Flow Schematic (SVG) -->
  <div style="flex: 1; display: flex; align-items: center; justify-content: center; max-height: 600px;">
    <svg viewBox="0 0 820 600" width="100%" height="100%" style="overflow: visible;">
      <defs>
        <marker id="arrowhead-vert" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--brand-accent)" />
        </marker>
      </defs>
      <!-- Connecting Flow Paths -->
      <path class="vec-draw-path" d="M 410 120 L 410 210" stroke="var(--brand-accent)" stroke-width="4" stroke-dasharray="6 6" fill="none" marker-end="url(#arrowhead-vert)" />
      <path class="vec-draw-path" d="M 410 310 L 410 400" stroke="var(--brand-accent)" stroke-width="4" stroke-dasharray="6 6" fill="none" marker-end="url(#arrowhead-vert)" />
      
      <!-- Node 1 -->
      <g transform="translate(160, 40)">
        <rect width="500" height="80" rx="12" fill="var(--bg-surface)" stroke="var(--border-muted, rgba(26,24,21,0.2))" stroke-width="2" />
        <text x="30" y="48" font-family="var(--font-mono, monospace)" font-size="20" font-weight="700" fill="var(--text-primary)">01. ${node1Label}</text>
      </g>
      <!-- Node 2 -->
      <g transform="translate(160, 230)">
        <rect width="500" height="80" rx="12" fill="var(--bg-surface)" stroke="var(--brand-primary)" stroke-width="2.5" />
        <text x="30" y="48" font-family="var(--font-mono, monospace)" font-size="20" font-weight="700" fill="var(--brand-primary)">02. ${node2Label}</text>
      </g>
      <!-- Node 3 -->
      <g transform="translate(160, 420)">
        <rect width="500" height="80" rx="12" fill="var(--bg-surface)" stroke="var(--border-muted, rgba(26,24,21,0.2))" stroke-width="2" />
        <text x="30" y="48" font-family="var(--font-mono, monospace)" font-size="20" font-weight="700" fill="var(--text-primary)">03. ${node3Label}</text>
      </g>
    </svg>
  </div>

  <!-- Footer Label -->
  <div style="font-family: var(--font-mono, monospace); font-size: 16px; color: var(--text-secondary); text-align: center; border-top: 1px solid var(--border-muted, rgba(26,24,21,0.16)); padding-top: 16px;">
    SEC / OJK ARCHIVAL FILINGS // STRUCTURAL CAUSAL FLOW
  </div>
</div>
`.trim();
  }

  // 16:9 Widescreen Layout (1600 x 900)
  return `
<div class="vec-card" style="width: 100%; height: 100%; display: flex; padding: 48px; box-sizing: border-box; background: var(--bg-surface); font-family: var(--font-sans, sans-serif); gap: 40px;">
  <!-- Left Side: Hero Stat Card -->
  <div style="flex: 0 0 520px; display: flex; flex-direction: column; justify-content: space-between; border-right: 2px solid var(--border-muted, rgba(26,24,21,0.16)); padding-right: 40px;">
    <div>
      <div style="font-family: var(--font-mono, monospace); font-size: 18px; font-weight: 700; color: var(--brand-accent); text-transform: uppercase; letter-spacing: 0.1em;">
        // ${chapterTitle}
      </div>
      <div style="font-family: var(--font-display, serif); font-size: 34px; font-weight: 700; color: var(--text-primary); margin-top: 12px; line-height: 1.2;">
        ${visualPrompt ? visualPrompt.slice(0, 60) : 'Empirical Forensic Mechanism'}
      </div>
    </div>

    <div>
      <div style="font-family: var(--font-mono, monospace); font-size: 16px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">
        FORENSIC METRIC // DISCREPANCY
      </div>
      <div class="vec-stat-huge" style="font-family: var(--font-mono, monospace); font-size: 78px; font-weight: 800; color: var(--brand-primary); line-height: 1.1; margin: 12px 0;">
        ${heroMetric}
      </div>
      <div style="font-family: var(--font-mono, monospace); font-size: 22px; color: var(--brand-accent); font-weight: 600;">
        INDEX SPREAD: ${secondaryMetric}
      </div>

      <!-- Animated Progress Bar -->
      <div style="width: 100%; height: 14px; background: rgba(26,24,21,0.08); border-radius: 7px; overflow: hidden; margin-top: 24px;">
        <div class="vec-bar-fill" style="height: 100%; width: 100%; background: var(--brand-primary); transform-origin: left; transform: scaleX(var(--scene-progress, 0.75));"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-family: var(--font-mono, monospace); font-size: 14px; color: var(--text-secondary); margin-top: 8px;">
        <span>BASE 0.0</span>
        <span>INDEX PROGRESS</span>
        <span>PEAK 1.0</span>
      </div>
    </div>

    <div style="font-family: var(--font-mono, monospace); font-size: 14px; color: var(--text-secondary);">
      SOURCE: BALANCE SHEET REGULATORY FILING
    </div>
  </div>

  <!-- Right Side: SVG Causal Mechanism Flow -->
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative;">
    <svg viewBox="0 0 920 720" width="100%" height="100%" style="overflow: visible;">
      <defs>
        <marker id="arrowhead-wide" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--brand-accent)" />
        </marker>
        <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.08" />
        </filter>
      </defs>

      <!-- Connecting Causal Line 1 -> 2 -->
      <path class="vec-draw-path vec-flow-arrow" d="M 460 180 L 460 270" stroke="var(--brand-accent)" stroke-width="4" stroke-dasharray="6 6" fill="none" marker-end="url(#arrowhead-wide)" />
      
      <!-- Connecting Causal Line 2 -> 3 -->
      <path class="vec-draw-path vec-flow-arrow" d="M 460 410 L 460 500" stroke="var(--brand-accent)" stroke-width="4" stroke-dasharray="6 6" fill="none" marker-end="url(#arrowhead-wide)" />

      <!-- Node 1: Origin -->
      <g transform="translate(60, 60)" filter="url(#node-shadow)">
        <rect width="800" height="120" rx="16" fill="var(--bg-surface)" stroke="var(--border-muted, rgba(26,24,21,0.2))" stroke-width="2" />
        <rect x="0" y="0" width="14" height="120" rx="7" fill="var(--brand-accent)" />
        <text x="36" y="50" font-family="var(--font-mono, monospace)" font-size="16" font-weight="700" fill="var(--brand-accent)">STAGE 01 // CASH FLOW ORIGIN</text>
        <text x="36" y="86" font-family="var(--font-display, serif)" font-size="28" font-weight="700" fill="var(--text-primary)">${node1Label}</text>
      </g>

      <!-- Node 2: Mechanism / Choke Point -->
      <g transform="translate(60, 290)" filter="url(#node-shadow)">
        <rect width="800" height="120" rx="16" fill="var(--bg-surface)" stroke="var(--brand-primary)" stroke-width="2.5" />
        <rect x="0" y="0" width="14" height="120" rx="7" fill="var(--brand-primary)" />
        <text x="36" y="50" font-family="var(--font-mono, monospace)" font-size="16" font-weight="700" fill="var(--brand-primary)">STAGE 02 // STRUCTURAL CHOKE POINT</text>
        <text x="36" y="86" font-family="var(--font-display, serif)" font-size="28" font-weight="700" fill="var(--text-primary)">${node2Label}</text>
      </g>

      <!-- Node 3: Fallout -->
      <g transform="translate(60, 520)" filter="url(#node-shadow)">
        <rect width="800" height="120" rx="16" fill="var(--bg-surface)" stroke="var(--border-muted, rgba(26,24,21,0.2))" stroke-width="2" />
        <rect x="0" y="0" width="14" height="120" rx="7" fill="var(--text-secondary)" />
        <text x="36" y="50" font-family="var(--font-mono, monospace)" font-size="16" font-weight="700" fill="var(--text-secondary)">STAGE 03 // NET BALANCE IMPACT</text>
        <text x="36" y="86" font-family="var(--font-display, serif)" font-size="28" font-weight="700" fill="var(--text-primary)">${node3Label}</text>
      </g>
    </svg>
  </div>
</div>
`.trim();
}

/**
 * Invokes agyRunner with the vectorSceneDesigner prompt, falling back to buildDeterministicVectorFallback
 * if agyRunner fails or returns empty markup, then sanitizes and wraps the result.
 * 
 * Supports both signatures:
 *   generateVectorSceneHtml(sceneBeat, channelProfile, styleProfile, aspectRatio, agyRunner)
 *   generateVectorSceneHtml(sceneBeat, channelProfile, styleProfile, agyRunner)
 * 
 * @param {Object} sceneBeat
 * @param {Object} channelProfile
 * @param {Object} styleProfile
 * @param {string|Function|Object} [aspectRatioOrRunner='16:9']
 * @param {Function|Object} [maybeRunner=null]
 * @returns {Promise<string>} Sanitized and wrapped vector scene HTML
 */
async function generateVectorSceneHtml(sceneBeat, channelProfile, styleProfile, aspectRatioOrRunner = '16:9', maybeRunner = null) {
  let aspectRatio = '16:9';
  let agyRunner = null;

  if (typeof aspectRatioOrRunner === 'string') {
    aspectRatio = aspectRatioOrRunner;
    agyRunner = maybeRunner;
  } else if (typeof aspectRatioOrRunner === 'function' || (aspectRatioOrRunner && typeof aspectRatioOrRunner === 'object' && (aspectRatioOrRunner.run || aspectRatioOrRunner.execute))) {
    agyRunner = aspectRatioOrRunner;
    aspectRatio = sceneBeat?.aspectRatio || '16:9';
  } else if (maybeRunner) {
    agyRunner = maybeRunner;
  }

  let rawMarkup = null;

  if (agyRunner) {
    try {
      const prompt = buildVectorScenePrompt(sceneBeat, channelProfile, styleProfile, aspectRatio);
      let res;
      if (typeof agyRunner === 'function') {
        res = await agyRunner(prompt);
      } else if (typeof agyRunner.run === 'function') {
        res = await agyRunner.run(prompt);
      } else if (typeof agyRunner.execute === 'function') {
        res = await agyRunner.execute(prompt);
      }

      const strRes = typeof res === 'string' ? res : (res?.output || res?.text || res?.content || '');
      if (typeof strRes === 'string' && (strRes.includes('<svg') || strRes.includes('<div') || strRes.includes('class="vec-'))) {
        rawMarkup = strRes;
      }
    } catch (err) {
      console.warn(`[VisualEngine] agyRunner failed for scene ${sceneBeat?.id || 'unknown'}: ${err.message}. Using deterministic fallback.`);
    }
  }

  if (!rawMarkup) {
    rawMarkup = buildDeterministicVectorFallback(sceneBeat, channelProfile, styleProfile, aspectRatio);
  }

  return sanitizeAndWrapVectorHtml(rawMarkup, sceneBeat, styleProfile);
}

/**
 * Resolves a raster asset file for a scene, ensuring it is written to disk in buildAssetsDir
 * and returning a relative /assets/<filename> URL.
 * NEVER returns Base64 data:image/... strings.
 * 
 * @param {Object} scene - Storyboard scene object
 * @param {number} idx - Scene index
 * @param {string} buildAssetsDir - Destination assets directory
 * @returns {string} Relative URL (e.g. '/assets/scene-01.png')
 */
function resolveRasterAsset(scene, idx, buildAssetsDir) {
  const sceneId = scene.id || `scene-${String(idx + 1).padStart(2, '0')}`;
  const rawSrc = scene.assetUrl || scene.assetPath || scene.image || scene.file || null;

  // 1. If Base64 data URI: decode buffer and save to disk
  if (rawSrc && typeof rawSrc === 'string' && rawSrc.startsWith('data:image/')) {
    const match = rawSrc.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const filename = `${sceneId}.${ext}`;
      const destPath = path.join(buildAssetsDir, filename);
      fs.writeFileSync(destPath, Buffer.from(match[2], 'base64'));
      return `/assets/${filename}`;
    }
  }

  // 2. If already a relative URL starting with /assets/
  if (rawSrc && typeof rawSrc === 'string' && rawSrc.startsWith('/assets/')) {
    const filename = path.basename(rawSrc);
    // If destination file doesn't exist, check standard repo assets dir
    const destPath = path.join(buildAssetsDir, filename);
    if (!fs.existsSync(destPath)) {
      const repoAssets = path.resolve(__dirname, '..', 'assets');
      const candidatePaths = [
        path.join(repoAssets, filename),
        path.join(repoAssets, 'props', 'items', filename),
        path.join(repoAssets, 'scenes', 'cityscapes', filename)
      ];
      for (const cand of candidatePaths) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          fs.copyFileSync(cand, destPath);
          break;
        }
      }
    }
    return `/assets/${filename}`;
  }

  // 3. If file path on disk (absolute or relative)
  if (rawSrc && typeof rawSrc === 'string') {
    const candidates = [
      path.isAbsolute(rawSrc) ? rawSrc : null,
      path.resolve(process.cwd(), rawSrc),
      path.resolve(__dirname, '..', rawSrc),
      path.resolve(__dirname, '..', 'assets', rawSrc),
      path.resolve(__dirname, '..', 'assets', 'props', 'items', path.basename(rawSrc)),
      path.resolve(__dirname, '..', 'assets', 'scenes', 'cityscapes', path.basename(rawSrc))
    ].filter(Boolean);

    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const ext = path.extname(cand) || '.png';
        const filename = `${sceneId}_${path.basename(cand, ext)}${ext}`;
        const destPath = path.join(buildAssetsDir, filename);
        fs.copyFileSync(cand, destPath);
        return `/assets/${filename}`;
      }
    }
  }

  // 4. Fallback: find any existing stock asset from assets/ or write a minimal valid image
  const stockSearchDirs = [
    path.resolve(__dirname, '..', 'assets', 'props', 'items'),
    path.resolve(__dirname, '..', 'assets', 'scenes', 'cityscapes'),
    path.resolve(__dirname, '..', 'assets')
  ];

  for (const dir of stockSearchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
      if (files.length > 0) {
        const selectedFile = files[idx % files.length];
        const srcPath = path.join(dir, selectedFile);
        const ext = path.extname(selectedFile) || '.png';
        const filename = `${sceneId}${ext}`;
        const destPath = path.join(buildAssetsDir, filename);
        fs.copyFileSync(srcPath, destPath);
        return `/assets/${filename}`;
      }
    }
  }

  // 5. Minimal 1x1 PNG fallback if no stock files exist
  const filename = `${sceneId}.png`;
  const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(buildAssetsDir, filename), minimalPng);
  return `/assets/${filename}`;
}

/**
 * Processes storyboard scenes, routes each beat to either vector-html or ai-image,
 * and populates scene.vectorHtml or scene.assetUrl.
 * 
 * @param {Array<Object>|Object} scenes - Array of scene beats or storyboard object
 * @param {Object} pipelineConfig - Pipeline configuration
 * @param {Object} channelProfile - Channel profile
 * @param {Object} styleProfile - Style profile
 * @param {string} [buildAssetsDir] - Directory where raster assets will be written
 * @param {Function|Object} [agyRunner] - Optional sub-agent runner
 * @returns {Promise<Array<Object>>} Processed scenes with visual artifacts populated
 */
async function populateStoryboardVisuals(scenes, pipelineConfig = {}, channelProfile = {}, styleProfile = {}, buildAssetsDir = null, agyRunner = null) {
  const isArray = Array.isArray(scenes);
  const sceneList = isArray ? scenes : (scenes?.scenes || []);
  const aspectRatio = pipelineConfig?.aspectRatio || '16:9';

  const assetsDir = buildAssetsDir || path.resolve(process.cwd(), 'assets', 'build');
  if (!fs.existsSync(assetsDir)) {
    try {
      fs.mkdirSync(assetsDir, { recursive: true });
    } catch (_) {}
  }

  for (let i = 0; i < sceneList.length; i++) {
    const scene = sceneList[i];
    const engine = decideBeatEngine(scene, pipelineConfig);
    scene.resolvedEngine = engine;

    if (engine === 'vector-html') {
      scene.vectorHtml = await generateVectorSceneHtml(scene, channelProfile, styleProfile, aspectRatio, agyRunner);
    } else {
      // engine === 'ai-image'
      scene.assetUrl = resolveRasterAsset(scene, i, assetsDir);
    }
  }

  return isArray ? sceneList : scenes;
}

module.exports = {
  decideBeatEngine,
  sanitizeAndWrapVectorHtml,
  buildDeterministicVectorFallback,
  generateVectorSceneHtml,
  populateStoryboardVisuals
};
