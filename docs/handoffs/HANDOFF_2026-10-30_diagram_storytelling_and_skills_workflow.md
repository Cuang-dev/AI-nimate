# Agent Handoff: Unified AI-nimate Workspace, Diagram Storytelling, Skills Workflow & QA Gate
**Date & Time**: 2026-10-30 23:15:00 (+07:00)  
**Previous Agent Role**: Lead Visual Systems Architect & Multi-Agent Pipeline Engineer  
**Incoming Agent Target**: Production Orchestrator / Motion Canvas Scene Director / Full Release Agent  

---

## 1. Executive Summary

This session finalized the core architecture, subagent orchestration framework, rendering performance engine, and automated visual QA gates for **AI-nimate** ([`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate)):

1. **`/flash-orchestrator` Skill & Subagent Pool**:
   - Installed the master token-shielding framework at [`.agents/skills/flash-orchestrator/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/SKILL.md) and [`WORKER-TEMPLATES.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/WORKER-TEMPLATES.md).
   - Project-level subagents configured in [`.agents/agents/`](file:///home/agent/orca/AI-nimate/.agents/agents/) ([`deep-researcher`](file:///home/agent/orca/AI-nimate/.agents/agents/deep-researcher/agent.md), [`thinking-scriptwriter`](file:///home/agent/orca/AI-nimate/.agents/agents/thinking-scriptwriter/agent.md), and [`flash-coder`](file:///home/agent/orca/AI-nimate/.agents/agents/flash-coder/agent.md)) enforce strict execution on **`Model: "flash"`** with multi-stage Chain-of-Thought reasoning protocols.
2. **Root Cause & Permanent Fix for the 1:25 (`t = 85.0s`) Partial-Render Bug (Rule 1B)**:
   - Diagnosed why wrapping scenes in a bare `<Camera>` clipped elements in the top-left quadrant (`x < 0` and `y < 0`) whenever child elements had `opacity < 1`. In `@motion-canvas/2d`, `<Camera>` initializes an internal `this.scene = new Node({})` with `parent === null`, losing `View2D`'s center-origin matrix `translate(width/2, height/2)`. During opacity transitions, `Node.requiresCache()` triggers `worldSpaceCacheBBox()` which clipped against `[0..width, 0..height]` instead of `[-width/2..width/2, -height/2..height/2]`.
   - **Mandatory Invariant**: Always wrap scene diagrams in `<Node ref={camera}>` directly under `view` (or `<Camera.Stage width={width} height={height}>`), NEVER a bare `<Camera>`.
3. **Sample-Accurate Acoustic-to-Visual Word Sync (`±0.3s`) & Focal Breathing (`focalScale`)**:
   - All 5 beats of `vid_20261029_002` ([`beat_01.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) through [`beat_05.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx)), [`script_cot.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script_cot.md), and [`script.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script.json) are synchronized to exact spoken words in `timings.json`, featuring `≤2.5s` intermediate visual micro-cadence, single active element `focalScale` breathing, zero line overlaps, and automatic cue timestamp table generation in `generate_timings_vid_20261029_002.py`.
4. **Render Pipeline Speedup & Universal Automated QA Gate (`qa_verify.mjs`)**:
   - Re-engineered [`render_vid002_dual.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render_vid002_dual.mjs) and [`render_sequential.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render_sequential.mjs) to reuse a single Chromium instance per aspect pass, wait on DOM `#render` readiness selector instead of arbitrary 5s sleeps, and poll output file stability every 300ms.
   - Built [`scripts/qa_verify.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs) which verifies subtitle chunk constraints (`≤4` words, `≤25` chars, 0 bleeding across all projects `vid_20261021_001`, `vid_20261024_001`, `vid_20261029_002`), enforces the `<Camera.Stage>` invariant, validates ffprobe video/audio streams, and checks keyframe visual integrity.
5. **Web Portal Showcase Upgrade**:
   - Upgraded [`public/projects/ainimate/index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/index.html) and [`public/projects/ainimate/kausalmedia/index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/index.html) to feature all 4 Kausal Media releases with dual-aspect (`16:9 + 9:16`) metadata, duration badges, and HTTP byte-range edge streaming.
6. **Rule 6 Physical Screen Calibration & Shared Calibration Module (`src/shared/screenCalibration.ts`)**:
   - Codified shared screen calibration module exporting `getTypo(wide)` and `getAssets(wide)` to solve the 9:16 mobile display disparity (390px mobile viewport, `0.36x` CSS scale factor). Typography and asset marks in 9:16 must be `>= 16:9` (never smaller).
   - Automated Phone Font Floor verification (`micro >= 18px` in 16:9, `>= 20px` in 9:16) integrated into [`scripts/qa_verify.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs).

---

## 2. System & Environment State

- **OS & Kernel**: `Linux sandbox 6.8.0-147-generic #147-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
- **Primary Workspace**: [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate) (symlinked to `/home/agent/orca/AI-Animation-Workflows`)
- **Archived Legacy Codebase**: [`/home/agent/orca/AI-nimate-legacy`](file:///home/agent/orca/AI-nimate-legacy)
- **Directory Layout**:
  - [`motion-canvas/`](file:///home/agent/orca/AI-nimate/motion-canvas): Primary 60fps procedural vector & diagram engine (`src/scenes/`, `src/projects/`, `production/`, `scripts/qa_verify.mjs`, `render_vid002_dual.mjs`).
  - [`remotion/`](file:///home/agent/orca/AI-nimate/remotion): React/TypeScript declarative video workspace.
  - [`manim/`](file:///home/agent/orca/AI-nimate/manim): Python mathematical animation workspace.
  - [`styknimate/`](file:///home/agent/orca/AI-nimate/styknimate): Stick-figure procedural explainer workspace.
  - [`public/projects/ainimate/`](file:///home/agent/orca/AI-nimate/public/projects/ainimate): Static web player & video gallery synced to `docker-host` (`10.20.20.11`).
  - [`.agents/skills/`](file:///home/agent/orca/AI-nimate/.agents/skills): Project-level skills (`flash-orchestrator`, `visual-scene-director`, `youtube-scriptwriting`, `shortform-viral-scriptwriter`, `unit-economics-breakdown`, `unslop-writing`, `handoff`).
  - [`.agents/agents/`](file:///home/agent/orca/AI-nimate/.agents/agents): Project-level subagent manifests (`deep-researcher`, `thinking-scriptwriter`, `flash-coder`).
  - [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md): Master Production & Orchestrator Guide.
  - [`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md): Antigravity Terminal Guidelines & Temporal Anchoring.
- **Key Toolchains**: Node.js `v22.23.2`, FFmpeg `6.1.1-3ubuntu5`, Playwright Chromium headless runner.

---

## 3. How to Use This Workflow (Complete Incoming Agent Guide)

### 3.1. Installed Skills Directory

| Skill Name | Path | Purpose |
| :--------- | :--- | :------ |
| **`flash-orchestrator`** | [`.agents/skills/flash-orchestrator/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/SKILL.md) | Token-shielding orchestrator, Ponytail ladder, file ownership boundaries, worker templates. |
| **`motion-canvas`** | [`~/.agents/skills/motion-canvas/SKILL.md`](file:///home/agent/.agents/skills/motion-canvas/SKILL.md) | Motion Canvas reference + 18 deep docs (`CAMERA.md`, `LAYOUT.md`, `FLOW_CONTROL.md`, etc.). |
| **`diagram-design`** | [`~/.agents/skills/diagram-design/SKILL.md`](file:///home/agent/.agents/skills/diagram-design/SKILL.md) | 45 diagram archetypes (`type-bar.md`, `type-loop.md`, `type-timeline.md`, `type-layers.md`). |
| **`animation-basics`** | [`~/.agents/skills/animation-basics/SKILL.md`](file:///home/agent/.agents/skills/animation-basics/SKILL.md) | Easing curves (`easeOutExpo`), overshoot (`1.14 -> 1.0`), and visual staging hierarchy. |
| **`animation-vocabulary`**| [`~/.agents/skills/animation-vocabulary/SKILL.md`](file:///home/agent/.agents/skills/animation-vocabulary/SKILL.md) | Motion glossary (pop-in, draw-on, caliper reveal, morph, stagger) for visual cues. |
| **`explainer-engaging`** | [`~/.agents/skills/explainer-engaging/SKILL.md`](file:///home/agent/.agents/skills/explainer-engaging/SKILL.md) | Continuous-canvas spatial layout and camera navigation across interconnected diagram stations. |
| **`visual-scene-director`**| [`.agents/skills/visual-scene-director/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md) | AI-nimate Swiss grid palette, 5 diagram archetypes, Rule 1B invariant, and hold guards. |
| **`youtube-scriptwriting`**| [`.agents/skills/youtube-scriptwriting/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/youtube-scriptwriting/SKILL.md) | Investigative documentary scriptwriting, 3–5s visual anchor cadence, and phonetic TTS. |

---

### 3.2. End-to-End 5-Stage Video Production Pipeline

```text
[STAGE 1: Deep Forensic Research (Model: "flash")]
  │  Spawn `deep-researcher` -> writes
  │  `motion-canvas/production/<vid_id>/research_dossier.md`
  │  4-Stage CoT: Myth -> Primary Math -> Steelman -> Diagram Archetypes
  ├──►
[STAGE 2: Thinking Scriptwriter (Model: "flash")]
  │  Spawn `thinking-scriptwriter` -> writes `script_cot.md` & `script.json`
  │  5-Stage CoT: Hook -> Causal Spine -> Semantic Cues -> Slop -> Phonetics
  ├──►
[STAGE 3: Neural Voiceover + Whisper Word-Level Alignment]
  │  Synthesize audio + generate `timings.json` & `timings.ts`
  │  Print visual cue lookup table; enforce <= 4 words, <= 25 chars, 0 bleed
  ├──►
[STAGE 4: Diagram-First Motion Canvas Scene Coding (`beat_01..05.tsx`)]
  │  Wrap in `<Node ref={camera}>` (Rule 1B); ±0.3s word sync & focalScale;
  │  <= 2.5s micro-cadence; strict hold-time guard >= 2.7s before beat end.
  └──►
[STAGE 5: Fast Dual-Aspect Render, Automated QA Gate & LXC Sync]
     cd motion-canvas && npx tsc --noEmit && node render_vid002_dual.mjs
     Auto-QA: node scripts/qa_verify.mjs <vid_id> (all 4 test gates pass).
```

---

### 3.3. Standard Verification & Production Commands

```bash
# 1. Typecheck all Motion Canvas scene files
cd /home/agent/orca/AI-nimate/motion-canvas && npx tsc --noEmit

# 2. Run Automated QA Gate (Validates subtitles, camera invariant, ffprobe, and keyframes)
cd /home/agent/orca/AI-nimate/motion-canvas && node scripts/qa_verify.mjs vid_20261029_002

# 3. Fast Dual-Aspect (16:9 + 9:16) Render with Single Browser Reuse
# (Pass --force to re-render all beats, or omit to render only missing beats)
cd /home/agent/orca/AI-nimate/motion-canvas && node render_vid002_dual.mjs

# 4. Extract QA Keyframes at Hold Timestamps for Multimodal Inspection
V16="/home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_16x9.mp4"
ffmpeg -y -ss 24 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b1.jpg
ffmpeg -y -ss 45 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b2.jpg
ffmpeg -y -ss 65 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b3.jpg
ffmpeg -y -ss 82 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b4.jpg
ffmpeg -y -ss 100 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b5.jpg
```

---

## 4. Technical Post-Mortems & Permanent Architectural Invariants

### 4.1. Rule 1B: Root Cause & Permanent Fix for the 1:25 (`t = 85.0s`) Partial-Render Bug

- **The Bug Phenomenon**: At timestamp `t = 85.0s` (`beat_05`), elements positioned in the upper-left quadrant (`x < 0` and `y < 0`) were abruptly sliced off or vanished completely during renders.
- **The Internal Engine Root Cause**:
  1. In `@motion-canvas/2d`, the `<Camera>` component constructs a detached internal stage node: `this.scene = new Node({})`.
  2. Because this internal `this.scene` has `parent === null`, it fails to inherit `View2D`'s root coordinate transform matrix (`translate(width/2, height/2)`), which centers `(0, 0)` on screen.
  3. Whenever any child element has `opacity < 1` (e.g. during entry transitions, fades, or inactive element dimming), `Node.requiresCache()` returns `true`, triggering raster caching through `worldSpaceCacheBBox()`.
  4. Without `View2D`'s center-origin matrix, `worldSpaceCacheBBox()` computes the clipping boundary relative to `[0..width, 0..height]` instead of `[-width/2..width/2, -height/2..height/2]`.
  5. Any node or child graphic located at negative coordinates (`x < 0` or `y < 0`) is sliced away outside the raster cache bounding box!
- **The Permanent Invariant**:
  - **NEVER** place visual elements inside a bare `<Camera>` tag.
  - **ALWAYS** wrap scene diagrams in `<Node ref={camera}>` added directly to `view`:
    ```tsx
    const camera = createRef<Node>();
    view.add(
      <Node ref={camera}>
        {/* Diagram entities, lines, and cards */}
      </Node>
    );
    ```
  - Alternatively, use `<Camera.Stage width={width} height={height}>`.
  - Enforced automatically by `qa_verify.mjs` (Gate 2 checks all scene files for detached `<Camera>` usage).

---

### 4.2. Sample-Accurate Acoustic-to-Visual Word Sync (`±0.3s`) & `focalScale` Breathing

- **Sample-Accurate Word Triggering (`±0.3s`)**:
  - Major diagram mechanisms (bar expansion, counter tick, wall drop, badge flip) must trigger within `±0.3s` of the exact spoken word timestamp in `timings.json`.
  - In `vid_20261029_002`, `script_cot.md` and `script.json` annotate precise `visual_cues[]` matching narrator keywords.
  - `motion-canvas/production/vid_20261029_002/generate_timings_vid_20261029_002.py` exposes `print_visual_cue_lookup_table` to output exact keyword timestamps directly to the scene coder.
- **`≤2.5s` Intermediate Micro-Choreography**:
  - Long static stretches (`> 3.0s`) are prohibited. Beats are choreographed with sub-cues (baseline entry, station pop-in, secondary tag reveal, connector draw) at `2.0s–2.5s` intervals.
- **Strict Hold-Time Guard (`≥2.7s`)**:
  - The final visual reveal and forensic badge in every beat must finish at least `2.7s` before `beat.end` so viewers can absorb the complete diagram structure before transition.
- **Single Active Element `focalScale` Breathing (Stillness by Default)**:
  - Global camera wobble (`Math.sin` position/zoom creep) is strictly forbidden.
  - Only the currently active entity breathes via `focalScale()` (0.55 rad/s, `±0.4%`) and tilts via `focalRotation()` (0.45 rad/s, `±0.12°`).
  - Inactive elements remain 100% stationary (`scale(1.0)`, dimmed to `opacity: 0.22`).

---

### 4.3. Render Performance Engineering & Universal QA Gate (`qa_verify.mjs`)

- **Single Chromium Browser Instance Reuse**:
  - Previously, `render_vid002_dual.mjs` and `render_sequential.mjs` spawned and closed a separate Chromium browser process for every individual beat, causing process startup overhead and memory churn.
  - Both renderers now initialize a single persistent Chromium browser per aspect pass and reuse pages sequentially.
- **DOM Selector Readiness Polling (`#render`)**:
  - Replaced arbitrary `waitForTimeout(5000)` pauses with direct DOM readiness checks (`page.waitForSelector('#render', { timeout: 15000 })`).
- **File Stability Polling (300ms intervals)**:
  - Render completion is detected by polling output file size stability (`stats.size === lastSize` across consecutive checks), avoiding race conditions during disk flush.
- **The Universal QA Verification Gate (`scripts/qa_verify.mjs`)**:
  - Evaluates 4 rigorous verification gates:
    1. **Subtitle Chunks**: `<= 4` words, `<= 25` characters, and 0 cross-beat boundary bleeding (verified across `vid_20261021_001`, `vid_20261024_001`, `vid_20261029_002`).
    2. **Camera Architecture**: Enforces Rule 1B (bans detached `<Camera>` tags without `<Camera.Stage>`).
    3. **Master Video Streams**: Verifies `ffprobe` video resolution (`1920x1080` & `1080x1920`), AAC audio streams, and WhatsApp compressed stream (`<= 4.5MB`).
    4. **Keyframe Visual Integrity**: Extracts entry and hold keyframes per beat and verifies non-blank pixel buffers.

---

### 4.4. Web Showcase & Archive Upgrade

- Upgraded [`public/projects/ainimate/index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/index.html) and [`public/projects/ainimate/kausalmedia/index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/index.html).
- Features all 4 Kausal Media releases:
  1. **The AI Bubble Explained** (`vid_20261029_002`): Dual-Aspect (`16:9 + 9:16`), 60 FPS, 01:42.
  2. **Offshore Investing Tax Traps** (`vid_20261024_001`): Dual-Aspect (`16:9 + 9:16`), 60 FPS, 02:04.
  3. **MSCI Standalone Market Crash** (`vid_20261021_001`): 9:16 Vertical, 1080p, 04:07.
  4. **Anatomi Saham Gorengan di BEI**: 16:9 Landscape, 1080p.
- Fully wired for HTTP Byte-Range seeking and Cloudflare Edge streaming.

---

### 4.5. Rule 6: Physical Screen Calibration & Mobile Viewport Geometry (`src/shared/screenCalibration.ts`)

- **The Mobile Physical Disparity**:
  - `9:16` vertical video (`1080x1920`) is displayed almost exclusively on 6.1"–6.7" smartphones (~390 CSS px wide, a `0.36x` physical scale factor).
  - A `15px` canvas font renders as `~5.4px` CSS (`~0.9mm`), causing total illegibility.
  - Conversely, `16:9` widescreen video (`1920x1080`) is viewed on 14"–27" laptop/desktop monitors (~960–1920 CSS px wide).
- **The Permanent Invariant**:
  - Never make `9:16` fonts or icons smaller than `16:9` using `wide ? 24 : 15`.
  - Every project `vid_YYYYMMDD_NNN/layout.tsx` MUST import and re-export `getTypo(wide)` and `getAssets(wide)` from `src/shared/screenCalibration.ts`.
  - Enforce Phone Font Floor: `micro >= 18px` on 16:9 and `>= 20px` on 9:16 (verified automatically via `qa_verify.mjs`).

---

## 5. Verification & Testing Evidence

| Verification Gate / Command | Status | Metrics / Findings |
| :-------------------------- | :----: | :----------------- |
| `npx tsc --noEmit` (in `motion-canvas`) | PASS | 0 TypeScript or JSX errors across all scenes, `layout.tsx`, and `timings.ts`. |
| `node scripts/qa_verify.mjs vid_20261029_002` | PASS | 93 subtitle chunks (`<=4` words, `<=25` chars), 6 scenes verified for Rule 1B, 10/10 non-blank keyframes. |
| `node scripts/qa_verify.mjs vid_20261024_001` | PASS | Subtitle chunk invariants, stream durations, and audio mux verified. |
| `node scripts/qa_verify.mjs vid_20261021_001` | PASS | Subtitle chunk invariants and 9:16 master stream verified. |
| `node render_vid002_dual.mjs` | PASS | Dual-aspect master renders (`16:9` + `9:16`) generated at 60fps in single-browser pass. |

---

## 6. Primary Artifacts & Project Deliverables

- **Live Web Portal**: `https://cuang.dev/projects/ainimate/` ([`index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/index.html))
- **Kausal Media Channel Hub**: `https://cuang.dev/projects/ainimate/kausalmedia/` ([`index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/index.html))
- **Shared Screen Calibration Module**: [`motion-canvas/src/shared/screenCalibration.ts`](file:///home/agent/orca/AI-nimate/motion-canvas/src/shared/screenCalibration.ts)
- **Flagship Release (`vid_20261029_002`)**:
  - 16:9 Master Video: [`output/vid_20261029_002/video_16x9.mp4`](file:///home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_16x9.mp4)
  - 9:16 Master Video: [`output/vid_20261029_002/video_9x16.mp4`](file:///home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_9x16.mp4)
  - Research Dossier & CoT Script: [`research_dossier.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/research_dossier.md), [`script_cot.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script_cot.md), [`script.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script.json)
  - Timing Engine: [`generate_timings_vid_20261029_002.py`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/generate_timings_vid_20261029_002.py), [`timings.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/timings.json), [`timings.ts`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/timings.ts)
- **QA Verification Gate Script**: [`motion-canvas/scripts/qa_verify.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs)
- **Dual-Aspect Optimized Renderers**: [`render_vid002_dual.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render_vid002_dual.mjs), [`render_sequential.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render_sequential.mjs)

---

## 7. Actionable Next Steps for the Incoming Agent

1. [ ] **Always Work Inside `/home/agent/orca/AI-nimate`**:
   - Begin by reviewing [`HANDOFF.md`](file:///home/agent/orca/AI-nimate/HANDOFF.md) and [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md).
2. [ ] **When Implementing Any New Scene**:
   - Strictly obey Rule 1B: Wrap diagrams in `<Node ref={camera}>` added directly to `view`, never a bare `<Camera>`.
   - Obey Rule 6: Import `getTypo(wide)` and `getAssets(wide)` from `src/shared/screenCalibration.ts` in `layout.tsx` and enforce Phone Font Floor (`>= 18px` in 16:9, `>= 20px` in 9:16).
   - Enforce sample-accurate acoustic triggers (`±0.3s`) and `focalScale` stillness by default.
3. [ ] **Post-Implementation Verification**:
   - Always run `npx tsc --noEmit` and `node scripts/qa_verify.mjs <project_id>` before declaring completion.

---

## 8. Critical Constraints & Guardrails

- **Subagents Must Use `Model: "flash"`**: Never invoke `pro` models for subagents. Forensic depth is derived from explicit CoT prompts.
- **Rule 1B Camera Invariant**: Slicing bug prevention: `<Node ref={camera}>` under `view` (or `<Camera.Stage>`).
- **Rule 6 Screen Calibration & Font Floor**: Strict phone font floor `micro >= 18px` (16:9) / `>= 20px` (9:16); always import scales from `src/shared/screenCalibration.ts`.
- **Diagram-First Mandate**: Every beat uses a distinct spatial diagram archetype from [`diagram-design`](file:///home/agent/.agents/skills/diagram-design/SKILL.md).
- **Hold-Time Guard (`≥2.7s`)**: Final sub-element animation finishes `>= 2.7s` before beat end.
- **Subtitle Chunk Invariants**: `<= 4` words, `<= 25` characters, zero cross-beat bleeding, symmetrical pill margins (`gap={0}` with conditional slot padding/margin).
- **Terminal Constraints ([`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md))**: ASCII diagrams and tables `<= 76` characters wide, no raw Mermaid blocks in CLI, clickable `file://` links.
