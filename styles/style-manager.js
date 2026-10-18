/**
 * AI-nimate Style Profile & Brand Chrome Manager
 * 
 * Manages video style profiles:
 *  - Canvas background & inline SVG patterns (papyrus-batik, archival-grain, blueprint-grid)
 *  - Color palettes & typography tokens
 *  - CSS custom properties compilation (:root)
 *  - Deterministic 3-layer brand shell (Layer 0: bg, Layer 1: watermark, Layer 2: chrome)
 *  - Sub-agent styling tips & narrative directives
 */

const fs = require('fs');
const path = require('path');

const STYLES_DIR = __dirname;

/**
 * List all available style profiles
 * @returns {Array<Object>}
 */
function listStyles() {
  if (!fs.existsSync(STYLES_DIR)) return [];
  const files = fs.readdirSync(STYLES_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    try {
      const fullPath = path.join(STYLES_DIR, file);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      return {
        ...data,
        id: data.id || file.replace('.json', ''),
        name: data.name || data.id || file.replace('.json', ''),
        description: data.description || '',
        aspectRatio: data.aspectRatio || '16:9',
        file
      };
    } catch (_) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Get a style profile by ID or relative path, falling back to 'investigative-documentary' (legacy)
 * @param {string|Object} idOrObj
 * @returns {Object}
 */
function getStyle(idOrObj) {
  if (idOrObj && typeof idOrObj === 'object') {
    return idOrObj;
  }

  const styleId = (typeof idOrObj === 'string' && idOrObj.trim().length > 0)
    ? idOrObj.trim().replace(/\.json$/, '')
    : 'investigative-documentary';

  const candidateFile = path.join(STYLES_DIR, `${styleId}.json`);
  if (fs.existsSync(candidateFile)) {
    try {
      return JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
    } catch (e) {
      console.warn(`[StyleManager] Failed to parse ${candidateFile}: ${e.message}`);
    }
  }

  // Fallback to default
  const defaultFile = path.join(STYLES_DIR, 'investigative-documentary.json');
  if (fs.existsSync(defaultFile)) {
    try {
      return JSON.parse(fs.readFileSync(defaultFile, 'utf8'));
    } catch (_) {}
  }

  // In-memory fallback if file system is missing
  return {
    id: 'investigative-documentary',
    name: 'Investigative Documentary',
    aspectRatio: '16:9',
    background: {
      type: 'paper',
      paperTone: '#faf7f0',
      pattern: 'megamendung',
      vignette: 'desk-lamp',
      ambientGlow: true
    },
    palette: {
      name: 'navy-gold',
      bg: '#faf7f0',
      cardBg: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      accent: '#b45309',
      border: 'rgba(15, 23, 42, 0.14)'
    },
    stylingTips: {
      pacing: 'Target 130–140 WPM. Scene beats 8–11s.',
      exhibits: 'Authentic documents and archival photos with torn-paper or polaroid styling.'
    }
  };
}

/**
 * Get a style profile by ID, falling back cleanly to 'kausalmedia'
 * @param {string|Object} [styleId='kausalmedia']
 * @returns {Object} Complete StyleProfile object
 */
function getStyleProfile(styleId = 'kausalmedia') {
  if (styleId && typeof styleId === 'object') {
    return styleId;
  }

  const id = (typeof styleId === 'string' && styleId.trim().length > 0)
    ? styleId.trim().replace(/\.json$/, '')
    : 'kausalmedia';

  const candidateFile = path.join(STYLES_DIR, `${id}.json`);
  if (fs.existsSync(candidateFile)) {
    try {
      return JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
    } catch (e) {
      console.warn(`[StyleManager] Failed to parse ${candidateFile}: ${e.message}`);
    }
  }

  // Fallback to kausalmedia
  const defaultFile = path.join(STYLES_DIR, 'kausalmedia.json');
  if (fs.existsSync(defaultFile)) {
    try {
      return JSON.parse(fs.readFileSync(defaultFile, 'utf8'));
    } catch (_) {}
  }

  // In-memory fallback matching Section 3.3
  return {
    id: 'kausalmedia',
    name: 'Kausal Media Editorial Papyrus',
    theme: 'light',
    palette: {
      bgPrimary: '#faf6ee',
      bgSecondary: '#f0e8d8',
      bgSurface: 'rgba(255, 252, 245, 0.92)',
      textPrimary: '#1a1815',
      textSecondary: '#5a5347',
      brandPrimary: '#b8332a',
      brandAccent: '#c98a2c',
      borderMuted: 'rgba(26, 24, 21, 0.16)',
      gridLine: 'rgba(26, 24, 21, 0.07)'
    },
    typography: {
      fontDisplay: "'Playfair Display', 'Georgia', serif",
      fontSans: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      fontMono: "'JetBrains Mono', monospace"
    },
    chrome: {
      backgroundPattern: 'papyrus-batik',
      watermarkText: 'KAUSAL MEDIA // FORENSIC DOSSIER',
      showHeaderBar: true,
      showCornerTicks: true,
      vignetteStrength: 0.22
    },
    aiImagePromptPrefix: 'Editorial archival illustration on warm aged papyrus (#faf6ee), forensic red (#b8332a) and ochre gold (#c98a2c) ink accents, clean etching linework, high contrast, no text clutter: '
  };
}

/**
 * Compiles a deterministic :root CSS custom properties block from a StyleProfile
 * @param {Object} styleProfile
 * @returns {string} CSS :root block
 */
function compileStyleCssVariables(styleProfile) {
  const profile = (styleProfile && typeof styleProfile === 'object')
    ? styleProfile
    : getStyleProfile(typeof styleProfile === 'string' ? styleProfile : 'kausalmedia');

  const palette = profile.palette || {};
  const typography = profile.typography || {};

  const bgPrimary = palette.bgPrimary || palette.bg || '#faf6ee';
  const bgSecondary = palette.bgSecondary || '#f0e8d8';
  const bgSurface = palette.bgSurface || palette.cardBg || 'rgba(255, 252, 245, 0.92)';
  const textPrimary = palette.textPrimary || '#1a1815';
  const textSecondary = palette.textSecondary || '#5a5347';
  const brandPrimary = palette.brandPrimary || palette.stampColor || '#b8332a';
  const brandAccent = palette.brandAccent || palette.accent || '#c98a2c';
  const borderMuted = palette.borderMuted || palette.border || 'rgba(26, 24, 21, 0.16)';
  const gridLine = palette.gridLine || 'rgba(26, 24, 21, 0.07)';

  const fontDisplay = typography.fontDisplay || typography.headlineFont || "'Playfair Display', 'Georgia', serif";
  const fontSans = typography.fontSans || typography.bodyFont || "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
  const fontMono = typography.fontMono || typography.monoFont || "'JetBrains Mono', monospace";

  return `:root {
  --bg-primary: ${bgPrimary};
  --bg-secondary: ${bgSecondary};
  --bg-surface: ${bgSurface};
  --text-primary: ${textPrimary};
  --text-secondary: ${textSecondary};
  --brand-primary: ${brandPrimary};
  --brand-accent: ${brandAccent};
  --border-muted: ${borderMuted};
  --grid-line: ${gridLine};
  --font-display: ${fontDisplay};
  --font-sans: ${fontSans};
  --font-mono: ${fontMono};
}`;
}

/**
 * Escapes characters for safe HTML inclusion
 * @param {string} str
 * @returns {string}
 */
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
 * Returns deterministic inline SVG background pattern markup with zero external URLs
 * @param {string} patternKey
 * @returns {string} Inline SVG pattern element
 */
function getBackgroundPatternSvg(patternKey) {
  const norm = String(patternKey || '').toLowerCase();

  if (norm.includes('grain') || norm.includes('archival') || norm.includes('slate')) {
    return `<svg class="bg-pattern-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.85;">
  <defs>
    <pattern id="pat-archival-grain" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="0.8" fill="var(--grid-line)" fill-opacity="0.8"/>
      <circle cx="20" cy="8" r="0.6" fill="var(--grid-line)" fill-opacity="0.6"/>
      <circle cx="12" cy="18" r="0.8" fill="var(--grid-line)" fill-opacity="0.8"/>
      <circle cx="28" cy="22" r="0.6" fill="var(--grid-line)" fill-opacity="0.6"/>
      <circle cx="6" cy="28" r="0.5" fill="var(--grid-line)" fill-opacity="0.5"/>
      <path d="M 0 16 H 32 M 16 0 V 32" stroke="var(--grid-line)" stroke-width="0.5" stroke-dasharray="1,7" stroke-opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#pat-archival-grain)" />
</svg>`;
  }

  if (norm.includes('blueprint') || norm.includes('grid') || norm.includes('truntum')) {
    return `<svg class="bg-pattern-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.9;">
  <defs>
    <pattern id="pat-blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--grid-line)" stroke-width="1" stroke-opacity="0.7"/>
      <path d="M 0 10 H 40 M 0 20 H 40 M 0 30 H 40 M 10 0 V 40 M 20 0 V 40 M 30 0 V 40" fill="none" stroke="var(--grid-line)" stroke-width="0.5" stroke-opacity="0.3"/>
      <path d="M 18 20 H 22 M 20 18 V 22" stroke="var(--brand-accent)" stroke-width="0.8" stroke-opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#pat-blueprint-grid)" />
</svg>`;
  }

  // Default: papyrus-batik
  return `<svg class="bg-pattern-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.85;">
  <defs>
    <pattern id="pat-papyrus-batik" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M 0 32 Q 16 16 32 32 T 64 32 M 32 0 Q 48 16 32 32 T 32 64" fill="none" stroke="var(--grid-line)" stroke-width="1.2" stroke-opacity="0.6"/>
      <path d="M 0 0 L 64 64 M 64 0 L 0 64" fill="none" stroke="var(--grid-line)" stroke-width="0.6" stroke-dasharray="2,4" stroke-opacity="0.4"/>
      <circle cx="32" cy="32" r="4" fill="none" stroke="var(--brand-accent)" stroke-width="1" stroke-opacity="0.4"/>
      <circle cx="0" cy="0" r="3" fill="var(--grid-line)" fill-opacity="0.3"/>
      <circle cx="64" cy="0" r="3" fill="var(--grid-line)" fill-opacity="0.3"/>
      <circle cx="0" cy="64" r="3" fill="var(--grid-line)" fill-opacity="0.3"/>
      <circle cx="64" cy="64" r="3" fill="var(--grid-line)" fill-opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#pat-papyrus-batik)" />
</svg>`;
}

/**
 * Renders deterministic HTML for Layers 0, 1, and 2 brand shell
 * @param {Object} styleProfile
 * @param {Object} [channelProfile]
 * @param {string} [aspectRatio='16:9']
 * @returns {string} HTML markup containing #layer-0-bg, #layer-1-watermark, and #layer-2-chrome
 */
function renderBrandBackgroundLayerHtml(styleProfile, channelProfile, aspectRatio = '16:9') {
  const profile = (styleProfile && typeof styleProfile === 'object')
    ? styleProfile
    : getStyleProfile(typeof styleProfile === 'string' ? styleProfile : 'kausalmedia');

  const chrome = profile.chrome || {};
  const bgPatternKey = chrome.backgroundPattern || profile.background?.pattern || 'papyrus-batik';
  const watermarkText = chrome.watermarkText || 'FORENSIC DOSSIER // DECLASSIFIED';
  const channelName = channelProfile?.name || channelProfile?.id || 'KAUSAL MEDIA';
  const patternSvg = getBackgroundPatternSvg(bgPatternKey);

  const layer0 = `<div id="layer-0-bg" style="position: absolute; inset: 0; width: 100%; height: 100%; background-color: var(--bg-primary); overflow: hidden; pointer-events: none; z-index: 0;">
  ${patternSvg}
</div>`;

  const layer1 = `<div id="layer-1-watermark" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
  <div class="corner-tick corner-tl" style="position: absolute; top: 16px; left: 16px; width: 16px; height: 16px; border-top: 2px solid var(--border-muted); border-left: 2px solid var(--border-muted);"></div>
  <div class="corner-tick corner-tr" style="position: absolute; top: 16px; right: 16px; width: 16px; height: 16px; border-top: 2px solid var(--border-muted); border-right: 2px solid var(--border-muted);"></div>
  <div class="corner-tick corner-bl" style="position: absolute; bottom: 16px; left: 16px; width: 16px; height: 16px; border-bottom: 2px solid var(--border-muted); border-left: 2px solid var(--border-muted);"></div>
  <div class="corner-tick corner-br" style="position: absolute; bottom: 16px; right: 16px; width: 16px; height: 16px; border-bottom: 2px solid var(--border-muted); border-right: 2px solid var(--border-muted);"></div>
  <div class="brand-watermark-label" style="position: absolute; bottom: 20px; right: 28px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-secondary); opacity: 0.35;">${escapeHtml(watermarkText)}</div>
</div>`;

  const layer2 = `<div id="layer-2-chrome" style="position: absolute; top: 0; left: 0; right: 0; height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid var(--border-muted); background: var(--bg-surface); backdrop-filter: blur(8px); z-index: 2; pointer-events: none;">
  <div class="chrome-channel-tag" style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brand-primary);">
    <span class="chrome-channel-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--brand-primary);"></span>
    <span>${escapeHtml(channelName)}</span>
  </div>
  <div class="chrome-watermark-center" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-secondary); opacity: 0.7;">
    ${escapeHtml(watermarkText)}
  </div>
  <div class="chrome-chapter-badge" style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 3px; border: 1px solid var(--border-muted); background: var(--bg-secondary); color: var(--text-primary);">
    <span id="stage-chapter-title">DOSSIER // 01</span>
  </div>
</div>`;

  return `${layer0}\n${layer1}\n${layer2}`;
}

/**
 * Apply style defaults across a storyboard and its scenes
 * @param {Object} storyboard
 * @param {string|Object} [styleIdOrObj]
 * @returns {Object}
 */
function applyStyleToStoryboard(storyboard, styleIdOrObj) {
  const style = getStyle(styleIdOrObj || storyboard.style);
  storyboard.style = style.id || 'custom';
  storyboard.styleProfile = style;

  if (!storyboard.aspectRatio && style.aspectRatio) {
    storyboard.aspectRatio = style.aspectRatio;
  }

  const defaultEnv = {
    pattern: style.background?.pattern || 'megamendung',
    palette: style.palette?.name || 'navy-gold',
    vignette: style.background?.vignette || 'desk-lamp',
    ambientGlow: style.background?.ambientGlow !== false
  };

  (storyboard.scenes || []).forEach(scene => {
    // Inherit environment if not explicitly set
    scene.environment = Object.assign({}, defaultEnv, scene.environment || {});
    
    // Default background camera motion if applicable
    if (!scene.background) scene.background = {};
    if (!scene.background.cameraMotion && style.background?.cameraMotion) {
      scene.background.cameraMotion = style.background.cameraMotion;
    }
  });

  return storyboard;
}

/**
 * Generate sub-agent instructions/directives for prompts based on a style profile
 * @param {string|Object} [styleIdOrObj]
 * @returns {string}
 */
function getStyleDirectivesForPrompt(styleIdOrObj) {
  const style = getStyle(styleIdOrObj);
  const tips = style.stylingTips || {};

  return `
### Channel Style Profile: ${style.name} (${style.aspectRatio || '16:9'})
> ${style.description || 'Channel visual identity and guidelines.'}

- **Background & Canvas**:
  - Paper Tone: ${style.background?.paperTone || '#faf7f0'} (${style.background?.type || 'paper'})
  - Watermark Pattern: ${style.background?.pattern || 'megamendung'}
  - Lighting Vignette: ${style.background?.vignette || 'desk-lamp'}
- **Color Palette**: ${style.palette?.name || 'navy-gold'} (Accent: ${style.palette?.accent || '#b45309'})
- **Pacing Directive**: ${tips.pacing || 'Standard documentary cadence.'}
- **Exhibit Directive**: ${tips.exhibits || 'Prioritize authentic documents and archival photography.'}
- **Annotation Directive**: ${tips.annotations || 'Use rubber-stamps for rulings and highlighters for clauses.'}
- **Data Graphics**: ${tips.dataGraphics || 'Use odometer-tickers for large values and TradingView charts for trends.'}
- **Anti-Slop / Script Tone**: ${tips.antiSlopRules || 'Eliminate AI cliches; use grounded causal mechanics.'}
`.trim();
}

module.exports = {
  STYLES_DIR,
  listStyles,
  getStyle,
  getStyleProfile,
  loadStyle: getStyleProfile,
  compileStyleCssVariables,
  renderBrandBackgroundLayerHtml,
  applyStyleToStoryboard,
  getStyleDirectivesForPrompt
};
