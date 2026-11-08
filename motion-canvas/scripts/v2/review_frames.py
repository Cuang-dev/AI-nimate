#!/usr/bin/env python3
"""Automated look at the rendered video: one frame per storyboard shot, checked by Claude Haiku.

Usage: review_frames.py <video_id> [--aspect 16x9] [--parallel 3]

Each frame is taken 0.4s before its shot ends (everything on screen has appeared).
Haiku inspects frames in batches of 4 against a fixed checklist; every reported issue is
then confirmed by re-inspecting that frame alone (same checklist); blank frames are a pixel check.
A code word stamped on each frame proves the model really opened it.

Writes production/<id>/frame_review.json and exits 1 if any issue was confirmed.
"""
import argparse
import concurrent.futures as cf
import json
import random
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import qa_image as qa  # noqa: E402  (claude_cli, extract_json, QA_MODEL)
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

MC = Path(__file__).resolve().parents[2]
REPO = MC.parent
BATCH = 4
CODE_CHARS = "ACDEFHJKLMNPRTUVWXY34679"  # no look-alikes (8/B, 2/Z, 5/S, 0/O, 1/I)

ISSUES = {
    "subject_cut_off": "the main person or object of an illustration is cut by the card or frame edge so badly "
                       "that you cannot tell who or what it is (a face half outside the card, only an arm visible)",
    "empty_panel": "a white explainer box that has a title but no rows, bars, numbers or other content inside",
    "text_overflow": "text that is clipped, runs outside its box, or overlaps other text so it cannot be read",
    "subtitle_covers": "the dark subtitle pill at the bottom covers text or the subject's face",
    "unreadable": "text too small or too faint to read at normal viewing size",
}
FIX = {
    "subject_cut_off": "check image_focus.json for this image; if the focal point is right, regenerate the image "
                       "with the subject nearer the centre (assets_manifest.json prompt), or use mode \"full\"",
    "empty_panel": "storyboard.json: the shot ends before its items appear. Move the items' \"at\" earlier or "
                   "start the next shot later",
    "text_overflow": "storyboard.json: shorten the label/value/note/title shown in this shot",
    "subtitle_covers": "storyboard.json: use fewer items in this explainer so content ends higher",
    "blank_stage": "storyboard.json: give this moment a shot (image or explainer) that starts earlier",
    "unreadable": "storyboard.json: shorten the text so it can be drawn larger",
}

INSPECT = """You review frames from an educational YouTube video (flat illustrations, white explainer panels, a dark subtitle pill at the bottom). Use the Read tool to open EVERY file below. Each frame has a small black badge in its top-left corner with a code word; report it, so we know you opened the file.

{files}

For each frame check ONLY these problems:
{checklist}

Rules: report a problem only if you clearly see it. Intentional design is NOT a problem: a side card that shows a crop of a wider picture, a dimmed (semi-transparent) earlier element, an image that is part of a bigger scene, a short subtitle. If a frame is fine, give it an empty list.

Reply with JSON only:
{{"frames": [{{"file": "<name>", "code": "<badge code>", "issues": [{{"type": "<one of: {types}>", "where": "<where in the frame>", "note": "<what you see>"}}]}}]}}"""

def shots_for(vid):
    out = subprocess.run(["node", str(MC / "scripts/v2/lint_episode.mjs"), vid, "--shots"],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def stamp(src, dst, code):
    im = Image.open(src).convert("RGB")
    d = ImageDraw.Draw(im)
    fp = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font = ImageFont.truetype(fp, 26) if Path(fp).exists() else ImageFont.load_default()
    d.rectangle([0, 0, 150, 40], fill="black")
    d.text((10, 6), code, fill="white", font=font)
    im.save(dst, quality=92)


def grab(video, t, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-vframes", "1",
                    "-vf", "scale=1280:720", str(dst)], check=True)


def inspect_batch(batch):
    """batch: list of dicts with file/path/code. Returns {file: [issues]} for frames the model really read."""
    files = "\n".join(f"- {b['file']}: {b['path']}" for b in batch)
    prompt = INSPECT.format(files=files, checklist="\n".join(f"- {k}: {v}" for k, v in ISSUES.items()),
                            types="|".join(ISSUES))
    try:
        text, _ = qa.claude_cli(prompt, effort="medium", timeout=420)
    except qa.CliError as e:
        return {}, str(e)
    rep = qa.extract_json(text) or {}
    if not rep.get("frames"):
        print(f"  unparseable review reply: {text[:300]!r}", file=sys.stderr)
    by_code = {b["code"]: b for b in batch}  # the badge code identifies the frame (and proves it was read)
    out = {}
    for f in rep.get("frames", []):
        b = by_code.get(str(f.get("code", "")).strip().upper())
        if not b:
            print(f"  unknown badge code {f.get('code')!r} for {f.get('file')!r}; will retry", file=sys.stderr)
            continue  # unread or misread frame: it will be retried
        out[b["file"]] = [i for i in f.get("issues", []) if isinstance(i, dict) and i.get("type") in ISSUES]
    return out, None


def verify(frame, issue):
    """Re-inspect the frame alone with the same checklist; confirmed if the same issue type shows up again.
    (Calibration: an "is this a problem?" verifier rejected true defects 2 out of 3 times; a repeat
    inspection keeps the inspector's 0 false alarms on good frames while confirming real ones.)"""
    for _ in range(2):
        code = "".join(random.choices(CODE_CHARS, k=5))
        p = Path(frame["path"]).with_name(f"v{code}_{frame['file']}")
        stamp(frame["raw"], p, code)
        got, err = inspect_batch([{"file": frame["file"], "path": str(p), "code": code}])
        if err or frame["file"] not in got:
            continue
        same = [i for i in got[frame["file"]] if i["type"] == issue["type"]]
        return bool(same), (same[0].get("note", "") if same else "not seen on re-inspection")
    return True, "re-inspection unavailable; kept"


def is_blank(path):
    """Plain background only: almost no luminance spread (deterministic, no model)."""
    g = Image.open(path).convert("L").resize((320, 180))
    lo, hi = g.getextrema()
    return hi - lo < 25


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vid")
    ap.add_argument("--aspect", default="16x9")
    ap.add_argument("--parallel", type=int, default=3)
    a = ap.parse_args()
    vid = a.vid
    script = json.loads((MC / "production" / vid / "script.json").read_text())
    reg = json.loads((REPO / "projects" / "projects_config.json").read_text())
    entry = next((p for p in reg["projects"].values() if p.get("id") == vid), None)
    if not entry:
        sys.exit(f"{vid} not in projects_config.json")
    video = REPO / "projects" / entry["dirName"] / f"video_{a.aspect}.mp4"
    if not video.exists():
        sys.exit(f"missing {video}; render first")

    shots = shots_for(vid)
    tmp = Path(tempfile.mkdtemp(prefix="v2review_"))
    keep = MC / "production" / vid / "review_frames"
    keep.mkdir(exist_ok=True)
    frames = []
    try:
        for s in shots:
            if s["start"] is None or s["end"] is None:
                continue
            t = max(s["start"] + 0.2, s["end"] - 0.4)
            name = f"{s['chapter']}_{s['n']:02d}.jpg"
            raw = keep / name
            grab(video, t, raw)
            code = "".join(random.choices(CODE_CHARS, k=5))
            path = tmp / f"{code}_{name}"
            stamp(raw, path, code)
            frames.append({"file": name, "path": str(path), "raw": str(raw), "code": code, "t": round(t, 2), "shot": s})

        results, todo = {}, list(frames)
        for _round in range(3):  # frames the model skipped get retried in a later round
            batches = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)]
            with cf.ThreadPoolExecutor(max_workers=a.parallel) as ex:
                for got, err in ex.map(inspect_batch, batches):
                    if err:
                        print(f"  batch failed: {err}", file=sys.stderr)
                    results.update(got)
            todo = [f for f in frames if f["file"] not in results]
            if not todo:
                break
        unread = [f["file"] for f in todo]

        confirmed = []
        for f in frames:
            if is_blank(f["raw"]):
                confirmed.append({"frame": f["file"], "time": f["t"], "chapter": f["shot"]["chapter"],
                                  "shot": f["shot"]["n"], "type": "blank_stage", "note": "plain background only",
                                  "verifier": "pixel check", "fix": FIX["blank_stage"]})
        jobs = [(f, i) for f in frames for i in results.get(f["file"], [])]
        with cf.ThreadPoolExecutor(max_workers=a.parallel) as ex:
            for (f, issue), (ok, why) in zip(jobs, ex.map(lambda j: verify(j[0], j[1]), jobs)):
                rec = {"frame": f["file"], "time": f["t"], "chapter": f["shot"]["chapter"], "shot": f["shot"]["n"],
                       **issue, "verifier": why, "fix": FIX[issue["type"]]}
                if ok:
                    confirmed.append(rec)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    report = {"video_id": vid, "model": qa.QA_MODEL, "frames": len(frames), "unread": unread,
              "reported": sum(len(v) for v in results.values()), "confirmed": confirmed,
              "pass": not confirmed and not unread}
    (MC / "production" / vid / "frame_review.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"[review] {len(frames)} frames, {report['reported']} reported, {len(confirmed)} confirmed"
          + (f", {len(unread)} never read: {', '.join(unread)}" if unread else ""))
    for c in confirmed:
        print(f"  - {c['chapter']} shot {c['shot']} ({c['time']}s, {keep.name}/{c['frame']}): "
              f"{c['type']}: {c.get('note', '')}\n      fix: {c['fix']}")
    sys.exit(0 if report["pass"] else 1)


if __name__ == "__main__":
    main()
