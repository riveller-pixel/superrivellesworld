/**
 * ADVERSARIAL STRESS-TEST & INTEGRITY AUDIT SUITE FOR MILESTONE 1 & 2
 * Reviewer 1 — Super Rivelles Peris World
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createMockBrowserEnv() {
  const listeners = {};
  const mockStorage = {};
  const localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
  };

  class MockImage {
    constructor() {
      this.src = '';
      this.complete = true;
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      this.onload = null;
      this.onerror = null;
    }
  }

  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = {};
    }
    resume() { return Promise.resolve(); }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    createBuffer(ch, len, sr) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} };
    }
  }

  const mockCtx = {
    canvas: { width: 512, height: 288 },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    drawImage: () => {},
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    textAlign: 'left',
    textBaseline: 'top',
    font: '10px sans-serif',
    imageSmoothingEnabled: true
  };

  class MockCanvas {
    constructor() {
      this.width = 512;
      this.height = 288;
      this.style = {};
    }
    getContext(type) { return mockCtx; }
    addEventListener() {}
    removeEventListener() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 512, height: 288 }; }
  }

  const mockElement = {
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    textContent: '',
    style: {},
    dataset: {}
  };

  const document = {
    getElementById: (id) => {
      if (id === 'game-canvas') return new MockCanvas();
      return { ...mockElement, id };
    },
    querySelectorAll: (sel) => [{ ...mockElement, dataset: { id: 'candela', hat: 'crown' } }],
    querySelector: (sel) => ({ ...mockElement }),
    addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    body: { style: {} },
    documentElement: { style: {} }
  };

  const window = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    innerWidth: 1024,
    innerHeight: 576,
    addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    removeEventListener: () => {},
    document,
    localStorage,
    Image: MockImage,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    CanvasRenderingContext2D: { prototype: mockCtx },
    scrollTo: () => {}
  };

  global.window = window;
  global.document = document;
  global.localStorage = localStorage;
  global.Image = MockImage;
  global.AudioContext = MockAudioContext;
  global.CanvasRenderingContext2D = window.CanvasRenderingContext2D;
  global.performance = window.performance;
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  return { window, document, localStorage, listeners, mockCtx };
}

let passCount = 0;
let failCount = 0;

function testAssert(condition, testName, details = '') {
  if (condition) {
    passCount++;
    console.log(`  [ADV-PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`  [ADV-FAIL] ${testName}: ${details}`);
  }
}

async function runAdversarialAudit() {
  console.log('=== RUNNING ADVERSARIAL AUDIT & STRESS SUITE (REVIEWER 1) ===\n');

  const env = createMockBrowserEnv();
  const indexPath = path.join(__dirname, '../../index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
  if (!scriptMatches || scriptMatches.length < 2) {
    throw new Error('Could not locate game script block in index.html');
  }

  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled for tests");

  const context = vm.createContext(global);
  const wrappedScript = `
    ${gameScript}
    ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic })
  `;
  const exportsObj = vm.runInContext(wrappedScript, context);
  Object.assign(context, exportsObj);

  // ─────────────────────────────────────────────────────────
  // SECTION 1: ANTI-INTEGRITY & DUMMY FACADE SCAN
  // ─────────────────────────────────────────────────────────
  console.log('--- 1. Anti-Integrity & Dummy Facade Inspection ---');

  // Check that formatTime is real logic, not a lookup table
  testAssert(context.formatTime(123456) === '02:03.456', 'formatTime produces exact arithmetic string for 123456ms');
  testAssert(context.formatTime(3599999) === '59:59.999', 'formatTime boundary 3599999ms');
  testAssert(context.formatTime(7200000) === '120:00.000', 'formatTime 2 hours (120 min)');

  // Check that LEVEL_CONFIGS has all 10 worlds with distinct data
  testAssert(context.LEVEL_CONFIGS.length === 10, 'LEVEL_CONFIGS defines exactly 10 worlds');
  const uniqueKeys = new Set(context.LEVEL_CONFIGS.map(c => c.bossKey));
  testAssert(uniqueKeys.size === 10, 'All 10 worlds have unique boss keys');

  // Check BOSS_RUSH_ROSTER has 9 canonical bosses
  testAssert(context.BOSS_RUSH_ROSTER.length === 9, 'BOSS_RUSH_ROSTER contains exactly 9 bosses');
  const canonicalOrder = ['acornus', 'octobeard', 'tutankobra', 'marionetta', 'frostfang', 'tempesto', 'graviton', 'cosmomecha', 'infernus'];
  const rosterKeys = context.BOSS_RUSH_ROSTER.map(b => b.bossKey);
  testAssert(JSON.stringify(rosterKeys) === JSON.stringify(canonicalOrder), 'BOSS_RUSH_ROSTER strictly follows canonical 1-1..1-9 order');

  // ─────────────────────────────────────────────────────────
  // SECTION 2: SECRET STAR WORLD (F1.1 - F1.5) STRESS TESTS
  // ─────────────────────────────────────────────────────────
  console.log('\n--- 2. Secret Star World (F1.1 - F1.5) Stress Testing ---');

  const game = new context.PlatformerGame();

  // Test 2.1: Star Coin boundary conditions
  game.starCoinsPerLevel = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1 }; // 19
  game.unlockedLevels = [true, true, true, true, true, true, true, true, false, false];
  testAssert(game.isStarWorldUnlocked() === false, 'isStarWorldUnlocked is false at 19 star coins');

  game.starCoinsPerLevel[6] = 2; // 20
  testAssert(game.isStarWorldUnlocked() === true, 'isStarWorldUnlocked is true at exactly 20 star coins');

  game.starCoinsPerLevel = {};
  game.unlockedLevels[8] = true; // World 9 (1-9) beaten
  testAssert(game.isStarWorldUnlocked() === true, 'isStarWorldUnlocked is true when World 1-9 is beaten');

  // Test 2.2: Cosmic low gravity & physics calculation across all 5 characters
  const characters = Object.keys(context.CHARACTERS);
  characters.forEach(cId => {
    const char = context.CHARACTERS[cId];
    game.selectedCharId = cId;
    game.currentLevelIdx = 9; // Star World
    game.startSelectedLevel();

    // Test gravity step
    game.player.onGround = false;
    game.player.vy = 0;
    game.input = { left: false, right: false, up: false, down: false, jump: false, action: false, paw: false };
    game.updatePlayer(1000, []);
    
    const expectedVy = 0.50 * 0.52 * char.weight;
    testAssert(Math.abs(game.player.vy - expectedVy) < 0.001, `Cosmic gravity for ${cId} scales to 50% (${expectedVy.toFixed(3)})`);
  });

  // Test 2.3: CrystalPlatform hover oscillation stability over extreme time stamps
  const crystalPlat = new context.CrystalPlatform(500, 150, 100, 16, 8, 0.004);
  crystalPlat.update(0);
  testAssert(!isNaN(crystalPlat.y) && isFinite(crystalPlat.y), 'CrystalPlatform y is finite at t=0');
  crystalPlat.update(1000000000); // 1 billion ms
  testAssert(!isNaN(crystalPlat.y) && isFinite(crystalPlat.y), 'CrystalPlatform y is finite at t=1,000,000,000ms');
  testAssert(Math.abs(crystalPlat.y - crystalPlat.baseY) <= crystalPlat.hoverAmp + 0.001, 'CrystalPlatform y stays strictly bounded within hover amplitude');

  // Test 2.4: Secret Star World Stage Layout & Astral Guardian
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  testAssert(game.levelWidth === 4200, 'Star World stage width is 4200px');
  testAssert(game.crystalPlatforms.length === 9, 'Star World contains 9 floating CrystalPlatforms');
  testAssert(game.starCoins.length === 3, 'Star World contains 3 Star Coins');
  testAssert(game.currentBoss && game.currentBoss.bossKey === 'astralis', 'Star World boss is Astral Guardian (astralis)');
  testAssert(game.currentBoss.hp === 3 && game.currentBoss.phase === 1, 'Astral Guardian starts with 3 HP in Phase 1');

  // Activate boss explicitly for update testing
  game.currentBoss.active = true;
  game.player.x = 3600;

  // Phase 1 Attack
  game.currentBoss.attackTimer = 101;
  game.currentBoss.projectiles = [];
  game.currentBoss.update(game.player, game);
  testAssert(game.currentBoss.projectiles.some(p => p.type === 'star_orb'), 'Astral Guardian Phase 1 fires star_orb');

  // Simulate Phase Escalation to Phase 2
  game.currentBoss.takeDamage(game);
  testAssert(game.currentBoss.hp === 2 && game.currentBoss.phase === 2, 'Astral Guardian escalates to Phase 2 on damage');
  game.currentBoss.active = true;
  game.currentBoss.stunTimer = 0;
  game.currentBoss.invincTimer = 0;
  game.currentBoss.attackTimer = 101;
  game.currentBoss.projectiles = [];
  game.currentBoss.update(game.player, game);
  testAssert(game.currentBoss.projectiles.some(p => p.type === 'astral_laser'), 'Astral Guardian Phase 2 fires twin astral_laser');

  // Simulate Phase Escalation to Phase 3
  game.currentBoss.takeDamage(game);
  testAssert(game.currentBoss.hp === 1 && game.currentBoss.phase === 3, 'Astral Guardian escalates to Phase 3 on damage');
  game.currentBoss.active = true;
  game.currentBoss.stunTimer = 0;
  game.currentBoss.invincTimer = 0;
  game.currentBoss.attackTimer = 101;
  game.currentBoss.projectiles = [];
  game.currentBoss.update(game.player, game);
  testAssert(game.currentBoss.projectiles.some(p => p.type === 'astral_nova'), 'Astral Guardian Phase 3 fires astral_nova burst');

  // ─────────────────────────────────────────────────────────
  // SECTION 3: BOSS RUSH ARENA MODE (F2.1 - F2.5) STRESS TESTS
  // ─────────────────────────────────────────────────────────
  console.log('\n--- 3. Boss Rush Arena Mode (F2.1 - F2.5) Stress Testing ---');

  const br = new context.PlatformerGame();
  br.startBossRush('candela');

  testAssert(br.state === 'BOSS_RUSH', 'startBossRush enters BOSS_RUSH state');
  testAssert(br.bossRushPlayerHp === 3 && br.bossRushMaxHp === 3, 'Player starts with 3/3 HP');
  testAssert(br.bossRushIdx === 0, 'Starts at Boss Index 0 (Acornus)');
  testAssert(br.levelWidth === 600, 'Boss Rush arena is 600px wide');

  // Test 3.1: Full 9-Boss Sequential Progression
  for (let b = 0; b < 9; b++) {
    const expectedBoss = context.BOSS_RUSH_ROSTER[b];
    testAssert(br.currentBoss.bossKey === expectedBoss.bossKey, `Boss Rush Stage ${b + 1}/9 spawns ${expectedBoss.name} (${expectedBoss.bossKey})`);
    testAssert(br.currentBoss.hp === 3, `Boss ${b + 1} spawns with full 3 HP`);
    
    if (b < 8) {
      br.nextBossRushStage();
      testAssert(br.bossRushIdx === b + 1, `Advances cleanly to Stage index ${b + 1}`);
    }
  }

  // Defeat finale boss
  br.nextBossRushStage();
  testAssert(br.state === 'BOSS_RUSH_VICTORY', 'Defeating 9th boss triggers BOSS_RUSH_VICTORY state');

  // Test 3.2: Ranking Threshold Exact Boundaries
  const rankingTests = [
    { timeMs: 209999, hp: 3, expectedRank: 'S', desc: 'Time < 3:30, HP = 3 -> Rank S' },
    { timeMs: 209999, hp: 2, expectedRank: 'S', desc: 'Time < 3:30, HP = 2 -> Rank S' },
    { timeMs: 209999, hp: 1, expectedRank: 'A', desc: 'Time < 3:30, HP = 1 -> Rank A (HP requirement not met)' },
    { timeMs: 210000, hp: 3, expectedRank: 'A', desc: 'Time == 3:30 (210000ms), HP = 3 -> Rank A' },
    { timeMs: 299999, hp: 3, expectedRank: 'A', desc: 'Time == 4:59.999 (299999ms) -> Rank A' },
    { timeMs: 300000, hp: 3, expectedRank: 'B', desc: 'Time == 5:00.000 (300000ms) -> Rank B' },
    { timeMs: 449999, hp: 3, expectedRank: 'B', desc: 'Time == 7:29.999 (449999ms) -> Rank B' },
    { timeMs: 450000, hp: 3, expectedRank: 'C', desc: 'Time == 7:30.000 (450000ms) -> Rank C' },
    { timeMs: 900000, hp: 3, expectedRank: 'C', desc: 'Time == 15:00.000 (900000ms) -> Rank C' },
  ];

  rankingTests.forEach(rt => {
    const g = new context.PlatformerGame();
    g.startBossRush('candela');
    g.bossRushElapsedTime = rt.timeMs;
    g.bossRushPlayerHp = rt.hp;
    g.handleBossRushVictory();
    testAssert(g.bossRushRank === rt.expectedRank, `Ranking Boundary: ${rt.desc} -> got ${g.bossRushRank}`);
  });

  // Test 3.3: Health Carryover, Invincibility, and GameOver Trigger
  const dmgGame = new context.PlatformerGame();
  dmgGame.startBossRush('candela');
  testAssert(dmgGame.bossRushPlayerHp === 3, 'Starts with 3 HP');

  // Take damage
  dmgGame.handleBossRushDamage();
  testAssert(dmgGame.bossRushPlayerHp === 2, 'HP reduced to 2');
  testAssert(dmgGame.invincibleTimer === 90, 'Invincibility timer set to 90 frames');

  // Take damage while invincible
  dmgGame.handleBossRushDamage();
  testAssert(dmgGame.bossRushPlayerHp === 2, 'No damage taken while invincibility active');

  // Expire invincibility and take fatal damage
  dmgGame.invincibleTimer = 0;
  dmgGame.handleBossRushDamage(); // HP = 1
  testAssert(dmgGame.bossRushPlayerHp === 1, 'HP reduced to 1');
  dmgGame.invincibleTimer = 0;
  dmgGame.handleBossRushDamage(); // HP = 0
  testAssert(dmgGame.bossRushPlayerHp === 0 && dmgGame.state === 'BOSS_RUSH_GAMEOVER', 'Depleting HP transitions to BOSS_RUSH_GAMEOVER');

  // Test 3.4: LocalStorage Corrupted Data Resilience
  env.localStorage.setItem('srpw_bossrush_record', 'INVALID_JSON_CORRUPTED');
  env.localStorage.setItem('srpw_save_data', '{corrupted}');

  const safeGame = new context.PlatformerGame();
  safeGame.startBossRush('candela');
  safeGame.bossRushElapsedTime = 180000;
  safeGame.bossRushPlayerHp = 3;

  let noCrashOnSave = true;
  try {
    safeGame.handleBossRushVictory();
  } catch (e) {
    noCrashOnSave = false;
    console.error('Crash during corrupted record handling:', e);
  }
  testAssert(noCrashOnSave, 'handleBossRushVictory safely handles corrupted localStorage without crashing');

  // Clean save test
  env.localStorage.clear();
  safeGame.handleBossRushVictory();
  const savedRec = JSON.parse(env.localStorage.getItem('srpw_bossrush_record'));
  testAssert(savedRec && savedRec.bestRank === 'S', 'Clean localStorage successfully persists new record');

  // Test 3.5: Arena Confinement
  const arenaGame = new context.PlatformerGame();
  arenaGame.startBossRush('candela');
  arenaGame.player.x = 20; // try to escape left
  arenaGame.player.vx = -5;
  arenaGame.update(1000);
  testAssert(arenaGame.player.x >= 100, `Player constrained to arena left wall x>=100 (actual: ${arenaGame.player.x})`);

  arenaGame.player.x = 550; // try to escape right
  arenaGame.player.vx = 5;
  arenaGame.update(1000);
  testAssert(arenaGame.player.x + arenaGame.player.w <= 500, `Player constrained to arena right wall x+w<=500 (actual: ${arenaGame.player.x + arenaGame.player.w})`);

  // ─────────────────────────────────────────────────────────
  // SECTION 4: BOUTIQUE & COSMETICS ADVERSARIAL TESTS
  // ─────────────────────────────────────────────────────────
  console.log('\n--- 4. Royal Boutique & Cosmetics Catalog Stress Testing ---');

  const bGame = new context.PlatformerGame();
  testAssert(bGame.unlockedHats.includes('crown') && bGame.unlockedHats.includes('none'), 'Initial unlocked hats includes crown and none');

  // Purchase attempts
  bGame.starDust = 100;
  testAssert(bGame.purchaseAccessory('non_existent_item') === false, 'Invalid hat ID rejected');
  testAssert(bGame.purchaseAccessory('pharaoh_cape') === false, 'Expensive item rejected when unaffordable');
  testAssert(bGame.starDust === 100, 'Star Dust wallet unchanged on failed purchase');

  testAssert(bGame.purchaseAccessory('cape') === true, 'Hero Cape (80 dust) successfully bought');
  testAssert(bGame.starDust === 20, 'Star Dust wallet correctly deducted (100 - 80 = 20)');
  testAssert(bGame.unlockedHats.includes('cape'), 'Hero Cape added to inventory');
  testAssert(bGame.selectedHat === 'cape', 'Hero Cape auto-equipped');

  // Re-equipping owned item
  testAssert(bGame.purchaseAccessory('crown') === true, 'Equipping owned crown returns true');
  testAssert(bGame.starDust === 20, 'Star Dust wallet not deducted when equipping owned crown');
  testAssert(bGame.selectedHat === 'crown', 'Crown equipped');

  // ─────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────
  console.log('\n====================================================');
  console.log(`  ADVERSARIAL AUDIT SUMMARY: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialAudit().catch(err => {
  console.error('Fatal error in adversarial audit:', err);
  process.exit(1);
});
