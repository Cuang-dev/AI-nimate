# Active Agent Handoff Pointer (`AI-nimate`)

> **Workspace Consolidation Notice (October 30, 2026)**:
> - The previous `AI-Animation-Workflows` repository has been promoted to become the main **[`/home/agent/orca/AI-nimate`](file:///home/agent/orca/AI-nimate)** workspace (with a symlink at `/home/agent/orca/AI-Animation-Workflows -> /home/agent/orca/AI-nimate` for backward compatibility).
> - The older legacy repository is archived at **[`/home/agent/orca/AI-nimate-legacy`](file:///home/agent/orca/AI-nimate-legacy)**.

---

## Current Operational Handoffs & Guides

1. **[`HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md`](file:///home/agent/orca/AI-nimate/docs/handoffs/HANDOFF_2026-10-30_diagram_storytelling_and_skills_workflow.md)** — **PRIMARY MASTER HANDOFF**:
   Complete production reference covering:
   - **`/flash-orchestrator` Skill & Subagent Pool**: Token-shielding frontier orchestrator ([`.agents/skills/flash-orchestrator/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/SKILL.md), [`WORKER-TEMPLATES.md`](file:///home/agent/orca/AI-nimate/.agents/skills/flash-orchestrator/WORKER-TEMPLATES.md)) powering [`deep-researcher`](file:///home/agent/orca/AI-nimate/.agents/agents/deep-researcher/agent.md), [`thinking-scriptwriter`](file:///home/agent/orca/AI-nimate/.agents/agents/thinking-scriptwriter/agent.md), and [`flash-coder`](file:///home/agent/orca/AI-nimate/.agents/agents/flash-coder/agent.md) on `Model: "flash"`.
   - **Rule 1B Root Cause & Permanent Fix**: Top-left quadrant slicing bug at `t = 85.0s` caused by bare `<Camera>` internal `this.scene = new Node({})` losing `View2D`'s center-origin matrix; mandatory invariant is wrapping diagrams in `<Node ref={camera}>` directly under `view` (or `<Camera.Stage>`).
   - **Sample-Accurate Acoustic-to-Visual Word Sync (`±0.3s`)**: Spoken word alignment in `timings.json`, `≤2.5s` visual micro-cadence, single active element `focalScale` breathing, and visual cue lookup tables (`print_visual_cue_lookup_table`).
   - **Render Pipeline Speedup & Automated QA Gate**: Single Chromium browser reuse per aspect pass, DOM `#render` readiness wait, 300ms file stability polling, and [`scripts/qa_verify.mjs`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs) automated test gate.
   - **Web Portal Showcase**: Interactive dual-aspect (`16:9 + 9:16`) video player and gallery featuring all 4 Kausal Media releases.

2. **[`Guide.md`](file:///home/agent/orca/AI-nimate/Guide.md)** — Master Production & Orchestrator Guide:
   - Rules 1–5: `focalScale` stillness by default, Rule 1B camera cacheBBox invariant, authentic Wikimedia vector marks, 5 distinct diagram archetypes, sample-accurate `±0.3s` triggers, and symmetrical subtitle pill margins.

3. **[`AGENTS.md`](file:///home/agent/orca/AI-nimate/AGENTS.md)** — Antigravity Agent Guidelines:
   - Strict `≤76` character terminal width budget, raw Mermaid CLI block ban, and 2025–2026 temporal anchoring.

---

## Verification & Quick Start
```bash
# Verify subtitle invariants, camera architecture, and video streams
node /home/agent/orca/AI-nimate/motion-canvas/scripts/qa_verify.mjs vid_20261029_002

# Check handoff modifications
git diff --stat HANDOFF.md docs/handoffs/
```
