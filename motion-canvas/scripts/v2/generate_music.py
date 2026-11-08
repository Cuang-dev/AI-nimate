#!/usr/bin/env python3
"""v2 music beds from the local royalty-free library (no music API).

Usage: generate_music.py <video_id>

Library: motion-canvas/music_library/<mood>/<track>.{mp3,wav,ogg,flac,m4a}, mood = tense | light | warm.
Every track needs a sidecar <track>.license.txt with at least two lines:
    source: <URL where it was downloaded>
    license: <license name, e.g. "Pixabay Content License" or "YouTube Audio Library, no attribution">
    attribution: <credit line for the description, or "none">
Tracks without a license file are refused (Content ID claims and takedowns are the risk).

For each mood an episode uses, one track is picked deterministically from the episode id (same
episode -> same track; different episodes rotate through the library) and written as
public/audio/<id>_music_<mood>.wav (48 kHz stereo). Existing files are kept.
Attribution lines needed for the YouTube description are written to production/<id>/music_credits.txt.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

MC = Path(__file__).resolve().parents[2]
LIB = MC / "music_library"
EXTS = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}


def license_of(track):
    lic = track.with_name(track.stem + ".license.txt")
    if not lic.exists():
        return None
    fields = {}
    for line in lic.read_text().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fields[k.strip().lower()] = v.strip()
    return fields if fields.get("source") and fields.get("license") else None


def main(vid):
    script = json.loads((MC / "production" / vid / "script.json").read_text())
    moods = list(dict.fromkeys(c.get("music", "warm") for c in script["chapters"]))
    out_dir = MC / "public" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    problems, credits = [], []
    for mood in moods:
        dest = out_dir / f"{vid}_music_{mood}.wav"
        if dest.exists():
            print(f"{dest.name} exists, keeping")
            continue
        folder = LIB / mood
        tracks = sorted(p for p in folder.glob("*") if p.suffix.lower() in EXTS) if folder.exists() else []
        usable = [t for t in tracks if license_of(t)]
        for t in tracks:
            if t not in usable:
                problems.append(f"{t.relative_to(MC)}: missing or incomplete {t.stem}.license.txt "
                                "(needs 'source:' and 'license:' lines)")
        if not usable:
            problems.append(f"no licensed track for mood '{mood}'. fix: put a royalty-free track in "
                            f"{folder.relative_to(MC)}/ with a <name>.license.txt next to it (see music_library/README.md)")
            continue
        pick = usable[int(hashlib.sha256(f"{vid}:{mood}".encode()).hexdigest(), 16) % len(usable)]
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(pick), "-ar", "48000", "-ac", "2",
                        "-c:a", "pcm_s16le", str(dest)], check=True)
        lic = license_of(pick)
        credits.append(f"{mood}: {pick.name} | {lic['license']} | {lic['source']} | "
                       f"attribution: {lic.get('attribution', 'none')}")
        print(f"wrote {dest.name} from {pick.relative_to(MC)}")
    if credits:
        cf = MC / "production" / vid / "music_credits.txt"
        old = cf.read_text().splitlines() if cf.exists() else []
        cf.write_text("\n".join(dict.fromkeys(old + credits)) + "\n")
    if problems:
        for p in problems:
            print("  -", p, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1])
