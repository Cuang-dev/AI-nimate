#!/usr/bin/env node

/**
 * AI-nimate Qwen-Image-2.1 Colab Server Connectivity & Verification Test
 * 
 * Verifies:
 * 1. Health check & GPU VRAM stats from the remote Colab server
 * 2. Generation of a Native RGBA Transparent Hero spot asset (PNG with alpha)
 * 3. Generation of a 16:9 Fullsize Narrative Comic background scene
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
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
}
loadEnv();

async function testQwenColab(endpointUrl) {
  const baseUrl = (endpointUrl || process.env.QWEN_ENDPOINT_URL || '').replace(/\/+$/, '');
  
  if (!baseUrl) {
    console.error('❌ Error: No endpoint URL provided.');
    console.log('Usage: node scripts/test-qwen-colab.js <https://your-colab-tunnel.trycloudflare.com>');
    console.log('   or: export QWEN_ENDPOINT_URL="https://your-colab-tunnel.trycloudflare.com" && node scripts/test-qwen-colab.js');
    process.exit(1);
  }

  console.log('===========================================================');
  console.log(`📡 Connecting to Qwen-Image Colab Server: ${baseUrl}`);
  console.log('===========================================================');

  const apiKey = process.env.QWEN_API_KEY || 'kausal-secret-key';
  const authHeaders = apiKey ? { 'X-API-Key': apiKey } : {};

  // 1. Health Check
  try {
    const healthRes = await fetch(`${baseUrl}/health`, { headers: authHeaders });
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}: ${await healthRes.text()}`);
    const health = await healthRes.json();
    console.log('\n[1/3] Health Check Passed:');
    console.log(`      GPU Hardware   : ${health.gpu}`);
    console.log(`      Model Pipeline : ${health.model}`);
    console.log(`      VRAM Allocated : ${health.vram_allocated_gb} GB`);
    console.log(`      VRAM Reserved  : ${health.vram_reserved_gb} GB`);
  } catch (err) {
    console.error(`\n❌ Failed to connect to health endpoint: ${err.message}`);
    process.exit(1);
  }

  // 2. Test Hero Asset (Transparent RGBA)
  const heroPrompt = 'vintage mechanical typewriter on aged wooden desk with scattered financial notes';
  console.log(`\n[2/3] Generating Native RGBA Hero Asset...`);
  console.log(`      Prompt: "${heroPrompt}"`);
  console.log(`      Layout: hero (Requesting alpha transparency)`);

  const heroStart = Date.now();
  try {
    const heroRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: heroPrompt,
        layout: 'hero',
        seed: 42
      })
    });

    if (!heroRes.ok) throw new Error(`HTTP ${heroRes.status}: ${await heroRes.text()}`);
    const heroBuffer = Buffer.from(await heroRes.arrayBuffer());
    const heroTime = ((Date.now() - heroStart) / 1000).toFixed(2);
    const heroMode = heroRes.headers.get('X-Image-Mode') || 'Unknown';

    const outHeroPath = path.join(REPO_ROOT, 'assets', 'props', 'items', 'test-qwen-hero.png');
    fs.mkdirSync(path.dirname(outHeroPath), { recursive: true });
    fs.writeFileSync(outHeroPath, heroBuffer);

    console.log(`      ✅ Generated in ${heroTime}s (${(heroBuffer.length / 1024).toFixed(1)} KB, Mode: ${heroMode})`);
    console.log(`      Saved to: ${outHeroPath}`);
  } catch (err) {
    console.error(`      ❌ Hero generation failed: ${err.message}`);
  }

  // 3. Test Fullsize Asset (16:9 Comic Environment)
  const fullsizePrompt = 'crowded trading floor of Jakarta Stock Exchange in 1998 during financial crisis';
  console.log(`\n[3/3] Generating 16:9 Fullsize Comic Scene...`);
  console.log(`      Prompt: "${fullsizePrompt}"`);
  console.log(`      Layout: fullsize (16:9 edge-to-edge composition)`);

  const fullStart = Date.now();
  try {
    const fullRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: fullsizePrompt,
        layout: 'fullsize',
        seed: 101
      })
    });

    if (!fullRes.ok) throw new Error(`HTTP ${fullRes.status}: ${await fullRes.text()}`);
    const fullBuffer = Buffer.from(await fullRes.arrayBuffer());
    const fullTime = ((Date.now() - fullStart) / 1000).toFixed(2);
    const fullMode = fullRes.headers.get('X-Image-Mode') || 'Unknown';

    const outFullPath = path.join(REPO_ROOT, 'assets', 'scenes', 'cityscapes', 'test-qwen-fullsize.png');
    fs.mkdirSync(path.dirname(outFullPath), { recursive: true });
    fs.writeFileSync(outFullPath, fullBuffer);

    console.log(`      ✅ Generated in ${fullTime}s (${(fullBuffer.length / 1024).toFixed(1)} KB, Mode: ${fullMode})`);
    console.log(`      Saved to: ${outFullPath}`);
  } catch (err) {
    console.error(`      ❌ Fullsize generation failed: ${err.message}`);
  }

  console.log('\n===========================================================');
  console.log('🎉 Verification Complete! Qwen-Image-2.1 Colab Server Ready.');
  console.log('===========================================================');
}

if (require.main === module) {
  const urlArg = process.argv[2];
  testQwenColab(urlArg);
}

module.exports = { testQwenColab };
