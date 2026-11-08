"""Icon sets: up to 6 small icons drawn in ONE image call, sliced, checked, saved as transparent PNGs.

assets_manifest.json:
  "icon_sets": [ { "id": "ch03_table_steps",
                   "icons": [ { "id": "sweep", "prompt": "mahjong tiles sliding into a square slot" }, ... ] } ]
Output: public/assets/<vid>/icons/<icon id>.png (512x512, transparent), record in asset_qa.json "icon_sets".
Storyboard: a flow item uses one with "icon": "<icon id>".

Checks per icon: deterministic (cell not empty, drawing does not touch the cell edge) then Claude Haiku
(depicts the described thing, a single object, no letters/numbers). A failed set is regenerated whole,
with the failures named in the prompt; the best attempt is kept.
"""
import json
import random
import shutil
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import qa_image as qa

MAX_ICONS = 6
ATTEMPTS = 3
ICON_STYLE = (
    "Flat vector-style icons for an explainer video: bold simple shapes, thick uniform dark outlines, "
    "two or three flat colours from this palette: emerald green, amber, slate blue, warm cream. "
    "No gradients, no shadows, no 3D, no text, letters, numbers or symbols that look like writing."
)
CODE_CHARS = "ACDEFHJKLMNPRTUVWXY34679"

QA_PROMPT = """Use the Read tool to open this contact sheet: {path}
It shows {n} icons in numbered cells (the small black numbers are ours, ignore them). A badge in the top-left corner shows a code word.

Expected icons:
{expected}

For EACH icon decide pass or fail. Fail only if: it does not clearly show what is expected; it contains letters, numbers or text-like marks; it shows several unrelated objects or a whole scene instead of one simple icon; or it is not flat (photo, 3D, gradients).

Reply with JSON only:
{{"code": "<badge code>", "icons": [{{"n": 1, "pass": true, "reason": "<short>"}}]}}"""


def grid(n):
    cols = min(n, 3)
    return cols, -(-n // cols)


def sheet_prompt(icons, notes="", style_notes=""):
    cols, rows = grid(len(icons))
    cells = "\n".join(
        f"Cell {i + 1} (row {i // cols + 1}, column {i % cols + 1}): {ic['prompt']}" for i, ic in enumerate(icons))
    return (
        f"A sheet of {len(icons)} separate icons on a pure white background, arranged in an invisible grid of "
        f"{rows} row(s) and {cols} column(s), reading left to right, top to bottom. Each icon is centred in its own "
        f"cell, fills about 55 percent of the cell, and has wide empty white space on every side; icons never touch "
        f"or overlap each other, and every part of one icon (including its arrows) stays close together. No grid lines, no borders, no labels, no captions.\n\n{cells}\n\n"
        f"STYLE: {ICON_STYLE} All icons share the same style, line weight and palette."
        + (f" Theme: {style_notes}" if style_notes else "")
        + (f"\n\nFIX FROM LAST ATTEMPT: {notes}" if notes else "")
    )


def _bands(profile, min_gap, min_len=3):
    """Runs of True in a 1-D bool array, split where at least min_gap False values separate them."""
    idx = np.flatnonzero(profile)
    if not len(idx):
        return []
    out, start, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - prev > min_gap:
            out.append([start, prev + 1]); start = i
        prev = i
    out.append([start, prev + 1])
    return [r for r in out if r[1] - r[0] >= min_len]


def find_icons(im, n):
    """Icon boxes in reading order, found from white space (the model does not keep an exact grid).
    Fragments in one row (an arrow drawn apart from its object) are merged closest-first until n remain."""
    a = np.asarray(im.convert("L")) < 235
    H, W = a.shape
    boxes = []
    for r0, r1 in _bands(a.any(axis=1), int(H * 0.03)):
        cols = _bands(a[r0:r1].any(axis=0), int(W * 0.02))
        boxes += [[c0, r0, c1, r1] for c0, c1 in cols]
    boxes = [b for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) > 0.002 * W * H]
    while len(boxes) > n:
        best = None
        for i in range(len(boxes) - 1):
            x, y = boxes[i], boxes[i + 1]
            if x[1] != y[1]:
                continue  # different rows
            gap = y[0] - x[2]
            if best is None or gap < best[0]:
                best = (gap, i)
        if best is None:
            break
        i = best[1]
        x, y = boxes[i], boxes.pop(i + 1)
        boxes[i] = [min(x[0], y[0]), min(x[1], y[1]), max(x[2], y[2]), max(x[3], y[3])]
    return boxes


def slice_sheet(im, n):
    """Returns list of (icon RGBA 512x512 or None, problem or None) per expected icon."""
    boxes = find_icons(im, n)
    if len(boxes) != n:
        return [(None, f"found {len(boxes)} separate drawings, expected {n} (icons touching or missing)")] * n
    W, H = im.size
    rgb_full = im.convert("RGB")
    out = []
    for bb in boxes:
        side = max(bb[2] - bb[0], bb[3] - bb[1])
        if side > 0.6 * H:
            out.append((None, "icon too large (probably merged with a neighbour)"))
            continue
        half = side / 2 + round(side * 0.08)
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        sq = (round(cx - half), round(cy - half), round(cx + half), round(cy + half))
        canvas = Image.new("RGB", (sq[2] - sq[0], sq[3] - sq[1]), "white")
        canvas.paste(rgb_full.crop((max(sq[0], 0), max(sq[1], 0), min(sq[2], W), min(sq[3], H))),
                     (max(0, -sq[0]), max(0, -sq[1])))
        rgb = canvas.resize((512, 512), Image.LANCZOS)
        # white background -> transparent (soft edge between 225 and 250 brightness)
        lum = rgb.convert("L")
        alpha = lum.point(lambda v: 0 if v >= 250 else (255 if v <= 225 else round((250 - v) * 255 / 25)))
        icon = rgb.convert("RGBA")
        icon.putalpha(alpha)
        out.append((icon, None))
    return out


def contact(icons, path, code):
    """Icons on white, numbered, with the badge code."""
    n = len(icons)
    cols, rows = grid(n)
    S = 360
    sheet = Image.new("RGB", (cols * S, rows * S + 50), "white")
    d = ImageDraw.Draw(sheet)
    fp = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font = ImageFont.truetype(fp, 24) if Path(fp).exists() else ImageFont.load_default()
    for i, ic in enumerate(icons):
        x, y = (i % cols) * S, (i // cols) * S + 50
        if ic is not None:
            sheet.paste(ic.resize((300, 300)), (x + 30, y + 30), ic.resize((300, 300)))
        d.text((x + 8, y + 4), str(i + 1), fill=(0, 0, 0), font=font)
    d.rectangle([0, 0, 150, 40], fill="black")
    d.text((10, 6), code, fill="white", font=font)
    sheet.save(path)


def qa_icons(icons, specs):
    """Haiku check. Returns list of (pass, reason) per icon; None entries (sliced badly) stay failed."""
    tmp = Path(tempfile.mkdtemp(prefix="v2icons_"))
    try:
        for _ in range(3):
            code = "".join(random.choices(CODE_CHARS, k=5))
            p = tmp / f"icons_{code}.png"
            contact(icons, p, code)
            expected = "\n".join(f"{i + 1}. {s['prompt']}" for i, s in enumerate(specs))
            try:
                text, _ = qa.claude_cli(QA_PROMPT.format(path=p, n=len(specs), expected=expected), effort="medium",
                                        timeout=300)
            except qa.CliError:
                continue
            r = qa.extract_json(text) or {}
            if str(r.get("code", "")).strip().upper() != code:
                continue
            got = {int(x.get("n", 0)): x for x in r.get("icons", []) if isinstance(x, dict)}
            if all(i + 1 in got for i in range(len(specs))):
                return [(bool(got[i + 1].get("pass")), str(got[i + 1].get("reason", ""))) for i in range(len(specs))]
        return [(False, "QA unavailable")] * len(specs)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def run_set(iset, outdir, style_notes, gen, flash, pro, log=print):
    """gen = generate_assets.gemini_image. Returns the asset_qa record for this set."""
    specs = iset["icons"]
    history, best = [], None
    notes = ""
    for n in range(1, ATTEMPTS + 2):
        model = flash if n <= ATTEMPTS else pro
        prompt = sheet_prompt(specs, notes, style_notes)
        try:
            im, sec = gen(model, prompt, (), aspect="16:9", size="2K")
        except Exception as e:  # noqa: BLE001
            history.append({"attempt": n, "model": model, "error": str(e)[:200]})
            continue
        sliced = slice_sheet(im, len(specs))
        icons = [ic for ic, _ in sliced]
        verdicts = qa_icons(icons, specs)
        res = []
        for (ic, prob), (ok, why) in zip(sliced, verdicts):
            res.append({"pass": ic is not None and ok, "reason": prob or why})
        score = sum(r["pass"] for r in res)
        history.append({"attempt": n, "model": model, "gen_seconds": round(sec, 1), "icons": res, "prompt": prompt})
        log(f"  [icons {iset['id']}] attempt {n} ({model.split('/')[-1]}): {score}/{len(specs)} icons pass")
        if best is None or score > best[0]:
            best = (score, icons, res, n)
        if score == len(specs):
            break
        notes = " ".join(f"Cell {i + 1} failed ({r['reason']}): draw it simpler and clearer."
                         for i, r in enumerate(res) if not r["pass"])
    rec = {"pass": False, "qa_model": qa.QA_MODEL, "attempts": len(history), "history": history, "icons": {}}
    if best:
        score, icons, res, bn = best
        (outdir / "icons").mkdir(parents=True, exist_ok=True)
        for spec, ic, r in zip(specs, icons, res):
            if ic is not None:
                f = outdir / "icons" / f"{spec['id']}.png"
                ic.save(f)
                rec["icons"][spec["id"]] = {"file": f"icons/{spec['id']}.png", "sha256": qa.sha256_file(f), **r}
            else:
                rec["icons"][spec["id"]] = {"file": None, **r}
        rec.update({"pass": score == len(specs), "best_attempt": bn})
    return rec


def spec_of(iset, style_notes):
    return json.dumps([iset, ICON_STYLE, style_notes], sort_keys=True)
