import os
import sys
import json
import subprocess
from pathlib import Path

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_002"
BEATS_DIR = WORK_DIR / "beats_audio"
MASTER_WAV = WORK_DIR / "narration.wav"
TIMINGS_JSON = WORK_DIR / "timings.json"
TIMINGS_TS = REPO_ROOT / "motion-canvas/src/scenes/vid_20261031_002/timings.ts"
SCRIPT_JSON = WORK_DIR / "script.json"

def get_audio_duration(wav_file):
    res = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(wav_file)
    ], capture_output=True, text=True, check=True)
    return round(float(res.stdout.strip()), 3)

def transcribe_beat_whisper(wav_file, out_json):
    if out_json.exists():
        return json.loads(out_json.read_text())

    whisper_cmd = [
        "/home/agent/.local/bin/uv", "run", "--python", "3.12",
        "--with", "faster-whisper", "--with", "av<14",
        "python3", "-c",
        f'''
from faster_whisper import WhisperModel
import json
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("{wav_file}", word_timestamps=True, language="id")
words = []
for s in segments:
    for w in s.words:
        txt = w.word.strip()
        if txt:
            words.append({{"w": txt, "start": float(round(w.start, 3)), "end": float(round(w.end, 3))}})
with open("{out_json}", "w") as f:
    json.dump(words, f, indent=2)
'''
    ]
    subprocess.run(whisper_cmd, check=True)
    return json.loads(out_json.read_text())

def normalize_beat_words(raw_words, beat_id):
    fixed = []
    i = 0
    n = len(raw_words)

    while i < n:
        w = dict(raw_words[i])
        txt = w["w"]

        # Beat 1 normalization
        if beat_id == "beat_01":
            if "pernagasi" in txt.lower():
                dur = w["end"] - w["start"]
                t0 = w["start"]
                step = dur / 3.0
                fixed.append({"w": "Pernah", "start": round(t0, 3), "end": round(t0 + step, 3)})
                fixed.append({"w": "nggak", "start": round(t0 + step, 3), "end": round(t0 + step * 2, 3)})
                fixed.append({"w": "sih", "start": round(t0 + step * 2, 3), "end": round(w["end"], 3)})
                i += 1
                continue
            if txt == "pake":
                w["w"] = "pakai"
            elif txt == "anjolok":
                w["w"] = "anjlok"
            elif txt == "berjamaa":
                w["w"] = "berjamaah"
            elif txt == "trilion":
                w["w"] = "triliun"

        # Beat 2 normalization
        elif beat_id == "beat_02":
            if txt == "bertahun" and i + 1 < n and raw_words[i+1]["w"].startswith("-tahun"):
                fixed.append({"w": "bertahun-tahun,", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            if txt == "kasi":
                w["w"] = "kasih"
            elif txt == "ongir.":
                w["w"] = "ongkir."

        # Beat 3 normalization
        elif beat_id == "beat_03":
            if txt == "enggak":
                w["w"] = "nggak"
            elif txt == "cipraksa" and i + 1 < n and "salah" in raw_words[i+1]["w"]:
                fixed.append({"w": "chip", "start": w["start"], "end": w["end"]})
                fixed.append({"w": "raksasa", "start": raw_words[i+1]["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            elif txt == "di" and i + 1 < n and raw_words[i+1]["w"] == "stop":
                fixed.append({"w": "distop", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            elif txt == "demikari":
                mid = (w["start"] + w["end"]) / 2.0
                fixed.append({"w": "demi", "start": w["start"], "end": round(mid, 3)})
                fixed.append({"w": "cari", "start": round(mid, 3), "end": w["end"]})
                i += 1
                continue
            elif txt.lower() == "buka" and i + 1 < n and "lapak" in raw_words[i+1]["w"].lower():
                fixed.append({"w": "Bukalapak", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue

        # Beat 4 normalization
        elif beat_id == "beat_04":
            if txt == "Bursa":
                w["w"] = "bursa"
            elif txt == "Kita,":
                w["w"] = "kita,"
            elif txt == "di" and i + 1 < n and raw_words[i+1]["w"] == "jual":
                fixed.append({"w": "dijual", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            elif txt == "85" and i + 1 < n and raw_words[i+1]["w"] == "%":
                fixed.append({"w": "85%", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            elif txt == "ERA":
                w["w"] = "Era"

        # Beat 5 normalization
        elif beat_id == "beat_05":
            if txt == "perusahaan" and i + 1 < n and raw_words[i+1]["w"].startswith("-nya"):
                fixed.append({"w": "perusahaannya", "start": w["start"], "end": raw_words[i+1]["end"]})
                i += 2
                continue
            if txt == "subsidiskon.":
                mid = (w["start"] + w["end"]) / 2.0
                fixed.append({"w": "subsidi", "start": w["start"], "end": round(mid, 3)})
                fixed.append({"w": "diskon.", "start": round(mid, 3), "end": w["end"]})
                i += 1
                continue

        if w["end"] <= w["start"]:
            w["end"] = round(w["start"] + 0.15, 3)

        fixed.append(w)
        i += 1

    return fixed

def build_subtitle_chunks(words, max_words=4, max_chars=25):
    all_chunks = []
    curr_chunk_words = []

    for w in words:
        if not curr_chunk_words:
            curr_chunk_words.append(w)
            continue
        prev_w = curr_chunk_words[-1]
        prev_has_punct = prev_w["w"].rstrip().endswith((".", "?", "!", ","))
        gap = round(w["start"] - prev_w["end"], 4)
        has_gap = gap > 0.30
        exceeds_word_count = (len(curr_chunk_words) + 1 > max_words)
        candidate_text = " ".join([x["w"] for x in curr_chunk_words] + [w["w"]])
        exceeds_char_limit = (len(candidate_text) > max_chars)

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

    return all_chunks

def generate_timings():
    script_data = json.loads(SCRIPT_JSON.read_text())
    total_master_dur = get_audio_duration(MASTER_WAV)
    print(f"Master audio duration: {total_master_dur}s")

    beat_files = [BEATS_DIR / f"beat_{i:02d}.wav" for i in range(1, 6)]
    for bf in beat_files:
        if not bf.exists():
            raise RuntimeError(f"Missing beat audio: {bf}")

    beat_durations = [get_audio_duration(bf) for bf in beat_files]
    silence_pad = 0.50

    scenes = []
    beats = []
    current_time = 0.0

    for i in range(5):
        b_id = f"beat_{i+1:02d}"
        b_dur = beat_durations[i]
        b_start = round(current_time, 3)
        if i == 4:
            b_end = total_master_dur
        else:
            b_end = round(b_start + b_dur + silence_pad, 3)
        b_duration = round(b_end - b_start, 3)
        current_time = b_end

        scene_obj = {
            "id": b_id,
            "start": b_start,
            "end": b_end,
            "duration": b_duration
        }
        scenes.append(scene_obj)
        beats.append({
            "beat_id": b_id,
            "start": b_start,
            "end": b_end,
            "duration": b_duration,
            "speech_duration": b_dur
        })

    print("\nCalculated Beat Boundaries:")
    for b in beats:
        print(f"  {b['beat_id']}: {b['start']}s -> {b['end']}s (duration: {b['duration']}s, speech: {b['speech_duration']}s)")

    all_global_words = []
    all_chunks = []

    for i in range(5):
        b_id = f"beat_{i+1:02d}"
        bf = beat_files[i]
        out_json = BEATS_DIR / f"{b_id}_words.json"
        raw_words = transcribe_beat_whisper(bf, out_json)
        norm_words = normalize_beat_words(raw_words, b_id)

        b_start = beats[i]["start"]
        b_end = beats[i]["end"]

        beat_global_words = []
        for w in norm_words:
            g_start = round(b_start + w["start"], 3)
            g_end = round(b_start + w["end"], 3)
            g_start = max(b_start, g_start)
            g_end = min(b_end - 0.05, g_end)
            if g_end <= g_start:
                g_end = round(g_start + 0.15, 3)
            
            w_obj = {
                "w": w["w"],
                "start": g_start,
                "end": g_end,
                "beat_id": b_id
            }
            beat_global_words.append(w_obj)
            all_global_words.append(w_obj)

        b_chunks = build_subtitle_chunks(beat_global_words, max_words=4, max_chars=25)
        for c in b_chunks:
            c["start"] = max(b_start, c["start"])
            c["end"] = min(b_end - 0.04, c["end"])
            c["beat_id"] = b_id
            all_chunks.append(c)

    print("\n--- Validating Subtitle Chunks ---")
    boundaries = [b["end"] for b in beats[:-1]]
    word_violations = 0
    char_violations = 0
    bleed_violations = 0

    for idx, c in enumerate(all_chunks):
        words = c["text"].strip().split()
        if len(words) > 4:
            print(f"Violation: Chunk {idx} > 4 words ({len(words)}): {c['text']}")
            word_violations += 1
        if len(c["text"]) > 25:
            print(f"Violation: Chunk {idx} > 25 chars ({len(c['text'])}): {c['text']}")
            char_violations += 1
        for b in boundaries:
            if c["start"] < b - 0.05 and c["end"] > b + 0.05:
                print(f"Violation: Chunk {idx} bleeding across boundary {b}: {c['text']} ({c['start']} - {c['end']})")
                bleed_violations += 1

    total_violations = word_violations + char_violations + bleed_violations
    if total_violations > 0:
        raise RuntimeError(f"Chunk validation failed with {total_violations} violations!")
    print(f"PASS: {len(all_chunks)} chunks verified with 0 violations!")

    # Write timings.json
    timings_data = {
        "duration_seconds": total_master_dur,
        "scenes": scenes,
        "beats": beats,
        "words": all_global_words,
        "subtitle_chunks": all_chunks
    }
    TIMINGS_JSON.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Wrote timings.json ({len(all_global_words)} words, {len(all_chunks)} chunks) to {TIMINGS_JSON}")

    # Write timings.ts
    TIMINGS_TS.parent.mkdir(parents=True, exist_ok=True)
    timings_ts_code = f"""import {{ useThread, waitFor }} from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261031_002/timings.json';

export interface TimedWord {{
  w: string;
  start: number;
  end: number;
  beat_id?: string;
}}

export interface BeatTiming {{
  beat_id: string;
  start: number;
  end: number;
  duration?: number;
  speech_duration?: number;
}}

export interface SubtitleChunk {{
  text: string;
  start: number;
  end: number;
  duration?: number;
  beat_id?: string;
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
    TIMINGS_TS.write_text(timings_ts_code)
    print(f"Wrote timings.ts to {TIMINGS_TS}")

if __name__ == "__main__":
    generate_timings()
