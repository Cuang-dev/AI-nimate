---
name: handoff
description: Standard operating procedure and structured template for creating agent-to-agent handoff documentation. Used at the completion of a task, session, or before agent transitions to transfer complete context, system state, architectural decisions, test evidence, and actionable next steps without context degradation.
---

# Agent Handoff Protocol & Skill Specification

## 1. Purpose & Philosophy
When autonomous AI agents operate sequentially across long-running tasks, context windows are periodically compacted, subagents are respawned, or sessions transition. The **Handoff Skill** ensures **zero context loss, zero regression, and immediate execution readiness** for the incoming agent.

A great handoff document is:
1. **Evidence-Driven**: Includes exact command outputs, timestamps, frame rates, and test results rather than vague statements like "everything works".
2. **Reproducible**: Provides copy-pasteable CLI commands for building, testing, and rendering.
3. **Traceable**: Uses absolute clickable `file:///` links for every modified file, asset, and artifact.
4. **Architecturally Explicit**: Explains the *why* behind changes (e.g. why an approach failed and why a new design was adopted) to prevent the next agent from repeating discarded ideas.

---

## 2. Standard Handoff Structure (Template)

Every handoff document must follow this standardized Markdown schema:

```markdown
# Agent Handoff: [Project Name / Task Objective]
**Date & Time**: YYYY-MM-DD HH:MM:SS (Timezone)
**Previous Agent Role**: [e.g., Senior Systems Architect & Pipeline Engineer]
**Incoming Agent Target**: [e.g., QA / Rendering / Full Release Agent]

---

## 1. Executive Summary
Brief 2-3 paragraph synthesis of what was requested, what was achieved in this session, and the immediate operational state of the codebase.

---

## 2. System & Environment State
- **OS & Architecture**: Linux kernel, CPU model, core count, available RAM.
- **Hardware Acceleration / GPU**: Intel QuickSync Video (QSV), VA-API (`/dev/dri/renderD128`), or discrete GPU status.
- **Key Toolchains**: Node.js version, FFmpeg version and supported hardware encoders (`h264_vaapi`, `h264_qsv`, `libx264`), Chromium/Playwright binaries.

---

## 3. Milestones Completed in this Session
Bulleted list of concrete accomplishments with direct clickable links to modified or created files:
- [filename](file:///path/to/file): Detailed description of modifications, rationale, and performance impact.

---

## 4. Root Cause Analyses & Bug Fixes (What Was Broken & How It Was Solved)
Detailed technical post-mortem for any bugs resolved during the turn:
- **Symptom**: User complaint or observed failure mode.
- **Root Cause**: The underlying code defect, mathematical discrepancy, or architectural bottleneck.
- **Solution**: The precise code refactor, formula adjustment, or system change that eliminated the defect.
- **Verification Evidence**: Proof of resolution (logs, metrics, snapshots).

---

## 5. Verification & Testing Evidence
Table of automated test suites run, exit codes, and verification artifacts:
| Test Suite / Command | Exit Code | Metrics / Findings | Status |
| :--- | :---: | :--- | :---: |
| `node scripts/test-subtitles.js ...` | 0 | 9/9 passed, 0 warnings | ✅ PASS |

---

## 6. Primary Artifacts & Project Deliverables
Clickable links to deliverables:
- **Final Master Video**: `[video.mp4](file:///...)`
- **Storyboard JSON**: `[storyboard.json](file:///...)`
- **Voiceover Audio**: `[audio.mp3](file:///...)`
- **Word Timestamps**: `[timestamps.json](file:///...)`
- **Verification Frames / Proofs**: Links to key snapshot images.

---

## 7. Actionable Next Steps for the Next Agent
Numbered, prioritized checklist of exact tasks the incoming agent should execute immediately upon waking up:
1. [ ] Step 1: Exact command or file to inspect.
2. [ ] Step 2: Next feature or release action to perform.

---

## 8. Critical Constraints & Guardrails
- Rules that must NOT be violated (e.g. "Never use arbitrary dummy timestamps for storyboard scenes", "Do not break monotonic subtitle ordering", "Ensure +1.2s tail padding on audio").
```

---

## 3. Standard Storage Locations
Whenever writing a handoff document:
1. Write the permanent project record to:
   `docs/handoffs/HANDOFF_<ISO_DATE>_<TOPIC>.md` (e.g. `docs/handoffs/HANDOFF_2026-09-14_qsv_and_desync_fix.md`).
2. Update the active handoff pointer at repository root:
   `HANDOFF.md`.
3. Save an artifact copy for the user:
   `/home/agent/.gemini/profiles/agy2/.gemini/antigravity-cli/brain/<conversation-id>/HANDOFF.md`.
