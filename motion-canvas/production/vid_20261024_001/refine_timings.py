import json
import re
from pathlib import Path

repo_root = Path("/home/agent/orca/AI-nimate")
work_dir = repo_root / "motion-canvas/production/vid_20261024_001"
timings_json_path = work_dir / "timings.json"
timings_ts_path = repo_root / "motion-canvas/src/scenes/vid_20261024_001/timings.ts"

data = json.loads(timings_json_path.read_text())
raw_words = data["words"]
duration = data["duration_seconds"]

# Normalize words and merge split tokens
merged_words = []
i = 0
n = len(raw_words)

while i < n:
    w1 = raw_words[i]
    w1_text = w1["w"]
    
    # Check 3-word merges
    if i + 2 < n:
        w2 = raw_words[i+1]
        w3 = raw_words[i+2]
        c3 = f"{w1_text} {w2['w']} {w3['w']}".lower()
        if "w8 ben" in c3 or "w 8 ben" in c3:
            merged_words.append({
                "w": "W-8BEN",
                "start": w1["start"],
                "end": w3["end"]
            })
            i += 3
            continue
            
    # Check 2-word merges
    if i + 1 < n:
        w2 = raw_words[i+1]
        w2_text = w2["w"]
        
        # 0 .1% -> 0.1%
        if w1_text == "0" and w2_text.startswith(".1%"):
            merged_words.append({
                "w": "0.1%" + w2_text[4:],
                "start": w1["start"],
                "end": w2["end"]
            })
            i += 2
            continue
            
        # $60 ,000 -> $60,000
        if w1_text in ("$60", "60") and w2_text.startswith(",000"):
            merged_words.append({
                "w": "$60,000" + w2_text[5:],
                "start": w1["start"],
                "end": w2["end"]
            })
            i += 2
            continue
            
        # U .S. -> US
        if w1_text in ("U", "U.") and w2_text in (".S.", "S.", "S"):
            merged_words.append({
                "w": "US",
                "start": w1["start"],
                "end": w2["end"]
            })
            i += 2
            continue
            
        # number + %
        if re.match(r"^\d+$", w1_text) and w2_text.startswith("%"):
            merged_words.append({
                "w": f"{w1_text}%" + w2_text[1:],
                "start": w1["start"],
                "end": w2["end"]
            })
            i += 2
            continue

        # non -US -> non-US
        if w1_text.lower() == "non" and w2_text.lower() in ("-us", "us"):
            merged_words.append({
                "w": "non-US",
                "start": w1["start"],
                "end": w2["end"]
            })
            i += 2
            continue

    # Single word cleanup
    clean_w = w1_text
    clean_lower = clean_w.lower().rstrip(".,?!:")
    trailing = clean_w[len(clean_lower):]
    
    replace_map = {
        "rupee": "rupiah",
        "usit's": "UCITS",
        "usit": "UCITS",
        "usits": "UCITS",
        "bbi": "BVI",
        "vwrf": "VWRA",
        "uuhpp": "UU HPP",
        "w8ben": "W-8BEN",
        "etfs": "ETFs",
        "etf": "ETF",
        "bca": "BCA",
        "idx": "IDX",
        "cspx": "CSPX",
        "vwra": "VWRA",
        "pmk": "PMK",
        "sbn": "SBN",
        "crs": "CRS",
        "djp": "DJP",
        "spt": "SPT",
        "pph": "PPh",
        "irs": "IRS"
    }
    
    if clean_lower in replace_map:
        clean_w = replace_map[clean_lower] + trailing

    merged_words.append({
        "w": clean_w,
        "start": w1["start"],
        "end": w1["end"]
    })
    i += 1

print(f"Total merged words: {len(merged_words)} (was {len(raw_words)})")

# Find exact beat ranges in merged_words
def find_p(phrase):
    tokens = phrase.lower().split()
    for idx in range(len(merged_words) - len(tokens) + 1):
        m = True
        for k in range(len(tokens)):
            if tokens[k] not in merged_words[idx+k]["w"].lower():
                m = False
                break
        if m:
            return idx
    return -1

b1_s = 0
b1_e = find_p("tax shock") + 1

b2_s = find_p("most indonesian")
b2_e = b2_s
for idx in range(b2_s, b2_s + 90):
    if "treaty with" in f"{merged_words[idx]['w']} {merged_words[idx+1]['w']}".lower():
        b2_e = idx + 3
        break

b3_s = find_p("smart investors")
b3_e = find_p("tax events") + 1

b4_s = find_p("what if you receive")
b4_e = b4_s
for idx in range(b4_s + 40, b4_s + 90):
    if "rate drops to zero" in " ".join(x["w"] for x in merged_words[idx-4:idx+1]).lower():
        b4_e = idx
        break

b5_s = find_p("can you hide behind")
b5_e = b5_s
for idx in range(b5_s + 40, b5_s + 90):
    if "200%" in merged_words[idx]["w"]:
        b5_e = idx
        break

b6_s = b5_e + 1
b6_e = len(merged_words) - 1

beat_ranges = [
    ("beat_01", b1_s, b1_e),
    ("beat_02", b2_s, b2_e),
    ("beat_03", b3_s, b3_e),
    ("beat_04", b4_s, b4_e),
    ("beat_05", b5_s, b5_e),
    ("beat_06", b6_s, b6_e)
]

beats = []
for name, s, e in beat_ranges:
    w_start = merged_words[s]
    w_end = merged_words[e]
    b_start = w_start["start"]
    b_end = w_end["end"]
    beats.append({
        "beat_id": name,
        "start": b_start,
        "end": b_end,
        "duration": round(b_end - b_start, 3)
    })
    print(name, f"[{b_start}s -> {b_end}s] ({round(b_end - b_start, 2)}s) : {w_start['w']} ... {w_end['w']}")

# Scene partitioning
scenes = []
b_starts = [b["start"] for b in beats]
starts = [0.0] + b_starts[1:]
ends = b_starts[1:] + [duration]

for i in range(len(beats)):
    s_start = round(starts[i], 2)
    s_end = round(ends[i], 2)
    s_dur = round(s_end - s_start, 2)
    scenes.append({
        "id": f"beat_0{i+1}",
        "start": s_start,
        "end": s_end,
        "duration": s_dur
    })

# Subtitle chunks (max <= 26 chars, 2-5 words)
chunks = []
idx = 0
total_w = len(merged_words)

while idx < total_w:
    best_c = 1
    for count in range(1, min(5, total_w - idx) + 1):
        subset = merged_words[idx:idx+count]
        txt = " ".join(w["w"] for w in subset)
        if len(txt) <= 26:
            best_c = count
        else:
            break
            
    chunk_words = merged_words[idx:idx+best_c]
    txt = " ".join(w["w"] for w in chunk_words)
    chunks.append({
        "text": txt,
        "start": chunk_words[0]["start"],
        "end": chunk_words[-1]["end"],
        "duration": round(chunk_words[-1]["end"] - chunk_words[0]["start"], 3),
        "words": chunk_words
    })
    idx += best_c

print(f"Generated {len(chunks)} subtitle chunks. Max len: {max(len(c['text']) for c in chunks)} chars.")

timings_out = {
    "duration_seconds": duration,
    "words": merged_words,
    "beats": beats,
    "scenes": scenes,
    "subtitle_chunks": chunks
}
timings_json_path.write_text(json.dumps(timings_out, indent=2))
print("Updated timings.json")

# Write timings.ts
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
timings_ts_path.write_text(timings_ts_content)
print("Updated timings.ts successfully!")
