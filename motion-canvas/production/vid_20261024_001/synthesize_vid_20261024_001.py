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
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261024_001"
LOGS_DIR = REPO_ROOT / "logs"
QUOTA_TRACKER = LOGS_DIR / "tts_quota_tracker.json"
SCRIPT_PATH = WORK_DIR / "script.json"
BEAT_SHEET_PATH = WORK_DIR / "beat_sheet.json"
TIMINGS_TS_DIR = REPO_ROOT / "motion-canvas/src/scenes/vid_20261024_001"
TIMINGS_TS_PATH = TIMINGS_TS_DIR / "timings.ts"

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

def normalize_phonetic_words(words):
    # Mapping table for phonetic tokens to clean display words
    # e.g. normalizing phonetic tokens like:
    # Yoo-sits -> UCITS
    # B.C.A. -> BCA
    # I.D.X. -> IDX
    # U.U. H.P.P. -> UU HPP
    # W. Eight Ben -> W-8BEN
    # P.P.H. -> PPh
    # I.R.S. -> IRS
    # C.S.P.X. -> CSPX
    # V.W.R.A. -> VWRA
    # P.M.K. -> PMK
    # S.B.N. -> SBN
    # B.V.I. -> BVI
    # C.R.S. -> CRS
    # D.J.P. -> DJP
    # S.P.T. -> SPT
    # E.T.F.s -> ETFs
    # re-invest -> reinvest
    
    normalized = []
    i = 0
    n = len(words)
    
    while i < n:
        w_obj = dict(words[i])
        raw_w = w_obj["w"]
        c_w = clean_word(raw_w)
        
        # Check 3-word combinations first
        if i + 2 < n:
            c3 = f"{clean_word(words[i]['w'])} {clean_word(words[i+1]['w'])} {clean_word(words[i+2]['w'])}"
            if c3 in ("w eight ben", "w 8 ben"):
                merged = {
                    "w": "W-8BEN",
                    "start": words[i]["start"],
                    "end": words[i+2]["end"]
                }
                normalized.append(merged)
                i += 3
                continue
            if c3 in ("uu hpp law", "u u hpp"):
                merged = {
                    "w": "UU HPP",
                    "start": words[i]["start"],
                    "end": words[i+2]["end"]
                }
                normalized.append(merged)
                i += 3
                continue
                
        # Check 2-word combinations
        if i + 1 < n:
            c2 = f"{clean_word(words[i]['w'])} {clean_word(words[i+1]['w'])}"
            if c2 in ("s and", "sand") and clean_word(words[i+2]['w'] if i+2 < n else "") == "p":
                pass # handled below
            if c2 == "uu hpp":
                merged = {
                    "w": "UU HPP",
                    "start": words[i]["start"],
                    "end": words[i+1]["end"]
                }
                normalized.append(merged)
                i += 2
                continue
            if c2 == "yoo sits":
                merged = {
                    "w": "UCITS",
                    "start": words[i]["start"],
                    "end": words[i+1]["end"]
                }
                normalized.append(merged)
                i += 2
                continue
            if c2 in ("tee mobile", "t mobile"):
                merged = {
                    "w": "T-Mobile",
                    "start": words[i]["start"],
                    "end": words[i+1]["end"]
                }
                normalized.append(merged)
                i += 2
                continue
                
        # Single-word replacements
        replacements = {
            "yoosits": "UCITS",
            "yoosit": "UCITS",
            "ucits": "UCITS",
            "bca": "BCA",
            "idx": "IDX",
            "hpp": "HPP",
            "pph": "PPh",
            "irs": "IRS",
            "cspx": "CSPX",
            "vwra": "VWRA",
            "pmk": "PMK",
            "sbn": "SBN",
            "bvi": "BVI",
            "crs": "CRS",
            "djp": "DJP",
            "spt": "SPT",
            "etfs": "ETFs",
            "etf": "ETF",
            "reinvest": "reinvest",
            "reeinvest": "reinvest",
            "reesell": "resell",
            "eewaste": "e-waste",
            "ewaste": "e-waste",
            "hp": "HP",
        }
        
        # Punctuation check
        trailing_punct = ""
        if raw_w and raw_w[-1] in (",", ".", "?", "!", ":", ";"):
            trailing_punct = raw_w[-1]
            
        if c_w in replacements:
            w_obj["w"] = replacements[c_w] + trailing_punct
        elif "w-8ben" in c_w:
            w_obj["w"] = "W-8BEN" + trailing_punct
            
        normalized.append(w_obj)
        i += 1
        
    return normalized

def generate_subtitle_chunks(words, max_chars=26, min_words=2, max_words=5):
    chunks = []
    i = 0
    n = len(words)
    
    while i < n:
        best_count = 1
        for count in range(1, min(max_words, n - i) + 1):
            subset = words[i:i+count]
            text = " ".join(w["w"] for w in subset)
            if len(text) <= max_chars:
                best_count = count
            else:
                break
                
        chunk_words = words[i:i+best_count]
        text = " ".join(w["w"] for w in chunk_words)
        chunk = {
            "text": text,
            "start": chunk_words[0]["start"],
            "end": chunk_words[-1]["end"],
            "duration": round(chunk_words[-1]["end"] - chunk_words[0]["start"], 3),
            "words": chunk_words
        }
        chunks.append(chunk)
        i += best_count
        
    return chunks

def main():
    api_key = get_api_key()
    script_data = json.loads(SCRIPT_PATH.read_text())
    
    tts_style_prompt = script_data.get("tts_style_prompt", "").strip()
    tts_transcript = script_data.get("tts_transcript", "").strip()
    
    if not tts_transcript:
        raise RuntimeError("tts_transcript not found in script.json")

    # Combine style prompt + \n\n + transcript as instructed
    if tts_style_prompt:
        prompt_text = f"{tts_style_prompt}\n\n{tts_transcript}"
    else:
        prompt_text = tts_transcript

    print("Full prompt to Gemini TTS:")
    print(prompt_text[:140] + "... [truncated]\n")

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
    raw_path = WORK_DIR / "raw_initial.bin"
    raw_path.write_bytes(audio_bytes)
    initial_wav = WORK_DIR / "initial_audio.wav"

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

    first_words_text = [clean_word(w.word) for w in init_words[:35]]
    print(f"First 35 recognized words: {first_words_text}")

    final_wav = WORK_DIR / "narration.wav"
    mp3_path = WORK_DIR / "narration.mp3"

    # Find where the script starts: "sell", "one", "billion"
    cut_time = 0.0
    for idx in range(len(init_words) - 2):
        w0 = clean_word(init_words[idx].word)
        w1 = clean_word(init_words[idx+1].word)
        w2 = clean_word(init_words[idx+2].word)
        if w0 == "sell" and w1 in ("one", "1") and w2 == "billion":
            if idx > 0:
                prev_clean = [clean_word(pw.word) for pw in init_words[:idx]]
                if any(k in prev_clean for k in ["speak", "sharp", "charismatic", "fintech", "wealth", "strategist", "plain", "bagel", "fireship", "breaking", "down", "rules"]):
                    prev_end = init_words[idx - 1].end
                    sell_start = init_words[idx].start
                    cut_time = round(max(prev_end + 0.05, sell_start - 0.2), 2)
                    print(f"Detected spoken style prompt intro! Trimming at {cut_time}s (prev_end={prev_end}, sell_start={sell_start})")
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
    pub_wav = REPO_ROOT / "motion-canvas/public/audio/vid_20261024_001.wav"
    src_wav = REPO_ROOT / "motion-canvas/src/audio/vid_20261024_001.wav"
    pub_wav.parent.mkdir(parents=True, exist_ok=True)
    src_wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", str(final_wav), str(pub_wav)], check=True)
    subprocess.run(["cp", str(final_wav), str(src_wav)], check=True)

    final_duration = get_audio_duration(final_wav)
    print(f"Final audio duration: {final_duration}s")

    # Transcribe final clean narration.wav for exact timings
    print("Transcribing final clean narration.wav with word timestamps...")
    segments, _ = whisper_model.transcribe(str(final_wav), word_timestamps=True, language="en")
    
    raw_words = []
    for s in segments:
        for w in s.words:
            clean_w = w.word.strip()
            if not clean_w:
                continue
            raw_words.append({
                "w": clean_w,
                "start": round(w.start, 3),
                "end": round(w.end, 3)
            })

    print(f"Total raw transcribed words: {len(raw_words)}")
    
    # Normalize phonetic tokens
    words = normalize_phonetic_words(raw_words)

    whisper_full_text = " ".join([w["w"] for w in words])
    print("\n--- WHISPER FULL TRANSCRIPT ---")
    print(whisper_full_text)
    print("-------------------------------\n")

    # Verification checks for all key numbers and terms:
    # 0.1%, 35%, 350, 15%, $60,000, 40%, 100%, 200%, 3 years
    # AI Pin / IDX, T-Mobile / BCA, HP / W-8BEN, UCITS, etc.
    num_checks = {
        "0.1%": any(k in whisper_full_text.lower() for k in ["0.1%", "0.1 percent", "zero point one"]),
        "35%": any(k in whisper_full_text.lower() for k in ["35%", "35 percent", "thirty-five percent", "thirty five percent"]),
        "350": any(k in whisper_full_text.lower() for k in ["350", "three hundred and fifty", "three hundred fifty"]),
        "15%": any(k in whisper_full_text.lower() for k in ["15%", "15 percent", "fifteen percent"]),
        "$60,000": any(k in whisper_full_text.lower() for k in ["$60,000", "60,000", "sixty thousand"]),
        "40%": any(k in whisper_full_text.lower() for k in ["40%", "40 percent", "forty percent"]),
        "100%": any(k in whisper_full_text.lower() for k in ["100%", "100 percent", "one hundred percent"]),
        "200%": any(k in whisper_full_text.lower() for k in ["200%", "200 percent", "two hundred percent"]),
        "3 years": any(k in whisper_full_text.lower() for k in ["3 years", "three years", "three consecutive years"]),
    }
    print("Number Pronunciation Verification:")
    all_passed = True
    for k, v in num_checks.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")
        if not v:
            all_passed = False

    # Generate subtitle chunks (max <= 26 chars, 2-5 words)
    subtitle_chunks = generate_subtitle_chunks(words, max_chars=26, min_words=2, max_words=5)
    print(f"Generated {len(subtitle_chunks)} subtitle chunks.")
    print("Sample subtitle chunks:")
    for sc in subtitle_chunks[:5]:
        print(f"  [{sc['start']}s -> {sc['end']}s] ({len(sc['text'])} chars): {sc['text']}")

    # Map to 6 beats
    # Anchors:
    # Beat 1 ends with "shock"
    # Beat 2 ends with "us" / "u.s."
    # Beat 3 ends with "events"
    # Beat 4 ends with "zero"
    # Beat 5 ends with "percent"
    # Beat 6 ends with "gains"
    beats_data = json.loads(BEAT_SHEET_PATH.read_text())
    anchor_ends = ["shock", "us", "events", "zero", "percent", "gains"]
    
    whisper_clean_tokens = [clean_word(w["w"]) for w in words]
    curr_idx = 0
    beat_timings = []

    for b_idx, beat in enumerate(beats_data):
        b_id = beat["beat_id"]
        start_word_idx = curr_idx
        target_end_token = anchor_ends[b_idx]

        found_end_idx = None
        for j in range(curr_idx + 10, len(words)):
            c_tok = whisper_clean_tokens[j]
            if c_tok == target_end_token or (target_end_token == "us" and c_tok in ("us", "states")):
                found_end_idx = j
                break

        if found_end_idx is None:
            # Fallback search
            for j in range(curr_idx, min(curr_idx + 80, len(words))):
                c_tok = whisper_clean_tokens[j]
                if c_tok == target_end_token or (target_end_token == "us" and c_tok in ("us", "states")):
                    found_end_idx = j
                    break

        if found_end_idx is None:
            found_end_idx = min(curr_idx + 35, len(words) - 1)

        b_start = words[start_word_idx]["start"] if words else 0.0
        b_end = words[found_end_idx]["end"] if words else final_duration

        beat_timings.append({
            "beat_id": b_id,
            "start": b_start,
            "end": b_end,
            "duration": round(b_end - b_start, 3)
        })
        curr_idx = found_end_idx + 1

    if beat_timings:
        beat_timings[0]["start"] = min(beat_timings[0]["start"], words[0]["start"] if words else 0.0)
        beat_timings[-1]["end"] = max(beat_timings[-1]["end"], words[-1]["end"] if words else final_duration)

    # Calculate scenes for timings.ts (partitioning [0.0, final_duration])
    scenes = []
    b_starts = [b["start"] for b in beat_timings]
    starts = [0.0] + b_starts[1:]
    ends = b_starts[1:] + [final_duration]

    for i in range(len(beat_timings)):
        s_start = round(starts[i], 2)
        s_end = round(ends[i], 2)
        s_dur = round(s_end - s_start, 2)
        scenes.append({
            "id": f"beat_0{i+1}",
            "start": s_start,
            "end": s_end,
            "duration": s_dur
        })

    timings_output = {
        "duration_seconds": final_duration,
        "words": words,
        "beats": beat_timings,
        "scenes": scenes,
        "subtitle_chunks": subtitle_chunks
    }

    timings_json_path = WORK_DIR / "timings.json"
    timings_json_path.write_text(json.dumps(timings_output, indent=2))
    print(f"\nWrote {timings_json_path}. Beats:")
    for b in beat_timings:
        print(f"  {b['beat_id']}: {b['start']}s -> {b['end']}s (duration: {b['duration']}s)")

    print("\nScenes:")
    for s in scenes:
        print(f"  {s['id']}: start={s['start']}, end={s['end']}, duration={s['duration']}")

    # Write timings.ts
    TIMINGS_TS_DIR.mkdir(parents=True, exist_ok=True)
    
    scenes_ts_entries = ",\n".join(
        f"    {{ id: '{s['id']}', start: {s['start']}, end: {s['end']}, duration: {s['duration']} }}"
        for s in scenes
    )
    
    timings_ts_content = f"""import {{ useTime, waitFor }} from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261024_001/timings.json';

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
  scenes: [
{scenes_ts_entries},
  ],
}};

export function* waitUntilSceneTime(targetSceneTime: number) {{
  const current = useTime();
  const delta = targetSceneTime - current;
  if (delta > 0) {{
    yield* waitFor(delta);
  }}
}}

export function* finishSceneAt(targetDuration: number) {{
  const current = useTime();
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
"""
    TIMINGS_TS_PATH.write_text(timings_ts_content)
    print(f"\nWrote {TIMINGS_TS_PATH}")

    # Clean intermediate files
    raw_path.unlink(missing_ok=True)
    initial_wav.unlink(missing_ok=True)
    print("Cleaned temporary raw files.")

if __name__ == "__main__":
    main()
