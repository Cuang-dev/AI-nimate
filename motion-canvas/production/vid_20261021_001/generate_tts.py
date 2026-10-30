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
import difflib

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261021_001"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
BEAT_SHEET_PATH = WORK_DIR / "beat_sheet.json"

def get_api_key():
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        raise RuntimeError(".env file not found")
    for line in env_file.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("GEMINI_API_KEY not found in .env")

def check_quota():
    if not QUOTA_TRACKER.exists():
        raise RuntimeError("Quota tracker file does not exist")
    data = json.loads(QUOTA_TRACKER.read_text())
    rpd_used = data.get("tts_rpd_used_today", 0)
    print(f"Current tts_rpd_used_today: {rpd_used}")
    if rpd_used >= 10:
        raise RuntimeError(f"Quota exceeded: tts_rpd_used_today={rpd_used} >= 10")
    return data

def update_quota(model_name, prompt_tokens, total_tokens, status="success"):
    data = json.loads(QUOTA_TRACKER.read_text())
    data["tts_rpd_used_today"] = data.get("tts_rpd_used_today", 0) + 1
    data["tts_tokens_today"] = data.get("tts_tokens_today", 0) + total_tokens
    call_record = {
        "model": model_name,
        "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "prompt_tokens": prompt_tokens,
        "total_tokens": total_tokens,
        "status": status
    }
    if "calls" not in data:
        data["calls"] = []
    data["calls"].append(call_record)
    QUOTA_TRACKER.write_text(json.dumps(data, indent=2))
    print(f"Updated quota tracker. New tts_rpd_used_today: {data['tts_rpd_used_today']}")

def run_tts():
    quota_data = check_quota()
    api_key = get_api_key()

    script_data = json.loads(SCRIPT_PATH.read_text())
    full_transcript = script_data["full_transcript"].strip()

    prompt_text = f"Say in a dry, direct, slightly deadpan tone at a brisk pace: {full_transcript}"

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

    chosen_model = None
    response_json = None

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        print(f"Attempting TTS call with model: {model}...")
        try:
            with urllib.request.urlopen(req) as resp:
                response_json = json.loads(resp.read().decode("utf-8"))
                chosen_model = model
                print(f"TTS call succeeded with model: {model}")
                break
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"HTTPError {e.code} for model {model}: {err_body}")
            # Only fallback on 429/quota/404
            if e.code in (404, 429) or "quota" in err_body.lower() or "not found" in err_body.lower():
                print(f"Falling back from {model}...")
                continue
            else:
                # If non-quota error, retry once as permitted
                print("Non-quota error encountered. Retrying once...")
                try:
                    with urllib.request.urlopen(req) as resp:
                        response_json = json.loads(resp.read().decode("utf-8"))
                        chosen_model = model
                        break
                except Exception as e2:
                    raise RuntimeError(f"Retry failed: {e2}")

    if not response_json or not chosen_model:
        raise RuntimeError("Failed to generate content with available TTS models")

    # Extract usage metadata
    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)

    # Update quota tracker immediately
    update_quota(chosen_model, prompt_tokens, total_tokens, status="success")

    # Extract audio bytes
    candidates = response_json.get("candidates", [])
    if not candidates:
        raise RuntimeError(f"No candidates in response: {response_json}")

    parts = candidates[0].get("content", {}).get("parts", [])
    audio_data_b64 = None
    mime_type = "audio/pcm;rate=24000"

    for p in parts:
        if "inlineData" in p:
            audio_data_b64 = p["inlineData"].get("data")
            mime_type = p["inlineData"].get("mimeType", mime_type)
            break

    if not audio_data_b64:
        raise RuntimeError("No audio inlineData found in response")

    audio_bytes = base64.b64decode(audio_data_b64)
    print(f"Received {len(audio_bytes)} bytes of audio (mimeType: {mime_type})")

    # Save raw audio
    raw_path = WORK_DIR / "raw_audio.bin"
    raw_path.write_bytes(audio_bytes)

    wav_path = WORK_DIR / "narration.wav"
    mp3_path = WORK_DIR / "narration.mp3"

    # Check if raw audio has RIFF header
    if audio_bytes[:4] == b"RIFF":
        print("Detected WAV container directly from API")
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_path), str(wav_path)], check=True)
    else:
        print("Detected raw PCM s16le 24kHz mono; converting to WAV...")
        # Check rate from mime_type if available
        rate = "24000"
        if "rate=" in mime_type:
            rate_match = re.search(r"rate=(\d+)", mime_type)
            if rate_match:
                rate = rate_match.group(1)
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "s16le",
            "-ar", rate,
            "-ac", "1",
            "-i", str(raw_path),
            str(wav_path)
        ], check=True)

    # Convert to MP3
    subprocess.run(["ffmpeg", "-y", "-i", str(wav_path), str(mp3_path)], check=True)
    print(f"Saved {wav_path} and {mp3_path}")

    # Copy to motion-canvas/public/audio/ and motion-canvas/src/audio/
    public_audio_dir = REPO_ROOT / "motion-canvas/public/audio"
    src_audio_dir = REPO_ROOT / "motion-canvas/src/audio"
    public_audio_dir.mkdir(parents=True, exist_ok=True)
    src_audio_dir.mkdir(parents=True, exist_ok=True)

    dest_public = public_audio_dir / "vid_20261021_001.wav"
    dest_src = src_audio_dir / "vid_20261021_001.wav"

    subprocess.run(["cp", str(wav_path), str(dest_public)], check=True)
    subprocess.run(["cp", str(wav_path), str(dest_src)], check=True)
    print(f"Copied WAV to {dest_public} and {dest_src}")

    return chosen_model, prompt_tokens, total_tokens, wav_path

if __name__ == "__main__":
    model, prompt_tokens, total_tokens, wav_path = run_tts()
    print("TTS generation completed successfully.")
