import json
import re
import subprocess
from pathlib import Path
from faster_whisper import WhisperModel
import difflib

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261021_001"
BEAT_SHEET_PATH = WORK_DIR / "beat_sheet.json"
WAV_PATH = WORK_DIR / "narration.wav"
TIMINGS_PATH = WORK_DIR / "timings.json"

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

def align():
    duration = get_audio_duration(WAV_PATH)
    print(f"Audio duration: {duration}s")

    print("Loading faster-whisper model (base)...")
    model = WhisperModel("base", device="cpu", compute_type="int8")

    print("Transcribing with word timestamps...")
    segments, info = model.transcribe(str(WAV_PATH), word_timestamps=True, language="en")

    words = []
    for segment in segments:
        for w in segment.words:
            clean_w = w.word.strip()
            if not clean_w:
                continue
            words.append({
                "w": clean_w,
                "start": round(w.start, 3),
                "end": round(w.end, 3)
            })

    print(f"Total transcribed words: {len(words)}")

    # Load beats
    beats_data = json.loads(BEAT_SHEET_PATH.read_text())
    
    # We want to find start and end timestamps for each beat in beat_sheet.json
    # Beat texts:
    beat_texts = [b["spoken_text"] for b in beats_data]
    
    # Extract clean tokens for each beat
    beat_tokens = [
        [clean_word(token) for token in re.findall(r"[\w$]+", text) if clean_word(token)]
        for text in beat_texts
    ]

    whisper_clean_tokens = [clean_word(w["w"]) for w in words]

    # Map words to beats sequentially
    # We find boundary words between beats
    # Anchors:
    # Beat 1 ends with "one"
    # Beat 2 ends with "orders"
    # Beat 3 ends with "waste"
    # Beat 4 ends with "entirely"
    # Beat 5 ends with "badge"
    
    curr_idx = 0
    beat_timings = []

    for b_idx, beat in enumerate(beats_data):
        tokens = beat_tokens[b_idx]
        b_id = beat["beat_id"]
        start_word_idx = curr_idx

        # Target end token for this beat
        target_end_token = tokens[-1]

        # Scan ahead to find target_end_token
        # It should appear around len(tokens) from start_word_idx
        found_end_idx = None
        search_range_start = max(curr_idx + len(tokens) - 8, curr_idx)
        search_range_end = min(curr_idx + len(tokens) + 12, len(words))

        for j in range(search_range_start, search_range_end):
            if whisper_clean_tokens[j] == target_end_token:
                found_end_idx = j
                break

        # Fallback if not found in narrow window
        if found_end_idx is None:
            for j in range(curr_idx, min(curr_idx + len(tokens) + 20, len(words))):
                if whisper_clean_tokens[j] == target_end_token:
                    found_end_idx = j
                    break

        if found_end_idx is None:
            found_end_idx = min(curr_idx + len(tokens) - 1, len(words) - 1)

        b_start = words[start_word_idx]["start"] if words else 0.0
        b_end = words[found_end_idx]["end"] if words else duration

        beat_timings.append({
            "beat_id": b_id,
            "start": b_start,
            "end": b_end
        })

        curr_idx = found_end_idx + 1

    # Adjust edges cleanly:
    # Beat 1 start should align with beginning of audio
    if beat_timings:
        beat_timings[0]["start"] = min(beat_timings[0]["start"], words[0]["start"] if words else 0.0)
        # Last beat end should encompass last word
        beat_timings[-1]["end"] = max(beat_timings[-1]["end"], words[-1]["end"] if words else duration)

    timings_output = {
        "duration_seconds": duration,
        "words": words,
        "beats": beat_timings
    }

    TIMINGS_PATH.write_text(json.dumps(timings_output, indent=2))
    print(f"Wrote timings to {TIMINGS_PATH}")
    for b in beat_timings:
        print(f"  {b['beat_id']}: {b['start']}s -> {b['end']}s")

    return timings_output

if __name__ == "__main__":
    align()
