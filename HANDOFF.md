# Active Agent Handoff Pointer (`AI-nimate`)

> **CRITICAL RULE — PROJECT TOPIC ISOLATION (MANDATORY DEFAULT)**:
> - **Unless explicitly specified by the user, treat every project/video request as a completely separate, independent topic that does NOT affect any other project.**
> - Never overwrite, rename, or mutate existing episodes (`motion-canvas/production/vid_*`, `motion-canvas/src/scenes/vid_*`, `motion-canvas/src/projects/vid_*`, `motion-canvas/public/assets/vid_*`, or `projects/<channel_name>_<date>_<project_name>/`).
> - Every new project allocates a fresh `vid_YYYYMMDD_NNN` ID and writes its outputs exclusively to its own canonical directory: `/home/agent/orca/AI-nimate/projects/<channel_name>_<YYYYMMDD>_<project_slug>/`.

---

## Current Operational Handoffs & Guides

1. **[`HANDOFF_2026-11-02_clean_projects_workflow_and_portal_v2.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-11-02_clean_projects_workflow_and_portal_v2.md)** — **PRIMARY MASTER HANDOFF (Nov 2, 2026)**:
   - **Project Topic Isolation Rule**: Strict episode independence by default; zero cross-project mutation.
   - **Purified Repo & Canonical `projects/<channel>_<date>_<project_name>/` Output Layout**: Wiped unused frameworks (`remotion/`, `styknimate/`, `manim/`) and intermediate caches (+2.0 GB freed); consolidated all 6 published episodes into `projects/<channel_name>_<date>_<project_name>/` with zero loose symlinks.
   - **6-Step Production Pipeline**: From isolated `vid_YYYYMMDD_NNN` scaffolding -> layman scriptwriting (`Knp?`) -> TTS & Whisper `timings.json` -> Scene Engineering (Rules 1–12) -> Direct rendering (`render.mjs`) & 15-check QA (`qa_verify.mjs`) -> Portal build (`build_portal.mjs`) & deployment (`deploy_portal.sh` / `npm run deploy`).
   - **Portal v2 & Nginx Admin Gate (`cuang.dev`)**: Upgraded Discovery Hub (`projects/index.html`) + 5-Beat Interactive Walkthrough (`projects/<dir>/index.html`), gated across `https://cuang.dev/projects/ainimate/` and all sub-URLs via Nginx HTTP Basic Auth (credentials in [`.env`](file:///home/agent/orca/AI-nimate/.env)).

2. **[`HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md)** — **HISTORICAL ARCHITECTURE HANDOFF**:
   - Covers `/flash-orchestrator` subagent contracts, Rule 1B `<Camera>` bbox fix, Rule 6 physical screen calibration (`src/shared/screenCalibration.ts`), and sample-accurate acoustic-to-visual word sync (`±0.3s`).

3. **[`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md)** — **Master Production & Orchestrator Guide**:
   - Section 0A: Project Topic Isolation Rule.
   - Section 0B: `/flash-orchestrator` Subagent Architecture (`Model: "flash"`).
   - Section 1: Visual Hierarchy & Typography Rules 1–12 (`Plus Jakarta Sans` 800 headings, `<= 18` `<Txt>` density cap, L-to-R / T-to-B reveal order, single `Knp? | <Chapter Name>` top brow, mandatory X/Y chart axes + gridlines).
   - Sections 2–6: Research CoT, Scriptwriting CoT, TTS/Whisper alignment, `render.mjs` + `qa_verify.mjs`, and `build_portal.mjs` + `deploy_portal.sh`.

4. **[`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md)** — **Antigravity Agent Rules (Auto-Loaded)**:
   - Terminal width budget (`<= 76` chars), raw Mermaid CLI ban, 2025–2026 temporal anchoring, **Section 5: Project Topic Isolation Rule**, and **Section 6: Canonical AI-nimate Production Workflow**.

---

## Canonical Published Projects (`/home/agent/orca/AI-nimate/projects/`)

| Canonical Directory (`projects/<channel>_<date>_<project_name>/`) | ID | Series | Aspects |
| :--- | :--- | :--- | :---: |
| `kausalmedia_20261031_knp-saham-teknologi-runtuh/` | `vid_20261031_002` | `Knp?` | `9:16` |
| `kausalmedia_20261031_knp-bursa-kita-terancam-diboikot-dunia/` | `vid_20261031_001` | `Knp?` | `9:16,16:9` |
| `kausalmedia_20261029_the-ai-bubble-explained/` | `vid_20261029_002` | `Forensic` | `16:9` |
| `kausalmedia_20261024_offshore-investing-tax-traps-indonesia/` | `vid_20261024_001` | `Forensic` | `16:9` |
| `kausalmedia_20261021_humane-ai-pin-hardware-collapse/` | `vid_20261021_001` | `Forensic` | `9:16` |
| `kausalmedia_20261015_anatomi-saham-gorengan-di-bei/` | `vid_20261015_001` | `Forensic` | `16:9` |

---

## Quick Reference Commands

```bash
# 1. Typecheck scenes
cd /home/agent/orca/AI-nimate/motion-canvas && npx tsc --noEmit

# 2. Render a project directly into ../projects/<channel>_<date>_<slug>/
node render.mjs --project=vid_YYYYMMDD_NNN --channel=kausalmedia --slug=<slug> --aspects=9x16

# 3. Run 15-check automated QA verifier
node scripts/qa_verify.mjs vid_YYYYMMDD_NNN

# 4. Rebuild portal UI & deploy to https://cuang.dev/projects/ainimate/
cd /home/agent/orca/AI-nimate && npm run deploy
```
