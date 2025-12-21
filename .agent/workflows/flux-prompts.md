---
description: FLUX prompt engineering guidelines for item image generation
---

# FLUX Prompt Engineering Guide

**Read this before writing or modifying any FLUX prompts!**

## Key Principles

### 1. NO Negative Prompts
FLUX does NOT support negative prompts. Never use "NO", "NOT", "without", etc.

**❌ Wrong:** `NO person, NO hands, NOT blurry`
**✅ Correct:** `isolated item on display stand, sharp focus throughout, empty scene`

### 2. Use Natural Language
Write flowing sentences, not keyword lists. FLUX understands context.

**❌ Wrong:** `sword, fantasy, detailed, shiny, magic, fire`
**✅ Correct:** `An ornate fantasy sword with intricate engravings along the blade, glowing with magical fire runes`

### 3. Information Priority
FLUX weights earlier text more heavily. Put the most important elements FIRST.

**Structure:** `[Style] → [Subject] → [Details] → [Composition] → [Background] → [Quality]`

## Prompt Structure Template

```
[Art Style Description], [Main Subject with details], [Composition/Camera], 
[Lighting], [Background], [Finishing quality touches]
```

## Art Style (FIRST - Double Down!)
Repeat style keywords 2-3 times in different ways:

| Style | Prompt Keywords |
|-------|-----------------|
| Watercolor | `beautiful watercolor painting, traditional watercolor artwork, wet-on-wet technique, paint bleeding edges, visible pigment granulation` |
| Oil Painting | `classical oil painting artwork, thick impasto brushstrokes, visible oil paint texture, rich color glazing, canvas texture` |
| Pencil Sketch | `detailed pencil sketch illustration, hand-drawn graphite artwork, cross-hatching shading, varied line weights` |
| Pixel Art | `pixel art sprite, retro 16-bit video game art, crisp clean pixels, limited color palette, dithering shading` |
| Anime | `anime style illustration, Japanese anime artwork, clean cel shading, bold outlines, flat color areas` |

## Object Size & Composition
Use camera terminology:

| Goal | Prompt Text |
|------|-------------|
| Item fills 65% of frame | `item centered in frame with generous space around it, product fills two-thirds of image` |
| Close-up | `close-up shot, macro view` |
| Full item visible | `full item visible from end to end, complete object displayed` |
| Item alone | `isolated single item on display, product photography, item displayed on invisible stand` |

## Background Blur (Bokeh)
Use photography terms for depth of field:

| Effect | Prompt Text |
|--------|-------------|
| Strong blur | `shallow depth of field, soft bokeh background, shot at f/2.8, 85mm lens blur` |
| Moderate blur | `slight background blur, shot at f/4.0` |
| Sharp background | `deep depth of field, sharp focus throughout, shot at f/8` |

## Themed Backgrounds
Describe backgrounds positively, not by exclusion:

| Theme | Background Description |
|-------|----------------------|
| Fire | `volcanic landscape background with molten lava bokeh, floating ember particles, warm orange-red ambient glow` |
| Ocean | `underwater caustic light bokeh, floating bubbles, deep blue-turquoise ambient glow` |
| Nature | `beautiful forest bokeh background, sunlight filtering through leaves, dreamy soft blur` |
| Arcane | `mystical purple fog bokeh, floating magical particles, ethereal blue-purple glow` |

## Prompt Length
- **Optimal:** 150-300 words (around 200-400 tokens)
- **T5 encoder:** Can handle up to 512 tokens
- **CLIP encoder:** Truncates at 77 tokens (early parts matter most!)

## Example: Complete Fantasy Item Prompt

```
Beautiful watercolor painting, traditional watercolor artwork with wet-on-wet 
technique and visible pigment granulation. An ornate battle axe with curved 
double-edged blade, intricate dwarven runes carved into the metal, leather-wrapped 
handle with brass accents. Item displayed alone on invisible stand, product 
fills two-thirds of frame with generous space around it. Shot with 85mm lens 
at f/2.8, shallow depth of field. Soft forest bokeh background with sunlight 
filtering through leaves, dreamy atmospheric blur. Art paper texture visible, 
soft color bleeding edges, painterly finish.
```

## Common Mistakes to Avoid

1. **Negative language** - Always describe what you WANT, not what you don't
2. **Keyword spam** - Use sentences, not comma-separated tags
3. **Style at end** - Put style FIRST, not last
4. **Person/wearer** - Say "item on display stand" not "item without person"
5. **Generic quality words** - "masterpiece, 8k, best quality" are ignored
6. **Background first** - Subject should come before background details
