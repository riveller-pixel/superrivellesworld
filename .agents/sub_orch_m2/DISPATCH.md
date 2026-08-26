## 2026-08-25T21:08:08Z

<USER_REQUEST>
You are the Implementation Specialist for Milestone 2: Boss Rush Arena Mode.
Working Directory: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m2\
Project Root: c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World

MANDATORY FIRST STEP: Read:
1. c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\ORIGINAL_REQUEST.md
2. c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\PROJECT.md
3. c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\explorer_survey_2\survey_report.md
4. c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\TEST_INFRA.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Milestone 2 Scope & Deliverables:
1. F2.1 Boss Rush Menu Entry Points:
   - Add "⚔️ BOSS RUSH ARENA" access button in Main Menu modal (`#modal-select`) and Pause modal (`#modal-pause`).
   - Clicking starts Boss Rush mode with selected character.
2. F2.2 Sequential 9-Boss Arena Gauntlet:
   - Implement `PlatformerGame.startBossRush(charId)`, `loadBossRushStage(bossIdx)`, `nextBossRushStage()`, and `handleBossRushDefeat()`.
   - Sequential boss spawning across all 9 canonical bosses in order: Acornus -> Octobeard -> Tutankobra -> Marionetta -> Frostfang -> Tempesto -> Gravitón -> Cosmo-Mecha -> Infernus Rex.
   - Dedicated compact arena stage generation (instant boss encounter without needing to traverse 3800px stage).
3. F2.3 Surviving Health Carryover:
   - Persistent 3-heart health model (`this.bossRushPlayerHp = 3`) carried over between stages.
   - Player taking damage reduces surviving hearts. Intermission rest item (+1 Heart recovery capsule/item) rewarded between fights.
   - If player HP reaches 0, trigger `BOSS_RUSH_GAMEOVER` state with retry / return to menu.
4. F2.4 High-Precision Live Timer & HUD:
   - Live timer tracking start time to completion with millisecond precision formatted as `MM:SS.mmm`.
   - Top HUD displaying: Boss Rush Header, Live Timer (`MM:SS.mmm`), Boss Progress Counter (`X/9 JEFES`), Boss Health Bar, and Player Heart Indicators.
5. F2.5 Victory & Ranking Persistence:
   - Upon defeating Infernus Rex (Boss 9), transition to `BOSS_RUSH_VICTORY` state.
   - Calculate performance ranking (Rank S: < 3:00, Rank A: < 5:00, Rank B: < 7:30, Rank C: >= 7:30).
   - Save best time and record in `localStorage.setItem('srpw_bossrush_record', ...)`.
   - Award bonus Star Dust (+100 Star Dust) on victory.
6. Verification:
   - Run `node test_mechanics.js` and `node test_e2e_systems.js` and ensure 100% pass rate.
   - Add/update any test assertions required in `test_mechanics.js`.
7. Write your handoff report to c:\Users\riveller\OneDrive - Tarkett\Documents\Antigravity\Super Rivelles Peris World\.agents\sub_orch_m2\handoff.md and report back via send_message.
</USER_REQUEST>
