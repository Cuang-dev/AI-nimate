#!/usr/bin/env node
/**
 * AI-nimate Telegram Bot & Headless Orchestrator Bridge
 * 
 * Interactive Telegram interface:
 *  - Collapsible interactive menu (/menu) with sub-menus
 *  - View current and past workflows (/workflows)
 *  - Human-in-the-Loop (HITL) audio stop point (standby for custom audio files)
 *  - Bot output log inspection subcommand (/logs, /output)
 *  - Production starts ONLY on command (/create)
 *  - View and edit prompts for main orchestrator & sub-agents (/setprompt)
 *  - View and customize style/content guideline groups and sub-guidelines
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');

const { listStyles, getStyle } = require('../styles/style-manager');
const { listChannels, getChannel, formatChannelTelegram } = require('../channels/channel-manager');
const { getUnusedChannelIdeas, markIdeaUsed, isIdeaUsed, CHANNEL_IDEA_POOLS } = require('../channels/channel-ideas');
const { recordWorkflow, updateWorkflow, cancelWorkflow, deleteWorkflow, getActiveWorkflow, getPastWorkflows, getWorkflow, loadWorkflows, setActiveWorkflow, getStalledWorkflows } = require('./workflow-ledger');
const { listAgentPrompts, getAgentPrompt, updateAgentPrompt } = require('./prompt-manager');

function transferWorkflow(workflowIdOrSlug, targetAgent = 'agy') {
  const agent = String(targetAgent || 'agy').trim().toLowerCase();
  const workflows = loadWorkflows();
  const wf = workflows.find(w => w.id === workflowIdOrSlug || w.project === workflowIdOrSlug);
  const agyBinPath = `/home/agent/.local/bin/${agent}`;

  process.env.AGY_BIN = agyBinPath;
  process.env.ACTIVE_AGENT = agent;

  try {
    if (fs.existsSync(ENV_FILE)) {
      let content = fs.readFileSync(ENV_FILE, 'utf-8');
      if (content.includes('AGY_BIN=')) {
        content = content.replace(/AGY_BIN=.*(\r?\n|$)/g, `AGY_BIN=${agyBinPath}\n`);
      } else {
        content += `\nAGY_BIN=${agyBinPath}\n`;
      }
      if (content.includes('ACTIVE_AGENT=')) {
        content = content.replace(/ACTIVE_AGENT=.*(\r?\n|$)/g, `ACTIVE_AGENT=${agent}\n`);
      } else {
        content += `ACTIVE_AGENT=${agent}\n`;
      }
      fs.writeFileSync(ENV_FILE, content, 'utf-8');
    }
  } catch (_) {}

  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
    settings.activeAgent = agent;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (_) {}

  if (wf) {
    updateWorkflow(wf.id, { agent });
  }

  return {
    success: true,
    workflowId: wf ? wf.id : workflowIdOrSlug,
    targetAgent: agent,
    binaryPath: agyBinPath
  };
}

const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env');
const SETTINGS_FILE = path.join(REPO_ROOT, 'config', 'bot-settings.json');

// --- In-Memory Circular Log Buffer for /logs subcommand ---
const LOG_BUFFER_MAX = 60;
const logBuffer = [];

function appendLog(line) {
  const ts = new Date().toLocaleTimeString();
  const entry = `[${ts}] ${line}`;
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  console.log(entry);
}

// --- Environment & Settings Persistence ---
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
  return env;
}

function updateEnv(key, val) {
  const env = loadEnv();
  env[key] = val;
  const content = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(ENV_FILE, content, 'utf-8');
}

function loadSettings() {
  const defaults = {
    audioMode: 'audio_gate', // 'audio_gate' | 'channel_default' | 'edge_tts' | 'custom_api'
    hitlAudio: true,
    edgeTtsVoice: 'id-ID-ArdiNeural',
    customApiProvider: 'google-ai-studio', // 'google-ai-studio' | 'elevenlabs' | 'openai'
    customApiVoice: 'Puck',
    activeAgent: 'agy' // 'agy' | 'agy2' | 'agy3'
  };
  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(defaults);
    return defaults;
  }
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    return Object.assign({}, defaults, data);
  } catch (_) {
    return defaults;
  }
}

function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

const env = loadEnv();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;

if (!TOKEN && require.main === module) {
  console.error('❌ TELEGRAM_BOT_TOKEN missing from environment or .env');
  process.exit(1);
}

// --- Telegram API Helpers ---
function callTelegram(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            appendLog(`[Telegram API Error] ${method}: ${parsed.description || JSON.stringify(parsed)}`);
          }
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function chunkText(text, maxLen = 3000) {
  if (!text) return [];
  const clean = text.replace(/```/g, "'''");
  const chunks = [];
  let remaining = clean;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining.trim());
      break;
    }
    // Try to split on chapter header first [BAB ... or [EPILOG ...
    let splitIdx = remaining.lastIndexOf('\n\n[', maxLen);
    if (splitIdx === -1 || splitIdx < maxLen / 3) {
      splitIdx = remaining.lastIndexOf('\n\n', maxLen);
    }
    if (splitIdx === -1 || splitIdx < maxLen / 3) {
      splitIdx = remaining.lastIndexOf('\n', maxLen);
    }
    if (splitIdx === -1 || splitIdx < maxLen / 3) {
      splitIdx = maxLen;
    }
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return chunks.filter(Boolean);
}

function formatProgressBar(pct, width = 16) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function sendMessage(chatId, text, replyMarkup = null, parseMode = 'Markdown') {
  const params = {
    chat_id: chatId,
    text
  };
  if (parseMode) params.parse_mode = parseMode;
  if (replyMarkup) params.reply_markup = replyMarkup;
  const res = await callTelegram('sendMessage', params);
  if (!res.ok && parseMode) {
    appendLog(`[Telegram sendMessage] Markdown parsing error (${res.description}), retrying as plaintext...`);
    delete params.parse_mode;
    return callTelegram('sendMessage', params);
  }
  return res;
}

async function editMessage(chatId, messageId, text, replyMarkup = null) {
  const params = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) params.reply_markup = replyMarkup;
  const res = await callTelegram('editMessageText', params);
  if (!res.ok) {
    appendLog(`[Telegram editMessageText] Markdown parsing error (${res.description}), retrying as plaintext...`);
    delete params.parse_mode;
    return callTelegram('editMessageText', params);
  }
  return res;
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

function sendVideo(chatId, videoPath, caption = '') {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-X', 'POST',
      `https://api.telegram.org/bot${TOKEN}/sendVideo`,
      '-F', `chat_id=${chatId}`,
      '-F', `video=@${videoPath}`,
      '-F', `caption=${caption}`
    ];
    const proc = spawn('curl', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          appendLog(`[Telegram sendVideo Error] ${parsed.description || stdout}`);
        }
        resolve(parsed);
      } catch (e) {
        resolve({ ok: false, error: stdout || stderr });
      }
    });
    proc.on('error', err => {
      appendLog(`[Telegram sendVideo Exec Error] ${err.message}`);
      reject(err);
    });
  });
}

function findProjectVideo(projectDir) {
  const base = path.basename(projectDir);
  const candidates = [
    path.join(projectDir, 'render', `${base}.mp4`),
    path.join(projectDir, 'final.mp4'),
    path.join(projectDir, 'final_cut.mp4'),
    path.join(projectDir, 'final.webm'),
    path.join(projectDir, 'final_cut.webm')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).size > 1024) return c;
  }
  // Check any mp4 in render directory
  const renderDir = path.join(projectDir, 'render');
  if (fs.existsSync(renderDir)) {
    const files = fs.readdirSync(renderDir).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      const p = path.join(renderDir, files[0]);
      if (fs.statSync(p).size > 1024) return p;
    }
  }
  return null;
}

async function deliverWorkflowVideo(chatId, wf, projectDir, topic, style) {
  const masterVideo = findProjectVideo(projectDir);
  if (!masterVideo) {
    throw new Error('Video render output (final.mp4 / final_cut.mp4) was not found.');
  }

  // Ensure alias so both final.mp4 and final_cut.mp4 exist
  const finalCutAlias = path.join(projectDir, 'final_cut.mp4');
  const finalAlias = path.join(projectDir, 'final.mp4');
  if (masterVideo === finalAlias && !fs.existsSync(finalCutAlias)) {
    try { fs.symlinkSync('final.mp4', finalCutAlias); } catch (_) {}
  } else if (masterVideo === finalCutAlias && !fs.existsSync(finalAlias)) {
    try { fs.symlinkSync('final_cut.mp4', finalAlias); } catch (_) {}
  }

  const masterSizeMb = (fs.statSync(masterVideo).size / (1024 * 1024)).toFixed(1);
  updateWorkflow(wf.id, {
    status: 'completed',
    stage: 'Completed',
    progress: 100,
    videoPath: masterVideo,
    completedAt: new Date().toISOString(),
    error: null
  });

  appendLog(`[Workflow:${wf.id}] Video ready: ${masterVideo} (${masterSizeMb} MB)`);

  const TELEGRAM_MAX_UPLOAD_BYTES = 49.5 * 1024 * 1024; // 49.5 MB
  let uploadTarget = masterVideo;

  if (fs.statSync(masterVideo).size > TELEGRAM_MAX_UPLOAD_BYTES) {
    const telegramPreviewPath = path.join(projectDir, 'final_telegram.mp4');
    let hasValidPreview = fs.existsSync(telegramPreviewPath) &&
      fs.statSync(telegramPreviewPath).size > 1024 &&
      fs.statSync(telegramPreviewPath).size < TELEGRAM_MAX_UPLOAD_BYTES;

    if (!hasValidPreview) {
      await sendMessage(chatId,
        `⏳ *Mengoptimalkan Video untuk Telegram...*\n\n` +
        `• Master Video: \`${path.basename(masterVideo)}\` (*${masterSizeMb} MB* - 1080p Master)\n` +
        `• Batas Bot Telegram: *50 MB*\n\n` +
        `_Sedang mengompres versi 720p H.264 agar dapat diputar langsung di Telegram..._`
      );
      try {
        appendLog(`[Workflow:${wf.id}] Compressing ${masterVideo} to 720p for Telegram upload...`);
        execSync(
          `ffmpeg -y -i "${masterVideo}" -vf "scale=-2:720" -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k "${telegramPreviewPath}"`,
          { stdio: 'pipe' }
        );
        if (fs.existsSync(telegramPreviewPath) && fs.statSync(telegramPreviewPath).size < TELEGRAM_MAX_UPLOAD_BYTES) {
          hasValidPreview = true;
        }
      } catch (cErr) {
        appendLog(`[Workflow:${wf.id}] Compression warning: ${cErr.message}`);
      }
    }

    if (hasValidPreview) {
      uploadTarget = telegramPreviewPath;
      const previewSizeMb = (fs.statSync(telegramPreviewPath).size / (1024 * 1024)).toFixed(1);
      await sendMessage(chatId,
        `🚀 *Produksi Video Selesai!*\n\n` +
        `• Topik: *${topic}*\n` +
        `• Master 1080p: \`${masterVideo}\` (*${masterSizeMb} MB*)\n` +
        `• Versi Telegram: *${previewSizeMb} MB* (720p H.264)\n\n` +
        `Mengirim video preview ke Telegram...`
      );
    } else {
      await sendMessage(chatId,
        `🎬 *Render Video Selesai!*\n\n` +
        `• Master File: \`${masterVideo}\` (*${masterSizeMb} MB*)\n` +
        `• Status: *100% Selesai*\n\n` +
        `File video 1080p berukuran ${masterSizeMb} MB (melebihi limit bot 50MB). Anda dapat mengunduh langsung dari server atau gunakan SCP / Google Drive.`
      );
      return;
    }
  } else {
    await sendMessage(chatId, `🚀 *Rendering Complete!* Mengunggah video final...`);
  }

  const sendRes = await sendVideo(chatId, uploadTarget, `🎬 ${topic} (${style})`);
  if (!sendRes.ok) {
    appendLog(`[Workflow:${wf.id}] sendVideo error: ${sendRes.description || JSON.stringify(sendRes)}`);
    await sendMessage(chatId, `⚠️ Gagal mengunggah video ke Telegram: ${sendRes.description || 'Unknown error'}.\nFile master tersimpan di server: \`${masterVideo}\``);
  }
}

function sendDocument(chatId, docPath, caption = '') {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-X', 'POST',
      `https://api.telegram.org/bot${TOKEN}/sendDocument`,
      '-F', `chat_id=${chatId}`,
      '-F', `document=@${docPath}`,
      '-F', `caption=${caption}`
    ];
    const proc = spawn('curl', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          appendLog(`[Telegram sendDocument Error] ${parsed.description || stdout}`);
        }
        resolve(parsed);
      } catch (e) {
        resolve({ ok: false, error: stdout || stderr });
      }
    });
    proc.on('error', err => {
      appendLog(`[Telegram sendDocument Exec Error] ${err.message}`);
      reject(err);
    });
  });
}

function sendPhoto(chatId, photoPath, caption = '') {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-X', 'POST',
      `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
      '-F', `chat_id=${chatId}`,
      '-F', `photo=@${photoPath}`,
      '-F', `caption=${caption}`
    ];
    const proc = spawn('curl', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          appendLog(`[Telegram sendPhoto Error] ${parsed.description || stdout}`);
        }
        resolve(parsed);
      } catch (e) {
        resolve({ ok: false, error: stdout || stderr });
      }
    });
    proc.on('error', err => {
      appendLog(`[Telegram sendPhoto Exec Error] ${err.message}`);
      reject(err);
    });
  });
}

async function downloadTelegramFile(fileId, destPath) {
  const info = await callTelegram('getFile', { file_id: fileId });
  if (!info.ok || !info.result?.file_path) {
    throw new Error('Failed to resolve Telegram file path');
  }

  const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${info.result.file_path}`;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(fileUrl, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// --- Menu Rendering Generators ---

function renderMainMenu(collapsed = false) {
  const settings = loadSettings();
  const audioLabels = {
    audio_gate: '⏸️ Audio Gate (HITL)',
    channel_default: '🏛️ Channel Default',
    edge_tts: `🌐 Edge TTS (${settings.edgeTtsVoice?.split('-')[2] || 'Ardi'})`,
    custom_api: `⚡ Custom API (${settings.customApiProvider || 'Google'})`
  };
  const activeAudioLabel = audioLabels[settings.audioMode] || '⏸️ Audio Gate';

  if (collapsed) {
    return {
      text: '📁 *AI-nimate Control Menu* _(Collapsed)_',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎬 ➕ Start New Project', callback_data: 'flow:new_project' }
          ],
          [
            { text: '🔽 Expand Menu', callback_data: 'menu:expand' },
            { text: '📋 Workflows', callback_data: 'menu:workflows' },
            { text: '🏛️ Channels', callback_data: 'menu:channels' }
          ]
        ]
      }
    };
  }

  return {
    text: `🎬 *AI-nimate Executive Director Menu*\n\n` +
      `Orchestrate autonomous sub-agents across research, writing, voice, visual choreography, and video rendering.\n\n` +
      `• *Agent Instance*: \`${settings.activeAgent || 'agy'}\` (/agent)\n` +
      `• *Audio*: ${activeAudioLabel}\n` +
      `• *Art Style*: European Comic Ligne Claire (Kausal Media)\n` +
      `• *Engine*: 5-Layer Composable Canvas (Headless)\n\n` +
      `Select an option below:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎬 ➕ Start New Project', callback_data: 'flow:new_project' }
        ],
        [
          { text: '📋 Workflows & History', callback_data: 'menu:workflows' },
          { text: `🎙️ Audio: [${activeAudioLabel}]`, callback_data: 'menu:audio' }
        ],
        [
          { text: `🤖 Agent: [${settings.activeAgent || 'agy'}]`, callback_data: 'menu:agents' },
          { text: '🏛️ Channel Profiles', callback_data: 'menu:channels' }
        ],
        [
          { text: '🎨 Style Guidelines', callback_data: 'menu:styles' },
          { text: '🧠 Agent Prompts', callback_data: 'menu:prompts' }
        ],
        [
          { text: '📜 Live Bot Logs', callback_data: 'menu:logs' },
          { text: '🔼 Collapse Menu', callback_data: 'menu:collapse' }
        ]
      ]
    }
  };
}

function renderAgentsMenu() {
  const settings = loadSettings();
  const current = settings.activeAgent || 'agy';
  const check = (a) => (current === a ? '🔘' : '⚪');

  const text = `🤖 *Antigravity Agent Profile Switcher*\n\n` +
    `Switch between active Antigravity CLI profile instances on this machine to balance token usage and leverage independent quota pools:\n\n` +
    `• *agy* (Default): \`/home/agent/.local/bin/agy\`\n` +
    `  └ Profile: Default (\`~/.gemini\`)\n\n` +
    `• *agy2* (Profile 2): \`/home/agent/.local/bin/agy2\`\n` +
    `  └ Profile: Secondary (\`~/.gemini/profiles/agy2\`)\n\n` +
    `• *agy3* (Profile 3): \`/home/agent/.local/bin/agy3\`\n` +
    `  └ Profile: Tertiary (\`~/.gemini/profiles/agy3\`)\n\n` +
    `*Active Agent Instance:* \`${current}\``;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${check('agy')} agy (Default)`, callback_data: 'agent:set:agy' },
          { text: `${check('agy2')} agy2 (Profile 2)`, callback_data: 'agent:set:agy2' }
        ],
        [
          { text: `${check('agy3')} agy3 (Profile 3)`, callback_data: 'agent:set:agy3' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'menu:main' }
        ]
      ]
    }
  };
}

function renderAudioMenu() {
  const settings = loadSettings();
  const mode = settings.audioMode || 'audio_gate';
  const check = (m) => (mode === m ? '🔘' : '⚪');

  const text = `🎙️ *Audio & Voiceover Configuration*\n\n` +
    `Choose how AI-nimate produces voiceovers for your videos:\n\n` +
    `1. *${check('audio_gate')} Human Audio Gate (HITL Standby)*\n` +
    `   Pauses production when script is ready. Sends you the script & \`script.txt\` document, awaiting your custom audio upload (Google AI Studio, ElevenLabs, or your mic).\n\n` +
    `2. *${check('channel_default')} Channel Recommended Default*\n` +
    `   Uses the channel's prescribed tone and voice (e.g. Kausal Media: \`id-ID-ArdiNeural\`).\n\n` +
    `3. *${check('edge_tts')} Free Microsoft Edge Neural TTS*\n` +
    `   Instant synthesis with natural Indonesian neural voices (Current: \`${settings.edgeTtsVoice}\`).\n\n` +
    `4. *${check('custom_api')} Custom API (Google AI Studio / ElevenLabs / OpenAI)*\n` +
    `   Direct API synthesis using your developer credentials (Provider: \`${settings.customApiProvider}\`).\n\n` +
    `*Active Audio Mode:* *${mode.toUpperCase()}*`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${check('audio_gate')} ⏸️ Set: Audio Gate (HITL)`, callback_data: 'audio:set_mode:audio_gate' },
          { text: `${check('channel_default')} 🏛️ Set: Channel Default`, callback_data: 'audio:set_mode:channel_default' }
        ],
        [
          { text: `${check('edge_tts')} 🌐 Set: Edge TTS`, callback_data: 'audio:set_mode:edge_tts' },
          { text: `${check('custom_api')} ⚡ Set: Custom API`, callback_data: 'audio:set_mode:custom_api' }
        ],
        [
          { text: '🗣️ Choose Edge Voice', callback_data: 'audio:menu_edge_voices' },
          { text: '🔑 Configure Custom API', callback_data: 'audio:menu_custom_api' }
        ],
        [
          { text: '🔙 Back to Main Menu', callback_data: 'menu:main' }
        ]
      ]
    }
  };
}

function renderEdgeVoiceMenu() {
  const settings = loadSettings();
  const current = settings.edgeTtsVoice || 'id-ID-ArdiNeural';
  const check = (v) => (current === v ? '🔘' : '⚪');

  const text = `🌐 *Select Edge Neural TTS Voice*\n\n` +
    `High-fidelity free neural voices with natural breath pauses and phonetic syntax support:\n\n` +
    `• *id-ID-ArdiNeural*: Deep male, serious investigative tone (Kausal Media standard)\n` +
    `• *id-ID-GadisNeural*: Clear female, expressive documentary narration\n` +
    `• *jv-ID-DimasNeural*: Regional male warmth (Javanese inflection)\n` +
    `• *su-ID-JajangNeural*: Regional male warmth (Sundanese inflection)\n` +
    `• *en-US-ChristopherNeural*: Formal English documentary male\n` +
    `• *en-US-JennyNeural*: Natural English documentary female\n\n` +
    `*Active Voice:* \`${current}\``;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${check('id-ID-ArdiNeural')} Ardi (ID Male)`, callback_data: 'audio:set_edge:id-ID-ArdiNeural' },
          { text: `${check('id-ID-GadisNeural')} Gadis (ID Female)`, callback_data: 'audio:set_edge:id-ID-GadisNeural' }
        ],
        [
          { text: `${check('jv-ID-DimasNeural')} Dimas (Javanese)`, callback_data: 'audio:set_edge:jv-ID-DimasNeural' },
          { text: `${check('su-ID-JajangNeural')} Jajang (Sundanese)`, callback_data: 'audio:set_edge:su-ID-JajangNeural' }
        ],
        [
          { text: `${check('en-US-ChristopherNeural')} Christopher (EN)`, callback_data: 'audio:set_edge:en-US-ChristopherNeural' },
          { text: `${check('en-US-JennyNeural')} Jenny (EN)`, callback_data: 'audio:set_edge:en-US-JennyNeural' }
        ],
        [
          { text: '🔙 Back to Audio Menu', callback_data: 'menu:audio' }
        ]
      ]
    }
  };
}

function renderCustomApiMenu() {
  const settings = loadSettings();
  const provider = settings.customApiProvider || 'google-ai-studio';
  const check = (p) => (provider === p ? '🔘' : '⚪');

  const text = `⚡ *Custom TTS API Providers*\n\n` +
    `Direct API synthesis using developer keys:\n\n` +
    `1. *Google AI Studio (Gemini Multimodal Audio)*: High-fidelity natural Gemini voices (Puck, Charon, Aoede, Fenrir, Kore)\n` +
    `2. *ElevenLabs*: Hyper-realistic cloned and preset synthetic voices\n` +
    `3. *OpenAI Audio (TTS-1-HD)*: Studio-grade alloy, echo, onyx, nova\n\n` +
    `*Active Provider:* \`${provider}\`\n` +
    `*Active Voice:* \`${settings.customApiVoice || 'Default'}\``;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${check('google-ai-studio')} Google AI Studio`, callback_data: 'audio:set_api:google-ai-studio' },
          { text: `${check('elevenlabs')} ElevenLabs`, callback_data: 'audio:set_api:elevenlabs' }
        ],
        [
          { text: `${check('openai')} OpenAI TTS`, callback_data: 'audio:set_api:openai' }
        ],
        [
          { text: '🔙 Back to Audio Menu', callback_data: 'menu:audio' }
        ]
      ]
    }
  };
}

function renderNewProjectMenu() {
  const channels = listChannels();
  const text = `🎬 *Start a New Production (Step 1/2: Choose Channel)*\n\n` +
    `Select the channel profile for this video production:`;

  const buttons = [];
  // Strictly only channel names in this submenu
  channels.forEach(ch => {
    const icon = ch.mode === 'dark-mode' ? '🌙' : '🏛️';
    buttons.push([
      { text: `${icon} ${ch.name}`, callback_data: `flow:wizard_channel:${ch.id}` }
    ]);
  });

  buttons.push([
    { text: '🔙 Back to Menu', callback_data: 'menu:main' }
  ]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderTopicSelectionMenu(channelId, offset = 0) {
  const ch = getChannel(channelId) || getChannel('kausalmedia') || {
    id: channelId,
    name: channelId,
    suggestions: []
  };
  const format = ch.defaultFormat || '16:9';
  const unusedIdeas = getUnusedChannelIdeas(ch.id, 4, offset);
  const nextOffset = unusedIdeas.nextOffset ?? (offset + 4);

  let text = `🏛️ *New Project: ${ch.name} (Step 2/2: Choose Topic)*\n\n` +
    `• *Channel*: ${ch.name} (\`${ch.handle || ch.id}\`)\n` +
    `• *Aesthetic*: _${ch.aestheticVibe?.theme || 'Archival Essay'}_\n` +
    `• *Format*: \`${format}\` | Mode: \`${ch.mode || 'light-mode'}\`\n\n` +
    `🔥 *Unused Topic Ideas for This Week (Deep Research & Fresh Angle):*\n`;

  unusedIdeas.forEach((s, idx) => {
    text += `${idx + 1}. *${s.title}*\n   _${s.detail}_\n\n`;
  });

  text += `✍️ *Option 5: Custom Topic Briefing*\n` +
    `Send your own topic or brief in this chat in any amount of detail (from a single premise to a multi-paragraph dossier).`;

  const buttons = [];
  unusedIdeas.forEach((s, idx) => {
    buttons.push([
      {
        text: `${idx + 1}. ${s.tag || s.title.slice(0, 26)}`,
        callback_data: `flow:wizard_topic:${ch.id}:${s.key}`
      }
    ]);
  });

  // 5th option is Custom!
  buttons.push([
    { text: '✍️ 5. Custom Topic Briefing', callback_data: `flow:wizard_custom:${ch.id}` }
  ]);
  // 🔄 Refresh / Reroll and Back to channels buttons
  buttons.push([
    { text: '🔄 Refresh Ide Baru (Reroll)', callback_data: `flow:wizard_refresh:${ch.id}:${nextOffset}` },
    { text: '🔙 Back to Channels', callback_data: 'flow:new_project' }
  ]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderWorkflowsMenu() {
  const active = getActiveWorkflow();
  const past = getPastWorkflows(5);
  const settings = loadSettings();

  let text = '📋 *Production Workflows*\n\n';

  if (active) {
    const curAgent = active.agent || settings.activeAgent || 'agy';
    const activeBar = formatProgressBar(active.progress || 0, 14);
    text += `*Active Workflow:*\n` +
      `• Topic: *${active.topic}*\n` +
      `• Project: \`${active.project}\`\n` +
      `• Executing Agent: \`${curAgent}\` (\`/home/agent/.local/bin/${curAgent}\`)\n` +
      `• Stage: *${active.stage}* (${active.status})\n` +
      `• Progress: \`[${activeBar}] ${active.progress || 0}%\`\n\n`;
  } else {
    text += `*Active Workflow:* _None running._\n\n`;
  }

  text += `*Recent Workflows:*\n`;
  if (past.length === 0) {
    text += `_No past workflows yet._\n`;
  } else {
    past.forEach((w, i) => {
      const icon = w.status === 'completed' ? '✅' : (w.status === 'failed' ? '❌' : (w.status === 'cancelled' ? '🛑' : '⏳'));
      const miniBar = formatProgressBar(w.progress || 0, 10);
      text += `${i + 1}. ${icon} *${w.topic}* (\`${w.style}\`)\n   └ Status: \`${w.status}\` | \`[${miniBar}] ${w.progress || 0}%\` | Agent: \`${w.agent || 'agy'}\`\n`;
    });
  }

  const buttons = [
    [
      { text: '🎬 ➕ Start New Project', callback_data: 'flow:new_project' }
    ]
  ];

  if (active) {
    const curAgent = active.agent || settings.activeAgent || 'agy';
    const otherAgents = ['agy', 'agy2', 'agy3'].filter(a => a !== curAgent);

    buttons.push([
      { text: `⏳ Inspect: ${active.project.slice(0, 18)}`, callback_data: `flow:view:${active.id}` },
      { text: `🛑 Stop Active`, callback_data: `flow:stop` }
    ]);

    // Quick workflow transfer row to switch agent on the fly
    const transferRow = otherAgents.map(ag => ({
      text: `🔄 Move to ${ag}`,
      callback_data: `flow:transfer_agent:${active.id}:${ag}`
    }));
    buttons.push(transferRow);
  }

  // Interactive quick-resume buttons for stalled or pending projects
  const stalled = getStalledWorkflows(3);
  stalled.forEach(w => {
    if (active && active.id === w.id) return;
    const shortTitle = (w.project || w.topic || 'project').slice(0, 16);
    buttons.push([
      { text: `▶️ Resume: ${shortTitle}`, callback_data: `flow:resume:${w.id}` },
      { text: `📁 View`, callback_data: `flow:view:${w.id}` }
    ]);
  });

  if (past.length > 0 && past[0].videoPath && fs.existsSync(past[0].videoPath)) {
    buttons.push([{ text: `🎬 Re-send Latest Video`, callback_data: `flow:resend:${past[0].id}` }]);
  }
  buttons.push([
    { text: `🗑️ Delete Projects`, callback_data: 'menu:delete_projects' },
    { text: '🔙 Back to Menu', callback_data: 'menu:main' }
  ]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderDeleteProjectsMenu() {
  const projects = listAllProjects();
  let text = '🗑️ *Project Management & Deletion*\n\n' +
    'Select a project below to delete its workspace files and workflow history, or use `/delete <slug>`:\n\n';

  const buttons = [];
  if (projects.length === 0) {
    text += '_No projects found._\n';
  } else {
    projects.slice(0, 10).forEach(p => {
      const isActive = (state.activeJob?.project === p.project || state.waitingForAudio?.projectDir?.endsWith(p.project));
      const statusIcon = isActive ? '⏳' : (p.status === 'completed' ? '✅' : (p.status === 'cancelled' ? '🛑' : '📁'));
      buttons.push([
        { text: `${statusIcon} 🗑️ ${p.project}${isActive ? ' (Active)' : ''}`, callback_data: `flow:ask_delete:${p.id || p.project}` }
      ]);
    });
  }

  buttons.push([{ text: '🔙 Back to Workflows', callback_data: 'menu:workflows' }]);
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderConfirmDeleteMenu(idOrSlug) {
  const wf = getWorkflow(idOrSlug);
  const slug = wf?.project || idOrSlug;
  const topic = wf?.topic || slug;

  const text = `⚠️ *Confirm Project Deletion*\n\n` +
    `Are you sure you want to delete project *${topic}* (\`${slug}\`)?\n\n` +
    `🚨 *Warning:* This action is irreversible. The project workspace, audio, storyboard, and rendered video will be permanently deleted.`;

  const buttons = [
    [
      { text: '⚠️ Confirm Delete', callback_data: `flow:do_delete:${idOrSlug}` },
      { text: '🔙 Cancel', callback_data: 'menu:delete_projects' }
    ]
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderStylesMenu() {
  const styles = listStyles();
  let text = '🎨 *Channel Style & Content Guidelines*\n\n' +
    'Select a style group below to view its modular sub-guidelines (Background, Character, Palette, Typography, Data, Audio, Pacing):\n\n';

  const buttons = [];
  styles.forEach(s => {
    text += `• *${s.name}* (\`${s.id}\`)\n  _${s.description.slice(0, 70)}..._\n\n`;
    buttons.push([{ text: `🔎 ${s.name}`, callback_data: `style:view:${s.id}` }]);
  });

  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'menu:main' }]);
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderStyleDetailMenu(styleId) {
  const style = getStyle(styleId);
  const text = `🎨 *Style Group: ${style.name}*\n` +
    `ID: \`${style.id}\` | Aspect Ratio: \`${style.aspectRatio || '16:9'}\`\n\n` +
    `*Modular Sub-Guidelines:*\n` +
    `• 🖼️ *Background*: Tone \`${style.background?.paperTone}\`, Pattern \`${style.background?.pattern}\`, Vignette \`${style.background?.vignette}\`\n` +
    `• 👤 *Character*: Mode \`${style.character?.mode || 'editorial'}\`, Puppet enabled: \`${style.character?.puppetEnabled ? 'Yes' : 'No'}\`\n` +
    `• 🎨 *Palette*: \`${style.palette?.name}\` (Accent: \`${style.palette?.accent}\`)\n` +
    `• 🔤 *Typography*: Headline \`${style.typography?.headlineFont}\`, Subtitles \`${style.typography?.subtitles?.style}\`\n` +
    `• 📊 *Data Graphics*: Chart engine \`${style.dataGraphics?.chartEngine || 'odometer'}\`\n` +
    `• 🔊 *Audio*: Voice \`${style.audio?.voice}\`, BGM ducking \`${style.audio?.bgmDuckVolume}\`\n` +
    `• ⏱️ *Pacing*: \`${style.pacing?.targetWPM || 135} WPM\`, Beat length \`${style.pacing?.beatDurationSeconds || '8-11s'}\`\n\n` +
    `_To customize any sub-guideline, edit \`styles/${style.id}.json\`._`;

  const buttons = [
    [
      { text: '🖼️ Background', callback_data: `style:sub:${styleId}:background` },
      { text: '👤 Character', callback_data: `style:sub:${styleId}:character` }
    ],
    [
      { text: '🎨 Palette', callback_data: `style:sub:${styleId}:palette` },
      { text: '🔤 Typography', callback_data: `style:sub:${styleId}:typography` }
    ],
    [
      { text: '📊 Data Graphics', callback_data: `style:sub:${styleId}:data` },
      { text: '⏱️ Pacing', callback_data: `style:sub:${styleId}:pacing` }
    ],
    [{ text: '🔙 Back to Styles', callback_data: 'menu:styles' }]
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderStyleSubDetail(styleId, subKey) {
  const style = getStyle(styleId);
  const data = style[subKey] || style.stylingTips?.[subKey] || 'No specific sub-guidelines configured.';
  const formatted = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

  const text = `🎨 *${style.name}* ──► *${subKey.toUpperCase()} Sub-Guideline*\n\n` +
    '```json\n' + formatted + '\n```\n\n' +
    `_To update this sub-guideline, modify the JSON block in \`styles/${style.id}.json\`._`;

  const buttons = [
    [{ text: `🔙 Back to ${style.name}`, callback_data: `style:view:${styleId}` }]
  ];
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderChannelsMenu() {
  const channels = listChannels();
  let text = '🏛️ *Future Channel Profiles & Visual Identities*\n\n' +
    'Manage channel visual profiles, light/dark modes, cultural aesthetics, and anti-flagging rules:\n\n';

  const buttons = [];
  channels.forEach(ch => {
    text += `• *${ch.name}* (\`${ch.id}\`)\n` +
      `  Platform: ${ch.platform} | Mode: \`${ch.mode}\`\n` +
      `  Theme: _${ch.theme || 'Archival essay'}_\n` +
      `  Max Asset Repetition: ${ch.maxAssetRepetition}x / video\n\n`;
    buttons.push([{ text: `🏛️ ${ch.name}`, callback_data: `channel:view:${ch.id}` }]);
  });

  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'menu:main' }]);
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderChannelDetail(channelId) {
  const ch = getChannel(channelId);
  if (!ch) {
    return { text: `❌ Channel \`${channelId}\` not found.`, reply_markup: { inline_keyboard: [[{ text: '🔙 Back to Channels', callback_data: 'menu:channels' }]] } };
  }

  const text = `🏛️ *Channel Profile: ${ch.name}* (\`${ch.handle || ch.id}\`)\n` +
    `• *Platform*: ${ch.platform}\n` +
    `• *Mode*: \`${ch.mode}\`\n` +
    `• *Visual Vibe*: _${ch.aestheticVibe?.theme || 'Custom'}_\n` +
    `• *Paper Tone*: \`${ch.aestheticVibe?.paperTone}\` (${ch.aestheticVibe?.texture})\n` +
    `• *Batik Linework*: \`${ch.aestheticVibe?.batikMotif}\`\n` +
    `• *Palette*: Accent \`${ch.palette?.accent}\`, Seals \`${ch.palette?.waxStampRed || '#b91c1c'}\`\n` +
    `• *Strict Asset Ceiling*: Max *${ch.rules?.maxAssetRepetitionPerVideo || 5}x* per video\n\n` +
    `🛡️ *Script Anti-Flagging Architecture:*\n` +
    `• Hook Rotation: 4 Distinct empirical archetypes\n` +
    `• Cadence: Asymmetrical sentences (3-5w punches + 15w context)\n` +
    `• Acronyms: Bracketed phonetics [BEI|B-E-I]\n` +
    `• Anti-Slop: Zero unearned moralizing or AI filler phrases\n\n` +
    `_Profile stored in \`channels/${ch.id}.json\`._`;

  const buttons = [
    [
      { text: `🎬 ➕ Start ${ch.name} Project`, callback_data: `flow:wizard_channel:${ch.id}` }
    ],
    [
      { text: '🔙 Back to Channels', callback_data: 'menu:channels' },
      { text: '📁 Main Menu', callback_data: 'menu:main' }
    ]
  ];
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderPromptsMenu() {
  const agents = listAgentPrompts();
  let text = '🧠 *Main Orchestrator & Sub-Agent Prompts*\n\n' +
    'Select an agent to inspect its system prompt, or use `/setprompt <agent> <prompt>` to update:\n\n';

  const buttons = [];
  agents.forEach(a => {
    text += `• *${a.name}* (\`${a.id}\`)\n  Role: _${a.role}_\n\n`;
    buttons.push([{ text: `🧠 ${a.name}`, callback_data: `prompt:view:${a.id}` }]);
  });

  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'menu:main' }]);
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderPromptDetail(agentId) {
  const agent = getAgentPrompt(agentId);
  if (!agent) {
    return { text: `❌ Agent \`${agentId}\` not found.`, reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'menu:prompts' }]] } };
  }

  const text = `🧠 *Agent: ${agent.name}* (\`${agentId}\`)\n` +
    `Role: _${agent.role}_\n\n` +
    `*Active System Prompt:*\n` +
    `\`\`\`\n${agent.prompt}\n\`\`\`\n\n` +
    `_To update this prompt, send:_ \n\`/setprompt ${agentId} <new prompt text>\``;

  const buttons = [
    [{ text: '🔙 Back to Agents', callback_data: 'menu:prompts' }]
  ];
  return { text, reply_markup: { inline_keyboard: buttons } };
}

function renderLogsView() {
  const tail = logBuffer.slice(-25).join('\n') || 'No logs recorded yet.';
  const text = `📜 *Live Output Logs (Last 25 entries):*\n\n` +
    `\`\`\`text\n${tail}\n\`\`\``;

  const buttons = [
    [
      { text: '🔄 Refresh Logs', callback_data: 'menu:logs' },
      { text: '🔙 Back to Menu', callback_data: 'menu:main' }
    ]
  ];
  return { text, reply_markup: { inline_keyboard: buttons } };
}

// --- Active State Tracking for HITL & Audio Standby ---
const state = {
  activeJob: null,
  activeProcess: null,
  isCancelling: false,
  waitingForAudio: null, // { workflowId, projectDir, topic, style, format, scriptText, agent }
  awaitingTopicChatId: null,
  creationWizard: {} // chatId -> { channelId, step: 'topic' }
};

function rehydrateAudioWait(wf) {
  if (!wf) return null;
  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  let scriptText = '';
  const scriptPath = path.join(projectDir, 'script.txt');
  if (fs.existsSync(scriptPath)) {
    try { scriptText = fs.readFileSync(scriptPath, 'utf-8'); } catch (_) {}
  }
  state.waitingForAudio = {
    workflowId: wf.id,
    projectDir,
    topic: wf.topic,
    style: wf.style || 'kausalmedia',
    format: wf.format || '16:9',
    scriptText,
    agent: wf.agent || 'agy'
  };
  return state.waitingForAudio;
}

function getStandbyAudioWorkflow() {
  if (state.waitingForAudio) return state.waitingForAudio;
  const active = getActiveWorkflow();
  if (active && active.status === 'audio_wait') {
    return rehydrateAudioWait(active);
  }
  return null;
}

function runProcess(cmd) {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT || process.env.TEST_MODE === '1') {
    if (cmd.includes('scripts/render.js') || cmd.includes('scripts/director.js') || cmd.includes('scripts/align.js') || cmd.includes('scripts/tts.js')) {
      return Promise.resolve();
    }
  }
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, { cwd: REPO_ROOT });
    state.activeProcess = proc;
    proc.stdout?.on('data', data => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(l => appendLog(l.trim()));
    });
    proc.stderr?.on('data', data => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(l => appendLog(`[ERR] ${l.trim()}`));
    });
    proc.on('close', (code, signal) => {
      state.activeProcess = null;
      if (signal === 'SIGTERM' || signal === 'SIGKILL' || state.isCancelling) {
        return reject(new Error('INTERRUPTED'));
      }
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
    proc.on('error', err => {
      state.activeProcess = null;
      reject(err);
    });
  });
}

async function stopActiveWorkflow() {
  if (!state.activeJob && !state.waitingForAudio) {
    return null;
  }

  state.isCancelling = true;
  const currentJob = state.activeJob || {
    id: state.waitingForAudio?.workflowId,
    topic: state.waitingForAudio?.topic,
    project: state.waitingForAudio?.projectDir ? path.basename(state.waitingForAudio.projectDir) : 'untitled'
  };

  if (state.activeProcess) {
    try {
      state.activeProcess.kill('SIGTERM');
      setTimeout(() => {
        if (state.activeProcess) {
          try { state.activeProcess.kill('SIGKILL'); } catch (_) {}
        }
      }, 1500);
    } catch (_) {}
  }

  if (currentJob.id) {
    cancelWorkflow(currentJob.id);
  }

  appendLog(`[Workflow:${currentJob.id}] Active production stopped by user.`);

  const stoppedInfo = { ...currentJob };
  state.activeJob = null;
  state.waitingForAudio = null;
  state.activeProcess = null;
  state.isCancelling = false;

  return stoppedInfo;
}

function listAllProjects() {
  const workflows = loadWorkflows();
  const projectsDir = path.join(REPO_ROOT, 'projects');
  const dirNames = fs.existsSync(projectsDir)
    ? fs.readdirSync(projectsDir).filter(name => {
        try {
          return fs.statSync(path.join(projectsDir, name)).isDirectory();
        } catch (_) {
          return false;
        }
      })
    : [];

  const projectMap = new Map();
  for (const wf of workflows) {
    projectMap.set(wf.project, {
      id: wf.id,
      project: wf.project,
      topic: wf.topic || wf.project,
      style: wf.style || 'unknown',
      status: wf.status,
      hasDir: dirNames.includes(wf.project)
    });
  }

  for (const dir of dirNames) {
    if (!projectMap.has(dir)) {
      projectMap.set(dir, {
        id: dir,
        project: dir,
        topic: dir,
        style: 'unknown',
        status: 'standalone',
        hasDir: true
      });
    }
  }

  return Array.from(projectMap.values());
}

async function deleteProject(idOrSlug) {
  const wf = getWorkflow(idOrSlug);
  const slug = wf?.project || idOrSlug;

  // If this project is currently running, halt it first
  if (state.activeJob && (state.activeJob.id === idOrSlug || state.activeJob.project === slug)) {
    await stopActiveWorkflow();
  } else if (state.waitingForAudio && (state.waitingForAudio.workflowId === idOrSlug || state.waitingForAudio.projectDir?.endsWith(slug))) {
    await stopActiveWorkflow();
  }

  // Delete project directory if exists
  const projectDir = path.join(REPO_ROOT, 'projects', slug);
  let dirDeleted = false;
  if (fs.existsSync(projectDir)) {
    try {
      fs.rmSync(projectDir, { recursive: true, force: true });
      dirDeleted = true;
      appendLog(`[Project:${slug}] Removed directory: ${projectDir}`);
    } catch (e) {
      appendLog(`[Project:${slug}] Error removing directory: ${e.message}`);
    }
  }

  // Delete from ledger
  const removedWf = deleteWorkflow(idOrSlug) || deleteWorkflow(slug);
  appendLog(`[Project:${slug}] Removed from workflow ledger.`);

  return {
    success: true,
    slug,
    topic: removedWf?.topic || slug,
    dirDeleted
  };
}

// --- Video Creation Workflow Runner ---
async function startVideoWorkflow(chatId, input, options = {}) {
  if (state.activeJob) {
    await sendMessage(chatId, `⚠️ A workflow is already in progress (\`${state.activeJob.topic}\`). Please wait for completion or send \`/stop\` to cancel it.`);
    return;
  }

  // Resolve channel
  let channelId = options.channel;
  if (!channelId && input.includes('--channel')) {
    const match = input.match(/--channel\s+([A-Za-z0-9_-]+)/);
    if (match) {
      channelId = match[1];
      input = input.replace(/--channel\s+[A-Za-z0-9_-]+/, '').trim();
    }
  }
  if (!channelId) channelId = 'kausalmedia';

  const ch = getChannel(channelId);
  const defaultStyle = ch?.style || (channelId === 'kausalmedia' ? 'kausalmedia' : 'investigative-documentary');
  const defaultFormat = ch?.defaultFormat || '16:9';

  // Parse arguments
  let topic = input;
  let style = defaultStyle;
  let format = defaultFormat;

  if (input.includes('--style')) {
    const match = input.match(/--style\s+([A-Za-z0-9_-]+)/);
    if (match) {
      style = match[1];
      topic = topic.replace(/--style\s+[A-Za-z0-9_-]+/, '').trim();
    }
  }
  if (input.includes('--format')) {
    const match = input.match(/--format\s+([0-9:]+)/);
    if (match) {
      format = match[1];
      topic = topic.replace(/--format\s+[0-9:]+/, '').trim();
    }
  }

  if (!topic) {
    await sendMessage(chatId, `❌ Please provide a topic: \`/create <topic> [--style <name>] [--format <16:9|9:16]>\``);
    return;
  }

  const lines = topic.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] ? lines[0].slice(0, 80) : 'Untitled Project';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'video-project';
  const projectDir = path.join(REPO_ROOT, 'projects', slug);
  fs.mkdirSync(projectDir, { recursive: true });

  // Persist full briefing
  const briefingText = options.briefing ? `${topic}\n\n[Topic Context / Detail]\n${options.briefing}` : topic;
  fs.writeFileSync(path.join(projectDir, 'briefing.txt'), briefingText, 'utf-8');

  const settings = loadSettings();
  const activeAgent = settings.activeAgent || 'agy';

  const wf = recordWorkflow({
    project: slug,
    topic: title,
    channel: channelId,
    style,
    format,
    agent: activeAgent,
    status: 'research',
    stage: 'Domain Research',
    progress: 10
  });

  state.activeJob = wf;
  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const workerArgs = [
    pipelineScript,
    '--workflow-id', wf.id,
    '--project', slug,
    '--topic', title,
    '--channel', channelId,
    '--format', format,
    '--agent', activeAgent
  ];

  const worker = spawn('node', workerArgs, {
    detached: true,
    stdio: 'ignore'
  });
  worker.unref();

  updateWorkflow(wf.id, { pid: worker.pid });
  appendLog(`[Workflow:${wf.id}] Dispatched background pipeline worker (PID: ${worker.pid}).`);

  await sendMessage(chatId, `🚀 *Produksi Video Dimulai!*\n\n` +
    `• *Judul*: \`${title}\`\n` +
    `• *Channel*: *Kausal Media* (\`${channelId}\`)\n` +
    `• *Format*: \`${format === '9:16' ? '9:16 Shorts' : '16:9 Long-Form (8–12m)'}\`\n` +
    `• *Agent Worker*: \`${activeAgent}\` (PID: \`${worker.pid}\`)\n\n` +
    `_Pipeline berjalan di background worker. Meneliti dan menyusun naskah narasi... Anda akan menerima notifikasi begitu naskah siap untuk direview._`,
    {
      inline_keyboard: [
        [{ text: '📊 Status Produksi', callback_data: `flow:view:${wf.id}` }],
        [{ text: '🛑 Batalkan', callback_data: 'flow:stop' }]
      ]
    }
  );
  state.activeJob = null;
}

async function executeRenderWithLiveProgressBar(chatId, workflowId, projectDir, topic, style, format) {
  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const worker = spawn('node', [pipelineScript, '--workflow-id', workflowId, '--resume', 'render', '--auto'], {
    detached: true,
    stdio: 'ignore'
  });
  worker.unref();
  updateWorkflow(workflowId, { pid: worker.pid });
  await sendMessage(chatId, `ℹ️ *Render Pipeline Dispatched*: Worker PID \`${worker.pid}\`.`);
}

async function resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, customAudio = false) {
  appendLog(`[Workflow:${workflowId}] Audio received. Dispatching worker for scene choreography and rendering...`);
  updateWorkflow(workflowId, { status: 'choreography', stage: 'Choreography & Rendering', progress: 55 });
  
  const pipelineScript = path.join(REPO_ROOT, 'scripts', 'pipeline.js');
  const worker = spawn('node', [pipelineScript, '--workflow-id', workflowId, '--resume', 'render', '--auto'], {
    detached: true,
    stdio: 'ignore'
  });
  worker.unref();
  updateWorkflow(workflowId, { pid: worker.pid });

  await sendMessage(chatId, `🎬 *Audio Diterima & Disetujui!*\n\n` +
    `Worker pipeline (PID: \`${worker.pid}\`) sedang menjalankan koreografi adegan, Visual QA, dan encoding Playwright Chromium CDP.\n\n` +
    `_Anda akan menerima notifikasi begitu video selesai diproduksi._`);
  state.activeJob = null;
  state.waitingForAudio = null;
}

// --- Manual Server Audio Ingestion & HITL Linker ---
async function linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, inputPath = null) {
  let resolvedSource = null;

  if (inputPath && typeof inputPath === 'string' && inputPath.trim()) {
    const raw = inputPath.trim().replace(/^["']|["']$/g, '').trim();
    // Candidate 1: Absolute path
    if (path.isAbsolute(raw) && fs.existsSync(raw)) {
      resolvedSource = raw;
    }
    // Candidate 2: Relative to projectDir
    else if (fs.existsSync(path.join(projectDir, raw))) {
      resolvedSource = path.join(projectDir, raw);
    }
    // Candidate 3: Relative to REPO_ROOT
    else if (fs.existsSync(path.join(REPO_ROOT, raw))) {
      resolvedSource = path.join(REPO_ROOT, raw);
    }
    // Candidate 4: Case-insensitive & whitespace-tolerant search in projectDir
    else if (fs.existsSync(projectDir)) {
      const cleanTarget = path.basename(raw).toLowerCase().replace(/\s+/g, '');
      try {
        const files = fs.readdirSync(projectDir);
        const match = files.find(f => {
          const cleanF = f.toLowerCase().replace(/\s+/g, '');
          return cleanF === cleanTarget || cleanF === cleanTarget + path.extname(f).toLowerCase();
        });
        if (match) {
          resolvedSource = path.join(projectDir, match);
        }
      } catch (_) {}
    }
  } else {
    // No inputPath given: look for existing audio in projectDir
    // Prioritize custom non-default audio uploads (e.g. .wav / .m4a) sorted by newest mtime
    if (fs.existsSync(projectDir)) {
      try {
        const files = fs.readdirSync(projectDir);
        const audioFiles = files
          .filter(f => /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(f) && !f.startsWith('.'))
          .map(f => ({ name: f, path: path.join(projectDir, f), mtime: fs.statSync(path.join(projectDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);

        const customAudio = audioFiles.find(f => f.name !== 'voiceover.mp3' && f.name !== 'audio.mp3');
        if (customAudio) {
          resolvedSource = customAudio.path;
        } else if (audioFiles.length > 0) {
          resolvedSource = audioFiles[0].path;
        }
      } catch (_) {}
    }
  }

  // If still not found, list available files and guide creator
  if (!resolvedSource || !fs.existsSync(resolvedSource)) {
    let availableList = '• (Belum ada file audio di folder proyek)';
    if (fs.existsSync(projectDir)) {
      try {
        const allFiles = fs.readdirSync(projectDir).filter(f => !f.startsWith('.'));
        const audioFiles = allFiles.filter(f => /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(f));
        if (audioFiles.length > 0) {
          availableList = audioFiles.map(f => `• \`${f}\``).join('\n');
        }
      } catch (_) {}
    }

    const errName = inputPath ? `\`${inputPath}\`` : 'audio';
    appendLog(`[Workflow:${workflowId}] Custom audio file not found: ${inputPath || 'none'}`);
    await sendMessage(chatId,
      `⚠️ *File Audio Tidak Ditemukan*: ${errName}\n\n` +
      `📂 *File audio yang terdeteksi di folder proyek* (\`${path.basename(projectDir)}\`):\n` +
      `${availableList}\n\n` +
      `💡 *Cara Melanjutkan:*\n` +
      `1. Upload file audio Anda ke folder proyek:\n` +
      `   \`projects/${path.basename(projectDir)}/<nama_file>\`\n` +
      `2. Ketik di Telegram: \`/audio <nama_file>\` (contoh: \`/audio voice.wav\`)\n` +
      `3. Atau ketik path lengkap di server: \`/audio /path/ke/audio.mp3\``,
      {
        inline_keyboard: [
          [{ text: '▶️ Lanjut dengan Edge TTS', callback_data: `flow:continue_tts:${workflowId}` }]
        ]
      }
    );
    return false;
  }

  // Validate file size (> 1KB)
  const stat = fs.statSync(resolvedSource);
  if (stat.size < 1024) {
    await sendMessage(chatId, `❌ *File Audio Rusak*: File \`${path.basename(resolvedSource)}\` berukuran 0 atau terlalu kecil (${stat.size} bytes).`);
    return false;
  }

  // Destination canonical files: voiceover.mp3 & audio.mp3
  const destAudioPath = path.join(projectDir, 'voiceover.mp3');
  const destAudioAlt = path.join(projectDir, 'audio.mp3');

  // Convert/copy to voiceover.mp3 via FFmpeg if necessary
  const isSameMp3 = (path.resolve(resolvedSource) === path.resolve(destAudioPath));

  if (!isSameMp3) {
    appendLog(`[Workflow:${workflowId}] Normalizing custom audio from ${resolvedSource} to ${destAudioPath}...`);
    await sendMessage(chatId, `🔄 Menyiapkan audio dari \`${path.basename(resolvedSource)}\`...`);
    try {
      execSync(`ffmpeg -y -i "${resolvedSource}" -c:a libmp3lame -q:a 2 "${destAudioPath}"`, { stdio: 'pipe' });
    } catch (convErr) {
      appendLog(`[Workflow:${workflowId}] FFmpeg audio normalization failed: ${convErr.message}`);
      await sendMessage(chatId, `❌ Gagal mengonversi audio: ${convErr.message}`);
      return false;
    }
  }

  // Ensure audio.mp3 also exists
  if (path.resolve(destAudioPath) !== path.resolve(destAudioAlt)) {
    try { fs.copyFileSync(destAudioPath, destAudioAlt); } catch (_) {}
  }

  // Probe duration
  let durationSec = 0;
  try {
    const probeStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${destAudioPath}"`, { encoding: 'utf-8' }).trim();
    durationSec = parseFloat(probeStr);
  } catch (_) {}

  const sizeMb = (fs.statSync(destAudioPath).size / (1024 * 1024)).toFixed(2);
  const durFormatted = durationSec ? `${Math.floor(durationSec / 60)}m ${Math.round(durationSec % 60)}s` : 'Terdeteksi';

  state.waitingForAudio = null;
  appendLog(`[Workflow:${workflowId}] Linked custom voiceover: ${resolvedSource} (${durFormatted}, ${sizeMb} MB)`);
  await sendMessage(chatId,
    `✅ *Audio Kustom Terpasang!*\n\n` +
    `• *File*: \`${path.basename(resolvedSource)}\`\n` +
    `• *Ukuran*: \`${sizeMb} MB\`\n` +
    `• *Durasi*: \`${durFormatted}\`\n\n` +
    `▶️ Melanjutkan ke tahap sinkronisasi stempel waktu & koreografi video...`
  );

  resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, true);
  return true;
}

// --- Milestone-Based Workflow Resumption Pipeline ---
async function resumeWorkflowPipeline(chatId, workflowId, overrideAgent = null) {
  // If an active process is actively running on another job, alert user
  if (state.activeProcess && state.activeJob && state.activeJob.id !== workflowId) {
    await sendMessage(chatId,
      `⚠️ *Proses Lain Sedang Berjalan*\n\n` +
      `Workflow \`${state.activeJob.project}\` sedang berjalan aktif. ` +
      `Ketik \`/stop\` terlebih dahulu jika ingin menghentikannya sebelum melanjutkan proyek lain.`
    );
    return false;
  }

  const wf = getWorkflow(workflowId);
  if (!wf) {
    await sendMessage(chatId, `❌ Proyek dengan ID atau slug \`${workflowId}\` tidak ditemukan.`);
    return false;
  }

  const settings = loadSettings();
  const activeAgent = overrideAgent || wf.agent || settings.activeAgent || 'agy';

  // If overrideAgent or switching agent was requested
  if (overrideAgent && overrideAgent !== wf.agent) {
    try {
      transferWorkflow(wf.id, overrideAgent);
    } catch (_) {}
  }

  // Set as active workflow in ledger and bot state
  setActiveWorkflow(wf.id);
  wf.agent = activeAgent;
  updateWorkflow(wf.id, { agent: activeAgent });
  state.activeJob = wf;
  state.isCancelling = false;

  const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
  fs.mkdirSync(projectDir, { recursive: true });

  const topic = wf.topic || wf.project;
  const style = wf.style || 'kausalmedia';
  const format = wf.format || '16:9';
  const channelId = wf.channel || 'kausalmedia';

  const briefingPath = path.join(projectDir, 'briefing.txt');
  const researchPath = path.join(projectDir, 'research.txt');
  const scriptPath = path.join(projectDir, 'script.txt');
  const voicePath = path.join(projectDir, 'voiceover.mp3');
  const audioAltPath = path.join(projectDir, 'audio.mp3');
  const timestampsPath = path.join(projectDir, 'timestamps.json');
  const storyboardPath = path.join(projectDir, 'storyboard.json');
  const videoPath = path.join(projectDir, 'final_cut.mp4');

  appendLog(`[Workflow:${wf.id}] Resuming pipeline for "${topic}" (agent: ${activeAgent}, dir: ${projectDir})...`);
  await sendMessage(chatId,
    `🔄 *Melanjutkan Proyek AI-nimate*\n\n` +
    `• Topik: *${topic}*\n` +
    `• Slug: \`${wf.project}\`\n` +
    `• Agent: \`${activeAgent}\`\n` +
    `• Style: \`${style}\` | Format: \`${format}\`\n\n` +
    `🔎 Memeriksa checkpoint & milestone proyek...`
  );

  // Checkpoint 1: Video already exists
  const existingVideo = findProjectVideo(projectDir);
  if (existingVideo) {
    appendLog(`[Workflow:${wf.id}] Video already rendered: ${existingVideo}`);
    await deliverWorkflowVideo(chatId, wf, projectDir, topic, style);
    state.activeJob = null;
    return true;
  }

  // Checkpoint 2: Storyboard + Audio + Timestamps exist -> Resume directly at Render (Stage 4)
  const hasAudio = (fs.existsSync(voicePath) && fs.statSync(voicePath).size > 1024) ||
                    (fs.existsSync(audioAltPath) && fs.statSync(audioAltPath).size > 1024);
  const hasTimestamps = fs.existsSync(timestampsPath) && fs.statSync(timestampsPath).size > 10;
  const hasStoryboard = fs.existsSync(storyboardPath) && fs.statSync(storyboardPath).size > 10;

  if (hasStoryboard && hasAudio && hasTimestamps) {
    appendLog(`[Workflow:${wf.id}] Resuming from Render stage (milestones: storyboard, audio, timestamps ready)...`);
    updateWorkflow(wf.id, { status: 'rendering', stage: 'Chromium Render', progress: 80 });
    try {
      await executeRenderWithLiveProgressBar(chatId, wf.id, projectDir, topic, style, format);
      await deliverWorkflowVideo(chatId, wf, projectDir, topic, style);
    } catch (err) {
      if (err.message === 'INTERRUPTED' || state.isCancelling) return false;
      appendLog(`[Workflow:${wf.id}] Render error: ${err.message}`);
      updateWorkflow(wf.id, { status: 'failed', error: err.message });
      await sendMessage(chatId, `❌ *Production Error saat Render*: ${err.message}`);
    } finally {
      state.activeJob = null;
      state.activeProcess = null;
    }
    return true;
  }

  // Checkpoint 3: Audio + Timestamps exist, but Storyboard is missing -> Resume from Choreography (Stage 3)
  if (hasAudio && hasTimestamps) {
    appendLog(`[Workflow:${wf.id}] Resuming from Choreography stage...`);
    resumeWorkflowWithAudio(chatId, wf.id, projectDir, topic, style, format, true);
    return true;
  }

  // Checkpoint 4: Script exists (Stalled at Audio Gate or Missing Audio)
  if (fs.existsSync(scriptPath) && fs.statSync(scriptPath).size > 100) {
    const scriptText = fs.readFileSync(scriptPath, 'utf8');
    appendLog(`[Workflow:${wf.id}] Script exists (${scriptText.split(/\s+/).length} words). Checking for audio files...`);

    // Check if user uploaded a server audio file (e.g. .wav or .m4a or .mp3)
    let candidateAudio = null;
    try {
      const files = fs.readdirSync(projectDir);
      const audioFiles = files
        .filter(f => /\.(wav|m4a|aac|flac|ogg|opus|mp3)$/i.test(f) && !f.startsWith('.'))
        .filter(f => f !== 'audio.mp3' && f !== 'voiceover.mp3');
      if (audioFiles.length > 0) {
        candidateAudio = audioFiles[0];
      }
    } catch (_) {}

    if (candidateAudio) {
      appendLog(`[Workflow:${wf.id}] Found candidate audio: ${candidateAudio}. Linking automatically...`);
      await sendMessage(chatId, `🎙️ *File Audio Ditemukan di Folder Proyek*: \`${candidateAudio}\`\nMenghubungkan audio dan memproses stempel waktu...`);
      return linkAndResumeCustomAudio(chatId, wf.id, projectDir, topic, style, format, candidateAudio);
    }

    // If Audio Gate is enabled in settings (or workflow was previously paused on audio_wait)
    if (settings.hitlAudio || wf.status === 'audio_wait') {
      updateWorkflow(wf.id, { status: 'audio_wait', stage: 'Standby for Audio', progress: 30 });
      state.waitingForAudio = {
        workflowId: wf.id,
        projectDir,
        topic,
        style,
        format,
        scriptText
      };

      const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
      const durSec = Math.round((wordCount / 135) * 60);
      const durFmt = `${Math.floor(durSec / 60)}m ${durSec % 60}s`;

      await sendMessage(chatId,
        `⏸️ *Proyek Menunggu File Audio (Audio Gate)*\n\n` +
        `Naskah narasi sudah tersedia (\`${wordCount} kata\`, estimasi \`${durFmt}\`). Pipeline siap melanjutkan begitu audio tersedia.\n\n` +
        `💡 *Pilihan Anda:*\n` +
        `• 🎙️ Kirim voiceover audio file (\`.mp3\`, \`.wav\`, \`.m4a\`) atau pesan suara di chat ini (maks 20MB).\n` +
        `• 💻 Sudah simpan di server? Ketik \`/audio <nama_file>\` atau tekan tombol di bawah.\n` +
        `• ⚡ Ingin suara AI otomatis? Tekan tombol *Lanjut dengan Edge TTS* di bawah:`,
        {
          inline_keyboard: [
            [
              { text: '📁 Cek Audio Server (/continue)', callback_data: `flow:check_audio:${wf.id}` },
              { text: '▶️ Lanjut dengan Edge TTS', callback_data: `flow:continue_tts:${wf.id}` }
            ],
            [
              { text: '🔄 Ganti Agent', callback_data: `flow:view:${wf.id}` },
              { text: '🛑 Batalkan Proyek', callback_data: 'flow:stop' }
            ]
          ]
        }
      );

      if (fs.existsSync(scriptPath)) {
        await sendDocument(chatId, scriptPath, `📜 script.txt (${wordCount} kata, ~${durFmt})`);
      }
      return true;
    }

    // Audio Gate is disabled -> synthesize Edge TTS
    appendLog(`[Workflow:${wf.id}] Audio Gate disabled. Synthesizing voice with Edge TTS...`);
    resumeWorkflowWithAudio(chatId, wf.id, projectDir, topic, style, format, false);
    return true;
  }

  // Checkpoint 5: Research dossier exists, but Script failed / missing (TOKEN EXHAUSTION / RATE LIMIT)
  let researchNotes = '';
  if (fs.existsSync(researchPath) && fs.statSync(researchPath).size > 100) {
    researchNotes = fs.readFileSync(researchPath, 'utf8');
    appendLog(`[Workflow:${wf.id}] Found existing research.txt (${researchNotes.split(/\s+/).length} words). Resuming directly from Stage 2 (Scriptwriting)...`);
  } else {
    // Stage 1: Domain Research
    updateWorkflow(wf.id, { status: 'research', stage: 'Domain Research', progress: 10, agent: activeAgent });
    await sendMessage(chatId, `🔍 *[1/4] Meriset Domain & Mekanisme Kausalitas (\`${activeAgent}\`)*\n` +
      `Menyusun dossier riset mendalam untuk narasi 8–12 menit...`);

    let briefing = '';
    if (fs.existsSync(briefingPath)) {
      briefing = fs.readFileSync(briefingPath, 'utf8');
    }

    researchNotes = await runResearchStage({
      topic,
      briefing,
      channelId,
      preferredAgent: activeAgent,
      projectDir
    });

    if (state.isCancelling) return false;
  }

  // Stage 2: Scriptwriting (Picks up here if token exhaustion happened)
  updateWorkflow(wf.id, { status: 'script', stage: '8-12m Scriptwriting', progress: 25, agent: activeAgent });
  await sendMessage(chatId, `✍️ *[2/4] Menyusun Naskah Narasi 8–12 Menit (\`${activeAgent}\`)*\n` +
    `Mengembangkan riset menjadi 8 bab modular (~1.300+ kata)...`);

  let briefing = '';
  if (fs.existsSync(briefingPath)) {
    briefing = fs.readFileSync(briefingPath, 'utf8');
  }

  const scriptRes = await runWritingStage({
    topic,
    briefing,
    researchNotes,
    channelId,
    preferredAgent: activeAgent,
    projectDir
  });

  const scriptText = scriptRes.scriptText;
  appendLog(`[Workflow:${wf.id}] Script ready (${scriptRes.wordCount} words, ~${scriptRes.estimatedDurationFormatted}, ${scriptRes.chapterCount} chapters)`);
  await sendMessage(chatId,
    `✅ *Naskah Narasi Selesai!*\n\n` +
    `• *Jumlah Kata*: \`${scriptRes.wordCount} kata\`\n` +
    `• *Estimasi Durasi*: \`${scriptRes.estimatedDurationFormatted}\`\n` +
    `• *Struktur*: \`${scriptRes.chapterCount} Bab Modular\`\n` +
    `• *Agent Digunakan*: \`${activeAgent}\``
  );

  if (state.isCancelling) return false;

  // Check Audio Gate
  if (settings.hitlAudio) {
    updateWorkflow(wf.id, { status: 'audio_wait', stage: 'Standby for Audio', progress: 30 });
    state.waitingForAudio = {
      workflowId: wf.id,
      projectDir,
      topic,
      style,
      format,
      scriptText
    };

    await sendMessage(chatId,
      `⏸️ *Human Stop Point: Audio Review*\n\n` +
      `Naskah telah siap. Sutradara dalam mode standby menunggu rekaman suara/voiceover Anda.\n\n` +
      `*Pilihan Tindakan:* \n` +
      `• 🎙️ Kirim file audio (\`.mp3\`, \`.wav\`, \`.m4a\`) langsung di chat ini (maks 20MB).\n` +
      `• 💻 Sudah simpan di server? Ketik \`/audio <nama_file>\` atau tekan tombol di bawah:\n` +
      `• ⚡ Ingin langsung lanjut dengan AI TTS? Tekan tombol Edge TTS di bawah:`,
      {
        inline_keyboard: [
          [
            { text: '📁 Cek Audio Server (/continue)', callback_data: `flow:check_audio:${wf.id}` },
            { text: '▶️ Lanjut dengan Edge TTS', callback_data: `flow:continue_tts:${wf.id}` }
          ],
          [
            { text: '🛑 Batalkan Proyek', callback_data: 'flow:stop' }
          ]
        ]
      }
    );

    if (fs.existsSync(scriptPath)) {
      await sendDocument(chatId, scriptPath, `📜 script.txt (${scriptRes.wordCount} kata, ~${scriptRes.estimatedDurationFormatted})`);
    }

    const chunks = chunkText(scriptText, 3000);
    for (let i = 0; i < chunks.length; i++) {
      const header = chunks.length > 1 ? ` (Bagian ${i + 1}/${chunks.length})` : '';
      await sendMessage(chatId, `📜 *Naskah Voiceover${header}*\n_(Ketuk kotak teks di bawah untuk salin di HP)_:\n\n\`\`\`text\n${chunks[i]}\n\`\`\``);
    }
    return true;
  }

  // Edge TTS fallback
  await resumeWorkflowWithAudio(chatId, wf.id, projectDir, topic, style, format, false);
  return true;
}

// --- Main Polling & Dispatch Loop ---
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    const res = await callTelegram('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 20
    });

    if (res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);

        // 1. Handle Inline Button Callback Queries
        if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
          continue;
        }

        const msg = update.message || update.channel_post;
        if (!msg) continue;

        const chatId = msg.chat.id;
        updateEnv('TELEGRAM_CHAT_ID', String(chatId));

        // 2. Handle Custom Audio Uploads (HITL Stop Point)
        if (msg.audio || msg.voice || (msg.document && msg.document.mime_type?.startsWith('audio/'))) {
          await handleAudioUpload(msg);
          continue;
        }

        // 2b. Handle Photo / Image Uploads (Style Bible Ingest)
        if (msg.photo || (msg.document && msg.document.mime_type?.startsWith('image/'))) {
          await handlePhotoUpload(msg);
          continue;
        }

        const text = (msg.text || '').trim();
        if (!text) continue;

        const user = msg.from ? `${msg.from.first_name} (@${msg.from.username || 'none'})` : 'User';

        // 3. Command Routing
        if (text === '/start' || text === '/help') {
          appendLog(`[Telegram] ${user} sent ${text}`);
          const menu = renderMainMenu(false);
          await sendMessage(chatId, `🎬 *AI-nimate Autonomous Director*\n\n` +
            `Welcome, ${msg.from?.first_name || 'Creator'}! Your Chat ID is \`${chatId}\`.\n\n` +
            `• Start a production: \`/create <topic> [--style <name>] [--format <16:9|9:16]>\`\n` +
            `• Check progress & bar: \`/progress [slug]\`\n` +
            `• Resume stalled production: \`/resume [slug]\`\n` +
            `• Switch active project: \`/active <slug>\` or \`/switch <slug>\`\n` +
            `• Stop active production: \`/stop\` or \`/cancel\`\n` +
            `• Delete a project: \`/delete <slug>\`\n` +
            `• View menu: \`/menu\`\n` +
            `• View workflows: \`/workflows\`\n` +
            `• Switch agent profile: \`/agent\` (agy/agy2/agy3)\n` +
            `• View logs: \`/logs\`\n` +
            `• Toggle audio stop point: \`/hitl\``);
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/progress' || text.startsWith('/progress ')) {
          const targetArg = text.startsWith('/progress ') ? text.slice('/progress '.length).trim() : null;
          let targetWf = null;
          if (targetArg) {
            targetWf = getWorkflow(targetArg);
          } else {
            targetWf = getActiveWorkflow() || getStalledWorkflows(1)[0] || getPastWorkflows(1)[0];
          }

          if (!targetWf) {
            await sendMessage(chatId, `ℹ️ Tidak ada proyek di ledger saat ini. Gunakan \`/create <topik>\` untuk memulai produksi baru.`);
            continue;
          }

          const bar = formatProgressBar(targetWf.progress || 0, 18);
          const projectDir = path.join(REPO_ROOT, 'projects', targetWf.project);
          const progressFilePath = path.join(projectDir, 'render_progress.json');
          let extraRenderInfo = '';

          if (fs.existsSync(progressFilePath)) {
            try {
              const rData = JSON.parse(fs.readFileSync(progressFilePath, 'utf-8'));
              if (rData && typeof rData.percent === 'number') {
                const rBar = formatProgressBar(rData.percent, 16);
                const etaFormatted = rData.etaSec > 0 ? `${Math.floor(rData.etaSec / 60)}m ${rData.etaSec % 60}s` : 'Selesai';
                extraRenderInfo = `\n\n📹 *Detail Render Frame (Chromium CDP):*\n` +
                  `• Progress Render: \`[${rBar}] ${rData.percent.toFixed(1)}%\`\n` +
                  `• Frame: \`${(rData.frame || 0).toLocaleString()} / ${(rData.total || 0).toLocaleString()}\`\n` +
                  `• Kecepatan: \`${rData.fps || 0} fps\`\n` +
                  `• Sisa Waktu (ETA): \`~${etaFormatted}\` (Berjalan: \`${Math.floor((rData.elapsedSec || 0) / 60)}m\`)`;
              }
            } catch (_) {}
          }

          await sendMessage(chatId,
            `📊 *Status Progres Proyek*\n\n` +
            `• Topik: *${targetWf.topic}*\n` +
            `• Slug: \`${targetWf.project}\`\n` +
            `• Stage: *${targetWf.stage}* (\`${targetWf.status}\`)\n` +
            `• Agent: \`${targetWf.agent || 'agy'}\`\n` +
            `• Style: \`${targetWf.style}\` | Format: \`${targetWf.format}\`\n\n` +
            `*Pipeline Progress:*\n\`[${bar}] ${targetWf.progress || 0}%\`${extraRenderInfo}`,
            {
              inline_keyboard: [
                [
                  { text: '▶️ Lanjutkan (Resume)', callback_data: `flow:resume:${targetWf.id}` },
                  { text: '📋 View Workflows', callback_data: 'menu:workflows' }
                ]
              ]
            }
          );
          continue;
        }

        if (text === '/resume' || text.startsWith('/resume ')) {
          const targetArg = text.startsWith('/resume ') ? text.slice('/resume '.length).trim() : null;
          let targetWf = null;

          if (targetArg) {
            targetWf = getWorkflow(targetArg);
            if (!targetWf) {
              await sendMessage(chatId, `❌ Proyek dengan ID atau slug \`${targetArg}\` tidak ditemukan.`);
              continue;
            }
          } else {
            const waitAudio = getStandbyAudioWorkflow();
            if (waitAudio) {
              targetWf = getWorkflow(waitAudio.workflowId);
            }
            if (!targetWf) {
              const stalledList = getStalledWorkflows(1);
              if (stalledList.length > 0) {
                targetWf = stalledList[0];
              } else {
                targetWf = getActiveWorkflow();
              }
            }
            if (!targetWf) {
              const pastList = getPastWorkflows(1);
              if (pastList.length > 0) {
                targetWf = pastList[0];
              }
            }
          }

          if (!targetWf) {
            await sendMessage(chatId, `ℹ️ Tidak ada proyek aktif atau tertunda (stalled) untuk dilanjutkan. Gunakan \`/create <topik>\` untuk membuat proyek baru.`);
            continue;
          }

          appendLog(`[Telegram] ${user} invoked /resume for ${targetWf.id} (${targetWf.project})`);
          await resumeWorkflowPipeline(chatId, targetWf.id);
          continue;
        }

        if (text.startsWith('/active ') || text.startsWith('/switch ')) {
          const idOrSlug = text.replace(/^\/(active|switch)\s+/, '').trim();
          const activated = setActiveWorkflow(idOrSlug);
          if (!activated) {
            await sendMessage(chatId, `❌ Proyek \`${idOrSlug}\` tidak ditemukan di ledger.`);
            continue;
          }
          state.activeJob = activated;
          appendLog(`[Telegram] ${user} set active workflow to ${activated.project}`);
          await sendMessage(chatId,
            `✅ *Proyek Aktif Berhasil Diubah!*\n\n` +
            `• Topik: *${activated.topic}*\n` +
            `• Slug: \`${activated.project}\`\n` +
            `• Status: \`${activated.status}\` | Stage: \`${activated.stage}\`\n` +
            `• Agent: \`${activated.agent || 'agy'}\`\n\n` +
            `Ketik \`/resume\` untuk melanjutkan proses dari checkpoint terakhir:`,
            {
              inline_keyboard: [
                [
                  { text: '▶️ Resume Proyek Ini', callback_data: `flow:resume:${activated.id}` },
                  { text: '📋 View Workflows', callback_data: 'menu:workflows' }
                ]
              ]
            }
          );
          continue;
        }

        if (text === '/stalled') {
          appendLog(`[Telegram] ${user} queried /stalled workflows`);
          const stalled = getStalledWorkflows(5);
          if (stalled.length === 0) {
            await sendMessage(chatId, `✅ *Tidak ada proyek yang tertunda (stalled)*. Semua proyek berjalan lancar atau sudah selesai.`);
          } else {
            let stalledText = `⏸️ *Proyek Tertunda / Butuh Perhatian (${stalled.length}):*\n\n`;
            const buttons = [];
            stalled.forEach((w, i) => {
              stalledText += `${i + 1}. *${w.topic}*\n   └ Status: \`${w.status}\` | Stage: \`${w.stage}\` | ID: \`${w.id}\`\n`;
              buttons.push([
                { text: `▶️ Resume: ${(w.project || w.topic).slice(0, 16)}`, callback_data: `flow:resume:${w.id}` },
                { text: `📁 View`, callback_data: `flow:view:${w.id}` }
              ]);
            });
            buttons.push([{ text: '🔙 Workflows Menu', callback_data: 'menu:workflows' }]);
            await sendMessage(chatId, stalledText, { inline_keyboard: buttons });
          }
          continue;
        }

        if (text === '/agent' || text === '/agents') {
          appendLog(`[Telegram] ${user} opened /agent profile switcher`);
          const menu = renderAgentsMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/menu') {
          appendLog(`[Telegram] ${user} opened /menu`);
          const menu = renderMainMenu(false);
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/workflows') {
          appendLog(`[Telegram] ${user} opened /workflows`);
          const menu = renderWorkflowsMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/stop' || text === '/cancel') {
          appendLog(`[Telegram] ${user} invoked ${text}`);
          const stopped = await stopActiveWorkflow();
          if (stopped) {
            await sendMessage(chatId, `🛑 *Workflow Stopped*\n\nThe active production for *${stopped.topic || stopped.id}* has been halted and cancelled.`);
          } else {
            await sendMessage(chatId, `ℹ️ No active workflow is currently running.`);
          }
          continue;
        }

        if (text === '/delete' || text.startsWith('/delete ')) {
          const target = text.replace(/^\/delete\s*/, '').trim();
          if (!target) {
            appendLog(`[Telegram] ${user} opened delete menu via /delete`);
            const menu = renderDeleteProjectsMenu();
            await sendMessage(chatId, menu.text, menu.reply_markup);
          } else {
            appendLog(`[Telegram] ${user} requested deletion of "${target}"`);
            const menu = renderConfirmDeleteMenu(target);
            await sendMessage(chatId, menu.text, menu.reply_markup);
          }
          continue;
        }

        if (text === '/styles') {
          appendLog(`[Telegram] ${user} opened /styles`);
          const menu = renderStylesMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/audio' || text.startsWith('/audio ')) {
          const waitAudio = getStandbyAudioWorkflow();
          const targetAudioFile = text.startsWith('/audio ') ? text.slice('/audio '.length).trim() : null;

          if (waitAudio) {
            const { workflowId, projectDir, topic, style, format } = waitAudio;
            await linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, targetAudioFile);
            continue;
          }

          if (targetAudioFile) {
            await sendMessage(chatId, `ℹ️ Tidak ada workflow yang sedang menunggu audio. Gunakan \`/create <topic>\` terlebih dahulu.`);
            continue;
          }

          appendLog(`[Telegram] ${user} opened /audio menu`);
          const menu = renderAudioMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/hitl') {
          const settings = loadSettings();
          settings.hitlAudio = !settings.hitlAudio;
          settings.audioMode = settings.hitlAudio ? 'audio_gate' : 'edge_tts';
          saveSettings(settings);
          appendLog(`[Telegram] ${user} toggled HITL Audio Gate: ${settings.hitlAudio}`);
          await sendMessage(chatId, `⏸️ *Human Audio Gate*: ${settings.hitlAudio ? '🟢 ENABLED (will pause for custom voiceover)' : '⚪ DISABLED (automatic Edge TTS)'}`);
          continue;
        }

        if (text === '/logs' || text.startsWith('/logs ') || text === '/output' || text.startsWith('/output ')) {
          appendLog(`[Telegram] ${user} inspected logs`);
          const menu = renderLogsView();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text.startsWith('/setprompt ')) {
          const parts = text.slice('/setprompt '.length).trim().split(/\s+/);
          const agentId = parts[0];
          const newPrompt = parts.slice(1).join(' ').trim();
          if (!agentId || !newPrompt) {
            await sendMessage(chatId, `❌ Usage: \`/setprompt <orchestrator|writer|director|researcher|asset_hub> <prompt text>\``);
          } else {
            updateAgentPrompt(agentId, newPrompt);
            appendLog(`[Telegram] Updated prompt for agent "${agentId}"`);
            await sendMessage(chatId, `✅ Prompt for *${agentId}* updated successfully!`);
          }
          continue;
        }

        // Intercept direct audio download URL when waiting for audio
        const waitAudioUrl = getStandbyAudioWorkflow();
        if (waitAudioUrl && (text.startsWith('http://') || text.startsWith('https://'))) {
          const { workflowId, projectDir, topic, style, format } = waitAudioUrl;
          const destAudioPath = path.join(projectDir, 'voiceover.mp3');
          appendLog(`[Workflow:${workflowId}] Downloading custom audio from external URL: ${text}`);
          await sendMessage(chatId, `📥 Mengunduh file audio dari link eksternal...`);
          try {
            execSync(`curl -sL "${text}" -o "${destAudioPath}"`, { timeout: 120000 });
            if (fs.existsSync(destAudioPath) && fs.statSync(destAudioPath).size > 1024) {
              state.waitingForAudio = null;
              appendLog(`[Workflow:${workflowId}] Custom audio saved from URL: ${destAudioPath}`);
              await sendMessage(chatId, `✅ Custom voiceover berhasil diunduh dari link! Melanjutkan koreografi & render...`);
              resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, true);
              continue;
            } else {
              throw new Error('File hasil download kosong atau tidak valid.');
            }
          } catch (err) {
            appendLog(`[Workflow:${workflowId}] URL download error: ${err.message}`);
            await sendMessage(chatId, `❌ Gagal mengunduh audio dari link: ${err.message}`);
            continue;
          }
        }

        if (text === '/continue' || text.startsWith('/continue ')) {
          const waitAudio = getStandbyAudioWorkflow();
          if (waitAudio) {
            const { workflowId, projectDir, topic, style, format } = waitAudio;
            const targetAudioFile = text.startsWith('/continue ') ? text.slice('/continue '.length).trim() : null;
            if (targetAudioFile) {
              await linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, targetAudioFile);
            } else {
              const linked = await linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, null);
              if (!linked) {
                state.waitingForAudio = null;
                await sendMessage(chatId, `▶️ Resuming workflow with Edge TTS...`);
                resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, false);
              }
            }
          } else {
            await sendMessage(chatId, `ℹ️ No workflow is currently waiting for audio.`);
          }
          continue;
        }

        // Intercept standalone audio filename or path if waiting for audio
        const waitAudioPlain = getStandbyAudioWorkflow();
        if (waitAudioPlain && (
          /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(text.trim()) ||
          (text.trim().startsWith('/') && text.includes('.'))
        )) {
          const { workflowId, projectDir, topic, style, format } = waitAudioPlain;
          await linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, text.trim());
          continue;
        }

        if (text === '/channels') {
          appendLog(`[Telegram] ${user} opened /channels`);
          const menu = renderChannelsMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text.startsWith('/channel ')) {
          const chId = text.replace(/^\/channel\s+/, '').trim();
          appendLog(`[Telegram] ${user} inspected channel "${chId}"`);
          const menu = renderChannelDetail(chId);
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/new' || text === '/start_project') {
          appendLog(`[Telegram] ${user} opened /new`);
          const menu = renderNewProjectMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text === '/agent' || text === '/agents') {
          appendLog(`[Telegram] ${user} opened /agents menu`);
          const menu = renderAgentsMenu();
          await sendMessage(chatId, menu.text, menu.reply_markup);
          continue;
        }

        if (text.startsWith('/transfer ') || text.startsWith('/move ')) {
          const targetAgent = text.replace(/^(\/transfer|\/move)\s+/, '').trim().toLowerCase();
          const active = getActiveWorkflow() || (state.activeJob ? state.activeJob : null);
          try {
            if (!active) {
              transferWorkflow('global', targetAgent);
              appendLog(`[Telegram] Default agent profile set to: ${targetAgent}`);
              await sendMessage(chatId, `🤖 *Agent Profile Switched*\nDefault Antigravity CLI profile is now: \`${targetAgent}\` (\`/home/agent/.local/bin/${targetAgent}\`).`);
            } else {
              transferWorkflow(active.id, targetAgent);
              if (state.activeJob) state.activeJob.agent = targetAgent;
              if (state.waitingForAudio) state.waitingForAudio.agent = targetAgent;
              appendLog(`[Telegram] Active workflow ${active.id} transferred to ${targetAgent} by ${user}`);
              await sendMessage(chatId, `🔄 *Workflow Transferred!*\n\n` +
                `• *Project*: \`${active.project}\`\n` +
                `• *New Agent*: \`${targetAgent}\` (\`/home/agent/.local/bin/${targetAgent}\`)\n` +
                `• *Workflow ID*: \`${active.id}\`\n\n` +
                `All subsequent sub-agent tasks will run under \`${targetAgent}\`.`);
            }
          } catch (err) {
            await sendMessage(chatId, `❌ Transfer error: ${err.message}. Choose: \`agy\`, \`agy2\`, or \`agy3\`.`);
          }
          continue;
        }

        // Intercept topic when creation wizard is active on this chat
        if (state.creationWizard?.[chatId]?.step === 'topic' && !text.startsWith('/')) {
          const wizard = state.creationWizard[chatId];
          delete state.creationWizard[chatId];
          const ch = getChannel(wizard.channelId);
          const customKey = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
          markIdeaUsed(wizard.channelId, customKey);
          appendLog(`[Telegram] User provided custom briefing for ${wizard.channelId}: "${text.slice(0, 80)}"`);
          await sendMessage(chatId, `🚀 *Topic Briefing Received for ${ch?.name || wizard.channelId}*\nLaunching autonomous production pipeline...`);
          await startVideoWorkflow(chatId, text, { channel: wizard.channelId, ideaKey: customKey });
          continue;
        }

        // Intercept topic name when user tapped [ ✍️ Enter Custom Topic Name ]
        if (state.awaitingTopicChatId === chatId && !text.startsWith('/')) {
          state.awaitingTopicChatId = null;
          appendLog(`[Telegram] User provided custom topic from prompt: "${text}"`);
          await sendMessage(chatId, `🚀 *Custom Topic Received*\nLaunching autonomous production for: *${text}*...`);
          await startVideoWorkflow(chatId, text);
          continue;
        }

        // Strict: Workflow ONLY starts from command
        if (text.startsWith('/create ') || text.startsWith('/run ')) {
          const topic = text.replace(/^(\/create|\/run)\s+/, '').trim();
          await startVideoWorkflow(chatId, topic);
          continue;
        }

        // Non-command text: gentle guidance
        if (!text.startsWith('/')) {
          await sendMessage(chatId, `💡 *Command Required*\nTo start a production, send: \`/create ${text}\` or open \`/menu\`.`);
        }
      }
    }
  } catch (err) {
    appendLog(`[Telegram] Polling error: ${err.message}`);
  }

  setTimeout(pollUpdates, 800);
}

// --- Callback Query (Button Press) Handler ---
async function handleCallbackQuery(cq) {
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const data = cq.data || '';

  appendLog(`[Telegram] Callback Query: "${data}" from ${cq.from?.first_name}`);
  await answerCallbackQuery(cq.id);

  if (data === 'menu:main') {
    const menu = renderMainMenu(false);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:collapse') {
    const menu = renderMainMenu(true);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:expand') {
    const menu = renderMainMenu(false);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:workflows') {
    const menu = renderWorkflowsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:channels') {
    const menu = renderChannelsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:agents') {
    const menu = renderAgentsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('agent:set:')) {
    const agent = data.replace('agent:set:', '').trim();
    const settings = loadSettings();
    settings.activeAgent = agent;
    saveSettings(settings);
    const agyBinPath = `/home/agent/.local/bin/${agent}`;
    process.env.AGY_BIN = agyBinPath;
    process.env.ACTIVE_AGENT = agent;
    updateEnv('AGY_BIN', agyBinPath);
    updateEnv('ACTIVE_AGENT', agent);

    // Automatically transfer active/waiting workflow to the newly selected agent
    const active = getActiveWorkflow() || (state.activeJob ? state.activeJob : null);
    if (active) {
      try {
        transferWorkflow(active.id, agent);
        if (state.activeJob) state.activeJob.agent = agent;
        if (state.waitingForAudio) state.waitingForAudio.agent = agent;
        appendLog(`[Telegram] Active workflow ${active.id} automatically moved to ${agent}`);
      } catch (_) {}
    }

    appendLog(`[Telegram] Active Antigravity agent set to: ${agent} (${agyBinPath})`);
    await answerCallbackQuery(cq.id, `Agent profile switched to: ${agent}`);
    const menu = renderAgentsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:transfer_agent:')) {
    const parts = data.replace('flow:transfer_agent:', '').split(':');
    const wfId = parts[0];
    const targetAgent = parts[1];
    try {
      transferWorkflow(wfId, targetAgent);
      if (state.activeJob && (state.activeJob.id === wfId || state.activeJob.project === wfId)) {
        state.activeJob.agent = targetAgent;
      }
      if (state.waitingForAudio && state.waitingForAudio.workflowId === wfId) {
        state.waitingForAudio.agent = targetAgent;
      }
      await answerCallbackQuery(cq.id, `Transferred to ${targetAgent}!`);
      appendLog(`[Telegram] Workflow ${wfId} transferred to ${targetAgent}`);
    } catch (err) {
      await answerCallbackQuery(cq.id, `Transfer failed: ${err.message}`);
    }
    const menu = renderWorkflowsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('channel:view:')) {
    const chId = data.replace('channel:view:', '');
    const menu = renderChannelDetail(chId);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'flow:new_project') {
    const menu = renderNewProjectMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:wizard_channel:')) {
    const chId = data.replace('flow:wizard_channel:', '').trim();
    if (!state.creationWizard) state.creationWizard = {};
    state.creationWizard[chatId] = { channelId: chId, step: 'topic' };
    const menu = renderTopicSelectionMenu(chId, 0);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:wizard_refresh:')) {
    const parts = data.replace('flow:wizard_refresh:', '').split(':');
    const chId = parts[0];
    const offset = parseInt(parts[1], 10) || 0;
    await answerCallbackQuery(cq.id, '🔄 4 Ide baru berhasil dimuat!');
    const menu = renderTopicSelectionMenu(chId, offset);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:wizard_custom:')) {
    const chId = data.replace('flow:wizard_custom:', '').trim();
    if (!state.creationWizard) state.creationWizard = {};
    state.creationWizard[chatId] = { channelId: chId, step: 'topic' };
    const ch = getChannel(chId);
    return editMessage(chatId, messageId,
      `✍️ *Enter Topic or Detailed Briefing for ${ch?.name || chId}*\n\n` +
      `Please type and send your desired video topic now in this chat.\n\n` +
      `💡 *Any Amount of Detail:* You can write a single sentence, or paste an entire research outline, news excerpt, or forensic thesis.\n\n` +
      `The bot will immediately initialize the production pipeline upon receiving your text message.`,
      { inline_keyboard: [[{ text: '🔙 Back to Topic Suggestions', callback_data: `flow:wizard_channel:${chId}` }]] }
    );
  }

  if (data.startsWith('flow:wizard_topic:')) {
    const parts = data.replace('flow:wizard_topic:', '').split(':');
    const chId = parts[0];
    const topicKey = parts[1];
    const ch = getChannel(chId);

    const unusedIdeas = getUnusedChannelIdeas(chId, 30);
    let suggestion = unusedIdeas.find(s => s.key === topicKey);
    if (!suggestion && ch?.suggestions) {
      suggestion = ch.suggestions.find(s => s.key === topicKey);
    }
    if (!suggestion && CHANNEL_IDEA_POOLS[chId]) {
      suggestion = CHANNEL_IDEA_POOLS[chId].find(s => s.key === topicKey);
    }

    const title = suggestion?.title || topicKey;
    const briefing = suggestion?.researchContext || suggestion?.detail || '';

    // Mark idea as used so it is removed from future menus
    markIdeaUsed(chId, topicKey);

    if (state.creationWizard) delete state.creationWizard[chatId];

    await answerCallbackQuery(cq.id, `Launching ${title}...`);
    await editMessage(chatId, messageId, `🚀 *Launching Production for ${ch?.name || chId}*\nTopic: *${title}*\n\nInitializing sub-agents...`, {
      inline_keyboard: [[{ text: '📋 View Workflows', callback_data: 'menu:workflows' }]]
    });
    return startVideoWorkflow(chatId, title, { channel: chId, briefing, ideaKey: topicKey });
  }

  if (data === 'flow:ask_custom_topic') {
    state.awaitingTopicChatId = chatId;
    return editMessage(chatId, messageId,
      `✍️ *Enter Custom Topic*\n\nPlease type and send your desired video topic now (e.g. \`Krisis Properti & Suku Bunga --style financial-explainer\`).\n\nThe bot will immediately launch the full production pipeline upon receiving your text message.`,
      { inline_keyboard: [[{ text: '🔙 Back to New Project', callback_data: 'flow:new_project' }]] }
    );
  }

  if (data.startsWith('flow:quick_create:')) {
    const parts = data.replace('flow:quick_create:', '').split(':');
    const key = parts[0];
    const style = parts[1] || 'investigative-documentary';
    const format = parts[2] || '16:9';

    const presetNames = {
      'kausal-skandal': 'Investigasi Monopoli & Aliran Dana Gelap Hindia Belanda',
      'rokok-ilegal': 'Investigasi Rokok Ilegal & Dampak Pajak Cukai',
      'rights-issue': 'Strategi Rights Issue & Bahaya Dilusi Saham Ritel',
      'ai-crash': 'Arsitektur Kecerdasan Buatan & Resiko Market Crash',
      'kopi-fomo': 'Fenomena Kopi 80 Ribu & Perangkap FOMO Finansial'
    };

    const topicTitle = presetNames[key] || key;
    await answerCallbackQuery(cq.id, `Launching ${topicTitle}...`);
    await editMessage(chatId, messageId, `🚀 *Launching Project: ${topicTitle}*\nStyle: \`${style}\` | Format: \`${format}\`\n\nStarting sub-agent pipeline...`, {
      inline_keyboard: [[{ text: '📋 View Workflows', callback_data: 'menu:workflows' }]]
    });
    return startVideoWorkflow(chatId, `${topicTitle} --style ${style} --format ${format}`);
  }

  if (data === 'menu:delete_projects') {
    const menu = renderDeleteProjectsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'flow:stop') {
    const stopped = await stopActiveWorkflow();
    if (stopped) {
      await answerCallbackQuery(cq.id, 'Workflow stopped.');
      const menu = renderWorkflowsMenu();
      return editMessage(chatId, messageId, `🛑 *Workflow Cancelled*\nProduction for *${stopped.topic || stopped.id}* was stopped.\n\n` + menu.text, menu.reply_markup);
    } else {
      await answerCallbackQuery(cq.id, 'No active workflow.');
      const menu = renderWorkflowsMenu();
      return editMessage(chatId, messageId, menu.text, menu.reply_markup);
    }
  }

  if (data.startsWith('flow:ask_delete:')) {
    const idOrSlug = data.replace('flow:ask_delete:', '');
    const menu = renderConfirmDeleteMenu(idOrSlug);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:do_delete:')) {
    const idOrSlug = data.replace('flow:do_delete:', '');
    const res = await deleteProject(idOrSlug);
    await answerCallbackQuery(cq.id, `Project ${res.slug} deleted.`);
    const menu = renderWorkflowsMenu();
    return editMessage(chatId, messageId, `🗑️ *Project Deleted*\n\`${res.slug}\` and associated files have been permanently deleted.\n\n` + menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:resume:')) {
    const wfId = data.replace('flow:resume:', '');
    await answerCallbackQuery(cq.id, 'Melanjutkan proyek...');
    await editMessage(chatId, messageId, `⏳ *Melanjutkan Proyek...*\nMemeriksa milestone dan memulai ulang sub-agent...`);
    return resumeWorkflowPipeline(chatId, wfId);
  }

  if (data.startsWith('flow:set_active:')) {
    const wfId = data.replace('flow:set_active:', '');
    const activated = setActiveWorkflow(wfId);
    if (activated) {
      state.activeJob = activated;
      await answerCallbackQuery(cq.id, `Proyek aktif: ${activated.project}`);
      await sendMessage(chatId,
        `✅ *Proyek Aktif Berhasil Diubah!*\n\n` +
        `• Topik: *${activated.topic}*\n` +
        `• Slug: \`${activated.project}\`\n` +
        `• Status: \`${activated.status}\` | Stage: \`${activated.stage}\`\n` +
        `• Agent: \`${activated.agent || 'agy'}\`\n\n` +
        `Ketik \`/resume\` untuk melanjutkan, atau gunakan kontrol di bawah:`,
        {
          inline_keyboard: [
            [
              { text: '▶️ Resume Proyek Ini', callback_data: `flow:resume:${activated.id}` },
              { text: '📋 View Workflows', callback_data: 'menu:workflows' }
            ]
          ]
        }
      );
    } else {
      await answerCallbackQuery(cq.id, 'Proyek tidak ditemukan.');
    }
    const menu = renderWorkflowsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:view:')) {
    const wfId = data.replace('flow:view:', '');
    const wf = getWorkflow(wfId);
    if (!wf) {
      return editMessage(chatId, messageId, `❌ Workflow \`${wfId}\` not found.`, { inline_keyboard: [[{ text: '🔙 Back to Workflows', callback_data: 'menu:workflows' }]] });
    }
    const bar = formatProgressBar(wf.progress || 0, 16);
    const text = `📋 *Workflow Details: ${wf.topic}*\n\n` +
      `• ID: \`${wf.id}\`\n` +
      `• Project Slug: \`${wf.project}\`\n` +
      `• Style: \`${wf.style}\`\n` +
      `• Format: \`${wf.format}\`\n` +
      `• Agent: \`${wf.agent || 'agy'}\`\n` +
      `• Stage: *${wf.stage}*\n` +
      `• Status: *${wf.status}*\n` +
      `• Progress: \`[${bar}] ${wf.progress || 0}%\`\n` +
      `• Started: \`${wf.startedAt || 'N/A'}\`\n` +
      `• Completed: \`${wf.completedAt || 'In Progress'}\`\n` +
      (wf.videoPath ? `• Video: \`${wf.videoPath}\`\n` : '') +
      (wf.error ? `• Error: \`${wf.error}\`\n` : '');

    const buttons = [];
    const isRunning = ['queued', 'script', 'audio_wait', 'choreography', 'rendering'].includes(wf.status);

    // Row 1: Resume & Set Active controls
    buttons.push([
      { text: '▶️ Lanjutkan (Resume)', callback_data: `flow:resume:${wf.id}` },
      { text: '🔄 Jadikan Proyek Aktif', callback_data: `flow:set_active:${wf.id}` }
    ]);

    // Row 2: Agent switching controls (agy, agy2, agy3)
    const curAgent = wf.agent || 'agy';
    const otherAgents = ['agy', 'agy2', 'agy3'].filter(a => a !== curAgent);
    buttons.push(otherAgents.map(ag => ({
      text: `🤖 Ganti ke ${ag}`,
      callback_data: `flow:transfer_agent:${wf.id}:${ag}`
    })));

    // Row 3: Audio Gate quick checks if stalled or waiting
    if (wf.status === 'audio_wait' || !wf.videoPath) {
      buttons.push([
        { text: '📁 Cek Audio Server (/continue)', callback_data: `flow:check_audio:${wf.id}` },
        { text: '▶️ Lanjut Edge TTS', callback_data: `flow:continue_tts:${wf.id}` }
      ]);
    }

    if (isRunning) {
      buttons.push([{ text: '🛑 Stop Active Workflow', callback_data: 'flow:stop' }]);
    }
    if (wf.videoPath && fs.existsSync(wf.videoPath)) {
      buttons.push([{ text: '🎬 Re-send Latest Video', callback_data: `flow:resend:${wf.id}` }]);
    }
    buttons.push([
      { text: '🗑️ Delete Project', callback_data: `flow:ask_delete:${wf.id}` },
      { text: '🔙 Back to Workflows', callback_data: 'menu:workflows' }
    ]);
    return editMessage(chatId, messageId, text, { inline_keyboard: buttons });
  }

  if (data === 'menu:audio') {
    const menu = renderAudioMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('audio:set_mode:')) {
    const newMode = data.replace('audio:set_mode:', '');
    const settings = loadSettings();
    settings.audioMode = newMode;
    settings.hitlAudio = (newMode === 'audio_gate');
    saveSettings(settings);
    await answerCallbackQuery(cq.id, `Audio Mode set to: ${newMode}`);
    const menu = renderAudioMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'audio:menu_edge_voices') {
    const menu = renderEdgeVoiceMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('audio:set_edge:')) {
    const voice = data.replace('audio:set_edge:', '');
    const settings = loadSettings();
    settings.edgeTtsVoice = voice;
    saveSettings(settings);
    await answerCallbackQuery(cq.id, `Edge voice set to: ${voice}`);
    const menu = renderEdgeVoiceMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'audio:menu_custom_api') {
    const menu = renderCustomApiMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('audio:set_api:')) {
    const provider = data.replace('audio:set_api:', '');
    const settings = loadSettings();
    settings.customApiProvider = provider;
    saveSettings(settings);
    await answerCallbackQuery(cq.id, `API Provider set to: ${provider}`);
    const menu = renderCustomApiMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'hitl:toggle_audio') {
    const settings = loadSettings();
    settings.hitlAudio = !settings.hitlAudio;
    settings.audioMode = settings.hitlAudio ? 'audio_gate' : 'edge_tts';
    saveSettings(settings);
    const menu = renderMainMenu(false);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:styles') {
    const menu = renderStylesMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('style:view:')) {
    const styleId = data.replace('style:view:', '');
    const menu = renderStyleDetailMenu(styleId);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('style:sub:')) {
    const parts = data.replace('style:sub:', '').split(':');
    const styleId = parts[0];
    const subKey = parts[1];
    const menu = renderStyleSubDetail(styleId, subKey);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:prompts') {
    const menu = renderPromptsMenu();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('prompt:view:')) {
    const agentId = data.replace('prompt:view:', '');
    const menu = renderPromptDetail(agentId);
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data === 'menu:logs') {
    const menu = renderLogsView();
    return editMessage(chatId, messageId, menu.text, menu.reply_markup);
  }

  if (data.startsWith('flow:continue_tts:')) {
    const waitAudio = getStandbyAudioWorkflow();
    if (waitAudio) {
      const { workflowId, projectDir, topic, style, format } = waitAudio;
      state.waitingForAudio = null;
      await sendMessage(chatId, `▶️ Resuming workflow with Edge TTS...`);
      resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, false);
    } else {
      await sendMessage(chatId, `ℹ️ This audio standby prompt has already been completed.`);
    }
    return;
  }

  if (data.startsWith('flow:check_audio:')) {
    const waitAudio = getStandbyAudioWorkflow();
    if (waitAudio) {
      const { workflowId, projectDir, topic, style, format } = waitAudio;
      await linkAndResumeCustomAudio(chatId, workflowId, projectDir, topic, style, format, null);
    } else {
      await sendMessage(chatId, `ℹ️ This audio standby prompt has already been completed.`);
    }
    return;
  }

  if (data.startsWith('flow:resend:')) {
    const wfId = data.replace('flow:resend:', '');
    const wf = getWorkflow(wfId);
    if (wf) {
      const projectDir = path.join(REPO_ROOT, 'projects', wf.project);
      await deliverWorkflowVideo(chatId, wf, projectDir, wf.topic || wf.project, wf.style || 'kausalmedia');
    } else {
      await sendMessage(chatId, `❌ Proyek dengan ID \`${wfId}\` tidak ditemukan.`);
    }
    return;
  }
}

// --- Photo / Reference Image Ingest (Style Bible) ---
async function handlePhotoUpload(msg) {
  const chatId = msg.chat.id;
  const user = msg.from ? `${msg.from.first_name} (@${msg.from.username || 'none'})` : 'User';

  let fileId = null;
  let fileSize = 0;
  let fileName = '';

  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const best = msg.photo[msg.photo.length - 1];
    fileId = best.file_id;
    fileSize = best.file_size || 0;
    fileName = `ref_${Date.now()}_${best.file_unique_id || 'photo'}.jpg`;
  } else if (msg.document && msg.document.mime_type?.startsWith('image/')) {
    fileId = msg.document.file_id;
    fileSize = msg.document.file_size || 0;
    const ext = path.extname(msg.document.file_name || '.jpg') || '.jpg';
    fileName = `ref_${Date.now()}_${msg.document.file_unique_id || 'doc'}${ext}`;
  }

  if (!fileId) {
    await sendMessage(chatId, `⚠️ Could not extract image details.`);
    return;
  }

  const styleBibleDir = path.resolve(__dirname, '..', 'assets', 'style-bible');
  if (!fs.existsSync(styleBibleDir)) {
    fs.mkdirSync(styleBibleDir, { recursive: true });
  }

  const destPath = path.join(styleBibleDir, fileName);
  appendLog(`[Telegram] Ingesting style reference image from ${user} (${fileName}, ${(fileSize / 1024).toFixed(1)} KB)...`);
  await sendMessage(chatId, `📥 *Receiving reference image...*`);

  try {
    await downloadTelegramFile(fileId, destPath);

    // Save metadata
    const metaPath = path.join(styleBibleDir, `${path.parse(fileName).name}.json`);
    const metadata = {
      file: fileName,
      caption: msg.caption || '',
      sender: user,
      receivedAt: new Date().toISOString(),
      sizeBytes: fileSize
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    appendLog(`[Telegram] Successfully saved style reference to ${destPath}`);
    await sendMessage(chatId,
      `🎨 *Style Bible Reference Saved!*\n\n` +
      `📁 File: \`assets/style-bible/${fileName}\`\n` +
      `📝 Caption: ${msg.caption ? `_${msg.caption}_` : '_(none)_'}\n` +
      `⚖️ Size: ${(fileSize / 1024).toFixed(1)} KB\n\n` +
      `This visual reference is now registered in the Style Bible to guide Nano Banana comic art generation.`
    );
  } catch (err) {
    appendLog(`[Telegram] Failed to download reference image: ${err.message}`);
    await sendMessage(chatId, `❌ Failed to download reference image: ${err.message}`);
  }
}

// --- Audio Upload Receiver (HITL Voiceover) ---
async function handleAudioUpload(msg) {
  const chatId = msg.chat.id;

  const waitAudio = getStandbyAudioWorkflow();
  if (!waitAudio) {
    await sendMessage(chatId, `ℹ️ Received audio file, but no workflow is currently on standby for voiceover. Use \`/create <topic>\` with Audio Gate enabled to use custom audio.`);
    return;
  }

  const { workflowId, projectDir, topic, style, format } = waitAudio;
  const fileItem = msg.audio || msg.voice || msg.document;
  const fileId = fileItem.file_id;
  const fileSize = fileItem.file_size || 0;
  const fileName = fileItem.file_name || 'voiceover';
  const destAudioPath = path.join(projectDir, 'voiceover.mp3');

  // Telegram Bot API enforces a hard 20MB limit on getFile
  const MAX_TELEGRAM_BOT_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
  if (fileSize > MAX_TELEGRAM_BOT_FILE_SIZE) {
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
    appendLog(`[Workflow:${workflowId}] Audio file too large for Telegram getFile: ${sizeMb} MB (limit: 20 MB)`);
    await sendMessage(chatId, `⚠️ *File Audio Terlalu Besar (${sizeMb} MB)*\n\n` +
      `Telegram Bot API membatasi unduhan file bot maksimal *20 MB*. File Anda (\`${fileName}\`) berukuran ${sizeMb} MB.\n\n` +
      `💡 *3 Pilihan Solusi Mudah:*\n` +
      `1. *Kirim sebagai MP3 / M4A*: Untuk durasi ~10 menit, format MP3 (128–192 kbps) atau M4A/AAC hanya berukuran *~9–14 MB* (jauh di bawah batas 20MB Telegram).\n` +
      `2. *Simpan Langsung ke Server*: Letakkan file audio di:\n` +
      `   \`projects/${path.basename(projectDir)}/<nama_file>\`\n` +
      `   lalu kirim: \`/audio <nama_file>\` (contoh: \`/audio ${fileName}\`) atau \`/continue <nama_file>\`.\n` +
      `3. *Kirim Link Download (URL)*: Tempelkan direct download link (HTTP/HTTPS) file audio Anda di chat ini.\n\n` +
      `_Status proyek tetap STANDBY menunggu file audio Anda._`,
      {
        inline_keyboard: [
          [
            { text: '📁 Check Server Audio (/continue)', callback_data: `flow:check_audio:${workflowId}` },
            { text: '▶️ Lanjut dengan Edge TTS', callback_data: `flow:continue_tts:${workflowId}` }
          ],
          [
            { text: '🛑 Batalkan Proyek', callback_data: 'flow:stop' }
          ]
        ]
      }
    );
    return;
  }

  appendLog(`[Workflow:${workflowId}] Downloading custom voiceover from Telegram (${fileId}, ${(fileSize / (1024*1024)).toFixed(2)} MB)...`);
  await sendMessage(chatId, `📥 Downloading custom voiceover audio file...`);

  try {
    const fileExt = path.extname(fileName || '').toLowerCase();
    const isOtherFormat = fileExt && fileExt !== '.mp3';
    const tempDownloadTarget = isOtherFormat ? path.join(projectDir, `raw_upload${fileExt}`) : destAudioPath;

    await downloadTelegramFile(fileId, tempDownloadTarget);

    if (isOtherFormat) {
      appendLog(`[Workflow:${workflowId}] Converting uploaded ${fileExt} to voiceover.mp3...`);
      execSync(`ffmpeg -y -i "${tempDownloadTarget}" -c:a libmp3lame -q:a 2 "${destAudioPath}"`, { stdio: 'pipe' });
    }

    const altAudio = path.join(projectDir, 'audio.mp3');
    if (path.resolve(destAudioPath) !== path.resolve(altAudio)) {
      try { fs.copyFileSync(destAudioPath, altAudio); } catch (_) {}
    }

    state.waitingForAudio = null;
    appendLog(`[Workflow:${workflowId}] Custom audio saved: ${destAudioPath}`);
    await sendMessage(chatId, `✅ Custom voiceover saved! Resuming choreography & rendering...`);
    resumeWorkflowWithAudio(chatId, workflowId, projectDir, topic, style, format, true);
  } catch (err) {
    appendLog(`[Workflow:${workflowId}] Failed to download audio: ${err.message}`);
    // DO NOT resume with default TTS automatically! Keep state.waitingForAudio active so user can re-send!
    await sendMessage(chatId, `⚠️ *Gagal Mengunduh Audio*: ${err.message}\n\n` +
      `File audio tidak dapat diunduh (kemungkinan melebihi batas 20MB atau koneksi terputus).\n\n` +
      `💡 *Solusi:*\n` +
      `1. Kirim file audio dalam format *.mp3* (128–192 kbps) atau *.m4a*.\n` +
      `2. Kirim link download langsung (HTTP/HTTPS).\n` +
      `3. Atau upload manual ke server dan ketik: \`/audio <nama_file>\` (contoh: \`/audio voice.wav\`).`,
      {
        inline_keyboard: [
          [
            { text: '📁 Check Server Audio (/continue)', callback_data: `flow:check_audio:${workflowId}` },
            { text: '▶️ Lanjut dengan Edge TTS', callback_data: `flow:continue_tts:${workflowId}` }
          ],
          [
            { text: '🛑 Batalkan Proyek', callback_data: 'flow:stop' }
          ]
        ]
      }
    );
  }
}

if (require.main === module) {
  appendLog('🤖 AI-nimate Telegram Bridge running...');
  appendLog('Listening for updates on @ai_nimatebot...');
  const startupWf = getStandbyAudioWorkflow();
  if (startupWf) {
    appendLog(`[Telegram Bot] Resumed standby Audio Gate for workflow: ${startupWf.workflowId} (${startupWf.topic})`);
  }
  pollUpdates();
}

module.exports = {
  state,
  stopActiveWorkflow,
  deleteProject,
  listAllProjects,
  renderMainMenu,
  renderNewProjectMenu,
  renderChannelsMenu,
  renderChannelDetail,
  renderWorkflowsMenu,
  renderDeleteProjectsMenu,
  renderConfirmDeleteMenu,
  renderAudioMenu,
  renderEdgeVoiceMenu,
  renderCustomApiMenu,
  renderTopicSelectionMenu,
  renderAgentsMenu,
  getUnusedChannelIdeas,
  markIdeaUsed,
  transferWorkflow,
  startVideoWorkflow,
  chunkText,
  linkAndResumeCustomAudio,
  resumeWorkflowPipeline,
  setActiveWorkflow,
  getStalledWorkflows,
  deliverWorkflowVideo,
  sendPhoto
};
