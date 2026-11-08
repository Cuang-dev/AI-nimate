---
name: visual-scene-director
description: Visual scene composition, channel style profiles, and modular visual architecture for AI-nimate. Directs sub-agents to compose scenes enforcing strict icon-only graphic marks, visual density caps, single slowed focal wobble, fast counter micro-choreography, and sample-accurate subtitles.
---

# Visual Scene Director: Production Standards & Composable Scene Architecture

This skill governs channel visual identities, stage choreography, and animation standards for AI-nimate video productions across Motion Canvas and HTML5/Chromium renderers.

---

## 1. Visual Hierarchy & Animation Standards

To prevent split attention between graphics, on-screen text, and subtitles, all scenes must obey these mandatory rules:

### Rule 1: Strict Icon-Only Logo & Authentic Vector Source Rule
- **Authentic Wikimedia Commons / Official Vector Logo Rule**: NEVER draw synthetic geometric stand-in logos with Python/PIL/Canvas or hallucinate brand marks with AI image generators when referencing real companies, stock exchanges, financial products, or government agencies (e.g., IDX, BCA, Interactive Brokers, IRS, EU/Ireland UCITS, Kemenkeu/DJP, OECD). Always fetch the authentic SVG/PNG from **Wikimedia Commons API (`commons.wikimedia.org/w/api.php`)**, **SimpleIcons**, or official brand repositories, and crop/extract the clean **logomark or official seal** (stripping only tiny multi-word taglines/wordmarks so the graphic mark sits cleanly beside the Motion Canvas `<Txt>` title).
- **100% Text-Free Transparent Graphics**: Any generated or imported PNG logo/emblem (`<Img>`) **MUST be a 100% text-free, square (`256x256`) graphic mark on a transparent background**.
- **Forbidden Baked Text**: NEVER bake small text, ticker labels (`IDX: BBCA`, `VOO`), subtitles, percentage figures, or rectangular card borders inside a PNG asset.
- **Crisp Vector Typography**: All text titles (`IDX: BCA`, `US DIVIDENDS`, `IRISH UCITS`), ticker labels, and figures must be rendered as crisp Motion Canvas `<Txt>` nodes beside the `<Img>` icon node.

### Rule 1B: Never Use Bare `<Camera>` with `opacity < 1` Children (The `worldSpaceCacheBBox` Invariant)
- **The Bug**: In `@motion-canvas/2d`, `<Camera>` creates a detached internal `this.scene = new Node({})` (`parent === null`), which loses `View2D`'s center-origin transform (`translate(width/2, height/2)`). Whenever any child has `opacity < 1` (during fades, transitions, or dimming), `Node.requiresCache()` intersects the child's bounding box against `[0..width, 0..height]` instead of `[-width/2..width/2, -height/2..height/2]`, slicing off the entire left half (`x < 0`) and top half (`y < 0`) of the canvas!
- **Mandatory Fix**: Always wrap scene diagrams in `<Node ref={stage}>` directly under `view` (or `<Camera.Stage width={width} height={height}>`), NEVER a bare `<Camera>`.

### Rule 2: Diagram-First Visual Storytelling (Ban Generic 2-Box Repeats)
- **Installed Skills Reference**: Always consult `~/.agents/skills/motion-canvas/SKILL.md` (`videozero/skills@motion-canvas`), `~/.agents/skills/diagram-design/SKILL.md` (`cathrynlavery/diagram-design`), and `~/.agents/skills/animation-basics/SKILL.md` before coding scenes.
- **Ban Consecutive Identical Two-Box Slides**: Never render 5 consecutive beats of "Box A vs Box B". Select a semantic diagram archetype (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Dual-Axis Parallel Timeline + Wall`, `Quantitative Slope / Decay Curve`, or `Architectural Layer Stack`) that physically acts out the mechanism of the sentence.
- **Orthogonal Connectors & Opaque Label Masks**: Connect diagram hubs with `<Line radius={20} end={0..1} endArrow />` animated via `end()` tweens. Every connector label MUST sit inside an opaque background `<Rect fill={COLORS.bg} stroke={COLORS.ink} padding={[8, 16]} layout>` so lines never bleed through text.
- **Auto-Sizing & Zero Squeezing**: Never stuff long strings and wide badges into a fixed-width row that crushes margins to `0px`. Keep pill badge text `<= 16` characters and stack or space elements with `>= 16px` clearance.
- **Strict Hold-Time Guard (`>= 2.7s` Before Beat End)**: The final visual element and animation in every beat MUST finish at least **`>= 2.7s` before `beat.end`** to ensure viewers can comprehend the complete diagram before the scene boundary, and parent diagram groups must NEVER fade out prematurely.
- **Minimum 20–36px Font Size**: Maintain high contrast and legible typography across both `16:9` (`1920x1080`) and `9:16` (`1080x1920`).

### Rule 3: Single Slowed Focal Wobble (Stillness by Default)
- **Zero Global Camera Wobble**: Never apply `Math.sin` or `Math.cos` position/rotation float or zoom creep to the outer stage wrapper (`<Node y={-60}>`).
- **Only Active Focal Element Moves**: Track active focus with a signal (`const focalId = createSignal(1)`).
- **Subtle Breathing Motion**:
  - **Active focal element** (`focalId() === id`): Receives a gentle, slowed breathing pulse (`focalScale` at `0.55 rad/s` breath of `±1.5%`, `focalRotation` at `0.45 rad/s` rotation tilt of `±0.4°`).
  - **Inactive elements** (`focalId() !== id`): Must remain **100% stationary** (`scale(1.0)`, `rotation(0)`), dimmed to `opacity: 0.22`.
  - Inactive elements never oscillate or wobble.

### Rule 4: Chapters vs. Beats & Dual Stage Modes (`full_comic_16x9` vs. `explainer_2x2`)
- **Canonical Terminology (`Chapters` = Macro Sub-Chapters, `Beats` = Sentence/Clause Visual Triggers)**:
  - **Chapter (`chapter_01`..`chapter_NN`)**: A macro narrative sub-chapter where one stage layout stays on screen; starting a new Chapter clears the canvas and updates the top chapter brow badge.
  - **Beat (`beats: [...]` inside each Chapter)**: A sentence-level (or hook-clause-level) visual trigger (`yield* waitUntilSceneTime(...)`) synced to the exact spoken word in `timings.json`.
  - Every spoken sentence in `spoken_text` MUST trigger at least one Beat (`Check 16: Beat-Level Visual Cadence`), and **Chapter 1 (`The Hook`, `0s–18s`) MUST trigger rapid clause-level Beats every `2.0s–3.5s`** (at least 5–7 visual cues in the Hook) to lock in early viewer retention.
- **Two Stage Modes Available per Chapter (`full_comic_16x9` & `explainer_2x2`)**:
  - **Option 1 (`stage_mode: "full_comic_16x9"` — Full-Screen `16:9` Flat 2D Indonesian Comic Art)**:
    - When a Chapter is narrative, observational, or physical storytelling and does not need a complex chart, use full-screen `16:9` (`1280x720`) flat 2D Indonesian comic panels generated 4-per-batch via a `16:9` `2x2` grid (`"aspect_ratio": "16:9"` in `nano_banana_batch_grid.py`).
    - Every sentence Beat swaps to a new `16:9` comic panel or animates camera focus + bold comic callout badges synced to `waitUntilSceneTime()`.
  - **Option 2 (`stage_mode: "explainer_2x2"` — Square `1:1` Flat 2D Indonesian Comic Art + Quantitative Diagram)**:
    - When a Chapter breaks down unit economics, financial waterfalls, receipts, or multi-axis charts, pair square `1:1` (`512x512`) flat 2D Indonesian comic panels (generated 4-per-batch via a `1:1` `2x2` grid) with a quantitative diagram archetype.
- **Chapter Pacing Guideline (Scriptwriter Discretion, Never Hardcoded)**:
  - *Guideline for what is "too many" vs. "too few" Chapters* (at the scriptwriter's editorial discretion, never a fixed cap):
    - **Too many Chapters**: Wiping the entire canvas every 5–10 seconds (1–2 sentences) causes visual whiplash. Keep related sentences inside the same Chapter.
    - **Recommended organic range**: **~12s–20s (3–5 sentences)** per Chapter for `9:16` Shorts (typically 4–6 Chapters for a 60–90s Short), and **~35s–65s (5–9 sentences)** per Chapter for `16:9` long-form essays (typically 7–14 Chapters for an 8–10 min video).
- **Strict Hold-Time Guard (`>= 2.7s` Before Chapter End)**: The final Beat animation in every Chapter MUST finish at least **`>= 2.7s` before the Chapter ends** so the viewer can absorb the completed frame before the stage clears.
- **Ban 10–12s Slow Tickers**: Number counter tweens must execute briskly in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure.
- **Post-Render Verification**: Always run `node scripts/qa_verify.mjs <video_id>` after every render to verify all 16 automated checks, including Check 16 (`Sentence/Beat-Level Visual Cadence`).

### Rule 5: Subtitle Integration & Lower-Third Clearance
- **Acoustic Lead (`LEAD_OFFSET = 0.22`)**: Advance subtitle word karaoke highlighting by `+220ms` (`t = time + 0.22`) to align with acoustic consonant onset.
- **Per-Beat Render Global Time Invariant (`sceneStart` Offset)**: Because `render_sequential.mjs` renders each beat (`beat_01`, `beat_02`, ...) as an isolated single-scene Motion Canvas project, `useThread().time()` resets to `0.00s` at the start of every beat. Therefore, `layout.tsx` MUST compute global subtitle lookup time as `const gt = sceneStart + (time() - t0) + LEAD_OFFSET;` (mapping the section label `01`..`06` to `SCENE_TIMINGS[sceneIdx].start`). Omitting `sceneStart` causes Beat 2..N to reset `gt` to `0.00s` and loop Beat 1's subtitles from the beginning at every scene boundary!
- **Stabilized Pill Geometry**: Every subtitle word slot must maintain constant padding (`padding={[18, 30]}` on 9:16 phone with `fontSize={44}` and slot `padding={[9, 14]}`; `padding={[14, 28]}` on 16:9 widescreen with `fontSize={38}` and slot `padding={[6, 10]}`), `radius`, and `scale={1.0}` whether active or inactive. Words must NEVER shift horizontally when highlighted.
- **Lower-Third Clearance**: Keep canvas area below `y = 655` clear of card borders, footnotes, or stamps so the subtitle pill exclusively commands the lower third.

### Rule 6: Physical Screen Calibration & Minimum Typography / Asset Sizing (9:16 Phone vs 16:9 Desktop)
- **Mandatory Shared Screen Calibration Module**: Every new project `vid_YYYYMMDD_NNN/layout.tsx` MUST import and re-export `getTypo(wide)` and `getAssets(wide)` from `src/shared/screenCalibration.ts` (or `../../shared/screenCalibration`) to standardize typographical hierarchy, stroke weights, and subtitle geometries.
- **Automated Font Floor QA Gate**: Always run `node scripts/qa_verify.mjs <project_id>` after writing scenes to verify the Phone Font Floor (`micro >= 18px` in 16:9, `>= 20px` in 9:16) with zero micro-font violations.
- **Anti-Pattern Banned**: Never make `9:16` (`1080x1920`) fonts or icons smaller than `16:9` (`1920x1080`) using `wide ? 24 : 15`.
- **Why**:
  - `9:16` (`1080x1920`) is viewed almost exclusively on **6.1"–6.7" smartphones** (~390 CSS px wide, `0.36x` scale factor). A `15px` canvas font shrinks to **`5.4px` CSS (`~0.9mm`)** on a phone screen—completely illegible without zooming!
  - `16:9` (`1920x1080`) is viewed on **14"–27" laptops/monitors or landscape players** (~960–1920 CSS px wide).
- **Mandatory Minimum Canvas Sizing Table**:

| Element Tier | 16:9 Widescreen (`1920x1080`) | 9:16 Vertical Phone (`1080x1920`) | Physical Phone CSS Equivalent (`0.36x`) |
| :--- | :--- | :--- | :--- |
| **Absolute Minimum Font Floor** | **`>= 18px`** | **`>= 20px`** (never `11–16px`) | `>= 7.2px` CSS |
| **Axis Ticks / Micro-Tags** | `18px–20px` | `20px–22px` | `7.2px–8.0px` CSS |
| **Callout Pills / Data Badges** | `22px–28px` | `22px–26px` | `8.0px–9.4px` CSS |
| **Card / Track Headings** | `32px–38px` | `34px–38px` | `12.2px–13.7px` CSS |
| **Hero Numbers / Counters** | `42px–48px` | `40px–46px` | `14.4px–16.6px` CSS |
| **Subtitle Pill Text** | `38px` (`padding [14, 28]`) | `44px` (`padding [18, 30]`) | `15.8px` CSS |
| **Section Indicator (`01 // ...`)** | `26px` | `30px` | `10.8px` CSS |
| **Square Logos / Icons** | `50px–60px` | `56px–70px` | `20px–25px` CSS |
| **Wide Multi-Brand Badges (`2:1`)** | `110x55` to `120x60` | `128x64` to `140x70` | `46x23` to `50x25` CSS |
| **Active Diagram Canvas Utilization** | `>= 70%` width (`1340px+`), `>= 55%` height | `>= 82%` width (`880px–940px`), `>= 50%` height (`750px–950px`) | Full mobile viewport command |

### Rule 7: Perpendicular Box-Edge Arrow Entry & Conduit Geometry (Cyclic & Flow Diagrams)
- **Anti-Pattern Banned**: Never route an orthogonal conduit or arrow parallel/flush along a card's top/bottom border (`[x1, cardEdgeY] -> [x2, cardEdgeY]`) or point sideways into a horizontal edge (or vertically into a vertical edge).
- **Mandatory Rule**:
  - Every arrow or conduit connecting two nodes/stations MUST exit **perpendicularly** (`90°`) from the source card's edge and enter **perpendicularly** (`90°`) into the target card's edge, with `4px–8px` clearance so the arrowhead tip lands cleanly at the border.
  - **In `9:16` Vertical Stacked Flow/Cyclic Graphs** (Station 1 at top `y = hubAY`, Station 2 at bottom `y = hubBY`):
    - Use **straight vertical conduits** connecting the bottom edge of Station 1 (`y = hubAY + cardHalfH`) and the top edge of Station 2 (`y = hubBY - cardHalfH`):
      - Outbound (Left): `[[-offsetX, hubAY + cardHalfH], [-offsetX, hubBY - cardHalfH - 4]]` (pointing straight down).
      - Return (Right): `[[+offsetX, hubBY - cardHalfH], [+offsetX, hubAY + cardHalfH + 4]]` (pointing straight up).
    - Stagger conduit callout pills vertically across the gap (`y_out = -180`, `y_center = -55`, `y_ret = +70`) so each pill masks its own vertical conduit line and never collides horizontally.
  - **In `16:9` Widescreen Side-by-Side Cyclic Graphs** (Station 1 at left `x = hubAX`, Station 2 at right `x = hubBX`):
    - Exit vertically (`90°`) from the top edge (`hubAY - cardHalfH`) up to an overhead rail (`hubAY - 245`), cross horizontally, and drop vertically (`90°`) into the top edge of Station 2 (`hubBY - cardHalfH`); mirror on the bottom for the return conduit.
- **Automated QA Verification**: The Perpendicular Conduit Check in `node scripts/qa_verify.mjs <project_id>` scans all `beat_*.tsx` files for any 4-point `<Line` `points` array sharing identical `y` expressions at the start or end, rejecting sideways border-flush entries.

---

## 2. Channel Style Profiles (Aesthetic DNA)

Production aesthetics are governed by Channel Style Profiles located in `styles/`:

| Profile | Theme & Mood | Canvas Background & Pattern | Palette & Accents | Typography & Subtitles |
| :--- | :--- | :--- | :--- | :--- |
| `investigative-documentary` | Vox / Johnny Harris journalism | Archival ivory paper + `megamendung` + desk-lamp | `navy-gold` (amber highlight, red stamp) | Serif headline, frosted pill subtitles |
| `financial-explainer` | Bloomberg / IDX capital markets | Ledger parchment + `kawung` + spotlight | `emerald-teal` (emerald stamp, mint glow) | Clean sans, financial table chips |
| `tech-deepdive` | Architecture teardown | Drafting paper + `truntum` + edge-glow | `monochrome-slate` (technical cyan) | Monospace metrics, blueprint cards |
| `viral-shortform` | 9:16 TikTok / YouTube Shorts | Newsprint + `parang` + center spotlight | `charcoal-amber` (high contrast amber) | Center-punch dynamic bold subtitles |

---

## 3. Sub-Agent Autonomous Production Workflow

1. **Research Agent (`SubAgent_Scout`)**:
   - Collects verified numbers, statutory citations (`UU HPP`, `PMK 18/2021`, `US IRC §2101`), and real tickers (`BBCA.JK`, `VOO`, `CSPX`).
   - Packages findings into the **5 Distinct Spatial Diagram Archetypes** (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Dual-Axis Parallel Timeline + Wall`, `Quantitative Slope / Decay Curve`, `3-Tier Architectural Layer Stack`) rather than generic 2-box cards.
2. **Scriptwriter Agent (`SubAgent_Writer`)**:
   - Enforces Sample-Accurate Acoustic-to-Visual Sync (every major visual reveal triggered within `±0.3s` of spoken word in `timings.json`; intermediate micro-cues every `2.0s–2.8s`; zero static stretches `> 3.0s`; final element finishes `>= 2.7s` before beat end).
   - Writes explicit phonetic hints (`[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`).
   - Annotates intermediate sub-cues (`[VISUAL CUE: action | target | trigger_phrase]`).
3. **Voice Synthesis & Subtitle Alignment Agent (`SubAgent_TTS`)**:
   - Synthesizes bilingual voiceovers via VoxCPM2 (OpenBMB/VoxCPM2, 48kHz), Qwen3-TTS, IndexTTS2, or ElevenLabs v4.
   - Runs domain normalization dictionary (`Peluang` -> `Pluang`, `SNP` -> `S&P`, `state tax` -> `estate tax`).
   - Enforces scene-bounded chunking (max 4 words / 25 chars, clamped strictly to `scene.startTime <= chunk.start < chunk.end <= scene.endTime`).
4. **Director & Motion Canvas Animator (`SubAgent_Animator`)**:
   - Wraps all scene diagrams in `<Node ref={stage}>` directly under `view` (never bare `<Camera>`, guarding the `worldSpaceCacheBBox` invariant).
   - Implements the 5 Distinct Spatial Diagram Archetypes with 36px min font size and text-free icon graphic marks with crisp `<Txt>` nodes.
   - Enforces the Authentic Wikimedia Commons / Official Vector Logo Rule (fetching real logomarks; banning synthetic PIL or AI fakes).
   - Enforces Per-Beat Render Global Time Invariant (`sceneStart` offset in `layout.tsx` via `.startsWith('01'..'06')` so `gt = sceneStart + (time() - t0) + LEAD_OFFSET`).
   - Enforces Zero-Empty-Slot Flexbox Gap Rule on the subtitle pill bar (`gap={0}` on parent `<Rect>`, `[0, 1, 2, 3]` slots, conditional padding e.g. `[9, 14]` phone / `[6, 10]` wide on active slots and margin `[0, 11, 0, 0]` phone / `[0, 8, 0, 0]` wide only on `slotIdx < chunk.words.length - 1`, eliminating trailing right-side margin from unused slots).
   - Enforces Physical Screen Calibration & Minimum Typography / Asset Sizing (imports `getTypo` and `getAssets` from `src/shared/screenCalibration.ts`; never `wide ? 24 : 15`; absolute minimum font floor `>=20px` phone / `>=18px` wide; subtitle pill text `44px` phone / `38px` wide; canvas width utilization `>=82%` phone / `>=70%` wide).
   - Enforces Perpendicular Box-Edge Arrow Entry & Conduit Geometry (90° exit/entry; straight vertical left/right conduits in 9:16 stacked cyclic graphs connecting bottom of top card to top of bottom card with vertically staggered callout pills).
   - **Enforces the Outer Card `<Rect>` Non-Flex Rule**: Never put `layout` on an outer card `<Rect>` container that holds stacked cross-fading `<Img>` panels or coordinate-positioned `<Line>`/`<Txt>` charts (because in `@motion-canvas/2d`, Yoga flex cascades through `<Node>` to all descendant `Layout` nodes, pushing second images out of `clip` frames and collapsing chart coordinates). Keep outer card `<Rect>` containers non-flex (position children via `x`/`y`) and apply `layout` only to leaf pills, badges, and table rows.
   - Configures `focalId` breathing pulse (0.55 rad/s, 0.45 rad/s) and stillness for inactive elements.
   - Ties major visual reveals and number counters to 1.0s–1.8s tweens triggered within `±0.3s` of narration word timestamps in `timings.json`, completing all motion `>= 2.7s` before beat end.
5. **Asset Hub (`nano-banana-asset-generator` / `SubAgent_Assets`)**:
   - Uses **Nano Banana 2 Lite** (`models/gemini-3.1-flash-image-preview`) via `:batchGenerateContent` in [`motion-canvas/scripts/nano_banana_batch_grid.py`](file:///home/agent/orca/AI-nimate/motion-canvas/scripts/nano_banana_batch_grid.py) (`NANO_BANANA_API_KEY` in `.env`) to generate consistent **Flat 2D Indonesian Comic Illustrations** in **2x2 grids** grouped by aspect ratio:
     - **`"aspect_ratio": "16:9"` (`Option 1: full_comic_16x9`)**: 4 widescreen `16:9` comic scenes per grid (`2752x1536`), auto-sliced into `1280x720` (`16:9`) PNG panels.
     - **`"aspect_ratio": "1:1"` (`Option 2: explainer_2x2`)**: 4 square `1:1` comic scenes per grid (`2048x2048`), auto-sliced into `512x512` (`1:1`) PNG panels.
   - Runs automated + VLM vision QA on every sliced panel and **re-queues any failed panel into a new 2x2 grid** along with other failures or the next batch until `all_passed: true`.
   - Fetches authentic SVG/PNG logomarks or official seals from Wikimedia Commons API (`commons.wikimedia.org/w/api.php`) or SimpleIcons when referencing specific real-world corporate/statutory logos (IDX, BCA, Interactive Brokers, IRS, UCITS, Kemenkeu/DJP, OECD).
   - Generates 100% text-free PNG illustrations/marks so all typography is rendered as crisp Motion Canvas `<Txt>` nodes.
6. **Multimodal Visual QA Inspector (`SubAgent_QA`)**:
   - Executes `node scripts/qa_verify.mjs <video_id>` after every render to verify sample-accurate timing sync (`±0.3s`), hold times (`>= 2.7s`), absence of static stretches `> 3.0s`, authentic logo rules, `<Node ref={stage}>` wrapping, subtitle clearance, phone font floor (`>= 18px`), and perpendicular conduit geometry.
