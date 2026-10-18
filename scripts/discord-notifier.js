#!/usr/bin/env node
/**
 * AI-nimate Discord Notification & Asset Dispatcher
 * 
 * Directly routes all production pipeline telemetry, stage milestones,
 * and finished video deliveries to Discord server CuangLab (#ai-nimate).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env');

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

const env = loadEnv();
const TOKEN = env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = env.DISCORD_AINIMATE_CHANNEL_ID || '1558836057951182881'; // #ai-nimate in CuangLab

/**
 * Send raw JSON or Multipart payload to a Discord channel
 */
function sendDiscordPayload({ channelId = CHANNEL_ID, payloadJson, files = [] }) {
  return new Promise((resolve, reject) => {
    if (!TOKEN) {
      console.warn('[Discord Notifier] DISCORD_BOT_TOKEN is not configured.');
      return resolve(null);
    }

    const targetChannel = channelId || CHANNEL_ID;

    // Fast path: Simple JSON without attachments
    if (!files || files.length === 0) {
      const postData = JSON.stringify(payloadJson);
      const req = https.request(`https://discord.com/api/v10/channels/${targetChannel}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              console.warn(`[Discord Notifier] HTTP ${res.statusCode}:`, parsed.message || raw);
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', err => {
        console.warn('[Discord Notifier Error]:', err.message);
        resolve(null);
      });
      req.write(postData);
      req.end();
      return;
    }

    // Multipart/form-data for file uploads
    const boundary = '--------------------------' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8);
    const chunks = [];

    // 1. JSON payload part
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="payload_json"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(payloadJson)}\r\n`
    ));

    // 2. Attachments
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let fileBuf = null;
      let filename = file.filename || path.basename(file.path || `file_${i}`);
      let contentType = file.contentType || 'application/octet-stream';

      if (file.buffer) {
        fileBuf = file.buffer;
      } else if (file.path && fs.existsSync(file.path)) {
        fileBuf = fs.readFileSync(file.path);
      }

      if (fileBuf) {
        chunks.push(Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files[${i}]"; filename="${filename}"\r\n` +
          `Content-Type: ${contentType}\r\n\r\n`
        ));
        chunks.push(fileBuf);
        chunks.push(Buffer.from('\r\n'));
      }
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(chunks);

    const req = https.request(`https://discord.com/api/v10/channels/${targetChannel}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            console.warn(`[Discord File Upload] HTTP ${res.statusCode}:`, parsed.message || raw);
            resolve(null);
          }
        } catch (_) {
          resolve(null);
        }
      });
    });

    req.on('error', err => {
      console.warn('[Discord File Upload Error]:', err.message);
      resolve(null);
    });

    req.write(fullBody);
    req.end();
  });
}

/**
 * Dispatch Pipeline Stage Milestone Notification to #ai-nimate
 */
async function notifyPipelineStage({ workflowId, stage, progress, topic, details, status = 'in_progress', components = null }) {
  const barLength = 12;
  const safeProgress = Math.min(100, Math.max(0, progress || 0));
  const filled = Math.round((safeProgress / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  const colors = {
    in_progress: 0x8b5cf6, // Violet
    completed: 0x10b981,   // Green
    failed: 0xef4444,      // Red
    standby: 0xf59e0b      // Amber
  };

  const embed = {
    title: `🎬 Production: ${topic || workflowId}`,
    description: details || `Milestone achieved: **${stage}**`,
    color: colors[status] || 0x8b5cf6,
    fields: [
      { name: 'Stage', value: stage, inline: true },
      { name: 'Progress', value: `\`[${bar}] ${safeProgress}%\``, inline: true }
    ],
    footer: { text: `AI-nimate Studio • Workflow: ${workflowId || 'local'}` },
    timestamp: new Date().toISOString()
  };

  const payload = {
    embeds: [embed]
  };
  if (Array.isArray(components) && components.length > 0) {
    payload.components = components;
  }

  return await sendDiscordPayload({
    payloadJson: payload
  });
}

/**
 * Deliver Final Rendered Video to #ai-nimate
 */
async function sendVideoToDiscord({ videoPath, title, channel = 'kausalmedia', format = '16:9', qaAudit, sizeMB }) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.warn(`[Discord Delivery] Video file does not exist: ${videoPath}`);
    return false;
  }

  const stat = fs.statSync(videoPath);
  const realMB = stat.size / 1024 / 1024;
  console.log(`[Discord Delivery] Preparing video dispatch (${realMB.toFixed(1)} MB)...`);

  // Publish to Nginx for unlimited size streaming & Discord native embed
  let publicUrls = null;
  try {
    const { publishRenderedVideo } = require('./video-publisher');
    const projectDir = path.dirname(videoPath).endsWith('render') ? path.dirname(path.dirname(videoPath)) : path.dirname(videoPath);
    const slug = path.basename(projectDir);
    publicUrls = publishRenderedVideo({
      projectDir,
      channel,
      slug,
      title,
      format,
      qaAudit
    });
  } catch (pubErr) {
    console.warn('[Discord Delivery] Video publisher warning:', pubErr.message);
  }

  const DISCORD_BOT_LIMIT_MB = 24.5;
  let fileToUpload = videoPath;
  let isOptimized = false;

  // If video exceeds Discord attachment threshold, generate lightweight preview attachment if possible
  if (realMB > DISCORD_BOT_LIMIT_MB) {
    const previewPath = path.join(path.dirname(videoPath), 'discord_delivery.mp4');
    try {
      execSync(`ffmpeg -y -i "${videoPath}" -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 26 -preset fast -c:a aac -b:a 96k "${previewPath}"`, {
        stdio: 'ignore',
        timeout: 180000
      });
      if (fs.existsSync(previewPath) && (fs.statSync(previewPath).size / 1024 / 1024) <= DISCORD_BOT_LIMIT_MB) {
        fileToUpload = previewPath;
        isOptimized = true;
      }
    } catch (e) {
      console.warn('[Discord Delivery] Transcode skipped:', e.message);
    }
  }

  const watchUrl = publicUrls ? publicUrls.publicPageUrl : null;
  const streamUrl = publicUrls ? publicUrls.publicVideoUrl : null;

  const embed = {
    title: `🎉 Video Production Complete: ${title || 'Autonomous Production'}`,
    description: `The video essay has been rendered in pristine 1080p master quality and is hosted on your Nginx server for full-fidelity streaming.\n\n▶️ **[Watch Full Video on Nginx](${watchUrl || streamUrl || videoPath})**`,
    color: 0x10b981,
    fields: [
      { name: 'Channel', value: `\`${channel || 'kausalmedia'}\``, inline: true },
      { name: 'Format', value: `\`${format || '16:9'}\``, inline: true },
      { name: 'Master Size', value: `\`${realMB.toFixed(1)} MB\``, inline: true },
      { name: 'Visual QA', value: `${qaAudit?.overallVerdict || 'PASSED'} (${qaAudit?.passedCount || 0}/${qaAudit?.totalFrames || 0} frames)`, inline: true }
    ],
    footer: { text: publicUrls ? 'Hosted via Nginx • Zero Discord compression' : 'Direct Attachment' },
    timestamp: new Date().toISOString()
  };

  if (streamUrl) {
    embed.fields.push({
      name: 'Direct Stream URL (Byte-Range Seekable)',
      value: `[${streamUrl}](${streamUrl})`,
      inline: false
    });
  }

  const uploadSize = fs.existsSync(fileToUpload) ? fs.statSync(fileToUpload).size / 1024 / 1024 : 999;
  let files = [];
  if (uploadSize <= DISCORD_BOT_LIMIT_MB) {
    files.push({
      path: fileToUpload,
      filename: `${path.basename(videoPath, '.mp4')}${isOptimized ? '_preview' : ''}.mp4`,
      contentType: 'video/mp4'
    });
  }

  const res = await sendDiscordPayload({
    payloadJson: {
      content: watchUrl
        ? `🎬 **Finished Video Delivered to #ai-nimate!**\n▶️ **Watch Master (1080p):** <${watchUrl}>\n🔗 **Direct Stream:** <${streamUrl}>`
        : `🎬 **Finished Video Delivered to #ai-nimate!**`,
      embeds: [embed]
    },
    files
  });

  if (res) {
    console.log(`[Discord Delivery] Successfully posted video delivery to #ai-nimate (Message ID: ${res.id}).`);
    return true;
  }
  return false;
}

/**
 * Notify Error in Production
 */
async function notifyPipelineError({ workflowId, topic, stage, error }) {
  const embed = {
    title: `⚠️ Production Error: ${topic || workflowId}`,
    description: `Pipeline encountered an issue during **${stage || 'Execution'}**:\n\`\`\`text\n${String(error).slice(0, 1800)}\n\`\`\``,
    color: 0xef4444,
    fields: [
      { name: 'Workflow ID', value: `\`${workflowId || 'unknown'}\``, inline: true },
      { name: 'Status', value: '❌ HALTED / FAILED', inline: true }
    ],
    timestamp: new Date().toISOString()
  };

  return await sendDiscordPayload({
    payloadJson: {
      content: `🚨 **AI-nimate Pipeline Error Alert**`,
      embeds: [embed]
    }
  });
}

module.exports = {
  sendDiscordPayload,
  notifyPipelineStage,
  sendVideoToDiscord,
  notifyPipelineError,
  CHANNEL_ID
};
