import { useThread, waitFor } from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261031_001/timings.json';

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
  scenes: rawTimings.scenes,
};

export const SCENE_TIMINGS = TIMINGS.scenes;
export const SUBTITLE_CHUNKS = TIMINGS.subtitleChunks;
export const TOTAL_DURATION = TIMINGS.totalDuration;

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
