#!/usr/bin/env python3
"""v2 narration: locked-voice Gemini TTS -> Whisper timestamps -> script-text alignment.

Usage: synth_narration.py <video_id> [--repace]

--repace keeps the existing take and only re-runs pacing (sentence pauses, loudness
leveling) and subtitle chunking. Run mix_audio.py afterwards.

The voice block of script.json is used verbatim. There is no model or voice fallback;
transient errors are retried on the same model, anything else fails loudly.
Words in timings.json come from the script, Whisper only supplies timestamps.
"""
import base64
import difflib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import keys  # noqa: E402

MC = Path(__file__).resolve().parents[2]
REPO = MC.parent
SR = 48000
TTS_SR = 24000
DEFAULT_CHAPTER_PAUSE = 0.7
WHISPER_MODEL = "medium"
MIN_MATCH_RATE = 0.60
TOKEN_RE = re.compile(r"(?:\[[^\]]*\]|[^\s\[])+")
BRACKET_RE = re.compile(r"\[([^|\]]*)\|([^\]]*)\]")


# ---------------------------------------------------------------- script parsing
def display_of(tok):
    return BRACKET_RE.sub(lambda m: m.group(1), tok)


def spoken_of(tok):
    return BRACKET_RE.sub(lambda m: m.group(2), tok)


def norm(w):
    return "".join(c for c in w.lower() if c.isalnum())


def load_script(vid):
    script = json.loads((MC / "production" / vid / "script.json").read_text())
    sents = []
    for ch in script["chapters"]:
        for i, s in enumerate(ch["sentences"]):
            toks = TOKEN_RE.findall(s["text"])
            sents.append({
                "id": s["id"], "chapter_id": ch["id"], "tokens": toks,
                "display": [display_of(t) for t in toks],
                "spoken": " ".join(spoken_of(t) for t in toks),
                "last_in_chapter": i == len(ch["sentences"]) - 1,
                "pause_after": s.get("pause_after"),
            })
    return script, sents


# ---------------------------------------------------------------- TTS
# Locked generation settings: same model, voice, prompt layout, seed and temperature for every
# episode, so the voice sounds the same from video to video.
TTS_SEED = 20261107
TTS_TEMPERATURE = 0.7


def tts_request(voice, style, text, attempts=3):
    """One TTS call on the locked model/voice (free Audio keys only, guarded). Returns float32 mono @24 kHz."""
    # "Say X:" style prefixes get read aloud by this model; the profile/transcript layout does not.
    prompt = f"# AUDIO PROFILE\n{style.strip()}\n\n#### TRANSCRIPT\n{text}"
    cfg = {"responseModalities": ["AUDIO"], "seed": TTS_SEED, "temperature": TTS_TEMPERATURE,
           "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice["voiceName"]}}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{voice['model']}:generateContent"
    last = None
    for n in range(attempts):
        code = None
        payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": cfg}).encode()
        try:
            with keys.tts_key(voice["model"], prompt) as key:
                req = urllib.request.Request(url, payload, {"Content-Type": "application/json",
                                                            "x-goog-api-key": key})
                with urllib.request.urlopen(req, timeout=600) as r:
                    d = json.load(r)
            cand = d["candidates"][0]
            part = next(p for p in cand["content"]["parts"] if "inlineData" in p)
            if cand.get("finishReason") not in (None, "STOP"):
                raise RuntimeError(f"finishReason={cand.get('finishReason')}")
            raw = base64.b64decode(part["inlineData"]["data"])
            mime = part["inlineData"].get("mimeType", "")
            return decode_audio(raw, mime, TTS_SR)
        except keys.QuotaStop as e:
            raise SystemExit(f"TTS stopped: {e}")
        except urllib.error.HTTPError as e:
            code = e.code
            body = e.read().decode(errors="replace")[:300]
            last = f"HTTP {e.code}: {body}"
            if e.code == 400 and ("seed" in body or "temperature" in body) and "seed" in cfg:
                cfg.pop("seed", None); cfg.pop("temperature", None)  # model rejects them: same request without
                print("  TTS: model rejected seed/temperature; continuing without them", file=sys.stderr)
                continue
            if e.code not in (429, 500, 502, 503, 504):
                raise SystemExit(f"TTS failed permanently: {last}")
        except Exception as e:  # network, empty audio, bad finishReason
            last = repr(e)
        try:
            wait = keys.quota_backoff(n, code)
        except keys.QuotaStop as e:
            raise SystemExit(f"TTS stopped: {e}")
        print(f"  TTS attempt {n + 1}/{attempts} failed ({last}); waiting {wait}s, same model and key", file=sys.stderr)
        time.sleep(wait)
    raise SystemExit(f"TTS failed after {attempts} attempts on {voice['model']}: {last}")


def decode_audio(raw, mime, rate):
    cmd = ["ffmpeg", "-loglevel", "error", "-i", "pipe:0"]
    if not raw[:4] == b"RIFF":
        m = re.search(r"rate=(\d+)", mime)
        cmd = ["ffmpeg", "-loglevel", "error", "-f", "s16le", "-ar", m.group(1) if m else "24000",
               "-ac", "1", "-i", "pipe:0"]
    cmd += ["-f", "f32le", "-ar", str(rate), "-ac", "1", "pipe:1"]
    out = subprocess.run(cmd, input=raw, capture_output=True, check=True).stdout
    a = np.frombuffer(out, dtype=np.float32)
    if len(a) < rate:
        raise RuntimeError("empty audio")
    return a


def resample(a, src, dst):
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(src), "-ac", "1",
                          "-i", "pipe:0", "-f", "f32le", "-ar", str(dst), "-ac", "1", "pipe:1"],
                         input=a.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def trim_silence(a, rate, lead=0.2, tail=0.3, thresh=10 ** (-50 / 20)):
    h = int(rate * 0.01)
    n = len(a) // h
    rms = np.sqrt((a[: n * h].reshape(n, h) ** 2).mean(1))
    idx = np.flatnonzero(rms > thresh)
    if not len(idx):
        raise SystemExit("TTS returned silence")
    s = max(0, idx[0] * h - int(lead * rate))
    e = min(len(a), (idx[-1] + 1) * h + int(tail * rate))
    return a[s:e]


# ---------------------------------------------------------------- whisper
def whisper_words(a24, hint):
    a16 = resample(a24, TTS_SR, 16000)
    from faster_whisper import WhisperModel
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8", cpu_threads=4)
    segs, _ = model.transcribe(a16, language="id", word_timestamps=True, beam_size=1,
                               initial_prompt=hint, condition_on_previous_text=False)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in s.words if norm(w.word)]


# ---------------------------------------------------------------- alignment
def align(sents, words, dur):
    """Return per-spoken-word (start, end) from script tokens, plus anchor rate."""
    S, owner = [], []  # normalized spoken words, (sentence idx, token idx)
    for si, s in enumerate(sents):
        for ti, tok in enumerate(s["tokens"]):
            for w in spoken_of(tok).split():
                if norm(w):
                    S.append(norm(w))
                    owner.append((si, ti))
    W = [norm(w[0]) for w in words]
    sm = difflib.SequenceMatcher(None, S, W, autojunk=False)
    t = [None] * len(S)
    matched = 0
    runs = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            matched += i2 - i1
            for k in range(i2 - i1):
                t[i1 + k] = (words[j1 + k][1], words[j1 + k][2])
        elif i2 > i1:
            runs.append((i1, i2, j1, j2))
    for i1, i2, j1, j2 in runs:
        if j2 > j1:
            t0, t1 = words[j1][1], words[j2 - 1][2]
        else:
            t0 = words[j1 - 1][2] if j1 > 0 else 0.0
            t1 = words[j1][1] if j1 < len(words) else dur
        if t1 <= t0:
            t1 = t0 + 0.06 * (i2 - i1)
        wts = np.array([len(S[k]) + 1 for k in range(i1, i2)], float)
        edges = t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(wts)]) / wts.sum()
        for k in range(i2 - i1):
            t[i1 + k] = (edges[k], edges[k + 1])
    # monotonic clean-up
    prev = 0.0
    for k, (s, e) in enumerate(t):
        s = max(s, prev)
        e = max(e, s)
        t[k] = (s, e)
        prev = s
    return t, owner, matched / max(1, len(S))


# ---------------------------------------------------------------- splice
def find_cut(a, g0, g1):
    """Lowest-energy 10 ms spot in (and slightly around) the gap between two sentences."""
    c = (g0 + g1) / 2
    half = max((g1 - g0) / 2, 0) + 0.05
    lo = max(0, int((c - half) * SR))
    hi = min(len(a), int((c + half) * SR))
    h = int(0.01 * SR)
    best, pos = None, int(c * SR)
    for p in range(lo, max(lo + 1, hi - h), h // 2):
        r = float((a[p:p + h] ** 2).mean())
        if best is None or r < best:
            best, pos = r, p + h // 2
    return pos


def splice(a, cuts):
    """cuts: [(sample_pos, silence_seconds)] ascending. Returns new audio. 10 ms fades at joins."""
    f = int(0.01 * SR)
    out, last = [], 0
    for pos, secs in cuts:
        if secs <= 0:
            continue
        seg = a[last:pos].copy()
        n = min(f, len(seg))
        seg[-n:] *= np.linspace(1, 0, n)
        out += [seg, np.zeros(int(round(secs * SR)), np.float32)]
        last = pos
        nxt = a[last:last + f].copy()
        nxt *= np.linspace(0, 1, len(nxt))
        a = np.concatenate([a[:last], nxt, a[last + f:]])
    out.append(a[last:])
    return np.concatenate(out)


# ---------------------------------------------------------------- pacing
# Target silence after a sentence (seconds). The take's own gap counts toward it; we only add.
PAUSE_QUESTION = 0.70
PAUSE_STATEMENT = 0.50
PAUSE_NUMBER = 0.70      # sentence carries a figure: give the eye time to find it on screen
PAUSE_COLON = 0.40
PAUSE_CHAPTER = 1.00
SILENCE_DB = -42.0
LEVEL_MAX_DB = 4.0


def frame_db(a, pos, h):
    seg = a[max(0, pos):pos + h]
    return 10 * np.log10(float((seg ** 2).mean()) + 1e-12) if len(seg) else -120.0


def silence_len(a, pos):
    """Length of the quiet run around pos (10 ms frames below SILENCE_DB)."""
    h = int(0.01 * SR)
    lo = hi = pos
    while lo - h > 0 and frame_db(a, lo - h, h) < SILENCE_DB:
        lo -= h
    while hi + h < len(a) and frame_db(a, hi, h) < SILENCE_DB:
        hi += h
    return (hi - lo) / SR


def speech_db(seg):
    h = int(0.02 * SR)
    fr = [seg[i:i + h] for i in range(0, len(seg) - h, h)]
    e = np.array([float((f ** 2).mean()) for f in fr]) if fr else np.array([1e-12])
    act = e[10 * np.log10(e + 1e-12) > SILENCE_DB]
    return 10 * np.log10(act.mean()) if len(act) else None


def target_pause(s):
    end = s["display"][-1].rstrip("\"')”’")[-1:]
    if s["last_in_chapter"]:
        return PAUSE_CHAPTER
    if end == "?":
        return PAUSE_QUESTION
    if end == ":":
        return PAUSE_COLON
    if any(ch.isdigit() for d in s["display"] for ch in d):
        return PAUSE_NUMBER
    return PAUSE_STATEMENT


def pace(a, sents, word_list):
    """Level each sentence toward the median loudness and lengthen too-short pauses.
    Works on any take (fresh or already spliced). Returns (audio, word_list) with times shifted."""
    spans = {}
    for w in word_list:
        s0, e0 = spans.get(w["sentence_id"], (w["start"], w["end"]))
        spans[w["sentence_id"]] = (min(s0, w["start"]), max(e0, w["end"]))
    ids = [s["id"] for s in sents]
    cuts = [find_cut(a, spans[ids[i]][1], spans[ids[i + 1]][0]) for i in range(len(ids) - 1)]

    # loudness leveling: one gain per sentence, ramps placed at the (silent) cut points
    lv = [speech_db(a[int(spans[i][0] * SR):int(spans[i][1] * SR)]) for i in ids]
    ref = float(np.median([x for x in lv if x is not None]))
    gains = [10 ** (float(np.clip(ref - x, -LEVEL_MAX_DB, LEVEL_MAX_DB)) / 20) if x is not None else 1.0 for x in lv]
    env = np.empty(len(a), np.float32)
    edges = [0] + cuts + [len(a)]
    for i, g in enumerate(gains):
        env[edges[i]:edges[i + 1]] = g
    r = int(0.04 * SR)
    for i, c in enumerate(cuts):
        lo, hi = max(0, c - r), min(len(a), c + r)
        env[lo:hi] = np.linspace(gains[i], gains[i + 1], hi - lo)
    a = a * env

    # pauses
    adds = []
    for i, c in enumerate(cuts):
        need = target_pause(sents[i]) - silence_len(a, c)
        adds.append(need if need > 0.05 else 0.0)
    out = splice(a, list(zip(cuts, adds)))
    shift, total = {}, 0.0
    for i, sid in enumerate(ids):
        shift[sid] = total
        if i < len(adds):
            total += adds[i]
    for w in word_list:
        w["start"] = r3(w["start"] + shift[w["sentence_id"]])
        w["end"] = r3(w["end"] + shift[w["sentence_id"]])
    spread = max(abs(20 * np.log10(g)) for g in gains)
    print(f"paced: +{total:.1f}s of pauses at {sum(1 for x in adds if x)} of {len(adds)} boundaries; "
          f"leveled to {ref:.1f} dB (max correction {spread:.1f} dB)")
    return out, word_list


# ---------------------------------------------------------------- chunks
# 16:9 has room for a full clause on one line; 9:16 stays short.
CHUNK_LIMITS = {"16x9": (10, 52, 5), "9x16": (5, 34, 2)}


def make_chunks(entries, max_words=5, max_chars=34, soft_min=2):
    """Clause-aware chunks: break at sentence ends (and commas once a clause has soft_min words),
    glue tiny clause fragments to their neighbour, and split long clauses into balanced parts."""
    def chars(ws):
        return sum(len(w["w"]) for w in ws) + max(len(ws) - 1, 0)

    def fits(ws):
        return len(ws) <= max_words and chars(ws) <= max_chars

    clauses, cur = [], []
    for e in entries:
        cur.append(e)
        end = e["w"].rstrip("\"')”’")[-1:]
        hard = end in ".?!…"
        if hard or (end in ",;:—–-" and len(cur) >= soft_min):
            clauses.append([cur, hard]); cur = []
    if cur:
        clauses.append([cur, True])
    merged = []
    for cl, hard in clauses:
        prev = merged[-1] if merged else None
        if prev and not prev[1] and (len(prev[0]) < 3 or len(cl) < 3) and fits(prev[0] + cl):
            prev[0] = prev[0] + cl; prev[1] = hard
        else:
            merged.append([cl, hard])
    chunks = []
    for cl, _ in merged:
        k = max(1, -(-len(cl) // max_words))
        while True:
            parts, start, total = [], 0, chars(cl)
            for i in range(1, k):
                target = total * i / k
                # never split a name ("Jakarta Barat") or a figure from its unit/word before it
                glue = lambda j: 12 if (cl[j]["w"][:1].isupper() and cl[j - 1]["w"][:1].isupper()) \
                    or any(c.isdigit() for c in cl[j]["w"]) else 0
                j = min(range(start + 1, len(cl) - (k - i) + 1),
                        key=lambda j: abs(chars(cl[:j]) - target) + glue(j))
                parts.append(cl[start:j]); start = j
            parts.append(cl[start:])
            if all(fits(x) for x in parts) or k >= len(cl):
                chunks += parts
                break
            k += 1
    return chunks


def r3(x):
    return round(float(x), 3)


# ---------------------------------------------------------------- main
def main(vid):
    script, sents = load_script(vid)
    voice = script["voice"]
    style = script["tts_style_prompt"]
    paras = []
    for ch in script["chapters"]:
        paras.append(" ".join(s["spoken"] for s in sents if s["chapter_id"] == ch["id"]))
    text = "\n\n".join(paras)
    n_words = len(text.split())
    print(f"{vid}: {len(sents)} sentences, {n_words} spoken words, voice {voice['model']}/{voice['voiceName']}")

    raw = tts_request(voice, style, text)
    raw = trim_silence(raw, TTS_SR)
    dur24 = len(raw) / TTS_SR
    print(f"TTS single take: {dur24:.1f}s, {n_words / dur24 * 60:.0f} wpm")
    if not 90 <= n_words / dur24 * 60 <= 200:
        raise SystemExit("TTS duration implausible for the text (truncated or padded take); aborting")

    hint = " ".join(dict.fromkeys(spoken_of(t) for s in sents for t in s["tokens"] if "[" in t)) \
        + " " + sents[0]["spoken"]
    words = whisper_words(raw, hint[:600])
    spoken_t, owner, rate = align(sents, words, dur24)
    print(f"alignment anchor match rate: {rate:.1%} ({len(words)} whisper words)")
    if rate < MIN_MATCH_RATE:
        raise SystemExit(f"anchor match rate {rate:.1%} < {MIN_MATCH_RATE:.0%}; refusing to write timings")

    # per-sentence spans in raw time
    a = resample(raw, TTS_SR, SR)
    sent_spans = {}
    for k, (si, ti) in enumerate(owner):
        s0, e0 = sent_spans.get(si, (spoken_t[k][0], spoken_t[k][1]))
        sent_spans[si] = (min(s0, spoken_t[k][0]), max(e0, spoken_t[k][1]))
    cuts, shift = [], []
    total = 0.0
    for si, s in enumerate(sents):
        shift.append(total)
        pause = s["pause_after"]
        if pause is None:
            pause = DEFAULT_CHAPTER_PAUSE if s["last_in_chapter"] else 0.0
        if pause <= 0:
            continue
        if si + 1 < len(sents):
            pos = find_cut(a, sent_spans[si][1], sent_spans[si + 1][0])
        else:
            pos = len(a)
        cuts.append((pos, pause))
        total += pause
    out = splice(a, cuts)

    # timings
    entries = {}  # (si, ti) -> [start, end]
    for k, (si, ti) in enumerate(owner):
        s, e = spoken_t[k][0] + shift[si], spoken_t[k][1] + shift[si]
        cur = entries.get((si, ti))
        entries[(si, ti)] = [min(cur[0], s), max(cur[1], e)] if cur else [s, e]
    beat_of = beat_ids(script)
    word_list, prev_end = [], 0.0
    for si, s in enumerate(sents):
        for ti, d in enumerate(s["display"]):
            st, en = entries.get((si, ti), [prev_end, prev_end])
            word_list.append({"w": d, "start": r3(st), "end": r3(max(en, st)),
                              "sentence_id": s["id"], "beat_id": beat_of[s["chapter_id"]]})
            prev_end = max(en, st)
    out, word_list = pace(out, sents, word_list)
    finish(vid, script, sents, word_list, out)


def beat_ids(script):
    return {c["id"]: f"beat_{i + 1:02d}" for i, c in enumerate(script["chapters"])}


def read_wav(path):
    with wave.open(str(path)) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1, f"{path}: expected {SR} Hz mono"
        return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767


def repace(vid):
    """Re-pace and re-level the existing take (no new TTS call, same voice)."""
    script, sents = load_script(vid)
    a = read_wav(MC / "public" / "audio" / f"{vid}_narration.wav")
    t = json.loads((MC / "production" / vid / "timings.json").read_text())
    words = [{k: w[k] for k in ("w", "start", "end", "sentence_id", "beat_id")} for w in t["words"]]
    out, words = pace(a, sents, words)
    finish(vid, script, sents, words, out)


def finish(vid, script, sents, word_list, out):
    """Write narration wavs and timings.json (sentences, beats, 16:9 and 9:16 subtitle chunks)."""
    pad = (-len(out)) % 48  # whole milliseconds
    out = np.concatenate([out, np.zeros(pad, np.float32)])
    duration = len(out) / SR
    ch_ids = [c["id"] for c in script["chapters"]]
    beat_of = beat_ids(script)
    # make strictly monotonic (starts non-decreasing, end >= start, end <= next start)
    for i in range(len(word_list) - 1):
        if word_list[i]["end"] > word_list[i + 1]["start"]:
            word_list[i]["end"] = word_list[i + 1]["start"]
        if word_list[i]["end"] < word_list[i]["start"]:
            word_list[i]["end"] = word_list[i]["start"]
    sentences_out = []
    for s in sents:
        ws = [w for w in word_list if w["sentence_id"] == s["id"]]
        sentences_out.append({"id": s["id"], "chapter_id": s["chapter_id"], "start": ws[0]["start"],
                              "end": ws[-1]["end"], "text": " ".join(s["display"])})

    starts = {}
    for sc in sentences_out:
        starts.setdefault(sc["chapter_id"], sc["start"])
    beats = []
    titles = {c["id"]: c.get("title", "") for c in script["chapters"]}
    for i, c in enumerate(ch_ids):
        last_end = [s["end"] for s in sentences_out if s["chapter_id"] == c][-1]
        t0 = 0.0 if i == 0 else beats[-1]["end"]
        t1 = duration if i == len(ch_ids) - 1 else r3((last_end + starts[ch_ids[i + 1]]) / 2)
        beats.append({"beat_id": beat_of[c], "chapter_id": c, "title": titles[c], "start": r3(t0),
                      "end": r3(t1), "duration": r3(t1 - t0),
                      "spoken_text": " ".join(s["spoken"] for s in sents if s["chapter_id"] == c)})

    def chunk_set(aspect):
        out_chunks = []
        for c in ch_ids:
            ents = [w for w in word_list if w["beat_id"] == beat_of[c]]
            for ch in make_chunks(ents, *CHUNK_LIMITS[aspect]):
                out_chunks.append({"text": " ".join(w["w"] for w in ch), "start": ch[0]["start"],
                                   "end": ch[-1]["end"], "duration": r3(ch[-1]["end"] - ch[0]["start"]),
                                   "beat_id": beat_of[c],
                                   "words": [{"w": w["w"], "start": w["start"], "end": w["end"]} for w in ch]})
        return out_chunks

    chunks = chunk_set("16x9")
    timings = {"duration_seconds": r3(duration), "beats": beats, "chapters": beats,
               "sentences": sentences_out, "words": word_list,
               "subtitle_chunks": chunks, "subtitle_chunks_9x16": chunk_set("9x16")}

    audio_dir = MC / "public" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    pk = float(np.abs(out).max())
    pcm = (out * (min(1.0, 0.98 / pk) if pk > 0 else 1) * 32767).round().astype("<i2")
    for name in (f"{vid}_narration.wav", f"{vid}.wav"):
        with wave.open(str(audio_dir / name), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(pcm.tobytes())
    (MC / "production" / vid / "timings.json").write_text(json.dumps(timings, ensure_ascii=False, indent=2))
    print(f"wrote {vid}.wav, {vid}_narration.wav ({duration:.3f}s) and timings.json "
          f"({len(chunks)} 16:9 / {len(timings['subtitle_chunks_9x16'])} 9:16 subtitle chunks)")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        raise SystemExit(__doc__)
    (repace if "--repace" in sys.argv else main)(args[0])
