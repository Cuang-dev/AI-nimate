# Antigravity Agent Guidelines for AI-nimate

## Terminal Column Detection & Formatting Rules

When running inside CLI/terminal environments (e.g. `antigravity-cli`), all agents MUST adhere to terminal width constraints:

1. **Terminal Column Detection**:
   - Inspect the current terminal columns using `node scripts/terminal-utils.js`, `tput cols`, or `process.stdout.columns`.
   - Default column budget is **80 characters** (safe line budget: $\le 76$ characters).

2. **Flowchart & Diagram Rendering Policy**:
   - **Never emit raw Mermaid code blocks (`flowchart`, `graph`, etc.)** when responding to users in CLI/terminal interfaces. Terminal markdown renderers convert Mermaid blocks using box-drawing character engines that split on ampersands (`&`), choke on subgraphs, and abort midway, dumping mangled lines.
   - Use **terminal-safe UTF-8 linear text pipelines** (`[STEP]`, `│`, `├──►`, `└──►`) or structured Markdown tables.
   - Constrain all text diagrams and tables to a strict maximum width of **76 characters** to guarantee zero wrapping on standard 80-column terminal screens.

3. **Codebase Navigation**:
   - Always provide clickable links using the `file://` scheme for file references.

## 4. Temporal Anchoring & Online Search Recency Rules

All agents must strictly guard against temporal drift and stale parametric data:

1. **Explicit Temporal Anchor Detection**:
   - Always inspect the current system date from runtime metadata (Current Year: 2026).
   - Never assume the world ended in 2024. Today is late 2026.

2. **Strict Web Search Temporal Forcing**:
   - Whenever asked to search online for "latest", "most recent", "state of the art", or current recommendations, search queries MUST explicitly include temporal anchors for the current calendar year and immediately preceding year (`2025`, `2026`).
   - Never search using stale keywords (`2024`) unless performing an explicit historical retrospective.

3. **Release Date Verification Gate**:
   - When recommending open-weights models, software, libraries, or APIs, agents MUST verify and state the release date and month.
   - Prohibit presenting pre-2025 artifacts as "latest" or "new" without disclosing their historical age.

## 5. Project Topic Isolation Rule (Mandatory Default)

Unless explicitly specified by the user, **every project must be treated as a completely separate, independent topic that does not affect any other project**:

1. **Strict Topic & Episode Independence**:
   - Do NOT assume a new video request is a continuation, replacement, or modification of a previous video unless the user explicitly asks to edit or follow up on a specific episode.
   - Each topic has its own standalone narrative, visual assets, script, voiceover, and output directory.

2. **Zero Cross-Project Contamination**:
   - Never overwrite, rename, or mutate existing episodes in:
     - `motion-canvas/production/vid_*`
     - `motion-canvas/src/scenes/vid_*`
     - `motion-canvas/src/projects/vid_*`
     - `motion-canvas/public/assets/vid_*`
     - `motion-canvas/public/audio/vid_*`
     - `projects/<channel_name>_<date>_<project_name>/`
   - Every new project MUST allocate a fresh `vid_YYYYMMDD_NNN` identifier and write its outputs exclusively to its own canonical directory: `projects/<channel_name>_<YYYYMMDD>_<project_slug>/`.

3. **Projects Configuration Registry (`projects/projects_config.json`)**:
   - Always inspect [`projects/projects_config.json`](file:///home/agent/orca/AI-nimate/projects/projects_config.json) before generating scripts, voiceovers, or scenes. It is the authoritative single source of truth for:
     - Voice configurations (`gemini-tts`, `voiceName`, `sampleRateHz`, `leadOffsetSec: 0.22`, `spokenBrandReplacement`).
     - Series presets (`Knp?`, `Forensic Deep-Dive`), editorial prompt templates, and icon vector generation prompts.
     - Brand color palettes, Swiss layout rules, and typography contracts.
   - When scaffolding a new project, register its entry in `projects/projects_config.json`.
   - `render.mjs` and `build_portal.mjs` automatically synchronize the per-project `projects/<dirName>/project_config.json` and display its voice, style, palette, and prompt specifications inside the project's walkthrough portal.

## 6. Production Workflow: Pipeline v2 (default for new episodes)

Pipeline v2 applies from `vid_20261107_001` onward. An episode is data only; one shared engine ([`src/shared/v2/types.ts`](file:///home/agent/orca/AI-nimate/motion-canvas/src/shared/v2/types.ts)) renders it. Contract: [`docs/pipeline_v2_contract.md`](file:///home/agent/orca/AI-nimate/docs/pipeline_v2_contract.md). Reference episode: `motion-canvas/production/vid_20261107_001/`. Scripts live in `motion-canvas/scripts/v2/`. Follow Section 5 (isolation, fresh `vid_YYYYMMDD_NNN`, registry entry) first.

**Run everything with one command** (runbook: [`.agents/skills/episode-pipeline/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/episode-pipeline/SKILL.md)):

- `node motion-canvas/scripts/v2/make_episode.mjs <id> --init --slug=<slug>` registers the episode and creates templates.
- `node motion-canvas/scripts/v2/make_episode.mjs <id>` runs every stage below in order, skips unchanged stages, and on failure prints `=== STOPPED at stage ... ===` with the file to edit and how. Fix only that file and rerun. `--status` for long background runs, `--from=<stage>` to redo.
- Model split: research and script need the strongest model; storyboard (`storyboard-writer` agent) and manifest (`asset-director` agent) are Flash jobs guarded by schema checks; image QA, focal points and the final frame review run inside the scripts on Claude Haiku.

The steps below are what the runner does; run them by hand only to debug one stage.

1. **Research**: dossier with source URLs, plus `production/<id>/numbers.json`. Every figure is sourced (URL) or labelled `estimate`.
2. **Script**: `production/<id>/script.json` with `chapters[].sentences[]`, `[display|spoken]` tokens for numerals and acronyms, optional `pause_after`. Plain Indonesian for laypeople; the banned-jargon list is in the contract. Gate: `node motion-canvas/scripts/v2/lint_episode.mjs <id>`.
3. **Narration**: `.venv/bin/python motion-canvas/scripts/v2/synth_narration.py <id>`. One voice (`gemini-3.8-flash-tts`, `Charon`), single take, no model fallback, on the FREE Audio keys only (`GEMINI_TTS_KEY`, `GEMINI_TTS_KEY_2`; limits 3 RPM / 10K TPM / 10 RPD per key per model, guarded by `scripts/v2/keys.py`). Whisper medium gives timestamps only; subtitles always come from the script. Pacing (min pauses per sentence type, loudness leveling) is automatic; `--repace` re-applies it to an existing take. Then `generate_music.py <id>` (beds from the local royalty-free `music_library/`, no API) and, after the storyboard, `mix_audio.py <id>` (-14 LUFS, ducked music, SFX from storyboard).
4. **Storyboard**: `production/<id>/storyboard.json`; shots with `image` (`full`/`side`), `collapse`/`expand` transitions, 7 explainer types (`stack bars stat compare line flow receipt`). Staging rules: no brows or title pills, focus dimming, no ghost text, notes after chart marks, min 30px. Then `node motion-canvas/scripts/v2/scaffold_project.mjs <id>`.
5. **Images** (`asset-director` agent, [`agent.md`](file:///home/agent/orca/AI-nimate/.agents/agents/asset-director/agent.md)): writes `assets_manifest.json`, runs `.venv/bin/python motion-canvas/scripts/v2/generate_assets.py --id <id>`.
   - Single images on Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`, returns 1376x768), up to 4 attempts, no Pro escalation; recurring character reference sheet. Paid key `GEMINI_IMAGE_KEY` only.
   - Composition: max 4 faces, no crowds, large blank tiles, no mechanical cutaways (diagrams are vector).
   - QA: Claude Haiku on zoomed crops plus a verifier pass (`qa_image.py`; calibrate with `--calibrate`). On failure the director rewrites the prompt. Haiku also marks each image's focal point (`image_focus.json`) so collapsed side cards crop on the subject.
   - Packaging: `publish_options.py <id>` writes 3 title + hook options (option 1 = script title; 2 more from Sonnet, number/jargon-checked); `generate_thumbnail.py <id>` makes `thumbnail_option_1..3.jpg` (one per hook). Every run ends by showing the 3 titles and 3 thumbnails; the user picks, then `upload_youtube.py <id> --title N --thumb N` (private by default).
   - Thumbnail: `generate_thumbnail.py <id>`; `render.mjs` calls it if missing and never fails for lack of one.
6. **Render and QA**:
   - `cd motion-canvas && node render.mjs --project=<id> --channel=kausalmedia --slug=<slug> --aspects=16x9` (hash-based cache; never delete cache by hand).
   - `node scripts/qa_verify.mjs <id> --aspects=16x9`. v2 checks: Timings Manifest, Subtitle = Script, Numbers vs numbers.json, Banned Jargon, Storyboard Structure, Master 16:9 Video, Visual Keyframes, Stage Stillness, Loudness, Asset QA, Thumbnail.
   - `.venv/bin/python motion-canvas/scripts/v2/review_frames.py <id>`: Haiku checks one frame per shot (subject cut off, empty panel, text overflow, subtitle covering content; blank frames by pixel check). Frames in `production/<id>/review_frames/`.
   - Google mirror (account kausalmediayt@gmail.com): stage log in the Sheet "AI-nimate Pipeline Tracker", episode Docs and files in Drive `AI-nimate/Channels/<channel>/<id>_<slug>/` (`scripts/v2/google_workspace.py`); Colab rendering through Drive (`scripts/v2/colab_render.py`). Credentials only in `~/.config/ainimate/`.
   - Deploy (`npm run deploy`) only when the user asks.

### Legacy (v1, episodes before vid_20261107_001)

Only for maintaining old episodes: hand-written `beat_NN.tsx` scenes, `Puck` voice, Rules 1-12 in `Guide.md`, `Chapters`/`Beats` with `full_comic_16x9`/`explainer_2x2` stage modes, and `render.mjs --beats=...` with manual `.cache` deletion. The 2x2 grid batching (`nano_banana_batch_grid.py`) is legacy: each panel got only ~688x384 pixels, causing blobby faces and tiles.
