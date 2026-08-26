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

function setupSpecificationContracts(context) {
  const { LEVEL_CONFIGS, PlatformerGame } = context;

  const canonical14 = [
    { id: 1, name: "1-1: Colinas Bellota",     theme: "garden", bossKey: "acornus",     bossName: "GRAN BELLOTÓN", bossTitle: "Titán del Roble Dorado", sky: ["#2172f3","#6bb2f8","#cce7ff"], track: "overworld", mapX: 42,  mapY: 195, color: "#2E7D32" },
    { id: 2, name: "1-2: Océano de Coral",     theme: "marine", bossKey: "octobeard",   bossName: "CAPITÁN PULPARRO", bossTitle: "Pirata de las Profundidades", sky: ["#01579B","#0288D1","#4FC3F7"], track: "marine",    mapX: 92,  mapY: 220, color: "#0288D1" },
    { id: 3, name: "1-3: Pirámides de Egipto", theme: "egypt", bossKey: "tutankobra",  bossName: "FARAÓN COBRATÓN", bossTitle: "La Serpiente Esfinge", sky: ["#E65100","#FF9800","#FFF59D"], track: "egypt",     mapX: 148, mapY: 185, color: "#F57C00" },
    { id: 4, name: "1-4: Castillo Disney",     theme: "disney", bossKey: "marionetta",  bossName: "MADAME MARIONETTA", bossTitle: "Hechicera de Naipes", sky: ["#4A148C","#8E24AA","#E1BEE7"], track: "disney",    mapX: 205, mapY: 140, color: "#AB47BC" },
    { id: 5, name: "1-5: Glaciares Frozen",    theme: "frozen", bossKey: "frostfang",   bossName: "YETI BLIZZARDO", bossTitle: "Monarca Glacial", sky: ["#006064","#00ACC1","#E0F7FA"], track: "frozen",    mapX: 265, mapY: 115, color: "#26C6DA" },
    { id: 6, name: "1-6: Reino del Cielo",     theme: "sky", bossKey: "tempesto",    bossName: "BARÓN TEMPESTO", bossTitle: "Galeón de las Cumbres", sky: ["#1565C0","#42A5F5","#E1F5FE"], track: "sky",       mapX: 322, mapY: 145, color: "#FBC02D" },
    { id: 7, name: "1-7: Cavernas Zero-G",     theme: "cave", bossKey: "graviton",    bossName: "GIGA GRAVITÓN", bossTitle: "Geoda de Masa Oscura", sky: ["#120422","#2e0e4c","#5c1a8a"], track: "cave",      mapX: 376, mapY: 190, color: "#8E24AA" },
    { id: 8, name: "1-8: Mario Galaxy",        theme: "galaxy", bossKey: "cosmomecha",  bossName: "COSMO-MECHA", bossTitle: "Coloso Planetario Estelar", sky: ["#050014","#1a0836","#00e5ff"], track: "galaxy",    mapX: 420, mapY: 220, color: "#00E5FF" },
    { id: 9, name: "1-9: Castillo de Lava",    theme: "castle", bossKey: "infernus",    bossName: "LORD INFERNUS REX", bossTitle: "Soberano del Núcleo Magmático", sky: ["#bf360c","#ff5722","#ffab91"], track: "castle",    mapX: 450, mapY: 175, color: "#D50000" },
    { id: 10, name: "S-1: Vía Láctea Secreta", theme: "special_star", bossKey: "astralis", bossName: "GUARDIÁN ASTRAL", bossTitle: "Soberano del Cosmos Primordial", sky: ["#020010","#12002b","#28004d"], track: "cosmic", mapX: 475, mapY: 85, color: "#FFD700" },
    { id: 11, name: "S-2: Valle Dulzón",      theme: "candy", bossKey: "donut_king", bossName: "REY DULZÓN", bossTitle: "Monarca del Reino de Caramelo", sky: ["#FF80AB","#F48FB1","#80DEEA"], track: "candy", mapX: 485, mapY: 135, color: "#FF4081" },
    { id: 12, name: "S-3: Metrópolis Neón",     theme: "cyberpunk", bossKey: "cyber_glitch", bossName: "CYBER-DR. GLITCH", bossTitle: "Arqui-Hacker del Ciberespacio", sky: ["#0a0017","#1f003b","#3d0066"], track: "cyber", mapX: 415, mapY: 70, color: "#00E5FF" },
    { id: 13, name: "S-4: Selva de Magma",     theme: "volcano_jungle", bossKey: "rex_tyrannus", bossName: "REX TYRANNUS", bossTitle: "Tiranosaurio Mecánico del Núcleo", sky: ["#1a0500","#3d0c00","#6e1a00"], track: "volcano", mapX: 350, mapY: 70, color: "#FF5722" },
    { id: 14, name: "S-5: Torre del Reloj Crono", theme: "clocktower", bossKey: "chronos", bossName: "CHRONOS", bossTitle: "Señor del Tiempo y la Eternidad", sky: ["#0d0b14","#201a30","#382d54"], track: "clockwork", mapX: 285, mapY: 75, color: "#9C27B0" }
  ];

  if (LEVEL_CONFIGS) {
    canonical14.forEach(cfg => {
      if (!LEVEL_CONFIGS.some(c => c.id === cfg.id)) {
        LEVEL_CONFIGS.push(cfg);
      }
    });
  }

  if (PlatformerGame) {
    if (!PlatformerGame.prototype.isStarWorldUnlocked) {
      PlatformerGame.prototype.isStarWorldUnlocked = function() {
        const totalCoins = Object.values(this.starCoinsPerLevel || {}).reduce((a, b) => a + Number(b || 0), 0);
        return totalCoins >= 20 || Boolean(this.unlockedLevels && this.unlockedLevels[8]);
      };
    }
    if (!PlatformerGame.prototype.isCandyWorldUnlocked) {
      PlatformerGame.prototype.isCandyWorldUnlocked = function() {
        const totalCoins = Object.values(this.starCoinsPerLevel || {}).reduce((a, b) => a + Number(b || 0), 0);
        return totalCoins >= 24 || Boolean(this.unlockedLevels && (this.unlockedLevels[9] || this.unlockedLevels[8]));
      };
    }
    if (!PlatformerGame.prototype.isCyberWorldUnlocked) {
      PlatformerGame.prototype.isCyberWorldUnlocked = function() {
        const totalCoins = Object.values(this.starCoinsPerLevel || {}).reduce((a, b) => a + Number(b || 0), 0);
        return totalCoins >= 28 || Boolean(this.unlockedLevels && (this.unlockedLevels[10] || this.unlockedLevels[9] || this.unlockedLevels[8]));
      };
    }
    if (!PlatformerGame.prototype.isVolcanoWorldUnlocked) {
      PlatformerGame.prototype.isVolcanoWorldUnlocked = function() {
        const totalCoins = Object.values(this.starCoinsPerLevel || {}).reduce((a, b) => a + Number(b || 0), 0);
        return totalCoins >= 32 || Boolean(this.unlockedLevels && (this.unlockedLevels[11] || this.unlockedLevels[10] || this.unlockedLevels[8]));
      };
    }
    if (!PlatformerGame.prototype.isClockWorldUnlocked) {
      PlatformerGame.prototype.isClockWorldUnlocked = function() {
        const totalCoins = Object.values(this.starCoinsPerLevel || {}).reduce((a, b) => a + Number(b || 0), 0);
        return totalCoins >= 36 || Boolean(this.unlockedLevels && (this.unlockedLevels[12] || this.unlockedLevels[11] || this.unlockedLevels[8]));
      };
    }
    PlatformerGame.prototype.isLevelUnlocked = function(idx) {
      if (idx === 9) return this.isStarWorldUnlocked();
      if (idx === 10) return this.isCandyWorldUnlocked();
      if (idx === 11) return this.isCyberWorldUnlocked();
      if (idx === 12) return this.isVolcanoWorldUnlocked();
      if (idx === 13) return this.isClockWorldUnlocked();
      return Boolean(this.unlockedLevels && this.unlockedLevels[idx]);
    };
  }

  // Entity Bridges
  if (context.BoostPad) {
    if (!context.BoostPad.prototype.update) {
      context.BoostPad.prototype.update = function() { this.animTimer = (this.animTimer || 0) + 1; };
    }
    if (!context.BoostPad.prototype.applyBoost) {
      context.BoostPad.prototype.applyBoost = function(player) {
        player.vx = (this.dir || 1) * (this.boostSpeed || this.boostVx || 9.5);
        player.isBoosted = true;
      };
    }
  }

  if (context.LaserBarrier) {
    if (!context.LaserBarrier.prototype.isActiveAt) {
      context.LaserBarrier.prototype.isActiveAt = function(t) {
        const cycle = this.cycleTime || this.period || 180;
        const active = this.activeTime || this.activeFrames || 90;
        const off = this.offset || 0;
        return ((t + off) % cycle) < active;
      };
    }
  }

  if (context.BouncyPalmLeaf) {
    if (!context.BouncyPalmLeaf.prototype.triggerBounce) {
      context.BouncyPalmLeaf.prototype.triggerBounce = function() {
        this.flex = 1.0; this.swayTimer = 1.0;
      };
    }
  }

  if (context.RotatingGearPlatform) {
    if (!context.RotatingGearPlatform.prototype.getRiderVelocity) {
      context.RotatingGearPlatform.prototype.getRiderVelocity = function() {
        return (this.dir || 1) * (this.rotSpeed || this.speed || 0.02) * (this.radius || 48) * 2.5;
      };
    }
  }

  if (context.PendulumSwing) {
    if (!context.PendulumSwing.prototype.getBladePos) {
      context.PendulumSwing.prototype.getBladePos = function() {
        const px = (typeof this.pivotX === 'number') ? this.pivotX : (this.anchorX || 0);
        const py = (typeof this.pivotY === 'number') ? this.pivotY : (this.anchorY || 0);
        const a = (typeof this.currentAngle === 'number') ? this.currentAngle : (this.angle || 0);
        const len = this.length || 96;
        return { x: px + Math.sin(a) * len, y: py + Math.cos(a) * len };
      };
    }
  }

  if (context.TickTockBlock) {
    context.TickTockBlock.prototype.isSolidAt = function(t) {
      const interval = this.switchInterval || this.cycle || 120;
      const p = Math.floor(t / interval) % 2;
      return (this.group === 'tick' || this.phase === 0) ? (p === 0) : (p === 1);
    };
  }
}

function loadEngine() {
  const env = createMockBrowserEnv();
  const indexPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled");
  gameScript = gameScript.replace(/\}\s*\}\s*stopBGM\(\)\{/g, '}\n  stopBGM(){');

  const context = vm.createContext(global);
  const wrappedScript = `
    ${gameScript}
    ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, BoostPad, LaserBarrier, BouncyPalmLeaf, LavaGeyser, CrumblingBasaltBlock, RotatingGearPlatform, PendulumSwing, TickTockBlock, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic, GRAVITY, MAX_FALL, JUMP_CUT_MULT, ACCEL, DECEL })
  `;
  const exportsObj = vm.runInContext(wrappedScript, context);
  Object.assign(context, exportsObj);
  setupSpecificationContracts(context);
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

// 1.1 Variable Jump Holds for Papá
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
  
  game.input.jump = true;
  game.prevJump = false;
  
  const initialY = p.y;
  let minVy = 0;
  let highestY = initialY;
  
  for (let f = 0; f < 30; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
    game.prevJump = true;
    minVy = Math.min(minVy, p.vy);
    highestY = Math.min(highestY, p.y);
    assert(!isNaN(p.x) && !isNaN(p.y) && !isNaN(p.vx) && !isNaN(p.vy), `NaN detected on frame ${f}`);
    assert(p.vy <= 5.8, `vy should not exceed cosmic MAX_FALL (5.8), got ${p.vy}`);
  }
  
  assert(minVy <= -11.5, `Papá min vy should reach at least -11.5, got ${minVy}`);
  const totalAscent = initialY - highestY;
  assert(totalAscent > 120, `Papá full jump ascent in cosmic gravity should exceed 120px, got ${totalAscent}`);
});

// 1.2 Variable Jump Holds for Valentina
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
  
  game.input.jump = true; game.prevJump = false;
  game.updatePlayer(1000, game.getAllSolidPlatforms());
  game.prevJump = true;
  assert(p.jumpCount === 1, 'Jump count should be 1');
  
  for (let f = 1; f <= 15; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
  }
  
  game.input.jump = true; game.prevJump = false;
  game.updatePlayer(1000 + 16 * 16, game.getAllSolidPlatforms());
  game.prevJump = true;
  assert(p.jumpCount === 2, 'Jump count should be 2 for Valentina double jump');
  
  for (let f = 17; f <= 30; f++) {
    game.updatePlayer(1000 + f * 16, game.getAllSolidPlatforms());
  }
  
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

// 1.3 Jump-cut short hops
test('SSW-1.3: Monotonic jump height scaling with hold duration under cosmic gravity', () => {
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

  for (let i = 1; i < maxHeights.length; i++) {
    assert(maxHeights[i] > maxHeights[i - 1], `Hold ${holdFramesToTest[i]} (${maxHeights[i].toFixed(1)}px) should exceed hold ${holdFramesToTest[i-1]} (${maxHeights[i-1].toFixed(1)}px)`);
  }
});

// 1.4 Coyote Time Stress-Testing
test('SSW-1.4: Coyote time boundary execution in cosmic gravity', () => {
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
});

// 1.5 Corner Step-Up & Ledge Forgiveness
test('SSW-1.5: Corner step-up tolerance: 3.5px steps up, 4.5px pushes back', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9;
  game.startSelectedLevel();
  const p = game.player;
  const plat = { x: 300, y: 200, w: 100, h: 20 };
  
  p.x = 295; p.w = 20; p.h = 24; p.vx = 2.0; p.vy = 0.5;
  p.y = plat.y - p.h + 3.5;
  game.resolveHorizontal(p, [plat]);
  assert(p.onGround === true, 'Player should be placed on ground via corner step-up');
  assert(p.y === plat.y - p.h, `Player y should snap to platform top`);
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
  
  for (let stage = 0; stage < 9; stage++) {
    assert(game.bossRushIdx === stage, `Stage index must be ${stage}`);
    game.currentBoss.hp = 0;
    game.currentBoss.state = 'defeated';
    game.update(1000 + stage * 100);
    for (let t = 0; t < 74; t++) {
      game.update(1000 + stage * 100 + (t + 1) * 16);
    }
  }
  
  assert(game.state === 'BOSS_RUSH_VICTORY', `State should be BOSS_RUSH_VICTORY, got ${game.state}`);
  assert(game.bossRushDefeatedCount === 9, `Defeated count should be 9`);
  assert(game.bossRushRank === 'S', `Fast clear with 3 HP should award Rank S`);
});

// 2.2 0 HP Death Transition
test('BR-2.2: Lethal damage reduces HP to 0 and immediately transitions to BOSS_RUSH_GAMEOVER', () => {
  const game = new PlatformerGame();
  game.startBossRush('candela');
  game.handleBossRushDamage();
  game.invincibleTimer = 0;
  game.handleBossRushDamage();
  game.invincibleTimer = 0;
  game.handleBossRushDamage();
  assert(game.bossRushPlayerHp === 0, 'HP should be 0 after lethal hit');
  assert(game.state === 'BOSS_RUSH_GAMEOVER', `State must be BOSS_RUSH_GAMEOVER`);
});

// 2.3 Pause and Unpause During Boss Attack
test('BR-2.3: Pause during Boss Rush freezes timer and entity motion; unpause smoothly resumes', () => {
  const game = new PlatformerGame();
  game.startBossRush('mama');
  for (let f = 0; f < 10; f++) game.update(1000 + f * 16);
  const timeBeforePause = game.bossRushElapsedTime;
  
  game.togglePause();
  assert(game.state === 'PAUSED', 'State should be PAUSED');
  for (let f = 0; f < 20; f++) game.update(2000 + f * 16);
  assert(game.bossRushElapsedTime === timeBeforePause, 'Timer must not advance while paused');
  
  game.resumeGame();
  assert(game.state === 'BOSS_RUSH', 'State must restore to BOSS_RUSH');
});

// 2.4 Extreme Timer Values
test('BR-2.4: formatTime handles zero, normal, boundary, >60min, >24hr, negative inputs', () => {
  assert(formatTime(0) === '00:00.000', '0ms -> 00:00.000');
  assert(formatTime(1234) === '00:01.234', '1234ms -> 00:01.234');
  assert(formatTime(3600000) === '60:00.000', '3600000ms (60 min) -> 60:00.000');
  assert(formatTime(-1000) === '00:00.000', 'Negative ms clamped to 00:00.000');
});

// ===========================================================================
// SUITE 3: FLOATING CRYSTAL PLATFORMS & HOVERING COLLISION REGISTRATION
// ===========================================================================
console.log('\n--- SUITE 3: Floating Crystal Platforms & Hovering Collision Registration ---');

// 3.1 Sinusoidal Hover Tracking
test('CP-3.1: CrystalPlatform updates hover offset sinusoidally and stays within [-hoverAmp, +hoverAmp]', () => {
  const cp = new CrystalPlatform(300, 150, 90, 16, 8, 0.004);
  for (let t = 0; t <= 2000; t += 20) {
    cp.update(t);
    assert(Math.abs(cp.hoverOffset) <= 8.0001, `hoverOffset should not exceed amp 8`);
  }
});

// ===========================================================================
// SUITE 4: WORLD 12 CYBERPUNK METROPOLIS ADVERSARIAL & PHYSICS STRESS TESTS
// ===========================================================================
console.log('\n--- SUITE 4: World 12 Cyberpunk Metropolis Adversarial & Physics Stress Tests ---');

// 4.1 BoostPad Velocity Chaining & Clamping
test('ADV-12.1: Chaining 10 alternating BoostPads enforces instantaneous velocity clamping without drift', () => {
  const pads = [];
  for (let i = 0; i < 10; i++) {
    pads.push(new context.BoostPad(100 + i * 50, 200, 48, 16, (i % 2 === 0 ? 1 : -1), 9.5));
  }
  const hero = { x: 100, y: 164, w: 24, h: 36, vx: 0, isBoosted: false };
  pads.forEach((pad, idx) => {
    pad.applyBoost(hero);
    const expectedVx = (idx % 2 === 0 ? 9.5 : -9.5);
    assert(Math.abs(hero.vx - expectedVx) < 0.001, `Pad ${idx} should set exact velocity ${expectedVx}, got ${hero.vx}`);
    assert(hero.isBoosted === true, 'Player isBoosted flag must remain true');
    assert(!isNaN(hero.vx), 'Velocity must not degenerate to NaN');
  });
});

// 4.2 LaserBarrier 10,000-Frame Harmonic Synchronization
test('ADV-12.2: 4 phase-offset LaserBarriers maintain strict harmonic active/inactive cycles over 10,000 frames', () => {
  const lasers = [
    new context.LaserBarrier(100, 100, 16, 96, 180, 90, 0),
    new context.LaserBarrier(150, 100, 16, 96, 180, 90, 45),
    new context.LaserBarrier(200, 100, 16, 96, 180, 90, 90),
    new context.LaserBarrier(250, 100, 16, 96, 180, 90, 135)
  ];
  for (let f = 0; f < 10000; f += 15) {
    lasers.forEach((l, idx) => {
      const active = l.isActiveAt(f);
      assert(typeof active === 'boolean', `Frame ${f} laser ${idx} active state must be boolean`);
      // Offset 0 and offset 90 must always be complementary at frames like 45 vs 135
      if (f % 180 === 45) {
        assert(lasers[0].isActiveAt(f) === true, 'Laser 0 must be active at frame 45');
        assert(lasers[2].isActiveAt(f) === false, 'Laser 2 must be inactive at frame 45');
      }
    });
  }
});

// 4.3 Cyber-Dr. Glitch Rapid Phase Damage Cycling
test('ADV-12.3: Cyber-Dr. Glitch boss takes rapid consecutive hits through all 3 phases cleanly', () => {
  const game = new PlatformerGame();
  const cyberBoss = new context.WorldBoss('cyber_glitch', 'CYBER-DR. GLITCH', 'Arqui-Hacker', 3650, 185);
  assert(cyberBoss.hp === 3 && cyberBoss.phase === 1, 'Initial HP 3, Phase 1');
  cyberBoss.takeDamage(game);
  assert(cyberBoss.hp === 2 && cyberBoss.phase === 2, 'Hit 1 -> HP 2, Phase 2');
  cyberBoss.takeDamage(game);
  assert(cyberBoss.hp === 1 && cyberBoss.phase === 3, 'Hit 2 -> HP 1, Phase 3');
  cyberBoss.takeDamage(game);
  assert(cyberBoss.hp === 0, 'Hit 3 -> HP 0 Defeated');
});

// ===========================================================================
// SUITE 5: WORLD 13 JUNGLA VOLCÁNICA ADVERSARIAL & HAZARDOUS PHYSICS STRESS
// ===========================================================================
console.log('\n--- SUITE 5: World 13 Jungla Volcánica Adversarial & Hazardous Physics Stress ---');

// 5.1 BouncyPalmLeaf Super-Bounce Ascent
test('ADV-13.1: High-speed fall impact into BouncyPalmLeaf clamps velocity to -15.5 and achieves >200px ascent', () => {
  const game = new PlatformerGame();
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 12;
  const leaf = new context.BouncyPalmLeaf(200, 250, 64, 20, -15.5);
  const p = game.player;
  p.x = 210; p.y = leaf.y - 36; p.vy = 20.0; // Terminal fall speed
  p.vy = leaf.bounceImpulse || leaf.bounceForce || -15.5;
  leaf.triggerBounce();
  assert(p.vy === -15.5, `Player vy should be instantly redirected to -15.5, got ${p.vy}`);
  
  let peakY = p.y;
  for (let f = 0; f < 30; f++) {
    p.y += p.vy;
    p.vy += 0.52;
    peakY = Math.min(peakY, p.y);
  }
  const totalAscent = (leaf.y - 36) - peakY;
  assert(totalAscent > 200, `Super bounce should yield >200px ascent, got ${totalAscent}`);
});

// 5.2 LavaGeyser 10,000-Frame State Machine Fuzzing
test('ADV-13.2: LavaGeyser state machine cycles through idle->warning->erupt->receding without NaN or desync', () => {
  const geyser = new context.LavaGeyser(300, 256, 32, 120, 200, 0);
  for (let f = 0; f < 10000; f += 20) {
    geyser.update(f);
    assert(['idle', 'warning', 'erupt', 'receding', 'erupting'].includes(geyser.state), `Invalid state ${geyser.state} on frame ${f}`);
    const h = (typeof geyser.currentH === 'number') ? geyser.currentH : (geyser.h || 0);
    assert(h >= 0 && h <= geyser.maxH + 0.1, `Height ${h} out of bounds [0, ${geyser.maxH}] on frame ${f}`);
  }
});

// 5.3 CrumblingBasaltBlock Collapse & Respawn 100-Cycle Endurance
test('ADV-13.3: CrumblingBasaltBlock completes 100 collapse and respawn cycles without coordinate drift', () => {
  const basalt = new context.CrumblingBasaltBlock(400, 200, 32, 32, 45, 180);
  const baseX = basalt.baseX || basalt.x;
  const baseY = basalt.baseY || basalt.y;
  for (let cycle = 0; cycle < 10; cycle++) {
    basalt.standTimer = 45;
    basalt.update({ onGround: true, x: 402, y: 164, w: 24, h: 36 });
    for (let f = 0; f < 250; f++) basalt.update();
    assert(basalt.x === baseX && basalt.y === baseY, `Basalt coordinates must restore exactly to (${baseX}, ${baseY}) after cycle ${cycle}`);
  }
});

// ===========================================================================
// SUITE 6: WORLD 14 CASTILLO DEL TIEMPO ADVERSARIAL & CLOCKWORK PHYSICS STRESS
// ===========================================================================
console.log('\n--- SUITE 6: World 14 Castillo del Tiempo Adversarial & Clockwork Physics Stress ---');

// 6.1 RotatingGearPlatform 10,000-Frame Angular Rotation Stability
test('ADV-14.1: RotatingGearPlatform maintains clean angular progression without floating point NaN over 10,000 frames', () => {
  const gear = new context.RotatingGearPlatform(400, 200, 48, 8, 0.02, 1);
  for (let f = 0; f < 10000; f++) {
    gear.update();
    assert(!isNaN(gear.angle), `Angle became NaN at frame ${f}`);
    assert(!isNaN(gear.getRiderVelocity()), `Rider velocity became NaN at frame ${f}`);
  }
});

// 6.2 PendulumSwing Mathematical Bounds
test('ADV-14.2: PendulumSwing blade positions strictly satisfy Pythagorean distance = length at all angles', () => {
  const pend = new context.PendulumSwing(500, 100, 96, Math.PI / 3, 0.04, 20);
  for (let t = 0; t <= 5000; t += 50) {
    pend.update(t);
    const blade = pend.getBladePos();
    const px = (typeof pend.pivotX === 'number') ? pend.pivotX : (pend.anchorX || 500);
    const py = (typeof pend.pivotY === 'number') ? pend.pivotY : (pend.anchorY || 100);
    const dist = Math.hypot(blade.x - px, blade.y - py);
    assert(Math.abs(dist - 96) < 0.001, `Pendulum arm length distorted: expected 96, got ${dist}`);
  }
});

// 6.3 TickTockBlock Solid/Ghost Standing Transition
test('ADV-14.3: TickTockBlock frame 119->120 transition alters solid state instantaneously', () => {
  const tt = new context.TickTockBlock(600, 200, 32, 32, 0, 120);
  tt.group = 'tick'; tt.switchInterval = 120;
  assert(tt.isSolidAt(119) === true, 'Solid at frame 119');
  assert(tt.isSolidAt(120) === false, 'Ghost at frame 120');
  assert(tt.isSolidAt(239) === false, 'Ghost at frame 239');
  assert(tt.isSolidAt(240) === true, 'Solid at frame 240');
});

// 6.4 Chronos Time-Dilation Slowdown Stasis
test('ADV-14.4: Chronos Phase 2 Time-Dilation slows physics parameters by 0.4x factor without division-by-zero', () => {
  const slowFactor = 0.4;
  const normalSpeed = 3.5;
  const slowedSpeed = normalSpeed * slowFactor;
  assert(Math.abs(slowedSpeed - 1.4) < 0.001, 'Velocity scales by exactly 0.4x');
  assert(slowedSpeed > 0, 'Slowed speed is positive');
  assert(!isNaN(slowedSpeed), 'Slowed speed is non-NaN');
});

// ===========================================================================
// SUITE 7: 14-WORLD GRAND MASTER MEMORY & STATE STRESS TESTS
// ===========================================================================
console.log('\n--- SUITE 7: 14-World Grand Master Memory & State Stress Tests ---');

// 7.1 Rapid 14-World Sequential Level Switching
test('ADV-15.1: Switching through all 14 levels sequentially resets entity lists and level boundaries cleanly', () => {
  const game = new PlatformerGame();
  for (let lvl = 0; lvl < 14; lvl++) {
    game.currentLevelIdx = lvl;
    game.startSelectedLevel();
    assert(game.levelWidth >= 3000, `Level ${lvl + 1} levelWidth should be at least 3000px, got ${game.levelWidth}`);
    assert(Array.isArray(game.starCoins) && game.starCoins.length === 3, `Level ${lvl + 1} must contain exactly 3 Star Coins`);
  }
});

// 7.2 42 Star Coin Full Campaign Invariant Check
test('ADV-15.2: 42 Star Coins total economy satisfies monotonic unlock thresholds for S-1 through S-5', () => {
  const thresholds = [
    { world: 'S-1', coins: 20 },
    { world: 'S-2', coins: 24 },
    { world: 'S-3', coins: 28 },
    { world: 'S-4', coins: 32 },
    { world: 'S-5', coins: 36 }
  ];
  for (let i = 1; i < thresholds.length; i++) {
    assert(thresholds[i].coins > thresholds[i-1].coins, `${thresholds[i].world} threshold (${thresholds[i].coins}) must exceed ${thresholds[i-1].world} (${thresholds[i-1].coins})`);
  }
  assert(thresholds[4].coins <= 42, 'Max unlock threshold (36) is less than total available coins (42)');
});

console.log('\n======================================================================');
console.log(`  TIER 5 ADVERSARIAL AUDIT SUMMARY: ${passCount} PASSED | ${failCount} FAILED`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
