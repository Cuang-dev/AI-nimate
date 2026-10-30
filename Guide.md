# AI-Animation-Workflows — Master Production & Orchestrator Guide

This document defines the unified production standards, subagent contracts, visual hierarchy rules, audio/subtitle alignment pipelines, and rendering workflows for generating high-retention vertical (`1080x1920 @ 60fps`) and widescreen (`1920x1080`) explainer videos in Motion Canvas.

---

## 0. Multi-Agent Reasoning Architecture & Chain-of-Thought Protocol (Mandatory)

The production pipeline mandates **`Model: "flash"`** across sub-agents, with cognitive and analytical depth strictly enforced through mandatory structured **Chain-of-Thought (CoT)** reasoning protocols:

```
┌────────────────────────────────────────────────────────────────────────┐
│ DEEP RESEARCH & REASONING TIER (Model: "flash")                        │
│ ────────────────────────────────────────────────────────────────────── │
│ • deep-researcher (SubAgent_Scout): 4-Stage CoT Forensic Investigation │
│   -> Writes production/<video_id>/research_dossier.md                  │
│                                                                        │
│ • thinking-scriptwriter (SubAgent_Writer): 5-Stage CoT Scriptwriting   │
│   -> Reads research_dossier.md & writes production/<video_id>/script_cot.md│
│                                                                        │
│ 💡 NOTE: Depth comes from mandatory multi-stage CoT reasoning blocks,   │
│   eliminating shallow placeholders while maintaining high throughput.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ Hand off verified contracts
┌────────────────────────────────────────────────────────────────────────┐
│ DOWNSTREAM EXECUTION TIER (Model: "flash")                             │
│ ────────────────────────────────────────────────────────────────────── │
│ • TTS synthesis & Whisper acoustic chunking (SubAgent_TTS)             │
│ • Wikimedia Commons authentic SVG extraction & logo cropping           │
│ • Motion Canvas TypeScript scene implementation (.tsx)                 │
│ • Lossless concat, audio mux, and sequential ffmpeg rendering          │
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

### Rule 2: Strict Icon-Only Logo & Authentic Vector Source Rule
- **Authentic Wikimedia Commons / Official Vector Logo Rule**: NEVER draw synthetic geometric stand-in logos with Python/PIL/Canvas or hallucinate brand marks with AI image generators when referencing real companies, stock exchanges, financial products, or government agencies (e.g., IDX, BCA, Interactive Brokers, IRS, EU/Ireland UCITS, Kemenkeu/DJP, OECD). Always fetch the authentic SVG/PNG from **Wikimedia Commons API (`commons.wikimedia.org/w/api.php`)**, **SimpleIcons**, or official brand repositories, and crop/extract the clean **logomark or official seal** (stripping only tiny multi-word taglines/wordmarks so the graphic mark sits cleanly beside the Motion Canvas `<Txt>` title).
- **Text-Free Transparent Graphics**: Any generated or imported PNG logo/emblem (`<Img>`) **MUST be a 100% text-free, square (`256x256`) graphic mark on a transparent background**.
- **Forbidden Baked Text**: NEVER bake small text, ticker labels (`IDX: BBCA`, `VOO`), subtitles, percentage numbers, or rectangular card borders inside a PNG asset.
- **Crisp Vector Typography**: All text titles, ticker labels, and figures must be rendered as crisp Motion Canvas `<Txt>` nodes beside the `<Img>` icon node.

### Rule 3: Visual Density Cap & 3-Word Labels
- **Max 2 Cards on Screen**: At most **2 cards** may appear on screen simultaneously.
- **Max 3 Lines of Text Per Card**: Each card is strictly limited to:
  1. **Title** (2–3 words, e.g., `IDX: BCA`, `US DIVIDENDS`, `IRISH UCITS`)
  2. **Hero Number / Stat Pill** (e.g., `0.1% FINAL TAX`, `UP TO 35%`, `15% TREATY`)
  3. **Tag / Metric Badge** (2–3 words, e.g., `DOMESTIC EXEMPT`, `ESTATE TAX RISK`, `ZERO US TAX`)
- **Minimum Font Size**: Minimum `36px` font size for any text node on a 1080p canvas.
- **Division of Labor**: Subtitles carry spoken sentences; graphic cards carry only numbers, tickers, and icons. Forbidden: multi-word explanatory footers, bullet-point paragraphs, or full legal citations inside cards.

### Rule 4: Progressive Sub-Element & Asset Staging (2.5s–3.5s Staging Cadence)
- **No Static Stretches (>3.5s Rule)**: To maximize visual retention and prevent cognitive drop-off, the maximum visual gap between new animations, reveals, counter ticks, or badge flips is strictly **<= 3.5s** across all beats. Eliminate all long static stretches (8–16 seconds where cards remain inert).
- **No "Wall of Cards" at `t = 0`**: Never display multiple cards simultaneously at `t = 0`. At scene start, only Focal Element 1 is visible (`opacity = 1.0`). Subsequent cards initialize at `opacity = 0.0`.
- **Intra-Card Progressive Staging Sequence**:
  - `t = 0.0s`: Card 1 frame + logo + title enter (`opacity: 0 -> 1`, `scale: 0.94 -> 1.0`). Tag badge starts hidden (`scale: 0`, `opacity: 0`). Hero metric row & progress bar start hidden (`opacity: 0`).
  - `t = 2.5s–3.5s`: Card 1 Tag Badge pops in (`scale: 0 -> 1.15 -> 1.0`) as narrator names initial entities/players.
  - `t = 5.5s–7.5s`: Card 1 Hero Metric + Progress Bar reveal/animate (`1.0s–1.4s` counter/bar fill) as the core statistic is spoken.
  - `t = 9.5s–11.5s`: Card 1 Tag Badge flips to multiplier/tension rule, AND Card 2 enters early (`opacity: 0 -> 1`, `scale: 0.94 -> 1.0`) with logo + title + initial badge. Card 2 metric and danger bar initialize hidden (`opacity: 0`). Active focal shifts smoothly.
  - `t = 13.0s–16.0s`: Card 2 Hero Metric reveals/ticks + progress/danger bar animates.
  - `t = 16.5s–22.0s`: Card 2 Tag Badge flips to forensic verdict stamp / GAAP citation, with card border highlight or warning pulse.
- **Fast 1.0s–1.8s Counters**: Ban 10–12 second continuous money tickers. Number counters (`tween`) must execute in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure.
- **Intermediate Visual Choreography**: While the narrator explains context before speaking the number, choreograph intermediate visual steps (progressive badge pop, bracket step-up `18% -> 28% -> 40%`, or red warning stamp) so graphics evolve dynamically without dead waits.

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
4. **`[CoT Stage 4: 2-Card Visual Contrast Pair Synthesis]`**:
   - Translate complex findings into side-by-side numeric contrast pairs (`Status Quo / Illusion` vs `Forensic Reality / Optimized Alternative`):
     - *Illusion*: "US ETF VOO gives cheap 0.03% expense ratio."
     - *Forensic Reality*: "30% dividend withholding + 40% US estate tax risk above $60k vs Irish UCITS CSPX at 15% treaty and 0% estate tax."
   - Delivers immediate 2-card comparison data to the Scriptwriter and Animator without wall-of-text explanations.

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
3. **`[CoT Step 3: 3-to-5s Visual State & Micro-Choreography Mapping]`**:
   - Map every 4–8 word spoken clause to a concrete visual state change (card entry, badge flip, 1.0s–1.8s counter, warning stamp).
   - Enforce the 3–5s visual anchor cadence; ban 10–15s expository dead waits.
4. **`[CoT Step 4: Anti-Slop & Oral Cadence Audit]`**:
   - Strip AI cliches (`"Di era digital ini"`, `"Pernahkah Anda berpikir"`, unearned moralizing).
   - Enforce natural breath punctuation (commas, em-dashes `—`, periods) every 4–8 words so Whisper word-level timestamps segment cleanly into `≤4`-word chunks.
5. **`[CoT Step 5: Phonetic & Acronym Engineering]`**:
   - Verify explicit phonetic spelling brackets for all tickers, acronyms, and bilingual terms:
     `[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`, `[VOO|V-O-O]`, `[CSPX|C-S-P-X]`.
   - Embed natural delivery markers: `<breath>`, `<chuckle>`, `<short pause>`.

### Output Contract: Explicit `[VISUAL CUE @ phrase]` in `script.json`
Annotate intermediate sub-cues within each beat linking spoken trigger phrases to exact visual actions:
- `[VISUAL CUE: reveal_card | card_left | "IDX: BCA"]`
- `[VISUAL CUE: flip_badge | badge_tax | "final 0.1%"]`
- `[VISUAL CUE: trigger_counter | counter_drag | "tiga puluh persen" | 1.4s]`
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
```
