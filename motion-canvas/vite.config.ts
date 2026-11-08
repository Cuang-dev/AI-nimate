import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import motionCanvas from '@motion-canvas/vite-plugin';
import ffmpeg from '@motion-canvas/ffmpeg';

// v2 episodes (id >= vid_20261107_001) are discovered, not listed: every
// src/projects/<id>/<id>_beatN.ts is a project.
const v2Projects = fs
  .readdirSync(path.join(__dirname, 'src/projects'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^vid_\d{8}_\d{3}$/.test(d.name) && d.name >= 'vid_20261107_001')
  .flatMap((d) =>
    fs
      .readdirSync(path.join(__dirname, 'src/projects', d.name))
      .filter((f) => new RegExp(`^${d.name}_beat\\d+\\.ts$`).test(f))
      .map((f) => `./src/projects/${d.name}/${f}`),
  );

export default defineConfig({
  plugins: [
    motionCanvas({
      project: [
        './src/projects/vid_20261021_001/vid_20261021_001.ts',
        './src/projects/vid_20261021_001/vid_20261021_001_part1.ts',
        './src/projects/vid_20261021_001/vid_20261021_001_part2.ts',
        './src/projects/vid_20261024_001/vid_20261024_001.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_part1.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_part2.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat1.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat2.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat3.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat4.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat5.ts',
        './src/projects/vid_20261024_001/vid_20261024_001_beat6.ts',
        './src/projects/vid_20261029_002/vid_20261029_002_beat1.ts',
        './src/projects/vid_20261029_002/vid_20261029_002_beat2.ts',
        './src/projects/vid_20261029_002/vid_20261029_002_beat3.ts',
        './src/projects/vid_20261029_002/vid_20261029_002_beat4.ts',
        './src/projects/vid_20261029_002/vid_20261029_002_beat5.ts',
        './src/projects/vid_20261031_001/vid_20261031_001_beat1.ts',
        './src/projects/vid_20261031_001/vid_20261031_001_beat2.ts',
        './src/projects/vid_20261031_001/vid_20261031_001_beat3.ts',
        './src/projects/vid_20261031_001/vid_20261031_001_beat4.ts',
        './src/projects/vid_20261031_001/vid_20261031_001_beat5.ts',
        './src/projects/vid_20261031_002/vid_20261031_002_beat1.ts',
        './src/projects/vid_20261031_002/vid_20261031_002_beat2.ts',
        './src/projects/vid_20261031_002/vid_20261031_002_beat3.ts',
        './src/projects/vid_20261031_002/vid_20261031_002_beat4.ts',
        './src/projects/vid_20261031_002/vid_20261031_002_beat5.ts',
        './src/projects/vid_20261102_001/vid_20261102_001.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat1.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat2.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat3.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat4.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat5.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat6.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat7.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat8.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat9.ts',
        './src/projects/vid_20261102_001/vid_20261102_001_beat10.ts',
      ].concat(v2Projects),
    }),
    ffmpeg(),
  ],
});
