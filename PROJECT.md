# Project: Super Rivelles Peris World 3-World Expansion Pack (Worlds 12, 13, 14)

## Architecture
- **Engine Core**: Fixed-timestep 60 FPS accumulator game loop in `index.html` on a 512x288 virtual canvas, rendered with pixel-art crispness and integer scaling.
- **Audio Engine**: Procedural Web Audio API synthesizer (`SoundFX` class) generating all dynamic BGM sequences (`cyber`, `volcano`, `clockwork`, etc.) and sound effects.
- **State Machine**: `PlatformerGame` state manager controlling states (`MENU`, `WORLD_MAP`, `PLAYING`, `PAUSED`, `LEVEL_COMPLETE`, `GAME_OVER`, `BOSS_RUSH`, `BOSS_RUSH_VICTORY`, `BOSS_RUSH_GAMEOVER`).
- **Entity & Physics Pipeline**: Player movement with jump assists, custom platform mechanics (holographic boost pads, bouncy palm leaves, crumbling basalt, rotating gears, pendulums, tick-tock blocks, laser barriers, lava geysers), and 3-phase Boss AI (`cyber_glitch`, `rex_tyrannus`, `chronos`).
- **Save & Persistence System**: `localStorage['srpw_save_data']` persisting unlocked levels, Star Coins (up to 42 across 14 worlds), Star Dust currency wallet, and cosmetics.
- **Test Infrastructure**: `test_mechanics.js` and `test_e2e_systems.js` evaluating game scripts in Node.js VM sandboxes with Canvas 2D and DOM polyfills.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| F12.1 | World 12 Level Config & Map Node | `LEVEL_CONFIGS[11]` (id: 12, name: "S-3: Metrópolis Neón", theme: "cyberpunk", bossKey: "cyber_glitch", mapX: 415, mapY: 70, sky: ["#0a0017", "#1f003b", "#3d0066"], track: "cyber"). | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F12.2 | Holographic Boost Pads | Directional boost pads applying instantaneous horizontal velocity boost (`vx += 9.5` / `vx = (facing > 0 ? 9.5 : -9.5)`). | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F12.3 | Electric Pulse Laser Barriers | Timed oscillating electric laser barriers (periodic active/inactive states with lethal active hitboxes). | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F12.4 | World 12 Star Coins & Level Layout | 4200px futuristic cityscape stage layout containing 3 hidden Star Coins and neon platform obstacles. | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F12.5 | World Boss Cyber-Dr. Glitch | 3-phase boss: Phase 1 (high-speed dash laser volleys), Phase 2 (EMP blast arena shockwave), Phase 3 (hologram decoy clone split). | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F12.6 | Synthwave Web Audio Track | Procedural synthwave BGM sequencer (`cyber`) with driving 16th-note bassline and neon synth leads. | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F13.1 | World 13 Level Config & Map Node | `LEVEL_CONFIGS[12]` (id: 13, name: "S-4: Selva de Magma", theme: "volcano_jungle", bossKey: "rex_tyrannus", mapX: 350, mapY: 70, sky: ["#1a0500", "#3d0c00", "#6e1a00"], track: "volcano"). | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.2 | Giant Bouncy Palm Leaves | Springy canopy foliage platforms granting high vertical bounce impulse (`vy = -15.5`). | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.3 | Rising Lava Geysers | Periodic erupting lava geysers with warning bubbles, explosive upward surge, and lethal collision. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.4 | Crumbling Basalt Blocks | Stepped-on volcanic basalt blocks that shake for 45 frames, collapse into gravity, and respawn after cooldown. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.5 | World 13 Star Coins & Level Layout | 4200px volcanic jungle stage layout with 3 hidden Star Coins, magma pits, and rising ash particles. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.6 | World Boss Rex Tyrannus | 3-phase boss: Phase 1 (heavy lunges & tail sweeps), Phase 2 (earthquake stomps + falling ceiling rocks), Phase 3 (3-way magma jet breath barrage). | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F13.7 | Tribal Drum Web Audio Track | Procedural tribal percussion BGM sequencer (`volcano`) with syncopated polyrhythms and subterranean bass. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F14.1 | World 14 Level Config & Map Node | `LEVEL_CONFIGS[13]` (id: 14, name: "S-5: Torre del Reloj Crono", theme: "clocktower", bossKey: "chronos", mapX: 285, mapY: 75, sky: ["#0d0b14", "#201a30", "#382d54"], track: "clockwork"). | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.2 | Rotating Gear Platforms | Circular cogwheel platforms rotating clockwise/counter-clockwise with tangential player physics influence. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.3 | Timed Pendulum Swings | Oscillating pendulum clock blades with harmonic angular motion acting as dynamic hazards/stepping stones. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.4 | Tick-Tock Disappearing Blocks | Synchronized alternating blocks switching between solid brass and intangible ghost states every 120 frames. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.5 | World 14 Star Coins & Level Layout | 4200px gothic clocktower stage layout with 3 hidden Star Coins and intricate timing puzzles. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.6 | World Boss Chronos | 3-phase boss: Phase 1 (temporal warp & projectile gears), Phase 2 (time-dilation slowdown stasis spell), Phase 3 (orbiting clock-hand blade barrier). | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F14.7 | Gothic Organ Web Audio Track | Procedural gothic pipe organ BGM sequencer (`clockwork`) with harmonic chords and metronomic ticking. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F15.1 | 16:9 3D Isometric World Map Diorama | High-definition 3D isometric world map diorama image incorporating all 14 worlds, deployed to `assets/world_map_diorama.png` and root `world_map_diorama.png`. | M4 | ORIGINAL_REQUEST §R4 | DONE |
| F15.2 | Boss Visual Assets & Canvas Fallbacks | Register new boss keys (`cyber_glitch`, `rex_tyrannus`, `chronos`) in `BOSS_ASSETS`, `bossImages`, and complete procedural Canvas 2D fallback rendering. | M4 | ORIGINAL_REQUEST §R4 | DONE |
| F15.3 | Service Worker & Asset Caching | Precaching of all new world assets, boss images, and diorama in `sw.js` with Network-First strategy for core logic. | M4 | ORIGINAL_REQUEST §R4 | DONE |
| F16.1 | Comprehensive Mechanics Test Suite | Extended `test_mechanics.js` verifying boost pads, lasers, palm leaves, geysers, basalt, gears, pendulums, tick-tock blocks, and star coin counts across 14 worlds (459 tests pass). | M5 | ORIGINAL_REQUEST §R5 | DONE |
| F16.2 | Comprehensive E2E System Test Suite | Extended `test_e2e_systems.js` verifying map unlocks, boss combat phases, audio synthesis, diorama loading, and touch events (209 tests pass). | M5 | ORIGINAL_REQUEST §R5 | DONE |
| F16.3 | Adversarial Stress Testing & Audit | Tier 5 white-box stress tests, boundary conditions, zero regressions, 60 FPS Canvas rendering, and clean forensic audit (869+ total assertions pass). | M5 | ORIGINAL_REQUEST §R5 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | World 12: Metrópolis Cyberpunk | F12.1, F12.2, F12.3, F12.4, F12.5, F12.6 | None | DONE |
| M2 | World 13: Jungla Volcánica | F13.1, F13.2, F13.3, F13.4, F13.5, F13.6, F13.7 | None | DONE |
| M3 | World 14: Castillo del Tiempo | F14.1, F14.2, F14.3, F14.4, F14.5, F14.6, F14.7 | None | DONE |
| M4 | 3D World Map Diorama & Boss Art Assets | F15.1, F15.2, F15.3 | None | DONE |
| M5 | Final Verification & Adversarial Hardening | F16.1, F16.2, F16.3 (100% E2E Pass + Tier 5 Hardening + Clean Audit) | M1, M2, M3, M4 | DONE |

## Interface Contracts

### M1 (World 12: Cyberpunk) ↔ Engine & Boss Core
- `LEVEL_CONFIGS[11]`: `{ id: 12, name: "S-3: Metrópolis Neón", theme: "cyberpunk", bossKey: "cyber_glitch", mapX: 415, mapY: 70, sky: ["#0a0017", "#1f003b", "#3d0066"], track: "cyber" }`.
- Unlock logic: `isCyberWorldUnlocked()` -> `starCoinsTotal >= 28 || unlockedLevels[10]`.
- Entity `BoostPad`: `{ x, y, w: 48, h: 16, dir: 1, boostSpeed: 9.5, animTimer }`. Applies `player.vx = (player.facing > 0 ? 9.5 : -9.5)` or directed velocity upon overlap.
- Entity `LaserBarrier`: `{ x, y, w, h, period: 180, activeFrames: 90, offset: 0, timer: 0 }`. When active, dealing 1 damage to player.
- Boss `cyber_glitch`: 3 phases, maxHp: 3, P1: dash laser volley, P2: EMP shockwave floor blast, P3: 2 hologram decoy clones.

### M2 (World 13: Jungla Volcánica) ↔ Engine & Boss Core
- `LEVEL_CONFIGS[12]`: `{ id: 13, name: "S-4: Selva de Magma", theme: "volcano_jungle", bossKey: "rex_tyrannus", mapX: 350, mapY: 70, sky: ["#1a0500", "#3d0c00", "#6e1a00"], track: "volcano" }`.
- Unlock logic: `isVolcanoWorldUnlocked()` -> `starCoinsTotal >= 32 || unlockedLevels[11]`.
- Entity `BouncyPalmLeaf`: `{ x, y, w: 64, h: 20, bounceImpulse: -15.5, swayTimer }`. Launches player with `player.vy = -15.5` on top landing.
- Entity `LavaGeyser`: `{ x, y, w: 32, maxH: 120, state: 'idle'|'warning'|'erupt'|'receding', timer: 0 }`.
- Entity `CrumblingBasaltBlock`: `{ x, y, w: 32, h: 32, standTimer: 0, maxStand: 45, state: 'solid'|'shaking'|'falling'|'respawning', respawnTimer: 0 }`.
- Boss `rex_tyrannus`: 3 phases, maxHp: 3, P1: lunges & tail sweeps, P2: earthquake stomp with ceiling rocks, P3: 3-way magma jet breath.

### M3 (World 14: Castillo del Tiempo) ↔ Engine & Boss Core
- `LEVEL_CONFIGS[13]`: `{ id: 14, name: "S-5: Torre del Reloj Crono", theme: "clocktower", bossKey: "chronos", mapX: 285, mapY: 75, sky: ["#0d0b14", "#201a30", "#382d54"], track: "clockwork" }`.
- Unlock logic: `isClockWorldUnlocked()` -> `starCoinsTotal >= 36 || unlockedLevels[12]`.
- Entity `RotatingGearPlatform`: `{ x, y, radius: 48, teeth: 8, angle: 0, speed: 0.02, dir: 1 }`.
- Entity `PendulumSwing`: `{ anchorX, anchorY, length: 96, angle: 0, maxAngle: Math.PI/3, speed: 0.04, bladeRadius: 20 }`.
- Entity `TickTockBlock`: `{ x, y, w: 32, h: 32, cycle: 120, phase: 0|1 }`. Alternates solid/intangible every 120 frames.
- Boss `chronos`: 3 phases, maxHp: 3, P1: chrono warp & projectile gears, P2: time-dilation slowdown stasis spell (slows player physics to 0.4x), P3: 3 orbiting clock-hand scythe blades.

### M4 (Art Assets & SW) ↔ World Map & Browser Engine
- Diorama Image: 16:9 3D Isometric World Map Diorama saved to `assets/world_map_diorama.png` and `world_map_diorama.png`.
- Boss Assets: `BOSS_ASSETS['cyber_glitch']`, `BOSS_ASSETS['rex_tyrannus']`, `BOSS_ASSETS['chronos']` registered in `BOSS_ASSETS` and precached in `sw.js`.
- Procedural Fallbacks: High-detail Canvas 2D fallback rendering routines for all 3 new bosses when image assets are loading or unavailable.

### M5 (QA Verification & Tests) ↔ CI / Node VM Test Suites
- Test suites in `test_mechanics.js`, `test_e2e_systems.js`, `test_adversarial_tier5.js`, `test_challenger1_stress.js`, and `test_w14_adversarial_stress.js` execute deterministically with 100% pass rate.
- Total passing tests verified: 976 assertions across all test runners with 0 failures and 0 regressions.

## Code Layout
- `index.html`: Unified single-file web application with Canvas 2D rendering, SoundFX audio synthesizer, WorldBoss classes, entity collision systems, UI modals, and Service Worker registration.
- `sw.js`: Progressive Web App Service Worker with Network-First caching strategy.
- `assets/`: Static imagery including `world_map_diorama.png` and boss portrait assets.
- `test_mechanics.js`: Unit and mechanics test suite running in Node.js VM (459 tests).
- `test_e2e_systems.js`: End-to-end integration and state machine test suite running in Node.js VM (209 tests).
- `test_adversarial_tier5.js`: Hardened stress testing and boundary verification suite (22 tests).
- `.agents/`: Agent coordination, architecture specifications, handoffs, and verification reports.
