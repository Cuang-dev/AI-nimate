# Agent Handoff: Chapters vs Beats Architecture, Dual Stage Modes (`16:9` Full Comic vs `2x2` Explainer), Flat 2D Indonesian Comic Batch Pipeline & Mahjong Episode Rebuild (`vid_20261102_001`)
**Date & Time**: 2026-11-07 21:45:00 WIB (UTC+7)
**Previous Agent Role**: Senior Systems Architect & Pipeline Engineer (`Antigravity`)
**Incoming Agent Target**: Production / QA / Release Agent

---

## 1. Executive Summary

This session upgraded the **AI-nimate** production pipeline, subagent definitions, and QA verification gates, and rebuilt the 8-minute investigative business breakdown episode **`POV: Buka Sewa Meja Mahjong Otomatis (Lounge Ruko Rp350 Juta vs Rental Garasi Rp60 Juta)`** (`vid_20261102_001` / [`projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/`](file:///home/agent/orca/AI-nimate/projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/)) from scratch.

Key architectural advancements established and codified in this session:
1. **Canonical Terminology (`Chapters` vs `Beats`)**:
   - **`Chapters` (`chapters[]` in `script.json`, mapped to `beat_01.tsx`–`beat_NN.tsx` in Motion Canvas)**: Macro sub-chapters where one main stage remains on screen while sentence-level beats animate inside it. Dynamic count (never capped at 5 or 10; typically 4–6 chapters for 60s Shorts, 7–14 chapters for 8–10 min long-form essays).
   - **`Beats` (`beats[]` inside each chapter)**: Individual sentence-level (and clause-level in the hook) visual cues (`yield* waitUntilSceneTime(...)`) synced within `±0.3s` of `timings.json` (`beat_cue_schedule.json`).
2. **Profitability Paradox Hook (`<3.5s` Anomaly + Rapid Clause-Level Hook Beats)**:
   - Business breakdown scripts open immediately by contrasting the tiny unit customer price (`Rp15.000/orang/jam` — cheaper than iced coffee) against the massive setup CapEx (`Rp350 juta modal ruko`) and questioning how it generates `Rp180 juta/bulan`, teasing the `5-hour lock-in` + `70% F&B margin` engine with **13 rapid clause-level visual Beats** in Chapter 1 (`beat_01.tsx`).
3. **Dual Stage Modes (`Option 1: full_comic_16x9` vs `Option 2: explainer_2x2`)**:
   - **`stage_mode: "full_comic_16x9"` (Option 1)**: Full-screen widescreen `16:9` (`1280x720`) 2D Indonesian comic panels (generated 4-per-grid via `"imageConfig": {"aspectRatio": "16:9"}`) for narrative/storytelling Chapters (`chapter_01`, `chapter_02`, `chapter_05`, `chapter_08`, `chapter_09`), swapping panels or animating callout badges on every sentence Beat.
   - **`stage_mode: "explainer_2x2"` (Option 2)**: Square `1:1` (`512x512`) 2D Indonesian comic panels (generated 4-per-grid via `"imageConfig": {"aspectRatio": "1:1"}`) paired with quantitative explainer charts, unit-economics tables, and axis graphs (`chapter_03`, `chapter_04`, `chapter_06`, `chapter_07`, `chapter_10`).
4. **Flat 2D Indonesian Comic Art Style & Nano Banana 2 Lite Batching (`nano_banana_batch_grid.py`)**:
   - Upgraded [`motion-canvas/scripts/nano_banana_batch_grid.py`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/nano_banana_batch_grid.py) to use `models/gemini-3.1-flash-image-preview` via `:batchGenerateContent`, grouping assets by aspect ratio (`"16:9"` and `"1:1"`) into 2x2 grids, auto-slicing into `1280x720` or `512x512` PNGs, running vision QA, and re-batching any failed panels into a new 2x2 grid until `all_passed: true`.
5. **Natural Jakarta Indonesian Voiceover (`Puck` + `tts_style_prompt`)**:
   - Upgraded Gemini TTS synthesis ([`synthesize_vid_20261102_001.py`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/synthesize_vid_20261102_001.py)) to use the `Puck` voice with an explicit conversational Indonesian creator style prompt (`tts_style_prompt`), stripping robotic newsreader prosody and spoken `"P-O-V"` prefixes.

---

## 2. System & Environment State
- **Workspace Root**: `/home/agent/orca/AI-nimate` (symlinked at `/home/agent/orca/AI-Animation-Workflows`)
- **Python & Audio Alignment**: Python 3.14 (`faster-whisper` `small` model using `ffmpeg` `float32` 16kHz PCM numpy buffer decoding to bypass PyAV `metadata_errors` incompatibility).
- **Rendering & Portal Pipeline**: Node.js + Motion Canvas sequential renderer ([`motion-canvas/render.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render.mjs)), 16-check QA gate ([`motion-canvas/scripts/qa_verify.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs)), and Portal v2 builder ([`motion-canvas/scripts/build_portal.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/build_portal.mjs)).

---

## 3. Milestones Completed in this Session

- **[`motion-canvas/scripts/nano_banana_batch_grid.py`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/nano_banana_batch_grid.py)**:
  - Upgraded to support **Flat 2D Indonesian Comic Illustration Style** (`FLAT_2D_COMIC_STYLE`) and dual aspect-ratio 2x2 grid batching (`"16:9"` $\rightarrow$ `2752x1536` grid sliced to 4x `1280x720`; `"1:1"` $\rightarrow$ `2048x2048` grid sliced to 4x `512x512`) via `:batchGenerateContent` on `models/gemini-3.1-flash-image-preview`, with automated + vision QA and automatic 2x2 re-batching of any failed panels.
- **[`.agents/agents/thinking-scriptwriter/agent.md`](file:///home/agent/orca/AI-nimate/.agents/agents/thinking-scriptwriter/agent.md)** & **[`.agents/skills/youtube-scriptwriting/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/youtube-scriptwriting/SKILL.md)**:
  - Codified canonical `Chapters` (macro sub-chapters) vs `Beats` (sentence/clause-level visual cues) terminology, the **Profitability Paradox Hook (`<3.5s`)**, Dual Stage Modes (`full_comic_16x9` vs `explainer_2x2`), and natural Jakarta Indonesian oral prosody (`tts_style_prompt`).
- **[`.agents/agents/nano-banana-asset-generator/agent.md`](file:///home/agent/orca/AI-nimate/.agents/agents/nano-banana-asset-generator/agent.md)** & **[`.agents/skills/visual-scene-director/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md)**:
  - Updated asset generator and scene director specifications for Flat 2D Indonesian Comic style, dual aspect-ratio 2x2 grid batching, and the **Outer Card `<Rect>` Non-Flex Rule**.
- **[`.agents/agents/flash-coder/agent.md`](file:///home/agent/orca/AI-nimate/.agents/agents/flash-coder/agent.md)**, **[`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md)**, & **[`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md)**:
  - Synchronized all agent instructions and master production guides with the 6-step workflow, `Chapters` vs `Beats` architecture, Dual Stage Modes, and Motion Canvas layout invariants.
- **Full Clean Rebuild of `vid_20261102_001` (`kausalmedia_20261102_pov-buka-sewa-meja-mahjong`)**:
  - [`script_cot.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/script_cot.md) & [`script.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/script.json): 10 Chapters (`5x full_comic_16x9` + `5x explainer_2x2`), 1,121 words, 104 sentence/clause visual Beats (`13` rapid hook beats in Chapter 1).
  - [`public/audio/vid_20261102_001_narration.wav`](file:///home/agent/orca/AI-nimate/motion-canvas/public/audio/vid_20261102_001_narration.wav) & [`timings.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/timings.json): `473.89s` (`7m 54s`) natural Jakarta Indonesian (`Puck`) voiceover, 1,158 words aligned, 386 subtitle chunks (`0` violations), and [`beat_cue_schedule.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/beat_cue_schedule.json).
  - [`public/assets/vid_20261102_001/`](file:///home/agent/orca/AI-nimate/motion-canvas/public/assets/vid_20261102_001/): 20 Flat 2D Indonesian Comic PNG panels (`12x 1280x720` `16:9` widescreen + `8x 512x512` `1:1` square), verified `all_passed: true` in [`nano_banana_qa_report.json`](file:///home/agent/orca/AI-nimate/motion-canvas/public/assets/vid_20261102_001/nano_banana_qa_report.json).
  - [`src/scenes/vid_20261102_001/`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261102_001/): `layout.tsx`, `timings.ts`, and `beat_01.tsx`–`beat_10.tsx`.

---

## 4. Root Cause Analyses & Bug Fixes

### Bug 1: Stacked `<Img>` Panels & Coordinate Charts Collapsing Inside `<Rect layout>` Containers
- **Symptom**: In `beat_06`, `beat_07`, and `beat_10`, stacked `1:1` cross-fading `<Img>` panels appeared blank or pushed out of their `clip` frame when `imageSwap` animated to `1`; in `beat_04` and `beat_06`, coordinate-positioned `<Line>` and `<Txt>` elements inside the bottom chart `<Rect>` collapsed into a single horizontal line even when wrapped in `<Node layout={false}>`.
- **Root Cause**: In `@motion-canvas/2d`, `<Node>` does not own a `layout` property; Yoga Flexbox cascades from any ancestor `<Rect layout>` down through `<Node>` to all descendant `Layout` subclasses (`Rect`, `Img`, `Txt`, `Line`). Thus, two `456x456` `<Img>` children inside a `clip` `<Rect>` were laid out side-by-side (`x=0` and `x=456`, outside the clip box), and chart `<Line>`/`<Txt>` nodes were placed into a flex row.
- **Solution**: Established the **Outer Card `<Rect>` Non-Flex Rule**: never put `layout` on an outer card `<Rect>` container that holds stacked cross-fading `<Img>` panels or coordinate-positioned `<Line>`/`<Txt>` charts. Position direct sections of the card via explicit `y` coordinates and use `layout` only on leaf badges, pills, and table rows.

### Bug 2: `render.mjs` Skipping Re-Renders When `.cache/<project_id>/<aspect>/<beat>.mp4` Exists
- **Symptom**: Running `node render.mjs ... --beats=beat4,beat6,beat7,beat10` without `--force` logged `already exists in cache and is valid. Skipping.` and reused stale cached `.mp4` clips.
- **Root Cause**: `render.mjs` checks if the per-beat `.mp4` exists in `.cache/<project_id>/<aspect>/` and skips rendering unless `--force` is passed (which wipes the entire project cache) or the specific cached `.mp4` files are removed beforehand.
- **Solution**: When performing incremental re-renders of specific chapters (`--beats=beatX,beatY`), always delete `.cache/<project_id>/<aspect>/<project_id>_beat{X,Y}.mp4` first so only the modified chapters re-render while unmodified chapters remain cached.

### Bug 3: `faster-whisper` PyAV `metadata_errors` TypeError on Python 3.14
- **Symptom**: `faster_whisper.transcribe(wav_path)` raised `TypeError: 'NoneType' object cannot be converted to 'PyString'` in `av.open(..., metadata_errors=None)` under Python 3.14.
- **Root Cause**: Newer PyAV wheels on Python 3.14 reject `metadata_errors=None` in `faster_whisper/audio.py`.
- **Solution**: Decode the WAV file to a 16kHz mono `float32` NumPy array via `ffmpeg -f f32le -ac 1 -ar 16000 -` and pass the NumPy array directly to `model.transcribe(audio_np, ...)` in [`synthesize_vid_20261102_001.py`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/synthesize_vid_20261102_001.py).

---

## 5. Verification & Testing Evidence

| Test Suite / Command | Exit Code | Metrics / Findings | Status |
| :--- | :---: | :--- | :---: |
| `npx tsc --noEmit` | `0` | 0 TypeScript errors across all 10 chapters (`beat_01`–`beat_10`) | PASS |
| `nano_banana_batch_grid.py` | `0` | 20/20 comic panels (`12x 16:9` + `8x 1:1`) passed vision QA | PASS |
| `node scripts/qa_verify.mjs vid_20261102_001 --aspects=16x9` | `0` | All 16 automated QA checks passed (`473.89s`, 10 chapters, 386 chunks) | PASS |

---

## 6. Primary Artifacts & Project Deliverables

- **Master Widescreen Video (`16:9`)**: [`projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/video_16x9.mp4`](file:///home/agent/orca/AI-nimate/projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/video_16x9.mp4)
- **Script CoT & JSON (`10 Chapters, 104 Beats`)**:
  - [`motion-canvas/production/vid_20261102_001/script_cot.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/script_cot.md)
  - [`motion-canvas/production/vid_20261102_001/script.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/script.json)
- **Voiceover Audio & Whisper Timings (`473.89s`, `Puck`)**:
  - [`motion-canvas/public/audio/vid_20261102_001_narration.wav`](file:///home/agent/orca/AI-nimate/motion-canvas/public/audio/vid_20261102_001_narration.wav)
  - [`motion-canvas/production/vid_20261102_001/timings.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/timings.json)
  - [`motion-canvas/production/vid_20261102_001/beat_cue_schedule.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261102_001/beat_cue_schedule.json)
- **Flat 2D Indonesian Comic Assets (`20 PNGs`) & QA Report**:
  - [`motion-canvas/public/assets/vid_20261102_001/nano_banana_qa_report.json`](file:///home/agent/orca/AI-nimate/motion-canvas/public/assets/vid_20261102_001/nano_banana_qa_report.json)
- **Portal Walkthrough Page**:
  - [`projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/index.html`](file:///home/agent/orca/AI-nimate/projects/kausalmedia_20261102_pov-buka-sewa-meja-mahjong/index.html)

---

## 7. Actionable Next Steps for Incoming Agents

1. [ ] **Follow Project Topic Isolation (`AGENTS.md` Section 5)**: Treat every new video request as an isolated project (`vid_YYYYMMDD_NNN` -> `projects/<channel>_<YYYYMMDD>_<slug>/`) unless explicitly asked to modify an existing episode.
2. [ ] **Use Dual Stage Modes (`Option 1: full_comic_16x9` vs `Option 2: explainer_2x2`)**: Have `thinking-scriptwriter` assign `"full_comic_16x9"` to narrative chapters and `"explainer_2x2"` to quantitative chapters in `script.json` and `assets_manifest.json`.
3. [ ] **Batch Generate 2D Indonesian Comic Assets via `nano-banana-asset-generator`**: Run `nano_banana_batch_grid.py` with `--manifest` and `--output-dir` so `16:9` and `1:1` comic panels are generated in 2x2 batches, vision-QA'd, and re-batched on failure.
4. [ ] **Enforce the Outer Card `<Rect>` Non-Flex Rule**: Never put `layout` on outer card `<Rect>` containers that hold cross-fading `<Img>` panels or coordinate-positioned charts.

---

## 8. Critical Constraints & Guardrails

- **Never cap Chapters at 5 or 10**: Chapter count is determined organically by the scriptwriter based on narrative transitions (`~35s–65s` per chapter for long-form `16:9`, `~12s–20s` per chapter for `9:16` Shorts).
- **Every spoken sentence triggers a visual Beat (`waitUntilSceneTime`)**: And Chapter 1 (The Hook) must use rapid clause-level Beats (`every 2.0s–3.5s`) to maximize early retention.
- **Sync both audio filenames (`<id>_narration.wav` and `<id>.wav`)**: Keep `public/audio/<id>_narration.wav`, `public/audio/<id>.wav`, and `projects/<dir>/narration.wav` identical so `render.mjs` always muxes the exact current audio track.
