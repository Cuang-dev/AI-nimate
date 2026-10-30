# Operational Handoff: Unified Discord Bot & Reefblast Fleet Integration

- **Date**: 2026-10-05
- **Author/Agent**: Antigravity (agy2)
- **Status**: Production Deployed & Active
- **Service Name**: `cuangbot-discord.service` (Systemd)

---

## 1. Executive Summary

A single, unified Discord bot (`Cuangbot#2600`, Client ID: `1556512167535321189`) has been deployed to orchestrate both the **AI-Nimate Autonomous Video Production Studio** and the **Reefblast Naval Progression Fleet**.

This unified bot allows operators to monitor and trigger AI-Nimate pipelines alongside live Reefblast fleet telemetry directly from Discord channels, DMs, or user-install apps with negligible resource consumption (~31.9 MB RSS).

---

## 2. Infrastructure & Process Architecture

- **Entry Point**: [`scripts/discord-bot.js`](file:///home/agent/orca/AI-nimate/scripts/discord-bot.js)
- **Service Daemon**: `cuangbot-discord.service` (Managed via systemd)
  - Location: `/etc/systemd/system/cuangbot-discord.service`
  - Constraints: `MemoryMax=160M`, `CPUQuota=20%`, Node heap limit `--max-old-space-size=128`.
  - Auto-restarts on error or reboot.
- **Environment Configuration**: Stored in [`AI-nimate/.env`](file:///home/agent/orca/AI-nimate/.env):
  - `DISCORD_BOT_TOKEN=MTU1NjUxMjE2NzUzNTMyMTE4OQ...`
  - `DISCORD_CLIENT_ID=1556512167535321189`
- **Application Scopes**:
  - Global slash commands registered with `integration_types: [0, 1]` (Guild & User installs) and `contexts: [0, 1, 2]` (Guild, Bot DM, Group DM).

---

## 3. Command Matrix

### A. Reefblast Fleet (`/reefblast`)
- `/reefblast status`: Live telemetry dashboard for both `reefblast-bot` (Cuang-Bot) and `reefblast-bot-william` (Captain William).
  - Displays Level, Coins, Zone, Vessel, Crew Helper, Active Weapons, Combo Streaks, and AM-GM optimal skill allocations.
  - Interactive ActionRow with buttons: `🔄 Refresh Fleet`, `⚡ William Deep Dive`, `🤖 Cuang-Bot Deep Dive`, `📜 Fleet Logs`.
- `/reefblast william`: Deep dive into Captain William (Level 114+, Zone 19 Leviathan's Throne, Singularity / Wrath arsenal, 27.2M+ coins, zero-purchase lock enforcement).
- `/reefblast cuang`: Deep dive into Captain Cuang-Bot (Level 80+, Zone 15 Magma Vents, full-reign auto-market sniping, crafting, and tavern recruitment).
- `/reefblast logs [bot] [lines]`: Real-time tail of auto-progression journal logs.

### B. AI-Nimate Studio (`/ainimate`)
- `/ainimate status`: Real-time rendering stage progress bar, active project stats, and recent completed workflows ledger.
  - Interactive buttons: `🔄 Refresh Studio`, `💡 Content Ideas`, `🛑 Halt Active Workflow`.
- `/ainimate create <topic> [style] [format]`: Launches the autonomous sub-agent video generation pipeline asynchronously.
- `/ainimate stop`: Gracefully halts active production without corrupting the workflow ledger.
- `/ainimate channels`: Lists active YouTube channel profiles and unused ideation pools.
- `/ainimate logs`: Returns circular log buffer entries from the orchestrator.

### C. Server & Host Telemetry (`/server`)
- `/server status`: Host RAM utilization, vCPU load averages, and Docker container health monitoring.

---

## 4. Safety Constraints & Non-Negotiables

1. **Captain William Account Safety**:
   - Strictly ZERO purchases (no hulls, no crew hires, no market buys) and ZERO salvages.
   - Allowed operations: Switching owned weapons, switching owned boats, and AM-GM skill allocation.
2. **Memory Footprint**:
   - Total memory across both Reefblast containers and the Discord bot daemon is strictly capped.
   - `reefblast-bot`: ~24 MiB
   - `reefblast-bot-william`: ~31 MiB
   - `cuangbot-discord`: ~31.9 MiB
   - Combined footprint is ~87 MiB, preserving >2.5 GB free host RAM.
