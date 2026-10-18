const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const numChunks = 12;
  const chunkFiles = [];
  let masterWords = [];
  let cumulativeMs = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkFile = `chk_${i}.mp3`;
    const chunkSub = `chk_${i}.mp3.json`;
    if (!fs.existsSync(chunkFile)) {
      console.error(`Chunk file missing: ${chunkFile}`);
      return;
    }
    chunkFiles.push(chunkFile);

    const chunkSec = parseFloat(execSync(`ffprobe -i "${chunkFile}" -show_entries format=duration -v quiet -of csv="p=0"`).toString().trim());

    if (fs.existsSync(chunkSub)) {
      const cues = JSON.parse(fs.readFileSync(chunkSub, 'utf8'));
      for (const cue of cues) {
        const cleanW = String(cue.part || '').trim();
        if (!cleanW) continue;
        masterWords.push({
          word: cleanW,
          start: Math.round(((cumulativeMs + cue.start) / 1000) * 100) / 100,
          end: Math.round(((cumulativeMs + cue.end) / 1000) * 100) / 100
        });
      }
    }
    cumulativeMs += Math.round(chunkSec * 1000);
  }

  // Merge audio
  const concatList = 'concat_chunks.txt';
  fs.writeFileSync(concatList, chunkFiles.map(f => `file '${f}'`).join('\n'), 'utf8');
  const targetAudio = 'projects/rights-issue-5m/audio/voiceover.mp3';
  const targetTimings = 'projects/rights-issue-5m/audio/timings.json';

  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${targetAudio}"`, { stdio: 'inherit' });
  fs.unlinkSync(concatList);

  const totalSec = parseFloat(execSync(`ffprobe -i "${targetAudio}" -show_entries format=duration -v quiet -of csv="p=0"`).toString().trim());

  const timingsData = {
    duration: totalSec,
    words: masterWords,
    source: 'edgetts-neural-word-boundaries'
  };
  fs.writeFileSync(targetTimings, JSON.stringify(timingsData, null, 2), 'utf8');
  console.log(`Merged ${numChunks} chunks into ${targetAudio} (${totalSec}s)`);
  console.log(`Saved ${masterWords.length} neural word boundaries into ${targetTimings}`);

  // Cleanup chk_* files
  for (let i = 0; i < numChunks; i++) {
    try { fs.unlinkSync(`chk_${i}.mp3`); } catch (_) {}
    try { fs.unlinkSync(`chk_${i}.mp3.json`); } catch (_) {}
  }
}
main();
