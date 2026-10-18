#!/usr/bin/env node

/**
 * DEPRECATED & DISABLED: Do NOT use Sharp SVG mockups for AI-nimate.
 * Per user directive, HTML/CSS and SVG mockup assets are strictly prohibited.
 * Assets must be generated using authentic Nano Banana (Antigravity generate_image).
 */

console.error('[ERROR] scripts/generate-rights-issue-assets.js is deprecated and disabled.');
console.error('[ERROR] SVG/CSS mockup rasterization is prohibited. Use native Nano Banana (generate_image).');
process.exit(1);


const ASSET_SPECS = [
  {
    id: 'prop-bei-trading-hall',
    name: 'Bursa Efek Indonesia Trading Floor',
    file: 'bursa-efek-indonesia-floor.png',
    description: 'Indonesian Stock Exchange BEI main trading hall with electronic ticker board, trading terminal screens, and Jakarta financial district silhouette',
    tags: ['bei', 'bursa-efek', 'idx', 'saham', 'trading-floor', 'jakarta'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <!-- BEI Building & Ticker Frame -->
      <rect x="160" y="140" width="1280" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <!-- Header Banner -->
      <rect x="160" y="140" width="1280" height="170" rx="24" fill="#1c1917"/>
      <text x="800" y="250" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="56" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="8">BURSA EFEK INDONESIA</text>
      <!-- Electronic Ticker Screen -->
      <rect x="240" y="360" width="1120" height="260" rx="16" fill="#0f172a" stroke="#1c1917" stroke-width="6"/>
      <text x="300" y="470" font-family="monospace" font-size="52" font-weight="bold" fill="#22c55e">IHSG  7,340.50  +0.45%</text>
      <text x="300" y="555" font-family="monospace" font-size="52" font-weight="bold" fill="#ef4444">HMETD -32.50%  EX-DATE</text>
      <!-- Trading Terminal Desk -->
      <rect x="320" y="680" width="460" height="280" rx="14" fill="#e2e8f0" stroke="#1c1917" stroke-width="8"/>
      <rect x="360" y="720" width="380" height="200" fill="#f8fafc" stroke="#1c1917" stroke-width="5"/>
      <path d="M 380 860 L 450 780 L 520 830 L 620 750 L 710 880" fill="none" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
      <!-- Bull Silhouette Accent -->
      <path d="M 1040 920 C 1000 830 960 770 900 750 C 940 710 1020 690 1100 710 C 1160 730 1220 790 1240 920 Z" fill="#b45309" stroke="#1c1917" stroke-width="8"/>
      <circle cx="980" cy="730" r="8" fill="#1c1917"/>
    </svg>`
  },
  {
    id: 'prop-pojk-32-dossier',
    name: 'POJK No 32 Regulasi HMETD',
    file: 'pojk-regulasi-hmetd.png',
    description: 'Official OJK regulation legal document folder POJK 32 2015 regarding rights issue and capital addition with wax seal',
    tags: ['ojk', 'pojk-32', 'regulasi', 'hmetd', 'hukum-pasar-modal', 'dokumen'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <!-- Archival Folder -->
      <rect x="300" y="120" width="1000" height="960" rx="20" fill="#fef3c7" stroke="#1c1917" stroke-width="8"/>
      <rect x="380" y="190" width="840" height="820" fill="#fffbeb" stroke="#1c1917" stroke-width="6"/>
      <!-- Header Seal -->
      <circle cx="800" cy="350" r="95" fill="#fef3c7" stroke="#b91c1c" stroke-width="8"/>
      <circle cx="800" cy="350" r="76" fill="none" stroke="#b91c1c" stroke-width="4" stroke-dasharray="8 4"/>
      <text x="800" y="368" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="44" font-weight="900" fill="#b91c1c" text-anchor="middle">OJK</text>
      <!-- Title -->
      <text x="800" y="520" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="900" fill="#1c1917" text-anchor="middle">SALINAN REGULASI RESMI</text>
      <text x="800" y="590" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="38" font-weight="800" fill="#b45309" text-anchor="middle">POJK NO. 32 /POJK.04/2015</text>
      <!-- Document Text Lines -->
      <line x1="460" y1="670" x2="1140" y2="670" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
      <line x1="460" y1="730" x2="1060" y2="730" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
      <line x1="460" y1="790" x2="1120" y2="790" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
      <line x1="460" y1="850" x2="980" y2="850" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
      <!-- Red Stamp -->
      <rect x="820" y="870" width="340" height="90" rx="8" fill="#fee2e2" stroke="#b91c1c" stroke-width="6" transform="rotate(-6 820 870)"/>
      <text x="990" y="930" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#b91c1c" text-anchor="middle" transform="rotate(-6 820 870)">HMETD SAH</text>
    </svg>`
  },
  {
    id: 'prop-chart-ex-date-gapdown',
    name: 'Grafik Penyesuaian Harga Teoretis Ex-Date',
    file: 'chart-ex-date-gapdown.png',
    description: 'Candlestick stock chart showing sharp thirty percent mathematical price drop on Ex-Date with theoretical price adjustment line',
    tags: ['chart', 'ex-date', 'harga-teoretis', 'gap-down', 'candlestick', 'saham'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <!-- Grid Panel -->
      <rect x="180" y="120" width="1240" height="960" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="8"/>
      <!-- Grid Lines -->
      <line x1="180" y1="340" x2="1420" y2="340" stroke="#e2e8f0" stroke-width="4"/>
      <line x1="180" y1="560" x2="1420" y2="560" stroke="#e2e8f0" stroke-width="4"/>
      <line x1="180" y1="780" x2="1420" y2="780" stroke="#e2e8f0" stroke-width="4"/>
      <!-- Pre-Ex Date Candlesticks (High) -->
      <rect x="300" y="320" width="65" height="190" fill="#22c55e" stroke="#1c1917" stroke-width="6"/>
      <line x1="332" y1="260" x2="332" y2="570" stroke="#1c1917" stroke-width="6"/>
      <rect x="440" y="280" width="65" height="210" fill="#22c55e" stroke="#1c1917" stroke-width="6"/>
      <line x1="472" y1="220" x2="472" y2="530" stroke="#1c1917" stroke-width="6"/>
      <rect x="580" y="300" width="65" height="230" fill="#22c55e" stroke="#1c1917" stroke-width="6"/>
      <line x1="612" y1="240" x2="612" y2="570" stroke="#1c1917" stroke-width="6"/>
      <!-- Cum Date Marker -->
      <line x1="720" y1="160" x2="720" y2="1040" stroke="#b91c1c" stroke-width="6" stroke-dasharray="16 12"/>
      <text x="735" y="210" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#b91c1c">CUM-DATE</text>
      <!-- Ex-Date Massive Gap Down -->
      <text x="800" y="470" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="44" font-weight="900" fill="#dc2626">GAP DOWN -30%</text>
      <path d="M 720 400 L 920 680" fill="none" stroke="#dc2626" stroke-width="8" stroke-dasharray="8 8"/>
      <!-- Post-Ex Date Candlesticks (Low) -->
      <rect x="940" y="700" width="65" height="170" fill="#ef4444" stroke="#1c1917" stroke-width="6"/>
      <line x1="972" y1="640" x2="972" y2="910" stroke="#1c1917" stroke-width="6"/>
      <rect x="1080" y="740" width="65" height="150" fill="#ef4444" stroke="#1c1917" stroke-width="6"/>
      <line x1="1112" y1="680" x2="1112" y2="930" stroke="#1c1917" stroke-width="6"/>
      <rect x="1220" y="720" width="65" height="190" fill="#22c55e" stroke="#1c1917" stroke-width="6"/>
      <line x1="1252" y1="660" x2="1252" y2="950" stroke="#1c1917" stroke-width="6"/>
      <!-- Badge -->
      <rect x="880" y="960" width="460" height="85" rx="12" fill="#fef3c7" stroke="#b45309" stroke-width="5"/>
      <text x="1110" y="1015" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="800" fill="#b45309" text-anchor="middle">HARGA TEORETIS BURSA</text>
    </svg>`
  },
  {
    id: 'prop-ksei-sertifikat-hmetd',
    name: 'Sertifikat Hak Tebus KSEI Kode R',
    file: 'ksei-sertifikat-hmetd.png',
    description: 'Central securities depository KSEI rights issue security certificate showing stock ticker ending in letter R',
    tags: ['ksei', 'sertifikat', 'hmetd', 'ticker-r', 'kustodian', 'pasar-tunai'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <!-- Certificate Body -->
      <rect x="220" y="140" width="1160" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <!-- Border Ornament -->
      <rect x="260" y="180" width="1080" height="840" rx="16" fill="none" stroke="#b45309" stroke-width="4" stroke-dasharray="12 6"/>
      <!-- Header -->
      <text x="800" y="300" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="900" fill="#1c1917" text-anchor="middle">PT KUSTODIAN SENTRAL EFEK INDONESIA</text>
      <text x="800" y="370" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="36" font-weight="800" fill="#b45309" text-anchor="middle">SURAT BUKTI HAK MEMESAN EFEK TERLEBIH DAHULU</text>
      <!-- Big Ticker Box -->
      <rect x="460" y="450" width="680" height="230" rx="20" fill="#0f172a" stroke="#1c1917" stroke-width="6"/>
      <text x="800" y="585" font-family="monospace" font-size="92" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="8">EMTN - R</text>
      <text x="800" y="645" font-family="monospace" font-size="32" font-weight="bold" fill="#94a3b8" text-anchor="middle">PERIODE PERDAGANGAN 10 HARI</text>
      <!-- Watermark Stamp -->
      <circle cx="1120" cy="860" r="105" fill="#fee2e2" stroke="#b91c1c" stroke-width="6"/>
      <text x="1120" y="850" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b91c1c" text-anchor="middle">KSEI</text>
      <text x="1120" y="890" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="800" fill="#b91c1c" text-anchor="middle">TERDAFTAR</text>
    </svg>`
  },
  {
    id: 'prop-arbitrase-institutional-desk',
    name: 'Meja Arbitrase Perdagangan Institusi',
    file: 'arbitrase-institutional-desk.png',
    description: 'Institutional proprietary trading desk executing cash and carry rights arbitrage with order book and profit margin lock',
    tags: ['arbitrase', 'institusi', 'cash-and-carry', 'trading-desk', 'hedge-fund', 'profit'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="180" y="140" width="1240" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <!-- Dual Monitors -->
      <rect x="250" y="220" width="490" height="350" rx="16" fill="#1e293b" stroke="#1c1917" stroke-width="6"/>
      <text x="495" y="300" font-family="monospace" font-size="32" font-weight="bold" fill="#38bdf8" text-anchor="middle">PASAR REGULER</text>
      <text x="495" y="390" font-family="monospace" font-size="54" font-weight="900" fill="#22c55e" text-anchor="middle">SELL Rp 1.000</text>
      
      <rect x="860" y="220" width="490" height="350" rx="16" fill="#1e293b" stroke="#1c1917" stroke-width="6"/>
      <text x="1105" y="300" font-family="monospace" font-size="32" font-weight="bold" fill="#f59e0b" text-anchor="middle">PASAR TUNAI (HAK)</text>
      <text x="1105" y="390" font-family="monospace" font-size="54" font-weight="900" fill="#ef4444" text-anchor="middle">BUY Rp 50</text>

      <!-- Arbitrage Bridge Arrow -->
      <path d="M 760 395 L 840 395" stroke="#b45309" stroke-width="12" stroke-linecap="round"/>
      <polygon points="830,375 870,395 830,415" fill="#b45309"/>

      <!-- Profit Lock Box -->
      <rect x="360" y="650" width="880" height="280" rx="20" fill="#ecfdf5" stroke="#059669" stroke-width="8"/>
      <text x="800" y="745" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="44" font-weight="900" fill="#065f46" text-anchor="middle">CASH-AND-CARRY ARBITRAGE</text>
      <text x="800" y="840" font-family="monospace" font-size="58" font-weight="900" fill="#047857" text-anchor="middle">LOCKED RISK-FREE SPREAD</text>
    </svg>`
  },
  {
    id: 'prop-standby-buyer-underwriting',
    name: 'Kontrak Penjaminan Pembeli Siaga',
    file: 'standby-buyer-underwriting.png',
    description: 'Underwriting contract agreement between issuer and standby buyer with cinnabar wax seal and underwriting fee commission',
    tags: ['pembeli-siaga', 'standby-buyer', 'penjamin-emisi', 'underwriting', 'akuisisi', 'kontrak'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="280" y="140" width="1040" height="920" rx="20" fill="#fffbeb" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="260" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="900" fill="#1c1917" text-anchor="middle">PERJANJIAN PEMBELI SIAGA</text>
      <text x="800" y="325" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#b45309" text-anchor="middle">(STANDBY BUYER UNDERWRITING)</text>
      <line x1="380" y1="400" x2="1220" y2="400" stroke="#cbd5e1" stroke-width="6"/>
      <line x1="380" y1="460" x2="1140" y2="460" stroke="#cbd5e1" stroke-width="6"/>
      <line x1="380" y1="520" x2="1190" y2="520" stroke="#cbd5e1" stroke-width="6"/>
      <!-- Fee Box -->
      <rect x="420" y="600" width="760" height="150" rx="16" fill="#fef3c7" stroke="#b45309" stroke-width="6"/>
      <text x="800" y="670" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#92400e" text-anchor="middle">FEE PENJAMINAN EMISI: 2% - 4%</text>
      <text x="800" y="720" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="700" fill="#b45309" text-anchor="middle">HAK SAPU BERSIH SISA SAHAM</text>
      <!-- Wax Stamp Seal -->
      <circle cx="1060" cy="890" r="95" fill="#dc2626" stroke="#991b1b" stroke-width="8"/>
      <text x="1060" y="900" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#fef2f2" text-anchor="middle">SIAGA</text>
    </svg>`
  },
  {
    id: 'prop-debt-to-equity-swap-balance',
    name: 'Skema Debt to Equity Swap Neraca',
    file: 'debt-to-equity-swap-balance.png',
    description: 'Corporate balance sheet diagram demonstrating debt to equity swap conversion eliminating corporate liabilities by issuing new shares',
    tags: ['debt-to-equity', 'restrukturisasi', 'utang', 'neraca', 'dilusi', 'konglomerasi'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="160" y="140" width="1280" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="240" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="48" font-weight="900" fill="#1c1917" text-anchor="middle">RESTRUKTURISASI UTANG (SWAP)</text>
      <!-- Left: Debt Note -->
      <rect x="250" y="340" width="450" height="390" rx="16" fill="#fee2e2" stroke="#dc2626" stroke-width="6"/>
      <text x="475" y="440" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="36" font-weight="900" fill="#991b1b" text-anchor="middle">SURAT UTANG</text>
      <text x="475" y="525" font-family="monospace" font-size="56" font-weight="900" fill="#b91c1c" text-anchor="middle">Rp 5 Triliun</text>
      <text x="475" y="610" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d" text-anchor="middle">Pihak Terafiliasi</text>
      <!-- Swap Arrow -->
      <path d="M 740 535 L 860 535" stroke="#b45309" stroke-width="12" stroke-linecap="round"/>
      <polygon points="850,515 890,535 850,555" fill="#b45309"/>
      <!-- Right: New Equity Shares -->
      <rect x="900" y="340" width="450" height="390" rx="16" fill="#ecfdf5" stroke="#059669" stroke-width="6"/>
      <text x="1125" y="440" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="36" font-weight="900" fill="#065f46" text-anchor="middle">SAHAM BARU</text>
      <text x="1125" y="525" font-family="monospace" font-size="56" font-weight="900" fill="#047857" text-anchor="middle">50 Miliar Lbr</text>
      <text x="1125" y="610" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="700" fill="#064e3b" text-anchor="middle">Pengendali Baru</text>
      <!-- Bottom Warning -->
      <text x="800" y="860" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="36" font-weight="800" fill="#b91c1c" text-anchor="middle">Nol Setoran Tunai • Dilusi Ekstrem Publik</text>
    </svg>`
  },
  {
    id: 'prop-papan-pemantauan-khusus-50',
    name: 'Papan Pemantauan Khusus BEI Rp 50',
    file: 'papan-pemantauan-khusus-50.png',
    description: 'Indonesia Stock Exchange Special Monitoring Board badge with price indicator pinned at fifty rupiah',
    tags: ['papan-pemantauan-khusus', 'fca', 'gocap', 'rp-50', 'share-overhang', 'bei'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="200" y="140" width="1200" height="920" rx="24" fill="#0f172a" stroke="#1c1917" stroke-width="8"/>
      <rect x="250" y="190" width="1100" height="130" fill="#b91c1c" rx="14"/>
      <text x="800" y="275" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">PAPAN PEMANTAUAN KHUSUS</text>
      <!-- Price Display -->
      <rect x="380" y="390" width="840" height="340" rx="24" fill="#1e293b" stroke="#334155" stroke-width="6"/>
      <text x="800" y="540" font-family="monospace" font-size="130" font-weight="900" fill="#ef4444" text-anchor="middle">Rp 50,-</text>
      <text x="800" y="650" font-family="monospace" font-size="40" font-weight="bold" fill="#94a3b8" text-anchor="middle">BATAS MINIMUM REGULER</text>
      <text x="800" y="860" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="38" font-weight="700" fill="#cbd5e1" text-anchor="middle">DAMPAK BANJIR PASOKAN SAHAM (SHARE OVERHANG)</text>
    </svg>`
  },
  {
    id: 'prop-dilusi-ekstrem-pie',
    name: 'Diagram Dilusi Ekstrem 90 Persen',
    file: 'dilusi-ekstrem-pie.png',
    description: 'Pie chart exhibiting extreme retail share dilution from thirty percent to three percent after non-exercise of rights issue',
    tags: ['dilusi', 'pie-chart', 'kepemilikan', 'ritel', 'pengenceran-modal', 'saham'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="180" y="140" width="1240" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="240" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="48" font-weight="900" fill="#1c1917" text-anchor="middle">DILUSI KEPEMILIKAN RITEL</text>
      <!-- Pie Chart Visualization -->
      <circle cx="560" cy="580" r="260" fill="#b91c1c" stroke="#1c1917" stroke-width="8"/>
      <path d="M 560 580 L 560 320 A 260 260 0 1 1 510 325 Z" fill="#1e293b" stroke="#1c1917" stroke-width="6"/>
      <path d="M 560 580 L 510 325 A 260 260 0 0 1 560 320 Z" fill="#f59e0b" stroke="#1c1917" stroke-width="6"/>
      <!-- Legend Box -->
      <rect x="920" y="380" width="440" height="400" rx="16" fill="#fffbeb" stroke="#1c1917" stroke-width="6"/>
      <circle cx="970" cy="470" r="22" fill="#1e293b"/>
      <text x="1020" y="480" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#1c1917">Pengendali: 97%</text>
      <circle cx="970" cy="580" r="22" fill="#f59e0b"/>
      <text x="1020" y="590" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#b45309">Publik / Ritel: 3%</text>
      <text x="1140" y="680" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="28" font-weight="700" fill="#dc2626" text-anchor="middle">(Terdilusi 90% Lenyap)</text>
      <!-- Footer Note -->
      <text x="800" y="940" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#7f1d1d" text-anchor="middle">Tanpa Menjual Satu Lembar Saham Pun</text>
    </svg>`
  },
  {
    id: 'prop-formula-harga-teoretis',
    name: 'Papan Formula Resmi Harga Teoretis BEI',
    file: 'formula-harga-teoretis-bei.png',
    description: 'Blackboard chalk style display of official IDX theoretical price adjustment formula TERP',
    tags: ['formula', 'harga-teoretis', 'terp', 'matematika', 'bursa', 'kalkulasi'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="160" y="140" width="1280" height="920" rx="24" fill="#0f172a" stroke="#1c1917" stroke-width="8"/>
      <!-- Header -->
      <text x="800" y="260" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="48" font-weight="900" fill="#f8fafc" text-anchor="middle">FORMULA RESMI HARGA TEORETIS (TERP)</text>
      <!-- Blackboard Formula Display -->
      <rect x="240" y="340" width="1120" height="380" rx="16" fill="#1e293b" stroke="#334155" stroke-width="6"/>
      <text x="800" y="470" font-family="monospace" font-size="44" font-weight="900" fill="#38bdf8" text-anchor="middle">(P_cum × R_lama) + (P_tebus × R_baru)</text>
      <line x1="340" y1="520" x2="1260" y2="520" stroke="#f8fafc" stroke-width="6"/>
      <text x="800" y="610" font-family="monospace" font-size="52" font-weight="900" fill="#f59e0b" text-anchor="middle">R_lama + R_baru</text>
      <!-- Simulation Box -->
      <rect x="360" y="780" width="880" height="190" rx="16" fill="#fef3c7" stroke="#b45309" stroke-width="6"/>
      <text x="800" y="850" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="800" fill="#92400e" text-anchor="middle">SIMULASI: Rp 1.000 (1:4) Tebus Rp 200</text>
      <text x="800" y="920" font-family="monospace" font-size="48" font-weight="900" fill="#b91c1c" text-anchor="middle">Harga Teoretis = Rp 360 / Lbr (-64%)</text>
    </svg>`
  },
  {
    id: 'prop-kalender-siklus-hmetd',
    name: 'Kalender 6 Fase Siklus HMETD BEI',
    file: 'kalender-siklus-hmetd.png',
    description: 'Calendar schedule timeline diagram outlining the six phases of rights issues from RUPSLB to Standby Buyer execution',
    tags: ['kalender', 'jadwal', 'cum-date', 'ex-date', 'rupslb', 'periode-perdagangan'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="160" y="140" width="1280" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="240" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="48" font-weight="900" fill="#1c1917" text-anchor="middle">SIKLUS ENAM FASE RIGHTS ISSUE</text>
      <!-- Step 1 to 6 Timeline -->
      <rect x="220" y="340" width="360" height="240" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="6"/>
      <text x="400" y="410" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b45309" text-anchor="middle">FASE 1: RUPSLB</text>
      <text x="400" y="475" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Persetujuan Emisi &amp;</text>
      <text x="400" y="520" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Narasi Ekspansi</text>

      <rect x="620" y="340" width="360" height="240" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="6"/>
      <text x="800" y="410" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b45309" text-anchor="middle">FASE 2: EFEKTIF OJK</text>
      <text x="800" y="475" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Harga Pelaksanaan &amp;</text>
      <text x="800" y="520" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Rasio Dilusi Resmi</text>

      <rect x="1020" y="340" width="360" height="240" rx="16" fill="#fee2e2" stroke="#b91c1c" stroke-width="6"/>
      <text x="1200" y="410" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b91c1c" text-anchor="middle">FASE 3: CUM &amp; EX</text>
      <text x="1200" y="475" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="800" fill="#991b1b" text-anchor="middle">Pemotongan Otomatis</text>
      <text x="1200" y="520" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="800" fill="#991b1b" text-anchor="middle">Harga Teoretis</text>

      <rect x="220" y="640" width="360" height="240" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="6"/>
      <text x="400" y="710" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b45309" text-anchor="middle">FASE 4: KSEI TICKER-R</text>
      <text x="400" y="775" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Hak Tercatat di Portofolio</text>
      <text x="400" y="820" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Kustodian Ritel</text>

      <rect x="620" y="640" width="360" height="240" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="6"/>
      <text x="800" y="710" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#b45309" text-anchor="middle">FASE 5: TRADING</text>
      <text x="800" y="775" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">Perdagangan Hak 10 Hari</text>
      <text x="800" y="820" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="600" fill="#64748b" text-anchor="middle">&amp; Penebusan Tunai</text>

      <rect x="1020" y="640" width="360" height="240" rx="16" fill="#ecfdf5" stroke="#059669" stroke-width="6"/>
      <text x="1200" y="710" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="900" fill="#047857" text-anchor="middle">FASE 6: ALLOTMENT</text>
      <text x="1200" y="775" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="700" fill="#065f46" text-anchor="middle">Eksekusi Pembeli Siaga</text>
      <text x="1200" y="820" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="700" fill="#065f46" text-anchor="middle">&amp; Distribusi Saham</text>
    </svg>`
  },
  {
    id: 'prop-trilema-investor-ritel',
    name: 'Trilema 3 Cabang Keputusan Investor Ritel',
    file: 'trilema-investor-ritel.png',
    description: 'Diagram showing three brutal choices for retail investors during rights issue: exercise with cash, sell right at discount, or do nothing and get diluted',
    tags: ['trilema', 'keputusan', 'ritel', 'tebus', 'jual-hak', 'dilusi', 'dilema'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="160" y="140" width="1280" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="240" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="48" font-weight="900" fill="#1c1917" text-anchor="middle">TRILEMA TIGA CABANG INVESTOR RITEL</text>
      
      <!-- Option 1: Tebus -->
      <rect x="220" y="340" width="360" height="480" rx="16" fill="#fffbeb" stroke="#b45309" stroke-width="6"/>
      <text x="400" y="420" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#b45309" text-anchor="middle">OPSI 1: TEBUS</text>
      <line x1="260" y1="460" x2="540" y2="460" stroke="#fde68a" stroke-width="4"/>
      <text x="400" y="530" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="26" font-weight="700" fill="#1c1917" text-anchor="middle">Suntik Dana Segar</text>
      <text x="400" y="580" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle">Menjaga persentase</text>
      <text x="400" y="620" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle">kepemilikan tetap utuh</text>
      <rect x="260" y="690" width="280" height="80" rx="10" fill="#fef3c7"/>
      <text x="400" y="740" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="800" fill="#92400e" text-anchor="middle">Risiko: Uang Mati</text>

      <!-- Option 2: Jual Hak -->
      <rect x="620" y="340" width="360" height="480" rx="16" fill="#f8fafc" stroke="#1c1917" stroke-width="6"/>
      <text x="800" y="420" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#1c1917" text-anchor="middle">OPSI 2: JUAL HAK</text>
      <line x1="660" y1="460" x2="940" y2="460" stroke="#e2e8f0" stroke-width="4"/>
      <text x="800" y="530" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="26" font-weight="700" fill="#1c1917" text-anchor="middle">Jual di Pasar Tunai</text>
      <text x="800" y="580" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle">Likuiditas mengering,</text>
      <text x="800" y="620" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle">harga dibanting Rp 1</text>
      <rect x="660" y="690" width="280" height="80" rx="10" fill="#e2e8f0"/>
      <text x="800" y="740" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="800" fill="#475569" text-anchor="middle">Kompensasi Minim</text>

      <!-- Option 3: Diam / Hangus -->
      <rect x="1020" y="340" width="360" height="480" rx="16" fill="#fee2e2" stroke="#b91c1c" stroke-width="6"/>
      <text x="1200" y="420" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#b91c1c" text-anchor="middle">OPSI 3: DIAM</text>
      <line x1="1060" y1="460" x2="1340" y2="460" stroke="#fecaca" stroke-width="4"/>
      <text x="1200" y="530" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="26" font-weight="700" fill="#991b1b" text-anchor="middle">Pasrah Terdilusi</text>
      <text x="1200" y="580" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#7f1d1d" text-anchor="middle">Hak hangus otomatis,</text>
      <text x="1200" y="620" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="22" font-weight="600" fill="#7f1d1d" text-anchor="middle">nilai portofolio anjlok</text>
      <rect x="1060" y="690" width="280" height="80" rx="10" fill="#fecaca"/>
      <text x="1200" y="740" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="800" fill="#991b1b" text-anchor="middle">Kerugian Maksimal</text>

      <text x="800" y="940" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="800" fill="#1c1917" text-anchor="middle">Setiap Pilihan Memiliki Konsekuensi Modal yang Mahal</text>
    </svg>`
  },
  {
    id: 'prop-prospektus-audit-forensik',
    name: 'Tiga Baris Krusial Audit Forensik Prospektus',
    file: 'prospektus-audit-forensik.png',
    description: 'Forensic audit document inspection checklist with magnifying glass highlighting three red flags in rights issue prospectus',
    tags: ['prospektus', 'audit', 'forensik', 'red-flags', 'cek-dokumen', 'ojk'],
    svg: `<svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
      <rect x="180" y="140" width="1240" height="920" rx="24" fill="#faf6ee" stroke="#1c1917" stroke-width="8"/>
      <text x="800" y="240" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="46" font-weight="900" fill="#1c1917" text-anchor="middle">DETEKSI FORENSIK PROSPEKTUS RINGKAS</text>
      
      <!-- Checklist Item 1 -->
      <rect x="260" y="320" width="1080" height="170" rx="16" fill="#fffbeb" stroke="#b45309" stroke-width="5"/>
      <circle cx="340" cy="405" r="35" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
      <text x="340" y="418" font-family="monospace" font-size="36" font-weight="900" fill="#b45309" text-anchor="middle">1</text>
      <text x="420" y="390" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="900" fill="#1c1917">Alokasi Penggunaan Dana</text>
      <text x="420" y="440" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="700" fill="#b91c1c">Waspadai jika > 70% dipakai membayar utang entitas afiliasi pengendali</text>

      <!-- Checklist Item 2 -->
      <rect x="260" y="520" width="1080" height="170" rx="16" fill="#fffbeb" stroke="#b45309" stroke-width="5"/>
      <circle cx="340" cy="605" r="35" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
      <text x="340" y="618" font-family="monospace" font-size="36" font-weight="900" fill="#b45309" text-anchor="middle">2</text>
      <text x="420" y="590" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="900" fill="#1c1917">Kredibilitas Pembeli Siaga</text>
      <text x="420" y="640" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="700" fill="#b91c1c">Cek rekam jejak, kepemilikan modal, dan ada/tidaknya entitas cangkang offshore</text>

      <!-- Checklist Item 3 -->
      <rect x="260" y="720" width="1080" height="170" rx="16" fill="#fffbeb" stroke="#b45309" stroke-width="5"/>
      <circle cx="340" cy="805" r="35" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
      <text x="340" y="818" font-family="monospace" font-size="36" font-weight="900" fill="#b45309" text-anchor="middle">3</text>
      <text x="420" y="790" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="900" fill="#1c1917">Rasio Harga Tebus vs Pasar</text>
      <text x="420" y="840" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="24" font-weight="700" fill="#b91c1c">Harga tebus jauh di atas harga pasar tanpa komitmen serapan adalah jebakan likuiditas</text>

      <text x="800" y="960" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="30" font-weight="800" fill="#7f1d1d" text-anchor="middle">3 Sinyal Bahaya Merah Menyala Sebelum Berinvestasi</text>
    </svg>`
  }
];

async function generateAllAssets() {
  console.log(`Generating ${ASSET_SPECS.length} transparent high-resolution style-locked exhibits for Rights Issues...`);
  fs.mkdirSync(ITEMS_DIR, { recursive: true });

  for (const spec of ASSET_SPECS) {
    const pngPath = path.join(ITEMS_DIR, spec.file);
    const relativeAssetPath = path.join('assets', 'props', 'items', spec.file);

    // Render SVG to high-res PNG with transparent background
    await sharp(Buffer.from(spec.svg), { density: 300 })
      .resize(1600, 1200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngPath);
    console.log(`  ✔ Rendered transparent (1600x1200 @ 300DPI): ${pngPath}`);

    // Register into catalog and Vector DB
    await registerAsset({
      id: spec.id,
      channel: 'kausalmedia',
      name: spec.name,
      category: 'props',
      subcategory: 'items',
      file: spec.file,
      relativePath: relativeAssetPath,
      tags: spec.tags,
      description: spec.description,
      mood: 'investigative'
    });
  }

  console.log(`\nAll ${ASSET_SPECS.length} transparent exhibits rendered and registered!\n`);
}

generateAllAssets().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
