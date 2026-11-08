#!/usr/bin/env python3
"""
Natural Jakarta Indonesian TTS Synthesis & Word-Level Whisper Alignment
for `vid_20261102_001` ("POV: Buka Bisnis Sewa Meja Mahjong Otomatis").
- Rotates across GEMINI_API_KEY and NANO_BANANA_API_KEY on `gemini-2.5-flash-preview-tts`
  and `gemini-2.5-pro-preview-tts` with `voiceName: "Puck"`.
- Prepends an explicit Indonesian voice director instruction (`tts_style_prompt`) so the
  delivery sounds like a natural, energetic Indonesian YouTube creator (never robotic).
- Runs `faster-whisper` word-level timestamp alignment and generates `timings.json` + `timings.ts`.
"""

import asyncio
import base64
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261102_001"
BEATS_DIR = WORK_DIR / "beats_audio"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
PUBLIC_AUDIO_PATH = REPO_ROOT / "motion-canvas/public/audio/vid_20261102_001_narration.wav"
TIMINGS_JSON = WORK_DIR / "timings.json"
TIMINGS_TS = REPO_ROOT / "motion-canvas/src/scenes/vid_20261102_001/timings.ts"

DEFAULT_DIRECTOR_PREFIX = (
    "Say in a natural, casual, energetic Jakarta Indonesian YouTube business creator voice "
    "(warm, conversational, dynamic intonation, natural pauses at dashes, never stiff or robotic): "
)


def get_api_keys() -> list[str]:
    env_file = REPO_ROOT / ".env"
    keys = []
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            for kname in ("GEMINI_API_KEY=", "NANO_BANANA_API_KEY="):
                if line.startswith(kname):
                    val = line.split("=", 1)[1].strip().strip("\"'")
                    if val and val not in keys:
                        keys.append(val)
    if not keys:
        raise RuntimeError("No GEMINI_API_KEY or NANO_BANANA_API_KEY found in .env")
    return keys


def get_audio_duration(wav_file: Path) -> float:
    res = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(wav_file),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return round(float(res.stdout.strip()), 3)


def clean_spoken_text_for_tts(raw_text: str) -> str:
    txt = raw_text.strip()
    # Strip any accidental leading POV / P-O-V prefix so TTS never says "Poof!"
    txt = re.sub(r"^(?:P-O-V|POV)\s*[:,.\-—]?\s*", "", txt, flags=re.IGNORECASE)
    return txt.strip()


def synthesize_text_tts(
    spoken_text: str,
    out_wav_path: Path,
    voice_name: str = "Puck",
    director_prefix: str = DEFAULT_DIRECTOR_PREFIX,
    chapter_idx: int = 0,
) -> Path:
    keys = get_api_keys()
    clean_txt = clean_spoken_text_for_tts(spoken_text)
    full_prompt = f"{director_prefix}{clean_txt}"
    print(f"Synthesizing chapter #{chapter_idx + 1} ({len(clean_txt)} chars, voice={voice_name}): {clean_txt[:75]}...")

    models = [
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-pro-preview-tts",
    ]

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name,
                    }
                }
            },
        },
    }
    req_data = json.dumps(payload).encode("utf-8")
    response_json = None
    chosen_model = None

    for attempt in range(5):
        key = keys[(chapter_idx + attempt) % len(keys)]
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    response_json = json.loads(resp.read().decode("utf-8"))
                    chosen_model = model
                    break
            except urllib.error.HTTPError as e:
                err = e.read().decode("utf-8")
                print(f"  [Attempt {attempt + 1}] HTTPError {e.code} on {model}: {err[:120]}")
                time.sleep(3 * (attempt + 1))
            except Exception as e:
                print(f"  [Attempt {attempt + 1}] Error on {model}: {e}")
                time.sleep(2)
        if response_json:
            break

    if not response_json:
        raise RuntimeError(f"Gemini TTS failed all attempts for {out_wav_path.name}")

    candidates = response_json.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    audio_data_b64 = None
    mime_type = "audio/pcm;rate=24000"
    for p in parts:
        if "inlineData" in p:
            audio_data_b64 = p["inlineData"].get("data")
            mime_type = p["inlineData"].get("mimeType", mime_type)
            break

    if not audio_data_b64:
        raise RuntimeError(f"No inline audio data returned for {out_wav_path.name}")

    audio_bytes = base64.b64decode(audio_data_b64)
    raw_bin = out_wav_path.with_suffix(".bin")
    raw_bin.write_bytes(audio_bytes)
    initial_wav = out_wav_path.with_name(f"initial_{out_wav_path.name}")

    if audio_bytes[:4] == b"RIFF":
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw_bin), str(initial_wav)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        rate = "24000"
        if "rate=" in mime_type:
            m = re.search(r"rate=(\d+)", mime_type)
            if m:
                rate = m.group(1)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "s16le",
                "-ar",
                rate,
                "-ac",
                "1",
                "-i",
                str(raw_bin),
                str(initial_wav),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    raw_bin.unlink(missing_ok=True)

    # Normalize to 24000 Hz mono PCM WAV at -16 LUFS
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(initial_wav),
            "-filter:a",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar",
            "24000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out_wav_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    initial_wav.unlink(missing_ok=True)
    dur = get_audio_duration(out_wav_path)
    print(f"  [OK] {out_wav_path.name} ({chosen_model}, voice={voice_name}): {dur}s")
    return out_wav_path


def build_subtitle_chunks(words: list[dict], max_words: int = 4, max_chars: int = 25) -> list[dict]:
    all_chunks = []
    curr_chunk_words = []

    for w in words:
        clean_w = dict(w)
        if len(clean_w["w"]) > max_chars:
            clean_w["w"] = clean_w["w"][:max_chars]

        if not curr_chunk_words:
            curr_chunk_words.append(clean_w)
            continue

        prev_w = curr_chunk_words[-1]
        prev_has_punct = prev_w["w"].rstrip().endswith((".", "?", "!", ","))
        gap = round(clean_w["start"] - prev_w["end"], 4)
        has_gap = gap > 0.35
        exceeds_word_count = len(curr_chunk_words) + 1 > max_words
        candidate_text = " ".join([x["w"] for x in curr_chunk_words] + [clean_w["w"]])
        exceeds_char_limit = len(candidate_text) > max_chars

        if prev_has_punct or has_gap or exceeds_word_count or exceeds_char_limit:
            c_text = " ".join(x["w"] for x in curr_chunk_words)
            if len(c_text) > max_chars:
                c_text = c_text[:max_chars].rstrip()
            c_start = curr_chunk_words[0]["start"]
            c_end = curr_chunk_words[-1]["end"]
            all_chunks.append(
                {
                    "text": c_text,
                    "start": c_start,
                    "end": c_end,
                    "duration": round(c_end - c_start, 3),
                    "words": curr_chunk_words,
                }
            )
            curr_chunk_words = [clean_w]
        else:
            curr_chunk_words.append(clean_w)

    if curr_chunk_words:
        c_text = " ".join(x["w"] for x in curr_chunk_words)
        if len(c_text) > max_chars:
            c_text = c_text[:max_chars].rstrip()
        c_start = curr_chunk_words[0]["start"]
        c_end = curr_chunk_words[-1]["end"]
        all_chunks.append(
            {
                "text": c_text,
                "start": c_start,
                "end": c_end,
                "duration": round(c_end - c_start, 3),
                "words": curr_chunk_words,
            }
        )

    return all_chunks


def transcribe_beat_whisper(model, wav_file: Path) -> list[dict]:
    import numpy as np

    raw_pcm = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(wav_file),
            "-f",
            "s16le",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-",
        ],
        capture_output=True,
        check=True,
    ).stdout
    audio_np = np.frombuffer(raw_pcm, dtype=np.int16).astype(np.float32) / 32768.0
    segments, _ = model.transcribe(audio_np, word_timestamps=True, language="id")
    words = []
    for s in segments:
        for w in s.words:
            txt = w.word.strip()
            if txt:
                words.append(
                    {
                        "w": txt,
                        "start": float(round(w.start, 3)),
                        "end": float(round(w.end, 3)),
                    }
                )
    return words


def run_pipeline():
    BEATS_DIR.mkdir(parents=True, exist_ok=True)
    script_data = json.loads(SCRIPT_PATH.read_text())
    chapters = script_data.get("chapters") or script_data.get("beats", [])
    if not chapters:
        raise RuntimeError("No chapters/beats found in script.json")

    voice_name = script_data.get("voice", "Puck")
    if voice_name == "Kore":
        voice_name = "Puck"

    beat_wavs = []
    print(f"\n--- 1. Synthesizing {len(chapters)} Chapters Audio (Natural Jakarta Indonesian, Voice={voice_name}) ---")
    for idx, ch in enumerate(chapters):
        b_id = ch.get("beat_id") or f"beat_{idx + 1:02d}"
        text = ch.get("tts_transcript") or ch.get("spoken_text", "")
        out_wav = BEATS_DIR / f"{b_id}.wav"
        if out_wav.exists() and out_wav.stat().st_size > 10000:
            dur = get_audio_duration(out_wav)
            print(f"  {b_id}: Cached ({dur}s)")
        else:
            synthesize_text_tts(
                text,
                out_wav,
                voice_name=voice_name,
                director_prefix=DEFAULT_DIRECTOR_PREFIX,
                chapter_idx=idx,
            )
            time.sleep(1.5)
        beat_wavs.append(out_wav)

    print("\n--- 2. Concatenating Master Narration WAV (with 0.5s padding) ---")
    silence_wav = WORK_DIR / "silence_0.5s.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=24000:cl=mono",
            "-t",
            "0.50",
            str(silence_wav),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    concat_list_file = WORK_DIR / "concat_beats.txt"
    concat_lines = []
    for i, bw in enumerate(beat_wavs):
        concat_lines.append(f"file '{bw.resolve()}'")
        if i < len(beat_wavs) - 1:
            concat_lines.append(f"file '{silence_wav.resolve()}'")
    concat_list_file.write_text("\n".join(concat_lines) + "\n")

    unnorm_wav = WORK_DIR / "unnorm_master.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list_file),
            "-c",
            "pcm_s16le",
            "-ar",
            "24000",
            "-ac",
            "1",
            str(unnorm_wav),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    PUBLIC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(unnorm_wav),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar",
            "24000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(PUBLIC_AUDIO_PATH),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    unnorm_wav.unlink(missing_ok=True)
    silence_wav.unlink(missing_ok=True)
    concat_list_file.unlink(missing_ok=True)

    master_dur = get_audio_duration(PUBLIC_AUDIO_PATH)
    print(f"Master narration generated: {PUBLIC_AUDIO_PATH} ({master_dur}s)")

    print("\n--- 3. Running faster-whisper Word Alignment ---")
    from faster_whisper import WhisperModel

    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

    beat_durations = [get_audio_duration(bw) for bw in beat_wavs]
    silence_pad = 0.50

    scenes = []
    beats_meta = []
    current_time = 0.0
    num_chapters = len(chapters)

    for i in range(num_chapters):
        b_id = f"beat_{i + 1:02d}"
        c_id = f"chapter_{i + 1:02d}"
        b_dur = beat_durations[i]
        b_start = round(current_time, 3)
        if i == num_chapters - 1:
            b_end = master_dur
        else:
            b_end = round(b_start + b_dur + silence_pad, 3)
        b_duration = round(b_end - b_start, 3)
        current_time = b_end

        scenes.append(
            {
                "id": b_id,
                "chapter_id": c_id,
                "start": b_start,
                "end": b_end,
                "duration": b_duration,
            }
        )
        beats_meta.append(
            {
                "beat_id": b_id,
                "chapter_id": c_id,
                "stage_mode": chapters[i].get("stage_mode", "explainer_2x2"),
                "start": b_start,
                "end": b_end,
                "duration": b_duration,
                "speech_duration": b_dur,
            }
        )

    all_global_words = []
    all_chunks = []

    for i in range(num_chapters):
        b_id = f"beat_{i + 1:02d}"
        bw = beat_wavs[i]
        b_start = beats_meta[i]["start"]
        b_end = beats_meta[i]["end"]
        b_dur = beat_durations[i]

        print(f"  Transcribing {b_id} ({b_dur}s)...")
        raw_words = transcribe_beat_whisper(whisper_model, bw)
        print(f"    {b_id}: {len(raw_words)} words extracted.")

        beat_global_words = []
        for w in raw_words:
            g_start = round(b_start + w["start"], 3)
            g_end = round(b_start + w["end"], 3)
            g_start = max(b_start, g_start)
            g_end = min(b_end - 0.05, g_end)
            if g_end <= g_start:
                g_end = min(b_end, round(g_start + 0.15, 3))

            w_obj = {
                "w": w["w"],
                "start": g_start,
                "end": g_end,
                "beat_id": b_id,
            }
            beat_global_words.append(w_obj)
            all_global_words.append(w_obj)

        b_chunks = build_subtitle_chunks(beat_global_words, max_words=4, max_chars=25)
        for c in b_chunks:
            c["start"] = max(b_start, c["start"])
            c["end"] = min(b_end - 0.02, c["end"])
            if c["end"] <= c["start"]:
                c["end"] = min(b_end, round(c["start"] + 0.15, 3))
            c["duration"] = round(c["end"] - c["start"], 3)
            c["beat_id"] = b_id
            all_chunks.append(c)

    print("\n--- 4. Validating Subtitle Chunks ---")
    boundaries = [b["end"] for b in beats_meta[:-1]]
    violations = 0
    for idx, c in enumerate(all_chunks):
        words = c["text"].strip().split()
        if len(words) > 4 or len(c["text"]) > 25:
            violations += 1
        for b in boundaries:
            if c["start"] < b - 0.01 and c["end"] > b + 0.01:
                violations += 1
    if violations > 0:
        raise RuntimeError(f"Chunk validation failed with {violations} violations!")
    print(f"PASS: {len(all_chunks)} chunks verified with 0 violations!")

    timings_data = {
        "duration_seconds": master_dur,
        "scenes": scenes,
        "chapters": beats_meta,
        "beats": beats_meta,
        "words": all_global_words,
        "subtitle_chunks": all_chunks,
    }
    TIMINGS_JSON.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Wrote timings.json ({len(all_global_words)} words, {len(all_chunks)} chunks) to {TIMINGS_JSON}")

    TIMINGS_TS.parent.mkdir(parents=True, exist_ok=True)
    timings_ts_code = """import { useThread, waitFor } from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261102_001/timings.json';

export interface TimedWord {
  w: string;
  start: number;
  end: number;
  beat_id?: string;
}

export interface BeatTiming {
  beat_id: string;
  chapter_id?: string;
  stage_mode?: string;
  start: number;
  end: number;
  duration?: number;
  speech_duration?: number;
}

export interface SubtitleChunk {
  text: string;
  start: number;
  end: number;
  duration?: number;
  beat_id?: string;
  words: TimedWord[];
}

export const TIMINGS = {
  totalDuration: rawTimings.duration_seconds,
  beats: rawTimings.beats as BeatTiming[],
  chapters: (rawTimings.chapters || rawTimings.beats) as BeatTiming[],
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

export function focalRotation(
  activeId: () => number,
  targetId: number,
  time: () => number
): number {
  if (activeId() !== targetId) return 0;
  return Math.sin(time() * 0.45) * 0.12;
}
"""
    TIMINGS_TS.write_text(timings_ts_code)
    print(f"Wrote timings.ts to {TIMINGS_TS}")

    if BEATS_DIR.exists():
        shutil.rmtree(BEATS_DIR)

    print("\n=== PIPELINE COMPLETE ===")
    for b in beats_meta:
        print(f"  {b['beat_id']} ({b['stage_mode']}): {b['start']}s -> {b['end']}s (dur={b['duration']}s)")


if __name__ == "__main__":
    run_pipeline()
