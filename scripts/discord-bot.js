#!/usr/bin/env node
/**
 * AI-nimate & Reefblast Fleet Unified Discord Bot Daemon
 * 
 * Provides Discord Slash Commands and Interactive Components for:
 * 1. Reefblast Fleet: Live telemetry for Cuang-Bot & Captain William, AM-GM skill tracking,
 *    inventory inspection, and zero-purchase safety monitoring.
 * 2. AI-Nimate Studio: Autonomous video workflow triggers, ledger inspection, HITL audio control,
 *    and multi-agent orchestration.
 * 3. Host & Server Telemetry: System resource usage and container health checks.
 */

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { execSync, exec } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env');

// --- Load Environment ---
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
  return { ...process.env, ...env };
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error('[UNCAUGHT EXCEPTION]', err, origin);
});

let SocksProxyAgent = null;
try {
  ({ SocksProxyAgent } = require('socks-proxy-agent'));
} catch (e) {
  console.warn('[Proxy Warning] socks-proxy-agent not loaded:', e.message);
}

const env = loadEnv();
const TOKEN = env.DISCORD_BOT_TOKEN;
const CLIENT_ID = env.DISCORD_CLIENT_ID || '1556512167535321189';
const AINIMATE_CHANNEL_ID = env.DISCORD_AINIMATE_CHANNEL_ID || '1558836057951182881';
const GUILD_ID = env.DISCORD_GUILD_ID || '1555473890640134237';

if (!TOKEN) {
  console.error('FATAL: DISCORD_BOT_TOKEN is not set in environment or .env!');
  process.exit(1);
}

// --- Import AI-Nimate Modules ---
const {
  loadWorkflows,
  getActiveWorkflow,
  getPastWorkflows,
  getWorkflow,
  cancelWorkflow,
  deleteWorkflow
} = require('./workflow-ledger');
const {
  startVideoProduction,
  stopVideoProduction,
  resumeWorkflowWithAudio,
  resumeWorkflowWithAudioSource,
  resumeWorkflowWithScript,
  reviseWorkflowScriptWithGuidelines,
  deleteWorkflowEntirely,
  resumeOrStartWorkflow,
  getWorkflowLogs
} = require('./workflow-controller');
const {
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel
} = require('../channels/channel-manager');
const { getUnusedChannelIdeas, markIdeaUsed } = require('../channels/channel-ideas');
const { generateDailyTrendingIdeas } = require('./generate-trending-ideas');
const { listStyles } = require('../styles/style-manager');
const {
  MANDARIN_CHANNEL_ID,
  PACE_CONFIG,
  TRACK_CONFIG,
  loadMandarinLedger,
  saveMandarinLedger,
  getUserProfile,
  buildDailySession,
  buildMandarinLessonEmbedAndComponents,
  buildStatsEmbed,
  buildGeminiBaselineVoicePrompt,
  buildBaselineDiagnosticEmbedAndPrompt,
  buildInteractiveDiscordQuiz,
  gradeQuizAnswer,
  drawNextFlashcard,
  renderFlashcardEmbed,
  renderFlippedFlashcard,
  applySM2,
  gradeFlashcard,
  buildMainMenuEmbedAndComponents,
  ensureDailyProgress,
  startPlacementSession,
  handlePlacementAnswer,
  advanceToNextTier,
  concludePlacementSession,
  buildPlacementStepEmbed,
  renderPlacementStage,
  evaluatePlacementResult,
  finalizePlacementTest,
  switchTrack,
  parseAndRecordBaseline,
  sendDailyLessonToChannel,
  startMandarinDailyScheduler,
  handleMandarinChannelMessage
} = require('./mandarin-coach');

// --- Game Definitions Cache & Formatting ---
let gameDefsCache = null;
let gameDefsLastFetch = 0;

function fetchGameDefsSync() {
  return gameDefsCache;
}

function refreshGameDefs() {
  if (gameDefsCache && Date.now() - gameDefsLastFetch < 60 * 60 * 1000) {
    return Promise.resolve(gameDefsCache);
  }
  return new Promise((resolve) => {
    const req = https.get('https://greentea.id/reefblast/api/defs', { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j && j.weapons && j.boats) {
            gameDefsCache = j;
            gameDefsLastFetch = Date.now();
          }
        } catch (_) {}
        resolve(gameDefsCache);
      });
    });
    req.on('error', () => resolve(gameDefsCache));
    req.on('timeout', () => { req.destroy(); resolve(gameDefsCache); });
  });
}

const WEAPON_NAMES = {
  popper: 'Pea Popper',
  trispread: 'Tri-Spread Blaster',
  seeker: 'Heat Seeker',
  riftseeker: 'Rift Seeker',
  singularity: 'Singularity Cannon',
  wrath: "Leviathan's Wrath",
  krakenthirst: "Kraken's Thirst",
  abyssseeker: 'Abyssal Seeker',
  x_plague: 'Plague Storm',
  x_hexcoil: 'Hexfire Coil',
  x_hornet: 'Hornet Swarm',
  x_wraithlance: 'Wraith Lance',
  x_cataclysm: 'Cataclysm Lance'
};

function formatWeaponName(wId) {
  if (!wId) return 'None';
  const defs = fetchGameDefsSync();
  const wDef = defs?.weapons?.find(w => w.id === wId);
  if (wDef) {
    const tierBadge = wDef.tier >= 7 ? '★ [T7 EXP]' : (wDef.tier > 0 ? `[T${wDef.tier}]` : '[EX]');
    const traits = (wDef.traits || (wDef.kind ? [wDef.kind] : [])).filter(Boolean);
    const traitIcons = traits.map(t => {
      switch(t) {
        case 'homing': return '🎯';
        case 'explosive': return '💥';
        case 'lifesteal': return '🩸';
        case 'chain': return '⚡';
        case 'burn': return '🔥';
        case 'poison': return '🧪';
        case 'pierce': return '🏹';
        case 'spread': return '🪭';
        default: return '';
      }
    }).join('');
    return `${tierBadge} ${wDef.name}${traitIcons ? ' ' + traitIcons : ''}`;
  }
  return WEAPON_NAMES[wId] || wId.charAt(0).toUpperCase() + wId.slice(1);
}

function formatBoatName(bId) {
  if (!bId) return 'Default Raft';
  const defs = fetchGameDefsSync();
  const bDef = defs?.boats?.find(b => b.id === bId);
  if (bDef) {
    const tierBadge = bDef.tier >= 7 ? '★ [T7 EXP]' : (bDef.tier > 0 ? `[T${bDef.tier}]` : (bDef.exclusive ? '[EX]' : ''));
    return `${tierBadge ? tierBadge + ' ' : ''}${bDef.name} (${formatNumber(bDef.hp)} HP, ${bDef.def} DEF)`;
  }
  return bId.charAt(0).toUpperCase() + bId.slice(1);
}

const ZONE_NAMES = [
  'Coral Reef', 'Sunlit Shallows', 'Sunrise Kelp', 'Mangrove Maze', 'Amber Bay',
  'Stormbreak Sound', 'Frostbite Fjord', 'Glacier Rift', 'Midnight Trench', 'Bone Graveyard',
  'Sunken Crypt', 'Ghostlight Hollow', 'Alien Rift', 'Crystal Caverns', 'Toxic Bloom',
  'Magma Vents', 'Starfall Abyss', 'Nebula Drift', 'Void Maelstrom', "Leviathan's Throne"
];

function formatZoneDisplayName(rawZone) {
  if (!rawZone || rawZone === 'Harbor') return 'Harbor ⚓';
  const match = String(rawZone).match(/Zone\s*(\d+)/i);
  if (match) {
    const idx = parseInt(match[1], 10);
    const defs = fetchGameDefsSync();
    const zDef = defs?.zones?.[idx];
    const name = zDef?.name || ZONE_NAMES[idx] || `Zone ${idx}`;
    const levelStr = zDef?.level ? ` (Lv. ${zDef.level}+)` : '';
    const isMax = idx === 19;
    return `Zone ${idx}: ${name}${levelStr}${isMax ? ' 👑 [Max Zone 20/20]' : ''}`;
  }
  return rawZone;
}

function calcItemQuality(it) {
  if (!it || it.bound) return 0;
  if (typeof it.quality === 'number' && it.quality >= 0) return it.quality;
  const defs = fetchGameDefsSync();
  const rolls = defs?.rolls;
  const rAtk = rolls?.[0] || { min: -0.2, max: 0.5 };
  const rAspd = rolls?.[1] || { min: -0.2, max: 0.5 };
  const rCrit = rolls?.[2] || { min: -0.05, max: 0.15 };
  const bAtk = (it.atk - rAtk.min) / (rAtk.max - rAtk.min);
  const bAspd = (it.aspd - rAspd.min) / (rAspd.max - rAspd.min);
  const bCrit = (it.crit - rCrit.min) / (rCrit.max - rCrit.min);
  const q = Math.round(((bAtk + bAspd + bCrit) / 3) * 100);
  return Math.max(0, Math.min(100, q));
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

function formatDuration(ms) {
  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / (1000 * 60)) % 60);
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  return `${hrs}h ${min}m ${sec}s`;
}

function formatProgressBar(percent, length = 12) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// --- Docker Socket & Telemetry Engine (Zero-Allocation / Ultra-Fast Async) ---
const containerStatsCache = {};

function dockerRequest(method, reqPath, body = null, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const opts = {
      socketPath: '/var/run/docker.sock',
      path: reqPath,
      method,
      timeout: timeoutMs
    };
    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      };
    }
    const req = http.request(opts, (res) => {
      const bufs = [];
      res.on('data', c => bufs.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, data: Buffer.concat(bufs) });
      });
    });
    req.on('error', (err) => {
      resolve({ status: 500, data: Buffer.alloc(0), error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 408, data: Buffer.alloc(0), error: 'Timeout' });
    });
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function fetchContainerStatusJson(containerName) {
  const res = await dockerRequest('GET', `/containers/${containerName}/archive?path=%2Fapp%2Flogs%2Fstatus.json`, null, 3000);
  if (res.status !== 200 || res.data.length < 512) return null;
  try {
    const sizeStr = res.data.slice(124, 136).toString('utf-8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeStr, 8);
    if (!size || size <= 0) return null;
    return JSON.parse(res.data.slice(512, 512 + size).toString('utf-8'));
  } catch (_) {
    return null;
  }
}

// --- Swarm Engine HTTP Client (Fast In-Memory RPC) ---
let activeSwarmHost = process.env.RB_SWARM_URL || 'http://reefblast-swarm:8989';

function makeHttpCall(baseUrl, method, reqPath, body = null, timeoutMs = 2500) {
  return new Promise((resolve) => {
    try {
      const u = new URL(reqPath, baseUrl);
      const isHttps = u.protocol === 'https:';
      const transport = isHttps ? https : http;
      const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

      const opts = {
        method,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        },
        timeout: timeoutMs
      };

      const req = transport.request(opts, (res) => {
        let str = '';
        res.on('data', chunk => str += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(str);
            resolve({ status: res.statusCode, data: parsed });
          } catch (_) {
            resolve({ status: res.statusCode, raw: str });
          }
        });
      });

      req.on('error', err => resolve({ status: 500, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 408, error: 'Swarm timeout' }); });

      if (postData) req.write(postData);
      req.end();
    } catch (err) {
      resolve({ status: 500, error: err.message });
    }
  });
}

// --- Discord Embed & Interaction Safety Helpers ---
function sanitizeEmbed(embed) {
  if (!embed) return embed;
  const data = embed.data || embed;
  let totalLength = 0;

  if (data.title) totalLength += data.title.length;
  if (data.description) totalLength += data.description.length;
  if (data.footer?.text) totalLength += data.footer.text.length;
  if (data.author?.name) totalLength += data.author.name.length;

  if (Array.isArray(data.fields)) {
    if (data.fields.length > 20) {
      const excess = data.fields.length - 19;
      data.fields = data.fields.slice(0, 19);
      data.fields.push({
        name: '📋 Remaining Items',
        value: `...and ${excess} more items omitted for display limits.`
      });
    }

    for (const f of data.fields) {
      if (f.name && f.name.length > 250) f.name = f.name.slice(0, 247) + '...';
      if (f.value && f.value.length > 1020) f.value = f.value.slice(0, 1017) + '...';
      totalLength += (f.name?.length || 0) + (f.value?.length || 0);
    }

    while (totalLength > 4800 && data.fields.length > 2) {
      const removed = data.fields.pop();
      totalLength -= (removed.name?.length || 0) + (removed.value?.length || 0);
    }
  }

  if (data.description && data.description.length > 3500) {
    data.description = data.description.slice(0, 3450) + '\n... *(description truncated)*';
  }

  return embed;
}

function sanitizeComponents(components) {
  if (!Array.isArray(components)) return components;
  const seenIds = new Set();
  for (const row of components) {
    if (!row) continue;
    const comps = row.components || (Array.isArray(row) ? row : null);
    if (!comps || !Array.isArray(comps)) continue;
    for (const comp of comps) {
      const data = comp.data || comp;
      if (data.custom_id) {
        let cid = String(data.custom_id).slice(0, 100);
        if (seenIds.has(cid)) {
          const suffix = `_${Math.floor(Math.random() * 899 + 100)}`;
          cid = `${cid.slice(0, 100 - suffix.length)}${suffix}`;
        }
        seenIds.add(cid);
        data.custom_id = cid;
      }
      if (Array.isArray(data.options)) {
        for (const opt of data.options) {
          if (opt.label && opt.label.length > 100) opt.label = opt.label.slice(0, 97) + '...';
          if (opt.description && opt.description.length > 100) opt.description = opt.description.slice(0, 97) + '...';
          if (opt.value && opt.value.length > 100) opt.value = opt.value.slice(0, 100);
        }
      }
    }
  }
  return components;
}

async function safeEditReply(interaction, payload) {
  try {
    if (payload.embeds) {
      payload.embeds = (Array.isArray(payload.embeds) ? payload.embeds : [payload.embeds])
        .filter(Boolean)
        .map(sanitizeEmbed);
    }
    if (payload.components) {
      payload.components = sanitizeComponents(payload.components);
    }
    if (!interaction.deferred && !interaction.replied) {
      if (typeof interaction.update === 'function') {
        return await interaction.update(payload);
      }
      if (typeof interaction.reply === 'function') {
        return await interaction.reply(payload);
      }
    }
    return await interaction.editReply(payload);
  } catch (err) {
    console.warn('[safeEditReply warn]:', err.message);
    if (err.code === 10062 || err.message?.includes('Unknown interaction')) {
      try {
        if (interaction.channel && typeof interaction.channel.send === 'function') {
          return await interaction.channel.send(payload);
        }
      } catch (_) {}
    }
    return null;
  }
}

function renderProgressBar(current, total, barLength = 16) {
  const safeTotal = Math.max(1, total);
  const percentage = Math.min(100, Math.max(0, Math.round((current / safeTotal) * 100)));
  const filledChars = Math.round((percentage / 100) * barLength);
  const emptyChars = barLength - filledChars;
  const bar = '█'.repeat(filledChars) + '░'.repeat(emptyChars);
  return `\`[${bar}]\` **${percentage}%** (\`${current}/${safeTotal}\`)`;
}

// --- Multi-Container Swarm Shard Architecture ---
const SWARM_SHARD_CAPACITY = 50;

class SwarmClusterManager {
  constructor() {
    this.shards = [
      { name: 'reefblast-swarm', internalHost: 'http://reefblast-swarm:8989', host: 'http://10.20.20.11:8989', port: 8989 },
      { name: 'reefblast-swarm-2', internalHost: 'http://reefblast-swarm-2:8990', host: 'http://10.20.20.11:8990', port: 8990 },
      { name: 'reefblast-swarm-3', internalHost: 'http://reefblast-swarm-3:8991', host: 'http://10.20.20.11:8991', port: 8991 },
      { name: 'reefblast-swarm-4', internalHost: 'http://reefblast-swarm-4:8992', host: 'http://10.20.20.11:8992', port: 8992 }
    ];
    this.botToShardMap = new Map();
  }

  async getShardStatus(shard) {
    const urls = [shard.internalHost, shard.host, `http://127.0.0.1:${shard.port}`];
    for (const url of urls) {
      const res = await makeHttpCall(url, 'GET', '/health', null, 1500);
      if (res && res.status === 200 && res.data?.ok) {
        return { running: true, count: res.data.total ?? 0, activeUrl: url };
      }
    }
    return { running: false, count: 0, activeUrl: null };
  }

  async ensureShardRunning(shardIndex = 2) {
    const shard = this.shards[shardIndex - 1];
    if (!shard) return null;

    const status = await this.getShardStatus(shard);
    if (status.running) return shard;

    const containerName = shard.name;
    const port = shard.port;
    console.log(`[SwarmCluster] Auto-launching secondary swarm shard: ${containerName} on port ${port}...`);
    try {
      execSync(`docker rm -f ${containerName} 2>/dev/null || true`);
      execSync(
        `docker run -d --name ${containerName} --network ai-nimate_default ` +
        `-p ${port}:${port} ` +
        `-e RB_SWARM_MODE=true ` +
        `-e RB_SWARM_PORT=${port} ` +
        `-e RB_SWARM_CONFIG=/app/fleet.json ` +
        `--restart unless-stopped ` +
        `reefblast-docker-reefblast-bot:latest ./reefblast-bot`,
        { timeout: 15000 }
      );
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 600));
        const check = await this.getShardStatus(shard);
        if (check.running) {
          console.log(`[SwarmCluster] Shard ${containerName} ready on port ${port}!`);
          return shard;
        }
      }
    } catch (err) {
      console.error(`[SwarmCluster] Error starting shard ${containerName}:`, err.message);
    }
    return null;
  }

  async getTargetShardForNewBot() {
    const s1 = await this.getShardStatus(this.shards[0]);
    if (s1.running && s1.count < SWARM_SHARD_CAPACITY) {
      return this.shards[0];
    }

    for (let i = 1; i < this.shards.length; i++) {
      const shard = this.shards[i];
      const st = await this.getShardStatus(shard);
      if (st.running && st.count < SWARM_SHARD_CAPACITY) {
        return shard;
      }
    }

    for (let i = 1; i < this.shards.length; i++) {
      const shard = this.shards[i];
      const st = await this.getShardStatus(shard);
      if (!st.running) {
        const launched = await this.ensureShardRunning(i + 1);
        if (launched) return launched;
      }
    }

    return this.shards[0];
  }

  async fetchAllShardsFleet() {
    const allBots = [];
    for (const shard of this.shards) {
      const urls = [shard.internalHost, shard.host, `http://127.0.0.1:${shard.port}`];
      let shardBots = null;
      for (const url of urls) {
        const res = await makeHttpCall(url, 'GET', '/fleet', null, 2500);
        if (res && res.status === 200 && Array.isArray(res.data?.bots)) {
          shardBots = res.data.bots;
          break;
        }
      }
      if (shardBots) {
        for (const b of shardBots) {
          b.shardName = shard.name;
          b.shardPort = shard.port;
          this.botToShardMap.set(b.key, shard);
          allBots.push(b);
        }
      }
    }
    return allBots;
  }

  async broadcastActionToAllShards(actionPath, payload) {
    const promises = this.shards.map(async (shard) => {
      const urls = [shard.internalHost, shard.host, `http://127.0.0.1:${shard.port}`];
      for (const u of urls) {
        const res = await makeHttpCall(u, 'POST', actionPath, payload, 3000);
        if (res && res.status >= 200 && res.status < 500) return res;
      }
      return { status: 503, error: `Shard ${shard.name} unreachable` };
    });
    return Promise.all(promises);
  }

  async sendShardAction(actionPath, payload, botKey = null) {
    if (botKey && this.botToShardMap.has(botKey)) {
      const shard = this.botToShardMap.get(botKey);
      const urls = [shard.internalHost, shard.host, `http://127.0.0.1:${shard.port}`];
      for (const u of urls) {
        const res = await makeHttpCall(u, 'POST', actionPath, payload, 3000);
        if (res && res.status >= 200 && res.status < 500) return res;
      }
    }

    if (!botKey) {
      const results = await this.broadcastActionToAllShards(actionPath, payload);
      const okRes = results.find(r => r && r.status >= 200 && r.status < 300);
      return okRes || results[0] || { status: 503, error: 'Swarm shards unreachable' };
    }

    for (const shard of this.shards) {
      const urls = [shard.internalHost, shard.host, `http://127.0.0.1:${shard.port}`];
      for (const u of urls) {
        const res = await makeHttpCall(u, 'POST', actionPath, payload, 2500);
        if (res && res.status >= 200 && res.status < 500) return res;
      }
    }
    return { status: 503, error: 'Swarm shards unreachable' };
  }
}

const swarmCluster = new SwarmClusterManager();

async function swarmRequest(method, reqPath, body = null, timeoutMs = 2500, botKey = null) {
  if (method === 'POST') {
    return swarmCluster.sendShardAction(reqPath, body, botKey);
  }
  const tryHosts = [activeSwarmHost, 'http://10.20.20.11:8989', 'http://127.0.0.1:8989'];
  const uniqueHosts = Array.from(new Set(tryHosts.filter(Boolean)));

  for (const host of uniqueHosts) {
    const res = await makeHttpCall(host, method, reqPath, body, timeoutMs);
    if (res && res.status >= 200 && res.status < 500) {
      activeSwarmHost = host;
      return res;
    }
  }
  return { status: 503, error: 'Swarm engine unreachable' };
}

const fleetStatusCache = {
  data: null,
  byKey: {},
  botKeys: ['cuang', 'william'],
  lastFetch: 0,
  inFlight: null
};

function getCachedFleetStatusesSync() {
  if (fleetStatusCache.data && fleetStatusCache.data.length > 0) {
    return fleetStatusCache.data;
  }
  const bots = fleetStatusCache.botKeys || ['cuang', 'william'];
  return bots.map((k, idx) => ({
    key: k,
    index: idx + 1,
    running: false,
    stopped: true,
    containerName: getContainerName(k),
    status: {
      ok: false,
      stopped: true,
      running: false,
      containerName: getContainerName(k),
      dockerUsage: 'Offline',
      me: { name: k, level: '?', coins: 0 }
    }
  }));
}

function getContainerStats(containerName) {
  if (containerStatsCache[containerName]) {
    return containerStatsCache[containerName];
  }
  return 'Active';
}

function isContainerRunning(containerName) {
  if (fleetStatusCache.data) {
    const found = fleetStatusCache.data.find(s => s.containerName === containerName || s.key === containerName.replace(/^reefblast-bot-/, ''));
    if (found) return found.running;
  }
  return false;
}

function isBotRunning(botKey) {
  if (fleetStatusCache.data) {
    const found = fleetStatusCache.data.find(s => s.key === botKey);
    if (found) return found.running && !found.stopped;
  }
  return isContainerRunning(getContainerName(botKey));
}

function getContainerName(botKey) {
  if (!botKey || botKey === 'cuang') return 'reefblast-bot';
  if (botKey.startsWith('reefblast-bot')) return botKey;
  return `reefblast-bot-${botKey}`;
}

function listFleetBots() {
  if (fleetStatusCache.botKeys && fleetStatusCache.botKeys.length > 0) {
    return fleetStatusCache.botKeys;
  }
  const swarmKeys = [];
  try {
    const fleetConfigPath = '/home/agent/orca/learnings/fleet.json';
    if (fs.existsSync(fleetConfigPath)) {
      const parsed = JSON.parse(fs.readFileSync(fleetConfigPath, 'utf-8'));
      if (Array.isArray(parsed.accounts)) {
        for (const a of parsed.accounts) {
          if (a.key && a.key !== 'cuang' && a.key !== 'william') {
            swarmKeys.push(a.key);
          }
        }
      }
    }
  } catch (_) {}

  let standaloneKeys = [];
  try {
    const raw = execSync("docker ps -a --filter 'name=reefblast-bot' --format '{{.Names}}' 2>/dev/null", { encoding: 'utf-8', timeout: 2000 }).trim();
    const names = raw ? raw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    standaloneKeys = names
      .map(n => (n === 'reefblast-bot' ? 'cuang' : n.replace(/^reefblast-bot-/, '')))
      .filter(k => k !== 'cuang' && k !== 'william');
  } catch (_) {}

  const others = Array.from(new Set([...swarmKeys, ...standaloneKeys])).sort();
  const result = ['cuang', 'william', ...others];
  fleetStatusCache.botKeys = result;
  return result;
}

function resolveBotKey(input) {
  if (!input) return null;
  const bots = listFleetBots();
  const raw = String(input).trim().toLowerCase();

  // Index match: e.g. "1", "#1", "#3"
  const m = raw.match(/^#?(\d+)$/);
  if (m) {
    const idx = parseInt(m[1], 10);
    if (idx >= 1 && idx <= bots.length) {
      return bots[idx - 1];
    }
  }

  // Exact key match
  if (bots.includes(raw)) return raw;
  if (raw === 'cuang-bot' || raw === 'cuangbot') return 'cuang';
  const clean = raw.replace(/^reefblast-bot-?/, '');
  if (bots.includes(clean)) return clean;

  // Partial or prefix match
  const found = bots.find(b => b.toLowerCase().includes(raw));
  return found || null;
}

async function fetchAllBotStatuses(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && fleetStatusCache.data && (now - fleetStatusCache.lastFetch < 4000)) {
    return fleetStatusCache.data;
  }
  if (fleetStatusCache.inFlight) {
    return fleetStatusCache.inFlight;
  }

  fleetStatusCache.inFlight = (async () => {
    try {
      // 1. Fetch Swarm fleet across all active shards
      let swarmBots = [];
      try {
        swarmBots = await swarmCluster.fetchAllShardsFleet();
      } catch (e) {
        console.warn('[SwarmCluster Fleet Fetch Error]:', e.message);
      }
      const swarmMap = new Map();
      for (const b of swarmBots) {
        swarmMap.set(b.key, b);
      }

      // 2. Fetch Docker containers for Core Bots (cuang, william) & any standalone containers
      const cRes = await dockerRequest('GET', '/containers/json?all=1');
      let botContainers = [];
      if (cRes.status === 200) {
        const all = JSON.parse(cRes.data.toString('utf-8'));
        botContainers = all.filter(c => c.Names && c.Names.some(n => n.includes('reefblast-bot')));
      }

      const containerMap = new Map();
      for (const c of botContainers) {
        const rawName = c.Names[0].replace(/^\//, '');
        const key = rawName === 'reefblast-bot' ? 'cuang' : rawName.replace(/^reefblast-bot-/, '');
        containerMap.set(key, { containerName: rawName, isRunning: c.State === 'running' });
      }

      // 3. Assemble unified bot keys: Cuang (#1), William (#2), then sorted fleet
      const extraKeys = new Set([...swarmMap.keys(), ...containerMap.keys()]);
      extraKeys.delete('cuang');
      extraKeys.delete('william');
      extraKeys.delete('swarm');
      const sortedOthers = Array.from(extraKeys).sort();
      const allKeys = ['cuang', 'william', ...sortedOthers];
      fleetStatusCache.botKeys = allKeys;

      const fetchPromises = allKeys.map(async (key, idx) => {
        // Core Isolated Bots: Cuang (#1) and William (#2)
        if (key === 'cuang' || key === 'william') {
          const info = containerMap.get(key) || { containerName: getContainerName(key), isRunning: false };
          if (!info.isRunning) {
            const creds = getBotCredentials(key);
            const name = creds?.name || (key === 'cuang' ? 'cuang-bot' : 'william');
            return {
              key,
              index: idx + 1,
              running: false,
              stopped: true,
              containerName: info.containerName,
              status: {
                ok: false,
                stopped: true,
                running: false,
                containerName: info.containerName,
                dockerUsage: 'Stopped / Disabled',
                me: { name, level: '?', coins: 0 },
                zone: 'Offline'
              }
            };
          }

          const statusJson = await fetchContainerStatusJson(info.containerName);
          const memRss = statusJson?.memoryRssMb ? `${statusJson.memoryRssMb} MiB RSS` : null;
          const memHeap = statusJson?.memoryHeapMb ? ` (${statusJson.memoryHeapMb} MiB heap)` : '';
          const usage = memRss ? `${memRss}${memHeap}` : (containerStatsCache[info.containerName] || 'Active');
          if (memRss) containerStatsCache[info.containerName] = usage;

          return {
            key,
            index: idx + 1,
            running: true,
            stopped: false,
            containerName: info.containerName,
            status: {
              ...(statusJson || {}),
              dockerUsage: usage,
              containerName: info.containerName,
              ok: !!statusJson,
              running: true,
              stopped: false
            }
          };
        }

        // Swarm Bots (#3+)
        if (swarmMap.has(key)) {
          const sb = swarmMap.get(key);
          const isRunning = sb.running;
          const shardName = sb.shardName || 'reefblast-swarm';
          const usage = isRunning ? `${sb.memoryRssMb || 14}M RSS (${shardName})` : `${shardName} (Paused)`;
          return {
            key,
            index: idx + 1,
            running: isRunning,
            stopped: !isRunning,
            containerName: shardName,
            status: {
              ...(sb.status || {}),
              dockerUsage: usage,
              containerName: shardName,
              shardName,
              ok: !!sb.status,
              running: isRunning,
              stopped: !isRunning,
              me: sb.status?.me || { name: sb.name || key, level: sb.level || 1, coins: sb.coins || 0 },
              zone: sb.zone || sb.status?.zone || 'Harbor'
            }
          };
        }

        // Standalone Container fallback (if any)
        const info = containerMap.get(key) || { containerName: getContainerName(key), isRunning: false };
        if (!info.isRunning) {
          const creds = getBotCredentials(key);
          return {
            key,
            index: idx + 1,
            running: false,
            stopped: true,
            containerName: info.containerName,
            status: {
              ok: false,
              stopped: true,
              running: false,
              containerName: info.containerName,
              dockerUsage: 'Stopped / Disabled',
              me: { name: creds?.name || key, level: '?', coins: 0 },
              zone: 'Offline'
            }
          };
        }

        const statusJson = await fetchContainerStatusJson(info.containerName);
        const memRss = statusJson?.memoryRssMb ? `${statusJson.memoryRssMb} MiB RSS` : null;
        const memHeap = statusJson?.memoryHeapMb ? ` (${statusJson.memoryHeapMb} MiB heap)` : '';
        const usage = memRss ? `${memRss}${memHeap}` : (containerStatsCache[info.containerName] || 'Active');
        return {
          key,
          index: idx + 1,
          running: true,
          stopped: false,
          containerName: info.containerName,
          status: {
            ...(statusJson || {}),
            dockerUsage: usage,
            containerName: info.containerName,
            ok: !!statusJson,
            running: true,
            stopped: false
          }
        };
      });

      const allStatuses = await Promise.all(fetchPromises);
      const byKey = {};
      for (const s of allStatuses) {
        byKey[s.key] = s;
      }

      fleetStatusCache.data = allStatuses;
      fleetStatusCache.byKey = byKey;
      fleetStatusCache.lastFetch = Date.now();
      return allStatuses;
    } catch (err) {
      console.warn('[WARN] Error in fetchAllBotStatuses:', err.message);
      return fleetStatusCache.data || getCachedFleetStatusesSync();
    } finally {
      fleetStatusCache.inFlight = null;
    }
  })();

  return fleetStatusCache.inFlight;
}

// --- Reefblast API Helpers & Anti-Block Routing ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'
];

let proxyRotationCounter = 0;
const CF_PROXY_URL = process.env.CF_PROXY_URL || 'socks5h://10.20.20.11:1080';
let cfProxyAgent = null;
if (SocksProxyAgent) {
  try {
    cfProxyAgent = new SocksProxyAgent(CF_PROXY_URL);
  } catch (e) {
    console.warn('[CF Proxy Init Warn]:', e.message);
  }
}

function getNextApiRoute(preferredRoute = 'auto') {
  if (preferredRoute === 'cf' && cfProxyAgent) return 'cf';
  if (preferredRoute === 'direct') return 'direct';
  if (!cfProxyAgent) return 'direct';
  return (proxyRotationCounter++ % 2 === 0) ? 'direct' : 'cf';
}

function apiPostSingle(endpoint, body, route, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const isChrome = userAgent.includes('Chrome');

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Origin': 'https://greentea.id',
      'Referer': 'https://greentea.id/reefblast/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };
    if (isChrome) {
      headers['sec-ch-ua'] = '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"';
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = userAgent.includes('Windows') ? '"Windows"' : '"macOS"';
    }

    const reqOptions = {
      method: 'POST',
      headers,
      timeout: timeoutMs
    };
    if (route === 'cf' && cfProxyAgent) {
      reqOptions.agent = cfProxyAgent;
    }

    const req = https.request(`https://greentea.id/reefblast/api/${endpoint}`, reqOptions, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: parsed,
            routeUsed: route
          });
        } catch (e) {
          resolve({
            ok: false,
            status: res.statusCode,
            body: { error: data || 'Non-JSON response' },
            routeUsed: route
          });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 408, error: 'Request timeout', routeUsed: route }); });
    req.on('error', err => resolve({ ok: false, status: 500, error: err.message, routeUsed: route }));
    req.write(payload);
    req.end();
  });
}

async function apiPost(endpoint, body, options = {}) {
  const timeoutMs = (typeof options === 'number') ? options : (options.timeoutMs || 8000);
  const preferredRoute = (typeof options === 'object' && options.route) ? options.route : 'auto';
  const initialRoute = getNextApiRoute(preferredRoute);

  const res = await apiPostSingle(endpoint, body, initialRoute, timeoutMs);

  if (!res.ok && (res.status === 429 || res.status === 403 || res.status === 408 || res.status === 503) && cfProxyAgent) {
    const alternateRoute = initialRoute === 'cf' ? 'direct' : 'cf';
    console.warn(`[Anti-Block Failover] Route '${initialRoute}' encountered HTTP ${res.status}. Retrying via alternate route '${alternateRoute}'...`);
    await new Promise(r => setTimeout(r, 600));
    return await apiPostSingle(endpoint, body, alternateRoute, timeoutMs);
  }

  return res;
}

// --- Natural Player Bot Name Generator ---
const BOT_NAME_ADJECTIVES = [
  'Swift', 'Salty', 'Fierce', 'Iron', 'Silent', 'Dark', 'Crimson', 'Golden',
  'Rusty', 'Stormy', 'Deep', 'Wild', 'Brave', 'Grim', 'Ghost', 'Frost',
  'Shadow', 'Lone', 'Furious', 'Ancient', 'Sleek', 'Savage', 'Cursed', 'Dread',
  'Brisk', 'Lucky', 'Noble', 'Vicious', 'Mighty', 'Reckless', 'Blazing', 'Jolly',
  'Stout', 'Keen', 'Stalwart', 'Rogue', 'Thunder', 'Vortex', 'Rapid', 'Azure',
  'Cobalt', 'Emerald', 'Obsidian', 'Copper', 'Silver', 'Bronze', 'Scarlet', 'Amber',
  'Titan', 'Phantom', 'Vengeful', 'Fearless', 'Dapper', 'Ruthless', 'Rowdy', 'Plucky',
  'Craggy', 'Barnacled', 'Scurvy', 'Briny', 'Abyssal', 'Pelagic', 'Drifting', 'Howling',
  'Surging', 'Roaring', 'Lurking', 'Creeping', 'Gliding', 'Dashing', 'Darting', 'Charging',
  'Snapping', 'Striking', 'Crushing', 'Fathom', 'Sunk', 'Bold', 'Valiant', 'Stealthy',
  'Astral', 'Bleak', 'Boundless', 'Breezy', 'Chilling', 'Crisp', 'Echoing', 'Enraged',
  'Faded', 'Flinty', 'Frosted', 'Gleaming', 'Grizzled', 'Hallowed', 'Harsh', 'Heavy',
  'Hidden', 'Hollow', 'Jagged', 'Lunar', 'Murky', 'Mystic', 'Nimble', 'Primal',
  'Quiet', 'Radiant', 'Ragged', 'Relentless', 'Resolute', 'Rotten', 'Rough', 'Scorched',
  'Seafaring', 'Serene', 'Shaggy', 'Shimmering', 'Sinister', 'Slick', 'Smoky', 'Snarling',
  'Solar', 'Spiky', 'Spooky', 'Static', 'Steely', 'Stern', 'Submerged',
  'Sunken', 'Tattered', 'Tidal', 'Timeless', 'Turbulent', 'Twilight', 'Valorous', 'Vexed',
  'Vibrant', 'Vigilant', 'Vivid', 'Void', 'Wandering', 'Weathered', 'Wicked', 'Windward',
  'Adamant', 'Aerial', 'Arcane', 'Arctic', 'Ashen', 'Auburn', 'Barren', 'Bitter',
  'Bluff', 'Boisterous', 'Boreal', 'Brawny', 'Bristling', 'Buoyant', 'Calm', 'Capricious',
  'Chill', 'Cinder', 'Cloudy', 'Cold', 'Coral', 'Crafty', 'Crazy', 'Cunning',
  'Cyan', 'Damp', 'Daring', 'Dauntless', 'Dazzling', 'Deepsea', 'Defiant', 'Dire',
  'Distant', 'Dour', 'Eager', 'Eerie', 'Elusive', 'Endless', 'Errant', 'Eternal',
  'Fateful', 'Ferocious', 'Fiery', 'Fleet', 'Flying', 'Foggy', 'Gallant', 'Ghostly',
  'Glacial', 'Gloomy', 'Grave', 'Gray', 'Great', 'Grit', 'Gusty', 'Haunted',
  'Hulking', 'Intrepid', 'Kinetic', 'Lost', 'Maddened', 'Marine', 'Maritime', 'Midnight',
  'Misty', 'Moonlit', 'Moody', 'Mutinous', 'Nautical', 'Night', 'Nocturnal', 'North',
  'Oceanic', 'Offshore', 'Pacific', 'Polar', 'Prowling', 'Raging', 'Rolling', 'Rugged',
  'Saltspray', 'Scourge', 'Seaborne', 'Seabound', 'Seaward', 'Shallow', 'Shifting', 'Sinuous',
  'Solitary', 'South', 'Spectral', 'Spiny', 'Starless', 'Starry', 'Stealth', 'Stormborn',
  'Subtle', 'Sunlit', 'Titanic', 'Torrential', 'Undertow', 'Vagrant', 'Vigorous', 'Wrecked',
  'Battered', 'Benthic', 'Billowing', 'Bloodfin', 'Broad', 'Cascade',
  'Charted', 'Cloudborn', 'Crashing', 'Cresting', 'Deepwater', 'Divergent', 'Driftwood',
  'Dynamic', 'Eddying', 'Eventide', 'Feathered', 'Fogbound', 'Foredeck', 'Foundering',
  'Gilded', 'Glinting', 'Goldbound', 'Hardy', 'Highseas', 'Highwind', 'Horizon',
  'Ironbound', 'Islebound', 'Jaggedreef', 'Keeneye', 'Looming', 'Mistborn', 'Moonwake',
  'Nightfall', 'Outbound', 'Peak', 'Pintle', 'Prowler', 'Quick', 'Rampant', 'Reefborn',
  'Rift', 'Saltcrust', 'Seafoam', 'Seahunter', 'Seastorm', 'Seawind', 'Sharkfin',
  'Silentwater', 'Silverfin', 'Skysail', 'Stormyseas', 'Stranded',
  'Surgingtide', 'Tempestuous', 'Thundering', 'Tideworn', 'Timber', 'Triton', 'Undaunted',
  'Uncharted', 'Venture', 'Voyager', 'Wavebound', 'Wavecrest', 'Wavetossed', 'Whirl', 'Zephyr',
  'Abyssal', 'Ancient', 'Atomic', 'Augur', 'Azure', 'Basalt', 'Blazing', 'Blinking', 'Bold', 'Brass',
  'Bravado', 'Brave', 'Brilliant', 'Bronze', 'Buccaneer', 'Cerulean', 'Champion', 'Chitin', 'Clawing', 'Cobalt',
  'Cosmic', 'Crimson', 'Crushing', 'Crystal', 'Curving', 'Dashing', 'Drifting', 'Emerald', 'Enchanted', 'Epic',
  'Fabled', 'Fearless', 'Ferrous', 'Fierce', 'Flashing', 'Flint', 'Floating', 'Flowing', 'Forked', 'Frost',
  'Galactic', 'Gargantuan', 'Gliding', 'Glowing', 'Golden', 'Grand', 'Halcyon', 'Heavysea', 'Heroic', 'Highborn',
  'Hydraulic', 'Hypnotic', 'Immense', 'Impact', 'Imperial', 'Indigo', 'Infinite', 'Invincible', 'Ironclad', 'Ivory',
  'Jade', 'Jet', 'Jubilant', 'Keen', 'Legendary', 'Limpid', 'Luminous', 'Magma', 'Magnetic', 'Majestic',
  'Mammoth', 'Mighty', 'Mirage', 'Monarch', 'Nebula', 'Neptune', 'Noble', 'Nordic', 'Nova', 'Obsidian',
  'Oceanborne', 'Ominous', 'Opal', 'Orbit', 'Pale', 'Pearl', 'Peerless', 'Pelagic', 'Phantom', 'Pierce',
  'Pinnacle', 'Platinum', 'Plucky', 'Polaris', 'Poseidon', 'Prime', 'Prismatic', 'Pyrite', 'Quantum', 'Quicksilver',
  'Rapid', 'Reckless', 'Regal', 'Resilient', 'Riptide', 'Roaring', 'Robust', 'Ruby', 'Rune', 'Ruthless',
  'Sable', 'Sapphire', 'Scintillant', 'Searing', 'Shadow', 'Siren', 'Skylit', 'Sleek', 'Smoldering', 'Sonic',
  'Sovereign', 'Sparkling', 'Spirited', 'Stalwart', 'Starlight', 'Steel', 'Stellar', 'Storming', 'Sublime', 'Sunburst',
  'Supernal', 'Surging', 'Swift', 'Tenacious', 'Thunderous', 'Titan', 'Torrid', 'Tranquil', 'Trenchant', 'Triumphant',
  'Ultramarine', 'Unbounded', 'Unbroken', 'Undying', 'Unfathomed', 'Unshaken', 'Unstoppable', 'Valiant', 'Vanguard', 'Vehement',
  'Velvet', 'Venerable', 'Verdant', 'Vicious', 'Victorious', 'Viridian', 'Vortex', 'Vulcan', 'Waveborne', 'Wavebreaker',
  'Wild', 'Windblown', 'Wrathful', 'Zenith', 'Zealous'
];

const BOT_NAME_NOUNS = [
  'Marlin', 'Shark', 'Kraken', 'Corsair', 'Viper', 'Falcon', 'Raider', 'Sailor',
  'Captain', 'Skipper', 'Hunter', 'Sniper', 'Tide', 'Wave', 'Current', 'Shoal',
  'Reef', 'Harbor', 'Anchor', 'Cutlass', 'Cannon', 'Compass', 'Rudder', 'Mast',
  'Gull', 'Pelican', 'Orca', 'Dolphin', 'Whale', 'Barracuda', 'Squid', 'Octopus',
  'Stingray', 'Manta', 'Moray', 'Urchin', 'Lobster', 'Crab', 'Walrus', 'Otter',
  'Seahorse', 'Galleon', 'Frigate', 'Sloop', 'Clipper', 'Brig', 'Skiff', 'Ketch',
  'Dory', 'Barge', 'Vessel', 'Cruiser', 'Dreadnought', 'Torpedo', 'Wake', 'Drift',
  'Foam', 'Spray', 'Spindrift', 'Breaker', 'Surf', 'Swell', 'Vortex', 'Maelstrom',
  'Whirlpool', 'Typhoon', 'Tempest', 'Squall', 'Gale', 'Monsoon', 'Hurricane', 'Cyclone',
  'Tsunami', 'Abyss', 'Trench', 'Fathom', 'Buccaneer', 'Privateer', 'Marauder', 'Freebooter',
  'Navigator', 'Helmsman', 'Lookout', 'Gunner', 'Deckhand', 'Harpooner', 'Diver', 'Trawler',
  'Angler', 'Castaway', 'Barnacle', 'Keel', 'Bow', 'Stern', 'Hull', 'Prow',
  'Bulkhead', 'Capstan', 'Rigging', 'CrowNest', 'Jib', 'Mizzen', 'Tiller', 'Flukes',
  'Bilge', 'Flotsam', 'Jetsam', 'Beacon', 'Siren', 'Nautilus', 'Leviathan', 'Trident',
  'Harpoon', 'Flintlock', 'Musket', 'Pistol', 'Blunderbuss', 'Broadside', 'Scuttle', 'Plank',
  'Doubloon', 'Treasure', 'Booty', 'Chest', 'Pillage', 'Plunder', 'Loot',
  'Brigantine', 'Caravel', 'ManOWar', 'Longboat', 'Raft', 'Rowboat', 'Ironclad', 'Submarine',
  'SeaDog', 'Swash', 'Albatross', 'Petrel', 'Bass', 'Beluga', 'Blowfish', 'Bonito',
  'Bowfin', 'Bullshark', 'Catfish', 'Chimaera', 'Cobia', 'Cod', 'Conch', 'Crayfish',
  'Cuttlefish', 'Devilray', 'Dogfish', 'Dorado', 'Eel', 'Flounder', 'Flyingfish', 'Gar',
  'Goby', 'Grouper', 'Grunion', 'Haddock', 'Hagfish', 'Halibut', 'Hammerhead', 'Hawkfish',
  'Herring', 'Horseshoe', 'Jackfish', 'Jellyfish', 'Kingfish', 'Krill', 'Lamprey', 'Lanternfish',
  'Lionfish', 'Loach', 'Mackerel', 'Mahi', 'Mako', 'Manatee', 'Megamouth', 'Menhaden',
  'Minnow', 'Mollusk', 'Moonfish', 'Mullet', 'Narwhal', 'Needlefish', 'Nudibranch', 'Oarfish',
  'Opah', 'Oyster', 'Parrotfish', 'Perch', 'Pilotfish', 'Pipefish', 'Piranha', 'Plaice',
  'Pollock', 'Pompano', 'Porpoise', 'Prawn', 'Puffer', 'Ray', 'Remora', 'Sailfish',
  'Salmon', 'Sanddollar', 'Sardine', 'Sawfish', 'Scad', 'Scallop', 'Sculpin', 'Seabass',
  'Seabird', 'Seadragon', 'Sealion', 'Seal', 'Sheepshead', 'Shrimp', 'Skate', 'Smelt',
  'Snapper', 'Sole', 'Spearfish', 'Starfish', 'Stonefish', 'Sturgeon', 'Sunfish', 'Swordfish',
  'Tarpon', 'TigerShark', 'Tilefish', 'Toadfish', 'Triggerfish', 'Trout', 'Tuna', 'Turbot',
  'Viperfish', 'Walleye', 'Whitefish', 'Wolffish', 'Wrasse', 'Yellowtail', 'Armada', 'Atoll',
  'Ballast', 'Basin', 'Bastion', 'Bay', 'Blaster', 'Boat', 'Bosun', 'Bounty',
  'Buoy', 'Cabin', 'Canal', 'Canoe', 'Cape', 'Cargo', 'Carrier', 'Catamaran',
  'Channel', 'Chart', 'Chasm', 'Coast', 'Cove', 'Creek', 'Crew', 'Cutter',
  'Deck', 'Depths', 'Derelict', 'Dinghy', 'Dock', 'Escort', 'Estuary', 'Ferry',
  'Fisher', 'Fleet', 'Fluke', 'Gaff', 'Galley', 'Gangplank', 'Grapnel', 'Gullet',
  'Gunboat', 'Haven', 'Hawser', 'Headland', 'Helm', 'Hold', 'Hook', 'Horn',
  'Inlet', 'Isle', 'Islet', 'Knots', 'Lagoon', 'Lanyard', 'Launch', 'Ledger',
  'Lighthouse', 'Locker', 'Logbook', 'Lugger', 'Marina', 'Mariner', 'Maritime', 'Mate',
  'Midship', 'Mooring', 'Mutiny', 'Narrows', 'NorthStar', 'Oar', 'Ocean', 'Outpost',
  'Packet', 'Paddle', 'Passage', 'Patrol', 'Pennant', 'Pier', 'Pilot', 'Pinnace',
  'Pod', 'Port', 'Porthole', 'Quay', 'Recon', 'Riddle', 'Rig', 'River',
  'Sail', 'Sailboat', 'Salvo', 'Sandbar', 'Schooner', 'Scrap', 'Screamer', 'Sculler',
  'Scuppers', 'Seafarer', 'Seagull', 'Seaway', 'Sextant', 'Shallows', 'Ship', 'Shipmate',
  'Shore', 'Signal', 'Smuggler', 'Sound', 'Spinnaker', 'Squadron', 'Starboard', 'Steamship',
  'Steerage', 'Stowaway', 'Strait', 'Strand', 'Tack', 'Tackle', 'Tanker', 'Tender',
  'Tideline', 'Trace', 'Track', 'Trader', 'Trooper', 'Trough', 'Vanguard', 'Voyage',
  'Voyager', 'Ward', 'Watch', 'Water', 'Wharf', 'Wherry', 'Wind', 'Windlass',
  'Wreck', 'Wreckage', 'Yacht', 'Yawl',
  'Anemone', 'Argonaut', 'Auk', 'Avocet', 'Barbet', 'Barnlet',
  'Beachcomber', 'Blenny', 'Booby', 'Brant', 'BrittleStar', 'Bullhead',
  'Bunting', 'Cachalot', 'Caddis', 'Capelin', 'Carangid', 'Castanet',
  'Chiton', 'Chuck', 'Clang', 'Clapper', 'Clavicle', 'Cleat', 'Clinker',
  'Coot', 'Cormorant', 'Cowrie', 'Crappie', 'Crossjack',
  'Curlew', 'Cusk', 'Cutty', 'Dace', 'Daphnia', 'Dart', 'Darter',
  'Deadlight', 'Devilfish', 'Dipper', 'Discus', 'Divers', 'Dotterel',
  'Dovekie', 'Dowitcher', 'Dragonet', 'Dreissena', 'Dunlin', 'Eider', 'Elver',
  'Epaulette', 'Eulachon', 'Fairlead', 'Falconer', 'Finback', 'Finfoot',
  'Flapjack', 'Flasher', 'Flathead', 'Flatworm', 'Flyer', 'Flyfish', 'Foamcrest',
  'Footrope', 'Forecastle', 'Foretop', 'Fulmar', 'Gadid', 'Gallinule', 'Gannet',
  'Garfish', 'Geoduck', 'Gibbous', 'Globefish', 'Gobylet', 'Godwit', 'Gourami',
  'Grampus', 'Grebe', 'Guillemot', 'Gullwing', 'Gunwale', 'Hake', 'Halfbeak',
  'Halyard', 'Harrier', 'Hassle', 'Hawksbill', 'Hawse', 'Headstay',
  'Helldiver', 'Hemiramph', 'Heron', 'Hogchoker', 'Hogfish', 'Hoplite',
  'Hornshark', 'Houndshark', 'Houndfish', 'Hullbreak', 'Hydra', 'Hydroid', 'Icefish',
  'Jackdaw', 'Jackknife', 'Jaeger', 'Jawfish', 'Jewelfish', 'Jibboom', 'Jigger',
  'Kelpfish', 'Killifish', 'Kittiwake', 'Kitefin', 'Kitefish', 'Knotsman', 'Krillpack',
  'Labyrinth', 'Ladyfish', 'Lagooner', 'Lancefish', 'Larva', 'Leatherback', 'Leech',
  'Limpet', 'Lingcod', 'Lizardfish', 'Logline', 'Loggerhead', 'Longear', 'Longfin',
  'Longliner', 'Loon', 'Lowtide', 'Lumpfish', 'Lumpsucker', 'Lyrefish',
  'Machete', 'Madtom', 'Mallard', 'Mandarin', 'Mangrove',
  'Marline', 'Medusa', 'Merlin', 'Mermaid', 'Merman', 'Midshipman',
  'Milkfish', 'Mire', 'Mitrefish', 'MittenCrab', 'Mola', 'Monkfish', 'Mooneye',
  'Moorhen', 'Mora', 'Mosquitofish', 'Mudminnow', 'Mudpuppy', 'Mudskipper', 'Murre',
  'Murrelet', 'Muskellunge', 'Mussel', 'Nauplius', 'Netmender', 'Netweaver', 'Nodule',
  'Nosefish', 'NurseShark', 'Nutria', 'Oarblade', 'Oarstroke',
  'Ocellaris', 'Oldsquaw', 'Ophidian', 'Opossum', 'Osprey', 'Otterhound',
  'Outrigger', 'Paddlefish', 'Palolo', 'Pandora', 'Panfish', 'Paranzella', 'Paravane',
  'Patagium', 'Pearly', 'Peep', 'Peewit', 'Penknife', 'Periwinkle',
  'Phalarope', 'Picaroon', 'Pickerel', 'Picuda', 'Pigfish', 'Pilchard', 'Pinball',
  'Pintail', 'PirateCove', 'Plankton', 'Playground', 'Plongeur', 'Plover',
  'Polychaete', 'Polyp', 'Pomfret', 'Pompilid', 'Porcupinefish', 'Portolan',
  'Prion', 'Prowl', 'Prowhead', 'Ptarmigan', 'Puckerfish', 'Puffin', 'Pulley',
  'Pyrosome', 'Quahog', 'Quartering', 'Queenfish', 'Queerfish', 'Quillback',
  'Quillfish', 'Rabble', 'Racer', 'Rail', 'RainbowTrout', 'Raja', 'Rasbora',
  'Ratfish', 'Rattail', 'RazorClam', 'Razorbill', 'Redcoat', 'Reddrum', 'Redeye',
  'Redfish', 'Redknot', 'Redshank', 'Redstart', 'Reeffish', 'Reeftank', 'Remorid',
  'Ribbonfish', 'RightWhale', 'Ringbill', 'Ringtail', 'Roamer', 'Rockcod',
  'Rockfish', 'Rockhopper', 'Rockling', 'Roller', 'Rook', 'Rorqual', 'Rotifer',
  'Roughneck', 'Roundel', 'Roundfish', 'Rowlock', 'Rudderfish', 'Ruff', 'Ruffle',
  'Sabretooth', 'Sack', 'Saddleback', 'Safeguard', 'Sailback', 'Sailcloth',
  'Salp', 'Sanddab', 'Sanderling', 'Sandfly', 'Sandgrouse', 'Sandhopper',
  'Sandlance', 'Sandpiper', 'Sandshaker', 'Sandshark', 'Sandspit', 'Sandstorm',
  'Sargassum', 'Sauger', 'Saury', 'Scamp', 'Scaup', 'Sciaenid', 'Scooter',
  'Scorpion', 'Scotch', 'Scoter', 'Scour', 'Scow', 'Scrambler', 'Screw',
  'Scull', 'Sculler', 'SeaBat', 'SeaBream', 'SeaCat', 'SeaCrow', 'SeaEagle',
  'SeaFox', 'SeaGoddess', 'SeaHare', 'SeaHawk', 'SeaHorse', 'SeaHound', 'SeaLizard',
  'SeaMantis', 'SeaMouse', 'SeaNeedle', 'SeaNettle', 'SeaOtter', 'SeaOwl', 'SeaPen',
  'SeaRaven', 'SeaRobin', 'SeaSlug', 'SeaSpider', 'SeaSquirt', 'SeaSwallow', 'SeaToad',
  'SeaUrchin', 'SeaVane', 'SeaViper', 'SeaWolf', 'Seerfish', 'Sepia',
  'Setline', 'Shadowfish', 'Shag', 'Shanny',
  'Sharklet', 'Shearwater', 'Shellback', 'Shellrake', 'Shiner', 'Shipchandler', 'Shipmaster',
  'Shipwright', 'Shoalwater', 'Shortfin', 'Shovelnose', 'Sifter', 'Silverside', 'Silurid',
  'Skimmer', 'SkinDiver', 'Skua', 'Skylark', 'Slipway', 'Slyboots', 'SnakeEel',
  'Snakehead', 'Snipe', 'Snipefish', 'Snoek', 'Snook', 'SnowyEgret', 'Soapfish',
  'Solea', 'Solitaire', 'Spadefish', 'Sparling', 'Spear', 'Spicara', 'SpiderCrab',
  'Spindle', 'Spinefoot', 'Spinetail', 'Splash', 'Splake', 'Sponge',
  'Spoonbill', 'Sprat', 'Springtide', 'Spurdog', 'Squarehead', 'Squaw', 'Stareye',
  'Stargazer', 'Starthroat', 'Steamer', 'Steelhead', 'Stilt', 'Stingfish', 'Stint',
  'StormPetrel', 'Strander',
  'Strandloper', 'Strawman', 'StripedBass', 'Strombus', 'Sucker',
  'Suckerfish', 'Sunbeam', 'Surfbird', 'Surfperch', 'Surgeon', 'Swallowtail', 'Sweep',
  'Sweeper', 'Swimmer', 'Swordtail', 'Tackline', 'Tadorna', 'Tadpole',
  'Tagelus', 'Tailfin', 'Tangler', 'Tapertail', 'Tarwhine', 'Tattler', 'Tautog',
  'Teal', 'Tench', 'Tern', 'Tetra', 'Tetrapod', 'Thalassian', 'Thresher',
  'Thunderfish', 'Thunnid', 'Tidewatcher', 'Tigerfish', 'Timberman', 'Tinker',
  'Tomcod', 'Tonguefish', 'Topminnow', 'Torpedofish', 'Torrentfish', 'Toxotid',
  'Treefish', 'Trigger', 'Tripletail', 'Trochus', 'Trombone', 'Troutfisher', 'Trumpetfish',
  'Trunkfish', 'Tubeworm', 'Tullibee', 'Tumbler', 'Tunafish', 'Turnstone',
  'Turtle', 'Tuskfish', 'Umbrina', 'Unicornfish', 'UrchinFish', 'Urolophid', 'VampireSquid',
  'Veilfin', 'Velifer', 'Vellela', 'Vendace', 'Velvetfish', 'ViperShark', 'Wahoo',
  'Warmouth', 'Warper', 'Warping', 'WaterStrider', 'Weatherfish', 'Weever', 'Whalebird', 'Whelk', 'Whiff', 'Whimbrel',
  'Whitebait', 'Whitecap', 'Whitechub', 'WhiteTip', 'Whiting', 'Wigeon', 'Willet',
  'Windowpane', 'Wireworm', 'WolfEel', 'Wolfish', 'Wreckfish', 'Wrymouth', 'Xiphias',
  'Yellowfin', 'Yellowlegs', 'Zaprorid', 'Zeid', 'Zoarcid', 'Zooplankton', 'Zorilla',
  'Aegis', 'Amazon', 'Anthem', 'Apex', 'Arcadia', 'Archer', 'Archon', 'Arrow', 'Arsenal', 'Artifact',
  'Ascendant', 'Assault', 'Astra', 'Augur', 'Aurora', 'Ballista', 'Bandit', 'Barricade', 'Bastion',
  'Battering', 'Battleaxe', 'Beacon', 'Behemoth', 'Berserker', 'Blade', 'Blaster', 'Blaze', 'Blizzard',
  'Bolt', 'Bombard', 'Bravado', 'Breaker', 'Bulwark', 'Cadence', 'Calamity', 'Carbine', 'Carnage',
  'Castellan', 'Castle', 'Centurion', 'Champion', 'Chimera', 'Cinder', 'Citadel', 'Claw', 'Cleaver',
  'Colossus', 'Comet', 'Conqueror', 'Corvette', 'Crest', 'Crossbow', 'Crucible', 'Crusher', 'Cutlass',
  'Cyclone', 'Dagger', 'Decimator', 'Defender', 'Demon', 'Destroyer', 'Devastator', 'Dominion', 'Doom',
  'Dragon', 'Dread', 'Eclipse', 'Empress', 'Enigma', 'Epoch', 'Excalibur', 'Executioner', 'Fang',
  'Firebird', 'Flame', 'Flash', 'Flint', 'Fortress', 'Fury', 'Gargoyle', 'Gauntlet', 'Gladiator',
  'Glory', 'Goliath', 'Gorgon', 'Gremlin', 'Griffin', 'Grizzly', 'Guardian', 'Harbinger', 'Havoc',
  'Hero', 'Horizon', 'Howitzer', 'Hurricane', 'Hydra', 'Ignition', 'Impact', 'Imperator', 'Incinerator',
  'Inferno', 'Infinity', 'Ironclad', 'Javelin', 'Juggernaut', 'Knight', 'Lance', 'Legion', 'Longbow',
  'Lord', 'Mace', 'Maelstrom', 'Mammoth', 'Marauder', 'Marksman', 'Mauler', 'Meteor', 'Mirage',
  'Monarch', 'Monolith', 'Monsoon', 'Morningstar', 'Mortar', 'Nemesis', 'Nexus', 'Nightshade', 'Ninja',
  'Nova', 'Oblivion', 'Omega', 'Oracle', 'Outrider', 'Overlord', 'Paladin', 'Panther', 'Paragon',
  'Pegasus', 'Phantom', 'Phoenix', 'Pioneer', 'Polaris', 'Predator', 'Prowler', 'Punisher', 'Quake',
  'Raider', 'Ram', 'Rampart', 'Ranger', 'Raptor', 'Ravager', 'Reaper', 'Rebel', 'Reckoner',
  'Relic', 'Renegade', 'Revenant', 'Rifleman', 'Riptide', 'Rival', 'Rogue', 'Ronin', 'Sabre',
  'Salvo', 'Samurai', 'Scimitar', 'Scorpion', 'Scourge', 'Scout', 'Sentinel', 'Sentry', 'Seraph',
  'Serpent', 'Shadow', 'Shard', 'Shield', 'Shockwave', 'Siege', 'Sire', 'Slayer', 'Sniper',
  'Sorcerer', 'Sovereign', 'Spartan', 'Specter', 'Spear', 'Spellbinder', 'Spike', 'Spirit', 'Spitfire',
  'Stalker', 'Starfall', 'Starlight', 'Striker', 'Tempest', 'Thunder', 'Titan', 'Tornado', 'Tormentor',
  'Trebuchet', 'Tribute', 'Trident', 'Trooper', 'Typhoon', 'Tyrant', 'Valkyrie', 'Vanguard', 'Vanquisher',
  'Vindicator', 'Viper', 'Volcano', 'Vortex', 'Warden', 'Warlock', 'Warlord', 'Warrior', 'Windstorm',
  'Wolf', 'Wraith', 'Zealot', 'Zenith'
];

const BOT_NAME_TITLES = [
  'Capn', 'Capt', 'Old', 'Sir', 'Lord', 'King', 'Doc', 'Chief',
  'Boss', 'Uncle', 'Madam', 'Duke', 'Baron', 'Admiral', 'Commodore', 'Matey',
  'Master', 'Grand', 'Saint', 'Skipper', 'Sailor', 'Elder', 'Coach', 'Agent',
  'Major', 'Officer', 'Gunner', 'Quarter', 'Helms', 'Bosun', 'Seadog', 'Count',
  'Brother', 'Judge', 'Navigator', 'Marshal', 'Deacon', 'Baronet', 'Governor',
  'Corsair', 'HighAdmiral', 'Constable', 'Tribune', 'Emperor', 'Overlord', 'Sovereign',
  'General', 'Vanguard', 'Archon', 'Patriarch', 'Commander', 'Centurion', 'Grandmaster'
];

const BOT_NAME_PEOPLE = [
  'Jack', 'Barnaby', 'Roger', 'Pete', 'Sam', 'Dan', 'Bill', 'Joe',
  'Ned', 'Morgan', 'Flint', 'Silver', 'Drake', 'Bones', 'Kidd', 'Teach',
  'Avery', 'Roberts', 'Vane', 'Bonny', 'Read', 'Bellamy', 'Rackham', 'Gibbs',
  'Finn', 'Toby', 'Hank', 'Gus', 'Leo', 'Milo', 'Max', 'Rusty',
  'Rocky', 'Skip', 'Zack', 'Finnick', 'Cooper', 'Wyatt', 'Cole', 'Jasper',
  'Silas', 'Otis', 'Felix', 'Rowan', 'Arlo', 'Jonah', 'Gage', 'Brody',
  'Beau', 'Rex', 'Dexter', 'Cash', 'Gulliver', 'Calico', 'Sinbad', 'Hawkins',
  'Arthur', 'Ben', 'Billy', 'Barty', 'Cal', 'Dave', 'Dean', 'Eli',
  'Ezra', 'Frank', 'George', 'Gideon', 'Harvey', 'Hugo', 'Jesse', 'Jonas',
  'Jude', 'Luke', 'Monty', 'Nate', 'Noah', 'Oliver', 'Percy', 'Quinn',
  'Ray', 'Riley', 'Robin', 'Rory', 'Sawyer', 'Seth', 'Theo', 'Tobias',
  'Travis', 'Victor', 'Wade', 'Walter', 'Zane', 'Alexander', 'Archie', 'Barrett',
  'Benson', 'Boris', 'Bruno', 'Callum', 'Cassian', 'Cedric', 'Clark', 'Cormac',
  'Cyrus', 'Damon', 'Desmond', 'Duncan', 'Edgar', 'Edison', 'Ellis', 'Gareth',
  'Graham', 'Heath', 'Holden', 'Ivan', 'Keith', 'Kieran', 'Lachlan', 'Leon',
  'Malcolm', 'Marshall', 'Orion', 'Pierce', 'Reid', 'Russell', 'Sterling', 'Vance',
  'Warren', 'Weston', 'Winston'
];

const BOT_NAME_ROLES = [
  'Chaser', 'Rider', 'Runner', 'Hunter', 'Seeker', 'Stalker', 'Caster', 'Fisher',
  'Striker', 'Crusher', 'Breaker', 'Slayer', 'Watcher', 'Guard', 'Keeper', 'Warden',
  'Drifter', 'Rover', 'Scout', 'Pilot', 'Slicer', 'Cleaver', 'Diver', 'Tracker',
  'Master', 'Tamer', 'Bane', 'Caller', 'Finder', 'Reaper', 'Sailor', 'Brawler',
  'Marauder', 'Corsair', 'Vanguard', 'Harvester', 'Vindicator', 'Scavenger', 'Enforcer',
  'Destroyer', 'Conqueror', 'Gladiator', 'Avenger', 'Assailant', 'Striker'
];

const BOT_NAME_SOLO = [
  'Nautilus', 'Leviathan', 'Cthulhu', 'Maelstrom', 'Tsunami', 'Riptide',
  'Dreadnought', 'Ironclad', 'Blackwater', 'Blackbeard', 'Cutlass', 'Broadside',
  'Cannonball', 'CrowNest', 'Scuttlebutt', 'Keelhaul', 'JollyRoger', 'Mainbrace',
  'Foghorn', 'Lighthouse', 'HighTide', 'LowTide', 'Overboard', 'Shipwreck',
  'DeadCalm', 'GaleForce', 'SeaBreeze', 'SunkenGold', 'SeaWolf', 'NightTide',
  'GhostShip', 'KrakenEye', 'StormRider', 'WaveCaster', 'AbyssKing', 'SeaTitan',
  'Poseidon', 'Neptune', 'Trident', 'Oceanus', 'Aquarius', 'KrakenBane', 'LeviathansWake',
  'AbyssalFury', 'TempestGale', 'MaelstromCore', 'ThunderWake', 'SilentDepths'
];

function getKnownBotNames() {
  const names = new Set();
  try {
    const bots = listFleetBots();
    for (const b of bots) {
      names.add(b.toLowerCase());
      const creds = getBotCredentials(b);
      if (creds?.name) names.add(creds.name.toLowerCase());
    }
  } catch (_) {}

  try {
    const baseDir = '/home/agent/orca/learnings';
    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir);
      for (const d of dirs) {
        if (d.startsWith('reefblast-docker-')) {
          const key = d.replace(/^reefblast-docker-/, '').toLowerCase();
          names.add(key);
          const credPath = path.join(baseDir, d, 'credentials.txt');
          if (fs.existsSync(credPath)) {
            const cred = fs.readFileSync(credPath, 'utf8');
            for (const line of cred.split('\n')) {
              if (line.startsWith('name=')) {
                const n = line.slice(5).trim().toLowerCase();
                if (n) names.add(n);
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  return names;
}

function pickRandomWord(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCandidate(prefix = '') {
  const p = (prefix || '').trim();
  const hasCustomPrefix = p && !['capt', 'none', 'rand', 'random', 'default'].includes(p.toLowerCase());

  if (hasCustomPrefix) {
    const cleanP = p.replace(/[^a-zA-Z0-9]/g, '');
    const baseP = cleanP.slice(0, 10);
    const remaining = 16 - baseP.length - 1;
    if (remaining >= 3) {
      const choices = [...BOT_NAME_NOUNS, ...BOT_NAME_PEOPLE, ...BOT_NAME_ROLES].filter(w => w.length <= remaining);
      if (choices.length > 0 && Math.random() < 0.75) {
        return `${baseP}_${pickRandomWord(choices)}`.slice(0, 16);
      }
    }
    const randNum = Math.floor(Math.random() * 8999 + 1000);
    return `${cleanP.slice(0, 10)}_${randNum}`.slice(0, 16);
  }

  for (let attempt = 0; attempt < 35; attempt++) {
    const r = Math.random();
    let cand = '';

    if (r < 0.45) {
      cand = `${pickRandomWord(BOT_NAME_ADJECTIVES)}${pickRandomWord(BOT_NAME_NOUNS)}`;
    } else if (r < 0.65) {
      cand = `${pickRandomWord(BOT_NAME_TITLES)}${pickRandomWord(BOT_NAME_PEOPLE)}`;
    } else if (r < 0.80) {
      cand = `${pickRandomWord(BOT_NAME_ADJECTIVES)}${pickRandomWord(BOT_NAME_PEOPLE)}`;
    } else if (r < 0.90) {
      cand = `${pickRandomWord(BOT_NAME_NOUNS)}${pickRandomWord(BOT_NAME_ROLES)}`;
    } else if (r < 0.95) {
      cand = `${pickRandomWord(BOT_NAME_TITLES)}${pickRandomWord(BOT_NAME_NOUNS)}`;
    } else {
      cand = pickRandomWord(BOT_NAME_SOLO);
    }

    if (cand && cand.length <= 16) {
      return cand;
    }
  }

  return `${pickRandomWord(BOT_NAME_ADJECTIVES).slice(0, 8)}${pickRandomWord(BOT_NAME_NOUNS).slice(0, 8)}`;
}

function generateUniqueBotName(usedNames = new Set(), prefix = '') {
  for (let i = 0; i < 200; i++) {
    const cand = generateCandidate(prefix);
    if (!usedNames.has(cand.toLowerCase())) {
      usedNames.add(cand.toLowerCase());
      return cand;
    }
  }

  const base = (prefix ? prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9) : pickRandomWord(BOT_NAME_NOUNS).slice(0, 9));
  const num = Math.floor(Math.random() * 89999 + 10000);
  const fallbackName = `${base}_${num}`.slice(0, 16);
  usedNames.add(fallbackName.toLowerCase());
  return fallbackName;
}

// --- Account Registration & Provisioning Engine ---
async function registerAccountWithRetry(preferredName, email, password, usedNames = new Set(), prefix = '', options = {}) {
  let name = (preferredName || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  if (!name) name = generateUniqueBotName(usedNames, prefix);

  const routeMode = options.routeMode || 'auto';
  let lastErrMsg = 'Registration failed';
  let lastStatus = 0;
  let nameCollisions = 0;

  for (let attempt = 0; attempt < 6; attempt++) {
    const currentRoute = attempt === 0 ? routeMode : (attempt % 2 === 1 ? 'cf' : 'direct');
    const res = await apiPost('register', { Name: name, Email: email, Pass: password }, { route: currentRoute });

    if (res.ok && res.body?.token) {
      return { ok: true, name: res.body.name || name, token: res.body.token, route: res.routeUsed };
    }

    lastStatus = res.status;
    const errMsg = res.body?.error || res.error || 'Registration failed';
    lastErrMsg = errMsg;

    if (errMsg.toLowerCase().includes('name is taken') || errMsg.toLowerCase().includes('already exists')) {
      nameCollisions++;
      usedNames.add(name.toLowerCase());
      const baseClean = (preferredName || prefix || name || 'capt').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const salt = Math.floor(Math.random() * 89999 + 10000);
      name = `${baseClean}_${salt}`.slice(0, 16);
      usedNames.add(name.toLowerCase());
      continue;
    }

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      console.warn(`[API Register Backoff] HTTP ${res.status} on attempt ${attempt + 1}. Backing off...`);
      lastErrMsg = `Rate limit / WAF backoff (HTTP ${res.status}): ${errMsg}`;
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1200));
      continue;
    }

    return { ok: false, error: errMsg, route: res.routeUsed };
  }

  if (lastStatus === 429) {
    return { ok: false, error: `Rate limit reached (HTTP 429). Egress paused.` };
  }
  if (lastStatus === 403 || lastStatus === 503) {
    return { ok: false, error: `Cloudflare/WAF block (HTTP ${lastStatus}).` };
  }
  if (nameCollisions >= 5) {
    return { ok: false, error: `Captain name collision after ${nameCollisions} attempts.` };
  }
  return { ok: false, error: lastErrMsg || 'Registration failed after retries.' };
}

async function loginAccount(email, password, options = {}) {
  const routeMode = options.routeMode || 'auto';
  const res = await apiPost('login', { Name: email, Pass: password }, { route: routeMode });
  if (res.ok && res.body?.token) {
    return { ok: true, name: res.body.name || email, token: res.body.token, route: res.routeUsed };
  }
  return { ok: false, error: res.body?.error || res.error || 'Authentication failed: invalid credentials.', route: res.routeUsed };
}

function getBotCredentials(botKey) {
  const cleanKey = (botKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const p = path.join('/home/agent/orca/learnings', `reefblast-docker-${cleanKey}`, 'credentials.txt');
  if (!fs.existsSync(p)) return null;
  const content = fs.readFileSync(p, 'utf-8');
  const result = {};
  for (const line of content.split('\n')) {
    const idx = line.indexOf('=');
    if (idx !== -1) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

// --- Go Swarm & Multi-Container Deployment ---
async function deployBotDaemon(botKey, email, password, token, captainName, allowBuying = true, targetShard = null) {
  let cleanKey = (botKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanKey) cleanKey = 'bot';

  // Prevent name collision across distinct accounts
  let targetKey = cleanKey;
  let counter = 2;
  const known = listFleetBots();
  while (known.includes(targetKey) && counter <= 1000) {
    const existing = getBotCredentials(targetKey);
    if (existing && existing.email === email) {
      break;
    }
    targetKey = `${cleanKey}${counter}`;
    counter++;
  }
  cleanKey = targetKey;

  const botDir = path.join('/home/agent/orca/learnings', `reefblast-docker-${cleanKey}`);
  const logsDir = path.join(botDir, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  fs.writeFileSync(
    path.join(botDir, 'credentials.txt'),
    `email=${email}\npassword=${password}\nname=${captainName || cleanKey}\ntoken=${token || ''}\ncreatedAt=${new Date().toISOString()}\n`
  );
  fs.writeFileSync(
    path.join(botDir, 'policy.json'),
    JSON.stringify({
      allowBuying: !!allowBuying,
      allowSalvaging: false,
      allowMarketSelling: false,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  // Deploy into Swarm Cluster Shard (Auto-partitioning: 50 bots per container)
  const chosenShard = targetShard || (await swarmCluster.getTargetShardForNewBot());
  const swarmPayload = {
    key: cleanKey,
    email,
    password,
    token: token || '',
    policy: {
      allowBuying: !!allowBuying,
      allowSalvaging: false,
      allowMarketSelling: false,
      updatedAt: new Date().toISOString()
    }
  };

  const urls = [chosenShard.internalHost, chosenShard.host, `http://127.0.0.1:${chosenShard.port}`];
  let swarmRes = null;
  for (const u of urls) {
    swarmRes = await makeHttpCall(u, 'POST', '/fleet/add', swarmPayload, 4000);
    if (swarmRes && swarmRes.status >= 200 && swarmRes.status < 300) {
      break;
    }
  }

  if (swarmRes && swarmRes.status >= 200 && swarmRes.status < 300) {
    swarmCluster.botToShardMap.set(cleanKey, chosenShard);
    if (fleetStatusCache.botKeys && !fleetStatusCache.botKeys.includes(cleanKey)) {
      fleetStatusCache.botKeys.push(cleanKey);
    }
    fleetStatusCache.lastFetch = 0;
    if (fleetStatusCache.byKey) delete fleetStatusCache.byKey[cleanKey];
    return {
      ok: true,
      botKey: cleanKey,
      containerName: chosenShard.name,
      shardName: chosenShard.name,
      captainName: captainName || cleanKey,
      email,
      password,
      allowBuying: !!allowBuying,
      message: `Successfully provisioned Captain **${captainName || cleanKey}** in Go Swarm Shard \`${chosenShard.name}\`!`
    };
  }

  // Fallback to standalone container if swarm unreachable
  const containerName = getContainerName(cleanKey);
  try {
    execSync(`docker rm -f ${containerName} 2>/dev/null || true`);
    execSync(
      `docker run -d --name ${containerName} --memory 64m --log-driver json-file --log-opt max-size=10m --log-opt max-file=2 --restart unless-stopped ` +
      `-e RB_BOT_NAME="${email}" -e RB_BOT_PASS="${password}" -e RB_TOKEN="${token || ''}" ` +
      `reefblast-docker-reefblast-bot:latest ./reefblast-bot`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    fleetStatusCache.lastFetch = 0;
    if (fleetStatusCache.byKey) delete fleetStatusCache.byKey[cleanKey];
    return {
      ok: true,
      botKey: cleanKey,
      containerName,
      shardName: containerName,
      captainName: captainName || cleanKey,
      email,
      password,
      allowBuying: !!allowBuying,
      message: `Successfully provisioned container \`${containerName}\` for Captain **${captainName || cleanKey}**!`
    };
  } catch (err) {
    return { ok: false, error: `Swarm & container deployment failed: ${err.message}`, botKey: cleanKey, email, captainName };
  }
}

// --- Provisioning Modes ---
async function provisionManualBot(botKey, email, password, allowBuying = true, options = {}) {
  const cleanKey = (botKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') ||
                   email.split('@')[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required for manual credential mode.' };
  }

  const loginRes = await loginAccount(email, password, options);
  if (!loginRes.ok) {
    return { ok: false, error: loginRes.error, email, route: loginRes.route };
  }

  const res = await deployBotDaemon(cleanKey, email, password, loginRes.token, loginRes.name, allowBuying);
  res.route = loginRes.route;
  return res;
}

async function provisionRandomBots(count = 1, prefix = '', allowBuying = true, onProgress = null, options = {}) {
  const safeCount = Math.max(1, parseInt(count, 10) || 1);
  const usedNames = getKnownBotNames();
  const results = [];
  const routePreference = options.routeMode || 'auto';

  for (let i = 0; i < safeCount; i++) {
    if (options.isCancelled && options.isCancelled()) {
      console.log(`[Provisioning] Random bots loop cancelled at index ${i}/${safeCount}.`);
      break;
    }
    const captainName = generateUniqueBotName(usedNames, prefix);
    usedNames.add(captainName.toLowerCase());
    const botKey = captainName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    usedNames.add(botKey);

    const email = `${botKey}@cuang.dev`;
    const password = `Rb!${crypto.randomBytes(4).toString('hex')}`;

    const regRes = await registerAccountWithRetry(captainName, email, password, usedNames, prefix, { routeMode: routePreference });

    let deployRes = null;
    let currentShardName = 'reefblast-swarm';
    if (!regRes.ok) {
      deployRes = { ok: false, error: regRes.error, captainName, email, route: regRes.route };
    } else {
      const actualName = regRes.name || captainName;
      const actualKey = actualName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      usedNames.add(actualName.toLowerCase());
      usedNames.add(actualKey);

      deployRes = await deployBotDaemon(actualKey, email, password, regRes.token, actualName, allowBuying);
      deployRes.route = regRes.route;
      currentShardName = deployRes.containerName || 'reefblast-swarm';
    }

    results.push(deployRes);

    if (onProgress) {
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.filter(r => !r.ok).length;
      try {
        await onProgress({
          current: i + 1,
          total: safeCount,
          successCount,
          failCount,
          currentBot: captainName,
          currentShard: currentShardName,
          currentRoute: deployRes.route === 'cf' ? 'CF WARP Proxy' : 'Direct Host',
          routeType: deployRes.route || 'direct',
          lastResult: deployRes
        });
      } catch (pErr) {
        console.warn('[Progress Callback Warning]:', pErr.message);
      }
    }

    if (i < safeCount - 1) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
    }
  }

  return results;
}

async function provisionEmailList(emailsText, allowBuying = true, onProgress = null, options = {}) {
  const tokens = (emailsText || '').split(/[,;\n\s]+/).map(t => t.trim()).filter(Boolean);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails = tokens.filter(t => emailRegex.test(t));

  if (emails.length === 0) {
    return [{ ok: false, error: 'No valid email addresses found in the provided input.' }];
  }

  const results = [];
  const usedNames = getKnownBotNames();
  const safeCount = emails.length;
  const routePreference = options.routeMode || 'auto';

  for (let i = 0; i < safeCount; i++) {
    if (options.isCancelled && options.isCancelled()) {
      console.log(`[Provisioning] Email list loop cancelled at index ${i}/${safeCount}.`);
      break;
    }
    const email = emails[i];
    const userPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let candidate = userPart.slice(0, 16);
    if (!candidate || usedNames.has(candidate.toLowerCase())) {
      candidate = generateUniqueBotName(usedNames, userPart);
    }
    usedNames.add(candidate.toLowerCase());
    const botKey = candidate.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    usedNames.add(botKey);

    const password = `Rb!${crypto.randomBytes(4).toString('hex')}`;

    const regRes = await registerAccountWithRetry(candidate, email, password, usedNames, userPart, { routeMode: routePreference });

    let deployRes = null;
    let currentShardName = 'reefblast-swarm';
    if (!regRes.ok) {
      deployRes = { ok: false, error: regRes.error, email, captainName: candidate, route: regRes.route };
    } else {
      const actualName = regRes.name || candidate;
      const actualKey = actualName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      usedNames.add(actualName.toLowerCase());
      usedNames.add(actualKey);

      deployRes = await deployBotDaemon(actualKey, email, password, regRes.token, actualName, allowBuying);
      deployRes.route = regRes.route;
      currentShardName = deployRes.containerName || 'reefblast-swarm';
    }

    results.push(deployRes);

    if (onProgress) {
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.filter(r => !r.ok).length;
      try {
        await onProgress({
          current: i + 1,
          total: safeCount,
          successCount,
          failCount,
          currentBot: candidate,
          currentShard: currentShardName,
          currentRoute: deployRes.route === 'cf' ? 'CF WARP Proxy' : 'Direct Host',
          routeType: deployRes.route || 'direct',
          lastResult: deployRes
        });
      } catch (pErr) {
        console.warn('[Progress Callback Warning]:', pErr.message);
      }
    }

    if (i < safeCount - 1) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
    }
  }

  return results;
}

// --- Embed Builders for Provisioning Progress & Results ---
function buildProvisionProgressEmbed(job) {
  const elapsedSec = Math.floor((Date.now() - job.startTime) / 1000);
  const speed = job.completed > 0 ? (job.completed / Math.max(1, elapsedSec)).toFixed(1) : '0.0';
  const remainingSec = job.completed > 0 && job.total > job.completed 
    ? Math.round((job.total - job.completed) / Math.max(0.1, job.completed / Math.max(1, elapsedSec)))
    : null;
  const etaStr = remainingSec !== null ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : 'Calculating...';

  const isCancelled = job.cancelled || job.status === 'cancelled';
  const embed = new EmbedBuilder()
    .setTitle(isCancelled ? `🛑 Bulk Fleet Provisioning: Cancelled` : `⏳ Bulk Fleet Provisioning: ${job.modeTitle}`)
    .setDescription([
      renderProgressBar(job.completed, job.total),
      '',
      isCancelled ? '🛑 **Status**: `HALTED BY USER` (Job cancelled)\n' : '',
      `⏱️ **Elapsed**: \`${formatDuration(elapsedSec * 1000)}\` | ⏳ **ETA**: \`${isCancelled ? 'Stopped' : etaStr}\` | ⚡ **Speed**: \`${speed} bots/s\``,
      `✅ **Succeeded**: \`${job.successes.length}\` | ⚠️ **Failed**: \`${job.failures.length}\` | 🎯 **Target**: \`${job.total}\``,
      '',
      `🌐 **Egress Route**: \`${job.currentRoute || 'CF WARP / Direct Rotation'}\``,
      `🚢 **Current Shard**: \`${job.currentShard || 'reefblast-swarm'}\``,
      `🤖 **Processing**: \`${isCancelled ? 'Cancelled by user request' : (job.currentBot || 'Initializing...')}\``
    ].filter(Boolean).join('\n'))
    .setColor(isCancelled ? 0xef4444 : 0x38bdf8)
    .setTimestamp();

  if (job.successes.length > 0) {
    const recent = job.successes.slice(-4).map(s => `• Captain **${s.captainName}** (\`${s.containerName}\`) - \`${s.email}\``).join('\n');
    embed.addFields({
      name: `✨ Recent Launches (${job.successes.length}/${job.total})`,
      value: recent.slice(0, 1024)
    });
  }

  if (job.failures.length > 0) {
    const recentFail = job.failures.slice(-3).map(f => `• **${f.email || f.captainName}**: ${f.error}`).join('\n');
    embed.addFields({
      name: `⚠️ Recent Failures (${job.failures.length})`,
      value: recentFail.slice(0, 1024)
    });
  }

  embed.setFooter({ text: 'Reefblast Go Fleet • Non-blocking resilient worker active' });
  return sanitizeEmbed(embed);
}

function buildProvisionResultEmbed(results, modeTitle = 'Fleet Provisioning', jobMetadata = null) {
  const successes = results.filter(r => r.ok);
  const failures = results.filter(r => !r.ok);
  const total = results.length;
  const isAllSuccess = failures.length === 0 && successes.length > 0;
  const color = isAllSuccess ? 0x00ff88 : successes.length > 0 ? 0x38bdf8 : 0xff4444;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🚢 ${modeTitle} Report`)
    .setDescription([
      renderProgressBar(successes.length, total),
      '',
      `**${successes.length}/${total}** bot daemon(s) successfully provisioned across Swarm Shards!`,
      jobMetadata?.duration ? `⏱️ **Total Time**: \`${formatDuration(jobMetadata.duration)}\`` : '',
      jobMetadata?.routesSummary ? `🌐 **Routes Used**: \`${jobMetadata.routesSummary}\`` : '',
      jobMetadata?.shardsSummary ? `🚢 **Swarm Containers**: \`${jobMetadata.shardsSummary}\`` : ''
    ].filter(Boolean).join('\n'))
    .setTimestamp();

  if (successes.length > 0) {
    const sample = successes.slice(0, 6);
    const sampleLines = sample.map((s, idx) => {
      return `**${idx + 1}. Captain ${s.captainName}** (\`${s.containerName || 'reefblast-swarm'}\`)\n` +
             `• Email: \`${s.email}\` | Password: ||\`${s.password}\`||\n` +
             `• Purchasing: \`${s.allowBuying ? 'ENABLED 🛒' : 'DISABLED 🛡️'}\``;
    }).join('\n\n');

    let extraNote = '';
    if (successes.length > 6) {
      extraNote = `\n\n*...plus ${successes.length - 6} more captains launched in Go Swarm!*`;
    }

    embed.addFields({
      name: `✅ Active Bots Launched (${successes.length})`,
      value: (sampleLines + extraNote).slice(0, 1024)
    });
  }

  if (failures.length > 0) {
    const sampleFail = failures.slice(0, 5);
    let failLines = sampleFail.map(f => `• **${f.email || f.captainName || 'Unknown'}**: ${f.error}`).join('\n');
    if (failures.length > 5) {
      failLines += `\n*...and ${failures.length - 5} more errors.*`;
    }
    embed.addFields({
      name: `⚠️ Failed Registrations (${failures.length})`,
      value: failLines.slice(0, 1024)
    });
  }

  embed.setFooter({
    text: 'Reefblast Go Fleet • Run /reefblast fleet to view active progression'
  });

  return sanitizeEmbed(embed);
}

// --- Background Provision Job Runner ---
const activeProvisionJobs = new Map();

function cancelActiveProvisionJobs() {
  let count = 0;
  for (const [id, job] of activeProvisionJobs.entries()) {
    if (job.status === 'running') {
      job.cancelled = true;
      job.status = 'cancelled';
      count++;
    }
  }
  return count;
}

async function runProvisionJob({
  interaction = null,
  channel = null,
  mode = 'random',
  count = 1,
  prefix = '',
  emailList = '',
  password = '',
  allowBuying = true,
  routeMode = 'auto'
}) {
  const jobId = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const modeTitle = mode === 'random' ? 'Random Account Auto-Generation' :
                    mode === 'emails' ? 'Email-Based Account Creation' : 'Manual Credential Deployment';

  const job = {
    id: jobId,
    modeTitle,
    mode,
    total: mode === 'emails' ? (emailList.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || []).length || 1 : Math.max(1, count),
    completed: 0,
    successes: [],
    failures: [],
    startTime: Date.now(),
    currentBot: '',
    currentShard: 'reefblast-swarm',
    currentRoute: 'CF WARP / Direct Rotation',
    shardsUsed: new Set(),
    routesUsed: { direct: 0, cf: 0 },
    status: 'running',
    cancelled: false
  };
  activeProvisionJobs.set(jobId, job);

  let lastDiscordEdit = 0;
  let interactionExpired = false;

  const updateDiscord = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastDiscordEdit < 3000) return;
    lastDiscordEdit = now;

    if (interaction && !interactionExpired && (now - job.startTime > 13 * 60 * 1000)) {
      interactionExpired = true;
      try {
        if (channel && typeof channel.send === 'function') {
          await channel.send({
            content: `⏳ **Provisioning Job #${jobId}** is still progressing! Detaching from Discord interaction token (15m TTL). Continuing updates in channel.`
          });
        }
      } catch (_) {}
    }

    const embed = buildProvisionProgressEmbed(job);
    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rb:btn:job_refresh:${jobId}`)
          .setLabel('🔄 Refresh Progress')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rb:btn:job_cancel:${jobId}`)
          .setLabel('🛑 Cancel')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rb:refresh')
          .setLabel('🌊 Fleet Telemetry')
          .setStyle(ButtonStyle.Secondary)
      )
    ];

    if (interaction && !interactionExpired) {
      try {
        await interaction.editReply({ embeds: [embed], components: rows });
      } catch (err) {
        if (err.code === 10062 || err.message?.includes('Unknown interaction')) {
          interactionExpired = true;
        }
      }
    } else if (channel && typeof channel.send === 'function' && force) {
      try {
        await channel.send({ embeds: [embed], components: rows });
      } catch (_) {}
    }
  };

  if (interaction) {
    await updateDiscord(true);
  }

  const onBotProgress = async (prog) => {
    job.completed = prog.current;
    job.currentBot = prog.currentBot;
    job.currentShard = prog.currentShard;
    job.currentRoute = prog.currentRoute;
    if (prog.currentShard) job.shardsUsed.add(prog.currentShard);
    if (prog.routeType) {
      job.routesUsed[prog.routeType] = (job.routesUsed[prog.routeType] || 0) + 1;
    }
    if (prog.lastResult?.ok) {
      job.successes.push(prog.lastResult);
    } else if (prog.lastResult && !prog.lastResult.ok) {
      job.failures.push(prog.lastResult);
    }
    await updateDiscord(false);
  };

  let results = [];
  try {
    if (mode === 'random') {
      results = await provisionRandomBots(job.total, prefix, allowBuying, onBotProgress, {
        routeMode,
        isCancelled: () => job.cancelled || job.status === 'cancelled'
      });
    } else if (mode === 'emails') {
      results = await provisionEmailList(emailList, allowBuying, onBotProgress, {
        routeMode,
        isCancelled: () => job.cancelled || job.status === 'cancelled'
      });
    } else if (mode === 'manual') {
      const res = await provisionManualBot(prefix || emailList.split('@')[0], emailList, password, allowBuying, { routeMode });
      results = [res];
      job.completed = 1;
      if (res.ok) job.successes.push(res);
      else job.failures.push(res);
    }
  } catch (err) {
    console.error(`[Provisioning Job ${jobId} Error]:`, err);
    job.failures.push({ ok: false, error: err.message, captainName: 'FatalError' });
  }

  const wasCancelled = job.cancelled || job.status === 'cancelled';
  job.status = wasCancelled ? 'cancelled' : 'finished';
  job.endTime = Date.now();
  const duration = job.endTime - job.startTime;
  const shardsSummary = Array.from(job.shardsUsed).join(', ') || 'reefblast-swarm';
  const routesSummary = `Direct: ${job.routesUsed.direct || 0}, CF WARP: ${job.routesUsed.cf || 0}`;

  const titlePrefix = wasCancelled ? `🛑 Bulk Provisioning (Cancelled)` : modeTitle;
  const finalEmbed = buildProvisionResultEmbed(results, titlePrefix, {
    duration,
    shardsSummary,
    routesSummary
  });
  if (wasCancelled) {
    finalEmbed.setColor(0xef4444);
  }
  const actionRows = buildReefblastActionRows();

  if (interaction && !interactionExpired) {
    try {
      await interaction.editReply({ embeds: [finalEmbed], components: actionRows });
    } catch (_) {
      if (channel && typeof channel.send === 'function') {
        await channel.send({ embeds: [finalEmbed], components: actionRows }).catch(() => {});
      }
    }
  } else if (channel && typeof channel.send === 'function') {
    await channel.send({ embeds: [finalEmbed], components: actionRows }).catch(() => {});
  }

  return results;
}

// Backwards-compatible alias
async function addNewBot(botKey, email, password, allowBuying = true) {
  return provisionManualBot(botKey, email, password, allowBuying);
}

async function startBotContainer(botKey) {
  if (botKey === 'cuang' || botKey === 'william') {
    const containerName = getContainerName(botKey);
    try {
      const res = await dockerRequest('POST', `/containers/${containerName}/start`);
      fleetStatusCache.lastFetch = 0;
      return { ok: res.status >= 200 && res.status < 300, action: 'started', message: `Started ${containerName} successfully.` };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Swarm Bot: start via Swarm API
  const sRes = await swarmRequest('POST', '/fleet/start', { key: botKey });
  if (sRes.status >= 200 && sRes.status < 300) {
    fleetStatusCache.lastFetch = 0;
    return { ok: true, action: 'started', message: `Started Captain ${botKey} in Swarm.` };
  }

  // Standalone container fallback
  const containerName = getContainerName(botKey);
  try {
    const res = await dockerRequest('POST', `/containers/${containerName}/start`);
    fleetStatusCache.lastFetch = 0;
    return { ok: res.status >= 200 && res.status < 300, action: 'started', message: `Started ${containerName} successfully.` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function stopBotContainer(botKey) {
  if (botKey === 'cuang' || botKey === 'william') {
    const containerName = getContainerName(botKey);
    try {
      const res = await dockerRequest('POST', `/containers/${containerName}/stop?t=2`);
      fleetStatusCache.lastFetch = 0;
      return { ok: res.status >= 200 && res.status < 300, action: 'stopped', message: `Stopped ${containerName} successfully.` };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Swarm Bot: stop via Swarm API
  const sRes = await swarmRequest('POST', '/fleet/stop', { key: botKey });
  if (sRes.status >= 200 && sRes.status < 300) {
    fleetStatusCache.lastFetch = 0;
    return { ok: true, action: 'stopped', message: `Stopped Captain ${botKey} in Swarm.` };
  }

  // Standalone container fallback
  const containerName = getContainerName(botKey);
  try {
    const res = await dockerRequest('POST', `/containers/${containerName}/stop?t=2`);
    fleetStatusCache.lastFetch = 0;
    return { ok: res.status >= 200 && res.status < 300, action: 'stopped', message: `Stopped ${containerName} successfully.` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function resolveBotTargets(input) {
  const bots = listFleetBots();
  if (!input) return [];

  const raw = String(input).trim().toLowerCase();

  // Keyword: all
  if (raw === 'all' || raw === '*') {
    return [...bots];
  }

  // Keyword: non-core / extra / generated
  if (['non-core', 'noncore', 'extra', 'generated', 'capt', 'capts', 'bots'].includes(raw)) {
    return bots.slice(2);
  }

  // Keyword: core
  if (raw === 'core' || raw === 'mains') {
    return bots.slice(0, 2);
  }

  const tokens = raw.split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);
  const matchedSet = new Set();

  for (const token of tokens) {
    // 1. Range syntax: e.g. "3-7", "3..7", "3:7"
    const rangeMatch = token.match(/^(\d+)(?:-|\.\.|:)(\d+)$/);
    if (rangeMatch) {
      const min = Math.min(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
      const max = Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
      for (let i = min; i <= max; i++) {
        if (i >= 1 && i <= bots.length) matchedSet.add(bots[i - 1]);
      }
      continue;
    }

    // 2. Open-ended range: "3-" or ">=3" or "3+"
    if (token.endsWith('-') || token.startsWith('>=') || token.endsWith('+')) {
      const numMatch = token.match(/\d+/);
      if (numMatch) {
        const start = parseInt(numMatch[0], 10);
        for (let i = start; i <= bots.length; i++) {
          if (i >= 1) matchedSet.add(bots[i - 1]);
        }
        continue;
      }
    }

    // 3. Up to index: "-5" or "<=5"
    if (token.startsWith('-') || token.startsWith('<=')) {
      const numMatch = token.match(/\d+/);
      if (numMatch) {
        const end = parseInt(numMatch[0], 10);
        for (let i = 1; i <= Math.min(end, bots.length); i++) {
          matchedSet.add(bots[i - 1]);
        }
        continue;
      }
    }

    // 4. Single Index: e.g. "3", "#3"
    const singleIndexMatch = token.match(/^#?(\d+)$/);
    if (singleIndexMatch) {
      const idx = parseInt(singleIndexMatch[1], 10);
      if (idx >= 1 && idx <= bots.length) {
        matchedSet.add(bots[idx - 1]);
      }
      continue;
    }

    // 5. Wildcard pattern matching: e.g. "capt*", "capt_*"
    if (token.includes('*')) {
      const regex = new RegExp('^' + token.replace(/\*/g, '.*') + '$', 'i');
      for (const b of bots) {
        if (regex.test(b) || regex.test(getContainerName(b))) matchedSet.add(b);
      }
      continue;
    }

    // 6. Direct match
    let found = false;
    for (const b of bots) {
      if (b.toLowerCase() === token || getContainerName(b).toLowerCase() === token) {
        matchedSet.add(b);
        found = true;
      }
    }
    if (found) continue;

    // 7. Prefix match fallback
    for (const b of bots) {
      if (b.toLowerCase().startsWith(token)) {
        matchedSet.add(b);
      }
    }
  }

  return bots.filter(b => matchedSet.has(b));
}

async function stopBotContainers(botKeys) {
  const keys = Array.isArray(botKeys) ? botKeys : [botKeys];
  if (keys.length === 0) return { ok: true, stopped: [] };

  const coreKeys = keys.filter(k => k === 'cuang' || k === 'william');
  const swarmKeys = keys.filter(k => k !== 'cuang' && k !== 'william');
  const stopped = [];

  // Stop core isolated bots
  if (coreKeys.length > 0) {
    const results = await Promise.all(coreKeys.map(k => stopBotContainer(k)));
    coreKeys.forEach((k, i) => { if (results[i].ok) stopped.push(k); });
  }

  // Stop swarm bots across all shards
  if (swarmKeys.length > 0) {
    const isStoppingAll = swarmKeys.length >= Math.max(1, (fleetStatusCache.botKeys?.length || 0) - 2);
    const payload = isStoppingAll ? { all: true, keys: swarmKeys } : { keys: swarmKeys };
    const shardResults = await swarmCluster.broadcastActionToAllShards('/fleet/stop', payload);
    const anyOk = shardResults.some(r => r && r.status >= 200 && r.status < 300);
    if (anyOk) {
      stopped.push(...swarmKeys);
    } else {
      const results = await Promise.all(swarmKeys.map(k => stopBotContainer(k)));
      swarmKeys.forEach((k, i) => { if (results[i].ok) stopped.push(k); });
    }
  }

  fleetStatusCache.lastFetch = 0;
  return { ok: stopped.length > 0, stopped };
}

async function startBotContainers(botKeys) {
  const keys = Array.isArray(botKeys) ? botKeys : [botKeys];
  if (keys.length === 0) return { ok: true, started: [] };

  const coreKeys = keys.filter(k => k === 'cuang' || k === 'william');
  const swarmKeys = keys.filter(k => k !== 'cuang' && k !== 'william');
  const started = [];

  // Start core isolated bots
  if (coreKeys.length > 0) {
    const results = await Promise.all(coreKeys.map(k => startBotContainer(k)));
    coreKeys.forEach((k, i) => { if (results[i].ok) started.push(k); });
  }

  // Start swarm bots across all shards
  if (swarmKeys.length > 0) {
    const shardResults = await swarmCluster.broadcastActionToAllShards('/fleet/start', { keys: swarmKeys });
    const anyOk = shardResults.some(r => r && r.status >= 200 && r.status < 300);
    if (anyOk) {
      started.push(...swarmKeys);
    } else {
      const results = await Promise.all(swarmKeys.map(k => startBotContainer(k)));
      swarmKeys.forEach((k, i) => { if (results[i].ok) started.push(k); });
    }
  }

  fleetStatusCache.lastFetch = 0;
  return { ok: started.length > 0, started };
}

async function toggleBotContainer(botKey) {
  const running = isBotRunning(botKey);
  if (running) {
    return stopBotContainer(botKey);
  } else {
    return startBotContainer(botKey);
  }
}

function getBotPolicyPath(botKey) {
  const cleanKey = (botKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (cleanKey === 'cuang' || cleanKey === 'reefblast-bot') {
    return '/home/agent/orca/learnings/reefblast-docker/policy.json';
  }
  if (cleanKey.startsWith('reefblast-bot-')) {
    const sub = cleanKey.replace(/^reefblast-bot-/, '');
    return path.join('/home/agent/orca/learnings', `reefblast-docker-${sub}`, 'policy.json');
  }
  return path.join('/home/agent/orca/learnings', `reefblast-docker-${cleanKey}`, 'policy.json');
}

function getBotPolicy(botKey) {
  if (fleetStatusCache.data) {
    const found = fleetStatusCache.data.find(s => s.key === botKey);
    if (found?.status?.policy) {
      return {
        allowBuying: found.status.policy.allowBuying !== false,
        allowSalvaging: found.status.policy.allowSalvaging === true,
        allowMarketSelling: found.status.policy.allowMarketSelling === true,
        updatedAt: found.status.policy.updatedAt || null
      };
    }
  }

  const pPath = getBotPolicyPath(botKey);
  try {
    if (fs.existsSync(pPath)) {
      const parsed = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      return {
        allowBuying: parsed.allowBuying !== false,
        allowSalvaging: parsed.allowSalvaging === true,
        allowMarketSelling: parsed.allowMarketSelling === true,
        updatedAt: parsed.updatedAt || null
      };
    }
  } catch (_) {}
  return {
    allowBuying: true,
    allowSalvaging: false,
    allowMarketSelling: false,
    updatedAt: null
  };
}

function setBotPolicy(botKey, updates) {
  const current = getBotPolicy(botKey);
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const pPath = getBotPolicyPath(botKey);
  const dir = path.dirname(pPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pPath, JSON.stringify(updated, null, 2));

  if (botKey !== 'cuang' && botKey !== 'william') {
    swarmRequest('POST', '/fleet/policy', { key: botKey, policy: updated }).catch(() => {});
  } else {
    const containerName = getContainerName(botKey);
    if (isContainerRunning(containerName)) {
      exec(`docker cp ${pPath} ${containerName}:/app/policy.json 2>/dev/null`, () => {});
    }
  }

  fleetStatusCache.lastFetch = 0;
  return updated;
}

function toggleBotPolicy(botKey, setting) {
  const current = getBotPolicy(botKey);
  if (setting === 'buy') {
    return setBotPolicy(botKey, { allowBuying: !current.allowBuying });
  } else if (setting === 'salvage') {
    return setBotPolicy(botKey, { allowSalvaging: !current.allowSalvaging });
  } else if (setting === 'sell') {
    return setBotPolicy(botKey, { allowMarketSelling: !current.allowMarketSelling });
  } else if (setting === 'all') {
    const anyActive = current.allowBuying || current.allowSalvaging || current.allowMarketSelling;
    if (anyActive) {
      return setBotPolicy(botKey, { allowBuying: false, allowSalvaging: false, allowMarketSelling: false });
    } else {
      return setBotPolicy(botKey, { allowBuying: true, allowSalvaging: false, allowMarketSelling: true });
    }
  }
  return current;
}

function getReefblastStatus(botKey) {
  if (fleetStatusCache.byKey && fleetStatusCache.byKey[botKey]) {
    return fleetStatusCache.byKey[botKey].status;
  }
  const containerName = getContainerName(botKey);
  return {
    ok: false,
    stopped: true,
    running: false,
    containerName,
    dockerUsage: 'Stopped / Disabled'
  };
}

async function getReefblastLogs(botKey, lines = 12) {
  const isDedicated = botKey === 'cuang' || botKey === 'william';
  const containerName = isDedicated ? getContainerName(botKey) : 'reefblast-swarm';
  try {
    const num = Math.min(50, Math.max(5, parseInt(lines, 10) || 12));
    const tailNum = isDedicated ? num : num * 6;
    const res = await dockerRequest('GET', `/containers/${containerName}/logs?stdout=1&stderr=1&tail=${tailNum}`, null, 3000);
    if (res.status === 200) {
      const buf = res.data;
      let str = '';
      let offset = 0;
      while (offset < buf.length) {
        if (offset + 8 > buf.length) break;
        const size = buf.readUInt32BE(offset + 4);
        str += buf.slice(offset + 8, offset + 8 + size).toString('utf-8');
        offset += 8 + size;
      }
      if (str.trim()) {
        if (!isDedicated) {
          const creds = getBotCredentials(botKey);
          const filterTokens = [botKey, creds?.name, creds?.email].filter(Boolean).map(t => t.toLowerCase());
          const allLines = str.split('\n');
          const matching = allLines.filter(line => {
            const lower = line.toLowerCase();
            return filterTokens.some(tok => lower.includes(tok));
          });
          if (matching.length > 0) {
            return matching.slice(-num).join('\n');
          }
        }
        return str.trim().split('\n').slice(-num).join('\n');
      }
    }
  } catch (_) {}
  return 'No logs recorded.';
}

async function getServerStats() {
  const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const usedMem = (totalMem - freeMem).toFixed(2);
  const memPct = Math.round((usedMem / totalMem) * 100);

  const loads = os.loadavg().map(l => l.toFixed(2)).join(', ');
  const cpus = os.cpus().length;

  let containers = [];
  try {
    const res = await dockerRequest('GET', '/containers/json', null, 3000);
    if (res.status === 200) {
      const list = JSON.parse(res.data.toString('utf-8'));
      containers = list.map(c => ({
        name: (c.Names?.[0] || '').replace(/^\//, ''),
        status: c.Status || '',
        image: c.Image || ''
      }));
    }
  } catch (_) {}

  return {
    totalMem,
    freeMem,
    usedMem,
    memPct,
    loads,
    cpus,
    containers
  };
}

// --- Embed Generators ---

function buildReefblastFleetEmbed(allStatuses = null, page = 0, pageSize = 15) {
  if (!allStatuses) {
    allStatuses = getCachedFleetStatusesSync();
  }

  const activeBots = allStatuses.filter(b => b.status.running && !b.status.stopped);
  const stoppedBots = allStatuses.filter(b => b.status.stopped || !b.status.running);

  const totalBots = allStatuses.length;
  const totalPages = Math.max(1, Math.ceil(totalBots / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const embed = new EmbedBuilder()
    .setTitle('🌊 Reefblast Fleet Telemetry')
    .setDescription(
      `Operational Command Center for autonomous Reefblast naval daemons.\n` +
      `**Fleet Strength**: \`${totalBots}\` Daemons | 🟢 **Active**: \`${activeBots.length}\` | 🔴 **Stopped**: \`${stoppedBots.length}\``
    )
    .setColor(activeBots.length > 0 ? 0x0284c7 : 0xef4444)
    .setFooter({ text: `Page ${safePage + 1} of ${totalPages} • Total Daemons: ${totalBots} • Use ◀️ / ▶️ or 📄 to scroll roster` })
    .setTimestamp();

  let driftFound = null;

  // Rich individual cards if fleet has <= 5 bots
  if (totalBots <= 5) {
    for (const { key: botKey, index, status: data } of allStatuses) {
      const isWilliam = botKey === 'william';
      const isCuang = botKey === 'cuang';
      const title = isWilliam ? 'Captain William' : (isCuang ? 'Captain Cuang-Bot' : `Captain ${data.me?.name || botKey}`);
      const emoji = isWilliam ? '🏴‍☠️' : (isCuang ? '🤖' : '⚓');

      if (data.driftDetected && !driftFound) driftFound = data.driftDetected;

      if (data.stopped || !data.running) {
        embed.addFields({
          name: `[#${index}] ${emoji} ${title} [Disabled]`,
          value: `🔴 **Status**: \`STOPPED / DISABLED\`\nUse \`/reefblast start target:#${index}\` to resume farming.`
        });
      } else if (data.ok && data.me) {
        const me = data.me;
        const skills = me.skills || {};
        const eqItem = (me.items || []).find(i => i.uid === me.equipped);
        const eqQ = eqItem && !eqItem.bound ? ` [**${calcItemQuality(eqItem)}% Qual**]` : '';
        const eqName = eqItem ? `${formatWeaponName(eqItem.w)}${eqQ} (Atk +${((eqItem.atk || 0)*100).toFixed(1)}%)` : 'Default Popper';
        const uptime = data.stats?.startedAt ? formatDuration(Date.now() - data.stats.startedAt) : 'Active';
        const allowBuying = data.policy?.allowBuying ?? true;

        embed.addFields({
          name: `[#${index}] ${emoji} ${title} (Lv. ${me.level}) [${allowBuying ? 'Purchasing Allowed 🛒' : 'Zero-Purchase Enforced 🛡️'}]`,
          value: [
            `💰 **Coins**: \`${formatNumber(me.coins)}\` | 📍 **Zone**: \`${data.zone || 'Harbor'}\``,
            `🚢 **Vessel**: \`${formatBoatName(me.boat)}\` | ⚔️ **Weapon**: \`${eqName}\``,
            `🔥 **Combo**: \`${data.combo || 0}\` (Best: \`${data.stats?.bestCombo || 0}\`)`,
            `🧠 **Skills**: \`Atk:${skills.atk||0} Aspd:${skills.aspd||0} Crit:${skills.crit||0} Def:${skills.def||0} HP:${skills.hp||0}\``,
            `💻 **Container**: \`${data.dockerUsage}\` (Uptime: ${uptime})`
          ].join('\n')
        });
      } else {
        embed.addFields({
          name: `[#${index}] ${emoji} ${title}`,
          value: `⚠️ Offline or starting up (${data.error || `Check container ${data.containerName}`})`
        });
      }
    }
  } else {
    // When fleet > 5 bots:

    // 1. Core Daemons Spotlight (if on page 0)
    if (safePage === 0) {
      const coreLines = [];
      for (const { key: botKey, index, status: data } of allStatuses.slice(0, 2)) {
        const isWilliam = botKey === 'william';
        const isCuang = botKey === 'cuang';
        const title = isWilliam ? 'Captain William' : (isCuang ? 'Captain Cuang-Bot' : `Captain ${data.me?.name || botKey}`);
        const stateEmoji = data.stopped || !data.running ? '🔴' : '🟢';

        if (data.driftDetected && !driftFound) driftFound = data.driftDetected;

        if (data.ok && data.me) {
          const eqItem = (data.me.items || []).find(i => i.uid === data.me.equipped);
          const eqQ = eqItem && !eqItem.bound ? ` [${calcItemQuality(eqItem)}% Qual]` : '';
          const eqName = eqItem ? `${formatWeaponName(eqItem.w)}${eqQ}` : 'Default Popper';
          coreLines.push(`• [#${index}] ${stateEmoji} **${title}** (Lv. ${data.me.level}) | 📍 \`${data.zone || 'Harbor'}\` | 💰 \`${formatNumber(data.me.coins)}\` | ⚔️ \`${eqName}\``);
        } else {
          coreLines.push(`• [#${index}] ${stateEmoji} **${title}** | \`${data.stopped || !data.running ? 'STOPPED' : 'Connecting...'}\``);
        }
      }
      if (coreLines.length > 0) {
        embed.addFields({
          name: '👑 Core Daemons Spotlight',
          value: coreLines.join('\n')
        });
      }
    }

    // 2. Swarm Shard Distribution & Analytics
    const shardCounts = {};
    for (const s of allStatuses) {
      const sh = (s.status?.shardName || s.status?.containerName || 'reefblast-swarm').replace('reefblast-', '');
      shardCounts[sh] = (shardCounts[sh] || 0) + 1;
    }
    const shardBreakdown = Object.entries(shardCounts).map(([k, v]) => `\`${k}\`: **${v}**`).join(' | ');

    const levels = allStatuses.map(s => s.status?.me?.level).filter(Boolean);
    const avgLevel = levels.length ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : '1.0';
    const totalCoins = allStatuses.reduce((acc, s) => acc + (s.status?.me?.coins || 0), 0);

    embed.addFields({
      name: '📊 Swarm Shard Distribution & Analytics',
      value: [
        `🚢 **Containers**: ${shardBreakdown}`,
        `📈 **Avg Fleet Level**: \`Lv.${avgLevel}\` | 💰 **Total Coins**: \`${formatNumber(totalCoins)}\``,
        `🟢 **Active**: \`${activeBots.length}\` | 🔴 **Disabled**: \`${stoppedBots.length}\``
      ].join('\n')
    });

    // 3. Paginated Roster Table for safePage
    const startIdx = safePage * pageSize;
    const endIdx = Math.min(totalBots, startIdx + pageSize);
    const pageBots = allStatuses.slice(startIdx, endIdx);

    const rosterLines = pageBots.map(({ key, index, status: data }) => {
      const isWilliam = key === 'william';
      const isCuang = key === 'cuang';
      const rawName = isWilliam ? 'William' : (isCuang ? 'Cuang-Bot' : (data.me?.name || key));
      const name = rawName.slice(0, 14);
      const lvl = data.me?.level ? `Lv.${data.me.level}` : 'Lv.?';
      const zone = (data.zone || 'Harbor').slice(0, 8);
      const state = data.stopped || !data.running ? '🔴' : '🟢';
      const shard = (data.shardName || data.containerName || 'swarm').replace('reefblast-', '').slice(0, 8);
      return `${String(index).padStart(2)} | ${state} | ${name.padEnd(14)} | ${lvl.padEnd(5)} | ${zone.padEnd(8)} | ${shard}`;
    });

    const val = `\`\`\`text\n # | St | Captain        | Level | Zone     | Shard\n` +
                `---+----+----------------+-------+----------+---------\n` +
                rosterLines.join('\n') + `\n\`\`\``;

    embed.addFields({
      name: `📋 Fleet Roster (Page ${safePage + 1}/${totalPages}: #${startIdx + 1} to #${endIdx} of ${totalBots})`,
      value: val.slice(0, 1024)
    });

    embed.addFields({
      name: '🎯 Bulk Control Quick Reference',
      value: `• Disable range: \`/reefblast stop target:3-${allStatuses.length}\`\n• Disable generated bots: \`/reefblast stop target:non-core\` (or button below)\n• Disable all bots: \`/reefblast stop target:all\``
    });
  }

  // Live game definitions drift telemetry alert
  if (driftFound) {
    embed.addFields({
      name: '✨ Live Game Update Active (v201)',
      value: `• **Detected**: \`${new Date(driftFound.detectedAt).toLocaleTimeString()}\`\n• **Status**: Fleet auto-adjusted AM-GM tree (Cap 50) and active T7 weapons!\n• **Antigravity**: Ready to dispatch if further remediation is required.`
    });
  }

  return sanitizeEmbed(embed);
}

function buildReefblastCaptainEmbed(botKey, allStatuses = null) {
  let data = null;
  if (allStatuses) {
    const found = allStatuses.find(s => s.key === botKey);
    if (found) data = found.status;
  }
  if (!data) {
    data = getReefblastStatus(botKey);
  }

  const allBots = allStatuses ? allStatuses.map(s => s.key) : listFleetBots();
  const botIdx = allBots.indexOf(botKey) + 1;
  const idxStr = botIdx > 0 ? `[#${botIdx}] ` : '';
  const isWilliam = botKey === 'william';
  const isCuang = botKey === 'cuang';
  const name = isWilliam ? 'Captain William' : (isCuang ? 'Captain Cuang-Bot' : `Captain ${data.me?.name || botKey}`);
  const color = isWilliam ? 0xeab308 : (isCuang ? 0x10b981 : 0x3b82f6);

  const embed = new EmbedBuilder()
    .setTitle(`🌊 Reefblast Profile: ${idxStr}${name}`)
    .setColor(color)
    .setFooter({ text: `Daemon #${botIdx} of ${allBots.length} | Container: ${data.containerName}` })
    .setTimestamp();

  if (data.stopped || !data.running) {
    embed.setDescription(`🔴 **Daemon Status: DISABLED / STOPPED**\nThis bot daemon is currently shut down. You can safely play manually in your browser without getting kicked or disconnected.\nClick the **▶️ Enable ${name}** button below to start autonomous farming.`);
    embed.addFields({
      name: '⚙️ Daemon State',
      value: `• **Index**: \`#${botIdx}\`\n• **Container**: \`${data.containerName}\`\n• **Power State**: \`STOPPED\`\n• **Resources**: \`0 MiB (0.00% CPU)\``
    });
    return embed;
  }

  if (!data.ok || !data.me) {
    embed.setDescription(`⚠️ Unable to read telemetry: ${data.error || 'Unknown error'}`);
    return embed;
  }

  const me = data.me;
  const skills = me.skills || {};
  const stats = data.stats || {};
  const uptime = stats.startedAt ? formatDuration(Date.now() - stats.startedAt) : 'N/A';

  embed.setDescription(
    isWilliam
      ? `🛡️ **Endgame Grinder**: ${data.policy?.allowBuying ? 'Purchasing enabled (Hulls, Crafts & Helpers allowed)' : 'Zero purchases'}, strict salvage lock, optimal gear-switching & realistic sailing.`
      : (isCuang
          ? '⚔️ **Autonomous Scavenger**: Full reign auto-sniping, craft optimization, and AM-GM combat progression.'
          : '⚓ **Autonomous Naval Daemon**: Continuous farming, AM-GM leveling, and optimal combat progression.')
  );

  embed.addFields(
    {
      name: '📊 Vital Stats',
      value: [
        `• **Level**: \`${me.level}\` (XP: \`${formatNumber(Math.round(me.xp || 0))}\`)`,
        `• **Coins**: \`${formatNumber(me.coins)}\``,
        `• **Zone**: \`${formatZoneDisplayName(data.zone)}\``,
        `• **Current Combo**: \`${data.combo || 0}\``,
        `• **Best Combo**: \`${stats.bestCombo || 0}\``
      ].join('\n'),
      inline: true
    },
    {
      name: '🚢 Vessel & Fleet',
      value: (() => {
        const eqItem = (me.items || []).find(i => i.uid === me.equipped);
        const eqQ = eqItem && !eqItem.bound ? ` [Qual: **${calcItemQuality(eqItem)}%**]` : '';
        const eqWeaponDisplay = eqItem ? `${formatWeaponName(eqItem.w)}${eqQ}` : 'Default Popper';
        return [
          `• **Equipped Boat**: \`${formatBoatName(me.boat)}\``,
          `• ⚔️ **Weapon**: ${eqWeaponDisplay}`,
          `• **Active Helper**: \`${me.helper || 'None'}\``,
          `• **Fleet Boats**: \`${(me.boats || []).length}\` owned`,
          `• **Tavern Crew**: \`${(me.helpers || []).length}\` hired`,
          `• **Points Available**: \`${me.points || 0}\``
        ].join('\n');
      })(),
      inline: true
    },
    {
      name: '🧠 Optimal AM-GM Skill Tree',
      value: [
        `• 💥 **Attack**: \`${skills.atk || 0}\``,
        `• ⚡ **Attack Speed**: \`${skills.aspd || 0}\``,
        `• 🎯 **Critical Chance**: \`${skills.crit || 0}\``,
        `• 🛡️ **Defense**: \`${skills.def || 0}\``,
        `• ❤️ **Max HP**: \`${skills.hp || 0}\``,
        `• 🩹 **HP Regen**: \`${skills.regen || 0}\``
      ].join('\n'),
      inline: true
    }
  );

  // Inventory display
  const items = me.items || [];
  if (items.length > 0) {
    const itemList = items.map((it, idx) => {
      const isEq = it.uid === me.equipped;
      const wName = formatWeaponName(it.w);
      const isLock = it.lock || it.bound ? ' 🔒' : '';
      const eqMark = isEq ? ' 🎯 [EQUIPPED]' : '';
      const q = calcItemQuality(it);
      const qBadge = it.bound ? ' *(Starter)*' : (q >= 70 ? ` [✨ Quality: **${q}%**]` : (q < 40 ? ` [🔻 Quality: **${q}%**]` : ` [Quality: **${q}%**]`));
      return `${idx + 1}. **${wName}**${eqMark}${isLock}${qBadge} (+${((it.atk || 0)*100).toFixed(1)}% Atk, +${((it.aspd || 0)*100).toFixed(1)}% Spd, +${((it.crit || 0)*100).toFixed(1)}% Crit)`;
    }).join('\n');

    embed.addFields({
      name: `🎒 Weapon Arsenal (${items.length} items)`,
      value: itemList.length > 1000 ? itemList.slice(0, 990) + '...' : itemList
    });
  }

  embed.addFields({
    name: '📈 Session Telemetry',
    value: [
      `• **Session Uptime**: \`${uptime}\``,
      `• **Shots Intercepted**: \`${formatNumber(stats.shotsIntercepted || 0)}\``,
      `• **Upgrades / Snipes**: \`${stats.upgradesPurchased || stats.marketDealsSniped || 0}\``,
      `• **Docker Memory & CPU**: \`${data.dockerUsage}\``
    ].join('\n')
  });

  const policy = data.policy || getBotPolicy(botKey);
  const policyLines = [
    `• **Purchases**: \`${policy.allowBuying ? 'ENABLED 🛒 (Hulls, Crafts, Tavern & Snipes)' : 'LOCKED 🛡️ (Zero Purchases)'}\``,
    `• **Salvaging**: \`${policy.allowSalvaging ? 'ACTIVE ♻️ (Scrap junk weapons)' : 'STRICT LOCK 🔒 (100% Inventory Preserved)'}\``,
    `• **Market Selling**: \`${policy.allowMarketSelling ? 'ACTIVE 🏪 (List surplus loot)' : 'DISABLED 🔒 (No market listings)'}\``,
    `• **Daemon Power**: \`${data.running ? 'RUNNING ▶️' : 'STOPPED 🛑'}\``
  ];
  if (policy.targetWeapon) {
    const targetName = formatWeaponName(policy.targetWeapon);
    policyLines.push(`• **Target Weapon**: \`${targetName} (${policy.targetWeapon})\` 🎯 *(One-off priority exception)*`);
  }

  embed.addFields({
    name: '🛡️ Safety & Feature Policies',
    value: policyLines.join('\n')
  });

  if (data.driftDetected) {
    embed.addFields({
      name: '✨ Game Definitions Drift Monitor',
      value: `• **Status**: \`Adaptive Engine Active (Auto-Adjusted)\`\n• **Detected**: \`${new Date(data.driftDetected.detectedAt).toLocaleTimeString()}\`\n• **Changes Logged**: \`${data.driftDetected.changes?.length || 0} updates applied\``
    });
  }

  return embed;
}

function buildProfileSelectRow(allStatuses = null, selectedKey = null, page = 0, pageSize = 15) {
  if (!allStatuses) {
    allStatuses = getCachedFleetStatusesSync();
  }
  const totalBots = allStatuses.length;
  const totalPages = Math.max(1, Math.ceil(totalBots / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const startIdx = safePage * pageSize;
  const endIdx = Math.min(totalBots, startIdx + pageSize);
  const pageBots = allStatuses.slice(startIdx, endIdx);

  const options = pageBots.map(({ key, index, status: data }) => {
    const isWilliam = key === 'william';
    const isCuang = key === 'cuang';
    const name = isWilliam ? 'William' : (isCuang ? 'Cuang-Bot' : (data.me?.name || key));
    const lvl = data.me?.level ? `Lv.${data.me.level}` : 'Lv.?';
    const zone = data.zone || 'Harbor';
    const coins = data.me?.coins ? `${formatNumber(data.me.coins)}c` : '0c';
    const stateEmoji = data.stopped || !data.running ? '🔴' : '🟢';
    const shard = (data.shardName || data.containerName || 'swarm').replace('reefblast-', '');

    return {
      label: `#${index} ${name.slice(0, 18)} (${lvl})`,
      description: `${shard} | ${zone} | ${coins} | ${data.stopped || !data.running ? 'Disabled' : 'Active'}`.slice(0, 100),
      value: key,
      emoji: stateEmoji,
      default: selectedKey === key
    };
  });

  const menuOptions = [];

  if (safePage > 0) {
    menuOptions.push({
      label: `⬆️ Browse Previous Page (${safePage}/${totalPages})`,
      description: `View bots #${(safePage - 1) * pageSize + 1} to #${safePage * pageSize}`,
      value: `__nav_page:${safePage - 1}`,
      emoji: '⬆️'
    });
  }

  for (const opt of options) {
    menuOptions.push(opt);
  }

  if (safePage < totalPages - 1) {
    menuOptions.push({
      label: `⬇️ Browse Next Page (${safePage + 2}/${totalPages})`,
      description: `View bots #${(safePage + 1) * pageSize + 1} to #${Math.min(totalBots, (safePage + 2) * pageSize)}`,
      value: `__nav_page:${safePage + 1}`,
      emoji: '⬇️'
    });
  }

  menuOptions.push({
    label: `🔢 Jump to Any Bot # or Page...`,
    description: `Type index (1 to ${totalBots}) to inspect any captain`,
    value: '__nav_modal:jump',
    emoji: '🔍'
  });

  const placeholder = totalBots <= 15
    ? `🔍 Jump to Bot Profile (#1 to #${totalBots})...`
    : `🔍 Page ${safePage + 1}/${totalPages} (#${startIdx + 1} to #${endIdx}) — Select Bot or Scroll...`;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('rb:select_profile')
      .setPlaceholder(placeholder)
      .addOptions(menuOptions.length > 0 ? menuOptions : [{ label: 'No Bots Available', value: 'none' }])
  );
}

function buildReefblastActionRows(allStatuses = null, page = 0, pageSize = 15) {
  if (!allStatuses) {
    allStatuses = getCachedFleetStatusesSync();
  }
  const totalBots = allStatuses.length;
  const totalPages = Math.max(1, Math.ceil(totalBots / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const prevPage = Math.max(0, safePage - 1);
  const nextPage = Math.min(totalPages - 1, safePage + 1);

  // Row 0: Roster Scrolling Controls (Guaranteed Unique Custom IDs)
  const scrollRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rb:fleet_nav:first:0')
      .setLabel('⏮️ First')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`rb:fleet_nav:prev:${prevPage}`)
      .setLabel('◀️ Prev')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`rb:open_modal:fleet_jump:${safePage + 1}:${totalPages}`)
      .setLabel(`📄 ${safePage + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:fleet_nav:next:${nextPage}`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(safePage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`rb:fleet_nav:last:${totalPages - 1}`)
      .setLabel('⏭️ Last')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1)
  );

  // Row 1: Operations
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rb:refresh_page:${safePage}`)
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('rb:logs')
      .setLabel('Fleet Logs')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('rb:add_bot')
      .setLabel('Add Bot ➕')
      .setEmoji('⚓')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('rb:deploy_antigravity')
      .setLabel('Antigravity Fixer')
      .setEmoji('🤖')
      .setStyle(ButtonStyle.Secondary)
  );

  // Row 2: Mass Controls
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rb:start_all')
      .setLabel('Start All')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('rb:stop_all')
      .setLabel('Stop All')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('rb:open_modal:start_index')
      .setLabel('Start #...')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('rb:open_modal:stop_index')
      .setLabel('Stop #...')
      .setEmoji('🛑')
      .setStyle(ButtonStyle.Danger)
  );

  // Row 3: Page-Scoped Profile Select Menu
  const selectRow = buildProfileSelectRow(allStatuses, null, safePage, pageSize);

  return [scrollRow, navRow, controlRow, selectRow];
}

function buildReefblastCaptainActionRows(botKey, allStatuses = null) {
  if (!allStatuses) {
    allStatuses = getCachedFleetStatusesSync();
  }
  const allBots = allStatuses.map(s => s.key);
  const currentIdx = allBots.indexOf(botKey);
  const prevIdx = (currentIdx - 1 + allBots.length) % allBots.length;
  const nextIdx = (currentIdx + 1) % allBots.length;
  const prevKey = allBots[prevIdx];
  const nextKey = allBots[nextIdx];
  const pageOfBot = Math.floor(Math.max(0, currentIdx) / 15);

  const name = botKey === 'william' ? 'William' : (botKey === 'cuang' ? 'Cuang-Bot' : botKey);
  const policy = getBotPolicy(botKey);
  const anyActive = policy.allowBuying || policy.allowSalvaging || policy.allowMarketSelling;

  const currentStatus = allStatuses.find(s => s.key === botKey)?.status;
  const running = currentStatus ? (currentStatus.running && !currentStatus.stopped) : isContainerRunning(getContainerName(botKey));

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rb:refresh:${botKey}`)
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`rb:toggle:${botKey}`)
      .setLabel(running ? `Disable ${name}` : `Enable ${name}`)
      .setEmoji(running ? '🛑' : '▶️')
      .setStyle(running ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rb:fleet_page:${pageOfBot}`)
      .setLabel('Fleet View')
      .setEmoji('🌐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:profile:prev:${prevKey}`)
      .setLabel(`◀️ #${prevIdx + 1}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:profile:next:${nextKey}`)
      .setLabel(`#${nextIdx + 1} ▶️`)
      .setStyle(ButtonStyle.Secondary)
  );

  const policyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rb:toggle_policy:${botKey}:buy`)
      .setLabel(policy.allowBuying ? 'Buying: ON' : 'Buying: OFF')
      .setEmoji(policy.allowBuying ? '🛒' : '🛡️')
      .setStyle(policy.allowBuying ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:toggle_policy:${botKey}:salvage`)
      .setLabel(policy.allowSalvaging ? 'Salvage: ON' : 'Salvage: LOCK')
      .setEmoji(policy.allowSalvaging ? '♻️' : '🔒')
      .setStyle(policy.allowSalvaging ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:toggle_policy:${botKey}:sell`)
      .setLabel(policy.allowMarketSelling ? 'Selling: ON' : 'Selling: OFF')
      .setEmoji(policy.allowMarketSelling ? '🏪' : '🔒')
      .setStyle(policy.allowMarketSelling ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rb:toggle_policy:${botKey}:all`)
      .setLabel(anyActive ? 'Lock All' : 'Enable All')
      .setEmoji(anyActive ? '🔒' : '⚡')
      .setStyle(anyActive ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rb:logs:${botKey}`)
      .setLabel('Logs')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  const selectRow = buildProfileSelectRow(allStatuses, botKey, pageOfBot, 15);

  return [navRow, policyRow, selectRow];
}

function buildAinimateStatusEmbed() {
  const workflows = loadWorkflows(true);
  const active = getActiveWorkflow();
  const recent = workflows.slice(0, 6);

  const embed = new EmbedBuilder()
    .setTitle('🎬 AI-Nimate Autonomous Studio')
    .setDescription('Orchestration engine for autonomous video essay and content generation.')
    .setColor(0x8b5cf6)
    .setTimestamp();

  if (active) {
    const activeLogs = getWorkflowLogs(active.project, 5);
    embed.addFields(
      {
        name: `🚀 Active Production: ${active.topic || active.project}`,
        value: [
          `• **Workflow ID**: \`${active.id}\` (PID: \`${active.pid || 'inactive'}\`)`,
          `• **Current Stage**: *${active.stage || 'In Progress'}* (\`${active.progress || 0}%\`)`,
          `• **Channel & Format**: \`${active.channel || 'kausalmedia'}\` • \`${active.format || '16:9'}\``,
          `• **Toggles**: \`Test: ${active.testMode ? 'ON' : 'OFF'} | AudioGate: ${active.audioGate ? 'ON' : 'OFF'} | ScriptGate: ${active.scriptGate ? 'ON' : 'OFF'}\``,
          `• **Started**: \`${active.startedAt ? new Date(active.startedAt).toLocaleTimeString() : 'N/A'}\``
        ].join('\n')
      },
      {
        name: '📜 Live Production Logs (Terminal Stream)',
        value: `\`\`\`text\n${activeLogs.slice(-600)}\n\`\`\``
      }
    );
  } else {
    embed.addFields({
      name: '💤 Active Production',
      value: 'No video production currently active. Click **Create New Video** below to launch a production!'
    });
  }

  if (recent.length > 0) {
    const list = recent.map((w, idx) => {
      let icon = '⚪';
      if (w.status === 'completed') icon = '🟢';
      else if (['queued', 'research', 'script', 'choreography', 'rendering'].includes(w.status)) icon = '🚀';
      else if (['script_wait', 'audio_wait'].includes(w.status)) icon = '⏸️';
      else if (['failed', 'cancelled'].includes(w.status)) icon = '🔴';

      return `${idx + 1}. ${icon} **${(w.topic || w.project).slice(0, 36)}** (\`${w.id.slice(-8)}\`) — *${w.status.toUpperCase()}*`;
    }).join('\n');

    embed.addFields({
      name: '📋 Ledger Workflows (Select below to inspect/control)',
      value: list
    });
  }

  return embed;
}

function buildAinimateStatusComponents(selectedWfId = null) {
  const workflows = loadWorkflows(true);
  const rows = [];

  // Dropdown for selecting any workflow
  if (workflows.length > 0) {
    const options = workflows.slice(0, 25).map(w => {
      let icon = '⚪';
      if (w.status === 'completed') icon = '🟢';
      else if (['queued', 'research', 'script', 'choreography', 'rendering'].includes(w.status)) icon = '🚀';
      else if (['script_wait', 'audio_wait'].includes(w.status)) icon = '⏸️';
      else if (['failed', 'cancelled'].includes(w.status)) icon = '🔴';

      const label = `${icon} ${(w.topic || w.project || 'Untitled').slice(0, 85)}`;
      const desc = `${w.status.toUpperCase()} • ${w.project.slice(0, 28)} • ${w.id.slice(-8)}`;

      return {
        label,
        description: desc.slice(0, 100),
        value: w.id,
        default: w.id === selectedWfId
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ain:select_workflow')
      .setPlaceholder('🔍 Select a workflow to inspect and control...')
      .addOptions(options);

    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // General controls row
  const active = getActiveWorkflow();
  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ain:create:start')
      .setLabel('Create New Video')
      .setEmoji('🎬')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ai:refresh')
      .setLabel('Refresh Studio')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ai:channels')
      .setLabel('Content Ideas')
      .setEmoji('💡')
      .setStyle(ButtonStyle.Secondary)
  );

  if (active) {
    btnRow.addComponents(
      new ButtonBuilder()
        .setCustomId('ai:stop')
        .setLabel('Halt Active')
        .setEmoji('🛑')
        .setStyle(ButtonStyle.Danger)
    );
  }

  rows.push(btnRow);
  return rows;
}

// --- Interactive Production Wizard State & Builders ---
const userWizards = new Map();

function getOrCreateWizard(userId) {
  if (!userWizards.has(userId)) {
    userWizards.set(userId, {
      channel: 'kausalmedia',
      testMode: false,
      audioGate: false,
      scriptGate: false,
      step: 1
    });
  }
  return userWizards.get(userId);
}

function buildWizardStep1Embed() {
  const activeChannels = listChannels(true);
  const chList = activeChannels.map(c => `• **${c.name}** (\`${c.id}\`) — *${c.description || c.theme || 'Channel'}*`).join('\n');
  return new EmbedBuilder()
    .setTitle('🎬 Create New Video — Step 1: Select Channel')
    .setDescription(`Choose the publication channel profile for this video production.\n\n**Available Channels:**\n${chList}`)
    .setColor(0x8b5cf6)
    .setFooter({ text: 'Step 1 of 3 • AI-nimate Production Wizard' });
}

function buildWizardStep1Components() {
  const activeChannels = listChannels(true);
  const options = activeChannels.map(c => ({
    label: c.name.slice(0, 100),
    description: (c.description || `@${c.id}`).slice(0, 100),
    value: c.id,
    emoji: '🏛️'
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ain:wiz:select_channel')
    .setPlaceholder('📺 Select Channel...')
    .addOptions(options);

  return [new ActionRowBuilder().addComponents(menu)];
}

function buildWizardStep2Embed(wizard) {
  const ch = getChannel(wizard.channel) || { name: wizard.channel };
  return new EmbedBuilder()
    .setTitle('🎬 Create New Video — Step 2: Configuration Toggles')
    .setDescription(
      `Configure production gates and simulation mode for **${ch.name}**.\n\n` +
      `• **Target Channel**: \`${ch.name} (${wizard.channel})\`\n` +
      `• **🧪 Test Mode**: ${wizard.testMode ? '🟢 **ON** *(Renders prompt-box fallback, zero clip art)*' : '⚪ **OFF** *(Full visual production)*'}\n` +
      `• **⏸️ Audio Gate**: ${wizard.audioGate ? '🟢 **ON** *(Pauses before TTS to choose audio source)*' : '⚪ **OFF** *(Auto-synthesize Edge TTS)*'}\n` +
      `• **📝 Script Gate**: ${wizard.scriptGate ? '🟢 **ON** *(Pauses to bring own script or revise via guidelines)*' : '⚪ **OFF** *(Auto-proceed with draft)*'}`
    )
    .setColor(0x8b5cf6)
    .setFooter({ text: 'Step 2 of 3 • Toggle flags then click Next ➡️' });
}

function buildWizardStep2Components(wizard) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ain:wiz:toggle:test')
      .setLabel(`Test Mode: ${wizard.testMode ? 'ON' : 'OFF'}`)
      .setEmoji('🧪')
      .setStyle(wizard.testMode ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:toggle:audio')
      .setLabel(`Audio Gate: ${wizard.audioGate ? 'ON' : 'OFF'}`)
      .setEmoji('⏸️')
      .setStyle(wizard.audioGate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:toggle:script')
      .setLabel(`Script Gate: ${wizard.scriptGate ? 'ON' : 'OFF'}`)
      .setEmoji('📝')
      .setStyle(wizard.scriptGate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ain:wiz:next')
      .setLabel('Next: Select Idea ➡️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:cancel')
      .setLabel('Cancel')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

function buildWizardStep3Embed(wizard) {
  const ch = getChannel(wizard.channel) || { name: wizard.channel };
  return new EmbedBuilder()
    .setTitle('🎬 Create New Video — Step 3: Choose Idea')
    .setDescription(
      `Select a viral idea researched by Antigravity for **${ch.name}**, or provide a custom title/topic.\n\n` +
      `**Configuration:**\n` +
      `• Channel: \`${ch.name}\`\n` +
      `• Test Mode: \`${wizard.testMode ? 'ON' : 'OFF'}\` | Audio Gate: \`${wizard.audioGate ? 'ON' : 'OFF'}\` | Script Gate: \`${wizard.scriptGate ? 'ON' : 'OFF'}\``
    )
    .setColor(0x8b5cf6)
    .setFooter({ text: 'Step 3 of 3 • Select an idea below or click Custom Idea' });
}

function buildWizardStep3Components(wizard) {
  const ideas = getUnusedChannelIdeas(wizard.channel, 8);
  const rows = [];

  const topRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ain:wiz:custom_idea')
      .setLabel('✍️ Custom Idea')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:gen_ideas')
      .setLabel('💡 Daily Trends (Antigravity)')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:refresh_ideas')
      .setLabel('🔄 Reroll Ideas')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ain:wiz:back_to_toggles')
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary)
  );
  rows.push(topRow);

  if (ideas && ideas.length > 0) {
    const options = ideas.slice(0, 10).map((idea, idx) => ({
      label: `${idx + 1}. ${(idea.title || idea.key).slice(0, 85)}`,
      description: `${idea.tag || '💡'} • ${(idea.detail || '').slice(0, 60)}`.slice(0, 100),
      value: idea.key || `idea_${idx}`
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ain:wiz:select_idea')
      .setPlaceholder('💡 Pick an idea from Antigravity pool...')
      .addOptions(options);

    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  return rows;
}

function buildAinimateActionRow(hasActive) {
  return buildAinimateStatusComponents()[1] || new ActionRowBuilder();
}

function buildWorkflowDetailEmbed(wf) {
  const colors = {
    completed: 0x10b981,
    rendering: 0x8b5cf6,
    choreography: 0x8b5cf6,
    script: 0x8b5cf6,
    research: 0x8b5cf6,
    audio_wait: 0xf59e0b,
    script_wait: 0xf59e0b,
    failed: 0xef4444,
    cancelled: 0x64748b
  };

  const stages = [
    { key: 'research', label: '1. 🧠 Domain Research & Dossier', minProg: 10 },
    { key: 'script', label: '2. ✍️ Continuous Narration Script', minProg: 25 },
    { key: 'gates', label: '3. ⏸️ HITL Gate Authorizations', minProg: 35 },
    { key: 'audio', label: '4. 🗣️ Audio Voiceover & Timings', minProg: 45 },
    { key: 'choreography', label: '5. 🎨 5-Layer Stage Choreography', minProg: 65 },
    { key: 'rendering', label: '6. 🎥 Playwright Capture & MP4 Render', minProg: 85 }
  ];

  const milestoneLines = stages.map(st => {
    let icon = '⚪';
    let statusText = 'PENDING';
    const curProg = wf.progress || 0;
    if (wf.status === 'completed' || curProg > st.minProg + 15) {
      icon = '✅';
      statusText = 'DONE';
    } else if (['script_wait', 'audio_wait'].includes(wf.status) && st.key === 'gates') {
      icon = '⏸️';
      statusText = wf.status === 'script_wait' ? 'SCRIPT GATE (WAIT)' : 'AUDIO GATE (WAIT)';
    } else if (wf.status === 'failed') {
      icon = '🔴';
      statusText = 'FAILED';
    } else if (wf.status === st.key || (wf.stage && wf.stage.toLowerCase().includes(st.key))) {
      icon = '🟢';
      statusText = 'IN PROGRESS';
    }
    return `${icon} **${st.label}** \`[${statusText}]\``;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`🎬 Workflow Inspector: ${wf.topic || wf.project}`)
    .setDescription(`Direct telemetry & controls for workflow **\`${wf.id}\`** (Project: \`projects/${wf.project}\`).`)
    .setColor(colors[wf.status] || 0x8b5cf6)
    .addFields(
      { name: 'Workflow ID', value: `\`${wf.id}\``, inline: true },
      { name: 'Status', value: `\`${(wf.status || 'unknown').toUpperCase()}\``, inline: true },
      { name: 'Active Stage', value: `*${wf.stage || 'N/A'}*`, inline: true },
      { name: 'Channel Profile', value: `\`${wf.channel || 'kausalmedia'}\` (${wf.format || '16:9'})`, inline: true },
      { name: 'Toggles', value: `Test: \`${wf.testMode ? 'ON' : 'OFF'}\` | AudioGate: \`${wf.audioGate ? 'ON' : 'OFF'}\` | ScriptGate: \`${wf.scriptGate ? 'ON' : 'OFF'}\``, inline: true },
      { name: 'Agent / Worker', value: `\`${wf.agent || 'agy'}\` (PID: \`${wf.pid || 'inactive'}\`)`, inline: true },
      { name: '📊 Granular Production Milestones', value: milestoneLines }
    )
    .setTimestamp();

  // Live Terminal Logs Box
  const liveLogs = getWorkflowLogs(wf.project, 8);
  embed.addFields({
    name: '📜 Live Production Terminal Logs (Real-Time)',
    value: `\`\`\`text\n${liveLogs.slice(-900)}\n\`\`\``
  });

  // Check on-disk assets
  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  const mp4Files = [];
  if (fs.existsSync(projectDir)) {
    try {
      const renderDir = path.join(projectDir, 'render');
      if (fs.existsSync(renderDir)) {
        const renders = fs.readdirSync(renderDir).filter(f => f.endsWith('.mp4'));
        for (const r of renders) {
          const sz = (fs.statSync(path.join(renderDir, r)).size / 1024 / 1024).toFixed(1);
          mp4Files.push(`• \`render/${r}\` (${sz} MB)`);
        }
      }
      const rootMp4s = fs.readdirSync(projectDir).filter(f => f.endsWith('.mp4'));
      for (const r of rootMp4s) {
        const sz = (fs.statSync(path.join(projectDir, r)).size / 1024 / 1024).toFixed(1);
        mp4Files.push(`• \`${r}\` (${sz} MB)`);
      }
    } catch (_) {}
  }

  embed.addFields({
    name: '🎥 Video Artifacts On Disk',
    value: mp4Files.length > 0 ? mp4Files.slice(0, 3).join('\n') : '• *No MP4 video files generated.*'
  });

  if (wf.error) {
    embed.addFields({
      name: '⚠️ Termination Reason / Error',
      value: `\`\`\`text\n${String(wf.error).slice(0, 600)}\n\`\`\``
    });
  }

  embed.setFooter({ text: `Started: ${wf.startedAt ? new Date(wf.startedAt).toLocaleString() : 'N/A'}` });
  return embed;
}

function buildWorkflowDetailActionRows(wf) {
  const workflows = loadWorkflows(true);
  const rows = [];

  // Dropdown allowing instant switch between workflows
  if (workflows.length > 0) {
    const options = workflows.slice(0, 25).map(w => {
      let icon = '⚪';
      if (w.status === 'completed') icon = '🟢';
      else if (['queued', 'research', 'script', 'choreography', 'rendering'].includes(w.status)) icon = '🚀';
      else if (['script_wait', 'audio_wait'].includes(w.status)) icon = '⏸️';
      else if (['failed', 'cancelled'].includes(w.status)) icon = '🔴';

      return {
        label: `${icon} ${(w.topic || w.project || 'Untitled').slice(0, 85)}`,
        description: `${w.status.toUpperCase()} • ${w.project.slice(0, 28)} • ${w.id.slice(-8)}`.slice(0, 100),
        value: w.id,
        default: w.id === wf.id
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ain:select_workflow')
      .setPlaceholder('🔍 Switch to another workflow...')
      .addOptions(options);

    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // HITL Gate Row: Script Review Gate
  if (wf.status === 'script_wait') {
    const scriptGateRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ain:gate:script:own:${wf.id}`)
        .setLabel('✍️ Bring Your Own Script')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ain:gate:script:guide:${wf.id}`)
        .setLabel('📝 Give Guidelines (Revise)')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(scriptGateRow);
  }

  // HITL Gate Row: Audio Source Gate
  if (wf.status === 'audio_wait') {
    const uploadPortalUrl = `https://cuang.dev/projects/ainimate/${wf.channel || 'kausalmedia'}/${wf.project || wf.id}/upload`;
    const audioGateRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🎙️ Open Web Upload')
        .setStyle(ButtonStyle.Link)
        .setURL(uploadPortalUrl),
      new ButtonBuilder()
        .setCustomId(`ain:gate:audio:edgetts:${wf.id}`)
        .setLabel('🗣️ 1. Edge TTS')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ain:gate:audio:upload:${wf.id}`)
        .setLabel('📁 2. File / URL Modal')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ain:gate:audio:api:${wf.id}`)
        .setLabel('✨ 3. API Voice')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(audioGateRow);
  }

  // Row 1: Execution controls
  const isRunning = ['queued', 'research', 'script', 'choreography', 'rendering'].includes(wf.status);
  const execRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ain:wf:start:${wf.id}`)
      .setLabel(isRunning ? 'Restart Pipeline' : 'Start / Resume')
      .setEmoji(isRunning ? '🔄' : '▶️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ain:wf:stop:${wf.id}`)
      .setLabel('Stop')
      .setEmoji('🛑')
      .setDisabled(!isRunning)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ain:wf:logs:${wf.id}`)
      .setLabel('Logs')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ain:wf:refresh:${wf.id}`)
      .setLabel('Refresh Card')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
  );

  // Row 2: Deletion & navigation
  const deleteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ain:wf:delete:${wf.id}`)
      .setLabel('Delete Record')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ain:wf:purge:${wf.id}`)
      .setLabel('Delete All (+ Files)')
      .setEmoji('💥')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ain:wf:back')
      .setLabel('Back to Overview')
      .setEmoji('🔙')
      .setStyle(ButtonStyle.Secondary)
  );

  rows.push(execRow, deleteRow);
  return rows;
}

function buildServerStatusEmbed(stats = null) {
  if (!stats) {
    const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
    const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    const memPct = Math.round((usedMem / totalMem) * 100);
    const loads = os.loadavg().map(l => l.toFixed(2)).join(', ');
    const cpus = os.cpus().length;
    stats = { totalMem, freeMem, usedMem, memPct, loads, cpus, containers: [] };
  }

  const embed = new EmbedBuilder()
    .setTitle('🖥️ Host & Container Infrastructure')
    .setColor(0x3b82f6)
    .setTimestamp();

  embed.addFields(
    {
      name: '⚙️ Host Resources',
      value: [
        `• **RAM**: \`${stats.usedMem} GB / ${stats.totalMem} GB\` (${stats.memPct}%)`,
        `• **Free RAM**: \`${stats.freeMem} GB\``,
        `• **vCPUs**: \`${stats.cpus} cores\``,
        `• **Load Average**: \`${stats.loads}\``
      ].join('\n'),
      inline: true
    },
    {
      name: '🐳 Core Fleet Containers',
      value: [
        `• **reefblast-bot**: \`${getContainerStats('reefblast-bot')}\``,
        `• **reefblast-bot-william**: \`${getContainerStats('reefblast-bot-william')}\``
      ].join('\n'),
      inline: true
    }
  );

  if (stats.containers.length > 0) {
    const list = stats.containers.slice(0, 10).map(c => `• **${c.name}**: \`${c.status}\``).join('\n');
    embed.addFields({
      name: `📦 Active Docker Containers (${stats.containers.length} total)`,
      value: list
    });
  }

  return embed;
}

// --- Slash Command Definitions ---
const commands = [
  new SlashCommandBuilder()
    .setName('reefblast')
    .setDescription('Commands for autonomous Reefblast naval progression daemons')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Display live status and telemetry for the Reefblast fleet')
        .addIntegerOption(opt =>
          opt.setName('page')
            .setDescription('Fleet roster page number (default: 1)')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub.setName('profile')
        .setDescription('Deep dive inspection into any bot profile by index or name (gear, skills, policies)')
        .addStringOption(opt =>
          opt.setName('target')
            .setDescription('Bot index or name (e.g. 1, 2, #3, william, cuang - default: #1)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('william')
        .setDescription('Deep dive inspection into Captain William (gear, skills, inventory)')
    )
    .addSubcommand(sub =>
      sub.setName('cuang')
        .setDescription('Deep dive inspection into Captain Cuang-Bot (gear, skills, snipes)')
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('View recent auto-progression activity logs')
        .addStringOption(opt =>
          opt.setName('bot')
            .setDescription('Select daemon bot by name or index (e.g. 1, 2, #3, cuang, william)')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('lines')
            .setDescription('Number of lines (5-30)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Enable / start autonomous Reefblast bot daemons (all, range, non-core, or single)')
        .addStringOption(opt =>
          opt.setName('target')
            .setDescription("Bot name, index range (e.g. '3-7', '3-'), 'non-core', 'capt_*', or 'all' (default: all)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Disable / stop autonomous Reefblast bot daemons (all, range, non-core, or single)')
        .addStringOption(opt =>
          opt.setName('target')
            .setDescription("Bot name, index range (e.g. '3-7', '3-'), 'non-core', 'capt_*', or 'all' (default: all)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle a bot daemon on or off by name or index (e.g. cuang, #3)')
        .addStringOption(opt =>
          opt.setName('target')
            .setDescription('Select bot to toggle by name or index (e.g. cuang, #3)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('policy')
        .setDescription('Configure feature policies (purchases, salvaging, selling) for any bot')
        .addStringOption(opt =>
          opt.setName('bot')
            .setDescription('Select bot daemon (e.g. cuang, william, #3, or capt_06e0d0)')
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('buying')
            .setDescription('Allow purchasing hulls, crafts, and helpers')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('salvaging')
            .setDescription('Allow salvaging obsolete junk weapons (default: false)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('selling')
            .setDescription('Allow listing surplus weapons on player market (default: false)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Provision bot(s): manual credentials, random accounts, or email list')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('Provisioning mode')
            .setRequired(false)
            .addChoices(
              { name: '🔑 Define Own Credentials (Manual Login)', value: 'manual' },
              { name: '🎲 Auto-Generate Random Account(s)', value: 'random' },
              { name: '📧 Register Account(s) with Email List', value: 'emails' }
            )
        )
        .addStringOption(opt =>
          opt.setName('email')
            .setDescription('Email address or list of emails (comma/line separated)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('password')
            .setDescription('Password for existing account (manual mode)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Bot identifier / Captain name (or prefix for random)')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('count')
            .setDescription('Number of random bots to generate (default: 1)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('buying')
            .setDescription('Allow purchasing hulls, crafts, and helpers (default: true)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('route')
            .setDescription('Egress network route (default: Smart Rotation)')
            .setRequired(false)
            .addChoices(
              { name: '🔄 Smart Rotation (50% Direct / 50% CF WARP)', value: 'auto' },
              { name: '🛡️ Cloudflare WARP Proxy (Anti-Block)', value: 'cf' },
              { name: '⚡ Direct Host Connection', value: 'direct' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('progress')
        .setDescription('Check active fleet provisioning job progress and live status')
    )
    .addSubcommand(sub =>
      sub.setName('cancel')
        .setDescription('Cancel active or running bulk account provisioning jobs')
    )
    .addSubcommand(sub =>
      sub.setName('agent')
        .setDescription('Deploy or run the Antigravity agent update fixer')
    ),

  new SlashCommandBuilder()
    .setName('ainimate')
    .setDescription('Commands for AI-Nimate Autonomous Video Production Studio')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check active and recent video production workflows')
    )
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Start a new autonomous video generation pipeline')
        .addStringOption(opt =>
          opt.setName('topic')
            .setDescription('Topic or video title')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('channel')
            .setDescription('Target publication channel profile')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('test_mode')
            .setDescription('Run in Test Mode (prompt box simulation fallback, zero clip art)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('audio_gate')
            .setDescription('Enable Audio Gate (pause before audio to choose voice source)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('script_gate')
            .setDescription('Enable Script Gate (pause after script drafting for review/guidelines)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('format')
            .setDescription('Aspect ratio format')
            .setRequired(false)
            .addChoices(
              { name: '16:9 Landscape (YouTube)', value: '16:9' },
              { name: '9:16 Portrait (TikTok/Shorts)', value: '9:16' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Halt currently running video creation workflow')
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a workflow entirely from ledger and optionally remove project directory')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Workflow ID or project slug to delete')
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('files')
            .setDescription('Also purge project directory and video files on disk')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('resume')
        .setDescription('Resume or restart an existing workflow')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Workflow ID or project slug to resume')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('channels')
        .setDescription('List configured channels and unused idea pools')
    )
    .addSubcommand(sub =>
      sub.setName('channel_create')
        .setDescription('Register a new publication channel')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Channel Display Name')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Channel ID / Slug (lowercase, e.g. kausalmedia)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Channel editorial scope and description')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('channel_delete')
        .setDescription('Delete or deactivate a channel profile')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Channel ID to delete')
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('purge')
            .setDescription('Purge JSON file completely from disk')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('ideas_generate')
        .setDescription('Generate fresh trending topic ideas via Antigravity agent')
        .addStringOption(opt =>
          opt.setName('channel')
            .setDescription('Target channel profile')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('View recent AI-Nimate studio log entries')
    ),

  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Commands for host and container monitoring')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Display server hardware metrics, RAM, and Docker container health')
    ),

  new SlashCommandBuilder()
    .setName('mandarin')
    .setDescription('Universal Mandarin Coach, Adaptive Placement & Spaced Repetition Flashcards')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand(sub =>
      sub.setName('menu')
        .setDescription('Open the Mandarin Learning Hub, daily target progress & navigation')
    )
    .addSubcommand(sub =>
      sub.setName('lesson')
        .setDescription('Generate or refresh today’s Mandarin vocabulary & speaking session')
        .addStringOption(opt =>
          opt.setName('pace')
            .setDescription('Session workload depending on your available time today')
            .setRequired(false)
            .addChoices(
              { name: '⚡ Light (3 words / 5 min)', value: 'light' },
              { name: '⚖️ Standard (6 words / 10 min)', value: 'standard' },
              { name: '🔥 Deep (10 words / 20 min)', value: 'deep' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('flashcard')
        .setDescription('Practice interactive SM-2 Mandarin flashcards (flip & grade)')
        .addStringOption(opt =>
          opt.setName('track')
            .setDescription('Select track to review')
            .setRequired(false)
            .addChoices(
              { name: '🌱 HSK 1–2 (Daily Foundations)', value: 'hsk1_2' },
              { name: '🌿 HSK 3–4 (Workplace & Bridge)', value: 'hsk3_4' },
              { name: '🚀 HSK 5–6 (Advanced & Strategy)', value: 'hsk5_6' },
              { name: '⚡ Tech & AIOps (Incident & Metrics)', value: 'tech_aiops' },
              { name: '🌐 All Tracks Combined', value: 'all' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('track')
        .setDescription('Switch active learning track (HSK 1-2, HSK 3-4, HSK 5-6, Tech AIOps, All)')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('Choose your target vocabulary track')
            .setRequired(true)
            .addChoices(
              { name: '🌱 HSK 1–2 (Daily Foundations)', value: 'hsk1_2' },
              { name: '🌿 HSK 3–4 (Workplace & Bridge)', value: 'hsk3_4' },
              { name: '🚀 HSK 5–6 (Advanced & Strategy)', value: 'hsk5_6' },
              { name: '⚡ Tech & AIOps (Incident & Metrics)', value: 'tech_aiops' },
              { name: '🌐 All Tracks Combined', value: 'all' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('prompt')
        .setDescription('Get the 1-tap copyable Gemini Web / Gemini Live speaking & evaluation prompt')
    )
    .addSubcommand(sub =>
      sub.setName('pace')
        .setDescription('Set your default daily Mandarin workload pace')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('Target daily session size')
            .setRequired(true)
            .addChoices(
              { name: '⚡ Light (3 words / 5 min)', value: 'light' },
              { name: '⚖️ Standard (6 words / 10 min)', value: 'standard' },
              { name: '🔥 Deep (10 words / 20 min)', value: 'deep' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('quiz')
        .setDescription('Take an interactive multi-mode retrieval practice quiz')
        .addStringOption(opt =>
          opt.setName('track')
            .setDescription('Filter quiz by vocabulary track')
            .setRequired(false)
            .addChoices(
              { name: '🌱 HSK 1–2 (Daily Foundations)', value: 'hsk1_2' },
              { name: '🌿 HSK 3–4 (Workplace & Bridge)', value: 'hsk3_4' },
              { name: '🚀 HSK 5–6 (Advanced & Strategy)', value: 'hsk5_6' },
              { name: '⚡ Tech & AIOps (Incident & Metrics)', value: 'tech_aiops' },
              { name: '🌐 All Tracks Combined', value: 'all' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('domain')
        .setDescription('Configure percentage ratio of domain-specific AIOps vocabulary (10 to 90)')
        .addIntegerOption(opt =>
          opt.setName('ratio')
            .setDescription('Domain vocabulary ratio percentage (10 to 90)')
            .setRequired(true)
            .setMinValue(10)
            .setMaxValue(90)
        )
    )
    .addSubcommand(sub =>
      sub.setName('baseline')
        .setDescription('Run the universal Mandarin adaptive placement diagnostic & bot-fit test')
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('Check your SM-2 flashcard mastery and learning records')
    )
];

// --- Register Slash Commands with Discord REST API ---
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log(`[Discord Bot] Registering ${commands.length} application slash commands (global)...`);
    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log(`[Discord Bot] Successfully registered ${data.length} global slash commands!`);
  } catch (err) {
    console.error('[Discord Bot] Error registering slash commands:', err);
  }
}

// --- Discord Client Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.on('error', err => {
  console.error('[Discord Client Error Caught]:', err.message);
});
client.on('shardError', (err, shardId) => {
  console.error(`[Discord Shard ${shardId} Error Caught]:`, err.message);
});

client.once('clientReady', () => {
  console.log(`[Discord Bot] Logged in as ${client.user.tag} (${client.user.id})`);
  console.log(`[Discord Bot] Primary AI-Nimate Channel bound: #${AINIMATE_CHANNEL_ID}`);
  console.log(`[Discord Bot] Mandarin Learning Channel bound: #${MANDARIN_CHANNEL_ID}`);
  client.user.setActivity('Reefblast, AI-Nimate & Mandarin AIOps', { type: 3 }); // Watching
  startMandarinDailyScheduler(client);
});

// --- Incoming Messages in #ai-nimate & #mandarin-learning ---
async function handleAinimateMessage(message) {
  if (!message || message.author?.bot) return;
  if (message.channelId === MANDARIN_CHANNEL_ID) {
    return handleMandarinChannelMessage(message);
  }
  if (message.channelId !== AINIMATE_CHANNEL_ID) return;

  // 1. Photo / Image Uploads (Style Bible Ingest)
  if (message.attachments && message.attachments.size > 0) {
    for (const [, att] of message.attachments) {
      const isImage = att.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(att.name);
      const isAudio = att.contentType?.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(att.name);

      if (isImage) {
        try {
          const styleBibleDir = path.join(REPO_ROOT, 'assets', 'style-bible');
          if (!fs.existsSync(styleBibleDir)) fs.mkdirSync(styleBibleDir, { recursive: true });
          const ext = path.extname(att.name) || '.jpg';
          const fileName = `ref_${Date.now()}_${path.basename(att.name, ext).slice(0, 24)}${ext}`;
          const destPath = path.join(styleBibleDir, fileName);

          // Download image file
          await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            https.get(att.url, res => {
              res.pipe(file);
              file.on('finish', () => file.close(resolve));
            }).on('error', err => {
              try { fs.unlinkSync(destPath); } catch (_) {}
              reject(err);
            });
          });

          // Metadata companion
          const metaPath = path.join(styleBibleDir, `${path.basename(fileName, ext)}.json`);
          fs.writeFileSync(metaPath, JSON.stringify({
            originalName: att.name,
            uploadedBy: message.author.tag || message.author.username,
            userId: message.author.id,
            caption: message.content || '',
            sizeBytes: att.size,
            savedAt: new Date().toISOString()
          }, null, 2), 'utf-8');

          await message.reply({
            content: `🎨 **Style Reference Registered!**\n• Asset: \`${fileName}\`\n• Size: \`${(att.size / 1024).toFixed(1)} KB\`\n• Uploader: <@${message.author.id}>\n\nSaved to \`assets/style-bible/\` and indexed for Nano Banana / AI-nimate scene directors.`
          });
        } catch (err) {
          console.error('[Discord Style Bible Ingest Error]:', err);
          await message.reply({ content: `⚠️ Failed to save image reference: ${err.message}` });
        }
        return;
      }

      if (isAudio) {
        const workflows = loadWorkflows();
        const active = workflows.find(w => ['queued', 'research', 'script', 'script_wait', 'audio_wait'].includes(w.status));
        if (!active) {
          await message.reply({ content: `ℹ️ Received audio file, but there is no active workflow waiting for voiceover. Use \`/ainimate create\` first.` });
          return;
        }

        try {
          const tempAudio = path.join(os.tmpdir(), `discord_audio_${Date.now()}_${att.name}`);
          await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(tempAudio);
            https.get(att.url, res => {
              res.pipe(file);
              file.on('finish', () => file.close(resolve));
            }).on('error', reject);
          });

          resumeWorkflowWithAudio({ workflowId: active.id, audioPath: tempAudio });
          try { fs.unlinkSync(tempAudio); } catch (_) {}

          await message.reply({
            content: `🎙️ **Custom Narration Received!**\n• Workflow: **${active.topic}** (\`${active.id}\`)\n• File: \`${att.name}\`\n\nResumed pipeline! Scene choreography and deterministic video rendering dispatched.`
          });
        } catch (err) {
          console.error('[Discord Audio Ingest Error]:', err);
          await message.reply({ content: `⚠️ Failed to process custom audio: ${err.message}` });
        }
        return;
      }
    }
  }

  // 2. Text shortcuts in #ai-nimate channel
  const content = (message.content || '').trim();
  if (content === '!status') {
    const embed = buildAinimateStatusEmbed();
    const rows = buildAinimateStatusComponents();
    return message.reply({ embeds: [embed], components: rows });
  }

  if (content.startsWith('!delete ')) {
    const targetId = content.slice(8).trim();
    const removed = deleteWorkflowEntirely(targetId, { deleteFiles: false });
    if (removed) {
      return message.reply({ content: `🗑️ **Workflow Deleted**: Removed **${removed.topic || removed.id}** (\`${removed.id}\`).` });
    } else {
      return message.reply({ content: `❌ Could not find workflow matching \`${targetId}\`.` });
    }
  }

  if (content.startsWith('!purge ')) {
    const targetId = content.slice(7).trim();
    const removed = deleteWorkflowEntirely(targetId, { deleteFiles: true });
    if (removed) {
      return message.reply({ content: `💥 **Workflow Purged**: Deleted **${removed.topic || removed.id}** (\`${removed.id}\`) and removed files from disk.` });
    } else {
      return message.reply({ content: `❌ Could not find workflow matching \`${targetId}\`.` });
    }
  }

  if (content.startsWith('!resume ')) {
    const targetId = content.slice(8).trim();
    const res = resumeOrStartWorkflow(targetId);
    if (res.success) {
      return message.reply({ content: `▶️ **Workflow Resumed**: Dispatched pipeline for **${res.workflow.topic || res.workflow.id}** (PID: \`${res.pid}\`)!` });
    } else {
      return message.reply({ content: `❌ ${res.error}` });
    }
  }

  if (content === '!stop') {
    const stopped = stopVideoProduction();
    if (stopped) {
      return message.reply({ content: `🛑 **Workflow Halted**: Stopped production for **${stopped.topic || stopped.id}**.` });
    } else {
      return message.reply({ content: 'ℹ️ No workflow is currently active.' });
    }
  }

  if (content.startsWith('!create ')) {
    const topic = content.slice(8).trim();
    if (!topic) return message.reply({ content: '❌ Please specify a topic: `!create <topic>`' });
    const res = startVideoProduction({ topic, creator: message.author.tag || message.author.id });
    if (!res.success) {
      return message.reply({ content: `⚠️ Could not start workflow: ${res.error}` });
    }
    return message.reply({
      content: `🚀 **Production Initiated!**\n• Topic: **${topic}**\n• Workflow ID: \`${res.workflow.id}\`\n• Creator: <@${message.author.id}>\n\nSub-agent pipeline launched in background. Status updates will stream below!`
    });
  }

  if (content === '!help') {
    return message.reply({
      content: `🎬 **AI-nimate Studio Commands in <#${AINIMATE_CHANNEL_ID}>**:\n` +
        `• \`/ainimate create topic:<title>\` or \`!create <topic>\` — Launch end-to-end video production\n` +
        `• \`/ainimate status\` or \`!status\` — Live progress and workflow history\n` +
        `• \`/ainimate stop\` or \`!stop\` — Cancel active pipeline\n` +
        `• \`/ainimate channels\` — Inspect channels and content idea pools\n` +
        `• Upload an **Image** to register visual references into Style Bible\n` +
        `• Upload an **Audio** file to supply custom narration voiceovers`
    });
  }
}

client.on('messageCreate', handleAinimateMessage);

// --- Interaction Router ---
client.on('interactionCreate', async interaction => {
  try {
    // 0. Modal Submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'rb:modal:manual' || interaction.customId === 'rb:modal:add_bot') {
        await interaction.deferReply();
        const botName = interaction.fields.getTextInputValue('bot_name').trim();
        const email = interaction.fields.getTextInputValue('bot_email').trim();
        const password = interaction.fields.getTextInputValue('bot_pass').trim();
        const buyingRaw = (interaction.fields.getTextInputValue('bot_buying') || 'yes').trim().toLowerCase();
        const allowBuying = buyingRaw !== 'no' && buyingRaw !== 'false' && buyingRaw !== '0';

        return await runProvisionJob({
          interaction,
          channel: interaction.channel,
          mode: 'manual',
          prefix: botName,
          emailList: email,
          password,
          allowBuying
        });
      }

      if (interaction.customId === 'rb:modal:random') {
        await interaction.deferReply();
        const countRaw = (interaction.fields.getTextInputValue('rand_count') || '1').trim();
        const prefix = (interaction.fields.getTextInputValue('rand_prefix') || '').trim();
        const buyingRaw = (interaction.fields.getTextInputValue('rand_buying') || 'yes').trim().toLowerCase();
        const allowBuying = buyingRaw !== 'no' && buyingRaw !== 'false' && buyingRaw !== '0';
        const count = Math.max(1, parseInt(countRaw, 10) || 1);

        return await runProvisionJob({
          interaction,
          channel: interaction.channel,
          mode: 'random',
          count,
          prefix,
          allowBuying
        });
      }

      if (interaction.customId === 'rb:modal:emails') {
        await interaction.deferReply();
        const emailList = interaction.fields.getTextInputValue('email_list').trim();
        const buyingRaw = (interaction.fields.getTextInputValue('email_buying') || 'yes').trim().toLowerCase();
        const allowBuying = buyingRaw !== 'no' && buyingRaw !== 'false' && buyingRaw !== '0';

        return await runProvisionJob({
          interaction,
          channel: interaction.channel,
          mode: 'emails',
          emailList,
          allowBuying
        });
      }

      if (interaction.customId === 'rb:modal:start_index') {
        await interaction.deferReply();
        const target = interaction.fields.getTextInputValue('start_target').trim();
        const matched = resolveBotTargets(target);
        if (matched.length === 0) {
          return interaction.editReply({
            content: `⚠️ No bot daemons matched target expression: \`${target}\`.\nUse index or range (e.g. \`3\`, \`3-7\`, \`3-\`, \`1,2,5\`), \`non-core\`, \`capt_*\`, or \`all\`.`
          });
        }
        await startBotContainers(matched);
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        const all = listFleetBots();
        const listStr = matched.map(k => `\`#${all.indexOf(k) + 1}: ${k}\``).join(', ');
        return interaction.editReply({
          content: `▶️ **Started ${matched.length} daemon(s)**: ${listStr}`,
          embeds: [embed],
          components: rows
        });
      }

      if (interaction.customId === 'rb:modal:stop_index') {
        await interaction.deferReply();
        const target = interaction.fields.getTextInputValue('stop_target').trim();
        const matched = resolveBotTargets(target);
        if (matched.length === 0) {
          return interaction.editReply({
            content: `⚠️ No bot daemons matched target expression: \`${target}\`.\nUse index or range (e.g. \`3\`, \`3-7\`, \`3-\`, \`1,2,5\`), \`non-core\`, \`capt_*\`, or \`all\`.`
          });
        }
        await stopBotContainers(matched);
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        const all = listFleetBots();
        const listStr = matched.map(k => `\`#${all.indexOf(k) + 1}: ${k}\``).join(', ');
        return interaction.editReply({
          content: `🛑 **Stopped ${matched.length} daemon(s)**: ${listStr}`,
          embeds: [embed],
          components: rows
        });
      }

      if (interaction.customId === 'rb:modal:profile_index') {
        await interaction.deferReply({ flags: 64 }).catch(err => console.warn('[deferReply warn]:', err.message));
        const target = interaction.fields.getTextInputValue('profile_target').trim();
        const botKey = resolveBotKey(target);
        if (!botKey) {
          return safeEditReply(interaction, {
            content: `⚠️ Bot daemon not found matching \`${target}\`. Active fleet has ${listFleetBots().length} bots (use indices 1 to ${listFleetBots().length}).`
          });
        }
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
        const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (interaction.customId === 'rb:modal:mass_control') {
        await interaction.deferReply();
        const action = (interaction.fields.getTextInputValue('mass_action') || 'stop').trim().toLowerCase();
        const target = interaction.fields.getTextInputValue('mass_target').trim();
        const matched = resolveBotTargets(target);
        if (matched.length === 0) {
          return interaction.editReply({
            content: `⚠️ No bot daemons matched target expression: \`${target}\`.\nUse index range (e.g. \`3-7\`, \`3-\`), \`non-core\`, \`capt_*\`, or \`all\`.`
          });
        }
        if (action === 'start' || action === 'enable') {
          await startBotContainers(matched);
        } else {
          await stopBotContainers(matched);
        }
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        const all = listFleetBots();
        const listStr = matched.map(k => `\`#${all.indexOf(k) + 1}: ${k}\``).join(', ');
        return interaction.editReply({
          content: `${action === 'start' || action === 'enable' ? '▶️ **Started' : '🛑 **Stopped'} ${matched.length} daemon(s)**: ${listStr}`,
          embeds: [embed],
          components: rows
        });
      }

      if (interaction.customId === 'rb:modal:fleet_jump') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const input = interaction.fields.getTextInputValue('jump_page').trim();
        const pageNum = parseInt(input, 10) || 1;
        const allStatuses = await fetchAllBotStatuses(false);
        const pageSize = 15;
        const totalPages = Math.max(1, Math.ceil(allStatuses.length / pageSize));
        const safePage = Math.max(0, Math.min(pageNum - 1, totalPages - 1));

        const embed = buildReefblastFleetEmbed(allStatuses, safePage, pageSize);
        const rows = buildReefblastActionRows(allStatuses, safePage, pageSize);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (interaction.customId === 'ain:modal:wiz_custom_idea') {
        await interaction.deferReply();
        const wiz = getOrCreateWizard(interaction.user.id);
        const topic = interaction.fields.getTextInputValue('topic').trim();
        const context = (interaction.fields.getTextInputValue('context') || '').trim();
        const fullTopic = context ? `${topic}\n\nContext: ${context}` : topic;

        const res = startVideoProduction({
          topic: fullTopic,
          channel: wiz.channel,
          testMode: wiz.testMode,
          audioGate: wiz.audioGate,
          scriptGate: wiz.scriptGate,
          creator: interaction.user.tag || interaction.user.id
        });
        userWizards.delete(interaction.user.id);

        if (!res.success) {
          return interaction.editReply({ content: `⚠️ Could not start workflow: ${res.error}` });
        }

        return interaction.editReply({
          content: `🚀 **Production Initiated via Wizard!**\n• Topic: **${topic}**\n• Channel: \`${wiz.channel}\`\n• Toggles: \`Test Mode: ${wiz.testMode ? 'ON' : 'OFF'} | Audio Gate: ${wiz.audioGate ? 'ON' : 'OFF'} | Script Gate: ${wiz.scriptGate ? 'ON' : 'OFF'}\`\n• Workflow ID: \`${res.workflow.id}\`\n• Creator: <@${interaction.user.id}>\n\nSub-agent pipeline launched in background. All milestone updates are broadcasting to <#${AINIMATE_CHANNEL_ID}>!`
        });
      }

      if (interaction.customId.startsWith('ain:modal:script_own:')) {
        const wfId = interaction.customId.replace('ain:modal:script_own:', '');
        await interaction.deferReply({ ephemeral: true });
        const customScript = interaction.fields.getTextInputValue('custom_script').trim();
        const res = resumeWorkflowWithScript({ workflowId: wfId, scriptText: customScript });
        if (res.success) {
          return interaction.editReply({ content: `✍️ **Custom Script Saved & Applied**: Resumed workflow \`${wfId}\` to voiceover synthesis stage!` });
        } else {
          return interaction.editReply({ content: `❌ Error: ${res.error}` });
        }
      }

      if (interaction.customId.startsWith('ain:modal:script_guide:')) {
        const wfId = interaction.customId.replace('ain:modal:script_guide:', '');
        await interaction.deferReply({ ephemeral: true });
        const guidelines = interaction.fields.getTextInputValue('guidelines').trim();
        const res = reviseWorkflowScriptWithGuidelines({ workflowId: wfId, guidelines });
        if (res.success) {
          return interaction.editReply({ content: `📝 **Script Revised via Guidelines**: Writer agent incorporated guidelines (${res.revisedLength} words). Resumed workflow \`${wfId}\` to audio stage!` });
        } else {
          return interaction.editReply({ content: `❌ Error: ${res.error}` });
        }
      }

      if (interaction.customId.startsWith('ain:modal:audio_upload:')) {
        const wfId = interaction.customId.replace('ain:modal:audio_upload:', '');
        await interaction.deferReply({ ephemeral: true });
        const inputPathOrUrl = interaction.fields.getTextInputValue('audio_path_or_url').trim();
        const wf = getWorkflow(wfId);
        if (!wf) {
          return interaction.editReply({ content: `❌ Workflow \`${wfId}\` not found.` });
        }

        let resolvedPath = null;
        if (inputPathOrUrl.startsWith('http://') || inputPathOrUrl.startsWith('https://')) {
          try {
            const httpsClient = inputPathOrUrl.startsWith('https://') ? https : http;
            const destPath = path.join('/tmp', `custom_audio_${wf.id}.mp3`);
            const fileStream = fs.createWriteStream(destPath);
            await new Promise((resolve, reject) => {
              httpsClient.get(inputPathOrUrl, (res) => {
                if (res.statusCode !== 200) {
                  return reject(new Error(`Failed to download audio: HTTP ${res.statusCode}`));
                }
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve();
                });
              }).on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
              });
            });
            resolvedPath = destPath;
          } catch (dlErr) {
            return interaction.editReply({
              content: `⚠️ Download failed: \`${dlErr.message}\`.\nWorkflow remained paused at Audio Gate. Please try again or choose another audio source.`
            });
          }
        } else if (inputPathOrUrl.length > 0 && fs.existsSync(inputPathOrUrl)) {
          resolvedPath = inputPathOrUrl;
        } else {
          // Check if default voiceover or audio.mp3 exists in project folder
          const projectAudio1 = path.join(REPO_ROOT, 'projects', wf.project, 'audio', 'voiceover.mp3');
          const projectAudio2 = path.join(REPO_ROOT, 'projects', wf.project, 'audio.mp3');
          if (fs.existsSync(projectAudio1)) {
            resolvedPath = projectAudio1;
          } else if (fs.existsSync(projectAudio2)) {
            resolvedPath = projectAudio2;
          }
        }

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
          return interaction.editReply({
            content: `⚠️ Audio file not found at \`${inputPathOrUrl || 'project audio directory'}\`.\nWorkflow remained paused at Audio Gate. Please provide a valid file path or downloadable URL.`
          });
        }

        const res = resumeWorkflowWithAudio({ workflowId: wf.id, audioPath: resolvedPath });
        if (res && res.success) {
          return interaction.editReply({ content: `📁 **Custom Audio Linked**: Resumed workflow \`${wfId}\` to choreography and rendering stage!` });
        } else {
          return interaction.editReply({ content: `❌ Error resuming workflow: ${res?.error || 'Unknown error'}` });
        }
      }
    }

    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'reefblast') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'status') {
          await interaction.deferReply();
          const pageInput = interaction.options.getInteger('page') || 1;
          const allStatuses = await fetchAllBotStatuses(true);
          const pageSize = 15;
          const totalPages = Math.max(1, Math.ceil(allStatuses.length / pageSize));
          const safePage = Math.max(0, Math.min(pageInput - 1, totalPages - 1));
          const embed = buildReefblastFleetEmbed(allStatuses, safePage, pageSize);
          const rows = buildReefblastActionRows(allStatuses, safePage, pageSize);
          return interaction.editReply({ embeds: [embed], components: rows });
        } else if (sub === 'profile' || sub === 'william' || sub === 'cuang') {
          await interaction.deferReply();
          let target = 'cuang';
          if (sub === 'william') target = 'william';
          else if (sub === 'cuang') target = 'cuang';
          else target = interaction.options.getString('target') || interaction.options.getString('bot') || '1';

          const botKey = resolveBotKey(target);
          if (!botKey) {
            return interaction.editReply({
              content: `⚠️ Bot daemon not found matching \`${target}\`. Active fleet has ${listFleetBots().length} bots (use indices 1 to ${listFleetBots().length}).`
            });
          }
          const allStatuses = await fetchAllBotStatuses();
          const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
          const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
          return interaction.editReply({ embeds: [embed], components: rows });
        } else if (sub === 'start') {
          await interaction.deferReply();
          const target = interaction.options.getString('target') || interaction.options.getString('bot') || 'all';
          const matched = resolveBotTargets(target);
          if (matched.length === 0) {
            return interaction.editReply({
              content: `⚠️ No bot daemons matched target expression: \`${target}\`.\nUse index range (e.g. \`3-7\`, \`3-\`), \`non-core\`, \`capt_*\`, or \`all\`. Run \`/reefblast status\` to view bot indices.`
            });
          }
          await startBotContainers(matched);
          const allStatuses = await fetchAllBotStatuses(true);
          const embed = buildReefblastFleetEmbed(allStatuses);
          const rows = buildReefblastActionRows(allStatuses);
          const listStr = matched.map(k => `\`#${listFleetBots().indexOf(k) + 1}: ${k}\``).join(', ');
          return interaction.editReply({
            content: `▶️ **Started ${matched.length} daemon(s)**: ${listStr}`,
            embeds: [embed],
            components: rows
          });
        } else if (sub === 'stop') {
          await interaction.deferReply();
          const target = interaction.options.getString('target') || interaction.options.getString('bot') || 'all';
          const matched = resolveBotTargets(target);
          if (matched.length === 0) {
            return interaction.editReply({
              content: `⚠️ No bot daemons matched target expression: \`${target}\`.\nUse index range (e.g. \`3-7\`, \`3-\`), \`non-core\`, \`capt_*\`, or \`all\`. Run \`/reefblast status\` to view bot indices.`
            });
          }
          await stopBotContainers(matched);
          const allStatuses = await fetchAllBotStatuses(true);
          const embed = buildReefblastFleetEmbed(allStatuses);
          const rows = buildReefblastActionRows(allStatuses);
          const listStr = matched.map(k => `\`#${listFleetBots().indexOf(k) + 1}: ${k}\``).join(', ');
          return interaction.editReply({
            content: `🛑 **Stopped ${matched.length} daemon(s)**: ${listStr}`,
            embeds: [embed],
            components: rows
          });
        } else if (sub === 'toggle') {
          await interaction.deferReply();
          const target = interaction.options.getString('target') || interaction.options.getString('bot');
          const matched = resolveBotTargets(target);
          if (matched.length === 0) {
            return interaction.editReply({
              content: `⚠️ Bot daemon not found matching \`${target}\`.`
            });
          }
          const botKey = matched[0];
          const res = await toggleBotContainer(botKey);
          const allStatuses = await fetchAllBotStatuses(true);
          const embed = buildReefblastFleetEmbed(allStatuses);
          const rows = buildReefblastActionRows(allStatuses);
          return interaction.editReply({
            content: `🔄 **Toggled \`#${listFleetBots().indexOf(botKey) + 1}: ${botKey}\`**: ${res.action === 'started' ? '▶️ Enabled' : '🛑 Disabled'}`,
            embeds: [embed],
            components: rows
          });
        } else if (sub === 'logs') {
          await interaction.deferReply();
          const bot = interaction.options.getString('bot') || 'cuang';
          const lines = interaction.options.getInteger('lines') || 15;
          const logText = await getReefblastLogs(bot, lines);
          return interaction.editReply({
            content: `📜 **Reefblast Logs for \`${bot}\` (last ${lines} lines):**\n\`\`\`text\n${logText.slice(-1800)}\n\`\`\``
          });
        } else if (sub === 'add') {
          await interaction.deferReply();
          const modeInput = interaction.options.getString('mode');
          const nameInput = interaction.options.getString('name');
          const emailInput = interaction.options.getString('email');
          const passwordInput = interaction.options.getString('password');
          const countInput = interaction.options.getInteger('count') || 1;
          const buying = interaction.options.getBoolean('buying') ?? true;
          const routeMode = interaction.options.getString('route') || 'auto';

          // Auto-detect mode if not explicitly chosen
          let mode = modeInput;
          if (!mode) {
            if (passwordInput && emailInput) mode = 'manual';
            else if (emailInput) mode = 'emails';
            else mode = 'random';
          }

          if (mode === 'manual' && (!emailInput || !passwordInput)) {
            return interaction.editReply({
              content: '❌ **Manual Mode Error**: Both `email` and `password` are required to log into an existing account.'
            });
          }
          if (mode === 'emails' && !emailInput) {
            return interaction.editReply({
              content: '❌ **Emails Mode Error**: Please provide `email` with an address or comma-separated list of emails.'
            });
          }

          return await runProvisionJob({
            interaction,
            channel: interaction.channel,
            mode,
            count: countInput,
            prefix: nameInput || '',
            emailList: emailInput || '',
            password: passwordInput || '',
            allowBuying: buying,
            routeMode
          });
        } else if (sub === 'progress') {
          await interaction.deferReply();
          const jobs = Array.from(activeProvisionJobs.values());
          if (jobs.length === 0) {
            return interaction.editReply({
              content: 'ℹ️ No account provisioning jobs currently active or recorded in memory session.'
            });
          }
          const latestJob = jobs[jobs.length - 1];
          const embed = latestJob.status === 'running' 
            ? buildProvisionProgressEmbed(latestJob) 
            : buildProvisionResultEmbed(latestJob.successes.concat(latestJob.failures), latestJob.modeTitle);
          return interaction.editReply({ embeds: [embed] });
        } else if (sub === 'cancel') {
          await interaction.deferReply();
          const cancelledCount = cancelActiveProvisionJobs();
          activeProvisionJobs.clear();
          return interaction.editReply({
            content: cancelledCount > 0
              ? `🛑 **Cancelled ${cancelledCount} active provisioning job(s)**. No further bot accounts will be registered or provisioned.`
              : `ℹ️ **No active account provisioning jobs running**. Any previous provisioning requests or queues have been cleared.`
          });
        } else if (sub === 'policy') {
          await interaction.deferReply();
          const bot = interaction.options.getString('bot');
          const buying = interaction.options.getBoolean('buying');
          const salvaging = interaction.options.getBoolean('salvaging');
          const selling = interaction.options.getBoolean('selling');

          const updates = {};
          if (typeof buying === 'boolean') updates.allowBuying = buying;
          if (typeof salvaging === 'boolean') updates.allowSalvaging = salvaging;
          if (typeof selling === 'boolean') updates.allowMarketSelling = selling;

          const updated = setBotPolicy(bot, updates);
          const allStatuses = await fetchAllBotStatuses(true);
          const embed = buildReefblastCaptainEmbed(bot, allStatuses);
          const rows = buildReefblastCaptainActionRows(bot, allStatuses);
          return interaction.editReply({
            content: `⚙️ **Updated Policies for \`${bot}\`**:\n• Purchasing: **${updated.allowBuying ? 'ENABLED 🛒' : 'LOCKED 🛡️'}**\n• Salvaging: **${updated.allowSalvaging ? 'ACTIVE ♻️' : 'LOCKED 🔒'}**\n• Selling: **${updated.allowMarketSelling ? 'ACTIVE 🏪' : 'LOCKED 🔒'}**`,
            embeds: [embed],
            components: rows
          });
        } else if (sub === 'agent') {
          await interaction.deferReply();
          try {
            const out = execSync('/home/agent/orca/learnings/scripts/deploy-antigravity-fixer.sh --deploy 2>&1', { encoding: 'utf-8', timeout: 15000 });
            return interaction.editReply({
              content: `🤖 **Antigravity Fixer Dispatched!**\n\`\`\`text\n${out.slice(-1500)}\n\`\`\``
            });
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Failed to dispatch Antigravity agent: ${err.message}` });
          }
        }
      }

      if (commandName === 'ainimate') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'status') {
          await interaction.deferReply();
          const embed = buildAinimateStatusEmbed();
          const rows = buildAinimateStatusComponents();
          return interaction.editReply({ embeds: [embed], components: rows });
        } else if (sub === 'delete') {
          await interaction.deferReply();
          const targetId = interaction.options.getString('id');
          const deleteFiles = interaction.options.getBoolean('files') || false;
          const removed = deleteWorkflowEntirely(targetId, { deleteFiles });
          if (removed) {
            return interaction.editReply({
              content: `🗑️ **Workflow Deleted**: Removed **${removed.topic || removed.id}** (\`${removed.id}\`)${removed.dirDeleted ? ' and purged project directory on disk.' : '.'}`
            });
          } else {
            return interaction.editReply({
              content: `❌ Could not find workflow matching \`${targetId}\`.`
            });
          }
        } else if (sub === 'resume') {
          await interaction.deferReply();
          const targetId = interaction.options.getString('id');
          const res = resumeOrStartWorkflow(targetId);
          if (res.success) {
            return interaction.editReply({
              content: `▶️ **Workflow Resumed**: Dispatched background worker for **${res.workflow.topic || res.workflow.id}** (PID: \`${res.pid}\`). Streaming updates in <#${AINIMATE_CHANNEL_ID}>!`
            });
          } else {
            return interaction.editReply({
              content: `❌ ${res.error}`
            });
          }
        } else if (sub === 'channels') {
          await interaction.deferReply();
          const channels = listChannels();
          const embed = new EmbedBuilder()
            .setTitle('📺 AI-Nimate Channels & Idea Pools')
            .setColor(0x8b5cf6)
            .setTimestamp();

          for (const ch of channels.slice(0, 5)) {
            const ideas = getUnusedChannelIdeas(ch.id).slice(0, 3);
            const ideaText = ideas.length > 0 ? ideas.map(i => `• ${i.title}`).join('\n') : '• All pool ideas used.';
            embed.addFields({
              name: `${ch.name} (\`${ch.id}\`)`,
              value: `*${ch.description || 'Channel'}*\n${ideaText}`
            });
          }
          return interaction.editReply({ embeds: [embed] });
        } else if (sub === 'stop') {
          await interaction.deferReply();
          try {
            const stopped = stopVideoProduction();
            if (stopped) {
              return interaction.editReply({
                content: `🛑 **Workflow Halted**: Stopped production for **${stopped.topic || stopped.id}**.`
              });
            } else {
              return interaction.editReply({ content: 'ℹ️ No workflow is currently active.' });
            }
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Error halting workflow: ${err.message}` });
          }
        } else if (sub === 'create') {
          const topic = interaction.options.getString('topic');
          const channel = interaction.options.getString('channel') || 'kausalmedia';
          const format = interaction.options.getString('format') || '16:9';
          const testMode = interaction.options.getBoolean('test_mode') || false;
          const audioGate = interaction.options.getBoolean('audio_gate') || false;
          const scriptGate = interaction.options.getBoolean('script_gate') || false;

          await interaction.deferReply();
          try {
            const res = startVideoProduction({
              topic,
              channel,
              format,
              testMode,
              audioGate,
              scriptGate,
              creator: interaction.user.tag || interaction.user.id
            });

            if (!res.success) {
              return interaction.editReply({
                content: `⚠️ Could not start workflow: ${res.error}`
              });
            }

            // Cross-post alert to #ai-nimate channel if triggered outside of #ai-nimate
            if (interaction.channelId !== AINIMATE_CHANNEL_ID) {
              try {
                const targetCh = client.channels.cache.get(AINIMATE_CHANNEL_ID) || await client.channels.fetch(AINIMATE_CHANNEL_ID);
                if (targetCh) {
                  await targetCh.send({
                    content: `🚀 **New Production Dispatched by <@${interaction.user.id}>!**\n• Topic: **${topic}**\n• Channel: \`${channel}\` | Format: \`${format}\`\n• Toggles: \`Test Mode: ${testMode ? 'ON' : 'OFF'} | Audio Gate: ${audioGate ? 'ON' : 'OFF'} | Script Gate: ${scriptGate ? 'ON' : 'OFF'}\`\n• Workflow ID: \`${res.workflow.id}\``
                  });
                }
              } catch (_) {}
            }

            return interaction.editReply({
              content: `🚀 **Production Initiated!**\n• Topic: **${topic}**\n• Channel: \`${channel}\` | Format: \`${format}\`\n• Toggles: \`Test Mode: ${testMode ? 'ON' : 'OFF'} | Audio Gate: ${audioGate ? 'ON' : 'OFF'} | Script Gate: ${scriptGate ? 'ON' : 'OFF'}\`\n• Workflow ID: \`${res.workflow.id}\`\n• Creator: <@${interaction.user.id}>\n\nSub-agent pipeline launched in background. All milestone updates are broadcasting to <#${AINIMATE_CHANNEL_ID}>!`
            });
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Error initiating workflow: ${err.message}` });
          }
        } else if (sub === 'channel_create') {
          await interaction.deferReply();
          try {
            const name = interaction.options.getString('name');
            const id = interaction.options.getString('id') || name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const description = interaction.options.getString('description') || '';
            const created = createChannel({ id, name, description });
            return interaction.editReply({
              content: `🏛️ **Channel Created**: Registered profile **${created.name}** (\`${created.id}\`).`
            });
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Failed to create channel: ${err.message}` });
          }
        } else if (sub === 'channel_delete') {
          await interaction.deferReply();
          try {
            const id = interaction.options.getString('id');
            const purge = interaction.options.getBoolean('purge') || false;
            const deleted = deleteChannel(id, { purge });
            if (deleted) {
              return interaction.editReply({
                content: `🗑️ **Channel ${purge ? 'Purged' : 'Deactivated'}**: \`${id}\`.`
              });
            } else {
              return interaction.editReply({ content: `❌ Channel \`${id}\` not found.` });
            }
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Failed to delete channel: ${err.message}` });
          }
        } else if (sub === 'ideas_generate') {
          await interaction.deferReply();
          const targetChan = interaction.options.getString('channel') || 'kausalmedia';
          try {
            const ideas = await generateDailyTrendingIdeas({ channelId: targetChan, count: 4, notifyDiscord: false });
            const list = ideas.map((idea, i) => `**${i + 1}. [${idea.tag}] ${idea.title}**\n• *${idea.detail}*`).join('\n\n');
            return interaction.editReply({
              content: `💡 **Fresh Trending Ideas Generated via Antigravity:**\n\n${list}`
            });
          } catch (err) {
            return interaction.editReply({ content: `⚠️ Error generating ideas: ${err.message}` });
          }
        } else if (sub === 'logs') {
          await interaction.deferReply();
          let logOutput = 'No recent orchestrator logs.';
          try {
            // Read last 25 lines of stdout/stderr if exists, or check process logs
            logOutput = execSync('tail -n 20 /home/agent/orca/AI-nimate/logs/orchestrator.log 2>/dev/null || echo "No orchestrator.log file found."', { encoding: 'utf-8' });
          } catch (_) {}
          return interaction.editReply({
            content: `📜 **AI-Nimate Orchestrator Logs:**\n\`\`\`text\n${logOutput.slice(-1800)}\n\`\`\``
          });
        }
      }

      if (commandName === 'server') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'status') {
          await interaction.deferReply();
          const stats = await getServerStats();
          const embed = buildServerStatusEmbed(stats);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('srv:refresh')
              .setLabel('Refresh Server Stats')
              .setEmoji('🔄')
              .setStyle(ButtonStyle.Primary)
          );
          return interaction.editReply({ embeds: [embed], components: [row] });
        }
      }

      if (commandName === 'mandarin') {
        const sub = interaction.options.getSubcommand();
        const userCtx = {
          userId: interaction.user.id,
          username: interaction.user.username || interaction.user.tag
        };

        if (sub === 'menu' || sub === 'home') {
          const { embed, components } = buildMainMenuEmbedAndComponents(userCtx);
          return interaction.reply({ embeds: [embed], components });
        } else if (sub === 'lesson') {
          await interaction.deferReply();
          const paceOpt = interaction.options.getString('pace') || null;
          const { session, ledger } = buildDailySession(paceOpt, null, userCtx);
          const { embed, components } = buildMandarinLessonEmbedAndComponents(session, ledger, userCtx);
          await interaction.editReply({
            content: `🇨🇳 **Huawei AIOps Mandarin Session — Day ${session.dayNumber}** (\`${session.paceLabel}\`):`,
            embeds: [embed],
            components
          });
          await interaction.followUp({
            content: `📋 **1-Tap Mobile Copy — Paste into Gemini Web / Gemini Live:**\n\`\`\`text\n${session.geminiPrompt}\n\`\`\``
          });
          return;
        } else if (sub === 'flashcard') {
          const track = interaction.options.getString('track') || null;
          const { card, mode } = drawNextFlashcard(track, userCtx);
          if (!card) {
            return interaction.reply({ content: '🎉 No flashcards available in this track right now!', ephemeral: true });
          }
          const { embed, components } = renderFlashcardEmbed(card, mode, null, userCtx);
          return interaction.reply({ embeds: [embed], components });
        } else if (sub === 'track') {
          const mode = interaction.options.getString('mode');
          const result = switchTrack(mode, userCtx);
          return interaction.reply({ embeds: [result.embed], components: result.components });
        } else if (sub === 'prompt') {
          const ledger = loadMandarinLedger();
          const user = getUserProfile(ledger, userCtx);
          const session = user.activeSession || buildDailySession(null, null, userCtx).session;
          return interaction.reply({
            content: `📋 **1-Tap Mobile Copy — Paste into Gemini Web / Gemini Live:**\n\`\`\`text\n${session.geminiPrompt}\n\`\`\``
          });
        } else if (sub === 'pace') {
          await interaction.deferReply();
          const mode = interaction.options.getString('mode');
          const { session, ledger } = buildDailySession(mode, null, userCtx);
          const { embed, components } = buildMandarinLessonEmbedAndComponents(session, ledger, userCtx);
          return interaction.editReply({
            content: `⚙️ **Daily Mandarin Pace Updated to \`${PACE_CONFIG[mode]?.label || mode}\` for <@${userCtx.userId}>!** Regenerated today's session:`,
            embeds: [embed],
            components
          });
        } else if (sub === 'quiz') {
          const track = interaction.options.getString('track') || null;
          const { embed, components } = buildInteractiveDiscordQuiz(track, userCtx);
          return interaction.reply({ embeds: [embed], components });
        } else if (sub === 'baseline') {
          await interaction.deferReply();
          const { embed, components, promptText } = buildBaselineDiagnosticEmbedAndPrompt(userCtx);
          await interaction.editReply({ embeds: [embed], components });
          await interaction.followUp({
            content: `🎙️ **1-Tap Mobile Copy — Paste into Gemini Live on your phone or web:**\n\`\`\`text\n${promptText}\n\`\`\``
          });
          return;
        } else if (sub === 'stats') {
          const { embed, components } = buildStatsEmbed(userCtx);
          return interaction.reply({ embeds: [embed], components });
        } else if (sub === 'domain') {
          const ratioVal = interaction.options.getInteger('ratio');
          const ledger = loadMandarinLedger();
          const user = getUserProfile(ledger, userCtx.userId, userCtx.username);
          user.settings.domainRatio = ratioVal / 100;
          saveMandarinLedger(ledger);

          const embed = new EmbedBuilder()
            .setTitle('⚙️ Domain Vocabulary Ratio Updated!')
            .setColor(0x0284c7)
            .setDescription(
              `👤 **Learner**: <@${userCtx.userId}> (${userCtx.username})\n\n` +
              `Your domain vocabulary blend has been configured to **${ratioVal}% (AIOps & Telemetry Engineering)**.\n\n` +
              `📚 Daily lessons and flashcards will now blend **${ratioVal}% domain-specific engineering jargon** with your active curriculum track (${TRACK_CONFIG[user.settings.activeTrack]?.label || user.settings.activeTrack}).`
            )
            .setFooter({ text: 'Mandarin Coach • Domain Blending Engine' });
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('zh:fc:draw').setLabel('Study Flashcards').setEmoji('🗂️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('zh:menu').setLabel('Main Menu').setEmoji('🏠').setStyle(ButtonStyle.Secondary)
          );
          return interaction.reply({ embeds: [embed], components: [row] });
        }
      }
    }

    // 2. Select Menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'rb:select_profile') {
        const val = interaction.values[0];

        if (val.startsWith('__nav_page:')) {
          await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
          const targetPage = parseInt(val.split(':')[1], 10) || 0;
          const allStatuses = await fetchAllBotStatuses(false);
          const embed = buildReefblastFleetEmbed(allStatuses, targetPage);
          const rows = buildReefblastActionRows(allStatuses, targetPage);
          return safeEditReply(interaction, { embeds: [embed], components: rows });
        }

        if (val === '__nav_modal:jump') {
          const modal = new ModalBuilder()
            .setCustomId('rb:modal:profile_index')
            .setTitle('Jump to Bot Profile');

          const input = new TextInputBuilder()
            .setCustomId('profile_target')
            .setLabel(`Bot Index or Name (1 to ${listFleetBots().length})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 42, 100, william')
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        if (val === 'none') {
          return interaction.deferUpdate().catch(() => {});
        }

        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastCaptainEmbed(val, allStatuses);
        const rows = buildReefblastCaptainActionRows(val, allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (interaction.customId === 'ain:select_workflow') {
        const val = interaction.values[0];
        const wf = getWorkflow(val);
        if (!wf) {
          return interaction.reply({ content: `❌ Workflow \`${val}\` not found in ledger.`, ephemeral: true });
        }
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const embed = buildWorkflowDetailEmbed(wf);
        const rows = buildWorkflowDetailActionRows(wf);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (interaction.customId === 'ain:wiz:select_channel') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.channel = interaction.values[0];
        wiz.step = 2;
        const embed = buildWizardStep2Embed(wiz);
        const rows = buildWizardStep2Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (interaction.customId === 'ain:wiz:select_idea') {
        await interaction.deferReply();
        const wiz = getOrCreateWizard(interaction.user.id);
        const selectedKey = interaction.values[0];
        const pool = getUnusedChannelIdeas(wiz.channel, 20);
        const found = pool.find(p => p.key === selectedKey);
        const topic = found ? (found.title + (found.researchContext ? `\n\nContext: ${found.researchContext}` : '')) : selectedKey;

        const res = startVideoProduction({
          topic,
          channel: wiz.channel,
          testMode: wiz.testMode,
          audioGate: wiz.audioGate,
          scriptGate: wiz.scriptGate,
          creator: interaction.user.tag || interaction.user.id
        });
        userWizards.delete(interaction.user.id);

        if (!res.success) {
          return interaction.editReply({ content: `⚠️ Could not start workflow: ${res.error}` });
        }

        // Cross-post alert to #ai-nimate channel if outside
        if (interaction.channelId !== AINIMATE_CHANNEL_ID) {
          try {
            const targetCh = client.channels.cache.get(AINIMATE_CHANNEL_ID) || await client.channels.fetch(AINIMATE_CHANNEL_ID);
            if (targetCh) {
              await targetCh.send({
                content: `🚀 **New Production Dispatched by <@${interaction.user.id}>!**\n• Topic: **${found?.title || selectedKey}**\n• Channel: \`${wiz.channel}\`\n• Toggles: \`Test Mode: ${wiz.testMode ? 'ON' : 'OFF'} | Audio Gate: ${wiz.audioGate ? 'ON' : 'OFF'} | Script Gate: ${wiz.scriptGate ? 'ON' : 'OFF'}\`\n• Workflow ID: \`${res.workflow.id}\``
              });
            }
          } catch (_) {}
        }

        return interaction.editReply({
          content: `🚀 **Production Initiated via Wizard!**\n• Topic: **${found?.title || selectedKey}**\n• Channel: \`${wiz.channel}\`\n• Toggles: \`Test Mode: ${wiz.testMode ? 'ON' : 'OFF'} | Audio Gate: ${wiz.audioGate ? 'ON' : 'OFF'} | Script Gate: ${wiz.scriptGate ? 'ON' : 'OFF'}\`\n• Workflow ID: \`${res.workflow.id}\`\n• Creator: <@${interaction.user.id}>\n\nSub-agent pipeline launched in background. All milestone updates are broadcasting to <#${AINIMATE_CHANNEL_ID}>!`
        });
      }
    }

    // 3. Interactive Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith('rb:btn:job_refresh:')) {
        await interaction.deferUpdate();
        const jobId = customId.replace('rb:btn:job_refresh:', '');
        const job = activeProvisionJobs.get(jobId);
        if (!job) {
          return interaction.followUp({ content: 'ℹ️ Provisioning job completed or cleared from memory session.', ephemeral: true });
        }
        const embed = job.status === 'running'
          ? buildProvisionProgressEmbed(job)
          : buildProvisionResultEmbed(job.successes.concat(job.failures), job.modeTitle);
        return safeEditReply(interaction, { embeds: [embed] });
      }

      if (customId.startsWith('rb:btn:job_cancel:')) {
        await interaction.deferUpdate();
        const jobId = customId.replace('rb:btn:job_cancel:', '');
        const job = activeProvisionJobs.get(jobId);
        if (!job) {
          return interaction.followUp({ content: 'ℹ️ Provisioning job completed or already finished.', ephemeral: true });
        }
        job.cancelled = true;
        job.status = 'cancelled';
        const embed = buildProvisionProgressEmbed(job);
        return safeEditReply(interaction, { embeds: [embed] });
      }

      if (customId.startsWith('rb:fleet_page:') || customId.startsWith('rb:fleet_nav:')) {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const parts = customId.split(':');
        const page = parseInt(parts[parts.length - 1], 10) || 0;
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastFleetEmbed(allStatuses, page);
        const rows = buildReefblastActionRows(allStatuses, page);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('rb:refresh_page:')) {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const parts = customId.split(':');
        const page = parseInt(parts[parts.length - 1], 10) || 0;
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses, page);
        const rows = buildReefblastActionRows(allStatuses, page);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('rb:open_modal:fleet_jump:')) {
        const parts = customId.split(':');
        const curPage = parts[3] || '1';
        const maxPages = parts[4] || '1';

        const modal = new ModalBuilder()
          .setCustomId('rb:modal:fleet_jump')
          .setTitle('Jump to Fleet Page');

        const pageInput = new TextInputBuilder()
          .setCustomId('jump_page')
          .setLabel(`Page Number (1 to ${maxPages})`)
          .setStyle(TextInputStyle.Short)
          .setValue(curPage)
          .setRequired(true)
          .setMaxLength(4);

        modal.addComponents(new ActionRowBuilder().addComponents(pageInput));
        return interaction.showModal(modal);
      }

      if (customId === 'rb:refresh') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses, 0);
        const rows = buildReefblastActionRows(allStatuses, 0);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:william') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastCaptainEmbed('william', allStatuses);
        const rows = buildReefblastCaptainActionRows('william', allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:cuang') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastCaptainEmbed('cuang', allStatuses);
        const rows = buildReefblastCaptainActionRows('cuang', allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('rb:refresh:')) {
        const botKey = customId.split(':')[2];
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
        const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('rb:toggle:')) {
        const botKey = customId.split(':')[2];
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        await toggleBotContainer(botKey);
        const allStatuses = await fetchAllBotStatuses(true);
        const title = interaction.message?.embeds?.[0]?.title || '';
        if (title.includes('Fleet')) {
          const embed = buildReefblastFleetEmbed(allStatuses);
          const rows = buildReefblastActionRows(allStatuses);
          return safeEditReply(interaction, { embeds: [embed], components: rows });
        } else {
          const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
          const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
          return safeEditReply(interaction, { embeds: [embed], components: rows });
        }
      }

      if (customId.startsWith('rb:toggle_policy:')) {
        const parts = customId.split(':');
        const botKey = parts[2];
        const setting = parts[3];
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        toggleBotPolicy(botKey, setting);
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
        const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('rb:profile:')) {
        const parts = customId.split(':');
        const botKey = parts[parts.length - 1];
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allStatuses = await fetchAllBotStatuses(false);
        const embed = buildReefblastCaptainEmbed(botKey, allStatuses);
        const rows = buildReefblastCaptainActionRows(botKey, allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:toggle_buy:william') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        toggleBotPolicy('william', 'buy');
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastCaptainEmbed('william', allStatuses);
        const rows = buildReefblastCaptainActionRows('william', allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:add_bot') {
        const choiceRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rb:open_modal:manual')
            .setLabel('Define Credentials')
            .setEmoji('🔑')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('rb:open_modal:random')
            .setLabel('Random New Bot')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('rb:open_modal:emails')
            .setLabel('Register Email(s)')
            .setEmoji('📧')
            .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          ephemeral: true,
          content: '⚓ **Provision New Reefblast Bot**\nSelect your provisioning mode:\n\n' +
                   '• 🔑 **Define Credentials**: Use an existing account email and password.\n' +
                   '• 🎲 **Random New Bot**: Automatically register brand new captain(s) with random credentials.\n' +
                   '• 📧 **Register Email(s)**: Provide a single email or list of emails to auto-create accounts.',
          components: [choiceRow]
        });
      }

      if (customId === 'rb:open_modal:manual') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:manual')
          .setTitle('Manual Credential Login');

        const nameInput = new TextInputBuilder()
          .setCustomId('bot_name')
          .setLabel('Bot Identifier (e.g. charles, bot3)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('charles')
          .setRequired(true)
          .setMaxLength(20);

        const emailInput = new TextInputBuilder()
          .setCustomId('bot_email')
          .setLabel('Reefblast Email / Username')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('captain@example.com')
          .setRequired(true);

        const passInput = new TextInputBuilder()
          .setCustomId('bot_pass')
          .setLabel('Reefblast Password')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('••••••••')
          .setRequired(true);

        const buyingInput = new TextInputBuilder()
          .setCustomId('bot_buying')
          .setLabel('Allow Purchasing Items? (yes / no)')
          .setStyle(TextInputStyle.Short)
          .setValue('yes')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(emailInput),
          new ActionRowBuilder().addComponents(passInput),
          new ActionRowBuilder().addComponents(buyingInput)
        );

        return interaction.showModal(modal);
      }

      if (customId === 'rb:open_modal:random') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:random')
          .setTitle('Random Bot Auto-Generator');

        const countInput = new TextInputBuilder()
          .setCustomId('rand_count')
          .setLabel('Number of Bots to Create (e.g. 5, 10, 20)')
          .setStyle(TextInputStyle.Short)
          .setValue('1')
          .setRequired(true)
          .setMaxLength(4);

        const prefixInput = new TextInputBuilder()
          .setCustomId('rand_prefix')
          .setLabel('Name Style / Prefix (Optional)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Leave blank for natural gamer names, or prefix')
          .setRequired(false)
          .setMaxLength(8);

        const buyingInput = new TextInputBuilder()
          .setCustomId('rand_buying')
          .setLabel('Allow Purchasing Items? (yes / no)')
          .setStyle(TextInputStyle.Short)
          .setValue('yes')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(countInput),
          new ActionRowBuilder().addComponents(prefixInput),
          new ActionRowBuilder().addComponents(buyingInput)
        );

        return interaction.showModal(modal);
      }

      if (customId === 'rb:open_modal:emails') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:emails')
          .setTitle('Register Account(s) with Email(s)');

        const emailListInput = new TextInputBuilder()
          .setCustomId('email_list')
          .setLabel('Email Address(es)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('captain@example.com\nor enter multiple:\nbot1@cuang.dev, bot2@cuang.dev')
          .setRequired(true);

        const buyingInput = new TextInputBuilder()
          .setCustomId('email_buying')
          .setLabel('Allow Purchasing Items? (yes / no)')
          .setStyle(TextInputStyle.Short)
          .setValue('yes')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(emailListInput),
          new ActionRowBuilder().addComponents(buyingInput)
        );

        return interaction.showModal(modal);
      }

      if (customId === 'rb:deploy_antigravity') {
        await interaction.deferReply({ ephemeral: true });
        try {
          const out = execSync('/home/agent/orca/learnings/scripts/deploy-antigravity-fixer.sh --deploy 2>&1', { encoding: 'utf-8', timeout: 15000 });
          return interaction.editReply({
            content: `🤖 **Antigravity Agent Dispatched!**\n\`\`\`text\n${out.slice(-1500)}\n\`\`\``
          });
        } catch (err) {
          return interaction.editReply({ content: `⚠️ Error dispatching Antigravity agent: ${err.message}` });
        }
      }

      if (customId === 'rb:stop_all') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allBots = listFleetBots();
        await stopBotContainers(allBots);
        await swarmCluster.broadcastActionToAllShards('/fleet/stop', { all: true });
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:start_all') {
        await interaction.deferUpdate().catch(err => console.warn('[deferUpdate warn]:', err.message));
        const allBots = listFleetBots();
        await startBotContainers(allBots);
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId === 'rb:open_modal:start_index') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:start_index')
          .setTitle('Start Bot(s) by Index');

        const targetInput = new TextInputBuilder()
          .setCustomId('start_target')
          .setLabel('Bot Index or Range to Start')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 3, 3-7, 3-, 1,2,5, or all')
          .setValue('3-')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
        return interaction.showModal(modal);
      }

      if (customId === 'rb:open_modal:stop_index') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:stop_index')
          .setTitle('Stop Bot(s) by Index');

        const targetInput = new TextInputBuilder()
          .setCustomId('stop_target')
          .setLabel('Bot Index or Range to Stop')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 3, 3-7, 3-, 1,2,5, or all')
          .setValue('3-')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
        return interaction.showModal(modal);
      }

      if (customId === 'rb:open_modal:profile_index') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:profile_index')
          .setTitle('Open Bot Profile by Index');

        const targetInput = new TextInputBuilder()
          .setCustomId('profile_target')
          .setLabel(`Enter Bot Index (1 to ${listFleetBots().length})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 1, 2, 3, #5')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
        return interaction.showModal(modal);
      }

      if (customId === 'rb:stop_non_core') {
        await interaction.deferUpdate();
        const nonCore = resolveBotTargets('non-core');
        await stopBotContainers(nonCore);
        const allStatuses = await fetchAllBotStatuses(true);
        const embed = buildReefblastFleetEmbed(allStatuses);
        const rows = buildReefblastActionRows(allStatuses);
        return interaction.editReply({ embeds: [embed], components: rows });
      }

      if (customId === 'rb:open_modal:mass_control') {
        const modal = new ModalBuilder()
          .setCustomId('rb:modal:mass_control')
          .setTitle('Mass Bot Control (Range / Filter)');

        const actionInput = new TextInputBuilder()
          .setCustomId('mass_action')
          .setLabel('Action: stop or start')
          .setStyle(TextInputStyle.Short)
          .setValue('stop')
          .setRequired(true)
          .setMaxLength(5);

        const targetInput = new TextInputBuilder()
          .setCustomId('mass_target')
          .setLabel('Target Range or Filter')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 3-7, 3-, non-core, capt_*, all')
          .setValue('non-core')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(actionInput),
          new ActionRowBuilder().addComponents(targetInput)
        );

        return interaction.showModal(modal);
      }

      if (customId.startsWith('rb:logs:')) {
        const botKey = customId.split(':')[2];
        await interaction.deferReply({ ephemeral: true });
        const allBots = listFleetBots();
        const idx = allBots.indexOf(botKey) + 1;
        const idxBadge = idx > 0 ? `[#${idx}] ` : '';
        const name = botKey === 'william' ? 'William' : (botKey === 'cuang' ? 'Cuang-Bot' : botKey);
        const logs = await getReefblastLogs(botKey, 15);
        return interaction.editReply({
          content: `📜 **${idxBadge}${name} Activity Logs (Last 15 lines):**\n\`\`\`text\n${logs.slice(-1800)}\n\`\`\``
        });
      }

      if (customId === 'rb:logs') {
        await interaction.deferReply({ ephemeral: true });
        const [cuangLogs, williamLogs] = await Promise.all([
          getReefblastLogs('cuang', 8),
          getReefblastLogs('william', 8)
        ]);
        return interaction.editReply({
          content: `📜 **Fleet Activity Logs:**\n\n**🤖 Cuang-Bot:**\n\`\`\`text\n${cuangLogs}\n\`\`\`\n**🏴‍☠️ Captain William:**\n\`\`\`text\n${williamLogs}\n\`\`\``
        });
      }

      if (customId === 'ain:create:start') {
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.step = 1;
        const embed = buildWizardStep1Embed();
        const components = buildWizardStep1Components();
        return interaction.reply({ embeds: [embed], components, ephemeral: true });
      }

      if (customId === 'ain:wiz:toggle:test') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.testMode = !wiz.testMode;
        const embed = buildWizardStep2Embed(wiz);
        const components = buildWizardStep2Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:toggle:audio') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.audioGate = !wiz.audioGate;
        const embed = buildWizardStep2Embed(wiz);
        const components = buildWizardStep2Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:toggle:script') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.scriptGate = !wiz.scriptGate;
        const embed = buildWizardStep2Embed(wiz);
        const components = buildWizardStep2Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:next') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.step = 3;
        const embed = buildWizardStep3Embed(wiz);
        const components = buildWizardStep3Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:back_to_toggles') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        wiz.step = 2;
        const embed = buildWizardStep2Embed(wiz);
        const components = buildWizardStep2Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:cancel') {
        await interaction.deferUpdate().catch(() => {});
        userWizards.delete(interaction.user.id);
        return safeEditReply(interaction, { content: '✖️ Video production wizard cancelled.', embeds: [], components: [] });
      }

      if (customId === 'ain:wiz:refresh_ideas') {
        await interaction.deferUpdate().catch(() => {});
        const wiz = getOrCreateWizard(interaction.user.id);
        const embed = buildWizardStep3Embed(wiz);
        const components = buildWizardStep3Components(wiz);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'ain:wiz:gen_ideas') {
        await interaction.deferReply({ ephemeral: true });
        const wiz = getOrCreateWizard(interaction.user.id);
        try {
          const res = await generateDailyTrendingIdeas({ channelId: wiz.channel, force: true });
          const count = res?.ideas?.length || 0;
          await interaction.editReply({ content: `💡 Generated ${count} fresh trending topics for channel \`${wiz.channel}\`!` });
        } catch (e) {
          await interaction.editReply({ content: `⚠️ Error generating trending ideas: ${e.message}` });
        }
        return;
      }

      if (customId === 'ain:wiz:custom_idea') {
        const modal = new ModalBuilder()
          .setCustomId('ain:modal:wiz_custom_idea')
          .setTitle('Define Custom Topic');

        const topicInput = new TextInputBuilder()
          .setCustomId('topic')
          .setLabel('Video Topic / Headline')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. Mengapa Rupiah Melemah Pasca Kebijakan Fed?')
          .setRequired(true)
          .setMaxLength(200);

        const contextInput = new TextInputBuilder()
          .setCustomId('context')
          .setLabel('Context / Focus Angle (Optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Fokus pada arus modal asing, cadangan devisa BI, dan komparasi dengan krisis 1998...')
          .setRequired(false)
          .setMaxLength(1000);

        modal.addComponents(
          new ActionRowBuilder().addComponents(topicInput),
          new ActionRowBuilder().addComponents(contextInput)
        );

        return interaction.showModal(modal);
      }

      if (customId.startsWith('ain:gate:script:own:')) {
        const wfId = customId.replace('ain:gate:script:own:', '');
        const modal = new ModalBuilder()
          .setCustomId(`ain:modal:script_own:${wfId}`)
          .setTitle('Bring Your Own Script');

        const scriptInput = new TextInputBuilder()
          .setCustomId('custom_script')
          .setLabel('Paste Video Script Text')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Paste complete documentary narration script here...')
          .setRequired(true)
          .setMaxLength(4000);

        modal.addComponents(new ActionRowBuilder().addComponents(scriptInput));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('ain:gate:script:guide:')) {
        const wfId = customId.replace('ain:gate:script:guide:', '');
        const modal = new ModalBuilder()
          .setCustomId(`ain:modal:script_guide:${wfId}`)
          .setTitle('Script Revision Guidelines');

        const guidelinesInput = new TextInputBuilder()
          .setCustomId('guidelines')
          .setLabel('Revision Instructions for Writer Agent')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('e.g. Cut intro fluff, increase pace, emphasize investigative findings...')
          .setRequired(true)
          .setMaxLength(2000);

        modal.addComponents(new ActionRowBuilder().addComponents(guidelinesInput));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('ain:gate:audio:edgetts:')) {
        const wfId = customId.replace('ain:gate:audio:edgetts:', '');
        await interaction.deferReply({ ephemeral: true });
        const res = resumeWorkflowWithAudioSource({ workflowId: wfId, audioSource: 'edge_tts' });
        if (res.success) {
          await interaction.editReply({ content: `🗣️ **Edge TTS Selected**: Resumed voiceover synthesis for workflow \`${wfId}\`!` });
          const updated = getWorkflow(wfId);
          if (updated && interaction.message) {
            const embed = buildWorkflowDetailEmbed(updated);
            const rows = buildWorkflowDetailActionRows(updated);
            await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
          }
        } else {
          await interaction.editReply({ content: `❌ Failed to resume with Edge TTS: ${res.error}` });
        }
        return;
      }

      if (customId.startsWith('ain:gate:audio:api:')) {
        const wfId = customId.replace('ain:gate:audio:api:', '');
        await interaction.deferReply({ ephemeral: true });
        const res = resumeWorkflowWithAudioSource({ workflowId: wfId, audioSource: 'api' });
        if (res.success) {
          await interaction.editReply({ content: `✨ **API Voice Selected**: Resumed voiceover synthesis via configured API for workflow \`${wfId}\`!` });
          const updated = getWorkflow(wfId);
          if (updated && interaction.message) {
            const embed = buildWorkflowDetailEmbed(updated);
            const rows = buildWorkflowDetailActionRows(updated);
            await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
          }
        } else {
          await interaction.editReply({ content: `❌ Failed to resume with API voice: ${res.error}` });
        }
        return;
      }

      if (customId.startsWith('ain:gate:audio:upload:')) {
        const wfId = customId.replace('ain:gate:audio:upload:', '');
        const modal = new ModalBuilder()
          .setCustomId(`ain:modal:audio_upload:${wfId}`)
          .setTitle('Bring Your Own Audio');

        const audioInput = new TextInputBuilder()
          .setCustomId('audio_path_or_url')
          .setLabel('Audio File Path or Direct URL')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://example.com/audio.mp3 or /path/to/voice.mp3 (leave blank for project audio)')
          .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(audioInput));
        return interaction.showModal(modal);
      }

      if (customId === 'ai:refresh' || customId === 'ain:wf:back') {
        await interaction.deferUpdate().catch(() => {});
        const embed = buildAinimateStatusEmbed();
        const rows = buildAinimateStatusComponents();
        return safeEditReply(interaction, { embeds: [embed], components: rows });
      }

      if (customId.startsWith('ain:wf:start:')) {
        const wfId = customId.replace('ain:wf:start:', '');
        await interaction.deferReply({ ephemeral: true });
        const res = resumeOrStartWorkflow(wfId);
        if (res.success) {
          await interaction.editReply({ content: `▶️ Dispatched pipeline for **${res.workflow.topic || res.workflow.id}** (PID: \`${res.pid}\`)!` });
          const updated = getWorkflow(wfId);
          if (updated) {
            const embed = buildWorkflowDetailEmbed(updated);
            const rows = buildWorkflowDetailActionRows(updated);
            await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
          }
        } else {
          await interaction.editReply({ content: `❌ ${res.error}` });
        }
        return;
      }

      if (customId.startsWith('ain:wf:stop:')) {
        const wfId = customId.replace('ain:wf:stop:', '');
        await interaction.deferReply({ ephemeral: true });
        cancelWorkflow(wfId);
        await interaction.editReply({ content: `🛑 Cancelled workflow \`${wfId}\`.` });
        const updated = getWorkflow(wfId);
        if (updated) {
          const embed = buildWorkflowDetailEmbed(updated);
          const rows = buildWorkflowDetailActionRows(updated);
          await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
        }
        return;
      }

      if (customId.startsWith('ain:wf:refresh:')) {
        const wfId = customId.replace('ain:wf:refresh:', '');
        await interaction.deferUpdate().catch(() => {});
        const updated = getWorkflow(wfId);
        if (updated) {
          const embed = buildWorkflowDetailEmbed(updated);
          const rows = buildWorkflowDetailActionRows(updated);
          return safeEditReply(interaction, { embeds: [embed], components: rows });
        } else {
          const embed = buildAinimateStatusEmbed();
          const rows = buildAinimateStatusComponents();
          return safeEditReply(interaction, { embeds: [embed], components: rows });
        }
      }

      if (customId.startsWith('ain:wf:logs:')) {
        const wfId = customId.replace('ain:wf:logs:', '');
        await interaction.deferReply({ ephemeral: true });
        const wf = getWorkflow(wfId);
        if (!wf) {
          return interaction.editReply({ content: `❌ Workflow \`${wfId}\` not found in ledger.` });
        }
        const logs = getWorkflowLogs(wf, 40);
        const embed = new EmbedBuilder()
          .setTitle(`📜 Live Pipeline Logs: ${wf.topic || wf.project}`)
          .setDescription(`\`\`\`bash\n${logs.slice(-3800)}\n\`\`\``)
          .setColor(0x3b82f6)
          .setFooter({ text: `Project: ${wf.project} • Status: ${wf.status} • Stage: ${wf.stage || 'N/A'}` });
        return interaction.editReply({ embeds: [embed] });
      }

      if (customId.startsWith('ain:wf:delete:')) {
        const wfId = customId.replace('ain:wf:delete:', '');
        await interaction.deferReply({ ephemeral: true });
        const removed = deleteWorkflowEntirely(wfId, { deleteFiles: false });
        if (removed) {
          await interaction.editReply({ content: `🗑️ Deleted workflow record **${removed.topic || removed.id}** (\`${removed.id}\`).` });
        } else {
          await interaction.editReply({ content: `❌ Workflow \`${wfId}\` not found.` });
        }
        const embed = buildAinimateStatusEmbed();
        const rows = buildAinimateStatusComponents();
        await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
        return;
      }

      if (customId.startsWith('ain:wf:purge:')) {
        const wfId = customId.replace('ain:wf:purge:', '');
        await interaction.deferReply({ ephemeral: true });
        const removed = deleteWorkflowEntirely(wfId, { deleteFiles: true });
        if (removed) {
          await interaction.editReply({ content: `💥 Purged workflow **${removed.topic || removed.id}** (\`${removed.id}\`) and deleted project folder from disk.` });
        } else {
          await interaction.editReply({ content: `❌ Workflow \`${wfId}\` not found.` });
        }
        const embed = buildAinimateStatusEmbed();
        const rows = buildAinimateStatusComponents();
        await interaction.message.edit({ embeds: [embed], components: rows }).catch(() => {});
        return;
      }

      if (customId === 'ai:channels') {
        await interaction.deferReply({ ephemeral: true });
        const channels = listChannels();
        const embed = new EmbedBuilder()
          .setTitle('📺 Channel Ideas')
          .setColor(0x8b5cf6);
        for (const ch of channels.slice(0, 4)) {
          const ideas = getUnusedChannelIdeas(ch.id).slice(0, 3);
          const ideaText = ideas.length > 0 ? ideas.map(i => `• ${i.title}`).join('\n') : '• All pool ideas used.';
          embed.addFields({ name: ch.name, value: ideaText });
        }
        return interaction.editReply({ embeds: [embed] });
      }

      if (customId === 'ai:stop') {
        await interaction.deferReply({ ephemeral: true });
        try {
          const stopped = stopVideoProduction();
          if (stopped) {
            return interaction.editReply({ content: `🛑 Successfully stopped **${stopped.topic || stopped.id}**.` });
          } else {
            return interaction.editReply({ content: 'ℹ️ No active workflow to stop.' });
          }
        } catch (err) {
          return interaction.editReply({ content: `⚠️ Error: ${err.message}` });
        }
      }

      if (customId === 'srv:refresh') {
        await interaction.deferUpdate();
        const stats = await getServerStats();
        const embed = buildServerStatusEmbed(stats);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('srv:refresh')
            .setLabel('Refresh Server Stats')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      // --- Mandarin Coach Interactive Buttons ---
      const zhUserCtx = {
        userId: interaction.user.id,
        username: interaction.user.username || interaction.user.tag
      };

      if (customId === 'zh:menu' || customId === 'zh:home') {
        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = buildMainMenuEmbedAndComponents(zhUserCtx);
        return safeEditReply(interaction, { content: null, embeds: [embed], components });
      }

      if (customId.startsWith('zh:pace:')) {
        const mode = customId.replace('zh:pace:', '');
        await interaction.deferUpdate();
        const { session, ledger } = buildDailySession(mode, null, zhUserCtx);
        const { embed, components } = buildMandarinLessonEmbedAndComponents(session, ledger, zhUserCtx);
        await interaction.editReply({
          content: `🇨🇳 **Huawei AIOps Mandarin Session — Day ${session.dayNumber}** (Switched to \`${session.paceLabel}\` for <@${zhUserCtx.userId}>):`,
          embeds: [embed],
          components
        });
        return;
      }

      if (customId.startsWith('zh:track:')) {
        await interaction.deferUpdate().catch(() => {});
        const targetTrack = customId.replace('zh:track:', '');
        const result = switchTrack(targetTrack, zhUserCtx);
        return safeEditReply(interaction, { embeds: [result.embed], components: result.components });
      }

      if (customId === 'zh:prompt') {
        const ledger = loadMandarinLedger();
        const user = getUserProfile(ledger, zhUserCtx);
        const session = user.activeSession || buildDailySession(null, null, zhUserCtx).session;
        return interaction.reply({
          content: `📋 **1-Tap Mobile Copy — Paste into Gemini Web / Gemini Live:**\n\`\`\`text\n${session.geminiPrompt}\n\`\`\``
        });
      }

      if (customId === 'zh:baseline') {
        await interaction.deferReply();
        const { embed, components, promptText } = buildBaselineDiagnosticEmbedAndPrompt(zhUserCtx);
        await interaction.editReply({ embeds: [embed], components });
        await interaction.followUp({
          content: `🎙️ **1-Tap Mobile Copy — Paste into Gemini Live on your phone or web:**\n\`\`\`text\n${promptText}\n\`\`\``
        });
        return;
      }

      if (customId === 'zh:baseline_prompt') {
        const promptText = buildGeminiBaselineVoicePrompt();
        return interaction.reply({
          content: `🎙️ **1-Tap Mobile Copy — Paste into Gemini Live on your phone or web:**\n\`\`\`text\n${promptText}\n\`\`\``
        });
      }

      // Placement Staircase Handlers
      if (customId === 'zh:place:start') {
        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = startPlacementSession(zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId.startsWith('zh:place:ans:')) {
        await interaction.deferUpdate().catch(() => {});
        const optIdx = parseInt(customId.split(':')[3], 10);
        const { embed, components } = handlePlacementAnswer(optIdx, zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'zh:place:skip') {
        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = handlePlacementAnswer('skip', zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'zh:place:next_tier') {
        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = advanceToNextTier(zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId === 'zh:place:conclude') {
        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = concludePlacementSession(zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId.startsWith('zh:place:step:')) {
        await interaction.deferUpdate().catch(() => {});
        const parts = customId.split(':');
        const choiceStr = parts[4];
        const { embed, components } = handlePlacementAnswer(choiceStr === 'skip' ? 'skip' : parseInt(choiceStr, 10), zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      // Flashcard Handlers
      if (customId.startsWith('zh:fc:draw')) {
        await interaction.deferUpdate().catch(() => {});
        let track = null;
        if (customId === 'zh:fc:draw:bonus') {
          const ledger = loadMandarinLedger();
          const user = getUserProfile(ledger, zhUserCtx);
          if (user && user.dailyProgress) {
            user.dailyProgress.sessionCardsCompleted = 0;
            saveMandarinLedger(ledger);
          }
        } else if (customId.startsWith('zh:fc:draw:')) {
          track = customId.split(':')[3];
        }
        const drawRes = drawNextFlashcard(track, zhUserCtx);
        if (!drawRes || !drawRes.card) {
          return safeEditReply(interaction, {
            content: '🎉 No flashcards available in this track right now!',
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('zh:menu')
                  .setLabel('Main Menu')
                  .setEmoji('🏠')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('zh:fc:draw')
                  .setLabel('Review Again')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔄')
              )
            ]
          });
        }
        const { embed, components } = renderFlashcardEmbed(drawRes.card, drawRes.mode, null, zhUserCtx);
        return safeEditReply(interaction, { content: null, embeds: [embed], components });
      }

      if (customId.startsWith('zh:fc:flip:')) {
        await interaction.deferUpdate().catch(() => {});
        const parts = customId.split(':');
        const wordId = parts[3];
        const flipRes = renderFlippedFlashcard(wordId, zhUserCtx);
        if (!flipRes || !flipRes.embed) {
          return safeEditReply(interaction, { content: '❌ Flashcard not found.', embeds: [], components: [] });
        }
        return safeEditReply(interaction, { embeds: [flipRes.embed], components: flipRes.components });
      }

      if (customId.startsWith('zh:fc:grade:')) {
        await interaction.deferUpdate().catch(() => {});
        const parts = customId.split(':');
        const wordId = parts[3];
        const gradeStr = parts[4];
        const gradeRes = gradeFlashcard(wordId, gradeStr, zhUserCtx);
        if (!gradeRes || !gradeRes.embed) {
          return safeEditReply(interaction, {
            content: `${gradeRes ? gradeRes.reviewNote : '✅ Card graded!'}\n\n🎉 All flashcards for this track are completed for now!`,
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('zh:menu')
                  .setLabel('Main Menu')
                  .setEmoji('🏠')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('zh:fc:draw')
                  .setLabel('Review Again')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔄')
              )
            ]
          });
        }
        return safeEditReply(interaction, { content: null, embeds: [gradeRes.embed], components: gradeRes.components });
      }

      // Quiz Handlers
      if (customId === 'zh:quiz' || customId.startsWith('zh:quiz:track:')) {
        await interaction.deferUpdate().catch(() => {});
        let track = null;
        if (customId.startsWith('zh:quiz:track:')) {
          track = customId.replace('zh:quiz:track:', '');
        }
        const { embed, components } = buildInteractiveDiscordQuiz(track, zhUserCtx);
        return safeEditReply(interaction, { embeds: [embed], components });
      }

      if (customId.startsWith('zh:quiz:ans:') || customId.startsWith('zh:qans:')) {
        await interaction.deferUpdate().catch(() => {});
        const parts = customId.split(':');
        let wordId, chosenIdx, correctIdx;
        if (customId.startsWith('zh:quiz:ans:')) {
          wordId = parts[3];
          chosenIdx = parseInt(parts[4], 10);
          correctIdx = parseInt(parts[5], 10);
        } else {
          wordId = parts[2];
          chosenIdx = parseInt(parts[3], 10);
          correctIdx = parseInt(parts[4], 10);
        }
        const result = gradeQuizAnswer(wordId, chosenIdx, correctIdx, zhUserCtx);
        return safeEditReply(interaction, { embeds: [result.embed], components: result.components });
      }

      if (customId === 'zh:stats') {
        const { embed, components } = buildStatsEmbed(zhUserCtx);
        return interaction.reply({ embeds: [embed], components, ephemeral: true });
      }
    }
  } catch (err) {
    console.error('[Discord Bot] Error handling interaction:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ Internal Error: ${err.message}` });
      } else {
        await interaction.reply({ content: `⚠️ Internal Error: ${err.message}`, ephemeral: true });
      }
    } catch (_) {}
  }
});

/**
 * Internal HTTP Gateway on port 8989
 * Receives multipart audio uploads from the Nginx Web Audio Portal
 */
function startAudioUploadServer() {
  const UPLOAD_PORT = process.env.AUDIO_UPLOAD_PORT || 8989;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'POST' && reqUrl.pathname === '/api/upload-audio') {
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const rawBuffer = Buffer.concat(chunks);

        const fakeReq = new Response(rawBuffer, {
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/octet-stream'
          }
        });

        const formData = await fakeReq.formData();
        const file = formData.get('audio');
        const workflowId = formData.get('workflowId');
        const channel = formData.get('channel') || 'kausalmedia';
        const slug = formData.get('slug');

        if (!file || !(file instanceof Blob)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No audio file provided in form field "audio"' }));
          return;
        }

        const wf = getWorkflow(workflowId) || getActiveWorkflow();
        if (!wf) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Workflow "${workflowId}" not found in ledger` }));
          return;
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const projectDir = path.join(REPO_ROOT, 'projects', wf.project || slug || wf.id);
        const audioDir = path.join(projectDir, 'audio');
        fs.mkdirSync(audioDir, { recursive: true });

        const targetAudioPath = path.join(audioDir, 'voiceover.mp3');
        fs.writeFileSync(targetAudioPath, fileBuffer);

        const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
        console.log(`[Audio Upload Gateway] Received narration audio (${sizeMB} MB) for workflow ${wf.id}`);

        // Resume workflow automatically!
        resumeWorkflowWithAudio({ workflowId: wf.id, audioPath: targetAudioPath });

        // Broadcast to Discord channel
        try {
          const chan = client.channels.cache.get(AINIMATE_CHANNEL_ID);
          if (chan) {
            chan.send({
              content: `🎙️ **Custom Narration Received via Web Portal!**\n• Workflow: **${wf.topic}** (\`${wf.id}\`)\n• File: \`${file.name || 'voiceover.mp3'}\` (\`${sizeMB} MB\`)\n• Channel: \`${channel}\`\n\nResumed pipeline! Scene choreography and deterministic video rendering dispatched.`
            }).catch(() => {});
          }
        } catch (_) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Narration uploaded and workflow resumed!',
          workflowId: wf.id,
          sizeBytes: fileBuffer.length
        }));
      } catch (uploadErr) {
        console.error('[Audio Upload Gateway Error]:', uploadErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: uploadErr.message }));
      }
      return;
    }

    if (reqUrl.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'ai-nimate-upload-gateway' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
  });

  server.listen(UPLOAD_PORT, '0.0.0.0', () => {
    console.log(`🚀 [Audio Upload Gateway] Listening on http://0.0.0.0:${UPLOAD_PORT}`);
  });
}

async function start() {
  await registerCommands();

  // Pre-warm game defs and fleet status asynchronously
  await Promise.all([
    refreshGameDefs(),
    fetchAllBotStatuses(true)
  ]);

  // Start internal HTTP gateway for Nginx Web Audio Uploads
  startAudioUploadServer();

  console.log('[Discord Bot] Connecting to Discord Gateway...');
  await client.login(TOKEN);
}

if (require.main === module) {
  start().catch(err => {
    console.error('[Discord Bot] Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = {
  client,
  registerCommands,
  getReefblastStatus,
  getReefblastLogs,
  getServerStats,
  buildReefblastFleetEmbed,
  buildReefblastActionRows,
  buildReefblastCaptainEmbed,
  buildReefblastCaptainActionRows,
  buildAinimateStatusEmbed,
  buildAinimateStatusComponents,
  buildServerStatusEmbed,
  isContainerRunning,
  startBotContainer,
  stopBotContainer,
  stopBotContainers,
  startBotContainers,
  toggleBotContainer,
  listFleetBots,
  resolveBotKey,
  resolveBotTargets,
  getBotPolicy,
  setBotPolicy,
  toggleBotPolicy,
  generateUniqueBotName,
  getKnownBotNames,
  provisionRandomBots,
  provisionEmailList,
  runProvisionJob,
  swarmCluster,
  renderProgressBar,
  fetchAllBotStatuses,
  deployBotDaemon
};
