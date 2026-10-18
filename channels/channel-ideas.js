/**
 * AI-nimate Channel Topic Idea Tracker & Dynamic Weekly Generator
 * 
 * Manages channel-specific topic pools, filters out already used/produced topics,
 * and dynamically generates fresh, culturally relevant, deeply researched topics
 * so that every channel always presents at least 4 unused ideas for the week with a Refresh/Reroll button.
 */

const fs = require('fs');
const path = require('path');
const { getChannel, saveChannel } = require('./channel-manager');

const REPO_ROOT = path.resolve(__dirname, '..');
const USED_TOPICS_FILE = path.join(REPO_ROOT, 'config', 'used-topics.json');
const TRENDING_IDEAS_FILE = path.join(REPO_ROOT, 'config', 'trending-ideas.json');
const WORKFLOWS_FILE = path.join(REPO_ROOT, 'projects', 'workflows.json');

function ensureConfigDir() {
  const dir = path.dirname(USED_TOPICS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadTrendingFile() {
  if (!fs.existsSync(TRENDING_IDEAS_FILE)) return {};
  try {
    const raw = fs.readFileSync(TRENDING_IDEAS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return (data && typeof data === 'object') ? data : {};
  } catch (_) {
    return {};
  }
}

function saveTrendingFile(data) {
  ensureConfigDir();
  const tmpPath = `${TRENDING_IDEAS_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, TRENDING_IDEAS_FILE);
}

function loadUsedTopics() {
  if (!fs.existsSync(USED_TOPICS_FILE)) return {};
  try {
    const raw = fs.readFileSync(USED_TOPICS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return (data && typeof data === 'object') ? data : {};
  } catch (_) {
    return {};
  }
}

function saveUsedTopics(map) {
  ensureConfigDir();
  fs.writeFileSync(USED_TOPICS_FILE, JSON.stringify(map, null, 2), 'utf8');
}

/**
 * Mark a topic idea as used for a given channel
 */
function markIdeaUsed(channelId, ideaKey) {
  if (!channelId || !ideaKey) return;
  const map = loadUsedTopics();
  if (!Array.isArray(map[channelId])) {
    map[channelId] = [];
  }
  if (!map[channelId].includes(ideaKey)) {
    map[channelId].push(ideaKey);
    saveUsedTopics(map);
  }
}

/**
 * Check if an idea has already been used in workflows or past projects
 */
function isIdeaUsed(channelId, idea) {
  if (!idea) return false;
  const key = typeof idea === 'string' ? idea : idea.key;
  const title = typeof idea === 'object' ? idea.title : '';

  // 1. Check persistent used-topics.json
  const map = loadUsedTopics();
  if (Array.isArray(map[channelId]) && map[channelId].includes(key)) {
    return true;
  }

  // 2. Check workflow ledger
  if (fs.existsSync(WORKFLOWS_FILE)) {
    try {
      const raw = fs.readFileSync(WORKFLOWS_FILE, 'utf8');
      const workflows = JSON.parse(raw);
      if (Array.isArray(workflows)) {
        for (const wf of workflows) {
          if (wf.ideaKey && wf.ideaKey === key) return true;
          if (wf.project && key && wf.project.includes(key)) return true;
          if (title && wf.topic) {
            const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanWf = wf.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanTitle.length > 10 && cleanWf.includes(cleanTitle.slice(0, 18))) return true;
          }
        }
      }
    } catch (_) {}
  }

  // 3. Check existing project directories
  const slug = (key || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (slug) {
    const projDir = path.join(REPO_ROOT, 'projects', slug);
    if (fs.existsSync(projDir)) return true;
  }

  return false;
}

/**
 * Deeply researched curated topic pools with rich financial and cultural context
 */
const CHANNEL_IDEA_POOLS = {
  kausalmedia: [
    {
      key: 'carwash-laundering',
      title: 'Misteri Cuci Mobil Hidrolik & Perputaran Cash Gelap di Jakarta',
      tag: '🧼 Cuci Mobil & Cash Flow',
      detail: 'Investigasi di balik menjamurnya bisnis cuci mobil steam manual hidrolik di pinggir jalan Jakarta: perputaran uang tunai harian ratusan juta rupiah tanpa jejak digital.',
      researchContext: 'Menelusuri ekonomi kas riil tempat cuci steam manual hidrolik di koridor Kalimalang, Daan Mogot, dan Bekasi. Omzet tunai Rp 150-200 juta per bulan per 6 hidrolik, margin kotor 65% dengan biaya operasional minim (hanya sabun dan kompresor air), tanpa pencatatan pajak digital EDC/QRIS. Pembongkaran mekanisme bagaimana bisnis kas intensif kerap dimanfaatkan sebagai instrumen integrasi uang tunai non-bank di ekosistem urban Jakarta.'
    },
    {
      key: 'bumn-karya-debt',
      title: 'Anatomi Utang Rp 130 Triliun BUMN Karya & Krisis Subkontraktor',
      tag: '🏗️ BUMN & Utang Mega-Proyek',
      detail: 'Kajian krisis likuiditas Waskita dan Wijaya Karya: bagaimana penugasan infrastruktur agresif memicu jeratan utang sindikasi bank Himbara dan penundaan pembayaran ribuan vendor lokal.',
      researchContext: 'Analisis laporan keuangan Waskita Karya dan Wijaya Karya di [BEI|B-E-I]. Rasio utang terhadap ekuitas [DER|D-E-R] menembus di atas 400%, beban bunga tahunan menyentuh triliunan rupiah melampaui laba operasional. Efek domino terhadap ribuan subkontraktor swasta dan [UMKM|U-M-K-M] yang tagihannya tertahan hingga bertahun-tahun, serta siasat restrukturisasi utang perbankan pemerintah melalui [PKPU|P-K-P-U].'
    },
    {
      key: 'rokok-ilegal-cukai',
      title: 'Skandal Rokok Ilegal Rp 10 Ribu & Kebocoran Cukai Rp 15 Triliun',
      tag: '🚬 Rokok Ilegal & Cukai',
      detail: 'Ledakan rokok polos tanpa pita cukai resmi pasca kenaikan tarif CHT berturut-turut: disparitas harga Rp 40 ribu vs Rp 10 ribu yang melumpuhkan kas negara.',
      researchContext: 'Investigasi fenomena Kurva Laffer pada cukai hasil tembakau (CHT) di Indonesia. Kenaikan tarif cukai 10% rata-rata per tahun memicu lonjakan konsumsi rokok ilegal tanpa pita cukai resmi dari 5% menjadi lebih dari 12% pangsa pasar. Penyelundupan melalui truk logistik kamuflase bahan pangan dari sentra Jawa Tengah ke Jabodetabek dan Sumatera, menyebabkan potensi kebocoran penerimaan [APBN|A-P-B-N] lebih dari Rp 15 triliun per tahun.'
    },
    {
      key: 'ev-china-vs-jepang',
      title: 'Perang Mobil Listrik China vs Hegemoni 50 Tahun Mobil Jepang',
      tag: '🚗 Perang EV China vs Jepang',
      detail: 'Disrupsi agresif produsen EV Tiongkok (BYD, Wuling, Chery) terhadap dominasi setengah abad Toyota dan Honda di segmen mobil keluarga Jakarta.',
      researchContext: 'Analisis perang harga kendaraan listrik (EV) di Jabodetabek. Strategi integrasi baterai vertikal produsen China menawarkan fitur premium di bawah Rp 300 juta, mematahkan formula value-for-money pabrikan Jepang (Avanza, Innova). Pertarungan nilai depresiasi purna jual di bursa mobil bekas WTC Mangga Dua dan tantangan jaringan fast charging di jalan tol Trans-Jawa.'
    },
    {
      key: 'parkir-liar-minimarket',
      title: 'Anatomi Rente Parkir Liar Minimarket & Kekuasaan Ruang Publik Jakarta',
      tag: '🅿️ Rente Parkir Liar',
      detail: 'Mengapa plang gratis parkir minimarket selalu dijaga jukir liar? Menelusuri rantai setoran tunai harian ke ormas lokal bernilai miliaran rupiah per bulan.',
      researchContext: 'Kajian sosiologi ekonomi di balik 18.000 gerai minimarket di Jabodetabek. Meskipun minimarket membayar pajak parkir resmi ke pemda, kehadiran juru parkir liar tetap tak tersentuh. Perputaran uang receh Rp 2.000 per motor menghasilkan estimasi Rp 300-500 ribu per titik per hari, yang mengalir terstruktur ke koordinator wilayah dan ormas lokal, menciptakan ekonomi rente ruang publik yang resisten terhadap penertiban.'
    },
    {
      key: 'warung-madura-24jam',
      title: 'Ekonomi Warung Madura 24 Jam: Rahasia Menaklukkan Minimarket Modern',
      tag: '🏪 Warung Madura 24 Jam',
      detail: 'Bagaimana warung kelontong tradisional Madura mampu mengalahkan jaringan ritel korporasi raksasa lewat efisiensi keluarga, pom mini, dan jam operasional nonstop.',
      researchContext: 'Bedah model bisnis paguyuban warung kelontong Madura di Jabodetabek. Skema bagi hasil 60:40 antara pemilik modal dan pengelola keluarga, zero overhead korporasi, serta diversifikasi bensin eceran Pom Mini Pertalite dan beras kiloan. Keunggulan komparatif fleksibilitas jam buka 24 jam yang bahkan memicu desakan regulasi jam operasional dari asosiasi pedagang ritel modern.'
    },
    {
      key: 'sewa-apartemen-zombie',
      title: 'Fenomena Menara Apartemen Hantu & Ilusi Investasi Properti Jakarta',
      tag: '🏢 Apartemen Hantu Jakarta',
      detail: 'Ribuan unit apartemen strata-title di Jakarta kosong tak berpenghuni: bagaimana janji passive income pengembang berubah menjadi jebakan biaya pemeliharaan.',
      researchContext: 'Investigasi tingkat keterisian (okupansi) apartemen kelas menengah di koridor TB Simatupang, Ciputat, dan Bekasi yang berada di bawah 35%. Pembeli ritel terperangkap cicilan [KPA|K-P-A] dan iuran pengelolaan lingkungan ([IPL|I-P-L]) Rp 1,5-2,5 juta per bulan, sementara harga sewa pasar tertekan akibat kelebihan pasokan (oversupply) 50.000 unit residensial vertikal pasca-pandemi.'
    },
    {
      key: 'galon-sekali-pakai',
      title: 'Perang Air Galon Sekali Pakai vs Galon Polikarbonat di Jabodetabek',
      tag: '💧 Perang Galon Air AMDK',
      detail: 'Di balik kampanye bahaya BPA dan perang regulasi BPOM: perebutan kue pasar air minum dalam kemasan bernilai Rp 40 triliun per tahun.',
      researchContext: 'Pertarungan industri antara produsen galon guna ulang polikarbonat (Aqua) melawan disrupsi galon sekali pakai PET (Le Minerale). Lobi regulasi pelabelan potensi bahaya Bisphenol-A ([BPA|B-P-A]) oleh [BPOM|B-P-O-M], perang kampanye lingkungan di media sosial, dan kalkulasi logistik rantai pasok depo air minum di Jakarta.'
    },
    {
      key: 'beras-impor-panen',
      title: 'Skandal Impor Beras di Tengah Panen Raya & Anatomi Rente Pangan',
      tag: '🌾 Skandal Impor Beras',
      detail: 'Mengapa kapal impor beras jutaan ton selalu sandar di pelabuhan Tanjung Priok saat petani lokal panen raya? Anatomi disparitas harga Bulog vs pasar.',
      researchContext: 'Analisis rantai pasok perberasan nasional. Disparitas tajam antara harga gabah kering panen ([GKP|G-K-P]) petani Rp 6.500 per kg dengan beras medium pasar Rp 15.000 per kg. Permainan waktu penerbitan kuota impor oleh Kementerian Perdagangan dan penugasan Bulog, keuntungan selisih harga impor murah dari Vietnam dan Thailand, serta dampaknya pada disinsentif produksi pertanian domestik.'
    },
    {
      key: 'kopi-scbd-bubble',
      title: 'Jebakan Gaya Hidup Kopi Rp 80 Ribu & Fenomena Miskin Gaya Pekerja SCBD',
      tag: '☕ Kopi Rp 80 Ribu SCBD',
      detail: 'Margin kotor 80% sirup gula aren vs biaya sewa Rp 75 juta/bulan di segitiga emas Jakarta yang menggerus tabungan kelas pekerja muda berpenghasilan dua digit.',
      researchContext: 'Ekonomi mikro gaya hidup kelas pekerja korporat di SCBD dan Kuningan. Pengeluaran konsumtif harian kopi artisan Rp 50-80 ribu per cup, sewa kos eksklusif Rp 4-6 juta, dan cicilan gadget flagship yang menghabiskan 85% gaji bersih bulanan. Kontras tajam antara ilusi kemakmuran visual di media sosial dengan saldo tabungan riil generasi muda pekerja kantoran Jakarta.'
    },
    {
      key: 'spbu-swasta-vs-pertamina',
      title: 'Perang SPBU Asing vs Monopoli Subsidi Pertamina di Jalur Protokol',
      tag: '⛽ SPBU Asing vs Pertamina',
      detail: 'Mengapa jaringan SPBU swasta internasional (Shell, BP-AKR, Vivo) kesulitan bertahan menghadapi subsidi Pertalite dan regulasi harga BBM pemerintah.',
      researchContext: 'Forensik margin bisnis hilir migas di Indonesia. Disparitas harga bahan bakar RON 90 dan 92 antara Pertamina yang disubsidi kompensasi negara dengan SPBU swasta yang harus menjual pada harga keekonomian riil. Gelombang penutupan gerai SPBU swasta di Jawa Barat dan tekanan likuiditas operator distribusi bahan bakar swasta.'
    },
    {
      key: 'mafia-tanah-girik',
      title: 'Siasat Mafia Tanah: Girik Kuno vs Sertifikat Ganda Pinggiran Jakarta',
      tag: '📜 Sengketa Girik Mafia Tanah',
      detail: 'Modus operandi pemalsuan girik zaman kolonial, warkah hilang di kantor pertanahan BPN, dan sengketa lahan proyek strategis bernilai triliunan rupiah.',
      researchContext: 'Investigasi sengketa kepemilikan tanah di kawasan penyangga Jakarta (Tangerang, Bekasi, Depok). Modus rekayasa silsilah waris, penerbitan sertifikat hak milik ganda oleh oknum aparatur pertanahan [BPN|B-P-N], dan eksekusi pengosongan lahan kilat melalui putusan verstek pengadilan negeri yang merugikan warga pemilik sah.'
    }
  ],
  idxforensic: [
    {
      key: 'bumn-karya-debt',
      title: 'Anatomi Utang BUMN Karya & Restrukturisasi Finansial',
      tag: '🏗️ BUMN & Utang Bank',
      detail: 'Investigasi rasio utang terhadap ekuitas pada kontraktor infrastruktur BUMN, sindikasi perbankan Himbara, dan skema restrukturisasi PKPU.',
      researchContext: 'Analisis laporan audit emiten konstruksi BUMN di [BEI|B-E-I]. Neraca utang jangka pendek obligasi, haircut nilai utang hingga 60% dalam homologasi pengadilan niaga, dan implikasinya terhadap stabilitas modal bank pemerintah.'
    },
    {
      key: 'rights-issue-dilution',
      title: 'Strategi Rights Issue & Bahaya Dilusi Saham Ritel',
      tag: '📈 Pasar Modal & HMETD',
      detail: 'Mekanisme pengenceran kepemilikan saham ritel, kalkulasi harga teoritis TERP, dan jebakan aksi korporasi diskon nominal.',
      researchContext: 'Bedah matematis penerbitan Hak Memesan Efek Terlebih Dahulu ([HMETD|H-M-E-T-D]). Formula perhitungan Theoretical Ex-Rights Price ([TERP|Terp]), rasio dilusi hingga 80% bagi pemegang saham publik yang tidak menebus hak, dan modus backdoor listing pembeli siaga terafiliasi.'
    },
    {
      key: 'dividend-trap-komoditas',
      title: 'Jebakan Dividen Jumbo Emiten Komoditas & Koreksi Harga Cum-Date',
      tag: '💰 Dividend Trap Batu Bara',
      detail: 'Mengapa pemburu dividen jumbo batu bara sering berakhir rugi modal puluhan persen akibat kejatuhan harga saham pasca tanggal cum-date.',
      researchContext: 'Analisis perilaku pasar saham siklikal energi di [BEI|B-E-I]. Penurunan tajam harga saham pada tanggal ex-date yang melampaui persentase yield dividen tunai, siklus harga komoditas global, dan strategi lindung nilai bagi pemodal institusi.'
    },
    {
      key: 'backdoor-listing-cangkang',
      title: 'Rekayasa Akuisisi Perusahaan Cangkang & Backdoor Listing di BEI',
      tag: '🐚 Backdoor Listing Cangkang',
      detail: 'Forensik trik emiten tidur yang tiba-tiba berganti pengendali bisnis baru tanpa melalui proses ketat Initial Public Offering (IPO).',
      researchContext: 'Pola reverse takeover emiten berkapitalisasi pasar kecil di bursa efek. Perubahan bidang usaha utama, injeksi aset tambang atau properti dengan valuasi di-markup, dan pengalihan kepemilikan saham publik tanpa mekanisme tender offer yang adil.'
    },
    {
      key: 'bank-zombie-syndicate',
      title: 'Skandal Kredit Macet & Pinjaman Sindikasi Grup Konglomerat',
      tag: '🏦 Perbankan & NPL Zombie',
      detail: 'Forensik aliran kredit jumbo perbankan nasional ke anak usaha konglomerasi bermasalah tanpa jaminan kolateral riil memadai.',
      researchContext: 'Penelusuran non-performing loan ([NPL|N-P-L]) tersembunyi melalui skema restrukturisasi evergreening pinjaman perbankan. Praktik pemberian plafon baru untuk membayar bunga pinjaman lama demi menghindari pencatatan provisi cadangan kerugian penurunan nilai ([CKPN|C-K-P-N]).'
    },
    {
      key: 'pkpu-restructuring-game',
      title: 'Siasat PKPU & Penundaan Kewajiban Pembayaran Utang Emiten Gagal Bayar',
      tag: '⚖️ Siasat PKPU & Haircut',
      detail: 'Bagaimana instrumen restrukturisasi utang pengadilan niaga kerap dimanfaatkan debitur nakal untuk memangkas tagihan kreditur hingga 80 persen.',
      researchContext: 'Studi kasus proses Penundaan Kewajiban Pembayaran Utang ([PKPU|P-K-P-U]) di Pengadilan Niaga. Permainan suara kreditur separatis vs konkuren, rekayasa kreditur fiktif untuk memenangkan voting proposal perdamaian, dan dampak pemotongan pokok utang (haircut) bagi investor obligasi ritel.'
    },
    {
      key: 'ipo-valuation-bubble',
      title: 'Ilusi Valuasi IPO Teknologi & Kerugian Investor Publik',
      tag: '⚡ Unicorn & Kerugian IPO',
      detail: 'Kajian devaluasi pasca-IPO emiten teknologi di Bursa Efek Indonesia, arus keluar modal ventura, dan dampaknya pada IHSG.',
      researchContext: 'Forensik prospektus penawaran umum perdana unicorn teknologi di [BEI|B-E-I]. Model valuasi discounted cash flow yang terlalu agresif, klausul lock-up saham investor awal, dan aksi jual bersih institusi asing yang memicu koreksi nilai hingga 75% dari harga perdana.'
    },
    {
      key: 'window-dressing-anatomi',
      title: 'Anatomi Window Dressing Akhir Tahun & Manipulasi Saham Lapis Tiga',
      tag: '📊 Window Dressing Saham',
      detail: 'Mekanisme manajer investasi memoles laporan kinerja reksadana jelang tutup tahun dengan mengerek harga saham-saham likuiditas tipis.',
      researchContext: 'Rekayasa pembentukan harga penutupan di bursa efek jelang akhir kuartal. Transaksi silang (crossing) di pasar negosiasi, pembelokan nilai aktiva bersih ([NAB|N-A-B]) reksadana, dan risiko pembalikan harga (reversal) tajam pada awal tahun perdagangan berikutnya.'
    }
  ],
  shortslab: [
    {
      key: 'kopi-scbd-fomo',
      title: 'Perangkap Gaya Hidup: Kopi 80 Ribu & Gaji SCBD',
      tag: '☕ Kopi 80 Ribu SCBD',
      detail: 'Kajian pengeluaran mikro konsumtif harian di kawasan perkantoran Jakarta yang menggerus tabungan hingga nol di akhir bulan.',
      researchContext: 'Hitung-hitungan psikologi pengeluaran mikro kelas pekerja muda SCBD: Rp 80.000 kopi + Rp 60.000 makan siang artisan = Rp 3,5 juta per bulan hanya untuk gengsi sosial harian.'
    },
    {
      key: 'pinjol-paylater-trap',
      title: 'Jebakan Algoritma Paylater & Skor Kredit Generasi Muda',
      tag: '📱 Jebakan Paylater',
      detail: 'Bagaimana kemudahan cicilan instan bunga majemuk merusak skor SLIK OJK anak muda sebelum usia 25 tahun.',
      researchContext: 'Algoritma micro-lending paylater yang memancing impuls pembelian barang konsumtif non-esensial. Bunga harian majemuk 0,3% yang terakumulasi menjadi bunga efektif 100%+ per tahun dan pemblokiran pengajuan KPR masa depan.'
    },
    {
      key: 'tiket-konser-war',
      title: 'Ekonomi Tiket Konser & Skema Calo Digital Bot',
      tag: '🎫 Calo Tiket Bot Konser',
      detail: 'Di balik layar sindikat tiket konser internasional di Jakarta: otomatisasi bot transaksi dan markup harga hingga 400 persen.',
      researchContext: 'Mekanisme bot script otomatisasi checkout gateway tiket konser. Sindikat calo digital yang memborong kuota tiket dalam 3 detik dan menjual kembali di platform sekunder dengan kenaikan harga ekstrem.'
    },
    {
      key: 'blindbox-popmart-loop',
      title: 'Jebakan Dopamin Blind Box & Ekonomi Koleksi Karakter Viral',
      tag: '🧸 Demam Blind Box Popmart',
      detail: 'Psikologi di balik antrean berjam-jam kotak misteri mainan: mekanisme dopamin judi berkedok hobi estetika anak muda.',
      researchContext: 'Analisis bisnis blind box Popmart dan Labubu. Sistem probabilitas secret figure 1:72 atau 1:144 yang meniru psikologi mesin slot kasino, memicu pembelian adiktif berulang demi validasi unboxing media sosial.'
    },
    {
      key: 'franchise-minuman-rontok',
      title: 'Mengapa Franchise Minuman Viral Selalu Gulung Tikar di Bulan Keenam?',
      tag: '🧋 Kutukan Franchise Viral',
      detail: 'Model bisnis kemitraan waralaba yang menguntungkan pemilik master franchise tapi mematikan mitra modal pas-pasan.',
      researchContext: 'Anatomi skema franchise minuman boba/es teh viral. Master franchise meraup margin dari biaya paket kemitraan awal Rp 50-100 juta dan pasokan bahan baku wajib bertarif tinggi, sementara omzet mitra rontok pasca tren media sosial mereda.'
    },
    {
      key: 'gaji-dua-digit-sandwich',
      title: 'Dilema Generasi Sandwich Jakarta: Gaji Dua Digit Tabungan Nol',
      tag: '🥪 Generasi Sandwich Jakarta',
      detail: 'Beban ganda menopang biaya hidup orang tua pensiun sekaligus merintis keluarga mandiri di tengah inflasi gaya hidup kota.',
      researchContext: 'Beban finansial generasi sandwich di kota metropolitan. Alokasi 40% penghasilan untuk biaya kesehatan orang tua tanpa asuransi dan sekolah anak, menyisakan zero saving rate meski bergaji di atas UMR.'
    }
  ],
  nusantaraarchive: [
    {
      key: 'rokok-ilegal-cukai',
      title: 'Investigasi Rokok Ilegal Rp 10 Ribu & Skandal Kebocoran Cukai',
      tag: '🚬 Rokok Ilegal Cukai',
      detail: 'Jaringan logistik penyelundupan rokok tanpa pita cukai resmi dari sentra produksi Jawa Tengah menuju pelosok Sumatera dan dampaknya pada penerimaan negara.',
      researchContext: 'Sejarah dan evolusi industri hasil tembakau rakyat di Pulau Jawa. Peralihan dari linting rokok klobot tradisional menuju industri mesin ilegal modern berkecepatan tinggi, dan pertempuran pengawasan bea cukai di pelabuhan tikus Selat Malaka.'
    },
    {
      key: 'impor-beras-panen',
      title: 'Ironi Impor Beras & Permainan Waktu Panen Raya Petani',
      tag: '🌾 Skandal Impor Beras',
      detail: 'Mengapa kapal impor beras selalu sandar di pelabuhan Tanjung Priok tepat saat petani lokal panen raya? Anatomi disparitas harga Bulog vs pasar.',
      researchContext: 'Dokumentasi arsip kebijakan tata niaga beras nasional sejak era Orde Baru hingga reformasi. Monopoli distribusi logistik Bulog, harga eceran tertinggi ([HET|H-E-T]), dan ketergantungan musiman pada beras impor Asia Tenggara.'
    },
    {
      key: 'mafia-minyak-goreng',
      title: 'Anatomi Krisis Minyak Goreng di Lumbung Sawit Terbesar Dunia',
      tag: '🌴 Krisis Minyak Goreng CPO',
      detail: 'Paradoks kelangkaan minyak goreng curah di Indonesia pada saat harga CPO dunia melambung tinggi: permainan izin ekspor dan manipulasi kuota.',
      researchContext: 'Investigasi kebijakan Domestic Market Obligation ([DMO|D-M-O]) kelapa sawit tahun 2022. Disparitas harga pasar internasional CPO vs harga patokan domestik yang memicu penimbunan dan persidangan korupsi ekspor minyak goreng.'
    },
    {
      key: 'monopoli-garam-nasional',
      title: 'Paradoks Impor Garam di Negara Maritim Terbesar Kedua Dunia',
      tag: '🧂 Rente Impor Garam',
      detail: 'Mengapa industri manufaktur pangan dan farmasi Indonesia menolak garam rakyat lokal Madura dan bergantung penuh pada impor Australia?',
      researchContext: 'Kajian teknis dan ekonomi garam nasional. Standar kemurnian NaCl di atas 97% yang disyaratkan industri manufaktur kimia dan farmasi yang belum mampu dipenuhi teknologi tambak kristalisasi tradisional petambak garam Madura.'
    },
    {
      key: 'krisis-kedelai-tempe',
      title: 'Mengapa Pangan Pokok Tempe Indonesia 90 Persen Bergantung Impor?',
      tag: '🥢 Ketergantungan Kedelai',
      detail: 'Anatomi kegagalan swasembada kedelai lokal selama tiga dekade dan ketergantungan rapuh industri tahu-tempe pada panen petani Amerika.',
      researchContext: 'Sejarah panjang impor kedelai sub-tropis transgenik (GMO) Amerika Serikat ke sentra perajin tempe Primkopti di seluruh Jawa. Komparasi biaya tanam kedelai lokal vs kedelai mekanis berskala ribuan hektar di Midwest AS.'
    }
  ]
};

/**
 * Procedurally generate fresh unique ideas for a channel if pool is depleted
 */
function generateProceduralIdeas(channelId, countNeeded, existingKeys) {
  const generated = [];
  const ts = Date.now().toString(36).slice(-4);

  const topicTemplates = [
    {
      prefix: 'Investigasi Rantai Pasok',
      topic: 'Bahan Baku Kritis & Ketergantungan Impor Monopolistik di Indonesia',
      tag: '📦 Rantai Pasok Kritis',
      detail: 'Penelusuran mendalam mekanisme distorsi harga distributor tunggal dan dampaknya terhadap biaya pokok produksi industri hilir nasional.',
      researchContext: 'Meneliti struktur pasar oligopoli pasokan bahan baku industri manufaktur di Jabodetabek dan Surabaya. Analisis margin perantara perdagangan besar, regulasi kuota Kementerian Perdagangan, dan beban biaya logistik antar-pulau.'
    },
    {
      prefix: 'Anatomi Rente Ekonomi',
      topic: 'Tata Kelola Izin Konsesi & Dampak Sistemik bagi Pelaku Usaha Lokal',
      tag: '📑 Rente Konsesi Usaha',
      detail: 'Bedah regulasi transaksional dan bagaimana pembagian kuota terbatas menciptakan keuntungan abnormal bagi segelintir konglomerasi.',
      researchContext: 'Pembongkaran ekonomi rente pemberian izin usaha pertambangan dan perkebunan di daerah. Bagaimana biaya kepatuhan regulasi formal dieksploitasi untuk menyingkirkan pelaku usaha kecil dan menciptakan barrier to entry.'
    },
    {
      prefix: 'Forensik Perputaran Kas',
      topic: 'Sistem Pembayaran Tunai & Transaksi Bayangan Perkotaan Jakarta',
      tag: '💵 Forensik Transaksi Kas',
      detail: 'Menganalisis bagaimana perputaran uang tunai tanpa faktur elektronik bertahan di tengah penetrasi digitalisasi perbankan modern.',
      researchContext: 'Studi sosiologis dan finansial pasar grosir Tanah Abang dan Mangga Dua. Aliran dana tunai tanpa sistem EDC perbankan, perputaran giro mundur, dan kalkulasi penghindaran pajak pertambahan nilai ([PPN|P-P-N]).'
    },
    {
      prefix: 'Dilema Kebijakan Publik',
      topic: 'Subsidi Energi vs Efisiensi Anggaran Kas Negara di Jalur Logistik',
      tag: '⚖️ Subsidi vs Anggaran',
      detail: 'Kajian komparatif antara beban kompensasi APBN, daya beli kelas menengah rentan, dan keberlanjutan fiskal jangka panjang.',
      researchContext: 'Simulasi dampak kenaikan harga bahan bakar solar dan pertalite bersubsidi terhadap inflasi pangan pokok dan tarif angkutan ekspedisi logistik di jalan tol dan pelabuhan nasional.'
    }
  ];

  for (let i = 0; i < countNeeded; i++) {
    const tpl = topicTemplates[i % topicTemplates.length];
    const key = `gen-${channelId}-${i + 1}-${ts}`;
    if (!existingKeys.includes(key)) {
      generated.push({
        key,
        title: `${tpl.prefix}: ${tpl.topic}`,
        tag: `${tpl.tag}`,
        detail: tpl.detail,
        researchContext: tpl.researchContext,
        isGenerated: true
      });
    }
  }

  return generated;
}

/**
 * Retrieve trending ideas for a channel from config/trending-ideas.json
 * @param {string} channelId
 * @returns {Array<{ id: string, title: string, angle: string, variant: string, createdAt: string }>}
 */
function getTrendingIdeas(channelId = 'kausalmedia') {
  const targetId = String(channelId || 'kausalmedia').toLowerCase().replace(/\.json$/, '');
  const data = loadTrendingFile();
  if (data && Array.isArray(data[targetId])) {
    return data[targetId];
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * Append fresh ideas to config/trending-ideas.json with a FIFO max cap per channel
 * Ring-buffer rule: deduplicates by normalized title, prepends newIdeas, slices to maxCap,
 * and writes atomically to config/trending-ideas.json. Never writes to channels/*.json.
 * @param {string} channelId
 * @param {Array<Object>} newIdeas
 * @param {number} maxCap
 * @returns {Array<Object>}
 */
function appendTrendingIdeas(channelId = 'kausalmedia', newIdeas = [], maxCap = 100) {
  const targetId = String(channelId || 'kausalmedia').toLowerCase().replace(/\.json$/, '');
  const rawData = loadTrendingFile();
  let data = rawData;
  if (Array.isArray(rawData)) {
    data = { kausalmedia: rawData };
  } else if (!data || typeof data !== 'object') {
    data = {};
  }

  const existing = Array.isArray(data[targetId]) ? data[targetId] : [];
  const normalizedNew = (Array.isArray(newIdeas) ? newIdeas : [newIdeas]).filter(Boolean).map(item => {
    const title = (item.title || item.topic || '').trim();
    const key = item.key || item.id || `gen-${targetId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: item.id || key,
      key,
      title,
      angle: item.angle || item.detail || item.researchContext || '',
      variant: item.variant || (targetId === 'nusantaraarchive' ? 'chronicle-archive' : 'forensic-autopsy'),
      tag: item.tag || '📊 Trending Topic',
      detail: item.detail || item.angle || '',
      researchContext: item.researchContext || '',
      trendingSource: item.trendingSource || 'Antigravity Trending Engine',
      generatedBy: item.generatedBy || 'curated-trending-engine',
      createdAt: item.createdAt || item.generatedAt || new Date().toISOString()
    };
  });

  const seenTitles = new Set();
  const merged = [];

  for (const idea of normalizedNew) {
    const norm = (idea.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm && !seenTitles.has(norm)) {
      seenTitles.add(norm);
      merged.push(idea);
    }
  }

  for (const idea of existing) {
    const norm = (idea.title || idea.topic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm && !seenTitles.has(norm)) {
      seenTitles.add(norm);
      merged.push(idea);
    }
  }

  const capped = merged.slice(0, maxCap);
  data[targetId] = capped;

  saveTrendingFile(data);
  return capped;
}

/**
 * Mark a topic as used for a channel
 * @param {string} channelId
 * @param {string|Object} topicTitle
 */
function markTopicUsed(channelId, topicTitle) {
  if (!channelId || !topicTitle) return;
  const targetId = String(channelId).toLowerCase().replace(/\.json$/, '');
  const titleStr = typeof topicTitle === 'string' ? topicTitle : (topicTitle.title || topicTitle.key || '');
  
  const trending = getTrendingIdeas(targetId);
  const matched = trending.find(t => 
    t.key === titleStr || 
    t.id === titleStr || 
    (t.title && t.title.toLowerCase().trim() === titleStr.toLowerCase().trim())
  );

  const keyToMark = matched ? matched.key : titleStr;
  markIdeaUsed(targetId, keyToMark);

  if (matched && matched.title && matched.title !== keyToMark) {
    markIdeaUsed(targetId, matched.title);
  }
}

/**
 * Get at least 4 unused topic ideas for a channel with support for pagination/refresh rotation
 * Filters out all already produced topics and dynamically generates new ones if needed.
 * Never mutates channels/*.json.
 */
function getUnusedChannelIdeas(channelId, minCount = 4, offset = 0) {
  const targetId = String(channelId || 'kausalmedia').toLowerCase().replace(/\.json$/, '');
  const ch = getChannel(targetId) || getChannel('kausalmedia');

  // Seed pool from config/trending-ideas.json + default channel idea pool + channel suggestions
  const trendingIdeas = getTrendingIdeas(targetId);
  const masterPool = [...trendingIdeas];
  const defaultItems = CHANNEL_IDEA_POOLS[targetId] || CHANNEL_IDEA_POOLS.kausalmedia || [];

  defaultItems.forEach(item => {
    if (!masterPool.some(p => p.key === item.key || p.id === item.key)) {
      masterPool.push(item);
    }
  });

  if (ch && Array.isArray(ch.suggestions)) {
    ch.suggestions.forEach(item => {
      if (!masterPool.some(p => p.key === item.key || p.id === item.key)) {
        masterPool.push(item);
      }
    });
  }

  // Filter out any idea that is already used
  const unusedIdeas = masterPool.filter(idea => !isIdeaUsed(targetId, idea));

  // If offset is requested, ensure we have enough ideas to satisfy offset + minCount
  const desiredTotal = Math.max(minCount, offset + minCount);
  if (unusedIdeas.length < desiredTotal) {
    const needed = desiredTotal - unusedIdeas.length;
    const existingKeys = masterPool.map(m => m.key || m.id);
    const freshIdeas = generateProceduralIdeas(targetId, Math.max(needed, 4), existingKeys);

    // Persist fresh procedural ideas to config/trending-ideas.json (never mutating channels/*.json)
    appendTrendingIdeas(targetId, freshIdeas, 100);

    unusedIdeas.push(...freshIdeas);
  }

  const safeOffset = unusedIdeas.length > 0 ? (offset % unusedIdeas.length) : 0;
  let selected = unusedIdeas.slice(safeOffset, safeOffset + minCount);

  // If slicing near the end of array gives fewer than minCount, wrap around
  if (selected.length < minCount) {
    const remainder = minCount - selected.length;
    selected = selected.concat(unusedIdeas.slice(0, remainder));
  }

  // Calculate next offset for the refresh button
  const nextOffset = (safeOffset + minCount) % unusedIdeas.length;
  selected.nextOffset = nextOffset;
  selected.totalUnused = unusedIdeas.length;

  return selected;
}

module.exports = {
  loadUsedTopics,
  saveUsedTopics,
  markIdeaUsed,
  isIdeaUsed,
  getUnusedChannelIdeas,
  CHANNEL_IDEA_POOLS,
  getTrendingIdeas,
  appendTrendingIdeas,
  markTopicUsed
};
