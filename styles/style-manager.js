/**
 * AI-nimate Style Profile & Channel Template Manager
 * 
 * Manages channel/video style profiles:
 *  - Canvas background & paper textures
 *  - Batik watermark patterns & lighting vignettes
 *  - Color palettes & typography
 *  - Sub-agent styling tips & narrative directives
 */

const fs = require('fs');
const path = require('path');

const STYLES_DIR = __dirname;

/**
 * List all available style profiles
 */
function listStyles() {
  if (!fs.existsSync(STYLES_DIR)) return [];
  const files = fs.readdirSync(STYLES_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    try {
      const fullPath = path.join(STYLES_DIR, file);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      return {
        id: data.id || file.replace('.json', ''),
        name: data.name || data.id,
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
 * Get a style profile by ID or relative path, falling back to 'investigative-documentary'
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
 * Apply style defaults across a storyboard and its scenes
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
  applyStyleToStoryboard,
  getStyleDirectivesForPrompt
};
