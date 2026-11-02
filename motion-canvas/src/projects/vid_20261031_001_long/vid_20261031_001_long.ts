import { makeProject } from '@motion-canvas/core';
import beat01 from '../../scenes/vid_20261031_001_long/beat_01?scene';
import beat02 from '../../scenes/vid_20261031_001_long/beat_02?scene';
import beat03 from '../../scenes/vid_20261031_001_long/beat_03?scene';
import beat04 from '../../scenes/vid_20261031_001_long/beat_04?scene';
import beat05 from '../../scenes/vid_20261031_001_long/beat_05?scene';
import audio from '../../audio/vid_20261031_001_long.wav';

export default makeProject({
  name: 'vid_20261031_001_long',
  scenes: [beat01, beat02, beat03, beat04, beat05],
  audio,
});
