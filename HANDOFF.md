# Active Agent Handoff Pointer (`AI-nimate`)

> **CRITICAL RULE — PROJECT TOPIC ISOLATION (MANDATORY DEFAULT)**:
> - **Unless explicitly specified by the user, treat every project/video request as a completely separate, independent topic that does NOT affect any other project.**
> - Never overwrite, rename, or mutate existing episodes (`motion-canvas/production/vid_*`, `motion-canvas/src/scenes/vid_*`, `motion-canvas/src/projects/vid_*`, `motion-canvas/public/assets/vid_*`, or `projects/<channel_name>_<date>_<project_name>/`).
> - Every new project allocates a fresh `vid_YYYYMMDD_NNN` ID and writes its outputs exclusively to its own canonical directory: `/home/agent/orca/AI-nimate/projects/<channel_name>_<YYYYMMDD>_<project_slug>/`.

---

## Current Operational Handoffs & Guides

0. **Pipeline v2 (default for new episodes, from `vid_20261107_001`)**: contract [`docs/pipeline_v2_contract.md`](file:///home/agent/orca/AI-nimate/docs/pipeline_v2_contract.md); steps in [`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md) Section 6 and [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md) Section 0; reference episode `motion-canvas/production/vid_20261107_001/`. Everything below marked v1 is legacy, kept to maintain old episodes.

1. (legacy v1) **[`HANDOFF_2026-11-07_chapters_beats_comic_2x2_workflow.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-11-07_chapters_beats_comic_2x2_workflow.md)** — **v1 MASTER HANDOFF (Nov 7, 2026)**:
   - **Canonical `Chapters` vs `Beats` Architecture**: `Chapters` (`chapters[]` in `script.json`, `beat_01.tsx`–`beat_NN.tsx`) are macro sub-chapters with organic dynamic counts; `Beats` (`beats[]`) are sentence/clause-level visual cues (`waitUntilSceneTime()`) triggered within `±0.3s` of spoken words.
   - **Profitability Paradox Hook (`<3.5s` Anomaly + Rapid Hook Beats)**: Business breakdowns open by contrasting the tiny unit customer price against massive setup CapEx and questioning how it generates massive monthly revenue, using 10–14 rapid clause-level visual Beats in Chapter 1.
   - **Dual Stage Modes (`Option 1: full_comic_16x9` vs `Option 2: explainer_2x2`)**:
     - `Option 1 ("full_comic_16x9")`: Full-screen widescreen `16:9` (`1280x720`) 2D Indonesian comic panels for narrative Chapters.
     - `Option 2 ("explainer_2x2")`: Square `1:1` (`512x512`) 2D Indonesian comic panels paired with quantitative explainer charts/tables.
   - **Flat 2D Indonesian Comic Art Style & Nano Banana 2 Lite Batching (`nano_banana_batch_grid.py`)**: Uses `models/gemini-3.1-flash-image-preview` via `:batchGenerateContent` to generate 2x2 grids grouped by aspect ratio (`"16:9"` and `"1:1"`), slice panels, run vision QA, and re-batch failed panels into a new 2x2 grid until `all_passed: true`.
   - **Natural Jakarta Indonesian Voiceover (`Puck` + `tts_style_prompt`)**: Conversational Indonesian creator prosody with zero robotic newsreader cadence and Python 3.14 `ffmpeg` float32 `faster-whisper` alignment.
   - **Outer Card `<Rect>` Non-Flex Rule & Cache-Aware Re-Rendering**: Never put `layout` on outer card `<Rect>` containers holding stacked `<Img>` panels or coordinate-positioned charts; delete `.cache/<project_id>/<aspect>/<beat>.mp4` before incremental `--beats=...` re-renders.

2. **[`HANDOFF_2026-11-02_clean_projects_workflow_and_portal_v2.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-11-02_clean_projects_workflow_and_portal_v2.md)** — **PORTAL V2 & REGISTRY HANDOFF (Nov 2, 2026)**:
   - Covers `projects/projects_config.json`, purified `projects/<channel>_<date>_<project_name>/` layout, and `cuang.dev` Nginx HTTP Basic Auth deployment.

3. **[`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md)** — **Master Production & Orchestrator Guide**:
   - Section 0A: Project Topic Isolation Rule.
   - Section 0B: `/flash-orchestrator` Subagent Architecture (`Model: "flash"`), including `deep-researcher`, `thinking-scriptwriter`, `nano-banana-asset-generator`, and `flash-coder`.
   - Section 1: Visual Hierarchy & Typography Rules 1–12 (`Plus Jakarta Sans` 800 headings, Flat 2D Indonesian Comic Style, Dual Stage Modes, `Chapters` vs `Beats`, Outer Card `<Rect>` Non-Flex Rule, single top brow badge, mandatory X/Y chart axes).
   - Sections 2–6: Research CoT, Scriptwriting CoT, TTS/Whisper alignment, `render.mjs` + `qa_verify.mjs`, and `build_portal.mjs` + `deploy_portal.sh`.

4. **[`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md)** — **Antigravity Agent Rules (Auto-Loaded)**:
   - Terminal width budget (`<= 76` chars), raw Mermaid CLI ban, 2025–2026 temporal anchoring, **Section 5: Project Topic Isolation Rule**, and **Section 6: Canonical AI-nimate Production Workflow**.

---

## Canonical Published Projects (`/home/agent/orca/AI-nimate/projects/`)

| Canonical Directory (`projects/<channel>_<date>_<project_name>/`) | ID | Series | Aspects |
| :--- | :--- | :--- | :---: |
| `kausalmedia_20261102_pov-buka-sewa-meja-mahjong/` | `vid_20261102_001` | `POV:` | `16:9` |
| `kausalmedia_20261031_knp-saham-teknologi-runtuh/` | `vid_20261031_002` | `Knp?` | `9:16` |
| `kausalmedia_20261031_knp-bursa-kita-terancam-diboikot-dunia/` | `vid_20261031_001` | `Knp?` | `9:16,16:9` |
| `kausalmedia_20261029_the-ai-bubble-explained/` | `vid_20261029_002` | `Forensic` | `16:9` |
| `kausalmedia_20261024_offshore-investing-tax-traps-indonesia/` | `vid_20261024_001` | `Forensic` | `16:9` |
| `kausalmedia_20261021_humane-ai-pin-hardware-collapse/` | `vid_20261021_001` | `Forensic` | `9:16` |
| `kausalmedia_20261015_anatomi-saham-gorengan-di-bei/` | `vid_20261015_001` | `Forensic` | `16:9` |

---

## Quick Reference Commands (v2)

```bash
cd /home/agent/orca/AI-nimate
node motion-canvas/scripts/v2/lint_episode.mjs <id>
.venv/bin/python motion-canvas/scripts/v2/synth_narration.py <id>
.venv/bin/python motion-canvas/scripts/v2/generate_music.py <id>
.venv/bin/python motion-canvas/scripts/v2/mix_audio.py <id>      # after storyboard
node motion-canvas/scripts/v2/scaffold_project.mjs <id>
.venv/bin/python motion-canvas/scripts/v2/generate_assets.py --id <id>
cd motion-canvas && npx tsc --noEmit
node render.mjs --project=<id> --channel=kausalmedia --slug=<slug> --aspects=16x9
node scripts/qa_verify.mjs <id> --aspects=16x9
cd .. && npm run deploy                                         # only when asked
```

Legacy v1: `scripts/nano_banana_batch_grid.py` (2x2 grids, ~688x384 px per panel, blobby faces) and manual `.cache` deletion before `--beats=` re-renders.
