const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { indexAsset, searchAsset, recordAssetUsage, isAssetInCooldown } = require('../scripts/vector-db');
const { buildStylePrompt, registerAsset } = require('../scripts/nano-banana');
const { auditFrame, auditProjectFrames } = require('../scripts/visual-qa');
const {
  sliceScriptIntoBeats,
  healStoryboard,
  extractFinancialMetric,
  extractRegulatoryTerm,
  getStockAssetPools
} = require('../scripts/pipeline');

test('vector db indexes assets and enforces strict channel isolation', async () => {
  // Index asset for kausalmedia
  await indexAsset({
    id: 'test-carwash-lift-01',
    channel: 'kausalmedia',
    name: 'Hydraulic Carwash Lift Single Post',
    category: 'props',
    subcategory: 'machinery',
    tags: ['cuci-mobil', 'hidrolik', 'single-post-lift', 'steam', 'jakarta'],
    description: 'Roadside single-post hydraulic carwash lift hoisted in Jakarta ruko setting with high-pressure wand and Avanza chassis.',
    style: 'comic-ligne-claire'
  });

  // Index asset for another channel (e.g. nusantaraarchive)
  await indexAsset({
    id: 'test-colonial-treaty-01',
    channel: 'nusantaraarchive',
    name: 'Batavia Notary Parchment 1928',
    category: 'documents',
    subcategory: 'legal',
    tags: ['perjanjian', 'notaris', 'batavia', 'kolonial', '1928'],
    description: 'Aged Dutch colonial legal treaty with wax seal and sumi ink calligraphy.',
    style: 'archival-sepia'
  });

  // Querying kausalmedia for carwash lift should find it
  const resultsKausal = await searchAsset({
    query: 'hydraulic carwash lift single post cuci mobil steam',
    channel: 'kausalmedia',
    threshold: 0.50
  });

  assert.ok(resultsKausal.length >= 1, 'Should find carwash lift under kausalmedia');
  assert.equal(resultsKausal[0].asset.id, 'test-carwash-lift-01');

  // Cross-channel search: Querying nusantaraarchive must never return the kausalmedia asset
  const resultsCross = await searchAsset({
    query: 'hydraulic carwash lift single post cuci mobil steam',
    channel: 'nusantaraarchive',
    threshold: 0.10
  });

  assert.ok(!resultsCross.some(r => r.asset.id === 'test-carwash-lift-01'), 'kausalmedia asset must NEVER be returned in nusantaraarchive search');

  // And with the required production threshold >= 0.90, unrelated assets return 0 results
  const resultsStrict = await searchAsset({
    query: 'hydraulic carwash lift single post cuci mobil steam',
    channel: 'nusantaraarchive',
    threshold: 0.90
  });
  assert.equal(resultsStrict.length, 0, 'Unrelated assets under nusantaraarchive must score below 0.90');
});

test('nano-banana builds style-locked prompts for kausalmedia', () => {
  const spec = buildStylePrompt('vintage manual pressure spray wand', 'kausalmedia');
  assert.equal(spec.channel, 'kausalmedia');
  assert.ok(spec.prompt.includes('editorial comic art spot illustration of'));
  assert.ok(spec.prompt.includes('bold clean black ink contour outlines'));
  assert.ok(spec.prompt.includes('solid warm cream off-white background (#F8F5EE)'));
  assert.ok(spec.negativePrompt.includes('photorealistic, 3D CGI'));
  assert.equal(spec.backgroundKnockout, '#F8F5EE');
});

test('visual-qa audits frames and flags defects properly', async () => {
  // Test missing frame
  const missingReport = await auditFrame({
    beatId: 'beat_001',
    framePath: '/tmp/nonexistent_frame_12345.png'
  });
  assert.equal(missingReport.verdict, 'FAIL');
  assert.equal(missingReport.defectType, 'MISSING_FRAME');

  // Create a dummy valid frame file for testing
  const dummyFrame = path.join(__dirname, 'dummy_test_frame.png');
  fs.writeFileSync(dummyFrame, Buffer.alloc(12000, 1)); // 12KB non-empty file

  try {
    // Test clean frame passing audit
    const cleanReport = await auditFrame({
      beatId: 'beat_002',
      framePath: dummyFrame,
      scene: {
        id: 'beat_002',
        layout: 'centered',
        subtitle: 'Di balik ruko ini, perputaran uang tunai terus berjalan.'
      }
    });
    assert.equal(cleanReport.verdict, 'PASS');
    assert.equal(cleanReport.score, 100);

    // Test null exhibit.src fails QA
    const nullExhibitReport = await auditFrame({
      beatId: 'beat_002_null',
      framePath: dummyFrame,
      scene: {
        id: 'beat_002_null',
        layout: 'hero',
        exhibit: { src: null },
        subtitle: 'Contoh beat tanpa asset.'
      }
    });
    assert.equal(nullExhibitReport.verdict, 'FAIL');
    assert.equal(nullExhibitReport.defectType, 'MISSING_EXHIBIT_SRC');

    // Test consecutive duplicate asset fails QA
    const dupeReport = await auditFrame({
      beatId: 'beat_002_dupe',
      framePath: dummyFrame,
      scene: {
        id: 'beat_002_dupe',
        layout: 'hero',
        exhibit: { src: 'assets/props/items/bursa-efek-indonesia-floor.png' }
      },
      prevExhibitSrc: 'assets/props/items/bursa-efek-indonesia-floor.png'
    });
    assert.equal(dupeReport.verdict, 'FAIL');
    assert.equal(dupeReport.defectType, 'CONSECUTIVE_DUPLICATE_ASSET');

    // Test excessive duration (> 8.0s) fails QA
    const longBeatReport = await auditFrame({
      beatId: 'beat_002_long',
      framePath: dummyFrame,
      scene: {
        id: 'beat_002_long',
        startTime: 0,
        endTime: 9.5,
        layout: 'hero',
        exhibit: { src: 'assets/props/items/bursa-efek-indonesia-floor.png' }
      }
    });
    assert.equal(longBeatReport.verdict, 'FAIL');
    assert.equal(longBeatReport.defectType, 'EXCESSIVE_BEAT_DURATION');

    // Test frame violating show-not-tell (forbidden slide bullet points)
    const dirtyReport = await auditFrame({
      beatId: 'beat_003',
      framePath: dummyFrame,
      scene: {
        id: 'beat_003',
        layout: 'centered',
        bulletPoints: ['Point 1: High cash', 'Point 2: No receipt']
      }
    });
    assert.equal(dirtyReport.verdict, 'FAIL');
    assert.equal(dirtyReport.defectType, 'SHOW_NOT_TELL');
    assert.ok(dirtyReport.remediation);
    assert.equal(dirtyReport.remediation.targetAgent, 'director');
  } finally {
    if (fs.existsSync(dummyFrame)) fs.unlinkSync(dummyFrame);
  }
});

test('sliceScriptIntoBeats enforces <= 6.5s hard ceiling and eliminates 22+ second stagnation', () => {
  // Long sentence that previously produced a 22+ second single static beat
  const longSentence = 'Di balik ruko ini, perputaran uang tunai terus berjalan tanpa struk dan tanpa pencatatan pajak resmi selama berbulan-bulan sampai akhirnya otoritas pengawas pasar modal menemukan kejanggalan aliran dana bernilai miliaran rupiah.';
  const shortSentence1 = 'Ini kalimat pembuka pertama.';
  const shortSentence2 = 'Ini kalimat penutup terakhir.';
  const fullScript = `${shortSentence1} ${longSentence} ${shortSentence2}`;

  const beats = sliceScriptIntoBeats({
    scriptText: fullScript,
    durationSec: 45.0,
    format: '16:9',
    topic: 'Aliran Dana Gelap'
  });

  assert.ok(beats.length >= 5, 'Must subdivide long script into multiple fast-paced beats');
  beats.forEach((beat, idx) => {
    const dur = Math.round((beat.endTime - beat.startTime) * 10) / 10;
    assert.ok(dur <= 6.5, `Beat ${idx + 1} duration (${dur}s) must not exceed 6.5s hard ceiling`);
    assert.ok(dur >= 2.0, `Beat ${idx + 1} duration (${dur}s) must meet minimum visual threshold`);
  });
});

test('extractFinancialMetric and extractRegulatoryTerm auto-populate data & badges', () => {
  // Financial metrics
  const m1 = extractFinancialMetric('Total kerugian investor mencapai Rp 1,5 Triliun dalam setahun.');
  assert.ok(m1);
  assert.equal(m1.value, 'Rp 1,5 Triliun');

  const m2 = extractFinancialMetric('Suku bunga BI dipotong sebesar 25 bps.');
  assert.ok(m2);
  assert.equal(m2.value, '25 bps');

  const m3 = extractFinancialMetric('Pertumbuhan aset meroket hingga 4x lipat.');
  assert.ok(m3);
  assert.equal(m3.value, '4x lipat');

  const m4 = extractFinancialMetric('Margin laba kotor tergerus hingga 14.5% saja.');
  assert.ok(m4);
  assert.equal(m4.value, '14.5%');

  // Regulatory citations
  const r1 = extractRegulatoryTerm('Investigasi diawasi ketat oleh penyidik OJK dan BEI.');
  assert.equal(r1, 'OJK');

  const r2 = extractRegulatoryTerm('Ketentuan ini tercantum jelas dalam POJK No. 12/2023.');
  assert.ok(r2.startsWith('POJK'));

  const r3 = extractRegulatoryTerm('Dugaan gratifikasi langsung diselidiki oleh tim KPK.');
  assert.equal(r3, 'KPK');
});

test('healStoryboard automatically repairs excessive duration, null exhibit, and duplicate assets', () => {
  const dummyStoryboard = {
    title: 'Test Healing Pipeline',
    channel: 'kausalmedia',
    format: '16:9',
    scenes: [
      {
        id: 'beat_001',
        startTime: 0,
        endTime: 14.0, // > 8.0s defect
        layout: 'fullscreen',
        subtitle: 'Kalimat yang sangat panjang dan memakan waktu hingga empat belas detik penuh di panggung visual.',
        exhibit: { src: null } // null exhibit defect
      },
      {
        id: 'beat_002',
        startTime: 14.0,
        endTime: 18.0,
        layout: 'hero',
        subtitle: 'Beat kedua dengan aset tertentu.',
        exhibit: { src: 'assets/props/items/bursa-efek-indonesia-floor.png' }
      },
      {
        id: 'beat_003',
        startTime: 18.0,
        endTime: 22.0,
        layout: 'hero',
        subtitle: 'Beat ketiga yang menggunakan aset duplikat berulang.',
        exhibit: { src: 'assets/props/items/bursa-efek-indonesia-floor.png' } // consecutive duplicate defect
      }
    ]
  };

  const healed = healStoryboard(dummyStoryboard, null, 'kausalmedia');

  // 1. Beat 001 (14s) must be subdivided into beats <= 6.5s
  assert.ok(healed.scenes.length >= 4, 'Healed storyboard must have subdivided the 14s beat');
  healed.scenes.forEach(sc => {
    const dur = Math.round((sc.endTime - sc.startTime) * 10) / 10;
    assert.ok(dur <= 8.0, `Each healed scene duration (${dur}s) must not exceed 8.0s`);
    assert.ok(sc.exhibit.src !== null, `Scene ${sc.id} must have a non-null exhibit.src`);
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', sc.exhibit.src)), `Exhibit path ${sc.exhibit.src} must exist on disk`);
  });

  // 2. Consecutive duplicates must be eliminated
  for (let i = 1; i < healed.scenes.length; i++) {
    assert.notEqual(
      healed.scenes[i].exhibit.src,
      healed.scenes[i - 1].exhibit.src,
      `Consecutive scenes ${healed.scenes[i - 1].id} and ${healed.scenes[i].id} must not share identical asset`
    );
  }
});

test('getStockAssetPools provides diverse stock asset options from disk', () => {
  const pools = getStockAssetPools();
  assert.ok(pools.fullscreenPool.length >= 2, 'Fullscreen pool must have assets');
  assert.ok(pools.heroPool.length >= 2, 'Hero pool must have assets');
  assert.ok(pools.allPool.length >= 4, 'All pool must have multiple assets');
  pools.allPool.forEach(assetPath => {
    const full = path.resolve(__dirname, '..', assetPath);
    assert.ok(fs.existsSync(full), `Asset in pool must exist on disk: ${assetPath}`);
  });
});

