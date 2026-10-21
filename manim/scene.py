"""Minimal Manim Community Scene driven by JSON props."""

import json
from pathlib import Path

# Load JSON props for LLM workflow
props_file = Path(__file__).parent / "props.json"
if props_file.exists():
    with open(props_file, "r") as f:
        props = json.load(f)
else:
    props = {
        "title": "AI Geometric Animation with Manim",
        "color": "#38bdf8",
        "radius": 1.5,
    }

try:
    from manim import *

    class MinimalScene(Scene):
        def construct(self):
            title_text = props.get("title", "AI Geometric Animation with Manim")
            color_hex = props.get("color", "#38bdf8")
            radius = float(props.get("radius", 1.5))

            title = Text(title_text, font_size=36, color=WHITE).to_edge(UP)
            circle = Circle(radius=radius, color=color_hex)
            square = Square(side_length=radius * 1.5, color=YELLOW)

            self.play(Write(title))
            self.play(Create(circle))
            self.play(Transform(circle, square))
            self.wait(1)

except ImportError:
    # Allows module to be read/analyzed even if manim is not yet installed
    pass
