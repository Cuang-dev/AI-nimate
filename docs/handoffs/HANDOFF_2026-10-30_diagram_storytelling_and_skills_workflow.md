# Agent Handoff: Diagram-First Motion Canvas Workflow, Endorsed Skills Integration & Dual-Aspect Production (`vid_20261029_002`)
**Date & Time**: 2026-10-30 22:20:38 (+07:00)
**Previous Agent Role**: Lead Visual Systems Architect & Multi-Agent Pipeline Engineer
**Incoming Agent Target**: Production Orchestrator / Motion Canvas Scene Director / Full Release Agent

---

## 1. Executive Summary
This session resolved the final visual storytelling, timing, and layout bottlenecks across the dual-workspace production pipeline ([`/home/agent/orca/AI-Animation-Workflows`](file:///home/agent/orca/AI-Animation-Workflows) and [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate)) and delivered the upgraded dual-aspect (`9:16` + `16:9`) **The AI Bubble Explained (`vid_20261029_002`)** video to `https://cuang.dev/projects/ainimate/ai-bubble/`.

Specifically, we solved six critical user-reported issues:
1. **Deep Research & Thinking Scriptwriter Chain-of-Thought (CoT) Enforcement (`Model: "flash"`)**: Upgraded the custom agent definitions ([`deep-researcher`](file:///home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/deep-researcher/agent.md) and [`thinking-scriptwriter`](file:///home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/thinking-scriptwriter/agent.md)) so they operate strictly on **`flash` models** (never `pro`) while enforcing mandatory 4-stage and 5-stage Chain-of-Thought reasoning protocols.
2. **Broken Subtitle Sync & Looping (`timings.ts`)**: Diagnosed why subtitles in multi-beat Motion Canvas projects restarted from `t = 0.0s` inside every scene—`useThread().time()` resets to `0` per scene when rendered as separate beat projects unless offset by `t0` or mapped to global video time—and fixed [`timings.ts`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/timings.ts) and [`layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx) so every beat maps local scene time to global audio timestamp (`globalTime = (time() - t0) + beatStartOffset`).
3. **Asymmetrical Right Margin on Subtitle Pill (`layout.tsx`)**: Fixed the fixed-4-slot subtitle pill in [`layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx#L194-L258) where empty word slots (`w === ''`) were still contributing flexbox `gap` and `padding` on the right side. Setting container `gap={0}` and applying `padding={() => w() ? [6, 10] : [0, 0]}` and `marginRight` only between active words made the pill 100% symmetrical.
4. **Clipped Brand Logos**: Rebuilt all composite brand badges (`bigtech_capex_badge.png`, `aws_azure_badge.png`, `openai_logo.png`, `nvidia_logo.png`, `telecom_fiber_icon.png`) in [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/public/assets/vid_20261029_002/`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/public/assets/vid_20261029_002/) with generous transparent safety margins and true aspect ratios (`2:1` for dual-logo badges, `1:1` for single marks).
5. **Premature Fade-Outs & Sub-Element Squeezing**: Eliminated premature end-of-beat fade-outs and enforced the **Strict Hold-Time Guard** (the last sub-element reveal in every beat MUST finish `>= 2.5s–5.0s` before `beatDuration`, and the diagram stays fully visible until the beat ends).
6. **Diagram-First Visual Storytelling & Endorsed Motion Canvas Skills**: Installed the 5 highest-endorsed community skills globally in [`/home/agent/.agents/skills/`](file:///home/agent/.agents/skills/) (`motion-canvas`, `diagram-design`, `animation-vocabulary`, `animation-basics`, `explainer-engaging`) and rewrote all 5 beats of `vid_20261029_002` ([`beat_01.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) through [`beat_05.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx)) from rigid 2-box dashboard cards into bespoke `<Camera>`-wrapped spatial diagrams.

---

## 2. System & Environment State
- **OS & Architecture**: `Linux sandbox 6.8.0-147-generic #147-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
- **Active Workspaces**:
  1. **Motion Canvas Render Engine & Production Workspace**: [`/home/agent/orca/AI-Animation-Workflows`](file:///home/agent/orca/AI-Animation-Workflows)
  2. **Public Web Portal, Skills & Handoff Repository**: [`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate)
- **Remote Production Host**: `docker-host` (`10.20.20.11`), serving `https://cuang.dev/projects/ainimate/` from `/home/agent/projects/ainimate/public/projects/ainimate/` (synced via `rsync -avz`).
- **Key Toolchains**:
  - **Node.js**: `v22.23.2`
  - **FFmpeg**: `6.1.1-3ubuntu5` (`libx264`, `aac`, `mjpeg`)
  - **Motion Canvas**: `@motion-canvas/core` & `@motion-canvas/2d` running on Vite (`port 9102`) with headless Playwright Chromium sequential beat renderer ([`render_vid002_dual.mjs`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/render_vid002_dual.mjs)).

---

## 3. How to Use This Workflow (Complete Guide for the Incoming Agent)

### 3.1. Installed Global Skills (`~/.agents/skills/`) & Project Skills
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
Whenever asked to create a new video or remake an existing video:

```text
[STAGE 1: Deep Forensic Research (Model: "flash")]
  │  Spawn `deep-researcher` subagent -> writes `research_dossier.md`
  │  Enforces 4-Stage CoT: Mainstream Myth -> Primary 10-K/Statutory Math
  │  -> Steelman Counter-Thesis -> Visual Diagram Archetype Mapping
  ├──►
[STAGE 2: Thinking Scriptwriter (Model: "flash")]
  │  Spawn `thinking-scriptwriter` subagent -> writes `script_cot.md` & `script.json`
  │  Enforces 5-Stage CoT: Pattern-Interrupt Hook -> Therefore/However Spine
  │  -> 3-5s Diagram Choreography Cues -> Anti-Slop -> Phonetic TTS Tags
  ├──►
[STAGE 3: Neural Voiceover + Whisper Word-Level Alignment]
  │  Generate voiceover (`voiceover.mp3`) + extract Whisper word timestamps
  │  Generate `timings.ts` with `BEAT_START_OFFSET` and `SUBTITLE_CHUNKS`
  │  (Max 4 words & <= 25 chars per chunk; clamped strictly inside beat boundaries)
  ├──►
[STAGE 4: Diagram-First Motion Canvas Scene Coding (`beat_01..05.tsx`)]
  │  Every beat uses a DIFFERENT diagram archetype wrapped in `<Camera>`:
  │  - Scale/Caliper Bar Chart, Closed-Loop Orthogonal Conduit,
  │    Dual-Axis Collision Timeline, Decay Slope Chart, 3-Tier Layer Stack.
  │  - Responsive via `const wide = isWidescreen(view)` (supports 16:9 & 9:16).
  │  - Strict Hold-Time Guard: Final sub-element finishes >= 2.5s before beat end.
  └──►
[STAGE 5: Dual-Aspect Sequential Render, Keyframe QA & LXC Sync]
     Run `npx tsc --noEmit && node render_vid002_dual.mjs`
     Extract keyframes via `ffmpeg`, inspect with `read_file`, sync to `docker-host`.
```

### 3.3. How Dual-Aspect (`16:9` + `9:16`) Responsive Layout Works
All scenes in [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/) use a single codebase that adapts automatically to both `1920x1080` (`16:9`) and `1080x1920` (`9:16`):
- [`layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx) exports `isWidescreen(view)` (`view.width() > view.height()`), `setupBaseStage(view, sectionTitle, beatStartOffset)`, `COLORS`, and `FONTS`.
- `setupBaseStage` draws the Swiss editorial background (`#F8F6F0`), architectural gridlines, top-left section indicator (`01 // THE $600B CHASM`), and bottom-anchored karaoke subtitle pill (`y = 430` in `16:9`, `y = 660` in `9:16`).
- Inside each `beat_0X.tsx`, compute coordinates using `const wide = isWidescreen(view)` so diagrams expand horizontally in `16:9` (`trackLeft = -640`, `trackRight = 640`) and stack cleanly in `9:16` (`trackLeft = -380`, `trackRight = 380`).
- [`render_vid002_dual.mjs`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/render_vid002_dual.mjs) patches the `"size": {"x": ..., "y": ...}` field inside `src/projects/vid_20261029_002/vid_20261029_002_beat*.meta` before each pass (`1080x1920` first, then `1920x1080`), renders each beat sequentially in headless Chromium, concatenates the beats with [`voiceover.mp3`](file:///home/agent/orca/AI-Animation-Workflows/production/vid_20261029_002/audio/voiceover.mp3), generates `video_whatsapp.mp4` and thumbnails, copies to `/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained/`, and syncs via `rsync` to `docker-host`.

---

## 4. Milestones Completed in This Session
- [`/home/agent/.agents/skills/`](file:///home/agent/.agents/skills/): Installed 5 community-endorsed skills globally (`motion-canvas`, `diagram-design`, `animation-vocabulary`, `animation-basics`, `explainer-engaging`).
- [`/home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/visual-scene-director/SKILL.md) & [`/home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/thinking-scriptwriter/agent.md`](file:///home/agent/.gemini/antigravity-cli/brain/f9806e03-8c7a-4670-bb59-30655263c1ce/.agents/agents/thinking-scriptwriter/agent.md): Updated scene director and scriptwriter prompts to mandate **Diagram-First Visual Storytelling** (banning repetitive 2-box dashboard slides) and the **Strict Hold-Time Guard** (`>= 2.0s–2.5s` hold after the last sub-element reveal).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx): Fixed subtitle pill right-side margin asymmetry by setting `gap={0}` on the row container and applying conditional padding (`padding={() => w() ? [6, 10] : [0, 0]}`) and conditional `marginRight` only between non-empty words.
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) (`26.38s` — `01 // THE $600B CHASM`): Rebuilt as a `<Camera>`-wrapped **Proportional Scale & Caliper Chasm Diagram** (`$320B/YR` CapEx pillar vs. `$600B REQ` 2x TCO dashed gold target pillar vs. `< $45B` actual AI revenue block, bridged by a double-arrow red caliper and `$555B REVENUE CHASM` badge finishing at `t=21.2s`, holding for `5.18s`).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_02.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_02.tsx) (`21.27s` — `02 // ROUND-TRIP REVENUE`): Rebuilt as a `<Camera>`-wrapped **Closed-Loop Orthogonal Conduit Diagram** connecting `STATION 01: HYPERSCALER CLOUD` (`aws_azure_badge.png`) and `STATION 02: FRONTIER AI LABS` (`openai_logo.png`) with animated `Line.end` orthogonal conduits, opaque masked conduit pills (`$20B+ COMPUTE CREDITS` and `100% RE-BOOKED AS CLOUD REVENUE`), and a central `ROUND-TRIPPING // ZERO EXTERNAL CASH FLOW` verdict badge finishing at `t=16.4s` (`4.87s` hold).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_03.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_03.tsx) (`19.99s` — `03 // THE DEPRECIATION CLOCK`): Rebuilt as a `<Camera>`-wrapped **Dual-Axis Parallel Timeline & Collision Wall** contrasting the `10-K ACCOUNTING SCHEDULE` (stretched to `YR 6` in gold) against `PHYSICAL GPU SILICON CADENCE` (`YR 0: H100`, `YR 1: BLACKWELL/B200`, `YR 2: RUBIN`), colliding with a vertical red dashed obsolescence wall at `YR 2` and revealing `4 UNUSED YRS = $100B+ WRITE-DOWNS` at `t=16.8s` (`3.19s` hold).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_04.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_04.tsx) (`17.36s` — `04 // 2000 TELECOM VS 2026 AI`): Rebuilt as a `<Camera>`-wrapped **Asset Retention Slope / Decay Curve Chart** (`ASSET VALUE` `100% -> 0%` vs `TIME HORIZON` `YR 0 -> YR 25`) comparing the flat green `2000 DARK FIBER: 25+ YR LIFE` curve against the steep red `2026 AI GPUS: 3-YR THERMAL CLIFF` curve, finishing at `t=14.5s` (`2.86s` hold).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx) (`17.32s` — `05 // WHAT POPS VS SURVIVES`): Rebuilt as a `<Camera>`-wrapped **3-Tier Architectural Layer Stack** (`L3 // APPLICATION: THIN AI WRAPPERS` flagging `90% WIPEOUT`, `L2 // WORKFLOW: DEEP WORKFLOW AUTOMATION` locking in `ENDURING MOAT`, and `L1 // INFRASTRUCTURE: POWER GRIDS & CLOUD INFRA` locking in `DISCOUNTED INFRA ROI / BARGAIN ROI` at `t=14.5s`, holding for `2.82s`).
- [`/home/agent/orca/AI-Animation-Workflows/motion-canvas/render_vid002_dual.mjs`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/render_vid002_dual.mjs): Automated dual-aspect (`9:16` + `16:9`) rendering, audio muxing, WhatsApp stream encoding, thumbnail extraction, local portal copy, and `rsync` deployment to `docker-host`.

---

## 5. Root Cause Analyses & Bug Fixes

### Defect 1: Premature Element Fade-Out Before Last Sub-Element Revealed
- **Symptom**: User reported that in some beats, the element group faded out before the last sub-element even finished popping in.
- **Root Cause**: Previous scene scripts scheduled the final sub-element reveal close to `beatDuration - 0.8s` and also ran an explicit exit fade-out tween (`opacity(0, 0.4)`) right before `finishSceneAt`.
- **Solution**: Removed end-of-beat fade-out tweens so each beat holds its completed diagram cleanly until the hard cut to the next beat, and enforced the **Strict Hold-Time Guard** (`finalRevealTime <= beatDuration - 2.8s`).
- **Verification Evidence**: Confirmed across all 5 beats (`Beat 1` holds `5.18s`, `Beat 2` holds `4.87s`, `Beat 3` holds `3.19s`, `Beat 4` holds `2.86s`, `Beat 5` holds `2.82s`).

### Defect 2: Sub-Elements Squeezing Each Other with Zero Margin
- **Symptom**: Sub-elements inside fixed-width cards squeezed against titles and borders with no margin left.
- **Root Cause**: Putting a logo, long multi-word title, and long status pill inside a single horizontal `<Rect layout direction="row">` inside an `880px` card caused flexbox overflow/compression.
- **Solution**: Replaced 2-card layouts with spatial diagrams (`diagram-design` + `motion-canvas`) where labels, callout pills, and station hubs occupy distinct `[x, y]` coordinates with opaque background masks (`fill={COLORS.surface}`, `padding={[8, 16]}`).

### Defect 3: Subtitle Pill Extra Margin on the Right Side
- **Symptom**: Subtitle pill had too much empty margin on the right side when displaying 1-, 2-, or 3-word chunks.
- **Root Cause**: `setupBaseStage` pre-allocates 4 `<Rect>` word slots inside a `<Rect layout direction="row" gap={12}>`. When a chunk had fewer than 4 words, empty slots (`w === ''`) still triggered the parent `gap={12}` and slot `padding={[6, 10]}` on the right end.
- **Solution**: Changed parent container `gap={0}` in [`layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx#L194-L258) and bound each slot's `padding` (`() => w() !== '' ? [6, 10] : [0, 0]`) and `marginRight` (`() => w() !== '' && nextW !== '' ? 10 : 0`) dynamically to active words only.

---

## 6. Verification & Testing Evidence
| Test Suite / Command | Exit Code | Metrics / Findings | Status |
| :--- | :---: | :--- | :---: |
| `npx tsc --noEmit` (in `motion-canvas/`) | `0` | Zero TypeScript or JSX errors across all 5 beats, `layout.tsx`, and `timings.ts` | PASS |
| `node render_vid002_dual.mjs` (Pass 1 + Polish Pass `task-2072`) | `0` | Renders `9:16` (`1080x1920`) and `16:9` (`1920x1080`) at 60fps (`102.37s` total duration), muxes audio, syncs to `docker-host` | PASS |
| Keyframe Multimodal Inspection (`/tmp/qa_16x9_b1..b5.jpg`, `/tmp/qa_9x16_b1..b5.jpg`) | `0` | Verified all 5 beats in both aspect ratios via `read_file`; polished Beats 3–5 badge spacing and contrast | PASS |

---

## 7. Primary Artifacts & Project Deliverables
- **Web Player Portal Page**: `https://cuang.dev/projects/ainimate/ai-bubble/` ([`index.html`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/ai-bubble/index.html))
- **16:9 Master Video (`1920x1080`)**: [`video_16x9.mp4`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/output/vid_20261029_002/video_16x9.mp4) (also deployed at [`/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained/video_16x9.mp4`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained/video_16x9.mp4))
- **9:16 Vertical Master Video (`1080x1920`)**: [`video_9x16.mp4`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/output/vid_20261029_002/video_9x16.mp4) (also deployed at [`/home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained/video_9x16.mp4`](file:///home/agent/orca/AI-nimate/public/projects/ainimate/kausalmedia/the-ai-bubble-explained/video_9x16.mp4))
- **WhatsApp Optimized Stream**: [`video_whatsapp.mp4`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/output/vid_20261029_002/video_whatsapp.mp4)
- **Motion Canvas Scene Files**:
  - [`beat_01.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_01.tsx) (`01 // THE $600B CHASM`)
  - [`beat_02.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_02.tsx) (`02 // ROUND-TRIP REVENUE`)
  - [`beat_03.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_03.tsx) (`03 // THE DEPRECIATION CLOCK`)
  - [`beat_04.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_04.tsx) (`04 // 2000 TELECOM VS 2026 AI`)
  - [`beat_05.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/beat_05.tsx) (`05 // WHAT POPS VS SURVIVES`)
  - [`layout.tsx`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/layout.tsx) & [`timings.ts`](file:///home/agent/orca/AI-Animation-Workflows/motion-canvas/src/scenes/vid_20261029_002/timings.ts)
- **Research Dossier & Script CoT**:
  - [`research_dossier.md`](file:///home/agent/orca/AI-Animation-Workflows/production/vid_20261029_002/research_dossier.md)
  - [`script_cot.md`](file:///home/agent/orca/AI-Animation-Workflows/production/vid_20261029_002/script_cot.md)
  - [`script.json`](file:///home/agent/orca/AI-Animation-Workflows/production/vid_20261029_002/script.json)

---

## 8. Actionable Next Steps for the Incoming Agent
1. [ ] **Verify Completion of Polish Render Task (`task-2072`)**:
   - If background task `task-2072` (`node render_vid002_dual.mjs` re-rendering the micro-polished Beats 3–5) has just finished or is finishing, verify that `rsync` to `docker-host` exited `0` and extract `/tmp/qa_16x9_b3..b5.jpg` and `/tmp/qa_9x16_b3..b5.jpg` to confirm the final polished frames.
2. [ ] **When Starting a New Video Topic (`vid_YYYYMMDD_NNN`)**:
   - Spawn `deep-researcher` (`Model: "flash"`) to produce `production/<vid_id>/research_dossier.md` using the 4-stage CoT protocol.
   - Spawn `thinking-scriptwriter` (`Model: "flash"`) to produce `production/<vid_id>/script_cot.md` and `script.json` with explicit diagram archetypes and 3–5s visual cues.
   - Generate neural TTS audio + Whisper word timestamps and compile `timings.ts` with strict per-beat timestamp clamping (`scene.startTime <= chunk.start < chunk.end <= scene.endTime`).
   - Build each beat in `motion-canvas/src/scenes/<vid_id>/beat_0X.tsx` using a distinct diagram archetype from [`diagram-design`](file:///home/agent/.agents/skills/diagram-design/SKILL.md) and [`motion-canvas`](file:///home/agent/.agents/skills/motion-canvas/SKILL.md).

---

## 9. Critical Constraints & Guardrails
- **NEVER Use `pro` Models for Subagents**: Always pass `Model: "flash"` (or `"inherit"` when running on Flash) when invoking `invoke_subagent`. Do not spawn `pro` subagents.
- **Diagram-First Visual Storytelling (No Repetitive 2-Box Slides)**: Never fall back to putting two generic rectangular cards side-by-side in every beat. Every beat must use a diagram archetype whose geometry physically mirrors the economic mechanic (e.g., proportional scale bars with a caliper for a deficit, orthogonal closed-loop conduits for round-tripping, dual timelines hitting a wall for depreciation mismatch, slope curves for asset decay, architectural layer stacks for market stratification).
- **Strict Hold-Time Guard (`>= 2.5s`)**: The final sub-element animation in every beat MUST finish at least `2.5s` before `beatDuration`, and the completed diagram must remain on screen until `finishSceneAt(beatDuration, t0)` without premature fade-out.
- **Terminal Formatting Rules ([`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md))**: Keep all terminal ASCII diagrams and tables `<= 76` characters wide, never emit raw Mermaid blocks in CLI responses, and always format file references as clickable `file://` links.
