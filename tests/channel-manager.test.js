const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listChannels, getChannel, saveChannel, formatChannelTelegram } = require('../channels/channel-manager');
const { renderChannelsMenu, renderChannelDetail } = require('../scripts/telegram-bot');

test('channel manager lists, gets, and formats channel profiles', () => {
  const channels = listChannels();
  assert.ok(channels.length >= 1, 'Should have at least 1 registered channel');
  const kausal = channels.find(c => c.id === 'kausalmedia');
  assert.ok(kausal, 'kausalmedia should be listed');
  assert.equal(kausal.mode, 'light-mode');
  assert.equal(kausal.maxAssetRepetition, 5);

  const profile = getChannel('kausalmedia');
  assert.ok(profile);
  assert.equal(profile.id, 'kausalmedia');
  assert.equal(profile.aestheticVibe.paperTone, '#faf6ee');
  assert.equal(profile.aestheticVibe.texture, 'aged-papyrus-fibers');
  assert.equal(profile.aestheticVibe.batikMotif, 'batik-parang-rusak');
  assert.equal(profile.rules.maxAssetRepetitionPerVideo, 5);

  const formatted = formatChannelTelegram('kausalmedia');
  assert.ok(formatted.includes('Kausal Media'));
  assert.ok(formatted.includes('Anti-YouTube Flagging'));
});

test('telegram bot renders channels menu and channel detail', () => {
  const menu = renderChannelsMenu();
  assert.ok(menu.text.includes('Future Channel Profiles'));
  assert.ok(menu.reply_markup.inline_keyboard.some(row => row.some(b => b.callback_data === 'channel:view:kausalmedia')));

  const detail = renderChannelDetail('kausalmedia');
  assert.ok(detail.text.includes('Kausal Media'));
  assert.ok(detail.text.includes('light-mode'));
  assert.ok(detail.text.includes('Strict Asset Ceiling'));
});
