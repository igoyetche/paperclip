# Paperclip Icon — Chrome Extension Minimal Variant

## Prompt

Ultra-minimalist Chrome extension icon of an **anthropomorphic paperclip character** in the Vault Boy / Fallout retro mascot aesthetic, optimized for 16×16 / 32×32 / 48×48 toolbar and manifest sizes. Extreme simplification from the full mascot version while retaining core personality and legibility at tiny scales. **Full transparency on the canvas background** — render only the paperclip character itself, no solid background fill.

**Character design (heavily simplified):**
- **Main body:** A stylized paperclip silhouette reduced to its essential geometric form — two curved lines forming the classic gem-shape U-curves, thick enough to remain visible at 16×16.
- **Eyes:** Two **tiny pie-cut circles** stacked vertically in the upper-middle area of the paperclip, each with a small wedge slice missing. One eye is a **single fine curved line** (the wink), the other a complete pie-cut circle (open eye). Eyes are minimal but unmistakably give the paperclip a face.
- **Smile:** A single **tiny curved arc** below the eyes — a simple upward curve representing a cheerful grin. Keep it thin and readable.
- **No cheeks, no hair, no arms, no legs** — these details dissolve at 16×16 and destroy legibility. Strip to essentials only: body + eyes + smile.

**Overall silhouette:** The paperclip stands upright and centered, roughly **60–70% of the canvas height**. The character should occupy the middle area, leaving clear transparent space around all edges (roughly 15–20% margin on each side at the 1024px master scale).

**Style:** flat vector, bold clean lines at consistent stroke weight (~5–7% of canvas height at 1024px scale), zero visual noise. No gradients, no shading, no texture. Every pixel is either transparent or solid color.

**Palette (strict, two colors — transparent background):**
- Paperclip character (fill): cream `#F5E6BE`
- Paperclip character (outline): navy blue `#102C54`
- Background: **fully transparent (RGBA alpha = 0)**

Render the cream paperclip character with a **crisp navy outline** on a transparent canvas. The outline gives definition and crispness, especially at small sizes (16×16–32×32), ensuring the character pops against any OS background (light or dark). The navy outline echoes the Paperboy palette and ties the icon family together.

**Outline stroke weight:** ~10–12% of the paperclip line width (proportional at all scales). At 1024px master, if the paperclip body is ~60px stroke, the outline is ~6–7px. This ratio scales down cleanly to 16×16 where a thin navy halo frames the cream character.

**Composition:** 
- Master canvas: 1024×1024, transparent background
- Character occupies ~60–70% of height, centered both horizontally and vertically
- ~15–20% transparent margin on all four sides (at 1024px this is ~150–200px per side)
- Design so it scales cleanly via nearest-neighbor down to **16×16, 32×32, 48×48** and **128×128** without losing the face or breaking into disconnected pieces

**Legibility constraints (critical — browser toolbar icon):**
- At 16×16: paperclip silhouette + two tiny eyes + smile must remain visible and distinct
- At 32×32: face features are legible; character reads as "happy paperclip"
- At 48×48 and 128×128: full personality shines through
- **No fine details inside the paperclip loops** — the loops themselves are the character's body, not a container

**Mood:** cheerful, helpful, playful — a friendly utility mascot that fits comfortably in a browser toolbar without clutter. The character is recognizable at a glance and conveys "this extension helps organize things." Warm cream color feels retro and friendly against any background.

**Deliverable:** 
- Flat vector-style raster with sharp edges, no anti-aliased softness
- **Transparent background (RGBA, not white or navy)**
- Export as PNG with full alpha channel
- Sized to 1024×1024 for the master; platform/build tool handles downscaling to 16, 32, 48, 128
- Intended for `action.default_icon` in Chrome Manifest V3: specify sizes and paths for each scale

## Design Rationale

**Why minimize so aggressively?**
- A full mascot with arms, legs, smile, rosy cheeks is a blob at 16×16 — features merge and the character becomes unrecognizable.
- By keeping only the paperclip body + eyes + smile, the character remains distinctive and readable at all scales.
- Negative space (transparent background) ensures the icon pops in the toolbar without a colored background consuming toolbar space.

**Why cream-on-transparent instead of cream-on-navy?**
- Transparency allows the icon to work on any OS theme (light or dark browser toolbar).
- Cream reads as a warm, friendly color on both light and dark backgrounds.
- No background color = smaller icon file, better integration with platform UI.
- The user's OS/browser supplies the background context; the extension supplies just the character.

**Why eliminate arms and legs?**
- At 16×16, limbs either vanish or merge with the body, creating confusion.
- The paperclip body itself *is* the silhouette; arms and legs add visual noise without improving recognition.
- Keep the character iconic: the body + face are enough to convey "happy paperclip mascot."

**Why keep the eyes and smile?**
- Eyes are 80% of perceived emotion; even tiny pie-cut eyes + wink convey personality.
- A smile makes the character warm and helpful, not cold or utilitarian.
- At 32×32 and above, the face is clearly visible and memorable.

## Design Choices

| Decision | Chosen | Rationale |
|---|---|---|
| Background | Fully transparent (RGBA alpha = 0) | Works on light and dark browser toolbars; cleaner integration; no background overhead |
| Fill color | Cream `#F5E6BE` | Warm, retro, friendly; contrasts well on any background (light or dark) |
| Outline color | Navy blue `#102C54` | Adds definition at small sizes; echoes Paperboy palette; ties icon family together |
| Outline weight | ~10–12% of character stroke | Creates crisp navy halo; readable at 16×16; scales proportionally to all sizes |
| Character | Minimal paperclip + face only | Survives aggressive downscaling to 16×16 without visual dissolution |
| Features | Eyes (pie-cut + wink) + smile only | Minimal but convey personality; readable at all sizes; no arms/legs/cheeks/hair |
| Stroke weight | ~5–7% of 1024px canvas height (~50–70px) | Scales proportionally; remains crisp at 16×16 without thinning to hairlines |
| Silhouette | Upright paperclip, centered | Recognizable shape; balanced composition; matches full mascot's orientation |
| Margins | ~15–20% transparent on all sides | Breathing room; prevents icon from appearing cramped in toolbar |
| Canvas | 1024×1024 master, scales to 16/32/48/128 | Standard approach; nearest-neighbor downscaling preserves crisp edges |
| Metaphor | A happy, helpful paperclip — "I organize things and I'm cheerful about it" | Reflects extension's function (clip pages) and Paperboy brand (retro, friendly) |

## Implementation Notes

**For `manifest.json` in Manifest V3:**
```json
"action": {
  "default_title": "Clip this page to Markdown",
  "default_icon": {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

**PNG export settings:**
- Transparent background (ensure alpha channel is saved)
- No background color, no padding — the 1024×1024 canvas is transparent except for the character
- Bilinear or nearest-neighbor downscaling (nearest-neighbor preserves crisp edges better for tiny icons)

**Testing:**
- At 16×16: squint — is it unmistakably a happy paperclip?
- At 32×32: can you clearly see the two eyes and smile?
- At 48×48: does the full character personality come through?
- On light AND dark browser backgrounds: does cream read clearly?
