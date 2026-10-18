# Nano Banana Asset Generation Style Guide 🍌✨

> **Official Visual Identity & Prompt Specification for AI-Generated Assets in AI-nimate**  
> *Seamlessly blending AI-generated imagery with the Pablo Stanley (Open Peeps / Open Doodles) vector universe.*

---

## 1. Executive Summary

`AI-nimate` uses an articulated 2D vector puppet engine and a curated library of 335 hand-drawn Pablo Stanley assets. When the AI Director needs an asset that does not exist in `assets/catalog.json` (e.g., a specific gadget, vehicle, mascot, or novel prop), the **Nano Banana** image generator is invoked.

To guarantee that any new AI-generated image looks 100% indistinguishable from the rest of the storyboard, it **must** strictly adhere to the five visual pillars below.

---

## 2. The 5 Visual Pillars

### 1. Linework: Clean Comic Ink Contours
- **Stroke**: Heavy, solid black lines (`#000000`), equivalent to 3px–4px vector strokes.
- **Form**: Hand-drawn brush pen feeling with smooth, closed contours.
- **Forbidden**: Fuzzy pencil lines, sketchy charcoal textures, cross-hatching shading, multiple overlapping wireframes.

### 2. Color & Shading: Flat Graphic Fills
- **Fills**: 100% flat fills with zero ambient occlusion.
- **Palette**:
  - **Monochrome Base**: `#000000` (linework) and `#FFFFFF` (base fill).
  - **Flat Accents** (Optional): High-energy flat comic colors:
    - 🍌 **Banana / Canary Yellow**: `#FCD34D` / `#FBBF24`
    - 🔴 **Coral / Punch Red**: `#EF4444` / `#F87171`
    - 🔵 **Electric / Soft Blue**: `#3B82F6` / `#60A5FA`
    - 🟢 **Mint / Emerald Green**: `#10B981` / `#34D399`
    - 🟣 **Lavender / Grape**: `#8B5CF6` / `#A78BFA`
- **Forbidden**: Gradients, soft shadows, 3D bevels, specular reflections, photorealistic textures.

### 3. Background: Pure Solid White (#FFFFFF)
- The subject **must** be isolated on a pure solid white (`#FFFFFF`) canvas with generous margins (no edge cutoffs).
- **Why**: In `engine/player.html`, props styled with `mix-blend-mode: multiply` automatically knock out `#FFFFFF` to 100% transparent on any background gradient, with zero halo or fuzzy edge artifacts!

### 4. Anatomy & Silhouette: Playful Exaggeration
- Simple, iconic, and immediately recognizable at small mobile/thumbnail scales.
- Rounded corners, friendly cartoon proportions, expressive silhouette.

### 5. Dimensionality: Pure 2D Flat Plane
- Orthographic or slight 3/4 isometric cartoon angle.
- Never 3D CGI or ray-traced rendering.

---

## 3. The Master Nano Banana Prompt Formula

Every asset generation request must follow this template structure:

```
vector icon of [SUBJECT], in the signature style of Pablo Stanley Open Peeps doodle, bold 4px clean black ink outlines, flat color fill, minimalist comic clipart illustration, centered, isolated on a pure solid white background, 2D vector graphic, zero shading, no gradients, no photorealism
```

### Negative Constraints (Strictly Excluded)
```
photorealistic, 3D, CGI, render, blender, hyperrealistic, shading, gradients, shadows, blurry, fuzzy, sketch, pencil, textured background, complex background, colored noise, photorealism
```

---

## 4. Category-Specific Prompt Recipes

### 📦 A. Props, Gadgets & Items
> **Pattern**: `vector icon of [item], Pablo Stanley doodle style, bold black ink outlines, flat [color] fill, minimalist comic prop, isolated on pure white background, 2d vector graphic`

- **Coffee Maker**: `vector icon of an espresso coffee machine, Pablo Stanley doodle style, bold 4px clean black outlines, flat white and silver fill, minimalist comic prop, isolated on pure solid white background, 2d vector graphic`
- **Solar Panel**: `vector icon of a modern solar panel array, Open Peeps comic style, bold black ink outlines, flat blue and white fill, minimalist tech icon, pure white background, 2d vector graphic`
- **Smartphone with Chart**: `vector icon of a smartphone displaying a rising stock chart arrow, doodle style, bold black linework, flat green and white accents, isolated on white background`

### 🍌 B. Mascots & Character Items
> **Pattern**: `stylized cartoon [character/food], Open Peeps comic style, playful expressive facial expression, bold 4px clean black outlines, flat [color] fill, centered on pure solid white background, 2d vector graphic`

- **Nano Banana**: `vector icon of a stylized cartoon banana with a cute smiling face, in the signature style of Pablo Stanley Open Peeps doodle, bold 4px clean black ink outlines, flat yellow fill, minimalist comic clipart illustration, centered, isolated on a pure solid white background, 2D vector graphic`

### 🏢 C. Buildings & City Elements
> **Pattern**: `vector illustration of [building], Pablo Stanley Open Doodles style, bold black linework, flat pastel fills, architectural doodle, isolated on white background`

- **Modern Cafe**: `vector illustration of a cute neighborhood coffee shop storefront with an awning, Open Doodles comic style, bold black contour lines, flat pastel accents, isolated on pure white background`

---

## 5. Asset Lifecycle: Auto-Registration into Catalog

When a new asset is generated:
1. Save the file to `assets/props/items/<asset-id>.jpg` or `.png`.
2. Register it in [`assets/catalog.json`](../assets/catalog.json) using `scripts/nano-banana.js register`:
```json
{
  "id": "prop-item-nano-banana",
  "name": "Nano Banana",
  "category": "props",
  "subcategory": "items",
  "file": "nano-banana.jpg",
  "path": "props/items/nano-banana.jpg",
  "tags": ["banana", "nano", "mascot", "fruit", "food", "yellow", "snack"],
  "mood": "playful",
  "style": "pablo-stanley-vector",
  "source": "nano-banana-generated"
}
```
3. Once registered, the AI Director (`scripts/director.js`) will immediately match and reuse this asset for future videos!

---

## 6. Template Text & Color Invariants (code-enforced)

- **Escape every storyboard string**: templates must use `TemplateHelpers.escapeHtml` (`engine/template-helpers.js`) for titles, badges, labels, stats — never raw `${...}`. Covered by `tests/templates.test.js` (injection regression).
- **Canonical assets/video/count-up**: use `resolveAsset` / `videoOrImageMarkup` / `countUp` — no per-template `../` or frame-pattern copies. Templates never emit `<video>`.
- **Palette tokens**: `THEME = { gold #c28d49, green #16a34a, greenDark #15803d, red #dc2626, blue #0284c7, amber #f59e0b, ink #0c0f17 }`. New colors must be added as tokens, not hardcoded forks.
- **Images**: `loading` + `onerror="this.style.display='none'"` on all `<img>` so missing assets degrade to layout, not broken icons.
