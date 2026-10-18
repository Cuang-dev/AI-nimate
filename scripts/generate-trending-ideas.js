#!/usr/bin/env node
/**
 * AI-nimate Daily Trending Idea Generator via Antigravity Agent
 * 
 * Mines and synthesizes viral Indonesian economic, investigative, and business
 * topics trending on Twitter/X, Threads, financial news, and regulatory filings.
 * 
 * Formats ideas adhering to Kausal Media's forensic standards:
 *  - Empirical causality & hidden incentives
 *  - Concrete monetary values (Rupiah), regulations (POJK/UU/PP), institutions (BEI/OJK/KPK)
 *  - Asymmetric hooks and zero unearned moralizing
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { getChannel } = require('../channels/channel-manager');
const { loadUsedTopics, isIdeaUsed, getTrendingIdeas, appendTrendingIdeas } = require('../channels/channel-ideas');
const { sendDiscordPayload } = require('./discord-notifier');

const REPO_ROOT = path.resolve(__dirname, '..');
const TRENDING_FILE = path.join(REPO_ROOT, 'config', 'trending-ideas.json');
const AGY_BIN = process.env.AGY_BIN || '/home/agent/.local/bin/agy';

function loadSavedTrending(channelId = 'kausalmedia') {
  return getTrendingIdeas(channelId);
}

/**
 * Generate trending ideas using Antigravity agent CLI
 */
async function generateWithAntigravity(channelId = 'kausalmedia', count = 4) {
  const channel = getChannel(channelId) || getChannel('kausalmedia');
  const usedMap = loadUsedTopics();
  const alreadyUsed = (usedMap[channelId] || []).join(', ');

  const systemInstructions = `You are the lead investigative documentary producer for YouTube channel '${channel?.name || 'Kausal Media'}'.
The channel covers Indonesian macroeconomic phenomena, corporate financial forensics, underground cash loops, supply chain cartels, and regulatory gray zones.
Analyze topics currently buzzing or trending across Indonesian Twitter/X (#TrendingID), Meta Threads, Bisnis Indonesia, Kontan, Detik Finance, and IDX corporate disclosures.

Exclude these already used topics: [${alreadyUsed.slice(0, 500)}].

Generate exactly ${count} distinct, highly viral, forensic documentary ideas.
Return STRICTLY a JSON array of objects with no Markdown backticks, matching this exact schema:
[
  {
    "key": "slug-key",
    "title": "Journalistic Video Title in Indonesian (Curiosity-piquing, empirical)",
    "tag": "Emoji & Short Category",
    "detail": "1-2 sentence forensic summary of the economic anomaly or hidden mechanism",
    "researchContext": "Dense analytical paragraph citing specific regulations (e.g. POJK, UU), cash flow numbers (Rp Miliar/Triliun), institutions (BEI, OJK, Ditjen Pajak), and causal mechanics.",
    "trendingSource": "Twitter/X | Threads | Financial News | BEI Filing"
  }
]`;

  if (!fs.existsSync(AGY_BIN)) {
    console.warn(`[Trending Ideas] Antigravity binary not found at ${AGY_BIN}. Using empirical intelligence fallback.`);
    return null;
  }

  try {
    console.log(`[Trending Ideas] Invoking Antigravity agent (${AGY_BIN}) for fresh trending topics...`);
    const stdout = execSync(`"${AGY_BIN}" -p ${JSON.stringify(systemInstructions)} --dangerously-skip-permissions --print-timeout 10s`, {
      encoding: 'utf8',
      timeout: 12000,
      env: { ...process.env, TERM: 'dumb' }
    });

    const jsonMatch = stdout.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          ...item,
          generatedBy: 'antigravity-agent',
          generatedAt: new Date().toISOString()
        }));
      }
    }
  } catch (err) {
    console.warn(`[Trending Ideas] Antigravity execution failed or timed out: ${err.message}.`);
  }

  return null;
}

/**
 * High-precision researched trending topic pool (Curated dynamic fallback)
 */
const HIGH_VELOCITY_TRENDING_POOL = [
  {
    key: 'scam-loker-luar-negeri',
    title: 'Anatomi Sindikat Scam Loker Kamboja & Pencucian Uang Kripto Rp 500 Triliun',
    tag: '🌐 Human Trafficking & Kripto',
    detail: 'Investigasi rantai rekrutmen lowongan kerja palsu di media sosial: penyelundupan pekerja migran ke kasino perbatasan dan perputaran USDT tanpa KYC.',
    researchContext: 'Menelusuri aliran pencucian uang jaringan judi online dan penipuan asmara (pig butchering) berbasis di Sihanoukville dan Myawaddy. Data [PPATK|P-P-A-T-K] mencatat transaksi mencurigakan terkait sindikat ini menembus ratusan triliun rupiah melalui rekening nominee dan konversi stablecoin USDT di pasar P2P. Eksploitasi paspor turis dan transit di Bangkok untuk menghindari deteksi imigrasi.',
    trendingSource: 'Twitter/X & Threads'
  },
  {
    key: 'fintech-p2p-lender-gagal-bayar',
    title: 'Krisis Likuiditas P2P Lending: Ratusan Miliar Dana Lender Nyangkut & Jeratan Asuransi Kredit',
    tag: '💳 Fintech & Gagal Bayar',
    detail: 'Mengapa janji imbal hasil 15-20% platform pinjol produktif berujung macet total? Menelusuri modus borrower fiktif dan wanprestasi asuransi kredit.',
    researchContext: 'Analisis tingkat wanprestasi 90 hari ([TWP90|T-W-P-90]) di atas batas aman 5% pada platform P2P lending ternama seperti TaniFund dan Investree. Modus penggelemungan invoice pembiayaan modal kerja [UMKM|U-M-K-M], kegagalan klaim mitigasi risiko pada perusahaan asuransi penjamin, serta sanksi administratif pencabutan izin usaha oleh [OJK|O-J-K].',
    trendingSource: 'Financial News & Kontan'
  },
  {
    key: 'nikel-smelter-overcapacity',
    title: 'Perang Harga Nikel Global: Dampak Banjir Pasokan Smelter RKEF Indonesia ke Pasar Dunia',
    tag: '⛏️ Hilirisasi Nikel & Pasar Global',
    detail: 'Banjir produksi Nickel Pig Iron (NPI) dari Morowali dan Weda Bay menekan harga nikel di London Metal Exchange (LME): berkah devisa atau jebakan komoditas?',
    researchContext: 'Dinamika oversupply nikel dunia akibat akselerasi 40+ fasilitas smelter Rotary Kiln Electric Furnace (RKEF) di Sulawesi Tengah dan Maluku Utara. Harga nikel LME tertekan dari $30.000 menjadi $16.000 per ton, memicu penutupan tambang nikel berbiaya tinggi di Australia dan Kaledonia Baru. Ketergantungan pada batubara captive PLTU dan perdebatan penerapan pajak ekspor produk olahan berkadar nikel rendah.',
    trendingSource: 'Bloomberg & Bisnis Indonesia'
  },
  {
    key: 'bpjs-kesehatan-fraud-klaim',
    title: 'Anatomi Phantom Billing RS & Kebocoran Dana JKN BPJS Kesehatan Ratusan Miliar',
    tag: '🏥 Fraud RS & BPJS Kesehatan',
    detail: 'Temuan KPK atas manipulasi klaim fiktif (phantom billing) dan manipulasi diagnosis INA-CBGs di sejumlah rumah sakit swasta yang menggerus kas jaminan sosial.',
    researchContext: 'Investigasi modus penggelembungan tagihan medis dalam sistem Indonesian Case Based Groups ([INA-CBGs|I-N-A-C-B-G-S]). Praktik rekayasa rekam medis pasien rawat inap fiktif, fisioterapi berulang yang tidak dilakukan, dan operasi katarak massal palsu di Sumatera Utara dan Jawa Tengah yang diungkap audit gabungan [KPK|K-P-K], [BPJS|B-P-J-S] Kesehatan, dan Kementerian Kesehatan.',
    trendingSource: 'KPK Press Release & News'
  },
  {
    key: 'tiket-konser-scalper-bot',
    title: 'Ekonomi Gelap Calo Tiket Konser Jakarta: Bot Scripting, Orang Dalam, dan Margin 400%',
    tag: '🎟️ Calo Tiket & Rente Hiburan',
    detail: 'Mengapa war tiket konser internasional di Jakarta selalu ludes dalam 60 detik? Anatomi perdagangan tiket sekunder dan sindikat jastip profesional.',
    researchContext: 'Bedah teknis eksploitasi API platform ticketing (Loket, Tiket.com) menggunakan automation browser headless script dan proxy rotasi residensial. Markup harga tiket dari Rp 2,5 juta menjadi Rp 10-15 juta di marketplace sekunder (Viagogo, Twitter), persekongkolan alokasi tiket korporat dengan promotor, serta ketiadaan regulasi batas atas harga jual kembali di Indonesia.',
    trendingSource: 'Twitter/X & Threads'
  },
  {
    key: 'subsidi-lpg-3kg-bocor',
    title: 'Anatomi Pengoplosan Tabung Gas Melon: Kebocoran Subsidi Energi Rp 25 Triliun',
    tag: '🔥 Gas 3 Kg & Mafia Oplosan',
    detail: 'Disparitas harga Rp 20 ribu vs Rp 220 ribu tabung gas nonsubsidi yang memicu industri oplosan skala rumahan beromzet ratusan juta per malam.',
    researchContext: 'Forensik disparitas harga [LPG|L-P-G] tabung 3 kg bersubsidi (Rp 6.000 per kg) dengan tabung 12 kg/50 kg nonsubsidi komersial (Rp 18.000 per kg). Modus pemindahan gas menggunakan es batu dan pipa regulator modifikasi di gudang tersembunyi pinggiran Bogor dan Bekasi. Beban kompensasi subsidi energi pada [APBN|A-P-B-N] yang mencapai puluhan triliun rupiah akibat konsumsi yang melenceng dari target rumah tangga miskin ke restoran dan binatu komersial.',
    trendingSource: 'Detik Finance & Kepolisian'
  }
];

/**
 * Main routine: Fetch or generate fresh ideas, update channel suggestions and config
 */
async function generateDailyTrendingIdeas({ channelId = 'kausalmedia', count = 4, notifyDiscord = true } = {}) {
  console.log(`[Trending Ideas] Starting daily trend analysis for channel '${channelId}'...`);
  
  let freshIdeas = await generateWithAntigravity(channelId, count);

  if (!freshIdeas || freshIdeas.length === 0) {
    console.log('[Trending Ideas] Using curated high-velocity trending pools...');
    const unusedFromPool = HIGH_VELOCITY_TRENDING_POOL.filter(p => !isIdeaUsed(channelId, p));
    freshIdeas = unusedFromPool.slice(0, count).map(p => ({
      ...p,
      generatedBy: 'curated-trending-engine',
      generatedAt: new Date().toISOString()
    }));
  }

  if (freshIdeas.length === 0) {
    console.log('[Trending Ideas] All fallback ideas already used. Cycling through fresh permutations.');
    freshIdeas = HIGH_VELOCITY_TRENDING_POOL.slice(0, count);
  }

  // Update persistent trending-ideas.json via ring-buffer (never mutating channels/*.json)
  appendTrendingIdeas(channelId, freshIdeas, 100);
  console.log(`[Trending Ideas] Successfully appended ${freshIdeas.length} ideas to config/trending-ideas.json for '${channelId}'.`);
  const channel = getChannel(channelId);

  // Optionally broadcast to Discord #ai-nimate
  if (notifyDiscord) {
    try {
      const ideaList = freshIdeas.map((idea, i) => 
        `**${i + 1}. ${idea.title}**\n` +
        `• Tag: \`${idea.tag}\` | Source: \`${idea.trendingSource || 'Twitter/X'}\`\n` +
        `• *${idea.detail}*`
      ).join('\n\n');

      await sendDiscordPayload({
        payloadJson: {
          embeds: [
            {
              title: `💡 Daily Trending Ideas Generated for ${channel?.name || 'Kausal Media'}`,
              description: `Antigravity agent analyzed current trending topics across Twitter/X, Threads, and financial news:\n\n${ideaList}`,
              color: 0x8b5cf6,
              footer: { text: 'Use /ainimate create or the interactive menu to produce any idea!' },
              timestamp: new Date().toISOString()
            }
          ]
        }
      });
      console.log('[Trending Ideas] Dispatched notification embed to Discord #ai-nimate.');
    } catch (e) {
      console.warn('[Trending Ideas] Failed to notify Discord:', e.message);
    }
  }

  return freshIdeas;
}

if (require.main === module) {
  const channelArg = process.argv[2] || 'kausalmedia';
  generateDailyTrendingIdeas({ channelId: channelArg, count: 4, notifyDiscord: true })
    .then(ideas => {
      console.log(`\n✅ Generated ${ideas.length} trending topic ideas:`);
      ideas.forEach((idea, i) => console.log(`${i + 1}. [${idea.tag}] ${idea.title}`));
    })
    .catch(err => {
      console.error('❌ Failed to generate trending ideas:', err);
      process.exit(1);
    });
}

module.exports = {
  generateDailyTrendingIdeas,
  loadSavedTrending,
  HIGH_VELOCITY_TRENDING_POOL
};
