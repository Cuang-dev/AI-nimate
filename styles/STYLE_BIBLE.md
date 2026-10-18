# AI-nimate Comic Editorial Style Bible 🎨📖

> **Official Visual Identity & Composition Standard for Kausal Media Productions**  
> *Establishing consistent editorial comic art, flexible scene perspectives, dual layout modes, and progressive disclosure.*

---

## 1. Executive Aesthetic Standards

The visual identity of Kausal Media documentary essays is built on **approachable, street-smart editorial comic illustration**. The style bridges serious forensic analysis with warm, engaging comic storytelling.

```
       [Visual Identity Matrix]
       ┌────────────────────────────────────────────────────────┐
       │ Linework:    3px–4px crisp black contour ink strokes   │
       │ Palette:     Warm terracotta, sage, slate, ochre       │
       │ Hero Ground: Warm parchment / off-white (#F8F5EE)      │
       │ Dimensions:  Dual Mode (Centered Hero & Fullsize 16:9) │
       │ Perspective: Flexible 2D / 2.5D (Front, 3/4, Wide)    │
       │ Labels:      Dynamic Progressive Pop-in (No baked mess)│
       └────────────────────────────────────────────────────────┘
```

---

## 2. Core Visual Pillars

### 1. Linework & Contour
- **Stroke**: Heavy, clean, closed black ink contours (`#1c1917` / `#000000`) equivalent to 3px–4px brush pen strokes.
- **Form**: Expressive comic forms with subtle line-weight variation.
- **Forbidden**: Fuzzy pencil sketches, charcoal scrawls, 3D CGI specular bevels, muddy photorealism.

### 2. Color Palette & Shading
- **Ground Color**: `#F8F5EE` (warm off-white cream) for hero spot illustrations.
- **Color Fills**: Soft-cel and flat gouache washes with gentle muted tones:
  - 🏺 **Terracotta / Rust**: `#C2593F`, `#D97706` (money, bricks, emphasis)
  - 🌿 **Sage / Forest Green**: `#4A7C59`, `#15803D` (Fore brand, plants, logistics)
  - 🌊 **Slate / Navy**: `#334155`, `#1E293B` (architecture, glass, uniforms)
  - 🌾 **Warm Ochre / Sand**: `#EAB308`, `#F59E0B`, `#FDE68A` (store lighting, wood)
- **Shading**: Clean cel shading and soft directional tints. Never heavy black ambient occlusion or ray-traced shadows.

### 3. Perspective: Freedom from Isometric Lock
- **Flexible Perspective**: Scenes must adopt the perspective that best serves the narrative beat:
  - **Frontal Eye-Level**: Store counters, cash registers, restaurant facades.
  - **3/4 Dimensional**: Multi-level buildings (kos-kosan), cars, machines, coffee cups.
  - **Wide Environmental Angle**: Highway toll booths, amusement parks, neighborhood streets.
- **Rule**: Never force a scene to be isometric if a straight-on or cinematic 3/4 view is more natural and expressive.

---

## 3. Dual Layout Modes

The playback engine ([engine/stage-generator.js](file:///home/agent/orca/AI-nimate/engine/stage-generator.js)) supports two primary staging modes:

### Mode A: Centered Hero Asset (`layout: 'hero'`, Default)
- **Framing**: Single subject isolated in the center (`58%` width / `65%` height in 16:9), floating over the parchment textured background with subtle drop shadow.
- **Usage**: Props, products, balance sheet icons, key financial artifacts (e.g. coffee cup, money stack, single building).
- **Subtitles**: Clear contrast against the parchment paper canvas.

### Mode B: Fullsize 16:9 Comic Art (`layout: 'fullsize'`)
- **Framing**: Edge-to-edge 1920x1080 comic environment illustration covering the full viewport with slow Ken Burns drift (`scale(1.0) -> scale(1.04)`).
- **Usage**: Establishing scenes, streetscapes, toll gates, crowded storefronts, neighborhood views.
- **Scrim**: The engine automatically renders a bottom gradient scrim (`rgba(20, 16, 12, 0.88)` to transparent) ensuring 100% crisp subtitle legibility over any illustration.

---

## 4. Progressive Disclosure (Delayed Label Reveals)

In forensic storytelling, showing all numbers and labels immediately overwhelms the viewer. The Style Bible enforces **progressive disclosure**:

```
[Beat Start: 0.0s] ──► Clean Hero Asset Enters (Uncluttered visual hook)
       │
[Delay: +1.5s - 2.0s] ──► Labels & Callouts Pop In (Ingredient / price badges reveal)
```

### Implementation Rules:
1. **Never bake arrows or text walls into the base image prompt**: Baked AI text frequently hallucinates ("DUNA DUFAN", scrambled digits) and clutters the composition.
2. **Dual-Asset Switch**: When complex illustration changes are needed, provide `sc.exhibit.src` (clean) and `sc.exhibit.src_labeled` (with tags). The engine cross-fades them smoothly at $t + 2\text{s}$.
3. **DOM Comic Badges**: Define `sc.labels = [{ text: '1.50 Susu', x: 25, y: 30 }]`. The engine renders crisp, scale-animated comic badges with black borders that bounce in cleanly.

---

## 5. Brand Logos & Trademark Guidance

### Can Nano Banana generate brand logos?
**Yes.** Nano Banana and Gemini Imagen models generate recognizable brand iconography (e.g. Fore Coffee leaf, Pertamina logo, Mie Gacoan sign, Dufan mascot) when prompted.

### Legal & Platform Compliance:
- **Editorial Fair Use**: In documentary video essays, financial analysis, news reporting, and comparative consumer reviews, depicting real brands and trademarks is protected fair use under international and Indonesian IP law.
- **No False Endorsement**: The narration should never falsely claim the video is an official commercial advertisement sponsored by the brand.
- **Fidelity Reality**: Because generative AI can occasionally alter minor typography on small signs, high-stakes brand logos should either be verified or paired with clean overlay graphics.

---

## 6. Official Reference Asset Catalog

The canonical visual references are stored in [assets/style-bible/](file:///home/agent/orca/AI-nimate/assets/style-bible/):

| Ref File | Layout Mode | Subject / Perspective | Key Visual Attributes |
|---|---|---|---|
| [01_fore_coffee_storefront_fullsize.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/01_fore_coffee_storefront_fullsize.jpg) | Fullsize 16:9 | 3/4 Cafe Storefront | Wood/glass architecture, green Fore logo, customer seating, Gojek motorbike |
| [02_jalan_tol_environment_fullsize.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/02_jalan_tol_environment_fullsize.jpg) | Fullsize 16:9 | Wide Perspective Highway | Indonesian toll booths ("GERBANG TOL"), cars, trucks, sky with soft clouds |
| [03_mie_gacoan_storefront_fullsize.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/03_mie_gacoan_storefront_fullsize.jpg) | Fullsize 16:9 | Frontal / 3/4 Restaurant | Industrial barn facade, fairy lights, long customer queue |
| [04_laundry_kiloan_hero_storefront.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/04_laundry_kiloan_hero_storefront.jpg) | Centered Hero | Eye-level Storefront | "LAUNDRY KILOAN" sign, washing machines, ironing station, delivery bike |
| [05_kontrakan_neighborhood_fullsize.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/05_kontrakan_neighborhood_fullsize.jpg) | Fullsize 16:9 | 3/4 Street Perspective | Row of Indonesian rental houses, motorbikes, laundry lines, Aqua water gallons |
| [06_dufan_amusement_park_fullsize.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/06_dufan_amusement_park_fullsize.jpg) | Fullsize 16:9 | Cinematic Wide Park | Roller coaster rush, carousel, Dufan mascot characters |
| [07_kos_kosan_hero_building.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/07_kos_kosan_hero_building.jpg) | Centered Hero | 3/4 Building + Money | Modern multi-story kos-kosan with solar panels, green plants, rupiah cash |
| [08_nano_banana_editorial_comic_verification.jpg](file:///home/agent/orca/AI-nimate/assets/style-bible/08_nano_banana_editorial_comic_verification.jpg) | Centered Hero | Verified Native Generation | Stock market balance sheet and factory illustration generated directly via Nano Banana |
| [09_fore_coffee_cup_hero_annotated.png](file:///home/agent/orca/AI-nimate/assets/style-bible/09_fore_coffee_cup_hero_annotated.png) | Centered Hero | Coffee Cup + Cost Bubbles | Center Fore cup with orbiting ingredient cost callouts (progressive reveal model) |
| [10_kos_kosan_hero_diagram.png](file:///home/agent/orca/AI-nimate/assets/style-bible/10_kos_kosan_hero_diagram.png) | Centered Hero | Building vs Deposit Diagram | Clean comparison layout with building, cash stack, and deposit certificate |

---

## 7. Telegram Reference Ingest System

Whenever visual reference photos or sketches are forwarded to the Telegram bot (`@ai_nimatebot`), the daemon automatically:
1. Downloads the highest available resolution image via Telegram's `getFile` API.
2. Saves the image into `assets/style-bible/ref_<timestamp>_<id>.jpg`.
3. Preserves any caption as companion metadata (`ref_<timestamp>_<id>.json`).
4. Confirms receipt in chat with direct file path information.
