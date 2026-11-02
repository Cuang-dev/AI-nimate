import { defineConfig } from 'vite';
import motionCanvas from '@motion-canvas/vite-plugin';
import ffmpeg from '@motion-canvas/ffmpeg';

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
      ],
    }),
    ffmpeg(),
  ],
});
