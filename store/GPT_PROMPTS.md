# HARVEST RUSH: GPT prompts for CrazyGames covers and video

Ready-to-paste prompts for ChatGPT (image generation) and a video model, if you want painted
alternatives to the covers and preview videos rendered from the real game (`dist/covers/`, `dist/video/`).

**Before you start**
- Attach `dist/covers/cover-landscape-1920x1080.png` (and the portrait one) to every chat as the style
  and content reference. Without it the model invents a different-looking game.
- CrazyGames checks that covers and video **accurately reflect the gameplay**. An AI image that looks
  like a different game (3D, realistic, new characters) can be rejected. Keep it close to the reference.
- GPT rarely returns exact pixel sizes. Resize or crop the result to exactly **1920×1080**, **800×1200**
  and **800×800** before uploading.
- Generate the three covers in the **same chat**, so they stay consistent with each other.

## CrazyGames cover rules (paste-safe summary)
- Sizes: landscape 1920×1080 (16:9), portrait 800×1200 (2:3), square 800×800 (1:1). All three required.
- Only the game title as text. No "New", "Play now", "Free", ratings, prices or UI.
- No borders, frames, icons, app-store or social logos, no copyrighted characters.
- Sharp, high resolution, no blur or compression artifacts. The three covers share one look.

## Style sheet (paste at the top of every prompt)

```
Style: cozy, flat 2D vector game art viewed straight from above (top-down), soft pastel colours,
thick rounded dark-purple outlines (#3b3561) on every shape, gentle soft shadows, no gradients except
subtle ones, clean and readable at small sizes. Bright sunny daytime.
Palette: grass #8ed66a and #a4e383, warm soil #d6995f, wooden fences #e3b776, cream paving #f3e6c8,
sky-blue accents #8fd3ff, ripe wheat gold #f2b632, carrots #ff8c3a, tomatoes #ff5a4f, pumpkins #ff9a2e.
World: a small Indian village farm. A paved cream market square at the top with a striped
pink-and-white awning market stall run by a smiling woman in a green headscarf, a red barn with a
silo on the left, a small red-roofed cottage on the right. A winding sandy dirt road runs down the
middle between fenced rectangular crop fields: golden wheat, carrots, pumpkins, tomatoes,
strawberries, corn. Little scarecrows, white chickens, bees, beehives on poles, blue sprinklers,
bushes with pink berries, a wooden wheelbarrow full of vegetables.
Hero: a cheerful young farmer with a wide conical straw hat (red band, a wheat sprig tucked in it),
a red neckerchief, a cream kurta, sandals, and a big wicker basket on the back overflowing with
crops. A few smaller helper farmers in different outfits carry baskets.
Mood: busy, happy, satisfying harvest. Match the attached reference image's art style exactly.
```

## Title lettering (same in all three)

```
Title text exactly "HARVEST RUSH" on two lines, right-aligned, in the bottom-right corner:
"HARVEST" in warm orange (#ffb13d), "RUSH" below it in leaf green (#7cc85a). Chunky rounded
display font (like Lilita One), very thick dark-purple (#3b3561) outline, a solid dark-purple drop
shadow straight down, slight soft glow behind it. Leave a small margin from the edges.
No other text anywhere in the image.
```

## Prompt 1: landscape cover (1920×1080)

```
[Style sheet]
Create a 16:9 landscape game cover, 1920×1080.
Composition: top-down view of the farm. The market square and stall fill the top third; the
dirt road runs down the centre; a golden wheat field (right) and a carrot field (left) fill the
middle; pumpkins and tomatoes peek in at the bottom. The hero farmer stands on the road in the
centre with an overflowing basket, mid-stride, picking wheat, with a few golden sparkles and a
couple of flying coins. Two or three helper farmers walk toward the market with full baskets.
Keep the bottom-right corner calm (grass and field) for the title.
[Title lettering]
```

## Prompt 2: portrait cover (800×1200)

```
[Style sheet]
Same scene, same art, now a 2:3 portrait cover, 800×1200.
Composition: the whole farm from above, stacked vertically: market square and stall at the top,
the winding road down the middle, two fields on each side (wheat and carrots, then pumpkins and
tomatoes, then corn and strawberries at the bottom). The hero farmer on the road just below the
market with an overflowing basket. Keep the bottom-right corner calm for the title.
[Title lettering]
```

## Prompt 3: square cover (800×800)

```
[Style sheet]
Same scene, same art, now a 1:1 square cover, 800×800.
Composition: market square across the top quarter, the road down the centre, wheat (right) and
carrots (left) in the middle, pumpkins and tomatoes at the bottom. The hero farmer on the road in the
centre, slightly enlarged so his hat and basket read clearly. Keep the bottom-right corner calm for
the title.
[Title lettering]
```

**Fix-up prompts** (if a result is off):
- "Remove all text except the title HARVEST RUSH in the bottom-right corner."
- "Make the outlines thicker and dark purple, flatter colours, closer to the reference image."
- "The farmer must wear a wide conical straw hat with a red band, not a cowboy hat."
- "Extend the image to exactly 16:9 without changing the art; keep the title in the bottom-right."

## Preview video (15–20 s)

CrazyGames rules: 15–20 s, under 50 MB, **both** 1080p landscape (16:9) and 1080p portrait (2:3),
no sound, no fast-forward, the **static cover as the first frame**, no black screens or logo
intros, no black bars, no mouse cursor, no "Play now" text or icons.

The videos in `dist/video/` already follow these and show real gameplay, which is what CrazyGames
wants to see. AI-generated video that does not match the actual game is risky. If you still want a
video model to make a stylised version, use this shot list and attach the landscape cover:

```
[Style sheet]
Make a 19-second silent gameplay preview, top-down camera, no cuts to black, no text except the title
in the first second.
0–1 s: hold on the attached cover image exactly (title "HARVEST RUSH" bottom-right), then the title
fades out.
1–7 s: the farmer walks through the golden wheat field; stalks pop into his back basket one by one,
small "+1" coins and a combo counter "x5 GREAT!" appear; the basket fills up.
7–10 s: he walks up the road to the market stall; crops fly from the basket to the stall keeper,
coins burst out and the coin counter in the top-left rises.
10–14 s: he walks to the wooden sign at the pumpkin field; an upgrade card appears; it upgrades with
confetti and a "PUMPKIN FIELD LV 4!" banner; the field gets a beehive.
14–19 s: helper farmers harvest around him while he picks pumpkins; chickens scatter; a slow, steady
top-down camera follows him.
Real-time speed only (no fast motion). No sound.
```

Then make a 2:3 portrait version (1080×1620) of the same shots, keeping the farmer centred.
