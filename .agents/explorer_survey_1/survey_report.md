# Super Rivelles Peris World — Technical Survey Report (Explorer 1)

**Date**: August 25, 2026  
**Scope**: Core Engine, Game State Machine, World Map, Physics & Collision Engine, Secret Star World (Mundo Especial Galáctico) Technical Specifications, Test Infrastructure.  
**Target File**: `index.html` (Primary unified runtime engine) & `test_mechanics.js` (QA test suite).

---

## 1. Executive Summary

Super Rivelles Peris World is structured as an HTML5 Canvas 2.5D retro-modern platformer running at a fixed 60 FPS update rate with an internal virtual canvas resolution of **512 × 288** (16:9 aspect ratio) scaled smoothly to the browser viewport. The entire active game runtime is unified within `index.html` (comprising CSS modal overlays, Web Audio polyphonic synthesizer, physics loop, level definitions, character profiles, boss AI, and diorama world map), while `test_mechanics.js` validates all mechanics by executing the script in a Node.js VM context with comprehensive browser mocks.

All 153 automated tests in `test_mechanics.js` currently pass with 100% success. This survey specifies the technical architecture and exact implementation blueprint for **Requirement 1: Secret Star World (Mundo Especial Galáctico)**, alongside its integration into the World Map, save data persistence, gravity physics, floating crystal platforms, nebula particle fields, and test infrastructure.

---

## 2. Core Engine & Game State Machine Analysis

### 2.1 Engine Architecture & Loop
- **Virtual Resolution**: `VIRT_W = 512`, `VIRT_H = 288`. Canvas dimensions are kept fixed while CSS scales `width: 100vw; height: 100vh; object-fit: contain;` to preserve crisp rendering.
- **Game Loop Execution** (`PlatformerGame.loop`):
  - Fixed-step accumulator pattern using `FRAME_TIME = 1000 / 60` (16.666ms) to guarantee deterministic physics regardless of monitor refresh rate.
  - Exception protection wraps `this.update()` and `this.render()`.
  - Responsive resizing handled via `initResize()` tracking `window.innerWidth`, `window.innerHeight`, and touch coordinate remapping via `TouchController.updateLayout()`.

### 2.2 Game State Machine
The core engine (`PlatformerGame.state`) governs high-level flow:

| State | Purpose | Active Canvas Rendering | UI Overlay |
|---|---|---|---|
| `'MENU'` | Title / Character Selection Screen | `renderWorldMapNSMBWii()` (underlying diorama) | `#modal-select` active |
| `'WORLD_MAP'` | Interactive 2.5D NSMBWii-style Diorama Map | `renderWorldMapNSMBWii()` (interactive nodes, player walk) | Modal hidden, HUD hidden |
| `'PLAYING'` | Active Level Gameplay | `renderBackground()`, `renderLevel()`, `renderEntities()`, `renderPlayer()`, `renderHUD()` | In-game canvas HUD, Touch Controls |
| `'PAUSED'` | Gameplay Suspended | `renderBackground()` / `renderLevel()` frozen underneath | `#modal-pause` overlay active |
| `'LEVEL_COMPLETE'` | Post-Level Victory Screen | `renderLevelComplete()` (score, star coins, trophy) | Canvas interactive continue button |
| *(Proposed)* `'BOSS_RUSH'` | Dedicated Boss Rush Arena | `renderBossRushArena()`, `renderHUD()`, Boss Rush Timer/Counter | Dedicated Boss Rush HUD |

### 2.3 Persistence & Storage Schema (`localStorage`)
The game stores progress under key `'srpw_save_data'` (with fallback to legacy `'srpw_unlocked'`):
```json
{
  "unlocked": [true, true, true, false, false, false, false, false, false, false],
  "starCoins": {
    "0": 3,
    "1": 3,
    "2": 2
  },
  "highScore": 48200,
  "starDustTotal": 145,
  "secretWorldUnlocked": true,
  "bossRushBestTime": 248.5
}
```
- **Star Coins Counting**: Star Coins collected per level are tracked as integers (0 to 3) in `this.starCoinsPerLevel[levelIdx]`. Total star coins collected across the entire game is computed via `Object.values(this.starCoinsPerLevel).reduce((a, b) => a + b, 0)`.
- **Campaign Completion**: Verified when `this.unlockedLevels[8]` (World 1-9: Castillo de Lava) has been cleared, or when all 9 main bosses are defeated.
- **Accessories**: `srpw_hat` (currently selected) and `srpw_unlocked_hats` (array of unlocked IDs).

---

## 3. World Map System & Navigation Deep-Dive

### 3.1 Node Coordinate & Pathway Architecture
Levels are defined in `LEVEL_CONFIGS` with diorama map coordinates:

```javascript
const LEVEL_CONFIGS = [
  { id: 1, name: "1-1: Colinas Bellota",     theme: "garden", bossKey: "acornus",     mapX: 42,  mapY: 195, color: "#2E7D32" },
  { id: 2, name: "1-2: Océano de Coral",     theme: "marine", bossKey: "octobeard",   mapX: 92,  mapY: 220, color: "#0288D1" },
  { id: 3, name: "1-3: Pirámides de Egipto", theme: "egypt",  bossKey: "tutankobra",  mapX: 148, mapY: 185, color: "#F57C00" },
  { id: 4, name: "1-4: Castillo Disney",     theme: "disney", bossKey: "marionetta",  mapX: 205, mapY: 140, color: "#AB47BC" },
  { id: 5, name: "1-5: Glaciares Frozen",    theme: "frozen", bossKey: "frostfang",   mapX: 265, mapY: 115, color: "#26C6DA" },
  { id: 6, name: "1-6: Reino del Cielo",     theme: "sky",    bossKey: "tempesto",    mapX: 322, mapY: 145, color: "#FBC02D" },
  { id: 7, name: "1-7: Cavernas Zero-G",     theme: "cave",   bossKey: "graviton",    mapX: 376, mapY: 190, color: "#8E24AA" },
  { id: 8, name: "1-8: Mario Galaxy",        theme: "galaxy", bossKey: "cosmomecha",  mapX: 420, mapY: 220, color: "#00E5FF" },
  { id: 9, name: "1-9: Castillo de Lava",    theme: "castle", bossKey: "infernus",    mapX: 450, mapY: 175, color: "#D50000" }
];
```

### 3.2 Navigation & Interaction Loop
- **Hero Travel Animation**: In `PlatformerGame.update()` under `'WORLD_MAP'`, `mapPlayerX` and `mapPlayerY` interpolate toward `LEVEL_CONFIGS[this.mapTargetIdx]` at speed `3.2 px/frame` with sine-wave vertical bobbing `Math.sin(now * 0.015) * 2`.
- **Keyboard Navigation**: `ArrowLeft`/`KeyA` (`navigateWorldMap(-1)`), `ArrowRight`/`KeyD` (`navigateWorldMap(1)`), `Space`/`Enter`/`KeyZ` (`startSelectedLevel()`).
- **Touch / Pointer Navigation** (`handleMapClick(cx, cy)`):
  - Header buttons: Prev `[275..310]`, Next `[312..348]`, Closet `[352..402]`, Fullscreen `[405..455]`, Mute `[458..508]`.
  - Node Touch Proximity: `< 36px` Euclidean distance from any node center selects or launches the level.
  - Bottom Start Button: `cy >= VIRT_H - 46` triggers `startSelectedLevel()`.

---

## 4. Physics Engine, Collision & Platform Mechanics

### 4.1 Fundamental Physics Constants
- `GRAVITY = 0.52` (pixels/frame²)
- `MAX_FALL = 9.2` (terminal fall velocity)
- `ACCEL = 0.46`, `DECEL = 0.38`
- `JUMP_CUT_MULT = 0.45` (variable jump height when button is released early)
- **Character Weight Multipliers**:
  - Candela: weight `1.0`, jumpForce `-10.0`, sprintSpeed `5.2`
  - Cayetana: weight `1.0`, jumpForce `-9.4`, sprintSpeed `6.2` (Super Dash `vx >= 8.0`)
  - Valentina: weight `0.72` (Featherweight), jumpForce `-9.2` (Triple Jump)
  - Mamá: weight `0.75`, jumpForce `-9.6` (Flutter Glide `vy = 0.9`)
  - Papá: weight `1.35`, jumpForce `-9.5` (Ground Pound `vy = 15.0` to `16.0`)

### 4.2 Jump Assist Systems
1. **Coyote Time**: 5 frames window after stepping off a ledge (`p.coyoteFrames = 5`).
2. **Jump Buffer**: 4 frames window prior to landing (`p.bufferFrames = 4`).
3. **Variable Height Jump**: `p.jumpHoldFrames = 13` provides sustained upward thrust `-0.58` while jump is held.

### 4.3 Collision Resolution Math
- **AABB Platforms**: `resolveHorizontal` and `resolveVertical` operate on static and dynamic platforms.
- **Corner/Ledge Step-Up Tolerance**: If `(p.y + p.h) - pl.y <= 4` and `p.vy >= 0`, player is gently elevated onto the platform top rather than halted horizontally.
- **Spring Platforms** (`pl.isSpring`): Launch player at `vy = -12.0`.
- **Destructible Blocks** (`DestructibleBlock`): Shatter when hit from below or during Ground Pound from above.
- **Question Blocks** (`QuestionBlock`): Bump upward, release physical `ItemEntity`, turn solid inert.
- **Interactive Gimmicks**: `SeeSawPlatform` (torque physics), `LaunchStar` (ballistic flight), `MagicPortal` (warping), `WaterCurrents` (buoyancy), `Quicksands` (viscous sinking), `WindCurrents` (directional force).

---

## 5. Technical Requirements for Secret Star World (Mundo Especial Galáctico)

### 5.1 Map Node & Unlock Routing
1. **World Configuration (Index 9 / 10th Node)**:
   ```javascript
   {
     id: 10,
     name: "S-1: Vía Láctea Secreta",
     theme: "special_star",
     bossKey: "astralis",
     bossName: "GUARDIÁN ASTRAL",
     bossTitle: "Soberano del Cosmos Primordial",
     sky: ["#020010", "#12002b", "#28004d"],
     track: "special_star",
     mapX: 475,
     mapY: 85,
     color: "#FFD700"
   }
   ```
2. **Unlock Condition Check**:
   - Condition: Total Star Coins >= 20 **OR** Campaign completed (`unlockedLevels[8] === true`).
   - Unlocked state persisted in `srpw_save_data`.
3. **Map Rendering**:
   - Golden starlight rainbow beam / warp beacon branching from World 1-8 / 1-9 to the celestial node at (475, 85).
   - Constellation star icon with sparkling cosmic glow.

### 5.2 Cosmic Gravity Modifier Mechanics
- **Cosmic Gravity Handling**: In levels with `theme === 'special_star'` or zones with `isCosmicGravity`:
  - `effectiveGravity = GRAVITY * 0.50` (soft floaty gravity).
  - Terminal velocity softened to `MAX_FALL = 5.8`.
  - Jump height extended by +25%, allowing magnificent high-skill precision jumps between distant floating crystals.
  - Air acceleration increased by 1.3x for responsive mid-air adjustments.

### 5.3 Floating Crystal Platforms & Nebula Particle Fields
1. **Floating Crystal Platforms**:
   - Solid platforms rendered with translucent crystalline gradients (`rgba(0, 229, 255, 0.75)` to `rgba(224, 64, 251, 0.85)`), sparkling faceted borders, and subtle vertical floating oscillation (`yOffset = Math.sin(now * 0.004 + x) * 5`).
   - Moving crystal platforms traversing vertical/horizontal tracks.
   - Timed phase crystals that shimmer and solidify on beat.
2. **Cosmic Nebula Particle Fields**:
   - Ambient layered nebula rendering: 3 deep background radial gradients pulsing in chromatic violet/cyan/gold.
   - Dynamic star clusters, twinkling constellation dots, and trailing cosmic stardust particles emitted in real-time.

### 5.4 Level Layout & Cosmic Challenge Mechanics
- **Length**: 4200px platforming gauntlet.
- **Stage Progression**:
  - Segment 1: Floating crystal stepping stones across deep cosmic void with low gravity.
  - Segment 2: Launch Star sequential slingshots over moving anti-gravity crystal hazards.
  - Segment 3: 3-Phase Boss Arena battling **GUARDIÁN ASTRAL (Astralis)** with spinning stellar orbs and supernova shockwaves.
- **Collectibles**: 3 Secret Star Coins placed in high-skill hazard zones requiring character powers and mount mastery.

---

## 6. Review of Test Infrastructure (`test_mechanics.js`)

### 6.1 Current Test Architecture
- Node.js VM execution extracting the game script from `index.html`.
- Mocks: `createMockBrowserEnv()` provides full mock implementations of DOM, Canvas 2D context (`mockCtx` with `roundRect`, `drawImage`, etc.), Web Audio (`MockAudioContext`), `Image`, and `localStorage`.
- Current coverage: 8 test suites, 153 assertions covering classes, characters, power states, collision math, mounts, bosses, Tommy AI, and level generation.

### 6.2 Expansion Strategy for New Features
To integrate Secret Star World, Boss Rush mode, and Boutique items seamlessly:
1. Ensure all new classes and constants are included in the VM export tuple:
   ```javascript
   ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, BossRushMode })
   ```
2. Update Suite 1 to verify `LEVEL_CONFIGS.length === 10` (or 9 core + 1 secret world) and new modes.
3. Add dedicated Test Suites:
   - **Test Suite 9: Secret Star World & Cosmic Physics** (validating low gravity modifier, crystal platforms, astral boss).
   - **Test Suite 10: Boss Rush Arena Mode** (validating 9-boss sequential queue, timer, surviving health).
   - **Test Suite 11: Expanded Royal Boutique & Star Dust Economy** (validating new accessories and character rendering).

---

## 7. Next Steps & Architecture Alignment

All technical components for Secret Star World, Boss Rush, Boutique cosmetics, and audio/visual enhancements are clearly defined and fully compatible with the existing single-file codebase and test suite. The implementation phase can proceed with zero regression risk to the 153 existing tests.
