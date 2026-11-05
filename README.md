# HARVEST RUSH — farming idle arcade

A top-down idle arcade farmer that runs entirely in the browser. Single `index.html`,
no build step, no assets: a cute cartoon look drawn with the 2D canvas API, seen flat from above (`TILT` is 1;
lower values would squash the ground into a 2.5D tilt). Farmers, crops, trees and the market stall
are drawn standing up via `standUp()`; fields and pads are raised blocks with front
faces, the stall has a roof and side wall, shadows lie on the ground, and the farm sits on a floating island with a cliff edge. Crops are emoji, sound effects and a soft music loop synthesized with WebAudio, progress saved
in localStorage.

## Run

    python3 -m http.server 8767 --directory HarvestRush
    # then open http://localhost:8767

(`file://` works too, since there are no modules.)

## Controls

| Input                  | Action                                      |
|------------------------|---------------------------------------------|
| Drag anywhere (touch or mouse) | Virtual joystick: move the farmer   |
| WASD / arrow keys      | Move                                        |
| Walk over a ripe crop  | Harvest it into your bag                    |
| Walk onto the SELL mat | Sell your bag, one item at a time           |
| Gate post, rug, barn   | The button that appears (or Space/Enter) upgrades or buys |

## Loop

1. **Harvest and sow.** Ripe crops pulse with a glow. Walking over them makes each crop fly
   into the wicker basket strapped to the farmer's back, where it settles into neat rows (two
   per row) that stack up behind the head, up to the bag capacity. A picked plot is bare soil
   and grows nothing until it is sown: walk over it to scatter seeds (no cost, no menu).
   Workers harvest first and sow bare soil on their way or when nothing is ripe; a field with
   golden soil (its top level) sows itself. A bouncing arrow guides the
   first harvest, the first sale and the first sowing.
2. **Sell.** The market stall in the middle of the farm has a tiled roof with a hanging sign,
   a striped canopy on posts with lanterns, a jar shelf, a counter with produce crates, an OPEN
   board and a coin jar, barrels, crates, a grain sack and flower pots around it, and a plank
   deck with a fringed, woven market rug, a little brass weighing scale and a SELL HERE signpost in
   front. The rug glows while you carry crops. Step on the rug and crops arc out
   of your basket to the shopkeeper, who waves with each one. Each crop type has its own price.
3. **Upgrade things where they stand.** There is no shop. Walk up to something and one button
   appears with a before-and-after line, and a bouncing green arrow marks anything you can
   afford from across the farm:
   - **Fields** upgrade at their gate post (stars show the level, Lv 1 to 5): mended fence
     (grows 25% faster), sprinkler (45% faster), beehive (30% double crops), golden soil
     (sells x1.5 and sows itself). Each field has a light split-rail fence (two thin rails, posts only at the corners, mid sides and
     the gate); new fields start with pale wood and a broken rail that the first upgrade mends.
   - **The market stall** upgrades from the sell rug when your basket is empty (Lv 1 to 7):
     fresh crates, price board, produce cart, a helper for Meera, flower boxes, golden sign.
     Each level raises all prices and later ones sell faster.
   - **The barn** is the workers' home and where you hire them; the sign counts them. When nothing is
     ready to pick, workers walk back and doze on the porch beside it, then head out as crops ripen.
     The barn grows with the crew, each stage making every worker 10% faster:
     - At 4 workers: a bunk shed with pink curtains, a bench and a water barrel.
     - At 8 workers: a silo with a dome, a ladder and a red band.

     The barn itself is red plank walls in a white trim frame, with a shingled gambrel roof, a
     hay-loft door with hay poking out, a hoist beam with a swinging hook and a rooster weathervane
     that turns with the wind. It sits on its own straw-scattered yard. Its X-braced doors slide
     apart to show the warm, hay-filled inside when you stand at them, and at night the windows,
     the loft and the door lanterns light up for the crew.
   - **Your basket and sandals** improve for free with every farm level: +4 carry each level
     and faster walking up to level 16, with the basket growing, a red band from level 6 and a
     gold rim from level 11.
   Every upgrade spot (each field's gate sign and the barn door) has a painted stand-here marker on
   the ground: a see-through ring with an up-arrow, green when you can afford it, beige when you
   can't, and gold while you're standing on it. Locked fields have a For Sale signpost; the moneylender's debt and the home are small mats.
   Nothing is ever charged just by walking somewhere.
4. **Idle.** Farmhands walk to the ripest crops, harvest a bagful, and sell it at the market
   without you. They keep earning while the tab is closed (estimate based on your fields
   and hands, at 50% efficiency, capped at 8 hours). Crops also keep growing while you're away.

## Interface

Text uses Nunito, a clean rounded font (the HARVEST RUSH logo keeps Lilita One), in the interface and
for everything drawn in the world. The interface is flat and farm-coloured (warm wood, parchment and leaf green, soft shadows, no hard
outlines). The wallet is a large cream-and-gold coin panel at the top left with the idle rate under it, and
the farm level is a big round badge at the top right with an XP ring, the farm's name and a workers
and basket line. Upgrades, unlocks, hiring, the debt and the home open a large, clear popup: the item's icon and
name, its level before and after, a highlighted line saying what you get, and one full-width button
with the price on it (it says how much more you need when you can't afford it). The corner
buttons are round leaf buttons with drawn icons.

- **Upgrade card controls:** only a deliberate tap on the green button buys, and it buys on
  release, not on touch. A finger that slides off the button turns into a walk, and drags that
  start anywhere else on the card move the farmer, so the card never traps you. A tap that was
  already landing when the card popped up is ignored (300 ms). The ✕ (or Esc) hides the card until
  you step off that sign; Space/Enter buy on a keyboard.
- **Phone layout** (screens up to 520 px wide): a compact HUD so the farm stays visible. The
  wallet, quest and order cards, level ring, hint, corner buttons (42 px), chapter strip and upgrade
  card are all scaled down; on a 402×874 iPhone the upgrade card is about 200 px tall instead of
  300+, and the left-hand cards take about 195 px instead of 245. Desktop sizes are unchanged.
- **Story strip controls:** the chapter strip never blocks play. Drags that start on it walk the
  farmer; "Read the chapter" and the ✕ (now a 36 px round button) act only on a tap, on release, and
  ignore a tap that was already landing when the strip slid in.

## Map

The market sits on a clean paved square across the top of the farm: the stall centred at the back
with the sell rug in front, the workers' barn on the left and the home lot on the right, mirrored,
lamps flanking the exit to the road and flowers in the corners. Baba's old tree stands just outside,
beside the barn. From the square a road sways gently down to the entrance arch, with one field on
each side of it per row (wheat and carrot nearest the market, grapes and melon by the entrance). Each
field's inner edge sits about 100 units from the road's centre, so on a 375-pixel phone at least half
of both neighbouring fields is on screen while you walk past them. Each field has a single gate sign
on the road's shoulder showing its crop, level stars and ripe count; it is also where you upgrade it.
The road between fields is kept clear (lamps only light the market square), the duck pond and the
windmill sit in the outer meadows, and a tree line frames the farm. The road is `ROAD_SEGS` (three gentle curves), rows are
`FIELD_ROWS` (`[y, side]`), `FIELD_GAP` sets how close fields hug the road, and `roadXAt(y)` gives
the road's centre at any height so fields, lanes, posts, lamps and pebbles follow it.

The grass carries soft tufts and clover (`TUFTS`, kept off fields, road, lanes, square and pond),
and the meadows hold farm props: hay bales, wheelbarrows of produce, a log pile and flower patches.
The square has a faint checker tile with a border band, a stone well in its top-left corner, and
flower planters top-right and on either side of the walk. Props in `TALL` are depth-sorted with
the characters. Workers show their basket count only when it is full or they are beside you;
yours always shows.

## Game feel

The camera has no damping or look-ahead: the farmer moves freely inside a central dead zone (15% of the screen, `DEAD_ZONE`) and the camera follows exactly once they leave it, and kicks in slightly on big moments; buying or
upgrading sends out shockwave rings (and a short vibration on phones); a newly bought field's plots
spring up one by one and an upgraded field's plots hop; sold crops send coins arcing up into the
coin counter, which counts up and bumps.

Floating text comes in three clean styles (`addPop`):
- **Messages** become cream pills with dark text, matching the flat UI: quest done, lunch, golden
  crops, upgrade names, "Need X more", "Basket full". A coloured edge and dot mark the kind: gold
  for rewards, red for warnings, green for upgrades. Pills that appear together stack instead of
  overlapping. Any pop containing words becomes a pill automatically, and `{pill:false}` opts out.
- **Coin pops** show a coin icon with a white number. Quick sales merge into one pop that counts up
  instead of stacking up numbers. Workers don't pop their own sales.
- **Counters** (`x2!`, combo) stay as bold coloured numbers with a thin outline.

Wording is sentence case rather than shouting capitals.

## Art

A 2.5D cartoon look drawn entirely with the canvas API: a seamless grass texture with crisp
cel-style patches, tufts, clover and flowers; fields set into a lighter grass lip; worn paths with a lighter centre and pebbles; soil with furrows and grit;
trees and bushes with shaded undersides and root flares; a soft vignette; and a four-minute
day-night cycle (dawn, day, golden hour, dusk, night) that tints the scene, changes the sky, and
makes lanterns, the house window and the barn loft glow while fireflies drift over the fields at
night (the day starts in the morning). Picked crops throw spinning leaves, sales throw spinning
coins and sparkles, small flocks of birds cross the farm with shadows on the ground, and petals
drift on the wind. Tall phone screens zoom in so the farm fills the whole height. Landmarks: a pond with ripples, lily pads, reeds and a duck paddling a slow loop, and a
windmill with turning sails. All of it lives in the drawing section of `index.html`; `DAY_LEN`
sets the cycle length.

## The opening

The first minutes are built so a new player always knows exactly one thing to do.

- **No title card:** the game opens straight onto the farm. A new farmer is named Ravi (he/him);
  name and pronouns can be changed any time in Settings, and the farm label updates as you type.
  Sound starts on the first tap or key press.
- **First screen:** just the farmer beside a ripe wheat field outlined in gold, a finger that swipes
  from the farmer into the wheat (until the first step), and one line: "Drag anywhere to walk". The
  prologue strip waits until the first few stalks are picked.
- **Guided tutorial** (the first 5 quests: sell the first basket → sow 8 plots → upgrade the wheat
  field → collect an egg → buy the carrot field; `TUT_STEPS`):
  - The quest card, the hint at the bottom (`tutHint`) and one gold bouncing arrow
    (`tutTarget`, plus the edge arrow when it's off-screen) always agree.
  - Hints show live progress: "Keep picking: 5/8", "Pick and sell wheat: 12 more to upgrade the
    field", "Sell more wheat: 18 more for the carrot field".
  - A full basket always points to Meera's stall.
  - The quest card reads "Step 2 of 5" with five progress dots and pops when a new step starts;
    a "Next: …" note floats up after each step, and "FARM IS YOURS!" ends the tutorial.
  - The hint is a larger gold-edged pill with an icon for each action.
  - In the world, a gold dashed ring marks the goal (the whole field is outlined when the goal is
    picking or sowing), and marching dots lead from the farmer to it (`drawTrail`).
  - On upgrade and buy steps, a tapping finger points at the green button.
  - The sowing step never goes blank: with no bare soil it points at ripe wheat to clear first.
  - Green upgrade arrows show only for the current step.
  - The moneylender and his debt mat wait until the tutorial is done.
  - For the egg step the arrow points at a hen, and a hen lays within about 4 seconds.
- **Early rewards:** Meera pays triple for the very first basket. Picking quickly builds a combo,
  shown as one counter that updates in place (x3, x6 GREAT!, x10 WOW!), and adds up to +60% to that
  basket's sale.
- **Timing:** an autopilot that only follows the game's own arrow finishes the tutorial in about
  30 seconds; a real player takes about two minutes, with no waiting or dead ends.
- **Later:** chickens arrive with Chapter 1. Dev, the first farmhand, walks in free with Chapter 3.
  Story strips show for 7 s and never block play.

## Story mode

On a new game you pick a name and pronouns (he, she or they) on the start card; the ⚙️ settings
changes both later, and the whole story adapts, including verb agreement. Chapters never pause the
game: each arrives as a short two-line strip above the controls that fades after a few seconds, with
"Read the chapter" opening the full text (and the partner's name field in Chapter 3).

**First minutes.** The farmer starts beside the wheat field so the first crops are on screen even
on a phone. A screen-edge pointer always leads to the current goal when it is off screen (ripe crops,
the market when the basket is filling, the next upgrade you can afford, the moneylender, the barn).
The screen starts almost empty and fills in as it matters: the quest card appears once you move, the
farm level card, the moneylender and his mat after the first sale, hiring at the barn once Dev has
joined, and only the next field is ever for sale.

On a new game you name the hero (default Ravi; Settings renames later), and the prologue
card tells how the farm was lost. Eight more chapters appear as story cards at milestones,
each using the chosen name: first sale, carrot field, first farmhand, paying the moneylender's
300-coin debt (a mat beside the market), pumpkin, strawberry, corn, and the last two fields.
The farm starts run-down and repairs itself as chapters pass: the wheat fence has missing and
leaning posts until chapter 2, chickens only arrive with chapter 2, the hero wears patched
clothes and goes barefoot until the debt is paid, the stall's awning is faded, torn and patched
until chapter 4 (when Meera chalks the hero's name on the counter board), the scarecrow leans
with a torn shirt until it is rebuilt taller with its sock crow in chapter 6, and the bunting
and lanterns only go up for the festival in chapter 7. Chapter 3 also introduces the hero's partner (Priya by default; the card asks for her name, and the
Settings can change both names later). She appears on the farm after chapter 5 as a wandering
helper who feeds the chickens, which makes them lay eggs faster, and a "Build a home" mat appears
by the market (100K). The wedding is chapter 7 and needs both the corn field and the home; from
then on she also sells beside Meera so your sales go faster, and the house gets a heart on its roof.
The house itself is a cottage on its own lawn: stone base, timber frame, a porch over a rounded
door, shuttered windows with flower boxes, a round attic window, and a clothesline with the
couple's clothes swaying in the wind. The windows glow at night. Once it is built, walking past
it gives a home-cooked lunch: 30% faster walking for 20 s, recharging every 60 s (`LUNCH_LEN`,
`LUNCH_CD`). When lunch is ready, a pie steams on the window sill and a 🍲 bubble floats over the
roof. While it lasts, dust puffs kick up behind you. The full text is in `STORY.md`; the
in-game cards are the `STORY` array in `index.html`. Older saves skip chapters already lived.

## Characters

The hero is drawn to stand out: a woven conical straw hat with a gradient, a red ribbon band
with a tail and a wheat sprig, big brown iris eyes with brows, a collared cream shirt with buttons,
rolled cuffs, a leather belt with a gold buckle and a hip pouch, a knotted red neckerchief with
flapping tails, rolled olive trousers and strapped sandals, cel shading on hat, shirt and trousers,
a thicker outline, a larger build, and a soft pulsing spotlight ring under the feet. Farmhands are a mixed crew with their own hair, skin, hats and clothes:
a kurta-and-dhoti farmer with a draped orange scarf and mustache, a bandana-and-bun worker,
a kid in a cap and overalls with freckles, a straw-hat vest wearer, a braided bandana worker,
and a bob-haired farmer in a kurta. Looks are defined in `LOOKS` in `index.html`.

## Living fields

- **Plants grow on screen, drawn by hand.** Each crop grows the way it really does: wheat
  heads and corn cobs form on tall stalks, carrots stay in the soil with only the leafy top and
  an emerging orange shoulder showing, tomatoes redden on a bush, strawberries hang low, grape
  bunches turn from green to purple under the leaves, and pumpkins and melons swell on the
  ground beside their vines. Foliage grows with the timer, the fruit appears at 50% and
  colours up by ripeness, then bobs with a glow and sparkles when ready. A wind wave rolls
  across every field. (Emoji are only used for picked produce: basket, pads, signs, market.)
- **Every crop is drawn by hand through its whole life:** young leaves, then flowers, then green
  fruit that colours up, then ripe (bobbing, glossy, sparkling).
  - **Wheat:** seven stalks with braided, whiskered ears that turn gold and nod; golden light
    waves roll across a ripe field.
  - **Carrot:** feathery fronds over an orange shoulder that pushes up out of the soil.
  - **Tomato:** a leafy bush on a cane stake, yellow flowers, then green → orange → red fruit.
  - **Pumpkin / Melon:** a ground vine with lobed leaves, a curly tendril and a yellow flower;
    ribbed pumpkins, striped melons.
  - **Strawberry:** low trifoliate leaves on straw mulch, white flowers, seeded berries.
  - **Corn:** a tall stalk with broad arching leaves, a tassel, and two husked cobs with silk.
  - **Grapes:** a vine twisting up a post and crossbar, five-lobed leaves, hanging bunches.
- **Each crop comes off differently:**
  - Wheat and corn get a sickle swish and chaff.
  - Carrots pop out with dirt clods.
  - Tomatoes, strawberries and grapes pluck with a juicy splash.
  - Pumpkins and melons thunk down with a dust puff.

  Each has its own sound. Leftovers stay on the plot until it is sown again: stubble for wheat,
  stubs for corn, a dug hole for carrots, a dried vine for pumpkins and melons.
- **Golden crops:** now and then a crop ripens golden (glowing, extra sparkles) and pays 10× its
  price on top. The first one is likely soon after your sixth harvest; after that the chance is
  3% per ripening.
- **Critters:**
  - Sparrows drop in to peck at ripe wheat and corn, and scatter with a chirp when you walk up.
  - A rabbit sneaks into the carrot patch to nibble, and bolts when you come close.
- **Chickens** (two per field) wander, peck, flee with a squawk when you get close, and lay
  eggs. Walk over an egg to collect it: it pays three times the price of your best crop.
- **Bees** hover over ripe crops, **scarecrows** with a crow guard each field, and the field
  sign shows a growth bar and a bouncing badge with the number of ripe crops.
- **Sprinklers** appear once you buy Water and spray the field in cycles.

## Content

| Field      | Crop | Price | Grow time | Unlock cost | Perfect-play arrival |
|------------|------|-------|-----------|-------------|----------------------|
| Wheat      | 🌾   | 1     | 4 s       | free        | start                |
| Carrot     | 🥕   | 3     | 7 s       | 40          | 0.2 min              |
| Tomato     | 🍅   | 8     | 11 s      | 500         | 1.6 min              |
| Pumpkin    | 🎃   | 20    | 16 s      | 6K          | 8 min                |
| Strawberry | 🍓   | 45    | 22 s      | 45K         | 17 min               |
| Corn       | 🌽   | 100   | 30 s      | 350K        | 28 min               |
| Grapes     | 🍇   | 220   | 40 s      | 2M          | 57 min               |
| Melon      | 🍉   | 500   | 55 s      | 10M         | 106 min              |

Upgrade tables live at the top of the script: `FIELD_UP`, `FIELD_GROW` and `FIELD_UP_MUL` for
fields, `STALL_UP` and `STALL_SELL` for the stall, `HIRE_BASE`/`HIRE_MUL`/`HIRE_MAX` for workers.
Older saves carry over: Water and Seeder levels become field levels, Prices becomes the stall
level, and Bag and Speed now follow farm level.
Costs scale geometrically per level. Farm level is an XP bar driven by total coins earned.

### Balance

The economy was tuned with a headless simulator, `tools/sim.js`, which runs the real game code with
a bot that picks, sells and buys the cheapest thing it can afford. "Perfect-play arrival" above is
that bot; a real player is roughly 1.5–2× slower, plus offline earnings between sessions.

- **Curve:** each new field takes about twice as long as the one before. The whole farm is maxed
  at about 2 hours of perfect play, and the first festival is affordable at about 2¼ hours.
- **Field upgrades** cost the larger of `(price×30+5) × FIELD_UP_MUL` (1, 5, 20, 70) and a share of
  the field's land price (`FIELD_UP_LAND`: 5%, 15%, 35%, 75%), so late fields always have
  something worth saving for.
- **Stall:** 60, 500, 6K, 80K, 900K, 6M for ×1.3 → ×5.5 prices.
- **Workers:** 100 × 2.6ⁿ (12 max). Each carries 4 crops, +1 every two farm levels, up to 12.
  The farmer earns 60–80% of income; the crew is a steady supplement and the offline engine.
- **Home** 100K, **debt** 300, **first festival** 15M (×5 each season).
- **Late quest rewards** scale with their goals (home 15K, corn 50K, every field 1.5M).

To re-run: open `http://127.0.0.1:8767/?debug`, then in the console load `tools/sim.js` and run
`await SIM.run(3600*3)`; read `SIM.log` (purchases with minute and level) and `SIM.curve`
(coins per minute and the farmer's share). It only runs on the 127.0.0.1 test origin and never saves.

## Reasons to come back

- **Welcome-back card.** After 2 minutes or more away (closing the game or switching tabs),
  returning players get a card: "Welcome back, Ravi! You were away 3h 12m", with what the farm
  earned and how many workers kept picking. The coins wait for the **Collect** button and then
  fly into the wallet. Uncollected earnings are saved (`pendingAway`), so they are never lost.
- **Daily gift.** Once a day a wrapped basket from Meera appears in the market square, between
  the barn and the sell rug, with a "Day N" tag; walk over it to open it. The edge arrow points
  to it when it is off-screen.
  - Value: about 90 s of idle income (with a floor for early farms) times the streak multiplier
    (`GIFT_MULT`: 1, 1.5, 2, 2.5, 3, 4, then 6× on day 7).
  - Streak: claiming every day raises it; missing a day resets it to day 1; after day 7 it
    starts again.
  - Hidden during the first-minutes tutorial (until quest 3).
- **Meera's orders.** After your 10th sale, Meera calls out timed orders ("The school kitchen
  ran out. 30 carrots, please!").
  - A card under the quest shows the crop, progress, a bar, the timer (pulsing red under 20 s)
    and the reward.
  - Only your own sales of that crop count.
  - Finishing pays the larger of 2.5× the crops' value or 40% of what the farm earns idle over
    the order's time, so orders are worth chasing early and late.
  - A missed order just expires with a kind word. The next one comes 40–80 s later.

## The Harvest Festival (new seasons)

Once the story is complete (all 9 chapters) and all 8 fields are open, a 🎪 festival mat appears
in the square, right of the sell rug, and Meera suggests it.

- **Cost:** 15M for the first festival, then 5× more each time (`FESTIVAL_BASE`, `FESTIVAL_MUL`).
- **Holding it:** a banner and about 3 seconds of fireworks, then a new season starts.
  - **Starts over:** coins (to 100), fields (only wheat open, all at level 1), the crew and the stall.
  - **Stays:** the story, the home, family, level, basket and sandals, and lifetime stats.
- **Reward:** a permanent ribbon. Every ribbon adds +50% to all crop prices (`seasonMult`).
- **Keepsake:** each ribbon hangs as a prize rosette on the farm gate (up to 6 shown), and the
  farm sign reads "Ravi's Farm 🎀2".
- **Story beat:** a "Season N · A new spring" strip opens the new season.

## Sound

All sound is synthesised with WebAudio; there are no audio files.
- **Mix:** effects, music and ambience have their own volume channels under a master mute. They
  share one soft room reverb, and a compressor keeps pile-ups from clipping. World sounds (chickens,
  ducks, fireworks) are panned left or right to where they happen.
- **Instruments:** `voice()` (a filtered oscillator with sweeps), `noise()` (filtered noise for
  rustles, whooshes, thuds and steps), `mallet()` (kalimba/marimba-like) and `pluck()`. Busy
  effects are throttled so fast play never stacks a wall of sound.
- **Effects:**
  - Picking makes a bubbly pop that climbs a pentatonic scale with the combo.
  - Coins play a two-note ding.
  - Buying, upgrading and levelling up play marimba arpeggios.
  - Golden crops play a shimmering run.
  - Wheat and corn get a sickle whoosh, carrots pop out of the soil, and pumpkins and melons land
    with a weighty thud.
  - Menu buttons click softly.
- **Footsteps** change with the ground: soft on grass, crunchy on the road, a tap on the paved
  square, muffled on soil.
- **Life:**
  - Chickens cluck when they scatter.
  - Ducks quack when you're near the pond.
  - A rooster crows at dawn.
  - Sparrows chirp.
  - Festival fireworks boom and crackle.
- **Music:** a C–Am–F–G loop with filtered pads, a soft bass, and a kalimba tune with an A and a B
  section (16 bars before it repeats). By day a soft shaker and kick join in. At night it slows,
  the beat drops out and only a few kalimba notes remain.
- **Ambience:** birdsong by day (trills, whistles, chirps) and crickets at night.

## Settings

The ⚙️ button (bottom right, next to the quick mute) opens Settings, which pauses the game:
- volume sliders for music, sound effects and birds & crickets,
- a vibration toggle,
- your name and pronouns, and her name once she has been met (the farm label updates as you
  type; closing Settings with a new name greets you by it),
- Reset farm (with a confirmation).

Everything is saved in `S.settings`.

## Performance

Rendering is tuned for phones (frame time went from 8.7 ms to 2.3 ms on a desktop with all 8
fields on screen).
- **Crop sprites:** each crop is painted once per growth stage (16 steps, plus ripe and golden)
  into a small sprite (`PLANT_CACHE`). Each frame just stamps it with live sway, ripe bounce, the
  wheat shimmer and the golden glow.
- **Field images:** each field's soil, rows, mounds and fence are painted once into one image
  (`FIELD_CACHE`). It is redrawn live only while a new field springs in.
- **Culling:** fields and decor off-screen are skipped (`inView`).
- **Pixel density:** capped at 2×. Caches rebuild automatically at the new scale when the zoom
  or pixel density changes.

When changing crop art, edit the draw functions as usual; the sprites are made from them.

**Full farm on weak phones.** With everything unlocked (8 fields at Lv 5, 12 workers, partner,
home, festival) the game adapts to the device:
- **Graphics quality** (`QUAL`, Settings ▸ Graphics: Auto / High / Battery saver). Auto starts one
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
- **Worker sprites** (`CHAR_CACHE`, lighter levels): each worker is stamped from a cached image per
  look, facing, walk frame (8) and basket fill, with 94% reuse; the farmer you control is drawn live.
- On a 402×874 phone screen, the lowest level draws 4× fewer pixels than High.

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
- **Local test:** `http://127.0.0.1:8767/` runs the SDK in local mode (console logs every event);
  add `&muteAudio=true` to test muting.

## Debug

Open with `?debug` to get a `window.FARM` hook:
`FARM.addCoins(n)`, `FARM.unlockAll()`, `FARM.maxAll()` (all fields Lv 5, stall Lv 7, 12 workers), `FARM.ripen()`, `FARM.goldCrop(fieldIndex, n)` (n golden crops), `FARM.view()` (camera), `FARM.away(seconds)` (show the welcome-back card), `FARM.giftReset(streak)`, `FARM.newOrder()`, `FARM.order()`, `FARM.festival()`, `FARM.festReady()`, `FARM.offline(seconds)`,
`FARM.idleRate()`, `FARM.save()`, `FARM.reset()`, plus the live `S` state, `P` player and `hands`.

## Tuning

Numbers live at the top of the script in `index.html`: `CFG` (speeds, capacities, pad drain time,
offline cap), `CROPS`, `FIELD_COST`, `UPG` (base cost, multiplier, max level), `COL` and `PAD_TINT` for colors, `PALS` for the farmer outfit
palettes, and `BK` / `BASKET_ROW_H` for where the back-basket sits and how crops stack in it.
The 3×3 layout of the farm is `FIELD_SLOTS` with the market in the middle cell.
