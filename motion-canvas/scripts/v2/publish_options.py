#!/usr/bin/env python3
"""Three title + thumbnail-hook options for the user to choose from at the end of the pipeline.

Usage: publish_options.py <video_id> [--force]      write the 3 options
       publish_options.py <video_id> --sheet        comparison image + printed choices

Option 1 is the script's own title and @thumbnail_text. Options 2 and 3 are written by Claude Sonnet
following .agents/skills/youtube-packaging/SKILL.md (three different lanes, each with its own thumbnail scene),
(via the claude CLI, not the Google API) with different angles, then checked like the script:
every figure must exist in numbers.json, no banned jargon, title <= 70 characters, hook 2-4 words.
Writes production/<id>/publish_options.json; generate_thumbnail.py draws one thumbnail per hook.
Kept as is on later runs unless the script title/hook changed or --force is given.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import qa_image as qa  # noqa: E402  (claude_cli, extract_json)

MC = Path(__file__).resolve().parents[2]
DIRECTOR_MODEL = "claude-sonnet-5-5"
TITLE_MAX = 70
HOOK_MAX_CHARS = 24

SKILL = MC.parent / ".agents" / "skills" / "youtube-packaging" / "SKILL.md"

PROMPT = """You are the packaging strategist for an Indonesian business-explainer YouTube channel. Follow this
playbook exactly (it is the channel's packaging skill):

<playbook>
{skill}
</playbook>

THE EPISODE
Current package (option 1, keep it as is): title "{title}", thumbnail hook "{hook}", thumbnail scene "{scene}".
What the video shows (chapter titles and opening lines; chapter 1 is the opening):
{outline}
Figures you may use (exact spelling, nothing else): {figures}

YOUR JOB
1. Write the promise lines (viewer, question, verdict, proof, stakes) from the outline.
2. Decide which lane option 1 is in.
3. Brainstorm at least 8 packages across the two OTHER lanes; drop any that fail a hard gate.
4. Pick the best package from each of the two other lanes. Each has: title (max {tmax} characters), hook
   (2-4 CAPS words, max {hmax} characters, not repeating the title), and a thumbnail scene: one sentence
   for the illustrator about the recurring character's face/emotion and at most ONE story object, no text
   in the art, plain area for the hook on one side.
5. Score all three packages with the playbook's weights and recommend one.
{fix}
Reply with JSON only:
{{"promise": {{"viewer": "...", "question": "...", "verdict": "...", "proof": "...", "stakes": "..."}},
  "option1_lane": "verdict|proof|utility", "option1_score": 0.0,
  "options": [{{"lane": "...", "title": "...", "hook": "...", "scene": "...", "score": 0.0, "why": "one line"}},
              {{"lane": "...", "title": "...", "hook": "...", "scene": "...", "score": 0.0, "why": "one line"}}],
  "recommend": 1}}"""


def outline(script):
    rows = []
    for c in script["chapters"]:
        first = c["sentences"][0]["text"] if c["sentences"] else ""
        rows.append(f"- {c['title']}: {first}")
    return "\n".join(rows)


def figures(vid):
    n = json.loads((MC / "production" / vid / "numbers.json").read_text())
    return ", ".join(dict.fromkeys(f["display"] for f in n.get("figures", {}).values() if f.get("display")))[:1500]


def check(vid, opts):
    problems = []
    texts = []
    for i, o in enumerate(opts, 1):
        t, h = o.get("title", "").strip(), o.get("hook", "").strip()
        if not t or len(t) > TITLE_MAX:
            problems.append(f"option {i} title is {len(t)} characters (max {TITLE_MAX})")
        if t.isupper():
            problems.append(f"option {i} title is ALL CAPS")
        if not (2 <= len(h.split()) <= 4) or len(h) > HOOK_MAX_CHARS or h != h.upper():
            problems.append(f"option {i} hook \"{h}\" must be 2-4 words, CAPS, max {HOOK_MAX_CHARS} characters")
        texts += [{"where": f"option {i} title", "text": t}, {"where": f"option {i} hook", "text": h}]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(texts, f)
    r = subprocess.run(["node", str(MC / "scripts/v2/lint_episode.mjs"), vid, f"--check-texts={f.name}"],
                       capture_output=True, text=True, check=True)
    Path(f.name).unlink()
    return problems + json.loads(r.stdout)["problems"]


def safe_name(t, n=90):
    import re
    t = re.sub(r'[\\/:*?"<>|]+', " ", t)        # characters Windows/Drive/macOS reject
    return re.sub(r"\s+", " ", t).strip()[:n].rstrip(" .")


def export_options(vid, rec, sheet_path):
    """projects/<dir>/options/: one thumbnail per package named after its title, the comparison image,
    and options.txt. Old option files in that folder are replaced (only files this function writes)."""
    import shutil
    reg = json.loads((MC.parent / "projects" / "projects_config.json").read_text())
    entry = next((p for p in reg["projects"].values() if p.get("id") == vid), None)
    if not entry:
        return
    od = MC.parent / "projects" / entry["dirName"] / "options"
    od.mkdir(parents=True, exist_ok=True)
    for f in od.glob("Package *.jpg"):
        f.unlink()  # previous run's package thumbnails (titles may have changed)
    lines = [f"Packaging options for {vid}", ""]
    for i, t in enumerate(rec["titles"], 1):
        src = MC / "public" / "assets" / vid / f"thumbnail_option_{i}.jpg"
        name = f"Package {i} - {safe_name(t)}.jpg"
        if src.exists():
            shutil.copy(src, od / name)
        lane = (rec.get("lanes") or [""] * 3)[i - 1]
        lines += [f"Package {i}" + (f" ({lane})" if lane else "") + (" *recommended*" if rec.get("recommend") == i else ""),
                  f"  Title:     {t}", f"  Thumbnail: {name}  [text: {rec['hooks'][i - 1]}]", ""]
    lines += ["Titles and thumbnails can be mixed. Upload with:",
              f"  .venv/bin/python motion-canvas/scripts/v2/upload_youtube.py {vid} --title N --thumb N"]
    (od / "options.txt").write_text("\n".join(lines) + "\n")
    shutil.copy(sheet_path, od / "All options side by side.jpg")
    print(f"  Options folder: {od}")


def sheet(vid):
    """Side-by-side comparison: 3 thumbnails with their option numbers, 3 titles below.
    Writes production/<id>/publish_options.jpg and prints the choices."""
    from PIL import Image, ImageDraw, ImageFont
    prod = MC / "production" / vid
    rec = json.loads((prod / "publish_options.json").read_text())
    assets = MC / "public" / "assets" / vid
    W, TH = 640, 360
    fp = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    big = ImageFont.truetype(fp, 30) if Path(fp).exists() else ImageFont.load_default()
    small = ImageFont.truetype(fp.replace("-Bold", ""), 24) if Path(fp).exists() else ImageFont.load_default()
    canvas = Image.new("RGB", (W * 3 + 40, TH + 80 + 3 * 46 + 30), "white")
    d = ImageDraw.Draw(canvas)
    for i in range(3):
        f = assets / f"thumbnail_option_{i + 1}.jpg"
        x = 10 + i * (W + 10)
        if f.exists():
            canvas.paste(Image.open(f).convert("RGB").resize((W, TH)), (x, 10))
        else:
            d.rectangle([x, 10, x + W, 10 + TH], outline="red", width=3)
            d.text((x + 20, 20), "missing", fill="red", font=big)
        d.text((x + 8, TH + 20), f"Thumbnail {i + 1}", fill="black", font=big)
    for i, t in enumerate(rec["titles"]):
        d.text((14, TH + 70 + i * 46), f"Title {i + 1}: {t}", fill="black", font=small)
    out = prod / "publish_options.jpg"
    canvas.save(out, quality=90)
    export_options(vid, rec, out)
    print("\n=== CHOOSE THE PACKAGING ===")
    lanes = rec.get("lanes") or [""] * 3
    for i, t in enumerate(rec["titles"], 1):
        print(f"  Title {i}: {t}" + (f"   ({lanes[i - 1]})" if lanes[i - 1] else ""))
    for i in range(1, 4):
        print(f"  Thumbnail {i}: public/assets/{vid}/thumbnail_option_{i}.jpg  [{rec['hooks'][i - 1]}]")
    if rec.get("recommend"):
        print(f"  Recommended: package {rec['recommend']} (title {rec['recommend']} + thumbnail {rec['recommend']}); "
              "keep the other thumbnails for YouTube Studio Test & Compare")
    print(f"  Side by side: {out}")
    print(f"  Upload with: .venv/bin/python motion-canvas/scripts/v2/upload_youtube.py {vid} --title N --thumb N")


def main():
    if "--sheet" in sys.argv:
        sheet([a for a in sys.argv[1:] if not a.startswith("--")][0])
        return 0
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2
    vid = args[0]
    prod = MC / "production" / vid
    script = json.loads((prod / "script.json").read_text())
    title, hook = script["title"].strip(), script["thumbnail"]["text"].strip()
    src = hashlib.sha256(json.dumps([title, hook]).encode()).hexdigest()[:16]
    out = prod / "publish_options.json"
    if out.exists() and "--force" not in sys.argv:
        old = json.loads(out.read_text())
        if old.get("source") == src and len(old.get("titles", [])) == 3:
            print(f"[options] up to date: {out}")
            return 0

    base = [{"angle": "script", "title": title, "hook": hook}]
    bad_base = [b for b in check(vid, base) if "characters (max" not in b]  # length is advice for the script's own title
    if len(title) > TITLE_MAX:
        print(f"  note: option 1 title is {len(title)} characters; YouTube cuts titles around {TITLE_MAX} in search")
    if bad_base:
        print("[options] the script's own title/hook fail the checks:\n  - " + "\n  - ".join(bad_base), file=sys.stderr)
        return 1
    fix, alts = "", None
    for attempt in range(3):
        p = PROMPT.format(skill=SKILL.read_text(), title=title, hook=hook, scene=script["thumbnail"].get("scene", ""),
                          outline=outline(script), figures=figures(vid), tmax=TITLE_MAX, hmax=HOOK_MAX_CHARS, fix=fix)
        try:
            text, _ = qa.claude_cli(p, model=DIRECTOR_MODEL, tools=None, effort="medium", timeout=240)
        except qa.CliError as e:
            fix = ""
            print(f"  writer call failed: {e}", file=sys.stderr)
            continue
        reply = qa.extract_json(text) or {}
        cand = reply.get("options", [])[:2]
        if len(cand) < 2 or not all(isinstance(c, dict) and c.get("scene") for c in cand):
            fix = "Your last reply was not the JSON asked for (2 options, each with title, hook and scene)."
            continue
        problems = check(vid, cand)
        lanes = [reply.get("option1_lane")] + [c.get("lane") for c in cand]
        if len(set(lanes)) < 3:
            problems.append(f"lanes repeat ({', '.join(map(str, lanes))}): each option needs a different lane")
        if not problems:
            alts = cand
            break
        fix = "Your last attempt broke these rules, fix them:\n- " + "\n- ".join(problems)
        print(f"  attempt {attempt + 1}: " + "; ".join(problems), file=sys.stderr)
    if not alts:
        print("[options] could not get 2 valid alternative titles; fix the script title or rerun", file=sys.stderr)
        return 1
    base[0].update({"lane": reply.get("option1_lane", ""), "scene": script["thumbnail"].get("scene", ""),
                    "score": reply.get("option1_score"), "why": "the script's own package"})
    opts = base + alts
    rec = {"video_id": vid, "source": src, "writer": DIRECTOR_MODEL, "skill": str(SKILL.relative_to(MC.parent)),
           "promise": reply.get("promise", {}),
           "titles": [o["title"].strip() for o in opts], "hooks": [o["hook"].strip() for o in opts],
           "scenes": [o.get("scene", "").strip() for o in opts], "lanes": [o.get("lane", "") for o in opts],
           "scores": [o.get("score") for o in opts], "why": [o.get("why", "") for o in opts],
           "recommend": reply.get("recommend"), "chosen": {"title": None, "thumbnail": None}}
    out.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + "\n")
    for i, o in enumerate(opts, 1):
        print(f"  {i}. ({o.get('lane')}, {o.get('score')}) {o['title']}   [{o['hook']}]")
    print(f"  recommended: {rec['recommend']}")
    print(f"[options] wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
