# Agent Handoff: Unified AI-nimate Workspace Consolidation, Diagram-First Motion Canvas Workflow & Installed Skills Guide
**Date & Time**: 2026-10-30 22:28:00 (+07:00)
**Previous Agent Role**: Lead Visual Systems Architect & Multi-Agent Pipeline Engineer
**Incoming Agent Target**: Production Orchestrator / Motion Canvas Scene Director / Full Release Agent

---

## 1. Executive Summary
This session consolidated the workspace architecture and resolved all visual storytelling, timing, and layout bottlenecks for **AI-nimate** ([`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate)):

1. **Workspace Consolidation (`AI-Animation-Workflows` -> Main `AI-nimate`)**:
   - The previous legacy pipeline has been archived to [`/home/agent/orca/AI-nimate-legacy`](file:///home/agent/orca/AI-nimate-legacy).
   - The modern code-driven animation workspace (`Motion Canvas`, `Remotion`, `Manim`, `Styknimate`) is now the primary [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate) repository, complete with `.agents/skills/`, `AGENTS.md`, `Guide.md`, `public/`, and `docs/handoffs/`.
   - A backward-compatible symlink `/home/agent/orca/AI-Animation-Workflows -> /home/agent/orca/AI-nimate` is in place so any active terminal or script referencing either path resolves cleanly to the unified directory.
2. **Deep Research & Thinking Scriptwriter Chain-of-Thought (CoT) Enforcement (`Model: "flash"`)**:
   - Upgraded [`deep-researcher`](file:///home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/deep-researcher/agent.md) and [`thinking-scriptwriter`](file:///home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/thinking-scriptwriter/agent.md) so they operate strictly on **`flash` models** (never `pro`) while enforcing mandatory 4-stage and 5-stage Chain-of-Thought reasoning protocols.
3. **Sample-Accurate Subtitle Sync & Symmetrical Pill Margins (`timings.ts` & `layout.tsx`)**:
   - Fixed per-beat global audio timestamp mapping (`gt = sceneStart + (time() - t0) + LEAD_OFFSET`) in [`layout.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/layout.tsx) and eliminated trailing right-margin whitespace on 1-, 2-, and 3-word subtitle chunks (`gap={0}` + conditional slot padding/margin).
4. **Diagram-First Visual Storytelling & Endorsed Motion Canvas Skills**:
   - Installed the 5 highest-endorsed community skills globally in [`/home/agent/.agents/skills/`](file:///home/agent/.agents/skills/) (`motion-canvas`, `diagram-design`, `animation-vocabulary`, `animation-basics`, `explainer-engaging`).
   - Rebuilt all 5 beats of **The AI Bubble Explained (`vid_20261029_002`)** ([`beat_01.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) through [`beat_05.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx)) as bespoke `<Camera>`-wrapped spatial diagrams with a strict `>= 2.8s–5.1s` hold time after the last sub-element reveal, rendered in dual aspect ratios (`9:16` + `16:9`), and deployed to `https://cuang.dev/projects/ainimate/ai-bubble/`.

---

## 2. System & Environment State
- **OS & Architecture**: `Linux sandbox 6.8.0-147-generic #147-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
- **Unified Primary Workspace**: [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate) (with symlink `/home/agent/orca/AI-Animation-Workflows -> /home/agent/orca/AI-nimate`)
- **Legacy Archive**: [`/home/agent/orca/AI-nimate-legacy`](file:///home/agent/orca/AI-nimate-legacy)
- **Directory Layout inside `/home/agent/orca/AI-nimate`**:
  - [`motion-canvas/`](file:///home/agent/orca/AI-nimate/motion-canvas): Primary 60fps procedural vector & diagram engine (`src/scenes/`, `src/projects/`, `production/`, `public/assets/`, `render_vid002_dual.mjs`, `render_sequential.mjs`).
  - [`remotion/`](file:///home/agent/orca/AI-nimate/remotion): React/TypeScript declarative video workspace.
  - [`manim/`](file:///home/agent/orca/AI-nimate/manim): Python mathematical animation workspace.
  - [`styknimate/`](file:///home/agent/orca/AI-nimate/styknimate): Stick-figure procedural explainer workspace.
  - [`projects/`](file:///home/agent/orca/AI-nimate/projects): Channel profiles (`kausalmedia/`, `linkedin/`).
  - [`public/projects/ainimate/`](file:///home/agent/orca/AI-nimate/public/projects/ainimate): Local mirror of static web player & rendered video artifacts synced via `rsync` to `docker-host` (`10.20.20.11`).
  - [`.agents/skills/`](file:///home/agent/orca/AI-nimate/.agents/skills): Project-level skills (`visual-scene-director`, `youtube-scriptwriting`, `shortform-viral-scriptwriter`, `unit-economics-breakdown`, `unslop-writing`, `handoff`).
  - [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md): Master Production & Orchestrator Guide.
- **Key Toolchains**: Node.js `v22.23.2`, FFmpeg `6.1.1-3ubuntu5`, Vite + Playwright Chromium headless renderer.

---

## 3. How to Use This Workflow (Complete Guide for the Incoming Agent)

### 3.1. Installed Global Skills (`~/.agents/skills/`) & Project Skills (`.agents/skills/`)
Before designing scenes, writing scripts, or editing animations, read the relevant skill files:

| Skill Name | Path | When to Use It |
| :--- | :--- | :--- |
| **`motion-canvas`** | [`/home/agent/.agents/skills/motion-canvas/SKILL.md`](file:///home/agent/.agents/skills/motion-canvas/SKILL.md) | Core Motion Canvas reference + 18 deep docs in `references/` (`CAMERA.md`, `LAYOUT.md`, `FLOW_CONTROL.md`, `TWEENING.md`, `SPRINGS.md`, `SVG.md`, `CODE.md`). Read before coding `.tsx` scenes. |
| **`diagram-design`** | [`/home/agent/.agents/skills/diagram-design/SKILL.md`](file:///home/agent/.agents/skills/diagram-design/SKILL.md) | 45 diagram archetypes in `references/` (`type-bar.md`, `type-loop.md`, `type-timeline.md`, `type-line.md`, `type-layers.md`, `type-sankey.md`). Use to pick a distinct visual structure per beat. |
| **`animation-basics`** | [`/home/agent/.agents/skills/animation-basics/SKILL.md`](file:///home/agent/.agents/skills/animation-basics/SKILL.md) | Timing, easing curves (`easeOutExpo`, `easeInOutCubic`), anticipation, overshoot (`1.14 -> 1.0`), and staging hierarchy. |
| **`animation-vocabulary`** | [`/home/agent/.agents/skills/animation-vocabulary/SKILL.md`](file:///home/agent/.agents/skills/animation-vocabulary/SKILL.md) | Precision motion glossary (pop-in, draw-on, caliper reveal, morph, stagger) for scriptwriter visual cues. |
| **`explainer-engaging`** | [`/home/agent/.agents/skills/explainer-engaging/SKILL.md`](file:///home/agent/.agents/skills/explainer-engaging/SKILL.md) | Continuous-canvas `<Camera>` storytelling where stations are laid out spatially on one stage and connected via paths. |
| **`visual-scene-director`** | [`/home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md) | AI-nimate channel style profiles (`Kausal`, `Finansial`), Swiss grid palette, Diagram-First mandate, and Strict Hold-Time Guard. |
| **`youtube-scriptwriting`** | [`/home/agent/orca/AI-nimate/.agents/skills/youtube-scriptwriting/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/youtube-scriptwriting/SKILL.md) | Investigative documentary scriptwriting, 3–5s visual anchor cadence, and phonetic TTS engineering. |

### 3.2. End-to-End 5-Stage Video Production Workflow
Whenever asked to create a new video or remake an existing video in `/home/agent/orca/AI-nimate`:

```text
[STAGE 1: Deep Forensic Research (Model: "flash")]
  │  Spawn `deep-researcher` subagent -> writes
  │  `motion-canvas/production/<vid_id>/research_dossier.md`
  │  Enforces 4-Stage CoT: Mainstream Myth -> Primary 10-K/Statutory Math
  │  -> Steelman Counter-Thesis -> Visual Diagram Archetype Mapping
  ├──►
[STAGE 2: Thinking Scriptwriter (Model: "flash")]
  │  Spawn `thinking-scriptwriter` subagent -> writes
  │  `motion-canvas/production/<vid_id>/script_cot.md` & `script.json`
  │  Enforces 5-Stage CoT: Pattern-Interrupt Hook -> Therefore/However Spine
  │  -> 3-5s Diagram Choreography Cues -> Anti-Slop -> Phonetic TTS Tags
  ├──►
[STAGE 3: Neural Voiceover + Whisper Word-Level Alignment]
  │  Synthesize `voiceover.mp3` + extract Whisper word-level JSON
  │  Generate `motion-canvas/src/scenes/<vid_id>/timings.ts`
  │  (Max 4 words & <= 25 chars per chunk; clamped strictly inside beat bounds)
  ├──►
[STAGE 4: Diagram-First Motion Canvas Scene Coding (`beat_01..05.tsx`)]
  │  Every beat uses a DIFFERENT diagram archetype wrapped in `<Camera>`:
  │  - Scale/Caliper Bar Chart, Closed-Loop Orthogonal Conduit,
  │    Dual-Axis Collision Timeline, Decay Slope Chart, 3-Tier Layer Stack.
  │  - Responsive via `const wide = isWidescreen(view)` (supports 16:9 & 9:16).
  │  - Strict Hold-Time Guard: Final sub-element finishes >= 2.5s before beat end.
  └──►
[STAGE 5: Dual-Aspect Sequential Render, Keyframe QA & LXC Sync]
     cd /home/agent/orca/AI-nimate/motion-canvas
     npx tsc --noEmit && node render_vid002_dual.mjs
     Extract keyframes via `ffmpeg`, inspect with `read_file`, sync to `docker-host`.
```

### 3.3. Copy-Pasteable Commands for Building, Testing & Rendering
```bash
# 1. Typecheck all Motion Canvas scenes
cd /home/agent/orca/AI-nimate/motion-canvas && npx tsc --noEmit

# 2. Run the Dual-Aspect (9:16 + 16:9) Render & Auto-Deploy Pipeline
# (Skips beats whose .mp4 already exists in output/<vid_id>/<aspect>/; delete specific beat .mp4s to force re-render)
cd /home/agent/orca/AI-nimate/motion-canvas && node render_vid002_dual.mjs

# 3. Extract QA Keyframes at Hold Timestamps for Multimodal Inspection
V16="/home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_16x9.mp4"
V9="/home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_9x16.mp4"
ffmpeg -y -ss 24 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b1.jpg
ffmpeg -y -ss 45 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b2.jpg
ffmpeg -y -ss 65 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b3.jpg
ffmpeg -y -ss 82 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b4.jpg
ffmpeg -y -ss 100 -i "$V16" -frames:v 1 -q:v 2 /tmp/qa_16x9_b5.jpg
```

---

## 4. Milestones Completed in This Session
- [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate) & [`/home/agent/orca/AI-nimate-legacy`](file:///home/agent/orca/AI-nimate-legacy): Archived the old legacy repository to `AI-nimate-legacy` and promoted `AI-Animation-Workflows` to become the main `AI-nimate` workspace (with `.agents/`, `AGENTS.md`, `public/`, `docs/handoffs/`, and symlink `/home/agent/orca/AI-Animation-Workflows -> /home/agent/orca/AI-nimate`).
- [`/home/agent/.agents/skills/`](file:///home/agent/.agents/skills/): Installed 5 community-endorsed skills globally (`motion-canvas`, `diagram-design`, `animation-vocabulary`, `animation-basics`, `explainer-engaging`).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/layout.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/layout.tsx): Fixed subtitle pill right-side margin asymmetry (`gap={0}` + conditional slot padding/margin).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) (`26.38s` — `01 // THE $600B CHASM`): Rebuilt as a `<Camera>`-wrapped **Proportional Scale & Caliper Chasm Diagram** (`5.18s` hold).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_02.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_02.tsx) (`21.27s` — `02 // ROUND-TRIP REVENUE`): Rebuilt as a `<Camera>`-wrapped **Closed-Loop Orthogonal Conduit Diagram** (`4.87s` hold).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_03.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_03.tsx) (`19.99s` — `03 // THE DEPRECIATION CLOCK`): Rebuilt as a `<Camera>`-wrapped **Dual-Axis Parallel Timeline & Collision Wall** (`3.19s` hold).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_04.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_04.tsx) (`17.36s` — `04 // 2000 TELECOM VS 2026 AI`): Rebuilt as a `<Camera>`-wrapped **Asset Retention Slope / Decay Curve Chart** (`2.86s` hold).
- [`/home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx`](file:///home/agent/orca/AI-nimate/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx) (`17.32s` — `05 // WHAT POPS VS SURVIVES`): Rebuilt as a `<Camera>`-wrapped **3-Tier Architectural Layer Stack** (`2.82s` hold).

---

## 5. Verification & Testing Evidence
| Test Suite / Command | Exit Code | Metrics / Findings | Status |
| :--- | :---: | :--- | :---: |
| `npx tsc --noEmit` (in `/home/agent/orca/AI-nimate/motion-canvas`) | `0` | Zero TypeScript or JSX errors across all scenes, `layout.tsx`, and `timings.ts` | PASS |
| `node render_vid002_dual.mjs` | `0` | Rendered `9:16` (`1080x1920`) and `16:9` (`1920x1080`) at 60fps (`102.37s`), muxed audio, synced to `docker-host` | PASS |
| Keyframe Multimodal Inspection (`/tmp/qa_16x9_b1..b5_final.jpg`, `/tmp/qa_9x16_b1..b5_final.jpg`) | `0` | Verified all 5 beats in both aspect ratios via `read_file`; zero clipping, zero squeezing, symmetrical subtitles | PASS |

---

## 6. Primary Artifacts & Project Deliverables
- **Live Web Portal URL**: `https://cuang.dev/projects/ainimate/ai-bubble/` ([`index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/ai-bubble/index.html))
- **16:9 Master Video (`1920x1080`)**: [`video_16x9.mp4`](file:///home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_16x9.mp4)
- **9:16 Vertical Master Video (`1080x1920`)**: [`video_9x16.mp4`](file:///home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_9x16.mp4)
- **WhatsApp Stream**: [`video_whatsapp.mp4`](file:///home/agent/orca/AI-nimate/motion-canvas/output/vid_20261029_002/video_whatsapp.mp4)
- **Master Orchestrator Guide**: [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md)
- **Research Dossier & Script CoT**: [`research_dossier.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/research_dossier.md), [`script_cot.md`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script_cot.md), [`script.json`](file:///home/agent/orca/AI-nimate/motion-canvas/production/vid_20261029_002/script.json)

---

## 7. Actionable Next Steps for the Incoming Agent
1. [ ] **Always Work Inside `/home/agent/orca/AI-nimate`**:
   - Start by reading [`/home/agent/orca/AI-nimate/HANDOFF.md`](file:///home/agent/orca/AI-nimate/HANDOFF.md) and [`/home/agent/orca/AI-nimate/Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md).
2. [ ] **When Creating the Next Video (`vid_YYYYMMDD_NNN`)**:
   - Follow the 5-Stage workflow in Section 3.2 above (`deep-researcher` -> `thinking-scriptwriter` -> Whisper `timings.ts` -> Diagram-First `<Camera>` scenes -> `render_vid002_dual.mjs`).
   - Copy `render_vid002_dual.mjs` as a template for dual-aspect (`9:16` + `16:9`) sequential rendering and automatic `rsync` deployment to `docker-host`.

---

## 8. Critical Constraints & Guardrails
- **NEVER Use `pro` Models for Subagents**: Always pass `Model: "flash"` when invoking `invoke_subagent`.
- **Diagram-First Visual Storytelling (No Repetitive 2-Box Slides)**: Every beat must use a distinct diagram archetype from [`diagram-design`](file:///home/agent/.agents/skills/diagram-design/SKILL.md) wrapped in `<Camera>`.
- **Strict Hold-Time Guard (`>= 2.5s`)**: The final sub-element animation in every beat MUST finish at least `2.5s` before `beatDuration`, and the diagram must stay on screen until `finishSceneAt(beatDuration, t0)`.
- **Terminal Formatting Rules ([`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md))**: Keep all terminal ASCII diagrams and tables `<= 76` characters wide, never emit raw Mermaid blocks in CLI responses, and always format file references as clickable `file://` links.
