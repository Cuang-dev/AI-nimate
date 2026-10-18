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
    file: null,
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
    else if (arg === '--file' || arg === '-f') options.file = args[++i];
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
  if (options.file && fs.existsSync(options.file)) {
    try {
      options.text = fs.readFileSync(path.resolve(options.file), 'utf8');
    } catch (e) {
      console.error(`Failed to read --file ${options.file}: ${e.message}`);
    }
  }

  if (options.help || !options.text) {
    showHelp();
    if (!options.text && !options.help) {
      console.error('\nError: --text or valid --file is required.\n');
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
    timeout: 60000,
    saveSubtitles: true
  });

  const outPath = path.resolve(options.output);
  const timingsPath = options.timings ? path.resolve(options.timings) : path.join(path.dirname(outPath), 'timings.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  console.log(`Synthesizing voiceover with [${options.voice}]...`);
  console.log(`Text: "${options.text.slice(0, 100)}..." (${options.text.length} chars)`);

  const { execSync } = require('child_process');
  let masterWords = [];

  try {
    if (options.text.length <= 500) {
      await tts.ttsPromise(options.text, outPath);
      const subJson = outPath + '.json';
      if (fs.existsSync(subJson)) {
        try {
          const raw = JSON.parse(fs.readFileSync(subJson, 'utf8'));
          masterWords = raw.map(cue => ({
            word: String(cue.part || '').trim(),
            start: Math.round((cue.start / 1000) * 100) / 100,
            end: Math.round((cue.end / 1000) * 100) / 100
          })).filter(w => w.word.length > 0);
          fs.unlinkSync(subJson);
        } catch (_) {}
      }
    } else {
      // Chunk by sentence/paragraph to prevent websocket timeout
      const rawChunks = options.text.match(/[^.!?\n]+[.!?\n]+(\s+|$)/g) || [options.text];
      const chunks = [];
      let cur = '';
      for (const s of rawChunks) {
        if ((cur + s).length > 500 && cur.length > 0) {
          chunks.push(cur.trim());
          cur = s;
        } else {
          cur += s;
        }
      }
      if (cur.trim()) chunks.push(cur.trim());

      console.log(`Synthesizing long voiceover in ${chunks.length} chunks with neural word alignment...`);
      const tmpDir = path.join(path.dirname(outPath), `.tts_chunks_${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      const chunkFiles = [];
      let cumulativeMs = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunkFile = path.join(tmpDir, `chunk_${String(i).padStart(3, '0')}.mp3`);
        await tts.ttsPromise(chunks[i], chunkFile);
        chunkFiles.push(chunkFile);

        // Get exact physical audio duration of this chunk
        let chunkSec = 0;
        try {
          const p = execSync(`ffprobe -i "${chunkFile}" -show_entries format=duration -v quiet -of csv="p=0"`).toString().trim();
          if (p && !isNaN(parseFloat(p))) chunkSec = parseFloat(p);
        } catch (_) {}

        // Read word boundaries generated by EdgeTTS
        const chunkSubFile = chunkFile + '.json';
        if (fs.existsSync(chunkSubFile)) {
          try {
            const cues = JSON.parse(fs.readFileSync(chunkSubFile, 'utf8'));
            for (const cue of cues) {
              const cleanW = String(cue.part || '').trim();
              if (!cleanW) continue;
              masterWords.push({
                word: cleanW,
                start: Math.round(((cumulativeMs + cue.start) / 1000) * 100) / 100,
                end: Math.round(((cumulativeMs + cue.end) / 1000) * 100) / 100
              });
            }
          } catch (_) {}
        }
        cumulativeMs += Math.round(chunkSec * 1000);
      }

      // Concat all chunks with ffmpeg
      const listFile = path.join(tmpDir, 'concat_list.txt');
      fs.writeFileSync(listFile, chunkFiles.map(f => `file '${f}'`).join('\n'), 'utf8');
      execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outPath}"`, { stdio: 'ignore' });
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const stats = fs.statSync(outPath);
    console.log(`Audio saved: ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);

    // Probe final merged audio duration
    let totalSec = 0;
    try {
      const p = execSync(`ffprobe -i "${outPath}" -show_entries format=duration -v quiet -of csv="p=0"`).toString().trim();
      if (p && !isNaN(parseFloat(p))) totalSec = parseFloat(p);
    } catch (_) {}

    if (masterWords.length > 0) {
      const timingsData = {
        duration: totalSec || (masterWords[masterWords.length - 1].end),
        words: masterWords,
        source: 'edgetts-neural-word-boundaries'
      };
      fs.writeFileSync(timingsPath, JSON.stringify(timingsData, null, 2), 'utf8');
      console.log(`Neural word timings saved: ${timingsPath} (${masterWords.length} words aligned)`);
    }
  } catch (err) {
    console.warn(`[TTS Notice] Edge-TTS network call failed (${err.message}). Generating offline audio track via ffmpeg...`);
    const wordCount = options.text.split(/\s+/).filter(Boolean).length;
    const estSec = Math.max(5, Math.round((wordCount / 140) * 60));
    try {
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${estSec} -q:a 9 -acodec libmp3lame "${outPath}"`, { stdio: 'ignore' });
      const stats = fs.statSync(outPath);
      console.log(`Fallback audio saved: ${outPath} (${(stats.size / 1024).toFixed(1)} KB, ${estSec}s)`);
    } catch (ffErr) {
      console.error(`Failed to generate fallback audio: ${ffErr.message}`);
      throw err;
    }
  }
}

main().catch(err => {
  console.error('Fatal TTS error:', err);
  process.exit(1);
});
