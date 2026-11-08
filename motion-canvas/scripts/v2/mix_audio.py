#!/usr/bin/env python3
"""v2 final mix: ducked music beds + synthesized SFX + narration -> production/<id>/final_mix.wav

Usage: mix_audio.py <video_id>
48 kHz stereo, -14 LUFS integrated, true peak <= -1 dBTP, length == timings duration.
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

MC = Path(__file__).resolve().parents[2]
SR = 48000
MUSIC_DB = -24.0        # music RMS relative to voice RMS while speaking
PAUSE_LIFT_DB = 6.0     # extra music level inside longer pauses
SFX_DB = -22.0          # sfx level relative to voice RMS
TARGET_LUFS = -14.0
MAX_TP = -1.0
XFADE_MOOD = 1.5        # seconds, between chapters with different moods
XFADE_LOOP = 2.0        # seconds, loop seam of a music bed
FRAME = 0.01            # envelope resolution (s)


# ---------------------------------------------------------------- io
def read_wav(path):
    """Any ffmpeg-readable file -> float32 array (n, ch) at 48 kHz, ch as stored (1 or 2)."""
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                           "stream=channels", "-of", "csv=p=0", str(path)],
                          capture_output=True, text=True, check=True).stdout.strip()
    ch = int(info)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ar", str(SR),
                          "-ac", str(ch), "pipe:1"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy()


def write_wav(path, x, ch):
    pcm = (np.clip(x, -1, 1) * 32767).round().astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def db(x):
    return 20 * np.log10(max(float(x), 1e-12))


# ---------------------------------------------------------------- sfx synthesis
def _norm_active(x):
    """Scale so RMS over the audible part (envelope > 10% of peak) is -20 dBFS."""
    act = np.abs(x) > 0.1 * np.abs(x).max()
    return x * (10 ** (-20 / 20) / np.sqrt((x[act] ** 2).mean()))


def make_sfx(out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(7)
    fade = lambda n: np.hanning(2 * n)[:n]

    # whoosh: noise through a low-pass that opens, then closes; soft swell envelope
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    cutoff = 300 + 4200 * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 2
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y1 = y2 = 0.0
    lp = np.empty(n)
    for i in range(n):
        y1 += a[i] * (noise[i] - y1)
        y2 += a[i] * (y1 - y2)
        lp[i] = y2
    hp = lp - np.convolve(lp, np.ones(480) / 480, mode="same")  # remove rumble
    env = np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 2.2
    whoosh = _norm_active(hp * env)

    # tick: tiny pitched click
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    tick = (np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.009)
            + 0.4 * np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.014))
    tick[:48] *= np.linspace(0, 1, 48)
    tick = _norm_active(tick)

    # thud: sine drop with a short soft knock
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 42 + 85 * np.exp(-t / 0.05)
    phase = 2 * np.pi * np.cumsum(f) / SR
    thud = np.sin(phase) * np.exp(-t / 0.16)
    knock = np.convolve(rng.standard_normal(n), np.ones(40) / 40, mode="same") * np.exp(-t / 0.012)
    thud = thud + 0.35 * knock
    thud[:96] *= np.linspace(0, 1, 96)
    thud = _norm_active(thud)

    sfx = {}
    for name, x in (("whoosh", whoosh), ("tick", tick), ("thud", thud)):
        x = x.astype(np.float32)
        x[-fade(240).size:] *= fade(240)[::-1]
        p = out_dir / f"{name}.wav"
        write_wav(p, x, 1)  # -20 dBFS active RMS; mix scales to voice level
        sfx[name] = x
    return sfx


# ---------------------------------------------------------------- storyboard timing
def resolver(timings):
    sents = {s["id"]: s for s in timings["sentences"]}
    words = {}
    for w in timings["words"]:
        words.setdefault(w["sentence_id"], []).append(w)

    def resolve(at):
        sid, _, word = at.partition("@")
        if sid not in sents:
            raise SystemExit(f"unresolvable at '{at}': no sentence {sid}")
        if not word:
            return sents[sid]["start"]
        for w in words[sid]:
            if w["w"].lower().startswith(word.lower()):
                return w["start"]
        raise SystemExit(f"unresolvable at '{at}': no word starting with '{word}' in {sid}")
    return resolve


def sfx_events(storyboard, resolve):
    ev = set()
    for ch in storyboard["chapters"]:
        for shot in ch["shots"]:
            t = resolve(shot["at"])
            if shot.get("transition") in ("collapse", "expand"):
                ev.add((t, "whoosh"))
            ex = shot.get("explainer")
            for it in (ex or {}).get("items", []):
                if "at" not in it:
                    continue
                kind = "thud" if ex.get("type") == "stat" or str(it.get("label", "")).lower().startswith("total") \
                    else "tick"
                ev.add((resolve(it["at"]), kind))
    return sorted(ev)


# ---------------------------------------------------------------- music bed
def loop_to(track, n):
    """Loop a stereo track to n samples with equal-power crossfades at the seams."""
    x = int(XFADE_LOOP * SR)
    L = len(track)
    if L <= 2 * x:
        raise SystemExit("music track too short to loop")
    out = np.zeros((n + L, 2), np.float32)
    out[:L] = track
    pos = L
    th = np.linspace(0, np.pi / 2, x)[:, None]
    while pos < n:
        s = pos - x
        out[s:pos] = out[s:pos] * np.cos(th) + track[:x] * np.sin(th)
        out[pos:pos + L - x] = track[x:]
        pos += L - x
    return out[:n]


def voice_activity(voice):
    """10 ms RMS frames -> (rms_dbfs array, speech mask, active-speech RMS in dBFS)."""
    h = int(FRAME * SR)
    n = len(voice) // h
    ms = (voice[: n * h].reshape(n, h) ** 2).mean(1)
    rms_db = 10 * np.log10(np.maximum(ms, 1e-12))
    speech = rms_db > -50
    if not speech.any():
        raise SystemExit("narration is silent")
    v_db = 10 * np.log10(ms[speech].mean())
    return speech, v_db


def music_gain_curve(speech, n_samples):
    """dB curve (per sample) relative to the speaking level: 0 speaking, +lift in longer pauses."""
    hold = int(0.3 / FRAME)
    k = 2 * hold + 1
    pad = np.pad(speech.astype(np.float32), hold)
    closed = np.lib.stride_tricks.sliding_window_view(pad, k).max(1) > 0
    target = np.where(closed, 0.0, PAUSE_LIFT_DB)
    win = np.hanning(int(0.5 / FRAME) | 1)
    win /= win.sum()
    smooth = np.convolve(np.pad(target, len(win), mode="edge"), win, mode="same")[len(win):-len(win)]
    t_frames = (np.arange(len(smooth)) + 0.5) * FRAME
    return np.interp(np.arange(n_samples) / SR, t_frames, smooth)


# ---------------------------------------------------------------- loudness
def measure(path):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1))
    return i, tp


def write_f32(path, x):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2",
                    "-i", "pipe:0", "-c:a", "pcm_f32le", str(path)],
                   input=x.astype(np.float32).tobytes(), check=True)


def master(mix, dest, n):
    """Gain to -14 LUFS, limit true peak, write exactly n samples (16-bit)."""
    tmp = dest.with_suffix(".tmp.wav")
    gain, ceil = 0.0, MAX_TP - 0.6
    for _ in range(10):
        y = mix * 10 ** (gain / 20)
        write_f32(tmp, y)
        i, tp = measure(tmp)
        if tp > MAX_TP:
            r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp), "-af",
                                f"alimiter=limit={10 ** (ceil / 20):.4f}:attack=5:release=80:level=0",
                                "-f", "f32le", "-ar", str(SR), "-ac", "2", "pipe:1"],
                               capture_output=True, check=True).stdout
            y = np.frombuffer(r, dtype=np.float32).reshape(-1, 2)
            y = np.pad(y, ((0, max(0, n - len(y))), (0, 0)))[:n]
            write_f32(tmp, y)
            i, tp = measure(tmp)
        print(f"  master pass: gain {gain:+.2f} dB, limiter ceiling {ceil:.2f} dB -> {i:.2f} LUFS, {tp:.2f} dBTP")
        if abs(i - TARGET_LUFS) <= 0.15 and tp <= MAX_TP:
            break
        if tp > MAX_TP:
            ceil -= tp - MAX_TP + 0.1
        gain += TARGET_LUFS - i
    else:
        raise SystemExit(f"loudness did not converge (last {i:.2f} LUFS, {tp:.2f} dBTP)")
    write_wav(dest, y, 2)
    tmp.unlink()
    return measure(dest)


# ---------------------------------------------------------------- main
def main(vid):
    prod = MC / "production" / vid
    audio = MC / "public" / "audio"
    timings = json.loads((prod / "timings.json").read_text())
    script = json.loads((prod / "script.json").read_text())
    board = json.loads((prod / "storyboard.json").read_text())
    n = int(round(timings["duration_seconds"] * SR))

    voice = read_wav(audio / f"{vid}_narration.wav")[:, 0]
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    speech, v_db = voice_activity(voice)
    print(f"voice active RMS {v_db:.1f} dBFS")

    # music: one looped stream per mood, weighted per chapter, ducked under the voice
    mood_of = {c["id"]: c.get("music", "warm") for c in script["chapters"]}
    beats = timings["beats"]
    moods = list(dict.fromkeys(mood_of[b["chapter_id"]] for b in beats))
    w = {m: np.zeros(n, np.float32) for m in moods}
    for b in beats:
        w[mood_of[b["chapter_id"]]][int(round(b["start"] * SR)):int(round(b["end"] * SR))] = 1.0
    h = int(XFADE_MOOD / 2 * SR)
    th = np.linspace(0, np.pi / 2, 2 * h, dtype=np.float32)
    for a, b in zip(beats[:-1], beats[1:]):
        ma, mb = mood_of[a["chapter_id"]], mood_of[b["chapter_id"]]
        if ma != mb:
            c = int(round(a["end"] * SR))
            lo, hi = max(0, c - h), min(n, c + h)
            seg = slice(lo - (c - h), hi - (c - h))
            w[ma][lo:hi] = np.cos(th)[seg]
            w[mb][lo:hi] = np.sin(th)[seg]
    bed = np.zeros((n, 2), np.float32)
    for m in moods:
        p = audio / f"{vid}_music_{m}.wav"
        if not p.exists():
            raise SystemExit(f"missing {p.name}; run generate_music.py {vid}")
        tr = read_wav(p)
        tr = np.repeat(tr, 2, axis=1) if tr.shape[1] == 1 else tr
        tr = tr / np.sqrt((tr ** 2).mean())            # RMS = 0 dBFS reference
        bed += loop_to(tr, n) * w[m][:, None]
    duck_db = MUSIC_DB + v_db + music_gain_curve(speech, n)
    bed *= (10 ** (duck_db / 20)).astype(np.float32)[:, None]
    fi, fo = int(1.0 * SR), int(3.0 * SR)
    bed[:fi] *= np.linspace(0, 1, fi)[:, None]
    bed[-fo:] *= np.linspace(1, 0, fo)[:, None]

    # sfx
    sfx = make_sfx(audio / "sfx")
    resolve = resolver(timings)
    events = sfx_events(board, resolve)
    fx = np.zeros((n, 2), np.float32)
    g = 10 ** ((v_db + SFX_DB + 20) / 20)  # sfx are stored at -20 dBFS active RMS
    for t, kind in events:
        s = int(round(t * SR))
        x = sfx[kind][: max(0, n - s)] * g
        fx[s:s + len(x)] += x[:, None]
    print(f"sfx events: {len(events)} "
          f"(whoosh {sum(k == 'whoosh' for _, k in events)}, tick {sum(k == 'tick' for _, k in events)}, "
          f"thud {sum(k == 'thud' for _, k in events)})")

    mix = voice[:, None] + bed + fx
    lufs, tp = master(mix.astype(np.float32), prod / "final_mix.wav", n)
    out_n = len(read_wav(prod / "final_mix.wav"))
    print(f"final_mix.wav: {lufs:.2f} LUFS integrated, true peak {tp:.2f} dBTP, "
          f"{out_n} samples (expected {n}), {out_n / SR:.3f}s")
    if out_n != n:
        raise SystemExit("length mismatch")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
