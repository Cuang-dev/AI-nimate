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
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_002"
BEATS_DIR = WORK_DIR / "beats_audio"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
MASTER_WAV_PATH = WORK_DIR / "narration.wav"
PUBLIC_AUDIO_PATH = REPO_ROOT / "motion-canvas/public/audio/vid_20261031_002/narration.wav"
SRC_AUDIO_PATH = REPO_ROOT / "motion-canvas/src/audio/vid_20261031_002.wav"

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
    QUOTA_TRACKER.parent.mkdir(parents=True, exist_ok=True)
    QUOTA_TRACKER.write_text(json.dumps(data, indent=2))

def synthesize_text_tts(prompt_text: str, out_wav_path: Path):
    api_key = get_api_key()
    print(f"Synthesizing text ({len(prompt_text)} chars): {prompt_text[:80]}...")

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
    response_json = None
    chosen_model = None

    for attempt in range(5):
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
                with urllib.request.urlopen(req, timeout=30) as resp:
                    response_json = json.loads(resp.read().decode("utf-8"))
                    chosen_model = model
                    break
            except urllib.error.HTTPError as e:
                err = e.read().decode("utf-8")
                print(f"  HTTPError {e.code} for {model}: {err[:140]}")
                if e.code in (429, 403, 503):
                    backoff = (2 ** attempt) * 2
                    print(f"  Rate limit/Quota hit, backing off {backoff}s...")
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
        raise RuntimeError(f"All TTS models failed for text: {prompt_text[:50]}...")

    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)
    print(f"  TTS success with {chosen_model}! Tokens: prompt={prompt_tokens}, total={total_tokens}")

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

    # Process to atempo=1.12, loudnorm=-16 LUFS, 48000 Hz mono
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(initial_wav),
        "-filter:a", "atempo=1.12,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "48000",
        "-ac", "1",
        str(out_wav_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_wav.unlink(missing_ok=True)
    dur = get_audio_duration(out_wav_path)
    print(f"  Beat normalized: {dur}s at {out_wav_path}")
    return out_wav_path

def run_pipeline():
    BEATS_DIR.mkdir(parents=True, exist_ok=True)
    script_data = json.loads(SCRIPT_PATH.read_text())
    beats = script_data.get("beats", [])
    if len(beats) != 5:
        raise RuntimeError(f"Expected 5 beats in script.json, found {len(beats)}")

    beat_wavs = []
    print("\n--- 1. Synthesizing 5 Beats Audio ---")
    for b in beats:
        b_id = b["beat_id"]
        text = b.get("tts_transcript") or b.get("spoken_text", "")
        out_wav = BEATS_DIR / f"{b_id}.wav"
        if out_wav.exists() and out_wav.stat().st_size > 5000:
            dur = get_audio_duration(out_wav)
            print(f"  {b_id}: Cached ({dur}s)")
        else:
            synthesize_text_tts(text, out_wav)
            time.sleep(0.5)
        beat_wavs.append(out_wav)

    # Generate 0.5s silence padding WAV
    silence_wav = WORK_DIR / "silence_0.5s.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
        "-t", "0.50",
        str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Concat beats with 0.5s silence padding
    print("\n--- 2. Concatenating Master Narration WAV (with 0.5s padding) ---")
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
        str(unnorm_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Normalize master to -16 LUFS, 48000 Hz, mono
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(unnorm_wav),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "48000",
        "-ac", "1",
        str(MASTER_WAV_PATH)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    unnorm_wav.unlink(missing_ok=True)
    silence_wav.unlink(missing_ok=True)
    concat_list_file.unlink(missing_ok=True)

    master_dur = get_audio_duration(MASTER_WAV_PATH)
    print(f"Master narration generated: {MASTER_WAV_PATH} ({master_dur}s)")

    # Copy to public and src
    PUBLIC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(MASTER_WAV_PATH), str(PUBLIC_AUDIO_PATH)], check=True)
    SRC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(MASTER_WAV_PATH), str(SRC_AUDIO_PATH)], check=True)
    print(f"Copied master audio to {PUBLIC_AUDIO_PATH} and {SRC_AUDIO_PATH}")

    # Print summary table
    print("\nBeat Durations:")
    total_beat_speech = 0.0
    for bw in beat_wavs:
        dur = get_audio_duration(bw)
        total_beat_speech += dur
        print(f"  {bw.stem}: {dur:.3f}s")
    print(f"  Speech Total: {total_beat_speech:.3f}s")
    print(f"  Silence Padding: 4 x 0.5s = 2.000s")
    print(f"  Master Total Duration: {master_dur:.3f}s")

if __name__ == "__main__":
    run_pipeline()
