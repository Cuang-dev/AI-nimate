# Manim Community Workflow

Manim (Mathematical Animation Engine) is a Python-based animation engine designed for programmatic mathematical, scientific, and geometric video generation.

## Render Command

To render the scene at low quality (480p at 15 fps) for fast LLM feedback loops:

```bash
# Inside manim/ with activated venv:
manim -ql scene.py MinimalScene
```

The output video is saved by default to:
`manim/media/videos/scene/480p15/MinimalScene.mp4`

For high-definition output (1080p60):
```bash
manim -qh scene.py MinimalScene
```

## How an LLM Drives Manim (Props/Scene JSON In, Video Out)

1. **LLM Generates `props.json`**:
   The LLM generates structured parameters (titles, mathematical formulas, geometric colors, coordinates):
   ```json
   {
     "title": "Fourier Transform Decomposition",
     "color": "#38bdf8",
     "radius": 1.5
   }
   ```

2. **Scene Loads Props Dynamically**:
   `scene.py` parses `props.json` and feeds values directly into Manim's mathematical primitives (`Text`, `Circle`, `Transform`, `MathTex`).

3. **CLI Execution**:
   The automated agent invokes `manim -ql scene.py MinimalScene` and retrieves the resulting MP4 from `media/`.

## System Dependencies and Pip Wheel Status

- **System Requirements**: Manim Community requires C libraries: `libcairo2-dev`, `libpango1.0-dev`, `pkg-config`, and `python3-dev`.
- **Pip Wheels Report**: On Linux x86_64, PyPI does not host precompiled binary wheels for `manimpango` and `pycairo`. Installing via pip/uv attempts to build C extensions from source. Without sudo access to install `pkg-config` and `python3-dev` / `libcairo2-dev`, building `manimpango` and `pycairo` wheels fails (`Python.h` and `pkg-config` not found). Once system dev libraries are installed, Manim installs cleanly in any Python virtualenv.
