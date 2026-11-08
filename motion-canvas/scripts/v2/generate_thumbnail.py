#!/usr/bin/env python3
"""v2 thumbnail: 3 options (art variant x hook from publish_options.json), text overlay, Haiku rating.
Writes thumbnail_option_1..3.jpg and thumbnail_16x9.jpg (= the best-rated option).

    generate_thumbnail.py <vid_id>

Output: public/assets/<id>/thumbnail_16x9.jpg (1280x720, under 2 MB) and the
`thumbnail` section of production/<id>/asset_qa.json.

Industry practice applied (finance / business YouTube): one expressive large face or one
striking object, a huge 2-4 word hook, at most 3 strong colours, strong subject/background
separation, readable at 168x94, nothing important at the bottom-right (timestamp badge).
The art is generated WITHOUT text; text is composed by Playwright HTML with
Plus Jakarta Sans 800, a thick dark stroke and a highlighted last word.
"""
import concurrent.futures as cf
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import generate_assets as ga  # noqa: E402
import qa_image as qa  # noqa: E402
from PIL import Image  # noqa: E402

MC = ga.MC
FONT_URL = "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KUnNSg.ttf"
FONT_PATH = Path.home() / ".cache" / "ainimate" / "fonts" / "PlusJakartaSans-800.ttf"
CHROME = os.environ.get("CHROME_BIN") or "/home/agent/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
PLAYWRIGHT_MJS = MC / "node_modules" / "playwright" / "index.mjs"
PASS_SCORE = 6  # minimum rating (1-10) at both sizes

THUMB_STYLE = (
    "Flat 2D Indonesian webtoon illustration for a YouTube thumbnail. Confident thick dark ink outlines, two-tone "
    "cel shading, no gradients. Extremely high impact and simple: ONE huge expressive face or ONE striking object "
    "fills about 60 percent of the frame height. Strong separation: a bright thin rim of light colour around the "
    "subject against a flat, solid, saturated background. Use at most 3 strong colours in total "
    "(for example deep navy background, warm yellow, and one red or emerald accent). The face has two symmetrical "
    "eyes, clear brows, a clear mouth, a bold clear emotion that reads from far away. Hands out of frame."
)
THUMB_RULES = (
    "COMPOSITION: wide 16:9. The subject is placed on the {subject_side} side, within about 45 percent of the frame "
    "width. The whole {text_side} half of the picture is one plain, flat, solid, saturated colour with nothing in "
    "it: no props, no furniture, no pattern, no shapes, no cards, no signs, left empty on purpose. The bottom-right "
    "corner is also plain background. At most one person with a visible face. Any money is drawn as a plain green "
    "paper bundle with no printed marks, portraits or numbers."
)
THUMB_AVOID = (
    "AVOID (must not appear): any text, letters, numbers, labels, captions, cards, banners, logos, watermarks, speech "
    "bubbles, signs, banknote printing, symbols that look like writing, borders, frames, 3D render, photorealism, gradients, melted or asymmetric faces, extra or "
    "fused fingers, merged objects, busy backgrounds, more than one person."
)

VARIANTS = [
    {"name": "a_face_shock", "subject_side": "right", "text_side": "left",
     "focus": "an extreme close-up of the face, eyes wide open, mouth open in shock, eyebrows raised high"},
    {"name": "b_face_object", "subject_side": "left", "text_side": "right",
     "focus": "a large face with a worried, doubtful expression, next to ONE big striking object that tells the "
              "story (large and simple, nothing else)"},
    {"name": "c_face_smirk", "subject_side": "right", "text_side": "left",
     "focus": "a large head and shoulders portrait with a knowing smirk and one raised eyebrow, looking straight "
              "at the viewer"},
]


# ----------------------------------------------------------------------- script
def get_hook(vid, script):
    th = script.get("thumbnail")
    if isinstance(th, dict) and th.get("text") and th.get("scene"):
        return th["text"].strip(), th["scene"].strip(), th.get("character")
    title = script.get("title", vid)
    p = (f"Video title (Indonesian): {title}\n\nDesign the YouTube thumbnail for a finance and business explainer "
         "channel. Reply with ONLY JSON: {\"text\": \"a huge 2 to 4 word Indonesian hook in CAPS, plain words a "
         "layperson understands, creates a curiosity gap, does not repeat the title\", \"scene\": \"one sentence "
         "describing the single character's face/emotion and the ONE striking object, no text in the scene\"}")
    t, _ = qa.claude_cli(p, model=ga.DIRECTOR_MODEL, tools=None, effort="low")
    r = qa.extract_json(t)
    if not isinstance(r, dict) or not r.get("text") or not r.get("scene"):
        raise RuntimeError("could not derive thumbnail hook from title: " + (t or "")[:150])
    return r["text"].strip(), r["scene"].strip(), None


# ------------------------------------------------------------------ text overlay
def ensure_font():
    if not FONT_PATH.exists():
        FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            data = urllib.request.urlopen(FONT_URL, timeout=30).read()
            FONT_PATH.write_bytes(data)
        except Exception as e:
            print(f"warning: could not fetch Plus Jakarta Sans ({e}); falling back to a system font", file=sys.stderr)
    return FONT_PATH.exists()


HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:'Plus Jakarta Sans';font-weight:800;src:url('file://{font}') format('truetype');}}
html,body{{margin:0;width:1280px;height:720px;overflow:hidden;background:#0B1020}}
#art{{position:absolute;inset:0;width:1280px;height:720px;object-fit:cover}}
#t{{position:absolute;{side}:44px;top:{top}px;width:{boxw}px;text-align:{align};
font-family:'Plus Jakarta Sans','DejaVu Sans',sans-serif;font-weight:800;line-height:0.98;text-transform:uppercase;
letter-spacing:-1px;color:#fff;
-webkit-text-stroke:{stroke}px #0B1020;paint-order:stroke fill;
text-shadow:0 8px 0 rgba(11,16,32,.85),0 0 28px rgba(11,16,32,.6)}}
#t span{{display:block;white-space:nowrap}}
#t span.hl{{color:#FFD60A}}
</style></head><body><img id="art" src="file://{art}"><div id="t">{lines}</div>
<script>
document.fonts.ready.then(()=>{{
 const t=document.getElementById('t');let fs=210;
 const maxw={boxw},maxh=470;
 for(;fs>60;fs-=4){{t.style.fontSize=fs+'px';
   if(Math.max(...[...t.children].map(c=>c.scrollWidth))<=maxw&&t.scrollHeight<=maxh)break;}}
 t.style.webkitTextStroke=Math.round(fs*0.1)+'px #0B1020';
 document.title='ready';
}});
</script></body></html>"""

RENDER_MJS = """
import { chromium } from '%(pw)s';
import fs from 'fs';
const [html, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '%(chrome)s', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + html);
await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
await p.waitForTimeout(150);
await p.screenshot({ path: out, type: 'png', timeout: 180000 });
await Promise.race([b.close(), new Promise(r => setTimeout(r, 3000))]);
process.exit(0);
"""


_COMPOSE_LOCK = threading.Lock()  # one headless browser at a time (hosts are often loaded)


def compose(art_path, text, text_side, out_png, workdir):
    tag = Path(out_png).stem
    small = Path(workdir) / f"{tag}_bg.jpg"
    Image.open(art_path).convert("RGB").resize((1280, 720), Image.LANCZOS).save(small, quality=95)
    art_path = str(small)
    words = text.upper().split()
    # lines: 1 word per line for <=3 words, 2+2 for four words; last word highlighted
    if len(words) == 4:
        groups = [" ".join(words[:2]), " ".join(words[2:])]
    else:
        groups = words
    lines = "".join(f'<span class="{"hl" if i == len(groups) - 1 else ""}">{g}</span>' for i, g in enumerate(groups))
    side = "left" if text_side == "left" else "right"
    html = HTML.format(font=str(FONT_PATH), art=art_path, lines=lines, side=side, top=60, boxw=640,
                       align="left" if side == "left" else "right", stroke=16)
    hp = Path(workdir) / f"{tag}.html"
    hp.write_text(html)
    mjs = Path(workdir) / f"{tag}.mjs"
    mjs.write_text(RENDER_MJS % {"pw": str(PLAYWRIGHT_MJS), "chrome": CHROME})
    with _COMPOSE_LOCK:
        r = subprocess.run(["node", str(mjs), str(hp), str(out_png)], capture_output=True, text=True, timeout=330)
    if r.returncode != 0:
        raise RuntimeError("playwright compose failed: " + r.stderr[-300:])


def save_jpeg(png_path, jpg_path):
    im = Image.open(png_path).convert("RGB")
    if im.size != (1280, 720):
        im = im.resize((1280, 720), Image.LANCZOS)
    for q in (92, 88, 84, 78, 70):
        im.save(jpg_path, "JPEG", quality=q, optimize=True)
        if Path(jpg_path).stat().st_size < 2_000_000:
            break


# ------------------------------------------------------------------------ rating
RATE_PROMPT = """You rate YouTube thumbnails for a finance and business explainer channel in Indonesia. Use the Read tool to open this image file and look at it:

{path}

It is shown at {size}. Judge only what you really see.
- text_legible: can you read the headline text clearly at this size, and is it huge and high contrast? (true/false)
- text_read: write exactly the headline words you can read (empty if unreadable)
- emotion_clear: is there one clear facial emotion or one striking object that grabs attention instantly? (true/false)
- clutter: is the picture simple, with a clear single subject separated from the background? (true/false)
- bottom_right_clear: is the bottom-right corner free of important content? (true/false)
- score: 1 to 10 overall click-worthiness for this size (10 = would stop a scroll). Be critical.

{ref_block}
Reply with ONLY one JSON object: {{"text_legible": bool, "text_read": "...", "emotion_clear": bool, "clutter": bool, "bottom_right_clear": bool, "same_character": bool, "score": int, "notes": "one sentence on the biggest weakness"}}"""

REF_BLOCK = """- same_character: ALSO open this reference sheet of the channel's recurring character: {ref}
  Is the person in the thumbnail clearly the same character (face shape, hair, skin tone, clothes) with NO
  added accessories the reference does not have (glasses, beard, hat)? (true/false; true if no person is shown)"""


def rate(path, size_label, workdir, ref_path=None):
    p = RATE_PROMPT.format(path=path, size=size_label,
                           ref_block=REF_BLOCK.format(ref=ref_path) if ref_path else "- same_character: always true")
    try:
        t, _ = qa.claude_cli(p, cwd=workdir, effort="low")
    except Exception as e:
        return {"error": str(e)[:200], "score": 0}
    r = qa.extract_json(t)
    if not isinstance(r, dict) or not isinstance(r.get("score"), (int, float)):
        return {"error": "unparseable rating", "score": 0}
    return r


def judge(png_path, workdir, expected_text, ref_path=None):
    small = Path(workdir) / (Path(png_path).stem + "_168.png")
    Image.open(png_path).convert("RGB").resize((168, 94), Image.LANCZOS).save(small)
    with cf.ThreadPoolExecutor(max_workers=2) as ex:
        f_full = ex.submit(rate, str(png_path), "full size 1280x720", workdir, ref_path)
        f_small = ex.submit(rate, str(small), "168x94 pixels (a tiny phone feed thumbnail)", workdir)
        full, sm = f_full.result(), f_small.result()
    return full, sm


def candidate_ok(full, sm, art_qa):
    return bool(art_qa["pass"] and not full.get("error") and not sm.get("error")
                and sm.get("text_legible") and full.get("emotion_clear") and full.get("same_character", True)
                and full.get("score", 0) >= PASS_SCORE and sm.get("score", 0) >= PASS_SCORE)


# --------------------------------------------------------------------------- main
def art_prompt(scene, variant, character_ref, base_scene=None, character_text=""):
    parts = ["SCENE: " + (base_scene or scene) + " Emphasis for this variant: " + variant["focus"] + "."]
    if character_ref:
        parts.append("CONSISTENCY: the attached reference image is the recurring character. Draw exactly that person: "
                     "same face shape, hair, skin tone and clothes. Add no accessories that are not in the reference "
                     "(no glasses, hat, beard or jewellery unless the reference has them).")
    if character_text:
        parts.append("CHARACTER: " + character_text)
    parts.append(THUMB_STYLE)
    parts.append(THUMB_RULES.format(subject_side=variant["subject_side"], text_side=variant["text_side"]))
    parts.append(THUMB_AVOID)
    return "\n\n".join(parts)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    vid = sys.argv[1]
    prod = MC / "production" / vid
    outdir = MC / "public" / "assets" / vid
    outdir.mkdir(parents=True, exist_ok=True)
    script = json.loads((prod / "script.json").read_text())
    text, scene, char_id = get_hook(vid, script)
    words = text.split()
    if not 1 <= len(words) <= 5:
        print(f"warning: hook has {len(words)} words (2-4 recommended): {text!r}", file=sys.stderr)
    ensure_font()

    # reference character (QA'd sheet) if present
    ref, ref_path, char_text = [], None, ""
    try:
        man = json.loads((prod / "assets_manifest.json").read_text())
        cids = [c["id"] for c in man.get("characters", [])]
        cid = char_id if char_id in cids else (cids[0] if cids else None)
        if cid and (outdir / f"char_{cid}.png").exists():
            ref = [(outdir / f"char_{cid}.png").read_bytes()]
            ref_path = outdir / f"char_{cid}.png"
            char_text = next((c.get("prompt", "") for c in man.get("characters", []) if c["id"] == cid), "")
    except (OSError, json.JSONDecodeError):
        man = {}
    style_notes = man.get("style_notes", "")

    # three options: one hook per art variant (publish_options.json), else the script hook on all three
    opts_file = prod / "publish_options.json"
    opts = json.loads(opts_file.read_text()) if opts_file.exists() else {}
    hooks = opts.get("hooks") or [text] * len(VARIANTS)
    scenes = [x or scene for x in (opts.get("scenes") or [scene] * len(VARIANTS))]
    hook_of = {v["name"]: hooks[i] for i, v in enumerate(VARIANTS)}
    scene_of = {v["name"]: scenes[i] for i, v in enumerate(VARIANTS)}  # each package has its own concept
    work = Path(tempfile.mkdtemp(prefix="v2thumb_"))
    rounds = []
    best = None
    best_by = {}  # variant -> best candidate so far
    cur_scene = scene
    t0 = time.time()
    for rnd in range(3):  # first try + up to two retries with a new prompt
        model = ga.FLASH if rnd < 2 else ga.PRO
        print(f"[thumbnail] round {rnd + 1} ({model.split('/')[-1]}) scene: {cur_scene[:90]}", flush=True)

        def make(v):
            prompt = art_prompt(scene_of[v["name"]], v, bool(ref), character_text=char_text)
            if style_notes:
                prompt += "\nEpisode theme: " + style_notes
            rec = {"variant": v["name"], "model": model, "prompt": prompt}
            try:
                im, gsec = ga.gemini_image(model, prompt, ref, aspect="16:9", size="2K")
            except Exception as e:
                rec["error"] = f"generation failed: {e}"
                return rec
            art = work / f"art_r{rnd}_{v['name']}.png"
            im.save(art)
            r = qa.qa_image(str(art), "YouTube thumbnail art: one large expressive face or one striking object, "
                            "a large plain background area on the " + v["text_side"] + " side, no text", kind="thumb",
                            passes=1)
            rec["art_qa"] = {"pass": r["pass"], "defects": r["defects"], "reason": r.get("reason")}
            if not r["pass"]:
                return rec
            comp = work / f"comp_r{rnd}_{v['name']}.png"
            try:
                compose(str(art), hook_of[v["name"]], v["text_side"], comp, work)
                full, sm = judge(comp, work, hook_of[v["name"]], str(ref_path) if ref_path else None)
            except Exception as e:
                rec["error"] = f"compose/rate failed: {e}"[:300]
                return rec
            rec.update({"rating_full": full, "rating_168": sm, "composed": str(comp), "art_path": str(art)})
            rec["score"] = round((full.get("score", 0) + 1.5 * sm.get("score", 0)) / 2.5, 2)
            rec["pass"] = candidate_ok(full, sm, rec["art_qa"])
            return rec

        todo = [v for v in VARIANTS if not best_by.get(v["name"], {}).get("pass")]  # redraw only failures
        with cf.ThreadPoolExecutor(max_workers=3) as ex:
            cands = list(ex.map(make, todo))
        rounds.append({"round": rnd + 1, "scene": cur_scene, "candidates": [
            {k: v for k, v in c.items() if k not in ("composed", "art_path")} for c in cands]})
        for c in cands:
            print(f"  {c['variant']}: " + (c.get("error") or
                  f"artQA={'PASS' if c['art_qa']['pass'] else 'FAIL'} "
                  + (f"full={c['rating_full'].get('score')} small={c['rating_168'].get('score')} "
                     f"legible168={c['rating_168'].get('text_legible')} same_char={c['rating_full'].get('same_character')} pass={c.get('pass')}" if "rating_full" in c else "")),
                  flush=True)
        scored = [c for c in cands if "score" in c]
        for c in scored:
            b = best_by.get(c["variant"])
            if b is None or (c["pass"], c["score"]) > (b["pass"], b["score"]):
                best_by[c["variant"]] = c
            if best is None or (c["pass"], c["score"]) > (best["pass"], best["score"]):
                best = c
        if all(best_by.get(v["name"], {}).get("pass") for v in VARIANTS):
            break
        if rnd < 2:  # rewrite the scene of each failed package, using its own failure notes
            for c in cands:
                if c.get("pass"):
                    continue
                notes = []
                if c.get("art_qa") and not c["art_qa"]["pass"]:
                    notes += [f"art defect: {d['description']}" for d in c["art_qa"]["defects"]]
                if "rating_full" in c and not c["rating_full"].get("same_character", True):
                    notes.append("the person does not match the recurring character (wrong face or added glasses/beard)")
                if "rating_168" in c:
                    notes.append("small size: " + str(c["rating_168"].get("notes", "")))
                    notes.append("full size: " + str(c["rating_full"].get("notes", "")))
                if c.get("error"):
                    notes.append(c["error"][:100])
                old_scene = scene_of[c["variant"]]
                p = (f"Rewrite this YouTube thumbnail scene so it is simpler and punchier, keeping its idea: one big "
                     f"face or one big object, plain background. Previous scene: {old_scene}\nProblems seen:\n- "
                     + "\n- ".join(notes[:8]) + "\nReply ONLY JSON: {\"scene\": \"2 sentences, positive wording, no text in the scene\"}")
                try:
                    t, _ = qa.claude_cli(p, model=ga.DIRECTOR_MODEL, tools=None, effort="low")
                    r = qa.extract_json(t)
                    if isinstance(r, dict) and r.get("scene"):
                        scene_of[c["variant"]] = r["scene"]
                except Exception as e:
                    print("  director rewrite failed:", str(e)[:100], file=sys.stderr)
            cur_scene = "; ".join(f"{k}: {v[:60]}" for k, v in scene_of.items())

    result = {"pass": False, "file": "thumbnail_16x9.jpg", "text": text, "scene": scene,
              "seconds": round(time.time() - t0), "rounds": rounds}
    rc = 1
    if best:
        out = outdir / "thumbnail_16x9.jpg"
        save_jpeg(best["composed"], out)
        art_out = outdir / "thumbnail_art.png"
        Image.open(best["art_path"]).save(art_out)
        result.update({"pass": bool(best["pass"]), "choice": best["variant"], "score": best["score"],
                       "rating_full": best["rating_full"], "rating_168": best["rating_168"],
                       "bytes": out.stat().st_size, "art_sha256": qa.sha256_file(art_out),
                       "sha256": qa.sha256_file(out)})
        options = []
        for i, v in enumerate(VARIANTS, 1):
            c = best_by.get(v["name"])
            if not c:
                options.append({"n": i, "variant": v["name"], "hook": hook_of[v["name"]], "file": None, "pass": False})
                continue
            f = outdir / f"thumbnail_option_{i}.jpg"
            save_jpeg(c["composed"], f)
            options.append({"n": i, "variant": v["name"], "hook": hook_of[v["name"]], "scene": scene_of[v["name"]], "file": f.name,
                            "pass": bool(c["pass"]), "score": c["score"], "sha256": qa.sha256_file(f)})
            print(f"[thumbnail] option {i}: {f.name} [{hook_of[v['name']]}] score {c['score']} pass={c['pass']}")
        result["options"] = options
        rc = 0 if best["pass"] and all(o["file"] for o in options) else 1
        print(f"[thumbnail] default (best) {best['variant']} score {best['score']} pass={best['pass']} -> {out} "
              f"({out.stat().st_size // 1024} KB)")
    else:
        print("[thumbnail] no usable candidate", file=sys.stderr)
    ga.qa_update(vid, "thumbnail", None, result)
    import shutil
    shutil.rmtree(work, ignore_errors=True)  # candidates were copied out above; free the disk
    return rc


if __name__ == "__main__":
    sys.exit(main())
