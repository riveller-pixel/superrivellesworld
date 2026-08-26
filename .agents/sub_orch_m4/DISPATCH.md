## 2026-08-25T21:21:09Z
You are the Implementation Specialist for Milestone 4: Visual & Audio Next-Gen Polish.
Working Directory: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m4\
Project Root: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World

Milestone 4 Scope & Deliverables:
1. F4.1 Multi-Layer Parallax Backdrops:
   - Ensure procedural 4-layer parallax depth rendering across all 10 themes in `renderBackground(ctx, now)`: deep sky gradients, distant celestial / mountain / structure silhouettes, midground terrain elements, foreground atmospheric glow / particles.
   - Smooth horizontal wrapping and camera coordinate tracking.
2. F4.2 Cinematic Boss Entry Banners:
   - Implement dramatic 90-frame letterbox Boss Entry Banner on boss encounter activation in `WorldBoss.prototype.update` and `renderHUD` / `renderBossBanner`:
     - Top and bottom cinematic black letterbox bars (28px height).
     - Center golden/crimson framed banner with Boss Name, Title, World subtitle, and glowing insignia.
     - Smooth opacity fade-in and slide-in transition (`bossBannerTimer = 90`).
     - Trigger dramatic `bossWarning()` SFX upon banner entry.
3. F4.3 Impact Hit-Sparks & Particle Geometry:
   - Implement `PlatformerGame.prototype.addHitSpark(x, y, color)`:
     - Dynamic 4-point starburst hit-spark geometry rendering (drawing 4 diamond flare points).
     - 8-spark radial burst on enemy stomp / block shatter.
     - 16-spark chromatic burst on boss damage.
     - 4-frame micro hit-stop freeze effect on critical boss impacts for punchy tactile feedback.
4. F4.4 Expanded Polyphonic Web Audio Synthesizer:
   - Verify and polish multi-voice synthesized music sequences (`cosmic`, `bossrush`) in `SoundFX`.
   - Polish expansion SFX: `hitSpark()`, `bossWarning()`, `boutiqueBuy()`, `wingFlap()`, `cyberVisorBeep()`.
   - Ensure clean oscillator garbage collection on track transitions and smooth gain ramp fading on mute toggle.
5. F4.5 60 FPS Performance & Mobile Touch Responsiveness:
   - Ensure fixed-timestep accumulator loop maintains rock-solid 60 FPS.
   - Verify touch controller (`TouchController`) multi-touch handling with zero input lag.
   - Verify Service Worker (`sw.js`) network-first / cache-fallback offline readiness.
6. Verification:
   - Run `node test_mechanics.js` and `node test_e2e_systems.js` and ensure 100% pass rate.
   - Add any test assertions needed for Suite 12 (Visual & Audio Polish) in `test_mechanics.js`.
7. Write your handoff report to c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m4\handoff.md and report back via send_message.
