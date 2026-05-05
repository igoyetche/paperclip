# Paperclip Toolbar Icon — Generation Prompt (16×16 / 32×32)

## Prompt

Ultra-minimalist Chrome extension toolbar icon of a single **stylized paperclip** rendered in a flat, bold, retro-mascot style that pairs with the Paperboy icon. The icon must be instantly legible at 16×16 pixels in a browser toolbar — no character, no face, no fine detail. The paperclip silhouette alone carries the brand.

**Subject:**
- A classic gem-shape / trombone paperclip — two elongated U-curves nested inside one another, the outer loop longer than the inner loop, with a clean rounded bend at each end.
- Rendered as a **solid cream wire shape** against a solid navy background. The interior of each U-curve is navy (the background shows through), so the paperclip reads as wire, not as a filled blob.
- Jaunty tilt of approximately **15° clockwise** — upright but leaning slightly, echoing the cheerful "presentational" energy of the Paperboy mascot's pose without any figure.
- The paperclip fills roughly **70–75% of the canvas height** and sits centered both horizontally and vertically, with a small, even margin of navy on all four sides so the shape doesn't touch the canvas edges at any scale.

**Style:**
- Flat vector, no gradients, no shading, no texture, no halftones, no third color.
- Bold, confident, closed-loop shape with softly rounded ends — no sharp corners, no tapering, no varying line weight.
- Stroke weight equivalent to ~6–8% of the canvas height, consistent throughout the entire paperclip. At 1024×1024 this means roughly a **70–80px uniform stroke**, thick enough that when the icon is downscaled to 16×16 the wire remains a clear, continuous shape rather than dissolving into thin anti-aliased lines.
- The paperclip is geometric and symmetrical in construction but rendered with the same warm, retro 1950s sensibility as the full mascot icon — confident, mid-century advertising mascot energy, not sterile or corporate.

**Palette (strict, two colors only — exact match with Paperboy and full Paperclip icons):**
- Background: navy blue `#102C54`
- Paperclip: cream `#F5E6BE`
- No outlines, no shadows, no highlights, no secondary tints. Every pixel is one of these two colors.

**Composition:**
- 1024×1024 square canvas, solid navy fill edge-to-edge.
- Paperclip centered with generous but not excessive negative space around it — roughly 12–15% margin on each side. At 16×16 downscale, the paperclip should still have 1–2px of navy breathing room on every side.
- Design so that the same master file reduces cleanly to **128×128, 48×48, 32×32, and 16×16** via nearest-neighbor or bilinear downscale without any detail breaking apart.

**Legibility constraints (critical — this is a browser toolbar icon):**
- No characters, no faces, no text, no small decorative marks.
- No fine interior details inside the paperclip loops — the shape must read as a single continuous wire.
- The silhouette alone must identify the extension at 16×16. Test mentally: squint at a 16×16 version — is it unambiguously a paperclip? If not, thicken the stroke or enlarge the shape.

**Deliverable:** flat vector-style raster, sharp edges, no anti-aliased softness on the 1024×1024 master. Output the full square-filled version. Intended for `action.default_icon` in Chrome Manifest V3 at sizes 16, 32, 48, and 128.

## Design Choices

| Decision | Chosen | Rationale |
|---|---|---|
| Subject | Paperclip silhouette only | 16×16 can't carry a mascot's face; the clip shape is iconic enough to brand the extension |
| Palette | Navy `#102C54` + cream `#F5E6BE` | Exact match with Paperboy and full Paperclip icons — visual family |
| Stroke weight | ~6–8% of canvas height, uniform | Survives aggressive downscaling without breaking into thin lines |
| Tilt | ~15° clockwise | Adds retro-mascot playfulness without a character; hints at the full icon's jaunty pose |
| Fill | Open loops (navy shows through) | Reads unambiguously as a wire paperclip, not a blob |
| Negative space | 12–15% margin per side | Keeps shape crisp inside the toolbar's rendering box at every scale |
| Detail | None inside the loops | Any interior detail destroys legibility at 16×16 |
