# Active Agent Handoff Pointer

> **Current Operational Handoffs**:
> 1. [HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md) (Diagram-First Motion Canvas Workflow, Installed Skills Guide & Dual-Aspect Production `vid_20261029_002`)
> 2. [HANDOFF_2026-10-29_multi_agent_standards_and_cadence_upgrade.md](#multi-agent-production-standards-upgrade-october-2026) (Multi-Agent Production Standards, TTS/Whisper Alignment & Motion Hierarchy)
> 3. [HANDOFF_2026-10-12_fast_paced_visual_cadence_and_artist_batching.md](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-12_fast_paced_visual_cadence_and_artist_batching.md) (Fast-Paced Visual Cadence & Artist Sub-Agent Batching)
> 4. [HANDOFF_2026-10-12_discord_migration_granular_logs_and_production_stability.md](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-12_discord_migration_granular_logs_and_production_stability.md) (Discord Migration, Granular Logging & Production Stability)
> 5. [HANDOFF_2026-10-05_unified_discord_bot_reefblast_integration.md](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-05_unified_discord_bot_reefblast_integration.md) (Unified Discord Bot & Reefblast Fleet Telemetry)
> 6. [HANDOFF_2026-10-02_nano_banana_root_cause_and_authentic_asset_pipeline.md](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-02_nano_banana_root_cause_and_authentic_asset_pipeline.md) (Asset Pipeline & 5M Video Render)

---

## Diagram-First Motion Canvas Workflow & Installed Skills (October 30, 2026)

For the complete operational guide on how to use the 5-stage multi-agent workflow (`deep-researcher` -> `thinking-scriptwriter` -> Whisper `timings.ts` -> Diagram-First `<Camera>` scenes -> `render_vid002_dual.mjs`), the 5 globally installed skills (`motion-canvas`, `diagram-design`, `animation-basics`, `animation-vocabulary`, `explainer-engaging`), and the Strict Hold-Time Guard (`>= 2.5s`), read:
- [`docs/handoffs/HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md)

---

## Multi-Agent Production Standards Upgrade (October 2026)

### 1. 2026 Bilingual Voice Cloning & TTS Stack
For production-grade bilingual (Indonesian + English) voice synthesis:
- **Self-Hosted Open-Weights**:
  - **VoxCPM2 (`OpenBMB/VoxCPM2`, June 2026)**: 48kHz native bilingual EN/ID foundation model with zero-shot cloning, authentic local cadence, and low latency.
  - **Qwen3-TTS (`Qwen/Qwen3-TTS-1.7B`, Jan 2026)**: Fast neural synthesis with conversational prosody.
  - **IndexTTS2 (June 2025)**: Explicit duration-controlled neural alignment.
- **Cloud API**:
  - **ElevenLabs (`Eleven v4` Sept 2026 / `Eleven v3` March 2026 PVC/IVC)**: Benchmark voice cloning fidelity.

### 2. Whisper Post-Processing & Scene-Bounded Chunking Contract
- **Domain Normalization Dictionary**: Run all Whisper transcript outputs through a normalization dictionary before timing generation:
  - `Peluang` -> `Pluang`
  - `SNP` / `S and P` -> `S&P`
  - `state tax` -> `estate tax`
  - `BCA` / `BBCA` -> `BBCA`
- **Chunking Rules**:
  - Max **4 words** and max **25 characters** per subtitle chunk.
  - Break immediately on sentence punctuation (`,`, `.`, `?`, `!`, `—`).
- **Strict Scene Boundary Clamping**:
  - Every chunk's `start` and `end` timestamp MUST be strictly contained within its parent scene beat:
    `scene.startTime <= chunk.start < chunk.end <= scene.endTime`
  - **Zero cross-beat subtitle bleeding**.
- **Acoustic Lead Compensation (`LEAD_OFFSET = 0.22`)**:
  - Advance word highlighting by `+220ms` (`t = time + 0.22`) to fire precisely on consonant onset.
  - Word pill slots must maintain constant geometry (`padding={[6, 10]}`, `scale={1.0}`, `radius={8}`) so text never shifts horizontally when highlighted.
  - Lower-third clearance below `y = 655`.

### 3. Visual Scene Director & Motion Canvas Hierarchy
- **Authentic Wikimedia Commons / Official Vector Logo Rule**: NEVER draw synthetic geometric stand-in logos with Python/PIL/Canvas or hallucinate brand marks with AI image generators when referencing real companies, stock exchanges, financial products, or government bodies (e.g., IDX, BCA, Interactive Brokers, IRS, EU/Ireland UCITS, Kemenkeu/DJP, OECD). Always fetch authentic SVGs/PNGs from **Wikimedia Commons API (`commons.wikimedia.org/w/api.php`)**, **SimpleIcons**, or official brand repositories, and crop/extract the clean **logomark or official seal** (stripping only tiny multi-word taglines/wordmarks so the graphic mark sits cleanly beside the Motion Canvas `<Txt>` title).
- **Strict Icon-Only Logo Rule**: Any generated or imported PNG logo/emblem (`<Img>`) MUST be a **100% text-free, square (`256x256`) graphic mark on a transparent background**. Never bake small text, ticker labels (`IDX: BCA`, `VOO`), subtitles, or rectangular card borders inside a PNG asset. All text titles and figures are rendered as crisp Motion Canvas `<Txt>` nodes beside the `<Img>` icon.
- **Visual Density Cap**: Maximum **2 cards** on screen simultaneously; maximum **3 lines of text** per card (`Title`, `Hero Number`, `2–3 word Tag`); minimum `36px` font size. Subtitles carry spoken sentences; graphic cards carry only numbers, tickers, and icons.
- **Single Slowed Focal Wobble**: Only the active focal element (`focalId() === id`) receives a gentle, slowed breathing pulse (`focalScale` at `0.55 rad/s` breath of `±1.5%`, `focalRotation` at `0.45 rad/s` rotation tilt of `±0.4°`). Inactive elements remain 100% stationary (`scale(1.0)`, `rotation(0)`), dimmed to `opacity: 0.22`. Zero global camera wobble on outer stage.
- **Phrase-Locked Micro-Choreography & Fast Counters**: Ban 10–12 second continuous money tickers. Number counters (`tween`) must execute in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure. Intermediate visual steps (card entry, category badge pop, bracket step-up `18% -> 28% -> 40%`, status stamp) are choreographed during preceding explanation.

### 4. Forensic Research & Scriptwriting Cadence (Chain-of-Thought Architecture)
- **Model Specification**: Operates on **`Model: "flash"`**. Analytical and narrative depth is strictly derived from mandatory multi-stage Chain-of-Thought reasoning protocols, preventing shallow shortcuts.
- **Deep Research (`deep-researcher` / `SubAgent_Scout`, Model: "flash")**:
  - Writes `production/<video_id>/research_dossier.md` executing an explicit **4-Stage CoT Protocol**:
    1. `[CoT Stage 1: Deconstruct the Mainstream Narrative]`: Expose accounting loopholes and structural blind spots.
    2. `[CoT Stage 2: Forensic Primary-Source & Unit-Economics Teardown (2025-2026)]`: 10-K filings, statutory rules (`UU HPP No. 7/2021`, `PMK 18/2021`, `US IRC §2101`), verified tickers (`BBCA.JK`, `VOO`, `CSPX`), balance-sheet mechanics.
    3. `[CoT Stage 3: Steelman Counter-Thesis & Failure Mode Analysis]`: Mathematical steelman of opposing thesis and break-even points.
    4. `[CoT Stage 4: 2-Card Visual Contrast Pair Synthesis]`: Side-by-side numeric contrast pairs (`Status Quo / Illusion` vs `Forensic Reality / Optimized Alternative`).
- **Thinking Scriptwriting (`thinking-scriptwriter` / `SubAgent_Writer`, Model: "flash")**:
  - Reads `research_dossier.md` and writes `production/<video_id>/script_cot.md` executing an explicit **5-Stage CoT Protocol**:
    1. `[CoT Step 1: Pattern-Interrupt Hook Selection]`: Draft 3 candidate hooks challenging viewer assumptions in <3.5s, selecting the sharpest opening.
    2. `[CoT Step 2: 'Therefore / However' Causal Spine]`: Connect every beat via causal tension questions; ban "and then" listicles.
    3. `[CoT Step 3: 3-to-5s Visual State & Micro-Choreography Mapping]`: Map every 4–8 word clause to a concrete card entry, badge flip, 1.0s–1.8s counter, or warning stamp (3–5s visual anchor cadence; ban 10–15s expository lulls).
    4. `[CoT Step 4: Anti-Slop & Oral Cadence Audit]`: Strip AI cliches (`"Di era modern ini"`, `"Pernahkah Anda berpikir"`), enforce breath punctuation every 4–8 words for <=4-word Whisper chunks.
    5. `[CoT Step 5: Phonetic & Acronym Engineering]`: Phonetic syntax engineering (`[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`); embed vocal delivery markers (`<breath>`, `<short pause>`). Outputs `script.json` with explicit `[VISUAL CUE @ phrase]` annotations.

---

## Previous Milestones Reference

- **Task**: Root Cause Investigation of Asset Generation, Native Nano Banana (`generate_image`) Tool Forensics, and Authentic Pipeline Integration.
- **Project**: [`projects/rights-issue-5m/`](file:///home/agent/orca/AI-nimate/projects/rights-issue-5m/)
- **Key Milestones Achieved**:
  1. Identified exact root causes of fake "CSS-like" assets: offline Sharp SVG generation in `generate-rights-issue-assets.js` and pipeline cache bypass.
  2. Generated authentic editorial comic assets using native Antigravity `generate_image`: BEI Trading Hall and POJK Regulation Dossier.
  3. Discovered and documented Google Cloud quota exhaustion (`gemini-3.1-flash-image`, HTTP 429) explaining previous offline fallback behavior.
  4. Deprecated and locked `generate-rights-issue-assets.js` with an explicit execution barrier.
  5. Updated 5-minute storyboard to eliminate all SVG mockups and render with 100% authentic Nano Banana and character assets.
  6. Replaced bounding boxes with true transparent alpha PNGs and multiplied blending.
  7. Captured 650 neural word-boundary timestamps from EdgeTTS for sample-accurate subtitle sync.
  8. Rendered final video: [`projects/rights-issue-5m/render/rights-issue-5m.mp4`](file:///home/agent/orca/AI-nimate/projects/rights-issue-5m/render/rights-issue-5m.mp4) (04:22, 22.17 MB).
  9. Successfully delivered video to Telegram (Message ID: 122).

---

For complete technical details, environment specs, test evidence, and incoming checklist, refer to the full handoff document at:
[`docs/handoffs/HANDOFF_2026-10-02_nano_banana_root_cause_and_authentic_asset_pipeline.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-02_nano_banana_root_cause_and_authentic_asset_pipeline.md)
