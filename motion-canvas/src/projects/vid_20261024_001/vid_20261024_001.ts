import { makeProject } from '@motion-canvas/core';
import beat01 from '../../scenes/vid_20261024_001/beat_01?scene';
import beat02 from '../../scenes/vid_20261024_001/beat_02?scene';
import beat03 from '../../scenes/vid_20261024_001/beat_03?scene';
import beat04 from '../../scenes/vid_20261024_001/beat_04?scene';
import beat05 from '../../scenes/vid_20261024_001/beat_05?scene';
import beat06 from '../../scenes/vid_20261024_001/beat_06?scene';
import audio from '../../audio/vid_20261024_001.wav';

export default makeProject({
  name: 'vid_20261024_001',
  scenes: [beat01, beat02, beat03, beat04, beat05, beat06],
  audio,
});
