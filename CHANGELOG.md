# Changelog

All notable changes to the AI-nimate project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-10-05

### Added
- **Realistic Sailing Physics Navigation**:
  - Replaced legacy instant coordinate snap teleportation with a physics-based waypoint sailing navigator (`sailTo(targetX, targetZ)`) across all three automation engines (`reefblast-bot`, `reefblast-bot-william`, and `reefblast_auto_progression.js`).
  - Calculates heading vectors `r = atan2(dx, dz)` and applies continuous angular turning (`diffR * dt * 5.5`).
  - Cruises smoothly between docks (Market, Forge, Tavern, Shipyard) and Zone Gates at ship speed (14–24 units/sec) while transmitting periodic `{ t: 'mv', x, z, r }` packets at 100ms intervals matching Reefblast's native client physics.
- **Captain William Configurable Purchasing Policy (`canBuy: true`, `canSalvage: false`)**:
  - Enabled purchasing for Captain William (`william@cuang.dev`): William can now purchase higher-tier vessel hulls, recruit tavern helpers (e.g., Captain Rook hired for 1.8M coins!), craft upgrades at the Forge, and snipe discounted Tier 6/7 market deals.
  - **Strict Salvage Lock Enforcement**: William's weapon arsenal is 100% protected—inventory auto-salvaging is strictly disabled under all operating modes, preserving all owned weapons.
  - Added dynamic `/app/policy.json` config reloading to adjust purchasing on the fly without restarting daemon containers.
- **Dynamic Game Definitions Drift Detection & Autonomous Self-Adjustment**:
  - Implemented automatic schema & definitions drift detection (`computeDefsFingerprint` & `compareFingerprints`).
  - Detects game definition changes during live runtime: level cap increases (Lv. 121 -> 201), skill cap increases (30 -> 50), newly added active Tier 7 Experimental weapons (`Cataclysm Lance`, `Plague Storm`, `Hornet Swarm`, `Wraith Lance`, `Hexfire Coil`), retired weapon filtering (`!w.retired`), and combat balance formulas (`burn`, `leech`, `poison`).
  - Automatically updates AM-GM skill allocation curves dynamically across all skills without code modifications or crashes.
  - Generates telemetry drift logs in `/app/logs/game_update_detected.json`.
  - Added Antigravity Agent Fixer dispatch script (`scripts/deploy-antigravity-fixer.sh`) to launch autonomous Antigravity CLI agents (`agy -p`) if complex balance shifts or schema revisions require intervention.
- **Discord Bot Policy & Fixer Controls (`Cuangbot#2600`)**:
  - Added interactive toggle button `🛒 Enable William Buying` / `🛡️ Lock William Purchases` (`rb:toggle_buy:william`) across Fleet and William profile embeds.
  - Added slash command `/reefblast policy bot:william buying:true|false` for fine-grained purchasing policy control.
  - Added `/reefblast agent` and interactive button `🤖 Antigravity Fixer` (`rb:deploy_antigravity`) to trigger automated update remediation.
  - Embedded live game update telemetry banners (`✨ Live Game Update Active (v201)`) in status cards.

## [2.4.2] - 2026-10-05

### Added
- **Reefblast Tier 6 & Tier 7 Experimental Engine Support**:
  - Upgraded autonomous fleet engines (`reefblast-bot`, `reefblast-bot-william`, and browser userscript) to natively support the newly expanded endgame tiers and multi-trait mechanics:
    - **Tier 7 Experimental Vessels**: Flagship support for `Warlord Dreadship` (PL 158,473, HP 130,524, DEF 348, aspd +15.7%, def +21.5%, dmg +23.5%, hp +27.4%), `Phoenix`, `Corsair Phantom`, `Golden Galleon`, and `Sage's Ark`.
    - **Tier 6 Endgame Vessels**: Full automation for `Leviathan Bulwark` (HP 118,658, DEF 316, def +28.6%, hp +35.8%), `Void Reaver`, `Void Treasury`, `Star Archive`, and `Void Bloom`.
    - **Tier 7 Experimental Weapons**: Support for composite multi-trait blasters (`Plague Storm` with poison+explosive+spread, `Phantom Volley` with homing+pierce, `Hornet Swarm`, `Meteor Storm`, `Cataclysm Lance`, `Wraith Lance`, `Storm Seeker`, `Hexfire Coil`, `Inferno Mortar`, `Hydra Swarm`, `Bloodstorm Scatter`, `Wildfire Coil`).
    - **Tier 6 Weapons**: Full automation for `Kraken's Thirst` (12,040 DPS with Lifesteal), `Starbreaker Mortar` (11,766 DPS), `Abyss Venom`, `Leviathan Harpoon`, `Abyssal Seeker`, `Sunfire Cannon`, `Maelstrom Coil`, and `Void Repeater`.
  - **Dynamic Multi-Trait Scoring Matrix (`calcWeaponScore` & `calcBoatScore`)**:
    - Replaced obsolete legacy tier integers with unified effective DPS, item bonus rolls, and multi-trait synergies (`homing`, `explosive`, `lifesteal`, `chain`, `burn`, `poison`, `pierce`).
    - Integrated official Power Level (`PL`) rankings into shipyard purchasing, forge crafting, and market sniping priorities.
    - Added periodic background definition sync (`refreshDefs()`) every 30 minutes to dynamically absorb game balance patches.
  - **Discord Bot Visual Enhancements**:
    - Real-time resolution of official weapon/boat names, tier badges (`★ [T7 EXP]`, `[T6]`, `[T5]`), and trait emojis (`🎯`, `💥`, `🩸`, `⚡`, `🔥`, `🧪`, `🏹`, `🪭`) in Discord embed cards.
    - Cuang-Bot immediately upgraded to `Leviathan Bulwark` (118,658 HP) + `Parasite Pistol` (4,726 DPS).
    - William verified running `Warlord Dreadship` (130,524 HP) + `Kraken's Thirst` (12,040 DPS).

## [2.4.1] - 2026-10-05

### Added
- **Interactive Bot Lifecycle Controls (`/reefblast`)**:
  - Added interactive Discord button controls to immediately **Disable** (`🛑`) and **Enable** (`▶️`) autonomous game daemons on demand:
    - `🛑 Disable Cuang-Bot` / `▶️ Enable Cuang-Bot` (controls `reefblast-bot`).
    - `🛑 Disable William` / `▶️ Enable William` (controls `reefblast-bot-william`).
    - `⏹️ Disable All Bots` / `⚡ Enable All Bots` (batch control).
  - Added dedicated slash command subcommands:
    - `/reefblast start [bot: all|cuang|william]`: Safely starts selected daemon container(s).
    - `/reefblast stop [bot: all|cuang|william]`: Stops daemon container(s) immediately so the user can play manually in the browser without receiving "Signed in somewhere else" session kicks.
    - `/reefblast toggle [bot: cuang|william]`: Toggles the current execution state of a specific daemon.
  - Implemented dynamic UI embed states reflecting `🛑 STOPPED / DISABLED` when a container is halted, retaining the last known progress stats while signaling inactive status.

## [2.4.0] - 2026-10-05

### Added
- **Unified Discord Bot Daemon (`scripts/discord-bot.js`)**:
  - Implemented multi-project orchestration bridge uniting the AI-Nimate content studio with the Reefblast autonomous naval progression fleet under a single Discord bot application (`Cuangbot#2600`, Client ID: `1556512167535321189`).
  - Configured persistent background daemon via systemd (`cuangbot-discord.service`) with strict memory budgeting (`MemoryMax=160M`, Node heap limit `--max-old-space-size=128`, idle footprint ~31.9 MB RSS).
  - Registered global Discord slash commands (`/reefblast`, `/ainimate`, `/server`) supporting both Guild and User-install scopes (`integration_types: [0, 1]`, `contexts: [0, 1, 2]`) for universal execution in guilds, bot DMs, and group chats.

- **Reefblast Dual-Daemon Fleet Monitoring (`/reefblast`)**:
  - Connected live IPC telemetry bridge querying Docker engine containers directly (`reefblast-bot` & `reefblast-bot-william`).
  - Implemented `/reefblast status` command delivering high-density interactive embed cards displaying:
    - **Captain Cuang-Bot** (Lv. 80, Zone 15, Ghost Ship, Gus helper, AM-GM skill distribution, full-reign auto-market snipes & crafting).
    - **Captain William** (Lv. 114, Zone 19 Leviathan's Throne, 27.2M+ coins, Ghost Ship, Nova helper, Singularity / Leviathan's Wrath weapons, AM-GM distribution, strict zero-purchase enforcement).
    - Container health, RAM consumption, and session combat combos.
  - Implemented `/reefblast william` and `/reefblast cuang` deep-dive profiles showing full weapon inventory, stat bonuses, boat collections, and crew rosters.
  - Implemented `/reefblast logs` to stream real-time progression journal logs.
  - Interactive component buttons: `🔄 Refresh Fleet`, `⚡ William Deep Dive`, `🤖 Cuang-Bot Deep Dive`, and `📜 Fleet Logs`.

- **AI-Nimate Studio Remote Operations (`/ainimate`)**:
  - Implemented `/ainimate status` for monitoring active project stages, progress bar visualization (`[████░░░░░░]`), and historical ledger retrieval.
  - Implemented `/ainimate create` to trigger autonomous video essay pipelines directly from Discord with `--style` and `--format` parameter injection.
  - Implemented `/ainimate stop` to safely abort active render pipelines or clear stalled tasks.
  - Implemented `/ainimate channels` to inspect active channel guidelines and unused ideation pools.
  - Interactive button controls for studio status refresh, channel ideation discovery, and active project cancellation.

- **Infrastructure Telemetry (`/server`)**:
  - Implemented `/server status` reporting host memory (used/free/total), vCPU load averages, and active Docker container health status.

---

## [2.3.0] - 2026-10-02

### Fixed
- **Eliminated Subtitle Word Enlargement & Layout Jitter**:
  - Removed `transform: scale(1.12)` from `.subtitle-word.active` in [`engine/stage-generator.js`](file:///home/agent/orca/AI-nimate/engine/stage-generator.js).
  - Enforced uniform `font-weight: 800` across all subtitle states (`upcoming`, `active`, `spoken`), highlighting active words strictly through cinnabar amber (`#b45309`) color transitions with zero layout reflow or jumping.
- **Root Cause Forensic of "CSS/HTML" Asset Generation**:
  - Uncovered and resolved the root cause of fake CSS-like assets: deprecated and disabled [`scripts/generate-rights-issue-assets.js`](file:///home/agent/orca/AI-nimate/scripts/generate-rights-issue-assets.js) which was generating geometric SVG rectangles and text rendered via Sharp.
  - Eliminated the pipeline asset bypass in [`scripts/pipeline.js`](file:///home/agent/orca/AI-nimate/scripts/pipeline.js) that repeatedly loaded existing SVG mockups.
- **Quota Limit Discovery & Error Handling**:
  - Documented Google Cloud upstream quota limitation on `gemini-3.1-flash-image` (HTTP 429 Resource Exhausted) explaining why earlier offline fallbacks were created.

### Added
- **Authentic Nano Banana Generated Assets**:
  - BEI Trading Hall (`assets/props/items/bursa-efek-indonesia-floor.png`): Generated via native Antigravity `generate_image` with 4px black ink outlines, warm parchment wash, and bronze bull.
  - POJK Regulation Dossier (`assets/props/items/pojk-regulasi-hmetd.png`): Generated via native Antigravity `generate_image` with official cinnabar wax seal, OJK stamps, and subtle ground shadow.
- **100% Authentic Comic Storyboard**:
  - Re-mapped all 13 beats in [`projects/rights-issue-5m/visual/storyboard.json`](file:///home/agent/orca/AI-nimate/projects/rights-issue-5m/visual/storyboard.json) to eliminate all SVG wireframe assets in favor of real Nano Banana illustrations and character references.

---

## [2.2.0] - 2026-10-02

### Added
- **Telegram Photo Ingest & Style Bible Integration**:
  - Implemented `handlePhotoUpload` in [`scripts/telegram-bot.js`](file:///home/agent/orca/AI-nimate/scripts/telegram-bot.js) to automatically download user-forwarded reference images into [`assets/style-bible/`](file:///home/agent/orca/AI-nimate/assets/style-bible/).
  - Cataloged initial reference assets: Jakarta manual hydraulic carwash (`cuci-steam-hidrolik.jpg`) and modern investigator character (`investigator-batik.jpg`).
- **Official Comic Editorial Style Bible**:
  - Published [`styles/STYLE_BIBLE.md`](file:///home/agent/orca/AI-nimate/styles/STYLE_BIBLE.md) defining comic line-art standards, warm parchment color tokens, perspective rules, and trademark/fair-use guidance.
- **Dual Layout Engine**:
  - [`engine/stage-generator.js`](file:///home/agent/orca/AI-nimate/engine/stage-generator.js) now supports both `layout: 'hero'` (centered floating spot illustration) and `layout: 'fullsize'` (edge-to-edge 16:9 environment art with slow Ken Burns drift and bottom subtitle gradient scrim).
- **Progressive Label Reveal Architecture**:
  - Added support for delayed label pop-ins via dynamic bouncing comic callout badges and dual-state image cross-fading (`src` -> `src_labeled`) after $t \ge 2.0\text{s}$.
- **Modular Unit Economics Skill**:
  - Extracted unit economics breakdown into dedicated modular skill at [`.agents/skills/unit-economics-breakdown/SKILL.md`](file:///home/agent/orca/AI-nimate/.agents/skills/unit-economics-breakdown/SKILL.md) for optional activation on business topics.
- **Configurable Target Duration**:
  - Added dedicated 5-minute (~653 words @ 140 WPM) scriptwriting branch in [`scripts/pipeline.js`](file:///home/agent/orca/AI-nimate/scripts/pipeline.js) triggered via `--target-duration 300`.

### Changed
- **Sanitized Prompts & Dropped Isometric Lock**:
  - Completely stripped third-party channel references across [`config/agent-prompts.json`](file:///home/agent/orca/AI-nimate/config/agent-prompts.json), [`scripts/prompt-manager.js`](file:///home/agent/orca/AI-nimate/scripts/prompt-manager.js), and [`scripts/nano-banana.js`](file:///home/agent/orca/AI-nimate/scripts/nano-banana.js).
  - Replaced rigid isometric requirement with flexible perspective (frontal, 3/4, wide environmental angle).
  - Removed baked doodle arrows from base prompt generation.

---

## [2.1.0] - 2026-10-02

### Added
- **Single Hero Asset Flow**:
  - Streamlined stage architecture from 5 cluttered visual layers down to 3 focused layers:
    1. Layer 1: Background & Archival Framing (`#canvas-environment`, subtle batik watermark, parchment borders).
    2. Layer 2: Single Centered Hero Exhibit (`.exhibit-image` with organic camera drift).
    3. Layer 3: Word-by-Word Subtitle Pill (`#subtitle-box` centered bottom).
  - Enforced $\ge 80\%$ centered layout budget in [`engine/stage-generator.js`](file:///home/agent/orca/AI-nimate/engine/stage-generator.js) and [`scripts/pipeline.js`](file:///home/agent/orca/AI-nimate/scripts/pipeline.js).
- **Physical Audio Duration Sync**:
  - Integrated `ffprobe` detection in [`scripts/pipeline.js`](file:///home/agent/orca/AI-nimate/scripts/pipeline.js) to derive true physical voiceover duration directly from synthesized `voiceover.mp3`, eliminating discrepancies between pre-synthesis script estimates and actual audio playback.
- **Active Word Karaoke Subtitle Highlighting**:
  - Dynamic word-level tracking in [`engine/stage-generator.js`](file:///home/agent/orca/AI-nimate/engine/stage-generator.js) rendering active words in bold cinnabar amber (`#b45309`, scaled $1.12\times$), spoken words in dark ink (`#1c1917`), and upcoming words in muted opacity ($0.38$).
  - Aspect-ratio responsive subtitle pill budgeting (6 words max for 16:9, 4 words max for 9:16) preventing multiline wrapping and visual clutter.
- **Deterministic Stage Stepper & Clock APIs**:
  - Implemented `window.startStage()` for synchronized launch at the exact conclusion of Playwright Chromium warmup.
  - Added `window.seekToBeat(id, progress)` and `window.seekToTime(seconds)` for deterministic visual QA auditing and keyframe capture.

### Changed
- **Asset Generation Policy Enforced**:
  - Strictly prohibited procedural HTML/CSS cards, wireframe UI blocks, and bullet-point slides in [`config/agent-prompts.json`](file:///home/agent/orca/AI-nimate/config/agent-prompts.json) and [`scripts/prompt-manager.js`](file:///home/agent/orca/AI-nimate/scripts/prompt-manager.js).
  - Enforced Nano Banana prompt construction ([`scripts/nano-banana.js`](file:///home/agent/orca/AI-nimate/scripts/nano-banana.js)) and Vector DB asset retrieval ([`scripts/vector-db.js`](file:///home/agent/orca/AI-nimate/scripts/vector-db.js)) for organic Ligne Claire spot illustrations and archival exhibits.
- **Playwright/FFmpeg Mux Synchronization**:
  - Refactored [`scripts/render.js`](file:///home/agent/orca/AI-nimate/scripts/render.js) to synchronize Playwright video recording with FFmpeg audio muxing. Replaced asymmetric seek with synchronous `window.startStage()` trigger.

### Fixed
- **Audio-Subtitle Drift & Desync**:
  - Resolved root cause where subtitle timings were generated from an estimated 519s script budget while the actual synthesized audio file was 483.6s, causing a cumulative 35.4s subtitle lag by video completion. Subtitles are now locked to exact physical audio duration.
- **Top-Right Clutter Removal**:
  - Excised `.wax-stamp` generation and DOM nodes from [`engine/stage-generator.js`](file:///home/agent/orca/AI-nimate/engine/stage-generator.js). Nullified `annotation` across all storyboard beats in [`projects/rights-issue-saham-bei/visual/storyboard.json`](file:///home/agent/orca/AI-nimate/projects/rights-issue-saham-bei/visual/storyboard.json).
- **Telegram Dispatch Parameter Bug**:
  - Fixed undefined `caption` variable reference in `sendVideoToTelegram` in [`scripts/pipeline.js`](file:///home/agent/orca/AI-nimate/scripts/pipeline.js). Added automated video compression to ensure payload stays under Telegram Bot API 50MB limit.

### Removed
- **Procedural Chart Engines**:
  - Completely decommissioned legacy SVG chart generators, card wireframing prompts, and motion canvas MCP references across all agent configurations.
