#!/usr/bin/env python3
"""v2 image QA: multi-crop Haiku Inspector + independent Haiku Verifier.

    qa_image.py <path> [--brief "what the image should show"] [--json-only]
    qa_image.py --calibrate

Pipeline
  a. crops: full image (<=1568px wide), 3x2 overlapping zoom tiles, bottom strip,
     and a canary card with a random code (proves the model really Read the images).
  b. Inspector (claude haiku via local CLI, Read tool) itemizes every face and
     hand, tiles, plausibility, then lists defects with crop + location.
  c. Each defect goes to an independent Verifier that sees ONLY the implicated
     crop and must confirm or reject. Reject only when clearly wrong.
     A confirmed defect = FAIL.

Any CLI failure, unparseable output, missing canary or unreadable file is a FAIL
with a reason, never a pass.

Output: {pass, defects[], faces_checked, hands_checked, qa_model, sha256, ...}
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import random
import re
import shutil
import string
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

QA_MODEL = os.environ.get("AINIMATE_QA_MODEL", "claude-haiku-5-5")
QA_EFFORT = os.environ.get("AINIMATE_QA_EFFORT", "medium")
CLI_TIMEOUT = 420
REPO_ROOT = Path(__file__).resolve().parents[3]

BAD_IMAGES = [
    "motion-canvas/public/assets/vid_20261102_001/ch02_p1.png",
    "motion-canvas/public/assets/vid_20261102_001/ch02_p2.png",
    "motion-canvas/public/assets/vid_20261102_001/ch05_p2.png",
    "motion-canvas/public/assets/vid_20261102_001/ch01_p4.png",
]
GOOD_DIR = Path(
    "/tmp/claude-1000/-home-agent-orca-AI-nimate/38609562-213e-4d4e-9f0f-73719d2681ef/scratchpad/bake"
)
GOOD_IMAGES = [str(GOOD_DIR / n) for n in ("flash2k_players.png", "flash2k_tiles.png", "lite_players.png")]

DEFECT_TYPES = [
    "face_melted_or_asymmetric",   # features melted, asymmetric, unreadable, doubled
    "hand_defect",                 # fused/extra/missing fingers, impossible anatomy
    "tiles_merged",                # mahjong tiles merging, piles, mush, non-rectangular
    "nonsense_object",             # objects that do not make physical sense, blobs
    "baked_text",                  # letters, numbers, watermarks, logos, symbols that look like text
    "border_or_gutter",            # panel borders, frames, gutters, vignettes with edges
    "style_mismatch",              # 3D, photo, isometric/technical cutaway instead of flat 2D comic
    "crowd",                       # more than 4 people with visible faces
    "brief_mismatch",              # does not show what the brief says
    "subtitle_zone",               # important subject/detail in lower 20%
    "other",
]

FLASH_NOTE = ""


# --------------------------------------------------------------------------- CLI
class CliError(RuntimeError):
    pass


def claude_cli(prompt, model=QA_MODEL, tools="Read", cwd=None, effort=None, timeout=CLI_TIMEOUT, retries=2):
    """Run `claude -p` in a neutral cwd and return (result_text, meta).

    Exact invocation:
      claude -p --model <m> --tools Read --allowedTools Read --output-format json
             --no-session-persistence --strict-mcp-config --disable-slash-commands
             --setting-sources "" --effort <e>   (prompt on stdin)
    """
    own_cwd = None
    if cwd is None:
        own_cwd = tempfile.mkdtemp(prefix="v2cli_")
        cwd = own_cwd
    cmd = ["claude", "-p", "--model", model, "--output-format", "json",
           "--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands",
           "--setting-sources", "", "--effort", effort or QA_EFFORT]
    if tools:
        cmd += ["--tools", tools, "--allowedTools", tools]
    else:
        cmd += ["--tools", ""]
    last = None
    try:
        for attempt in range(retries + 1):
            try:
                p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, cwd=cwd, timeout=timeout)
                if p.returncode != 0:
                    last = CliError(f"claude exit {p.returncode}: {p.stderr[:300] or p.stdout[:300]}")
                    time.sleep(2 + attempt * 3)
                    continue
                d = json.loads(p.stdout)
                if d.get("is_error"):
                    last = CliError(f"claude error: {str(d.get('result'))[:300]}")
                    time.sleep(2 + attempt * 3)
                    continue
                return d.get("result") or "", {
                    "cost": d.get("total_cost_usd"), "ms": d.get("duration_ms"), "turns": d.get("num_turns"),
                }
            except subprocess.TimeoutExpired:
                last = CliError(f"claude timeout after {timeout}s")
            except json.JSONDecodeError as e:
                last = CliError(f"claude output not JSON: {e}")
        raise last or CliError("claude failed")
    finally:
        if own_cwd:
            shutil.rmtree(own_cwd, ignore_errors=True)


def extract_json(text):
    """Pull the last balanced top-level JSON object out of a model reply."""
    if not text:
        return None
    t = re.sub(r"```(?:json)?", "", text)
    best = None
    depth = 0
    start = None
    in_str = False
    esc = False
    for i, ch in enumerate(t):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}" and depth:
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    best = json.loads(t[start:i + 1])
                except json.JSONDecodeError:
                    pass
    return best


# ------------------------------------------------------------------------ crops
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _canary(path, code):
    im = Image.new("RGB", (640, 200), "white")
    d = ImageDraw.Draw(im)
    font = None
    for fp in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        if os.path.exists(fp):
            font = ImageFont.truetype(fp, 120)
    d.text((40, 30), code, fill="black", font=font or ImageFont.load_default())
    im.save(path)


def build_crops(src, outdir):
    """Return (list of (name, path, description), canary_code)."""
    im = Image.open(src)
    im.load()
    im = im.convert("RGB")
    W, H = im.size
    if W < 64 or H < 64:
        raise ValueError(f"image too small: {W}x{H}")
    crops = []
    tag = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))

    full = im if W <= 1568 else im.resize((1568, round(H * 1568 / W)), Image.LANCZOS)
    p = Path(outdir) / f"full_{tag}.png"
    full.save(p)
    crops.append(("full", str(p), "whole image downsized"))

    # 3x2 overlapping tiles (about 40% wide, 60% tall each, 20% overlap)
    tw, th = round(W * 0.4), round(H * 0.6)
    xs = [0, (W - tw) // 2, W - tw]
    ys = [0, H - th]
    for r, y in enumerate(ys):
        for c, x in enumerate(xs):
            t = im.crop((x, y, x + tw, y + th))
            if t.width < 1000:  # zoom small tiles so detail is legible
                s = 1000 / t.width
                t = t.resize((1000, round(t.height * s)), Image.LANCZOS)
            name = f"tile_r{r + 1}c{c + 1}"
            p = Path(outdir) / f"{name}_{tag}.png"
            t.save(p)
            crops.append((name, str(p), f"zoom tile row {r + 1} col {c + 1} (row 1 = top)"))

    bh = round(H * 0.2)
    strip = im.crop((0, H - bh, W, H))
    if strip.width > 1568:
        strip = strip.resize((1568, round(strip.height * 1568 / strip.width)), Image.LANCZOS)
    p = Path(outdir) / f"bottom20_{tag}.png"
    strip.save(p)
    crops.append(("bottom20", str(p), "lower 20% strip (subtitle zone)"))

    code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=5))
    p = Path(outdir) / f"canary_{tag}.png"
    _canary(p, code)
    crops.append(("canary", str(p), "QA marker card, ignore for defects"))
    return crops, code


# ---------------------------------------------------------------------- prompts
INSPECTOR_PROMPT = """You are a strict QA inspector for flat 2D Indonesian webtoon-style YouTube video illustrations. You must look at EVERY image file listed below using the Read tool (read all of them, they are all different crops of the same picture). Do not guess: base every statement on what you actually see in the crops.

Files (absolute paths):
{files}

Crop guide: "full" = whole picture. tile_r1c1..tile_r2c3 = zoomed, overlapping crops (row 1 top, row 2 bottom; col 1 left .. col 3 right). "bottom20" = lowest 20% strip, where video subtitles will sit. "canary" = a QA marker card with a code; just read the code aloud in "canary_code", never list it as a defect.

BRIEF (what the image should show): {brief}
{kind_note}

Checks, performed per crop at its zoom level. Be critical. A false PASS is much worse than a false FAIL.
1. FACES: itemize EVERY face you see (each person with a visible face, in each tile where it appears, once per tile is fine). For each give verdict "ok" or "defect". Defect if features are melted, smeared, asymmetric (eyes different size/height, doubled nose or mouth), unreadable, or uncanny at this zoom. Tiny background faces that are only a few pixels with no features count as "background" and are a "crowd" problem if more than 4 people in total have visible faces.
2. HANDS: itemize EVERY hand you see. Count the fingers you can actually see on each. Defect ONLY if you can positively see a flaw: fused fingers, an extra or missing finger, impossibly bent fingers, a clearly wrong-sized hand, a hand melting into an object, or two hands tangled together. A hand that is partly hidden behind a tile, sleeve or object is NOT a defect (use verdict "ok" and say "partly hidden"): never report a defect because a finger count "cannot be verified".
3. TILES / SMALL OBJECTS: mahjong tiles (or any repeated small objects) should be separate rectangular blocks, ideally blank faced. Defect if tiles merge into mush (outlines dissolve, you cannot count them), form loose piles or heaps, show garbled or illegible glyphs, melt into each other or have impossible geometry. Tiles standing side by side that touch or nearly touch, but each still has its own clean outline and can be counted, are fine.
4. PHYSICAL PLAUSIBILITY: nonsense objects, blobs, objects fused to people or tables, furniture that cannot exist, limbs that do not connect, mechanical or technical cutaway interiors.
5. BAKED TEXT: any letters, numbers, glyphs resembling writing, logos, watermarks, signs with writing, mahjong characters that read as writing.
6. BORDERS: panel borders, frames, outlines around the image, gutters, thin black edge lines, a vignette that looks like a frame.
7. STYLE: must be flat 2D comic or webtoon with confident ink lines and cel shading. Defect if it looks 3D rendered, photographic, isometric or like a technical diagram.
8. CROWD: more than 4 people with visible faces is a defect.
9. BRIEF: the picture must show what the brief says. If the brief is "(none given)" skip this check.
10. SUBTITLE ZONE: faces and the main focal subject must stay out of the lower 20% (bottom20 crop). It is fine for table surface, floor, furniture, torsos, sleeves, arms or the bottom edge of objects to extend into that zone. Only report it when a face or the single key focal object (for example the one hero prop) is mostly inside the lower 20%, or the zone is busy with sharp detail.

Reply with ONLY one JSON object, no prose before or after, in exactly this shape:
{{
  "canary_code": "the code you read in the canary crop",
  "crops_seen": ["names of the crops you actually read"],
  "people_with_visible_faces": 0,
  "faces": [{{"crop": "tile_r1c2", "where": "left man", "verdict": "ok|defect", "note": "short"}}],
  "hands": [{{"crop": "tile_r2c1", "where": "right hand holding tile", "fingers": 5, "verdict": "ok|defect", "note": "short"}}],
  "tiles": {{"present": true, "verdict": "ok|defect|none", "note": "short"}},
  "plausibility": {{"verdict": "ok|defect", "note": "short"}},
  "defects": [{{"crop": "tile_r2c2", "location": "bottom centre of that crop", "type": "one of {types}", "severity": "major|minor", "description": "what exactly is wrong"}}]
}}
Severity: "major" = a viewer would notice it at normal full-frame viewing, or something is clearly broken at zoom (melted/asymmetric face, fused or extra fingers, merged tile mush, nonsense object, visible text, border, wrong style, crowd). "minor" = nitpick, tiny, uncertain or only visible by pixel peeping. Only list a defect you can point at; do not list worries or things you "could not verify".
Every face or hand marked "defect" and every other problem must ALSO appear in "defects". If you see no problems, "defects" is an empty list, but "faces" and "hands" must still be itemized for everything visible."""

RULES = {
    "style_mismatch": "PROJECT RULE: images must be flat 2D webtoon scenes with characters or simple props in a natural setting. Isometric or cutaway views of machines, technical diagrams, 3D renders and photos are violations even if they are drawn with flat colours and ink lines.",
    "nonsense_object": "PROJECT RULE: mechanical cutaways, machine interiors, gears/pipes/engines and technical diagrams are forbidden in these images (they are built as vector diagrams elsewhere). Report such content as confirmed. Melted blobs and fused objects are also violations.",
    "tiles_merged": "PROJECT RULE: mahjong tiles must be a few separate, large, blank-faced rectangular blocks. Heaps/piles, dense clusters, or tiles that dissolve into mush are violations.",
    "baked_text": "PROJECT RULE: no letters, numbers, glyphs, pictograms or marks that look like writing anywhere, including on mahjong tile faces and scratches on tables that look like letters.",
    "border_or_gutter": "PROJECT RULE: no frame, border line, gutter or cream band around the picture. A thin dark line along the very edge, or a band at one edge, counts as a border.",
    "crowd": "PROJECT RULE: at most 4 people with visible faces; extra people must be silhouettes or absent.",
}

VERIFIER_PROMPT = """You are an independent QA verifier for a flat 2D webtoon-style illustration. A first inspector reported a possible defect. Use the Read tool to open this one image file and judge it yourself:

{path}

Crop context: {ctx}
Reported defect type: {dtype}
Reported where: {location}
Reported problem: {desc}
{rule}

Look at the image carefully and decide whether the reported defect is really present at the reported place. Confirm if you can see the flaw yourself at the reported place. Reject if the report is clearly wrong, or is only a worry (hidden or occluded parts, "cannot verify", an object that merely touches another but is still cleanly outlined, normal stylisation, ordinary furniture in the lower part of the frame). A missed real defect is worse than a false alarm, so when you genuinely see the flaw, confirm; but do not confirm purely because something is unverifiable.

Reply with ONLY one JSON object: {{"confirmed": true|false, "reason": "one sentence describing what you actually see there"}}"""


def _norm_defect(d, crops_by_name):
    if not isinstance(d, dict):
        return None
    name = str(d.get("crop", "full")).strip()
    name = re.sub(r"\.png$", "", name)
    # accept names with random tag suffix
    base = re.sub(r"_[a-z0-9]{4}$", "", name)
    if base not in crops_by_name:
        base = "full"
    dtype = str(d.get("type", "other")).strip()
    if dtype not in DEFECT_TYPES:
        dtype = "other"
    sev = str(d.get("severity", "major")).strip().lower()
    return {"crop": base, "location": str(d.get("location", ""))[:160],
            "type": dtype, "severity": "minor" if sev == "minor" else "major",
            "description": str(d.get("description", ""))[:400]}


# ------------------------------------------------------------------ focal point
FOCUS_COLS = "ABCDEFGHIJKL"
FOCUS_PROMPT = """Use the Read tool to open this image: {path}

It is an illustration for a video. Thin red vertical lines split it into {n} equal columns, labelled {first}..{last} along the top and bottom edges. A small badge in the top-left corner shows a code word.

The video will later shrink this picture into a narrow portrait card that shows only about 4 columns, so we must know where the MAIN SUBJECT is. The scene is meant to show: {brief}

Main subject rules: if one person is the subject, use that person's face and upper body; if a group, the group's centre; if an object (table, food, drink), that object. Ignore background decoration.

Reply with JSON only:
{{"code": "<badge code>", "subject": "<short description>", "left_col": "<letter>", "right_col": "<letter>", "center_col": "<letter where the card should be centred>"}}"""


def _focus_grid(src, out, code):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    if W > 1568:
        im = im.resize((1568, round(H * 1568 / W)), Image.LANCZOS)
        W, H = im.size
    d = ImageDraw.Draw(im)
    fp = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font = ImageFont.truetype(fp, 30) if os.path.exists(fp) else ImageFont.load_default()
    n = len(FOCUS_COLS)
    for i in range(n + 1):
        x = round(i * W / n)
        d.line([(x, 0), (x, H)], fill=(230, 30, 30), width=2)
    for i, ch in enumerate(FOCUS_COLS):
        cx = round((i + 0.5) * W / n)
        for y in (6, H - 40):
            d.rectangle([cx - 18, y, cx + 18, y + 34], fill="white")
            d.text((cx - 10, y + 1), ch, fill=(200, 0, 0), font=font)
    d.rectangle([0, 0, 170, 44], fill="black")
    d.text((10, 6), code, fill="white", font=font)
    im.save(out)


def focal_point(path, brief=None, runs=3, effort=None):
    """Ask Haiku where the main subject is. Returns {x, x0, x1, subject, runs} in 0..1 image width,
    or None if no run could be trusted (badge code wrong or unparseable)."""
    n = len(FOCUS_COLS)
    got = []
    tmp = tempfile.mkdtemp(prefix="v2focus_")
    try:
        for _ in range(runs):
            code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=5))
            grid = Path(tmp) / f"grid_{code}.png"
            _focus_grid(path, grid, code)
            prompt = FOCUS_PROMPT.format(path=grid, n=n, first=FOCUS_COLS[0], last=FOCUS_COLS[-1],
                                         brief=brief or "(no brief)")
            try:
                text, _ = claude_cli(prompt, effort=effort or "low", timeout=180)
            except CliError:
                continue
            r = extract_json(text) or {}
            cols = [str(r.get(k, "")).strip().upper()[:1] for k in ("left_col", "center_col", "right_col")]
            if str(r.get("code", "")).strip().upper() != code or not all(c and c in FOCUS_COLS for c in cols):
                continue  # did not really look at the image, or bad answer
            lo, c, hi = (FOCUS_COLS.index(x) for x in cols)
            lo, hi = min(lo, hi), max(lo, hi)
            got.append(((min(max(c, lo), hi) + 0.5) / n, lo / n, (hi + 1) / n, r.get("subject", "")))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if not got:
        return None
    got.sort(key=lambda g: g[0])
    x, x0, x1, subject = got[len(got) // 2]  # median run
    return {"x": round(x, 3), "x0": round(x0, 3), "x1": round(x1, 3), "subject": subject,
            "runs": [round(g[0], 3) for g in got], "model": QA_MODEL}


def _qa_once(path, brief=None, effort=None, kind="scene"):
    path = str(path)
    res = {"pass": False, "defects": [], "faces_checked": 0, "hands_checked": 0,
           "qa_model": QA_MODEL, "sha256": None, "reason": None}
    try:
        res["sha256"] = sha256_file(path)
    except OSError as e:
        res["reason"] = f"cannot read file: {e}"
        return res
    tmp = tempfile.mkdtemp(prefix="v2qa_")
    try:
        try:
            crops, code = build_crops(path, tmp)
        except Exception as e:  # not an image, truncated, tiny...
            res["reason"] = f"not a valid image: {e}"
            return res
        cbn = {n: (p, d) for n, p, d in crops}
        prompt = INSPECTOR_PROMPT.format(
            files="\n".join(f"- {n}: {p}" for n, p, _ in crops),
            brief=brief or "(none given)",
            types=" | ".join(DEFECT_TYPES),
            kind_note=("NOTE: this is a CHARACTER REFERENCE SHEET (one character shown twice on a plain background), "
                       "not a scene. Skip check 10 (subtitle zone). The same person appearing twice counts as one person."
                       if kind == "sheet" else
                       "NOTE: this is YouTube THUMBNAIL ART. Skip check 10 (subtitle zone). A very large close-up face "
                       "and a large flat, plain, empty background area on one side are intentional, not defects. "
                       "Still apply every other check strictly."
                       if kind == "thumb" else ""),
        )
        try:
            text, meta = claude_cli(prompt, cwd=tmp, effort=effort)
        except Exception as e:
            res["reason"] = f"inspector CLI failure: {e}"
            return res
        rep = extract_json(text)
        if not isinstance(rep, dict):
            res["reason"] = "inspector output unparseable: " + (text or "")[:200].replace("\n", " ")
            return res
        got = str(rep.get("canary_code", "")).strip().upper().replace(" ", "")
        if got != code:
            res["reason"] = f"canary mismatch (inspector did not really view the images): expected {code}, got {got!r}"
            return res
        faces = rep.get("faces") if isinstance(rep.get("faces"), list) else []
        hands = rep.get("hands") if isinstance(rep.get("hands"), list) else []
        res["faces_checked"] = len(faces)
        res["hands_checked"] = len(hands)
        res["inspector"] = {"people_with_visible_faces": rep.get("people_with_visible_faces"),
                            "tiles": rep.get("tiles"), "plausibility": rep.get("plausibility"),
                            "faces": faces, "hands": hands}

        cand = []
        for d in rep.get("defects") or []:
            nd = _norm_defect(d, cbn)
            if nd:
                cand.append(nd)
        # defect verdicts in itemization that the inspector forgot to list
        for _k, items, dtype in (("face", faces, "face_melted_or_asymmetric"), ("hand", hands, "hand_defect")):
            for it in items:
                if isinstance(it, dict) and str(it.get("verdict", "")).lower() == "defect":
                    if not any(c["type"] == dtype and c["crop"] == re.sub(r"_[a-z0-9]{4}$", "", str(it.get("crop", "full"))) for c in cand):
                        nd = _norm_defect({"crop": it.get("crop", "full"), "location": it.get("where", ""),
                                           "type": dtype, "description": it.get("note", "")}, cbn)
                        if nd:
                            cand.append(nd)
        for key, dtype in (("tiles", "tiles_merged"), ("plausibility", "nonsense_object")):
            v = rep.get(key)
            if isinstance(v, dict) and str(v.get("verdict", "")).lower() == "defect":
                if not any(c["type"] == dtype for c in cand):
                    cand.append({"crop": "full", "location": "", "type": dtype, "severity": "major",
                                 "description": str(v.get("note", ""))[:400]})
        try:
            npeople = int(rep.get("people_with_visible_faces") or 0)
        except (TypeError, ValueError):
            npeople = 0
        if npeople > 4 and not any(c["type"] == "crowd" for c in cand):
            cand.append({"crop": "full", "location": "whole image", "type": "crowd", "severity": "major",
                         "description": f"{npeople} people with visible faces (max 4)"})

        # c. independent verification, only the implicated crop
        def verify(c):
            p, ctx = cbn[c["crop"]]
            vp = VERIFIER_PROMPT.format(path=p, ctx=ctx, dtype=c["type"], location=c["location"], desc=c["description"], rule=RULES.get(c["type"], ""))
            try:
                t, _ = claude_cli(vp, cwd=tmp, effort=effort)
            except Exception as e:
                return dict(c, confirmed=True, verifier_reason=f"verifier CLI failure (treated as confirmed): {e}")
            r = extract_json(t)
            if not isinstance(r, dict) or "confirmed" not in r:
                return dict(c, confirmed=True, verifier_reason="verifier output unparseable (treated as confirmed)")
            conf = r.get("confirmed")
            conf = conf if isinstance(conf, bool) else str(conf).lower() != "false"
            return dict(c, confirmed=conf, verifier_reason=str(r.get("reason", ""))[:300])

        verified = []
        if cand:
            with cf.ThreadPoolExecutor(max_workers=4) as ex:
                verified = list(ex.map(verify, cand))
        confirmed = [v for v in verified if v["confirmed"] and v.get("severity", "major") == "major"]
        res["defects"] = confirmed
        res["minor_defects"] = [v for v in verified if v["confirmed"] and v.get("severity") == "minor"]
        res["rejected_defects"] = [v for v in verified if not v["confirmed"]]
        res["pass"] = not confirmed
        res["reason"] = None if res["pass"] else f"{len(confirmed)} confirmed defect(s)"
        res["cost_usd_inspector"] = meta.get("cost")
        return res
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def qa_image(path, brief=None, effort=None, passes=None, kind="scene"):
    try:
        return _qa_image(path, brief, effort, passes, kind)
    except Exception as e:  # QA must never crash a caller into a pass
        return {"pass": False, "defects": [], "faces_checked": 0, "hands_checked": 0, "qa_model": QA_MODEL,
                "sha256": sha256_file(path) if os.path.exists(str(path)) else None,
                "reason": f"QA internal error: {type(e).__name__}: {e}"[:300]}


def _qa_image(path, brief=None, effort=None, passes=None, kind="scene"):
    """Public entry. A failing first pass is final. A clean first pass is re-checked by an
    independent second inspection (fresh crops, fresh model sample) because a single
    Haiku pass misses defects; both must be clean to PASS."""
    passes = passes or int(os.environ.get("AINIMATE_QA_PASSES", "2"))
    r = _qa_once(path, brief, effort, kind)
    r["passes_run"] = 1
    for i in range(1, passes):
        if not r["pass"]:
            break
        r2 = _qa_once(path, brief, effort, kind)
        r["passes_run"] += 1
        if not r2["pass"]:
            r2["passes_run"] = r["passes_run"]
            r2["reason"] = f"pass {r['passes_run']}: {r2.get('reason')}"
            return r2
        r["faces_checked"] = max(r["faces_checked"], r2["faces_checked"])
        r["hands_checked"] = max(r["hands_checked"], r2["hands_checked"])
    return r


# ------------------------------------------------------------------- calibration
def calibrate(effort=None):
    items = [(p if os.path.isabs(p) else str(REPO_ROOT / p), False) for p in BAD_IMAGES]
    items += [(p, True) for p in GOOD_IMAGES]
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        results = list(ex.map(lambda it: qa_image(it[0], effort=effort), items))
    tp = tn = fp = fn = 0  # positive = "image is bad / QA says FAIL"
    rows = []
    for (p, should_pass), r in zip(items, results):
        qa_fail = not r["pass"]
        bad = not should_pass
        if bad and qa_fail:
            tp += 1
        elif bad and not qa_fail:
            fn += 1
        elif not bad and qa_fail:
            fp += 1
        else:
            tn += 1
        rows.append({"file": os.path.basename(p), "expect": "PASS" if should_pass else "FAIL",
                     "got": "PASS" if r["pass"] else "FAIL", "faces": r["faces_checked"],
                     "hands": r["hands_checked"], "reason": r.get("reason"),
                     "defects": [f'{d["type"]}@{d["crop"]}: {d["description"][:90]}' for d in r["defects"]]})
    out = {"qa_model": QA_MODEL, "effort": effort or QA_EFFORT, "seconds": round(time.time() - t0),
           "confusion": {"known_bad_failed(TP)": tp, "known_bad_passed(FN)": fn,
                         "good_passed(TN)": tn, "good_failed(FP)": fp}, "rows": rows,
           "criteria_met": fn == 0 and fp <= 1}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?")
    ap.add_argument("--brief")
    ap.add_argument("--calibrate", action="store_true")
    ap.add_argument("--effort")
    ap.add_argument("--focus", action="store_true", help="only locate the main subject (focal point)")
    a = ap.parse_args()
    if a.focus and a.path:
        r = focal_point(a.path, a.brief, effort=a.effort)
        print(json.dumps(r, indent=2, ensure_ascii=False))
        sys.exit(0 if r else 1)
    if a.calibrate:
        out = calibrate(a.effort)
        print(json.dumps(out, indent=2, ensure_ascii=False))
        sys.exit(0 if out["criteria_met"] else 1)
    if not a.path:
        ap.error("path required")
    r = qa_image(a.path, a.brief, a.effort)
    print(json.dumps(r, indent=2, ensure_ascii=False))
    sys.exit(0 if r["pass"] else 1)


if __name__ == "__main__":
    main()
