# Master Agent Handoff: Clean `projects/` Workflow, Topic Isolation, Portal v2 & Admin Gate (`2026-11-02`)

## 1. Executive Summary & Core Invariants

1. **Mandatory Project Topic Isolation Rule (Default Behavior)**:
   - **Unless explicitly specified by the user, treat every project/video request as a completely separate, standalone topic that does NOT affect, modify, or overwrite any other project.**
   - Never mutate or rename existing episodes (`motion-canvas/production/vid_*`, `motion-canvas/src/scenes/vid_*`, `motion-canvas/src/projects/vid_*`, `motion-canvas/public/assets/vid_*`, `motion-canvas/public/audio/vid_*`, or `projects/<channel>_<date>_<project_name>/`).
   - Every new video receives a fresh `vid_YYYYMMDD_NNN` production ID and outputs exclusively to its own canonical directory: `/home/agent/orca/AI-nimate/projects/<channel_name>_<YYYYMMDD>_<project_slug>/`.

2. **Purified Repository & Output Structure**:
   - All legacy frameworks (`remotion/`, `styknimate/`, `manim/`), abandoned drafts (`vid_20261031_001_long`), duplicate `public/` trees, and `motion-canvas/output/` intermediate caches have been wiped (+2.0 GB recovered).
   - `/home/agent/orca/AI-nimate/projects/` is the single canonical output directory containing ONLY:
     - `index.html` (Discovery Hub UI)
     - `projects_config.json` (Authoritative master configuration & series/channel/project registry)
     - `manifest.json` (Enriched project & beat metadata)
     - `<channel_name>_<date>_<project_name>/` directories (each with standalone `project_config.json`, zero loose symlinks):
       - `kausalmedia_20261015_anatomi-saham-gorengan-di-bei/`
       - `kausalmedia_20261021_humane-ai-pin-hardware-collapse/`
       - `kausalmedia_20261024_offshore-investing-tax-traps-indonesia/`
       - `kausalmedia_20261029_the-ai-bubble-explained/`
       - `kausalmedia_20261031_knp-bursa-kita-terancam-diboikot-dunia/`
       - `kausalmedia_20261031_knp-saham-teknologi-runtuh/`

3. **Master Configuration Registry (`projects/projects_config.json`) & Per-Project Configs**:
   - Authoritative registry defining:
     - Series presets: `Knp?` (layman tone, Gemini TTS `Kore`/`Charon`, `leadOffsetSec: 0.22`, brand replacements) and `Forensic Deep-Dive` (10-K unit-economics tone, `Instrument Serif` / `Plus Jakarta Sans`, high-contrast Swiss palette).
     - Channels: `kausalmedia` and `linkedin`.
     - 6 Canonical project configurations containing full voice parameters, visual style palettes, prompt summaries, and beat archetypes.
   - `build_portal.mjs` and `render.mjs` automatically write `projects/<dirName>/project_config.json` and display the **Voice, Style, Palette & Prompts Configuration** inside the "Production Spec & JSON" tab of each project's walkthrough portal.

4. **Portal Discovery Hub & Interactive 5-Beat Walkthrough (`build_portal.mjs`)**:
   - [`motion-canvas/scripts/build_portal.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/build_portal.mjs) automatically builds [`projects/index.html`](file:///home/agent/orca/AI-nimate/projects/index.html) (featured hero, transcript search with `/`, filter pills, 5-beat hover keyframe scrubber) and each project's `index.html` & `embed.html` (adaptive `9:16`/`16:9` cinema stage, "Loop Beat" toggle, segmented 5-beat timeline bar, live-synced beat transcript cards, and QA keyframe lightbox).

4. **Nginx Proxy & HTTP Basic Auth Admin Gate (`cuang.dev`)**:
   - Deployed via `npm run deploy` ([`motion-canvas/scripts/deploy_portal.sh`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/deploy_portal.sh)) to `docker-host` (`projects-cuang-nginx`, `https://cuang.dev/projects/ainimate/`).
   - Protected across `/projects/ainimate/` and all sub-URLs by HTTP Basic Auth (`auth_basic "AI-nimate Admin"`). Credentials (`AINIMATE_ADMIN_USER`, `AINIMATE_ADMIN_PASS`) are stored in `/home/agent/orca/AI-nimate/.env`.
   - Legacy URLs (`/projects/ainimate/kausalmedia/<slug>`, `/projects/ainimate/vid_*`) redirect (`301`) via Nginx rewrite rules in `/etc/nginx/conf.d/default.conf` on `docker-host`.

---

## 2. Step-by-Step Production Workflow for a New Independent Project

When the user asks for a new video on a topic, follow these 6 steps without touching any existing project:

### Step 1: Inspect Registry, Allocate Fresh ID & Scaffold Directories
Inspect [`projects/projects_config.json`](file:///home/agent/orca/AI-nimate/projects/projects_config.json) for series presets (`Knp?`, `Forensic Deep-Dive`), channel rules, and voice configs. Choose the next available `vid_YYYYMMDD_NNN` ID (using today's date `YYYYMMDD` and sequence `001`, `002`, ...) and canonical folder name `<channel_name>_<YYYYMMDD>_<project_slug>`:
- Register the new project definition under `projects.<channel>_<YYYYMMDD>_<slug>` in [`projects/projects_config.json`](file:///home/agent/orca/AI-nimate/projects/projects_config.json).
- `motion-canvas/production/vid_YYYYMMDD_NNN/` (`script.json`, `timings.json`, `synthesize_vid_YYYYMMDD_NNN.py`)
- `motion-canvas/public/assets/vid_YYYYMMDD_NNN/` (transparent `256x256` graphic icons, zero baked text)
- `motion-canvas/public/audio/vid_YYYYMMDD_NNN_narration.wav`
- `motion-canvas/src/scenes/vid_YYYYMMDD_NNN/` (`layout.tsx`, `timings.ts`, `beat_01.tsx`..`beat_05.tsx`)
- `motion-canvas/src/projects/vid_YYYYMMDD_NNN/` (`vid_YYYYMMDD_NNN_beat1.ts`..`beat5.ts`, plus `_9x16.ts` variants)

### Step 2: Author `script.json` (Layman Accessibility & Anti-Slop)
- Follow [`Guide.md` Section 3](file:///home/agent/orca/AI-nimate/Guide.md):
  - 5 causal beats (`beat_01`–`beat_05`).
  - For `Knp?` episodes, assume the viewer is a layman/non-investor: translate all financial/market terms into everyday analogies and write `"kenapa"` (never `"K-N-P"`) in `spoken_text`.

### Step 3: Synthesize TTS Audio & Extract Whisper Word Timings
- Generate `motion-canvas/public/audio/vid_YYYYMMDD_NNN_narration.wav`.
- Extract word-level timestamps into `motion-canvas/production/vid_YYYYMMDD_NNN/timings.json` (clamping subtitle chunks to `<= 4` words, `<= 25` chars, and strict scene boundaries).

### Step 4: Implement Beats 01–05 (`src/scenes/vid_YYYYMMDD_NNN/`)
Enforce all 12 Visual & Typography Rules in [`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md):
- **Rule 1 & 1B**: Stillness by default (`focalScale` only on active element); wrap diagrams in `<Node>` directly under `view` (never bare `<Camera>`).
- **Rule 2**: Transparent `256x256` icon-only PNGs/SVGs with zero baked text.
- **Rule 3**: Use the 5 distinct spatial diagram archetypes (`Scale Chasm`, `Closed-Loop Conduit`, `Parallel Timeline + Wall`, `Quantitative Slope`, `3-Tier Layer Stack`).
- **Rule 4 & 5**: Trigger reveals within `±0.3s` of spoken words in `timings.json`; finish animations `>= 2.7s` before `beat.end`; keep lower-third (`y > 655`) uncontested for stationary subtitles (`LEAD_OFFSET = 0.22`).
- **Rule 6 & 7**: Import `getTypo(wide)` and `getAssets(wide)` from `src/shared/screenCalibration.ts`; enforce Phone Font Floor (`>= 20px` in 9:16) and perpendicular (`90°`) box-edge arrow entry.
- **Rule 8, 9 & 10**: Use `Plus Jakarta Sans` (`fontWeight: 800`) headings (never `Instrument Serif`), cap `<Txt>` nodes at `<= 18` per beat, prevent any overlaps, and reveal elements strictly Left-to-Right (`x`) and Top-to-Bottom (`y`).
- **Rule 11 & 12**: Render a single top brow badge (`Knp? | <Chapter Name>`) at `y = wide ? -475 : -820`, and include mandatory X-axis and Y-axis `<Line>` arrows + gridlines on all quantitative graphs.

### Step 5: Render & Run 15-Check Automated QA
```bash
cd /home/agent/orca/AI-nimate/motion-canvas

# Typecheck
npx tsc --noEmit

# Render directly to ../projects/<channel>_<date>_<slug>/
node render.mjs --project=vid_YYYYMMDD_NNN --channel=kausalmedia --slug=<project-slug> --aspects=9x16

# Run 15-check automated QA verifier
node scripts/qa_verify.mjs vid_YYYYMMDD_NNN
```
Then visually inspect all extracted end-of-beat keyframes in `projects/<channel>_<date>_<slug>/qa_frames/` using `read_file`.

### Step 6: Build Portal & Deploy to `cuang.dev`
```bash
cd /home/agent/orca/AI-nimate
npm run deploy
```
Verify live HTTP status with:
```bash
source /home/agent/orca/AI-nimate/.env
curl -s -o /dev/null -w "%{http_code}\n" -u "$AINIMATE_ADMIN_USER:$AINIMATE_ADMIN_PASS" "https://cuang.dev/projects/ainimate/"
```
