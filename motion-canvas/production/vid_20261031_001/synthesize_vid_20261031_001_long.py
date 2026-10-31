import os
import sys
import json
import base64
import urllib.request
import urllib.error
import subprocess
import datetime
import time
from pathlib import Path
import re

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_001_long"
PROD_SHORT_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_001"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = PROD_SHORT_DIR / "script_long.json"

RAW_SUB_BEATS_DIR = WORK_DIR / "raw_sub_beats"
PROCESSED_SUB_BEATS_DIR = WORK_DIR / "processed_sub_beats"
TIMINGS_JSON_PATH = WORK_DIR / "timings.json"
TIMINGS_JSON_PROD_PATH = PROD_SHORT_DIR / "timings_long.json"

PUBLIC_AUDIO_PATH = REPO_ROOT / "motion-canvas/public/audio/vid_20261031_001_long/narration.wav"
SRC_AUDIO_PATH = REPO_ROOT / "motion-canvas/src/audio/vid_20261031_001_long.wav"
LOCAL_FINAL_AUDIO_PATH = WORK_DIR / "narration.wav"

def get_api_key():
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        raise RuntimeError(".env file not found")
    for line in env_file.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
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
    QUOTA_TRACKER.write_text(json.dumps(data, indent=2))

def synthesize_text(api_key, text, out_wav):
    models = [
        "gemini-3.8-flash-tts",
        "gemini-3.1-flash-tts-preview",
        "gemini-2.5-flash-preview-tts"
    ]

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": text
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": "Charon"
                    }
                }
            }
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    response_json = None
    chosen_model = None

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                response_json = json.loads(resp.read().decode("utf-8"))
                chosen_model = model
                break
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8")
            print(f"  HTTPError {e.code} for {model}: {err[:120]}")
            time.sleep(1)
            continue

    if not response_json:
        raise RuntimeError(f"All TTS models failed for text: {text[:50]}...")

    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)
    update_quota_file(chosen_model, prompt_tokens, total_tokens)

    candidates = response_json.get("candidates", [])
    if not candidates:
        raise RuntimeError("No candidates returned from TTS")
    parts = candidates[0].get("content", {}).get("parts", [])
    audio_data_b64 = None
    mime_type = "audio/pcm;rate=24000"
    for p in parts:
        if "inlineData" in p:
            audio_data_b64 = p["inlineData"].get("data")
            mime_type = p["inlineData"].get("mimeType", mime_type)
            break

    if not audio_data_b64:
        raise RuntimeError("No inline audio data found in response")

    audio_bytes = base64.b64decode(audio_data_b64)
    raw_bin = out_wav.with_suffix(".bin")
    raw_bin.write_bytes(audio_bytes)

    if audio_bytes[:4] == b"RIFF":
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_bin), str(out_wav)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            str(out_wav)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    raw_bin.unlink(missing_ok=True)
    return out_wav

def transcribe_with_whisper(wav_file, json_out):
    if json_out.exists():
        return json.loads(json_out.read_text())

    whisper_script = f'''
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
with open("{json_out}", "w") as f:
    json.dump(words, f, indent=2)
'''
    cmd = [
        "/home/agent/.local/bin/uv", "run", "--python", "3.12",
        "--with", "faster-whisper", "--with", "av<14",
        "python3", "-c", whisper_script
    ]
    subprocess.run(cmd, check=True)
    return json.loads(json_out.read_text())

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

def main():
    print("=== Starting Long-Form Narration Synthesis & Timings Pipeline ===")
    api_key = get_api_key()
    RAW_SUB_BEATS_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_SUB_BEATS_DIR.mkdir(parents=True, exist_ok=True)

    script_data = json.loads(SCRIPT_PATH.read_text())
    beats = script_data.get("beats", [])

    # Extract all 18 sub-beats
    all_sub_beats = []
    for b in beats:
        for sb in b.get("sub_beats", []):
            all_sub_beats.append({
                "babak_id": b["beat_id"],
                "babak_act": b["act"],
                "babak_title": b["title"],
                **sb
            })

    print(f"Total Babaks: {len(beats)}, Total Sub-Beats: {len(all_sub_beats)}")

    # Step 1: Synthesize each sub-beat if not already synthesized
    for idx, sb in enumerate(all_sub_beats, 1):
        sb_id = sb["id"]
        raw_wav = RAW_SUB_BEATS_DIR / f"{sb_id}.wav"
        if raw_wav.exists() and raw_wav.stat().st_size > 1000:
            print(f"[{idx}/18] Sub-beat {sb_id} raw audio cached ({get_audio_duration(raw_wav)}s)")
        else:
            print(f"[{idx}/18] Synthesizing {sb_id} with Gemini TTS (Charon)...")
            synthesize_text(api_key, sb["tts_text"], raw_wav)
            print(f"  -> Generated {sb_id} ({get_audio_duration(raw_wav)}s)")
            time.sleep(0.5)

    # Step 2: Apply atempo=1.12 and resample to 48kHz mono
    for idx, sb in enumerate(all_sub_beats, 1):
        sb_id = sb["id"]
        raw_wav = RAW_SUB_BEATS_DIR / f"{sb_id}.wav"
        proc_wav = PROCESSED_SUB_BEATS_DIR / f"{sb_id}_speed.wav"
        if not proc_wav.exists() or proc_wav.stat().st_size < 1000:
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(raw_wav),
                "-filter:a", "atempo=1.12",
                "-ar", "48000",
                "-ac", "1",
                str(proc_wav)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        sb["duration"] = get_audio_duration(proc_wav)
        sb["proc_wav"] = proc_wav

    # Step 3: Run faster-whisper on each processed sub-beat
    print("\nTranscribing sub-beats with faster-whisper...")
    for idx, sb in enumerate(all_sub_beats, 1):
        sb_id = sb["id"]
        transcription_path = PROCESSED_SUB_BEATS_DIR / f"{sb_id}_words.json"
        words = transcribe_with_whisper(sb["proc_wav"], transcription_path)
        sb["words"] = words
        print(f"  [{idx}/18] {sb_id}: {len(words)} words ({sb['duration']}s)")

    # Step 4: Create silence audio segments for pauses
    pause_sub_beat_wav = WORK_DIR / "pause_0.35s.wav"
    pause_babak_wav = WORK_DIR / "pause_0.65s.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
        "-t", "0.35",
        str(pause_sub_beat_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
        "-t", "0.65",
        str(pause_babak_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Step 5: Calculate exact global timestamps for each sub-beat, babak, and word
    current_time = 0.0
    babak_timings = {}
    all_global_words = []

    concat_list_file = WORK_DIR / "concat_list.txt"
    concat_lines = []

    for b_idx, b in enumerate(beats):
        b_id = b["beat_id"]
        b_sub_beats = [sb for sb in all_sub_beats if sb["babak_id"] == b_id]
        babak_start = round(current_time, 3)

        for s_idx, sb in enumerate(b_sub_beats):
            sb_start = round(current_time, 3)
            concat_lines.append(f"file '{sb['proc_wav'].resolve()}'")
            current_time += sb["duration"]
            sb_end = round(current_time, 3)

            # Map words to global timeline
            for w in sb["words"]:
                g_start = round(sb_start + w["start"], 3)
                g_end = round(sb_start + w["end"], 3)
                all_global_words.append({
                    "w": w["w"],
                    "start": g_start,
                    "end": g_end,
                    "sub_beat_id": sb["id"],
                    "babak_id": b_id
                })

            # Add breath pause between sub-beats within babak
            if s_idx < len(b_sub_beats) - 1:
                concat_lines.append(f"file '{pause_sub_beat_wav.resolve()}'")
                current_time += 0.35

        babak_end = round(current_time, 3)
        babak_timings[b_id] = {
            "id": b_id,
            "title": b["title"],
            "act": b["act"],
            "start": babak_start,
            "end": babak_end,
            "duration": round(babak_end - babak_start, 3)
        }

        # Add pause between babaks (except after last babak)
        if b_idx < len(beats) - 1:
            concat_lines.append(f"file '{pause_babak_wav.resolve()}'")
            current_time += 0.65

    total_expected_duration = round(current_time, 3)
    concat_list_file.write_text("\n".join(concat_lines) + "\n")

    # Step 6: Concatenate all sub-beats and pauses into un-normalized wav
    unnorm_wav = WORK_DIR / "unnorm_concat.wav"
    print("\nConcatenating full narration audio...")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "pcm_s16le",
        str(unnorm_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Step 7: Apply loudnorm -16 LUFS
    print("Normalizing to -16 LUFS (48kHz mono)...")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(unnorm_wav),
        "-ar", "48000",
        "-ac", "1",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        str(LOCAL_FINAL_AUDIO_PATH)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    actual_duration = get_audio_duration(LOCAL_FINAL_AUDIO_PATH)
    print(f"Final audio created: {LOCAL_FINAL_AUDIO_PATH} (duration: {actual_duration}s / ~{round(actual_duration/60, 2)} min)")

    # Copy to public and src audio destinations
    PUBLIC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(LOCAL_FINAL_AUDIO_PATH), str(PUBLIC_AUDIO_PATH)], check=True)
    SRC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(LOCAL_FINAL_AUDIO_PATH), str(SRC_AUDIO_PATH)], check=True)
    print(f"Copied audio to {PUBLIC_AUDIO_PATH} and {SRC_AUDIO_PATH}")

    # Step 8: Build subtitle chunks with strict <= 4 words and <= 25 chars per chunk
    # Partition words by babak to guarantee 0 cross-beat bleed
    chunks_by_babak = []
    all_chunks = []
    for b in beats:
        b_id = b["beat_id"]
        b_words = [w for w in all_global_words if w["babak_id"] == b_id]
        b_chunks = build_subtitle_chunks(b_words, max_words=4, max_chars=25)
        for c in b_chunks:
            # Ensure chunk boundaries do not exceed babak boundaries
            c["start"] = max(c["start"], babak_timings[b_id]["start"])
            c["end"] = min(c["end"], babak_timings[b_id]["end"])
            c["babak_id"] = b_id
        all_chunks.extend(b_chunks)

    # Validate 0 violations
    violations = 0
    for idx, c in enumerate(all_chunks):
        w_count = len(c["words"])
        c_len = len(c["text"])
        if w_count > 4 or c_len > 25:
            print(f"VIOLATION at chunk {idx}: '{c['text']}' (words={w_count}, chars={c_len})")
            violations += 1

    print(f"\nSubtitle Chunks Total: {len(all_chunks)}, Violations: {violations}")
    if violations > 0:
        raise RuntimeError(f"Detected {violations} subtitle chunk violations!")

    # Step 9: Save timings.json
    timings_data = {
        "duration_seconds": actual_duration,
        "scenes": list(babak_timings.values()),
        "beats": [
            {
                "beat_id": bt["id"],
                "start": bt["start"],
                "end": bt["end"],
                "duration": bt["duration"],
                "title": bt["title"],
                "act": bt["act"]
            }
            for bt in babak_timings.values()
        ],
        "words": all_global_words,
        "subtitle_chunks": all_chunks
    }

    TIMINGS_JSON_PATH.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    TIMINGS_JSON_PROD_PATH.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Saved timings to {TIMINGS_JSON_PATH} and {TIMINGS_JSON_PROD_PATH}")

    print("\n=== Narration & Timings Summary ===")
    print(f"Total Duration: {actual_duration}s ({round(actual_duration/60, 2)} minutes)")
    for bt in babak_timings.values():
        print(f"  {bt['id']}: [{bt['start']}s -> {bt['end']}s] (duration: {bt['duration']}s) - {bt['title']}")

if __name__ == "__main__":
    main()
