# Art Audit: Assets That Break the HD Pixel Style

The UI now uses the pixel design system in `src/components/ui/` (tokens in `src/index.css`). The assets below are still vector, glossy or painterly, and clash with the pixel environments. They need to be redrawn; the UI can't fix them in code.

**Target style.** Match the existing environments and characters, e.g. `public/assets/expedition/battle_bg.png` and `src/assets/png/maria_sprite.png`:
- visible square pixels, drawn at a low native resolution and exported at an integer upscale (2×, 3× or 4×)
- limited palette, no smooth gradients, no glossy highlights, no vector-thick black outlines
- warm tropical palette; for UI art, sample from the tokens in `src/index.css` (`plum`, `wood`, `parchment`, `gold`)

## Priority 1: seen on every core screen

| Asset | Where it shows | Problem | Redraw spec |
|---|---|---|---|
| `public/assets/expedition/gustave_avatar.png`, `maelle_avatar.png`, `lune_avatar.png` (hero `avatar`) | Combat party cards, turn order, Equip modal, Santelmo ultimate picker | Flat vector cartoon portraits with thick outlines | 48×48 px pixel busts, exported at 4× (192×192). Transparent or `plum-800` background |
| `src/assets/titlescreen/title.png` | Title screen logo | Glossy 3D comic lettering with halftone dots | Pixel wordmark at about 320×80 native, 3× export, gold/wood palette. Pixelify Sans Bold makes a good base |
| `public/assets/instruments/*.png` (e.g. `bandurria.png`, `tultugan.png`) and the matching `locked_*.png` | Dex cards and inspector, Equip list, combat party cards, result modal | Vector-rendered instrument (smooth fills, black outline) pasted over a pixel background | Re-render the instrument itself as pixel art on the same pixel backgrounds. Also export a transparent 64×64 native icon for small slots (Equip, party cards) |

## Priority 2: secondary screens

| Asset | Where it shows | Problem | Redraw spec |
|---|---|---|---|
| `public/assets/badges/*.png` | Badges and Ranks screens | Glossy 3D mobile-game icons with gradients and sparkles | 32×32 native pixel medals, 4× export, max about 12 colours each |
| `public/assets/avatars/*_v2.png` and `*_sticker_*.png` | Teachable Student screen (`studentService.ts`, `TeachableStudentScreen.tsx`) | Painterly illustration with a neon cyberpunk palette (off-theme as well as off-style) | Pixel portraits matching the hero sprite GIFs. Use the warm palette; drop the neon rim lighting |
| `public/assets/story/chieftess_scene1-3.png` | Town entrance cutscene (`TownEntranceCutscene.tsx`) | Smooth painterly rendering | Repaint as pixel scenes at the same density as `src/assets/intro/scene*.png` |

## Priority 3: cleanup

| Asset | Note |
|---|---|
| `src/assets/images/hero.png`, `Badges.png`, `Game_Badges.png`, `pose_*.png` | No references in `src/` at the time of this audit. Confirm, then delete |
| Emoji used as icons (`icon: '🎸'` in `src/types/expedition.ts`, NPC `avatar: '👴'` in `ExpeditionOverworld.tsx`) | The map pins and dialogue no longer render them. Replace the data with pixel icon names or portrait paths |

## Already on-style (no action)

Battle and boss backgrounds, the ground tiles, hero combat GIFs, `maria_sprite.png`, the shop item art (`src/assets/shop/*`), the node preview images (`*_prev.png`), the intro scenes and the map clouds. `visayas_map.png` is close enough; if it gets redrawn, soften the vector coastline outlines.
