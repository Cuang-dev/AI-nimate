/**
 * AI-nimate Semantic Asset Vector Database
 * 
 * Local, embedded vector database powered by @xenova/transformers (all-MiniLM-L6-v2)
 * with strict channel partitioning and >= 0.90 similarity threshold gating.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(REPO_ROOT, 'assets', 'vector-db.json');
const CATALOG_FILE = path.join(REPO_ROOT, 'assets', 'catalog.json');

let pipelineInstance = null;

/**
 * Lazy-load Transformers.js feature extraction pipeline
 */
async function getExtractor() {
  if (pipelineInstance) return pipelineInstance;
  try {
    const { pipeline } = await import('@xenova/transformers');
    // Quantized lightweight model running 100% locally
    pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return pipelineInstance;
  } catch (err) {
    console.warn(`[VectorDB] Transformers.js loading fallback: ${err.message}`);
    return null;
  }
}

/**
 * Compute cosine similarity between two float arrays
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic term-frequency fallback vector if neural pipeline is unavailable
 */
function computeTermVector(text) {
  const words = String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return freq;
}

function computeTermCosine(freqA, freqB) {
  const allWords = Array.from(new Set([...Object.keys(freqA), ...Object.keys(freqB)]));
  if (allWords.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const w of allWords) {
    const a = freqA[w] || 0;
    const b = freqB[w] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load vector database from disk
 */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { version: '1.0', updatedAt: new Date().toISOString(), assets: [] };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.assets)) parsed.assets = [];
    return parsed;
  } catch (_) {
    return { version: '1.0', updatedAt: new Date().toISOString(), assets: [] };
  }
}

/**
 * Save vector database to disk
 */
function saveDB(db) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

/**
 * Generate embedding vector for text
 */
async function embedText(text) {
  const extractor = await getExtractor();
  if (extractor) {
    try {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (e) {
      console.warn(`[VectorDB] Extraction error: ${e.message}`);
    }
  }
  // Term-frequency fallback representation
  return null;
}

/**
 * Index or update an asset with strict channel partition
 */
async function indexAsset(assetSpec) {
  if (!assetSpec.id || !assetSpec.channel) {
    throw new Error('Asset must have an "id" and "channel" specified for channel partition isolation.');
  }

  const db = loadDB();
  const channel = String(assetSpec.channel).trim().toLowerCase();
  const denseText = [
    assetSpec.name || '',
    assetSpec.description || '',
    (assetSpec.tags || []).join(' '),
    assetSpec.category || '',
    assetSpec.subcategory || '',
    assetSpec.mood || '',
    assetSpec.style || ''
  ].join(' ').trim();

  const embedding = await embedText(denseText);
  const termVector = computeTermVector(denseText);

  const existingIdx = db.assets.findIndex(a => a.id === assetSpec.id && a.channel === channel);
  const record = {
    id: assetSpec.id,
    channel,
    name: assetSpec.name || assetSpec.id,
    category: assetSpec.category || 'props',
    subcategory: assetSpec.subcategory || 'items',
    file: assetSpec.file || '',
    path: assetSpec.path || '',
    description: assetSpec.description || '',
    tags: Array.isArray(assetSpec.tags) ? assetSpec.tags : [],
    style: assetSpec.style || 'comic-ligne-claire',
    embedding: embedding || null,
    termVector,
    runtime: {
      totalUses: assetSpec.runtime?.totalUses || 0,
      lastUsedAt: assetSpec.runtime?.lastUsedAt || null,
      lastProject: assetSpec.runtime?.lastProject || null,
      cooldownSeconds: assetSpec.runtime?.cooldownSeconds || 75
    },
    metadata: assetSpec.metadata || {}
  };

  if (existingIdx >= 0) {
    db.assets[existingIdx] = Object.assign({}, db.assets[existingIdx], record);
  } else {
    db.assets.push(record);
  }

  saveDB(db);
  return record;
}

/**
 * Search asset strictly partitioned by channel and threshold (>= 0.90)
 */
async function searchAsset({ query, channel, threshold = 0.90, limit = 5, excludeIds = [] }) {
  if (!query || !channel) return [];

  const targetChannel = String(channel).trim().toLowerCase();
  const db = loadDB();

  // Strict channel isolation filter: assets are NEVER mixed across channels
  const channelAssets = db.assets.filter(a => a.channel === targetChannel && !excludeIds.includes(a.id));
  if (channelAssets.length === 0) return [];

  const queryEmbedding = await embedText(query);
  const queryTermVector = computeTermVector(query);

  const scored = [];

  for (const asset of channelAssets) {
    let score = 0;
    if (queryEmbedding && asset.embedding) {
      score = cosineSimilarity(queryEmbedding, asset.embedding);
    } else {
      score = computeTermCosine(queryTermVector, asset.termVector || computeTermVector(asset.description + ' ' + asset.tags.join(' ')));
    }

    if (score >= threshold) {
      scored.push({
        asset,
        score: Math.round(score * 1000) / 1000
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Record asset usage in a project for anti-repetition tracking
 */
function recordAssetUsage(id, channel, projectSlug) {
  const db = loadDB();
  const targetChannel = String(channel).trim().toLowerCase();
  const asset = db.assets.find(a => a.id === id && a.channel === targetChannel);
  if (!asset) return null;

  if (!asset.runtime) asset.runtime = {};
  asset.runtime.totalUses = (asset.runtime.totalUses || 0) + 1;
  asset.runtime.lastUsedAt = new Date().toISOString();
  asset.runtime.lastProject = projectSlug || null;

  saveDB(db);
  return asset;
}

/**
 * Check if asset is within cooldown window
 */
function isAssetInCooldown(id, channel, cooldownSeconds = 75) {
  const db = loadDB();
  const targetChannel = String(channel).trim().toLowerCase();
  const asset = db.assets.find(a => a.id === id && a.channel === targetChannel);
  if (!asset || !asset.runtime?.lastUsedAt) return false;

  const elapsed = (Date.now() - new Date(asset.runtime.lastUsedAt).getTime()) / 1000;
  return elapsed < (asset.runtime.cooldownSeconds || cooldownSeconds);
}

/**
 * Calculate semantic similarity between a query and a specific asset path/id
 */
async function getAssetSimilarity(query, assetRef, channel) {
  if (!query || !assetRef) return 0;
  const db = loadDB();
  const targetChannel = String(channel || 'kausalmedia').trim().toLowerCase();
  const normalized = assetRef.replace(/^\.?\//, '');
  const asset = db.assets.find(a => 
    (a.id === assetRef || a.path === normalized || a.path.endsWith(path.basename(assetRef))) &&
    (!channel || a.channel === targetChannel)
  );
  if (!asset) return 0;
  const queryEmbedding = await embedText(query);
  const queryTermVector = computeTermVector(query);
  if (queryEmbedding && asset.embedding) {
    return Math.round(cosineSimilarity(queryEmbedding, asset.embedding) * 1000) / 1000;
  }
  return Math.round(computeTermCosine(queryTermVector, asset.termVector || computeTermVector(asset.description + ' ' + asset.tags.join(' '))) * 1000) / 1000;
}

module.exports = {
  DB_FILE,
  loadDB,
  saveDB,
  indexAsset,
  searchAsset,
  getAssetSimilarity,
  recordAssetUsage,
  isAssetInCooldown,
  cosineSimilarity,
  embedText
};

