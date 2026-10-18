# AI-nimate 🎬🤖

> **Autonomous Multimedia Content Creation Engine & Channel Production Pipeline.**

AI-nimate generates production-ready documentary explainer videos, YouTube essays, and short-form content with high-retention narrative pacing, organic Ligne Claire visual spot illustrations, Edge-TTS neural voiceover, and sample-accurate word karaoke subtitles.

---

## 🌟 Key Architecture & Capabilities

```text
[TOPIC / BRIEF] ──► [RESEARCH DOSSIER] ──► [CONTINUOUS SCRIPT]
                            │                     │
                            ▼                     ▼
[EDGE-TTS VOICEOVER] ◄──────┴─────────► [WORD-LEVEL TIMINGS]
        │                                         │
        ▼                                         ▼
[CHOREOGRAPHY & STORYBOARD] ──────────► [STAGE GENERATOR (HTML5)]
        │                                         │
        ▼                                         ▼
[SEMANTIC ASSET SOURCING]               [PLAYWRIGHT CDP + FFMPEG]
 (Nano Banana + Vector DB)                        │
                                                  ▼
                                        [FINAL 1080P MASTER]
                                                  │
                                                  ▼
                                        [TELEGRAM DISPATCH]
```

### 1. Single Hero Asset Visual Architecture
- **Purity & Focus**: Strictly eliminates multi-card slide decks, procedural HTML/CSS wireframes, and top-right badge clutter.
- **3-Layer Visual Hierarchy**:
  - **Layer 1: Background & Archival Framing**: Parchment/canvas paper textures, subtle watermark patterns, and archival boundary borders.
  - **Layer 2: Single Centered Hero Exhibit**: Centered Ligne Claire spot illustration or forensic artifact (`assets/props/items/`) with subtle floating camera drift.
  - **Layer 3: Word-by-Word Subtitle Pill**: Centered floating subtitle pill at the bottom with active word karaoke highlighting.

### 2. Sample-Accurate Subtitle & Audio Synchronization
- **Word Timings Locked to Physical Audio**: Derived directly from synthesized audio duration via `ffprobe` rather than pre-synthesis script estimations, preventing audio-subtitle drift.
- **Active Word Highlighting**:
  - Spoken words: `#1c1917` (dark ink)
  - Active word: `#b45309` (bold cinnabar amber, scaled $1.12\times$)
  - Upcoming words: `#1c1917` with $0.38$ opacity
- **Pill Budgeting**: Maximum 6 words per window for 16:9 landscape; maximum 4 words for 9:16 vertical shorts. Zero text wrapping.

### 3. Asset Fulfillment: Nano Banana & Vector DB
- **Nano Banana Engine** ([`scripts/nano-banana.js`](file:///home/agent/orca/AI-nimate/scripts/nano-banana.js)): Constructs channel-tailored prompts enforcing transparent backgrounds (`rgba(0,0,0,0)`), organic hand-drawn ink lines, flat matte coloring, and zero procedural cards.
- **Semantic Vector DB** ([`scripts/vector-db.js`](file:///home/agent/orca/AI-nimate/scripts/vector-db.js)): In-memory cosine similarity search over existing prop/scene libraries with automated fallback prompting.

### 4. Headless Deterministic Rendering (`scripts/render.js`)
- Records Chromium viewport at 60fps/30fps using Playwright CDP.
- Synchronous stage trigger (`window.startStage()`) fires precisely at the end of browser warmup, eliminating A/V sync offsets.
- FFmpeg multiplexing with `libx264` (CRF 19-23) and `aac` high-fidelity audio.

---

## 🚀 Quick Start & CLI Workflows

### 1. Run Complete End-to-End Pipeline
```bash
# Full automated production run (HITL gates disabled by default)
node scripts/pipeline.js --topic "Rights issues in stocks in the Indonesian market" --channel kausalmedia --format 16:9

# Custom target duration (e.g. 5 minutes)
node scripts/pipeline.js --project rights-issue-saham-bei --duration 300
```

### 2. Render Existing HTML Stage to Video
```bash
node scripts/render.js \
  --html projects/rights-issue-saham-bei/visual/stage.html \
  --audio projects/rights-issue-saham-bei/audio/voiceover.mp3 \
  --duration 483.6 \
  --fps 30 \
  --crf 23 \
  --output projects/rights-issue-saham-bei/render/rights-issue-saham-bei.mp4
```

### 3. Interactive Telegram Bot (`@ai_nimatebot`)
```bash
# Start Telegram daemon
npm start
# or: node scripts/telegram-bot.js
```
The bot provides inline keyboard menus for:
- Initiating video workflows (`/create`)
- Inspecting active and past jobs (`/workflows`)
- Reviewing live pipeline logs (`/logs`)
- Editing channel prompts and switching orchestrator agents (`/setprompt`)

---

## 📁 Repository Structure

```text
AI-nimate/
├── .agents/skills/            # Agent skills (visual director, scriptwriting, handoff)
├── assets/                    # Archival props, items, and vector DB index
├── channels/                  # Channel profile specifications & topic banks
├── config/                    # Agent system prompts and bot settings
├── docs/                      # Architectural docs and handoff logs
├── engine/                    # HTML5 Stage Generator & DOM layout engine
├── projects/                  # Produced video workspaces (script, audio, visual, render)
├── scripts/                   # CLI toolchain (pipeline, render, tts, nano-banana, bot)
├── styles/                    # Visual style palettes and texture manager
├── CHANGELOG.md               # Version history and milestone log
└── README.md                  # This file
```

---

## 📜 Compliance & Terminal Rules
- All terminal outputs strictly observe an 80-column budget ($\le 76$ characters).
- Never emit raw Mermaid blocks in terminal sessions; use UTF-8 linear pipelines or tables.
- All file references must use clickable `file://` URIs.
