# AI-Animation-Workflows — Master Production & Orchestrator Guide

This document defines the unified production standards, subagent contracts, visual hierarchy rules, audio/subtitle alignment pipelines, and rendering workflows for generating high-retention vertical (`1080x1920 @ 60fps`) and widescreen (`1920x1080`) explainer videos in Motion Canvas.

---

## 0. Multi-Agent Reasoning Architecture & Chain-of-Thought Protocol (Mandatory)

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
- **Stabilized Pill Geometry**: Every subtitle word slot must maintain constant `padding={[6, 10]}`, `radius={8}`, and `scale={1.0}` whether active or inactive. Words must NEVER shift or jitter horizontally when highlighted; only text color and background fill transition.
- **Breath-Gap Bridging (`< 0.6s`)**: Keep the subtitle container visible across short speech pauses so the container does not flicker off between adjacent phrases.
- **Uncontested Lower Third**: Keep the bottom area below `y = 655` completely clear of source citations, card borders, or floating badges so the subtitle pill exclusively owns the lower third.

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
   - **Zero-Empty-Slot Flexbox Gap Rule (Symmetrical Pill Padding)**: Active word pills must maintain constant geometry (`scale={1.0}`, `padding={[6, 10]}`) to avoid horizontal jitter. However, in Motion Canvas Flexbox (`layout`), setting `gap={8}` on the parent subtitle `<Rect>` or static `padding={[6, 10]}` on all slot `<Rect>`s adds trailing right-side whitespace for every unused slot (`slotIdx >= chunk.words.length`). Always set `gap={0}` on the parent subtitle `<Rect>`, map over `[0, 1, 2, 3]`, and apply conditional `padding={() => chunk && slotIdx < chunk.words.length ? [6, 10] : [0, 0]}` and `margin={() => chunk && slotIdx < chunk.words.length - 1 ? [0, 8, 0, 0] : [0, 0, 0, 0]}` so left and right subtitle bar margins are 100% symmetrical.

---

## 5. Sequential Rendering & Deployment Pipeline

Never launch multiple concurrent headless browsers during rendering. Always execute sequential renders:

```bash
# 1. Typecheck all scenes
cd /home/agent/orca/AI-nimate/motion-canvas && npx tsc --noEmit

# 2. Clear previous beat outputs to force a fresh render
rm -f output/vid_20261024_001/vid_20261024_001_beat*.mp4 \
      output/vid_20261024_001/vid_20261024_001*.mp4 \
      output/vid_20261024_001/video_web.mp4

# 3. Run sequential render, lossless concat, audio mux, HEVC encode, web faststart transcode, and docker-host rsync
node render_sequential.mjs

# 4. Run automated QA verification for timing sync, hold times, and visual rules
node scripts/qa_verify.mjs vid_20261024_001
```
