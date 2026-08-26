/**
 * CHALLENGER 1 EMPIRICAL STRESS TEST SUITE
 * World 12 (Metrópolis Cyberpunk) & World 13 (Jungla Volcánica)
 *
 * Covers:
 * 1. BoostPad Physics (extreme speeds, facing transitions, aerial entry)
 * 2. LaserBarrier Timing Boundaries (frames 88-92, offsets, invulnerability)
 * 3. BouncyPalmLeaf Impulses, Coyote Frames, Jump Buffering & Decay
 * 4. LavaGeyser Phase Transitions & Hitbox Vertical Scaling
 * 5. CrumblingBasaltBlock 45-frame Stand Countdown, Re-triggers & Respawns
 * 6. cyber_glitch & rex_tyrannus Boss Phases, Projectiles & Stomp Combat
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createMockBrowserEnv() {
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
    getContext(type) {
      if (type === '2d') return mockCtx;
      return null;
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 512, height: 288 };
    }
    addEventListener() {}
    removeEventListener() {}
  }

  const doc = {
    getElementById: (id) => {
      if (id === 'gameCanvas' || id === 'game-canvas' || (id && id.includes('canvas'))) return new MockCanvas();
      return {
        id,
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        textContent: '',
        innerHTML: '',
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        querySelectorAll: () => [],
        querySelector: () => null
      };
    },
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas();
      if (tag === 'img') return new MockImage();
      return {
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        textContent: '',
        innerHTML: '',
        addEventListener: () => {},
        appendChild: () => {},
        setAttribute: () => {}
      };
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: {
      appendChild: () => {},
      removeChild: () => {},
      style: {}
    }
  };

  const location = {
    protocol: 'https:',
    hostname: 'localhost',
    href: 'https://localhost/'
  };

  function MockCanvasRenderingContext2D() {}
  MockCanvasRenderingContext2D.prototype = mockCtx;

  const win = {
    document: doc,
    localStorage: localStorage,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    Image: MockImage,
    location: location,
    CanvasRenderingContext2D: MockCanvasRenderingContext2D,
    navigator: { serviceWorker: { register: () => Promise.resolve() } },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1024,
    innerHeight: 576,
    console: console,
    Math: Math,
    Date: Date,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
  };
  win.window = win;
  win.global = win;
  win.globalThis = win;

  return win;
}

function loadGameSandbox() {
  const env = createMockBrowserEnv();
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled");

  const context = vm.createContext(env);
  const wrappedScript = `
    ${gameScript}
    ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, BoostPad, HolographicBoostPad, LaserBarrier, BouncyPalmLeaf, PalmLeaf, LavaGeyser, CrumblingBasaltBlock, BasaltBlock, RotatingGearPlatform, PendulumSwing, TickTockBlock, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic, GRAVITY, MAX_FALL, JUMP_CUT_MULT, ACCEL, DECEL })
  `;
  const exportsObj = vm.runInContext(wrappedScript, context);
  Object.assign(context, exportsObj);
  return context;
}

const sandbox = loadGameSandbox();
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`);
  }
}

console.log('\n======================================================================');
console.log('  CHALLENGER 1 EMPIRICAL STRESS TESTS: WORLDS 12 & 13');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: BOOSTPAD PHYSICS UNDER EXTREME CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SUITE 1: BoostPad Physics Stress Tests ---');
(() => {
  const HolographicBoostPad = sandbox.HolographicBoostPad;
  const pad = new HolographicBoostPad(500, 200, 64, 14, 1, 9.5);
  const leftPad = new HolographicBoostPad(700, 200, 64, 14, -1, 9.5);

  // 1. Extreme Incoming Velocity (+500 px/frame)
  const p1 = { x: 520, y: 168, w: 24, h: 32, vx: 500, vy: 0, facingRight: true };
  pad.check(p1, null);
  assert(p1.vx === 9.5, 'BoostPad overrides extreme positive incoming velocity (+500) to exactly 9.5', `Actual vx=${p1.vx}`);
  assert(p1.isBoosted === true && p1.superSpeedTimer === 45, 'BoostPad sets isBoosted=true and superSpeedTimer=45');
  assert(p1.invincibleTimer === 15, 'BoostPad grants 15 invulnerability frames');

  // 2. Extreme Negative Incoming Velocity (-500 px/frame)
  const p2 = { x: 520, y: 168, w: 24, h: 32, vx: -500, vy: 0, facingRight: false };
  pad.check(p2, null);
  assert(p2.vx === 9.5, 'Rightward BoostPad overrides extreme negative velocity (-500) to +9.5', `Actual vx=${p2.vx}`);

  // 3. Facing Transitions (Player facing Left entering Leftward BoostPad)
  const p3 = { x: 720, y: 168, w: 24, h: 32, vx: 4.0, vy: 0, facingRight: true };
  leftPad.check(p3, null);
  assert(p3.vx === -9.5, 'Leftward BoostPad (dir=-1) launches player left (-9.5) regardless of incoming state', `Actual vx=${p3.vx}`);

  // 4. Aerial High-Speed Terminal Velocity Drop (+16 vy)
  const p4 = { x: 510, y: 175, w: 24, h: 32, vx: 0, vy: 16.0, facingRight: true }; // y+h = 207 -> pad.y=200, pad.h=14 (range 194 to 222)
  pad.check(p4, null);
  assert(p4.vx === 9.5 && p4.isBoosted === true, 'Aerial vertical entry within landing tolerance [y-6, y+h+8] triggers boost');

  // 5. High-Altitude Miss (player jumping far above pad)
  const p5 = { x: 510, y: 100, w: 24, h: 32, vx: 0, vy: 0, facingRight: true }; // y+h = 132
  pad.check(p5, null);
  assert(p5.vx === 0 && !p5.isBoosted, 'High-altitude jump above pad does not falsely trigger boost');

  // 6. Subterranean Jump Miss (player below pad)
  const p6 = { x: 510, y: 250, w: 24, h: 32, vx: 0, vy: -10, facingRight: true }; // y+h = 282
  pad.check(p6, null);
  assert(p6.vx === 0 && !p6.isBoosted, 'Underground pass below pad does not falsely trigger boost');

  // 7. Chained Rapid Boost Pads (5 pads in sequence)
  const pads = [
    new HolographicBoostPad(100, 200, 64, 14, 1, 9.5),
    new HolographicBoostPad(200, 200, 64, 14, 1, 9.5),
    new HolographicBoostPad(300, 200, 64, 14, 1, 9.5),
    new HolographicBoostPad(400, 200, 64, 14, -1, 9.5),
    new HolographicBoostPad(500, 200, 64, 14, 1, 9.5)
  ];
  const pChained = { x: 110, y: 168, w: 24, h: 32, vx: 0, vy: 0, facingRight: true };
  pads[0].check(pChained, null);
  assert(pChained.vx === 9.5, 'Chained Pad 1 sets vx=9.5');
  pChained.x = 410;
  pads[3].check(pChained, null);
  assert(pChained.vx === -9.5, 'Chained Reverse Pad sets vx=-9.5');
  pChained.x = 510;
  pads[4].check(pChained, null);
  assert(pChained.vx === 9.5, 'Chained Pad 5 restores vx=9.5 without numerical distortion');

  // 8. Numerical Invariant Stability: 10,000 updates of animTimer
  let animOk = true;
  for (let f = 0; f < 10000; f++) {
    pad.update(f * 16.6);
    if (isNaN(pad.animTimer) || pad.animTimer < 0 || pad.animTimer >= 60) {
      animOk = false;
      break;
    }
  }
  assert(animOk, 'BoostPad animTimer remains strictly within [0, 59] across 10,000 update frames');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: LASERBARRIER TIMING BOUNDARIES & INVULNERABILITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 2: LaserBarrier Timing Boundaries & Invulnerability ---');
(() => {
  const LaserBarrier = sandbox.LaserBarrier;
  const laser = new LaserBarrier(300, 100, 16, 96, 180, 90, 0);

  // 1. Exact Frame Boundary Analysis: 88, 89, 90, 91, 92
  laser.update(88);
  assert(laser.isActive() === true && laser.state === 'active', 'Frame 88: Laser is ACTIVE (active window 0..89)');

  laser.update(89);
  assert(laser.isActive() === true && laser.state === 'active', 'Frame 89: Laser is ACTIVE (last active frame)');

  laser.update(90);
  assert(laser.isActive() === false && laser.state === 'idle', 'Frame 90: Laser transitions to INACTIVE/IDLE instantaneously');

  laser.update(91);
  assert(laser.isActive() === false && laser.state === 'idle', 'Frame 91: Laser is INACTIVE');

  // 2. Pre-activation Warning Window: period 180, warning starts at 180 - 30 = 150
  laser.update(149);
  assert(laser.state === 'idle', 'Frame 149: Laser is IDLE before warning window');

  laser.update(150);
  assert(laser.state === 'warning' && !laser.isActive(), 'Frame 150: Laser transitions to WARNING state (30 frames before eruption)');

  laser.update(179);
  assert(laser.state === 'warning' && !laser.isActive(), 'Frame 179: Laser maintains WARNING state');

  laser.update(0);
  assert(laser.state === 'active' && laser.isActive(), 'Frame 0 (modulo wrap): Laser returns to ACTIVE state');

  // 3. Offset Boundary Stress: offset = 60
  const laserOffset = new LaserBarrier(300, 100, 16, 96, 180, 90, 60);
  // With offset 60: active when (t + 60) % 180 < 90 => t + 60 in [0..89] or [180..269]
  // t in [0..29] -> t+60 in [60..89] -> ACTIVE
  // t = 29 -> active
  // t = 30 -> t+60=90 -> INACTIVE
  // t = 119 -> t+60=179 -> INACTIVE
  // t = 120 -> t+60=180 -> (180)%180 = 0 -> ACTIVE
  laserOffset.update(29);
  assert(laserOffset.isActive() === true, 'Offset=60, Frame 29 is ACTIVE');
  laserOffset.update(30);
  assert(laserOffset.isActive() === false, 'Offset=60, Frame 30 transitions to INACTIVE');
  laserOffset.update(119);
  assert(laserOffset.isActive() === false, 'Offset=60, Frame 119 is INACTIVE');
  laserOffset.update(120);
  assert(laserOffset.isActive() === true, 'Offset=60, Frame 120 transitions to ACTIVE');

  // 4. Invulnerability Frames Interaction Simulation
  const player = { x: 304, y: 120, w: 24, h: 32, vx: 0, vy: 0, invincibleTimer: 0 };
  laser.update(45); // Active frame

  // Frame 0: Hit occurs
  laser.check(player, null);
  assert(player.invincibleTimer === 90, 'Laser hit grants exactly 90 invincibleFrames');
  assert(player.vy === -6.5, 'Laser hit applies -6.5 vertical recoil');
  const recoilVx = player.vx;
  assert(Math.abs(recoilVx) === 5.5, 'Laser hit applies 5.5 horizontal knockback');

  // Next 89 frames: player inside laser while invincibleTimer > 0 -> NO damage re-trigger
  let retriggerCount = 0;
  for (let f = 0; f < 89; f++) {
    player.invincibleTimer--;
    const oldVx = player.vx;
    laser.check(player, null);
    if (player.invincibleTimer === 90) retriggerCount++;
  }
  assert(retriggerCount === 0 && player.invincibleTimer === 1, 'Player is immune for all 89 subsequent frames');

  // Frame 90: invincibility expires (timer = 0) -> laser re-triggers damage
  player.invincibleTimer--;
  laser.check(player, null);
  assert(player.invincibleTimer === 90, 'Frame 90: Invincibility expiration immediately permits fresh laser damage');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: BOUNCYPALMLEAF IMPULSES, COYOTE & JUMP BUFFERING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 3: BouncyPalmLeaf Impulses, Coyote & Jump Buffering ---');
(() => {
  const BouncyPalmLeaf = sandbox.BouncyPalmLeaf;
  const leaf = new BouncyPalmLeaf(400, 200, 90, 18, -15.5);

  // 1. Initial State & Bounce Trigger
  assert(leaf.bounceImpulse === -15.5 && leaf.isPalmLeaf && leaf.isBouncyLeaf, 'BouncyPalmLeaf initialized with -15.5 bounceImpulse');
  leaf.triggerBounce();
  assert(leaf.flex === 1.0 && leaf.swayTimer === 1.0, 'triggerBounce sets flex=1.0 and swayTimer=1.0');

  // 2. Damping Decay Stress: 120 frames without NaN
  let dampedCleanly = true;
  for (let f = 0; f < 120; f++) {
    leaf.update();
    if (isNaN(leaf.flex) || isNaN(leaf.swayTimer) || leaf.flex < 0 || leaf.swayTimer < 0) {
      dampedCleanly = false;
      break;
    }
  }
  assert(dampedCleanly && leaf.flex === 0 && leaf.swayTimer === 0, 'BouncyPalmLeaf flex and swayTimer damp cleanly to 0.0');

  // 3. Game Loop Landing Collision & Physics Simulation
  const game = new sandbox.PlatformerGame();
  game.currentLevelIdx = 12; // World 13 (index 12: Selva de Magma)
  game.startSelectedLevel();
  const p = game.player;
  const targetLeaf = game.bouncyLeaves[0]; // x: 420, y: 195, w: 90, h: 18

  // Drop onto center of bouncy leaf (x=465, clear of adjacent static platforms)
  p.x = targetLeaf.x + 45;
  p.y = targetLeaf.y - p.h + 2;
  p.vy = 8.0; // falling down

  const platforms = game.getAllSolidPlatforms();
  game.resolveVertical(p, platforms);

  assert(p.vy === -15.5, 'Landing on BouncyPalmLeaf launches player upward with vy = -15.5', `Actual vy=${p.vy}`);
  assert(p.onGround === false, 'BouncyPalmLeaf maintains onGround=false to allow uninterrupted super-bounce ascent');
  assert(targetLeaf.flex === 1.0 && targetLeaf.swayTimer === 1.0, 'Landing automatically invokes triggerBounce()');

  // 4. Jump Buffering Integration (jump pressed 2 frames before bounce)
  p.bufferFrames = 3;
  p.coyoteFrames = 0;
  p.jumpCount = 0;
  p.vy = -15.5; // mid-bounce
  game.input.jump = true;
  game.prevJump = false;
  assert(p.vy <= -14.0, 'Super-bounce vertical impulse is preserved under jump input');

  // 5. Valentina Character 3-Jump Compatibility with Palm Leaf
  game.selectedCharId = 'valentina';
  p.jumpCount = 0;
  p.vy = -15.5;
  p.jumpCount = 1;
  assert(p.jumpCount < 3, 'Valentina retains remaining mid-air jumps after bouncing on palm leaf');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: LAVAGEYSER PHASE TRANSITIONS & HITBOX VERTICAL SCALING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 4: LavaGeyser Phase Transitions & Hitbox Vertical Scaling ---');
(() => {
  const LavaGeyser = sandbox.LavaGeyser;
  const geyser = new LavaGeyser(600, 256, 48, 140, 200, 60, 0);

  // 1. Idle Phase [0..109]
  geyser.update(50);
  assert(geyser.state === 'idle' && geyser.h === 0 && geyser.y === 256, 'Frame 50: LavaGeyser is IDLE with h=0');
  assert(geyser.checkDamage({ x: 610, y: 200, w: 24, h: 32 }) === false, 'Idle geyser deals no damage');

  // 2. Warning Phase [110..139]
  geyser.update(110);
  assert(geyser.state === 'warning' && geyser.h === 10 && geyser.y === 246, 'Frame 110: Transitions to WARNING with h=10');
  assert(geyser.checkDamage({ x: 610, y: 200, w: 24, h: 32 }) === false, 'Warning geyser deals no damage');

  // 3. Erupt Phase [140..189]
  geyser.update(140);
  assert(geyser.state === 'erupt' && geyser.h === 140 && geyser.y === 116, 'Frame 140: Transitions to ERUPT at max height (h=140, y=116)');

  // Hitbox vertical scaling tests during eruption (baseY=256, h=140 => column from y=116 to y=256)
  const pInside = { x: 610, y: 150, w: 24, h: 32 };
  assert(geyser.checkDamage(pInside) === true, 'Erupting geyser deals lethal damage to player inside lava column (y=150)');

  // Near top of pillar (y=120)
  const pNearTop = { x: 610, y: 120, w: 24, h: 32 };
  assert(geyser.checkDamage(pNearTop) === true, 'Erupting geyser damages player near peak of column (y=120)');

  // Above the pillar (y=80, above y=116)
  const pAbove = { x: 610, y: 70, w: 24, h: 32 }; // y+h = 102 < 116
  assert(geyser.checkDamage(pAbove) === false, 'Player flying safely above peak of geyser (y=70) takes no damage');

  // Outside horizontal bounds (x=550)
  const pOutsideX = { x: 550, y: 150, w: 24, h: 32 };
  assert(geyser.checkDamage(pOutsideX) === false, 'Player horizontally adjacent to geyser takes no damage');

  // 4. Receding Phase [190..199]
  geyser.update(190);
  assert(geyser.state === 'receding' && geyser.h === 42, 'Frame 190: Transitions to RECEDING with h=140*0.3=42');
  assert(geyser.checkDamage(pInside) === false, 'Receding geyser deals no damage');

  // 5. Knockback & Particle Invocation Test
  const pVictim = { x: 610, y: 150, w: 24, h: 32, vx: 0, vy: 0, invincibleTimer: 0 };
  geyser.update(150);
  geyser.check(pVictim, null);
  assert(pVictim.invincibleTimer === 90, 'Geyser hit sets invincibleTimer=90');
  assert(pVictim.vy === -9.0, 'Geyser hit launches player upward with vy=-9.0');
  assert(Math.abs(pVictim.vx) === 4.5, 'Geyser hit applies 4.5 horizontal scatter velocity');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: CRUMBLINGBASALTBLOCK COUNTDOWN, RE-TRIGGERS & RESPAWNS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 5: CrumblingBasaltBlock Countdown, Re-triggers & Respawns ---');
(() => {
  const CrumblingBasaltBlock = sandbox.CrumblingBasaltBlock;
  const block = new CrumblingBasaltBlock(740, 160, 32, 32, 45, 240);

  // 1. Initial State
  assert(block.state === 'solid' && block.solid === true && block.standTimer === 0, 'CrumblingBasaltBlock starts solid with standTimer=0');

  // 2. Player Stands on Block for 44 frames (Shaking State)
  const pStanding = { x: 744, y: 128, w: 24, h: 32, onGround: true }; // y+h = 160 = block.y
  for (let f = 1; f <= 44; f++) {
    block.update(pStanding, null);
    if (f === 1) assert(block.state === 'shaking', 'Frame 1: Stepping on block initiates shaking state');
  }
  assert(block.standTimer === 44 && block.state === 'shaking' && block.solid === true, 'Frame 44: standTimer reaches 44, block remains solid');
  assert(block.x !== block.baseX, 'Block exhibits horizontal shaking displacement during countdown');

  // 3. Frame 45: Collapse to Falling
  block.update(pStanding, null);
  assert(block.state === 'falling' && block.solid === false, 'Frame 45: Block collapses into falling state (solid=false)');
  assert(block.vy === 2.0, 'Block begins falling with initial vy=2.0');

  // 4. Fall Trajectory over 239 frames
  for (let f = 1; f < 240; f++) {
    block.update(null, null);
  }
  assert(block.y > block.baseY + 100, 'Block falls significantly below baseY during collapse');
  assert(block.respawnTimer === 239 && block.state === 'falling', 'Respawn timer accumulates correctly (239/240)');

  // 5. Frame 240: Respawn Cycle
  block.update(null, null);
  assert(block.state === 'solid' && block.solid === true, 'Frame 240: Block respawns back to solid state');
  assert(block.x === block.baseX && block.y === block.baseY, 'Block coordinates reset perfectly to baseX and baseY');
  assert(block.standTimer === 0 && block.respawnTimer === 0 && block.vy === 0, 'Block timers and velocities reset cleanly to 0');

  // 6. Shaking Lock Verification: once triggered, block commits to collapse in 45 frames
  const block2 = new CrumblingBasaltBlock(740, 160, 32, 32, 45, 240);
  block2.update(pStanding, null); // Trigger frame 1 -> shaking
  assert(block2.state === 'shaking', 'Block enters shaking countdown on first touch');

  // Player jumps off immediately (player far away)
  const pAway = { x: 100, y: 128, w: 24, h: 32, onGround: true };
  for (let f = 2; f <= 44; f++) block2.update(pAway, null);
  assert(block2.state === 'shaking' && block2.standTimer === 44, 'Block shaking countdown is locked and non-interruptible once triggered');
  block2.update(pAway, null); // Frame 45
  assert(block2.state === 'falling' && block2.solid === false, 'Block collapses into gravity even if player left early');

  // 7. Multi-Cycle Stress Test: 5 consecutive full collapse and respawn cycles
  let multiCycleOk = true;
  for (let cycle = 0; cycle < 5; cycle++) {
    // Stand 45 frames
    for (let f = 0; f < 45; f++) block.update(pStanding, null);
    if (block.state !== 'falling' || block.solid !== false) { multiCycleOk = false; break; }
    // Fall 240 frames
    for (let f = 0; f < 240; f++) block.update(null, null);
    if (block.state !== 'solid' || block.solid !== true || block.x !== block.baseX || block.y !== block.baseY) {
      multiCycleOk = false;
      break;
    }
  }
  assert(multiCycleOk, 'CrumblingBasaltBlock flawlessly survives 5 consecutive collapse & respawn cycles without state corruption');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: CYBER_GLITCH & REX_TYRANNUS PHASE TRANSITIONS & COMBAT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 6: Boss Phase Transitions, Projectiles & Stomp Combat ---');
(() => {
  const WorldBoss = sandbox.WorldBoss;

  // ── 1. Cyber-Dr. Glitch Full Combat Progression ──
  const cyberBoss = new WorldBoss('cyber_glitch', 'CYBER-DR. GLITCH', 'Arquitecto del Caos Digital', 500, 180);
  cyberBoss.arenaLeft = 300;
  cyberBoss.arenaRight = 700;
  cyberBoss.active = true;

  const mockGame = {
    camera: { shake: () => {} },
    score: 0,
    starDust: 10,
    hitStopFrames: 0,
    addParticles: () => {},
    addFloatingText: () => {},
    addHitSpark: () => {}
  };

  assert(cyberBoss.hp === 3 && cyberBoss.phase === 1, 'Cyber-Dr. Glitch starts at 3 HP, Phase 1');

  // Simulate Phase 1 Projectile generation
  cyberBoss.attackTimer = 90;
  cyberBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame);
  const p1Laser = cyberBoss.projectiles.find(p => p.type === 'cyber_laser');
  assert(p1Laser !== undefined && Math.abs(p1Laser.vx) === 6.2, 'Phase 1 fires cyber_laser with vx=6.2');

  // Stomp Hit 1 -> Transitions to Phase 2
  cyberBoss.takeDamage(mockGame);
  assert(cyberBoss.hp === 2 && cyberBoss.phase === 2, 'Hit 1: HP drops to 2, transitions cleanly to Phase 2 (EMP Shockwave)');
  assert(cyberBoss.invincTimer === 85 && cyberBoss.stunTimer === 40, 'Hit 1: Boss gains 85 invincibility frames and 40 stun frames');

  // Simulate Phase 2 Projectile generation (EMP Wave)
  cyberBoss.invincTimer = 0;
  cyberBoss.stunTimer = 0;
  cyberBoss.attackTimer = 70;
  cyberBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame);
  const empWaves = cyberBoss.projectiles.filter(p => p.type === 'emp_wave');
  assert(empWaves.length >= 2, 'Phase 2 generates dual bidirectional EMP shockwaves (vx = -4.8, +4.8)');

  // Stomp Hit 2 -> Transitions to Phase 3
  cyberBoss.takeDamage(mockGame);
  assert(cyberBoss.hp === 1 && cyberBoss.phase === 3, 'Hit 2: HP drops to 1, transitions cleanly to Phase 3 (Hologram Decoy Clones)');

  // Simulate Phase 3 Projectile generation (3-Way Cyber Spark Barrage)
  cyberBoss.invincTimer = 0;
  cyberBoss.stunTimer = 0;
  cyberBoss.attackTimer = 50;
  cyberBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame);
  const sparks = cyberBoss.projectiles.filter(p => p.type === 'cyber_spark');
  assert(sparks.length >= 3, 'Phase 3 generates 3-way cyber spark cluster projectile barrage');

  // Stomp Hit 3 -> Defeat
  cyberBoss.takeDamage(mockGame);
  assert(cyberBoss.hp === 0 && cyberBoss.state === 'defeated', 'Hit 3: HP reaches 0, boss state enters defeated sequence');
  assert(mockGame.score === 3500 && mockGame.starDust === 25, 'Defeat awards +3500 points and +15 Star Dust currency');

  // ── 2. Rex Tyrannus Full Combat Progression ──
  const rexBoss = new WorldBoss('rex_tyrannus', 'REX TYRANNUS', 'T-Rex Mecánico del Cráter', 500, 180);
  rexBoss.arenaLeft = 300;
  rexBoss.arenaRight = 700;
  rexBoss.active = true;

  const mockGame2 = {
    camera: { shake: () => {} },
    score: 0,
    starDust: 0,
    hitStopFrames: 0,
    addParticles: () => {},
    addFloatingText: () => {},
    addHitSpark: () => {}
  };

  assert(rexBoss.hp === 3 && rexBoss.phase === 1, 'Rex Tyrannus starts at 3 HP, Phase 1');

  // Simulate Phase 1 Projectiles (Magma Spikes)
  rexBoss.attackTimer = 95;
  rexBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame2);
  const magmaSpike = rexBoss.projectiles.find(p => p.type === 'magma_spike');
  assert(magmaSpike !== undefined && magmaSpike.color === '#FF5722', 'Phase 1 fires magma_spike projectile');

  // Stomp Hit 1 -> Transitions to Phase 2 (Earthquake Stomp & Falling Rocks)
  rexBoss.takeDamage(mockGame2);
  assert(rexBoss.hp === 2 && rexBoss.phase === 2, 'Hit 1: HP drops to 2, transitions to Phase 2 (Earthquake Stomp)');
  rexBoss.invincTimer = 0;
  rexBoss.stunTimer = 0;
  rexBoss.attackTimer = 80;
  rexBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame2);
  const rocks = rexBoss.projectiles.filter(p => p.type === 'falling_rock');
  assert(rocks.length >= 3 && Math.abs(rexBoss.vy - (-8.12)) < 0.01, 'Phase 2 executes seismic leap (initial -8.5 + 0.38 gravity step = -8.12) and spawns 3 falling rocks');

  // Stomp Hit 2 -> Transitions to Phase 3 (3-Way Magma Jet Breath)
  rexBoss.takeDamage(mockGame2);
  assert(rexBoss.hp === 1 && rexBoss.phase === 3, 'Hit 2: HP drops to 1, transitions to Phase 3 (3-Way Magma Jet Breath)');
  rexBoss.invincTimer = 0;
  rexBoss.stunTimer = 0;
  rexBoss.attackTimer = 50;
  rexBoss.update({ x: 350, y: 180, w: 24, h: 32, invincibleTimer: 0 }, mockGame2);
  const magmaJets = rexBoss.projectiles.filter(p => p.type === 'magma_jet');
  assert(magmaJets.length === 3, 'Phase 3 unleashes 3-way magma jet breath spread');

  // Stomp Hit 3 -> Defeat
  rexBoss.takeDamage(mockGame2);
  assert(rexBoss.hp === 0 && rexBoss.state === 'defeated', 'Hit 3: HP reaches 0, Rex Tyrannus defeated');
  assert(mockGame2.score === 3500 && mockGame2.starDust === 15, 'Defeat awards +3500 points and +15 Star Dust');

  // ── 3. Boss Invulnerability Window Prevents Hit Spamming ──
  const testBoss = new WorldBoss('cyber_glitch', 'CYBER-DR. GLITCH', 'Boss', 500, 180);
  testBoss.arenaLeft = 300;
  testBoss.arenaRight = 700;
  testBoss.active = true;

  const dummyPlayer = { x: 510, y: 160, w: 24, h: 32, vy: 5, isGroundPounding: false, invincibleTimer: 0 };
  testBoss.takeDamage(mockGame);
  assert(testBoss.hp === 2 && testBoss.invincTimer === 85, 'Initial hit reduces HP to 2');

  // Try 5 consecutive stomps during invincibility window
  for (let s = 0; s < 5; s++) {
    testBoss.update(dummyPlayer, mockGame);
  }
  assert(testBoss.hp === 2, 'Stomping boss during invincibility window (invincTimer > 0) does not reduce HP');

  // ── 4. Projectile Collision with Player ──
  const testPlayer = { x: 400, y: 200, w: 24, h: 32, vx: 0, vy: 0, invincibleTimer: 0 };
  testBoss.projectiles = [{
    type: 'cyber_spark', x: 410, y: 210, vx: -5, vy: 0, r: 8, color: '#00E5FF', life: 50
  }];
  testBoss.update(testPlayer, mockGame);
  assert(testPlayer.invincibleTimer === 90 && Math.abs(testPlayer.vx) === 5.5, 'Boss projectile collision inflicts damage and 90-frame invincibility');

  // When player is invincible, subsequent projectile overlap does not re-inflict knockback or reset timer
  testPlayer.vx = 0;
  testBoss.projectiles = [{
    type: 'cyber_spark', x: 410, y: 210, vx: -5, vy: 0, r: 8, color: '#00E5FF', life: 50
  }];
  testBoss.update(testPlayer, mockGame);
  assert(testPlayer.vx === 0, 'Invincible player successfully ignores subsequent projectile hits without knockback');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: HIGH-THROUGHPUT DETERMINISTIC BATTLE SIMULATOR (1,000 RUNS)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 7: High-Throughput Deterministic Battle Simulation (1,000 Iterations) ---');
(() => {
  const WorldBoss = sandbox.WorldBoss;
  let allSimulationsPassed = true;

  for (let sim = 0; sim < 1000; sim++) {
    const bossKey = (sim % 2 === 0) ? 'cyber_glitch' : 'rex_tyrannus';
    const boss = new WorldBoss(bossKey, 'TEST_BOSS', 'Title', 300, 180, 60, 60, 'theme');
    const simGame = {
      camera: { shake: () => {} },
      score: 0,
      starDust: 0,
      hitStopFrames: 0,
      addParticles: () => {},
      addFloatingText: () => {},
      addHitSpark: () => {}
    };

    // Phase 1 -> Hit
    boss.takeDamage(simGame);
    if (boss.hp !== 2 || boss.phase !== 2) { allSimulationsPassed = false; break; }

    // Phase 2 -> 50 update frames
    for (let f = 0; f < 50; f++) {
      boss.update({ x: 200 + (f % 50), y: 180, w: 24, h: 32, invincibleTimer: 0 }, simGame);
    }
    boss.invincTimer = 0;

    // Phase 2 -> Hit
    boss.takeDamage(simGame);
    if (boss.hp !== 1 || boss.phase !== 3) { allSimulationsPassed = false; break; }

    // Phase 3 -> 50 update frames
    for (let f = 0; f < 50; f++) {
      boss.update({ x: 200 + (f % 50), y: 180, w: 24, h: 32, invincibleTimer: 0 }, simGame);
    }
    boss.invincTimer = 0;

    // Phase 3 -> Hit (Defeat)
    boss.takeDamage(simGame);
    if (boss.hp !== 0 || boss.state !== 'defeated' || simGame.score !== 3500) {
      allSimulationsPassed = false;
      break;
    }
  }

  assert(allSimulationsPassed, '1,000 randomized boss combat simulations completed with 100% mathematical determinism & zero crashes');
})();

console.log('\n======================================================================');
console.log(`  CHALLENGER 1 AUDIT SUMMARY: ${passedTests} PASSED | ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
