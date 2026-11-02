# AI-nimate — Master Production & Orchestrator Guide

This document defines the unified production standards, subagent contracts, visual hierarchy rules, audio/subtitle alignment pipelines, and rendering workflows for generating high-retention vertical (`1080x1920 @ 60fps`) and widescreen (`1920x1080`) explainer videos in Motion Canvas.

---

## 0A. Project Topic Isolation Rule (Mandatory Default)

Unless explicitly instructed otherwise by the user, **every project/episode MUST be treated as a completely separate, independent topic that does not affect any other project**:

1. **Strict Topic & Episode Independence**:
   - Never assume a new video request is a continuation, replacement, or modification of a prior project unless the user explicitly references that episode.
   - Each topic owns an isolated narrative, script, audio file, scene folder, asset directory, and output folder.
2. **Zero Cross-Project Contamination**:
   - Never overwrite, rename, or mutate existing episodes inside `motion-canvas/production/vid_*`, `motion-canvas/src/scenes/vid_*`, `motion-canvas/src/projects/vid_*`, `motion-canvas/public/assets/vid_*`, `motion-canvas/public/audio/vid_*`, or `projects/<channel_name>_<date>_<project_name>/`.
   - Every new project MUST allocate a fresh `vid_YYYYMMDD_NNN` ID and output exclusively to its own canonical directory: `/home/agent/orca/AI-nimate/projects/<channel_name>_<YYYYMMDD>_<project_slug>/`.
3. **Projects Configuration Registry (`projects/projects_config.json`)**:
   - Always inspect [`projects/projects_config.json`](file:///home/agent/orca/AI-nimate/projects/projects_config.json) before generating scripts, voiceovers, or scenes. It is the authoritative single source of truth for:
     - Voice configurations (`gemini-tts`, `voiceName`, `sampleRateHz`, `leadOffsetSec: 0.22`, `spokenBrandReplacement`).
     - Series presets (`Knp?`, `Forensic Deep-Dive`), editorial prompt templates, and icon vector generation prompts.
     - Brand color palettes, Swiss layout rules, and typography contracts.
   - When scaffolding a new project, register its entry in `projects/projects_config.json`.
   - `render.mjs` and `build_portal.mjs` automatically write the per-project `projects/<dirName>/project_config.json` and display its voice, style, palette, and prompt specifications inside the project's walkthrough portal.

---

## 0B. Multi-Agent Reasoning Architecture & Chain-of-Thought Protocol (Mandatory)

The production pipeline operates under the master token-shielding orchestration protocol defined in [`.agents/skills/flash-orchestrator/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/SKILL.md). A high-reasoning Frontier Architect oversees seam definition, decomposition, and review, while all exploration, forensic research, scriptwriting, and code implementation are strictly delegated to specialized workers operating on **`Model: "flash"`** (or `"flash_lite"`).

### Master Subagent Contracts & Roles (`Model: "flash"`)

1. **`research` (Codebase & Fact Scout)**:
   - Scans codebases, documentation, or style references.
   - Output Contract: Structured Markdown tables under 150 words (`File:LineRange`, `Symbol/Signature`, 1-sentence summary); strictly no raw file dumps into parent context.
2. **`deep-researcher` (`SubAgent_Scout`)**:
   - Executes a mandatory 4-Stage CoT Forensic Investigation (Deconstruct Narrative -> 2025–2026 Primary Sources & Unit Economics -> Steelman Counter-Thesis -> Spatial Diagram Archetype Synthesis).
   - Output Contract: Writes `production/<video_id>/research_dossier.md` mapping findings to the **5 Distinct Spatial Diagram Archetypes**.
3. **`thinking-scriptwriter` (`SubAgent_Writer`)**:
   - Reads `research_dossier.md` and executes a mandatory 5-Stage CoT Scriptwriting Protocol (Hook Selection -> Causal Spine -> Semantic Diagram & Visual Micro-Choreography Mapping -> Anti-Slop Audit -> Phonetic & Acronym Engineering).
   - Output Contract: Writes `production/<video_id>/script_cot.md` and structured `production/<video_id>/script.json` with sample-accurate `visual_cues[]`.
4. **`flash-worker` / `flash-coder` (Implementation & Verification Worker)**:
   - Implements TypeScript scene files (`.tsx`), layout wrappers, and asset manifests across file-disjoint work packets.
   - Follows the Ponytail Decision Ladder ("Lazy Senior Dev") and returns Compact Receipts (<150 words).

```
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTIER ARCHITECT TIER (Token-Shielding Context Firewall)             │
│ ────────────────────────────────────────────────────────────────────── │
│ • Defines seams, partitions file-disjoint packets, enforces Ponytail   │
│ • Never executes raw builds or unbuffered logs; reviews git diffs only │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ invokes /flash-orchestrator
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DEEP RESEARCH & REASONING TIER (Model: "flash")                        │
│ ────────────────────────────────────────────────────────────────────── │
│ • deep-researcher (SubAgent_Scout): 4-Stage CoT Forensic Investigation │
│   -> Writes production/<video_id>/research_dossier.md                  │
│                                                                        │
│ • thinking-scriptwriter (SubAgent_Writer): 5-Stage CoT Scriptwriting   │
│   -> Reads research_dossier.md & writes production/<video_id>/script_cot.md│
│                                                                        │
│ • research (Codebase Scout): Line-targeted symbol & seam scouting      │
│                                                                        │
│ 💡 Depth comes from mandatory multi-stage CoT reasoning blocks,        │
│    eliminating shallow placeholders while shielding frontier context.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Hand off verified contracts
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DOWNSTREAM EXECUTION TIER (Model: "flash")                             │
│ ────────────────────────────────────────────────────────────────────── │
│ • flash-worker / flash-coder: Motion Canvas TypeScript scenes (.tsx)   │
│ • TTS synthesis & Whisper acoustic chunking (SubAgent_TTS)             │
│ • Wikimedia Commons authentic SVG extraction & logo cropping           │
│ • Lossless concat, audio mux, and sequential ffmpeg rendering          │
│ • Automated QA verification: node scripts/qa_verify.mjs <video_id>     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Visual Hierarchy & Animation Standards (Mandatory)

To prevent split attention between moving graphics, on-screen text, and subtitles, every scene **must** obey these core visual rules:

### Rule 1: Single Slowed Focal Wobble (Stillness by Default)
- **Zero Global Camera Wobble**: Never apply `Math.sin` or `Math.cos` position/rotation float or zoom creep to the outer stage wrapper (`<Node y={-60}>`). The grid and stage canvas must remain completely anchored.
- **Only the Active Element Moves**: Track the active focal element with a signal (e.g., `const focalId = createSignal(1)`).
- **Use `focalScale` and `focalRotation`**:
  - **Active focal element** (`focalId() === id`): Receives a gentle, significantly slowed breathing pulse (`focalScale` at `0.55 rad/s` scale breath of `±1.5%`, `focalRotation` at `0.45 rad/s` rotation tilt of `±0.4°`).
  - **Inactive elements** (`focalId() !== id`): Must remain **100% stationary** (`scale(1.0)`, `rotation(0)`), dimmed to `opacity: 0.22`.
  - Never apply separate or conflicting `Math.sin` rotations to child icons, tags, or badges inside cards.

### Rule 1B: Never Use Bare `<Camera>` with `opacity < 1` Children (The `worldSpaceCacheBBox` Invariant)
- **The Bug**: In `@motion-canvas/2d`, `<Camera>` creates a detached internal `this.scene = new Node({})` (`parent === null`), which loses `View2D`'s center-origin transform (`translate(width/2, height/2)`). Whenever any child has `opacity < 1` (during fades, transitions, or dimming), `Node.requiresCache()` intersects the child's bounding box against `[0..width, 0..height]` instead of `[-width/2..width/2, -height/2..height/2]`, slicing off the entire left half (`x < 0`) and top half (`y < 0`) of the canvas!
- **Mandatory Fix**: Always wrap scene diagrams in `<Node ref={stage}>` directly under `view` (or `<Camera.Stage width={width} height={height}>`), NEVER a bare `<Camera>`.

### Rule 2: Strict Icon-Only Logo & Authentic Vector Source Rule
- **Authentic Wikimedia Commons / Official Vector Logo Rule**: NEVER draw synthetic geometric stand-in logos with Python/PIL/Canvas or hallucinate brand marks with AI image generators when referencing real companies, stock exchanges, financial products, or government agencies (e.g., IDX, BCA, Interactive Brokers, IRS, EU/Ireland UCITS, Kemenkeu/DJP, OECD). Always fetch the authentic SVG/PNG from **Wikimedia Commons API (`commons.wikimedia.org/w/api.php`)**, **SimpleIcons**, or official brand repositories, and crop/extract the clean **logomark or official seal** (stripping only tiny multi-word taglines/wordmarks so the graphic mark sits cleanly beside the Motion Canvas `<Txt>` title).
- **Text-Free Transparent Graphics**: Any generated or imported PNG logo/emblem (`<Img>`) **MUST be a 100% text-free, square (`256x256`) graphic mark on a transparent background**.
- **Forbidden Baked Text**: NEVER bake small text, ticker labels (`IDX: BBCA`, `VOO`), subtitles, percentage numbers, or rectangular card borders inside a PNG asset.
- **Crisp Vector Typography**: All text titles, ticker labels, and figures must be rendered as crisp Motion Canvas `<Txt>` nodes beside the `<Img>` icon node.

### Rule 3: Visual Density Cap & 5 Distinct Spatial Diagram Archetypes (Ban Generic 2-Box Repeats)
- **5 Distinct Spatial Diagram Archetypes**: Every beat must choose a diagram archetype that physically acts out the mechanism of the sentence rather than repeating generic 2-box dashboard cards across consecutive beats:
  1. **Scale Chasm / Bar + Caliper**: Dynamic comparative sizing, caliper measurement brackets, and ratio multiplier markers.
  2. **Closed-Loop Orthogonal Conduit**: Cyclical mechanics, directional cashflow/token loops, and animated pulse flows.
  3. **Dual-Axis Parallel Timeline + Wall**: Race trajectories, divergent velocity paths, and deadline/collision walls.
  4. **Quantitative Slope / Decay Curve**: Threshold inflection points, exponential vs linear decay curves, and margin dropoffs.
  5. **3-Tier Architectural Layer Stack**: Vertical abstraction layers, infrastructure plumbing, and off-balance-sheet waterfalls.
- **Max Visual Density**:
  - Max 1 primary diagram system per beat with `<= 3` key hubs, bars, or tiers visible simultaneously.
  - Max 3 lines of text per node: Title (2–3 words), Hero Number / Stat Pill (`<= 12` chars), Tag / Metric Badge (`<= 16` chars).
  - Minimum `36px` font size for any text node on a 1080p canvas.
  - Orthogonal connectors (`<Line radius={20} end={0..1} endArrow />`) must use opaque label masks (`<Rect fill={COLORS.bg} stroke={COLORS.ink} padding={[8, 16]} layout>`) so lines never bleed through text.
- **Division of Labor**: Subtitles carry spoken sentences; graphic elements carry only numbers, tickers, and icons. Forbidden: multi-word explanatory footers, bullet-point paragraphs, or full legal citations inside diagram nodes.

### Rule 4: Sample-Accurate Acoustic-to-Visual Sync & Progressive Diagram Staging (`timings.json` Word Trigger Rule)
- **Sample-Accurate Word Trigger Rule (`±0.3s`)**: Every major visual reveal (bar growth, counter tick, conduit draw, wall drop, badge flip) MUST be triggered within `±0.3s` of the exact spoken word timestamp in `timings.json` (never 7–9 seconds premature!).
- **Intervening Micro-Cue Cadence (2.0s–2.8s intervals)**: Intermediate micro-cues (axis draw, baseline entry, station pop-in, sub-badge overshoot) MUST fill the intervening `2.0s–2.8s` intervals so there is never a static stretch `> 3.0s` across any beat.
- **Strict Hold-Time Guard (`>= 2.7s` Before Beat End)**: The final visual element and animation in every beat MUST finish at least **`>= 2.7s` before `beat.end`** to ensure viewers can comprehend the complete diagram before the scene boundary.
- **Fast 1.0s–1.8s Counters**: Ban 10–12 second continuous money tickers. Number counters (`tween`) must execute in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure.
- **Progressive Staging Sequence (No Canvas Clutter at `t = 0`)**:
  - `t = 0.0s`: Baseline/axis/frame enters (`opacity: 0 -> 1`, `scale: 0.95 -> 1.0`). Hubs/bars initialize hidden (`opacity: 0`).
  - `t = 2.0s–2.8s`: Primary station/entity pops in (`scale: 0 -> 1.15 -> 1.0`) as subject is introduced.
  - `t = spoken word (±0.3s)`: Major mechanism activates (conduit line draws, bar tweens in `1.0s–1.8s`, or collision wall drops).
  - `t = subsequent word (±0.3s)`: Secondary entity, metric badge flip, or bracket step-up reveals.
  - `t <= beat.end - 2.7s`: Final forensic stamp, caliper bracket, or verdict highlight completes.
- **Post-Render Verification**: Always run `node scripts/qa_verify.mjs <video_id>` after every render to verify visual cue timestamps, hold times, and absence of static stretches `> 3.0s`.

### Rule 5: Stationary Subtitles & Uncontested Lower-Third
- **Acoustic Lead Compensation (`LEAD_OFFSET = 0.22`)**: Advance subtitle word highlighting by `+220ms` (`t = useScene().playback.time() + 0.22`) to compensate for Whisper acoustic latency, ensuring highlight fires exactly on consonant onset.
- **Per-Beat Render Global Time Invariant (`sceneStart` Offset)**: Because `render_sequential.mjs` renders each beat (`beat_01`, `beat_02`, ...) as an isolated single-scene Motion Canvas project, `useThread().time()` resets to `0.00s` at the start of every beat. Therefore, `layout.tsx` MUST compute global subtitle lookup time as `const gt = sceneStart + (time() - t0) + LEAD_OFFSET;` (mapping the section label `01`..`06` to `SCENE_TIMINGS[sceneIdx].start`). Omitting `sceneStart` causes Beat 2..N to reset `gt` to `0.00s` and loop Beat 1's subtitles from the beginning at every scene boundary!
- **Stabilized Pill Geometry**: Every subtitle word slot must maintain constant padding (`padding={[18, 30]}` on 9:16 phone with `fontSize={44}` and slot `padding={[9, 14]}`; `padding={[14, 28]}` on 16:9 widescreen with `fontSize={38}` and slot `padding={[6, 10]}`), `radius`, and `scale={1.0}` whether active or inactive. Words must NEVER shift or jitter horizontally when highlighted; only text color and background fill transition.
- **Breath-Gap Bridging (`< 0.6s`)**: Keep the subtitle container visible across short speech pauses so the container does not flicker off between adjacent phrases.
- **Uncontested Lower Third**: Keep the bottom area below `y = 655` completely clear of source citations, card borders, or floating badges so the subtitle pill exclusively owns the lower third.

### Rule 6: Physical Screen Calibration & Minimum Typography / Asset Sizing (9:16 Phone vs 16:9 Desktop)
- **Mandatory Shared Screen Calibration Module**: Every new project `vid_YYYYMMDD_NNN/layout.tsx` MUST import and re-export `getTypo(wide)` and `getAssets(wide)` from `src/shared/screenCalibration.ts` (or `../../shared/screenCalibration`) to lock in standardized typographical hierarchy, stroke weights, and subtitle geometries.
- **Automated Font Floor QA Gate**: Always run `node scripts/qa_verify.mjs <project_id>` to verify the Phone Font Floor (`micro >= 18px` in 16:9, `>= 20px` in 9:16) with zero micro-font violations.
- **Anti-Pattern Banned**: Never make `9:16` (`1080x1920`) fonts or icons smaller than `16:9` (`1920x1080`) using `wide ? 24 : 15`.
- **Why**:
  - `9:16` (`1080x1920`) is viewed almost exclusively on **6.1"–6.7" smartphones** (~390 CSS px wide, `0.36x` scale factor). A `15px` canvas font shrinks to **`5.4px` CSS (`~0.9mm`)** on a phone screen—completely illegible without zooming!
  - `16:9` (`1920x1080`) is viewed on **14"–27" laptops/monitors or landscape players** (~960–1920 CSS px wide).
- **Mandatory Minimum Canvas Sizing Table**:

| Element Tier | 16:9 Widescreen (`1920x1080`) | 9:16 Vertical Phone (`1080x1920`) | Physical Phone CSS Equivalent (`0.36x`) |
| :--- | :--- | :--- | :--- |
| **Absolute Minimum Font Floor** | **`>= 18px`** | **`>= 20px`** (never `11–16px`) | `>= 7.2px` CSS |
| **Axis Ticks / Micro-Tags** | `18px–20px` | `20px–22px` | `7.2px–8.0px` CSS |
| **Callout Pills / Data Badges** | `22px–28px` | `22px–26px` | `8.0px–9.4px` CSS |
| **Card / Track Headings** | `32px–38px` | `34px–38px` | `12.2px–13.7px` CSS |
| **Hero Numbers / Counters** | `42px–48px` | `40px–46px` | `14.4px–16.6px` CSS |
| **Subtitle Pill Text** | `38px` (`padding [14, 28]`) | `44px` (`padding [18, 30]`) | `15.8px` CSS |
| **Section Indicator (`01 // ...`)** | `26px` | `30px` | `10.8px` CSS |
| **Square Logos / Icons** | `50px–60px` | `56px–70px` | `20px–25px` CSS |
| **Wide Multi-Brand Badges (`2:1`)** | `110x55` to `120x60` | `128x64` to `140x70` | `46x23` to `50x25` CSS |
| **Active Diagram Canvas Utilization** | `>= 70%` width (`1340px+`), `>= 55%` height | `>= 82%` width (`880px–940px`), `>= 50%` height (`750px–950px`) | Full mobile viewport command |

### Rule 7: Perpendicular Box-Edge Arrow Entry & Conduit Geometry (Cyclic & Flow Diagrams)
- **Anti-Pattern Banned**: Never route an orthogonal conduit or arrow parallel/flush along a card's top/bottom border (`[x1, cardEdgeY] -> [x2, cardEdgeY]`) or point sideways into a horizontal edge (or vertically into a vertical edge).
- **Mandatory Rule**:
  - Every arrow or conduit connecting two nodes/stations MUST exit **perpendicularly** (`90°`) from the source card's edge and enter **perpendicularly** (`90°`) into the target card's edge, with `4px–8px` clearance so the arrowhead tip lands cleanly at the border.
  - **In `9:16` Vertical Stacked Flow/Cyclic Graphs** (Station 1 at top `y = hubAY`, Station 2 at bottom `y = hubBY`):
    - Use **straight vertical conduits** connecting the bottom edge of Station 1 (`y = hubAY + cardHalfH`) and the top edge of Station 2 (`y = hubBY - cardHalfH`):
      - Outbound (Left): `[[-offsetX, hubAY + cardHalfH], [-offsetX, hubBY - cardHalfH - 4]]` (pointing straight down).
      - Return (Right): `[[+offsetX, hubBY - cardHalfH], [+offsetX, hubAY + cardHalfH + 4]]` (pointing straight up).
    - Stagger conduit callout pills vertically across the gap (`y_out = -180`, `y_center = -55`, `y_ret = +70`) so each pill masks its own vertical conduit line and never collides horizontally.
  - **In `16:9` Widescreen Side-by-Side Cyclic Graphs** (Station 1 at left `x = hubAX`, Station 2 at right `x = hubBX`):
    - Exit vertically (`90°`) from the top edge (`hubAY - cardHalfH`) up to an overhead rail (`hubAY - 245`), cross horizontally, and drop vertically (`90°`) into the top edge of Station 2 (`hubBY - cardHalfH`); mirror on the bottom for the return conduit.
- **Automated QA Verification**: The Perpendicular Conduit Check in `node scripts/qa_verify.mjs <project_id>` scans all `beat_*.tsx` files for any 4-point `<Line` `points` array sharing identical `y` expressions at the start or end, rejecting sideways border-flush entries.

### Rule 8: Readable Modern Sans-Serif Headings & Strict Screen Text Density Cap (Max 18 `<Txt>` Nodes)
- **Modern Readable Sans Typography**: NEVER use thin high-contrast decorative serifs like `'Instrument Serif'` for headings on mobile explainer videos. On 6" smartphone screens, thin serif hairlines vanish and cause extreme visual fatigue. Always use bold, clean, modern sans-serifs (`HEADING_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif"`, `fontWeight={800}`).
- **Strict Text Node Density Cap (`<= 18` `<Txt>` nodes per beat)**:
  - Every beat scene MUST contain **no more than 18 `<Txt>` nodes** in total (allowing 4–5 short X/Y axis tick labels in chart beats while strictly preventing visual clutter).
  - Eliminate redundant eyebrow badges, card-internal category tags, and bottom summary footers that duplicate information or crowd the subtitle zone.
  - Inside entity/station cards, restrict text to **at most 2 text elements**: one bold Title (`fontWeight={800}`, `fontSize={32-36}`) and one high-contrast Stat Pill (`fontSize={20-24}`).
- **Automated QA Verification**: Check 14 (`Readable Sans & Density Check`) in `qa_verify.mjs` automatically inspects `layout.tsx` to reject `'Instrument Serif'` in heading fonts and enforces the `<= 18` `<Txt>` nodes density cap per beat file.

### Rule 9: Contained Chart Coordinate Safe-Zones & Zero Line-Cutting Invariant
- **Contained Frame Enclosure**: All quantitative chart lines, plunge curves, benchmark indicators, and milestone callouts must be strictly enclosed inside a dedicated background card frame (e.g., vertical `9:16`: `width = 900`, `x: [-450, +450]`, `height = 680`). Placing chart axes directly on the uncontained canvas causes axis labels and milestone tags to clip off the screen edges (`x = ±540`).
- **Zero Line-Cutting Invariant**:
  - Trajectory curves, crash lines, and reference vectors must NEVER slice through milestone labels or callout text boxes.
  - Place milestone pills cleanly offset above or below line vertices (e.g., `y = -155` above point `[-340, -120]`, or `y = -15` above point `[-60, +20]`), using opaque card fills (`fill={'#FFFFFF'}`) and distinct borders so the data line never intersects text.
  - Hero summary metrics (`-85% NILAI HILANG`) must sit in an unobstructed dedicated hero slot below the chart plunge.

### Rule 10: Natural Top-to-Bottom Mobile Stack Order & Arrowless Clean Separation
- **Mobile Ergonomic Flow (Top-to-Bottom `#1 -> #2 -> #3`)**:
  - In vertical `9:16` multi-tier architectural stacks or checklist cards, cards MUST be arranged and revealed in natural reading order: **Top-to-Bottom** (`#1` at top `y = -310`, `#2` at middle `y = -80`, `#3` at bottom `y = +150`).
  - Never stack upwards from bottom-to-top (`L1` at bottom to `L3` at top), which forces the viewer's eye to read backwards against mobile scrolling habits.
- **Arrowless Clean Separation**:
  - Maintain a clean whitespace gap of **`>= 40px`** between consecutive cards in the stack.
  - Do NOT draw tiny connector arrows (such as `^` or `v`) between cards; arrows create severe visual collision with card borders and add unnecessary clutter on small screens.
  - Differentiate hierarchy solely through distinct color-coded numeric badges (`#1`, `#2`) and icon badges with bold heading typography.

### Rule 11: Single Sub-Chapter Top Brow (`Knp? | <Chapter Name>`)
- **Ban Multi-Pill Clutter**: Never render multi-pill navigation bars, 5-segment chapter trackers, or busy progress tabs across the top brow of the video. The top zone must remain clean, focused, and calm so the viewer's attention stays locked on the central diagram.
- **Single Crisp Top Brow Pill**:
  - Position strictly at `x = 0, y = wide ? -475 : -820`.
  - Geometry: A sleek rounded pill (`layout={true}`, `direction={'row'}`, `alignItems={'center'}`, `padding={[12, 28]}`, `radius={999}`, `fill={'#FFFFFF'}`, `stroke={PALETTE.ink}`, `lineWidth={2.5}`, `gap={14}`).
  - Content: Exclusively display the series brand and the current sub-chapter name:
    - `<Txt text="Knp?" fontFamily={HEADING_FONT} fontSize={wide ? 26 : 30} fontWeight={800} fill={PALETTE.crimson} />`
    - `<Txt text="|" fontFamily={HEADING_FONT} fontSize={wide ? 26 : 30} fontWeight={400} fill={'#94A3B8'} />`
    - `<Txt text={chapterName} fontFamily={HEADING_FONT} fontSize={wide ? 26 : 30} fontWeight={800} fill={PALETTE.ink} />`
  - In `layout.tsx`, define `BEAT_LABELS` using the exact `Knp? | <Chapter Name>` format (e.g., `'Knp? | Ancaman Turun Kasta'`).

### Rule 12: Mandatory X & Y Axes on All Quantitative Graphs
- **No Naked Graphs**: Never display naked quantitative curves, plunge slopes, or comparative bar charts floating in mid-air without directional axes and scale context.
- **Mandatory Dual-Axis System**:
  1. **Crisp Y-Axis Line**: `<Line>` with `endArrow` pointing upwards along the vertical metric dimension (`x = wide ? -480 : -310` in contained cards, `x = wide ? -540 : -425` in bar charts). Accompanied by at least 2 horizontal dashed reference gridlines (e.g., `50%`, `100%`, `AMAN`, `TURUN`, `KRISIS`) with high-contrast text labels.
  2. **Crisp X-Axis Line / Baseline**: `<Line>` with `endArrow` pointing rightwards along the temporal or categorical sequence, accompanied by milestone labels (e.g., `AWAL`, `PANIK`, `KINI` at `y = +175`).
  3. **Dedicated Hero Badge Safe-Zone**: Hero summary metrics (e.g., `-Rp500T+ MENGUAP`) must sit in an unobstructed dedicated slot **below the X-axis baseline** (e.g., `x = +30, y = +255`), guaranteeing zero collision with the animated curve or milestone nodes above.
- **Automated QA Verification**: Check 15 (`Clean Brow & Chart Axes Check`) in `qa_verify.mjs` enforces `Knp? |` chapter brow formatting and verifies at least 2 axis `<Line` declarations with `endArrow` in quantitative curve beats.

---

## 2. Research Agent Standards (`deep-researcher` / `SubAgent_Scout`)

> **Model Specification**: Operates on **`Model: "flash"`**. Analytical and forensic depth is strictly derived from the mandatory **4-Stage Research Chain-of-Thought (`research_dossier.md`)** protocol!

The `deep-researcher` subagent conducts deep empirical investigations and outputs `production/<video_id>/research_dossier.md` executing an explicit **4-Stage Chain-of-Thought (CoT)** protocol before synthesizing visual contrast cards:

### The 4-Stage Chain-of-Thought Research Protocol

1. **`[CoT Stage 1: Deconstruct the Mainstream Narrative]`**:
   - Identify what sensational headlines, social media posts, and retail investors misunderstand about the topic.
   - Pinpoint the hidden accounting loopholes, regulatory blind spots, or structural misalignments enabling the distortion.
2. **`[CoT Stage 2: Forensic Primary-Source & Unit-Economics Teardown (2025-2026)]`**:
   - Extract raw primary-source evidence: audited 10-K/annual report filings, statutory tax rules, capital structures, debt schedules, and unit multipliers.
   - Anchor strictly to 2025–2026 recency bounds; verify effective statutory dates and real stock tickers (`BBCA.JK`, `VOO`, `CSPX`, `VWRA`).
3. **`[CoT Stage 3: Steelman Counter-Thesis & Failure Mode Analysis]`**:
   - Steelman the opposing bull/bear arguments with mathematical rigor.
   - Calculate exact break-even thresholds, fee drag inflection points, and systemic failure probabilities.
4. **`[CoT Stage 4: Spatial Diagram Archetype Synthesis (5 Distinct Archetypes)]`**:
   - Map each beat's forensic finding into one of the **5 Distinct Spatial Diagram Archetypes** (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Dual-Axis Parallel Timeline + Wall`, `Quantitative Slope / Decay Curve`, `3-Tier Architectural Layer Stack`) that physically models the mechanism:
     - *Scale Chasm*: Visualizing expense ratio illusions (0.03% headline vs 30% dividend withholding + 40% estate tax chasm).
     - *Closed-Loop Conduit*: Tracing foreign tax treaty leakage vs direct Irish UCITS accumulation loop.
     - *Parallel Timeline + Wall*: Comparing compounding trajectories before hitting the statutory liquidity wall.
   - Strictly ban repeating generic 2-box dashboard cards across consecutive beats. Deliver precise hero numbers (`<=12` chars), sub-tags (`<=20` chars), axis labels, and authentic Wikimedia Commons vector marks directly to the Scriptwriter and Animator.

---

## 3. Scriptwriting & Cadence Standards (`thinking-scriptwriter` / `SubAgent_Writer`)

> **Model Specification**: Operates on **`Model: "flash"`**. Narrative and psychological retention depth is strictly derived from the mandatory **5-Stage Scriptwriting Chain-of-Thought (`script_cot.md`)** protocol!

The `thinking-scriptwriter` subagent reads `production/<video_id>/research_dossier.md` and generates `production/<video_id>/script_cot.md` executing an explicit **5-Stage Chain-of-Thought (CoT)** protocol before outputting `script.json`:

### The 5-Stage Chain-of-Thought Scriptwriting Protocol

1. **`[CoT Step 1: Pattern-Interrupt Hook Selection]`**:
   - Draft **3 distinct candidate hooks** challenging a core viewer assumption in under `<3.5s`.
   - Evaluate against psychological pattern interrupt and select the sharpest opening line with zero throat-clearing.
2. **`[CoT Step 2: 'Therefore / However' Causal Spine]`**:
   - Connect every narrative beat via explicit causal tension questions (*"Therefore"*, *"However"*, *"Because of this"*).
   - Strictly ban chronological "and then" listicles; maintain an unbroken forensic chain of cause and effect.
3. **`[CoT Step 3: Semantic Diagram Archetype & Sample-Accurate Visual Mapping]`**:
   - Assign each beat to one of the **5 Distinct Spatial Diagram Archetypes** (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Dual-Axis Parallel Timeline + Wall`, `Quantitative Slope / Decay Curve`, `3-Tier Architectural Layer Stack`).
   - Map every major reveal (bar growth, counter tick, conduit draw, wall drop, badge flip) to fire within `±0.3s` of the exact spoken word timestamp in `timings.json` (never 7–9 seconds premature!).
   - Choreograph intermediate micro-cues (axis draw, baseline entry, station pop-in, sub-badge overshoot) every `2.0s–2.8s` (zero static stretches `> 3.0s`).
   - Enforce the Strict Hold-Time Guard: final visual element finishes `>= 2.7s` before `beat.end`.
4. **`[CoT Step 4: Anti-Slop & Oral Cadence Audit]`**:
   - Strip AI cliches (`"Di era digital ini"`, `"Pernahkah Anda berpikir"`, unearned moralizing).
   - Enforce natural breath punctuation (commas, em-dashes `—`, periods) every 4–8 words so Whisper word-level timestamps segment cleanly into `≤4`-word chunks.
5. **`[CoT Step 5: Phonetic & Acronym Engineering]`**:
   - Verify explicit phonetic spelling brackets for all tickers, acronyms, and bilingual terms:
     `[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`, `[VOO|V-O-O]`, `[CSPX|C-S-P-X]`.
   - Embed natural delivery markers: `<breath>`, `<chuckle>`, `<short pause>`.

### Mandatory Rule: Layman & Non-Investor Accessibility (Zero Unexplained Jargon)
- **Series Brand & TTS Rule**: Series brand is **`Knp?`** in titles and top-left stage badges (`KNP? // 01: [BEAT TITLE]`). In `spoken_text` (fed to AI TTS), **ALWAYS write the full spoken word `"kenapa"`** (never `"K-N-P"`).
- **Zero Financial Background Assumption**: Assume the target viewer is an everyday Indonesian with **zero background in finance or stock trading**.
- **Ban Unexplained Stock-Bro Jargon**: Never use raw market jargon or acronyms (*free float*, *ARB*, *trading halt*, *capex*, *rebalancing*, *outflow*, *FIF*, *PBV*, *PER*, *Emerging Market*, *Standalone Market*) without immediately translating them into a concrete, everyday real-life analogy:
  - *MSCI* -> *"wasit bursa saham dunia yang nentuin negara mana yang layak dimasuki uang triliunan rupiah dari luar negeri"*.
  - *Emerging to Standalone* -> *"ibarat dari liga utama dunia, Indonesia terancam diturunkan paksa ke kasta terendah—selevel negara yang lagi krisis berat"*.
  - *Free Float* -> *"saham yang beneran dijual bebas ke warga biasa"*.
  - *ARB / Crash* -> *"harga saham ambruk mentok batas bawah berhari-hari"*.
  - *Outflow* -> *"investor asing panik tarik uang triliunan rupiah"*.
- **Plain Indonesian Diagram Labels**: On-screen diagram labels, pills, and card titles **MUST use plain Indonesian words first**, never obscure English financial abbreviations.

### Output Contract: Explicit `[VISUAL CUE @ phrase]` in `script.json`
Annotate intermediate sub-cues within each beat linking spoken trigger phrases to exact visual actions:
- `[VISUAL CUE: draw_conduit | loop_line | "mengalir ke luar negeri" | 1.2s]`
- `[VISUAL CUE: trigger_counter | counter_drag | "tiga puluh persen" | 1.4s]`
- `[VISUAL CUE: drop_wall | barrier_estate | "batas enam puluh ribu"]`
- `[VISUAL CUE: stamp_seal | seal_warning | "jebakan pajak"]`

---

## 4. Voice / TTS & Alignment Stack (`SubAgent_TTS`)

### 2026 Bilingual Voice Cloning & TTS Stack
For production-grade bilingual (Indonesian + English) voice synthesis:
- **Self-Hosted Open-Weights**:
  - **VoxCPM2 (`OpenBMB/VoxCPM2`, June 2026)**: 48kHz native bilingual EN/ID foundation model with zero-shot cloning and authentic accent preservation.
  - **Qwen3-TTS (`Qwen/Qwen3-TTS-1.7B`, Jan 2026)**: Ultra-fast streaming synthesis with natural conversational prosody.
  - **IndexTTS2 (June 2025)**: Explicit duration-controlled neural alignment.
- **Cloud API**:
  - **ElevenLabs (`Eleven v4` Sept 2026 / `Eleven v3` March 2026 PVC/IVC)**: Industry-standard high-fidelity voice cloning.

### Whisper Post-Processing & Scene-Bounded Chunking Contract
1. **Domain Spellcheck Pass**: Run Whisper transcripts through a domain normalization dictionary before timing generation:
   - `Peluang` -> `Pluang`
   - `SNP` / `S and P` -> `S&P`
   - `state tax` -> `estate tax`
   - `BCA` / `BBCA` -> `BBCA`
2. **Chunking Constraints**:
   - Maximum **4 words** and maximum **25 characters** per subtitle chunk.
   - Break chunks immediately on punctuation (`,`, `.`, `?`, `!`, `—`).
3. **Strict Scene Boundary Clamping**:
   - Every chunk's `start` and `end` timestamp MUST be strictly contained within its parent scene beat:
     `scene.startTime <= chunk.start < chunk.end <= scene.endTime`
   - **Zero cross-beat subtitle bleeding**.
4. **Karaoke Highlighting & Per-Beat Global Time (`sceneStart`)**:
   - Highlight active word with `LEAD_OFFSET = 0.22` (+220ms lead).
   - **Per-Beat Render Global Time Invariant (`sceneStart` Offset)**: Because `render_sequential.mjs` renders each beat (`beat_01`, `beat_02`, ...) as an isolated single-scene Motion Canvas project, `useThread().time()` resets to `0.00s` at the start of every beat. Therefore, `layout.tsx` MUST compute global subtitle lookup time as `const gt = sceneStart + (time() - t0) + LEAD_OFFSET;` (mapping the section label `01`..`06` via `.startsWith('01'..'06')` to `SCENE_TIMINGS[sceneIdx].start`). Omitting `sceneStart` causes Beat 2..N to reset `gt` to `0.00s` and loop Beat 1's subtitles from the beginning at every scene boundary!
   - **Zero-Empty-Slot Flexbox Gap Rule (Symmetrical Pill Padding)**: Active word pills must maintain constant geometry (`scale={1.0}`) to avoid horizontal jitter. In Motion Canvas Flexbox (`layout`), setting `gap={8}` on the parent subtitle `<Rect>` or static padding on all slot `<Rect>`s adds trailing right-side whitespace for every unused slot (`slotIdx >= chunk.words.length`). Always set `gap={0}` on the parent subtitle `<Rect>`, map over `[0, 1, 2, 3]`, and apply conditional padding (e.g., `[9, 14]` for 9:16 phone / `[6, 10]` for 16:9 widescreen) and margin (e.g., `[0, 11, 0, 0]` for 9:16 phone / `[0, 8, 0, 0]` for 16:9 widescreen only when `slotIdx < chunk.words.length - 1`), with phone pill `padding={[18, 30]}` / `fontSize={44}` and widescreen pill `padding={[14, 28]}` / `fontSize={38}` so left and right subtitle bar margins are 100% symmetrical.

---

## 5. Sequential Rendering & Automated QA Pipeline (`render.mjs` + `qa_verify.mjs`)

Never launch multiple concurrent headless browsers during rendering. Always execute sequential renders via [`motion-canvas/render.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/render.mjs), which stages per-beat intermediates in `.cache/render/<project_id>`, concatenates & muxes final deliverables directly into `/home/agent/orca/AI-nimate/projects/<channel>_<date>_<slug>/`, deletes temporary beat clips, and triggers [`build_portal.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/build_portal.mjs):

```bash
# 1. Typecheck all scenes
cd /home/agent/orca/AI-nimate/motion-canvas && npx tsc --noEmit

# 2. Render directly into ../projects/<channel>_<date>_<slug>/
node render.mjs --project=vid_YYYYMMDD_NNN --channel=kausalmedia --slug=<project-slug> --aspects=9x16

# 3. Run the 15-check automated QA verifier (timings, hold times, Rules 1-12, keyframes)
node scripts/qa_verify.mjs vid_YYYYMMDD_NNN

# 4. Build portal UI & deploy to https://cuang.dev/projects/ainimate/
cd /home/agent/orca/AI-nimate && npm run deploy
```

---

## 6. Web Portal & Cloud Deployment Architecture

### 1. Canonical Project Output Layout (`projects/<channel_name>_<date>_<project_name>/`)
All animated video releases are stored exclusively in `/home/agent/orca/AI-nimate/projects/<channel_name>_<date>_<project_name>/` (with zero loose symlinks or intermediate beat caches):
- `index.html`: Two-column Cinema + Interactive 5-Beat Walkthrough UI (adaptive `9:16` / `16:9` viewport, "Loop Beat" toggle, segmented 5-beat progress bar, live-synced beat transcript cards, QA keyframe lightbox, and asset downloads).
- `embed.html`: Responsive iframe embed player.
- `project_config.json`: Project-specific configuration (voice settings, style, palette, prompt specs, and beat archetypes).
- `meta.json`: Standardized project metadata, beat timings, transcripts, and QA status (`15/15 PASS`).
- `script.json` & `timings.json`: Full narrative script and Whisper word-level alignment data.
- `narration.wav`: Master vocal narration audio.
- `video_9x16.mp4`, `video_16x9.mp4` (when dual-aspect), `video_whatsapp.mp4`, `video.mp4`.
- `thumb.jpg`, `thumb_9x16.jpg`, `thumb_16x9.jpg`, and `qa_frames/beat1..5*.jpg`.

### 2. Portal Discovery Hub (`projects/index.html` & `build_portal.mjs`)
- **Rebuild Discovery Hub, Walkthroughs, and `projects/manifest.json`**:
  ```bash
  node /home/agent/orca/AI-nimate/motion-canvas/scripts/build_portal.mjs
  ```
- **Deploy to `cuang.dev`**:
  ```bash
  npm run deploy
  # Or directly: bash /home/agent/orca/AI-nimate/motion-canvas/scripts/deploy_portal.sh
  ```

### 3. Nginx Gateway & HTTP Basic Auth Admin Gate (`cuang.dev`)
- **Public URL**: `https://cuang.dev/projects/ainimate/`
- **Reverse Proxy Path**: Cloudflare Tunnel -> `docker-host` (`projects-cuang-nginx`, `0.0.0.0:8095->80/tcp`)
- **Authentication**: HTTP Basic Auth (`auth_basic "AI-nimate Admin"; auth_basic_user_file /etc/nginx/.htpasswd;`) protecting `/projects/ainimate/` and every sub-URL (`/projects/ainimate/<channel>_<date>_<project_name>/...`). Credentials (`AINIMATE_ADMIN_USER` / `AINIMATE_ADMIN_PASS`) are stored in `/home/agent/orca/AI-nimate/.env`.
- **Legacy URL Redirects**: Handled cleanly via `301` rewrite rules inside `/etc/nginx/conf.d/default.conf` on `docker-host` (keeping `projects/` 100% free of legacy symlinks).
- **Byte Ranges**: Supports streaming video scrubbing via `Accept-Ranges: bytes` (HTTP 206 Partial Content).
