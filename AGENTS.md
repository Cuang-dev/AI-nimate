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

## 6. Canonical AI-nimate Production Workflow

All agents building or updating videos in `/home/agent/orca/AI-nimate` must follow this 6-step pipeline (detailed in [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md) and [`HANDOFF.md`](file:///home/agent/orca/AI-nimate/HANDOFF.md)):

1. **Isolated Project Scaffolding**:
   - Create a fresh `vid_YYYYMMDD_NNN` namespace across `motion-canvas/production/vid_YYYYMMDD_NNN/`, `motion-canvas/src/scenes/vid_YYYYMMDD_NNN/`, `motion-canvas/src/projects/vid_YYYYMMDD_NNN/`, and `motion-canvas/public/assets/vid_YYYYMMDD_NNN/`.
2. **Scriptwriting & Layman Accessibility**:
   - Author `script.json` with 5 beats (`beat_01`–`beat_05`). For `Knp?` episodes, explain all financial/technical concepts in plain everyday language (zero unexplained jargon) and write `"kenapa"` in `spoken_text` for TTS.
3. **TTS Synthesis & Word-Level Whisper Alignment**:
   - Synthesize `motion-canvas/public/audio/vid_YYYYMMDD_NNN_narration.wav` and generate sample-accurate word/scene boundaries in `timings.json`.
4. **Scene Engineering (Rules 1–12)**:
   - Implement `beat_01.tsx`–`beat_05.tsx` enforcing:
     - Clean geometric sans headings (`Plus Jakarta Sans`, `fontWeight: 800`) and high-contrast `#334155` secondary labels.
     - Text density cap (`<= 18` `<Txt>` nodes per beat) and zero element overlaps.
     - Strict Left-to-Right (`x`) and Top-to-Bottom (`y`) reveal choreography synced to `waitUntilSceneTime()`.
     - Single sub-chapter top brow badge (`Knp? | <Chapter Name>`) with no multi-pill header clutter.
     - Mandatory X-axis and Y-axis `<Line>` arrows, gridlines, and inside-card labels on all quantitative charts.
5. **Render & 15-Check Automated QA**:
   - Render directly into `projects/<channel>_<date>_<slug>/`:
     `cd motion-canvas && node render.mjs --project=vid_YYYYMMDD_NNN --channel=kausalmedia --slug=<slug> --aspects=9x16`
   - Verify all 15 automated checks and visually inspect extracted end-of-beat keyframes (`qa_frames/`):
     `cd motion-canvas && node scripts/qa_verify.mjs vid_YYYYMMDD_NNN`
6. **Portal Build & Nginx Deployment (`cuang.dev`)**:
   - Rebuild the Discovery Hub (`projects/index.html`) and interactive 5-beat Walkthrough pages (`projects/<dir>/index.html`) and sync to `https://cuang.dev/projects/ainimate/` (protected by HTTP Basic Auth stored in `.env`):
     `npm run deploy`


