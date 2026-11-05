Make three PREMIUM store cover images for my game HARVEST RUSH, for the CrazyGames web-game portal.
The goal: a player scrolling a grid of game thumbnails stops and clicks. Think top-tier mobile/web game key art.

Use your image generation tool. Attached references (all from the real game, use them for style and characters):
- ref-gameplay-landscape.png / ref-gameplay-portrait.png: the real game world, top-down, flat 2D vector, thick dark-purple outlines.
- ref-hero-closeup.jpg: the hero farmer drawn large (conical straw hat with red band and wheat sprig, red neckerchief, cream kurta, wicker basket on the back).
- ref-title-style.png: the title lettering to match (glossy gradient "HARVEST" orange-gold, "RUSH" green, thick dark-purple outline, bottom-right).

## Deliverables (exact sizes, PNG), save into dist/covers/codex/
1. cover-landscape-1920x1080.png (16:9)
2. cover-portrait-800x1200.png (2:3)
3. cover-square-800x800.png (1:1)
Generate at the closest supported size, then resize/crop to the exact pixels with `sips` (macOS), for example
`sips -z 1080 1920 in.png --out out.png` after cropping to the right aspect. Verify sizes with `sips -g pixelWidth -g pixelHeight`.
Keep all three in one consistent look (same hero, palette, lighting, title).

## Art direction
- Same art style as the references: cozy flat 2D vector, soft pastel palette, thick rounded dark-purple (#3b3561) outlines, clean shapes. NOT 3D, not realistic, not a different style.
- Premium key-art composition, not a plain screenshot: the hero farmer large in the foreground (about 45-60% of the image height), cheerful, mid-stride or proudly holding up an armful of crops, the wicker basket on his back overflowing with wheat, carrots, tomatoes, pumpkins, strawberries.
- A burst of golden coins and crops arcing up out of the basket, small sparkles. Energy and abundance.
- Behind him: the farm from the reference (striped pink-and-white market stall, red barn, cottage, fenced fields of golden wheat and carrots, chickens, scarecrow, winding dirt road), slightly soft-focus for depth.
- Golden-hour sunlight from the top right, soft warm glow and light rays, gentle vignette. Rich, saturated but still soft.
- Bottom-right corner: the title "HARVEST RUSH" on two lines, right-aligned, matching ref-title-style.png: chunky rounded display font (like Lilita One), "HARVEST" glossy orange-gold gradient, "RUSH" glossy green gradient, very thick dark-purple outline, solid dark-purple 3D drop shadow, a soft glow. Large and readable even as a small thumbnail.
- Keep the hero's face and the title clear of each other; nothing important near the edges.

## Hard rules (CrazyGames)
- The ONLY text anywhere is the title "HARVEST RUSH". Spell it exactly. No other words, numbers, UI, buttons, "New", "Play", prices, ratings.
- No borders or frames, no logos, no app-store or social icons, no copyrighted characters.
- Sharp and high resolution, no blur on the hero or title, no artifacts.
- The image must honestly look like this game (same characters and world).

## Per size
- Landscape: hero on the left third facing right, the coin/crop burst fanning up toward the centre, farm behind, title bottom-right.
- Portrait: hero in the upper-middle, burst above him, the farm and road receding behind, title bottom-right across the lower part.
- Square: hero left of centre, burst up and right, title bottom-right.

When finished, list the three file paths with their pixel sizes. Do not modify any other files in the project.
