import os
import sys
import json
import base64
import urllib.request
import urllib.error
import subprocess
import datetime
import time
import shutil
import asyncio
from pathlib import Path
import re

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261102_001"
BEATS_DIR = WORK_DIR / "beats_audio"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
PUBLIC_AUDIO_PATH = REPO_ROOT / "motion-canvas/public/audio/vid_20261102_001_narration.wav"
TIMINGS_JSON = WORK_DIR / "timings.json"
TIMINGS_TS = REPO_ROOT / "motion-canvas/src/scenes/vid_20261102_001/timings.ts"

def get_api_key():
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        raise RuntimeError(".env file not found")
    for line in env_file.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip("\"'")
    raise RuntimeError("GEMINI_API_KEY not found in .env")

def get_audio_duration(wav_file):
    res = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(wav_file)
    ], capture_output=True, text=True, check=True)
    return round(float(res.stdout.strip()), 3)

def update_quota_file(model_name, prompt_tokens, total_tokens):
    data = {}
    if QUOTA_TRACKER.exists():
        try:
            data = json.loads(QUOTA_TRACKER.read_text())
        except Exception:
            data = {}
    
    today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    current_date = data.get("date", "")
    
    if current_date == today_str:
        data["tts_rpd_used_today"] = data.get("tts_rpd_used_today", 0) + 1
        data["tts_tokens_today"] = data.get("tts_tokens_today", 0) + total_tokens
    else:
        data["date"] = today_str
        data["tts_rpd_used_today"] = 1
        data["tts_tokens_today"] = total_tokens
    
    call_record = {
        "model": model_name,
        "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "prompt_tokens": prompt_tokens,
        "total_tokens": total_tokens,
        "status": "success"
    }
    if "calls" not in data or not isinstance(data["calls"], list):
        data["calls"] = []
    data["calls"].append(call_record)
    QUOTA_TRACKER.parent.mkdir(parents=True, exist_ok=True)
    QUOTA_TRACKER.write_text(json.dumps(data, indent=2))

def synthesize_with_edge_tts(text: str, out_wav_path: Path):
    print("  Falling back to edge-tts (id-ID-ArdiNeural, rate=-4%)...")
    import edge_tts
    tmp_mp3 = out_wav_path.with_suffix(".edge.mp3")
    async def _run():
        communicate = edge_tts.Communicate(text, voice="id-ID-ArdiNeural", rate="-4%")
        await communicate.save(str(tmp_mp3))
    asyncio.run(_run())

    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(tmp_mp3),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "24000",
        "-ac", "1",
        str(out_wav_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp_mp3.unlink(missing_ok=True)
    dur = get_audio_duration(out_wav_path)
    print(f"  edge-tts generated: {dur}s at {out_wav_path}")
    return out_wav_path

def synthesize_text_tts(prompt_text: str, out_wav_path: Path, voice_name: str = "Kore"):
    api_key = get_api_key()
    print(f"Synthesizing text ({len(prompt_text)} chars): {prompt_text[:80]}...")

    models = [
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-pro-preview-tts",
        "gemini-3.8-flash-tts",
        "gemini-3.1-flash-tts-preview"
    ]

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt_text
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name
                    }
                }
            }
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    response_json = None
    chosen_model = None

    for attempt in range(4):
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            print(f"  Attempt {attempt + 1}: trying {model}...")
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    response_json = json.loads(resp.read().decode("utf-8"))
                    chosen_model = model
                    break
            except urllib.error.HTTPError as e:
                err = e.read().decode("utf-8")
                print(f"  HTTPError {e.code} for {model}: {err[:120]}")
                if e.code in (429, 403, 503):
                    backoff = (2 ** attempt) * 3
                    print(f"  Rate limit hit ({e.code}), backing off {backoff}s...")
                    time.sleep(backoff)
                    continue
                else:
                    time.sleep(1)
                    continue
            except Exception as e:
                print(f"  Network error for {model}: {e}")
                time.sleep(2)
                continue
        if response_json:
            break

    if not response_json:
        print(f"  WARNING: Gemini TTS failed all attempts. Switching to edge-tts fallback.")
        return synthesize_with_edge_tts(prompt_text, out_wav_path)

    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)
    print(f"  TTS success with {chosen_model}! Tokens: prompt={prompt_tokens}, total={total_tokens}")
    update_quota_file(chosen_model, prompt_tokens, total_tokens)

    candidates = response_json.get("candidates", [])
    if not candidates:
        print("  WARNING: No candidates returned from TTS. Falling back to edge-tts.")
        return synthesize_with_edge_tts(prompt_text, out_wav_path)

    parts = candidates[0].get("content", {}).get("parts", [])
    audio_data_b64 = None
    mime_type = "audio/pcm;rate=24000"
    for p in parts:
        if "inlineData" in p:
            audio_data_b64 = p["inlineData"].get("data")
            mime_type = p["inlineData"].get("mimeType", mime_type)
            break

    if not audio_data_b64:
        print("  WARNING: No inline audio data found in response. Falling back to edge-tts.")
        return synthesize_with_edge_tts(prompt_text, out_wav_path)

    audio_bytes = base64.b64decode(audio_data_b64)
    raw_bin = out_wav_path.with_suffix(".bin")
    raw_bin.write_bytes(audio_bytes)
    initial_wav = out_wav_path.with_name(f"initial_{out_wav_path.name}")

    if audio_bytes[:4] == b"RIFF":
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_bin), str(initial_wav)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        rate = "24000"
        if "rate=" in mime_type:
            m = re.search(r"rate=(\d+)", mime_type)
            if m:
                rate = m.group(1)
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "s16le",
            "-ar", rate,
            "-ac", "1",
            "-i", str(raw_bin),
            str(initial_wav)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    raw_bin.unlink(missing_ok=True)

    # Normalize to 24000 Hz mono PCM WAV at -16 LUFS
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(initial_wav),
        "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "24000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        str(out_wav_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_wav.unlink(missing_ok=True)
    dur = get_audio_duration(out_wav_path)
    print(f"  Beat normalized: {dur}s at {out_wav_path}")
    return out_wav_path

def build_subtitle_chunks(words, max_words=4, max_chars=25):
    all_chunks = []
    curr_chunk_words = []

    for w in words:
        # Guarantee individual word is at most max_chars
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
        exceeds_word_count = (len(curr_chunk_words) + 1 > max_words)
        candidate_text = " ".join([x["w"] for x in curr_chunk_words] + [clean_w["w"]])
        exceeds_char_limit = (len(candidate_text) > max_chars)

        if prev_has_punct or has_gap or exceeds_word_count or exceeds_char_limit:
            c_text = " ".join(x["w"] for x in curr_chunk_words)
            if len(c_text) > max_chars:
                c_text = c_text[:max_chars].rstrip()
            c_start = curr_chunk_words[0]["start"]
            c_end = curr_chunk_words[-1]["end"]
            all_chunks.append({
                "text": c_text,
                "start": c_start,
                "end": c_end,
                "duration": round(c_end - c_start, 3),
                "words": curr_chunk_words
            })
            curr_chunk_words = [clean_w]
        else:
            curr_chunk_words.append(clean_w)

    if curr_chunk_words:
        c_text = " ".join(x["w"] for x in curr_chunk_words)
        if len(c_text) > max_chars:
            c_text = c_text[:max_chars].rstrip()
        c_start = curr_chunk_words[0]["start"]
        c_end = curr_chunk_words[-1]["end"]
        all_chunks.append({
            "text": c_text,
            "start": c_start,
            "end": c_end,
            "duration": round(c_end - c_start, 3),
            "words": curr_chunk_words
        })

    return all_chunks

def transcribe_beat_whisper(model, wav_file: Path):
    segments, info = model.transcribe(str(wav_file), word_timestamps=True, language="id")
    words = []
    for s in segments:
        for w in s.words:
            txt = w.word.strip()
            if txt:
                words.append({
                    "w": txt,
                    "start": float(round(w.start, 3)),
                    "end": float(round(w.end, 3))
                })
    return words

def run_pipeline():
    BEATS_DIR.mkdir(parents=True, exist_ok=True)
    script_data = json.loads(SCRIPT_PATH.read_text())
    beats = script_data.get("beats", [])
    if len(beats) != 10:
        raise RuntimeError(f"Expected 10 beats in script.json, found {len(beats)}")

    voice_name = script_data.get("voice", "Kore")

    beat_wavs = []
    print("\n--- 1. Synthesizing 10 Beats Audio ---")
    for b in beats:
        b_id = b["beat_id"]
        text = b.get("tts_transcript") or b.get("spoken_text", "")
        out_wav = BEATS_DIR / f"{b_id}.wav"
        if out_wav.exists() and out_wav.stat().st_size > 10000:
            dur = get_audio_duration(out_wav)
            print(f"  {b_id}: Cached ({dur}s)")
        else:
            synthesize_text_tts(text, out_wav, voice_name=voice_name)
            time.sleep(1.0)
        beat_wavs.append(out_wav)

    # 2. Concat with 0.5s silence padding
    print("\n--- 2. Concatenating Master Narration WAV (with 0.5s padding) ---")
    silence_wav = WORK_DIR / "silence_0.5s.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
        "-t", "0.50",
        str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    concat_list_file = WORK_DIR / "concat_beats.txt"
    concat_lines = []
    for i, bw in enumerate(beat_wavs):
        concat_lines.append(f"file '{bw.resolve()}'")
        if i < len(beat_wavs) - 1:
            concat_lines.append(f"file '{silence_wav.resolve()}'")
    concat_list_file.write_text("\n".join(concat_lines) + "\n")

    unnorm_wav = WORK_DIR / "unnorm_master.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "pcm_s16le",
        "-ar", "24000",
        "-ac", "1",
        str(unnorm_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    PUBLIC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(unnorm_wav),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "24000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        str(PUBLIC_AUDIO_PATH)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    unnorm_wav.unlink(missing_ok=True)
    silence_wav.unlink(missing_ok=True)
    concat_list_file.unlink(missing_ok=True)

    master_dur = get_audio_duration(PUBLIC_AUDIO_PATH)
    print(f"Master narration generated: {PUBLIC_AUDIO_PATH} ({master_dur}s)")
    if master_dur < 480.0 or master_dur > 720.0:
        print(f"WARNING: Duration {master_dur}s is outside target [480, 720]s, checking bounds...")
    else:
        print(f"SUCCESS: Duration {master_dur}s is inside target 480-720s (8-12 minutes)!")

    # 3. Whisper Alignment
    print("\n--- 3. Running faster-whisper Word Alignment ---")
    from faster_whisper import WhisperModel
    print("Loading faster-whisper base model...")
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

    beat_durations = [get_audio_duration(bw) for bw in beat_wavs]
    silence_pad = 0.50

    scenes = []
    beats_meta = []
    current_time = 0.0

    for i in range(10):
        b_id = f"beat_{i+1:02d}"
        b_dur = beat_durations[i]
        b_start = round(current_time, 3)
        if i == 9:
            b_end = master_dur
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
        beats_meta.append({
            "beat_id": b_id,
            "start": b_start,
            "end": b_end,
            "duration": b_duration,
            "speech_duration": b_dur
        })

    all_global_words = []
    all_chunks = []

    for i in range(10):
        b_id = f"beat_{i+1:02d}"
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
                "beat_id": b_id
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

    # 4. Strict Validation
    print("\n--- 4. Validating Subtitle Chunks ---")
    boundaries = [b["end"] for b in beats_meta[:-1]]
    word_violations = 0
    char_violations = 0
    bleed_violations = 0

    for idx, c in enumerate(all_chunks):
        words = c["text"].strip().split()
        if len(words) > 4:
            print(f"VIOLATION: Chunk {idx} > 4 words ({len(words)}): '{c['text']}'")
            word_violations += 1
        if len(c["text"]) > 25:
            print(f"VIOLATION: Chunk {idx} > 25 chars ({len(c['text'])}): '{c['text']}'")
            char_violations += 1
        for b in boundaries:
            if c["start"] < b - 0.01 and c["end"] > b + 0.01:
                print(f"VIOLATION: Chunk {idx} bleeding across boundary {b}: '{c['text']}' ({c['start']} - {c['end']})")
                bleed_violations += 1

    total_violations = word_violations + char_violations + bleed_violations
    if total_violations > 0:
        raise RuntimeError(f"Chunk validation failed with {total_violations} violations!")
    print(f"PASS: {len(all_chunks)} chunks verified with 0 violations!")

    # 5. Write timings.json
    timings_data = {
        "duration_seconds": master_dur,
        "scenes": scenes,
        "beats": beats_meta,
        "words": all_global_words,
        "subtitle_chunks": all_chunks
    }
    TIMINGS_JSON.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Wrote timings.json ({len(all_global_words)} words, {len(all_chunks)} chunks) to {TIMINGS_JSON}")

    # 6. Write timings.ts
    TIMINGS_TS.parent.mkdir(parents=True, exist_ok=True)
    timings_ts_code = f"""import {{ useThread, waitFor }} from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261102_001/timings.json';

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

    # 7. Clean up temporary per-beat WAV files
    print("\n--- 7. Cleaning up temporary per-beat WAV files ---")
    if BEATS_DIR.exists():
        shutil.rmtree(BEATS_DIR)
        print(f"Removed {BEATS_DIR}")

    print("\n=== PIPELINE COMPLETE ===")
    print(f"Master narration: {PUBLIC_AUDIO_PATH} ({master_dur}s)")
    print(f"Timings JSON: {TIMINGS_JSON}")
    print(f"Timings TS: {TIMINGS_TS}")
    for b in beats_meta:
        print(f"  {b['beat_id']}: {b['start']}s -> {b['end']}s (dur={b['duration']}s, speech={b['speech_duration']}s)")

if __name__ == "__main__":
    run_pipeline()
