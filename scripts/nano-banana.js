#!/usr/bin/env node

/**
 * AI-nimate Nano Banana Asset Engine
 * 
 * Generates style-locked prompts adhering strictly to each channel's aesthetic DNA
 * and auto-registers new assets into catalog.json and the channel-partitioned Vector DB.
 */

const fs = require('fs');
const path = require('path');
const { indexAsset } = require('./vector-db');
const { getChannelProfile } = require('../channels/channel-manager');
const { getStyleProfile } = require('../styles/style-manager');

const REPO_ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(REPO_ROOT, 'assets', 'catalog.json');

// Ensure .env variables are loaded into process.env
const envFile = path.join(REPO_ROOT, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function buildStylePrompt(subject, opts = 'kausalmedia') {
  const options = typeof opts === 'string' ? { channel: opts } : (opts || {});
  const channelId = String(options.channelId || options.channel || 'kausalmedia').toLowerCase();
  const channelProfile = getChannelProfile(channelId);
  const resolvedChannelId = channelProfile?.id || channelId;
  const styleId = String(options.styleId || options.style || channelProfile?.defaultStyle || 'kausalmedia').toLowerCase();
  const styleProfile = getStyleProfile(styleId);

  const layout = String(options.layout || 'hero').toLowerCase();
  const isFull = layout === 'fullsize' || layout === 'fullscreen' || layout === 'full-bleed';
  const hasLabels = Boolean(options.hasLabels);

  const indoorKeywords = [
    'trading floor', 'stock exchange', 'office', 'interior', 'indoor', 'room',
    'bedroom', 'desk', 'hall', 'inside', 'boardroom', 'teller', 'bank interior', 'courtroom'
  ];
  const isIndoor = indoorKeywords.some(kw => String(subject || '').toLowerCase().includes(kw));

  // Dynamic prefix from style profile and channel editorial DNA
  const prefixParts = [];
  if (styleProfile?.aiImagePromptPrefix) {
    prefixParts.push(styleProfile.aiImagePromptPrefix.trim().replace(/:\s*$/, ''));
  }
  if (channelProfile?.editorialDna?.visualDirectives) {
    prefixParts.push(channelProfile.editorialDna.visualDirectives.trim().replace(/\.\s*$/, ''));
  }
  const prefixStr = prefixParts.length > 0 ? prefixParts.join('. ') + ': ' : '';

  let promptBase = '';
  const artStyle = styleProfile?.artStyle || (resolvedChannelId === 'kausalmedia' ? 'comic-editorial' : 'flat-vector');
  const bgTone = (resolvedChannelId === 'kausalmedia' || styleId === 'kausalmedia')
    ? 'solid warm cream off-white background (#F8F5EE)'
    : `solid ${styleProfile?.palette?.bgPrimary || '#FAF7F0'} background`;

  if (isFull) {
    const envContext = isIndoor
      ? 'authentic 1990s-2000s Indonesian commercial indoor interior hall, trading desks, authentic architectural indoor perspective'
      : 'authentic modern Indonesian architectural and contextual environment, authentic cityscape';
    promptBase = `editorial comic art illustration of ${subject}, full 16:9 wide scene composition: ${envContext}, bold clean black ink contour outlines (3px–4px), flat and soft-cel gouache color wash, warm terracotta, sage, slate, and ochre palette, crisp commercial comic art, expressive hand-drawn detail, zero 3D CGI render, zero photorealism, zero hyperrealism`;
  } else {
    promptBase = `editorial comic art spot illustration of ${subject}: bold clean black ink contour outlines (3px–4px), isolated on a ${bgTone}, flat and soft-cel gouache color wash, warm terracotta, sage, and ochre accents, clean commercial comic clipart, soft subtle ground shadow, zero 3D render, zero photorealism, zero hyperrealism, authentic Indonesian context`;
  }

  if (hasLabels) {
    promptBase += `, with clean hand-drawn numeric price badges and minimal infographic callout tags`;
  } else {
    promptBase += `, clean illustration without baked arrows or text clutter`;
  }

  const negPrompt = isIndoor && isFull
    ? `outdoor, street, cars, asphalt, open sky, storefronts, trees, traffic, alien gibberish, illegible lettering, photorealistic, 3D CGI, blender render, hyperrealistic, muddy gradients, dark shadows, blurry, fuzzy, textured photo background, complex noise, slide wireframe, HTML card, table layout, ugly scribbles`
    : `photorealistic, 3D CGI, blender render, hyperrealistic, muddy gradients, dark shadows, blurry, fuzzy, textured photo background, complex noise, slide wireframe, HTML card, table layout, ugly scribbles`;

  const bgKnockout = isFull
    ? null
    : ((resolvedChannelId === 'kausalmedia' || styleId === 'kausalmedia')
      ? '#F8F5EE'
      : (styleProfile?.palette?.bgPrimary || '#F8F5EE'));

  return {
    channel: resolvedChannelId,
    style: styleProfile?.id || styleId,
    layout,
    hasLabels,
    prompt: `${prefixStr}${promptBase}`,
    negativePrompt: negPrompt,
    backgroundKnockout: bgKnockout,
    artStyle
  };
}

/**
 * Register a newly created asset into catalog.json and vector-db.json
 */
async function registerAsset({ id, channel = 'kausalmedia', name, category = 'props', subcategory = 'items', file, relativePath, tags = [], description = '', mood = 'investigative' }) {
  const ch = String(channel).trim().toLowerCase();
  const assetId = id || `prop-${ch}-${Date.now().toString(36)}`;
  const assetPath = relativePath || path.join('props', subcategory, file || `${assetId}.png`);

  // 1. Update catalog.json
  let catalog = [];
  if (fs.existsSync(CATALOG_FILE)) {
    try {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf8');
      catalog = JSON.parse(raw);
      if (!Array.isArray(catalog)) catalog = [];
    } catch (_) {
      catalog = [];
    }
  }

  const catalogEntry = {
    id: assetId,
    channel: ch,
    name: name || assetId,
    category,
    subcategory,
    file: file || path.basename(assetPath),
    path: assetPath,
    tags: Array.isArray(tags) ? tags : [tags],
    description: description || name,
    mood,
    style: ch === 'kausalmedia' ? 'comic-ligne-claire' : 'flat-vector',
    source: 'nano-banana-generated',
    createdAt: new Date().toISOString()
  };

  const existingIdx = catalog.findIndex(c => c.id === assetId && c.channel === ch);
  if (existingIdx >= 0) {
    catalog[existingIdx] = Object.assign({}, catalog[existingIdx], catalogEntry);
  } else {
    catalog.push(catalogEntry);
  }

  const catalogDir = path.dirname(CATALOG_FILE);
  if (!fs.existsSync(catalogDir)) fs.mkdirSync(catalogDir, { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');

  // 2. Index into Vector DB with strict channel tag
  const indexed = await indexAsset({
    id: assetId,
    channel: ch,
    name: catalogEntry.name,
    category,
    subcategory,
    file: catalogEntry.file,
    path: assetPath,
    description: catalogEntry.description,
    tags: catalogEntry.tags,
    style: catalogEntry.style,
    mood
  });

  return { catalogEntry, indexed };
}

/**
 * Generate an image via Qwen-Image-2.1 endpoint (Google Colab or Local)
 */
async function generateWithQwen({ prompt, layout = 'hero', endpointUrl, channel = 'kausalmedia', name }) {
  const url = (endpointUrl || process.env.QWEN_ENDPOINT_URL || '').replace(/\/+$/, '');
  if (!url) {
    throw new Error('Qwen endpoint URL not provided (set process.env.QWEN_ENDPOINT_URL)');
  }

  const isFull = layout === 'fullsize' || layout === 'fullscreen' || layout === 'full-bleed';
  const targetLayout = isFull ? 'fullsize' : 'hero';

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = process.env.QWEN_API_KEY || 'kausal-secret-key';
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const res = await fetch(`${url}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      layout: targetLayout,
      steps: 8
    })
  });

  if (!res.ok) {
    throw new Error(`Qwen generation failed: HTTP ${res.status} ${await res.text()}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const assetId = `qwen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const subcategory = isFull ? 'scenes' : 'items';
  const relativeDir = isFull ? path.join('scenes', 'cityscapes') : path.join('props', 'items');
  const filename = `${assetId}.png`;
  const absoluteDir = path.join(REPO_ROOT, 'assets', relativeDir);
  const absolutePath = path.join(absoluteDir, filename);

  fs.mkdirSync(absoluteDir, { recursive: true });
  fs.writeFileSync(absolutePath, buffer);

  const relativePath = path.join('assets', relativeDir, filename);

  const registered = await registerAsset({
    id: assetId,
    channel,
    name: name || prompt.slice(0, 40),
    category: isFull ? 'scenes' : 'props',
    subcategory,
    file: filename,
    relativePath,
    tags: ['qwen-image', targetLayout, channel],
    description: prompt
  });

  return {
    assetId,
    path: relativePath,
    absolutePath,
    buffer,
    layout: targetLayout,
    registered
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'prompt') {
    const rawArgs = args.slice(1);
    const layout = rawArgs.includes('--fullsize') ? 'fullsize' : 'hero';
    const hasLabels = rawArgs.includes('--labels');
    const subject = rawArgs.filter(a => !a.startsWith('--')).join(' ') || 'hydraulic carwash lift';
    console.log(JSON.stringify(buildStylePrompt(subject, { channel: 'kausalmedia', layout, hasLabels }), null, 2));
  } else if (cmd === 'generate') {
    const promptText = args.slice(1).filter(a => !a.startsWith('--')).join(' ') || 'vintage typewriter on desk';
    const isFull = args.includes('--fullsize');
    generateWithQwen({ prompt: promptText, layout: isFull ? 'fullsize' : 'hero' })
      .then(res => console.log('Generated & Registered:', res.path))
      .catch(err => console.error('Error:', err.message));
  } else if (cmd === 'register') {
    const id = args[1] || 'test-item';
    const name = args[2] || 'Test Prop';
    registerAsset({ id, name, channel: 'kausalmedia', tags: ['test', 'prop'] })
      .then(res => console.log('Registered:', res.catalogEntry.id))
      .catch(err => console.error(err));
  } else {
    console.log('Usage: node scripts/nano-banana.js [prompt <subject> | generate <prompt> | register <id> <name>]');
  }
}

module.exports = {
  buildStylePrompt,
  registerAsset,
  generateWithQwen
};
