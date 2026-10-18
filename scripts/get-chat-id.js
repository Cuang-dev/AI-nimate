#!/usr/bin/env node
/**
 * Helper to fetch chatID from incoming Telegram bot updates
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envFile = path.resolve(__dirname, '..', '.env');
let token = process.env.TELEGRAM_BOT_TOKEN;
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const [k, v] = line.split('=');
    if (k && k.trim() === 'TELEGRAM_BOT_TOKEN') token = v.trim();
  }
}

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in environment or .env');
  process.exit(1);
}

function fetchUpdates() {
  const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=10`;
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (!json.ok) {
          console.error('Telegram API error:', json);
          return;
        }
        const updates = json.result || [];
        if (updates.length === 0) {
          console.log('No messages yet. Send /start or any message to @ai_nimatebot on Telegram!');
          return;
        }
        for (const u of updates) {
          const msg = u.message || u.channel_post || u.callback_query?.message;
          if (msg && msg.chat) {
            console.log(`\nFound Chat ID:`);
            console.log(`  Chat ID:    ${msg.chat.id}`);
            console.log(`  User:       ${msg.from?.first_name || ''} (@${msg.from?.username || 'none'})`);
            console.log(`  Message:    "${msg.text || ''}"`);
            console.log(`  Date:       ${new Date(msg.date * 1000).toISOString()}\n`);
          }
        }
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  }).on('error', err => {
    console.error('Request failed:', err.message);
  });
}

fetchUpdates();
