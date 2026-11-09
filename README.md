# HARVEST RUSH — farming idle arcade

A painted farming idle arcade game rendered with **Three.js r187**. An orthographic
camera preserves the existing 2D art direction. Instanced sprite batches draw the
world, characters, crop growth stages, particles, lighting and screen effects through
one WebGL2 canvas. Movement, economy, progression, saves and the compact HTML/CSS
HUD retain their existing behavior. Vertical camera following has no dead zone; Ravi stays just above the screen
midpoint, including at map edges.

Ravi's visual stride eases in and settles on release while movement and collision
respond immediately. A short turn compression and restrained basket sway use GPU
transforms. Crop pickups lift clear of the soil before travelling into the basket;
selling uses a short arc with one coin sound, wallet flight and summary when the
last item arrives. Workers remain quiet. `src/animation.mjs` holds these motion
curves; `tools/check-animation.mjs` verifies their timing and endpoints.

The tutorial has three visible actions: walk through six wheat, stand on the market
rug to sell, then stop at the wheat sign and tap Upgrade. One card supplies the
instruction and progress. Small cyan dots flow toward the goal, with a slightly
larger dot marking the destination. Their white edges and dark outlines separate
them from the farm. The trail bends around buildings, fades gently at its ends,
and disappears on arrival. There are no navigation arrows or solid route line.
Sowing is automatic, and egg collection becomes an optional
goal after the first upgrade. The original starting rewards and saved quest indices
are retained; older saves at the sowing lesson move forward without losing rewards.
After the lesson, the tutorial stays complete. Contextual reminders appear for six
seconds when the basket fills or after 18 seconds of inactivity, with cooldowns to
avoid repeated prompts. Movement/input dismisses idle help; selling clears full-bag
help. Cards and notifications take precedence over reminders. Upgrade cards open
as soon as the player enters an eligible zone, without dwell or notification delays;
a deliberate button press is still required to buy. Active crop transfers finish
before a purchase card opens. `NIGHT_ENABLED` is false: all sessions stay in daylight,
including older night-debug URLs, until night mode is requested again.

Daily gifts and timed orders remain deferred through the early optional goals.
Saves retain partial first-basket bonuses and sale totals. Settings, lost pointer
capture, blur and hidden tabs clear input; hidden tabs pause simulation and mute
audio. `tools/check-opening.mjs` covers the shared instruction/target model,
progression, prompt timing, save migration, input reset and platform storage
fallback. This build requests no advertisements; live ad callback testing remains
for a later SDK ads integration.

The renderer uses four lossless WebP atlases derived from the preserved original PNGs. Individual procedural assets such
as character poses, baskets, labels and ground tiles are baked into reusable textures;
the entire game frame is never painted into a CanvasTexture. Static textures are
uploaded once, disposed after inactivity or cache eviction, and reused across frames.
Crop sway, windmill rotation, smoke, pond motion and lighting run through GPU sprite
transforms/shaders. Painter ordering and transparent edges are preserved.

`src/three-renderer.mjs` owns Three.js, instancing, texture lifetime and color/tint
shaders. `src/farm-three-scene.mjs` connects simulation state and the existing asset
painters to that renderer. `assets/harvest-three.js` is the locally bundled runtime;
no Three.js CDN is required when playing or uploading to CrazyGames. The bundled
Three.js MIT license is in `assets/vendor/three-LICENSE.txt`.

## Run and build

    npm ci
    npm test
    npm run build
    python3 -m http.server 8768 --bind 127.0.0.1
    # open http://127.0.0.1:8768/dist/crazygames/index.html

`npm run build:renderer` only rebuilds the browser bundle. The complete build creates
`dist/harvest-rush-crazygames.zip`, with the game, renderer and assets at upload-ready
paths. To play the checked-in source/bundle, simply serve this folder and open
`index.html`; no Node process is required at runtime.

Three.js is the only gameplay renderer. Graphics always uses Auto; saved manual
quality and compatibility preferences migrate automatically without changing progress,
audio or vibration preferences. Settings contains no renderer or quality selectors.
Canvas 2D is used to author individual textures, never to render a gameplay frame.
Startup or graphics-context failure displays a compact reload card. Serve the game
from a local server for testing and upload the packaged ZIP to CrazyGames.

When changing crop art, edit the draw functions as usual; the sprites are made from them.

**Full farm on weak phones.** With everything unlocked (8 fields at Lv 5, 12 workers, partner,
home, festival) the game adapts to the device:
- **Graphics quality** (`QUAL`, always Auto). Auto starts one
  step lighter on devices with 4 or fewer CPU cores or 3 GB or less memory, steps down after about
  2.5 s under ~40 fps, and tries one step richer after 40 s of headroom.

  | Level | Canvas resolution | Particles | Extras |
  |---|---|---|---|
  | 0 High | up to 2× | 600 | everything |
  | 1 Lighter | up to 1.5× | 260 | no petals, bugs, vignette or blend-mode night; worker sprites; no worker dust |
  | 2 Battery saver | 1× | 120 | also no grass tufts, slower dust |

- **Sprinklers** spray by time (not per frame, which doubled the drops on 120 Hz phones) and only
  for fields on screen. A maxed farm went from ~500 live water drops to ~110.
- **Off-screen particles** are skipped when drawing.
- **Worker sprites** (`CHAR_CACHE`, phones and lighter levels): each worker is stamped from a cached image per
  look, facing, walk frame (12) and basket fill, with 94% reuse; the farmer you control is drawn live.
- On a 402×874 phone screen, the lowest level draws 4× fewer pixels than High.
- **Phones keep full quality** (2× resolution, everything on). Instead of lowering quality, the
  expensive parts are cached with no visible change:
  - **Ground tiles** (`GROUND`): grass, road, plaza, lanes, tufts, yards and hedges are painted once
    into 320 px tiles at the exact screen scale and stamped 1:1 (the camera snaps to whole device
    pixels). The ground went from ~13 ms to ~0.6–2.2 ms per frame on a phone-size view; under 0.15% of
    pixels differ, by anti-aliasing rounding along the road edge. Tiles build two per frame, one ring
    ahead of the view, up to 56 kept (~22 MB). Desktop still draws the ground live.
  - **Worker sprites** at full resolution with 12 walk frames.
- **Measured in the CrazyGames app (Android 16, 8 cores):** the game's own work was ~0.5 ms logic + ~6 ms
  draw per frame, but the app only delivered ~42 frames a second, unevenly (24–33 ms apart): the
  CrazyGames page shares the WebView's main thread. So:
  - **Correction:** at High the same phone fell under 20 fps (Saver: ~42). The app's WebView draws the
    canvas on the CPU *after* our timer stops, so resolution matters there. So:
  - **Auto keeps a lower level only if it helps** (`QUAL.probe`): under ~42 fps for 3 s it tries one
    step lighter for 3.5 s; if fps didn't improve by 15% (the host is the limit) it goes back to full
    quality and doesn't try again for 2 minutes. Otherwise it keeps the lighter level, and tries one
    step richer after 30 s above ~55 fps. Graphics always uses Auto.
  - **Full-screen effects off the canvas:** the vignette is a CSS layer (`#vig`) drawn by the compositor,
    and the sky is only painted where the view goes past the island, so the canvas no longer fills
    every pixel two extra times per frame.
  - **Uneven frame delivery is smoothed** (`PACE.dt`, a light moving average of the frame step; the
    average speed is unchanged), so 24–33 ms gaps don't judder.
  - **Opaque canvas** (`alpha:false`): the compositor never blends the game with the host page.
  - **Hidden readout:** tap the level ring 5 times for fps, screen Hz, frame times, logic/draw ms,
    view and canvas size, quality, embedding and device info. Works inside the CrazyGames app.
- **Auto quality only as a last resort:** it steps down only for sustained trouble (average over 28 ms
  for several seconds). There is no manual quality override.
- **60 fps pacing on phones** (`PACE`): 90/120 Hz screens no longer double the work; frames are paced
  to an average of 60 on any refresh rate.
- **No per-frame garbage in the draw list:** decoration lists are split once, the y-sorted layer reuses
  one array, and only on-screen trees and props are sorted (about 28 of 162 at a time).
- **No WebView scrolling:** touchmove is blocked outside the settings and chapter cards, and
  `overscroll-behavior: none` stops bounce and pull-to-refresh fighting the drag joystick.

**Fewer paths, same pixels** (full quality on every device). A maxed farm went from ~2,500 vector
paths a frame to ~1,100–1,450; drawing on a CPU-only canvas (as in app WebViews) got 15–25% faster.
- **Exact stamps** (`stamp()`): still art is painted once into an image at the exact screen scale *and*
  the same sub-pixel offset it would be drawn at, then copied 1:1 onto whole device pixels, so it
  matches live drawing (checked pixel by pixel with `tools/drawcheck.js`). Stamped: trees (trunk; the
  canopy sways as a stamp at 1/4 px steps), bushes, rocks, props, flower heads, the stall, barn and
  home (in pieces, in their original draw order: the shopkeeper, hay, hook, weathervane, clothes,
  steam and smoke stay live between them), windmill tower, pond and lily pads, gate arch, lamps, the
  rug and signs, pad boards and prices, hives, scarecrow heads and picked-plot stubble. Glows are
  still added live. A stamp's key names everything it depends on (level, name, night, crew…).
  Off-screen stamps are skipped; while the view zooms (a kick) or a piece scales in an animation, it
  is drawn live. Images are kept within a pixel budget set by device memory (LRU).
- **Particle dots** (water, dust, bursts) are copied from a small image per colour and size (to 1/4
  unit) holding 16 sub-pixel offsets. Leaves, coins, rings and confetti stay live.
- **Chickens** use cached sprites like the workers: 24 poses per hop or peck cycle.
- **Workers: body and basket cached apart.** Picking a crop only repaints the small basket sprite
  (painted once in the standing pose; each walk frame's bounce and squash are applied when placed),
  and the body sprite is trimmed to the figure. Before, every pick redrew whole worker sprites and a
  160-entry first-in-first-out cache was too small for 12 workers: ~120 sprite rebuilds a second on a
  maxed farm, now ~1 (plus one small basket per pick).
- **Zoom kick fix:** the camera's zoom kick decayed toward 0 without reaching it, so for ~8 s after
  every purchase or level-up the scale differed by a hair each frame and every cached ground tile was
  rebuilt every frame (~2,000 tile repaints per kick). It now snaps to 0.
- **The player is still drawn live** (the hero is always on screen and closest to the eye).

**Three.js world renderer:** all visible world layers, including night lighting and
effects, use `src/three-renderer.mjs` and `src/farm-three-scene.mjs`. The legacy raw
WebGL renderer and Canvas gameplay fallback have been removed. The hidden device
test measures rendering costs without switching renderers.


## CrazyGames

Ready for a CrazyGames **Basic Launch** (SDK v3, no ads).

- **SDK v3** (`https://sdk.crazygames.com/crazygames-sdk-v3.js`, loaded async). `initPlatform()` waits up
  to 2 s for the script and 4 s for `init()`, so the game also runs anywhere else (GitHub Pages,
  offline, ad blockers); outside CrazyGames and localhost the SDK reports `disabled` and is left alone.
- **Events:** `loadingStart` at boot, `loadingStop` + `gameplayStart` on the first playable frame,
  `gameplayStop` while Settings, a chapter card or the welcome-back card is open, `gameplayStart` again
  after. `happytime` when a Harvest Festival is held. No ads are requested.
- **Mute:** the platform's `muteAudio` setting (and its change listener) silences the game even when
  the in-game sound button is on.
- **Saving:** through the **Data module** (synced across the player's devices), with localStorage as a
  fallback and for older saves. In the Developer Portal, set **Progress save** to the Data module option.
- **Requirements covered:** lands straight in gameplay; one 290 KB file (88 KB zipped, far under the
  50 MB / 20 MB mobile limits and 1,500 files); no external links, logins, fullscreen button or ads;
  English; PEGI 12 friendly; touch + mouse + keyboard; physics are time-based (same at 60/144/165 Hz).
- **Keys:** WASD by physical key position, so AZERTY players get ZQSD; arrows and Space don't scroll
  the page; Esc is not used (it exits fullscreen).
- **Small frames:** the compact HUD also applies to frames 560 px tall or less (CrazyGames 821×462,
  mobile 800×450). In landscape frames up to 800 px tall the upgrade card docks bottom-right and the
  chapter strip bottom-left, so the farmer in the middle stays visible.
- **iOS audio:** any tap resumes an interrupted AudioContext.
- **Build:** `tools/build-crazygames.sh` → `dist/harvest-rush-crazygames.zip` (index.html at the root).
- **Covers and preview videos** (needs the local server on :8767, Chrome and ffmpeg):
  - `node tools/trailer.mjs` records the two 19 s silent preview videos frame by frame from the real
    game (`?debug&trailer`: a scripted farmer picks with a combo, sells, buys a pumpkin-field upgrade
    and keeps harvesting) → `dist/video/harvest-rush-landscape-1920x1080.mp4` and
    `-portrait-1080x1620.mp4`. Each video's first frame is saved as the matching cover
    (`dist/covers/cover-landscape-1920x1080.png`, `cover-portrait-800x1200.png`), so cover and video
    start identically, as CrazyGames asks.
  - `tools/covers.sh` renders the square cover (`cover-square-800x800.png`) from `?debug&cover`.
  - The title sits in the bottom-right corner; field signs, basket counters and the price board are
    hidden in cover mode so the title is the only text.
  - **Premium covers (recommended upload):** `dist/covers/codex/` holds key-art covers made by GPT
    (Codex CLI image generation) from `store/codex-cover-brief.md`, with the game's own renders in
    `store/refs/` as style references: the hero large with an overflowing basket, a burst of coins and
    crops, golden-hour light, the glossy title bottom-right. The `-codex-cover.mp4` videos open on these
    covers and crossfade into gameplay at 1.5 s. To regenerate:
    `codex exec -C . -s workspace-write -i store/refs/ref-gameplay-landscape.png -i store/refs/ref-gameplay-portrait.png -i store/refs/ref-hero-closeup.jpg -i store/refs/ref-title-style.png - < store/codex-cover-brief.md`
  - `tools/keyart.sh` renders an in-engine premium alternative (`dist/covers/premium-*.png`,
    `?debug&cover&keyart`): the real hero redrawn large over a soft-focus farm, sun rays, a loot
    fountain and a glossy gradient title. `tools/shoot.mjs` is its DevTools screenshot helper.
  - `store/GPT_PROMPTS.md` has ready-to-paste ChatGPT prompts (style sheet, title lettering, one per
    cover size, a video shot list) for painted alternatives.
- **Local test:** `http://127.0.0.1:8768/` runs the SDK in local mode (console logs every event);
  add `&muteAudio=true` to test muting.

## Debug

Open with `?debug` to get a `window.FARM` hook:
`FARM.addCoins(n)`, `FARM.unlockAll()`, `FARM.maxAll()` (all fields Lv 5, stall Lv 7, 12 workers), `FARM.ripen()`, `FARM.goldCrop(fieldIndex, n)` (n golden crops), `FARM.view()` (camera), `FARM.away(seconds)` (show the welcome-back card), `FARM.giftReset(streak)`, `FARM.newOrder()`, `FARM.order()`, `FARM.festival()`, `FARM.festReady()`, `FARM.offline(seconds)`,
`FARM.idleRate()`, `FARM.save()`, `FARM.reset()`, plus the live `S` state, `P` player and `hands`.

## Tuning

Numbers live at the top of the script in `index.html`: `CFG` (speeds, capacities, pad drain time,
offline cap), `CROPS`, `FIELD_COST`, `UPG` (base cost, multiplier, max level), `COL` and `PAD_TINT` for colors, `PALS` for the farmer outfit
palettes, and `BK` / `BASKET_SLOTS` for the back-basket and its shallow produce arrangement.
The 3×3 layout of the farm is `FIELD_SLOTS` with the market in the middle cell.

## CrazyGames Basic Launch candidate — 2026-11-07

The upload is `dist/harvest-rush-crazygames.zip` (4.72 MiB compressed,
5.41 MiB total assets, 14 files). The SDK is the only external runtime resource;
Nunito and Lilita One are bundled locally with their SIL Open Font Licenses.
No advertisements, in-app purchases, external login, cross-promotion, custom
fullscreen button or third-party analytics are implemented.

The first rendered farm enables saving and SDK lifecycle reporting. Closing the
page before startup completes cannot overwrite an existing save. Hidden or paused
startup never generates a false gameplayStart event. Art/cover/trailer preview
sessions are read-only from startup. iOS audio resumes on a direct pointer, key
or touch-release gesture. Settings includes a 44 px close button and labeled audio
controls; short screens retain a scrollable settings panel.

Run `npm test` then `npm run build`. The build also runs `tools/check-launch.mjs`
and fails if the package exceeds the stricter 20 MiB mobile initial-size target,
1500 files, loses local fonts/licenses, adds absolute HTML bundle paths, introduces
ads/custom fullscreen calls, or fails the SDK lifecycle regression tests.

`tools/iframe-check.html` provides isolated HUD/order, upgrade and tutorial scenarios.
DPR 1 layout checks covered all published sizes: 907×510, 1216×684, 1077×606,
821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450 and 1080×607,
plus 390×844 portrait. Cards fit without horizontal overflow; purchase/close
controls are at least 44 px tall. These are layout checks, not physical-device
performance certification. Simulation, input, save migration, camera, rendering,
navigation and reminder regression suites also pass.

Submission extras are outside the game ZIP: three PNG covers in `dist/covers/v2/`
(1920×1080, 800×1200 and 800×800), `dist/submission-metadata.json`, and the
release-specific `dist/basic-launch-report.json`. The v2 covers use dedicated generated illustrations referencing Ravi and the
painted farm art. Each format is separately composed with the title as its only text;
the earlier screenshot-based covers remain in `dist/covers/` for comparison.
The report identifies its ZIP by SHA-256; regenerate the report when changing the
release ZIP.

Outstanding before submission: test the uploaded ZIP in the CrazyGames Developer
Portal Preview/QA tool; check actual Chrome/Edge, Safari/iOS, Android/CrazyGames
App and a 4 GB Chromebook; confirm title/asset rights and submission metadata. The two required gameplay
preview videos have been recorded and locally validated (see below).
No portal upload or publication has been performed. Local checks cannot guarantee
CrazyGames acceptance or performance on hardware that has not been tested.

Official requirements: https://docs.crazygames.com/requirements/intro/,
https://docs.crazygames.com/requirements/technical/,
https://docs.crazygames.com/requirements/gameplay/,
https://docs.crazygames.com/requirements/game-covers/.

## Promotional gameplay preview videos

The current versions are `dist/video/harvest-rush-promo-landscape-1920x1080.mp4`
and `dist/video/harvest-rush-promo-portrait-1080x1620.mp4`. Both are 18.0 seconds
at 30 fps, H.264/yuv420p MP4 with fast-start metadata and no audio track.
Landscape is 16.96 MiB; portrait is 17.56 MiB.

Six quick shots show wheat, tomatoes, a market sale, pumpkins, strawberries and
corn alongside carrots, purple grapes, giant watermelons, the duck pond and the
spinning windmill. Hard cuts remove travel and waiting; action within each shot
remains at normal gameplay speed with native Three.js camera zoom.
The guidance dots, destination arrow, instructional text and purchase panels are
omitted while wooden signboards (`MARKET`, `WORKERS 8`, `RAVI'S FARM`) and the
compact coin wallet remain. Each opening uses its matching v2 cover
for approximately 0.3 seconds. Earlier continuous takes remain as older files.

Open `/dist/video/index.html` on the local server to play/download the current
promotional versions. Technical validation is in `dist/video/validation.json`.
Run `HARVEST_FFPROBE=/path/to/ffprobe node tools/check-preview-videos.mjs` to check
dimensions, duration, 30 fps, H.264, the 50 MiB limit and absence of audio.
Both videos were fully decoded without errors and visually sampled for QA.

`tools/record-promo.mjs` and `tools/preview-recorder.html` are local authoring tools
excluded from the game ZIP. They stage six separate takes in an isolated no-save farm
and drive ordinary game movement at native Three.js zoom with the real coin HUD.
The HUD capture library and MIT license are in `tools/recording-vendor/`.
FFmpeg/FFprobe are authoring dependencies.

## Final progression smoke test — 2026-11-07

`npm test` now includes `tools/smoke-progression.mjs`: 22 deterministic checks run
the full game simulation in a Node VM with presentation/audio stubbed. The early
harvest/sale/upgrade/egg/carrot flow uses earned coins. Controlled late-game states
cover all 15 goals, nine chapters, eight fields, upgrade/crew caps, autonomous
workers, save reload/migration, offline collection, festival reset, 30/60/120/144/165 Hz
movement and paused/hidden-frame behavior. `dist/progression-smoke-report.json`
records results and the tested ZIP hash.

The browser smoke used a separate origin at `127.0.0.1:8775`, preserving the user's
existing save. Fresh onboarding, the first sale and upgrade, reload, settings
pause/resume, egg collection and carrot unlock were exercised through the UI.
The debt pad was visually checked beside the moneylender at the supplied reference
viewport. No physical-device or live CrazyGames portal certification is implied.

Fixed during this pass: duplicate charges from stale rapid purchase input,
max-level field/market offer crashes, malformed saved-array startup crashes,
fractional coin shortfall rounding, and payment-pad alignment. Valid existing saves
and older growth-upgrade migrations remain supported. Explicitly reopening a
dismissed upgrade card still works. The release ZIP was rebuilt and checked.

## Lossless build-size optimization

The release ZIP decreased from 6,615,136 to 4,945,896 bytes: 1,669,240 bytes
saved (25.2%; 6.31 → 4.72 MiB). Unpacked assets decreased from 7.61 to 5.41 MiB.
`dist/asset-optimization-report.json` records the before/after ZIP sizes, component
measurements, validations and SHA-256. The previous ZIP is retained at
`dist/harvest-rush-before-lossless.zip`.

Production uses four exact-lossless WebP atlases and five complete WOFF2 fonts.
Dimensions, RGBA values (including hidden RGB), sprite bounds, glyph coverage,
metrics, outlines, instructions and shaping tables are preserved. PNG and TTF
masters remain in source; the package contains only their smaller production
versions and unchanged licenses.

`createImageBitmap` decodes with `premultiplyAlpha: 'none'`: default WebP browser
decoding rounds some translucent edges differently from PNG. Popup crop icons
paint directly into canvas to avoid another alpha round trip. Browser comparison
found zero image-channel differences for all four atlases and eight popup crops,
and identical text samples for all five fonts at 14/24/32 px. The actual packaged
farm loaded all four painted atlases, showed the correct crop icon and retained
saved progression. Original image decoding remains as a recovery path for engines
without native bitmap decoding.

Authoring dependencies: `pip install -r tools/requirements-assets.txt`.
Run `python tools/optimize-assets.py --write` to regenerate assets, or omit `--write`
to reverify them. `assets/optimized-assets.json` pins the proof to exact source and
production hashes. `npm test` and the build check those hashes; the build also
checks that original PNG/TTF duplicates are absent. `tools/check-assets.html`
provides the browser pixel/text comparison, and
`python3 tools/check-atlas-metadata.py` verifies the original alpha bounds.

## Situational navigation after the tutorial

The dots and destination arrow stay available during the three tutorial lessons.
After completion, ordinary play has no route. Existing full-bag and idle reminders
can enable a route for up to six seconds: a newly full basket points toward the
market, while 18 seconds of inactivity can briefly point to a useful goal. Idle
input clears the route immediately; full-bag help expires even if the bag remains
full. Existing 25-second full-bag and 50-second idle cooldowns prevent repeated
nudges. Offers, pauses and hidden tabs suppress guidance. Optional objectives
remain visible without continuously steering the player.

`navigationTarget()` gates the renderer while `goalTarget()` retains objective
selection for contextual messages. `tools/check-context.mjs` verifies normal play,
tutorial guidance, triggering, expiry, input dismissal, cooldowns and suppression.
