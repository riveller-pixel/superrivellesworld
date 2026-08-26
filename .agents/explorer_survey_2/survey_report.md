# SURVEY REPORT: BOSS SYSTEMS & BOSS RUSH ARENA MODE ARCHITECTURE
**Project**: Super Rivelles Peris World — 2.5D Retro-Modern Masterpiece  
**Explorer**: Explorer 2 (Survey Phase)  
**Date**: 2026-08-25  
**Target Path**: `.agents/explorer_survey_2/survey_report.md`

---

## 1. Executive Summary

This survey provides a comprehensive analysis of the boss encounter systems, combat physics, damage mechanics, and architectural roadmap for implementing the new **Boss Rush Arena Mode** in *Super Rivelles Peris World*. 

All 9 world bosses (Gran Bellotón / Acornus, Capitán Pulparro / Octobeard, Faraón Cobratón / Tutankobra, Madame Marionetta / Marionetta, Yeti Blizzardo / Frostfang, Barón Tempesto / Tempesto, Giga Gravitón / Gravitón, Cosmo-Mecha / Cosmo-Mecha, Lord Infernus Rex / Infernus Rex) have been fully investigated across their data definitions, 3-phase AI state machines, arena confinement bounds, and projectile systems in `index.html`.

A complete technical architecture for the standalone Boss Rush Arena Mode has been designed, covering dedicated UI entry points (Main Menu / Pause Modal), a 9-stage sequential spawning gauntlet, a persistent health carryover system, high-precision live timer HUD (`MM:SS.mmm`), victory ranking, record persistence in `localStorage`, and automated test specifications for `test_mechanics.js`.

---

## 2. Comprehensive Inventory of the 9 World Bosses

Each boss is instantiated via `class WorldBoss` (`index.html` lines 1348–1750) and bound to level configurations in `LEVEL_CONFIGS` (lines 809–819).

| # | Boss Key | Name | Title | World & Theme | Size ($W \times H$) | Base Coordinates | Arena X Range | AI Pattern & Distinct Projectile / Stomp Attacks |
|---|---|---|---|---|---|---|---|---|
| **1** | `acornus` | **Gran Bellotón** | Titán del Roble Dorado | 1-1 Colinas Bellota (`garden`) | $70 \times 76$ px (Medium) | $x=3520, y=185$ | $3320 \dots 3720$ | Ground patrol + super vertical leaps (`vy = -7.5`, landing thwomp + camera shake). Spawns falling acorns (`type: 'acorn'`, $r=9$, $vy=3.5$) from ceiling (2 in Phase 1–2, 4 in Phase 3). |
| **2** | `octobeard` | **Capitán Pulparro** | Pirata de las Profundidades | 1-2 Océano de Coral (`marine`) | $70 \times 76$ px (Medium) | $x=3520, y=185$ | $3320 \dots 3720$ | Floating sine-wave hover ($y = baseY - 15 + \sin(\theta)\cdot 16$). Fires undulating bubble waves (`type: 'bubble'`, $r=8$, $vx = \pm (3.0+0.8i)$, $vy = \sin(frame+i)\cdot 1.8$) (2 in Phase 1–2, 3 in Phase 3). |
| **3** | `tutankobra` | **Faraón Cobratón** | La Serpiente Esfinge | 1-3 Pirámides de Egipto (`egypt`) | $62 \times 68$ px (Standard) | $x=3520, y=185$ | $3320 \dots 3720$ | Fast undulating ground slither ($y = baseY - 8 + \sin(1.5\theta)\cdot 18$). Fires targeted pharaoh fireballs (`type: 'pharaoh_fire'`, $r=9$, $vx = \pm 4.2$, $vy = (player.y - y)\cdot 0.02$). |
| **4** | `marionetta` | **Madame Marionetta** | Hechicera de Naipes | 1-4 Castillo Disney (`disney`) | $62 \times 68$ px (Standard) | $x=3520, y=150$ | $3320 \dots 3720$ | Levitation figure-eight aerial trajectory ($y = baseY - 30 + \sin(1.2\theta)\cdot 22$, $x = \cos(0.7\theta)\cdot 2.2\cdot speedMult$). Fires multi-angle tarot card spreads (`type: 'card'`, $r=8$, $vy = a \cdot 1.6$). |
| **5** | `frostfang` | **Yeti Blizzardo** | Monarca Glacial | 1-5 Glaciares Frozen (`frozen`) | $70 \times 76$ px (Medium) | $x=3520, y=185$ | $3320 \dots 3720$ | Rapid ground dash + seismic ground slam (triggers camera shake + `audio.thwomp()`). Summons falling ceiling icicles (`type: 'icicle'`, $r=8$, $vy = 4.2$) across arena width (2 in Phase 1–2, 4 in Phase 3). |
| **6** | `tempesto` | **Barón Tempesto** | Galeón de las Cumbres | 1-6 Reino del Cielo (`sky`) | $62 \times 68$ px (Standard) | $x=3520, y=150$ | $3320 \dots 3720$ | High-altitude airborne cruise ($y = baseY - 38 + \sin(\theta)\cdot 14$). Discharges vertical tracking lightning strikes (`type: 'lightning'`, $r=9$, $vx = (player.x - x)\cdot 0.025$, $vy = 3.8$). |
| **7** | `graviton` | **Giga Gravitón** | Geoda de Masa Oscura | 1-7 Cavernas Zero-G (`cave`) | $62 \times 68$ px (Standard) | $x=3520, y=150$ | $3320 \dots 3720$ | Elliptical cosmic orbit around arena center ($x = center + \cos(0.8\theta)\cdot 90$, $y = baseY - 25 + \sin(1.4\theta)\cdot 20$). Fires gravity dark orbs (`type: 'gravity_orb'`, $r=8$, $speed=3.6$) in 3-way directional spreads. |
| **8** | `cosmomecha` | **Cosmo-Mecha** | Coloso Planetario Estelar | 1-8 Mario Galaxy (`galaxy`) | $80 \times 86$ px (Large) | $x=3520, y=185$ | $3320 \dots 3720$ | Heavy mech stomp and ground shockwaves (`vy = -7.5`). Fires high-velocity targeted star lasers (`type: 'star_laser'`, $r=10$, $vx = \pm 5.0$, $vy = (player.y - y)\cdot 0.02$). |
| **9** | `infernus` | **Lord Infernus Rex** | Soberano del Núcleo Magmático | 1-9 Castillo de Lava (`castle`) | $80 \times 86$ px (Large) | $x=3520, y=185$ | $3320 \dots 3720$ | Floating magma titan ($y = baseY - 6 + \sin(\theta)\cdot 8$). Fires multi-projectile magma sprays (`type: 'magma'`, $r=10$, $vx = \pm (3.8+0.8i)$). In Phase 3, summons targeted volcanic meteors (`type: 'meteor'`, $r=11$, $vy = 4.8$) with screen shake. |

---

## 3. Boss Systems & State Machine Architecture

### 3.1 HP, Phases, and Speed Scaling
- **Health**: Each boss starts with $\text{maxHp} = 3$ and $\text{hp} = 3$.
- **Phase Calculation**: $\text{phase} = \max(1, 4 - \text{hp})$.
  - **Phase 1** ($3\text{ HP}$): Base movement speed ($1.1\times$), relaxed attack frequency.
  - **Phase 2** ($2\text{ HP}$): Elevated speed ($1.6\times$), orange aura halo (`#FF9800`, blur 12), increased attack cadence.
  - **Phase 3** ($1\text{ HP}$): Enrage speed ($2.2\times$), blazing red aura halo (`#FF1744`, blur 20), projectile storm attacks + faster breathing/animation cycles.

### 3.2 Invulnerability & Hit Reactions
- **Boss Invincibility Timer**: $\text{invincTimer} = 85$ frames (~1.4 seconds) upon taking damage. Boss sprites flicker at `Math.floor(now/45) % 2 === 0` with `globalAlpha = 0.35`.
- **Boss Stun Timer**: $\text{stunTimer} = 40$ frames during which boss attack timer and forward locomotion halt.
- **Screen Shake & Feedback**:
  - Regular hit: Camera shake 16px, 40 multi-color particle burst, floating text `💥 ¡GOLPE! (HP/3)`.
  - Boss defeat: Camera shake 24px, 80 particles, floating text `👑 ¡JEFE DERROTADO! +3500 ★`, `audio.bossDefeat()`, +15 Star Dust award.

### 3.3 Boss Collision & Damage Math
1. **Head Stomp Hit**:
   $$\text{player.vy} > 0 \quad \land \quad \text{player.y} + \text{player.h} < \text{boss.y} + 32$$
   - Damages boss by 1 HP.
   - Bounces player upward with $\text{player.vy} = -10.5$.
   - Triggers squash/stretch ($\text{squashX} = 1.35, \text{squashY} = 0.65$) and 6 frames of game hit-stop (`hitStopFrames = 6`).
2. **Ground Pound Hit**:
   $$\text{player.isGroundPounding} == \text{true}$$
   - Instantly damages boss regardless of relative height upon overlap.
3. **Projectile Damage (Fireball / Iceball / Petal / Plasma)**:
   - Tracks `bossHitsTaken`. Every 4 projectile hits equal 1 boss stomp hit, resetting counter and triggering `boss.takeDamage()`.

---

## 4. Boss Rush Arena Mode Technical Architecture

```
                                  ┌───────────────────────────────┐
                                  │   UI Entry Point Selection    │
                                  │ • Main Menu: ⚔️ BOSS RUSH ARENA│
                                  │ • Pause Menu: ⚔️ DESAFÍO BOSS  │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │    startBossRush(charId)      │
                                  │ • state = 'BOSS_RUSH'         │
                                  │ • bossRushIdx = 0 (Acornus)   │
                                  │ • bossRushTimer = 0 (Live ms) │
                                  │ • bossRushHp = 3 (Max Hearts) │
                                  │ • bossRushDefeated = 0        │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                     ┌────────────────────────────────────────────────────────┐
                     │              Boss Arena Combat Loop                    │
                     │ • Render Arena Backdrop & Platforms                    │
                     │ • Spawn Current Boss (0..8) in sequence                │
                     │ • Live Timer HUD: MM:SS.mmm                            │
                     │ • Boss HP vs Player Hearts HUD                         │
                     └───────────────┬────────────────────────┬───────────────┘
                                     │                        │
                    Player HP == 0   │                        │ Boss Defeated (hp <= 0)
                                     ▼                        ▼
                      ┌──────────────────────┐   ┌────────────────────────────┐
                      │  BOSS_RUSH_GAMEOVER  │   │  bossRushDefeated++        │
                      │ • Display Time       │   │  Surviving HP carried over │
                      │ • Jefes: X / 9       │   │  Optional Heart Rest Heal  │
                      │ • Retry / Exit Menu  │   └────────────┬───────────────┘
                      └──────────────────────┘                │
                                                              ▼
                                                    Is Boss Index < 8 ?
                                                   ├── YES: bossRushIdx++, spawn next boss
                                                   └── NO (All 9 defeated):
                                                              │
                                                              ▼
                                                 ┌────────────────────────────┐
                                                 │    BOSS_RUSH_VICTORY       │
                                                 │ • Grand Victory Fanfare    │
                                                 │ • Final Clear Time         │
                                                 │ • Rank S / A / B / C       │
                                                 │ • Save to localStorage     │
                                                 └────────────────────────────┘
```

### 4.1 UI Entry Points
1. **Character Selection / Title Modal (`modal-select`)**:
   - Add dedicated action button: `<button class="snes-btn-gold" id="btn-boss-rush" style="background:linear-gradient(180deg, #FF1744 0%, #D50000 100%); border-color:#FFD700; color:#FFF;">⚔️ BOSS RUSH ARENA 🏆</button>`.
   - Clicking immediately initiates Boss Rush with the currently chosen character.
2. **In-Game Pause Modal (`modal-pause`)**:
   - Add button `<button class="pause-btn" id="btn-pause-boss-rush">⚔️ ENTRAR A BOSS RUSH</button>`.

### 4.2 Boss Rush Gauntlet Loop & Sequential Progression
- **Ordered Sequence**:
  ```js
  const BOSS_RUSH_ROSTER = [
    { bossKey: 'acornus',    name: 'GRAN BELLOTÓN',     title: 'Titán del Roble Dorado',       theme: 'garden', track: 'overworld', y: 185 },
    { bossKey: 'octobeard',  name: 'CAPITÁN PULPARRO',  title: 'Pirata de las Profundidades',  theme: 'marine', track: 'marine',    y: 185 },
    { bossKey: 'tutankobra', name: 'FARAÓN COBRATÓN',   title: 'La Serpiente Esfinge',         theme: 'egypt',  track: 'egypt',     y: 185 },
    { bossKey: 'marionetta', name: 'MADAME MARIONETTA', title: 'Hechicera de Naipes',         theme: 'disney', track: 'disney',    y: 150 },
    { bossKey: 'frostfang',  name: 'YETI BLIZZARDO',    title: 'Monarca Glacial',              theme: 'frozen', track: 'frozen',    y: 185 },
    { bossKey: 'tempesto',   name: 'BARÓN TEMPESTO',    title: 'Galeón de las Cumbres',        theme: 'sky',    track: 'sky',       y: 150 },
    { bossKey: 'graviton',   name: 'GIGA GRAVITÓN',     title: 'Geoda de Masa Oscura',         theme: 'cave',   track: 'cave',      y: 150 },
    { bossKey: 'cosmomecha', name: 'COSMO-MECHA',       title: 'Coloso Planetario Estelar',    theme: 'galaxy', track: 'galaxy',    y: 185 },
    { bossKey: 'infernus',   name: 'LORD INFERNUS REX', title: 'Soberano del Núcleo Magmático', theme: 'castle', track: 'castle',    y: 185 }
  ];
  ```
- **Arena Geometry**:
  - Arena width: Compact closed colosseum $x \in [100, 500]$, with solid floor at $y=256$, side boundaries, and two floating platforms for tactical jumps.
  - Theme/Sky/BGM updates dynamically per boss stage.

### 4.3 Health Carryover & Recovery Intermission
- **Player Health**: Player has 3 Hearts in Boss Rush (`this.bossRushPlayerHp = 3`, `this.bossRushMaxHp = 3`).
- **Damage**: Taking a hit from a boss projectile or body reduces `bossRushPlayerHp` by 1 and grants 90 invulnerability frames (`invincibleTimer = 90`).
- **Carryover**: `bossRushPlayerHp` is **retained** from Boss 1 through Boss 9.
- **Intermission Reward**: After defeating a boss, a floating recovery Heart / Super Mushroom spawns in the center (`+1 HP`, capped at max 3 HP), rewarding skilled evasion while giving breathing room for endurance.

### 4.4 Live Millisecond Timer HUD
- **Tracking**:
  - `bossRushStartTime`: Recorded via `performance.now()`.
  - `bossRushElapsedTime`: Cumulative ms while `state === 'BOSS_RUSH'`.
  - Pausing game halts timer accumulator.
- **Formatting Helper**:
  ```js
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const millis = Math.floor(ms % 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  ```
- **HUD Layout**:
  - Top Left: Hero Name + Player Hearts (`❤️❤️❤️`).
  - Top Center: Current Boss HUD (Boss Name, Title, and 3 Boss HP Hearts).
  - Top Right: `⏱️ 02:45.320` live timer + `⚔️ 4/9 JEFES` defeat counter.

### 4.5 Defeat Handling, Game Over & Victory Screen
1. **Player Death (`bossRushPlayerHp <= 0`)**:
   - Transitions to `'BOSS_RUSH_GAMEOVER'`.
   - Displays:
     - "💀 DERROTA EN LA ARENA"
     - Jefes Derrotados: `X / 9`
     - Tiempo Sobrevivido: `MM:SS.mmm`
     - Action buttons: "🔄 REINTENTAR BOSS RUSH" & "🗺️ VOLVER AL MENÚ".
2. **All 9 Bosses Defeated**:
   - Transitions to `'BOSS_RUSH_VICTORY'`.
   - Plays grand victory fanfare (`audio.winFanfare()`).
   - Displays:
     - "👑 ¡CAMPEÓN ABSOLUTO DE BOSS RUSH! 🏆"
     - Tiempo Final de Récord: `MM:SS.mmm`
     - Rango obtenido:
       - **Rango S**: $< 3\text{m }30\text{s}$ y $\ge 2\text{ HP}$
       - **Rango A**: $< 5\text{m }00\text{s}$
       - **Rango B**: $< 7\text{m }30\text{s}$
       - **Rango C**: $\ge 7\text{m }30\text{s}$
     - Recompensa de Polvo Estelar: $+100$ Star Dust.
     - Persists record in `localStorage`:
       ```json
       {
         "bestTimeMs": 215420,
         "bestTimeStr": "03:35.420",
         "bestRank": "S",
         "bestBosses": 9
       }
       ```

---

## 5. Test Suite Mechanics & QA Coverage Review

### 5.1 Existing Test Suite Baseline (`test_mechanics.js`)
The project currently has **153 automated tests** across 8 test suites:
- Suite 1: Class Instantiations & Configurations (17 tests)
- Suite 2: Character Unique Powers (10 tests)
- Suite 3: Power States & Transformations (10 tests)
- Suite 4: Collision Detection Math (9 tests)
- Suite 5: 9 Mounts & Panic/Flee Mechanics (12 tests)
- Suite 6: All 9 Bosses & 3-Phase AI Mechanics (36 tests — 4 tests $\times$ 9 bosses)
- Suite 7: Tommy AI Companion (2 tests)
- Suite 8: 9 World Levels Generation (45 tests — 5 assertions $\times$ 9 levels)
- **Total**: 153 Passed, 0 Failed.

### 5.2 Required New Boss Rush Test Suite Specifications (Suite 9)
The test suite in `test_mechanics.js` must be expanded with a dedicated Boss Rush validation suite:
1. `[PASS] Boss Rush Mode initialization and state transition (state === 'BOSS_RUSH')`
2. `[PASS] Boss Rush 9-boss roster order matches all 9 world bosses in canonical order`
3. `[PASS] Boss Rush live timer tracking accumulates elapsed milliseconds and formats as MM:SS.mmm`
4. `[PASS] Boss Rush player starts with 3 Hearts and takes damage on hazards`
5. `[PASS] Boss Rush surviving player HP carries over between sequential boss stages`
6. `[PASS] Boss Rush defeat counter increments on each boss elimination (1/9 to 9/9)`
7. `[PASS] Boss Rush stage transitions smoothly from Boss N to Boss N+1 upon defeat`
8. `[PASS] Boss Rush triggers BOSS_RUSH_GAMEOVER state when player HP reaches 0`
9. `[PASS] Boss Rush triggers BOSS_RUSH_VICTORY state upon defeating the 9th boss (Infernus Rex)`
10. `[PASS] Boss Rush records best completion time and rank to localStorage`

---

## 6. Synthesis & Risk Assessment

| Feature Element | Potential Risk | Architectural Mitigation |
|---|---|---|
| **Audio Context State** | Web Audio oscillator leaks across 9 fast boss transitions | Explicit cleanup in `audio.stopBGM()` before triggering new boss track. |
| **Arena Memory & Projectiles** | Lingering projectiles from Boss N hitting player when Boss N+1 spawns | Reset `this.fireballs = []` and `boss.projectiles = []` on stage load. |
| **Mobile Layout & Viewport** | HUD timer overlapping character health bar in small mobile screens | Position timer at top-right, boss HUD at top-center, player HP at top-left with responsive font scaling (`@media max-height: 520px`). |
| **Backward Compatibility** | Existing 153 tests breaking due to constructor or method signature changes | Keep `PlatformerGame` method signatures intact; encapsulate Boss Rush helpers as clean standalone methods. |

---
*Report certified by Explorer 2 — Ready for Implementation Phase.*
