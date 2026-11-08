import { makeChapterScene } from '../../shared/v2/engine';
import storyboard from '../../../production/vid_20261107_001/storyboard.json';
import timings from '../../../production/vid_20261107_001/timings.json';

// Haiku focal points (file -> x in 0..1); empty until generate_assets.py has run
const focus = Object.values(import.meta.glob('../../../production/vid_20261107_001/image_focus.json', { eager: true, import: 'default' }))[0];

export default makeChapterScene(storyboard as any, timings as any, 8, 'vid_20261107_001', focus as any);
