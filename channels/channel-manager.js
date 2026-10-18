/**
 * AI-nimate Channel Profile & Future Channel Tracker
 * 
 * Manages channel-specific branding, light/dark modes, cultural references,
 * asset repetition limits (<= 3x per video), and anti-YouTube flagging protocols.
 */

const fs = require('fs');
const path = require('path');

const CHANNELS_DIR = path.resolve(__dirname, '..', 'channels');

function ensureDir() {
  if (!fs.existsSync(CHANNELS_DIR)) {
    fs.mkdirSync(CHANNELS_DIR, { recursive: true });
  }
}

/**
 * List all registered channel profiles
 * @param {boolean} activeOnly - If true, only return channels with active !== false
 */
function listChannels(activeOnly = true) {
  ensureDir();
  const files = fs.readdirSync(CHANNELS_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    try {
      const fullPath = path.join(CHANNELS_DIR, file);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (activeOnly && data.active === false) {
        return null;
      }
      return {
        id: data.id || file.replace('.json', ''),
        name: data.name || data.id,
        handle: data.handle || '',
        active: data.active !== false,
        platform: data.platform || 'YouTube',
        mode: data.mode || 'light-mode',
        theme: data.aestheticVibe?.theme || '',
        maxAssetRepetition: data.rules?.maxAssetRepetitionPerVideo || 5,
        style: data.style || 'investigative-documentary',
        defaultFormat: data.defaultFormat || '16:9',
        suggestions: data.suggestions || [],
        description: data.description || '',
        file
      };
    } catch (_) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Retrieve full channel profile by ID
 */
function getChannel(id) {
  ensureDir();
  if (!id) return null;
  const channelId = String(id).trim().toLowerCase().replace(/\.json$/, '');
  const filePath = path.join(CHANNELS_DIR, `${channelId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`[ChannelManager] Failed to read ${filePath}: ${e.message}`);
    }
  }
  return null;
}

/**
 * Create a new channel profile
 */
function createChannel({
  id,
  name,
  handle = '',
  description = '',
  platform = 'YouTube',
  mode = 'light-mode',
  style = 'investigative-documentary',
  defaultFormat = '16:9',
  theme = 'Custom Theme'
}) {
  ensureDir();
  const channelId = String(id || name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!channelId) throw new Error('Valid channel ID or name required');

  const filePath = path.join(CHANNELS_DIR, `${channelId}.json`);
  if (fs.existsSync(filePath)) {
    throw new Error(`Channel '${channelId}' already exists.`);
  }

  const profile = {
    id: channelId,
    name: name || channelId,
    handle: handle || `@${channelId}`,
    active: true,
    platform,
    mode,
    style,
    defaultFormat,
    description: description || `Investigative content for ${name || channelId}`,
    aestheticVibe: {
      theme: theme || 'Archival Investigative Journal',
      texture: 'aged-papyrus-fibers',
      paperTone: '#faf6ee',
      paperSecondary: '#f4ede0',
      batikMotif: 'batik-parang-rusak',
      batikWatermarkOpacity: 0.08,
      vignette: 'ancient-oil-lamp',
      edges: 'deckled-torn-papyrus',
      seals: 'cinnabar-wax-stamp'
    },
    palette: {
      name: 'vintage-documentary',
      bg: '#faf6ee',
      cardBg: '#fffdf8',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      accent: '#b45309',
      border: 'rgba(41, 37, 36, 0.16)'
    },
    typography: {
      headlineFont: "'Plus Jakarta Sans', Georgia, serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      monoFont: "'JetBrains Mono', monospace",
      subtitles: {
        style: 'papyrus-pill',
        position: 'bottom-center',
        activeWordColor: '#b45309',
        fontSize: '30px'
      }
    },
    rules: {
      visualPhilosophy: 'show-not-tell',
      allowSlideText: false,
      onlySubtitlesHaveText: true,
      continuousFlow: true,
      zeroChapterBumpers: true,
      maxAssetRepetitionPerVideo: 5
    },
    audio: {
      voice: 'id-ID-ArdiNeural',
      cadenceWPM: 135
    },
    suggestions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
  return profile;
}

/**
 * Save or update a channel profile
 */
function saveChannel(id, profile) {
  ensureDir();
  const channelId = String(id).trim().toLowerCase().replace(/\.json$/, '');
  const filePath = path.join(CHANNELS_DIR, `${channelId}.json`);
  profile.id = channelId;
  profile.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
  return profile;
}

/**
 * Update channel profile with partial properties
 */
function updateChannel(id, updates = {}) {
  const existing = getChannel(id);
  if (!existing) throw new Error(`Channel '${id}' not found`);
  const merged = Object.assign({}, existing, updates, {
    updatedAt: new Date().toISOString()
  });
  return saveChannel(id, merged);
}

/**
 * Delete a channel profile (either soft-delete by setting active=false, or purge from disk)
 */
function deleteChannel(id, { purge = false } = {}) {
  ensureDir();
  const channelId = String(id).trim().toLowerCase().replace(/\.json$/, '');
  const filePath = path.join(CHANNELS_DIR, `${channelId}.json`);
  if (!fs.existsSync(filePath)) return null;

  const data = getChannel(channelId);
  if (purge) {
    fs.unlinkSync(filePath);
    return { ...data, deleted: true, purged: true };
  } else {
    data.active = false;
    saveChannel(channelId, data);
    return { ...data, deleted: true, purged: false };
  }
}

/**
 * Format channel profile for Telegram Markdown display
 */
function formatChannelTelegram(channelId) {
  const ch = getChannel(channelId);
  if (!ch) return `❌ Channel profile \`${channelId}\` not found.`;

  return `🏛️ *Channel Profile: ${ch.name}* (\`${ch.handle || ch.id}\`)\n` +
    `• *Mode*: \`${ch.mode}\`\n` +
    `• *Theme*: _${ch.aestheticVibe?.theme || 'Custom' }_\n` +
    `• *Paper/Canvas*: \`${ch.aestheticVibe?.paperTone}\` (${ch.aestheticVibe?.texture})\n` +
    `• *Batik Linework*: \`${ch.aestheticVibe?.batikMotif}\`\n` +
    `• *Asset Repetition Limit*: Strict max *${ch.rules?.maxAssetRepetitionPerVideo || 5}x* per video\n\n` +
    `🛡️ *Anti-YouTube Flagging System:*\n` +
    `• Hook Rotation: 4 Distinct empirical archetypes\n` +
    `• Cadence: Asymmetrical sentences (3-5w punches + 15w context)\n` +
    `• Acronyms: Bracketed phonetics [BEI|B-E-I]\n` +
    `• Anti-Slop: Zero unearned moralizing or AI filler phrases`;
}

module.exports = {
  CHANNELS_DIR,
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  saveChannel,
  formatChannelTelegram
};

