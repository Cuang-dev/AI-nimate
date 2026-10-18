# AI-NIMATE ARCHITECTURE SPECIFICATION & MOA EXECUTION PLAN

## 0. MOA Operating Charter & Pragmatic Override Directives

### 1. Pragmatic Industry-Standard Override (Goal Over Misguided Literalism)
Do not take the user's raw words as rigid gospel if the way an implementation detail is described is misguided, insecure, or an anti-pattern. When you understand the general goal, follow standard industry conventions (security, networking, data integrity, memory safety, UX) and implement it the proper industry-standard way toward the intended goal. Preserve all existing passing tests (`node --test tests/*.test.js`) and never touch unrelated daemons (`scripts/mandarin-coach.js`, `docker/portfolio-server.js`, or naval game automation inside `scripts/discord-bot.js`).

### 2. Main Orchestrator Agent (MOA) & Sub-Agent Swarm Architecture
You are the **Main Orchestrator Agent (MOA)** coordinating a swarm of Gemini 3.8 Flash sub-agents. You must **NEVER** act as a monolithic coding worker that stuffs every file edit into your own context window.
Your sole responsibilities are:
1. **Externalized Memory on Disk:** Immediately write this full architecture specification to `docs/ARCHITECTURE.md` and maintain a live phase tracker at `docs/MOA_STATE.md` so you never rely on volatile prompt memory or forget tasks.
2. **Feature-Branch Sub-Agent Dispatch:** For each phase (Phases 1–8), create a new Git feature branch (`git checkout -b feat/phase-N-<slug>`), summon a fresh **Gemini 3.8 Flash Sub-Agent** scoped strictly to that phase's prompt and target files, and let the sub-agent implement the feature.
3. **Independent Verification & Merge:** Run the phase's independent **Verification Command** yourself to verify the sub-agent completed the task properly AND run `node --test tests/*.test.js` to verify zero regressions. Only when verification passes with exit code `0` may you commit, merge `--no-ff` into `main`, and update `docs/MOA_STATE.md`.

### 3. MOA Context Hygiene & Intelligent Clean-Slate Self-Reset Protocol
To prevent context saturation and hallucination on a 4 vCPU / 4GB RAM environment, monitor your context window usage. Before context exceeds ~60% capacity (or after every 2–3 completed phases):
1. Update `docs/MOA_STATE.md` with the exact status of all completed and pending phases.
2. Write a self-contained `docs/CONTINUATION_PROMPT.md` instructing your replacement MOA instance to read `docs/ARCHITECTURE.md` and `docs/MOA_STATE.md` and resume at the next `PENDING` phase.
3. Trigger a clean-slate session reset with `docs/CONTINUATION_PROMPT.md`.

---

## 1. System Invariants, Hardware Constraints & Tech Stack

### 1.1 Hardware & Memory Invariants (4 vCPU / 4GB RAM Hard Ceiling)
- **Node.js Heap Cap:** All pipeline and render child processes MUST run with `NODE_OPTIONS="--expose-gc --max-old-space-size=1024"`.
- **Sequential Embedding Teardown:** `scripts/vector-db.js` MUST expose an explicit `disposeVectorDb()` function that nulls out the `@xenova/transformers` singleton pipeline and invokes `if (global.gc) global.gc()` BEFORE Stage 6/7 (`stage-generator.js` / `render.js`) begins.
- **Zero Base64 Asset Bloat:** `engine/stage-generator.js` MUST NEVER inline raster images or audio as Base64 `data:` URIs. All stage assets must be referenced via relative local URLs (`/assets/...`) served by an ephemeral `node:http` static file server bound to `127.0.0.1:0` inside `scripts/render.js`.
- **Active-Scene-Only DOM Mounting:** `stage.html` MUST NOT mount all scenes simultaneously. It must keep scene definitions in a JavaScript array `window.__SCENES__` and mount ONLY the single active scene corresponding to the current timestamp `tMs` inside `#layer-3-sandbox`, keeping Chromium DOM memory under 250MB.
- **Deterministic Virtual Clock (`image2pipe`):** `scripts/render.js` MUST launch Playwright Chromium with `['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--js-flags=--max-old-space-size=512']`, advance time deterministically via `await page.evaluate((t) => window.__seekTo(t), timeMs)`, capture JPEG screenshots (`type: 'jpeg', quality: 85`), and pipe buffers directly to `ffmpeg -f image2pipe -vcodec mjpeg` with `-threads 2 -preset veryfast`.

### 1.2 Runtime & Approved Dependencies
- **Runtime:** Node.js v20+ (CommonJS `require`/`module.exports` across `channels/`, `styles/`, `engine/`, `scripts/`).
- **Approved Packages (Already in `package.json`):**
  - `playwright-core` (v1.63.0) — Headless Chromium control and frame capture.
  - `node-edge-tts` (v1.2.11) — Neural TTS synthesis and word boundary extraction.
  - `@xenova/transformers` (v2.17.2) — Local embeddings (`all-MiniLM-L6-v2`).
  - `discord.js` (v14.27.0) — Discord slash commands and interactive select menus.
  - Built-in Node modules: `node:fs`, `node:path`, `node:http`, `node:child_process`, `node:crypto`, `node:util`, `node:assert`, `node:test`.
- **Forbidden Dependencies:** Do NOT install new npm packages. Remove dead scripts (`scripts/image-utils.js`, `scripts/generate-rights-issue-assets.js`, `scripts/merge-test-chunks.js`) that depended on undeclared `sharp`.

### 1.3 Forbidden Patterns
- NEVER modify `scripts/mandarin-coach.js`, `docker/portfolio-server.js`, or the non-AI-nimate features in `scripts/discord-bot.js` and `scripts/telegram-bot.js`.
- NEVER append mined topic ideas into `channels/kausalmedia.json` or `channels/nusantaraarchive.json`. Topic ideas belong exclusively in `config/trending-ideas.json` (capped at 100 items per channel via ring-buffer FIFO) and `config/used-topics.json`.
- NEVER hardcode `#faf6ee`, batik watermarks, or channel names inside `engine/stage-generator.js` or `scripts/nano-banana.js`. All colors, fonts, backgrounds, watermarks, and prompts must resolve from `ChannelProfile` and `StyleProfile`.
- NEVER include the legacy `"ABSOLUTE PROHIBITION ON HTML/CSS"` instruction in `config/agent-prompts.json` when `visualEngine` is `'vector-html'` or `'hybrid'`.

### 1.4 Environment Variables

| Variable | Type | Default Fallback | Validation Rule |
|---|---|---|---|
| `AGY_BIN` | `string` | `'/home/agent/.local/bin/agy'` | Checked via `fs.existsSync`; falls back to deterministic template if missing/timeout. |
| `QWEN_ENDPOINT_URL` | `string` | `''` | Valid HTTP/HTTPS URL required only when `visualEngine` uses `'ai-image'` and remote generation is active. |
| `NODE_OPTIONS` | `string` | `'--expose-gc --max-old-space-size=1024'` | Injected into spawned workflow workers by `workflow-controller.js`. |

---

## 2. Directory Tree & File Manifest

### 2.1 Target Directory Tree (AI-nimate Scope)
```text
AI-nimate/
├── docs/
│   ├── ARCHITECTURE.md                  # Full architecture spec on disk (CREATE)
│   └── MOA_STATE.md                     # Live phase tracker for MOA (CREATE)
├── config/
│   ├── schema.js                        # Canonical PipelineConfig validator & defaults (CREATE)
│   ├── agent-prompts.json               # Upgraded channel-aware + dual-engine prompts (MODIFY)
│   ├── bot-settings.json                # Runtime defaults (EXISTING)
│   ├── trending-ideas.json              # Ring-buffered mined topics per channel (MODIFY)
│   └── used-topics.json                 # Consumed topic registry (EXISTING)
├── channels/
│   ├── channel-manager.js               # Channel profile loader & variant resolver (MODIFY)
│   ├── channel-ideas.js                 # Ring-buffered topic bank manager (MODIFY)
│   ├── kausalmedia.json                 # Debloated Kausal Media profile + variants (MODIFY)
│   └── nusantaraarchive.json            # Activated Nusantara Archive profile + variants (MODIFY)
├── styles/
│   ├── style-manager.js                 # Style profile loader & CSS variable compiler (MODIFY)
│   ├── kausalmedia.json                 # Warm papyrus + batik documentary style (MODIFY)
│   ├── investigative-documentary.json   # Dark archival grain documentary style (MODIFY)
│   └── tech-deepdive.json               # High-density blueprint grid style (MODIFY)
├── engine/
│   ├── visual-engine.js                 # Dual visual engine router: vector-html | ai-image | hybrid (CREATE)
│   └── stage-generator.js               # 5-layer brand shell + active-scene DOM stage compiler (MODIFY)
├── scripts/
│   ├── pipeline.js                      # 8-stage orchestrator wired to PipelineConfig & GC (MODIFY)
│   ├── workflow-controller.js           # Spawns workers with PipelineConfig & 1GB heap limit (MODIFY)
│   ├── workflow-ledger.js               # Persists PipelineConfig state & PID tracking (MODIFY)
│   ├── tts.js                           # Exports synthesizeSpeech, synthesizeWithApiVoice, extractWordBoundaries (MODIFY)
│   ├── nano-banana.js                   # Dynamic style/channel-driven image prompt builder (MODIFY)
│   ├── vector-db.js                     # Adds disposeVectorDb() + global.gc() memory release (MODIFY)
│   ├── render.js                        # Ephemeral HTTP asset server + __seekTo image2pipe renderer (MODIFY)
│   ├── generate-trending-ideas.js       # Writes strictly to config/trending-ideas.json (MODIFY)
│   ├── discord-bot.js                   # Adds channel/variant/engine/subtitle options to /ainimate (MODIFY)
│   ├── image-utils.js                   # Dead script using undeclared sharp (DELETE)
│   ├── generate-rights-issue-assets.js  # Disabled script with process.exit(1) (DELETE)
│   └── merge-test-chunks.js             # Abandoned scratch script (DELETE)
└── tests/
    └── architecture-upgrade.test.js     # Unit & integration tests for all new contracts (CREATE)
```

### 2.2 File Manifest Table

| Exact Relative Path | Action | Single Responsibility | Allowed Internal Imports |
|---|---|---|---|
| `docs/ARCHITECTURE.md` | `CREATE` | Stores this complete architecture specification on disk. | None |
| `docs/MOA_STATE.md` | `CREATE` | Tracks phase completion, branch names, and verification status. | None |
| `config/schema.js` | `CREATE` | Validates, normalizes, and supplies defaults for `PipelineConfig`, `ChannelProfile`, and `StyleProfile`. | None (Pure leaf module) |
| `scripts/image-utils.js` | `DELETE` | Remove unused script requiring undeclared `sharp`. | None |
| `scripts/generate-rights-issue-assets.js` | `DELETE` | Remove disabled script with `process.exit(1)`. | None |
| `scripts/merge-test-chunks.js` | `DELETE` | Remove hardcoded scratch script. | None |
| `scripts/tts.js` | `MODIFY` | Synthesizes Edge-TTS/API speech, extracts word boundaries, and properly exports its functions via `module.exports`. | None |
| `scripts/vector-db.js` | `MODIFY` | Manages local `@xenova/transformers` embeddings and exposes `disposeVectorDb()` to free RAM before rendering. | None |
| `channels/kausalmedia.json` | `MODIFY` | Clean (<5KB) channel profile for Kausal Media with voice, persona, anti-slop rules, and 4 video/hook variants. | None |
| `channels/nusantaraarchive.json` | `MODIFY` | Clean (<5KB) active channel profile for Nusantara Archive with voice, persona, and 3 video/hook variants. | None |
| `channels/channel-ideas.js` | `MODIFY` | Reads/writes mined and curated topics in `config/trending-ideas.json` with a strict 100-item ring buffer per channel. | None |
| `channels/channel-manager.js` | `MODIFY` | Loads channel profiles, resolves channel video/hook variants, and delegates topic management to `channel-ideas.js`. | `./channel-ideas`, `../config/schema` |
| `scripts/generate-trending-ideas.js` | `MODIFY` | Mines trending topics via `agy` and stores them via `channel-ideas.js` without mutating `channels/*.json`. | `../channels/channel-manager`, `../channels/channel-ideas` |
| `styles/kausalmedia.json` | `MODIFY` | Defines Kausal Media palette, typography, papyrus background, and batik watermark layer tokens. | None |
| `styles/investigative-documentary.json` | `MODIFY` | Defines dark archival grain palette, serif/mono typography, and documentary chrome tokens. | None |
| `styles/tech-deepdive.json` | `MODIFY` | Defines blueprint grid palette, monospace/sans typography, and schematic chrome tokens. | None |
| `styles/style-manager.js` | `MODIFY` | Loads `styles/*.json`, validates tokens, and compiles deterministic `:root` CSS custom properties and Layer 0–2 chrome. | `../config/schema` |
| `config/agent-prompts.json` | `MODIFY` | Houses channel-aware scriptwriting prompts, hook templates, and dual visual engine (`vector-html` vs `ai-image`) prompts. | None |
| `scripts/nano-banana.js` | `MODIFY` | Builds visual prompts dynamically using `ChannelProfile` and `StyleProfile` instead of hardcoded `kausalmedia` checks. | `../channels/channel-manager`, `../styles/style-manager` |
| `engine/visual-engine.js` | `CREATE` | Routes each storyboard beat to `VectorHtmlEngine` or `AiImageEngine` (or per-beat in `hybrid` mode) and sanitizes SVG/HTML inside Layer 3. | `../scripts/nano-banana`, `../scripts/vector-db`, `../styles/style-manager`, `../config/schema` |
| `engine/stage-generator.js` | `MODIFY` | Generates lightweight (<100KB) `stage.html` with locked Layers 0–2/4–5 brand shell, active-scene-only Layer 3 mounting, configurable subtitles, and `window.__seekTo(ms)`. | `../styles/style-manager`, `../channels/channel-manager`, `../config/schema` |
| `scripts/render.js` | `MODIFY` | Serves build assets over ephemeral `127.0.0.1` HTTP server, steps `window.__seekTo(ms)` in low-RAM Chromium, and pipes JPEG frames to FFmpeg `image2pipe`. | `./audio-mixer`, `./visual-qa` |
| `scripts/workflow-ledger.js` | `MODIFY` | Persists full `PipelineConfig` inside ledger entries. | `../config/schema` |
| `scripts/workflow-controller.js` | `MODIFY` | Normalizes `PipelineConfig`, records ledger state, and spawns `pipeline.js` with 1GB max heap. | `./workflow-ledger`, `../config/schema` |
| `scripts/pipeline.js` | `MODIFY` | Parses CLI flags into `PipelineConfig`, loads Channel + Style profiles, runs dual visual engine, disposes VectorDB before render, and passes config to `stage-generator.js` and `render.js`. | `../config/schema`, `../channels/channel-manager`, `../styles/style-manager`, `../engine/visual-engine`, `../engine/stage-generator`, `./tts`, `./audio-mixer`, `./render`, `./vector-db`, `./prompt-manager` |
| `scripts/discord-bot.js` | `MODIFY` | Updates `/ainimate` command options to expose `channel`, `variant`, `visual_engine`, `subtitles`, and `style` without touching non-AI-nimate bot code. | `./workflow-controller`, `../channels/channel-manager`, `../styles/style-manager`, `../config/schema` |
| `tests/architecture-upgrade.test.js` | `CREATE` | Verifies schema normalization, channel/style decoupling, dual visual engine output, subtitle toggling, and deterministic `__seekTo` stage generation. | All internal modules |

---

## 3. Literal Data Models, Schemas & Configuration Contracts

### 3.1 `PipelineConfig` & Normalization (`config/schema.js`)
```javascript
/**
 * @typedef {Object} SubtitleConfig
 * @property {boolean} enabled - Whether Layer 5 subtitles are rendered.
 * @property {'off' | 'kinetic-pill' | 'broadcast-lower' | 'karaoke-word'} mode - Visual layout mode for captions.
 * @property {'bottom' | 'center'} position - Vertical placement in viewport.
 */

/**
 * @typedef {Object} AudioConfig
 * @property {'edge-tts' | 'api' | 'custom'} source - TTS provider.
 * @property {string} voice - Neural voice identifier (e.g. 'id-ID-ArdiNeural').
 * @property {string} rate - Prosody rate string (e.g. '+5%').
 * @property {number} duckingDb - Sidechain ducking attenuation in dB (default -22).
 */

/**
 * @typedef {Object} RenderOptimizationConfig
 * @property {number} fps - Target frame rate (15 to 60, default 24).
 * @property {number} jpegQuality - JPEG quality for image2pipe (50 to 95, default 85).
 * @property {number} ffmpegThreads - Max FFmpeg threads (1 to 4, default 2).
 * @property {number} chromiumMaxHeapMb - Max V8 heap in MB for Chromium (default 512).
 */

/**
 * @typedef {Object} PipelineConfig
 * @property {string} jobId - Unique identifier for the workflow run.
 * @property {string} topic - Video subject or title.
 * @property {string} channelId - ID of the channel in channels/*.json (default 'kausalmedia').
 * @property {string} videoVariant - ID of the channel-specific video/hook variant (default resolved from channel).
 * @property {string} styleId - ID of the style in styles/*.json (default resolved from channel.defaultStyle).
 * @property {'16:9' | '9:16'} aspectRatio - Output video aspect ratio.
 * @property {'vector-html' | 'ai-image' | 'hybrid'} visualEngine - Visual generation engine mode.
 * @property {SubtitleConfig} subtitles - Subtitle configuration object.
 * @property {AudioConfig} audio - Audio & TTS synthesis settings.
 * @property {RenderOptimizationConfig} render - Hardware ceiling optimization parameters.
 */
```

### 3.2 `ChannelProfile` JSON Schema (`channels/kausalmedia.json` & `channels/nusantaraarchive.json`)
Every channel profile in `channels/<channelId>.json` MUST conform to this exact structure (under 5KB, zero mined idea arrays inside the channel file):
```json
{
  "id": "kausalmedia",
  "name": "Kausal Media",
  "active": true,
  "language": "id-ID",
  "defaultStyle": "kausalmedia",
  "defaultVisualEngine": "hybrid",
  "defaultVariant": "forensic-autopsy",
  "voice": {
    "source": "edge-tts",
    "voiceId": "id-ID-ArdiNeural",
    "rate": "+5%",
    "pitch": "+0Hz"
  },
  "editorialDna": {
    "persona": "Investigative economic & institutional analyst dissecting hidden incentives in Indonesia.",
    "tone": "Sharp, empirical, dry-witted, grounded in balance sheets, regulatory filings, and historical precedent.",
    "antiSlopRules": [
      "Never open with 'Di era modern ini' or 'Pernahkah Anda berpikir'.",
      "Always anchor claims with concrete rupiahs, percentages, dates, or institutional actors.",
      "Explain causal mechanisms step-by-step rather than moralizing."
    ],
    "visualDirectives": "Warm editorial papyrus aesthetic, forensic red/gold highlights, clean schematic diagrams, archival cutouts."
  },
  "variants": {
    "forensic-autopsy": {
      "id": "forensic-autopsy",
      "label": "Forensic Market Autopsy",
      "aspectRatio": "16:9",
      "targetDurationSec": 360,
      "beatPaceSec": 6,
      "defaultSubtitles": "kinetic-pill",
      "hookArchetype": "data-shock-stat",
      "hookInstruction": "Open in-medias-res with a specific anomalous financial figure, date, or balance-sheet discrepancy before naming the broader topic.",
      "narrativeBeats": [
        "1. Anomaly Hook (0-15%): Present the specific financial/institutional anomaly and immediate stakes.",
        "2. Structural Mechanism (15-45%): Map the actors, cash flows, and regulatory loopholes that enabled it.",
        "3. The Smoking Gun (45-75%): Walk through the decisive transaction, filing, or turning point.",
        "4. Systemic Fallout (75-100%): Connect the forensic evidence to the structural takeaway for the viewer."
      ]
    },
    "policy-paradox": {
      "id": "policy-paradox",
      "label": "Policy Paradox Breakdown",
      "aspectRatio": "16:9",
      "targetDurationSec": 300,
      "beatPaceSec": 6,
      "defaultSubtitles": "broadcast-lower",
      "hookArchetype": "contrarian-mythbust",
      "hookInstruction": "State the stated public goal of a policy, then immediately juxtaposed with the exact opposite real-world outcome it produced.",
      "narrativeBeats": [
        "1. The Stated Promise vs. Reality (0-15%): Contrast official intent with measurable outcome.",
        "2. Incentive Map (15-50%): Trace how rational actors gamed the rule.",
        "3. Second-Order Effects (50-80%): Quantify who paid the hidden cost.",
        "4. Structural Fix or Equilibrium (80-100%): Why the paradox persists."
      ]
    },
    "invisible-monopoly": {
      "id": "invisible-monopoly",
      "label": "Invisible Monopoly Map",
      "aspectRatio": "16:9",
      "targetDurationSec": 360,
      "beatPaceSec": 6,
      "defaultSubtitles": "kinetic-pill",
      "hookArchetype": "visceral-mystery-gap",
      "hookInstruction": "Start with an everyday product or fee everyone in Indonesia pays, then reveal the single choke point controlling it.",
      "narrativeBeats": [
        "1. Everyday Surface (0-15%): Show the familiar consumer touchpoint.",
        "2. Supply Chain Choke Point (15-50%): Follow the ownership tree upstream.",
        "3. Moat & Rent Extraction (50-80%): Explain the licensing, logistics, or capital barrier.",
        "4. Macro Impact (80-100%): Summarize the toll on the broader economy."
      ]
    },
    "kinetic-short": {
      "id": "kinetic-short",
      "label": "9:16 Rapid Ticker Breakdown",
      "aspectRatio": "9:16",
      "targetDurationSec": 60,
      "beatPaceSec": 3,
      "defaultSubtitles": "karaoke-word",
      "hookArchetype": "in-medias-res-anomaly",
      "hookInstruction": "Deliver a 3-second pattern-interrupt stat or paradox in the very first sentence with zero throat-clearing.",
      "narrativeBeats": [
        "1. 3-Second Pattern Interrupt (0-15%): Hard number or counter-intuitive claim.",
        "2. Rapid Mechanism (15-75%): 3 fast causal links explaining how the number happened.",
        "3. Loopable Payoff (75-100%): Punchy conclusion that loops seamlessly back to the opening premise."
      ]
    }
  }
}
```

### 3.3 `StyleProfile` JSON Schema (`styles/*.json`)
Every style profile in `styles/<styleId>.json` MUST include these exact tokens:
```json
{
  "id": "kausalmedia",
  "name": "Kausal Media Editorial Papyrus",
  "theme": "light",
  "palette": {
    "bgPrimary": "#faf6ee",
    "bgSecondary": "#f0e8d8",
    "bgSurface": "rgba(255, 252, 245, 0.92)",
    "textPrimary": "#1a1815",
    "textSecondary": "#5a5347",
    "brandPrimary": "#b8332a",
    "brandAccent": "#c98a2c",
    "borderMuted": "rgba(26, 24, 21, 0.16)",
    "gridLine": "rgba(26, 24, 21, 0.07)"
  },
  "typography": {
    "fontDisplay": "'Playfair Display', 'Georgia', serif",
    "fontSans": "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    "fontMono": "'JetBrains Mono', monospace"
  },
  "chrome": {
    "backgroundPattern": "papyrus-batik",
    "watermarkText": "KAUSAL MEDIA // FORENSIC DOSSIER",
    "showHeaderBar": true,
    "showCornerTicks": true,
    "vignetteStrength": 0.22
  },
  "aiImagePromptPrefix": "Editorial archival illustration on warm aged papyrus (#faf6ee), forensic red (#b8332a) and ochre gold (#c98a2c) ink accents, clean etching linework, high contrast, no text clutter: "
}
```

### 3.4 Scene Beat Contract (Input to `engine/visual-engine.js` and `engine/stage-generator.js`)
```javascript
/**
 * @typedef {Object} StoryboardScene
 * @property {number} index - 0-based scene index.
 * @property {string} id - Scene identifier (e.g. 'scene-01').
 * @property {number} startMs - Start time in milliseconds.
 * @property {number} endMs - End time in milliseconds.
 * @property {number} durationMs - Scene duration in milliseconds (endMs - startMs).
 * @property {string} narration - Spoken narration text for this beat.
 * @property {string} chapterTitle - Short header label for Layer 2 chrome.
 * @property {'vector-html' | 'ai-image'} resolvedEngine - Engine selected for this beat.
 * @property {string} visualPrompt - Prompt describing the visual beat.
 * @property {string} [assetUrl] - Relative HTTP URL (e.g. '/assets/scene-01.jpg') when resolvedEngine === 'ai-image'.
 * @property {string} [vectorHtml] - Sanitized HTML/SVG markup string for Layer 3 when resolvedEngine === 'vector-html'.
 */
```

---

## 4. Deterministic Component Contracts

### 4.1 `config/schema.js`
- **Exports:**
  - `normalizePipelineConfig(rawInput = {}, channelProfile = null) -> PipelineConfig`
  - `validateChannelProfile(profile) -> { valid: boolean, errors: string[] }`
  - `validateStyleProfile(style) -> { valid: boolean, errors: string[] }`
  - `parseCliArgsToConfig(argv = process.argv.slice(2)) -> Partial<PipelineConfig>`
- **Algorithmic Rules:**
  1. `normalizePipelineConfig` merges `rawInput` onto deterministic defaults:
     - `channelId`: defaults to `'kausalmedia'`.
     - `videoVariant`: defaults to `channelProfile?.defaultVariant || 'forensic-autopsy'`.
     - `styleId`: defaults to `rawInput.styleId || channelProfile?.defaultStyle || 'kausalmedia'`.
     - `visualEngine`: must be one of `['vector-html', 'ai-image', 'hybrid']`; defaults to `channelProfile?.defaultVisualEngine || 'hybrid'`.
     - `subtitles`: accepts boolean (`false` -> `{ enabled: false, mode: 'off', position: 'bottom' }`), string mode (`'off'`, `'kinetic-pill'`, `'broadcast-lower'`, `'karaoke-word'`), or object. If `mode === 'off'`, `enabled` is forced to `false`.
     - `render`: clamps `fps` to `[15, 60]` (default `24`), `jpegQuality` to `[50, 95]` (default `85`), `ffmpegThreads` to `[1, 4]` (default `2`), `chromiumMaxHeapMb` to `[256, 768]` (default `512`).
  2. `parseCliArgsToConfig` parses flags: `--channel <id>`, `--variant <id>`, `--style <id>`, `--visual-engine <vector-html|ai-image|hybrid>`, `--subtitles <off|kinetic-pill|broadcast-lower|karaoke-word|true|false>`, `--no-subtitles`, `--aspect <16:9|9:16>`, `--topic <string>`, `--fps <number>`.

### 4.2 `channels/channel-manager.js` & `channels/channel-ideas.js`
- **`channels/channel-ideas.js` Exports:**
  - `getTrendingIdeas(channelId) -> Array<{ id: string, title: string, angle: string, variant: string, createdAt: string }>`
  - `appendTrendingIdeas(channelId, newIdeas, maxCap = 100) -> Array<Object>`
  - `markTopicUsed(channelId, topicTitle) -> void`
- **Ring-Buffer Rule:** `appendTrendingIdeas` reads `config/trending-ideas.json`, deduplicates by normalized lowercase `title`, prepends `newIdeas`, slices to `maxCap` (`100`) per channel, and writes atomically to `config/trending-ideas.json`. It NEVER writes to `channels/*.json`.
- **`channels/channel-manager.js` Exports:**
  - `getChannelProfile(channelId = 'kausalmedia') -> ChannelProfile`
  - `listChannels({ activeOnly = false } = {}) -> ChannelProfile[]`
  - `resolveChannelVariant(channelId, variantId) -> Object` (returns the variant object from `profile.variants[variantId]` or falls back to `profile.variants[profile.defaultVariant]`).
  - Keep existing CRUD helpers (`loadChannel`, `saveChannel`, `getActiveChannels`) intact as aliases so existing unit tests in `tests/*.test.js` pass without modification.

### 4.3 `styles/style-manager.js`
- **Exports:**
  - `getStyleProfile(styleId = 'kausalmedia') -> StyleProfile`
  - `listStyles() -> StyleProfile[]`
  - `compileStyleCssVariables(styleProfile) -> string`
  - `renderBrandBackgroundLayerHtml(styleProfile, channelProfile, aspectRatio) -> string`
- **Algorithmic Steps:**
  1. `compileStyleCssVariables` outputs a deterministic `:root { ... }` CSS block mapping every key in `styleProfile.palette` and `styleProfile.typography` to `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--brand-primary`, `--brand-accent`, `--border-muted`, `--grid-line`, `--font-display`, `--font-sans`, `--font-mono`.
  2. `renderBrandBackgroundLayerHtml` generates the locked HTML for **Layer 0** (background surface + pattern SVG: `papyrus-batik`, `archival-grain`, or `blueprint-grid`), **Layer 1** (subtle watermark + grid lines), and **Layer 2** (top documentary bar displaying `styleProfile.chrome.watermarkText` and dynamic `#stage-chapter-title`).

### 4.4 `engine/visual-engine.js` (Dual Visual Engine Router)
- **Exports:**
  - `decideBeatEngine(sceneBeat, pipelineConfig) -> 'vector-html' | 'ai-image'`
  - `generateVectorSceneHtml(sceneBeat, channelProfile, styleProfile, agyRunner) -> Promise<string>`
  - `sanitizeAndWrapVectorHtml(rawHtml, sceneBeat, styleProfile) -> string`
  - `populateStoryboardVisuals(scenes, pipelineConfig, channelProfile, styleProfile, buildAssetsDir, agyRunner) -> Promise<StoryboardScene[]>`
- **Algorithmic Steps:**
  1. `decideBeatEngine(sceneBeat, pipelineConfig)`:
     - If `pipelineConfig.visualEngine === 'vector-html'`, return `'vector-html'`.
     - If `pipelineConfig.visualEngine === 'ai-image'`, return `'ai-image'`.
     - If `pipelineConfig.visualEngine === 'hybrid'`, inspect `sceneBeat.visualType` or `sceneBeat.visualPrompt`: if it matches data/diagram/chart/timeline/flow/comparison keywords (`/\b(chart|graph|timeline|diagram|flow|stat|percentage|balance|comparison|matrix|schema|counter|step|taxonomy|structure)\b/i`), return `'vector-html'`; otherwise return `'ai-image'`.
  2. `generateVectorSceneHtml`:
     - Invokes `agyRunner` with the `vectorSceneDesigner` prompt from `config/agent-prompts.json`, passing the scene's `narration`, `visualPrompt`, `durationMs`, and the channel/style CSS variables (`var(--brand-primary)`, `var(--brand-accent)`, `var(--text-primary)`, `var(--bg-surface)`, `var(--font-display)`, `var(--font-mono)`).
     - If `agyRunner` fails or times out, generates a deterministic, high-density SVG/HTML infographic card displaying the scene's key metrics, animated SVG progress bars, and structured callouts so rendering never crashes.
  3. `sanitizeAndWrapVectorHtml`:
     - Strips `<script>`, `<iframe>`, `<object>`, `onload=`, `onerror=`, and external `http://`/`https://` image URLs (to prevent network hangs during headless render).
     - Wraps the markup in `<div class="ai-vector-sandbox" data-scene-id="${sceneBeat.id}">...</div>` constrained to `width: 100%; height: 100%; overflow: hidden; position: relative;`.

### 4.5 `engine/stage-generator.js` (5-Layer Brand Shell + Active-Scene Virtual Clock)
- **Exports:**
  - `generateStageHtml(storyboard, pipelineConfig, channelProfile, styleProfile) -> string`
  - `writeStageFile(storyboard, outputPath, options) -> string` (preserves backward compatibility with existing callers/tests while using the new engine).
- **5-Layer Architecture inside `stage.html`:**
  - **Layer 0 (`#layer-0-bg`):** Deterministic brand background color & SVG pattern from `style-manager.js`.
  - **Layer 1 (`#layer-1-watermark`):** Brand watermark & corner registration ticks.
  - **Layer 2 (`#layer-2-chrome`):** Documentary header bar with channel badge & `#stage-chapter-title`.
  - **Layer 3 (`#layer-3-sandbox`):** Safe-area viewport (`height: 80%` when `subtitles.enabled === true`, automatically expanding to `height: 92%` when `subtitles.enabled === false`). Holds ONLY the currently active scene DOM node.
  - **Layer 4 (`#layer-4-vignette`):** Pointer-events-none optical vignette overlay.
  - **Layer 5 (`#layer-5-subtitles`):** Conditionally rendered only when `pipelineConfig.subtitles.enabled === true`. Supports `'kinetic-pill'`, `'broadcast-lower'`, and `'karaoke-word'`. When `subtitles.enabled === false`, `#layer-5-subtitles` is omitted from the DOM.
- **Pre-Injected Motion Primitives Utility CSS (for `vector-html` scenes):**
  - `.vec-grid`, `.vec-card`, `.vec-stat-huge`, `.vec-badge`, `.vec-flow-arrow`, `.vec-bar-fill`, `.vec-draw-path`, `.vec-pan-zoom`.
  - Driven deterministically by a CSS custom property `--scene-progress` (`0.0` to `1.0`) and `--scene-elapsed-ms` updated inside `window.__seekTo(timeMs)`.
- **Deterministic Virtual Clock (`window.__seekTo(timeMs)`):**
  ```javascript
  window.__seekTo = function(timeMs) {
    window.__currentTimeMs = timeMs;
    const activeScene = window.__SCENES__.find(s => timeMs >= s.startMs && timeMs < s.endMs)
      || window.__SCENES__[window.__SCENES__.length - 1];
    if (activeScene) {
      if (window.__mountedSceneId !== activeScene.id) {
        window.__mountScene(activeScene);
        window.__mountedSceneId = activeScene.id;
      }
      const elapsed = Math.max(0, timeMs - activeScene.startMs);
      const progress = Math.min(1, elapsed / Math.max(1, activeScene.durationMs));
      const sandbox = document.getElementById('layer-3-sandbox');
      sandbox.style.setProperty('--scene-progress', progress.toFixed(4));
      sandbox.style.setProperty('--scene-elapsed-ms', `${elapsed}ms`);
    }
    if (window.__SUBTITLES_ENABLED__) {
      window.__updateSubtitles(timeMs);
    }
    return true;
  };
  ```

### 4.6 `scripts/render.js` (Low-Memory Static Server + `image2pipe` Renderer)
- **Exports:**
  - `startStaticAssetServer(rootDir) -> Promise<{ server: http.Server, baseUrl: string, close: () => Promise<void> }>`
  - `renderStageToVideo(options) -> Promise<{ outputPath: string, keyframes: string[], durationMs: number }>`
- **Algorithmic Steps:**
  1. Start `startStaticAssetServer(buildDir)` bound to `127.0.0.1:0` (OS-assigned free port) serving `stage.html` and `/assets/*` with zero Base64 overhead.
  2. Launch `chromium.launch` with `args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--disable-extensions', '--mute-audio', `--js-flags=--max-old-space-size=${chromiumMaxHeapMb}`]`.
  3. Open a single page with viewport `1920x1080` (`16:9`) or `1080x1920` (`9:16`), navigate to `${baseUrl}/stage.html`, and wait for `window.__STAGE_READY === true`.
  4. Spawn `ffmpeg` with `-y -f image2pipe -vcodec mjpeg -r ${fps} -i - -i ${masteredAudioPath} -c:v libx264 -preset veryfast -pix_fmt yuv420p -threads ${ffmpegThreads} -c:a aac -b:a 192k -shortest ${outputPath}`.
  5. Loop `frameIdx` from `0` to `totalFrames - 1`:
     - Compute `timeMs = Math.round((frameIdx / fps) * 1000)`.
     - Call `await page.evaluate((t) => window.__seekTo(t), timeMs)`.
     - Capture `const jpegBuffer = await page.screenshot({ type: 'jpeg', quality: jpegQuality })`.
     - Write `jpegBuffer` to `ffmpeg.stdin` (respecting stream `drain` backpressure so Node RAM never buffers more than 1 frame).
     - At scene midpoints, also save the buffer to `keyframes/scene-XX.jpg` for `visual-qa.js`.
  6. Close `ffmpeg.stdin`, await FFmpeg exit `0`, close Chromium browser, and close the static HTTP server in a `finally` block.

### 4.7 Edge Case Matrix

| Failure Scenario | Target Module | Exact Required Behavior & Return Value |
|---|---|---|
| `require('./tts')` called by `pipeline.js` | `scripts/tts.js` | Exports `{ synthesizeSpeech, synthesizeWithApiVoice, extractWordBoundaries }` so `require('./tts')` never returns `{}`. |
| Unknown `channelId` or `styleId` passed via CLI/Discord | `config/schema.js` / managers | Falls back to `'kausalmedia'` channel and `'kausalmedia'` style with a warning log instead of crashing. |
| `agy` CLI binary missing or times out in `vector-html` mode | `engine/visual-engine.js` | Falls back to deterministic SVG/HTML blueprint card generator using the scene's narration & metrics. |
| `subtitles: { enabled: false }` or `--no-subtitles` | `engine/stage-generator.js` | Does not mount `#layer-5-subtitles`; sets `#layer-3-sandbox` safe-area height to `92%`. |
| Memory pressure before Chromium launch | `scripts/vector-db.js` & `scripts/pipeline.js` | Calls `await disposeVectorDb()` and `if (global.gc) global.gc()` at the end of Stage 5 before Stage 6/7. |
| `generate-trending-ideas.js` invoked repeatedly | `channels/channel-ideas.js` | Writes to `config/trending-ideas.json` with a 100-item FIFO cap per channel; `channels/*.json` size remains unchanged (<5KB). |

---

## 5. End-to-End Execution Flow

1. **Trigger (`CLI` or `discord-bot.js`):** User invokes `node scripts/pipeline.js --channel nusantaraarchive --variant chronicle-deepdive --visual-engine vector-html --no-subtitles --topic "Sejarah Jalur Rempah"` (or selects those options in `/ainimate create`).
2. **Config Normalization (`config/schema.js`):** `parseCliArgsToConfig()` parses flags and `normalizePipelineConfig()` merges defaults from `channel-manager.getChannelProfile('nusantaraarchive')` and `style-manager.getStyleProfile('investigative-documentary')`.
3. **Ledger Registration (`workflow-controller.js` & `workflow-ledger.js`):** Persists the normalized `PipelineConfig` object in the workflow ledger and spawns worker with `NODE_OPTIONS="--expose-gc --max-old-space-size=1024"`.
4. **Script & Hook Generation (`pipeline.js` Stages 1–3):** Resolves `variant` (`chronicle-deepdive`), injects the channel's `editorialDna`, `antiSlopRules`, `hookInstruction`, and `narrativeBeats` into `prompt-manager.js`, and generates the timed storyboard beats.
5. **Audio & Word Alignment (`tts.js` & `audio-mixer.js` Stage 4):** Synthesizes narration using `channelProfile.voice.voiceId`, extracts neural word boundaries, and mixes sidechain-ducked broadcast audio.
6. **Dual Visual Engine (`engine/visual-engine.js` Stage 5):** Routes each beat according to `pipelineConfig.visualEngine` (`'vector-html'`, `'ai-image'`, or `'hybrid'`). Writes raster images as `.jpg`/`.png` files in `build/<jobId>/assets/` (never Base64) and compiles sanitized HTML/SVG for vector beats.
7. **Memory Reclamation (`vector-db.js`):** Calls `await disposeVectorDb()` to release `@xenova/transformers` memory and triggers `global.gc()`.
8. **Stage Compilation (`engine/stage-generator.js` Stage 6):** Writes a `<100KB` `build/<jobId>/stage.html` with locked Layers 0–2 brand shell (`investigative-documentary`), active-scene mounting in Layer 3, omitted Layer 5 subtitles (`--no-subtitles`), and `window.__seekTo(ms)`.
9. **Deterministic Render (`scripts/render.js` Stage 7):** Starts local static HTTP server for `build/<jobId>`, steps `window.__seekTo(ms)` in low-RAM Chromium, pipes JPEG frames into `ffmpeg -f image2pipe`, and outputs final `.mp4`.

---

## 6. Atomic Sub-Agent Execution Phases

### Phase 0: MOA Initialization & Disk Persistence (Executed by MOA Directly)
### Phase 1: Dead Script Cleanup, `tts.js` Export Fix & Canonical `PipelineConfig` Schema
### Phase 2: Channel Profiles Debloat, Ring-Buffer Topic Storage & Variants
### Phase 3: Style Engine Upgrade & Deterministic Brand Chrome Compiler
### Phase 4: Dual Visual Engine (`vector-html` | `ai-image` | `hybrid`) & Prompt Upgrade
### Phase 5: 5-Layer `stage-generator.js` Refactor (Active-Scene DOM, Subtitle Toggle & Virtual Clock)
### Phase 6: Low-Memory Ephemeral HTTP Server & `image2pipe` Deterministic `render.js`
### Phase 7: End-to-End Pipeline Orchestration & Discord Control Surface Wiring
### Phase 8: Comprehensive Architecture & Integration Verification Suite
