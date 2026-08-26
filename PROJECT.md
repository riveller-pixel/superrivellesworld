# Project: Super Rivelles Peris World Masterwork Expansion

## Architecture
- **Engine Core**: Fixed-timestep 60 FPS accumulator game loop in `index.html` on a 512x288 virtual canvas, rendered with pixel-art crispness and integer scaling.
- **Audio Engine**: Multi-voice procedural Web Audio API synthesizer (`SoundFX` class) generating all dynamic BGM sequences and sound effects.
- **State Machine**: `PlatformerGame` state manager controlling states (`MENU`, `WORLD_MAP`, `PLAYING`, `PAUSED`, `LEVEL_COMPLETE`, `GAME_OVER`, `BOSS_RUSH`, `BOSS_RUSH_VICTORY`, `BOSS_RUSH_GAMEOVER`).
- **Entity & Physics Pipeline**: Player movement with jump assists (coyote frames, jump buffering, variable hold), collision resolution with solid and interactive tiles/platforms, mount riding mechanics, and multi-phased Boss AI.
- **Save & Persistence System**: `localStorage['srpw_save_data']` persisting unlocked levels, high scores, Star Coins per level, Star Dust currency wallet, and unlocked accessories.
- **Test Infrastructure**: `test_mechanics.js` (254 tests) and `test_e2e_systems.js` (212 tests) evaluating game scripts in Node.js VM sandboxes with Canvas 2D and DOM polyfills.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1.1 | Secret Star World Map Node | Unlocked at >=20 Star Coins or Campaign Clear. Celestial warp path and glowing node `S-1: Vía Láctea Secreta` at (475, 85). | M1 | ORIGINAL_REQUEST §R1 |
| F1.2 | Cosmic Gravity Physics | Floaty cosmic gravity modifier (`GRAVITY * 0.50`), `MAX_FALL = 5.8`, +25% jump boost in Star World. | M1 | ORIGINAL_REQUEST §R1 |
| F1.3 | Floating Crystal Platforms | Translucent crystalline platforms with faceted borders and hovering vertical oscillation. | M1 | ORIGINAL_REQUEST §R1 |
| F1.4 | Cosmic Nebula Particle Fields | Floating shimmering stardust and nebula cloud particle fields. | M1 | ORIGINAL_REQUEST §R1 |
| F1.5 | Cosmic Challenge Stage & Boss | 4200px platforming gauntlet, 3 Secret Star Coins, Launch Star puzzle, and Astral Guardian boss (`astralis`). | M1 | ORIGINAL_REQUEST §R1 |
| F2.1 | Boss Rush Menu Entry Points | "⚔️ BOSS RUSH ARENA" access buttons in Main Menu modal and Pause modal. | M2 | ORIGINAL_REQUEST §R2 |
| F2.2 | Sequential 9-Boss Arena Gauntlet | Instantaneous arena combat loop through all 9 canonical bosses (Acornus -> Octobeard -> Tutankobra -> Marionetta -> Frostfang -> Tempesto -> Gravitón -> Cosmo-Mecha -> Infernus Rex). | M2 | ORIGINAL_REQUEST §R2 |
| F2.3 | Surviving Health Carryover | Persistent 3-heart health model across boss fights with intermission recovery rewards. | M2 | ORIGINAL_REQUEST §R2 |
| F2.4 | High-Precision Live Timer & HUD | Top-right live timer (`MM:SS.mmm`), boss counter (`X/9 JEFES`), and health indicator during Boss Rush. | M2 | ORIGINAL_REQUEST §R2 |
| F2.5 | Victory & Ranking Persistence | Victory screen calculating grade (S/A/B/C) based on clear time, storing best records in `localStorage['srpw_bossrush_record']`. | M2 | ORIGINAL_REQUEST §R2 |
| F3.1 | Centralized Cosmetics Catalog | Catalog of 10 items including Golden Wings 🪽, Starlight Crown 👑✨, Cyber Visor 🕶️, Pharaoh Cape, Astro Helmet, and Flower Crown with Star Dust pricing. | M3 | ORIGINAL_REQUEST §R3 |
| F3.2 | Star Dust Currency Wallet | Star Dust acquisition, storage in `srpw_save_data`, purchase validation, and balance updates. | M3 | ORIGINAL_REQUEST §R3 |
| F3.3 | Dynamic Boutique Shop UI | Interactive closet modal with price tags, purchase buttons, equip states, and real-time wallet display. | M3 | ORIGINAL_REQUEST §R3 |
| F3.4 | Layered Multi-Character Rendering | Layered back/front accessory drawing adapting to all 5 characters (Candela, Cayetana, Valentina, Mamá, Papá) across all motion states. | M3 | ORIGINAL_REQUEST §R3 |
| F4.1 | Multi-Layer Parallax Backdrops | Enhanced procedural 4-layer parallax backdrops for all themes including the new cosmic starfield. | M4 | ORIGINAL_REQUEST §R4 |
| F4.2 | Cinematic Boss Entry Banners | 90-frame letterbox entry banner with dramatic boss titles upon boss activation. | M4 | ORIGINAL_REQUEST §R4 |
| F4.3 | Impact Hit-Sparks & Particle Geometry | Dynamic 4-point starburst hit-sparks and directional collision burst particles. | M4 | ORIGINAL_REQUEST §R4 |
| F4.4 | Expanded Polyphonic Web Audio SFX | Multi-voice synthesizer tracks (`cosmic`, `bossrush`) and specialized SFX (purchase, wings, visor beep, boss warning). | M4 | ORIGINAL_REQUEST §R4 |
| F4.5 | 60 FPS Performance & Touch Control Polish | Strict 60 FPS canvas loop, low-latency mobile touch control handling, and Service Worker offline caching stability. | M4 | ORIGINAL_REQUEST §R4 |
| F5.1 | Comprehensive E2E Test Suite | Automated test suites (Tiers 1-4) in `test_mechanics.js` and `test_e2e_systems.js` with 100% pass rate. | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| F5.2 | Adversarial Hardening & Integrity Audit | White-box edge case testing (Tier 5) and clean forensic audit verification. | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Secret Star World | F1.1, F1.2, F1.3, F1.4, F1.5 | None | DONE |
| M2 | Boss Rush Arena Mode | F2.1, F2.2, F2.3, F2.4, F2.5 | None | DONE |
| M3 | Royal Closet & Trophy Boutique | F3.1, F3.2, F3.3, F3.4 | None | DONE |
| M4 | Visual & Audio Next-Gen Polish | F4.1, F4.2, F4.3, F4.4, F4.5 | None | DONE |
| M5 | Final Verification & Adversarial Hardening | F5.1, F5.2 (100% E2E Pass + Tier 5 Hardening + Clean Audit) | M1, M2, M3, M4 | DONE |

## Interface Contracts

### M1 (Secret Star World) ↔ Engine Core
- `LEVEL_CONFIGS[9]` (`id: 10`, `name: "S-1: Vía Láctea Secreta"`, `theme: "special_star"`, `bossKey: "astralis"`, `mapX: 475`, `mapY: 85`, `sky: ["#05021a", "#120838", "#2a165a"]`, `track: "cosmic"`).
- `PlatformerGame.isStarWorldUnlocked()`: returns boolean (`starCoinsTotal >= 20 || unlockedLevels[8]`).
- `effectiveGravity`: When `theme === 'special_star'`, `effectiveGravity = GRAVITY * 0.50`, `maxFall = 5.8`, jump velocity multiplier `= 1.25`.
- Crystal Platform Entity: `CrystalPlatform` with `x, y, w, h, hoverAmp, hoverFreq, shimmerTimer`.

### M2 (Boss Rush Arena) ↔ Engine Core
- `PlatformerGame.startBossRush(charId)`: initializes `bossRushActive = true`, `bossRushIdx = 0`, `bossRushPlayerHp = 3`, `bossRushStartTime = performance.now()`, `bossRushDefeatedCount = 0`.
- `PlatformerGame.loadBossRushStage(idx)`: constructs compact arena with boss `idx` from sequence `['acornus', 'octobeard', 'tutankobra', 'marionetta', 'frostfang', 'tempesto', 'graviton', 'cosmomecha', 'infernus']`.
- `PlatformerGame.handleBossRushVictory()`: sets `state = 'BOSS_RUSH_VICTORY'`, calculates rank, and saves to `localStorage['srpw_bossrush_record']`.

### M3 (Royal Closet) ↔ Player Rendering
- `COSMETICS_CATALOG`: Map of items `{ id, name, icon, cost, slot: ('back'|'head'|'face'|'body'), drawBack(ctx, p), drawFront(ctx, p) }`.
- `PlatformerGame.purchaseAccessory(id)`: checks `this.starDust >= item.cost`, deducts dust, adds `id` to `unlockedHats`, saves to `srpw_save_data`.
- `renderPlayer(ctx, now)`: renders back-layer accessories before character sprite, and front-layer accessories after character sprite.

### M4 (Visual & Audio Polish) ↔ Engine & Audio
- `SoundFX.playBGM(trackName)`: supports `'cosmic'` and `'bossrush'` tracks with clean loop points and mute gain ramps.
- `SoundFX.playSFX(sfxName)`: supports `'boutiqueBuy'`, `'wingFlap'`, `'cyberVisorBeep'`, `'bossWarning'`, `'hitSpark'`.
- `WorldBoss.triggerBanner(title, subtitle)`: initializes `bossBannerTimer = 90`.
- `PlatformerGame.addHitSpark(x, y, color)`: spawns 4-point starburst spark particles.

## Code Layout
- Single source runtime: `index.html` (CSS styles, HTML UI modals, inline game script).
- Test suites: `test_mechanics.js`, `test_e2e_systems.js`, and `test_adversarial_tier5.js`.
- Metadata & Reports: `.agents/<agent_name>/`.
