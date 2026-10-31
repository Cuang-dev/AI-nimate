#!/usr/bin/env python3
"""
generate_vid_20261031_002_icons.py

Swiss Vector Icon Generator for vid_20261031_002
("Knp? Saham Teknologi Raksasa Runtuh Berjamaah")

Generates 5 high-contrast, transparent-background 256x256 RGBA PNG geometric vector icons:
1. ai_chip_flame_icon.png
2. cash_burn_furnace_icon.png
3. cart_closed_icon.png
4. chart_cliff_icon.png
5. profit_shield_icon.png

Strict adherence to Rule 3: Zero baked text (no letters, numbers, $, Rp, %, or words).
Rendered at 1024x1024 and downsampled with Image.Resampling.LANCZOS to 256x256.
"""

import math
import os
from PIL import Image, ImageDraw, ImageChops
from PIL.PngImagePlugin import PngInfo

OUTPUT_DIR = "/home/agent/orca/AI-nimate/motion-canvas/public/assets/vid_20261031_002"
os.makedirs(OUTPUT_DIR, exist_ok=True)

CANVAS_SIZE = 1024
FINAL_SIZE = 256


def save_icon(img_1024: Image.Image, filename: str):
    """Downsample to 256x256 with LANCZOS and save deterministically."""
    img_256 = img_1024.resize((FINAL_SIZE, FINAL_SIZE), resample=Image.Resampling.LANCZOS)
    out_path = os.path.join(OUTPUT_DIR, filename)
    img_256.save(out_path, format="PNG", optimize=True, pnginfo=PngInfo())
    print(f"Saved: {out_path} [{img_256.size[0]}x{img_256.size[1]}, mode={img_256.mode}]")


def draw_smooth_polyline(draw: ImageDraw.ImageDraw, points, fill, width):
    """Draws a polyline with perfectly smooth rounded joints and caps."""
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=fill, width=width)
        draw.ellipse([
            points[i][0] - width // 2, points[i][1] - width // 2,
            points[i][0] + width // 2, points[i][1] + width // 2
        ], fill=fill)
    # End cap
    draw.ellipse([
        points[-1][0] - width // 2, points[-1][1] - width // 2,
        points[-1][0] + width // 2, points[-1][1] + width // 2
    ], fill=fill)


def generate_ai_chip_flame() -> Image.Image:
    """
    1. ai_chip_flame_icon.png
    Minimalist silicon processor chip square with circuit pins on all 4 sides
    and a stylized geometric crimson/amber warning spark/crack across the core (#EF4444 and #F59E0B).
    """
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pin_color = (203, 213, 225, 255)      # #CBD5E1 Slate 300
    pin_pad_color = (148, 163, 184, 255)  # #94A3B8 Slate 400
    pin_width = 20
    pin_coords = [330, 400, 472, 552, 624, 694]

    # 1. Circuit Pins (All 4 sides)
    for x in pin_coords:
        # Top pin
        draw.line([(x, 150), (x, 260)], fill=pin_color, width=pin_width)
        draw.rounded_rectangle([x - 12, 140, x + 12, 162], radius=4, fill=pin_pad_color)
        # Bottom pin
        draw.line([(x, 764), (x, 874)], fill=pin_color, width=pin_width)
        draw.rounded_rectangle([x - 12, 862, x + 12, 884], radius=4, fill=pin_pad_color)

    for y in pin_coords:
        # Left pin
        draw.line([(150, y), (260, y)], fill=pin_color, width=pin_width)
        draw.rounded_rectangle([140, y - 12, 162, y + 12], radius=4, fill=pin_pad_color)
        # Right pin
        draw.line([(764, y), (874, y)], fill=pin_color, width=pin_width)
        draw.rounded_rectangle([862, y - 12, 884, y + 12], radius=4, fill=pin_pad_color)

    # 2. Main Chip Body
    chip_box = [240, 240, 784, 784]
    draw.rounded_rectangle(chip_box, radius=44, fill=(15, 23, 42, 255), outline=(148, 163, 184, 255), width=24)

    # Pin 1 index dot marker
    draw.ellipse([275, 275, 305, 305], fill=(100, 116, 139, 255))

    # 3. Inner Silicon Die
    die_box = [350, 350, 674, 674]
    draw.rounded_rectangle(die_box, radius=24, fill=(10, 15, 29, 255), outline=(51, 65, 85, 255), width=12)

    # Corner circuit traces
    draw.line([(350, 350), (280, 280)], fill=(51, 65, 85, 255), width=8)
    draw.line([(674, 350), (744, 280)], fill=(51, 65, 85, 255), width=8)
    draw.line([(350, 674), (280, 744)], fill=(51, 65, 85, 255), width=8)
    draw.line([(674, 674), (744, 744)], fill=(51, 65, 85, 255), width=8)

    # 4. Stylized Geometric Warning Spark / Crack across Silicon Die
    # Amber Outer Glow / Polygon (#F59E0B)
    amber_poly = [
        (512, 290),
        (560, 370),
        (645, 400),
        (575, 480),
        (650, 570),
        (525, 540),
        (460, 660),
        (475, 550),
        (380, 520),
        (465, 440),
        (415, 360)
    ]
    draw.polygon(amber_poly, fill=(245, 158, 11, 255))

    # Crimson Core Spark (#EF4444)
    crimson_poly = [
        (512, 320),
        (545, 380),
        (615, 405),
        (560, 480),
        (625, 555),
        (520, 530),
        (475, 630),
        (482, 545),
        (410, 515),
        (470, 445),
        (435, 375)
    ]
    draw.polygon(crimson_poly, fill=(239, 68, 68, 255))

    # Core Highlight
    core_highlight = [
        (512, 370),
        (535, 430),
        (580, 450),
        (530, 495),
        (555, 540),
        (505, 520),
        (490, 570),
        (485, 510),
        (445, 485),
        (485, 450)
    ]
    draw.polygon(core_highlight, fill=(254, 240, 138, 255))

    # Silicon fracture cracks radiating within die
    draw.line([(460, 660), (380, 720)], fill=(239, 68, 68, 255), width=8)
    draw.line([(575, 480), (664, 460)], fill=(245, 158, 11, 255), width=8)
    draw.line([(415, 360), (350, 370)], fill=(239, 68, 68, 255), width=8)
    draw.line([(512, 290), (512, 250)], fill=(245, 158, 11, 255), width=8)

    return img


def generate_cash_burn_furnace() -> Image.Image:
    """
    2. cash_burn_furnace_icon.png
    Minimalist geometric stack of rectangular bills/bars at the bottom
    with stylized upward flame triangles/sparks above it (#F59E0B, #EF4444, #F8FAFC).
    """
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Stylized Upward Flames (Behind and above the bills)
    # Outer Crimson Flame (#EF4444)
    flame_outer = [
        (300, 640),
        (260, 500),
        (340, 430),
        (340, 320),
        (420, 340),
        (512, 130),  # Top peak
        (604, 340),
        (684, 320),
        (684, 430),
        (764, 500),
        (724, 640)
    ]
    draw.polygon(flame_outer, fill=(239, 68, 68, 255))

    # Mid Amber Flame (#F59E0B)
    flame_mid = [
        (360, 640),
        (330, 520),
        (410, 460),
        (430, 370),
        (512, 250),  # Mid peak
        (594, 370),
        (614, 460),
        (694, 520),
        (664, 640)
    ]
    draw.polygon(flame_mid, fill=(245, 158, 11, 255))

    # Inner Intense Core Flame (#FEF08A & #F8FAFC)
    flame_inner = [
        (420, 640),
        (410, 540),
        (470, 470),
        (512, 380),  # Inner peak
        (554, 470),
        (614, 540),
        (604, 640)
    ]
    draw.polygon(flame_inner, fill=(254, 240, 138, 255))

    # Floating Spark Diamonds
    sparks = [
        ((512, 70), 16, 26, (245, 158, 11, 255)),   # Top center spark
        ((320, 240), 14, 22, (239, 68, 68, 255)),   # Left spark
        ((704, 230), 14, 22, (245, 158, 11, 255)),  # Right spark
        ((220, 370), 12, 18, (245, 158, 11, 255)),  # Low left spark
        ((804, 360), 12, 18, (239, 68, 68, 255)),  # Low right spark
        ((410, 170), 10, 16, (248, 250, 252, 255)), # Bright spark
        ((620, 160), 10, 16, (254, 240, 138, 255)), # Warm spark
    ]
    for (cx, cy), hw, hh, col in sparks:
        poly = [(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)]
        draw.polygon(poly, fill=col)

    # 2. Stack of Rectangular Bills / Bars at Bottom
    # Bill 3 (Top bill in stack)
    b3 = [250, 590, 774, 680]
    draw.rounded_rectangle(b3, radius=16, fill=(30, 41, 59, 255), outline=(248, 250, 252, 255), width=12)
    draw.ellipse([472, 615, 552, 655], outline=(148, 163, 184, 255), width=6)
    draw.line([(310, 635), (430, 635)], fill=(100, 116, 139, 255), width=6)
    draw.line([(594, 635), (714, 635)], fill=(100, 116, 139, 255), width=6)

    # Bill 2 (Middle bill in stack)
    b2 = [210, 680, 814, 770]
    draw.rounded_rectangle(b2, radius=16, fill=(24, 33, 47, 255), outline=(248, 250, 252, 255), width=12)
    draw.ellipse([472, 705, 552, 745], outline=(148, 163, 184, 255), width=6)
    draw.line([(280, 725), (430, 725)], fill=(100, 116, 139, 255), width=6)
    draw.line([(594, 725), (744, 725)], fill=(100, 116, 139, 255), width=6)

    # Bill 1 (Bottom bill in stack)
    b1 = [170, 770, 854, 860]
    draw.rounded_rectangle(b1, radius=16, fill=(15, 23, 42, 255), outline=(248, 250, 252, 255), width=12)
    draw.ellipse([472, 795, 552, 835], outline=(148, 163, 184, 255), width=6)
    draw.line([(250, 815), (430, 815)], fill=(100, 116, 139, 255), width=6)
    draw.line([(594, 815), (774, 815)], fill=(100, 116, 139, 255), width=6)

    return img


def generate_cart_closed() -> Image.Image:
    """
    3. cart_closed_icon.png
    Minimalist geometric shopping cart silhouette (#00F0FF / #F8FAFC)
    overlaid with a bold crimson diagonal cancel slash / octagonal stop ring (#EF4444).
    """
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cyan = (0, 240, 255, 255)      # #00F0FF
    white = (248, 250, 252, 255)   # #F8FAFC
    crimson = (239, 68, 68, 255)   # #EF4444
    slate_border = (15, 23, 42, 255)

    # 1. Shopping Cart Silhouette
    # Cart Handle
    draw_smooth_polyline(draw, [(170, 350), (270, 450)], fill=white, width=32)

    # Basket Outer Frame
    basket_points = [(270, 450), (760, 450), (670, 660), (340, 660), (270, 450)]
    draw.polygon([(270, 450), (760, 450), (670, 660), (340, 660)], fill=(0, 240, 255, 30))
    draw_smooth_polyline(draw, basket_points, fill=cyan, width=32)

    # Basket Grid Lines
    # Horizontal wires
    draw.line([(295, 520), (730, 520)], fill=cyan, width=16)
    draw.line([(320, 590), (700, 590)], fill=cyan, width=16)
    # Vertical wires
    draw.line([(420, 450), (420, 660)], fill=cyan, width=16)
    draw.line([(505, 450), (505, 660)], fill=cyan, width=16)
    draw.line([(590, 450), (590, 660)], fill=cyan, width=16)

    # Chassis Under-frame
    draw_smooth_polyline(draw, [(350, 660), (380, 725), (630, 725)], fill=white, width=26)

    # Wheels
    # Rear wheel
    draw.ellipse([340, 725, 436, 821], fill=white)
    draw.ellipse([360, 745, 416, 801], fill=(15, 23, 42, 255))
    draw.ellipse([378, 763, 398, 783], fill=cyan)
    # Front wheel
    draw.ellipse([580, 725, 676, 821], fill=white)
    draw.ellipse([600, 745, 656, 801], fill=(15, 23, 42, 255))
    draw.ellipse([618, 763, 638, 783], fill=cyan)

    # 2. Bold Crimson Prohibition Symbol (Ring + Diagonal Slash)
    sym_layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    sym_draw = ImageDraw.Draw(sym_layer)

    center = (512, 512)
    outer_r = 390
    ring_thick = 64
    halo_thick = ring_thick + 20

    ring_box = [center[0] - outer_r, center[1] - outer_r, center[0] + outer_r, center[1] + outer_r]
    halo_box = [center[0] - (outer_r + 10), center[1] - (outer_r + 10), center[0] + (outer_r + 10), center[1] + (outer_r + 10)]

    # Dark separation halo
    sym_draw.ellipse(halo_box, outline=slate_border, width=halo_thick)
    sym_draw.line([(240, 240), (784, 784)], fill=slate_border, width=halo_thick)

    # Crimson Ring & Slash
    sym_draw.ellipse(ring_box, outline=crimson, width=ring_thick)
    sym_draw.line([(245, 245), (779, 779)], fill=crimson, width=ring_thick)

    # Mask to outer circle
    mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse(halo_box, fill=255)

    sym_alpha = ImageChops.multiply(sym_layer.getchannel("A"), mask)
    sym_layer.putalpha(sym_alpha)

    # Composite sym_layer over img
    img = Image.alpha_composite(img, sym_layer)
    return img


def generate_chart_cliff() -> Image.Image:
    """
    4. chart_cliff_icon.png
    Minimalist geometric jagged stock line plunging steeply downward
    through a dashed horizontal floor line with a sharp downward arrowhead (#EF4444 and #F8FAFC).
    """
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    crimson = (239, 68, 68, 255)  # #EF4444
    white = (248, 250, 252, 255)   # #F8FAFC
    slate_dash = (203, 213, 225, 255)  # Slate 300

    # 1. Subtle Background Grid Guides
    grid_col = (51, 65, 85, 140)
    for x in [300, 500, 700]:
        draw.line([(x, 180), (x, 700)], fill=grid_col, width=4)

    # 2. Dashed Horizontal Floor Line (Breakdown Support Level at y = 600)
    floor_y = 600
    dash_len = 44
    gap_len = 24
    curr_x = 110
    end_x = 914
    break_zone = (750, 840)  # Crash breach zone

    while curr_x < end_x:
        x_next = min(curr_x + dash_len, end_x)
        if not (curr_x >= break_zone[0] and x_next <= break_zone[1]):
            draw.line([(curr_x, floor_y), (x_next, floor_y)], fill=slate_dash, width=16)
        curr_x += dash_len + gap_len

    # 3. Translucent Cliff Plunge Fill Zone
    drop_poly = [
        (560, 210),
        (660, 420),
        (720, 360),
        (825, 800),
        (825, 600),
        (560, 600)
    ]
    draw.polygon(drop_poly, fill=(239, 68, 68, 45))

    # 4. Jagged Stock Line with Smooth Rounded Joints
    stock_points = [
        (130, 440),
        (240, 360),
        (340, 410),
        (450, 270),
        (560, 210),  # All-Time High Peak
        (660, 420),  # Initial Fall
        (720, 360),  # Dead-cat bounce
        (825, 810)   # Plunging cliff bottom
    ]
    draw_smooth_polyline(draw, stock_points, fill=crimson, width=34)

    # All-Time High luminous indicator dot
    draw.ellipse([540, 190, 580, 230], fill=white, outline=crimson, width=8)

    # 5. Sharp Downward Arrowhead plunging down-right
    tip = (844, 882)
    arrow_poly = [
        tip,
        (882, 780),  # Right wing
        (828, 808),  # Notch center
        (762, 792),  # Left wing
    ]
    draw.polygon(arrow_poly, fill=crimson)

    # 6. Fracture Shards flying at the breach point (790, 600)
    shards = [
        ([(835, 565), (855, 555), (845, 580)], white),
        ([(745, 620), (730, 640), (760, 635)], crimson),
        ([(825, 625), (845, 640), (820, 650)], crimson),
        ([(780, 570), (795, 560), (790, 580)], (245, 158, 11, 255)),
    ]
    for pts, col in shards:
        draw.polygon(pts, fill=col)

    return img


def generate_profit_shield() -> Image.Image:
    """
    5. profit_shield_icon.png
    Minimalist geometric shield outline (#10B981) containing
    three ascending bar pillars and a crisp cyan checkmark (#00F0FF).
    """
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    emerald = (16, 185, 129, 255)  # #10B981
    cyan = (0, 240, 255, 255)       # #00F0FF
    dark_slate = (15, 23, 42, 255)

    # 1. Clean Geometric Shield Construction
    # Outer shield polygon with smooth geometric curvature
    shield_pts = [
        (512, 175),  # Top center crest
        (660, 205),
        (790, 240),  # Top-right shoulder
        (790, 480),  # Right waist
        (740, 620),
        (640, 740),
        (512, 875),  # Bottom apex
        (384, 740),
        (284, 620),
        (234, 480),  # Left waist
        (234, 240),  # Top-left shoulder
        (364, 205),
    ]

    # Inner shield polygon for filled shield background
    draw.polygon(shield_pts, fill=(6, 78, 59, 140))

    # Outer shield border
    draw_smooth_polyline(draw, shield_pts + [shield_pts[0]], fill=emerald, width=34)

    # 2. Three Ascending Bar Pillars
    bar_w = 84
    base_y = 660
    bar1 = [345, 530, 345 + bar_w, base_y]   # Left bar
    bar2 = [470, 420, 470 + bar_w, base_y]   # Middle bar
    bar3 = [595, 310, 595 + bar_w, base_y]   # Right bar

    for b in [bar1, bar2, bar3]:
        draw.rounded_rectangle(b, radius=14, fill=emerald, outline=(248, 250, 252, 180), width=6)

    # Base support bar beneath pillars
    draw.line([(315, base_y + 8), (709, base_y + 8)], fill=emerald, width=14)

    # 3. Crisp Cyan Checkmark (#00F0FF)
    check_pts = [(335, 480), (460, 605), (715, 270)]

    # Dark separation halo around checkmark
    draw_smooth_polyline(draw, check_pts, fill=dark_slate, width=64)
    # Foreground Electric Cyan Checkmark
    draw_smooth_polyline(draw, check_pts, fill=cyan, width=42)

    return img


def main():
    icons = [
        ("ai_chip_flame_icon.png", generate_ai_chip_flame),
        ("cash_burn_furnace_icon.png", generate_cash_burn_furnace),
        ("cart_closed_icon.png", generate_cart_closed),
        ("chart_cliff_icon.png", generate_chart_cliff),
        ("profit_shield_icon.png", generate_profit_shield),
    ]

    for fname, gen_func in icons:
        img_1024 = gen_func()
        save_icon(img_1024, fname)

    print("All 5 icons generated successfully.")


if __name__ == "__main__":
    main()
