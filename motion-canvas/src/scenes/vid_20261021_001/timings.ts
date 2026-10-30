import { useTime, waitFor } from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261021_001/timings.json';

export interface TimedWord {
  w: string;
  start: number;
  end: number;
}

export interface BeatTiming {
  beat_id: string;
  start: number;
  end: number;
}

export interface SubtitleChunk {
  start: number;
  end: number;
  words: TimedWord[];
}

export const TIMINGS = {
  totalDuration: rawTimings.duration_seconds,
  beats: rawTimings.beats as BeatTiming[],
  words: rawTimings.words as TimedWord[],
  subtitleChunks: ((rawTimings as any).subtitle_chunks || []) as SubtitleChunk[],
  scenes: [
    { id: 'beat_01', start: 0.0, end: 5.32, duration: 5.32 },
    { id: 'beat_02', start: 5.32, end: 24.68, duration: 19.36 },
    { id: 'beat_03', start: 24.68, end: 42.54, duration: 17.86 },
    { id: 'beat_04', start: 42.54, end: 54.55, duration: 12.01 },
    { id: 'beat_05', start: 54.55, end: 64.32, duration: 9.77 },
  ],
};

export function* waitUntilSceneTime(targetSceneTime: number) {
  const current = useTime();
  const delta = targetSceneTime - current;
  if (delta > 0) {
    yield* waitFor(delta);
  }
}

export function* finishSceneAt(targetDuration: number) {
  const current = useTime();
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
