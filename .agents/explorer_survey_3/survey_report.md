# Super Rivelles Peris World - Architecture & Systems Survey Report
**Focus Scope Area 3**: Royal Closet & Boutique, Multi-Character Rendering, Visual & Audio Engine Polish, Performance & QA Mechanics
**Explorer Agent**: Explorer 3 (Survey Phase)
**Date**: 2026-08-25

---

## Executive Summary

Super Rivelles Peris World is an HTML5 retro-modern 2.5D platformer built as a high-performance single-canvas game with custom procedural 2D rendering, Web Audio API multi-channel sound synthesis, and touch/keyboard input handling. 

This survey provides a comprehensive architectural breakdown of:
1. **The Royal Closet & Boutique System**: Data structures, currency persistence (Star Dust / Polvo Estelar), purchasing workflows, and cosmetic catalog expansion.
2. **Multi-Character & Accessory Rendering Pipeline**: Layered sprite rendering across all 5 playable characters (Candela, Cayetana, Valentina, Mamá, Papá) and multi-state accessory rendering (idle, running, jumping, ducking, mounting).
3. **Visual Polish Subsystems**: Parallax multi-layer backgrounds, smooth lookahead camera with shake decay, dynamic hit-sparks and particle systems, and dramatic cinematic boss encounter banners.
4. **Audio Engine Architecture**: Pure synthesized 4-channel Web Audio API engine (`SoundFX`), polyphonic BGM track sequencers, drum noise generators, and SFX expansions.
5. **Performance, Mobile & PWA Systems**: 60 FPS fixed-timestep accumulator loop, responsive touch controller with dynamic safe zones, and Service Worker Network-First caching.
6. **Automated QA & Test Suite Requirements**: Mapping existing 153 test mechanics and specifying test criteria for the new cosmetic shop, audio tracks, and visual mechanics in `test_mechanics.js`.

---

## 1. Royal Closet & Boutique Architecture

### 1.1 Current Implementation Analysis
- **DOM Container**: `#modal-closet` in `index.html` (lines 284–336), triggered by `#btn-open-closet` (line 277) on the Character Selection modal and the in-game World Map navigation bar (line 3743).
- **Current Data Model in `PlatformerGame`**:
  - `this.starDust` initialized to `0` in constructor (`index.html:2272`).
  - `this.selectedHat` initialized from `localStorage.getItem('srpw_hat') || 'crown'` (`index.html:2296`).
  - `this.unlockedHats` read from `localStorage.getItem('srpw_unlocked_hats') || '["crown"]'` (`index.html:2298–2302`).
  - Currently, 6 hardcoded cards exist in `#modal-closet`: `crown`, `sunglasses`, `flower_crown`, `cape`, `astro_helmet`, `none`.
  - In the current UI, all hats display static text `"DESBLOQUEADO"` regardless of star dust, and clicking simply selects the hat (`index.html:2410–2418`).
- **Deficiency Identified**:
  - `this.starDust` is reset to `0` on reload because it is not saved to `localStorage` in `completeLevel()` or when star dust is collected.
  - No shop purchase mechanism exists (price check, deducting Star Dust, saving `unlockedHats`).
  - No dynamic button states (`COMPRAR ★ [Cost]`, `EQUIPAR`, `EQUIPADO`).

### 1.2 Target Cosmetic Catalog Specification (Requirement R3)
The cosmetic shop must feature an expanded catalog of accessories unlockable with Star Dust:

| ID | Name | Emoji / Icon | Star Dust Price | Visual Description & Layering |
|---|---|---|---|---|
| `crown` | Corona Real | 👑 | 0 (Default) | 3-point golden crown with ruby gem atop character head |
| `none` | Estilo Clásico | ✨ | 0 (Default) | Standard character hair/headdress without accessory |
| `flower_crown` | Diadema Floral | 🌸 | 40 ★ | Multi-colored pastel floral wreath resting on hair |
| `sunglasses` | Gafas Cool | 🕶️ | 60 ★ | Dark retro sunglasses with golden frame across eyes |
| `cape` | Capa Heroica | 🦸 | 80 ★ | Crimson hero cape trailing behind character with animated fluttering |
| `astro_helmet` | Casco Galaxy | 🚀 | 100 ★ | Translucent cyan glass spacesuit bubble with reflective rim |
| `golden_wings` | Alas Doradas | 🪽 | 150 ★ | Radiant feathered golden wings flapping on player's back |
| `starlight_crown`| Corona de Estrellas | 👑✨ | 180 ★ | Multi-point platinum crown with sparkling gem glints and starlight particles |
| `cyber_visor` | Visor Cibernético | 🕶️⚡ | 200 ★ | Glowing holographic neon cyan/magenta visor with scanning line effect |
| `pharaoh_cape` | Manto Faraónico | 🪶👑 | 250 ★ | Egyptian royal turquoise and gold ceremonial cape waving with velocity |

### 1.3 Persistence & Currency Lifecycle
- **Storage Keys**:
  - `srpw_save_data`: Object `{ unlocked: [...], starCoins: {...], highScore: N, starDust: N, unlockedCosmetics: [...] }`
  - Direct keys fallback: `srpw_star_dust`, `srpw_unlocked_hats`, `srpw_hat`.
- **Collection Points**:
  - Standard Coins & Star Coins: `collectStarDust(x, y)` (`index.html:2988–3007`) increments `this.starDust++` (with multiplier bonus on combos).
  - Boss defeat bonus: +25 Star Dust.
  - Secret Star World cosmic crystals: +3 Star Dust per crystal.
- **Purchase Workflow**:
  ```
  Player clicks locked Item Card
  ├── Check: this.starDust >= item.price ?
  │    ├── YES:
  │    │    ├── this.starDust -= item.price
  │    │    ├── this.unlockedHats.push(item.id)
  │    │    ├── this.selectedHat = item.id
  │    │    ├── Persist to localStorage ('srpw_star_dust', 'srpw_unlocked_hats', 'srpw_hat')
  │    │    ├── audio.powerUp() / audio.royalChime()
  │    │    └── Update UI (Display Star Dust balance, highlight card as EQUIPADO)
  │    └── NO:
  │         ├── audio.bump()
  │         └── Visual feedback: Shake card / red flash "¡Polvo Estelar insuficiente!"
  ```

---

## 2. Character & Accessory Rendering Pipeline

### 2.1 Playable Character Bounding Boxes & Offsets
The 5 characters defined in `CHARACTERS` (`index.html:686–697`) have distinct physics and dimensions:

| Character | Dimensions (w × h) | Sprite Bounds | Weight | Unique Trait |
|---|---|---|---|---|
| **Candela** | 24 × 36 | 30 × 44 | 1.00 | Balanced all-around, magic petals, mid-air cloud platform |
| **Cayetana** | 24 × 36 | 30 × 44 | 1.00 | Fastest sprint (6.2), invincible Super Dash |
| **Valentina**| 22 × 34 | 28 × 42 | 0.72 | Featherweight, plasma star wave, Triple Jump |
| **Mamá** | 25 × 38 | 31 × 46 | 0.75 | Flutter glide fall slowdown |
| **Papá** | 26 × 42 | 32 × 50 | 1.35 | Heavyweight, high impact Ground Pound |

### 2.2 Layered Rendering in `renderPlayer(ctx, now)` (`index.html:4223–4374`)
The render pipeline executes in the following sequence:

```
1. Coordinate Transformation:
   cam.toScreen(p.x, p.y) -> Translate to Center (s.x + p.w/2, s.y + p.h/2 + walkBob)
   -> Facing Flip (ctx.scale(-1, 1) if facing left)
   -> Rotation (runTilt + airSpinAngle)
   -> Squash/Stretch (ctx.scale(p.squashX, p.squashY))

2. Background Accessories Layer (Behind Player Sprite):
   ├── Wings (Golden Wings / Pegasus Wings): Left & Right wing geometry with sin-wave flapping
   └── Flowing Capes (Hero Cape / Pharaoh Cape): Trailing quad curves waving with velocity and time

3. Shadow & Invincibility Aura:
   ├── Drop shadow ellipse on ground
   └── Star Invincibility pulsing rainbow stroke / alpha flicker

4. Core Character Sprite:
   ctx.drawImage(loadedImages[this.selectedCharId], -pw/2, -ph/2, pw, ph)

5. Power-Up Overlays:
   ├── Pharaoh Nemes & Cobra
   ├── Princess Diamond Tiara & Royal Shield
   ├── Frozen Queen Ice Crown & Frost Aura
   ├── Galaxy Astronaut Bubble Helmet
   └── Fireflower Blazing Crown

6. Foreground Accessories Layer (In Front of Character Sprite):
   ├── Hats / Crowns / Visors (Crown, Starlight Crown, Sunglasses, Cyber Visor, Flower Crown, Astro Helmet)
   └── Saddle Reins (if p.isRiding)
```

### 2.3 New Accessory Rendering Specifications

1. **Golden Wings (`golden_wings`)**:
   - Drawn at `(-pw/2 - 4, -ph/4)` and `(pw/2 + 4, -ph/4)` behind character sprite.
   - Dynamic flap speed: Faster oscillation frequency when jumping/falling (`Math.sin(now * 0.025)`) vs idle (`Math.sin(now * 0.008)`).
   - Shaded layered feathers in `#FFD700`, `#FFC107`, and `#FFF8E1` with golden glow stroke.

2. **Starlight Crown (`starlight_crown`)**:
   - Drawn at `(0, -ph/2 - 8)`.
   - 5-point radiant platinum-gold crown (`#FFF9C4` / `#FFD700`) adorned with 3 shimmering sapphire/ruby gems.
   - Animated glinting star sparkle at peak point using rotating 4-pointed diamond star.

3. **Cyber Visor (`cyber_visor`)**:
   - Drawn at `(1, -ph/2 + 7)` matching character eye line.
   - Sleek angular visor with `#00E5FF` neon cyan gradient, `#E040FB` magenta edge reflection, and animated scanline sweep.

4. **Pharaoh Cape (`pharaoh_cape`)**:
   - Drawn behind character from shoulders `(-6, -ph/4)` trailing back `(-22 - vx*2, ph/3)`.
   - Rich royal turquoise (`#00838F`) body with dual gold embroidery stripes (`#FFD700`) and dangling hieroglyphic tassels.

---

## 3. Visual Polish Subsystems

### 3.1 Parallax Background Engine (`renderBackground`, `index.html:3774–4050`)
The Canvas 2D background renderer uses multi-layer parallax scrolling based on `cx = this.camera.x`:

- **Layer 0 (Infinite Depth)**: Vertical sky linear gradient with theme color palette (`0.00x`).
- **Layer 1 (Deep Sky / Celestial)**: Sun/Moon, celestial nebulae, twinkling star fields, moving high clouds (`0.02x` – `0.05x` camera factor).
- **Layer 2 (Far Mountains / Pyramids / Coral Reefs)**: Distant landscape silhouettes with atmospheric gradient fog (`0.07x` – `0.15x`).
- **Layer 3 (Mid-ground Hills / Castle Towers / Flora)**: Procedural bezier wave terrain, palm trees, crystal stalactites (`0.18x` – `0.35x`).
- **Layer 4 (Ambient Foreground Particles)**: Floating bubbles in Marine, snow flurry in Frozen, sparkling dust motes in Cave/Galaxy.

### 3.2 Smooth Camera Tracking & Screen Shake (`Camera`, `index.html:821–844`)
- **Target Position**: Centered on player with velocity-based dynamic lookahead:
  `tx = player.x + player.w/2 - VIRT_W/2 + (facingRight ? 60 : -60) + player.vx * 4`
- **Interpolation**: Smooth exponential decay lerp `this.x += (tx - this.x) * 0.08`.
- **Screen Shake System**:
  - Triggered via `game.camera.shake(intensity)`.
  - Generates random pixel offsets `offX = (Math.random() - 0.5) * intensity * 2`, `offY = (Math.random() - 0.5) * intensity`.
  - Attenuates smoothly with exponential decay multiplier `0.82` per frame until `< 0.4`.

### 3.3 Enhanced Hit-Sparks & Impact Effects
- Current particle engine (`addParticles`, `index.html:3588–3606`) creates simple circle dots.
- **Proposed Hit-Spark System**:
  - Support particle shapes: `circle`, `star` (4-pointed flash starburst), `spark_line` (directional velocity streak), `ring` (expanding shockwave ring).
  - Spawned on: Stomping enemies (8 directional sparks), Boss hit (16 golden-red impact stars), Block shatters (angular debris chips), Power-up collection (sparkling halo).
  - Short hit-stop frame freeze (`this.hitStopFrames = 3-5`) paired with spark bursts for high-impact retro game feedback.

### 3.4 Cinematic Boss Entry Visual Banners
- When a boss encounter triggers in `WorldBoss.update()` (`index.html:1391–1400`), currently only small floating text appears.
- **Proposed Boss Banner Subsystem**:
  - `bossBannerTimer = 90` frames.
  - Renders cinematic top & bottom widescreen letterbox bars (height 28px).
  - Center golden-bordered banner sliding in from screen edge with boss portrait icon, stylized boss name (e.g. `⚔️ GRAN BELLOTÓN ⚔️`), and subtitle (`"Guardián de las Colinas Bellota"`).
  - Smooth alpha fade-in/fade-out with glowing red/gold neon border pulse and `audio.bossHit()` or dedicated `audio.bossWarning()` sound effect.

---

## 4. Web Audio API Synthesizer Architecture (`SoundFX`, `index.html:393–672`)

### 4.1 Audio Engine Structure
- **Core Technology**: Native Web Audio API (`window.AudioContext` or `webkitAudioContext`). No external audio file downloads required — zero latency, 100% offline capable.
- **Channels & Nodes**:
  1. **Lead Synth Channel**: `OscillatorNode` (Square / Sawtooth / Sine / Triangle) + `GainNode` with ADSR-style envelope.
  2. **Bass Synth Channel**: `OscillatorNode` (Triangle / Sawtooth) + `GainNode` tuned to sub-octave frequencies.
  3. **Percussion Noise Channel**: Pre-generated audio buffers (`Float32Array` white/pink noise decaying exponentially) for snare drum and hi-hat.
  4. **Kick Drum Channel**: Fast frequency sweep oscillator (160 Hz -> 32 Hz) with rapid gain decay.
  5. **Master Bus**: Master `GainNode` with volume ramp smoothing on mute/unmute to prevent audio pops.

### 4.2 Existing BGM Tracks & Sequencer
Sequencer step clock runs via `setInterval` at 115ms per sixteenth note (approx. 130 BPM). Existing tracks:
- `overworld` (Garden Hills, Mario-inspired syncopation)
- `marine` (Ocean Coral, flowing waltz chords)
- `egypt` (Pharaoh Pyramids, harmonic minor scale in D)
- `disney` (Castle Magic, playful upbeat major arpeggios)
- `frozen` (Blizzard Glacier, crystalline bell-like frequencies)
- `sky` (Sky Kingdom, soaring major pentatonic leaps)
- `cave` (Zero-G Caverns, spooky chromatic resonance)
- `galaxy` (Mario Galaxy, cosmic synth sweep)
- `boss` (Titan Battle, fast driving sawtooth bass in D minor)

### 4.3 Expansion Audio Requirements
1. **New BGM Tracks**:
   - `cosmic` / `starworld`: Secret Star World theme with sparkling arpeggiated high chime lead, warm sine sub-bass, and cosmic space swing.
   - `bossrush`: Boss Rush Arena theme with fast 140 BPM techno-synth lead and pulse-width style rhythm.
2. **New Dedicated Sound Effects**:
   - `boutiqueBuy()`: High-pitch celestial coin chime chord `[659, 880, 1046, 1318]` confirming shop purchase.
   - `wingFlap()`: Soft airy frequency whoosh `[320 -> 580 Hz]` on golden wing thrusts.
   - `cyberVisorScan()`: Digital dual-tone futuristic chirp `[1200, 1600 Hz]`.
   - `bossWarning()`: Heavy dramatic gong / bass drop `[90 -> 30 Hz]` with snare crash on boss banner entry.

---

## 5. Performance, Mobile Responsiveness & PWA

### 5.1 Deterministic 60 FPS Fixed-Timestep Loop
- Game loop (`index.html:3060–3075`) uses fixed timestep accumulator:
  ```javascript
  const dt = Math.min(timestamp - (this.lastTime || timestamp), 100);
  this.lastTime = timestamp;
  this.accumulator += dt;
  while(this.accumulator >= FRAME_TIME){
    this.update(timestamp);
    this.accumulator -= FRAME_TIME;
  }
  this.render(timestamp);
  ```
- Physics updates run at exact 60Hz intervals (`FRAME_TIME = 16.666ms`) while rendering matches native `requestAnimationFrame` refresh rate.
- Time delta clamped at 100ms prevents "spiral of death" during mobile tab throttling or window focus switching.

### 5.2 Mobile Touch Controls (`TouchController`, `index.html:845–1006`)
- Multi-touch tracking using `Map` of touch identifiers (`this.activeTouches`).
- Dynamic virtual button sizing and safe area padding calculated from screen width/height (`updateLayout`).
- Separate hit testing for circular action buttons (A/B) and directional D-pad pads with 12px touch slop margin for responsive thumb control.
- Swipe gestures in World Map for smooth world navigation.

### 5.3 Service Worker & PWA Caching (`sw.js`)
- Cache version: `srpw-v2.2-live`.
- **Network-First Strategy** for HTML/Script resources (`index.html`): Guarantees instant deployment of new features and code fixes while falling back to cached offline copy if disconnected.
- **Cache-First Strategy** for static heavy assets (PNG images, icons, manifest).
- Clear cache button in settings (`#btn-clear-cache`, `index.html:2436–2452`) unregisters service workers and clears cache storage on user demand.

---

## 6. Automated QA & Test Requirements (`test_mechanics.js`)

### 6.1 Current Test Architecture
- Node.js test runner executing in a simulated browser VM environment (`createMockBrowserEnv` in `test_mechanics.js:6–174`).
- Extracts `<script>` tag from `index.html` and validates syntax + runtime execution.
- 8 Test Suites, 153 passing assertions:
  1. Class Instantiations & Configurations (18 tests)
  2. Character Unique Powers (12 tests)
  3. Power States & Transformations (16 tests)
  4. Collision Detection Math & Mechanics (9 tests)
  5. Mounts & Riding/Panic Mechanics (12 tests)
  6. Bosses & 3-Phase AI Mechanics (36 tests)
  7. Tommy AI Companion (2 tests)
  8. Level Generation & Verification (48 tests)

### 6.2 Proposed Test Suites for Focus Area 3

#### Suite 9: Royal Closet & Boutique Systems
- [ ] Catalog configuration: `COSMETICS_CATALOG` exists and contains at least 10 items including `golden_wings`, `starlight_crown`, `cyber_visor`, `pharaoh_cape`.
- [ ] Initial state: `this.starDust` and `this.unlockedHats` correctly loaded from localStorage or set to sensible defaults (`['crown', 'none']`).
- [ ] Star Dust collection: `collectStarDust(x, y)` increments `starDust`, updates combo streak, and increases score.
- [ ] Purchase failure: Attempting to purchase an accessory with insufficient Star Dust fails, does not deduct currency, and does not unlock item.
- [ ] Purchase success: Attempting to purchase an accessory with sufficient Star Dust deducts currency, unlocks item in `unlockedHats`, equips item, and updates localStorage.
- [ ] Equipping unlocked item sets `this.selectedHat` and persists to `srpw_hat`.
- [ ] Equipping locked item is blocked.

#### Suite 10: Multi-Character & Accessory Rendering Validation
- [ ] `renderPlayer(mockCtx, now)` executes with zero runtime exceptions across all 5 characters (`candela`, `cayetana`, `valentina`, `mama`, `papa`).
- [ ] `renderPlayer(mockCtx, now)` executes with zero runtime exceptions for every equipped accessory in the catalog (`crown`, `sunglasses`, `flower_crown`, `cape`, `astro_helmet`, `golden_wings`, `starlight_crown`, `cyber_visor`, `pharaoh_cape`, `none`).
- [ ] Accessory rendering accommodates mount riding state (`p.isRiding = true`), jumping (`p.onGround = false`), and super speed dash.

#### Suite 11: Web Audio Engine & SFX Validation
- [ ] `SoundFX` defines all required sound effect methods: `boutiqueBuy`, `wingFlap`, `cyberVisorBeep`, `bossWarning` alongside existing SFX.
- [ ] Calling audio methods in muted state (`audio.muted = true`) does not throw errors.
- [ ] Polyphonic sequencer supports new track configurations (`starworld`, `bossrush`).
- [ ] Drum synthesizers (`playDrum('kick')`, `playDrum('snare')`, `playDrum('hihat')`) execute cleanly with simulated audio buffers.

#### Suite 12: Visual Effects & Camera Systems
- [ ] `renderBackground(mockCtx, now)` executes cleanly across all 10 world themes (including `cosmic_starworld`).
- [ ] `camera.shake(14)` sets shake intensity and decays to zero after consecutive update frames.
- [ ] `addParticles` spawns particle elements and `updateParticles` advances positions and cleans up expired particles.

---

## 7. Recommendations & Architecture Summary for Implementation Phase

1. **Keep Single-Source-of-Truth in `index.html`**:
   The entire game engine and UI are seamlessly packaged within `index.html`, which is extracted and tested by `test_mechanics.js`. Any new cosmetic definitions, rendering functions, audio tracks, and UI modals should be added directly into `index.html` to maintain zero-bundle PWA simplicity.
2. **Standardize Cosmetic Schema**:
   Define `COSMETICS_CATALOG` as a centralized dictionary mapping IDs to `{ id, name, icon, price, desc, layer, drawFunc }` for modular rendering and UI generation.
3. **Persist Star Dust in Save Data**:
   Ensure `this.starDust` is included in the JSON payload of `srpw_save_data` in `PlatformerGame.completeLevel()`, `PlatformerGame.buyCosmetic()`, and constructor initialization.
4. **Non-Blocking Visual Banners**:
   Implement the Boss Entry Banner using a frame counter in `WorldBoss` or `PlatformerGame` rather than pausing game execution, ensuring gameplay fluidly transitions as the banner shines.
5. **Pure Procedural Audio**:
   Continue using Web Audio API procedural synthesis for all new sound effects and music tracks to maintain fast loading times, zero external dependencies, and instant mobile audio unlock.
