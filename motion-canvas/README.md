# Motion Canvas Workflow

Motion Canvas is a programmatic animation library based on TypeScript and generator functions (`yield*`). It provides precision timing, procedural animations, and visual canvas components.

## Render Command

While Motion Canvas was architecturally built around an interactive browser editor, headless rendering **is feasible** using our automated Playwright driver script paired with the official `@motion-canvas/ffmpeg` exporter:

```bash
# From within motion-canvas/
node render.mjs

# Or using the npm script:
npm run render
```

This script:
1. Programmatically starts the Vite development server with the `@motion-canvas/ffmpeg` plugin.
2. Launches headless Chromium via Playwright.
3. Selects the FFmpeg video exporter in the editor settings and triggers the render cycle.
4. Waits for the video stream to finish encoding and saves the MP4 to `motion-canvas/output/project.mp4`.

## Interactive Editor Mode

To develop scenes interactively in the browser:

```bash
npm run dev
```

Navigate to `http://localhost:9000` to preview animations in real time with frame scrubbing.

## How an LLM Drives Motion Canvas (Props/Scene JSON In, Video Out)

1. **LLM Writes `src/props.json`**:
   The LLM updates scene parameters (text, colors, scale factors, layout positions):
   ```json
   {
     "title": "Autonomous Agent Network",
     "shape": "circle",
     "primaryColor": "#6366f1",
     "scale": 1.5
   }
   ```

2. **TypeScript Scene Imports and Binds Props**:
   In `src/scenes/example.tsx`, procedural generators yield animation steps referencing the props:
   ```tsx
   import sceneProps from '../props.json';
   ...
   yield* all(
     circleRef().size(160 * sceneProps.scale, 1.0),
     textRef().opacity(1, 0.8)
   );
   ```

3. **Automated Headless Export**:
   The automation orchestrator executes `node render.mjs` to produce `output/project.mp4`.
