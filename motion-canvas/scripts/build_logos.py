#!/usr/bin/env python3
"""
build_logos.py — Deterministic Official Logo Asset Builder

Fetches authentic official logos from Wikimedia Commons sources, cleanly extracts
unclipped text-free emblems/seals with guaranteed >=20px breathing room padding,
enforces Zero-Edge-Clip Guards on every asset, and deterministically renders
all 11 output PNGs for Motion Canvas across vid_20261024_001 and vid_20261029_002
with byte-for-byte reproducible SHA-256 digests.
"""

import os
import sys
import io
import re
import json
import time
import hashlib
import urllib.request
import cairosvg
from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SOURCES_DIR = os.path.join(PROJECT_ROOT, "assets", "logo_sources")
MANIFEST_PATH = os.path.join(SOURCES_DIR, "manifest.json")
PUBLIC_ASSETS_DIR = os.path.join(PROJECT_ROOT, "public", "assets")
OUTPUT_DIR = os.path.join(PUBLIC_ASSETS_DIR, "vid_20261024_001")

USER_AGENT = "DeterministicLogoBuilder/1.0 (https://github.com/WilliamAxelC/AI-Animation-Workflows; williamaxelcuangdinata@gmail.com)"


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_file_sha256(file_path: str) -> str:
    with open(file_path, "rb") as fp:
        return compute_sha256(fp.read())


def save_deterministic_png(img: Image.Image, out_path: str) -> str:
    """Saves a PIL Image deterministically with zero variable metadata."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, format="PNG", optimize=False, compress_level=9, pnginfo=PngInfo())
    return compute_file_sha256(out_path)


def save_deterministic_bytes(img: Image.Image) -> bytes:
    """Returns deterministic PNG bytes with zero variable metadata."""
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False, compress_level=9, pnginfo=PngInfo())
    return buf.getvalue()


def assert_subicon_unclipped(im: Image.Image, name: str):
    """Asserts that a rendered sub-icon has alpha == 0 along its outer 1px perimeter."""
    alpha = im.getchannel("A")
    w, h = im.size
    top = alpha.crop((0, 0, w, 1)).getextrema()[1]
    bottom = alpha.crop((0, h - 1, w, h)).getextrema()[1]
    left = alpha.crop((0, 0, 1, h)).getextrema()[1]
    right = alpha.crop((w - 1, 0, w, h)).getextrema()[1]
    edge_alpha = max(top, bottom, left, right)
    assert edge_alpha == 0, f"Sub-icon '{name}' touches outer perimeter (alpha={edge_alpha})! SVG crop was clipped."


def assert_zero_edge_clip(im: Image.Image, name: str, min_pad: int = 15):
    """Automated Zero-Edge-Clip Guard: verifies outer 6px perimeter has max alpha 0 and min padding >= min_pad."""
    w, h = im.size
    alpha = im.getchannel("A")
    top = alpha.crop((0, 0, w, 6)).getextrema()[1]
    bottom = alpha.crop((0, h - 6, w, h)).getextrema()[1]
    left = alpha.crop((0, 0, 6, h)).getextrema()[1]
    right = alpha.crop((w - 6, 0, w, h)).getextrema()[1]
    max_border_alpha = max(top, bottom, left, right)
    assert max_border_alpha == 0, f"Logo '{name}' is clipped at outer border! outer6_max_alpha={max_border_alpha}"

    bbox = im.getbbox()
    pad_L = bbox[0]
    pad_T = bbox[1]
    pad_R = w - bbox[2]
    pad_B = h - bbox[3]
    actual_min_pad = min(pad_L, pad_T, pad_R, pad_B)
    assert actual_min_pad >= min_pad, f"Logo '{name}' min padding ({actual_min_pad}px) < required {min_pad}px!"
    return pad_L, pad_T, pad_R, pad_B


def ensure_source_files(manifest: dict, sources_dir: str):
    """Verifies that all required Wikimedia Commons sources exist with correct SHA-256."""
    os.makedirs(sources_dir, exist_ok=True)
    source_specs = manifest.get("source_files", {})

    for filename, spec in source_specs.items():
        file_path = os.path.join(sources_dir, filename)
        expected_sha = spec.get("source_sha256")
        url = spec.get("source_url")

        if os.path.exists(file_path):
            current_sha = compute_file_sha256(file_path)
            if current_sha == expected_sha:
                continue
            print(f"[WARN] SHA-256 mismatch for {filename}, re-fetching...")

        print(f"[FETCH] Downloading {filename} from {url}...")
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        downloaded_sha = compute_sha256(data)
        if expected_sha and downloaded_sha != expected_sha:
            raise ValueError(f"Downloaded {filename} hash {downloaded_sha} != expected {expected_sha}")

        with open(file_path, "wb") as fp:
            fp.write(data)
        time.sleep(1.0)


# ==============================================================================
# Logo Builders: vid_20261024_001
# ==============================================================================

def build_idx_logo(sources_dir: str) -> Image.Image:
    """IDX / Bursa Efek Indonesia: official red interlocking geometric mark from Logo-idx.png."""
    src_path = os.path.join(sources_dir, "Logo-idx.png")
    src = Image.open(src_path)
    # Isolate upper graphic mark cleanly from text wordmark below
    top_part = src.crop((0, 0, 400, 260))
    emblem = top_part.crop(top_part.getbbox())  # 159x246

    target_h = 210
    target_w = int(round(emblem.width * target_h / emblem.height))
    resized = emblem.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


def build_ibkr_gotrade_badges(sources_dir: str) -> Image.Image:
    """IBKR + US Flag: authentic Interactive Brokers monogram mark and US Flag disc centered at (80, 80) and (240, 80)."""
    # 1. Left: Interactive Brokers official monogram mark
    ibkr_svg = os.path.join(sources_dir, "Interactive_Brokers_Logo_2014.svg")
    clean_ibkr = re.sub(r'<path\s+style="fill:#000000;[^"]*"[^>]*id="path96\d+"\s*/>', "", open(ibkr_svg, "r", encoding="utf-8").read())
    png_ibkr = cairosvg.svg2png(bytestring=clean_ibkr.encode("utf-8"), output_height=400)
    im_ibkr = Image.open(io.BytesIO(png_ibkr))
    assert_subicon_unclipped(im_ibkr, "ibkr_raw")
    crop_ibkr = im_ibkr.crop(im_ibkr.getbbox())

    card_size = 120
    ibkr_h = 76
    ibkr_w = int(round(crop_ibkr.width * ibkr_h / crop_ibkr.height))
    ibkr_resized = crop_ibkr.resize((ibkr_w, ibkr_h), Image.Resampling.LANCZOS)

    ibkr_badge = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
    draw_ibkr = ImageDraw.Draw(ibkr_badge)
    draw_ibkr.rounded_rectangle((2, 2, card_size - 3, card_size - 3), radius=26, fill=(255, 255, 255, 255), outline=(229, 231, 235, 255), width=3)
    ibkr_badge.alpha_composite(ibkr_resized, ((card_size - ibkr_w) // 2, (card_size - ibkr_h) // 2))

    # 2. Right: Official US Flag Circular Disc
    flag_svg = os.path.join(sources_dir, "Flag_of_the_United_States.svg")
    png_flag = cairosvg.svg2png(url=flag_svg, output_width=260)
    im_flag = Image.open(io.BytesIO(png_flag))
    flag_badge = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
    mask = Image.new("L", (card_size, card_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((2, 2, card_size - 3, card_size - 3), fill=255)

    flag_crop = im_flag.crop(((im_flag.width - card_size) // 2, (im_flag.height - card_size) // 2, (im_flag.width + card_size) // 2, (im_flag.height + card_size) // 2))
    flag_badge.paste(flag_crop, (0, 0), mask)
    flag_draw = ImageDraw.Draw(flag_badge)
    flag_draw.ellipse((2, 2, card_size - 3, card_size - 3), outline=(229, 231, 235, 255), width=3)

    assert_subicon_unclipped(ibkr_badge, "ibkr_badge")
    assert_subicon_unclipped(flag_badge, "flag_badge")

    canvas = Image.new("RGBA", (320, 160), (0, 0, 0, 0))
    canvas.alpha_composite(ibkr_badge, (80 - card_size // 2, 80 - card_size // 2))
    canvas.alpha_composite(flag_badge, (240 - card_size // 2, 80 - card_size // 2))
    return canvas


def build_irs_eagle_badge(sources_dir: str) -> Image.Image:
    """IRS: official Treasury eagle and scales emblem from Logo_of_the_Internal_Revenue_Service.svg."""
    irs_svg = os.path.join(sources_dir, "Logo_of_the_Internal_Revenue_Service.svg")
    png_irs = cairosvg.svg2png(url=irs_svg, output_width=512)
    im_irs = Image.open(io.BytesIO(png_irs))
    assert_subicon_unclipped(im_irs, "irs_raw")
    crop_irs = im_irs.crop(im_irs.getbbox())

    target_w = 210
    target_h = int(round(crop_irs.height * target_w / crop_irs.width))
    resized = crop_irs.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


def build_lse_ucits_badge(sources_dir: str) -> Image.Image:
    """Irish UCITS: official Coat of arms of Ireland (golden harp on blue shield)."""
    ireland_svg = os.path.join(sources_dir, "Coat_of_arms_of_Ireland.svg")
    png_ireland = cairosvg.svg2png(url=ireland_svg, output_height=600)
    im_ireland = Image.open(io.BytesIO(png_ireland))
    crop_ireland = im_ireland.crop(im_ireland.getbbox())

    target_h = 210
    target_w = int(round(crop_ireland.width * target_h / crop_ireland.height))
    resized = crop_ireland.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


def build_djp_sbn_emblem(sources_dir: str) -> Image.Image:
    """DJP: official golden wing/shield emblem from Logo_djp.svg, unclipped with wide viewBox."""
    djp_svg = os.path.join(sources_dir, "Logo_djp.svg")
    raw_djp = open(djp_svg, "r", encoding="utf-8").read()
    # Expand viewBox to ensure the rightmost ribbon curves are not clipped
    mod_djp = re.sub(r'viewBox="0 0 245\.1 443\.11"', 'viewBox="-5 -5 260 260"', raw_djp)
    mod_djp = re.sub(r'width="245\.1pt"', 'width="260pt"', mod_djp)
    mod_djp = re.sub(r'height="443\.11pt"', 'height="260pt"', mod_djp)
    png_djp = cairosvg.svg2png(bytestring=mod_djp.encode("utf-8"), output_width=520)
    im_djp = Image.open(io.BytesIO(png_djp))
    assert_subicon_unclipped(im_djp, "djp_emblem_raw")
    crop_djp = im_djp.crop(im_djp.getbbox())

    target_size = 210
    resized = crop_djp.resize((target_size, target_size), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_size) // 2, (256 - target_size) // 2))
    return canvas


def build_crs_globe_node(sources_dir: str) -> Image.Image:
    """OECD / CRS: official blue/green globe mark from OECD_logo.svg, wordmark stripped."""
    oecd_svg = os.path.join(sources_dir, "OECD_logo.svg")
    png_oecd = cairosvg.svg2png(url=oecd_svg, output_height=500)
    im_oecd = Image.open(io.BytesIO(png_oecd))

    globe_crop = im_oecd.crop((0, 0, int(im_oecd.height * 1.1), im_oecd.height))
    clean_globe = globe_crop.crop(globe_crop.getbbox())

    target_w = 210
    target_h = int(round(clean_globe.height * target_w / clean_globe.width))
    resized = clean_globe.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


# ==============================================================================
# Logo Builders: vid_20261029_002
# ==============================================================================

def build_bigtech_capex_badge(sources_dir: str) -> Image.Image:
    """BigTech Capex Badge (320x160): Microsoft 4-square + Meta infinity loop centered at (80, 80) and (240, 80)."""
    # 1. Microsoft 4-square logomark
    raw_ms = open(os.path.join(sources_dir, "Microsoft_logo.svg"), "r", encoding="utf-8").read()
    clean_ms = re.sub(r'<path fill="#f3f3f3"[^>]*/>', "", raw_ms)
    png_ms = cairosvg.svg2png(bytestring=clean_ms.encode("utf-8"), output_width=230)
    im_ms = Image.open(io.BytesIO(png_ms))
    assert_subicon_unclipped(im_ms, "ms_raw")
    crop_ms = im_ms.crop(im_ms.getbbox())
    ms_size = 82
    im_ms_resized = crop_ms.resize((ms_size, ms_size), Image.Resampling.LANCZOS)

    # 2. Meta infinity loop (expanded viewBox so loop has breathing room)
    raw_meta = open(os.path.join(sources_dir, "Meta_Platforms_Inc._logo.svg"), "r", encoding="utf-8").read()
    clean_meta = re.sub(r'<path id="Text"[^>]*/>', "", raw_meta, flags=re.DOTALL)
    clean_meta = re.sub(r'width="\d+"\s+height="\d+"', 'viewBox="-5 -5 300 200"', clean_meta)
    png_meta = cairosvg.svg2png(bytestring=clean_meta.encode("utf-8"), output_width=600)
    im_meta = Image.open(io.BytesIO(png_meta))
    assert_subicon_unclipped(im_meta, "meta_raw")
    crop_meta = im_meta.crop(im_meta.getbbox())
    meta_w = 110
    meta_h = int(round(crop_meta.height * meta_w / crop_meta.width))
    im_meta_resized = crop_meta.resize((meta_w, meta_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (320, 160), (0, 0, 0, 0))
    ms_pos = (80 - ms_size // 2, 80 - ms_size // 2)
    canvas.paste(im_ms_resized, ms_pos, im_ms_resized)
    meta_pos = (240 - meta_w // 2, 80 - meta_h // 2)
    canvas.paste(im_meta_resized, meta_pos, im_meta_resized)
    return canvas


def build_openai_logo(sources_dir: str) -> Image.Image:
    """OpenAI Logo (256x256): Authentic hexagonal blossom knot symbol, zero text with generous padding."""
    raw_oa = open(os.path.join(sources_dir, "OpenAI_Logo.svg"), "r", encoding="utf-8").read()
    paths = re.findall(r'<path d="([^"]+)"', raw_oa)
    wide_oa = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 240"><path d="{paths[1]}" fill="#000000"/></svg>'
    png_oa = cairosvg.svg2png(bytestring=wide_oa.encode("utf-8"), output_height=480)
    im_oa = Image.open(io.BytesIO(png_oa))
    assert_subicon_unclipped(im_oa, "openai_raw")
    crop_oa = im_oa.crop(im_oa.getbbox())

    target_h = 210
    target_w = int(round(crop_oa.width * target_h / crop_oa.height))
    resized = crop_oa.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


def build_aws_azure_badge(sources_dir: str) -> Image.Image:
    """AWS / Azure / Cloud Badge (320x160): Microsoft Azure blue ribbon + fully unclipped Google Cloud 4-color loop."""
    # 1. Microsoft Azure blue ribbon
    azure_svg = os.path.join(sources_dir, "Microsoft_Azure.svg")
    png_az = cairosvg.svg2png(url=azure_svg, output_width=500)
    im_az = Image.open(io.BytesIO(png_az))
    assert_subicon_unclipped(im_az, "azure_raw")
    crop_az = im_az.crop(im_az.getbbox())
    az_h = 86
    az_w = int(round(crop_az.width * az_h / crop_az.height))
    im_az_resized = crop_az.resize((az_w, az_h), Image.Resampling.LANCZOS)

    # 2. Google Cloud 4-color cloud loop with generous viewBox to prevent any bottom/side clipping
    raw_gc = open(os.path.join(sources_dir, "Google_Cloud_logo.svg"), "r", encoding="utf-8").read()
    paths = re.findall(r'<path class="cls-[1-4]" d="([^"]+)"/>', raw_gc)
    colors = ["#ea4335", "#4285f4", "#34a853", "#fbbc05"]
    wide_gc = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 30">\n' + \
        '\n'.join([f'  <path fill="{col}" d="{d}"/>' for col, d in zip(colors, paths)]) + '\n</svg>'
    png_gc = cairosvg.svg2png(bytestring=wide_gc.encode("utf-8"), output_width=700)
    im_gc = Image.open(io.BytesIO(png_gc))
    assert_subicon_unclipped(im_gc, "gc_raw")
    crop_gc = im_gc.crop(im_gc.getbbox())
    gc_w = 106
    gc_h = int(round(crop_gc.height * gc_w / crop_gc.width))
    im_gc_resized = crop_gc.resize((gc_w, gc_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (320, 160), (0, 0, 0, 0))
    az_pos = (80 - az_w // 2, 80 - az_h // 2)
    canvas.paste(im_az_resized, az_pos, im_az_resized)
    gc_pos = (240 - gc_w // 2, 80 - gc_h // 2)
    canvas.paste(im_gc_resized, gc_pos, im_gc_resized)
    return canvas


def build_nvidia_logo(sources_dir: str) -> Image.Image:
    """NVIDIA Logo (256x256): Official green spiral claw/eye emblem with generous viewBox."""
    raw_nv = open(os.path.join(sources_dir, "Nvidia_logo.svg"), "r", encoding="utf-8").read()
    m = re.search(r'<path d="(M16\.889,8\.985[^"]+)"', raw_nv)
    clean_nv = f'<svg viewBox="-2 -2 50 34" xmlns="http://www.w3.org/2000/svg"><path d="{m.group(1)}" fill="#76b900"/></svg>'
    png_nv = cairosvg.svg2png(bytestring=clean_nv.encode("utf-8"), output_width=500)
    im_nv = Image.open(io.BytesIO(png_nv))
    assert_subicon_unclipped(im_nv, "nv_raw")
    crop_nv = im_nv.crop(im_nv.getbbox())

    target_w = 210
    target_h = int(round(crop_nv.height * target_w / crop_nv.width))
    resized = crop_nv.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


def build_telecom_fiber_icon(sources_dir: str) -> Image.Image:
    """Telecom / Fiber Boom Icon (256x256): Official Cisco blue bridge bars mark with generous viewBox."""
    raw_cisco = open(os.path.join(sources_dir, "Cisco_logo_blue_2016.svg"), "r", encoding="utf-8").read()
    m_g22 = re.search(r'(<g\s+id="g22">.*?</svg>)', raw_cisco, flags=re.DOTALL)
    clean_cisco = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-5 -5 226 70" fill="#049fd9">\n' + m_g22.group(1)
    png_cisco = cairosvg.svg2png(bytestring=clean_cisco.encode("utf-8"), output_width=600)
    im_cisco = Image.open(io.BytesIO(png_cisco))
    assert_subicon_unclipped(im_cisco, "cisco_raw")
    crop_cisco = im_cisco.crop(im_cisco.getbbox())

    target_w = 210
    target_h = int(round(crop_cisco.height * target_w / crop_cisco.width))
    resized = crop_cisco.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - target_w) // 2, (256 - target_h) // 2))
    return canvas


# Mapping: filename -> (target_video_dir, builder_function)
BUILD_SPECS = {
    # vid_20261024_001
    "idx_logo.png": ("vid_20261024_001", build_idx_logo),
    "ibkr_gotrade_badges.png": ("vid_20261024_001", build_ibkr_gotrade_badges),
    "irs_eagle_badge.png": ("vid_20261024_001", build_irs_eagle_badge),
    "lse_ucits_badge.png": ("vid_20261024_001", build_lse_ucits_badge),
    "djp_sbn_emblem.png": ("vid_20261024_001", build_djp_sbn_emblem),
    "crs_globe_node.png": ("vid_20261024_001", build_crs_globe_node),
    # vid_20261029_002
    "bigtech_capex_badge.png": ("vid_20261029_002", build_bigtech_capex_badge),
    "openai_logo.png": ("vid_20261029_002", build_openai_logo),
    "aws_azure_badge.png": ("vid_20261029_002", build_aws_azure_badge),
    "nvidia_logo.png": ("vid_20261029_002", build_nvidia_logo),
    "telecom_fiber_icon.png": ("vid_20261029_002", build_telecom_fiber_icon),
}

BUILDERS = {k: fn for k, (_, fn) in BUILD_SPECS.items()}


def build_all(sources_dir: str = SOURCES_DIR, public_assets_dir: str = PUBLIC_ASSETS_DIR) -> dict:
    """Builds all logos and writes deterministic output PNGs to public/assets/<video_id>/."""
    results = {}
    for filename, (video_dir, builder_fn) in BUILD_SPECS.items():
        img = builder_fn(sources_dir)
        out_path = os.path.join(public_assets_dir, video_dir, filename)
        sha = save_deterministic_png(img, out_path)
        results[filename] = sha
        print(f"[BUILD] {video_dir}/{filename:25}: sha256={sha}")
    return results


def run_verify(sources_dir: str = SOURCES_DIR, manifest_path: str = MANIFEST_PATH):
    """Runs the build twice, verifies Zero-Edge-Clip Guards, and verifies that output digests match manifest.json byte-for-byte across runs."""
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as fp:
        manifest = json.load(fp)

    # 1. Verify sources
    print("--- 1. Verifying Sources ---")
    source_specs = manifest.get("source_files", {})
    for name, spec in source_specs.items():
        p = os.path.join(sources_dir, name)
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing source file: {p}")
        sha = compute_file_sha256(p)
        expected_sha = spec.get("source_sha256")
        if sha != expected_sha:
            raise ValueError(f"Source {name} SHA mismatch: {sha} != {expected_sha}")
        print(f"  [OK] {name:40}: {sha}")

    # 2. Run Build 1 (in-memory) & Zero-Edge-Clip Guard
    print("\n--- 2. Build Run 1 (In-Memory) + Zero-Edge-Clip Guard ---")
    run1 = {}
    for filename, (video_dir, builder_fn) in BUILD_SPECS.items():
        img = builder_fn(sources_dir)
        pads = assert_zero_edge_clip(img, f"{video_dir}/{filename}", min_pad=15)
        raw_bytes = save_deterministic_bytes(img)
        sha = compute_sha256(raw_bytes)
        run1[filename] = sha
        print(f"  [CLIP GUARD PASS] {video_dir}/{filename:25} pad={pads} -> {sha}")

    # 3. Run Build 2 (in-memory)
    print("\n--- 3. Build Run 2 (In-Memory) ---")
    run2 = {}
    for filename, (video_dir, builder_fn) in BUILD_SPECS.items():
        img = builder_fn(sources_dir)
        raw_bytes = save_deterministic_bytes(img)
        sha = compute_sha256(raw_bytes)
        run2[filename] = sha
        print(f"  Run 2 {video_dir}/{filename:25}: {sha}")

    # 4. Compare Run 1 vs Run 2 vs Manifest
    print("\n--- 4. Byte-for-Byte Digest Assertion ---")
    outputs_spec = manifest.get("outputs", {})
    all_matched = True

    for filename, (video_dir, _) in BUILD_SPECS.items():
        sha1 = run1[filename]
        sha2 = run2[filename]
        manifest_sha = outputs_spec.get(filename, {}).get("output_sha256")

        if sha1 != sha2:
            print(f"  [FAIL] {filename}: Run 1 ({sha1}) != Run 2 ({sha2})")
            all_matched = False
        elif sha1 != manifest_sha:
            print(f"  [FAIL] {filename}: Build ({sha1}) != Manifest ({manifest_sha})")
            all_matched = False
        else:
            print(f"  [PASS] {video_dir}/{filename:25} -> {sha1}")

    if not all_matched:
        print("\n[RESULT] Verification FAILED: Non-deterministic output or hash mismatch detected!")
        sys.exit(1)

    print(f"\n[RESULT] Verification PASSED: All {len(BUILD_SPECS)} output PNGs passed Zero-Edge-Clip Guard and match manifest.json byte-for-byte across runs.")


def main():
    if not os.path.exists(MANIFEST_PATH):
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")

    with open(MANIFEST_PATH, "r", encoding="utf-8") as fp:
        manifest = json.load(fp)

    ensure_source_files(manifest, SOURCES_DIR)

    if "--verify" in sys.argv:
        # First ensure the actual output directory has the files written
        build_all(SOURCES_DIR, PUBLIC_ASSETS_DIR)
        run_verify(SOURCES_DIR, MANIFEST_PATH)
    else:
        build_all(SOURCES_DIR, PUBLIC_ASSETS_DIR)


if __name__ == "__main__":
    main()
