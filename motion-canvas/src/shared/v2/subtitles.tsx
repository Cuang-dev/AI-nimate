import { Node, Rect, Txt } from '@motion-canvas/2d';
import type { SimpleSignal } from '@motion-canvas/core';
import { C, FONT } from './theme';
import type { Timings, TimedWord } from './types';

export const SUB_Y = 430;
// A chunk stays up through pauses so the viewer can glance at the stage and back.
const GAP_HIDE = 1.6;   // gaps up to this keep the pill until the next chunk
const LINGER = 1.0;     // otherwise it stays this long after the last word

interface Chunk { show: number; hide: number; words: { w: string; start: number }[] }

/** Chapter chunks with chapter-local times. */
function chunksFor(timings: Timings, beatId: string, t0: number, off: number): Chunk[] {
  const raw = (timings.subtitle_chunks ?? []).filter((c) => c.beat_id === beatId);
  return raw.map((c, i) => {
    const own: TimedWord[] =
      c.words && c.words.length && typeof c.words[0] === 'object' && 'w' in c.words[0]
        ? c.words
        : timings.words.filter((w) => w.beat_id === beatId && w.start >= c.start - 1e-3 && w.start < c.end - 1e-3);
    const next = raw[i + 1];
    const hold = next
      ? (next.start - c.end <= GAP_HIDE ? next.start : c.end + LINGER)
      : c.end + LINGER; // last chunk of the chapter: the clip end cuts it anyway
    return {
      show: c.start - off,
      hide: hold - off,
      words: own.map((w) => ({ w: w.w, start: w.start - off })),
    };
  });
}

export function buildSubtitles(timings: Timings, beatId: string, off: number, t: SimpleSignal<number>) {
  const chunks = chunksFor(timings, beatId, 0, off);
  return chunks.map((ch) => (
    <Rect
      layout x={0} y={SUB_Y}
      direction="row" alignItems="center" gap={16} padding={[14, 36]} radius={60}
      fill="rgba(15,23,42,.82)"
      opacity={() => (t() >= ch.show && t() < ch.hide ? 1 : 0)}
    >
      {ch.words.map((w, i) => {
        const nextStart = ch.words[i + 1]?.start ?? Infinity;
        return (
          <Txt
            text={w.w} fontFamily={FONT} fontSize={46} fontWeight={700}
            fill={() => (t() >= w.start && t() < nextStart ? C.subAmber : '#FFFFFF')}
            opacity={() => (t() >= w.start ? 1 : 0.55)}
          />
        );
      })}
    </Rect>
  ));
}
