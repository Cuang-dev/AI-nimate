import { makeScene2D, Node, Rect } from '@motion-canvas/2d';
import { createSignal } from '@motion-canvas/core';
import { buildExplainer } from './explainers';
import { buildImage, buildTracks, loadDims, MORPH } from './images';
import { resolveAt } from './resolve';
import { buildSubtitles } from './subtitles';
import { C, easeOut, ensureFonts, prog } from './theme';
import type { RShot, Shot, Storyboard, Timings } from './types';

const FPS = 60;
const PANEL_FULL = { cx: 0, cy: -50, w: 1640, h: 800 };
const PANEL_SIDE = { cx: 300, cy: -30, w: 1200, h: 750 };

const imageUrl = (dir: string, src: string) => (/^(\/|https?:)/.test(src) ? src : `/assets/${dir}/${src}`);

/** Resolve a chapter's shots to chapter-local seconds. Frame-exact against the global clock. */
function resolveShots(shots: Shot[], timings: Timings, off: number, D: number): RShot[] {
  const local = (abs: number) => abs - off;
  const out: RShot[] = shots.map((s) => {
    const items = (s.explainer?.items ?? []).map((it) => ({ ...it, t: local(resolveAt(it.at, timings)) }));
    return {
      t: local(resolveAt(s.at, timings)),
      tEnd: D,
      transition: s.transition ?? 'cut',
      image: s.image,
      explainer: s.explainer ? { ...s.explainer, items } : undefined,
      firstItemT: items.length ? Math.min(...items.map((i) => i.t)) : Infinity,
    };
  });
  // The first shot covers the chapter's lead-in (previous chapter's pause), so the stage is never empty.
  if (out[0]) out[0].t = 0;
  out.forEach((s, i) => { if (out[i + 1]) s.tEnd = out[i + 1].t; });
  return out;
}

/** One chapter of a v2 episode as a Motion Canvas scene (1920x1080). */
export function makeChapterScene(
  storyboard: Storyboard, timings: Timings, chapterIndex: number, assetDir?: string,
  focus?: Record<string, number>,
) {
  const chapter = storyboard.chapters[chapterIndex];
  if (!chapter) throw new Error(`[v2] storyboard has no chapter index ${chapterIndex}`);
  const beat = timings.beats.find((b) => b.chapter_id === chapter.id) ?? timings.beats[chapterIndex];
  if (!beat) throw new Error(`[v2] timings has no beat for chapter ${chapter.id}`);
  const dir = assetDir ?? storyboard.assetDir ?? storyboard.video_id ?? '';

  // total frames = round(end*60) - round(start*60), so concatenated clips never drift
  const f0 = Math.round(beat.start * FPS), f1 = Math.round(beat.end * FPS);
  const frames = f1 - f0;
  const off = f0 / FPS;
  const D = frames / FPS;

  return makeScene2D(function* (view) {
    yield ensureFonts();
    const shots = resolveShots(chapter.shots, timings, off, D);
    const tracks = buildTracks(shots, D, focus ?? {});
    const dims = (yield Promise.all(tracks.map((tr) => loadDims(imageUrl(dir, tr.spec.src))))) as { w: number; h: number }[];

    view.fill(C.cream);
    const t = createSignal(0);
    const layers: any[] = [];

    // explainer panels
    shots.forEach((s, i) => {
      const ex = s.explainer;
      if (!ex) return;
      const side = s.image?.mode === 'side';
      const P = side ? PANEL_SIDE : PANEL_FULL;
      const lead = s.transition === 'collapse' ? 0.3 : 0;
      const c0 = s.t + lead;
      const a = () => easeOut(prog(t(), c0, 0.45));
      // exit: cut = gone; expand = stays until the growing image covers it; otherwise a short fade
      const next = shots[i + 1];
      const exit = () => {
        if (!next || t() < s.tEnd) return 1;
        if (next.transition === 'cut') return 0;
        if (next.transition === 'expand') return t() < s.tEnd + MORPH ? 1 : 0;
        return 1 - prog(t(), s.tEnd, 0.2);
      };
      layers.push(
        <Node
          x={() => P.cx + (side ? (1 - a()) * 70 : 0)}
          y={() => P.cy + (side ? 0 : (1 - a()) * 24)}
          opacity={() => (t() < s.t ? 0 : a() * exit())}
        >
          <Rect width={P.w} height={P.h} radius={40} fill={C.white} stroke={C.ink} lineWidth={3} />
          {buildExplainer({ ex, t, c0, W: P.w, H: P.h, dir })}
        </Node>,
      );
    });

    // images sit above the panels, so a collapsing card reveals the panel instead of overlapping it
    tracks.forEach((tr, i) => layers.push(...buildImage(tr, imageUrl(dir, tr.spec.src), dims[i], t)));

    layers.push(...buildSubtitles(timings, beat.beat_id, off, t));
    view.add(layers);

    // drive the clock one frame at a time; the scene ends exactly after `frames` frames
    // (the frame on which the generator returns is rendered too, hence frames - 1 yields)
    for (let f = 0; f < frames - 1; f++) {
      t(f / FPS);
      yield;
    }
    t((frames - 1) / FPS);
  });
}
