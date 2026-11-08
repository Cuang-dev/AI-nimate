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

### Rule 2: Diagram-First Visual Storytelling (Ban Generic 2-Box Repeats)
- **Installed Skills Reference**: Always consult `~/.agents/skills/motion-canvas/SKILL.md` (`videozero/skills@motion-canvas`), `~/.agents/skills/diagram-design/SKILL.md` (`cathrynlavery/diagram-design`), and `~/.agents/skills/animation-basics/SKILL.md` before coding scenes.
- **Ban Consecutive Identical Two-Box Slides**: Never render 5 consecutive beats of "Box A vs Box B". Select a semantic diagram archetype (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Parallel Timeline Race + Wall`, `Slope / Decay Curve Chart`, or `Architectural Layer Stack`) that physically acts out the mechanism of the sentence.
- **Orthogonal Connectors & Opaque Label Masks**: Connect diagram hubs with `<Line radius={20} end={0..1} endArrow />` animated via `end()` tweens. Every connector label MUST sit inside an opaque background `<Rect fill={COLORS.bg} stroke={COLORS.ink} padding={[8, 16]} layout>` so lines never bleed through text.
- **Auto-Sizing & Zero Squeezing**: Never stuff long strings and wide badges into a fixed-width row that crushes margins to `0px`. Keep pill badge text `<= 16` characters and stack or space elements with `>= 16px` clearance.
- **Strict Hold-Time Guard (`>= 2.0s` Before Beat End)**: The final sub-element animation in every beat MUST complete at least **`2.0s–2.5s` before `beatDuration`**, and parent diagram groups must NEVER fade out at the end of a beat before the viewer reads the final reveal.
- **Minimum 20–36px Font Size**: Maintain high contrast and legible typography across both `16:9` (`1920x1080`) and `9:16` (`1080x1920`).

### Rule 3: Single Slowed Focal Wobble (Stillness by Default)
- **Zero Global Camera Wobble**: Never apply `Math.sin` or `Math.cos` position/rotation float or zoom creep to the outer stage wrapper (`<Node y={-60}>`).
- **Only Active Focal Element Moves**: Track active focus with a signal (`const focalId = createSignal(1)`).
- **Subtle Breathing Motion**:
  - **Active focal element** (`focalId() === id`): Receives a gentle, slowed breathing pulse (`focalScale` at `0.55 rad/s` breath of `±1.5%`, `focalRotation` at `0.45 rad/s` rotation tilt of `±0.4°`).
  - **Inactive elements** (`focalId() !== id`): Must remain **100% stationary** (`scale(1.0)`, `rotation(0)`), dimmed to `opacity: 0.22`.
  - Inactive elements never oscillate or wobble.

### Rule 4: Zero-Dead-Air Visual Cadence & Fast Micro-Choreography
- **Zero-Dead-Air Visual Cadence Rule**: Eliminate visual stagnation (>3.5s without visual arrivals). Enforce rapid visual cuts or progressive sub-cue reveals every **2.5s–3.5s** (or 6–10 words; 6–8 micro-events in 18–25s beats).
- **Ban 10–12s Slow Tickers**: Number counter tweens must execute briskly in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure.
- **Intermediate Choreography During Setup**: While the narrator explains context before the figure, choreograph intermediate visual steps:
  1. Card progressive entry (`opacity: 0 -> 1`, `scale: 0.95 -> 1.0` or `[data-subcue-progress="0.0"]`)
  2. Category badge pop (`[data-subcue-progress="0.25"]`)
  3. Bracket step-up progression (`18% -> 28% -> 40%`, `[data-subcue-progress="0.50"]`)
  4. Red warning stamp or seal slam (`[data-subcue-progress="0.75"]`)
- **No Wall of Cards at `t = 0`**: Only Focal Element 1 appears at scene start; subsequent elements enter sequentially on narration cues.

### Rule 5: Subtitle Integration & Lower-Third Clearance
- **Acoustic Lead (`LEAD_OFFSET = 0.22`)**: Advance subtitle word karaoke highlighting by `+220ms` (`t = time + 0.22`) to align with acoustic consonant onset.
- **Per-Beat Render Global Time Invariant (`sceneStart` Offset)**: Because `render_sequential.mjs` renders each beat (`beat_01`, `beat_02`, ...) as an isolated single-scene Motion Canvas project, `useThread().time()` resets to `0.00s` at the start of every beat. Therefore, `layout.tsx` MUST compute global subtitle lookup time as `const gt = sceneStart + (time() - t0) + LEAD_OFFSET;` (mapping the section label `01`..`06` to `SCENE_TIMINGS[sceneIdx].start`). Omitting `sceneStart` causes Beat 2..N to reset `gt` to `0.00s` and loop Beat 1's subtitles from the beginning at every scene boundary!
- **Stabilized Pill Geometry**: Every subtitle word slot must maintain constant `padding={[6, 10]}`, `radius={8}`, and `scale={1.0}` whether active or inactive. Words must NEVER shift horizontally when highlighted.
- **Lower-Third Clearance**: Keep canvas area below `y = 655` clear of card borders, footnotes, or stamps so the subtitle pill exclusively commands the lower third.

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
   - Packages findings into side-by-side numeric `contrastPairs` (`Status Quo / Illusion` vs `Forensic Reality / Optimized Alternative`).
2. **Scriptwriter Agent (`SubAgent_Writer`)**:
   - Enforces Zero-Dead-Air Visual Cadence (concrete visual change or sub-cue every 2.5–3.5 seconds / 6–10 words; 6–8 micro-events in 18–25s beats; bans 10–15s expository lulls and >3.5s visual stagnation).
   - Writes explicit phonetic hints (`[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`).
   - Annotates intermediate sub-cues (`[VISUAL CUE: action | target | trigger_phrase]`).
3. **Voice Synthesis & Subtitle Alignment Agent (`SubAgent_TTS`)**:
   - Synthesizes bilingual voiceovers via VoxCPM2 (OpenBMB/VoxCPM2, 48kHz), Qwen3-TTS, IndexTTS2, or ElevenLabs v4.
   - Runs domain normalization dictionary (`Peluang` -> `Pluang`, `SNP` -> `S&P`, `state tax` -> `estate tax`).
   - Enforces scene-bounded chunking (max 4 words / 25 chars, clamped strictly to `scene.startTime <= chunk.start < chunk.end <= scene.endTime`).
4. **Director & Motion Canvas Animator (`SubAgent_Animator`)**:
   - Implements 2-card maximum density, 36px min font size, and text-free icon graphic marks with crisp `<Txt>` nodes.
   - Enforces the Authentic Wikimedia Commons / Official Vector Logo Rule (fetching real logomarks; banning synthetic PIL or AI fakes).
   - Enforces Per-Beat Render Global Time Invariant (`sceneStart` offset in `layout.tsx` via `.startsWith('01'..'06')` so `gt = sceneStart + (time() - t0) + LEAD_OFFSET`).
   - Enforces Zero-Empty-Slot Flexbox Gap Rule on the subtitle pill bar (`gap={0}` on parent `<Rect>`, `[0, 1, 2, 3]` slots, conditional `padding={[6, 10]}` on active slots and `margin={[0, 8, 0, 0]}` only on `slotIdx < chunk.words.length - 1`, eliminating trailing right-side margin from unused slots).
   - Configures `focalId` breathing pulse (0.55 rad/s, 0.45 rad/s) and stillness for inactive elements.
   - Ties number counters to 1.0s–1.8s tweens at exact narration timestamps.
5. **Asset Hub (`SubAgent_Assets`)**:
   - Fetches authentic SVG/PNG logomarks or official seals from Wikimedia Commons API (`commons.wikimedia.org/w/api.php`) or SimpleIcons for all real-world entities (IDX, BCA, Interactive Brokers, IRS, UCITS, Kemenkeu/DJP, OECD).
   - Strictly forbidden from generating synthetic geometric stand-ins with Python/PIL or hallucinating brand marks with AI image models.
   - Generates/sources 100% text-free square (256x256) PNG graphic marks on transparent backgrounds.
6. **Multimodal Visual QA Inspector (`SubAgent_QA`)**:
   - Audits rendered keyframes against authentic logo rules, icon-only standards, 2-card density cap, subtitle clearance, and absence of camera wobble.
