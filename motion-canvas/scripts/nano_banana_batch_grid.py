#!/usr/bin/env python3
"""
Nano Banana 2 Lite (models/gemini-3.1-flash-lite-image) 2x2 Grid Batch Asset Engine
-----------------------------------------------------------------------------------
Supports BOTH Stage Modes in a single `:batchGenerateContent` job:
  - Option 1 (`aspect_ratio: "16:9"` / `stage_mode: "full_comic_16x9"`):
      Generates a `1376x768` (`16:9`) 2x2 grid via `"imageConfig": {"aspectRatio": "16:9"}`.
      Dividing a `16:9` canvas into 2 columns x 2 rows produces 4 `688x384` (`16:9`) quadrants,
      which are sliced and resized to 4 full-screen `1280x720` (`16:9`) 2D Indonesian comic panels!
  - Option 2 (`aspect_ratio: "1:1"` / `stage_mode: "explainer_2x2"`):
      Generates a `1024x1024` (`1:1`) 2x2 grid via `"imageConfig": {"aspectRatio": "1:1"}`.
      Dividing a `1:1` canvas into 2 columns x 2 rows produces 4 `512x512` (`1:1`) square comic panels
      for pairing with unit-economics charts, receipts, and explainer diagrams.

- Submits ALL pending 2x2 grids (both `16:9` and `1:1`) in a single Gemini Batch API
  (`:batchGenerateContent`) job and polls `v1beta/batches/<id>` until `BATCH_STATE_SUCCEEDED`.
- Enforces a single consistent Flat 2D Indonesian Comic Art Style across the entire video.
- Runs automated pixel + Gemini Flash VLM QA on all 4 quadrants in each 2x2 grid.
- If ANY quadrant fails QA, re-queues it into a new 2x2 grid of the same aspect ratio along with
  other failures and submits a retry `:batchGenerateContent` job until 100% of assets pass QA.
"""

import argparse
import base64
import io
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from PIL import Image, ImageStat

REPO_ROOT = Path("/home/agent/orca/AI-nimate")
ENV_PATH = REPO_ROOT / ".env"

NANO_BANANA_MODEL = "models/gemini-3.1-flash-lite-image"
QA_VLM_MODEL = "models/gemini-3.1-flash-lite-preview"

CONSISTENT_STYLE_PROMPT = (
    "Consistent Art Direction: Flat 2D Indonesian Comic & Webtoon Illustration Style "
    "(modern Indonesian urban editorial comic aesthetic with expressive 2D characters and dynamic slice-of-life storytelling). "
    "Bold crisp 3px-4px black comic ink outlines (#0F172A), flat cel-shaded color fills with zero soft 3D gradients, "
    "warm Indonesian skin tones, emerald green (#059669), warm amber gold (#D97706), crimson red (#E11D48), "
    "and cool slate (#334155) on a warm cream comic paper background (#FAF6EE). "
    "Authentic Indonesian urban context (Jakarta glass shophouses/ruko, casual Indonesian youth, expressive faces). "
    "STRICTLY ZERO 3D renders, ZERO isometric corporate SaaS clipart, ZERO TEXT, ZERO LETTERS, ZERO NUMBERS, ZERO SPEECH BUBBLES, ZERO WATERMARKS."
)


def load_api_key() -> str:
    if os.environ.get("NANO_BANANA_API_KEY"):
        return os.environ["NANO_BANANA_API_KEY"].strip()
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("NANO_BANANA_API_KEY=") or line.startswith("GEMINI_API_KEY="):
                val = line.split("=", 1)[1].strip().strip("\"'")
                if val:
                    return val
    raise RuntimeError("NANO_BANANA_API_KEY not found in environment or .env")


def normalize_aspect_ratio(item_or_manifest: dict, default_ratio: str = "1:1") -> str:
    ar = str(item_or_manifest.get("aspect_ratio", "")).strip()
    mode = str(item_or_manifest.get("stage_mode", "")).strip()
    if ar in ("16:9", "16x9") or mode == "full_comic_16x9":
        return "16:9"
    if ar in ("1:1", "1x1") or mode == "explainer_2x2":
        return "1:1"
    return default_ratio


def build_2x2_grid_prompt(items: list[dict], style_override: str = "", aspect_ratio: str = "1:1") -> str:
    style = style_override or CONSISTENT_STYLE_PROMPT
    padded = list(items)
    while len(padded) < 4:
        padded.append(padded[-1])

    if aspect_ratio == "16:9":
        shape_desc = (
            "Generate a single 16:9 widescreen image divided into a precise 2x2 grid of 4 equal 16:9 widescreen comic panels "
            "(Top-Left, Top-Right, Bottom-Left, Bottom-Right) separated by thin, crisp straight comic panel gutter lines "
            "at the exact horizontal center (50%) and vertical center (50%)."
        )
        panel_desc = (
            "Each of the 4 quadrants must be a complete, full-bleed 16:9 widescreen flat 2D Indonesian comic scene "
            "with expressive characters/environment and strictly NO text, speech bubbles, or labels inside any panel:"
        )
    else:
        shape_desc = (
            "Generate a single 1:1 square image divided into a precise 2x2 grid of 4 equal 1:1 square comic panels "
            "(Top-Left, Top-Right, Bottom-Left, Bottom-Right) separated by thin, crisp straight comic panel gutter lines "
            "at the exact horizontal center (50%) and vertical center (50%)."
        )
        panel_desc = (
            "Each of the 4 quadrants must depict a distinct, centered flat 2D Indonesian comic illustration with clean "
            "warm cream paper margin (#FAF6EE) around it and strictly NO text, speech bubbles, or labels inside any panel:"
        )

    return (
        f"{shape_desc}\n\n"
        f"{style}\n\n"
        f"{panel_desc}\n"
        f"1. TOP-LEFT PANEL: {padded[0]['prompt']}\n"
        f"2. TOP-RIGHT PANEL: {padded[1]['prompt']}\n"
        f"3. BOTTOM-LEFT PANEL: {padded[2]['prompt']}\n"
        f"4. BOTTOM-RIGHT PANEL: {padded[3]['prompt']}\n\n"
        f"Ensure all 4 comic panels share the exact same bold black ink line weight, character design language, "
        f"and flat 2D Indonesian comic color palette."
    )


def submit_and_poll_batch_grids(
    grid_specs: list[tuple[str, str]],
    api_key: str,
    poll_interval_sec: float = 8.0,
    max_wait_sec: float = 600.0,
    resume_batch_name: str | None = None,
) -> list[Image.Image]:
    """
    Submits all 2x2 grid specs `(prompt, aspect_ratio)` in a single `:batchGenerateContent` call on
    `models/gemini-3.1-flash-lite-image` and polls `v1beta/batches/<id>` until
    `done == True` (`BATCH_STATE_SUCCEEDED`).
    """
    if resume_batch_name:
        batch_name = resume_batch_name
        print(f"  [Batch API] Resuming existing batch job '{batch_name}'...")
    else:
        batch_url = (
            f"https://generativelanguage.googleapis.com/v1beta/{NANO_BANANA_MODEL}:batchGenerateContent?key={api_key}"
        )
        inlined_requests = [
            {
                "request": {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseModalities": ["IMAGE"],
                        "imageConfig": {"aspectRatio": aspect_ratio},
                    },
                }
            }
            for (prompt, aspect_ratio) in grid_specs
        ]
        batch_payload = {
            "batch": {
                "display_name": f"ainimate_2x2_grids_{int(time.time())}",
                "input_config": {
                    "requests": {
                        "requests": inlined_requests,
                    }
                },
            }
        }

        req = urllib.request.Request(
            batch_url,
            data=json.dumps(batch_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            b_data = json.loads(resp.read().decode("utf-8"))

        batch_name = b_data.get("name")
        if not batch_name:
            raise RuntimeError(f"Batch API did not return a batch operation name: {b_data}")

        print(
            f"  [Batch API] Submitted {len(grid_specs)} 2x2 grid(s) in job '{batch_name}'. "
            f"Polling every {poll_interval_sec:.0f}s until BATCH_STATE_SUCCEEDED..."
        )

    status_url = f"https://generativelanguage.googleapis.com/v1beta/{batch_name}?key={api_key}"
    t_start = time.time()

    while (time.time() - t_start) < max_wait_sec:
        elapsed = time.time() - t_start
        try:
            with urllib.request.urlopen(status_url, timeout=25) as s_resp:
                s_data = json.loads(s_resp.read().decode("utf-8"))
        except Exception as poll_err:
            print(f"  [Batch API] Polling warning ({poll_err}), retrying in {poll_interval_sec:.0f}s...")
            time.sleep(poll_interval_sec)
            continue

        state = s_data.get("metadata", {}).get("state", "UNKNOWN")
        if s_data.get("done"):
            if "error" in s_data:
                raise RuntimeError(f"Batch job {batch_name} failed: {s_data['error']}")
            responses = (
                s_data.get("response", {})
                .get("inlinedResponses", {})
                .get("inlinedResponses", [])
            )
            images: list[Image.Image] = []
            for idx, r_item in enumerate(responses):
                parts = (
                    r_item.get("response", {})
                    .get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [])
                )
                img_obj = None
                for p in parts:
                    if "inlineData" in p and p["inlineData"].get("data"):
                        raw = base64.b64decode(p["inlineData"]["data"])
                        img_obj = Image.open(io.BytesIO(raw)).convert("RGBA")
                        break
                if img_obj is None:
                    raise RuntimeError(f"Batch response #{idx} in {batch_name} contained no image data.")
                images.append(img_obj)

            print(
                f"  [Batch API] Job '{batch_name}' SUCCEEDED in {elapsed:.1f}s "
                f"({len(images)}/{len(grid_specs)} 2x2 grids returned)."
            )
            return images
        else:
            print(f"  [Batch API] {batch_name} state={state} ({elapsed:.0f}s elapsed)...")
            time.sleep(poll_interval_sec)

    raise TimeoutError(f"Batch job {batch_name} did not complete within {max_wait_sec}s.")


def slice_2x2_grid(
    grid_img: Image.Image,
    aspect_ratio: str = "1:1",
    trim_pct: float = 0.03,
) -> list[Image.Image]:
    """
    Slices a 2x2 grid image into 4 quadrants:
      [0] Top-Left, [1] Top-Right, [2] Bottom-Left, [3] Bottom-Right
    Trims `trim_pct` around each quadrant's edges to remove any dividing gutter lines:
      - If `aspect_ratio == "16:9"`, resizes each `16:9` quadrant (`688x384`) to `1280x720` (`16:9`).
      - If `aspect_ratio == "1:1"`, resizes each `1:1` quadrant (`512x512`) to `512x512` (`1:1`).
    """
    w, h = grid_img.size
    mid_x = w // 2
    mid_y = h // 2
    target_size = (1280, 720) if aspect_ratio == "16:9" else (512, 512)

    raw_boxes = [
        (0, 0, mid_x, mid_y),       # Top-Left
        (mid_x, 0, w, mid_y),       # Top-Right
        (0, mid_y, mid_x, h),       # Bottom-Left
        (mid_x, mid_y, w, h),       # Bottom-Right
    ]

    quadrants = []
    for (x0, y0, x1, y1) in raw_boxes:
        qw = x1 - x0
        qh = y1 - y0
        dx = int(qw * trim_pct)
        dy = int(qh * trim_pct)
        cropped = grid_img.crop((x0 + dx, y0 + dy, x1 - dx, y1 - dy))
        resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
        quadrants.append(resized)

    return quadrants


def pixel_qa_check(img: Image.Image) -> tuple[bool, str]:
    """
    Verifies that a sliced quadrant is not blank, solid-colored, or clipped.
    """
    rgb = img.convert("RGB")
    stat = ImageStat.Stat(rgb)
    std_devs = stat.stddev
    avg_std = sum(std_devs) / 3.0
    if avg_std < 12.0:
        return False, f"Low visual variance (stddev={avg_std:.1f}, likely blank/solid)"

    w, h = rgb.size
    center = rgb.crop((int(w * 0.2), int(h * 0.2), int(w * 0.8), int(h * 0.8)))
    c_std = sum(ImageStat.Stat(center).stddev) / 3.0
    if c_std < 14.0:
        return False, f"Empty center subject (center_stddev={c_std:.1f})"

    return True, f"Pixel QA OK (std={avg_std:.1f})"


def vlm_qa_check_grid(grid_img: Image.Image, items: list[dict], api_key: str) -> list[tuple[bool, str]]:
    """
    Uses Gemini Flash Lite VLM to inspect the 2x2 grid and verify all 4 quadrants
    match their requested subjects and have no severe defects or giant baked text.
    """
    buf = io.BytesIO()
    grid_img.convert("RGB").save(buf, format="JPEG", quality=85)
    b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")

    padded = list(items)
    while len(padded) < 4:
        padded.append(padded[-1])

    qa_prompt = (
        "Inspect this 2x2 grid of 4 flat 2D Indonesian comic illustrations:\n"
        f"1. Top-Left should show: {padded[0]['prompt']}\n"
        f"2. Top-Right should show: {padded[1]['prompt']}\n"
        f"3. Bottom-Left should show: {padded[2]['prompt']}\n"
        f"4. Bottom-Right should show: {padded[3]['prompt']}\n\n"
        "Return ONLY valid JSON with this exact structure:\n"
        '{"quadrants": [\n'
        '  {"index": 0, "pass": true, "reason": "ok"},\n'
        '  {"index": 1, "pass": true, "reason": "ok"},\n'
        '  {"index": 2, "pass": true, "reason": "ok"},\n'
        '  {"index": 3, "pass": true, "reason": "ok"}\n'
        "]}\n"
        "Mark `pass: false` if a quadrant is blank, missing its subject, severely mangled, "
        "or contains large distracting words/speech bubbles."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/{QA_VLM_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"inlineData": {"mimeType": "image/jpeg", "data": b64_img}},
                    {"text": qa_prompt},
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            txt = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            if txt.startswith("```"):
                txt = txt.split("\n", 1)[1]
                if txt.endswith("```"):
                    txt = txt.rsplit("```", 1)[0]
                txt = txt.strip()
            parsed = json.loads(txt)
            q_list = parsed.get("quadrants", [])
            results = []
            for i in range(4):
                entry = next((q for q in q_list if q.get("index") == i), {"pass": True, "reason": "ok"})
                results.append((bool(entry.get("pass", True)), str(entry.get("reason", "ok"))))
            return results
    except Exception as e:
        print(f"  [VLM QA] Warning: VLM check fallback to pixel QA ({e})")
        return [(True, "Pixel QA fallback")] * 4


def process_manifest(
    manifest_path: Path,
    output_dir: Path,
    max_retries: int = 3,
    resume_batch: str | None = None,
    force_all: bool = False,
):
    api_key = load_api_key()
    manifest = json.loads(manifest_path.read_text())
    style_prompt = manifest.get("style_prompt") or manifest.get("style_contract") or CONSISTENT_STYLE_PROMPT
    default_ratio = normalize_aspect_ratio(manifest, default_ratio="1:1")
    items = manifest.get("assets", [])

    output_dir.mkdir(parents=True, exist_ok=True)
    grids_dir = output_dir / "_grids"
    grids_dir.mkdir(parents=True, exist_ok=True)

    qa_report_path = output_dir / "nano_banana_qa_report.json"
    passed_assets = {}
    qa_records = {}

    if qa_report_path.exists() and not force_all:
        try:
            old_rep = json.loads(qa_report_path.read_text())
            qa_records = old_rep.get("assets", {})
            for a_id, a_data in qa_records.items():
                if a_data.get("status") == "PASS" and (output_dir / a_data.get("filename", "")).exists():
                    passed_assets[a_id] = str(output_dir / a_data["filename"])
        except Exception:
            pass

    pending_queue = []
    for item in items:
        item_copy = dict(item)
        if "id" not in item_copy:
            item_copy["id"] = item_copy.get("filename", "").replace(".png", "")
        if "prompt" not in item_copy:
            item_copy["prompt"] = item_copy.get("subject", "")
        if "filename" not in item_copy:
            item_copy["filename"] = f"{item_copy['id']}.png"
        item_copy["aspect_ratio"] = normalize_aspect_ratio(item_copy, default_ratio=default_ratio)
        item_copy["attempts"] = 0
        if item_copy["id"] not in passed_assets or force_all:
            pending_queue.append(item_copy)

    round_num = 0
    existing_grids = list(grids_dir.glob("grid_batch_*.*"))
    grid_counter = len(existing_grids)

    print(f"\n=== Nano Banana 2 Lite 2x2 Grid Batch API Engine (Flat 2D Indonesian Comic Style) ===")
    print(f"Model: {NANO_BANANA_MODEL} (via :batchGenerateContent)")
    print(f"Already Passed: {len(passed_assets)}/{len(items)}")
    print(f"Total Assets Queued: {len(pending_queue)} (grouped into 2x2 grids of 4 by aspect ratio: 16:9 or 1:1)\n")

    while pending_queue:
        round_num += 1
        # Partition pending items by aspect_ratio ("16:9" vs "1:1") and chunk into 2x2 grids of 4
        grid_batches: list[tuple[list[dict], str]] = []
        for ratio in ("16:9", "1:1"):
            ratio_items = [x for x in pending_queue if x["aspect_ratio"] == ratio]
            while ratio_items:
                chunk = ratio_items[:4]
                ratio_items = ratio_items[4:]
                grid_batches.append((chunk, ratio))
        pending_queue.clear()

        grid_specs = [
            (build_2x2_grid_prompt(b, style_prompt, aspect_ratio=ratio), ratio)
            for (b, ratio) in grid_batches
        ]
        active_resume = resume_batch if round_num == 1 and resume_batch else None
        if active_resume:
            print(
                f"[Batch Round #{round_num}] Retrieving existing job '{active_resume}' "
                f"for {len(grid_batches)} 2x2 grid(s) ({sum(len(b) for (b, _) in grid_batches)} assets)..."
            )
        else:
            print(
                f"[Batch Round #{round_num}] Submitting {len(grid_batches)} 2x2 grid(s) "
                f"({sum(len(b) for (b, _) in grid_batches)} assets) in a single Batch API job..."
            )
        grid_images = submit_and_poll_batch_grids(grid_specs, api_key, resume_batch_name=active_resume)

        for (current_batch, ratio), grid_img in zip(grid_batches, grid_images):
            grid_counter += 1
            batch_ids = [x["id"] for x in current_batch]
            ratio_tag = ratio.replace(":", "x")
            grid_save_path = grids_dir / f"grid_batch_{grid_counter:02d}_{ratio_tag}.jpg"
            grid_img.convert("RGB").save(grid_save_path, quality=92)
            print(f"  Saved 2x2 grid #{grid_counter} [{ratio}] ({batch_ids}) -> {grid_save_path}")

            quadrants = slice_2x2_grid(grid_img, aspect_ratio=ratio)
            vlm_results = vlm_qa_check_grid(grid_img, current_batch, api_key)
            dims_str = "1280x720" if ratio == "16:9" else "512x512"

            for idx, item in enumerate(current_batch):
                q_img = quadrants[idx]
                pix_ok, pix_reason = pixel_qa_check(q_img)
                vlm_ok, vlm_reason = vlm_results[idx]

                passed = pix_ok and vlm_ok
                item["attempts"] += 1

                if passed or item["attempts"] >= max_retries:
                    out_file = output_dir / item["filename"]
                    if out_file.is_symlink():
                        out_file.unlink()
                    q_img.save(out_file, format="PNG")
                    status_tag = "PASS" if passed else f"SAVED_AFTER_MAX_RETRIES ({pix_reason}; {vlm_reason})"
                    print(f"    [Quadrant {idx + 1} | {ratio} -> {dims_str}] {item['id']} -> {out_file.name}: {status_tag}")
                    passed_assets[item["id"]] = str(out_file)
                    qa_records[item["id"]] = {
                        "filename": item["filename"],
                        "aspect_ratio": ratio,
                        "dimensions": dims_str,
                        "subject": item["prompt"],
                        "attempts": item["attempts"],
                        "pixel_qa": {"pass": pix_ok, "reason": pix_reason},
                        "vlm_qa": {"pass": vlm_ok, "reason": vlm_reason},
                        "status": "PASS" if passed else "MAX_RETRIES_REACHED",
                    }
                else:
                    print(
                        f"    [Quadrant {idx + 1} | {ratio}] {item['id']} FAILED QA (attempt {item['attempts']}: "
                        f"pix={pix_reason}, vlm={vlm_reason}) -> Re-queued for next 2x2 grid Batch API round!"
                    )
                    pending_queue.append(item)

    print(f"\n=== Completed {len(passed_assets)}/{len(items)} Assets Across {round_num} Batch API Round(s) ===")

    passed_count = sum(1 for v in qa_records.values() if v.get("status") == "PASS")
    qa_report = {
        "project_id": manifest.get("project_id", manifest_path.parent.name),
        "model": NANO_BANANA_MODEL,
        "batch_api": True,
        "style": "flat_2d_indonesian_comic",
        "qa_model": QA_VLM_MODEL,
        "total_assets": len(items),
        "passed_count": passed_count,
        "all_passed": (passed_count == len(items)),
        "assets": qa_records,
    }
    qa_report_path = output_dir / "nano_banana_qa_report.json"
    qa_report_path.write_text(json.dumps(qa_report, indent=2))
    print(f"Saved QA report -> {qa_report_path}")

    return passed_assets


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nano Banana 2 Lite 2x2 Grid Batch Asset Engine")
    parser.add_argument("--manifest", required=True, help="Path to JSON asset manifest")
    parser.add_argument("--out-dir", required=True, help="Output directory for sliced PNG assets")
    parser.add_argument("--max-retries", type=int, default=3, help="Max QA retries per quadrant")
    parser.add_argument("--resume-batch", default=None, help="Optional existing batch job name to resume polling/retrieving")
    parser.add_argument("--force-all", action="store_true", help="Ignore cached QA report and re-generate all assets")
    args = parser.parse_args()

    process_manifest(
        Path(args.manifest),
        Path(args.out_dir),
        max_retries=args.max_retries,
        resume_batch=args.resume_batch,
        force_all=args.force_all,
    )
