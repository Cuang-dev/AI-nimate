---
name: visual-scene-director
description: Visual scene composition, channel style profiles, and modular 5-layer choreography guide for AI-nimate. Directs sub-agents to compose scenes using environment textures, exhibits, dynamic annotations, data blocks, and typography rather than rigid slide templates.
---

# Visual Scene Director: Channel Style Templates & Composable Scene Architecture

This skill governs channel visual identities, background atmospheres, and modular scene choreography for AI-nimate video productions.

---

## 1. The Channel Style Profile (Aesthetic DNA)

Instead of rigid per-scene slide templates, production identity is governed by **Channel Style Profiles** located in [`styles/`](file:///home/agent/orca/AI-nimate/styles/):

| Profile | Theme & Mood | Canvas Background & Pattern | Palette & Accents | Typography & Subtitles |
| :--- | :--- | :--- | :--- | :--- |
| `investigative-documentary` | Vox / Johnny Harris journalism | Archival ivory paper + `megamendung` + desk-lamp | `navy-gold` (amber highlight, red stamp) | Serif headline, frosted pill subtitles |
| `financial-explainer` | Bloomberg / IDX capital markets | Ledger parchment + `kawung` + spotlight | `emerald-teal` (emerald stamp, mint glow) | Clean sans, financial table chips |
| `tech-deepdive` | Architecture teardown | Drafting paper + `truntum` + edge-glow | `monochrome-slate` (technical cyan) | Monospace metrics, blueprint cards |
| `viral-shortform` | 9:16 TikTok / YouTube Shorts | Newsprint + `parang` + center spotlight | `charcoal-amber` (high contrast amber) | Center-punch dynamic bold subtitles |

The Style Profile sets the default background, lighting vignette, color palette, audio ducking, and sub-agent styling tips for the entire video.

---

## 2. Streamlined Single Hero Asset Architecture

To maintain high visual elegance and avoid clutter, production focuses on a **Single Hero Asset in the Middle**:

```
[Layer 1: Environment & Canvas]  (Batik watermark, aged papyrus #faf6ee, double hairline border)
       │
       ▼
[Layer 2: Single Hero Exhibit]   (Centered Ligne Claire spot illustration / authentic document)
       │
       ▼
[Layer 3: Single-Line Subtitle]  (Synchronized phrase window with active word karaoke highlight)
```

### Critical Visual Directives
1. **Middle Hero Focus**: 100% of scenes feature a single hero illustration centered with comfortable margins, floating seamlessly with a subtle drop shadow on the papyrus canvas.
2. **Zero Top-Right Clutter**: Dynamic annotations, cinnabar rubber stamps, and corner badges are disabled by default to keep the audience's attention locked on the central visual exhibit.
3. **Zero HTML/CSS Wireframe Cards**: Absolute prohibition on HTML/CSS, styled `<div>` cards, data metric blocks, slide bullet points, or table mockups.
4. **Transparent Alpha Knockout**: All generated exhibits must have transparent backgrounds (`alpha: 0`) rather than opaque white bounding boxes.
5. **Single-Line Subtitle Pill**: Subtitles display only 6 words per window (16:9) or 4 words (9:16) with active word gold highlight (`#b45309`), completely eliminating multi-line paragraph text dumps.

---

## 3. Sub-Agent Autonomous Workflow

Sub-agents work collaboratively within the chosen Channel Style Profile:

1. **Research Agent**: Collects verifiable numbers, dates, filings, and quotes into `dossier.json`.
2. **Scriptwriter Agent**: Writes narration conforming to the style's pacing (WPM), phonetic guidelines (`[BEI|B-E-I]`), and anti-slop rules.
3. **Audio Agent**: Synthesizes speech with Edge-TTS, extracts exact millisecond word timestamps into `timings.json`, and segments voiceover into natural narrative beats.
4. **Director Agent**:
   - Choreographs scenes around a single hero visual exhibit per beat.
   - Strictly avoids top-right badges, data cards, or slide text clutter.
   - Provides exhaustive natural-language visual descriptions for asset fulfillment.
5. **Asset Hub (Nano Banana)**:
   - Sourcing rule: Query local Vector DB (`channel: 'kausalmedia'`) or trigger Nano Banana (`scripts/nano-banana.js`) for style-locked Ligne Claire spot illustrations.
   - Strictly forbidden from generating HTML/CSS or SVG UI wireframe mockups.
6. **Renderer**: Renders final frames deterministically via Chromium CDP with sample-accurate audio synchronization and Playwright video recording.
