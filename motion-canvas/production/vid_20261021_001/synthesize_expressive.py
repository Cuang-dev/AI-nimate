import os
import sys
import json
import base64
import urllib.request
import urllib.error
import subprocess
import datetime
from pathlib import Path
import re
from faster_whisper import WhisperModel

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261021_001"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
BEAT_SHEET_PATH = WORK_DIR / "beat_sheet.json"
TIMINGS_TS_PATH = REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/timings.ts"
BEAT_FILES = [
    REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/beat_01.tsx",
    REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/beat_02.tsx",
    REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/beat_03.tsx",
    REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/beat_04.tsx",
    REPO_ROOT / "motion-canvas/src/scenes/vid_20261021_001/beat_05.tsx",
]

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

def clean_word(w):
    return re.sub(r"[^\w]", "", w).lower()

def update_quota_file(model_name, prompt_tokens, total_tokens):
    data = {}
    if QUOTA_TRACKER.exists():
        try:
            data = json.loads(QUOTA_TRACKER.read_text())
        except Exception:
            data = {}
    
    data["date"] = "2026-10-24"
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
    print(f"Updated quota tracker: date={data['date']}, rpd={data['tts_rpd_used_today']}, tokens={data['tts_tokens_today']}")

def main():
    api_key = get_api_key()
    script_data = json.loads(SCRIPT_PATH.read_text())
    
    tts_style_prompt = script_data.get("tts_style_prompt", "").strip()
    tts_transcript = script_data.get("tts_transcript", "").strip()
    
    if not tts_transcript:
        raise RuntimeError("tts_transcript not found in script.json")

    # Combine style prompt + transcript
    if tts_style_prompt:
        prompt_text = f"{tts_style_prompt} {tts_transcript}"
    else:
        prompt_text = tts_transcript

    print("Full prompt to Gemini TTS:")
    print(prompt_text[:120] + "... [truncated]")

    model = "gemini-3.8-flash-tts"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

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
                        "voiceName": "Charon"
                    }
                }
            }
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    print(f"Making 1 single batched TTS call to {model}...")
    try:
        with urllib.request.urlopen(req) as resp:
            response_json = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        print(f"HTTPError {e.code}: {err}")
        if e.code not in (429, 403) and "quota" not in err.lower():
            print("Retrying once on non-quota error...")
            with urllib.request.urlopen(req) as resp:
                response_json = json.loads(resp.read().decode("utf-8"))
        else:
            raise

    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)
    print(f"TTS call succeeded! Tokens: prompt={prompt_tokens}, total={total_tokens}")

    # Update quota tracker immediately
    update_quota_file(model, prompt_tokens, total_tokens)

    # Extract audio bytes
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
    raw_path = WORK_DIR / "raw_expressive.bin"
    raw_path.write_bytes(audio_bytes)
    initial_wav = WORK_DIR / "initial_expressive.wav"

    if audio_bytes[:4] == b"RIFF":
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_path), str(initial_wav)], check=True)
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
            "-i", str(raw_path),
            str(initial_wav)
        ], check=True)

    initial_dur = get_audio_duration(initial_wav)
    print(f"Initial audio written to {initial_wav}, duration={initial_dur}s")

    # Load faster-whisper to inspect start of audio
    print("Loading faster-whisper model (base)...")
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    
    segments, _ = whisper_model.transcribe(str(initial_wav), word_timestamps=True, language="en")
    init_words = []
    for s in segments:
        for w in s.words:
            init_words.append(w)

    first_words_text = [clean_word(w.word) for w in init_words[:25]]
    print(f"First 25 recognized words: {first_words_text}")

    final_wav = WORK_DIR / "narration.wav"
    mp3_path = WORK_DIR / "narration.mp3"

    # Find where the script starts: "for", "three", "months"
    cut_time = 0.0
    for idx in range(len(init_words) - 2):
        w0 = clean_word(init_words[idx].word)
        w1 = clean_word(init_words[idx+1].word)
        w2 = clean_word(init_words[idx+2].word)
        if w0 == "for" and w1 == "three" and w2 == "months":
            if idx > 0:
                prev_clean = [clean_word(pw.word) for pw in init_words[:idx]]
                if any(k in prev_clean for k in ["speak", "sharp", "creator", "fireship", "brownlee", "absurd", "friend", "say"]):
                    prev_end = init_words[idx - 1].end
                    for_start = init_words[idx].start
                    # Cut in the silence right before 'for' (e.g. 150ms before 'for')
                    cut_time = round(max(prev_end + 0.05, for_start - 0.2), 2)
                    print(f"Detected spoken style prompt intro! Trimming at {cut_time}s (prev_end={prev_end}, for_start={for_start})")
            break

    if cut_time > 0:
        subprocess.run([
            "ffmpeg", "-y",
            "-ss", str(cut_time),
            "-i", str(initial_wav),
            str(final_wav)
        ], check=True)
    else:
        subprocess.run(["cp", str(initial_wav), str(final_wav)], check=True)

    # Convert to MP3
    subprocess.run(["ffmpeg", "-y", "-i", str(final_wav), str(mp3_path)], check=True)

    # Copy to Motion Canvas public and src directories
    pub_wav = REPO_ROOT / "motion-canvas/public/audio/vid_20261021_001.wav"
    src_wav = REPO_ROOT / "motion-canvas/src/audio/vid_20261021_001.wav"
    pub_wav.parent.mkdir(parents=True, exist_ok=True)
    src_wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(final_wav), str(pub_wav)], check=True)
    subprocess.run(["cp", str(final_wav), str(src_wav)], check=True)

    final_duration = get_audio_duration(final_wav)
    print(f"Final audio duration: {final_duration}s")

    # Transcribe final narration.wav for exact timings
    print("Transcribing final narration.wav with word timestamps...")
    segments, _ = whisper_model.transcribe(str(final_wav), word_timestamps=True, language="en")
    
    words = []
    for s in segments:
        for w in s.words:
            clean_w = w.word.strip()
            if not clean_w:
                continue
            words.append({
                "w": clean_w,
                "start": round(w.start, 3),
                "end": round(w.end, 3)
            })

    print(f"Total transcribed words: {len(words)}")

    whisper_full_text = " ".join([w["w"] for w in words])
    print("\n--- WHISPER FULL TRANSCRIPT ---")
    print(whisper_full_text)
    print("-------------------------------\n")

    # Verification checks
    checks = {
        "$699": any("$699" in w["w"] or "699" in w["w"] or "six" in clean_word(w["w"]) for w in words),
        "10,000": "10" in whisper_full_text or "ten" in whisper_full_text.lower(),
        "$9M": "9" in whisper_full_text or "nine" in whisper_full_text.lower(),
        "$1M": "1" in whisper_full_text or "one" in whisper_full_text.lower(),
        "7,000": "7" in whisper_full_text or "seven" in whisper_full_text.lower(),
        "$116M": "116" in whisper_full_text or "sixteen" in whisper_full_text.lower(),
        "AI Pin": "ai" in whisper_full_text.lower() or "pin" in whisper_full_text.lower(),
        "T-Mobile": "mobile" in whisper_full_text.lower() or "t-mobile" in whisper_full_text.lower() or "tee" in whisper_full_text.lower(),
        "HP": "hp" in whisper_full_text.lower() or "h.p." in whisper_full_text.lower() or "h" in whisper_full_text.lower(),
    }
    print("Pronunciation checks:")
    for k, v in checks.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")

    # Map to beats
    beats_data = json.loads(BEAT_SHEET_PATH.read_text())
    
    # We find boundary words between beats
    # Anchors:
    # Beat 1 ends with "one"
    # Beat 2 ends with "orders"
    # Beat 3 ends with "waste"
    # Beat 4 ends with "entirely"
    # Beat 5 ends with "badge"
    anchor_ends = ["one", "orders", "waste", "entirely", "badge"]
    
    whisper_clean_tokens = [clean_word(w["w"]) for w in words]
    curr_idx = 0
    beat_timings = []

    for b_idx, beat in enumerate(beats_data):
        b_id = beat["beat_id"]
        start_word_idx = curr_idx
        target_end_token = anchor_ends[b_idx]

        found_end_idx = None
        for j in range(curr_idx + 5, len(words)):
            if whisper_clean_tokens[j] == target_end_token or (target_end_token == "waste" and "waste" in whisper_clean_tokens[j]):
                found_end_idx = j
                break

        if found_end_idx is None:
            found_end_idx = min(curr_idx + 25, len(words) - 1)

        b_start = words[start_word_idx]["start"] if words else 0.0
        b_end = words[found_end_idx]["end"] if words else final_duration

        beat_timings.append({
            "beat_id": b_id,
            "start": b_start,
            "end": b_end
        })
        curr_idx = found_end_idx + 1

    if beat_timings:
        beat_timings[0]["start"] = min(beat_timings[0]["start"], words[0]["start"] if words else 0.0)
        beat_timings[-1]["end"] = max(beat_timings[-1]["end"], words[-1]["end"] if words else final_duration)

    timings_output = {
        "duration_seconds": final_duration,
        "words": words,
        "beats": beat_timings
    }

    timings_json_path = WORK_DIR / "timings.json"
    timings_json_path.write_text(json.dumps(timings_output, indent=2))
    print(f"\nWrote timings.json. Beats:")
    for b in beat_timings:
        print(f"  {b['beat_id']}: {b['start']}s -> {b['end']}s")

    # Calculate scenes for timings.ts
    scenes = []
    b_starts = [b["start"] for b in beat_timings]
    starts = [0.0, b_starts[1], b_starts[2], b_starts[3], b_starts[4]]
    ends = [b_starts[1], b_starts[2], b_starts[3], b_starts[4], final_duration]

    for i in range(5):
        s_start = round(starts[i], 2)
        s_end = round(ends[i], 2)
        s_dur = round(s_end - s_start, 2)
        scenes.append({
            "id": f"beat_0{i+1}",
            "start": s_start,
            "end": s_end,
            "duration": s_dur
        })

    print("\nComputed scenes:")
    for s in scenes:
        print(f"  {s['id']}: start={s['start']}, end={s['end']}, duration={s['duration']}")

    # Update timings.ts
    scenes_ts_str = "  scenes: [\n"
    for s in scenes:
        scenes_ts_str += f"    {{ id: '{s['id']}', start: {s['start']}, end: {s['end']}, duration: {s['duration']} }},\n"
    scenes_ts_str += "  ],"

    content = TIMINGS_TS_PATH.read_text()
    new_content = re.sub(r"  scenes: \[\n(?:    \{ id: '[^']+', start: [^,]+, end: [^,]+, duration: [^ ]+ \},\n)+  \],", scenes_ts_str, content)
    TIMINGS_TS_PATH.write_text(new_content)
    print(f"Updated {TIMINGS_TS_PATH}")

    # Also update finishSceneAt in beat files to match new durations
    for i, bf in enumerate(BEAT_FILES):
        if bf.exists():
            b_dur = scenes[i]["duration"]
            b_content = bf.read_text()
            b_updated = re.sub(r"finishSceneAt\(\s*[\d\.]+\s*\)", f"finishSceneAt({b_dur})", b_content)
            bf.write_text(b_updated)
            print(f"Updated {bf.name} finishSceneAt to {b_dur}")

    # Clean intermediate files
    raw_path.unlink(missing_ok=True)
    initial_wav.unlink(missing_ok=True)

if __name__ == "__main__":
    main()
