# Paperclip Icon — Generation Prompt

## Prompt

Minimalist icon of a mascot character rendered in the **Vault Boy / Fallout mascot aesthetic** — 1950s atomic-age retro-futurist cartoon style, reminiscent of mid-century advertising mascots and SPECIAL-stat illustrations. Head-and-shoulders composition from a slight three-quarter angle, with one arm extended outward presenting an **oversized stylized paperclip** — the classic Vault Boy "advertising gesture" of confidently displaying an item to the viewer. This is the companion icon to Paperboy; the two should read as a matched set.

**Character details:**
- Round, friendly cartoon face with a wide confident grin showing teeth.
- **Pie-cut eyes** (Vault Boy's signature) — circular eyes with a wedge-shaped slice missing from each. One eye is **winking closed** (a simple curved line), the other open and cheerful.
- Rosy, rounded cheeks — small filled circles on each side of the smile.
- A single small curl of hair peeking out from under the cap (echoing Vault Boy's distinctive forelock).
- Classic flat newsboy cap pulled low and slightly tilted — matches the Paperboy mascot so the two icons read as siblings.
- Extended arm holds an **oversized paperclip** vertically, presenting it to the viewer the way Vault Boy presents a Nuka-Cola bottle or a weapon in promotional art. The arm is simple and tube-like with a rounded shoulder, ending in a classic cream four-fingered cartoon glove or mitten-hand pinching the outer loop of the paperclip.

**Paperclip object:**
- Classic gem-shape / trombone paperclip silhouette — two elongated U-curves nested inside one another.
- Rendered as bold cream outlines on the navy background, same 3–4px stroke weight as the figure. No fill inside the loops — the navy shows through so the paperclip reads as wire.
- Oversized and iconic, roughly the height of the character's head. It should be the visual anchor of the icon, instantly recognizable even at small sizes.
- Held vertically, slightly tilted toward the character for a jaunty presentational feel.

**Style:** flat vector cartoon, bold confident outlines at consistent 3–4px stroke weight, mid-century advertising mascot energy. No gradients, no shading, no texture, no halftones, no third color. Every shape is a solid fill in one of the two palette colors. The feel is: cheerful retro mascot, 1950s print ad, Pip-Boy manual illustration.

**Palette (strict, two colors only — matches Paperboy exactly):**
- Background and pupil/wink cutouts: navy blue `#102C54`
- Mascot figure and paperclip (outlines and fills): cream `#F5E6BE`

The entire canvas is a solid navy blue fill. The mascot — cap, face, cap curl, arm, glove, outlines — and the paperclip are rendered entirely in cream. The pie-cut slice of the open eye, the curved line of the winking eye, the interior loops of the paperclip, and any tiny interior details punch through to the navy background.

**Composition:** centered on a 1024×1024 square canvas, with generous navy blue negative space around the figure so it remains legible when scaled down to 48×48 and 32×32 extension icon sizes. The extended arm and paperclip should fit comfortably within the canvas without crowding the edges.

**Mood:** cheerful, confident, retro, wholesome — a 1950s atomic-age mascot enthusiastically clipping today's article. The cream-on-navy pairing feels like aged newsprint under streetlight. No text, no logo, no background scenery, no digital or tech motifs. Pure mascot-with-paperclip rendered in the Vault-Boy style.

**Deliverable:** flat vector-style raster, sharp edges, no anti-aliased softness. The canvas is a solid navy blue square; output the full square-filled version.

## Toolbar Variant (16×16 / 32×32)

For the Chrome extension toolbar, the full mascot illustration will not be legible. Generate a **simplified variant** using the same palette:

- Just the oversized cream paperclip silhouette, centered on the solid navy square canvas.
- Same 3–4px stroke weight scaled proportionally.
- Slight jaunty tilt (~10–15°) to keep the playful mascot energy without the character.
- Use this simplified icon for `action.default_icon` in `manifest.json`.

Keep the full mascot version for store listing imagery (128×128 and larger) where the character reads clearly.

## Design Choices

| Decision | Chosen | Rationale |
|---|---|---|
| Palette | Navy `#102C54` + cream `#F5E6BE` | Exact match with Paperboy — the two icons must read as a set |
| Style | Vault Boy / Fallout 1950s atomic-age mascot | Mirrors Paperboy's aesthetic; cements the sibling-product relationship |
| Composition | Head + one extended arm presenting paperclip | Echoes Paperboy's presentational pose; swapping only the prop emphasizes the pairing |
| Prop | Oversized wire-style paperclip | Strong silhouette, legible at small sizes, directly evokes the extension's function |
| Outlines | Cream (against navy background) | Cream-on-navy reads with strong contrast at all sizes; warmer than pure white |
| Metaphor | Pure paperclip, no digital cues | Extension context already supplies "clip web page to Markdown" meaning |
| Toolbar variant | Paperclip-only (no character) | 16×16 toolbar size can't render a face legibly; paperclip silhouette still carries the brand |
