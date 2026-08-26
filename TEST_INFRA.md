# TEST_INFRA: 4-Tier Automated Test Architecture & Quality Infrastructure
**Project**: Super Rivelles Peris World — 2.5D Retro-Modern Masterpiece  
**Track**: E2E Systems & Automated Quality Engineering  
**Version**: 2.0.0  
**Test Suite Runners**: `node test_mechanics.js` & `node test_e2e_systems.js`

---

## 1. Executive Summary & Test Philosophy

Super Rivelles Peris World utilizes a multi-layered, deterministic quality assurance methodology. Because the runtime is a single-canvas HTML5 retro-modern platformer with fixed-timestep physics, procedural Web Audio synthesis, and dynamic DOM modal overlays, tests must evaluate the entire game engine in a high-fidelity Node.js VM sandbox with Canvas 2D, Web Audio API, and DOM polyfills.

The testing architecture is structured into a rigorous **4-Tier Methodology**:
- **Tier 1: Feature Coverage** (Unit and functional baseline: $\ge 5$ distinct test cases for each of the 18 features in `PROJECT.md`).
- **Tier 2: Boundary & Corner Cases** (Extreme values, physics edge conditions, nil/empty/corrupted state recovery, rapid input spam: $\ge 5$ tests per feature).
- **Tier 3: Cross-Feature Combinations** (Pairwise and multi-system integration between character powers, mounts, boss phases, cosmetic accessories, audio cues, and physics zones).
- **Tier 4: Real-World Application & End-to-End Scenarios** (Complete simulated user journeys: full campaign speedruns, death-defying boss rushes, shop purchasing loops, map navigation, and save persistence across browser sessions).

---

## 2. Feature Inventory Matrix (18 Features)

| Feature ID | Feature Name | Core Module | Primary Contract |
|---|---|---|---|
| **F1.1** | Secret Star World Map Node | World Map / Levels | `LEVEL_CONFIGS[9]`, `isStarWorldUnlocked()` |
| **F1.2** | Cosmic Gravity Physics | Physics Engine | `effectiveGravity = GRAVITY * 0.50`, `MAX_FALL = 5.8` |
| **F1.3** | Floating Crystal Platforms | Platform System | `CrystalPlatform`, `hoverOffset`, `shimmerTimer` |
| **F1.4** | Cosmic Nebula Particle Fields | Particle Subsystem | Dynamic stardust & chromatic nebula fields |
| **F1.5** | Cosmic Challenge Stage & Boss | Levels & Boss AI | 4200px gauntlet, 3 Star Coins, `astralis` Boss |
| **F2.1** | Boss Rush Menu Entry Points | UI / State Machine | Main menu & pause modal entries, `startBossRush` |
| **F2.2** | Sequential 9-Boss Arena Gauntlet | Boss Arena Loop | Canonical 9-boss sequence, stage transition |
| **F2.3** | Surviving Health Carryover | Combat Engine | 3-heart model, persistent HP, intermission recovery |
| **F2.4** | High-Precision Live Timer & HUD | HUD / Rendering | `MM:SS.mmm` timer, boss counter (`X/9`), boss HUD |
| **F2.5** | Victory & Ranking Persistence | Save / Score Engine | Grade calculation (S/A/B/C), `srpw_bossrush_record` |
| **F3.1** | Centralized Cosmetics Catalog | Royal Boutique | `COSMETICS_CATALOG` 10-item schema, slot layers |
| **F3.2** | Star Dust Currency Wallet | Economy / Save | `starDust` acquisition, validation, persistence |
| **F3.3** | Dynamic Boutique Shop UI | UI / Transaction | Purchase validation, equip states, error handling |
| **F3.4** | Layered Multi-Character Rendering | Sprite Render Pipeline | 5 characters × 10 accessories × motion states |
| **F4.1** | Multi-Layer Parallax Backdrops | Background Renderer | 4-layer parallax depth, theme gradients |
| **F4.2** | Cinematic Boss Entry Banners | Visual Polish | 90-frame letterbox banner, dramatic boss titles |
| **F4.3** | Impact Hit-Sparks & Particle Geometry | VFX System | 4-point starburst sparks, hit-stop frames |
| **F4.4** | Expanded Polyphonic Web Audio SFX | Audio Synthesizer | `SoundFX` BGM tracks (`cosmic`, `bossrush`), SFX |

---

## 3. Tier 1: Comprehensive Feature Coverage ($\ge 5$ Tests per Feature)

### F1.1: Secret Star World Map Node
1. `T1_F1_1_01`: Node S-1 exists in `LEVEL_CONFIGS` at index 9 with name `"S-1: Vía Láctea Secreta"` and theme `"special_star"`.
2. `T1_F1_1_02`: `isStarWorldUnlocked()` returns `false` when player has < 20 Star Coins and World 9 is not cleared.
3. `T1_F1_1_03`: `isStarWorldUnlocked()` returns `true` when player collects $\ge 20$ Star Coins.
4. `T1_F1_1_04`: `isStarWorldUnlocked()` returns `true` when player clears campaign World 9 (`unlockedLevels[8] === true`).
5. `T1_F1_1_05`: Map coordinates for Node S-1 are precisely positioned at $(475, 85)$ with celestial color `#FFD700`.

### F1.2: Cosmic Gravity Physics
1. `T1_F1_2_01`: `effectiveGravity` in `special_star` theme scales down to exactly $50\%$ of base gravity (`0.26` px/frame²).
2. `T1_F1_2_02`: Terminal fall velocity `MAX_FALL` is capped at $5.8$ px/frame in cosmic zones.
3. `T1_F1_2_03`: Player jump impulse receives $+25\%$ height boost under cosmic gravity.
4. `T1_F1_2_04`: Air acceleration multiplier provides enhanced mid-air maneuverability ($1.30\times$).
5. `T1_F1_2_05`: Normal gravity ($0.52$ px/frame²) resumes immediately when switching back to non-cosmic themes.

### F1.3: Floating Crystal Platforms
1. `T1_F1_3_01`: `CrystalPlatform` initializes with $(x, y, w, h)$, hover amplitude, and shimmer timer.
2. `T1_F1_3_02`: Platform hover displacement computes deterministic sinusoidal oscillation ($y_{\text{off}} = \sin(\omega t + \phi) \cdot A$).
3. `T1_F1_3_03`: Standing player vertically rides the oscillating crystal platform without jitter or clipping.
4. `T1_F1_3_04`: Moving crystal platform carries player horizontally along defined track bounds.
5. `T1_F1_3_05`: Crystal platform renders translucent cyan-to-magenta faceted gradient with refractive border.

### F1.4: Cosmic Nebula Particle Fields
1. `T1_F1_4_01`: Nebula particle emitter spawns particles with randomized $(vx, vy)$ within cosmic velocity limits.
2. `T1_F1_4_02`: Particles update position and alpha decay smoothly per frame.
3. `T1_F1_4_03`: Expired particles ($\text{life} \le 0$) are cleanly pruned from the active particle array.
4. `T1_F1_4_04`: Nebula particles utilize chromatic color palette (`#00E5FF`, `#E040FB`, `#FFD700`, `#7C4DFF`).
5. `T1_F1_4_05`: Particle array honors maximum pool size cap ($N \le 200$) to prevent memory bloat.

### F1.5: Cosmic Challenge Stage & Boss
1. `T1_F1_5_01`: Level configuration for S-1 builds a 4200px platforming gauntlet with void pits and crystal stepping stones.
2. `T1_F1_5_02`: Exactly 3 Secret Star Coins are placed in the cosmic level with unique collectible IDs.
3. `T1_F1_5_03`: Launch Star puzzle slingshots player smoothly across cosmic hazards.
4. `T1_F1_5_04`: Astral Guardian (`astralis`) boss initializes with 3 HP, cosmic shield, and orbiting stellar spheres.
5. `T1_F1_5_05`: Defeating Astral Guardian awards 3500 points, 25 Star Dust, and triggers level victory.

### F2.1: Boss Rush Menu Entry Points
1. `T1_F2_1_01`: Main Menu modal exposes Boss Rush entry action (`startBossRush`).
2. `T1_F2_1_02`: In-game pause modal provides direct transition to Boss Rush.
3. `T1_F2_1_03`: Invoking `startBossRush(charId)` sets game state to `'BOSS_RUSH'`.
4. `T1_F2_1_04`: Boss Rush starts with selected playable character from the 5 character roster.
5. `T1_F2_1_05`: Starting Boss Rush cleanly clears previous level entities, score multipliers, and active projectiles.

### F2.2: Sequential 9-Boss Arena Gauntlet
1. `T1_F2_2_01`: Boss Rush sequence follows strict canonical order: `['acornus', 'octobeard', 'tutankobra', 'marionetta', 'frostfang', 'tempesto', 'graviton', 'cosmomecha', 'infernus']`.
2. `T1_F2_2_02`: Arena stage is generated with fixed boundary colosseum geometry ($x \in [100, 500]$).
3. `T1_F2_2_03`: Eliminating Boss $N$ increments `bossRushIdx` and loads Boss $N+1$.
4. `T1_F2_2_04`: Lingering boss projectiles are flushed when loading the next boss arena.
5. `T1_F2_2_05`: Boss phase escalation (Phase 1, 2, 3) functions identically inside Boss Rush arena.

### F2.3: Surviving Health Carryover
1. `T1_F2_3_01`: Player starts Boss Rush with exactly 3 Hearts (`bossRushPlayerHp = 3`).
2. `T1_F2_3_02`: Receiving damage in arena reduces `bossRushPlayerHp` by 1 and grants invulnerability frames.
3. `T1_F2_3_03`: Surviving HP is carried over unchanged to the subsequent boss battle.
4. `T1_F2_3_04`: Intermission recovery item restores $+1$ Heart (capped at maximum 3 Hearts).
5. `T1_F2_3_05`: Depleting all Hearts (`bossRushPlayerHp <= 0`) triggers `'BOSS_RUSH_GAMEOVER'` state.

### F2.4: High-Precision Live Timer & HUD
1. `T1_F2_4_01`: Live timer accumulates elapsed milliseconds during active Boss Rush combat.
2. `T1_F2_4_02`: `formatTime(ms)` returns formatted string matching pattern `^\d{2}:\d{2}\.\d{3}$`.
3. `T1_F2_4_03`: Boss Rush HUD displays player hearts, active boss name/HP, live timer, and defeat counter (`X/9`).
4. `T1_F2_4_04`: Timer pauses accumulation when game state enters `'PAUSED'`.
5. `T1_F2_4_05`: Final elapsed time is accurately recorded upon defeating the 9th boss.

### F2.5: Victory & Ranking Persistence
1. `T1_F2_5_01`: Defeating 9th boss (`infernus`) transitions state to `'BOSS_RUSH_VICTORY'`.
2. `T1_F2_5_02`: Rank calculation awards Rank S for clear time $< 210,000$ms with $\ge 2$ surviving HP.
3. `T1_F2_5_03`: Rank calculation awards Rank A ($< 300,000$ms), Rank B ($< 450,000$ms), Rank C ($\ge 450,000$ms).
4. `T1_F2_5_04`: Boss Rush victory persists record `{ bestTimeMs, bestRank, bestBosses }` in `localStorage`.
5. `T1_F2_5_05`: Grand victory awards $+100$ Star Dust bonus to the player's wallet.

### F3.1: Centralized Cosmetics Catalog
1. `T1_F3_1_01`: `COSMETICS_CATALOG` defines at least 10 distinct accessories.
2. `T1_F3_1_02`: Catalog includes `crown`, `none`, `flower_crown`, `sunglasses`, `cape`, `astro_helmet`, `golden_wings`, `starlight_crown`, `cyber_visor`, `pharaoh_cape`.
3. `T1_F3_1_03`: Every accessory object defines `id`, `name`, `icon`, `price`, `slot` (`'head'`, `'face'`, `'back'`, `'body'`).
4. `T1_F3_1_04`: Default unlocked items include `crown` (cost 0) and `none` (cost 0).
5. `T1_F3_1_05`: Premium accessories have valid positive integer prices ($40 \le \text{price} \le 250$).

### F3.2: Star Dust Currency Wallet
1. `T1_F3_2_01`: `starDust` initializes from `localStorage` or defaults to 0.
2. `T1_F3_2_02`: `collectStarDust(amount)` increments wallet balance and triggers score combo.
3. `T1_F3_2_03`: Boss defeat awards $+25$ Star Dust; Boss Rush victory awards $+100$ Star Dust.
4. `T1_F3_2_04`: Wallet balance persists across level loads and game restarts in `srpw_save_data`.
5. `T1_F3_2_05`: Purchasing accessory decrements exact price from wallet without negative balance.

### F3.3: Dynamic Boutique Shop UI
1. `T1_F3_3_01`: Opening closet modal renders item cards with name, price tag, and icon.
2. `T1_F3_3_02`: Unlocked item shows `EQUIPAR` or `EQUIPADO` button state.
3. `T1_F3_3_03`: Purchasing locked item with insufficient Star Dust fails and preserves wallet balance.
4. `T1_F3_3_04`: Purchasing locked item with sufficient Star Dust unlocks item, equips it, and saves state.
5. `T1_F3_3_05`: Equipping an unlocked accessory updates `selectedHat` and persists to `localStorage`.

### F3.4: Layered Multi-Character Rendering
1. `T1_F3_4_01`: `renderPlayer` draws back-layer accessories (wings, capes) behind character sprite.
2. `T1_F3_4_02`: `renderPlayer` draws front-layer accessories (crowns, visors, helmets) atop character sprite.
3. `T1_F3_4_03`: Render pipeline executes without errors across all 5 characters (`candela`, `cayetana`, `valentina`, `mama`, `papa`).
4. `T1_F3_4_04`: Render pipeline executes without errors for all 10 catalog accessories.
5. `T1_F3_4_05`: Accessory offsets adjust dynamically when character is mounted on a rideable mount.

### F4.1: Multi-Layer Parallax Backdrops
1. `T1_F4_1_01`: `renderBackground` renders 4 distinct parallax layers with increasing depth factors.
2. `T1_F4_1_02`: Sky gradient matches theme configuration across all 10 world themes.
3. `T1_F4_1_03`: Starfield layer in cosmic/galaxy themes renders twinkling stars with sinusoidal brightness.
4. `T1_F4_1_04`: Parallax horizontal offset wraps seamlessly based on camera position.
5. `T1_F4_1_05`: Rendering background with extreme camera coordinates ($x < 0$ or $x > 10000$) produces no glitches.

### F4.2: Cinematic Boss Entry Banners
1. `T1_F4_2_01`: Encountering a boss sets `bossBannerTimer = 90` frames.
2. `T1_F4_2_02`: Top and bottom letterbox bars (28px height) render during banner display.
3. `T1_F4_2_03`: Banner renders boss portrait, boss name, and title with gold/red border accents.
4. `T1_F4_2_04`: `bossBannerTimer` decrements smoothly by 1 each frame until reaching 0.
5. `T1_F4_2_05`: Banner does not block player input or freeze physics updates.

### F4.3: Impact Hit-Sparks & Particle Geometry
1. `T1_F4_3_01`: `addHitSpark(x, y, color)` spawns 4-pointed starburst particles.
2. `T1_F4_3_02`: Enemy stomp collision triggers 8 directional impact sparks.
3. `T1_F4_3_03`: Boss hit collision triggers 16 high-velocity impact sparks.
4. `T1_F4_3_04`: Hit-stop frame freeze (`hitStopFrames = 4`) activates on solid boss stomp.
5. `T1_F4_3_05`: Particle physics correctly applies velocity damping and lifetime decay.

### F4.4: Expanded Polyphonic Web Audio SFX
1. `T1_F4_4_01`: `SoundFX` supports `'cosmic'` and `'bossrush'` BGM tracks with distinct melodic patterns.
2. `T1_F4_4_02`: `playSFX('boutiqueBuy')` synthesizes 4-note ascending chord chime.
3. `T1_F4_4_03`: `playSFX('wingFlap')` synthesizes airy frequency sweep.
4. `T1_F4_4_04`: `playSFX('cyberVisorBeep')` synthesizes dual-tone futuristic chirp.
5. `T1_F4_4_05`: `playSFX('bossWarning')` synthesizes dramatic low-frequency gong drop.

---

## 4. Tier 2: Boundary & Corner Cases ($\ge 5$ Tests per Feature)

### F1.1: Secret Star World Map Node
1. `T2_F1_1_01`: Exact boundary: exactly 19 Star Coins leaves Star World locked; exactly 20 unlocks it.
2. `T2_F1_1_02`: Corrupted save data (negative coins, non-numeric values) defaults safely to locked state.
3. `T2_F1_1_03`: Navigating map past boundary nodes ($idx < 0$ or $idx \ge 10$) clamps safely to valid indices.
4. `T2_F1_1_04`: Clicking on locked Secret Star World node displays prompt and does not launch level.
5. `T2_F1_1_05`: Clearing World 9 when coins = 0 immediately unlocks Secret Star World via campaign clear condition.

### F1.2: Cosmic Gravity Physics
1. `T1_F1_2_01`: Heavyweight character (Papá, weight 1.35) under cosmic gravity maintains floaty curve without exceeding `MAX_FALL = 5.8`.
2. `T2_F1_2_02`: Rapid jump buffering at ledge boundary preserves cosmic jump height multiplier.
3. `T2_F1_2_03`: Ground Pound in cosmic gravity maintains high downward speed ($vy \ge 14.0$) then resets smoothly.
4. `T2_F1_2_04`: Zero-gravity or negative-gravity transitions do not cause integer overflow or infinite ascents.
5. `T2_F1_2_05`: Sudden theme switch mid-jump recalculates gravity seamlessly without teleportation.

### F1.3: Floating Crystal Platforms
1. `T2_F1_3_01`: Player standing on extreme left/right edge (1px overlap) resolves collision without falling through.
2. `T2_F1_3_02`: Multiple stacked crystal platforms with different phase offsets resolve without entity thrashing.
3. `T2_F1_3_03`: High-speed downward impact ($vy = 15.0$ Ground Pound) on crystal platform stops at surface without sinking.
4. `T2_F1_3_04`: Moving crystal platform reversing direction at boundary retains passenger with zero slippage.
5. `T2_F1_3_05`: Platform with zero width/height handles collision math gracefully without NaN coordinates.

### F1.4: Cosmic Nebula Particle Fields
1. `T2_F1_4_01`: Emitting 1000 particles in a single frame triggers pool clamping to 200 without memory exhaustion.
2. `T2_F1_4_02`: Particle life decrement with large time delta ($\Delta t = 500$ms) prunes all expired particles instantly.
3. `T2_F1_4_03`: Particles spawned at extreme offscreen coordinates ($x = -5000, y = 5000$) do not render or corrupt canvas matrix.
4. `T2_F1_4_04`: Particle alpha value $< 0$ clamps to 0 to prevent invalid Canvas 2D alpha errors.
5. `T2_F1_4_05`: Rapid particle creation during high-speed camera shakes maintains origin stability.

### F1.5: Cosmic Challenge Stage & Boss
1. `T2_F1_5_01`: Player falling into void pit ($y > 320$) triggers respawn / life loss and resets cosmic stage checkpoint.
2. `T2_F1_5_02`: Collecting all 3 Star Coins in rapid succession records exact indices `[0, 1, 2]` without duplication.
3. `T2_F1_5_03`: Astral Guardian taking 4 rapid projectile hits in 1 frame triggers exactly 1 damage step.
4. `T2_F1_5_04`: Astral Guardian at 1 HP (Phase 3) triggers maximum enrage speed ($2.2\times$) within arena boundary.
5. `T2_F1_5_05`: Defeating boss during active player invulnerability finishes level without race conditions.

### F2.1: Boss Rush Menu Entry Points
1. `T2_F2_1_01`: Spamming the Boss Rush start button triggers only a single game initialization.
2. `T2_F2_1_02`: Launching Boss Rush from Pause modal during active level cleanly tears down previous stage entities.
3. `T2_F2_1_03`: Launching Boss Rush with unselected character defaults safely to Candela.
4. `T2_F2_1_04`: Window resize during Boss Rush modal transition maintains canvas aspect ratio.
5. `T2_F2_1_05`: Exiting Boss Rush to Main Menu restores initial menu state and halts Boss Rush timers.

### F2.2: Sequential 9-Boss Arena Gauntlet
1. `T2_F2_2_01`: Defeating Boss 1 at the extreme arena left wall ($x = 100$) transitions safely without boundary clipping.
2. `T2_F2_2_02`: Defeating Boss 8 (`cosmomecha`) correctly queues final Boss 9 (`infernus`) rather than victory.
3. `T2_F2_2_03`: Active enemy bullets at moment of boss defeat are immediately neutralized.
4. `T2_F2_2_04`: Boss arena collision boundaries prevent player or boss from escaping [$100, 500$].
5. `T2_F2_2_05`: Player dying simultaneously as boss dies resolves in Game Over (player death takes priority).

### F2.3: Surviving Health Carryover
1. `T2_F2_3_01`: Entering next boss stage with exactly 1 HP maintains 1 HP with red flashing warning HUD.
2. `T2_F2_3_02`: Collecting intermission recovery heart when already at 3 HP caps at 3 without overflow.
3. `T2_F2_3_03`: Taking damage during boss death animation respects post-battle invincibility buffer.
4. `T2_F2_3_04`: Player receiving 2 hazard hits in consecutive frames receives invincibility frames on first hit.
5. `T2_F2_3_05`: Game over screen correctly displays exact stage where player perished (`Derrota en Jefe X/9`).

### F2.4: High-Precision Live Timer & HUD
1. `T2_F2_4_01`: Boss Rush running for $> 60$ minutes formats correctly as `60:00.000` without overflow.
2. `T2_F2_4_02`: Timer with 0 elapsed milliseconds formats as `00:00.000`.
3. `T2_F2_4_03`: Multiple pause/unpause toggles preserve cumulative elapsed time without drift.
4. `T2_F2_4_04`: Negative delta times from clock adjustments clamp to 0.
5. `T2_F2_4_05`: HUD text scaling on ultra-narrow mobile viewports ($w = 320$) avoids text overlap.

### F2.5: Victory & Ranking Persistence
1. `T2_F2_5_01`: Clear time of exactly 209,999ms with 2 HP receives Rank S; 210,001ms receives Rank A.
2. `T2_F2_5_02`: Clear time of 180,000ms with only 1 HP receives Rank A (Rank S requires $\ge 2$ HP).
3. `T2_F2_5_03`: Setting a new personal record overwrites slower record in `localStorage`.
4. `T2_F2_5_04`: Achieving slower time than existing record does not overwrite high score in `localStorage`.
5. `T2_F2_5_05`: `localStorage` write failure (QuotaExceededError) falls back to in-memory record without crashing.

### F3.1: Centralized Cosmetics Catalog
1. `T2_F3_1_01`: Querying unknown accessory ID (`'invalid_hat'`) returns fallback or default `none`.
2. `T2_F3_1_02`: Attempting to modify catalog object properties directly is prevented or non-destructive.
3. `T2_F3_1_03`: Catalog item with 0 price is immediately equippable without requiring purchase transaction.
4. `T2_F3_1_04`: Catalog accessories define valid rendering layer handlers (`drawBack` / `drawFront`).
5. `T2_F3_1_05`: All 10 accessories have distinct unique ID keys.

### F3.2: Star Dust Currency Wallet
1. `T2_F3_2_01`: Wallet with 0 Star Dust attempting to buy 150 Star Dust item is rejected with 0 balance.
2. `T2_F3_2_02`: Exact balance purchase (e.g. 150 Star Dust for 150 item) leaves wallet at exactly 0.
3. `T2_F3_2_03`: Adding large amount of Star Dust ($999,999$) persists accurately without integer overflow.
4. `T2_F3_2_04`: Collecting Star Dust with combo streak scales bonus multiplier correctly ($\times 1.0, \times 1.5, \times 2.0$).
5. `T2_F3_2_05`: Deducting negative or non-numeric amount is rejected.

### F3.3: Dynamic Boutique Shop UI
1. `T2_F3_3_01`: Clicking purchase button on already unlocked item acts as equip action without deducting currency.
2. `T2_F3_3_02`: Rapid multi-clicks on purchase button execute only one transaction.
3. `T2_F3_3_03`: Closet modal keyboard navigation (`Escape` key) closes modal and returns focus.
4. `T2_F3_3_04`: Corrupted `srpw_unlocked_hats` JSON in `localStorage` recovers gracefully to default `['crown', 'none']`.
5. `T2_F3_3_05`: Unlocking all 10 accessories updates shop UI to show all items as owned.

### F3.4: Layered Multi-Character Rendering
1. `T2_F3_4_01`: Rendering character facing left (`facingRight = false`) mirrors accessory geometry symmetrically.
2. `T2_F3_4_02`: Rendering character during Super Dash (high velocity) applies velocity-based cape flutter.
3. `T2_F3_4_03`: Rendering character during Ground Pound squashes sprite and tilts headwear appropriately.
4. `T2_F3_4_04`: Rendering character with Star Invincibility applies rainbow stroke without hiding accessory.
5. `T2_F3_4_05`: Rendering character with missing sprite asset falls back to procedural geometric silhouette.

### F4.1: Multi-Layer Parallax Backdrops
1. `T2_F4_1_01`: Camera looking at negative coordinates ($x < 0$) renders background without negative array indexing.
2. `T2_F4_1_02`: Rapid camera movements ($vx = 50$) maintain smooth parallax interpolation.
3. `T2_F4_1_03`: Theme with missing sky gradient configuration falls back safely to default overworld sky.
4. `T2_F4_1_04`: Mid-ground parallax layer wraps smoothly across seamless tile boundaries.
5. `T2_F4_1_05`: Background rendering executes within $< 2$ms budget to support 60 FPS target.

### F4.2: Cinematic Boss Entry Banners
1. `T2_F4_2_01`: Triggering banner when another banner is active resets timer to 90 without visual stutter.
2. `T2_F4_2_02`: Long boss name/title strings are truncated or scaled to fit canvas width (512px).
3. `T2_F4_2_03`: Banner alpha fade-in at frame 1 and fade-out at frame 90 interpolate smoothly.
4. `T2_F4_2_04`: Letterbox bars render with exact top/bottom geometry ($y=0..28$ and $y=260..288$).
5. `T2_F4_2_05`: Pausing game while banner is visible pauses banner timer.

### F4.3: Impact Hit-Sparks & Particle Geometry
1. `T2_F4_3_01`: Hit-sparks emitted at canvas edge ($x = 0$ or $x = 512$) render without clipping exceptions.
2. `T2_F4_3_02`: Spawning 0 hit-sparks handles cleanly without loop errors.
3. `T2_F4_3_03`: Hit-stop duration of 0 frames advances immediately without delay.
4. `T2_F4_3_04`: Starburst spark points compute exact 4-point diamond geometry ($[0, \pi/2, \pi, 3\pi/2]$).
5. `T2_F4_3_05`: Rapid consecutive hits accumulate distinct spark bursts without replacing existing ones.

### F4.4: Expanded Polyphonic Web Audio SFX
1. `T2_F4_4_01`: Calling audio functions before user gesture / AudioContext resumption queues safely.
2. `T2_F4_4_02`: Playing SFX while audio is muted (`audio.muted = true`) creates no audio nodes or memory leaks.
3. `T2_F4_4_03`: Stopping BGM track fades out master gain smoothly to prevent audio pops.
4. `T2_F4_4_04`: Playing unknown sound name (`'unknown_sfx'`) logs warning and does not throw exception.
5. `T2_F4_4_05`: Playing 50 SFX in rapid succession respects polyphony limiter and does not distort.

---

## 5. Tier 3: Cross-Feature Combinations (Pairwise & System Integrations)

| Test ID | System A | System B | Interaction & Verification Scope |
|---|---|---|---|
| `T3_X01` | F1.2 Cosmic Gravity | F3.4 Character Rendering | Featherweight Valentina (0.72) with Golden Wings in cosmic gravity renders high-frequency wing flaps during extended float jump. |
| `T3_X02` | F1.2 Cosmic Gravity | F2.2 Boss Rush Arena | Gravitón (`graviton`) in Boss Rush arena alters arena gravity, verifying player physics adjustments and HUD stability. |
| `T3_X03` | F2.2 Boss Rush Arena | F3.4 Character Rendering | All 5 playable characters with 4 premium accessories battle all 9 bosses with zero rendering artifacts or memory leaks. |
| `T3_X04` | F2.5 Victory Persistence | F3.2 Star Dust Wallet | Winning Boss Rush awards $+100$ Star Dust, immediately usable in the Royal Boutique to purchase `golden_wings`. |
| `T3_X05` | F1.5 Cosmic Boss | F4.2 Boss Entry Banner | Astral Guardian encounter triggers cinematic letterbox banner with title `"GUARDIÁN ASTRAL"`, then transitions to 3-phase combat. |
| `T3_X06` | F2.2 Boss Rush Arena | F4.3 Impact Hit-Sparks | Every boss stomp in Boss Rush triggers 16 impact sparks and 4-frame hit-stop without desynchronizing the live timer. |
| `T3_X07` | F3.3 Boutique Shop UI | F4.4 Web Audio SFX | Purchasing `starlight_crown` plays `boutiqueBuy` chord; closing boutique plays `menuBack` SFX. |
| `T3_X08` | F1.1 Secret Star Node | F1.5 Cosmic Stage | Navigating to Node S-1 and pressing Start loads 4200px stage with 3 Star Coins and cosmic theme BGM. |
| `T3_X09` | F2.3 Health Carryover | F2.4 Live Timer HUD | Player taking damage at Boss 3 retains 2 HP into Boss 4 while live timer continues accumulating seamlessly. |
| `T3_X10` | F1.3 Crystal Platforms | F4.1 Parallax Backdrop | Floating crystal platforms oscillate in foreground while 4-layer cosmic nebula scrolls in background. |
| `T3_X11` | F2.1 Boss Rush Menu | F2.5 Victory Ranking | Starting Boss Rush from Pause menu, defeating 9 bosses in 3m15s awards Rank S and saves to `localStorage`. |
| `T3_X12` | F3.2 Star Dust Wallet | F1.5 Cosmic Stage | Collecting cosmic star coins and defeating Astral Guardian grants Star Dust, updating wallet in HUD. |
| `T3_X13` | F4.2 Boss Entry Banner | F4.4 Web Audio SFX | Boss entry triggers `bossWarning` gong SFX and visual banner simultaneously. |
| `T3_X14` | F1.4 Nebula Particles | F4.3 Hit-Sparks | Stomping an enemy in cosmic stage emits both nebula dust and 4-pointed hit-sparks simultaneously. |
| `T3_X15` | F3.1 Cosmetics Catalog | F3.2 Star Dust Wallet | Verifying price tags of all 10 accessories against player wallet deduction logic. |

---

## 6. Tier 4: Real-World End-to-End Scenarios & Lifecycles

1. `T4_E2E_01`: **Full Campaign Speedrun & Secret World Unlock**  
   Player starts at World 1-1, defeats all 9 world bosses in sequence, collects 20 Star Coins, unlocks Secret Star World Node S-1 on the World Map, navigates to S-1, and completes the 4200px cosmic gauntlet.
2. `T4_E2E_02`: **Boss Rush Deathless S-Rank Grand Championship**  
   Player selects Cayetana with Cyber Visor, enters Boss Rush Arena, defeats all 9 bosses consecutively with 3 surviving hearts in $< 210$ seconds, verifies Rank S victory screen, records time in `localStorage`, and collects $+100$ Star Dust.
3. `T4_E2E_03`: **Boutique Shopping Spree & Equipment Lifecycle**  
   Player collects Star Dust from levels, opens Royal Closet, buys `flower_crown` (40), `golden_wings` (150), and `starlight_crown` (180), equips `golden_wings`, validates back-layer wing flapping in gameplay, and verifies persistence across game reload.
4. `T4_E2E_04`: **Boss Rush Endurance & Intermission Recovery Flow**  
   Player takes damage on Boss 2 (HP drops to 2), takes damage on Boss 4 (HP drops to 1), defeats Boss 4 and collects recovery heart (HP rises to 2), defeats remaining bosses, and finishes Boss Rush with Rank A.
5. `T4_E2E_05`: **Pause, Resume, Settings & Audio Integrity Flow**  
   During active Boss 8 battle, player pauses game, opens audio settings, toggles mute, resizes viewport, unpauses game, verifies BGM resumes cleanly, timer continues, and controls remain responsive.

---

## 7. Node.js VM Test Execution Harness

The automated test runner executes inside Node.js using `vm.createContext(global)` with a dedicated browser environment mock:
- **Canvas 2D Context Mock**: Polyfills all Canvas methods (`fillRect`, `roundRect`, `drawImage`, `arc`, `fillText`, `createLinearGradient`, `createRadialGradient`, etc.).
- **Web Audio Context Mock**: Polyfills `AudioContext`, `OscillatorNode`, `GainNode`, `AudioBufferSourceNode`, and `AudioBuffer`.
- **LocalStorage Mock**: In-memory key-value store supporting `getItem`, `setItem`, `removeItem`, `clear`.
- **DOM & Touch Mock**: Simulated `document.getElementById`, `querySelectorAll`, touch event handlers, and `requestAnimationFrame`.

### Test Execution Commands
```bash
# Run baseline mechanics audit (153 tests)
node test_mechanics.js

# Run comprehensive 4-tier E2E test suite (220+ tests)
node test_e2e_systems.js
```
