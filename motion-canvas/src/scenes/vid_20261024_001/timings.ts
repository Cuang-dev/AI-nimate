import { useThread, waitFor } from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261024_001/timings.json';

export interface TimedWord {
  w: string;
  start: number;
  end: number;
}

export interface BeatTiming {
  beat_id: string;
  start: number;
  end: number;
  duration?: number;
}

export interface SubtitleChunk {
  text: string;
  start: number;
  end: number;
  duration?: number;
  words: TimedWord[];
}

export const TIMINGS = {
  totalDuration: rawTimings.duration_seconds,
  beats: rawTimings.beats as BeatTiming[],
  words: rawTimings.words as TimedWord[],
  subtitleChunks: ((rawTimings as any).subtitle_chunks || []) as SubtitleChunk[],
  scenes: [
    { id: 'beat_01', start: 0.0, end: 27.22, duration: 27.22 },
    { id: 'beat_02', start: 27.22, end: 57.1, duration: 29.88 },
    { id: 'beat_03', start: 57.1, end: 89.4, duration: 32.3 },
    { id: 'beat_04', start: 89.4, end: 119.26, duration: 29.86 },
    { id: 'beat_05', start: 119.26, end: 150.84, duration: 31.58 },
    { id: 'beat_06', start: 150.84, end: 185.26, duration: 34.42 },
  ],
};

export function* waitUntilSceneTime(targetSceneTime: number, sceneStartSec = 0) {
  const current = useThread().time() - sceneStartSec;
  const delta = targetSceneTime - current;
  if (delta > 0) {
    yield* waitFor(delta);
  }
}

export function* finishSceneAt(targetDuration: number, sceneStartSec = 0) {
  const current = useThread().time() - sceneStartSec;
  const remaining = targetDuration - current;
  if (remaining > 0) {
    yield* waitFor(remaining);
  }
}

export function getWordTiming(word: string, beatId?: string): TimedWord | undefined {
  if (beatId) {
    const beat = TIMINGS.beats.find((b) => b.beat_id === beatId);
    if (beat) {
      return TIMINGS.words.find(
        (w) =>
          w.w.toLowerCase().includes(word.toLowerCase()) &&
          w.start >= beat.start - 0.2 &&
          w.end <= beat.end + 0.5
      );
    }
  }
  return TIMINGS.words.find((w) => w.w.toLowerCase().includes(word.toLowerCase()));
}

/**
 * Applies a slow, gentle scale breathe ONLY to the currently active focal element.
 * All inactive elements remain 100% still at their baseScale.
 */
export function focalScale(
  activeId: () => number,
  targetId: number,
  baseScale: () => number,
  time: () => number
): number {
  const base = baseScale();
  if (activeId() !== targetId) return base;
  return base * (1 + Math.sin(time() * 0.55) * 0.004);
}

/**
 * Applies a slow, subtle rotation wobble ONLY to the currently active focal element.
 * All inactive elements remain locked at 0 degrees.
 */
export function focalRotation(
  activeId: () => number,
  targetId: number,
  time: () => number
): number {
  if (activeId() !== targetId) return 0;
  return Math.sin(time() * 0.45) * 0.12;
}
