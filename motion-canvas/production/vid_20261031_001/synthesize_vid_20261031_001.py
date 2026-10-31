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

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_001"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
TIMINGS_JSON_PATH = WORK_DIR / "timings.json"
TIMINGS_TS_PATH = REPO_ROOT / "motion-canvas/src/scenes/vid_20261031_001/timings.ts"
PUBLIC_AUDIO_PATH = REPO_ROOT / "motion-canvas/public/audio/vid_20261031_001/narration.wav"
SRC_AUDIO_PATH = REPO_ROOT / "motion-canvas/src/audio/vid_20261031_001.wav"

BEAT_WAVS = [
    WORK_DIR / "beat_01.wav",
    WORK_DIR / "beat_02.wav",
    WORK_DIR / "beat_03.wav",
    WORK_DIR / "beat_04.wav",
    WORK_DIR / "beat_05.wav",
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
    print(f"Updated quota tracker: date={data['date']}, rpd={data['tts_rpd_used_today']}, tokens={data['tts_tokens_today']}")

def synthesize_text_tts(prompt_text: str, out_wav_path: Path):
    api_key = get_api_key()
    print(f"Synthesizing text with Gemini TTS: {prompt_text[:100]}...")

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

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        print(f"Attempting TTS with model: {model}...")
        try:
            with urllib.request.urlopen(req) as resp:
                response_json = json.loads(resp.read().decode("utf-8"))
                chosen_model = model
                break
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8")
            print(f"HTTPError {e.code} for {model}: {err}")
            if e.code in (429, 403) and "quota" in err.lower():
                continue
            else:
                continue

    if not response_json:
        raise RuntimeError("All TTS models failed")

    usage = response_json.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", 0)
    total_tokens = usage.get("totalTokenCount", 0)
    print(f"TTS succeeded with {chosen_model}! Tokens: prompt={prompt_tokens}, total={total_tokens}")

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
    raw_path = WORK_DIR / "raw_beat_05.bin"
    raw_path.write_bytes(audio_bytes)
    initial_wav = WORK_DIR / "initial_beat_05.wav"

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

    # Convert to 48kHz normalized WAV at -16 LUFS with energetic cliffhanger tempo (10.78s)
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(initial_wav),
        "-filter:a", "atempo=1.21,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "48000",
        "-ac", "1",
        str(out_wav_path)
    ], check=True)

    dur = get_audio_duration(out_wav_path)
    print(f"Beat audio normalized to {dur}s at {out_wav_path}")
    return out_wav_path

def ensure_beats_1_to_4():
    """Ensure beat_01.wav through beat_04.wav exist, slicing from narration.wav if needed."""
    slice_windows = [
        (WORK_DIR / "beat_01.wav", 0.0, 20.75),
        (WORK_DIR / "beat_02.wav", 20.75, 39.46),
        (WORK_DIR / "beat_03.wav", 39.46, 61.72),
        (WORK_DIR / "beat_04.wav", 61.72, 77.72),
    ]
    narration_file = WORK_DIR / "narration.wav"
    for wav_file, start_s, end_s in slice_windows:
        if not wav_file.exists():
            print(f"Slicing {wav_file.name} ({start_s}s -> {end_s}s) from {narration_file}...")
            subprocess.run([
                "ffmpeg", "-y",
                "-ss", str(start_s),
                "-to", str(end_s),
                "-i", str(narration_file),
                str(wav_file)
            ], check=True)
        dur = get_audio_duration(wav_file)
        expected = round(end_s - start_s, 3)
        print(f"Cached {wav_file.name}: duration={dur}s (expected ~{expected}s)")

def run_tts():
    script_data = json.loads(SCRIPT_PATH.read_text())
    beats = script_data.get("beats", [])
    if not beats:
        raise RuntimeError("No beats found in script.json")

    # 1. Ensure beats 1-4 are cached
    ensure_beats_1_to_4()

    # 2. Get Beat 5 text and synthesize beat_05.wav
    beat_05_obj = next(b for b in beats if b.get("beat_id") == "beat_05")
    beat_05_text = beat_05_obj.get("tts_transcript") or beat_05_obj.get("spoken_text", "")
    beat_05_wav = WORK_DIR / "beat_05.wav"

    print(f"\n--- Synthesizing Beat 5 Cliffhanger ---")
    print(f"Text: {beat_05_text}")
    synthesize_text_tts(beat_05_text, beat_05_wav)
    b5_dur = get_audio_duration(beat_05_wav)
    print(f"Beat 5 duration: {b5_dur}s")

    # 3. Concatenate beat_01 through beat_05 into narration.wav
    final_wav = WORK_DIR / "narration.wav"
    print("\n--- Concatenating Beats 1-5 ---")
    concat_inputs = []
    filter_parts = []
    for i, bw in enumerate(BEAT_WAVS):
        concat_inputs.extend(["-i", str(bw)])
        filter_parts.append(f"[{i}:0]")
    filter_expr = f"{''.join(filter_parts)}concat=n={len(BEAT_WAVS)}:v=0:a=1[out]"

    cmd = ["ffmpeg", "-y"] + concat_inputs + [
        "-filter_complex", filter_expr,
        "-map", "[out]",
        "-ar", "48000",
        "-ac", "1",
        str(final_wav)
    ]
    subprocess.run(cmd, check=True)
    total_dur = get_audio_duration(final_wav)
    print(f"Total narration duration: {total_dur}s (Beats 1-4: 77.72s + Beat 5: {b5_dur}s)")

    # 4. Copy to public and src audio locations
    PUBLIC_AUDIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(final_wav), str(PUBLIC_AUDIO_PATH)], check=True)
    if SRC_AUDIO_PATH.parent.exists():
        subprocess.run(["cp", str(final_wav), str(SRC_AUDIO_PATH)], check=True)
    print(f"Copied audio to {PUBLIC_AUDIO_PATH} and {SRC_AUDIO_PATH}")

    return final_wav

if __name__ == "__main__":
    run_tts()
