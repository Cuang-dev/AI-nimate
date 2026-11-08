#!/usr/bin/env node
// Usage: node motion-canvas/scripts/v2/scaffold_project.mjs <video_id>
// Writes one Motion Canvas project + thin scene per storyboard chapter, in the
// layout render.mjs discovers (see src/projects/vid_20261102_001).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const id = process.argv[2];
if (!id || !/^vid_\d{8}_\d{3}$/.test(id)) {
  console.error('usage: scaffold_project.mjs vid_YYYYMMDD_NNN');
  process.exit(1);
}
const sbPath = path.join(root, 'production', id, 'storyboard.json');
if (!fs.existsSync(sbPath)) {
  console.error(`missing ${sbPath}`);
  process.exit(1);
}
const chapters = JSON.parse(fs.readFileSync(sbPath, 'utf8')).chapters;
const scenesDir = path.join(root, 'src/scenes', id);
const projDir = path.join(root, 'src/projects', id);
fs.mkdirSync(scenesDir, { recursive: true });
fs.mkdirSync(projDir, { recursive: true });

chapters.forEach((_, i) => {
  const n = i + 1, nn = String(n).padStart(2, '0');
  fs.writeFileSync(
    path.join(scenesDir, `beat_${nn}.tsx`),
    `import { makeChapterScene } from '../../shared/v2/engine';
import storyboard from '../../../production/${id}/storyboard.json';
import timings from '../../../production/${id}/timings.json';

// Haiku focal points (file -> x in 0..1); empty until generate_assets.py has run
const focus = Object.values(import.meta.glob('../../../production/${id}/image_focus.json', { eager: true, import: 'default' }))[0];

export default makeChapterScene(storyboard as any, timings as any, ${i}, '${id}', focus as any);
`,
  );
  fs.writeFileSync(
    path.join(projDir, `${id}_beat${n}.ts`),
    `import { makeProject } from "@motion-canvas/core";
import beat${nn} from "../../scenes/${id}/beat_${nn}?scene";

export default makeProject({
  name: "${id}_beat${n}",
  scenes: [beat${nn}],
});
`,
  );
});
console.log(`[scaffold] ${id}: ${chapters.length} chapters -> src/projects/${id}, src/scenes/${id}`);
