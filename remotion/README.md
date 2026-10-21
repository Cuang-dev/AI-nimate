# Remotion Workflow

Remotion provides code-driven video creation using React and TypeScript. Animations are deterministic, parameterized React components rendered frame-by-frame via headless Chromium.

## Render Command

To render the composition into an MP4 video driven by JSON props:

```bash
# From within remotion/
npx remotion render src/index.ts WavingStickFigure out/demo.mp4 --props=./props.json

# Or using the npm script:
npm run render
```

Output is written to `remotion/out/demo.mp4`.

## How an LLM Drives Remotion (Props/Scene JSON In, Video Out)

An LLM can parameterize animations dynamically without touching code:

1. **LLM Generates `props.json`**:
   The LLM generates structured JSON adhering to the `StickFigureProps` schema:
   ```json
   {
     "title": "Welcome to AI Video",
     "subtitle": "Generated dynamically by LLM",
     "stickFigureColor": "#38bdf8",
     "waveSpeed": 2.0
   }
   ```

2. **Automated Render Pipeline**:
   The backend pipeline passes the JSON file directly to `remotion render`:
   ```bash
   npx remotion render src/index.ts WavingStickFigure out/output.mp4 --props=./props.json
   ```

3. **Multi-Scene Composition (Advanced LLM Mode)**:
   For complex multi-scene videos, an LLM can generate a timeline array in JSON (e.g. `[{ scene: "intro", duration: 60, text: "..." }, { scene: "feature", duration: 120 }]`). Remotion's `<Series>` or `<Sequence>` components dynamically map the array into sequential React compositions.
