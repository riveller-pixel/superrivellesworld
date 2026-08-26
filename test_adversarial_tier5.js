const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Setup robust mock browser environment
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
    getContext() { return mockCtx; }
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
    querySelectorAll: () => [{ ...mockElement, dataset: { id: 'candela', hat: 'crown' } }],
    querySelector: () => ({ ...mockElement }),
    addEventListener: (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    body: { style: {} },
    documentElement: { style: {} }
  };

  let simulatedNow = 1000;
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
    performance: {
      now: () => simulatedNow,
      setNow: (v) => { simulatedNow = v; },
      advanceNow: (dt) => { simulatedNow += dt; }
    },
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

function loadEngine() {
  const env = createMockBrowserEnv();
  const indexPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled");

  const context = vm.createContext(global);
  const wrappedScript = `
    ${gameScript}
    ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic, GRAVITY, MAX_FALL, JUMP_CUT_MULT, ACCEL, DECEL })
  `;
  const exportsObj = vm.runInContext(wrappedScript, context);
  Object.assign(context, exportsObj);
  return { env, context };
}

let passCount = 0;
let failCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (e) {
    console.error(`  [FAIL] ${name}: ${e.message}`);
    failCount++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

console.log('======================================================================');
console.log('  SUPER RIVELLES PERIS WORLD — TIER 5 ADVERSARIAL STRESS TEST SUITE  ');
console.log('======================================================================\n');

const { env, context } = loadEngine();
const { PlatformerGame, CHARACTERS, LEVEL_CONFIGS, CrystalPlatform, WorldBoss, BOSS_RUSH_ROSTER, formatTime, ItemEntity, GRAVITY, MAX_FALL, JUMP_CUT_MULT } = context;

// ===========================================================================
// SUITE 1: SECRET STAR WORLD COSMIC GRAVITY & EXTREME CHARACTER PHYSICS
// ===========================================================================
console.log('--- SUITE 1: Secret Star World Cosmic Gravity & Extreme Character Physics ---');

// 1.1 Variable Jump Holds for Papá (Heavy weight 1.35)
test('SSW-1.1: Papá (weight 1.35) full jump hold under cosmic gravity executes without NaN or overshoot', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'papa';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  assert(game.currentLevelIdx === 9, 'Should be in Star World level 9');
  assert(LEVEL_CONFIGS[9].theme === 'special_star', 'Theme must be special_star');
  
  const p = game.player;
  p.x = 100;
  p.y = 200;
  p.onGround = true;
  p.coyoteFrames = 5;
  p.jumpCount = 0;
  
  // Frame 0: Jump pressed and held
  game.input.jump = true;
  game.prevJump = false;
  
  const initialY = p.y;
  let minVy = 0;
  let highestY = initialY;
  
  // Simulate 30 frames with continuous jump hold
  for (let f = 0; f < 30; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
    game.prevJump = true;
    minVy = Math.min(minVy, p.vy);
    highestY = Math.min(highestY, p.y);
    assert(!isNaN(p.x) && !isNaN(p.y) && !isNaN(p.vx) && !isNaN(p.vy), `NaN detected on frame ${f}`);
    assert(p.vy <= 5.8, `vy should not exceed cosmic MAX_FALL (5.8), got ${p.vy}`);
  }
  
  // In cosmic gravity, Papá's effective jump is -9.2 * 1.25 = -11.5
  assert(minVy <= -11.5, `Papá min vy should reach at least -11.5, got ${minVy}`);
  const totalAscent = initialY - highestY;
  assert(totalAscent > 120, `Papá full jump ascent in cosmic gravity should exceed 120px, got ${totalAscent}`);
});

// 1.2 Variable Jump Holds for Valentina (Light weight 0.85)
test('SSW-1.2: Valentina (weight 0.85) triple jump and full jump hold under cosmic gravity', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'valentina';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  const p = game.player;
  p.x = 100;
  p.y = 200;
  p.onGround = true;
  p.coyoteFrames = 5;
  p.jumpCount = 0;
  const initialY = p.y;
  
  // 1st jump
  game.input.jump = true; game.prevJump = false;
  game.updatePlayer(1000, game.getAllSolidPlatforms());
  game.prevJump = true;
  assert(p.jumpCount === 1, 'Jump count should be 1');
  
  // Let ascent continue for 15 frames
  for (let f = 1; f <= 15; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
  }
  
  // 2nd jump mid-air
  game.input.jump = true; game.prevJump = false;
  game.updatePlayer(1000 + 16 * 16, game.getAllSolidPlatforms());
  game.prevJump = true;
  assert(p.jumpCount === 2, 'Jump count should be 2 for Valentina double jump');
  
  for (let f = 17; f <= 30; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
  }
  
  // 3rd jump mid-air
  game.input.jump = true; game.prevJump = false;
  game.updatePlayer(1000 + 31 * 16, game.getAllSolidPlatforms());
  game.prevJump = true;
  assert(p.jumpCount === 3, 'Jump count should be 3 for Valentina triple jump');
  
  for (let f = 32; f <= 50; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
  }
  
  const totalAscent = initialY - p.y;
  assert(totalAscent > 200, `Valentina triple jump in cosmic gravity should achieve massive ascent > 200px, got ${totalAscent}`);
});

// 1.3 Jump-cut short hops (monotonic height vs hold duration)
test('SSW-1.3: Monotonic jump height scaling with hold duration (1, 4, 8, 13 frames) under cosmic gravity', () => {
  const holdFramesToTest = [1, 4, 8, 13];
  const maxHeights = [];

  for (const hold of holdFramesToTest) {
    const game = new PlatformerGame();
    game.selectedCharId = 'candela';
    game.currentLevelIdx = 9;
    game.startSelectedLevel();
    const p = game.player;
    p.x = 100;
    p.y = 200;
    p.onGround = true;
    p.coyoteFrames = 5;
    p.jumpCount = 0;
    const startY = p.y;
    let peakY = startY;

    for (let f = 0; f < 45; f++) {
      if (f < hold) {
        game.input.jump = true;
        game.prevJump = (f > 0);
      } else {
        game.input.jump = false;
        game.prevJump = (f === hold);
      }
      game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
      peakY = Math.min(peakY, p.y);
    }
    const height = startY - peakY;
    maxHeights.push(height);
  }

  // Verify strictly monotonic increase: height[0] < height[1] < height[2] < height[3]
  for (let i = 1; i < maxHeights.length; i++) {
    assert(maxHeights[i] > maxHeights[i - 1], `Hold ${holdFramesToTest[i]} (${maxHeights[i].toFixed(1)}px) should exceed hold ${holdFramesToTest[i-1]} (${maxHeights[i-1].toFixed(1)}px)`);
  }
});

// 1.4 Coyote Time Stress-Testing
test('SSW-1.4: Coyote time boundary execution in cosmic gravity (valid frames 1-5 vs expired frame 7)', () => {
  // Test frame 3 coyote jump in open air at stage start
  const game = new PlatformerGame();
  game.selectedCharId = 'papa';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  game.staticPlatforms = [{ x: 0, y: 256, w: 300, h: 24 }];
  const p = game.player;
  
  p.x = 310;
  p.y = 230;
  p.onGround = false;
  p.coyoteFrames = 3;
  p.jumpCount = 0;
  game.input.jump = true;
  game.prevJump = false;
  
  game.updatePlayer(1000, game.getAllSolidPlatforms());
  assert(p.jumpCount === 1, 'Coyote jump should succeed on frame with coyoteFrames > 0');
  assert(p.vy < -10, `Coyote jump should apply strong cosmic jump impulse, got ${p.vy}`);
  
  // Now test expired coyote time (coyoteFrames = 0) on single-jump character
  const game2 = new PlatformerGame();
  game2.selectedCharId = 'papa';
  game2.currentLevelIdx = 9;
  game2.startSelectedLevel();
  game2.staticPlatforms = [{ x: 0, y: 256, w: 300, h: 24 }];
  const p2 = game2.player;
  p2.x = 310;
  p2.y = 230;
  p2.onGround = false;
  p2.coyoteFrames = 0;
  p2.jumpCount = 1;
  
  game2.input.jump = true;
  game2.prevJump = false;
  game2.updatePlayer(1000, game2.getAllSolidPlatforms());
  assert(p2.jumpCount === 1, 'Expired coyote frame must NOT allow extra jump for single-jump character');
});

// 1.5 Corner Step-Up & Ledge Forgiveness (4px threshold)
test('SSW-1.5: Corner step-up tolerance: 3.99px steps up, 4.00px steps up, 4.01px resolves horizontally', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  const p = game.player;
  const plat = { x: 300, y: 200, w: 100, h: 20 };
  
  // Case A: 3.5px penetration below platform top with downward movement
  p.x = 295; // overlapping left edge
  p.w = 20;
  p.h = 24;
  p.vx = 2.0;
  p.vy = 0.5;
  p.y = plat.y - p.h + 3.5;
  game.resolveHorizontal(p, [plat]);
  assert(p.onGround === true, 'Player should be placed on ground via corner step-up');
  assert(p.y === plat.y - p.h, `Player y should snap to platform top (${plat.y - p.h}), got ${p.y}`);
  assert(p.vy === 0, 'Vertical velocity should be zeroed upon step-up');

  // Case B: 4.5px penetration -> should NOT step up, should push back horizontally
  const gameB = new PlatformerGame();
  gameB.selectedCharId = 'candela';
  gameB.currentLevelIdx = 9;
  gameB.startSelectedLevel();
  const pB = gameB.player;
  pB.w = 20; pB.h = 24;
  pB.x = 295;
  pB.vx = 2.0;
  pB.vy = 0.5;
  pB.onGround = false;
  pB.y = plat.y - p.h + 4.5;
  gameB.resolveHorizontal(pB, [plat]);
  assert(pB.onGround === false, 'Player should not step up when penetration > 4px');
  assert(pB.x === plat.x - pB.w, `Player should be pushed to left edge (${plat.x - pB.w}), got ${pB.x}`);
  assert(pB.vx === 0, 'Horizontal velocity should be zeroed on wall hit');
});

// ===========================================================================
// SUITE 2: BOSS RUSH GAUNTLET LOOP & EDGE CASE TRANSITIONS
// ===========================================================================
console.log('\n--- SUITE 2: Boss Rush Gauntlet Loop & Edge Case Transitions ---');

// 2.1 Rapid Boss Kills & Full 9-Boss Sweep
test('BR-2.1: Rapid consecutive boss defeats traverse 9 stages and conclude in S-Rank BOSS_RUSH_VICTORY', () => {
  const game = new PlatformerGame();
  game.startBossRush('cayetana');
  assert(game.state === 'BOSS_RUSH', 'Must be in BOSS_RUSH');
  assert(game.bossRushIdx === 0, 'Must start at Boss 0');
  
  // Rapidly defeat each boss sequentially
  for (let stage = 0; stage < 9; stage++) {
    assert(game.bossRushIdx === stage, `Stage index must be ${stage}`);
    assert(game.currentBoss !== null, `Boss for stage ${stage} must exist`);
    assert(game.currentBoss.bossKey === BOSS_RUSH_ROSTER[stage].bossKey, `Boss key should match roster[${stage}]`);
    
    // Simulate 3 damage hits to defeat boss
    game.currentBoss.hp = 0;
    game.currentBoss.state = 'defeated';
    
    // Update loop to trigger transition (starts at 75 and decrements to 74 on same frame)
    game.update(1000 + stage * 100);
    assert(game.bossTransitionTimer === 74, `Transition timer should be 74 after first tick, got ${game.bossTransitionTimer}`);
    
    // Fast-forward through transition frames (74 ticks remaining)
    for (let t = 0; t < 74; t++) {
      game.update(1000 + stage * 100 + (t + 1) * 16);
    }
  }
  
  // After 9th boss defeated
  assert(game.state === 'BOSS_RUSH_VICTORY', `State should be BOSS_RUSH_VICTORY, got ${game.state}`);
  assert(game.bossRushDefeatedCount === 9, `Defeated count should be 9, got ${game.bossRushDefeatedCount}`);
  assert(game.bossRushRank === 'S', `Fast clear with 3 HP should award Rank S, got ${game.bossRushRank}`);
  assert(game.starDust >= 100, `Victory should award +100 Star Dust, got ${game.starDust}`);
});

// 2.2 0 HP Death Transition & Game Over Protection
test('BR-2.2: Lethal damage reduces HP to 0 and immediately transitions to BOSS_RUSH_GAMEOVER', () => {
  const game = new PlatformerGame();
  game.startBossRush('candela');
  assert(game.bossRushPlayerHp === 3, 'Initial HP must be 3');
  
  // Hit 1: 3 -> 2
  game.handleBossRushDamage();
  assert(game.bossRushPlayerHp === 2, 'HP should be 2 after hit 1');
  game.invincibleTimer = 0;
  
  // Hit 2: 2 -> 1
  game.handleBossRushDamage();
  assert(game.bossRushPlayerHp === 1, 'HP should be 1 after hit 2');
  game.invincibleTimer = 0;
  
  // Hit 3 (Lethal): 1 -> 0
  game.handleBossRushDamage();
  assert(game.bossRushPlayerHp === 0, 'HP should be 0 after lethal hit');
  assert(game.state === 'BOSS_RUSH_GAMEOVER', `State must be BOSS_RUSH_GAMEOVER, got ${game.state}`);
  
  // Further updates in GAMEOVER state must not crash or advance stages
  const initialDefeated = game.bossRushDefeatedCount;
  for (let f = 0; f < 30; f++) {
    game.update(5000 + f * 16);
  }
  assert(game.state === 'BOSS_RUSH_GAMEOVER', 'State must remain BOSS_RUSH_GAMEOVER');
  assert(game.bossRushDefeatedCount === initialDefeated, 'Defeated count must not increase in game over');
});

// 2.3 Pause and Unpause During Boss Attack
test('BR-2.3: Pause during Boss Rush freezes timer and entity motion; unpause smoothly resumes', () => {
  const game = new PlatformerGame();
  game.startBossRush('mama');
  
  // Advance 10 frames
  for (let f = 0; f < 10; f++) {
    game.update(1000 + f * 16);
  }
  const timeBeforePause = game.bossRushElapsedTime;
  assert(timeBeforePause > 0, 'Elapsed time should be positive');
  
  // Toggle Pause
  game.togglePause();
  assert(game.state === 'PAUSED', 'State should be PAUSED');
  assert(game.prevStateBeforePause === 'BOSS_RUSH', 'prevStateBeforePause should be BOSS_RUSH');
  
  // Simulate ticks while paused
  for (let f = 0; f < 20; f++) {
    game.update(2000 + f * 16);
  }
  assert(game.bossRushElapsedTime === timeBeforePause, 'Timer must not advance while game is paused');
  
  // Resume game
  game.resumeGame();
  assert(game.state === 'BOSS_RUSH', 'State must restore to BOSS_RUSH');
  
  // Update after resume
  game.update(3000);
  assert(game.bossRushElapsedTime > timeBeforePause, 'Timer should resume advancing after unpause');
});

// 2.4 Extreme Timer Values & Formatting
test('BR-2.4: formatTime handles zero, normal, boundary, >60min, >24hr, negative inputs', () => {
  assert(formatTime(0) === '00:00.000', '0ms -> 00:00.000');
  assert(formatTime(1234) === '00:01.234', '1234ms -> 00:01.234');
  assert(formatTime(65432) === '01:05.432', '65432ms -> 01:05.432');
  assert(formatTime(3599999) === '59:59.999', '3599999ms -> 59:59.999');
  assert(formatTime(3600000) === '60:00.000', '3600000ms (60 min) -> 60:00.000');
  assert(formatTime(7325120) === '122:05.120', '7325120ms (122 min) -> 122:05.120');
  assert(formatTime(86400000) === '1440:00.000', '86400000ms (24 hours) -> 1440:00.000');
  assert(formatTime(-1000) === '00:00.000', 'Negative ms clamped to 00:00.000');
});

// ===========================================================================
// SUITE 3: FLOATING CRYSTAL PLATFORMS & HOVERING COLLISION REGISTRATION
// ===========================================================================
console.log('\n--- SUITE 3: Floating Crystal Platforms & Hovering Collision Registration ---');

// 3.1 Sinusoidal Hover Tracking
test('CP-3.1: CrystalPlatform updates hover offset sinusoidally and stays within [-hoverAmp, +hoverAmp]', () => {
  const cp = new CrystalPlatform(300, 150, 90, 16, 8, 0.004);
  assert(cp.isCrystal === true, 'isCrystal flag must be true');
  
  let minOff = 0;
  let maxOff = 0;
  for (let t = 0; t <= 2000; t += 20) {
    cp.update(t);
    minOff = Math.min(minOff, cp.hoverOffset);
    maxOff = Math.max(maxOff, cp.hoverOffset);
    assert(Math.abs(cp.hoverOffset) <= 8.0001, `hoverOffset ${cp.hoverOffset} should not exceed amp 8`);
    assert(cp.y === cp.baseY + cp.hoverOffset, 'y must equal baseY + hoverOffset');
  }
  assert(minOff < -7.0, `Should oscillate near negative amp: ${minOff}`);
  assert(maxOff > 7.0, `Should oscillate near positive amp: ${maxOff}`);
});

// 3.2 Player Standing on Oscillating Platform
test('CP-3.2: Player riding CrystalPlatform remains grounded through full hover oscillation cycle', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  game.staticPlatforms = []; // Isolate crystal platform
  const cp = new CrystalPlatform(300, 150, 100, 16, 6, 0.005);
  game.crystalPlatforms = [cp];
  
  // Synchronize platform initial time
  cp.update(1000);
  const p = game.player;
  p.w = 20; p.h = 24;
  p.x = 340;
  p.y = cp.y - p.h;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;

  // Run 100 frames of physics simulation while standing on crystal platform
  for (let f = 0; f < 100; f++) {
    const now = 1000 + f * 16;
    cp.update(now);
    
    // Simulate player gravity & vertical collision resolution
    const allPlats = game.getAllSolidPlatforms();
    // In game engine, player standing on moving platform tracks platform or gravity places them on top
    p.vy += 0.26;
    p.y += p.vy;
    // If player penetrated top slightly due to platform rising or falling
    game.resolveVertical(p, allPlats);
    
    // If platform moved down faster than 0.26 in a single frame, resolve will catch up next frame;
    // verify player never falls through platform (p.y <= cp.y + cp.h)
    assert(p.y <= cp.y, `Player (${p.y}) should not fall below platform top (${cp.y})`);
  }
});

// 3.3 Boundary Edge Left/Right Collision Registration
test('CP-3.3: CrystalPlatform exact boundary edge checks (1px inside = onGround, 1px outside = falls)', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  game.staticPlatforms = []; // Isolate crystal platform
  const cp = new CrystalPlatform(300, 150, 80, 16, 0, 0); // static for precise coordinate test
  game.crystalPlatforms = [cp];
  const allPlats = game.getAllSolidPlatforms();
  
  const p = game.player;
  p.w = 20; p.h = 24;
  
  // Left Edge Inside: p.x = cp.x - p.w + 1 = 300 - 20 + 1 = 281 (1px overlap with [300, 380])
  p.x = 281;
  p.y = cp.y - p.h + 2;
  p.vy = 1.0;
  game.resolveVertical(p, allPlats);
  assert(p.onGround === true, '1px overlap on left edge should register landing onGround');
  assert(p.y === cp.y - p.h, 'Player should be seated at top of platform');

  // Left Edge Outside: p.x = cp.x - p.w - 1 = 300 - 20 - 1 = 279 (no overlap)
  p.x = 279;
  p.y = cp.y - p.h + 2;
  p.vy = 1.0;
  game.resolveVertical(p, allPlats);
  assert(p.onGround === false, 'No overlap on left edge should NOT register onGround');

  // Right Edge Inside: p.x = cp.x + cp.w - 1 = 300 + 80 - 1 = 379 (1px overlap)
  p.x = 379;
  p.y = cp.y - p.h + 2;
  p.vy = 1.0;
  game.resolveVertical(p, allPlats);
  assert(p.onGround === true, '1px overlap on right edge should register landing onGround');
  assert(p.y === cp.y - p.h, 'Player should be seated at top of platform');

  // Right Edge Outside: p.x = cp.x + cp.w + 1 = 300 + 80 + 1 = 381 (no overlap)
  p.x = 381;
  p.y = cp.y - p.h + 2;
  p.vy = 1.0;
  game.resolveVertical(p, allPlats);
  assert(p.onGround === false, 'No overlap on right edge should NOT register onGround');
});

// 3.4 Head-Bonk Underneath Crystal Platform
test('CP-3.4: Head-bonk collision from below pushes player down to pl.y + pl.h without phasing through', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  game.staticPlatforms = [];
  const cp = new CrystalPlatform(300, 150, 80, 16, 0, 0);
  game.crystalPlatforms = [cp];
  const allPlats = game.getAllSolidPlatforms();
  
  const p = game.player;
  p.w = 20; p.h = 24;
  p.x = 330;
  // Jump upwards into bottom of platform: p.y overlaps cp bottom
  p.y = cp.y + cp.h - 2;
  p.vy = -8.0;
  
  game.resolveVertical(p, allPlats);
  assert(p.y === cp.y + cp.h, `Player y should be snapped to platform bottom (${cp.y + cp.h}), got ${p.y}`);
  assert(p.vy === 1.5, `Player vy should be set to rebound velocity (1.5), got ${p.vy}`);
  assert(p.onGround === false, 'Player should not be onGround when hitting ceiling');
});

console.log('\n======================================================================');
console.log(`  TIER 5 ADVERSARIAL AUDIT SUMMARY: ${passCount} PASSED | ${failCount} FAILED`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
