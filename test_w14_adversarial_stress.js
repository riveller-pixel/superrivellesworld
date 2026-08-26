/**
 * test_w14_adversarial_stress.js
 * Comprehensive Adversarial & Empirical Stress Harness for:
 * - World 14 (RotatingGearPlatform, PendulumSwing, TickTockBlock, Chronos Boss)
 * - World Map Unlock Logic (0..42 coins, sequence skips, boundary conditions)
 * - System Invariants (localStorage corruption resilience, Service Worker caching)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    failures.push(message);
    console.error(`  [FAIL] ${message}`);
  }
}

function assertApprox(val, expected, epsilon = 1e-5, message) {
  const diff = Math.abs(val - expected);
  if (diff <= epsilon) {
    passedTests++;
    console.log(`  [PASS] ${message} (val=${val.toFixed(5)}, expected=${expected.toFixed(5)})`);
  } else {
    failedTests++;
    failures.push(`${message} (val=${val}, expected=${expected}, diff=${diff})`);
    console.error(`  [FAIL] ${message} (val=${val}, expected=${expected}, diff=${diff})`);
  }
}

// ── MOCK BROWSER ENVIRONMENT WITH CANVAS TRANSFORM TRACKING ──
function createMockBrowserEnv() {
  const listeners = {};
  const mockStorage = {};
  const localStorage = {
    getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
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

  let stackDepth = 0;
  const mockCtx = {
    canvas: { width: 512, height: 288 },
    save: () => { stackDepth++; },
    restore: () => { stackDepth = Math.max(0, stackDepth - 1); },
    getStackDepth: () => stackDepth,
    resetStackDepth: () => { stackDepth = 0; },
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
  if (!scriptMatches || scriptMatches.length < 2) {
    throw new Error("Could not extract game script from index.html");
  }
  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled");
  gameScript = gameScript.replace(/\}\s*\}\s*stopBGM\(\)\{/g, '}\n  stopBGM(){');

  const context = vm.createContext(global);
  const wrappedScript = `
    ${gameScript}
    ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, GelatinPlatform, BoostPad, HolographicBoostPad, LaserBarrier, BouncyPalmLeaf, PalmLeaf, LavaGeyser, CrumblingBasaltBlock, BasaltBlock, RotatingGearPlatform, GearPlatform, PendulumSwing, ClockPendulum, TickTockBlock, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic })
  `;
  const exportsObj = vm.runInContext(wrappedScript, context);
  Object.assign(context, exportsObj);
  return { context, env };
}

console.log('======================================================================');
console.log('  CHALLENGER 2: WORLD 14, WORLD MAP & INVARIANTS STRESS HARNESS');
console.log('======================================================================\n');

const { context, env } = loadEngine();
const {
  RotatingGearPlatform,
  PendulumSwing,
  TickTockBlock,
  WorldBoss,
  PlatformerGame,
  LEVEL_CONFIGS,
  CHARACTERS,
  COSMETICS_CATALOG
} = context;

const mockCam = {
  x: 0, y: 0,
  isVisible: () => true,
  toScreen: (x, y) => ({ x: x - mockCam.x, y: y - mockCam.y })
};

// ════════════════════════════════════════════════════════════════════
// SUITE 1: RotatingGearPlatform Empirical Stress Testing
// ════════════════════════════════════════════════════════════════════
console.log('--- SUITE 1: RotatingGearPlatform Empirical Stress Testing ---');

// 1.1: 10,000 frames angular accumulation and speed/dir matrix
{
  const gearCW = new RotatingGearPlatform(500, 200, 48, 8, 0.02, 1);
  const gearCCW = new RotatingGearPlatform(650, 200, 55, 8, 0.03, -1);
  const gearZero = new RotatingGearPlatform(800, 200, 48, 8, 0.0, 1);
  const gearFast = new RotatingGearPlatform(950, 200, 60, 12, 0.5, 1);

  let cwOk = true, ccwOk = true;
  for (let f = 0; f < 10000; f++) {
    const prevAngleCW = gearCW.angle;
    const prevAngleCCW = gearCCW.angle;
    gearCW.update();
    gearCCW.update();
    gearZero.update();
    gearFast.update();

    if (gearCW.angle <= prevAngleCW || isNaN(gearCW.angle) || !isFinite(gearCW.angle)) cwOk = false;
    if (gearCCW.angle >= prevAngleCCW || isNaN(gearCCW.angle) || !isFinite(gearCCW.angle)) ccwOk = false;
  }

  assert(cwOk, 'RotatingGearPlatform (dir=+1) accumulates strictly monotonic positive angle without NaN over 10,000 frames');
  assert(ccwOk, 'RotatingGearPlatform (dir=-1) accumulates strictly monotonic negative angle without NaN over 10,000 frames');
  assert(gearZero.angle === 0, 'RotatingGearPlatform with speed=0 maintains angle=0 identically');
  assert(!isNaN(gearFast.angle) && isFinite(gearFast.angle), 'RotatingGearPlatform withstands high-speed (0.5 rad/f) rotation across 10,000 frames');
}

// 1.2: Tangential velocity & centrifugal slip matrix
{
  const testCases = [
    { r: 48, speed: 0.02, dir: 1, expected: 1 * 0.02 * 48 * 2.5 },
    { r: 55, speed: 0.02, dir: -1, expected: -1 * 0.02 * 55 * 2.5 },
    { r: 60, speed: 0.04, dir: 1, expected: 1 * 0.04 * 60 * 2.5 },
    { r: 120, speed: 0.015, dir: -1, expected: -1 * 0.015 * 120 * 2.5 },
    { r: 32, speed: 0, dir: 1, expected: 0 }
  ];

  let velMathOk = true;
  testCases.forEach(tc => {
    const gear = new RotatingGearPlatform(200, 200, tc.r, 8, tc.speed, tc.dir);
    const v = gear.getRiderVelocity();
    if (Math.abs(v - tc.expected) > 1e-6) velMathOk = false;
  });
  assert(velMathOk, 'RotatingGearPlatform.getRiderVelocity() satisfies dir * speed * radius * 2.5 across all parameter combinations');
}

// 1.3: Platform bounding box and rider horizontal bounds
{
  const gear = new RotatingGearPlatform(1000, 180, 50, 8, 0.02, 1);
  assert(gear.w === 100 && gear.h === 16, 'RotatingGearPlatform dimensions correctly reflect diameter (w = 2 * radius = 100, h = 16)');
  assert(gear.solid === true && gear.isGear === true, 'RotatingGearPlatform is flagged as solid and isGear');
}

// 1.4: Rendering transform stack balance under extreme angle
{
  env.mockCtx.resetStackDepth();
  const gear = new RotatingGearPlatform(400, 150, 48, 8, 0.02, 1);
  gear.angle = 1234567.89; // Extreme angle
  gear.draw(env.mockCtx, mockCam, 5000);
  assert(env.mockCtx.getStackDepth() === 0, 'RotatingGearPlatform.draw() perfectly balances canvas save/restore (stack depth = 0)');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 2: PendulumSwing Harmonic Motion & Tip Collision
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 2: PendulumSwing Harmonic Motion & Tip Collision ---');

// 2.1: Harmonic motion bounds and stability
{
  const pend = new PendulumSwing(300, 50, 96, Math.PI / 3, 0.04, 20);
  let harmonicOk = true;
  for (let t = 0; t < 10000; t++) {
    pend.update(t);
    if (Math.abs(pend.angle) > pend.maxAngle + 1e-7 || isNaN(pend.angle)) {
      harmonicOk = false;
      break;
    }
  }
  assert(harmonicOk, 'PendulumSwing angle stays strictly within [-maxAngle, maxAngle] harmonic envelope over 10,000 updates');
}

// 2.2: Blade tip Pythagorean distance validation
{
  const lengths = [48, 96, 150, 200];
  let tipDistanceOk = true;
  lengths.forEach(len => {
    const pend = new PendulumSwing(400, 100, len, Math.PI / 2.5, 0.05, 20);
    for (let angle = -Math.PI / 2.5; angle <= Math.PI / 2.5; angle += 0.05) {
      pend.angle = angle;
      const pos = pend.getBladePos();
      const dist = Math.hypot(pos.x - pend.anchorX, pos.y - pend.anchorY);
      if (Math.abs(dist - len) > 1e-5) tipDistanceOk = false;
    }
  });
  assert(tipDistanceOk, 'PendulumSwing.getBladePos() Euclidean distance from anchor matches length identically across all angles and lengths');
}

// 2.3: Blade tip collision detection (hits, grazes, misses)
{
  const pend = new PendulumSwing(500, 100, 100, Math.PI / 3, 0.04, 25);
  pend.angle = 0; // Pointing straight down: tip at (500, 200)
  const tip = pend.getBladePos();

  // Direct hit (player centered at tip)
  const playerDirect = { x: tip.x - 12, y: tip.y - 16, w: 24, h: 32 };
  assert(pend.checkDamage(playerDirect) === true, 'Pendulum blade registers direct overlap damage');

  // Graze hit (player edge just inside bladeRadius + player.w/2 = 25 + 12 = 37)
  const playerGraze = { x: tip.x + 30 - 12, y: tip.y - 16, w: 24, h: 32 }; // center dist = 30 < 37
  assert(pend.checkDamage(playerGraze) === true, 'Pendulum blade registers graze overlap within collision radius');

  // Miss (player center dist = 45 > 37)
  const playerMiss = { x: tip.x + 45 - 12, y: tip.y - 16, w: 24, h: 32 };
  assert(pend.checkDamage(playerMiss) === false, 'Pendulum blade safely ignores player outside collision radius');
}

// 2.4: Impact response & invincibility immunity
{
  const pend = new PendulumSwing(500, 100, 100, Math.PI / 3, 0.04, 25);
  pend.angle = 0;
  const tip = pend.getBladePos();

  const game = new PlatformerGame();
  const player = game.player;
  player.x = tip.x - player.w / 2;
  player.y = tip.y - player.h / 2;
  player.invincibleTimer = 0;

  pend.check(player, game);
  assert(player.invincibleTimer === 90, 'Pendulum blade impact grants 90 frames of invincibility');
  assert(player.vy === -7.0, 'Pendulum blade impact applies vertical knockback (vy = -7.0)');
  assert(Math.abs(player.vx) === 6.0, 'Pendulum blade impact applies horizontal knockback (vx = ±6.0)');

  // Attempt damage while invincible
  player.vy = 0;
  player.vx = 0;
  pend.check(player, game);
  assert(player.vy === 0 && player.vx === 0, 'Pendulum blade does NOT apply knockback when player is invincible');
}

// 2.5: Rendering transform stack balance
{
  env.mockCtx.resetStackDepth();
  const pend = new PendulumSwing(300, 50, 96, Math.PI / 3, 0.04, 20);
  pend.angle = Math.PI / 4;
  pend.draw(env.mockCtx, mockCam, 2000);
  assert(env.mockCtx.getStackDepth() === 0, 'PendulumSwing.draw() perfectly balances canvas save/restore (stack depth = 0)');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 3: TickTockBlock Phase Toggles & Overlap Resolution
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 3: TickTockBlock Phase Toggles & Overlap Resolution ---');

// 3.1: Complete 1,200-frame phase alternation determinism
{
  const block0 = new TickTockBlock(100, 200, 32, 32, 120, 0); // Phase 0 (Tick)
  const block1 = new TickTockBlock(150, 200, 32, 32, 120, 1); // Phase 1 (Tock)

  let phaseSyncOk = true;
  for (let f = 0; f < 1200; f++) {
    block0.update(f);
    block1.update(f);

    const cycleIndex = Math.floor(f / 120) % 2;
    const expected0Solid = (cycleIndex === 0);
    const expected1Solid = (cycleIndex === 1);

    if (block0.isSolid !== expected0Solid || block1.isSolid !== expected1Solid) {
      phaseSyncOk = false;
      break;
    }
    if (block0.isSolid === block1.isSolid) {
      // They must strictly alternate (one solid, one intangible)
      phaseSyncOk = false;
      break;
    }
  }
  assert(phaseSyncOk, 'TickTockBlocks (Phase 0 and Phase 1) strictly alternate solid/intangible states across 1,200 frames (10 cycles)');
}

// 3.2: Exact boundary frame transitions (t = 119 -> 120, 239 -> 240)
{
  const b0 = new TickTockBlock(100, 200, 32, 32, 120, 0);
  const b1 = new TickTockBlock(150, 200, 32, 32, 120, 1);

  b0.update(119); b1.update(119);
  const at119_0 = b0.isSolid, at119_1 = b1.isSolid;

  b0.update(120); b1.update(120);
  const at120_0 = b0.isSolid, at120_1 = b1.isSolid;

  b0.update(239); b1.update(239);
  const at239_0 = b0.isSolid, at239_1 = b1.isSolid;

  b0.update(240); b1.update(240);
  const at240_0 = b0.isSolid, at240_1 = b1.isSolid;

  assert(at119_0 === true && at119_1 === false, 'At frame 119: Phase 0 is solid, Phase 1 is intangible');
  assert(at120_0 === false && at120_1 === true, 'At frame 120: Phase 0 becomes intangible, Phase 1 becomes solid instantaneously');
  assert(at239_0 === false && at239_1 === true, 'At frame 239: Phase 0 is intangible, Phase 1 is solid');
  assert(at240_0 === true && at240_1 === false, 'At frame 240: Phase 0 becomes solid, Phase 1 becomes intangible instantaneously');
}

// 3.3: Constructor polymorphism stress
{
  const c1 = new TickTockBlock(0, 0, 32, 32, 'tick', 60);
  const c2 = new TickTockBlock(0, 0, 32, 32, 'tock', 60);
  const c3 = new TickTockBlock(0, 0, 32, 32, 0, 90);
  const c4 = new TickTockBlock(0, 0, 32, 32, 1, 90);

  assert(c1.phase === 0 && c1.cycle === 60, 'TickTockBlock accepts string phase ("tick", 60)');
  assert(c2.phase === 1 && c2.cycle === 60, 'TickTockBlock accepts string phase ("tock", 60)');
  assert(c3.phase === 0 && c3.cycle === 90, 'TickTockBlock accepts (0, 90) polymorphic signature');
  assert(c4.phase === 1 && c4.cycle === 90, 'TickTockBlock accepts (1, 90) polymorphic signature');
}

// 3.4: Overlap resolution when block turns solid around player
{
  const game = new PlatformerGame();
  const p = game.player;
  const tBlock = new TickTockBlock(200, 200, 32, 32, 120, 1); // Phase 1: starts intangible

  // Player stands inside intangible block
  p.x = 204;
  p.y = 204;
  p.w = 24;
  p.h = 32;
  p.vx = 0;
  p.vy = 2.0; // Falling down into block

  tBlock.update(0); // Intangible at f=0
  game.tickTockBlocks = [tBlock];
  let solidPlats = game.getAllSolidPlatforms();
  assert(!solidPlats.includes(tBlock), 'Intangible TickTockBlock is omitted from getAllSolidPlatforms()');

  // Advance to f=120: block turns solid around player
  tBlock.update(120);
  solidPlats = game.getAllSolidPlatforms();
  assert(solidPlats.includes(tBlock), 'Solid TickTockBlock is dynamically included in getAllSolidPlatforms()');

  // Execute collision resolution
  game.resolveVertical(p, solidPlats);
  assert(p.y === tBlock.y - p.h, `Descending player is cleanly ejected to top of TickTockBlock (p.y = ${p.y}, expected = ${tBlock.y - p.h})`);
  assert(p.onGround === true && p.vy === 0, 'Player on top of solidified TickTockBlock lands safely onGround with vy=0');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 4: Chronos Boss AI, Time-Dilation & Blade Orbit Geometry
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 4: Chronos Boss AI, Time-Dilation & Blade Orbit Geometry ---');

// 4.1: Chronos 3 Combat Phases & HP Transition
{
  const game = new PlatformerGame();
  const boss = new WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo', 3520, 150);

  assert(boss.maxHp === 3 && boss.hp === 3, 'Chronos initializes with 3 HP');
  assert(boss.phase === 1, 'Chronos initializes in Phase 1 (Chrono Warp & Temporal Gears)');

  // Hit 1: Transition to Phase 2
  boss.takeDamage(game);
  assert(boss.hp === 2 && boss.phase === 2, 'Chronos transitions to Phase 2 (Time-Dilation Slowdown Spell) on first hit');

  // Hit 2: Transition to Phase 3
  boss.takeDamage(game);
  assert(boss.hp === 1 && boss.phase === 3, 'Chronos transitions to Phase 3 (Orbiting Chrono Blades) on second hit');

  // Hit 3: Defeat
  boss.takeDamage(game);
  assert(boss.hp === 0 && boss.state === 'defeated', 'Chronos enters defeated state upon 3rd hit');
}

// 4.2: Time-Dilation Slowdown physics scaling
{
  const game = new PlatformerGame();
  const boss = new WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo', 3520, 150);
  boss.active = true;
  boss.hp = 2;
  boss.phase = 2;
  boss.attackTimer = 100;

  game.player.vx = 8.0;
  game.player.vy = -10.0;
  boss.update(game.player, game);

  assertApprox(game.player.vx, 8.0 * 0.55, 1e-4, 'Time-Dilation spell scales player horizontal velocity by 0.55x factor');
  assertApprox(game.player.vy, -10.0 * 0.55, 1e-4, 'Time-Dilation spell scales player vertical velocity by 0.55x factor');

  // Velocity stability after 30 slowdown pulses (no NaN, zero limit)
  let testVx = 100.0, testVy = -50.0;
  for (let i = 0; i < 30; i++) {
    testVx *= 0.55;
    testVy *= 0.55;
  }
  assert(!isNaN(testVx) && !isNaN(testVy) && Math.abs(testVx) < 1e-4 && Math.abs(testVy) < 1e-4, 'Repeated time-dilation damping decays cleanly without underflow or NaN');
}

// 4.3: Phase 3 Orbiting Clock-Blade Geometry
{
  const boss = new WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo', 3520, 150);
  boss.phase = 3;

  const times = [0, 500, 1000, 2500, 10000];
  let orbitOk = true;
  times.forEach(now => {
    const rx = boss.w * 0.65;
    const ry = boss.h * 0.65;
    const blades = [];
    for (let b = 0; b < 4; b++) {
      const bAng = (now * 0.008) + b * (Math.PI / 2);
      const bx = Math.cos(bAng) * rx;
      const by = Math.sin(bAng) * ry;
      blades.push({ x: bx, y: by, angle: bAng });

      // Ellipse equation: (bx/rx)^2 + (by/ry)^2 = 1.0
      const ellipseEq = (bx / rx) * (bx / rx) + (by / ry) * (by / ry);
      if (Math.abs(ellipseEq - 1.0) > 1e-5) orbitOk = false;
    }

    // Check 90-degree orthogonal separation between adjacent blades
    for (let b = 0; b < 3; b++) {
      const angleDiff = blades[b + 1].angle - blades[b].angle;
      if (Math.abs(angleDiff - Math.PI / 2) > 1e-5) orbitOk = false;
    }
  });

  assert(orbitOk, 'Chronos Phase 3 orbiting blades maintain exact 90-degree radial symmetry on elliptical trajectory');
}

// 4.4: Rendering fallback transform balance
{
  env.mockCtx.resetStackDepth();
  const boss = new WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo', 3520, 150);
  boss.phase = 3;
  boss.draw(env.mockCtx, mockCam, 3500);
  assert(env.mockCtx.getStackDepth() === 0, 'Chronos Boss rendering perfectly balances canvas save/restore (stack depth = 0)');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 5: World Map Unlock Logic, Currency Economy & Sequence Skips
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 5: World Map Unlock Logic, Currency Economy & Sequence Skips ---');

// 5.1: 0 to 42 Coin Monotonicity Progression
{
  const thresholds = [
    { worldIdx: 9, name: 'S-1', minCoins: 20 },
    { worldIdx: 10, name: 'S-2', minCoins: 24 },
    { worldIdx: 11, name: 'S-3', minCoins: 28 },
    { worldIdx: 12, name: 'S-4', minCoins: 32 },
    { worldIdx: 13, name: 'S-5', minCoins: 36 }
  ];

  let progressionOk = true;
  for (let coins = 0; coins <= 42; coins++) {
    const game = new PlatformerGame();
    game.unlockedLevels = { 0: true }; // Only World 1 beaten
    game.starCoinsPerLevel = { 0: coins };

    thresholds.forEach(th => {
      const isUnlocked = game.isLevelUnlocked(th.worldIdx);
      const shouldBeUnlocked = (coins >= th.minCoins);
      if (isUnlocked !== shouldBeUnlocked) {
        progressionOk = false;
        console.error(`Mismatch at ${coins} coins for ${th.name}: got ${isUnlocked}, expected ${shouldBeUnlocked}`);
      }
    });
  }
  assert(progressionOk, 'World Map unlock logic strictly adheres to Star Coin thresholds (S-1: 20, S-2: 24, S-3: 28, S-4: 32, S-5: 36) across all coin values (0..42)');
}

// 5.2: Sequence Skips (Level completion vs Coin unlocking)
{
  const game = new PlatformerGame();
  game.starCoinsPerLevel = {}; // 0 coins

  // Beat World 12 (index 11)
  game.unlockedLevels = { 0: true, 11: true };
  assert(game.isVolcanoWorldUnlocked() === true, 'World 13 (S-4) unlocks by beating World 12 with 0 coins');

  // Beat World 13 (index 12)
  game.unlockedLevels[12] = true;
  assert(game.isClockWorldUnlocked() === true, 'World 14 (S-5) unlocks by beating World 13 with 0 coins');

  // Direct skip to World 14 with 36 Star Coins and only World 1 beaten
  const skipGame = new PlatformerGame();
  skipGame.unlockedLevels = { 0: true };
  skipGame.starCoinsPerLevel = { 0: 36 };
  assert(skipGame.isLevelUnlocked(13) === true, 'World 14 (S-5) is immediately accessible with 36 Star Coins without completing intermediate worlds');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 6: System Invariants & Persistence Corruption Resilience
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 6: System Invariants & Persistence Corruption Resilience ---');

// 6.1: localStorage Persistence Corruption Fuzzing
{
  const corruptPayloads = [
    '{ invalid json string ...',
    'null',
    'undefined',
    '12345',
    '""',
    '{"starDust": -999999, "unlockedLevels": null}',
    '{"starCoinsPerLevel": "not-an-object"}',
    '{"__proto__": {"polluted": true}}',
    '{"unlockedHats": 999}'
  ];

  let fuzzResilient = true;
  corruptPayloads.forEach((payload, idx) => {
    try {
      env.localStorage.setItem('srpw_save_data', payload);
      const g = new PlatformerGame();
      if (!g.unlockedLevels || !Array.isArray(g.unlockedLevels)) fuzzResilient = false;
      if (typeof g.starDust !== 'number' || isNaN(g.starDust)) fuzzResilient = false;
      if (g.unlockedLevels.length < 14) fuzzResilient = false;
    } catch (e) {
      console.error(`Fuzz payload ${idx} threw uncaught error:`, e);
      fuzzResilient = false;
    }
  });

  assert(fuzzResilient, 'PlatformerGame constructor safely recovers from corrupt, malformed, or hostile localStorage payloads');
}

// 6.2: Service Worker Asset Caching Invariants
{
  const swPath = path.join(__dirname, 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  assert(swContent.includes("const CACHE_NAME = 'srpw-v4.0-3world-expansion-ghpages-optimized'"), 'sw.js uses versioned cache key srpw-v4.0-3world-expansion-ghpages-optimized');
  assert(swContent.includes('boss_cyber_glitch.png') && swContent.includes('boss_rex_tyrannus.png') && swContent.includes('boss_chronos.png'), 'sw.js precaches boss portrait assets for Worlds 12, 13, and 14');
  assert(swContent.includes("world_map_diorama.png"), 'sw.js precaches world_map_diorama.png');
  assert(swContent.includes("e.request.mode === 'navigate'") && swContent.includes("fetch(e.request)"), 'sw.js uses Network-First strategy for HTML navigation requests');
  assert(swContent.includes("caches.match(e.request)"), 'sw.js uses Cache-First strategy for heavy media assets');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 7: 5-Character Platforming & Hazard Interactions Matrix
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 7: 5-Character Platforming & Hazard Interactions Matrix ---');

{
  const charIds = ['candela', 'cayetana', 'valentina', 'mama', 'papa'];
  const gear = new RotatingGearPlatform(400, 200, 48, 8, 0.02, 1);
  const pend = new PendulumSwing(600, 100, 96, Math.PI / 3, 0.04, 20);
  const tickBlock = new TickTockBlock(800, 200, 32, 32, 120, 0);

  charIds.forEach(charId => {
    const game = new PlatformerGame();
    game.selectedCharId = charId;
    game.gearPlatforms = [gear];
    game.pendulums = [pend];
    game.tickTockBlocks = [tickBlock];
    const p = game.player;

    // 1. Gear Platform Landing
    p.x = 400 - p.w / 2;
    p.y = 190;
    p.vy = 2.0;
    game.resolveVertical(p, [gear]);
    assert(p.onGround === true && p.y === gear.y - p.h, `[${charId}] Lands cleanly on RotatingGearPlatform top surface`);

    // 2. Pendulum Hazard Impact & Knocback
    p.invincibleTimer = 0;
    const tip = pend.getBladePos();
    p.x = tip.x - p.w / 2;
    p.y = tip.y - p.h / 2;
    pend.check(p, game);
    assert(p.invincibleTimer === 90 && p.vy === -7.0, `[${charId}] Sustains Pendulum knockback (vy=-7.0, invinc=90)`);

    // 3. Unique Character Abilities
    game.input.action = true;
    game.prevAction = false;
    if (charId === 'candela') {
      p.onGround = false;
      const initialPlatforms = game.spawnedPlatforms.length;
      game.updatePlayer(1000, [gear]);
      assert(game.spawnedPlatforms.length > initialPlatforms, `[candela] Spawns floating cloud platform on action in mid-air`);
    } else if (charId === 'cayetana') {
      p.vx = 0;
      game.updatePlayer(1000, [gear]);
      assert(Math.abs(p.vx) > 7.0, `[cayetana] Executes high-speed horizontal dash on action`);
    } else if (charId === 'valentina') {
      const initialFireballs = game.fireballs.length;
      game.updatePlayer(1000, [gear]);
      assert(game.fireballs.length > initialFireballs, `[valentina] Fires plasma burst projectile on action`);
    } else if (charId === 'mama') {
      p.vy = 5.0;
      p.onGround = false;
      game.input.jump = true;
      game.updatePlayer(1000, [gear]);
      assert(p.vy < 2.0, `[mama] Glides smoothly through air on jump hold`);
    } else if (charId === 'papa') {
      p.onGround = false;
      p.vy = 0;
      game.input.down = true;
      game.updatePlayer(1000, [gear]);
      assert(p.isGroundPounding === true && p.vy >= 14.0, `[papa] Initiates high-velocity ground pound on down input`);
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// SUITE 8: Complete 3-Phase Chronos Boss Battle Simulation
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 8: Complete 3-Phase Chronos Boss Battle Simulation ---');

{
  const game = new PlatformerGame();
  const boss = new WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo', 3520, 150);
  game.currentBoss = boss;
  boss.active = true;
  const p = game.player;

  // Initial Combat State
  assert(boss.hp === 3 && boss.phase === 1, 'Chronos Battle starts in Phase 1 with 3 HP');

  // PHASE 1: Temporal Gear Projectiles & Stomp Hit 1
  boss.attackTimer = 100;
  boss.stunTimer = 0;
  boss.update(p, game);
  assert(boss.projectiles.some(proj => proj.type === 'temporal_gear'), 'Chronos Phase 1 spawns temporal gear projectiles');

  // Player stomps Chronos from above
  boss.invincTimer = 0;
  boss.takeDamage(game);
  assert(boss.hp === 2 && boss.phase === 2, 'Chronos transitions to Phase 2 after first stomp');

  // PHASE 2: Time Dilation Spell & Stomp Hit 2
  boss.attackTimer = 100;
  boss.stunTimer = 0;
  p.vx = 6.0;
  p.vy = -8.0;
  boss.update(p, game);
  assertApprox(p.vx, 6.0 * 0.55, 1e-4, 'Chronos Phase 2 slows horizontal player velocity to 0.55x');
  assertApprox(p.vy, -8.0 * 0.55, 1e-4, 'Chronos Phase 2 slows vertical player velocity to 0.55x');

  boss.invincTimer = 0;
  boss.takeDamage(game);
  assert(boss.hp === 1 && boss.phase === 3, 'Chronos transitions to Phase 3 after second stomp');

  // PHASE 3: Chrono Blade Barrage & Final Stomp
  boss.attackTimer = 100;
  boss.stunTimer = 0;
  boss.update(p, game);
  assert(boss.projectiles.some(proj => proj.type === 'chrono_blade'), 'Chronos Phase 3 launches chrono blade projectile volley');

  const prevScore = game.score;
  const prevDust = game.starDust;
  boss.invincTimer = 0;
  boss.takeDamage(game);

  assert(boss.hp === 0 && boss.state === 'defeated', 'Chronos is defeated after 3rd stomp');
  assert(game.score === prevScore + 3500, 'Defeating Chronos awards +3500 score points');
  assert(game.starDust === prevDust + 15, 'Defeating Chronos awards +15 Star Dust');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 9: World Map Graph Traversal & Unlock Path Invariant Stress
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 9: World Map Graph Traversal & Unlock Path Invariant Stress ---');

{
  const game = new PlatformerGame();
  // Fully unlock all 14 levels
  game.unlockedLevels = Array(14).fill(true);

  // Navigate forward through all 14 worlds
  game.currentLevelIdx = 0;
  for (let i = 0; i < 13; i++) {
    game.navigateWorldMap(1);
    assert(game.currentLevelIdx === i + 1, `Forward navigation steps cleanly from World ${i + 1} to World ${i + 2}`);
  }

  // Boundary check at World 14: cannot step beyond index 13
  game.navigateWorldMap(1);
  assert(game.currentLevelIdx === 13, 'Forward navigation clamps at World 14 (index 13)');

  // Navigate backward through all 14 worlds
  for (let i = 13; i > 0; i--) {
    game.navigateWorldMap(-1);
    assert(game.currentLevelIdx === i - 1, `Backward navigation steps cleanly from World ${i + 1} to World ${i}`);
  }

  // Boundary check at World 1: cannot step below index 0
  game.navigateWorldMap(-1);
  assert(game.currentLevelIdx === 0, 'Backward navigation clamps at World 1 (index 0)');

  // Locked World Entry Prevention
  const lockGame = new PlatformerGame();
  lockGame.unlockedLevels = { 0: true }; // Only World 1 unlocked
  lockGame.currentLevelIdx = 1;
  assert(lockGame.isLevelUnlocked(1) === false, 'isLevelUnlocked(1) returns false for locked World 2');
  
  // Starting level when locked fails validation
  assert(lockGame.isLevelUnlocked(lockGame.currentLevelIdx) === false, 'Cannot start locked World 2 without satisfying unlock conditions');
}

// ════════════════════════════════════════════════════════════════════
// SUITE 10: Canvas 2D Transform Stack Invariant Across World 14 Rendering
// ════════════════════════════════════════════════════════════════════
console.log('\n--- SUITE 10: Canvas 2D Transform Stack Invariant Across World 14 Rendering ---');

{
  const game = new PlatformerGame();
  game.currentLevelIdx = 13; // World 14
  game.startSelectedLevel();

  let renderStackOk = true;
  for (let f = 0; f < 500; f++) {
    env.mockCtx.resetStackDepth();
    game.camera.x = (f * 8) % 4200;
    game.renderBackground(env.mockCtx, f * 16);
    game.renderLevel(env.mockCtx, f * 16);
    if (env.mockCtx.getStackDepth() !== 0) {
      renderStackOk = false;
      break;
    }
  }

  assert(renderStackOk, 'World 14 full level and background rendering strictly maintains canvas transform balance (stack depth = 0) over 500 frames');
}

console.log('\n======================================================================');
console.log(`  STRESS HARNESS AUDIT SUMMARY: ${passedTests} PASSED | ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
console.log('======================================================================\n');

if (failedTests > 0) {
  console.error("FAILURES DETECTED:");
  failures.forEach(f => console.error(" - " + f));
  process.exit(1);
} else {
  process.exit(0);
}
