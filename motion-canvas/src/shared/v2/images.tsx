import { Img, Rect } from '@motion-canvas/2d';
import type { SimpleSignal } from '@motion-canvas/core';
import { C, clamp01, easeInOut, lerp, prog } from './theme';
import type { ImageSpec, RShot } from './types';

export const FULL = { x: 0, y: 0, w: 1920, h: 1080, r: 0 };
export const CARD = { x: -620, y: -30, w: 560, h: 750, r: 36 };
export const MORPH = 0.7;
const FADE = 0.5;

interface Key { t: number; to: 0 | 1; dur: number }
interface Track {
  spec: ImageSpec;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  /** Extra time the track stays opaque after `end` (a crossfade is covering it). */
  linger: number;
  startP: 0 | 1;
  keys: Key[];
  shots: RShot[];
  /** Horizontal centre of the side-card crop, 0..1 of image width. */
  focusX: number;
}

/** Merge consecutive shots that show the same image into one continuous track.
 *  Side-card focus: storyboard focusX on any shot of the track, else the Haiku focal point, else centre. */
export function buildTracks(shots: RShot[], D: number, focus: Record<string, number> = {}): Track[] {
  const tracks: Track[] = [];
  let open: Track | null = null;
  shots.forEach((s, i) => {
    if (!s.image) { open = null; return; }
    const side = s.image.mode === 'side' ? 1 : 0;
    if (open && open.spec.src === s.image.src) {
      const last = open.keys.length ? open.keys[open.keys.length - 1].to : open.startP;
      if (last !== side) open.keys.push({ t: s.t, to: side, dur: s.transition === 'cut' ? 0 : MORPH });
      open.shots.push(s);
      open.end = s.tEnd;
      if (s.image.focusX !== undefined) open.focusX = s.image.focusX;
      return;
    }
    const tr: Track = {
      spec: s.image, start: s.t, end: s.tEnd, linger: 0, shots: [s],
      // first shot is on screen from frame 0 (no cream flash at chapter boundaries)
      fadeIn: i === 0 ? 0 : s.transition === 'crossfade' ? FADE : 0,
      fadeOut: 0, startP: side as 0 | 1, keys: [],
      focusX: s.image.focusX ?? focus[s.image.src] ?? 0.5,
    };
    if (s.transition === 'collapse') { tr.startP = 0; tr.keys.push({ t: s.t, to: side as 0 | 1, dur: MORPH }); }
    if (s.transition === 'expand') { tr.startP = 1; tr.keys.push({ t: s.t, to: side as 0 | 1, dur: MORPH }); }
    tracks.push(tr);
    open = tr;
  });
  // how each track ends
  tracks.forEach((tr) => {
    const idx = shots.indexOf(tr.shots[tr.shots.length - 1]);
    const next = shots[idx + 1];
    if (next?.transition === 'crossfade') {
      if (next.image) tr.linger = FADE; else tr.fadeOut = FADE;
    }
    if (!next) tr.end = D;
  });
  return tracks;
}

function sideness(tr: Track, t: number): number {
  let v: number = tr.startP;
  for (const k of tr.keys) {
    if (t < k.t) break;
    const p = k.dur ? easeInOut(prog(t, k.t, k.dur)) : 1;
    if (p < 1) return lerp(v, k.to, p);
    v = k.to;
  }
  return v;
}

function geometry(tr: Track, t: number, iw: number, ih: number) {
  const p = sideness(tr, t);
  const r = {
    x: lerp(FULL.x, CARD.x, p), y: lerp(FULL.y, CARD.y, p),
    w: lerp(FULL.w, CARD.w, p), h: lerp(FULL.h, CARD.h, p), r: lerp(FULL.r, CARD.r, p),
  };
  const u = clamp01((t - tr.start) / Math.max(tr.end - tr.start, 0.01));
  let k = 1, pan = 0;
  switch (tr.spec.motion ?? 'pushIn') {
    case 'pushOut': k = lerp(1.07, 1, u); break;
    case 'panLeft': k = 1.08; pan = lerp(0.03, -0.03, u); break;
    case 'panRight': k = 1.08; pan = lerp(-0.03, 0.03, u); break;
    default: k = lerp(1, 1.07, u);
  }
  const sc = Math.max(r.w / iw, r.h / ih) * k;
  const dw = iw * sc, dh = ih * sc;
  const lim = (dw - r.w) / 2;
  const fx = tr.focusX;
  const cardOff = -(fx - 0.5) * dw;
  const ox = Math.max(-lim, Math.min(lim, lerp(0, cardOff, p) + pan * dw));
  return { p, r, dw, dh, ox };
}

export function buildImage(tr: Track, url: string, dims: { w: number; h: number }, t: SimpleSignal<number>) {
  const g = () => geometry(tr, t(), dims.w, dims.h);
  const opacity = () => {
    const x = t();
    if (x < tr.start || x >= tr.end + tr.linger + tr.fadeOut) return 0;
    const inn = tr.fadeIn ? prog(x, tr.start, tr.fadeIn) : 1;
    const out = tr.fadeOut ? 1 - prog(x, tr.end, tr.fadeOut) : 1;
    const sh = tr.shots.find((s) => x >= s.t && x < s.tEnd);
    const dim = sh?.image?.mode === 'side' && sh.image.focus === 'dim' ? lerp(1, 0.4, prog(x, sh.firstItemT, 0.3)) : 1;
    return inn * out * dim;
  };
  return [
    <Rect x={() => g().r.x} y={() => g().r.y} width={() => g().r.w} height={() => g().r.h} radius={() => g().r.r} clip opacity={opacity}>
      <Img src={url} x={() => g().ox} width={() => g().dw} height={() => g().dh} />
    </Rect>,
    <Rect x={() => g().r.x} y={() => g().r.y} width={() => g().r.w} height={() => g().r.h} radius={() => g().r.r}
      stroke={C.ink} lineWidth={() => 5 * g().p} opacity={opacity} />,
  ];
}

export function loadDims(url: string): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => rej(new Error(`[v2] cannot load image ${url}`));
    im.src = url;
  });
}
