#!/usr/bin/env node

/**
 * AI-nimate Edge-TTS Voiceover Generator
 * 
 * Synthesizes voiceovers using Microsoft Edge TTS neural voices (100% free, no API key needed).
 * 
 * Usage CLI:
 *   node scripts/tts.js --text "Halo guys, selamat datang di channel!" --voice id-ID-ArdiNeural --out voice.mp3
 *   node scripts/tts.js --text "Welcome to today's breakdown." --voice en-US-ChristopherNeural --out voice.mp3
 */

const fs = require('fs');
const path = require('path');

function getEdgeTTS() {
  const possiblePaths = [
    'node-edge-tts',
    path.join(__dirname, '../node_modules/node-edge-tts'),
    '/home/agent/orca/motion-canvas-mcp/node_modules/node-edge-tts'
  ];
  for (const p of possiblePaths) {
    try {
      return require(p);
    } catch (_) {}
  }
  throw new Error('node-edge-tts not found. Install via npm or link motion-canvas-mcp/node_modules.');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    text: null,
    voice: 'id-ID-ArdiNeural', // Default Indonesian voice
    rate: '0%',
    pitch: '0%',
    output: 'output.mp3',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--text' || arg === '-t') options.text = args[++i];
    else if (arg === '--voice' || arg === '-v') options.voice = args[++i];
    else if (arg === '--rate' || arg === '-r') options.rate = args[++i];
    else if (arg === '--pitch' || arg === '-p') options.pitch = args[++i];
    else if (arg === '--out' || arg === '-o') options.output = args[++i];
  }
  return options;
}

function showHelp() {
  console.log(`
AI-nimate Voiceover Generator (Edge-TTS)

Usage:
  node scripts/tts.js [options]

Options:
  --text, -t <string>    Voiceover script text (required)
  --voice, -v <string>   Neural voice identifier (default: id-ID-ArdiNeural)
                         Indonesian: id-ID-ArdiNeural (Male), id-ID-GadisNeural (Female)
                         English: en-US-ChristopherNeural (Male), en-US-AriaNeural (Female)
  --rate, -r <string>    Speed adjust, e.g. "+10%", "-5%" (default: 0%)
  --pitch, -p <string>   Pitch adjust, e.g. "+5Hz" (default: 0%)
  --out, -o <file>       Output audio file (default: output.mp3)
  --help, -h             Show this help message
`);
}

async function main() {
  const options = parseArgs();
  if (options.help || !options.text) {
    showHelp();
    if (!options.text && !options.help) {
      console.error('\nError: --text is required.\n');
      process.exit(1);
    }
    return;
  }

  const { EdgeTTS } = getEdgeTTS();
  const tts = new EdgeTTS({
    voice: options.voice,
    lang: options.voice.split('-').slice(0, 2).join('-'),
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    rate: options.rate,
    pitch: options.pitch
  });

  const outPath = path.resolve(options.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  console.log(`Synthesizing voiceover with [${options.voice}]...`);
  console.log(`Text: "${options.text}"`);

  await tts.ttsPromise(options.text, outPath);
  const stats = fs.statSync(outPath);
  console.log(`Audio saved: ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Fatal TTS error:', err);
  process.exit(1);
});
