# Painted world atlas v1

`farm-painted-v1.png` is the preserved 1536×1024 RGBA source atlas. Production
ships `farm-painted-v1.webp` with identical decoded RGBA bytes. It contains six
sprites in a 3×2 grid: market, barn, cottage / apple canopy, berry bush, produce
crate. Precomputed alpha bounds avoid runtime pixel reads. Three.js reuses cached
textures baked from this atlas. The build includes the smaller WebP, while keeping
the PNG source and its provenance metadata here for authoring.

Created using the built-in image-generation tool from the user's supplied
`generated_images/exec-44bb3fc3-a2ae-4c8f-ad84-cb752967f3ec.png` art direction.
The selected output was `exec-4492d338-a605-4e02-9553-9441ca569099.png`.
Alpha inspection verified 881,028 fully transparent pixels out of 1,572,864.
No CLI/API image-generation fallback was used.

## Final prompt

Create a NEW production game sprite atlas based on the six illustrated objects in the supplied image. Critical change: transparent background everywhere outside object silhouettes. There must be NO brown background, NO green background, NO gradient backdrop, NO colored aura, NO vignette. Only six separated cutout objects floating on real alpha transparency. Redraw smaller if needed: objects occupy at most 78% of each equally sized rectangular cell with large blank transparent gutters. 3 columns x 2 rows: upper left market stall, upper middle red barn, upper right cottage, lower left apple canopy, lower middle berry bush, lower right produce crate. Preserve glossy painted casual-farming-game style, golden upper-left highlights, warm brown outlines and rounded forms. Barn doorway is dark opaque brown and blank gold sign. Empty stall interior is dark opaque brown, no person, no text. Cottage stone step baseline. Apple canopy with no trunk. All objects fully visible. This will be directly composited over a green game map so any opaque backdrop or haze makes the image unusable. Deliver ONLY the six isolated cutouts with clean alpha.

## Farm expansion

Three more atlases extend this style through the world:

- `crops-painted-v2.png`: eight crops, 4×2 cells. V2 replaces the finer botanical
  v1 draft with broad glossy shapes that read at gameplay scale. The outer eight
  pixels of each cell are packing gutters, excluded from sprite-bound detection.
- `props-painted-v1.png`: twelve props, 4×3 cells, including two separate fence
  pieces and a windmill tower. Rails repeat around field boundaries while gates
  stay open; windmill blades and lantern glows remain animated by the game.
- `terrain-painted-v1.png`: grass, soil, path and sandstone, 2×2 opaque cells.
  Mirrored pattern quadrants make the repeat edges meet. Texture opacity is
  deliberately lower than character and prop shading.

All three were made with the built-in image-generation tool. Exact prompts,
selected output identifiers and the discarded crop draft are recorded in
`painted-farm-expansion.prompts.json`. The build ships only the selected crop v2,
the props atlas, the terrain atlas, and the original building/foliage atlas.
The loader rounds cell boundaries to integer pixels, including atlases whose
dimensions do not divide evenly by their grid dimensions. All atlases have
independent vector fallbacks and invalidate their drawing caches after loading.

## Lossless production encodings

All four PNG masters have exact-lossless `.webp` siblings. Original PNGs remain
unchanged; dimensions, every RGBA byte and alpha bounds are verified. Production
fonts have complete `.woff2` siblings in `fonts/`; original TTFs and OFL licenses
remain there. Only WebP/WOFF2 and the licenses are copied into the release ZIP.

`optimized-assets.json` contains source/production hashes and equivalence checks.
Use `tools/optimize-assets.py` and `tools/requirements-assets.txt` to reproduce or
verify outputs. No texture resizing, palette reduction, near-lossless processing
or font subsetting is used.
