const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const {
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel
} = require('../channels/channel-manager');

const { generateStageHtml } = require('../engine/stage-generator');
const { getUnusedChannelIdeas } = require('../channels/channel-ideas');

test('Channel Manager: default active filter and full CRUD cycle', (t) => {
  // 1. Initial active channels check: only Kausal Media active
  const activeChannels = listChannels(true);
  assert.strictEqual(activeChannels.length, 1, 'Only 1 active channel should be returned by default');
  assert.strictEqual(activeChannels[0].id, 'kausalmedia', 'Active channel must be kausalmedia');

  // All channels check includes inactive
  const allChannels = listChannels(false);
  assert.ok(allChannels.length >= 2, 'All channels includes inactive channels');

  // 2. Create Channel
  const testChanId = 'testchannel_' + Date.now();
  const created = createChannel({
    id: testChanId,
    name: 'Test Investigative Journal',
    description: 'Unit testing channel profile',
    theme: 'Dark documentary',
    active: true
  });
  assert.strictEqual(created.id, testChanId);
  assert.strictEqual(created.active, true);

  // Verify it appears in active list
  const activeAfterCreate = listChannels(true);
  assert.strictEqual(activeAfterCreate.some(c => c.id === testChanId), true);

  // 3. Update Channel
  const updated = updateChannel(testChanId, { name: 'Updated Journal Name' });
  assert.strictEqual(updated.name, 'Updated Journal Name');
  assert.strictEqual(getChannel(testChanId).name, 'Updated Journal Name');

  // 4. Soft Delete (Deactivate) Channel
  const softDeleted = deleteChannel(testChanId, { purge: false });
  assert.strictEqual(softDeleted.active, false);
  const activeAfterSoftDelete = listChannels(true);
  assert.strictEqual(activeAfterSoftDelete.some(c => c.id === testChanId), false);

  // 5. Hard Delete (Purge file)
  const purged = deleteChannel(testChanId, { purge: true });
  assert.strictEqual(purged.purged, true);
  assert.strictEqual(getChannel(testChanId), null);
});

test('Stage Generator: Test Mode renders clean prompt card and [SYSTEM_PROMPT_{Channel}] tag', (t) => {
  const mockStoryboard = {
    scenes: [
      {
        id: 0,
        subtitle: 'Bursa Efek Indonesia mengalami penurunan indeks tajam.',
        exhibit: {
          description: 'editorial comic art illustration of trading floor at IDX with falling charts: bold clean black ink contour',
          layout: 'hero'
        }
      }
    ]
  };

  const html = generateStageHtml({
    storyboard: mockStoryboard,
    timings: { words: [], duration: 8 },
    format: '16:9',
    channelId: 'kausalmedia',
    testMode: true
  });

  assert.ok(html.includes('[SYSTEM_PROMPT_KAUSALMEDIA]'), 'Should contain channel system prompt tag');
  assert.ok(html.includes('test-prompt-card'), 'Should render test prompt card container');
  assert.ok(!html.includes('bold clean black ink contour'), 'Should exclude system prompt boilerplate from clean prompt');
  assert.ok(html.includes('trading floor at IDX with falling charts'), 'Should retain core subject prompt');
});

test('Stage Generator: Non-test mode expands fallback exhibit to layout: fullsize beneath subtitles', (t) => {
  const mockStoryboard = {
    scenes: [
      {
        id: 0,
        subtitle: 'Investigasi mendalam aliran dana.',
        layout: 'fullsize',
        exhibit: {
          src: 'assets/props/items/bursa-efek-indonesia-floor.png',
          description: 'Full canvas trading floor',
          layout: 'fullsize'
        }
      }
    ]
  };

  const html = generateStageHtml({
    storyboard: mockStoryboard,
    timings: { words: [], duration: 8 },
    format: '16:9',
    channelId: 'kausalmedia',
    testMode: false
  });

  assert.ok(html.includes('layout-fullsize'), 'Should render fullsize layout class');
  assert.ok(html.includes('z-index: 50'), 'Subtitles anchor must have higher z-index (50) than exhibit viewport');
  assert.ok(html.includes('z-index: 10'), 'Exhibit viewport must sit above background (z-index 1-3) and below subtitles');
});
