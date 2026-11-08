#!/usr/bin/env python3
"""v2 episode image generation with QA loop.

    generate_assets.py --id vid_YYYYMMDD_NNN [--only id1,id2] [--force] [--parallel 3]

Reads  production/<id>/assets_manifest.json
  {"style_notes": "episode theme",
   "characters": [{"id": "owner", "prompt": "..."}],
   "images": [{"id": "ch01_a", "prompt": "scene brief only", "uses": ["owner"],
               "brief": "what must be visible", "mode": "full|side"}]}
Writes public/assets/<id>/<image id>.png (full 2K, one image per request, never grids),
       public/assets/<id>/char_<character id>.png (reference sheets, QA'd),
       production/<id>/asset_qa.json  (full attempt history, auditable).

Loop per image: generate -> qa_image -> on fail the Sonnet director rewrites the scene
prompt (simplify) -> retry. Up to 4 attempts, all on gemini-3.1-flash-lite-image (Nano Banana 2 Lite).
After that the image is marked failed, the best attempt is kept, and the run exits 1.
"""
import argparse
import base64
import faulthandler
import signal
import concurrent.futures as cf
import hashlib
import io
import json
import os
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qa_image as qa  # noqa: E402
import icons as iconsets  # noqa: E402
import keys  # noqa: E402

from PIL import Image  # noqa: E402

MC = HERE.parents[1]  # motion-canvas/
REPO = MC.parent
ENV_PATH = REPO / ".env"
# Nano Banana 2 Lite only (user decision 2026-11-08: cost). No escalation to Pro; PRO kept as an alias
# so callers that "escalate" stay on the same model.
FLASH = "models/gemini-3.1-flash-lite-image"
PRO = FLASH
DIRECTOR_MODEL = os.environ.get("AINIMATE_DIRECTOR_MODEL", "claude-sonnet-5-5")
FLASH_ATTEMPTS = 4
TOTAL_ATTEMPTS = 4
API = "https://generativelanguage.googleapis.com/v1beta"

# ---------------------------------------------------------------- prompt system
STYLE = (
    "Flat 2D Indonesian webtoon illustration. Confident, uniform-weight dark ink outlines on every shape. "
    "Two-tone cel shading only (one base tone and one shadow tone per surface), no gradients, no soft airbrush, "
    "no texture noise. Warm palette: cream, amber, terracotta, warm brown skin tones, emerald green and slate, "
    "with one accent colour. Authentic Indonesian everyday settings and details (batik patterns, ruko and warung "
    "interiors, tropical plants, plastic stools, wooden furniture, motorbikes) as the story calls for. "
    "Expressive but simple faces: two symmetrical eyes, a small nose, a clear mouth. Wide 16:9 frame."
)

COMPOSITION = (
    "COMPOSITION RULES: "
    "1) At most 4 people with visible faces. No crowds: a busy place is suggested with empty chairs, empty tables, "
    "a few faceless silhouettes, or objects, never with many people. "
    "2) One main subject, large in the frame, simple background with few props. "
    "3) Faces large enough to read clearly (each face at least 8 percent of the image height). "
    "4) Hands are simplified, or tucked out of frame, behind objects, under the table or in pockets whenever "
    "possible; if a hand shows, it is large, clearly drawn with five fingers. "
    "5) Mahjong tiles, when needed, are few (a short neat row of at most 6), large, blank-faced ivory blocks with a "
    "visible gap between each; never piles, heaps or scattered handfuls. "
    "6) No mechanical cutaways, machine interiors, gears, pipes or technical diagrams. "
    "7) The scene itself continues all the way to the bottom edge (table top, floor or wall seen in the same "
    "perspective), and that lowest fifth holds no faces and no key objects. Never a flat colour band, stripe, "
    "bar or empty strip at the bottom. "
    "8) Full-bleed picture that runs to every edge, no borders."
)

SIDE_RULE = (
    "PORTRAIT-CROP SAFETY: the main subject and every face sit within the central 45 percent of the frame width, "
    "because the image will later be cropped to a tall portrait strip. Left and right thirds hold only simple "
    "background."
)

AVOID = (
    "AVOID (must not appear): melted, smeared or asymmetric faces, mismatched eyes, extra or fused fingers, extra "
    "limbs, merged or touching objects, blobs, any text, letters, numbers, signs with writing, logos, watermarks, "
    "symbols that look like writing, marks or glyphs on tiles, scratches shaped like letters, panel borders, "
    "frames, gutters, black edge lines, cream bands, vignettes, 3D render, photorealism, isometric view, "
    "gradients, lens blur, crowds."
)

SHEET_RULE = (
    "Character reference sheet on a plain warm cream background: the SAME single character drawn twice, side by "
    "side. Left: full-body standing front view. Right: large head-and-shoulders close-up, friendly neutral "
    "expression. Exactly one person, shown twice. No labels, no swatches, no turnaround grid, no props held in "
    "the hands, hands relaxed by the sides or simply drawn. "
)


def full_prompt(style_notes, scene, mode="full", has_refs=False, ref_names=(), sheet=False):
    parts = []
    if sheet:
        parts.append(SHEET_RULE + "CHARACTER: " + scene)
    else:
        parts.append("SCENE: " + scene.strip())
    if has_refs:
        parts.append(
            "CONSISTENCY: the attached reference image(s) show the recurring character(s) "
            + ", ".join(ref_names)
            + ". Draw the same person in this scene with the same face, hair, skin tone and clothes."
        )
    parts.append("STYLE: " + STYLE + (" Episode theme: " + style_notes.strip() if style_notes else ""))
    if not sheet:
        parts.append(COMPOSITION)
        if mode == "side":
            parts.append(SIDE_RULE)
    parts.append(AVOID)
    return "\n\n".join(parts)


# ------------------------------------------------------------------- Gemini API
def load_api_key():
    """Paid image key only (GEMINI_IMAGE_KEY, else NANO_BANANA_API_KEY). Never the audio keys."""
    return keys.api_key("image")


_KEY = None


def gemini_image(model, prompt, refs=(), aspect="16:9", size="2K", timeout=120, retries=3):
    """One image per request. refs = list of PNG/JPEG bytes. Returns (PIL.Image RGB, seconds).
    Raises GenError on blocked/empty/failed output."""
    global _KEY
    if _KEY is None:
        _KEY = load_api_key()
    parts = [{"inlineData": {"mimeType": "image/png", "data": base64.b64encode(b).decode()}} for b in refs]
    parts.append({"text": prompt})
    cfg = {"aspectRatio": aspect}
    if size:
        cfg["imageSize"] = size
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": cfg}}
    req = urllib.request.Request(f"{API}/{model}:generateContent", json.dumps(body).encode(),
                                 {"Content-Type": "application/json", "x-goog-api-key": _KEY})
    last = None
    for attempt in range(retries):
        t0 = time.time()
        try:
            d = json.load(urllib.request.urlopen(req, timeout=timeout))
            for c in d.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    if "inlineData" in p:
                        im = Image.open(io.BytesIO(base64.b64decode(p["inlineData"]["data"]))).convert("RGB")
                        return im, time.time() - t0
            last = GenError("no image returned: " + json.dumps(d.get("promptFeedback") or
                            [c.get("finishReason") for c in d.get("candidates", [])])[:200])
            time.sleep(2)
        except urllib.error.HTTPError as e:
            msg = e.read()[:200].decode("utf8", "replace")
            last = GenError(f"HTTP {e.code}: {msg}")
            if e.code == 400 and "imageSize" in json.dumps(body) and ("size" in msg.lower() or "imageconfig" in msg.lower()):
                body["generationConfig"]["imageConfig"].pop("imageSize", None)  # model has no size option
                req = urllib.request.Request(f"{API}/{model}:generateContent", json.dumps(body).encode(),
                                             {"Content-Type": "application/json", "x-goog-api-key": _KEY})
                continue
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(5 * (attempt + 1))
            else:
                break
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last = GenError(f"network: {type(e).__name__}")
            time.sleep(4 * (attempt + 1))
    raise last or GenError("generation failed")


class GenError(RuntimeError):
    pass


# ---------------------------------------------------------------- asset_qa.json
_QA_LOCK = threading.Lock()


def qa_json_path(vid):
    return MC / "production" / vid / "asset_qa.json"


def qa_update(vid, section, key, value):
    """Atomic read-modify-write of asset_qa.json (merges with whatever is on disk)."""
    with _QA_LOCK:
        p = qa_json_path(vid)
        try:
            d = json.loads(p.read_text())
        except (OSError, json.JSONDecodeError):
            d = {}
        d.setdefault("images", {})
        d.setdefault("characters", {})
        if key is None:
            d[section] = value
        else:
            d.setdefault(section, {})[key] = value
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(d, indent=2, ensure_ascii=False))
        os.replace(tmp, p)


def qa_read(vid):
    try:
        return json.loads(qa_json_path(vid).read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def spec_hash(*items):
    return hashlib.sha256(json.dumps(items, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


# --------------------------------------------------------------------- director
DIRECTOR_PROMPT = """You are the art director for a flat 2D Indonesian webtoon YouTube series. An image generator (Gemini) produced an image from your scene prompt, but automated QA found defects. Rewrite ONLY the scene prompt so the next attempt avoids them.

Rules for the rewrite:
- Keep the story intent and everything the BRIEF says must be visible.
- SIMPLIFY the composition: fewer people (1 to 3 where the brief allows), closer framing, larger faces, hands tucked out of frame or hidden behind objects/table edges, fewer and larger props, simpler background, empty chairs or silhouettes instead of crowds.
- Remove whatever keeps breaking (for example: loose tile piles become a short row of 3 to 5 large blank tiles; mechanical or cutaway views become a plain table or a person looking at a simple object; scratches or markings become plain surfaces; anything resembling text is removed).
- Keep the lower fifth of the picture plain.
- Do NOT repeat style or avoid-lists (they are added automatically). Describe only what is in the scene, in 2 to 5 plain sentences, positive wording ("a plain green table"), no negations.
{mode_line}
{kind_line}
BRIEF (must be visible): {brief}
PREVIOUS SCENE PROMPT: {prompt}
PREVIOUS ATTEMPTS AND THEIR CONFIRMED DEFECTS:
{history}

Reply with ONLY one JSON object: {{"scene_prompt": "the rewritten prompt", "changes": "one sentence on what you simplified"}}"""


def director_rewrite(prompt, brief, history, mode, sheet=False):
    hist = "\n".join(
        f"- attempt {h['attempt']} ({h['model'].split('/')[-1]}): "
        + ("; ".join(f"[{d['type']}] {d['description']}" for d in h.get("defects", [])) or h.get("error", "no detail"))
        for h in history[-3:]
    )
    p = DIRECTOR_PROMPT.format(
        brief=brief or "(none)", prompt=prompt, history=hist,
        mode_line=("The picture will later be cropped to a tall strip: keep subject and faces centred." if mode == "side" else ""),
        kind_line=("This is a single CHARACTER description for a reference sheet; return a simpler, clearer character description (no props)." if sheet else ""),
    )
    try:
        text, _ = qa.claude_cli(p, model=DIRECTOR_MODEL, tools=None, effort="low", timeout=240)
        r = qa.extract_json(text)
        if isinstance(r, dict) and isinstance(r.get("scene_prompt"), str) and len(r["scene_prompt"]) > 20:
            return r["scene_prompt"].strip(), str(r.get("changes", ""))[:200]
    except Exception as e:  # fall through to deterministic fallback
        err = str(e)[:100]
    else:
        err = "unparseable"
    return (prompt + " Simplify: one or two people only, close framing, hands hidden behind the table edge, "
            "at most three large blank tiles, plain background."), f"fallback (director {err})"


# ------------------------------------------------------------------ generation loop
def run_item(vid, item, style_notes, kind, ref_bytes=(), ref_names=(), outdir=None, log=print):
    """kind = 'image' | 'sheet'. Returns the asset_qa entry."""
    iid = item["id"]
    sheet = kind == "sheet"
    mode = item.get("mode", "full")
    brief = item.get("brief") or ("clean character reference sheet: " + item["prompt"] if sheet else "")
    scene = item["prompt"]
    fname = f"char_{iid}.png" if sheet else f"{iid}.png"
    outpath = Path(outdir) / fname
    history = []
    best = None  # (score, bytes, entry-bits)
    sh = spec_hash(item, style_notes, [qa.sha256_file(p) if os.path.exists(p) else "" for p in item.get("_ref_paths", [])])
    t_start = time.time()
    for n in range(1, TOTAL_ATTEMPTS + 1):
        model = FLASH if n <= FLASH_ATTEMPTS else PRO
        prompt = full_prompt(style_notes, scene, mode, bool(ref_bytes), ref_names, sheet)
        rec = {"attempt": n, "model": model, "scene_prompt": scene, "full_prompt": prompt}
        try:
            im, gsec = gemini_image(model, prompt, ref_bytes, aspect="16:9", size="2K")
            rec["gen_seconds"] = round(gsec, 1)
            log(f"  [{iid}] attempt {n} generated {im.size[0]}x{im.size[1]} in {gsec:.0f}s, running QA")
        except Exception as e:
            rec.update({"error": f"generation failed: {e}", "pass": False, "defects": []})
            history.append(rec)
            log(f"  [{iid}] attempt {n} ({model.split('/')[-1]}): generation error: {str(e)[:120]}")
            if n < TOTAL_ATTEMPTS:
                time.sleep(3)
            continue
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False, dir=tempfile.gettempdir()) as tf:
            tmp_path = tf.name
        im.save(tmp_path, optimize=False)
        t_qa = time.time()
        r = qa.qa_image(tmp_path, brief, kind="sheet" if sheet else "scene")
        rec["qa_seconds"] = round(time.time() - t_qa, 1)
        rec.update({"pass": r["pass"], "defects": r["defects"], "qa_reason": r.get("reason"),
                    "faces_checked": r["faces_checked"], "hands_checked": r["hands_checked"],
                    "sha256": r["sha256"], "size": list(im.size)})
        history.append(rec)
        score = (0 if r["pass"] else 1 + len(r["defects"]))
        data = Path(tmp_path).read_bytes()
        os.unlink(tmp_path)
        if best is None or score < best[0]:
            best = (score, data, n, r)
        log(f"  [{iid}] attempt {n} ({model.split('/')[-1]}) gen {rec['gen_seconds']}s qa {rec['qa_seconds']}s: "
            + ("PASS" if r["pass"] else "FAIL " + (", ".join(d["type"] for d in r["defects"]) or str(r.get("reason")))))
        if r["pass"]:
            break
        # QA infrastructure failure (no defects listed): retry same prompt, don't ask director
        if n < TOTAL_ATTEMPTS:
            if r["defects"]:
                scene, changes = director_rewrite(scene, brief, history, mode, sheet)
                rec["director_changes"] = changes
            else:
                rec["director_changes"] = "none (QA error, same prompt)"
    entry = {"file": fname, "pass": False, "qa_model": qa.QA_MODEL, "sha256": None,
             "attempts": len(history), "model": None, "final_prompt": None, "defects": [],
             "spec_hash": sh, "seconds": round(time.time() - t_start), "history": history}
    if best:
        _, data, bn, br = best
        outpath.parent.mkdir(parents=True, exist_ok=True)
        outpath.write_bytes(data)
        b = history[bn - 1]
        entry.update({"pass": br["pass"], "sha256": hashlib.sha256(data).hexdigest(), "model": b["model"],
                      "final_prompt": b["full_prompt"], "defects": br["defects"], "best_attempt": bn})
        if not br["pass"]:
            entry["failure_reason"] = br.get("reason")
    else:
        entry["failure_reason"] = "no image could be generated"
    return entry


def update_focus(vid, images, outdir, parallel, log):
    """3. Focal point per passing image (Haiku), so side cards crop on the subject.
    Cached in asset_qa.json by image sha256; image_focus.json (file -> x) is what the engine reads."""
    prior = qa_read(vid).get("images", {})

    def one(im):
        iid, f = im["id"], outdir / f"{im['id']}.png"
        e = prior.get(iid) or {}
        if not (e.get("pass") and f.exists()):
            return
        sha = qa.sha256_file(f)
        if (e.get("focus") or {}).get("sha256") == sha:
            return
        r = qa.focal_point(f, im.get("brief") or im.get("prompt"))
        if r is None:
            log(f"[{iid}] focal point: no trustworthy answer, side card stays centred")
            return
        r["sha256"] = sha
        qa_update(vid, "images", iid, {**qa_read(vid)["images"][iid], "focus": r})
        log(f"[{iid}] focal point x={r['x']} ({r['subject']})")

    with cf.ThreadPoolExecutor(max_workers=parallel) as ex:
        list(ex.map(one, images))
    focus = {f"{k}.png": v["focus"]["x"] for k, v in sorted(qa_read(vid).get("images", {}).items())
             if (v.get("focus") or {}).get("x") is not None}
    out = MC / "production" / vid / "image_focus.json"
    out.write_text(json.dumps(focus, indent=2) + "\n")
    log(f"focal points: {len(focus)} images -> {out}")
    return 0


def main():
    faulthandler.register(signal.SIGUSR1, all_threads=True)  # kill -USR1 <pid> dumps stacks to stderr
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True)
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--parallel", type=int, default=3)
    ap.add_argument("--focus-only", action="store_true",
                    help="skip generation; only (re)compute Haiku focal points for passing images")
    a = ap.parse_args()
    vid = a.id
    prod = MC / "production" / vid
    outdir = MC / "public" / "assets" / vid
    man = json.loads((prod / "assets_manifest.json").read_text())
    style_notes = man.get("style_notes", "")
    chars = {c["id"]: c for c in man.get("characters", [])}
    images = man.get("images", [])
    only = set(a.only.split(",")) if a.only else None
    if only:
        unknown = (only - {i["id"] for i in images} - set(chars) - {"char_" + c for c in chars}
                   - {s["id"] for s in man.get("icon_sets", [])})
        if unknown:
            print("unknown ids in --only:", ", ".join(sorted(unknown)), file=sys.stderr)
            return 2
    outdir.mkdir(parents=True, exist_ok=True)
    lock = threading.Lock()

    def log(m):
        with lock:
            print(m, flush=True)

    prior = qa_read(vid)

    def up_to_date(section, iid, fname, sh):
        e = prior.get(section, {}).get(iid)
        f = outdir / fname
        return bool(e and e.get("pass") and f.exists() and e.get("sha256") == qa.sha256_file(f)
                    and e.get("spec_hash") == sh)

    failures = []
    # which characters are needed?
    needed = set()
    todo_imgs = []
    for im in images:
        if only and im["id"] not in only:
            continue
        todo_imgs.append(im)
        needed.update(im.get("uses", []))
    for cid in chars:
        if only and (cid in only or "char_" + cid in only):
            needed.add(cid)
    missing = needed - set(chars)
    if missing:
        print("manifest images reference unknown characters:", ", ".join(sorted(missing)), file=sys.stderr)
        return 2

    if a.focus_only:
        return update_focus(vid, todo_imgs, outdir, a.parallel, log)

    # 1. character reference sheets
    def do_char(cid):
        c = dict(chars[cid])
        c["mode"] = "full"
        sh = spec_hash(c, style_notes)
        fname = f"char_{cid}.png"
        if not a.force and up_to_date("characters", cid, fname, sh):
            log(f"[char {cid}] up to date, skipped")
            return cid, prior["characters"][cid]
        log(f"[char {cid}] generating reference sheet")
        e = run_item(vid, c, style_notes, "sheet", outdir=outdir, log=log)
        e["spec_hash"] = sh
        qa_update(vid, "characters", cid, e)
        return cid, e

    char_results = {}
    with cf.ThreadPoolExecutor(max_workers=a.parallel) as ex:
        for cid, e in ex.map(do_char, sorted(needed)):
            char_results[cid] = e
            if not e.get("pass"):
                failures.append(f"character {cid}: {e.get('failure_reason')}")

    # 2. scene images
    def do_img(im):
        iid = im["id"]
        uses = im.get("uses", [])
        ref_paths = [outdir / f"char_{u}.png" for u in uses if (outdir / f"char_{u}.png").exists()]
        item = dict(im)
        item["_ref_paths"] = [str(p) for p in ref_paths]
        sh = spec_hash({k: v for k, v in im.items()}, style_notes,
                       [qa.sha256_file(p) for p in ref_paths])
        # run_item recomputes the same hash from item; keep ours authoritative
        if not a.force and up_to_date("images", iid, f"{iid}.png", sh):
            log(f"[{iid}] up to date, skipped")
            return iid, None
        log(f"[{iid}] generating (mode={im.get('mode', 'full')}, uses={uses})")
        refs = [p.read_bytes() for p in ref_paths]
        e = run_item(vid, item, style_notes, "image", refs, [chars[u]["id"] for u in uses if u in chars],
                     outdir=outdir, log=log)
        e["spec_hash"] = sh
        qa_update(vid, "images", iid, e)
        return iid, e

    results = {}
    with cf.ThreadPoolExecutor(max_workers=a.parallel) as ex:
        for iid, e in ex.map(do_img, todo_imgs):
            if e is None:
                continue
            results[iid] = e
            if not e.get("pass"):
                failures.append(f"image {iid}: {e.get('failure_reason')} "
                                f"[{', '.join(d['type'] for d in e.get('defects', []))}]")

    # 2b. icon sets: several small icons per image call (see icons.py)
    for iset in man.get("icon_sets", []):
        if only and iset["id"] not in only:
            continue
        sh = spec_hash(iconsets.spec_of(iset, style_notes))
        e = prior.get("icon_sets", {}).get(iset["id"])
        fresh = bool(e and e.get("pass") and e.get("spec_hash") == sh and all(
            (outdir / v["file"]).exists() and qa.sha256_file(outdir / v["file"]) == v.get("sha256")
            for v in e.get("icons", {}).values() if v.get("file")))
        if fresh and not a.force:
            log(f"[icons {iset['id']}] up to date, skipped")
            continue
        log(f"[icons {iset['id']}] generating {len(iset['icons'])} icons in one image")
        rec = iconsets.run_set(iset, outdir, style_notes, gemini_image, FLASH, PRO, log)
        rec["spec_hash"] = sh
        qa_update(vid, "icon_sets", iset["id"], rec)
        if not rec["pass"]:
            bad = [f"{k} ({v['reason']})" for k, v in rec["icons"].items() if not v["pass"]]
            failures.append(f"icon set {iset['id']}: {', '.join(bad)}")

    update_focus(vid, todo_imgs, outdir, a.parallel, log)
    n_ok = sum(1 for e in results.values() if e.get("pass"))
    print(f"\ndone: {n_ok}/{len(results)} generated images pass; asset_qa.json at {qa_json_path(vid)}")
    if failures:
        print("FAILED (best attempt kept on disk):")
        for f in failures:
            print("  -", f)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
