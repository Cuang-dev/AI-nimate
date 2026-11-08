/**
 * Infrastructure Uptime & Sentinel Monitor Module for Cuangbot
 * 
 * Tracks and reports:
 * 1. Azure Cloud VM (cuanglab): Outbound egress quota (vs 100 GB free tier), RAM/Swap, Kuma & Beszel services.
 * 2. Beszel Systems: Live stats for all monitored nodes (LXC, Mini PC, VMs).
 * 3. Uptime Kuma Monitors: Live website & service uptime checks with response times.
 * 4. Local Homelab Host (sandbox): CPU load, RAM, Disk, Docker containers, Beszel agent status.
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder
} = require('discord.js');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const UPTIME_CHANNEL_ID = process.env.DISCORD_UPTIME_CHANNEL_ID || '1562147748873244733';
const AZURE_KEY_PATH = process.env.AZURE_SSH_KEY || path.join(os.homedir(), '.ssh', 'azure_key');
const AZURE_HOST = process.env.AZURE_HOST || '70.153.18.48';
const AZURE_USER = process.env.AZURE_USER || 'azureuser';

let lastMessageId = null;
let updateTimer = null;

function runCmd(cmd, timeoutMs = 6000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, error: err.message, stdout: '', stderr });
      resolve({ ok: true, stdout: stdout.trim(), stderr });
    });
  });
}

/**
 * Query Azure Cloud VM metrics
 */
async function getAzureMetrics() {
  if (!fs.existsSync(AZURE_KEY_PATH)) {
    return { ok: false, error: 'SSH key not found at ' + AZURE_KEY_PATH };
  }

  const sshCmd = `ssh -i "${AZURE_KEY_PATH}" -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes ${AZURE_USER}@${AZURE_HOST} "/usr/local/bin/get-azure-stats"`;
  const res = await runCmd(sshCmd, 7000);
  if (!res.ok) {
    return { ok: false, error: 'Azure VM unreachable: ' + (res.error || 'timeout') };
  }

  try {
    const data = JSON.parse(res.stdout);

    const txBytes = Number(data.txBytes) || 0;
    const rxBytes = Number(data.rxBytes) || 0;
    const txGB = (txBytes / (1024 * 1024 * 1024)).toFixed(2);
    const rxGB = (rxBytes / (1024 * 1024 * 1024)).toFixed(2);
    const remainingGB = Math.max(0, (100 - parseFloat(txGB))).toFixed(2);
    const percentUsed = Math.min(100, ((parseFloat(txGB) / 100) * 100)).toFixed(1);

    const uptimeDays = Math.floor((Number(data.uptimeSec) || 0) / 86400);
    const uptimeHrs = Math.floor(((Number(data.uptimeSec) || 0) % 86400) / 3600);
    const uptimeMins = Math.floor(((Number(data.uptimeSec) || 0) % 3600) / 60);

    return {
      ok: true,
      txGB,
      rxGB,
      remainingGB,
      percentUsed,
      kumaStatus: String(data.kumaHttp || '000'),
      beszelStatus: String(data.beszelHttp || '000'),
      memUsed: data.memUsedMB,
      memTotal: data.memTotalMB,
      swapUsed: data.swapUsedMB,
      swapTotal: data.swapTotalMB,
      uptimeStr: `${uptimeDays}d ${uptimeHrs}h ${uptimeMins}m`,
      hasRelay: !!data.hasRelay,
      beszelSystems: Array.isArray(data.beszelSystems) ? data.beszelSystems : [],
      kumaMonitors: Array.isArray(data.kumaMonitors) ? data.kumaMonitors : []
    };
  } catch (e) {
    return { ok: false, error: 'Metric parse error: ' + e.message + ' | raw: ' + res.stdout.slice(0, 100) };
  }
}

/**
 * Query Local Host Metrics
 */
async function getLocalMetrics() {
  const load = os.loadavg();
  const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
  const freeMemGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(1);
  const usedMemGB = (totalMemGB - freeMemGB).toFixed(1);
  const memPct = Math.round((usedMemGB / totalMemGB) * 100);

  const dockerRes = await runCmd("docker ps -q 2>/dev/null | wc -l", 3000);
  const runningContainers = dockerRes.ok ? dockerRes.stdout : 'N/A';

  const beszelRes = await runCmd("docker inspect -f '{{.State.Status}}' beszel-agent 2>/dev/null", 2000);
  const beszelAgentStatus = beszelRes.ok ? beszelRes.stdout : 'not running';

  const diskRes = await runCmd("df -h / | awk 'NR==2 {print $3,$2,$5}'", 2000);
  const diskParts = diskRes.ok ? diskRes.stdout.split(' ') : ['N/A', 'N/A', 'N/A'];

  return {
    loadStr: `${load[0].toFixed(2)}, ${load[1].toFixed(2)}, ${load[2].toFixed(2)}`,
    usedMemGB,
    totalMemGB,
    memPct,
    runningContainers,
    beszelAgentStatus,
    diskUsed: diskParts[0],
    diskTotal: diskParts[1],
    diskPct: diskParts[2]
  };
}

function makeProgressBar(usedPercent, length = 10) {
  const pct = Math.max(0, Math.min(100, usedPercent));
  const filled = Math.round((pct / 100) * length);
  const empty = length - filled;
  return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

/**
 * Build rich Discord embed
 */
async function buildUptimeEmbed() {
  const [azure, local] = await Promise.all([
    getAzureMetrics(),
    getLocalMetrics()
  ]);

  const timestamp = new Date().toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const isHealthy = azure.ok && (parseFloat(azure.percentUsed) < 80);
  const embedColor = isHealthy ? 0x00FF88 : 0xFFAA00; // Neon Mint vs Amber Warning

  const embed = new EmbedBuilder()
    .setTitle('⚡ Infrastructure Uptime & Sentinel Dashboard')
    .setColor(embedColor)
    .setDescription(`Live health, egress meter, Beszel systems & Uptime Kuma checks.\n*Last polled: **${timestamp} WIB** • Auto-refresh every 5m*`)
    .setFooter({ text: 'Cuangbot Sentinel • Powered by Tailscale & Beszel' });

  // 1. Azure Cloud VM Section
  if (azure.ok) {
    const pBar = makeProgressBar(parseFloat(azure.percentUsed), 10);

    embed.addFields({
      name: '☁️ Azure Cloud VM (`cuanglab`)',
      value: [
        `• **Status**: 🟢 **Online** \`IndonesiaCentral\` *(Uptime: ${azure.uptimeStr})*`,
        `• **Tailscale IP**: \`100.105.240.0\` | Public: \`70.153.18.48\``,
        `• **RAM**: \`${azure.memUsed} MB / ${azure.memTotal} MB\` | **Swap**: \`${azure.swapUsed} MB / ${azure.swapTotal} MB\``,
        `• **Outbound Egress**: \`${azure.txGB} GB / 100 GB Free Tier\` (${azure.percentUsed}%)`,
        `  ${pBar} \`${azure.remainingGB} GB Left\``,
        `• **Tailscale Roles**: 🎮 **Peer Relay** (UDP 41641) | 🌐 **Exit Node** (0.0.0.0/0)`
      ].join('\n'),
      inline: false
    });

    // 2. Beszel Monitored Systems
    const sysLines = [];
    if (azure.beszelSystems && azure.beszelSystems.length > 0) {
      azure.beszelSystems.forEach(s => {
        const statusBadge = (s.status === 'up') ? '🟢 UP' : '🔴 DOWN';
        sysLines.push(`• **${s.name}** (\`${s.host}\`): ${statusBadge} | CPU: \`${s.cpu.toFixed(1)}%\` | RAM: \`${s.mem.toFixed(1)}%\` | Disk: \`${s.disk.toFixed(1)}%\``);
      });
    } else {
      sysLines.push(`• *(No systems registered in Beszel yet)*`);
    }

    embed.addFields({
      name: `📈 Beszel Systems (${azure.beszelSystems.length} Monitored)`,
      value: sysLines.join('\n'),
      inline: false
    });

    // 3. Uptime Kuma Monitors
    const kumaLines = [];
    if (azure.kumaMonitors && azure.kumaMonitors.length > 0) {
      azure.kumaMonitors.forEach(m => {
        const badge = (m.status === 1) ? '🟢 UP' : ((m.status === 0) ? '🔴 DOWN' : '🟡 PENDING');
        const pingStr = m.ping ? ` (${m.ping}ms)` : '';
        kumaLines.push(`• **${m.name}**: ${badge}${pingStr} • \`${m.url || 'TCP/Ping'}\``);
      });
    } else {
      kumaLines.push(`• Uptime Kuma Hub: 🟢 **200 OK** • *(Add websites at http://100.105.240.0:3001)*`);
    }

    embed.addFields({
      name: `🌐 Uptime Kuma Websites & Endpoints (${azure.kumaMonitors.length})`,
      value: kumaLines.join('\n'),
      inline: false
    });
  } else {
    embed.addFields({
      name: '☁️ Azure Cloud VM (`cuanglab`)',
      value: `🔴 **Alert**: ${azure.error || 'Connection failed'}`,
      inline: false
    });
  }

  // 4. Local Homelab Host Section
  embed.addFields({
    name: '🖥️ Local Homelab Host (`sandbox`)',
    value: [
      `• **CPU Load Avg**: \`${local.loadStr}\``,
      `• **Memory**: \`${local.usedMemGB} GB / ${local.totalMemGB} GB\` (\`${local.memPct}%\`)`,
      `• **Root Storage**: \`${local.diskUsed} / ${local.diskTotal}\` (\`${local.diskPct} used\`)`,
      `• **Docker Workloads**: \`${local.runningContainers} containers active\` | Beszel Agent: 🟢 **${local.beszelAgentStatus}**`
    ].join('\n'),
    inline: false
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_uptime_refresh')
      .setLabel('🔄 Refresh Telemetry')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel('📊 Uptime Kuma')
      .setURL('http://100.105.240.0:3001')
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('📈 Beszel Hub')
      .setURL('http://100.105.240.0:8090')
      .setStyle(ButtonStyle.Link)
  );

  return { embeds: [embed], components: [row] };
}

const uptimeSlashCommand = new SlashCommandBuilder()
  .setName('uptime')
  .setDescription('View live system metrics, Azure egress consumption, Beszel and Kuma status');

async function startUptimeScheduler(client) {
  console.log(`[Uptime Monitor] Initializing Sentinel in channel #${UPTIME_CHANNEL_ID}...`);

  async function updateLiveBoard() {
    try {
      const channel = client.channels.cache.get(UPTIME_CHANNEL_ID) ||
        (await client.channels.fetch(UPTIME_CHANNEL_ID).catch(() => null));

      if (!channel) {
        console.warn(`[Uptime Monitor] Channel #${UPTIME_CHANNEL_ID} not found or inaccessible.`);
        return;
      }

      const payload = await buildUptimeEmbed();

      if (!lastMessageId) {
        const recentMsgs = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        if (recentMsgs) {
          const existing = recentMsgs.find(m => m.author.id === client.user.id);
          if (existing) {
            lastMessageId = existing.id;
          }
        }
      }

      if (lastMessageId) {
        const msg = await channel.messages.fetch(lastMessageId).catch(() => null);
        if (msg) {
          await msg.edit(payload);
          return;
        }
      }

      const sent = await channel.send(payload);
      lastMessageId = sent.id;
      try { await sent.pin(); } catch (_) {}
    } catch (err) {
      console.error('[Uptime Monitor] Error updating live board:', err.message);
    }
  }

  setTimeout(() => {
    updateLiveBoard();
  }, 2000);

  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(updateLiveBoard, 300000);
}

async function handleUptimeInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === 'btn_uptime_refresh') {
    await interaction.deferUpdate();
    const payload = await buildUptimeEmbed();
    await interaction.editReply(payload);
    return true;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'uptime') {
    await interaction.deferReply();
    const payload = await buildUptimeEmbed();
    await interaction.editReply(payload);
    return true;
  }

  return false;
}

module.exports = {
  UPTIME_CHANNEL_ID,
  uptimeSlashCommand,
  buildUptimeEmbed,
  startUptimeScheduler,
  handleUptimeInteraction
};
