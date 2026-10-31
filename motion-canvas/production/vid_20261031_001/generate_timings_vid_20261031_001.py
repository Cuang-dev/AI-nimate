import json
from pathlib import Path
import subprocess
import re
import sys

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
WORK_DIR = REPO_ROOT / "motion-canvas/production/vid_20261031_001"
WAV_PATH = WORK_DIR / "narration.wav"
RAW_TRANSCRIPTION_PATH = WORK_DIR / "raw_transcription.json"
TIMINGS_JSON_PATH = WORK_DIR / "timings.json"
TIMINGS_TS_PATH = REPO_ROOT / "motion-canvas/src/scenes/vid_20261031_001/timings.ts"
SCRIPT_JSON_PATH = WORK_DIR / "script.json"

def get_audio_duration(wav_file):
    res = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(wav_file)
    ], capture_output=True, text=True, check=True)
    return round(float(res.stdout.strip()), 3)

def transcribe_audio():
    # If cached raw transcription exists, use it
    if RAW_TRANSCRIPTION_PATH.exists():
        print(f"Loading cached transcription from {RAW_TRANSCRIPTION_PATH}...")
        return json.loads(RAW_TRANSCRIPTION_PATH.read_text())

    try:
        from faster_whisper import WhisperModel
        print(f"Loading faster-whisper on {WAV_PATH}...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(str(WAV_PATH), word_timestamps=True, language="id")
        raw_words = []
        for s in segments:
            for w in s.words:
                w_text = w.word.strip()
                if w_text:
                    raw_words.append({
                        "w": w_text,
                        "start": float(round(w.start, 3)),
                        "end": float(round(w.end, 3))
                    })
        RAW_TRANSCRIPTION_PATH.write_text(json.dumps(raw_words, indent=2))
        return raw_words
    except Exception as e:
        print(f"Direct whisper failed: {e}. Trying uv run...")
        cmd = [
            "/home/agent/.local/bin/uv", "run", "--python", "3.12",
            "--with", "faster-whisper", "--with", "av<14",
            "python3", "-c",
            f'''
from faster_whisper import WhisperModel
import json
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("{WAV_PATH}", word_timestamps=True, language="id")
words = []
for s in segments:
    for w in s.words:
        txt = w.word.strip()
        if txt:
            words.append({{"w": txt, "start": float(round(w.start, 3)), "end": float(round(w.end, 3))}})
with open("{RAW_TRANSCRIPTION_PATH}", "w") as f:
    json.dump(words, f, indent=2)
'''
        ]
        subprocess.run(cmd, check=True)
        return json.loads(RAW_TRANSCRIPTION_PATH.read_text())

def normalize_words(raw_words):
    fixed = []
    i = 0
    n = len(raw_words)

    while i < n:
        w = dict(raw_words[i])
        txt = w["w"]

        # 4-word replacement: di Jualbeba Skwar Gabyasa. -> dijual bebas ke warga biasa.
        if i + 3 < n:
            w1 = raw_words[i+1]["w"]
            w2 = raw_words[i+2]["w"]
            w3 = raw_words[i+3]["w"]
            if txt.lower() == "di" and "jualbeba" in w1.lower() and "skwar" in w2.lower():
                t_st = w["start"]
                t_en = raw_words[i+3]["end"]
                fixed.append({"w": "dijual", "start": t_st, "end": raw_words[i+1]["end"]})
                fixed.append({"w": "bebas", "start": raw_words[i+2]["start"], "end": raw_words[i+2]["end"]})
                fixed.append({"w": "ke", "start": raw_words[i+3]["start"], "end": round(raw_words[i+3]["start"] + 0.15, 3)})
                fixed.append({"w": "warga", "start": round(raw_words[i+3]["start"] + 0.15, 3), "end": round(t_en - 0.20, 3)})
                fixed.append({"w": "biasa.", "start": round(t_en - 0.20, 3), "end": t_en})
                i += 4
                continue

        # 2-word merges / replacements
        if i + 1 < n:
            w_next = raw_words[i+1]
            t_next = w_next["w"]

            if txt == "tiba" and t_next == "-tiba":
                fixed.append({"w": "tiba-tiba", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "berkali" and t_next == "-kali":
                fixed.append({"w": "berkali-kali", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "berhari" and t_next.startswith("-hari"):
                fixed.append({"w": "berhari-hari,", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "8" and t_next == "%":
                fixed.append({"w": "8%", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "97" and t_next == "%":
                fixed.append({"w": "97%", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "3" and t_next == "%":
                fixed.append({"w": "3%", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "15" and t_next == "%":
                fixed.append({"w": "15%", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "di" and t_next == "kunci":
                fixed.append({"w": "dikunci", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "bang" and "bsa" in t_next.lower():
                fixed.append({"w": "Bank", "start": w["start"], "end": w["end"]})
                fixed.append({"w": "BCA.", "start": w_next["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "raksa" and t_next == "dan":
                fixed.append({"w": "reksa", "start": w["start"], "end": w["end"]})
                fixed.append({"w": "dana", "start": w_next["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "milik" and t_next == "-bule":
                fixed.append({"w": "milik", "start": w["start"], "end": w["end"]})
                fixed.append({"w": "bule", "start": w_next["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "diboy" and t_next == "kut":
                fixed.append({"w": "diboikot", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "buru" and "seeffek" in t_next.lower():
                fixed.append({"w": "Bursa", "start": w["start"], "end": w["end"]})
                fixed.append({"w": "Efek", "start": w_next["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "uang" and t_next == "-mu":
                fixed.append({"w": "uangmu", "start": w["start"], "end": w_next["end"]})
                i += 2
                continue
            if txt == "3500" and t_next.startswith("rupiah"):
                t_st = w["start"]
                t_en = w_next["end"]
                step = (t_en - t_st) / 5.0
                fixed.append({"w": "seribu", "start": round(t_st, 3), "end": round(t_st + step, 3)})
                fixed.append({"w": "lima", "start": round(t_st + step, 3), "end": round(t_st + step * 2, 3)})
                fixed.append({"w": "ratus", "start": round(t_st + step * 2, 3), "end": round(t_st + step * 3, 3)})
                fixed.append({"w": "triliun", "start": round(t_st + step * 3, 3), "end": round(t_st + step * 4, 3)})
                fixed.append({"w": "rupiah,", "start": round(t_st + step * 4, 3), "end": t_en})
                i += 2
                continue

        # Single-word corrections
        if txt == "kemumikir?":
            mid = (w["start"] + w["end"]) / 2
            fixed.append({"w": "kamu", "start": w["start"], "end": round(mid, 3)})
            fixed.append({"w": "mikir?", "start": round(mid, 3), "end": w["end"]})
            i += 1
            continue
        if txt == "gak":
            w["w"] = "nggak"
        elif txt == "burusan":
            w["w"] = "bursa"
        elif txt == "anjulok":
            w["w"] = "anjlok"
        elif txt == "dibegukan":
            w["w"] = "dibekukan"
        elif txt == "legal":
            w["w"] = "liga"
        elif txt == "kekasta":
            mid = (w["start"] + w["end"]) / 2
            fixed.append({"w": "ke", "start": w["start"], "end": round(mid, 3)})
            fixed.append({"w": "kasta", "start": round(mid, 3), "end": w["end"]})
            i += 1
            continue
        elif txt == "terandah,":
            w["w"] = "terendah,"
        elif txt == "Akhir":
            w["w"] = "Akar"
        elif txt == "langkah":
            w["w"] = "langka"
        elif txt == "Goreng":
            w["w"] = "goreng"
        elif txt == "Naik":
            w["w"] = "naik"
        elif txt == "Tampak":
            w["w"] = "Tanpa"
        elif txt == "bahwa":
            w["w"] = "bawah"
        elif txt == "berbedar":
            w["w"] = "beredar"
        elif txt == "siapapunnya":
            dur = w["end"] - w["start"]
            s1 = w["start"] + dur / 3.0
            s2 = w["start"] + dur * 2.0 / 3.0
            fixed.append({"w": "siapa", "start": w["start"], "end": round(s1, 3)})
            fixed.append({"w": "pun", "start": round(s1, 3), "end": round(s2, 3)})
            fixed.append({"w": "yang", "start": round(s2, 3), "end": w["end"]})
            i += 1
            continue
        elif txt == "Plajarnya":
            w["w"] = "Pelajarannya"

        fixed.append(w)
        i += 1

    return fixed

def generate():
    total_dur = get_audio_duration(WAV_PATH)
    print(f"Processing audio {WAV_PATH} (duration: {total_dur}s)...")
    raw_words = transcribe_audio()
    print(f"Raw words transcribed: {len(raw_words)}")

    fixed_words = normalize_words(raw_words)
    print(f"Normalized words: {len(fixed_words)}")

    # Exact scene boundaries based on speech pauses
    # Beat 1 ends at 20.30s, Beat 2 starts at 21.20s -> midpoint 20.75s
    # Beat 2 ends at 39.46s, Beat 3 starts at 39.46s -> midpoint 39.46s
    # Beat 3 ends at 61.12s, Beat 4 starts at 62.32s -> midpoint 61.72s
    # Beat 4 ends at 77.36s, Beat 5 starts at 78.08s -> midpoint 77.72s
    # Beat 5 ends at total_dur (106.92s)
    scenes = [
        {"id": "beat_01", "start": 0.0, "end": 20.75, "duration": 20.75},
        {"id": "beat_02", "start": 20.75, "end": 39.46, "duration": 18.71},
        {"id": "beat_03", "start": 39.46, "end": 61.72, "duration": 22.26},
        {"id": "beat_04", "start": 61.72, "end": 77.72, "duration": 16.00},
        {"id": "beat_05", "start": 77.72, "end": total_dur, "duration": round(total_dur - 77.72, 3)},
    ]

    beats = [
        {"beat_id": sc["id"], "start": sc["start"], "end": sc["end"], "duration": sc["duration"]}
        for sc in scenes
    ]

    # Partition words strictly by scene
    scene_words = [[] for _ in scenes]
    for w in fixed_words:
        mid = (w["start"] + w["end"]) / 2.0
        for s_idx, sc in enumerate(scenes):
            matched = (sc["start"] <= mid <= sc["end"] + 1.0) if s_idx == len(scenes) - 1 else (sc["start"] <= mid < sc["end"])
            if matched:
                cw = dict(w)
                cw["start"] = round(max(cw["start"], sc["start"]), 3)
                cw["end"] = round(min(cw["end"], sc["end"] - 0.04), 3)
                scene_words[s_idx].append(cw)
                break

    all_clamped_words = []
    for sw in scene_words:
        all_clamped_words.extend(sw)

    # Slice into subtitle chunks:
    # at most 4 words, at most 25 characters total,
    # breaking on sentence punctuation ('.', '?', '!', ',') or gap > 0.30s
    all_chunks = []
    for s_idx, sw_list in enumerate(scene_words):
        curr_chunk_words = []
        for w in sw_list:
            if not curr_chunk_words:
                curr_chunk_words.append(w)
                continue
            prev_w = curr_chunk_words[-1]
            prev_has_punct = prev_w["w"].rstrip().endswith((".", "?", "!", ","))
            gap = round(w["start"] - prev_w["end"], 4)
            has_gap = gap > 0.30
            exceeds_word_count = (len(curr_chunk_words) + 1 > 4)
            candidate_text = " ".join([x["w"] for x in curr_chunk_words] + [w["w"]])
            exceeds_char_limit = (len(candidate_text) > 25)

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

    # Validate chunks
    violations = 0
    for i, c in enumerate(all_chunks):
        if len(c["words"]) > 4:
            print(f"Violation: Chunk {i} has > 4 words ({len(c['words'])}): {c['text']}")
            violations += 1
        if len(c["text"]) > 25:
            print(f"Violation: Chunk {i} has > 25 chars ({len(c['text'])}): {c['text']}")
            violations += 1
        if c["end"] < c["start"]:
            print(f"Violation: Chunk {i} negative duration: {c}")
            violations += 1

    if violations > 0:
        raise RuntimeError(f"Chunk validation failed with {violations} violations")

    print(f"Validation passed: {len(all_chunks)} chunks, 0 violations!")

    timings_data = {
        "duration_seconds": total_dur,
        "scenes": scenes,
        "beats": beats,
        "words": all_clamped_words,
        "subtitle_chunks": all_chunks
    }

    TIMINGS_JSON_PATH.write_text(json.dumps(timings_data, indent=2, ensure_ascii=False))
    print(f"Wrote timings.json to {TIMINGS_JSON_PATH}")

    # Write timings.ts
    timings_ts_content = f"""import {{ useThread, waitFor }} from '@motion-canvas/core';
import rawTimings from '../../../production/vid_20261031_001/timings.json';

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
    TIMINGS_TS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TIMINGS_TS_PATH.write_text(timings_ts_content)
    print(f"Wrote timings.ts to {TIMINGS_TS_PATH}")

    # Visual cue to acoustic word timestamp lookup table
    print_visual_cue_lookup(timings_data)

def find_phrase_timestamp(words, phrase, beat_start, beat_end):
    # Number & percentage phrase aliases
    clean_p = phrase.lower()
    clean_p = clean_p.replace("sembilan puluh tujuh persen", "97%")
    clean_p = clean_p.replace("delapan persen", "8%")
    clean_p = clean_p.replace("tiga persen", "3%")
    clean_p = clean_p.replace("lima belas persen", "15%")
    clean_p = clean_p.replace("satu persen", "1%")
    clean_p = clean_p.replace("lima ratus", "500")
    clean_p = re.sub(r"[^\w\s%]", "", clean_p).strip()
    p_tokens = clean_p.split()
    if not p_tokens:
        return beat_start

    # Filter words in beat window
    bw = [w for w in words if w["start"] >= beat_start - 0.2 and w["end"] <= beat_end + 0.5]
    if not bw:
        bw = words

    # Try matching first 2-3 tokens
    match_len = min(len(p_tokens), 3)
    target_start_prefix = p_tokens[:match_len]

    for idx in range(len(bw) - match_len + 1):
        window = [re.sub(r"[^\w%]", "", bw[idx + k]["w"].lower()) for k in range(match_len)]
        if window == target_start_prefix:
            return bw[idx]["start"]

    # Try 2 tokens
    if len(p_tokens) >= 2:
        target_pair = p_tokens[:2]
        for idx in range(len(bw) - 1):
            window = [re.sub(r"[^\w%]", "", bw[idx + k]["w"].lower()) for k in range(2)]
            if window == target_pair:
                return bw[idx]["start"]

    # Try matching any significant token (length >= 4) from the phrase
    for tok in p_tokens:
        if len(tok) >= 4 or tok in ("8%", "97%", "3%", "15%", "1%", "500"):
            for w in bw:
                cleaned_w = re.sub(r"[^\w%]", "", w["w"].lower())
                if cleaned_w == tok:
                    return w["start"]

    return beat_start

def print_visual_cue_lookup(timings_data=None):
    if timings_data is None:
        if TIMINGS_JSON_PATH.exists():
            timings_data = json.loads(TIMINGS_JSON_PATH.read_text())
        else:
            print("No timings data available for lookup table.")
            return

    if not SCRIPT_JSON_PATH.exists():
        print(f"No script.json found at {SCRIPT_JSON_PATH}")
        return

    # Validate chunk compliance
    chunks = timings_data.get("subtitle_chunks", [])
    violations = 0
    for i, c in enumerate(chunks):
        if len(c.get("words", [])) > 4:
            print(f"Violation: Chunk {i} has > 4 words ({len(c['words'])}): {c['text']}")
            violations += 1
        if len(c.get("text", "")) > 25:
            print(f"Violation: Chunk {i} has > 25 chars ({len(c['text'])}): {c['text']}")
            violations += 1
    if violations > 0:
        print(f"WARNING: timings.json has {violations} chunk violations!")
    else:
        print(f"Subtitle chunk validation: 0 violations across {len(chunks)} chunks (<= 4 words, <= 25 chars).")

    script = json.loads(SCRIPT_JSON_PATH.read_text())
    scenes = timings_data.get("scenes", [])
    scene_map = {s["id"]: s for s in scenes}
    all_words = timings_data.get("words", [])

    print("\n" + "=" * 96)
    print("AUTOMATIC VISUAL CUE TO ACOUSTIC WORD TIMESTAMP LOOKUP TABLE")
    print("=" * 96)

    for beat in script.get("beats", []):
        bid = beat.get("beat_id", "")
        title = beat.get("title", "")
        archetype = beat.get("diagram_archetype", "Custom Archetype")
        sc = scene_map.get(bid, {"start": 0.0, "end": 0.0, "duration": 0.0})
        b_start = sc["start"]
        b_end = sc["end"]
        b_dur = sc.get("duration", round(b_end - b_start, 2))

        print(f"\nBeat: {bid} ({title})")
        print(f"  * Archetype: {archetype}")
        print(f"  * Window:    start={b_start:.2f}s, end={b_end:.2f}s (duration: {b_dur:.2f}s)")
        print("-" * 96)
        print(f"{'Target Element':<30} | {'Action':<15} | {'t_abs':<7} | {'t_rel':<7} | {'Matched Phrase'}")
        print("-" * 96)

        for cue in beat.get("visual_cues", []):
            target = cue.get("target", "")[:30]
            action = cue.get("action", "")[:15]
            phrase = cue.get("phrase", "")
            t_abs = find_phrase_timestamp(all_words, phrase, b_start, b_end)
            t_rel = round(max(0.0, t_abs - b_start), 2)
            print(f"{target:<30} | {action:<15} | {t_abs:5.2f}s | +{t_rel:4.2f}s | {phrase}")

    print("\n" + "=" * 96 + "\n")

if __name__ == "__main__":
    if "--lookup" in sys.argv or "--lookup-only" in sys.argv:
        print_visual_cue_lookup()
    else:
        generate()
