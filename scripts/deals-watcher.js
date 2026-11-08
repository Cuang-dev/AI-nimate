/**
 * Deals Watcher & Sentinel Module for Cuangbot
 * 
 * Watches Google Spreadsheet "List Barang Ready The Lazy Titip":
 * https://docs.google.com/spreadsheets/d/1ghk3Dlip1Aubejb1Fcgj5DZsiX7gg6S8CSGi2oZI31g/edit
 * 
 * Functions:
 * 1. Periodically polls the sheet for new item listings and price drops.
 * 2. Uses Gemini AI (gemini-3.5-flash-lite / gemini-2.5-flash) to evaluate whether
 *    the item is notably under Indonesian secondhand market value (Facebook Marketplace & Tokopedia benchmarks).
 * 3. Automatically broadcasts STEAL and GOOD DEALS to Discord channel #good-deals.
 * 4. Provides rich interactive catalog browsing (/deals active, /deals list, /deals check, /deals status)
 *    with sorting by date, price, selisih (discount), and name, plus time-since-listing filtering.
 * 5. Direct item inspection (/deals item <query>) fetching high-res photos and full seller descriptions
 *    directly from Instagram, paired with a 1-tap pre-filled WhatsApp link to ask the admin for current price.
 */

const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder
} = require('discord.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data', 'deals-watcher');
const LEDGER_PATH = path.join(DATA_DIR, 'ledger.json');
const SOURCES_PATH = path.join(DATA_DIR, 'sources.json');

const GOOD_DEALS_CHANNEL_ID = process.env.DISCORD_GOOD_DEALS_CHANNEL_ID || '1562771528679039047';
const SHEET_EXPORT_URL = process.env.DEALS_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1ghk3Dlip1Aubejb1Fcgj5DZsiX7gg6S8CSGi2oZI31g/export?format=csv';
const POLL_INTERVAL_MS = parseInt(process.env.DEALS_POLL_INTERVAL_MS || '300000', 10); // default 5 mins
const ADMIN_WHATSAPP_PHONE = '62859106996282';

let pollTimer = null;
let isScanning = false;
let isBackgroundAppraising = false;
let clientRef = null;

// --- Environment Helper ---
function loadEnv() {
  const envFiles = [
    path.join(REPO_ROOT, '.env'),
    path.join(REPO_ROOT, '..', 'IDXClaw', '.env'),
    path.join(REPO_ROOT, '..', 'IDX-notifier', '.env')
  ];

  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

// --- Helper: RFC 4180 CSV Parser ---
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current);
      if (row.some(c => c.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    if (row.some(c => c.trim().length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

// --- Helper: Date Parser (DD/MM/YYYY) ---
function parseListingDate(dStr) {
  if (!dStr) return 0;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return new Date(year, month - 1, day).getTime();
  }
  return 0;
}

// --- Helper: Time Since Listing Calculator ---
function getTimeSinceListing(item, now = new Date()) {
  const listingMs = parseListingDate(item.date);
  if (!listingMs) return { text: 'Unknown', days: 999 };

  const nowMs = now.getTime();
  const diffMs = Math.max(0, nowMs - listingMs);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let text = '';
  if (diffDays === 0) {
    text = 'Hari ini (Today)';
  } else if (diffDays === 1) {
    text = 'Kemarin (1 hari lalu)';
  } else if (diffDays < 7) {
    text = `${diffDays} hari yang lalu`;
  } else if (diffDays < 14) {
    text = `1 minggu yang lalu (${diffDays} hari)`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    text = `${weeks} minggu yang lalu (${diffDays} hari)`;
  } else {
    const months = Math.floor(diffDays / 30);
    text = `${months} bulan yang lalu (${diffDays} hari)`;
  }

  return { text, days: diffDays };
}

// --- Helper: Clean Instagram Post URL ---
function cleanInstagramUrl(url) {
  if (!url || !url.startsWith('http')) return '';
  return url.replace(/[?#].*$/, '').replace(/\/$/, '') + '/';
}

// --- Helper: WhatsApp Pre-filled Link Generator ---
function buildAdminWhatsAppUrl(item, igDetails = null) {
  const details = igDetails || item.igDetails;
  const numStr = item.num ? `No. ${item.num}` : '';
  const dateStr = item.date ? `(${item.date})` : '';
  const priceStr = `Rp ${item.price.toLocaleString('id-ID')}`;
  const postUrl = cleanInstagramUrl(item.link);
  const storeName = item.sourceName ? `Admin ${item.sourceName}` : 'Admin Titip';
  
  // Clean phone number: digits only, convert 08... to 628...
  let phone = (item.adminPhone || ADMIN_WHATSAPP_PHONE).replace(/[^\d]/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }

  // Clean product name (strip markdown formatting and extra spaces)
  const cleanName = (item.name || '').replace(/[*_~`]/g, '').trim();

  let text = `Halo ${storeName}, barang ${numStr} ${dateStr} - ${cleanName} (${priceStr}) apakah masih ready & berapa nettnya?\n\n`;

  if (postUrl) {
    text += `📸 Screenshot Post: ${postUrl}\n`;
  }
  text += `Terima kasih!`;

  let url = `https://wa.me/${phone}?text=${encodeURIComponent(text.trim())}`;
  // Ensure Discord 512 character button URL limit is never exceeded
  if (url.length > 500) {
    const compactText = `Halo ${storeName}, barang ${numStr} - ${cleanName.slice(0, 30)} apakah ready?\n📸 Screenshot: ${postUrl}`;
    url = `https://wa.me/${phone}?text=${encodeURIComponent(compactText.trim())}`;
  }

  return url;
}

// --- Helper: Fetch Instagram Product Image & Seller Description (Full Uncropped) ---
async function fetchInstagramDetails(url) {
  if (!url || !url.startsWith('http')) return null;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });

    if (!res.ok) return null;
    const html = await res.text();

    // 1. Extract uncropped full-resolution photo (avoid square cropped stp=c... parameters)
    let image = '';
    const regex = /https:\/\/[^"'\s\\]+?\.jpg[^"'\s\\]*/g;
    const allJpgs = [...new Set(html.match(regex) || [])].map(u => u.replace(/&amp;/g, '&'));
    const uncropped = allJpgs.filter(u => {
      return u.includes('cdninstagram.com') &&
        !u.includes('profile_pic') &&
        !/stp=c\d+\./.test(u) &&
        !u.includes('s150x150');
    });

    if (uncropped.length > 0) {
      image = uncropped[0];
    } else {
      // Fallback to og/twitter image
      const imgMatch = html.match(/<meta\s+(?:name|property)=['"](?:twitter:image|og:image)['"]\s+content=['"]([^'"]+)['"]/i);
      if (imgMatch) {
        image = imgMatch[1].replace(/&amp;/g, '&');
      }
    }

    // 2. Extract description
    let description = '';
    const descMatch = html.match(/<meta\s+(?:name|property)=['"](?:description|og:description)['"]\s+content=['"]([^'"]+)['"]/i);
    if (descMatch) {
      description = descMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&#064;/g, '@')
        .replace(/&#x1f525;/g, '🔥')
        .replace(/&#x2022;/g, '•')
        .replace(/&#x2060;/g, '')
        .replace(/&apos;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();

      const prefixIdx = description.indexOf(': "');
      if (prefixIdx !== -1) {
        description = description.slice(prefixIdx + 3).replace(/"\.\s*$/, '');
      }
    }

    // 3. Extract publication date from metadata (e.g. "... on October 22, 2026: ...")
    let postDateStr = null;
    let daysOld = 0;
    const rawDescMatch = html.match(/<meta\s+(?:name|property)=['"](?:description|og:description)['"]\s+content=['"]([^'"]+)['"]/i);
    if (rawDescMatch) {
      const timeMatch = rawDescMatch[1].match(/on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
      if (timeMatch) {
        const d = new Date(timeMatch[1]);
        if (!isNaN(d.getTime())) {
          daysOld = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          postDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      }
    }

    return {
      image: image || null,
      description: description || null,
      postDateStr: postDateStr || null,
      daysOld: daysOld || 0,
      fetchedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[Deals Watcher] Error fetching Instagram details for ${url}:`, err.message);
    return null;
  }
}

// --- Description Sanitizer (Strips Instagram Marketing Clutter) ---
function cleanDescriptionText(raw) {
  if (!raw) return '';
  const lines = raw.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l || l === '-' || l === '•' || l === '--') return false;
      const lower = l.toLowerCase();
      if (lower.includes('turn on post') || lower.includes('add thelazytitip') || lower.includes('line official') || lower.includes('link on bio')) return false;
      if (lower.includes('deskripsi barang kurang lengkap') || lower.includes('#tltavail') || lower.includes('likes,') || lower.includes('comments -') || lower.includes('order line')) return false;
      return true;
    });
  return lines.join('\n');
}

// --- Helper: Instagram Media ID to Base64 Shortcode ---
function idToShortcode(idStr) {
  if (!idStr) return '';
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let id = BigInt(idStr.replace(/[^\d]/g, ''));
    let shortcode = '';
    while (id > 0n) {
      const rem = id % 64n;
      shortcode = chars[Number(rem)] + shortcode;
      id = id / 64n;
    }
    return shortcode;
  } catch {
    return '';
  }
}

// --- Helper: Extract Shortcode from Instagram Post URL ---
function extractShortcodeFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/p\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// --- In-Memory Ledger & Fast Index Cache ---
let inMemoryLedger = null;
let ledgerSaveTimer = null;
const itemByIdIndex = new Map();
const itemByNumIndex = new Map();
const itemByShortcodeIndex = new Map();

function rebuildIndexes(ledger) {
  itemByIdIndex.clear();
  itemByNumIndex.clear();
  itemByShortcodeIndex.clear();
  if (!ledger?.items) return;
  for (const it of Object.values(ledger.items)) {
    if (it.id) itemByIdIndex.set(it.id.toLowerCase(), it);
    if (it.num) itemByNumIndex.set(it.num.toLowerCase(), it);
    const code = extractShortcodeFromUrl(it.link);
    if (code) itemByShortcodeIndex.set(code.toLowerCase(), it);
  }
}

function loadLedger() {
  if (inMemoryLedger) return inMemoryLedger;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(LEDGER_PATH)) {
      const raw = fs.readFileSync(LEDGER_PATH, 'utf-8');
      inMemoryLedger = JSON.parse(raw);
      // Ensure all historical items have proper source attribution and admin contact info
      for (const it of Object.values(inMemoryLedger.items || {})) {
        if (!it.sourceName) it.sourceName = 'The Lazy Titip';
        if (!it.adminPhone) it.adminPhone = ADMIN_WHATSAPP_PHONE;
        if (!it.lineUrl && it.sourceName === 'The Lazy Titip') it.lineUrl = 'https://line.me/R/ti/p/@680ofqpr';
      }
      rebuildIndexes(inMemoryLedger);
      return inMemoryLedger;
    }
  } catch (err) {
    console.error('[Deals Watcher] Error reading ledger:', err.message);
  }

  inMemoryLedger = {
    lastChecked: null,
    totalChecks: 0,
    items: {},
    stats: {
      totalItemsSeen: 0,
      dealsFound: 0,
      notificationsSent: 0
    }
  };
  rebuildIndexes(inMemoryLedger);
  return inMemoryLedger;
}

function saveLedger(ledger, immediate = false) {
  inMemoryLedger = ledger;
  rebuildIndexes(inMemoryLedger);

  const writeToDisk = () => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${LEDGER_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(inMemoryLedger, null, 2), 'utf-8');
      fs.renameSync(tmpPath, LEDGER_PATH);
    } catch (err) {
      console.error('[Deals Watcher] Error saving ledger to disk:', err.message);
    }
  };

  if (immediate) {
    if (ledgerSaveTimer) {
      clearTimeout(ledgerSaveTimer);
      ledgerSaveTimer = null;
    }
    writeToDisk();
  } else if (!ledgerSaveTimer) {
    ledgerSaveTimer = setTimeout(() => {
      ledgerSaveTimer = null;
      writeToDisk();
    }, 1500);
  }
}

// --- Consignment Sources Management ---
function loadSources() {
  try {
    if (fs.existsSync(SOURCES_PATH)) {
      const raw = fs.readFileSync(SOURCES_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.sources)) return parsed.sources;
    }
  } catch (err) {
    console.error('[Deals Watcher] Error loading sources:', err.message);
  }

  return [
    {
      id: 'the_lazy_titip',
      name: 'The Lazy Titip',
      handle: '@thelazytitip',
      prefix: 'tlt',
      enabled: true,
      sheetUrl: SHEET_EXPORT_URL,
      whatsapp: '62859106996282',
      line: 'https://line.me/R/ti/p/@680ofqpr',
      instagram: 'https://www.instagram.com/thelazytitip/'
    },
    {
      id: 'gudang_vga',
      name: 'Gudang VGA',
      handle: '@gudangvga',
      prefix: 'gvga',
      enabled: true,
      sheetUrl: '',
      whatsapp: '6287811103050',
      line: 'https://line.me/R/ti/p/@645chdgz',
      instagram: 'https://www.instagram.com/gudangvga/'
    },
    {
      id: 'game_consign',
      name: 'Game Consign',
      handle: '@gameconsign',
      prefix: 'gc',
      enabled: true,
      sheetUrl: '',
      whatsapp: '6287811103050',
      line: '',
      instagram: 'https://www.instagram.com/gameconsign/'
    }
  ];
}

function saveSources(sources) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SOURCES_PATH, JSON.stringify({ sources }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Deals Watcher] Error saving sources:', err.message);
  }
}

// --- Multi-Source Sheet Fetcher & Parser ---
async function parseSheetForSource(source) {
  try {
    const res = await fetch(source.sheetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DealsWatcher/1.0' }
    });

    if (!res.ok) {
      console.warn(`[Deals Watcher] Sheet export for ${source.name} returned HTTP ${res.status}`);
      return [];
    }

    const csvText = await res.text();
    const rows = parseCSV(csvText);

    let headerIndex = -1;
    let colIndices = { num: 1, date: 2, category: 3, name: 4, price: 5, link: 6 };

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r].map(c => c.toLowerCase().trim());
      const nameIdx = row.findIndex(c => c.includes('nama barang') || c.includes('item'));
      if (nameIdx !== -1) {
        headerIndex = r;
        colIndices.name = nameIdx;
        colIndices.category = row.findIndex(c => c.includes('category') || c.includes('kategori'));
        colIndices.date = row.findIndex(c => c.includes('tanggal') || c.includes('date'));
        colIndices.price = row.findIndex(c => c.includes('harga') || c.includes('price'));
        colIndices.link = row.findIndex(c => c.includes('ig') || c.includes('link'));
        colIndices.num = colIndices.date > 0 ? colIndices.date - 1 : 1;
        break;
      }
    }

    if (headerIndex === -1) {
      headerIndex = 5;
    }

    const items = [];
    const pfx = source.prefix || 'tlt';
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = (row[colIndices.name] || '').trim();
      if (!name) continue;

      const num = (row[colIndices.num] || '').trim();
      const date = (row[colIndices.date] || '').trim();
      const category = (row[colIndices.category] || 'General').trim();
      const rawPrice = (row[colIndices.price] || '').trim();
      const link = (row[colIndices.link] || '').trim();

      const cleanDigits = rawPrice.replace(/[^\d]/g, '');
      const price = cleanDigits ? parseInt(cleanDigits, 10) : 0;

      if (price <= 0 || name.toLowerCase().includes('selamat datang') || name.toLowerCase().includes('terjual')) {
        continue;
      }

      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const id = num ? `${pfx}_${num}` : `${pfx}_${cleanName}_${date.replace(/[^0-9]/g, '')}`;

      items.push({
        id,
        sourceId: source.id,
        sourceName: source.name,
        sourceHandle: source.handle,
        adminPhone: source.whatsapp,
        lineUrl: source.line,
        num,
        date,
        category,
        name,
        price,
        rawPrice,
        link: link.startsWith('http') ? link : ''
      });
    }

    return items;
  } catch (err) {
    console.error(`[Deals Watcher] Error parsing sheet for ${source.name}:`, err.message);
    return [];
  }
}

async function fetchCurrentSheetItems() {
  const sources = loadSources().filter(s => s.enabled && s.sheetUrl);
  const allItems = [];
  for (const src of sources) {
    const items = await parseSheetForSource(src);
    allItems.push(...items);
  }
  return allItems;
}

// --- Helper: Universal Consignment Instagram Caption Parser ---
function parseConsignCaption(caption, source) {
  if (!caption) return null;

  const lower = caption.toLowerCase();
  // Filter non-inventory posts (hiring, recruitment, tips, etc.)
  if (
    lower.includes('hiring') ||
    lower.includes('recruitment') ||
    lower.includes('lowongan') ||
    lower.includes('loker') ||
    lower.includes('giveaway') ||
    lower.includes('testimoni') ||
    lower.includes('tips trick')
  ) {
    return null;
  }

  // 1. Price extraction
  let price = 0;
  const priceRegexes = [
    /PRICE\s*\n\s*(?:rp\.?|idr)?\s*([0-9\.\,]+)/i,
    /(?:harga|harga\s*product)\s*:?\s*(?:rp\.?|idr)?\s*([0-9\.\,]+)/i,
    /💸\s*Harga\s*:?\s*(?:rp\.?|idr)?\s*([0-9\.\,]+)/i,
    /HARGA\s*:\s*(?:rp\.?|idr)?\s*([0-9\.\,]+)/i,
    /(?:rp\.?|idr)\s*([0-9\.\,]{4,})/i
  ];

  for (const pr of priceRegexes) {
    const m = caption.match(pr);
    if (m) {
      const digits = m[1].replace(/[^\d]/g, '');
      const p = digits ? parseInt(digits, 10) : 0;
      if (p >= 25000 && p <= 150000000) {
        price = p;
        break;
      }
    }
  }

  if (price <= 0) return null;

  // 2. Name extraction
  let name = '';
  const lines = caption.split('\n').map(l => l.trim()).filter(l => l && l !== '-' && l !== '•' && !l.startsWith('——'));

  // A. Check for explicit "Nama Barang / Product" labels
  const nameLabelMatch = caption.match(/(?:nama\s*barang|nama\s*product|item\s*name)\s*:\s*([^\n\r]+)/i);
  if (nameLabelMatch) {
    name = nameLabelMatch[1].trim();
  }

  // B. The Lazy Titip style: After #TLTAVAIL
  if (!name && (source.handle === '@thelazytitip' || caption.includes('#TLTAVAIL') || caption.includes('#tltavail'))) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('#TLTAVAIL') || lines[i].includes('#tltavail')) {
        let nextIdx = i + 1;
        while (
          nextIdx < lines.length &&
          (lines[nextIdx].toLowerCase().includes('deskripsi') ||
           lines[nextIdx].toLowerCase().includes('kurang lengkap') ||
           lines[nextIdx] === '-')
        ) {
          nextIdx++;
        }
        if (nextIdx < lines.length) {
          name = lines[nextIdx];
          break;
        }
      }
    }
  }

  // B2. Gamertown style: After #GAMERTOWNREADY
  if (!name && (source.handle === '@gamertown.id' || caption.includes('#GAMERTOWNREADY') || caption.includes('#gamertownready'))) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('#GAMERTOWNREADY') || lines[i].includes('#gamertownready')) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && (lines[nextIdx] === '_' || lines[nextIdx] === '-' || lines[nextIdx] === '•')) {
          nextIdx++;
        }
        if (nextIdx < lines.length && !lines[nextIdx].toLowerCase().includes('kondisi:')) {
          name = lines[nextIdx];
          break;
        }
      }
    }
  }

  // C. Game Consign style: e.g. "PRE-OWNED PICK OF THE DAY!\n\nStarlink V4 Flat Gen 3"
  if (!name && source.handle === '@gameconsign') {
    for (const l of lines) {
      if (l.includes('PICK OF THE DAY') || l.includes('PRE-OWNED') || l.includes('PROMO') || l.includes('HOT DEAL') || l.includes('SAMA-SAMA')) continue;
      const matchAda = l.match(/(?:ada|berupa|yaitu|unit|nih,)\s+([A-Za-z0-9\s+_-]{4,50}?)(?:\s+dengan|\s+kondisi|\s+seharga|\s+garansi|,|\!)/i);
      if (matchAda) {
        name = matchAda[1].trim();
        break;
      }
      const matchStar = l.match(/(?:nih|unit|yaitu)\s*,\s*([A-Za-z0-9\s+_-]{4,40})/i);
      if (matchStar) {
        name = matchStar[1].trim();
        break;
      }
      if (l.length > 5 && l.length < 50 && !l.includes('http') && !l.includes('Kondisi:') && !l.includes('Harga:') && !l.toLowerCase().includes('stok')) {
        name = l;
        break;
      }
    }
  }

  // D. General fallback: First non-boilerplate line
  if (!name) {
    const candidate = lines.find(l => {
      const lowerCandidate = l.toLowerCase();
      if (lowerCandidate.includes('gratis') || lowerCandidate.includes('halo gamers') || lowerCandidate.includes('selamat datang') || lowerCandidate.includes('under market price')) return false;
      if (lowerCandidate.startsWith('#') || lowerCandidate.startsWith('http') || lowerCandidate.includes('whatsapp') || lowerCandidate.includes('line')) return false;
      return l.length > 3 && l.length < 70;
    });
    if (candidate) name = candidate;
  }

  // Strict check against marketing boilerplate
  const BOGUS_PATTERNS = [
    /gratis/i,
    /pick of the day/i,
    /harga sama/i,
    /hiring/i,
    /recruitment/i,
    /lowongan/i,
    /halo gamers/i,
    /selamat datang/i,
    /under market price/i,
    /for order/i,
    /for consign/i,
    /ready/i,
    /stok\s*:/i,
    /^stok/i
  ];
  if (name && BOGUS_PATTERNS.some(rgx => rgx.test(name))) {
    name = '';
  }

  if (!name) return null;
  name = name.replace(/^[:\s-]+|[:\s-]+$/g, '').trim();

  // 3. Category extraction
  let category = 'Consignment';
  const catMatch = caption.match(/#TLTAVAIL_([A-Za-z0-9_]+)/i) ||
    caption.match(/(?:category|kategori|peripherals)\s*:\s*([^\n\r]+)/i);
  if (catMatch) {
    category = catMatch[1].trim();
  } else if (/rtx|gtx|radeon|rx\s*\d|geforce|vga/i.test(name)) {
    category = 'GPU / VGA';
  } else if (/ryzen|intel|core\s*i\d|processor|cpu/i.test(name)) {
    category = 'Processor / CPU';
  } else if (/ps5|ps4|playstation|xbox|nintendo|switch|oled|handheld|steam\s*deck|claw|rog\s*ally/i.test(name)) {
    category = 'Console / Handheld';
  } else if (/game|cartridge|bd|disc|kaset/i.test(caption)) {
    category = 'Game Software';
  } else if (/monitor|keyboard|mouse|headset|cooler|ram|ssd/i.test(name)) {
    category = 'PC Parts & Peripherals';
  }

  return { name, price, category };
}

// --- Live Instagram Profile Scraping (Real-Time Zero-Lag Feed Across Consign Stores) ---
async function fetchLiveInstagramPosts(source) {
  if (!source.handle && !source.instagram) return [];
  const handle = (source.handle || '@thelazytitip').replace('@', '').trim();
  const url = `https://www.instagram.com/${handle}/`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });

    if (!res.ok) {
      console.warn(`[Deals Watcher] Live Instagram profile fetch for ${handle} returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const regex = /"caption":\{"pk":"\d+","text":"([^"]+)"\}[\s\S]*?"id":"POLARIS_(\d+)"/g;
    let match;
    const items = [];
    const seenShortcodes = new Set();

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    while ((match = regex.exec(html)) !== null) {
      const rawCaption = match[1];
      const caption = rawCaption
        .replace(/\\n/g, '\n')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const mediaId = match[2];
      const shortcode = idToShortcode(mediaId);

      if (!shortcode || seenShortcodes.has(shortcode)) continue;
      seenShortcodes.add(shortcode);

      const parsed = parseConsignCaption(caption, source);
      if (!parsed) continue;

      const postUrl = `https://www.instagram.com/p/${shortcode}/`;
      const prefix = source.prefix || 'consign';
      const id = `${prefix}_ig_${shortcode}`;

      items.push({
        id,
        shortcode,
        sourceId: source.id,
        sourceName: source.name,
        sourceHandle: source.handle,
        adminPhone: source.whatsapp,
        lineUrl: source.line,
        num: `${prefix.toUpperCase()}-${shortcode.slice(0, 5)}`,
        date: todayStr,
        category: parsed.category,
        name: parsed.name,
        price: parsed.price,
        rawPrice: `Rp ${parsed.price.toLocaleString('id-ID')}`,
        link: postUrl,
        isLiveInstagram: true,
        igDetails: {
          description: caption,
          image: null,
          fetchedAt: new Date().toISOString()
        }
      });

      if (items.length >= 8) break;
    }

    return items;
  } catch (err) {
    console.error(`[Deals Watcher] Error fetching live Instagram posts for ${source.name}:`, err.message);
    return [];
  }
}

async function fetchAllLiveInstagramPosts() {
  const sources = loadSources().filter(s => s.enabled && (s.handle || s.instagram));
  const allItems = [];
  for (const src of sources) {
    const items = await fetchLiveInstagramPosts(src);
    allItems.push(...items);
    await new Promise(r => setTimeout(r, 600));
  }
  return allItems;
}

// --- Gemini AI Market & Facebook Marketplace Valuation ---
async function evaluateItemsWithGemini(itemsToEvaluate) {
  if (!itemsToEvaluate || itemsToEvaluate.length === 0) return [];

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn('[Deals Watcher] No GEMINI_API_KEY available. Using fallback heuristics.');
    return itemsToEvaluate.map(item => ({
      id: item.id,
      num: item.num,
      name: item.name,
      fb_marketplace_price_idr: item.price,
      fb_price_range: `Rp ${item.price.toLocaleString('id-ID')}`,
      discount_pct: 0,
      is_good_deal: false,
      deal_rating: 'UNKNOWN',
      market_notes: 'Market appraisal pending AI API key.',
      reason: 'AI evaluation skipped (no API key configured).'
    }));
  }

  const payloadItems = itemsToEvaluate.map(it => {
    const rawDesc = it.igDetails?.description || it.description || null;
    let sellerDesc = 'Deskripsi belum tersedia (gunakan estimasi kondisi wajar secondhand standard)';
    if (rawDesc) {
      sellerDesc = rawDesc.slice(0, 1500);
    }
    return {
      id: it.id,
      num: it.num,
      category: it.category,
      name: it.name,
      listed_price: it.price,
      seller_description: sellerDesc
    };
  });

  const prompt = `You are a premier professional appraiser of Indonesian secondhand electronics, PC parts, gaming hardware, consoles, smartphones, audio, and collectibles with daily real-world knowledge of active and closing prices on Facebook Marketplace Indonesia (FJB PC parts, OLX, Tokopedia secondhand).

You are given consignment items from trusted Indonesian gaming, PC, and tech consignment stores (including The Lazy Titip, Consign Game ID, Gudang VGA, Titip Game, Game Consign). Crucially, each item includes its "seller_description" extracted directly from Instagram (detailing condition, health/wear, completeness/kelengkapan, official warranty status, and any defects or minus).

PRICE CONSIDERATION RULES (MANDATORY):
0. CLEAN PRODUCT TITLE:
   - "clean_title": Extract the true, concise, professional hardware/console/accessory name from the seller description (e.g. "Steelseries Nimbus Wireless Controller", "MSI Claw A1M Ultra 7 512GB", "ASUS ROG Strix RTX 2080 Ti 11GB", "Ghost of Tsushima PS4/PS5"). Never use marketing slogans, headers, or emojis.

1. SELLER DESCRIPTION & REAL CONDITION INTEGRATION:
   - Completeness (Kelengkapan): Fullset (box, cables, accessories, original receipt) vs Batangan / Unit Only. In Indonesian FJB, unit-only hardware carries a 15% to 25% price discount penalty vs fullset.
   - Warranty (Garansi): Official Indonesian distributor warranty (e.g. iBox, TAM, NJT, Synnex, Astrindo, Datascrip, etc.) commands a higher market value. Expired warranty (garansi habis / personal 3 hari / garansi off) drops market value significantly.
   - Health, Wear & Defects (Kondisi & Minus): Any noted wear (e.g. SSD health < 90%, battery health < 85%, lecet, fan noise, drift, scratch, shadow, pin issue, missing screws) MUST severely penalize the fair market price. An item with defects or low health is NOT a good deal even if priced lower than pristine units.
   - Bundled Extras (Bonus): If the seller includes valuable extras (e.g. coiled cable, extra controller, cooler, dock, accessories), factor their secondhand value positively.

2. BENCHMARK & EVALUATION OUTPUT:
   - "fb_marketplace_price_idr": The realistic fair going rate on Indonesian Facebook Marketplace for THIS SPECIFIC ITEM IN THIS SPECIFIC CONDITION (accounting for its warranty, kelengkapan, and defects).
   - "fb_price_range": String range, e.g. "Rp 2.800.000 - Rp 3.200.000 (unit only, garansi off, health 87%)".
   - "discount_pct": Integer percent difference of listed_price vs fair FB Marketplace rate ((fb_marketplace_price_idr - listed_price) / fb_marketplace_price_idr * 100).
   - "is_good_deal": boolean. True ONLY if listed_price is genuinely >= 20% cheaper than fair market rate GIVEN its specific condition, kelengkapan, and minuses.
   - "deal_rating": ["STEAL", "GOOD_DEAL", "FAIR", "OVERPRICED"].
     - "STEAL": >= 35% discount or rare high-demand bargain considering condition.
     - "GOOD_DEAL": 20% to 34% discount considering condition.
     - "FAIR": normal FB Marketplace price (-19% to +15%).
     - "OVERPRICED": above typical FB Marketplace price (>15%), especially if listed high despite minuses/expired warranty/unit only.
   - "market_notes": 1-2 punchy sentences citing the condition/warranty/kelengkapan from the seller description and how it affects market value vs standard FJB rates.
   - "reason": 1 punchy verdict explaining why it is or is not worth buying given the seller description.

Items to evaluate:
${JSON.stringify(payloadItems, null, 2)}

Output strictly valid JSON with key "results":
{
  "results": [
    {
      "id": "...",
      "num": "...",
      "clean_title": "Clean concise hardware name",
      "fb_marketplace_price_idr": 3100000,
      "fb_price_range": "Rp 2.900.000 - Rp 3.300.000",
      "discount_pct": 22,
      "is_good_deal": true,
      "deal_rating": "GOOD_DEAL",
      "market_notes": "...",
      "reason": "..."
    }
  ]
}`;

  const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Deals Watcher] Model ${model} returned ${res.status}: ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await res.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.results)) {
          return parsed.results;
        }
      }
    } catch (err) {
      console.error(`[Deals Watcher] Error calling ${model}:`, err.message);
    }
  }

  return itemsToEvaluate.map(item => ({
    id: item.id,
    num: item.num,
    name: item.name,
    fb_marketplace_price_idr: item.price,
    fb_price_range: `Rp ${item.price.toLocaleString('id-ID')}`,
    discount_pct: 0,
    is_good_deal: false,
    deal_rating: 'UNKNOWN',
    market_notes: 'Valuation temporarily unavailable.',
    reason: 'Evaluation temporarily unavailable.'
  }));
}

// --- Format Discord Message & Embed for Deal Alerts ---
function buildDealEmbed(item, evalResult, isPriceDrop = false) {
  const isSteal = evalResult.deal_rating === 'STEAL' || evalResult.discount_pct >= 35;
  const prefix = isPriceDrop ? '📉 [PRICE DROP]' : isSteal ? '🔥 [STEAL DEAL]' : '⚡ [GOOD DEAL]';
  const color = isSteal ? 0xff3366 : 0x00d26a;

  const fbRange = evalResult.fb_price_range ||
    (evalResult.fb_marketplace_price_idr ? `Rp ${evalResult.fb_marketplace_price_idr.toLocaleString('id-ID')}` :
    (evalResult.market_price_idr ? `Rp ${evalResult.market_price_idr.toLocaleString('id-ID')}` : 'Market Rate'));

  const discountFormatted = evalResult.discount_pct > 0
    ? `**~${evalResult.discount_pct}% di bawah harga pasar FB**`
    : 'Di bawah harga pasar';

  const timeSince = getTimeSinceListing(item);

  const cleanLink = cleanInstagramUrl(item.link);
  const storeStr = item.sourceName ? `🏪 **Toko Consign**: **${item.sourceName}** (\`${item.sourceHandle || '@consign'}\`)\n` : '';
  let desc =
    `> **${evalResult.reason || evalResult.market_notes || 'Harga notable di bawah pasaran FB Marketplace!'}**\n\n` +
    storeStr +
    `🏷️ **Kategori**: \`${item.category}\` • No: **#${item.num || 'N/A'}**\n` +
    `⏱️ **Listing**: **${timeSince.text}** (${item.date || 'Recent'})\n` +
    `💰 **Harga Titip**: **Rp ${item.price.toLocaleString('id-ID')}**\n` +
    `🏪 **Pasar FB**: ~~${fbRange}~~\n` +
    `📉 **Diskon**: ${discountFormatted} (\`${evalResult.deal_rating || 'GOOD_DEAL'}\`)\n` +
    `📝 **Analisa**: ${evalResult.market_notes || 'Harga sangat bersaing di pasaran secondhand.'}`;

  if (item.igDetails?.image) {
    desc += `\n📸 **Foto Produk**: [Buka Resolusi Penuh (1080×1350)](${item.igDetails.image})`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${prefix} ${item.name}`)
    .setDescription(desc)
    .setColor(color)
    .setFooter({
      text: `${item.sourceName || 'Consignment'} Sentinel • Cuangbot • Item #${item.num || 'N/A'}`
    })
    .setTimestamp();

  if (cleanLink) {
    embed.setURL(cleanLink);
  }

  if (item.igDetails?.image) {
    embed.setImage(item.igDetails.image);
  }

  const buttons = [];
  const waUrl = buildAdminWhatsAppUrl(item, item.igDetails);

  if (item.adminPhone) {
    const storeShort = (item.sourceName || 'Admin').replace(/^The\s+/i, '');
    buttons.push(
      new ButtonBuilder()
        .setLabel(`Tanya ${storeShort} (WhatsApp)`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(waUrl)
        .setEmoji('📱')
    );
  }

  if (cleanLink) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Buka Post Instagram')
        .setStyle(ButtonStyle.Link)
        .setURL(cleanLink)
        .setEmoji('📸')
    );
  }

  if (item.lineUrl) {
    const storeShort = (item.sourceName || 'Consign').replace(/^The\s+/i, '');
    buttons.push(
      new ButtonBuilder()
        .setLabel(`Order Line (${storeShort})`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(item.lineUrl)
        .setEmoji('💬')
    );
  }

  const row = new ActionRowBuilder().addComponents(buttons);
  return { embeds: [embed], components: [row] };
}

// --- Single Item Detail & Description Embed Builder ---
async function buildItemDetailPayload(item, options = {}) {
  const { fromBrowse = null } = options;
  const ledger = loadLedger();

  let igDetails = item.igDetails;
  // Only fetch if completely missing and link is present
  if ((!igDetails || !igDetails.description) && item.link) {
    igDetails = await fetchInstagramDetails(item.link);
    if (igDetails) {
      item.igDetails = igDetails;
      if (ledger.items[item.id]) {
        ledger.items[item.id].igDetails = igDetails;
        saveLedger(ledger);
      }
    }
  }

  const evalData = item.evaluation || {};
  const isSteal = evalData.deal_rating === 'STEAL' || evalData.discount_pct >= 35;
  const isGood = evalData.deal_rating === 'GOOD_DEAL' || evalData.is_good_deal;
  const badge = isSteal ? '🔥 [STEAL]' : isGood ? '⚡ [GOOD DEAL]' : evalData.deal_rating === 'OVERPRICED' ? '📈 [OVERPRICED]' : '⚖️ [FAIR]';
  const color = isSteal ? 0xff3366 : isGood ? 0x00d26a : evalData.deal_rating === 'OVERPRICED' ? 0xe67e22 : 0x3498db;

  const fbRange = evalData.fb_price_range ||
    (evalData.fb_marketplace_price_idr ? `Rp ${evalData.fb_marketplace_price_idr.toLocaleString('id-ID')}` :
    (evalData.market_price_idr ? `Rp ${evalData.market_price_idr.toLocaleString('id-ID')}` : 'Market Rate'));

  let diffStr = '';
  if (evalData.discount_pct !== undefined && evalData.discount_pct !== null && evalData.discount_pct !== 0) {
    diffStr = evalData.discount_pct > 0
      ? ` (**-${evalData.discount_pct}%** di bawah harga FB Market)`
      : ` (**+${Math.abs(evalData.discount_pct)}%** di atas harga FB Market)`;
  }

  const timeSince = getTimeSinceListing(item);
  const cleanLink = cleanInstagramUrl(item.link);

  const embed = new EmbedBuilder()
    .setTitle(`${badge} ${item.name}`)
    .setColor(color)
    .setFooter({
      text: `Item #${item.num || 'N/A'} • ${item.sourceName || 'The Lazy Titip'} • ${item.date || 'Active'}`
    })
    .setTimestamp();

  if (cleanLink) {
    embed.setURL(cleanLink);
  }

  const storeStr = item.sourceName ? `🏪 **Toko Consign**: **${item.sourceName}** (\`${item.sourceHandle || '@consign'}\`)\n` : '';
  let descText =
    storeStr +
    `🏷️ **Kategori**: \`${item.category}\` • No: **#${item.num || 'N/A'}**\n` +
    `⏱️ **Listing**: **${timeSince.text}** (${item.date || 'Active'})\n` +
    `💰 **Harga Titip**: **Rp ${item.price.toLocaleString('id-ID')}**\n` +
    `🏪 **Pasaran FB**: **${fbRange}**${diffStr}\n` +
    `📝 **Pertimbangan Pasar & Kondisi**: _${evalData.market_notes || evalData.reason || 'Sesuai dengan harga wajar pasar FJB secondhand Indonesia.'}_\n\n`;

  if (igDetails?.image) {
    descText += `📸 **Foto Produk**: [Buka Resolusi Penuh (1080×1350)](${igDetails.image})\n\n`;
  }

  const cleanedDesc = cleanDescriptionText(igDetails?.description);
  if (cleanedDesc) {
    const truncatedDesc = cleanedDesc.length > 1400
      ? cleanedDesc.slice(0, 1350) + '\n_(deskripsi dipersingkat)_'
      : cleanedDesc;
    descText += `📋 **Kondisi & Kelengkapan (Penjual)**:\n\`\`\`text\n${truncatedDesc}\n\`\`\``;
  } else {
    descText += `📋 **Kondisi & Kelengkapan (Penjual)**: _Deskripsi Instagram belum tersedia._`;
  }

  embed.setDescription(descText);

  if (igDetails?.image) {
    embed.setImage(igDetails.image);
  }

  const buttonsRow1 = [];
  const waUrl = buildAdminWhatsAppUrl(item, igDetails);

  if (item.adminPhone) {
    const storeShort = (item.sourceName || 'Admin').replace(/^The\s+/i, '');
    buttonsRow1.push(
      new ButtonBuilder()
        .setLabel(`Tanya ${storeShort} (WhatsApp)`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(waUrl)
        .setEmoji('📱')
    );
  }

  if (cleanLink) {
    buttonsRow1.push(
      new ButtonBuilder()
        .setLabel('Buka Post IG')
        .setStyle(ButtonStyle.Link)
        .setURL(cleanLink)
        .setEmoji('📸')
    );
  }

  if (item.lineUrl) {
    const storeShort = (item.sourceName || 'Consign').replace(/^The\s+/i, '');
    buttonsRow1.push(
      new ButtonBuilder()
        .setLabel(`Order Line (${storeShort})`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(item.lineUrl)
        .setEmoji('💬')
    );
  }

  if (fromBrowse) {
    const { page = 1, dealsOnly = 0, category = 'all', sort = 'date_desc', timeSince: timeFilter = 'all', search = '' } = fromBrowse;
    const safeCat = encodeURIComponent(category);
    const safeSort = encodeURIComponent(sort);
    const safeTime = encodeURIComponent(timeFilter);
    const safeSearch = encodeURIComponent(search);

    buttonsRow1.push(
      new ButtonBuilder()
        .setCustomId(`deals:browse:${page}:${dealsOnly ? 1 : 0}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
        .setLabel('Kembali')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️')
    );
  }

  const row1 = new ActionRowBuilder().addComponents(buttonsRow1);
  return { embeds: [embed], components: [row1] };
}

// --- Background Catalog Appraiser ---
async function syncCatalogEvaluations(options = {}) {
  const { forceReevaluateAll = false } = options;
  if (isBackgroundAppraising) return;
  isBackgroundAppraising = true;

  try {
    const ledger = loadLedger();
    const toAppraise = [];

    for (const item of Object.values(ledger.items)) {
      const needsAppraisal = forceReevaluateAll ||
        !item.evaluation ||
        !item.evaluation.fb_price_range ||
        (!item.evaluation.has_description_considered && item.link);

      if (needsAppraisal) {
        toAppraise.push(item);
      }
    }

    if (toAppraise.length === 0) {
      isBackgroundAppraising = false;
      return;
    }

    console.log(`[Deals Watcher] Background appraising ${toAppraise.length} active listings with Instagram descriptions...`);

    const BATCH_SIZE = 5;
    for (let i = 0; i < toAppraise.length; i += BATCH_SIZE) {
      const batch = toAppraise.slice(i, i + BATCH_SIZE);

      // Pre-fetch Instagram details for batch if missing
      await Promise.all(
        batch.map(async it => {
          if (it.link && (!it.igDetails || !it.igDetails.description)) {
            const details = await fetchInstagramDetails(it.link);
            if (details) {
              it.igDetails = details;
              if (ledger.items[it.id]) {
                ledger.items[it.id].igDetails = details;
              }
            }
          }
        })
      );

      const results = await evaluateItemsWithGemini(batch);

      for (const res of results) {
        const it = ledger.items[res.id];
        if (it) {
          it.evaluation = {
            ...it.evaluation,
            ...res,
            has_description_considered: !!(it.igDetails?.description),
            evaluatedAt: new Date().toISOString()
          };
          if (res.is_good_deal && !it.evaluation.deal_rating) {
            it.evaluation.deal_rating = res.deal_rating;
          }
        }
      }

      saveLedger(ledger);
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`[Deals Watcher] Background description-aware catalog appraisal complete!`);
  } catch (err) {
    console.error(`[Deals Watcher] Error in syncCatalogEvaluations:`, err.message);
  } finally {
    isBackgroundAppraising = false;
  }
}

// --- Main Scan & Watch Loop ---
async function runDealsCheck(client, options = {}) {
  const { forceBroadcast = false, limitRecent = null } = options;
  if (isScanning) {
    return { status: 'already_scanning' };
  }

  isScanning = true;
  const ledger = loadLedger();
  const isFirstRun = Object.keys(ledger.items).length === 0;

  try {
    console.log('[Deals Watcher] Fetching spreadsheet items and live Instagram feed in parallel...');
    const [currentSheetItems, liveIgItems] = await Promise.all([
      fetchCurrentSheetItems(),
      fetchAllLiveInstagramPosts()
    ]);
    console.log(`[Deals Watcher] Active items - Sheet: ${currentSheetItems.length}, Live Instagram: ${liveIgItems.length}`);

    const toEvaluate = [];
    const itemsMap = new Map();

    // 1. Process Sheet Items
    for (const item of currentSheetItems) {
      itemsMap.set(item.id, item);
      const sheetShortcode = extractShortcodeFromUrl(item.link);
      const existingByCode = sheetShortcode ? itemByShortcodeIndex.get(sheetShortcode.toLowerCase()) : null;
      const existing = ledger.items[item.id] || existingByCode;

      if (!existing) {
        toEvaluate.push({ item, isPriceDrop: false });
      } else {
        // Reconcile if this item was first discovered via live Instagram post
        if (existing.isLiveInstagram && existing.id !== item.id) {
          existing.num = item.num;
          existing.sheetId = item.id;
          ledger.items[item.id] = existing;
          itemByIdIndex.set(item.id.toLowerCase(), existing);
          if (item.num) itemByNumIndex.set(item.num.toLowerCase(), existing);
        }

        if (existing.price > item.price) {
          toEvaluate.push({ item, isPriceDrop: true, oldPrice: existing.price });
        } else {
          existing.link = item.link || existing.link;
          existing.lastSeenAt = new Date().toISOString();
        }
      }
    }

    // 2. Process Live Instagram Items (Zero-Lag Alerts)
    for (const item of liveIgItems) {
      const code = item.shortcode || extractShortcodeFromUrl(item.link);
      const existing = (code ? itemByShortcodeIndex.get(code.toLowerCase()) : null) || ledger.items[item.id];

      if (!existing) {
        console.log(`[Deals Watcher] ⚡ Live Instagram post detected: ${item.name} (${item.link})`);
        toEvaluate.push({ item, isPriceDrop: false });
      } else if (existing.price > item.price) {
        console.log(`[Deals Watcher] 📉 Price drop detected on live Instagram: ${item.name}`);
        toEvaluate.push({ item: { ...existing, price: item.price }, isPriceDrop: true, oldPrice: existing.price });
      } else {
        existing.lastSeenAt = new Date().toISOString();
        if (!existing.igDetails?.description && item.igDetails?.description) {
          existing.igDetails = item.igDetails;
        }
      }
    }

    let queue = toEvaluate;
    if (isFirstRun) {
      console.log(`[Deals Watcher] Initial seeding run: evaluating latest 15 items for existing deals.`);
      const allActive = [...currentSheetItems, ...liveIgItems];
      const recentIds = new Set(allActive.slice(-15).map(i => i.id));
      queue = toEvaluate.filter(entry => recentIds.has(entry.item.id));

      for (const entry of toEvaluate) {
        if (!recentIds.has(entry.item.id)) {
          ledger.items[entry.item.id] = {
            ...entry.item,
            evaluation: null,
            notified: true,
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
          };
        }
      }
    }

    if (limitRecent && queue.length > limitRecent) {
      queue = queue.slice(-limitRecent);
    }

    console.log(`[Deals Watcher] Items queued for AI appraisal: ${queue.length}`);

    const evaluatedResults = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);

      // Pre-fetch Instagram details (uncropped image, accurate post date & age) for items in batch
      await Promise.all(
        batch.map(async entry => {
          if (entry.item.link && (!entry.item.igDetails?.image || !entry.item.igDetails?.postDateStr)) {
            const details = await fetchInstagramDetails(entry.item.link);
            if (details) {
              entry.item.igDetails = {
                ...entry.item.igDetails,
                ...details
              };
              if (details.postDateStr) {
                entry.item.date = details.postDateStr;
              }
              if (ledger.items[entry.item.id]) {
                ledger.items[entry.item.id].igDetails = entry.item.igDetails;
                if (details.postDateStr) {
                  ledger.items[entry.item.id].date = details.postDateStr;
                }
              }
            }
          }
        })
      );

      const results = await evaluateItemsWithGemini(batch.map(b => b.item));
      for (const res of results) {
        const match = batch.find(b => b.item.id === res.id || b.item.num === res.num);
        if (match) {
          if (res.clean_title && res.clean_title.trim().length >= 3) {
            match.item.name = res.clean_title.trim();
          }
          evaluatedResults.push({
            entry: match,
            evaluation: {
              ...res,
              has_description_considered: !!(match.item.igDetails?.description)
            }
          });
        }
      }
    }

    for (const [id, existingItem] of Object.entries(ledger.items)) {
      if (existingItem.evaluation?.is_good_deal && !existingItem.notified) {
        if (!evaluatedResults.some(r => r.entry.item.id === id)) {
          evaluatedResults.push({
            entry: { item: existingItem, isPriceDrop: false },
            evaluation: existingItem.evaluation
          });
        }
      }
    }

    let newDealsFound = 0;
    const targetChannel = client?.channels?.cache?.get(GOOD_DEALS_CHANNEL_ID) ||
      (await client?.channels?.fetch(GOOD_DEALS_CHANNEL_ID).catch(() => null));

    for (const { entry, evaluation } of evaluatedResults) {
      const { item, isPriceDrop } = entry;
      const isGoodDeal = evaluation.is_good_deal === true;

      // Extract accurate post date from Instagram details if available
      if (item.igDetails?.postDateStr) {
        item.date = item.igDetails.postDateStr;
      }

      const isStale = item.igDetails?.daysOld && item.igDetails.daysOld > 5;

      ledger.items[item.id] = {
        ...item,
        evaluation,
        notified: isStale ? true : (ledger.items[item.id]?.notified || false),
        firstSeenAt: ledger.items[item.id]?.firstSeenAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      if (isGoodDeal) {
        newDealsFound++;
        ledger.stats.dealsFound = (ledger.stats.dealsFound || 0) + 1;

        const shouldNotify = ((!ledger.items[item.id].notified) || isPriceDrop || forceBroadcast) && !isStale;
        if (shouldNotify && targetChannel) {
          try {
            if (item.link && (!item.igDetails || !item.igDetails.image)) {
              item.igDetails = await fetchInstagramDetails(item.link);
              if (item.igDetails && ledger.items[item.id]) {
                ledger.items[item.id].igDetails = item.igDetails;
              }
            }
            const payload = buildDealEmbed(item, evaluation, isPriceDrop);
            await targetChannel.send(payload);
            ledger.items[item.id].notified = true;
            ledger.stats.notificationsSent = (ledger.stats.notificationsSent || 0) + 1;
            console.log(`[Deals Watcher] 🚀 Broadcasted deal: ${item.name} (${evaluation.deal_rating})`);
          } catch (sendErr) {
            console.error(`[Deals Watcher] Failed to send message to Discord:`, sendErr.message);
          }
        }
      }
    }

    ledger.lastChecked = new Date().toISOString();
    ledger.totalChecks = (ledger.totalChecks || 0) + 1;
    ledger.stats.totalItemsSeen = Object.keys(ledger.items).length;
    saveLedger(ledger);

    setTimeout(() => {
      syncCatalogEvaluations().catch(console.error);
    }, 2000);

    return {
      status: 'ok',
      totalActive: currentSheetItems.length + liveIgItems.length,
      totalActiveSheet: currentSheetItems.length,
      totalLiveInstagram: liveIgItems.length,
      evaluatedCount: evaluatedResults.length,
      newDealsFound,
      evaluatedResults
    };
  } catch (err) {
    console.error('[Deals Watcher] Error during scan:', err);
    return { status: 'error', error: err.message };
  } finally {
    isScanning = false;
  }
}

// --- Scheduler ---
function startDealsScheduler(client) {
  clientRef = client;
  console.log(`[Deals Watcher] Initializing Deal Sentinel for #${GOOD_DEALS_CHANNEL_ID}...`);
  console.log(`[Deals Watcher] Polling interval set to ${POLL_INTERVAL_MS / 1000}s`);

  setTimeout(() => {
    runDealsCheck(client).catch(err => {
      console.error('[Deals Watcher] Initial run error:', err);
    });
  }, 5000);

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    runDealsCheck(client).catch(err => {
      console.error('[Deals Watcher] Recurring run error:', err);
    });
  }, POLL_INTERVAL_MS);
}

// --- Get Top Active Deals ---
function getTopDeals(limit = 10) {
  const ledger = loadLedger();
  const goodDeals = [];

  for (const item of Object.values(ledger.items)) {
    if (item.evaluation && item.evaluation.is_good_deal) {
      goodDeals.push(item);
    }
  }

  goodDeals.sort((a, b) => (b.evaluation?.discount_pct || 0) - (a.evaluation?.discount_pct || 0));
  return goodDeals.slice(0, limit);
}

// --- Catalog Browser Embed & Component Builder with Advanced Sorting & Time Filtering ---
function buildListingsBrowsePayload({ page = 1, category = 'all', search = '', dealsOnly = false, sort = 'date_desc', timeSince = 'all' }) {
  const ledger = loadLedger();
  const allItems = Object.values(ledger.items || {});

  // 1. Filter items by category, search, dealsOnly, and timeSince
  let filtered = allItems.filter(item => {
    if (category && category !== 'all') {
      if (item.category.toLowerCase() !== category.toLowerCase()) return false;
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      const matchNum = (item.num || '').toLowerCase() === q;
      if (!matchName && !matchCat && !matchNum) return false;
    }

    if (dealsOnly) {
      const isDeal = item.evaluation?.is_good_deal === true ||
        item.evaluation?.deal_rating === 'STEAL' ||
        item.evaluation?.deal_rating === 'GOOD_DEAL';
      if (!isDeal) return false;
    }

    if (timeSince && timeSince !== 'all') {
      const age = getTimeSinceListing(item);
      const maxDays = timeSince === '1d' ? 1
        : timeSince === '3d' ? 3
        : timeSince === '7d' ? 7
        : timeSince === '14d' ? 14
        : timeSince === '30d' ? 30 : 9999;
      if (age.days > maxDays) return false;
    }

    return true;
  });

  // 2. Sorting Logic
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === 'selisih_desc') {
    filtered.sort((a, b) => (b.evaluation?.discount_pct || 0) - (a.evaluation?.discount_pct || 0));
  } else if (sort === 'selisih_asc') {
    filtered.sort((a, b) => (a.evaluation?.discount_pct || 0) - (b.evaluation?.discount_pct || 0));
  } else if (sort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'name_desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sort === 'date_asc') {
    filtered.sort((a, b) => parseListingDate(a.date) - parseListingDate(b.date) || parseInt(a.num || '0', 10) - parseInt(b.num || '0', 10));
  } else {
    // Default: date_desc (newest date first)
    filtered.sort((a, b) => parseListingDate(b.date) - parseListingDate(a.date) || parseInt(b.num || '0', 10) - parseInt(b.num || '0', 10));
  }

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  // 3. Build Embed
  const embed = new EmbedBuilder()
    .setTitle('📋 Active Listings & Facebook Marketplace Benchmarks')
    .setColor(dealsOnly ? 0xff3366 : 0x3498db)
    .setFooter({
      text: `Page ${currentPage} of ${totalPages} • Total: ${filtered.length} listings • The Lazy Titip Watcher`
    })
    .setTimestamp();

  const sortLabels = {
    date_desc: '📅 Tanggal Terbaru',
    date_asc: '📅 Tanggal Terlama',
    price_asc: '💰 Harga Termurah',
    price_desc: '💰 Harga Termahal',
    selisih_desc: '📉 Diskon Terbesar',
    selisih_asc: '📈 Diskon Terkecil',
    name_asc: '🔤 Nama (A - Z)',
    name_desc: '🔤 Nama (Z - A)'
  };

  const timeLabels = {
    all: 'Semua Waktu',
    '1d': '≤ 24 Jam Terakhir',
    '3d': '≤ 3 Hari Terakhir',
    '7d': '≤ 1 Minggu Terakhir',
    '14d': '≤ 2 Minggu Terakhir',
    '30d': '≤ 1 Bulan Terakhir'
  };

  const filterSummary = [];
  if (category && category !== 'all') filterSummary.push(`🏷️ Kategori: \`${category}\``);
  if (timeSince && timeSince !== 'all') filterSummary.push(`⏱️ Usia: \`${timeLabels[timeSince] || timeSince}\``);
  if (search && search.trim()) filterSummary.push(`🔍 Cari: \`"${search}"\``);
  filterSummary.push(`🔃 Urutan: \`${sortLabels[sort] || sort}\``);
  if (dealsOnly) filterSummary.push(`🔥 **Deals Only**`);
  else filterSummary.push(`📋 **Semua Stok**`);

  embed.setDescription(
    filterSummary.join(' | ') + '\n' +
    'Showing listed prices, time since listing, and typical valid Facebook Marketplace going rates:\n\u200B'
  );

  if (pageItems.length === 0) {
    embed.addFields({
      name: 'No items match your criteria',
      value: 'Try adjusting the time filter, clearing the search query, or selecting a different category.'
    });
  } else {
    pageItems.forEach((it, idx) => {
      const itemNum = startIndex + idx + 1;
      const evalData = it.evaluation || {};
      const rating = evalData.deal_rating || (evalData.is_good_deal ? 'GOOD_DEAL' : 'PENDING');

      let ratingBadge = '⚖️ `[FAIR]`';
      if (rating === 'STEAL') ratingBadge = '🔥 `[STEAL]`';
      else if (rating === 'GOOD_DEAL') ratingBadge = '⚡ `[GOOD DEAL]`';
      else if (rating === 'OVERPRICED') ratingBadge = '📈 `[OVERPRICED]`';
      else if (rating === 'PENDING') ratingBadge = '⏳ `[APPRAISING]`';

      const fbRange = evalData.fb_price_range ||
        (evalData.fb_marketplace_price_idr ? `Rp ${evalData.fb_marketplace_price_idr.toLocaleString('id-ID')}` :
        (evalData.market_price_idr ? `Rp ${evalData.market_price_idr.toLocaleString('id-ID')}` : 'Calculating...'));

      let diffStr = '';
      if (evalData.discount_pct !== undefined && evalData.discount_pct !== null && evalData.discount_pct !== 0) {
        if (evalData.discount_pct > 0) {
          diffStr = ` (**-${evalData.discount_pct}%** below FB Market)`;
        } else {
          diffStr = ` (**+${Math.abs(evalData.discount_pct)}%** above FB Market)`;
        }
      }

      const timeSinceInfo = getTimeSinceListing(it);
      const notes = evalData.market_notes || evalData.reason || 'Typical secondhand trading range on Facebook Marketplace groups.';
      const igLink = it.link ? ` • [📸 View on IG](${it.link})` : '';

      embed.addFields({
        name: `${itemNum}. ${ratingBadge} ${it.name} (#${it.num || 'N/A'})`,
        value:
          `• 🏷️ **Category**: \`${it.category}\` • ⏱️ **Listed**: **${timeSinceInfo.text}** (${it.date || 'Active'})\n` +
          `• 💰 **Harga Titip (Listed)**: **Rp ${it.price.toLocaleString('id-ID')}**\n` +
          `• 🏪 **FB Marketplace**: **${fbRange}**${diffStr}\n` +
          `• 📝 **Market Notes**: _${notes}_${igLink}`
      });
    });
  }

  // 4. Action Row 1: Navigation Buttons
  const safeCat = encodeURIComponent(category || 'all');
  const safeSort = encodeURIComponent(sort || 'date_desc');
  const safeTime = encodeURIComponent(timeSince || 'all');
  const safeSearch = encodeURIComponent((search || '').slice(0, 20));
  const dealsFlag = dealsOnly ? '1' : '0';

  const rowNav = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`deals:browse:1:${dealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setLabel('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(`deals:browse:${currentPage - 1}:${dealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setLabel('◀️ Prev')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId('deals:browse:noop')
      .setLabel(`Page ${currentPage}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`deals:browse:${currentPage + 1}:${dealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages),
    new ButtonBuilder()
      .setCustomId(`deals:browse:${totalPages}:${dealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setLabel('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages)
  );

  // 5. Action Row 2: Filter Toggles & Refresh
  const toggleDealsFlag = dealsOnly ? '0' : '1';
  // Time cycle button: all -> 3d -> 7d -> 1d -> all
  const nextTimeFilter = timeSince === 'all' ? '3d' : timeSince === '3d' ? '7d' : timeSince === '7d' ? '1d' : 'all';
  const nextTimeSafe = encodeURIComponent(nextTimeFilter);

  const rowActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`deals:browse:${currentPage}:${toggleDealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setLabel(dealsOnly ? '📋 Show All Listings' : '🔥 Steals & Deals Only')
      .setStyle(dealsOnly ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(dealsOnly ? '📋' : '🔥'),
    new ButtonBuilder()
      .setCustomId(`deals:browse:1:${dealsFlag}:${safeCat}:${safeSort}:${nextTimeSafe}:${safeSearch}`)
      .setLabel(`⏱️ Usia: ${timeLabels[timeSince] || 'Semua'}`)
      .setStyle(timeSince !== 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji('⏳'),
    new ButtonBuilder()
      .setCustomId('deals:refresh')
      .setLabel('Refresh Sheet')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );

  // 6. Action Row 3: Category Select Menu
  const categoriesList = [
    { label: 'Semua Kategori (All Categories)', value: 'all' },
    { label: 'Hardware - CPU', value: 'Hardware - CPU' },
    { label: 'Hardware - GPU', value: 'Hardware - GPU' },
    { label: 'Hardware - Monitor', value: 'Hardware - Monitor' },
    { label: 'Hardware - RAM', value: 'Hardware - RAM' },
    { label: 'Hardware - SSD', value: 'Hardware - SSD' },
    { label: 'Hardware - Motherboard', value: 'Hardware - Motherboard' },
    { label: 'Hardware - PC Set', value: 'Hardware - PC Set' },
    { label: 'Hardware - Accessories', value: 'Hardware - Accessories' },
    { label: 'Laptop - Gaming', value: 'Laptop - Gaming' },
    { label: 'Console - PlayStation', value: 'Console - PlayStation' },
    { label: 'Console - PlayStation BD', value: 'Console - PlayStation BD' },
    { label: 'Peripheral - Keyboard', value: 'Peripheral - Keyboard' },
    { label: 'Peripheral - Mouse', value: 'Peripheral - Mouse' },
    { label: 'Peripheral - Headset', value: 'Peripheral - Headset' },
    { label: 'Peripheral - Gamepad', value: 'Peripheral - Gamepad' },
    { label: 'Gadget - Smartwatch', value: 'Gadget - Smartwatch' },
    { label: 'Gadget - Tablet', value: 'Gadget - Tablet' },
    { label: 'FIGURE', value: 'FIGURE' }
  ];

  const selectCatMenu = new StringSelectMenuBuilder()
    .setCustomId(`deals:select_cat:${currentPage}:${dealsFlag}:${safeSort}:${safeTime}:${safeSearch}`)
    .setPlaceholder(category && category !== 'all' ? `Category: ${category}` : 'Filter by Category...')
    .addOptions(
      categoriesList.map(c => ({
        label: c.label,
        value: c.value,
        default: c.value.toLowerCase() === category.toLowerCase()
      }))
    );

  const rowCatSelect = new ActionRowBuilder().addComponents(selectCatMenu);

  // 7. Action Row 4: Sort Select Menu
  const sortOptions = [
    { label: '📅 Tanggal: Terbaru ke Terlama (Newest Date)', value: 'date_desc' },
    { label: '📅 Tanggal: Terlama ke Terbaru (Oldest Date)', value: 'date_asc' },
    { label: '💰 Harga: Termurah ke Termahal (Lowest Price)', value: 'price_asc' },
    { label: '💰 Harga: Termahal ke Termurah (Highest Price)', value: 'price_desc' },
    { label: '📉 Selisih: Diskon Terbesar (Best Steals First)', value: 'selisih_desc' },
    { label: '📈 Selisih: Diskon Terkecil (Overpriced First)', value: 'selisih_asc' },
    { label: '🔤 Nama: Abjad A - Z (Alphabetical)', value: 'name_asc' },
    { label: '🔤 Nama: Abjad Z - A (Reverse)', value: 'name_desc' }
  ];

  const selectSortMenu = new StringSelectMenuBuilder()
    .setCustomId(`deals:select_sort:${currentPage}:${dealsFlag}:${safeCat}:${safeTime}:${safeSearch}`)
    .setPlaceholder(`Urutkan: ${sortLabels[sort] || 'Urutkan Listings...'}`)
    .addOptions(
      sortOptions.map(s => ({
        label: s.label,
        value: s.value,
        default: s.value === sort
      }))
    );

  const rowSortSelect = new ActionRowBuilder().addComponents(selectSortMenu);

  // 8. Action Row 5: Quick Item Inspect Select Menu (for page items)
  const components = [rowNav, rowActions, rowCatSelect, rowSortSelect];

  if (pageItems.length > 0) {
    const itemInspectOptions = pageItems.map(it => {
      const pStr = `Rp ${it.price.toLocaleString('id-ID')}`;
      const timeInfo = getTimeSinceListing(it);
      const label = `#${it.num || 'N/A'}: ${it.name}`.slice(0, 100);
      const desc = `${timeInfo.text} • ${it.category} • ${pStr}`.slice(0, 100);
      return {
        label,
        description: desc,
        value: it.id
      };
    });

    const selectInspectMenu = new StringSelectMenuBuilder()
      .setCustomId(`deals:inspect_select:${currentPage}:${dealsFlag}:${safeCat}:${safeSort}:${safeTime}:${safeSearch}`)
      .setPlaceholder('🔍 Pilih Barang untuk Lihat Foto, Deskripsi & Chat WA Admin...')
      .addOptions(itemInspectOptions);

    components.push(new ActionRowBuilder().addComponents(selectInspectMenu));
  }

  return {
    embeds: [embed],
    components
  };
}

// --- Slash Command Definition ---
const dealsSlashCommand = new SlashCommandBuilder()
  .setName('deals')
  .setDescription('The Lazy Titip Good Deals Watcher & Market Sentinel')
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addSubcommand(sub =>
    sub.setName('active')
      .setDescription('Browse active spreadsheet listings with valid Facebook Marketplace prices & sorting')
      .addStringOption(opt =>
        opt.setName('category')
          .setDescription('Filter by category')
          .setRequired(false)
          .addChoices(
            { name: 'Hardware - CPU', value: 'Hardware - CPU' },
            { name: 'Hardware - GPU', value: 'Hardware - GPU' },
            { name: 'Hardware - Monitor', value: 'Hardware - Monitor' },
            { name: 'Hardware - PC Set', value: 'Hardware - PC Set' },
            { name: 'Hardware - RAM', value: 'Hardware - RAM' },
            { name: 'Hardware - SSD', value: 'Hardware - SSD' },
            { name: 'Laptop - Gaming', value: 'Laptop - Gaming' },
            { name: 'Console - PlayStation', value: 'Console - PlayStation' },
            { name: 'Console - PlayStation BD', value: 'Console - PlayStation BD' },
            { name: 'Peripheral - Keyboard', value: 'Peripheral - Keyboard' },
            { name: 'Peripheral - Mouse', value: 'Peripheral - Mouse' },
            { name: 'Peripheral - Headset', value: 'Peripheral - Headset' },
            { name: 'Peripheral - Gamepad', value: 'Peripheral - Gamepad' },
            { name: 'Gadget - Smartwatch', value: 'Gadget - Smartwatch' },
            { name: 'FIGURE', value: 'FIGURE' }
          )
      )
      .addStringOption(opt =>
        opt.setName('time_since')
          .setDescription('Filter listings by age / time since listing')
          .setRequired(false)
          .addChoices(
            { name: '⚡ Hari Ini / 24 Jam Terakhir (≤ 1 day)', value: '1d' },
            { name: '🕒 3 Hari Terakhir (≤ 3 days)', value: '3d' },
            { name: '📅 1 Minggu Terakhir (≤ 7 days)', value: '7d' },
            { name: '🗓️ 2 Minggu Terakhir (≤ 14 days)', value: '14d' },
            { name: '📦 1 Bulan Terakhir (≤ 30 days)', value: '30d' },
            { name: '🌐 Semua Waktu (All Time)', value: 'all' }
          )
      )
      .addStringOption(opt =>
        opt.setName('sort')
          .setDescription('Sort listings by date, price, selisih, or name')
          .setRequired(false)
          .addChoices(
            { name: '📅 Tanggal: Terbaru (Newest Date / Shortest Age)', value: 'date_desc' },
            { name: '📅 Tanggal: Terlama (Oldest Date / Longest Age)', value: 'date_asc' },
            { name: '💰 Harga: Termurah (Lowest Price)', value: 'price_asc' },
            { name: '💰 Harga: Termahal (Highest Price)', value: 'price_desc' },
            { name: '📉 Selisih: Diskon Terbesar (Best Steals First)', value: 'selisih_desc' },
            { name: '📈 Selisih: Diskon Terkecil (Overpriced First)', value: 'selisih_asc' },
            { name: '🔤 Nama: Abjad A - Z (Alphabetical)', value: 'name_asc' },
            { name: '🔤 Nama: Abjad Z - A (Reverse)', value: 'name_desc' }
          )
      )
      .addStringOption(opt =>
        opt.setName('search')
          .setDescription('Search items by keyword or item number (e.g. Ryzen, 498, PS5, OLED)')
          .setRequired(false)
      )
      .addBooleanOption(opt =>
        opt.setName('deals_only')
          .setDescription('Show only steals and under-market deals')
          .setRequired(false)
      )
      .addIntegerOption(opt =>
        opt.setName('page')
          .setDescription('Page number')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('item')
      .setDescription('Inspect a specific listing for its product photo, seller description & 1-tap WhatsApp link')
      .addStringOption(opt =>
        opt.setName('query')
          .setDescription('Item number (e.g. 498, 473) or name keyword (e.g. Ryzen 9, 38GN950)')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Display current top good deals and steals found in the sheet')
  )
  .addSubcommand(sub =>
    sub.setName('check')
      .setDescription('Manually trigger an immediate scan of the spreadsheet for under-market deals')
  )
  .addSubcommand(sub =>
    sub.setName('resync')
      .setDescription('Re-evaluate catalog listings factoring in Instagram seller descriptions & conditions')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Check deals sentinel health, tracked items, and last poll timestamp')
  )
  .addSubcommandGroup(group =>
    group.setName('sources')
      .setDescription('Lihat dan kelola akun titip / consignment stores yang dimonitor')
      .addSubcommand(sub =>
        sub.setName('list')
          .setDescription('Tampilkan semua akun consignment & Google Sheets yang terdaftar')
      )
      .addSubcommand(sub =>
        sub.setName('add')
          .setDescription('Daftarkan spreadsheet consignment terpercaya baru')
          .addStringOption(opt =>
            opt.setName('name')
              .setDescription('Nama toko (misal: Game Consign, PartPC.ID, Gudang VGA)')
              .setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('sheet_url')
              .setDescription('Link Google Spreadsheet stok barang ready (format edit/export/drivesdk)')
              .setRequired(true)
          )
          .addStringOption(opt =>
            opt.setName('whatsapp')
              .setDescription('Nomor WhatsApp admin (misal: 628123456789)')
              .setRequired(false)
          )
          .addStringOption(opt =>
            opt.setName('handle')
              .setDescription('Instagram handle toko (misal: @gameconsign)')
              .setRequired(false)
          )
      )
  );

// --- Find Item Helper (O(1) Indexed Fast Lookup) ---
function findItemByQuery(query) {
  if (!query) return null;
  const ledger = loadLedger();
  const qClean = query.trim().toLowerCase();

  // 1. Direct ID or Number lookup via in-memory O(1) index
  if (ledger.items[qClean]) return ledger.items[qClean];
  if (ledger.items[`tlt_${qClean}`]) return ledger.items[`tlt_${qClean}`];
  if (itemByIdIndex.has(qClean)) return itemByIdIndex.get(qClean);
  if (itemByIdIndex.has(`tlt_${qClean}`)) return itemByIdIndex.get(`tlt_${qClean}`);
  if (itemByNumIndex.has(qClean)) return itemByNumIndex.get(qClean);

  // 1b. Shortcode or Instagram URL lookup
  if (itemByShortcodeIndex.has(qClean)) return itemByShortcodeIndex.get(qClean);
  const code = extractShortcodeFromUrl(query);
  if (code && itemByShortcodeIndex.has(code.toLowerCase())) return itemByShortcodeIndex.get(code.toLowerCase());

  // 2. Exact name match
  for (const it of Object.values(ledger.items)) {
    if (it.name.toLowerCase() === qClean) return it;
  }

  // 3. Substring name match
  for (const it of Object.values(ledger.items)) {
    if (it.name.toLowerCase().includes(qClean)) return it;
  }

  return null;
}

// --- Discord Interaction Handler ---
async function handleDealsInteraction(interaction) {
  if (!interaction) return false;

  // 1. Handle Select Menus
  if (interaction.isStringSelectMenu()) {
    // 1a. Category Select Menu
    if (interaction.customId.startsWith('deals:select_cat:')) {
      const parts = interaction.customId.split(':');
      const page = 1;
      const dealsOnly = parts[3] === '1';
      const sort = decodeURIComponent(parts[4] || 'date_desc');
      const timeSince = decodeURIComponent(parts[5] || 'all');
      const search = decodeURIComponent(parts[6] || '');
      const selectedCategory = interaction.values[0] || 'all';

      const payload = buildListingsBrowsePayload({
        page,
        category: selectedCategory,
        search,
        dealsOnly,
        sort,
        timeSince
      });

      await interaction.update(payload);
      return true;
    }

    // 1b. Sort Select Menu
    if (interaction.customId.startsWith('deals:select_sort:')) {
      const parts = interaction.customId.split(':');
      const page = 1;
      const dealsOnly = parts[3] === '1';
      const category = decodeURIComponent(parts[4] || 'all');
      const timeSince = decodeURIComponent(parts[5] || 'all');
      const search = decodeURIComponent(parts[6] || '');
      const selectedSort = interaction.values[0] || 'date_desc';

      const payload = buildListingsBrowsePayload({
        page,
        category,
        search,
        dealsOnly,
        sort: selectedSort,
        timeSince
      });

      await interaction.update(payload);
      return true;
    }

    // 1c. Quick Item Inspect Select Menu (Instant In-Memory Response)
    if (interaction.customId.startsWith('deals:inspect_select:')) {
      const parts = interaction.customId.split(':');
      const page = parseInt(parts[2] || '1', 10);
      const dealsOnly = parts[3] === '1';
      const category = decodeURIComponent(parts[4] || 'all');
      const sort = decodeURIComponent(parts[5] || 'date_desc');
      const timeSince = decodeURIComponent(parts[6] || 'all');
      const search = decodeURIComponent(parts[7] || '');

      const selectedItemId = interaction.values[0];
      const ledger = loadLedger();
      const item = ledger.items[selectedItemId] || itemByIdIndex.get(selectedItemId.toLowerCase()) || findItemByQuery(selectedItemId);

      if (!item) {
        return interaction.reply({ content: '⚠️ Item tidak ditemukan di katalog.', ephemeral: true });
      }

      const detailPayload = await buildItemDetailPayload(item, {
        fromBrowse: { page, dealsOnly, category, sort, timeSince, search }
      });

      await interaction.update(detailPayload);
      return true;
    }
  }

  // 2. Handle Button Clicks
  if (interaction.isButton()) {
    // 2a. Browse Navigation Buttons
    if (interaction.customId.startsWith('deals:browse:')) {
      const parts = interaction.customId.split(':');
      const page = parseInt(parts[2] || '1', 10);
      const dealsOnly = parts[3] === '1';
      const category = decodeURIComponent(parts[4] || 'all');
      const sort = decodeURIComponent(parts[5] || 'date_desc');
      const timeSince = decodeURIComponent(parts[6] || 'all');
      const search = decodeURIComponent(parts[7] || '');

      const payload = buildListingsBrowsePayload({
        page,
        category,
        search,
        dealsOnly,
        sort,
        timeSince
      });

      await interaction.update(payload);
      return true;
    }

    // 2b. Refresh Sheet
    if (interaction.customId === 'deals:refresh') {
      await interaction.deferReply({ ephemeral: true });
      const result = await runDealsCheck(interaction.client, { forceBroadcast: true });
      if (result.status === 'ok') {
        return interaction.editReply({
          content: `✅ **Scan Completed!** Checked ${result.totalActive} active items from sheet. Evaluated ${result.evaluatedCount} items, found **${result.newDealsFound} good deals**!`
        });
      } else {
        return interaction.editReply({
          content: `⚠️ Scan finished with status: \`${result.status}\` (${result.error || 'Done'})`
        });
      }
    }

    // 2c. Re-appraise with descriptions
    if (interaction.customId === 'deals:resync_desc') {
      await interaction.deferReply({ ephemeral: true });
      syncCatalogEvaluations({ forceReevaluateAll: true }).catch(console.error);
      return interaction.editReply({
        content: '🧠 **Re-appraisal with seller descriptions started in background!**\nCuangbot is fetching Instagram descriptions and running Gemini appraisals factoring in completeness, warranty, and minuses.'
      });
    }

    return false;
  }

  // 3. Handle Slash Commands
  if (interaction.isChatInputCommand() && interaction.commandName === 'deals') {
    const group = interaction.options.getSubcommandGroup(false);

    if (group === 'sources') {
      const sub = interaction.options.getSubcommand();
      const sources = loadSources();

      if (sub === 'list') {
        const ledger = loadLedger();
        const embed = new EmbedBuilder()
          .setTitle('🏪 Akun Titip / Consignment Terpercaya')
          .setDescription('Daftar akun consignment dan inventaris yang dimonitor oleh Deals Sentinel:')
          .setColor(0x3498db)
          .setTimestamp();

        for (const s of sources) {
          const itemCount = Object.values(ledger.items).filter(i => i.sourceId === s.id).length;
          const statusIcon = s.enabled ? (s.sheetUrl ? '🟢 Active' : '🟡 Ready (Link sheet pending)') : '⚪ Disabled';
          const sheetLink = s.sheetUrl ? `[Google Sheet](${s.sheetUrl})` : '_Belum ada link sheet_';
          const igLink = s.instagram ? `[Instagram (${s.handle})](${s.instagram})` : s.handle;
          const waInfo = s.whatsapp ? `+${s.whatsapp}` : '-';

          embed.addFields({
            name: `${s.name} (${s.handle || s.id})`,
            value:
              `• **Status**: ${statusIcon}\n` +
              `• **Barang Terdata**: **${itemCount} items**\n` +
              `• **Katalog**: ${sheetLink} • **IG**: ${igLink}\n` +
              `• **WhatsApp Admin**: \`${waInfo}\`\n` +
              `• _${s.notes || 'Consignment Store'}_`
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'add') {
        await interaction.deferReply();
        const name = interaction.options.getString('name').trim();
        const rawSheetUrl = interaction.options.getString('sheet_url').trim();
        const whatsapp = (interaction.options.getString('whatsapp') || '').trim().replace(/[^\d]/g, '');
        const handle = (interaction.options.getString('handle') || '').trim();

        // Convert any Google Sheets link to CSV export link
        let sheetUrl = rawSheetUrl;
        const sheetMatch = rawSheetUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetMatch) {
          sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv`;
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
        const prefix = name.split(/\s+/).map(w => w[0]).join('').toLowerCase().slice(0, 4) || 'csg';

        const existingIdx = sources.findIndex(s => s.id === id);
        const newSource = {
          id,
          name,
          handle: handle.startsWith('@') ? handle : (handle ? `@${handle}` : `@${id}`),
          prefix,
          enabled: true,
          sheetUrl,
          whatsapp: whatsapp || '62859106996282',
          line: '',
          instagram: handle ? `https://www.instagram.com/${handle.replace('@', '')}/` : '',
          notes: `Added via Discord on ${new Date().toLocaleDateString('id-ID')}`
        };

        if (existingIdx !== -1) {
          sources[existingIdx] = newSource;
        } else {
          sources.push(newSource);
        }

        saveSources(sources);

        // Trigger immediate check to seed the new items
        runDealsCheck(interaction.client, { forceBroadcast: false }).catch(console.error);

        const embed = new EmbedBuilder()
          .setTitle('✅ Consignment Account Berhasil Didaftarkan!')
          .setColor(0x00d26a)
          .setDescription(
            `Toko consignment **${name}** telah didaftarkan ke sentinel system.\n\n` +
            `• **Nama**: ${name}\n` +
            `• **Handle**: \`${newSource.handle}\`\n` +
            `• **Sheet CSV**: [Link Export](${sheetUrl})\n` +
            `• **Admin WA**: \`+${newSource.whatsapp}\`\n\n` +
            `_Proses sinkronisasi dan penilaian harga pasar (Gemini AI) sedang berjalan di background._`
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'active') {
      const category = interaction.options.getString('category') || 'all';
      const timeSince = interaction.options.getString('time_since') || 'all';
      const sort = interaction.options.getString('sort') || 'date_desc';
      const search = interaction.options.getString('search') || '';
      const dealsOnly = interaction.options.getBoolean('deals_only') || false;
      const page = interaction.options.getInteger('page') || 1;

      const payload = buildListingsBrowsePayload({
        page,
        category,
        search,
        dealsOnly,
        sort,
        timeSince
      });

      return interaction.reply(payload);
    }

    if (sub === 'item') {
      await interaction.deferReply();
      const query = interaction.options.getString('query');
      const item = findItemByQuery(query);

      if (!item) {
        return interaction.editReply({
          content: `⚠️ Listing dengan kata kunci / nomor **"${query}"** tidak ditemukan di katalog aktif.\nContoh: \`/deals item query:498\` atau \`/deals item query:Ryzen 9\``
        });
      }

      const payload = await buildItemDetailPayload(item);
      return interaction.editReply(payload);
    }

    if (sub === 'check') {
      await interaction.deferReply();
      const res = await runDealsCheck(interaction.client, { forceBroadcast: false });
      if (res.status === 'ok') {
        const embed = new EmbedBuilder()
          .setTitle('🔍 Sheet Scan Completed')
          .setColor(0x2ecc71)
          .setDescription(
            `Successfully scanned **The Lazy Titip** spreadsheet.\n\n` +
            `📦 **Total Active Items**: ${res.totalActive}\n` +
            `🧠 **Evaluated via Gemini**: ${res.evaluatedCount}\n` +
            `🔥 **Good Deals Identified**: ${res.newDealsFound}\n` +
            `📢 **Notification Channel**: <#${GOOD_DEALS_CHANNEL_ID}>`
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('deals:refresh')
            .setLabel('Re-scan Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
          new ButtonBuilder()
            .setCustomId('deals:browse:1:0:all:date_desc:all:')
            .setLabel('Browse Active Listings')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📋')
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        return interaction.editReply({
          content: `⚠️ Error running scan: ${res.error || res.status}`
        });
      }
    }

    if (sub === 'list') {
      await interaction.deferReply();
      const topDeals = getTopDeals(10);
      if (topDeals.length === 0) {
        return interaction.editReply({
          content: 'No good deals currently recorded in ledger. Run `/deals check` to scan the spreadsheet!'
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔥 Top Under-Market Deals (The Lazy Titip)')
        .setDescription('Hand-picked deals where the price is notably below typical Facebook Marketplace going rates:')
        .setColor(0xff3366)
        .setTimestamp();

      topDeals.forEach((d, idx) => {
        const rating = d.evaluation?.deal_rating || 'GOOD_DEAL';
        const disc = d.evaluation?.discount_pct || 0;
        const fbRange = d.evaluation?.fb_price_range ||
          (d.evaluation?.fb_marketplace_price_idr ? `Rp ${d.evaluation.fb_marketplace_price_idr.toLocaleString('id-ID')}` : 'Market Rate');
        const listed = d.price.toLocaleString('id-ID');
        const linkStr = d.link ? ` [IG Link](${d.link})` : '';
        const timeInfo = getTimeSinceListing(d);

        embed.addFields({
          name: `${idx + 1}. [${rating}] ${d.name.slice(0, 50)} (#${d.num || 'N/A'})`,
          value:
            `💰 **Rp ${listed}** (FB Market: ~~${fbRange}~~ | **-${disc}%**)${linkStr}\n` +
            `⏱️ **Listed**: ${timeInfo.text} (${d.date})\n` +
            `_${d.evaluation?.market_notes || d.evaluation?.reason || 'Great price.'}_`
        });
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('deals:browse:1:1:all:selisih_desc:all:')
          .setLabel('Browse All Deals')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId('deals:refresh')
          .setLabel('Refresh Deals')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔄')
      );

      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    if (sub === 'resync') {
      await interaction.deferReply();
      syncCatalogEvaluations({ forceReevaluateAll: true }).catch(console.error);
      return interaction.editReply({
        content: '🧠 **Catalog Re-Appraisal Started!**\nCuangbot is fetching Instagram descriptions and running Gemini appraisals factoring in completeness (fullset vs batangan), official warranty status, and condition minuses. Check `/deals status` or browse `/deals active` in a moment to see updated market notes!'
      });
    }

    if (sub === 'status') {
      const ledger = loadLedger();
      const itemsList = Object.values(ledger.items);
      const descCount = itemsList.filter(i => i.evaluation?.has_description_considered).length;
      const totalItems = itemsList.length;

      const embed = new EmbedBuilder()
        .setTitle('📡 Deals Sentinel Status & Telemetry')
        .setColor(0x3498db)
        .addFields(
          { name: 'Target Sheet', value: `[The Lazy Titip Ready Stock](${SHEET_EXPORT_URL})`, inline: false },
          { name: 'Discord Channel', value: `<#${GOOD_DEALS_CHANNEL_ID}>`, inline: true },
          { name: 'Poll Interval', value: `${POLL_INTERVAL_MS / 1000}s (${POLL_INTERVAL_MS / 60000} min)`, inline: true },
          { name: 'Total Checks', value: `${ledger.totalChecks || 0}`, inline: true },
          { name: 'Tracked Items', value: `${ledger.stats?.totalItemsSeen || totalItems}`, inline: true },
          { name: 'Deals Identified', value: `${ledger.stats?.dealsFound || 0}`, inline: true },
          { name: 'Description-Aware Valuations', value: `**${descCount}** / ${totalItems} items`, inline: true },
          { name: 'Notifications Sent', value: `${ledger.stats?.notificationsSent || 0}`, inline: true },
          { name: 'Last Checked', value: ledger.lastChecked ? new Date(ledger.lastChecked).toLocaleString('id-ID') : 'Never', inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('deals:refresh')
          .setLabel('Trigger Scan')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚡'),
        new ButtonBuilder()
          .setCustomId('deals:resync_desc')
          .setLabel('Re-Appraise with Descriptions')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🧠'),
        new ButtonBuilder()
          .setCustomId('deals:browse:1:0:all:date_desc:all:')
          .setLabel('Browse Catalog')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📋')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  return false;
}

module.exports = {
  GOOD_DEALS_CHANNEL_ID,
  dealsSlashCommand,
  startDealsScheduler,
  handleDealsInteraction,
  runDealsCheck,
  getTopDeals,
  buildListingsBrowsePayload,
  buildItemDetailPayload,
  findItemByQuery,
  syncCatalogEvaluations,
  getTimeSinceListing,
  fetchInstagramDetails,
  fetchLiveInstagramPosts,
  fetchAllLiveInstagramPosts,
  evaluateItemsWithGemini
};
