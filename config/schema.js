/**
 * AI-nimate Canonical Configuration Schemas & Normalization
 * 
 * Provides canonical validation, defaults, and normalization for:
 * - PipelineConfig
 * - ChannelProfile
 * - StyleProfile
 */

const VALID_VISUAL_ENGINES = ['vector-html', 'ai-image', 'hybrid'];
const VALID_SUBTITLE_MODES = ['off', 'kinetic-pill', 'broadcast-lower', 'karaoke-word'];
const VALID_ASPECT_RATIOS = ['16:9', '9:16'];

/**
 * Resolves and normalizes subtitle configuration
 * 
 * @param {boolean|string|Object} rawSub
 * @param {Object} [variantSpec]
 * @returns {{ enabled: boolean, mode: string, position: string }}
 */
function resolveSubtitles(rawSub, variantSpec = null) {
  const defaultMode = (variantSpec && variantSpec.defaultSubtitles && VALID_SUBTITLE_MODES.includes(variantSpec.defaultSubtitles))
    ? variantSpec.defaultSubtitles
    : 'kinetic-pill';

  if (rawSub === false || rawSub === 'off' || rawSub === 'false' || rawSub === 'none') {
    return { enabled: false, mode: 'off', position: 'bottom' };
  }
  if (rawSub === true || rawSub === 'true') {
    const mode = defaultMode === 'off' ? 'kinetic-pill' : defaultMode;
    return { enabled: true, mode, position: 'bottom' };
  }
  if (typeof rawSub === 'string') {
    const trimmed = rawSub.trim().toLowerCase();
    if (trimmed === 'off' || trimmed === 'false' || trimmed === 'none') {
      return { enabled: false, mode: 'off', position: 'bottom' };
    }
    if (VALID_SUBTITLE_MODES.includes(trimmed)) {
      return { enabled: true, mode: trimmed, position: 'bottom' };
    }
    return { enabled: true, mode: defaultMode, position: 'bottom' };
  }
  if (typeof rawSub === 'object' && rawSub !== null) {
    let mode = rawSub.mode;
    if (!mode || !VALID_SUBTITLE_MODES.includes(mode)) {
      mode = rawSub.enabled === false ? 'off' : defaultMode;
    }
    let enabled = rawSub.enabled;
    if (mode === 'off') {
      enabled = false;
    } else if (typeof enabled !== 'boolean') {
      enabled = true;
    }
    const position = rawSub.position === 'center' ? 'center' : 'bottom';
    return { enabled, mode, position };
  }

  // Undefined or omitted
  if (defaultMode === 'off') {
    return { enabled: false, mode: 'off', position: 'bottom' };
  }
  return { enabled: true, mode: defaultMode, position: 'bottom' };
}

/**
 * Normalizes user input and channel/variant defaults into a deterministic PipelineConfig
 * 
 * @param {Object} [rawInput={}]
 * @param {Object} [channelProfile=null]
 * @returns {Object} Complete PipelineConfig object
 */
function normalizePipelineConfig(rawInput = {}, channelProfile = null) {
  const channelId = rawInput.channelId || rawInput.channel || channelProfile?.id || 'kausalmedia';
  const videoVariant = rawInput.videoVariant || rawInput.variant || channelProfile?.defaultVariant || 'forensic-autopsy';
  const variantSpec = channelProfile?.variants?.[videoVariant] || null;
  const styleId = rawInput.styleId || rawInput.style || channelProfile?.defaultStyle || 'kausalmedia';

  // Aspect ratio resolution & validation
  const candidateAspect = rawInput.aspectRatio || rawInput.aspect || variantSpec?.aspectRatio || '16:9';
  const aspectRatio = VALID_ASPECT_RATIOS.includes(candidateAspect) ? candidateAspect : '16:9';

  // Visual engine resolution & validation
  const candidateEngine = rawInput.visualEngine || rawInput.engine || channelProfile?.defaultVisualEngine || 'hybrid';
  const visualEngine = VALID_VISUAL_ENGINES.includes(candidateEngine) ? candidateEngine : 'hybrid';

  // Subtitles
  const rawSubtitles = rawInput.subtitles !== undefined ? rawInput.subtitles : rawInput.subtitle;
  const subtitles = resolveSubtitles(rawSubtitles, variantSpec);

  // Audio configuration
  const audio = {
    source: rawInput.audio?.source || rawInput.audioSource || channelProfile?.voice?.source || 'edge-tts',
    voice: rawInput.audio?.voice || rawInput.voice || channelProfile?.voice?.voiceId || channelProfile?.voice?.voice || 'id-ID-ArdiNeural',
    rate: rawInput.audio?.rate || rawInput.rate || channelProfile?.voice?.rate || '+5%',
    duckingDb: Number(rawInput.audio?.duckingDb ?? rawInput.duckingDb ?? -22)
  };

  // Render optimization configuration
  const rawRender = rawInput.render || {};
  const rawFps = Number(rawRender.fps ?? rawInput.fps ?? 24);
  const rawQuality = Number(rawRender.jpegQuality ?? rawInput.jpegQuality ?? 85);
  const rawThreads = Number(rawRender.ffmpegThreads ?? rawInput.ffmpegThreads ?? 2);
  const rawHeap = Number(rawRender.chromiumMaxHeapMb ?? rawInput.chromiumMaxHeapMb ?? 512);

  const render = {
    fps: Math.min(60, Math.max(15, Number.isFinite(rawFps) ? rawFps : 24)),
    jpegQuality: Math.min(95, Math.max(50, Number.isFinite(rawQuality) ? rawQuality : 85)),
    ffmpegThreads: Math.min(4, Math.max(1, Number.isFinite(rawThreads) ? rawThreads : 2)),
    chromiumMaxHeapMb: Math.min(768, Math.max(256, Number.isFinite(rawHeap) ? rawHeap : 512))
  };

  const jobId = (rawInput.jobId && String(rawInput.jobId).trim()) || `job-${Date.now()}`;
  const topic = (rawInput.topic && String(rawInput.topic).trim()) || (rawInput.title && String(rawInput.title).trim()) || 'Untitled Documentary';

  return {
    jobId,
    topic,
    channelId,
    videoVariant,
    styleId,
    aspectRatio,
    visualEngine,
    subtitles,
    audio,
    render,
    forceResearch: Boolean(rawInput.forceResearch || false)
  };
}

/**
 * Validates a channel profile against architectural constraints
 * 
 * @param {Object} profile
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateChannelProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Channel profile must be a non-null object'] };
  }

  if (!profile.id || typeof profile.id !== 'string') {
    errors.push("Missing required string field 'id'");
  }
  if (!profile.name || typeof profile.name !== 'string') {
    errors.push("Missing required string field 'name'");
  }

  if (profile.defaultVisualEngine && !VALID_VISUAL_ENGINES.includes(profile.defaultVisualEngine)) {
    errors.push(`Invalid defaultVisualEngine: "${profile.defaultVisualEngine}". Allowed: ${VALID_VISUAL_ENGINES.join(', ')}`);
  }

  if (profile.variants && typeof profile.variants === 'object') {
    for (const [key, variant] of Object.entries(profile.variants)) {
      if (!variant || typeof variant !== 'object') {
        errors.push(`Variant "${key}" must be an object`);
      } else if (variant.aspectRatio && !VALID_ASPECT_RATIOS.includes(variant.aspectRatio)) {
        errors.push(`Variant "${key}" has invalid aspectRatio: "${variant.aspectRatio}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a style profile against architectural constraints
 * 
 * @param {Object} style
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateStyleProfile(style) {
  const errors = [];
  if (!style || typeof style !== 'object') {
    return { valid: false, errors: ['Style profile must be a non-null object'] };
  }

  if (!style.id || typeof style.id !== 'string') {
    errors.push("Missing required string field 'id'");
  }
  if (!style.name || typeof style.name !== 'string') {
    errors.push("Missing required string field 'name'");
  }

  if (style.palette && typeof style.palette !== 'object') {
    errors.push("Field 'palette' must be an object when present");
  }
  if (style.typography && typeof style.typography !== 'object') {
    errors.push("Field 'typography' must be an object when present");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parses CLI command-line arguments into a partial PipelineConfig
 * 
 * @param {string[]} [argv=process.argv.slice(2)]
 * @returns {Object} Partial PipelineConfig
 */
function parseCliArgsToConfig(argv = process.argv.slice(2)) {
  const result = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let key = arg;
    let val = null;

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        key = arg.slice(0, eqIdx);
        val = arg.slice(eqIdx + 1);
      } else if (arg === '--no-subtitles') {
        key = arg;
        val = null;
      } else {
        key = arg;
        if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          val = argv[++i];
        }
      }
    } else {
      continue;
    }

    switch (key) {
      case '--channel':
      case '--channel-id':
      case '--channelId':
        if (val) result.channelId = val;
        break;
      case '--variant':
      case '--video-variant':
      case '--videoVariant':
        if (val) result.videoVariant = val;
        break;
      case '--style':
      case '--style-id':
      case '--styleId':
        if (val) result.styleId = val;
        break;
      case '--visual-engine':
      case '--visualEngine':
      case '--engine':
        if (val) result.visualEngine = val;
        break;
      case '--subtitles':
        if (val === 'false' || val === 'off' || val === 'none') {
          result.subtitles = false;
        } else if (val === 'true') {
          result.subtitles = true;
        } else if (val) {
          result.subtitles = val;
        }
        break;
      case '--no-subtitles':
        result.subtitles = false;
        break;
      case '--aspect':
      case '--aspect-ratio':
      case '--aspectRatio':
        if (val) result.aspectRatio = val;
        break;
      case '--topic':
      case '--title':
        if (val) result.topic = val;
        break;
      case '--fps':
        if (val !== null && val !== undefined) {
          result.render = result.render || {};
          result.render.fps = Number(val);
        }
        break;
      case '--voice':
        if (val) {
          result.audio = result.audio || {};
          result.audio.voice = val;
        }
        break;
      case '--job-id':
      case '--jobId':
        if (val) result.jobId = val;
        break;
      case '--force-research':
      case '--forceResearch':
        result.forceResearch = true;
        break;
    }
  }

  return result;
}

module.exports = {
  VALID_VISUAL_ENGINES,
  VALID_SUBTITLE_MODES,
  VALID_ASPECT_RATIOS,
  normalizePipelineConfig,
  validateChannelProfile,
  validateStyleProfile,
  parseCliArgsToConfig
};
