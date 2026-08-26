## 2026-08-25T21:15:00Z
You are the Implementation Specialist for Milestone 3: Royal Closet & Trophy Boutique Expansion.
Working Directory: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m3\
Project Root: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World

Milestone 3 Scope & Deliverables:
1. F3.1 Centralized Cosmetics Catalog:
   - Define a rich `COSMETICS_CATALOG` in `index.html` with 10 total accessories:
     - `none` (Sin Accesorio, cost: 0, slot: 'none')
     - `crown` (Corona Real 👑, cost: 0, slot: 'head')
     - `sunglasses` (Gafas de Sol 😎, cost: 0, slot: 'face')
     - `flower_crown` (Corona de Flores 🌸, cost: 25, slot: 'head')
     - `cape` (Capa Heroica 🦸, cost: 40, slot: 'back')
     - `astro_helmet` (Casco Astral 👨‍🚀, cost: 60, slot: 'head')
     - `golden_wings` (Alas Doradas 🪽, cost: 120, slot: 'back')
     - `starlight_crown` (Corona Estelar 👑✨, cost: 150, slot: 'head')
     - `cyber_visor` (Visor Cibernético 🕶️, cost: 80, slot: 'face')
     - `pharaoh_cape` (Capa Faraónica 𓀀, cost: 90, slot: 'back')
2. F3.2 Star Dust Currency Wallet:
   - Initialize `this.starDust` in `PlatformerGame` constructor.
   - Persist `starDust` and `unlockedHats` array in `localStorage['srpw_save_data']`.
   - Update `completeLevel()`, `collectCoin()`, and `handleBossRushVictory()` to award and save Star Dust.
   - Implement `PlatformerGame.prototype.purchaseAccessory(hatId)` with fund validation, deducting cost, adding to `unlockedHats`, and auto-saving.
3. F3.3 Dynamic Boutique Shop UI:
   - Dynamically render the 10 accessory cards in `#modal-closet` with price tags, Star Dust wallet indicator, purchase buttons, equip states ("EQUIPADO", "EQUIPAR", "💰 X POLVO"), and instant visual preview.
   - Connect purchase/equip actions with audio feedback.
4. F3.4 Layered Multi-Character Rendering:
   - Update `renderPlayer(ctx, now)` in `index.html` with clean layered accessory rendering:
     - Back layer (wings, capes) rendered behind character sprite.
     - Front layer (crowns, helmets, visors, sunglasses) rendered in front of character sprite.
     - Accurately scale and position relative to all 5 playable characters' varying sprite dimensions (`candela`: 24x36, `cayetana`: 24x36, `valentina`: 22x34, `mama`: 25x38, `papa`: 26x42) across all motion states (idle, run tilt, jump stretch, duck squash, mount riding, spin jump).
5. Verification:
   - Run `node test_mechanics.js` and `node test_e2e_systems.js` and ensure 100% pass rate.
   - Add test assertions for cosmetic purchasing, catalog schema, wallet persistence, and multi-character rendering without errors.
6. Write your handoff report to c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m3\handoff.md and report back via send_message.
