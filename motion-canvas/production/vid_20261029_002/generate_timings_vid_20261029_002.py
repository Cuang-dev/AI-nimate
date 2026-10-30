import json
from pathlib import Path
from faster_whisper import WhisperModel
import subprocess

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261029_002"
WAV_PATH = WORK_DIR / "narration.wav"
TIMINGS_JSON_PATH = WORK_DIR / "timings.json"
TIMINGS_TS_PATH = REPO_ROOT / "motion-canvas/src/scenes/vid_20261029_002/timings.ts"

def get_audio_duration(wav_file):
    res = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(wav_file)
    ], capture_output=True, text=True, check=True)
    return round(float(res.stdout.strip()), 3)

def generate():
    total_dur = get_audio_duration(WAV_PATH)
    print(f"Loading faster-whisper on {WAV_PATH} (duration: {total_dur}s)...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(WAV_PATH), word_timestamps=True, language="en")

    raw_words = []
    for s in segments:
        for w in s.words:
            w_text = w.word.strip()
            if w_text:
                raw_words.append({
                    "w": w_text,
                    "start": float(round(w.start, 3)),
                    "end": float(round(w.end, 3))
                })

    print(f"Raw words transcribed: {len(raw_words)}")

    # Normalization & compound merges
    fixed_words = []
    i = 0
    n = len(raw_words)
    while i < n:
        w = dict(raw_words[i])
        
        # 2-word merges
        if i + 1 < n:
            w_next = raw_words[i+1]
            pair = f"{w['w'].lower()} {w_next['w'].lower()}".rstrip(".,?!")
            if pair == "write downs":
                merged = {
                    "w": "write-downs" + (w_next["w"][-1] if w_next["w"][-1] in ".,?!" else ""),
                    "start": w["start"],
                    "end": w_next["end"]
                }
                fixed_words.append(merged)
                i += 2
                continue
            if pair == "round tripping":
                merged = {
                    "w": "round-tripping" + (w_next["w"][-1] if w_next["w"][-1] in ".,?!" else ""),
                    "start": w["start"],
                    "end": w_next["end"]
                }
                fixed_words.append(merged)
                i += 2
                continue
                
        # Word-level cleanups
        if w["w"].lower() == "wall":
            w["w"] = "Wall"
        elif w["w"].lower() == "street":
            w["w"] = "Street"
        elif w["w"].lower() == "to" and i > 0 and raw_words[i-1]["w"].lower() == "chips":
            w["w"] = "too"
            
        fixed_words.append(w)
        i += 1

    # Exact scene boundaries based on speech pauses
    # Beat 1 ends at 26.12, Beat 2 starts at 26.64 -> midpoint 26.38
    # Beat 2 ends at 47.38, Beat 3 starts at 47.92 -> midpoint 47.65
    # Beat 3 ends at 67.28, Beat 4 starts at 68.00 -> midpoint 67.64
    # Beat 4 ends at 84.66, Beat 5 starts at 85.34 -> midpoint 85.00
    # Beat 5 ends at total_dur (102.32)
    scenes = [
        {"id": "beat_01", "start": 0.0, "end": 26.38, "duration": 26.38},
        {"id": "beat_02", "start": 26.38, "end": 47.65, "duration": 21.27},
        {"id": "beat_03", "start": 47.65, "end": 67.64, "duration": 19.99},
        {"id": "beat_04", "start": 67.64, "end": 85.00, "duration": 17.36},
        {"id": "beat_05", "start": 85.00, "end": total_dur, "duration": round(total_dur - 85.00, 3)},
    ]

    beats = [
        {"beat_id": sc["id"], "start": sc["start"], "end": sc["end"], "duration": sc["duration"]}
        for sc in scenes
    ]

    # Partition words strictly by scene
    scene_words = [[] for _ in scenes]
    for w in fixed_words:
        mid = (w["start"] + w["end"]) / 2.0
        for s_idx, sc in enumerate(scenes):
            matched = (sc["start"] <= mid <= sc["end"] + 1.0) if s_idx == len(scenes) - 1 else (sc["start"] <= mid < sc["end"])
            if matched:
                cw = dict(w)
                cw["start"] = round(max(cw["start"], sc["start"]), 3)
                cw["end"] = round(min(cw["end"], sc["end"] - 0.04), 3)
                scene_words[s_idx].append(cw)
                break

    all_clamped_words = []
    for sw in scene_words:
        all_clamped_words.extend(sw)

    # Slice into subtitle chunks:
    # at most 4 words, at most 25 characters total,
    # breaking on sentence punctuation ('.', '?', '!', ',') or gap > 0.30s
    all_chunks = []
    for s_idx, sw_list in enumerate(scene_words):
        curr_chunk_words = []
        for w in sw_list:
            if not curr_chunk_words:
                curr_chunk_words.append(w)
                continue
            prev_w = curr_chunk_words[-1]
            prev_has_punct = prev_w["w"].rstrip().endswith((".", "?", "!", ","))
            gap = round(w["start"] - prev_w["end"], 4)
            has_gap = gap > 0.30
            exceeds_word_count = (len(curr_chunk_words) + 1 > 4)
            candidate_text = " ".join([x["w"] for x in curr_chunk_words] + [w["w"]])
            exceeds_char_limit = (len(candidate_text) > 25)

            if prev_has_punct or has_gap or exceeds_word_count or exceeds_char_limit:
                c_start = curr_chunk_words[0]["start"]
                c_end = curr_chunk_words[-1]["end"]
                all_chunks.append({
                    "text": " ".join(x["w"] for x in curr_chunk_words),
                    "start": c_start,
                    "end": c_end,
                    "duration": round(c_end - c_start, 3),
                    "words": curr_chunk_words
                })
                curr_chunk_words = [w]
            else:
                curr_chunk_words.append(w)

        if curr_chunk_words:
            c_start = curr_chunk_words[0]["start"]
            c_end = curr_chunk_words[-1]["end"]
            all_chunks.append({
                "text": " ".join(x["w"] for x in curr_chunk_words),
                "start": c_start,
                "end": c_end,
                "duration": round(c_end - c_start, 3),
                "words": curr_chunk_words
            })

    # Validate chunks
    violations = 0
    for i, c in enumerate(all_chunks):
        if len(c["words"]) > 4:
            print(f"Violation: Chunk {i} has > 4 words ({len(c['words'])}): {c['text']}")
            violations += 1
        if len(c["text"]) > 25:
            print(f"Violation: Chunk {i} has > 25 chars ({len(c['text'])}): {c['text']}")
            violations += 1
        if c["end"] < c["start"]:
            print(f"Violation: Chunk {i} negative duration: {c}")
            violations += 1

    if violations > 0:
        raise RuntimeError(f"Chunk validation failed with {violations} violations")

    print(f"Validation passed: {len(all_chunks)} chunks, 0 violations!")

    timings_data = {
        "duration_seconds": total_dur,
        "scenes": scenes,
        "beats": beats,
        "words": all_clamped_words,
        "subtitle_chunks": all_chunks
    }

    TIMINGS_JSON_PATH.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Wrote timings.json to {TIMINGS_JSON_PATH}")

    # Write timings.ts
    timings_ts_content = f"""import {{ useThread, waitFor }} from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261029_002/timings.json';

export interface TimedWord {{
  w: string;
  start: number;
  end: number;
}}

export interface BeatTiming {{
  beat_id: string;
  start: number;
  end: number;
  duration?: number;
}}

export interface SubtitleChunk {{
  text: string;
  start: number;
  end: number;
  duration?: number;
  words: TimedWord[];
}}

export const TIMINGS = {{
  totalDuration: rawTimings.duration_seconds,
  beats: rawTimings.beats as BeatTiming[],
  words: rawTimings.words as TimedWord[],
  subtitleChunks: ((rawTimings as any).subtitle_chunks || []) as SubtitleChunk[],
  scenes: rawTimings.scenes,
}};

export const SCENE_TIMINGS = TIMINGS.scenes;
export const SUBTITLE_CHUNKS = TIMINGS.subtitleChunks;
export const TOTAL_DURATION = TIMINGS.totalDuration;

export function* waitUntilSceneTime(targetSceneTime: number, sceneStartSec = 0) {{
  const current = useThread().time() - sceneStartSec;
  const delta = targetSceneTime - current;
  if (delta > 0) {{
    yield* waitFor(delta);
  }}
}}

export function* finishSceneAt(targetDuration: number, sceneStartSec = 0) {{
  const current = useThread().time() - sceneStartSec;
  const remaining = targetDuration - current;
  if (remaining > 0) {{
    yield* waitFor(remaining);
  }}
}}

export function getWordTiming(word: string, beatId?: string): TimedWord | undefined {{
  if (beatId) {{
    const beat = TIMINGS.beats.find((b) => b.beat_id === beatId);
    if (beat) {{
      return TIMINGS.words.find(
        (w) =>
          w.w.toLowerCase().includes(word.toLowerCase()) &&
          w.start >= beat.start - 0.2 &&
          w.end <= beat.end + 0.5
      );
    }}
  }}
  return TIMINGS.words.find((w) => w.w.toLowerCase().includes(word.toLowerCase()));
}}

/**
 * Applies a slow, gentle scale breathe ONLY to the currently active focal element.
 * All inactive elements remain 100% still at their baseScale.
 */
export function focalScale(
  activeId: () => number,
  targetId: number,
  baseScale: () => number,
  time: () => number
): number {{
  const base = baseScale();
  if (activeId() !== targetId) return base;
  return base * (1 + Math.sin(time() * 0.55) * 0.004);
}}

/**
 * Applies a slow, subtle rotation wobble ONLY to the currently active focal element.
 * All inactive elements remain locked at 0 degrees.
 */
export function focalRotation(
  activeId: () => number,
  targetId: number,
  time: () => number
): number {{
  if (activeId() !== targetId) return 0;
  return Math.sin(time() * 0.45) * 0.12;
}}
"""
    TIMINGS_TS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TIMINGS_TS_PATH.write_text(timings_ts_content)
    print(f"Wrote timings.ts to {TIMINGS_TS_PATH}")

if __name__ == "__main__":
    generate()
