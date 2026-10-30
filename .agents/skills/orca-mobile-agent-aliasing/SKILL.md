---
name: orca-mobile-agent-aliasing
description: >-
  Surface custom agents on Orca Mobile without cluttering Orca Web. Use
  when custom agents (e.g. Antigravity variants, Bob, custom runners)
  need mobile companion app access, or when configuring mobile-scoped
  agent aliasing, launcher shims, or Orca V8 CDP daemon interception.
---

# Orca Mobile-Scoped Agent Aliasing

Standard guide for surfacing custom AI agents on the Orca Mobile
companion app (iOS & Android) while preserving clean, uncluttered
agent menus on Orca Web and Desktop.

## 1. Problem & Core Constraints

1. **The Mobile Catalog Barrier**:
   - The Orca Mobile companion app is a compiled native bundle with a
     hardcoded agent catalog enum (`ALL_TUI_AGENTS`).
   - Built-in IDs include: `gemini`, `copilot`, `devin`, `claude`,
     `codex`, `antigravity`, `kiro`, `opencode`.
   - Custom IDs (e.g. `bob`, `antigravity-2`, `antigravity-3`) are
     silently ignored and not displayed in the mobile drawer.

2. **The Web Clutter Problem**:
   - Registering mobile aliases globally pollutes Orca Web with
     duplicate entries and inaccurate branding (e.g. displaying
     "Gemini" for Antigravity-2).

3. **CRITICAL Service Safety Rule**:
   - **NEVER run `systemctl restart orca-serve.service`**.
   - Active agent sessions run inside the daemon cgroup and terminate
     immediately on service restart.
   - All runtime daemon updates MUST use live V8 CDP hot-patching.

---

## 2. Architecture & Pipeline

```text
[Orca Client]
      │
      ├──► Mobile App (clientKind: "mobile")
      │      ├── RPC: Injects [gemini, copilot, devin, ...]
      │      └── Launch: Transparently maps to custom binaries
      │
      └──► Web / Desktop (clientKind: "runtime")
             ├── RPC: Filters out [gemini, copilot, devin]
             └── Catalog: Shows only clean custom names
```

### Surface Mapping Reference

| Surface | Scope | Agents | Executable |
| :--- | :--- | :--- | :--- |
| **Orca Web** | `runtime` | Bob, agy2, agy3 | `bob`, `agy2`, `agy3` |
| **Mobile** | `mobile` | Devin, Gemini, Copilot | `devin`, `gemini`, ... |

---

## 3. Step-by-Step Implementation

### Step 1: Create Process-Matched Launcher Shims

Orca verifies the running process name using `expectedProcess`. Each
mobile alias must:
1. Provide an executable script in `PATH` (e.g. `~/.local/bin/<alias>`).
2. Use `exec -a <alias>` so `ps` and Orca process monitors match.
3. Pre-trust the current working directory in the agent config to
   prevent interactive trust prompts hanging on mobile taps.
4. Set isolated profile/home environment variables.

Example: [`gemini`](file:///home/agent/.local/bin/gemini)
```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME="/home/agent/.gemini/profiles/agy2"
export USER="${USER:-agent}"
export PATH="/home/agent/.local/bin:/usr/local/bin:/usr/bin:/bin"

for a in "$@"; do
  case "$a" in
    -v|--version)
      echo "Gemini CLI v0.1.0 (alias -> Antigravity-2 agy2)"
      exit 0
      ;;
  esac
done

# Pre-register CWD in trustedWorkspaces to avoid mobile hang
python3 -c '
import json, os
p = os.path.realpath(os.getcwd())
for sf in [
    os.path.join(os.environ.get("HOME", ""),
                 ".gemini/antigravity-cli/settings.json"),
    "/home/agent/.gemini/antigravity-cli/settings.json"
]:
    try:
        os.makedirs(os.path.dirname(sf), exist_ok=True)
        d = json.load(open(sf)) if os.path.exists(sf) else {}
        tw = d.setdefault("trustedWorkspaces", [])
        if p not in tw:
            tw.append(p)
            json.dump(d, open(sf, "w"), indent=2)
    except Exception:
        pass
' 2>/dev/null || true

exec -a gemini /home/agent/.local/bin/agy2.bin \
  --dangerously-skip-permissions "$@"
```

Completion criteria:
- Running `<alias> -v` returns the alias version header.
- Running `<alias>` launches the underlying custom agent process.

---

### Step 2: Configure Mobile Device Scopes

Orca tags incoming JSON-RPC connections by device scope.
Ensure paired mobile devices have `"scope": "mobile"` in
[`orca-devices.json`](file:///home/agent/.config/orca/orca-devices.json):

```json
{
  "version": 1,
  "devices": [
    {
      "deviceId": "<PHONE_DEVICE_UUID>",
      "deviceName": "Mobile Device",
      "scope": "mobile"
    }
  ]
}
```

Completion criteria:
- Inspect `orca-devices.json` and confirm mobile phone entry has
  `"scope": "mobile"`.

---

### Step 3: Hot-Patch Daemon RPC via V8 CDP

Because `orca-serve.service` must not be restarted, hook the running
daemon in memory using Node Chrome DevTools Protocol (CDP):

1. **Trigger V8 Inspector**:
   Send `process._debugProcess(pid)` to Orca server process.
2. **Connect via WebSocket**:
   Read `http://127.0.0.1:9229/json` for `webSocketDebuggerUrl`.
3. **Traverse Scope Chain**:
   Locate Orca RPC registry on the active WebSocket server handle.
4. **Hook Handlers**:
   - `preflight.detectAgents`: If caller is `mobile`, append alias IDs.
     If caller is `web`/`desktop`, filter out alias IDs.
   - `preflight.refreshAgents`: Same filtering logic on `res.agents`.
   - `worktree.create`: Map `startupAgent` alias to target agent ID.
   - `terminal.createAgentSession`: Map `agent` alias to target ID.
   - `terminal.ensureAgentSession`: Map `agent` alias to target ID.

Reference hook script:
[`alias-hook.js`](file:///home/agent/.local/bin/orca-mobile-alias-hook.js)

Run the hook:
```bash
node /home/agent/.local/bin/orca-mobile-alias-hook.js
```

Completion criteria:
- Script logs:
  `Successfully applied mobile-scoped alias RPC hooks to Orca server.`
- Return value from CDP evaluation is `{ success: true }`.

---

### Step 4: Web Static Asset Hygiene

Orca Web builds its UI catalog from bundled static assets in:
`/usr/lib/orca-ide/resources/app/packages/`
`desktop/dist/web/assets/agent-catalog-*.js`

1. Verify custom agent entries exist in the bundle:
   - e.g. `bob`, `antigravity-2`, `antigravity-3`.
2. Ensure alias names (`gemini`, `copilot`, `devin`) are NOT added as
   custom web catalog entries. They must only exist as built-in mobile
   fallbacks injected dynamically for mobile RPC callers.

Completion criteria:
- Static catalog contains only desired Web agents.
- No alias duplicate entries in the web JavaScript assets.

---

## 4. Verification Checklist

1. **CLI Verification**:
   ```bash
   gemini -v   # Expect: Gemini CLI v... (alias -> Antigravity-2)
   copilot -v  # Expect: GitHub Copilot CLI v... (alias -> Antigravity-3)
   devin -v    # Expect: Devin CLI v... (alias -> IBM Bob)
   ```

2. **Web UI Verification**:
   Inspect Orca Web (`http://<host>:6768/web-index.html`):
   - Dropdown displays: `IBM Bob`, `Antigravity-2`, `Antigravity-3`.
   - Dropdown DOES NOT display: `Gemini`, `Copilot`, `Devin`.
   - Settings > Agents shows only the 6 detected installed agents.

3. **Mobile App Verification**:
   Open Orca Mobile companion app connected to the daemon:
   - Drawer displays: `Gemini`, `GitHub Copilot`, `Devin`.
   - Launching any of these starts the mapped custom agent seamlessly.

---

## 5. Troubleshooting Reference

- **Mobile hangs on agent tap**:
  - *Cause*: Interactive workspace trust prompt on stdin.
  - *Fix*: Pre-register CWD in `trustedWorkspaces` inside launcher.

- **Orca reports process exited immediately**:
  - *Cause*: Process name mismatch in process table.
  - *Fix*: Use `exec -a <alias>` in launcher shim.

- **V8 Inspector port 9229 busy**:
  - *Cause*: Previous CDP session still connected.
  - *Fix*: Run `lsof -i :9229` and terminate stale client.

- **Aliases appear on Web UI**:
  - *Cause*: `preflight.detectAgents` hook not active.
  - *Fix*: Re-run hook script via node.

- **Agent terminates unexpectedly**:
  - *Cause*: `orca-serve.service` was restarted.
  - *Fix*: Never restart service; apply patches via CDP.
