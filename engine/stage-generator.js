/**
 * AI-nimate Broadcast Documentary Stage & Motion Engine (Phase 5)
 * 
 * Generates deterministic, broadcast-grade HTML stage files for video rendering
 * and keyframe inspection, featuring a 5-Layer DOM structure, active-scene-only mounting,
 * dynamic brand/style compilation, configurable subtitles, motion primitives, and a virtual clock API.
 * 
 * 5-Layer Architecture:
 *   - Layer 0 (#layer-0-bg): Brand background color & SVG pattern from style-manager
 *   - Layer 1 (#layer-1-watermark): Brand watermark & corner registration ticks
 *   - Layer 2 (#layer-2-chrome): Documentary header bar with channel badge & #stage-chapter-title
 *   - Layer 3 (#layer-3-sandbox): Central visual exhibit viewport (active scene ONLY; 80% with subtitles, 92% without)
 *   - Layer 4 (#layer-4-vignette): Optical vignette overlay (opacity from styleProfile.chrome.vignetteStrength)
 *   - Layer 5 (#layer-5-subtitles): Conditionally mounted subtitles (kinetic-pill, broadcast-lower, karaoke-word)
 */

const fs = require('fs');
const path = require('path');

const { getChannelProfile } = require('../channels/channel-manager');
const {
  getStyleProfile,
  compileStyleCssVariables,
  renderBrandBackgroundLayerHtml
} = require('../styles/style-manager');
const { normalizePipelineConfig } = require('../config/schema');

/**
 * Resolves an asset source path into a relative /assets/... URL.
 * NEVER returns Base64 data:image/... strings.
 * 
 * @param {string} src
 * @returns {string} Relative URL (e.g. '/assets/image.png')
 */
function resolveAssetAsDataUri(src) {
  if (!src) return '';
  if (typeof src !== 'string') return String(src);
  if (src.startsWith('data:')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/assets/')) return src;
  return `/assets/${path.basename(src)}`;
}

/**
 * Extracts clean subject prompt by removing system prompt boilerplate.
 * 
 * @param {string} rawText
 * @returns {string} Clean subject prompt
 */
function extractCleanPrompt(rawText) {
  if (!rawText) return 'Visual exhibit representation';
  let text = String(rawText).trim();
  text = text.replace(/^(editorial comic art illustration of|editorial comic art spot illustration of|vector icon of)\s*/i, '');
  text = text.replace(/:\s*bold clean black ink contour.*$/i, '');
  text = text.replace(/:\s*bold 4px clean black ink.*$/i, '');
  text = text.replace(/,\s*(full 16:9 wide scene composition|isolated on a solid warm cream|clean illustration without baked arrows).*$/i, '');
  return text.trim() || rawText;
}

/**
 * Extracts Archival Stamp / Citation Badge from scene metadata.
 * 
 * @param {Object} sc
 * @returns {string|null} Citation label or null
 */
function extractCitation(sc) {
  if (!sc) return null;
  if (sc.annotation) {
    if (typeof sc.annotation === 'string') return sc.annotation;
    if (sc.annotation.text) return sc.annotation.text;
    if (sc.annotation.label) return sc.annotation.label;
    if (sc.annotation.source) return sc.annotation.source;
    if (sc.annotation.authority) return sc.annotation.authority;
  }

  const raw = ((sc.subtitle || '') + ' ' + (sc.exhibit?.description || '') + ' ' + (sc.narration || '')).trim();
  if (!raw) return null;

  const matchPojk = raw.match(/\b(POJK\s*(?:NO\.?|NOMOR)?\s*[\d\w\/\.\-]+)\b/i);
  if (matchPojk) return 'DOKUMEN: ' + matchPojk[1].toUpperCase();

  const matchUu = raw.match(/\b(UU\s*(?:NO\.?|NOMOR)?\s*[\d\w\/\.\-]+)\b/i);
  if (matchUu) return 'REGULASI: ' + matchUu[1].toUpperCase();

  const matchBei = raw.match(/\b(B-E-I|BEI|BURSA EFEK INDONESIA|IDX)\b/i);
  if (matchBei) return 'KLASIFIKASI: BURSA EFEK INDONESIA';

  const matchOjk = raw.match(/\b(OJK|OTORITAS JASA KEUANGAN)\b/i);
  if (matchOjk) return 'PENGAWASAN: OTORITAS JASA KEUANGAN';

  const matchBi = raw.match(/\b(BANK INDONESIA|BI)\b/i);
  if (matchBi) return 'KLASIFIKASI: BANK INDONESIA';

  const matchKpk = raw.match(/\b(KPK|KOMISI PEMBERANTASAN KORUPSI)\b/i);
  if (matchKpk) return 'BUKTI ARSIP: BERKAS KPK';

  const matchKemenkeu = raw.match(/\b(KEMENKEU|KEMENTERIAN KEUANGAN)\b/i);
  if (matchKemenkeu) return 'ARSIP NEGARA: KEMENKEU RI';

  const matchMedia = raw.match(/\b(BLOOMBERG|REUTERS|KONTAN|BISNIS INDONESIA)\b/i);
  if (matchMedia) return 'SUMBER: ' + matchMedia[1].toUpperCase();

  return null;
}

/**
 * Extracts Procedural Financial Metric Callout from scene metadata.
 * 
 * @param {Object} sc
 * @returns {Object|null} { value, label, note } or null
 */
function extractFinancialMetric(sc) {
  if (!sc) return null;
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

  const raw = ((sc.subtitle || '') + ' ' + (sc.exhibit?.description || '') + ' ' + (sc.narration || '')).trim();
  if (!raw) return null;

  const matchRupiah = raw.match(/\b(Rp\s*[-+]?[\d\.,]+(?:\s*(?:Triliun|Miliar|Juta|Ribu|T|M|B))?)\b/i);
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

  const matchPct = raw.match(/([-+]?\d+(?:[\.,]\d+)?\s*%)/);
  if (matchPct) {
    let label = 'FLUKTUASI HARGA';
    if (/margin/i.test(raw)) label = 'MARGIN OPERASIONAL';
    else if (/rugi|turun|jatuh|crash|menguap|ambles|anjlok/i.test(raw)) label = 'PENURUNAN NILAI';
    else if (/naik|lonjakan|growth|melejit/i.test(raw)) label = 'PERTUMBUHAN';
    return { value: matchPct[1].trim(), label: label, note: 'Perubahan Relatif' };
  }

  const matchMult = raw.match(/\b(\d+(?:[\.,]\d+)?\s*x)\b/i);
  if (matchMult) {
    return { value: matchMult[1].trim(), label: 'FAKTOR PENGALI', note: 'Rasio Valuasi' };
  }

  const matchUsd = raw.match(/(\$\s*[-+]?[\d\.,]+(?:\s*(?:Trillion|Billion|Million|T|B|M))?)/i);
  if (matchUsd) {
    return { value: matchUsd[1].trim(), label: 'VALUASI GLOBAL', note: 'Estimasi Pasar' };
  }

  return null;
}

/**
 * Escapes characters for safe HTML inclusion
 * 
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
 * Normalizes input arguments across multiple polymorphic calling conventions.
 * 
 * @param {*} arg1
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @param {*} [arg4]
 * @returns {Object} Normalized execution context
 */
function resolveParameters(arg1, arg2, arg3, arg4) {
  let rawScenes = [];
  let rawConfig = {};
  let channelProfile = null;
  let styleProfile = null;

  if (Array.isArray(arg1)) {
    rawScenes = arg1;
    if (arg2 && typeof arg2 === 'object') {
      rawConfig = Object.assign({}, arg2);
    }
  } else if (arg1 && typeof arg1 === 'object') {
    if (Array.isArray(arg1.scenes)) {
      rawScenes = arg1.scenes;
      rawConfig = Object.assign({}, arg1);
    } else if (arg1.storyboard) {
      if (Array.isArray(arg1.storyboard)) {
        rawScenes = arg1.storyboard;
      } else if (Array.isArray(arg1.storyboard.scenes)) {
        rawScenes = arg1.storyboard.scenes;
      } else if (arg1.storyboard.scenes && typeof arg1.storyboard.scenes === 'object') {
        rawScenes = Object.values(arg1.storyboard.scenes);
      }
      rawConfig = Object.assign({}, arg1);
    } else {
      rawScenes = [];
      rawConfig = Object.assign({}, arg1);
    }
  }

  if (arg2 && typeof arg2 === 'object' && arg2 !== rawConfig) {
    Object.assign(rawConfig, arg2);
  }

  const timings = arg1?.timings || arg2?.timings || { words: [], duration: 0 };
  const testMode = Boolean(
    rawConfig.testMode ||
    rawConfig.isTestMode ||
    arg1?.testMode ||
    arg1?.isTestMode ||
    arg2?.testMode ||
    arg2?.isTestMode
  );

  if (rawConfig.format && !rawConfig.aspectRatio) {
    rawConfig.aspectRatio = rawConfig.format;
  }

  const channelId = rawConfig.channelId || rawConfig.channel || 'kausalmedia';
  if (arg3 && typeof arg3 === 'object' && arg3.id) {
    channelProfile = arg3;
  } else {
    channelProfile = getChannelProfile(channelId);
  }

  const pipelineConfig = normalizePipelineConfig(rawConfig, channelProfile);
  pipelineConfig.testMode = testMode;

  const styleId = rawConfig.styleId || rawConfig.style || pipelineConfig.styleId || channelProfile?.defaultStyle || 'kausalmedia';
  if (arg4 && typeof arg4 === 'object' && arg4.id && arg4.palette) {
    styleProfile = arg4;
  } else {
    styleProfile = getStyleProfile(styleId);
  }

  return {
    rawScenes,
    pipelineConfig,
    channelProfile,
    styleProfile,
    timings,
    testMode
  };
}

/**
 * Renders the HTML markup for a single scene beat.
 * 
 * @param {Object} scene
 * @param {string} channelTag
 * @returns {string} HTML string
 */
function renderSceneMarkup(scene, channelTag) {
  if (!scene) return '';

  if (scene.isTestMode) {
    const isFull = scene.layout === 'fullsize' || scene.layout === 'fullscreen';
    const isSplit = scene.layout === 'split';
    const cardCls = isFull ? 'card-fullscreen' : 'card-hero';
    const layoutCls = isFull ? 'layout-fullsize' : (isSplit ? 'layout-split' : 'layout-hero');

    return `<div class="scene-container ${layoutCls} active" id="scene-${scene.id}">
  <div class="test-prompt-card ${cardCls}">
    <div class="test-prompt-body">
      <span class="test-prompt-tag">${scene.systemTag || `[SYSTEM_PROMPT_${channelTag}]`}</span>
      <span class="test-prompt-text"> ${escapeHtml(scene.cleanPrompt || scene.narration || 'Scene visual asset prompt')}</span>
    </div>
  </div>
</div>`;
  }

  if (scene.resolvedEngine === 'vector-html' && scene.vectorHtml) {
    return `<div class="scene-container layout-vector active" id="scene-${scene.id}" style="width: 100%; height: 100%;">
  ${scene.vectorHtml}
</div>`;
  }

  let badgesHtml = '';
  if (scene.citation) {
    badgesHtml += `<div class="archival-stamp-badge"><span class="badge-dot"></span><span class="badge-text">${escapeHtml(scene.citation)}</span></div>`;
  }
  if (scene.financialMetric) {
    badgesHtml += `<div class="financial-metric-card" id="metric-card-${scene.id}">
  <div class="metric-card-header"><span class="metric-pill-dot"></span><span class="metric-label">${escapeHtml(scene.financialMetric.label)}</span></div>
  <div class="metric-value" data-target="${escapeHtml(scene.financialMetric.value)}">${escapeHtml(scene.financialMetric.value)}</div>
  ${scene.financialMetric.note ? `<div class="metric-subnote">${escapeHtml(scene.financialMetric.note)}</div>` : ''}
</div>`;
  }
  const cues = (Array.isArray(scene.sub_cues) && scene.sub_cues.length > 0)
    ? scene.sub_cues
    : ((Array.isArray(scene.visual_cues) && scene.visual_cues.length > 0) ? scene.visual_cues : []);
  if (cues.length > 0) {
    badgesHtml += '<div class="subcue-container" style="position: absolute; bottom: 28px; right: 28px; z-index: 38; display: flex; flex-direction: column; gap: 8px; pointer-events: none;">' +
      cues.map((cue, idx) => {
        const prog = typeof cue === 'object' && cue.progress !== undefined
          ? cue.progress
          : (cues.length > 1 ? Number((idx / (cues.length - 1)).toFixed(2)) : 0.0);
        const label = typeof cue === 'object'
          ? (cue.label || cue.description || cue.action || cue.phrase || cue.concept || 'Micro Exhibit')
          : String(cue);
        const isHidden = prog > 0;
        return `<div class="subcue-badge ${isHidden ? 'subcue-pending' : 'subcue-active'}" data-subcue-progress="${prog}" style="background: var(--bg-surface); border: 1px solid var(--border-muted); border-left: 3px solid var(--brand-accent); padding: 5px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1); backdrop-filter: blur(8px);"><span style="color: var(--brand-accent); margin-right: 6px;">[${Math.round(prog * 100)}%]</span>${escapeHtml(label)}</div>`;
      }).join('') +
    '</div>';
  }

  if (scene.layout === 'split') {
    const leftSrc = scene.assetUrl || '';
    const rightSrc = scene.secondaryAssetUrl || leftSrc;
    return `<div class="scene-container layout-split active" id="scene-${scene.id}">
  <div class="split-pane split-left"><img class="exhibit-image" src="${leftSrc}" alt="${escapeHtml(scene.visualPrompt || 'Exhibit Left')}"></div>
  <div class="split-pane split-right"><img class="exhibit-image" src="${rightSrc}" alt="${escapeHtml(scene.visualPrompt || 'Exhibit Right')}"></div>
  ${badgesHtml}
</div>`;
  }

  if (scene.layout === 'fullsize' || scene.layout === 'fullscreen' || scene.layout === 'fullbleed') {
    const imgSrc = scene.assetUrl || '';
    return `<div class="scene-container layout-fullsize active" id="scene-${scene.id}">
  <img class="exhibit-image" src="${imgSrc}" alt="${escapeHtml(scene.visualPrompt || 'Exhibit')}">
  ${badgesHtml}
</div>`;
  }

  // Default: layout-hero
  const imgSrc = scene.assetUrl || '';
  const labeledSrc = scene.assetUrlLabeled || '';
  return `<div class="scene-container layout-hero active" id="scene-${scene.id}">
  <img class="exhibit-image exhibit-clean" src="${imgSrc}" alt="${escapeHtml(scene.visualPrompt || 'Exhibit')}">
  ${labeledSrc ? `<img class="exhibit-image exhibit-labeled" src="${labeledSrc}" alt="${escapeHtml(scene.visualPrompt || 'Exhibit Labeled')}">` : ''}
  ${badgesHtml}
</div>`;
}

/**
 * Generates deterministic, broadcast-grade HTML stage file with the 5-Layer architecture.
 * 
 * Supports both signatures:
 *   generateStageHtml(storyboard, pipelineConfig, channelProfile, styleProfile)
 *   generateStageHtml({ storyboard, timings, format, channelId, testMode })
 * 
 * @param {*} arg1
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @param {*} [arg4]
 * @returns {string} Complete HTML string
 */
function generateStageHtml(arg1, arg2, arg3, arg4) {
  const {
    rawScenes,
    pipelineConfig,
    channelProfile,
    styleProfile,
    timings,
    testMode
  } = resolveParameters(arg1, arg2, arg3, arg4);

  const aspectRatio = pipelineConfig.aspectRatio || '16:9';
  const isShort = aspectRatio === '9:16';
  const width = isShort ? 1080 : 1920;
  const height = isShort ? 1920 : 1080;
  const channelTag = String(channelProfile?.id || pipelineConfig.channelId || 'kausalmedia').toUpperCase().replace(/[^A-Z0-9_]/g, '');

  const subtitlesEnabled = Boolean(pipelineConfig.subtitles && pipelineConfig.subtitles.enabled);
  const subtitleMode = (pipelineConfig.subtitles && pipelineConfig.subtitles.mode) ? pipelineConfig.subtitles.mode : (subtitlesEnabled ? 'kinetic-pill' : 'off');
  const layer3Height = subtitlesEnabled ? '80%' : '92%';
  const vignetteStrength = styleProfile?.chrome?.vignetteStrength ?? 0.22;

  // Process and sanitize scenes
  let currentCumMs = 0;
  const processedScenes = rawScenes.map((sc, idx) => {
    const isSceneTestMode = Boolean(testMode || sc.isTestMode || sc.testMode || sc.exhibit?.isPromptBox);
    const index = typeof sc.index === 'number' ? sc.index : idx;
    const id = sc.id !== undefined && sc.id !== null ? String(sc.id) : `scene-${String(idx + 1).padStart(2, '0')}`;

    let startMs = currentCumMs;
    if (sc.startMs !== undefined && sc.startMs !== null) {
      startMs = Number(sc.startMs);
    } else if (sc.startTime !== undefined && sc.startTime !== null) {
      startMs = Math.round(Number(sc.startTime) * 1000);
    }

    let durationMs = 5000;
    if (sc.durationMs !== undefined && sc.durationMs !== null) {
      durationMs = Number(sc.durationMs);
    } else if (sc.duration !== undefined && sc.duration !== null) {
      durationMs = Math.round(Number(sc.duration) * 1000);
    } else if (sc.endMs !== undefined && sc.endMs !== null) {
      durationMs = Math.max(500, Number(sc.endMs) - startMs);
    } else if (sc.endTime !== undefined && sc.endTime !== null) {
      durationMs = Math.max(500, Math.round(Number(sc.endTime) * 1000) - startMs);
    }

    const endMs = (sc.endMs !== undefined && sc.endMs !== null)
      ? Number(sc.endMs)
      : (sc.endTime !== undefined && sc.endTime !== null ? Math.round(Number(sc.endTime) * 1000) : startMs + durationMs);

    currentCumMs = endMs;

    const narration = sc.narration || sc.subtitle || sc.script || '';
    const subtitle = sc.subtitle || sc.narration || '';
    const chapterTitle = sc.chapterTitle || sc.title || `CHAPTER // ${String(idx + 1).padStart(2, '0')}`;
    const layout = (sc.layout || sc.exhibit?.layout || 'hero').toLowerCase();

    let cleanPrompt = '';
    let systemTag = '';
    if (isSceneTestMode) {
      const rawDesc = sc.exhibit?.description || sc.exhibit?.nanoBananaPrompt || sc.exhibit?.artistPrompt || sc.visualPrompt || sc.narration || sc.subtitle || 'Scene visual asset prompt';
      cleanPrompt = extractCleanPrompt(rawDesc);
      systemTag = `[SYSTEM_PROMPT_${channelTag}]`;
    }

    let resolvedEngine = sc.resolvedEngine;
    if (!resolvedEngine) {
      if (sc.vectorHtml) {
        resolvedEngine = 'vector-html';
      } else if (sc.assetUrl || sc.image || sc.src || sc.exhibit?.src) {
        resolvedEngine = 'ai-image';
      } else {
        resolvedEngine = pipelineConfig.visualEngine === 'vector-html' ? 'vector-html' : 'ai-image';
      }
    }

    const vectorHtml = sc.vectorHtml || (resolvedEngine === 'vector-html' ? `<div class="vec-card" style="padding: 24px;">${escapeHtml(narration)}</div>` : null);

    let assetUrl = null;
    if (sc.assetUrl) {
      assetUrl = sc.assetUrl;
    } else if (sc.exhibit?.src) {
      assetUrl = sc.exhibit.src.startsWith('/assets/') ? sc.exhibit.src : `/assets/${path.basename(sc.exhibit.src)}`;
    } else if (sc.src || sc.image) {
      const srcVal = sc.src || sc.image;
      assetUrl = srcVal.startsWith('/assets/') ? srcVal : `/assets/${path.basename(srcVal)}`;
    }

    let assetUrlLabeled = null;
    if (sc.exhibit?.src_labeled) {
      assetUrlLabeled = sc.exhibit.src_labeled.startsWith('/assets/') ? sc.exhibit.src_labeled : `/assets/${path.basename(sc.exhibit.src_labeled)}`;
    }

    let secondaryAssetUrl = null;
    if (sc.secondaryAssetUrl) {
      secondaryAssetUrl = sc.secondaryAssetUrl;
    } else if (sc.secondaryExhibit?.src) {
      secondaryAssetUrl = sc.secondaryExhibit.src.startsWith('/assets/') ? sc.secondaryExhibit.src : `/assets/${path.basename(sc.secondaryExhibit.src)}`;
    }

    const citation = extractCitation(sc);
    const financialMetric = extractFinancialMetric(sc);

    return {
      index,
      id,
      startMs,
      endMs,
      durationMs,
      startTime: startMs / 1000,
      endTime: endMs / 1000,
      duration: durationMs / 1000,
      narration,
      subtitle,
      chapterTitle,
      layout,
      resolvedEngine,
      visualPrompt: sc.visualPrompt || narration,
      vectorHtml,
      assetUrl,
      assetUrlLabeled,
      secondaryAssetUrl,
      isTestMode: isSceneTestMode,
      cleanPrompt,
      systemTag,
      citation,
      financialMetric,
      sub_cues: sc.sub_cues || sc.visual_cues || [],
      visual_cues: sc.visual_cues || sc.sub_cues || [],
      data: sc.data !== undefined ? sc.data : null,
      annotation: sc.annotation !== undefined ? sc.annotation : null
    };
  });

  const totalDurationMs = processedScenes.length > 0
    ? Math.max(timings.duration ? timings.duration * 1000 : 0, processedScenes[processedScenes.length - 1].endMs)
    : (timings.duration ? timings.duration * 1000 : 10000);

  // Compile CSS Variables and Layers 0, 1, 2 HTML
  const cssVariables = compileStyleCssVariables(styleProfile);
  const brandLayersHtml = renderBrandBackgroundLayerHtml(styleProfile, channelProfile, aspectRatio);

  // Initial Scene Markup for Layer 3 (Active Scene Only)
  const initialSceneMarkup = processedScenes.length > 0
    ? renderSceneMarkup(processedScenes[0], channelTag)
    : '';

  // Layer 5 Subtitles HTML (omitted when subtitles are disabled)
  const subtitlesHtml = subtitlesEnabled
    ? `<div id="layer-5-subtitles" class="subtitle-layer ${subtitleMode}">
  <div id="subtitle-box" class="subtitle-box ${subtitleMode}"></div>
</div>`
    : '';

  const scenesJson = JSON.stringify(processedScenes);
  const timingsJson = JSON.stringify(timings.words || []);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(channelProfile?.name || 'Stage')} - AI-nimate Documentary Stage</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

    ${cssVariables}

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body, html {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background-color: var(--bg-primary);
      font-family: var(--font-sans);
      color: var(--text-primary);
      position: relative;
    }

    /* 2px Documentary Top Progress Bar */
    #doc-progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 2px;
      width: 0%;
      background: linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-accent) 100%);
      box-shadow: 0 0 8px var(--brand-primary);
      z-index: 1000;
      pointer-events: none;
      transition: width 0.08s linear;
    }

    /* LAYER 3: Central Visual Exhibit Viewport (Active Scene Only) */
    #layer-3-sandbox, #stage-viewport {
      position: absolute;
      top: 48px;
      left: 4%;
      width: 92%;
      height: ${layer3Height};
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-sizing: border-box;
    }

    .scene-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Layout 1: Hero Centered Exhibit */
    .scene-container.layout-hero .exhibit-image {
      max-width: ${isShort ? '82%' : '62%'};
      max-height: ${isShort ? '56%' : '72%'};
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: contrast(1.05);
      will-change: transform;
    }

    /* Layout 2: Fullscreen / Fullsize Cinematic Exhibit */
    .scene-container.layout-fullscreen,
    .scene-container.layout-fullsize,
    .scene-container.layout-fullbleed {
      width: 100%;
      height: 100%;
    }
    .scene-container.layout-fullsize .exhibit-image,
    .scene-container.layout-fullscreen .exhibit-image,
    .scene-container.layout-fullbleed .exhibit-image {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      filter: contrast(1.02) brightness(0.96);
      will-change: transform;
    }
    .scene-container.layout-fullsize::after,
    .scene-container.layout-fullscreen::after,
    .scene-container.layout-fullbleed::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.35) 25%, transparent 50%);
      z-index: 5;
    }

    /* Layout 3: Split 2-Pane Exhibit */
    .scene-container.layout-split {
      display: flex;
      flex-direction: ${isShort ? 'column' : 'row'};
      align-items: center;
      justify-content: center;
      gap: ${isShort ? '32px' : '64px'};
      padding: ${isShort ? '80px 40px' : '40px 80px'};
    }
    .scene-container.layout-split .split-pane {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: ${isShort ? '90%' : '48%'};
      height: ${isShort ? '42%' : '80%'};
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

    /* Test Mode Visual Prompt Card Box */
    .test-prompt-card {
      background: var(--bg-surface);
      border: 2px dashed var(--brand-accent);
      border-radius: 14px;
      padding: ${isShort ? '28px 24px' : '36px 44px'};
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.12);
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
      border: 2px solid var(--brand-primary);
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.18);
    }
    .test-prompt-body {
      font-size: ${isShort ? '22px' : '26px'};
      line-height: 1.6;
      color: var(--text-primary);
      font-weight: 500;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .test-prompt-tag {
      background: var(--brand-primary);
      color: var(--bg-primary);
      padding: 4px 12px;
      border-radius: 6px;
      font-size: ${isShort ? '16px' : '20px'};
      font-weight: 800;
      letter-spacing: 0.8px;
      margin-right: 12px;
      display: inline-block;
      vertical-align: middle;
      font-family: var(--font-mono);
    }
    .test-prompt-text {
      font-family: var(--font-sans);
    }

    /* Archival Stamp / Citation Badge */
    .archival-stamp-badge {
      position: absolute;
      top: ${isShort ? '24px' : '20px'};
      right: ${isShort ? '24px' : '28px'};
      background: var(--bg-surface);
      border: 1.5px solid var(--border-muted);
      border-radius: 8px;
      padding: ${isShort ? '8px 16px' : '7px 18px'};
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(8px);
      z-index: 35;
      pointer-events: none;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--brand-primary);
      box-shadow: 0 0 6px var(--brand-primary);
      flex-shrink: 0;
    }
    .badge-text {
      font-family: var(--font-mono);
      font-size: ${isShort ? '13px' : '14px'};
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text-primary);
    }

    /* Financial Metric Callout / Odometer Card */
    .financial-metric-card {
      position: absolute;
      left: ${isShort ? '32px' : '48px'};
      bottom: ${isShort ? '180px' : '40px'};
      background: var(--bg-surface);
      border: 1px solid var(--border-muted);
      border-left: 4px solid var(--brand-primary);
      border-radius: 12px;
      padding: ${isShort ? '14px 20px' : '16px 24px'};
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(12px);
      z-index: 45;
      min-width: ${isShort ? '220px' : '260px'};
      max-width: ${isShort ? '320px' : '360px'};
      pointer-events: none;
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
      background: var(--brand-accent);
      box-shadow: 0 0 6px var(--brand-accent);
      flex-shrink: 0;
    }
    .metric-label {
      font-family: var(--font-sans);
      font-size: ${isShort ? '11px' : '12px'};
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .metric-value {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: ${isShort ? '28px' : '34px'};
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .metric-subnote {
      font-family: var(--font-sans);
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    /* LAYER 4: Optical Vignette Overlay */
    #layer-4-vignette {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 40;
      opacity: ${vignetteStrength};
      background: radial-gradient(circle at 50% 50%, transparent 50%, rgba(0, 0, 0, 0.75) 100%);
    }

    /* LAYER 5: Subtitles */
    #layer-5-subtitles, #subtitle-anchor {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 48px;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;
      pointer-events: none;
    }
    .subtitle-layer.karaoke-word {
      z-index: 50;
    }

    /* kinetic-pill mode */
    .subtitle-layer.kinetic-pill .subtitle-box,
    .subtitle-pill {
      background: var(--bg-surface);
      border: 1.5px solid var(--border-muted);
      border-radius: 40px;
      padding: ${isShort ? '14px 32px' : '12px 36px'};
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(10px);
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: ${isShort ? '90%' : '75%'};
      min-height: ${isShort ? '68px' : '60px'};
    }

    /* broadcast-lower mode */
    .subtitle-layer.broadcast-lower {
      bottom: 0 !important;
      width: 100%;
    }
    .subtitle-layer.broadcast-lower .subtitle-box {
      width: 100%;
      padding: 16px 48px;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(15, 23, 42, 0.88) 35%, rgba(15, 23, 42, 0.98) 100%);
      border-top: 1px solid var(--border-muted);
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .subtitle-layer.broadcast-lower .subtitle-word {
      font-family: var(--font-sans);
      font-size: 26px;
      color: #f8fafc;
    }

    /* karaoke-word mode */
    .subtitle-layer.karaoke-word .subtitle-box {
      background: var(--bg-surface);
      border: 2px solid var(--brand-primary);
      border-radius: 40px;
      padding: 14px 40px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
      backdrop-filter: blur(12px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Subtitle Word Tokens */
    .subtitle-word {
      display: inline-block;
      margin: 0 7px;
      font-family: var(--font-sans);
      font-size: ${isShort ? '34px' : '30px'};
      font-weight: 800;
      letter-spacing: -0.4px;
      transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1),
                  color 0.12s ease,
                  opacity 0.15s ease;
      white-space: nowrap;
    }
    .subtitle-word.spoken {
      color: var(--text-primary);
      opacity: 0.85;
      transform: translateY(0) scale(1);
    }
    .subtitle-word.active {
      color: var(--brand-primary);
      transform: translateY(-2px) scale(1.08);
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
      font-weight: 900;
      opacity: 1;
    }
    .subtitle-word.upcoming {
      color: var(--text-secondary);
      opacity: 0.45;
      transform: translateY(0) scale(0.98);
    }

    /* Pre-Injected Motion Primitives CSS Utility Kit (Vector Scenes) */
    .vec-grid {
      background-image: linear-gradient(var(--grid-line) 1px, transparent 1px),
                        linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .vec-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-muted);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
    }
    .vec-stat-huge {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .vec-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid var(--border-muted);
      background: var(--bg-secondary);
      color: var(--brand-primary);
    }
    .vec-flow-arrow {
      stroke-dasharray: 8 8;
      stroke-dashoffset: calc(-32px * var(--scene-progress, 0));
    }
    .vec-bar-fill {
      transform-origin: left;
      transform: scaleX(var(--scene-progress, 0));
      transition: none;
    }
    .vec-draw-path {
      stroke-dasharray: 1000;
      stroke-dashoffset: calc(1000 * (1 - var(--scene-progress, 0)));
    }
    .vec-pan-zoom {
      will-change: transform;
      transform: scale(calc(1.0 + 0.05 * var(--scene-progress, 0)))
                 translateY(calc(-8px * var(--scene-progress, 0)));
    }

    /* Intra-Beat Progressive Sub-Cue Micro-Events */
    [data-subcue-progress] {
      transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .subcue-pending {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    .subcue-active {
      opacity: 1 !important;
      visibility: visible !important;
    }
  </style>
</head>
<body>

  <!-- Top 2px Progress Bar -->
  <div id="doc-progress-bar"></div>

  <!-- LAYERS 0, 1, 2: Brand Background, Watermark, Documentary Chrome -->
  ${brandLayersHtml}

  <!-- LAYER 3: Central Visual Exhibit Viewport (Active Scene Only) -->
  <div id="layer-3-sandbox">
    ${initialSceneMarkup}
  </div>

  <!-- LAYER 4: Optical Vignette Overlay -->
  <div id="layer-4-vignette"></div>

  <!-- LAYER 5: Subtitles (Conditionally Mounted) -->
  ${subtitlesHtml}

  <script>
    window.__SCENES__ = ${scenesJson};
    window.__TIMINGS__ = ${timingsJson};
    window.__TOTAL_DURATION_MS__ = ${totalDurationMs};
    window.__IS_SHORT__ = ${isShort};
    window.__SUBTITLES_ENABLED__ = ${subtitlesEnabled};
    window.__SUBTITLE_MODE__ = '${subtitleMode}';
    window.__CHANNEL_TAG__ = '${channelTag}';
    window.__currentTimeMs = 0;
    window.__mountedSceneId = '${processedScenes[0]?.id || ''}';
    window.__MANUAL_SEEK_MODE__ = false;

    function escapeHtmlClient(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function cleanWord(str) {
      if (!str) return '';
      return str
        .replace(/\\[([^\\|\\]]+)\\|[^\\]]+\\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
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

    function renderClientSceneHtml(sc) {
      if (!sc) return '';
      if (sc.isTestMode) {
        const isFull = sc.layout === 'fullsize' || sc.layout === 'fullscreen';
        const isSplit = sc.layout === 'split';
        const cardCls = isFull ? 'card-fullscreen' : 'card-hero';
        const layoutCls = isFull ? 'layout-fullsize' : (isSplit ? 'layout-split' : 'layout-hero');
        return '<div class="scene-container ' + layoutCls + ' active" id="scene-' + sc.id + '">' +
          '<div class="test-prompt-card ' + cardCls + '">' +
            '<div class="test-prompt-body">' +
              '<span class="test-prompt-tag">' + (sc.systemTag || '[SYSTEM_PROMPT_' + window.__CHANNEL_TAG__ + ']') + '</span>' +
              '<span class="test-prompt-text"> ' + escapeHtmlClient(sc.cleanPrompt || sc.narration || 'Scene visual asset prompt') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      if (sc.resolvedEngine === 'vector-html' && sc.vectorHtml) {
        return '<div class="scene-container layout-vector active" id="scene-' + sc.id + '" style="width: 100%; height: 100%;">' +
          sc.vectorHtml +
        '</div>';
      }

      let badgesHtml = '';
      if (sc.citation) {
        badgesHtml += '<div class="archival-stamp-badge"><span class="badge-dot"></span><span class="badge-text">' + escapeHtmlClient(sc.citation) + '</span></div>';
      }
      if (sc.financialMetric) {
        badgesHtml += '<div class="financial-metric-card" id="metric-card-' + sc.id + '">' +
          '<div class="metric-card-header"><span class="metric-pill-dot"></span><span class="metric-label">' + escapeHtmlClient(sc.financialMetric.label) + '</span></div>' +
          '<div class="metric-value" data-target="' + escapeHtmlClient(sc.financialMetric.value) + '">' + escapeHtmlClient(sc.financialMetric.value) + '</div>' +
          (sc.financialMetric.note ? '<div class="metric-subnote">' + escapeHtmlClient(sc.financialMetric.note) + '</div>' : '') +
        '</div>';
      }
      const cues = (Array.isArray(sc.sub_cues) && sc.sub_cues.length > 0)
        ? sc.sub_cues
        : ((Array.isArray(sc.visual_cues) && sc.visual_cues.length > 0) ? sc.visual_cues : []);
      if (cues.length > 0) {
        badgesHtml += '<div class="subcue-container" style="position: absolute; bottom: 28px; right: 28px; z-index: 38; display: flex; flex-direction: column; gap: 8px; pointer-events: none;">' +
          cues.map((cue, idx) => {
            const prog = typeof cue === 'object' && cue.progress !== undefined
              ? cue.progress
              : (cues.length > 1 ? Number((idx / (cues.length - 1)).toFixed(2)) : 0.0);
            const label = typeof cue === 'object'
              ? (cue.label || cue.description || cue.action || cue.phrase || cue.concept || 'Micro Exhibit')
              : String(cue);
            const isHidden = prog > 0;
            return '<div class="subcue-badge ' + (isHidden ? 'subcue-pending' : 'subcue-active') + '" data-subcue-progress="' + prog + '" style="background: var(--bg-surface); border: 1px solid var(--border-muted); border-left: 3px solid var(--brand-accent); padding: 5px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1); backdrop-filter: blur(8px);"><span style="color: var(--brand-accent); margin-right: 6px;">[' + Math.round(prog * 100) + '%]</span>' + escapeHtmlClient(label) + '</div>';
          }).join('') +
        '</div>';
      }

      if (sc.layout === 'split') {
        const leftSrc = sc.assetUrl || '';
        const rightSrc = sc.secondaryAssetUrl || leftSrc;
        return '<div class="scene-container layout-split active" id="scene-' + sc.id + '">' +
          '<div class="split-pane split-left"><img class="exhibit-image" src="' + leftSrc + '" alt="' + escapeHtmlClient(sc.visualPrompt || 'Exhibit Left') + '"></div>' +
          '<div class="split-pane split-right"><img class="exhibit-image" src="' + rightSrc + '" alt="' + escapeHtmlClient(sc.visualPrompt || 'Exhibit Right') + '"></div>' +
          badgesHtml +
        '</div>';
      }

      if (sc.layout === 'fullsize' || sc.layout === 'fullscreen' || sc.layout === 'fullbleed') {
        const imgSrc = sc.assetUrl || '';
        return '<div class="scene-container layout-fullsize active" id="scene-' + sc.id + '">' +
          '<img class="exhibit-image" src="' + imgSrc + '" alt="' + escapeHtmlClient(sc.visualPrompt || 'Exhibit') + '">' +
          badgesHtml +
        '</div>';
      }

      // Default: layout-hero
      const imgSrc = sc.assetUrl || '';
      const labeledSrc = sc.assetUrlLabeled || '';
      return '<div class="scene-container layout-hero active" id="scene-' + sc.id + '">' +
        '<img class="exhibit-image exhibit-clean" src="' + imgSrc + '" alt="' + escapeHtmlClient(sc.visualPrompt || 'Exhibit') + '">' +
        (labeledSrc ? '<img class="exhibit-image exhibit-labeled" src="' + labeledSrc + '" alt="' + escapeHtmlClient(sc.visualPrompt || 'Exhibit Labeled') + '">' : '') +
        badgesHtml +
      '</div>';
    }

    window.__mountScene = function(scene) {
      if (!scene) return;
      const sandbox = document.getElementById('layer-3-sandbox');
      if (!sandbox) return;

      const chapterEl = document.getElementById('stage-chapter-title');
      if (chapterEl && scene.chapterTitle) {
        chapterEl.textContent = scene.chapterTitle;
      }

      sandbox.innerHTML = renderClientSceneHtml(scene);
      window.__mountedSceneId = scene.id;
      updateSubcues(0);
    };

    function updateSubcues(progress) {
      const sandbox = document.getElementById('layer-3-sandbox');
      if (!sandbox) return;
      const subcueElements = sandbox.querySelectorAll('[data-subcue-progress]');
      if (!subcueElements || subcueElements.length === 0) return;

      subcueElements.forEach(el => {
        const trigger = parseFloat(el.getAttribute('data-subcue-progress') || '0');
        if (progress >= trigger) {
          el.classList.add('subcue-active');
          el.classList.remove('subcue-pending');
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          if (!el.tagName.toLowerCase().match(/^(g|path|rect|text|svg|circle|polygon)$/)) {
            el.style.transform = 'none';
          }
        } else {
          el.classList.add('subcue-pending');
          el.classList.remove('subcue-active');
          el.style.opacity = '0';
          el.style.visibility = 'hidden';
          if (!el.tagName.toLowerCase().match(/^(g|path|rect|text|svg|circle|polygon)$/)) {
            el.style.transform = 'translateY(8px) scale(0.96)';
          }
        }
      });
    }

    function updateSceneMotion(sc, progress) {
      const sandbox = document.getElementById('layer-3-sandbox');
      if (!sandbox) return;
      const targets = sandbox.querySelectorAll('.exhibit-image, .test-prompt-card, .split-pane');
      if (!targets || targets.length === 0) return;

      const motionType = sc.cameraMotion || sc.motion || 'push-in';
      const e = 1 - Math.pow(1 - progress, 2.2);
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
        default:
          transformStr = 'scale(' + (1.01 + 0.04 * e) + ') translate(' + (-6 + 12 * e) + 'px, ' + (-10 * e) + 'px)';
          break;
      }
      targets.forEach(el => {
        el.style.transform = transformStr;
      });
    }

    function updateOdometer(progress) {
      const sandbox = document.getElementById('layer-3-sandbox');
      if (!sandbox) return;
      const cardValEl = sandbox.querySelector('.metric-value');
      if (!cardValEl) return;
      const originalStr = cardValEl.getAttribute('data-target');
      if (!originalStr) return;

      const parts = parseNumericParts(originalStr);
      if (!parts) {
        cardValEl.textContent = originalStr;
        return;
      }
      const animProgress = Math.min(1, progress / 0.35);
      if (animProgress >= 1) {
        cardValEl.textContent = parts.original;
        return;
      }
      const ease = 1 - Math.pow(1 - animProgress, 3);
      const currentNum = (parts.targetNum * ease).toFixed(parts.decimalPlaces);
      const displayNum = parts.useComma ? currentNum.replace('.', ',') : currentNum;
      cardValEl.textContent = parts.prefix + displayNum + parts.suffix;
    }

    function updateProgressBar(timeMs) {
      const bar = document.getElementById('doc-progress-bar');
      if (!bar) return;
      const pct = Math.min(100, Math.max(0, (timeMs / Math.max(1, window.__TOTAL_DURATION_MS__)) * 100));
      bar.style.width = pct + '%';
    }

    function renderSceneSubtitlesFallback(rawText, progressPct) {
      const subtitleBox = document.getElementById('subtitle-box');
      if (!subtitleBox || !rawText) return;
      const clean = cleanWord(rawText);
      const words = clean.split(/\\s+/).filter(Boolean);
      if (words.length === 0) { subtitleBox.innerHTML = ''; return; }

      const windowSize = window.__IS_SHORT__ ? 4 : 6;
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

    window.__updateSubtitles = function(timeMs) {
      const subtitleBox = document.getElementById('subtitle-box');
      if (!subtitleBox) return;

      const seconds = timeMs / 1000;
      const timings = window.__TIMINGS__ || [];

      if (timings.length > 0) {
        let activeIdx = -1;
        for (let i = 0; i < timings.length; i++) {
          const t = timings[i];
          const start = t.start !== undefined ? t.start : (t.startMs / 1000);
          const end = t.end !== undefined ? t.end : (t.endMs / 1000);
          if (seconds >= start && seconds < end) {
            activeIdx = i;
            break;
          }
          if (start > seconds) {
            activeIdx = Math.max(0, i - 1);
            break;
          }
        }
        if (activeIdx === -1) {
          const last = timings[timings.length - 1];
          const lastStart = last.start !== undefined ? last.start : (last.startMs / 1000);
          activeIdx = seconds >= lastStart ? timings.length - 1 : 0;
        }

        const windowSize = window.__IS_SHORT__ ? 4 : 6;
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
        return;
      }

      const activeScene = window.__SCENES__.find(s => timeMs >= s.startMs && timeMs < s.endMs)
        || window.__SCENES__[window.__SCENES__.length - 1];
      if (activeScene && activeScene.narration) {
        const elapsed = Math.max(0, timeMs - activeScene.startMs);
        const progress = Math.min(1, elapsed / Math.max(1, activeScene.durationMs));
        renderSceneSubtitlesFallback(activeScene.narration, progress);
      } else {
        subtitleBox.innerHTML = '';
      }
    };

    window.__seekTo = function(timeMs) {
      window.__currentTimeMs = timeMs;
      window.__MANUAL_SEEK_MODE__ = true;
      const activeScene = window.__SCENES__.find(s => timeMs >= s.startMs && timeMs < s.endMs)
        || window.__SCENES__[window.__SCENES__.length - 1];
      if (activeScene) {
        if (window.__mountedSceneId !== activeScene.id) {
          window.__mountScene(activeScene);
          window.__mountedSceneId = activeScene.id;
        }
        const elapsed = Math.max(0, timeMs - activeScene.startMs);
        const progress = Math.min(1, elapsed / Math.max(1, activeScene.durationMs));
        const sandbox = document.getElementById('layer-3-sandbox');
        if (sandbox) {
          sandbox.style.setProperty('--scene-progress', progress.toFixed(4));
          sandbox.style.setProperty('--scene-elapsed-ms', elapsed + 'ms');
        }
        updateSceneMotion(activeScene, progress);
        updateOdometer(progress);
        updateSubcues(progress);
      }
      if (window.__SUBTITLES_ENABLED__) {
        window.__updateSubtitles(timeMs);
      }
      updateProgressBar(timeMs);
      return true;
    };

    // Shims for backward compatibility with legacy scripts
    window.seekToTime = function(seconds) {
      window.__seekTo(Math.round(seconds * 1000));
    };
    window.seekToBeat = function(target, progressPct = 0) {
      let idx = typeof target === 'number' ? target : window.__SCENES__.findIndex(s => s.id === target);
      if (idx < 0) idx = 0;
      const sc = window.__SCENES__[idx];
      const targetTimeMs = sc ? (sc.startMs + (progressPct * sc.durationMs)) : 0;
      window.__seekTo(targetTimeMs);
    };
    window.startStage = function() {
      window.__MANUAL_SEEK_MODE__ = false;
      window.__playbackStartTime = performance.now();
      window.__seekTo(0);
    };

    // Real-time animation loop for normal browser preview
    let rafStartTime = null;
    function stepToInternalTime(timeMs) {
      const activeScene = window.__SCENES__.find(s => timeMs >= s.startMs && timeMs < s.endMs)
        || window.__SCENES__[window.__SCENES__.length - 1];
      if (activeScene) {
        if (window.__mountedSceneId !== activeScene.id) {
          window.__mountScene(activeScene);
          window.__mountedSceneId = activeScene.id;
        }
        const elapsed = Math.max(0, timeMs - activeScene.startMs);
        const progress = Math.min(1, elapsed / Math.max(1, activeScene.durationMs));
        const sandbox = document.getElementById('layer-3-sandbox');
        if (sandbox) {
          sandbox.style.setProperty('--scene-progress', progress.toFixed(4));
          sandbox.style.setProperty('--scene-elapsed-ms', elapsed + 'ms');
        }
        updateSceneMotion(activeScene, progress);
        updateOdometer(progress);
        updateSubcues(progress);
      }
      if (window.__SUBTITLES_ENABLED__) {
        window.__updateSubtitles(timeMs);
      }
      updateProgressBar(timeMs);
    }

    function tick(timestamp) {
      if (!rafStartTime) rafStartTime = timestamp;
      if (!window.__MANUAL_SEEK_MODE__) {
        const elapsedMs = timestamp - rafStartTime;
        stepToInternalTime(elapsedMs);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Signal stage initialization complete
    window.__STAGE_READY = true;
  </script>
</body>
</html>`;
}

/**
 * Writes deterministic stage HTML file to disk, preserving backward compatibility.
 * 
 * @param {Array|Object} storyboard
 * @param {string} outputPath
 * @param {Object} [options={}]
 * @returns {string} Generated stage HTML
 */
function writeStageFile(storyboard, outputPath, options = {}) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const html = generateStageHtml(storyboard, options);
  fs.writeFileSync(outputPath, html, 'utf8');
  return html;
}

module.exports = {
  generateStageHtml,
  writeStageFile,
  resolveAssetAsDataUri,
  resolveAssetUri: resolveAssetAsDataUri,
  extractCitation,
  extractFinancialMetric,
  extractCleanPrompt
};
