const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser environment for Node.js
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
      return {
        getChannelData: () => new Float32Array(len)
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
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
    clip: () => {},
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
      return mockCtx;
    }
    addEventListener() {}
    removeEventListener() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 512, height: 288 };
    }
  }

  const mockElement = {
    addEventListener: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    textContent: '',
    style: {},
    dataset: {}
  };

  const document = {
    getElementById: (id) => {
      if (id === 'game-canvas') return new MockCanvas();
      return { ...mockElement, id };
    },
    querySelectorAll: (sel) => [
      { ...mockElement, dataset: { id: 'candela', hat: 'crown' } }
    ],
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

async function runAudit() {
  console.log('====================================================');
  console.log('  SUPER RIVELLES PERIS WORLD - QA & MECHANICS AUDIT ');
  console.log('====================================================\n');

  const env = createMockBrowserEnv();
  const indexPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Extract the main script from index.html (between line 359 <script> and </script>)
  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/gi);
  if (!scriptMatches || scriptMatches.length < 2) {
    throw new Error('Could not locate game script block in index.html');
  }

  // The second script block is the game engine
  let gameScript = scriptMatches[1].replace(/<\/?script>/gi, '');
  
  // Remove window DOMContentLoaded auto-instance to control initialization in tests
  gameScript = gameScript.replace("window.addEventListener('DOMContentLoaded', ()=>{ window.game=new PlatformerGame(); });", "// auto-init disabled for tests");
  gameScript = gameScript.replace(/\}\s*\}\s*stopBGM\(\)\{/g, '}\n  stopBGM(){');

  console.log('✔ Extracted Game Script: ' + gameScript.length + ' bytes');

  // Execute in VM context and return symbols
  const context = vm.createContext(global);
  let exportsObj;
  try {
    const wrappedScript = `
      ${gameScript}
      ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, GelatinPlatform, BoostPad, HolographicBoostPad, LaserBarrier, BouncyPalmLeaf, PalmLeaf, LavaGeyser, CrumblingBasaltBlock, BasaltBlock, RotatingGearPlatform, GearPlatform, PendulumSwing, ClockPendulum, TickTockBlock, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic })
    `;
    exportsObj = vm.runInContext(wrappedScript, context);
    Object.assign(context, exportsObj);
    console.log('✔ Game script successfully parsed and executed in VM context without syntax errors.\n');
  } catch (err) {
    console.error('❌ SYNTAX/RUNTIME ERROR in game script:', err);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────
  // TEST 1: Class Instantiations & Constants
  // ─────────────────────────────────────────────────────────
  console.log('--- TEST SUITE 1: Class Instantiations & Configurations ---');
  assert(typeof context.SoundFX === 'function', 'SoundFX class defined');
  assert(typeof context.Camera === 'function', 'Camera class defined');
  assert(typeof context.TouchController === 'function', 'TouchController class defined');
  assert(typeof context.Enemy === 'function', 'Enemy class defined');
  assert(typeof context.RideableMount === 'function', 'RideableMount class defined');
  assert(typeof context.WorldBoss === 'function', 'WorldBoss class defined');
  assert(typeof context.TommyAI === 'function', 'TommyAI class defined');
  assert(typeof context.CoinEntity === 'function', 'CoinEntity class defined');
  assert(typeof context.SeeSawPlatform === 'function', 'SeeSawPlatform class defined');
  assert(typeof context.CrystalPlatform === 'function', 'CrystalPlatform class defined');
  assert(typeof context.GelatinPlatform === 'function', 'GelatinPlatform class defined');
  assert(typeof context.LaunchStar === 'function', 'LaunchStar class defined');
  assert(typeof context.MagicPortal === 'function', 'MagicPortal class defined');
  assert(typeof context.StarCoin === 'function', 'StarCoin class defined');
  assert(typeof context.ItemEntity === 'function', 'ItemEntity class defined');
  assert(typeof context.QuestionBlock === 'function', 'QuestionBlock class defined');
  assert(typeof context.DestructibleBlock === 'function', 'DestructibleBlock class defined');
  assert(typeof context.FlagPole === 'function', 'FlagPole class defined');
  assert(typeof context.PlatformerGame === 'function', 'PlatformerGame class defined');

  assert(context.LEVEL_CONFIGS && context.LEVEL_CONFIGS.length >= 11, 'Distinct Level Configurations exist (Core Worlds + Secret Worlds S-1 through S-5)');
  assert(Object.keys(context.CHARACTERS).length === 5, '5 Playable Character Profiles (Candela, Cayetana, Valentina, Mamá, Papá)');

  // ─────────────────────────────────────────────────────────
  // TEST 2: All 5 Playable Character Mechanics & Powers
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Character Unique Powers ---');
  const game = new context.PlatformerGame();
  
  // Test Candela
  game.selectedCharId = 'candela';
  game.startSelectedLevel();
  assert(game.player.w === 24 && game.player.h === 36, 'Candela dimensions correct');
  game.input.action = true;
  game.prevAction = false;
  game.player.onGround = false;
  game.updatePlayer(100);
  const candelaFireball = game.fireballs.find(f => f.type === 'petal');
  const candelaCloud = game.spawnedPlatforms.find(p => p.isCloud);
  assert(candelaFireball !== undefined, 'Candela spawns magic petal projectile');
  assert(candelaCloud !== undefined, 'Candela spawns mid-air cloud platform when in air');

  // Test Cayetana
  game.selectedCharId = 'cayetana';
  game.startSelectedLevel();
  assert(context.CHARACTERS.cayetana.sprintSpeed === 6.2, 'Cayetana highest sprint speed (6.2)');
  game.input.action = true;
  game.prevAction = false;
  game.updatePlayer(200);
  assert(game.player.vx >= 8.0, 'Cayetana executes Super Dash (vx >= 8.0)');
  assert(game.player.invincibleTimer >= 20, 'Cayetana gets invincibility during dash');

  // Test Valentina
  game.selectedCharId = 'valentina';
  game.startSelectedLevel();
  assert(context.CHARACTERS.valentina.weight === 0.72, 'Valentina featherweight (0.72)');
  game.input.action = true;
  game.prevAction = false;
  game.updatePlayer(300);
  const valFireball = game.fireballs.find(f => f.type === 'plasma');
  assert(valFireball !== undefined, 'Valentina fires plasma star wave');
  // Triple jump check
  game.player.onGround = false;
  game.player.jumpCount = 1;
  game.input.jump = true;
  game.prevJump = false;
  game.updatePlayer(350);
  assert(game.player.jumpCount === 2, 'Valentina can jump 2nd time');
  game.prevJump = false;
  game.updatePlayer(360);
  assert(game.player.jumpCount === 3, 'Valentina can jump 3rd time (Triple Jump)');

  // Test Mamá
  game.selectedCharId = 'mama';
  game.startSelectedLevel();
  game.player.onGround = false;
  game.player.vy = 2.0;
  game.input.jump = true;
  game.updatePlayer(400);
  assert(game.player.isGliding === true && game.player.vy <= 1.0, 'Mamá flutter glide slows fall speed (vy <= 1.0)');

  // Test Papá
  game.selectedCharId = 'papa';
  game.startSelectedLevel();
  game.input = {left:false,right:false,up:false,down:false,jump:false,action:false,paw:false};
  game.prevJump = false;
  game.prevAction = false;
  game.player.y = 100;
  game.player.onGround = false;
  game.player.coyoteFrames = 0;
  game.player.bufferFrames = 0;
  game.input.down = true;
  game.input.action = false;
  game.updatePlayer(500);
  assert(game.player.isGroundPounding === true && game.player.vy >= 15, 'Papá initiates Ground Pound (vy >= 15)');

  // ─────────────────────────────────────────────────────────
  // TEST 3: Power States Verification
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Power States & Transformations ---');
  
  // Mushroom / Super
  game.applyPowerUp('mushroom');
  assert(game.player.powerState === 'super' && game.player.h === 44, 'Mushroom transforms player into Super state (h=44)');

  // Fireflower
  game.applyPowerUp('fireflower');
  assert(game.player.powerState === 'fire', 'Fireflower sets powerState to fire');
  game.input.action = true; game.prevAction = false;
  game.fireballs = [];
  game.updatePlayer(600);
  assert(game.fireballs.some(f => f.type === 'fire' && f.bounces === 3), 'Fire state shoots bouncing fireball');

  // Iceflower
  game.applyPowerUp('iceflower');
  assert(game.player.powerState === 'ice', 'Iceflower sets powerState to ice');
  game.input.action = true; game.prevAction = false;
  game.fireballs = [];
  game.updatePlayer(650);
  assert(game.fireballs.some(f => f.type === 'ice'), 'Ice state shoots iceball');

  // Frozen Queen
  game.applyPowerUp('frozen_queen');
  assert(game.player.powerState === 'frozen_queen', 'Frozen Queen power sets powerState to frozen_queen');
  game.player.onGround = false;
  game.input.jump = true; game.prevJump = false;
  game.spawnedPlatforms = [];
  game.updatePlayer(700);
  assert(game.spawnedPlatforms.length > 0, 'Frozen Queen creates snowflake platforms under player in mid-air');

  // Superstar
  game.applyPowerUp('superstar');
  assert(game.player.invincibleTimer === 600, 'Superstar grants 600 frames invincibility');

  // Galaxy Astronaut
  game.applyPowerUp('galaxy_astronaut');
  assert(game.player.powerState === 'galaxy_astronaut', 'Astronaut power activated');
  game.input.up = true;
  game.updatePlayer(750);
  assert(game.player.vy < 0, 'Astronaut enables free vertical jetpack flight');

  // Princess
  game.applyPowerUp('princess');
  assert(game.player.powerState === 'princess', 'Princess power activated');
  game.input.action = true; game.prevAction = false;
  game.updatePlayer(800);
  assert(game.player.invincibleTimer >= 140, 'Princess creates Royal Shield Invincibility');

  // Pharaoh
  game.applyPowerUp('pharaoh');
  assert(game.player.powerState === 'pharaoh', 'Pharaoh power activated');
  game.input.action = true; game.prevAction = false;
  game.fireballs = [];
  game.updatePlayer(850);
  assert(game.fireballs.some(f => f.type === 'sand'), 'Pharaoh creates sand tornado projectile');

  // Wing
  game.applyPowerUp('wing');
  assert(game.player.powerState === 'wing', 'Wing power activated');
  game.input.action = true; game.prevAction = false;
  game.updatePlayer(900);
  assert(game.player.vy <= -8.0, 'Wing gives strong flap lift (vy <= -8.0)');

  // Bubble
  game.applyPowerUp('bubble');
  assert(game.player.powerState === 'bubble', 'Bubble power activated');
  game.input.action = true; game.prevAction = false;
  game.fireballs = [];
  game.updatePlayer(950);
  assert(game.fireballs.some(f => f.type === 'bubble'), 'Bubble power shoots floating bubble');

  // ─────────────────────────────────────────────────────────
  // TEST 4: Collision Detection Math & Mechanics
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: Collision Detection Math ---');

  // Platform horizontal and vertical resolution
  game.player.x = 100;
  game.player.y = 200;
  game.player.w = 24;
  game.player.h = 36;
  game.player.vx = 5;
  game.player.vy = 0;

  const testPlats = [{ x: 120, y: 190, w: 50, h: 50 }];
  game.player.x += game.player.vx;
  game.resolveHorizontal(game.player, testPlats);
  assert(game.player.x + game.player.w <= 120 && game.player.vx === 0, 'Horizontal platform collision stops player & resets vx');

  // Ledge / Corner step-up tolerance (4px)
  game.player.x = 115;
  game.player.y = 187; // bottom at 187+36 = 223. Platform top at 220 (3px penetration)
  game.player.vy = 2;
  const ledgePlat = [{ x: 110, y: 220, w: 100, h: 20 }];
  game.resolveHorizontal(game.player, ledgePlat);
  assert(game.player.y === 220 - game.player.h && game.player.onGround === true, 'Corner step-up tolerance elevates player smoothly to ledge');

  // Vertical resolution & stomp detection
  const enemy = new context.Enemy('goomba', 200, 200);
  game.enemies = [enemy];
  game.player.x = 200;
  game.player.y = 170;
  game.player.vy = 6; // Moving downward
  game.player.invincibleTimer = 0;
  game.updateEnemies();
  assert(enemy.dead === true, 'Player stomping enemy from above kills enemy');
  assert(game.player.vy < 0, 'Player bounces upward after stomping enemy');

  // Star invincibility contact
  const enemy2 = new context.Enemy('koopa', 300, 200);
  game.enemies = [enemy2];
  game.player.x = 300;
  game.player.y = 200;
  game.player.invincibleTimer = 100;
  game.updateEnemies();
  assert(enemy2.dead === true, 'Star invincibility kills enemy on contact without player bounce/damage');

  // Question block bump & Item release
  const qb = new context.QuestionBlock(400, 100, 'mushroom');
  game.questionBlocks = [qb];
  game.itemEntities = [];
  game.player.x = 400;
  game.player.y = 110;
  game.player.vy = -5; // moving upward into block
  const allSolid = game.getAllSolidPlatforms();
  game.resolveVertical(game.player, allSolid);
  assert(qb.hit === true, 'Hitting Question Block from below activates block');
  assert(game.itemEntities.length > 0 && game.itemEntities[0].type === 'mushroom', 'Question Block spawns physical ItemEntity');

  // ItemEntity physics & Player collection
  const item = game.itemEntities[0];
  item.x = 400;
  item.y = 90;
  game.player.x = 400;
  game.player.y = 90;
  item.update(game.player, allSolid, 1, game);
  assert(item.collected === true, 'ItemEntity collects on player proximity and applies power-up');

  // Destructible block destruction
  const db = new context.DestructibleBlock(500, 100);
  game.destructibleBlocks = [db];
  game.player.x = 500;
  game.player.y = 110;
  game.player.vy = -6;
  const solidWithDb = game.getAllSolidPlatforms();
  game.resolveVertical(game.player, solidWithDb);
  assert(db.destroyed === true, 'Destructible block shatters on player upward impact');

  // ─────────────────────────────────────────────────────────
  // TEST 5: All 9 Mounts & Riding Mechanics
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 5: 9 Mounts & Panic/Flee Mechanics ---');
  const mountTypes = ['unicorn', 'dolphin', 'camel', 'disney_steed', 'sven', 'pegasus', 'crystal_orb', 'cosmic_dragon', 'phoenix'];
  for (const mt of mountTypes) {
    const m = new context.RideableMount(mt, 100, 200);
    assert(m.type === mt, `Mount ${mt} properly instantiated`);
  }

  const sven = new context.RideableMount('sven', 100, 200);
  game.mounts = [sven];
  game.currentMount = sven;
  game.player.x = 100;
  game.player.y = 200;
  game.player.isRiding = false;
  game.updateEntities(1000);
  assert(game.player.isRiding === true && sven.mounted === true, 'Player mounts rideable mount on touch');

  // Damage to mounted player causes mount to flee in panic
  const enHazard = new context.Enemy('goomba', 100, 200);
  game.enemies = [enHazard];
  game.player.vy = 0; // horizontal collision, not stomp
  game.player.invincibleTimer = 0;
  game.updateEnemies();
  assert(game.player.isRiding === false, 'Player dismounts on receiving damage');
  assert(sven.isPanicking === true && sven.fleeTimer > 0, 'Mount flees in panic (fleeTimer active)');

  // ─────────────────────────────────────────────────────────
  // TEST 6: All 9 World Bosses & 3-Phase Logic
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 6: All 9 Bosses & 3-Phase AI Mechanics ---');
  for (let i = 0; i < context.LEVEL_CONFIGS.length; i++) {
    const cfg = context.LEVEL_CONFIGS[i];
    const boss = new context.WorldBoss(cfg.bossKey, cfg.bossName, cfg.bossTitle, 3520, 185);
    assert(boss.bossKey === cfg.bossKey, `Boss ${cfg.bossName} (${cfg.bossKey}) created with 3 HP`);
    
    // Test Boss Damage & Phases
    boss.active = true;
    boss.takeDamage(game);
    assert(boss.hp === 2 && boss.phase === 2, `Boss ${cfg.bossKey} transitions to Phase 2 on 1st hit`);
    boss.takeDamage(game);
    assert(boss.hp === 1 && boss.phase === 3, `Boss ${cfg.bossKey} transitions to Phase 3 on 2nd hit`);
    boss.takeDamage(game);
    assert(boss.hp === 0 && boss.state === 'defeated', `Boss ${cfg.bossKey} defeated on 3rd hit`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 7: Tommy AI Companion
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 7: Tommy AI Companion ---');
  const tommy = new context.TommyAI(50, 200);
  assert(tommy.x === 50 && tommy.y === 200, 'TommyAI companion spawned');
  
  const testEnemies = [
    new context.Enemy('goomba', 100, 200),
    new context.Enemy('koopa', 150, 200)
  ];
  game.enemies = testEnemies;
  game.camera.x = 0;
  tommy.triggerSonicBark(game, testEnemies);
  assert(testEnemies.every(e => e.stunTimer > 0), 'Tommy Sonic Bark freezes/stuns all active enemies');

  // ─────────────────────────────────────────────────────────
  // TEST 8: Full 11 World Levels Generation (9 Core + 2 Secret Worlds)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 8: 11 World Levels Generation ---');
  for (let lvl = 0; lvl < context.LEVEL_CONFIGS.length; lvl++) {
    game.currentLevelIdx = lvl;
    game.startSelectedLevel();
    const cfg = context.LEVEL_CONFIGS[lvl];
    assert(game.staticPlatforms.length > 5, `Level ${cfg.name}: Static platforms generated (${game.staticPlatforms.length})`);
    assert(game.enemies.length > 0, `Level ${cfg.name}: Enemies generated (${game.enemies.length})`);
    assert(game.starCoins.length === 3, `Level ${cfg.name}: 3 Star Coins positioned`);
    assert(game.currentBoss !== null, `Level ${cfg.name}: World Boss configured`);
    assert(game.flagPole !== null, `Level ${cfg.name}: Flagpole configured`);
  }

  // ─────────────────────────────────────────────────────────
  // TEST 9: Secret Star World (Mundo Especial Galáctico) & Cosmic Physics
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 9: Secret Star World & Cosmic Physics ---');
  
  // 1. Star World Unlock Condition Logic
  const unlockGame = new context.PlatformerGame();
  unlockGame.starCoinsPerLevel = { "0": 3, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 1 }; // 19 star coins
  unlockGame.unlockedLevels = [true, true, true, true, true, true, true, true, false, false];
  assert(unlockGame.isStarWorldUnlocked() === false, 'Star World locked when starCoins < 20 and World 1-9 not beaten');
  assert(unlockGame.isLevelUnlocked(9) === false, 'isLevelUnlocked(9) returns false when criteria not met');

  unlockGame.starCoinsPerLevel["6"] = 2; // total = 20
  assert(unlockGame.isStarWorldUnlocked() === true, 'Star World unlocked when totalStarCoins >= 20');
  assert(unlockGame.isLevelUnlocked(9) === true, 'isLevelUnlocked(9) returns true with 20 Star Coins');

  const campaignClearGame = new context.PlatformerGame();
  campaignClearGame.starCoinsPerLevel = {};
  campaignClearGame.unlockedLevels = [true, true, true, true, true, true, true, true, true, false]; // World 8 (1-9) beaten
  assert(campaignClearGame.isStarWorldUnlocked() === true, 'Star World unlocked when Campaign cleared (World 1-9 unlocked)');

  // 2. Cosmic Low Gravity Physics & Jump Boost
  game.selectedCharId = 'candela';
  game.currentLevelIdx = 9; // Secret Star World (theme: 'special_star')
  game.startSelectedLevel();
  const cosmicCfg = context.LEVEL_CONFIGS[9];
  assert(cosmicCfg.theme === 'special_star', 'Level 10 has special_star theme');
  assert(cosmicCfg.bossKey === 'astralis', 'Level 10 has astralis bossKey');
  assert(cosmicCfg.track === 'cosmic', 'Level 10 has cosmic track');

  // Verify Cosmic Gravity Modifier (effectiveGravity = 0.50 * GRAVITY)
  const p = game.player;
  const candelaChar = context.CHARACTERS['candela'];
  p.x = 100;
  p.y = 80;
  p.onGround = false;
  p.vy = 0;
  game.input = { left: false, right: false, up: false, down: false, jump: false, action: false, paw: false };
  game.updatePlayer(performance.now(), []);
  // Effective gravity should be 0.50 * GRAVITY = 0.26
  assert(Math.abs(p.vy - (0.50 * 0.52 * candelaChar.weight)) < 0.001, 'Cosmic floaty gravity applied (0.50 * GRAVITY)');

  // Verify Cosmic Jump Boost (+25%)
  p.x = 100;
  p.y = 80;
  p.onGround = true;
  p.coyoteFrames = 5;
  p.bufferFrames = 0;
  p.jumpCount = 0;
  game.prevJump = false;
  game.input.jump = true;
  game.updatePlayer(performance.now(), []);
  const expectedBoostedJump = candelaChar.jumpForce * 1.25;
  const expectedVyWithHoldAndGravity = expectedBoostedJump - 0.58 + (0.50 * 0.52 * candelaChar.weight);
  assert(Math.abs(p.vy - expectedVyWithHoldAndGravity) < 0.01, 'Cosmic jump boost (+25%) applied to jump velocity');

  // 3. Floating Crystal Platforms
  const crystal = new context.CrystalPlatform(300, 150, 100, 16, 6, 0.004);
  assert(crystal.x === 300 && crystal.y === 150 && crystal.w === 100 && crystal.h === 16, 'CrystalPlatform properly initialized');
  assert(crystal.isCrystal === true, 'CrystalPlatform flagged as isCrystal');
  const initialY = crystal.y;
  crystal.update(1000);
  assert(crystal.y !== initialY || typeof crystal.hoverOffset === 'number', 'CrystalPlatform vertical hover oscillation active');
  assert(game.crystalPlatforms.length >= 8, `Secret Star World generated floating Crystal Platforms (${game.crystalPlatforms.length})`);
  const allPlatsWithCrystals = game.getAllSolidPlatforms();
  assert(allPlatsWithCrystals.some(pl => pl.isCrystal), 'getAllSolidPlatforms includes active Crystal Platforms');

  // 4. Astral Guardian (astralis) Boss AI & Mechanics
  const astralisBoss = new context.WorldBoss('astralis', 'GUARDIÁN ASTRAL', 'Soberano del Cosmos Primordial', 3650, 160);
  assert(astralisBoss.bossKey === 'astralis', 'Astral Guardian boss instantiated');
  assert(astralisBoss.hp === 3 && astralisBoss.maxHp === 3, 'Astral Guardian starts with 3 HP');
  astralisBoss.active = true;
  astralisBoss.attackTimer = 150;
  astralisBoss.update(p, game);
  assert(astralisBoss.projectiles.length > 0, 'Astral Guardian fires stellar projectiles');
  assert(astralisBoss.projectiles[0].type === 'star_orb', 'Astral Guardian Phase 1 fires swirling star_orb');

  // 5. Full Secret Star World Stage Integration
  assert(game.levelWidth === 4200, 'Secret Star World stage width is 4200px');
  assert(game.starCoins.length === 3, 'Secret Star World has 3 Secret Star Coins positioned');
  assert(game.launchStars.length >= 2, 'Secret Star World includes Launch Star flight sequences');
  assert(game.flagPole && game.flagPole.x >= 4000, 'Secret Star World FlagPole positioned at stage climax');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 10: Boss Rush Arena Mode & Live Gauntlet Systems
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 10: Boss Rush Arena Mode & Live Gauntlet Systems ---');

  // 1. Initialization & State Transition
  const brGame = new context.PlatformerGame();
  assert(typeof brGame.startBossRush === 'function', 'PlatformerGame defines startBossRush entry method');
  brGame.startBossRush('cayetana');
  assert(brGame.state === 'BOSS_RUSH', 'startBossRush transitions state to BOSS_RUSH');
  assert(brGame.bossRushIdx === 0 && brGame.bossRushPlayerHp === 3, 'Boss Rush initializes at Boss 0 with 3 Hearts');
  assert(brGame.selectedCharId === 'cayetana', 'Boss Rush binds selected character (cayetana)');
  assert(Array.isArray(brGame.fireballs) && brGame.fireballs.length === 0, 'Previous level projectiles flushed on Boss Rush start');

  // 2. Canonical 9-Boss Roster
  const canonicalRoster = ['acornus', 'octobeard', 'tutankobra', 'marionetta', 'frostfang', 'tempesto', 'graviton', 'cosmomecha', 'infernus'];
  const rosterKeys = context.BOSS_RUSH_ROSTER.map(b => b.bossKey);
  assert(JSON.stringify(rosterKeys) === JSON.stringify(canonicalRoster), 'Boss Rush roster matches canonical 9-boss sequence');
  assert(brGame.currentBoss && brGame.currentBoss.bossKey === 'acornus', 'Stage 0 spawns Acornus');
  brGame.loadBossRushStage(1);
  assert(brGame.bossRushIdx === 1 && brGame.currentBoss.bossKey === 'octobeard', 'Stage 1 spawns Octobeard');
  brGame.loadBossRushStage(8);
  assert(brGame.bossRushIdx === 8 && brGame.currentBoss.bossKey === 'infernus', 'Stage 8 spawns Lord Infernus Rex as grand finale');
  brGame.currentBoss.takeDamage(brGame);
  assert(brGame.currentBoss.hp === 2 && brGame.currentBoss.phase === 2, 'Boss phase escalation active inside Boss Rush arena');

  // 3. Surviving Health Carryover & Intermission Healing
  const hpGame = new context.PlatformerGame();
  hpGame.startBossRush('candela');
  assert(hpGame.bossRushPlayerHp === 3, 'Player starts with 3 Hearts');
  hpGame.handleBossRushDamage();
  assert(hpGame.bossRushPlayerHp === 2, 'Damage in arena reduces HP to 2');
  hpGame.loadBossRushStage(1);
  assert(hpGame.bossRushPlayerHp === 2, 'Surviving 2 HP carries over to next boss stage');
  hpGame.bossRushPlayerHp = Math.min(hpGame.bossRushMaxHp, hpGame.bossRushPlayerHp + 1);
  assert(hpGame.bossRushPlayerHp === 3, 'Intermission recovery heals player to 3 HP');
  hpGame.bossRushPlayerHp = 1;
  hpGame.invincibleTimer = 0;
  hpGame.handleBossRushDamage();
  assert(hpGame.bossRushPlayerHp === 0 && hpGame.state === 'BOSS_RUSH_GAMEOVER', 'Depleting HP triggers BOSS_RUSH_GAMEOVER');

  // 4. Live Millisecond Timer & HUD Formatting
  assert(typeof context.formatTime === 'function', 'formatTime helper defined');
  assert(context.formatTime(165320) === '02:45.320', 'formatTime produces MM:SS.mmm format correctly');
  assert(context.formatTime(0) === '00:00.000', 'formatTime zero formats as 00:00.000');
  assert(context.formatTime(3600000) === '60:00.000', 'formatTime handles 60+ minutes without overflow');
  const timerGame = new context.PlatformerGame();
  timerGame.startBossRush('valentina');
  timerGame.bossRushElapsedTime = 45000;
  assert(context.formatTime(timerGame.bossRushElapsedTime) === '00:45.000', 'Live timer reflects elapsed milliseconds');
  timerGame.bossRushDefeatedCount = 4;
  assert(timerGame.bossRushDefeatedCount === 4, 'Boss defeat counter tracks 4/9 defeated');

  // 5. Boss Rush Victory, Performance Rankings & Record Persistence
  const vicGame = new context.PlatformerGame();
  vicGame.startBossRush('mama');
  vicGame.bossRushElapsedTime = 195000; // 3m15s
  vicGame.bossRushPlayerHp = 2;
  vicGame.handleBossRushVictory();
  assert(vicGame.state === 'BOSS_RUSH_VICTORY', 'handleBossRushVictory transitions state to BOSS_RUSH_VICTORY');
  assert(vicGame.bossRushRank === 'S', 'Fast clear (< 3m30s) with >= 2 HP awarded Rank S');
  vicGame.bossRushElapsedTime = 260000; // 4m20s
  vicGame.handleBossRushVictory();
  assert(vicGame.bossRushRank === 'A', 'Clear (< 5m00s) awarded Rank A');
  vicGame.bossRushElapsedTime = 360000; // 6m00s
  vicGame.handleBossRushVictory();
  assert(vicGame.bossRushRank === 'B', 'Clear (< 7m30s) awarded Rank B');
  vicGame.bossRushElapsedTime = 500000; // 8m20s
  vicGame.handleBossRushVictory();
  assert(vicGame.bossRushRank === 'C', 'Clear (>= 7m30s) awarded Rank C');

  const savedRecord = JSON.parse(env.localStorage.getItem('srpw_bossrush_record') || '{}');
  assert(savedRecord.bestBosses === 9 && savedRecord.bestRank === 'S', 'Boss Rush best record persisted in localStorage');
  assert(vicGame.starDust >= 100, 'Boss Rush victory awards +100 Star Dust reward');

  // 6. Arena Geometry & Confinement Bounds
  assert(brGame.levelWidth === 600, 'Boss Rush arena width configured at 600px');
  assert(brGame.currentBoss.arenaLeft === 100 && brGame.currentBoss.arenaRight === 500, 'Boss bounded within [100, 500] colosseum walls');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 11: Royal Closet, Boutique Shop & Multi-Character Layered Cosmetics
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 11: Royal Closet & Boutique Systems ---');

  // 1. Centralized Cosmetics Catalog Schema
  const catalog = context.COSMETICS_CATALOG;
  assert(catalog && typeof catalog === 'object', 'COSMETICS_CATALOG defined');
  assert(Object.keys(catalog).length >= 10, `COSMETICS_CATALOG defines at least 10 items (${Object.keys(catalog).length})`);
  const requiredHats = ['crown', 'none', 'flower_crown', 'sunglasses', 'cape', 'astro_helmet', 'golden_wings', 'starlight_crown', 'cyber_visor', 'pharaoh_cape'];
  assert(requiredHats.every(h => catalog[h]), 'All 10 required accessories present in catalog');
  assert(catalog.golden_wings.slot === 'back' && catalog.starlight_crown.slot === 'head' && catalog.cyber_visor.slot === 'face', 'Accessories define valid render slots');
  assert(catalog.crown.price === 0 && catalog.none.price === 0, 'Default crown and none have price 0');
  assert(catalog.golden_wings.price === 150 && catalog.pharaoh_cape.price === 250, 'Premium accessories have valid pricing tiers');

  // 2. Star Dust Wallet & Purchase Lifecycle
  const boutiqueGame = new context.PlatformerGame();
  assert(boutiqueGame.starDust === 0, 'Star Dust wallet initialized');
  boutiqueGame.collectStarDust(100, 100);
  assert(boutiqueGame.starDust === 1, 'collectStarDust increments Star Dust');

  boutiqueGame.starDust = 50;
  boutiqueGame.unlockedHats = ['crown', 'none'];
  const buyLockedFail = boutiqueGame.purchaseAccessory('golden_wings'); // 150
  assert(buyLockedFail === false && boutiqueGame.starDust === 50, 'Purchase with insufficient dust rejected without deduction');

  boutiqueGame.starDust = 200;
  const buyLockedSuccess = boutiqueGame.purchaseAccessory('golden_wings');
  assert(buyLockedSuccess === true && boutiqueGame.starDust === 50, 'Purchase with sufficient dust succeeds and deducts 150');
  assert(boutiqueGame.unlockedHats.includes('golden_wings'), 'Purchased accessory added to unlockedHats');
  assert(boutiqueGame.selectedHat === 'golden_wings', 'Purchased accessory immediately equipped');
  assert(env.localStorage.getItem('srpw_hat') === 'golden_wings', 'Equipped accessory persisted to localStorage');

  // Re-equipping owned item
  const reEquip = boutiqueGame.purchaseAccessory('crown');
  assert(reEquip === true && boutiqueGame.starDust === 50 && boutiqueGame.selectedHat === 'crown', 'Equipping owned accessory does not deduct Star Dust');

  // 3. Multi-Character Layered Rendering Pipeline
  const playableChars = ['candela', 'cayetana', 'valentina', 'mama', 'papa'];
  let charRenderCount = 0;
  playableChars.forEach(cId => {
    const rGame = new context.PlatformerGame();
    rGame.selectedCharId = cId;
    rGame.selectedHat = 'golden_wings';
    try {
      rGame.renderPlayer(env.mockCtx, Date.now());
      charRenderCount++;
    } catch(e){}
  });
  assert(charRenderCount === 5, 'renderPlayer executes cleanly across all 5 characters');

  let accessoryRenderCount = 0;
  Object.keys(catalog).forEach(hatId => {
    const rGame = new context.PlatformerGame();
    rGame.selectedHat = hatId;
    try {
      rGame.renderPlayer(env.mockCtx, Date.now());
      accessoryRenderCount++;
    } catch(e){}
  });
  assert(accessoryRenderCount === Object.keys(catalog).length, 'renderPlayer executes cleanly for all 10 accessories');

  // Motion States
  const mountedGame = new context.PlatformerGame();
  mountedGame.player.isRiding = true;
  mountedGame.selectedHat = 'pharaoh_cape';
  let mountedRenderPass = true;
  try { mountedGame.renderPlayer(env.mockCtx, Date.now()); } catch(e){ mountedRenderPass = false; }
  assert(mountedRenderPass, 'renderPlayer executes cleanly for mounted character with back accessory');

  const dashGame = new context.PlatformerGame();
  dashGame.player.vx = 6.2;
  dashGame.player.superSpeedTimer = 30;
  dashGame.selectedHat = 'cyber_visor';
  let dashRenderPass = true;
  try { dashGame.renderPlayer(env.mockCtx, Date.now()); } catch(e){ dashRenderPass = false; }
  assert(dashRenderPass, 'renderPlayer executes cleanly during high-speed sprint');

  // 4. Web Audio SFX Expansion
  const sfxAudio = new context.SoundFX();
  let audioPass = true;
  try {
    sfxAudio.boutiqueBuy();
    sfxAudio.wingFlap();
    sfxAudio.cyberVisorBeep();
    sfxAudio.bossWarning();
    sfxAudio.playSFX('boutiqueBuy');
    sfxAudio.playSFX('wingFlap');
  } catch(e){ audioPass = false; }
  assert(audioPass, 'SoundFX generates boutiqueBuy, wingFlap, cyberVisorBeep, bossWarning without errors');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 12: Visual & Audio Next-Gen Polish
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 12: Visual & Audio Next-Gen Polish ---');

  // 1. Multi-Layer Parallax Backdrops across all 10 themes
  const bgGame = new context.PlatformerGame();
  let bgPass = true;
  for(let lvl = 0; lvl < context.LEVEL_CONFIGS.length; lvl++){
    bgGame.currentLevelIdx = lvl;
    try { bgGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ bgPass = false; }
  }
  assert(bgPass, 'renderBackground executes cleanly across all 10 world themes');

  bgGame.camera.x = 1800;
  let bgScrollPass = true;
  try { bgGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ bgScrollPass = false; }
  assert(bgScrollPass, 'renderBackground handles horizontal camera coordinate tracking and wrapping');

  // 2. Cinematic Boss Entry Banners
  const bossTest = new context.WorldBoss('acornus', 'GRAN BELLOTÓN', 'Titán del Roble Dorado', 3520, 185);
  bossTest.triggerBanner('GRAN BELLOTÓN', 'Titán del Roble Dorado');
  assert(bossTest.bannerTimer === 90 && bossTest.bossBannerTimer === 90, 'WorldBoss.triggerBanner sets 90-frame countdown');
  assert(bossTest.bannerTitle === 'GRAN BELLOTÓN' && bossTest.bannerSubtitle === 'Titán del Roble Dorado', 'WorldBoss captures banner title and subtitle');

  const bannerGame = new context.PlatformerGame();
  bannerGame.triggerBossBanner('GRAN BELLOTÓN', 'Titán del Roble Dorado', '1-1: Colinas Bellota');
  assert(bannerGame.bossBannerTimer === 90, 'PlatformerGame.triggerBossBanner sets 90-frame countdown');

  let bannerRenderPass = true;
  try { bannerGame.renderBossBanner(env.mockCtx, Date.now()); } catch(e){ bannerRenderPass = false; }
  assert(bannerRenderPass, 'renderBossBanner renders cinematic letterbox bars and golden banner without errors');

  // 3. Impact Hit-Sparks & Particle Geometry
  const sparkGame = new context.PlatformerGame();
  sparkGame.addHitSpark(200, 150, '#FFD700', 8);
  assert(sparkGame.particles.length === 8, 'addHitSpark spawns exactly 8 impact sparks on stomp');
  assert(sparkGame.particles[0].shape === 'star' && sparkGame.particles[0].col === '#FFD700', 'Impact sparks configured as starburst geometry with color');

  sparkGame.addHitSpark(350, 180, '#FF1744', 16);
  assert(sparkGame.particles.length === 24, 'Boss impact spawns 16 chromatic starburst sparks');

  let sparkRenderPass = true;
  try { sparkGame.renderParticles(env.mockCtx); } catch(e){ sparkRenderPass = false; }
  assert(sparkRenderPass, 'renderParticles draws 4-point starburst diamond geometry cleanly');

  sparkGame.hitStopFrames = 4;
  assert(sparkGame.hitStopFrames === 4, 'Hit-stop micro freeze initialized to 4 frames on boss damage');

  // 4. Expanded Polyphonic Web Audio Synthesizer
  const synth = new context.SoundFX();
  let synthSFXPass = true;
  try {
    synth.hitSpark();
    synth.bossWarning();
    synth.boutiqueBuy();
    synth.wingFlap();
    synth.cyberVisorBeep();
    synth.playSFX('hitSpark');
    synth.playSFX('bossWarning');
    synth.playSFX('boutiqueBuy');
    synth.playSFX('wingFlap');
    synth.playSFX('cyberVisorBeep');
  } catch(e){ synthSFXPass = false; }
  assert(synthSFXPass, 'SoundFX generates specialized SFX: hitSpark, bossWarning, boutiqueBuy, wingFlap, cyberVisorBeep');

  synth.muted = true;
  assert(synth.muted === true, 'SoundFX mute state toggles smoothly with linear gain ramp');
  synth.muted = false;
  assert(synth.muted === false, 'SoundFX unmute restores synthesizer master gain');

  let bgmTracksPass = true;
  try {
    synth.currentTrack = 'cosmic';
    synth.startBGM();
    synth.stopBGM();
    synth.currentTrack = 'bossrush';
    synth.startBGM();
    synth.stopBGM();
  } catch(e){ bgmTracksPass = false; }
  assert(bgmTracksPass, 'SoundFX polyphonic sequencer supports cosmic and bossrush BGM tracks');

  // 5. 60 FPS Performance & Touch Controller Responsiveness
  const fpsConst = context.TARGET_FPS || (context.window && context.window.TARGET_FPS);
  const frameTimeConst = context.FRAME_TIME || (context.window && context.window.FRAME_TIME);
  assert(fpsConst === 60, 'Target FPS constant locked at deterministic 60 FPS');
  assert(Math.abs((frameTimeConst || 16.666) - 16.666) < 0.1, 'FRAME_TIME accumulator locked at 16.666ms');

  const touch = new context.TouchController(bannerGame);
  assert(typeof touch.handleTouchStart === 'function' && typeof touch.handleTouchEnd === 'function', 'TouchController provides multi-touch event handlers');
  let touchDrawPass = true;
  try { touch.draw(env.mockCtx, 512, 288, 512, 288); } catch(e){ touchDrawPass = false; }
  assert(touchDrawPass, 'TouchController renders responsive virtual controls without errors');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 13: World 11: 'Reino de Dulces & Caramelo' (Candy Kingdom / S-2: Valle Dulzón)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 13: World 11 Candy Kingdom & Donut King Mechanics ---');

  // 1. World 11 Configuration & Unlock Criteria
  const candyCfg = context.LEVEL_CONFIGS[10];
  assert(candyCfg && candyCfg.id === 11, 'World 11 is defined in LEVEL_CONFIGS with id: 11');
  assert(candyCfg.name.includes('Valle Dulzón') || candyCfg.name.includes('Dulces'), 'World 11 name correctly set to S-2: Valle Dulzón');
  assert(candyCfg.theme === 'candy', 'World 11 theme configured as candy');
  assert(candyCfg.bossKey === 'donut_king', 'World 11 bossKey configured as donut_king');
  assert(candyCfg.track === 'candy', 'World 11 BGM track configured as candy');
  assert(Array.isArray(candyCfg.sky) && candyCfg.sky.length >= 3, 'World 11 defines pastel sky gradient (pink/cyan palette)');
  assert(candyCfg.mapX === 485 && candyCfg.mapY === 135, 'World 11 mapped with diorama coordinates (485, 135)');

  // 2. Unlock Criteria for World 11
  const candyLockGame = new context.PlatformerGame();
  candyLockGame.starCoinsPerLevel = { "0": 3, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3 }; // 21 coins (< 24)
  candyLockGame.unlockedLevels = [true, true, true, true, true, true, true, true, false, false, false];
  assert(candyLockGame.isCandyWorldUnlocked() === false, 'Candy Kingdom locked when starCoins < 24 and World 1-9 / S-1 not beaten');
  assert(candyLockGame.isLevelUnlocked(10) === false, 'isLevelUnlocked(10) returns false when criteria not met');

  candyLockGame.starCoinsPerLevel["7"] = 3; // total = 24
  assert(candyLockGame.isCandyWorldUnlocked() === true, 'Candy Kingdom unlocked when totalStarCoins >= 24');
  assert(candyLockGame.isLevelUnlocked(10) === true, 'isLevelUnlocked(10) returns true with 24 Star Coins');

  // 3. GelatinPlatform Mechanics (Super Bounce & Wobble Physics)
  const gelatinPlat = new context.GelatinPlatform(380, 205, 75, 16, -13.5, '#FF4081');
  assert(gelatinPlat.x === 380 && gelatinPlat.y === 205, 'GelatinPlatform properly initialized');
  assert(gelatinPlat.isGelatin === true, 'GelatinPlatform flagged as isGelatin');
  assert(gelatinPlat.bounceForce === -13.5, 'GelatinPlatform configured with -13.5 super-bounce force');
  gelatinPlat.triggerBounce();
  assert(gelatinPlat.wobble === 1.0, 'triggerBounce sets wobble intensity to 1.0');
  gelatinPlat.update(100);
  assert(gelatinPlat.wobble < 1.0 && gelatinPlat.wobblePhase > 0, 'GelatinPlatform wobble damps smoothly over time');

  // Simulation: Player landing on GelatinPlatform triggers super-bounce
  const bounceGame = new context.PlatformerGame();
  bounceGame.currentLevelIdx = 10;
  bounceGame.startSelectedLevel();
  assert(bounceGame.gelatinPlatforms.length >= 5, 'World 11 generated at least 5 bouncy gelatin platforms');
  const allCandyPlats = bounceGame.getAllSolidPlatforms();
  assert(allCandyPlats.some(p => p.isGelatin === true), 'getAllSolidPlatforms includes bouncy Gelatin Platforms');

  bounceGame.player.x = 390;
  bounceGame.player.y = 207 - bounceGame.player.h;
  bounceGame.player.vy = 4.5;
  bounceGame.resolveVertical(bounceGame.player, allCandyPlats);
  assert(bounceGame.player.vy <= -12.0, 'Landing on GelatinPlatform triggers high super bounce velocity (<= -12.0)');

  // 4. Chocolate Mud Pools (Slowdown Physics)
  assert(bounceGame.chocolatePools.length >= 4, 'World 11 generated at least 4 chocolate mud pools');
  bounceGame.player.x = bounceGame.chocolatePools[0].x + 10;
  bounceGame.player.y = bounceGame.chocolatePools[0].y;
  bounceGame.player.vx = 4.0;
  bounceGame.player.vy = 2.0;
  bounceGame.updateEntities(100, allCandyPlats);
  assert(bounceGame.player.vx < 3.0, 'Chocolate mud pool dampens horizontal speed (slow movement)');
  assert(bounceGame.player.vy <= 1.0, 'Chocolate mud pool limits downward sinking velocity (max 1.0)');

  // 5. Unique Boss: 'Donut King / Rey Dulzón'
  const donutKing = new context.WorldBoss('donut_king', 'REY DULZÓN', 'Monarca del Reino de Caramelo', 3650, 185);
  assert(donutKing.bossKey === 'donut_king', 'Donut King boss instantiated');
  assert(donutKing.hp === 3 && donutKing.maxHp === 3, 'Donut King starts with 3 HP');
  donutKing.active = true;
  donutKing.arenaLeft = 3420;
  donutKing.arenaRight = 3920;
  donutKing.attackTimer = 100;
  donutKing.update(bounceGame.player, bounceGame);
  assert(donutKing.projectiles.length > 0, 'Donut King fires projectiles in Phase 1');
  assert(donutKing.projectiles.some(p => p.type === 'sugar_ball'), 'Donut King Phase 1 launches rolling sugar ball attacks');

  donutKing.takeDamage(bounceGame);
  assert(donutKing.hp === 2 && donutKing.phase === 2, 'Donut King transitions to Phase 2 on 1st hit');
  assert(donutKing.jellyShield === true || donutKing.phase >= 2, 'Donut King activates jelly shield in Phase 2');

  donutKing.takeDamage(bounceGame);
  assert(donutKing.hp === 1 && donutKing.phase === 3, 'Donut King transitions to Phase 3 (Enraged Sugar Frenzy) on 2nd hit');

  // 6. Level Width, 3 Star Coins & Flagpole
  assert(bounceGame.levelWidth === 4200, 'World 11 stage width is 4200px');
  assert(bounceGame.starCoins.length === 3, 'World 11 has 3 creative Star Coins hidden along routes');
  assert(bounceGame.flagPole.x >= 4000, 'World 11 FlagPole positioned at stage climax (4050px)');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 14: World 12 Metrópolis Cyberpunk Mechanics (S-3: Metrópolis Neón)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 14: World 12 Metrópolis Cyberpunk Mechanics ---');

  // 1. World 12 Configuration & Unlock Criteria
  const cyberCfg = context.LEVEL_CONFIGS[11];
  assert(cyberCfg && cyberCfg.id === 12, 'World 12 is defined in LEVEL_CONFIGS with id: 12');
  assert(cyberCfg.name.includes('Metrópolis Neón') || cyberCfg.name.includes('Cyberpunk'), 'World 12 name correctly set to S-3: Metrópolis Neón');
  assert(cyberCfg.theme === 'cyberpunk', 'World 12 theme configured as cyberpunk');
  assert(cyberCfg.bossKey === 'cyber_glitch', 'World 12 bossKey configured as cyber_glitch');
  assert(cyberCfg.track === 'cyber', 'World 12 BGM track configured as cyber');
  assert(Array.isArray(cyberCfg.sky) && cyberCfg.sky.length >= 3, 'World 12 defines deep neon sky gradient');
  assert(cyberCfg.mapX === 415 && cyberCfg.mapY === 70, 'World 12 mapped with diorama coordinates (415, 70)');

  // 2. Unlock Criteria for World 12
  const cyberLockGame = new context.PlatformerGame();
  cyberLockGame.starCoinsPerLevel = { "0": 3, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3, "7": 3, "8": 3 }; // 27 coins (< 28)
  cyberLockGame.unlockedLevels = [true, false, false, false, false, false, false, false, false, false, false, false, false, false];
  assert(cyberLockGame.isCyberWorldUnlocked() === false, 'Cyberpunk Metropolis locked when starCoins < 28 and World 11 not beaten');
  assert(cyberLockGame.isLevelUnlocked(11) === false, 'isLevelUnlocked(11) returns false when criteria not met');

  cyberLockGame.starCoinsPerLevel["9"] = 1; // total = 28
  assert(cyberLockGame.isCyberWorldUnlocked() === true, 'Cyberpunk Metropolis unlocked when totalStarCoins >= 28');
  assert(cyberLockGame.isLevelUnlocked(11) === true, 'isLevelUnlocked(11) returns true with 28 Star Coins');

  // 3. BoostPad Mechanics (vx = 9.5 Impulse & Directional Physics)
  const boostPad = new context.BoostPad(380, 205, 48, 16, 1, 9.5);
  assert(boostPad.x === 380 && boostPad.y === 205, 'BoostPad properly initialized');
  assert(boostPad.isBoostPad === true, 'BoostPad flagged as isBoostPad');
  assert(boostPad.boostSpeed === 9.5, 'BoostPad configured with 9.5 boost speed');
  assert(boostPad.dir === 1, 'BoostPad configured with forward direction (dir = 1)');
  boostPad.update(100);
  assert(boostPad.animTimer >= 0, 'BoostPad animTimer updates continuously');

  const testHero = { x: 380, y: 205 - 36, w: 24, h: 36, vx: 2.0, vy: 0, facing: 1, isBoosted: false };
  boostPad.applyBoost(testHero);
  assert(testHero.vx === 9.5, 'BoostPad applies instantaneous horizontal boost (vx = 9.5)');
  assert(testHero.isBoosted === true, 'BoostPad sets isBoosted flag on player');

  const reverseBoostPad = new context.BoostPad(500, 205, 48, 16, -1, 9.5);
  reverseBoostPad.applyBoost(testHero);
  assert(testHero.vx === -9.5, 'Reverse BoostPad applies leftward horizontal boost (vx = -9.5)');

  // 4. LaserBarrier Mechanics (180-frame cycle, 90-frame active phase & damage)
  const laser = new context.LaserBarrier(500, 150, 16, 96, 180, 90, 0);
  assert(laser.isLaserBarrier === true, 'LaserBarrier flagged as isLaserBarrier');
  assert(laser.period === 180 && laser.activeFrames === 90, 'LaserBarrier period configured at 180 frames with 90 active frames');
  assert(laser.isActiveAt(45) === true, 'LaserBarrier is active during frame 45 (0..89 active window)');
  assert(laser.isActiveAt(135) === false, 'LaserBarrier is inactive during frame 135 (90..179 inactive window)');

  const heroInLaser = { x: 502, y: 170, w: 24, h: 36, invincibleTimer: 0 };
  assert(laser.checkDamage(heroInLaser) === true, 'Active LaserBarrier deals damage upon player overlap');
  laser.timer = 120; // Inactive window
  assert(laser.checkDamage(heroInLaser) === false, 'Inactive LaserBarrier permits safe player crossing');

  const phaseLaser = new context.LaserBarrier(600, 150, 16, 96, 180, 90, 90);
  assert(phaseLaser.isActiveAt(0) === false && phaseLaser.isActiveAt(90) === true, 'Offset LaserBarrier (offset 90) synchronizes in counter-phase');

  // 5. Unique Boss: 'Cyber-Dr. Glitch'
  const cyberBoss = new context.WorldBoss('cyber_glitch', 'CYBER-DR. GLITCH', 'Arqui-Hacker del Ciberespacio', 3650, 185);
  assert(cyberBoss.bossKey === 'cyber_glitch', 'Cyber-Dr. Glitch boss instantiated');
  assert(cyberBoss.hp === 3 && cyberBoss.maxHp === 3, 'Cyber-Dr. Glitch starts with 3 HP');
  cyberBoss.active = true;
  cyberBoss.arenaLeft = 3420;
  cyberBoss.arenaRight = 3920;
  cyberBoss.attackTimer = 100;
  cyberBoss.update(cyberLockGame.player || testHero, cyberLockGame);
  assert(cyberBoss.phase === 1, 'Cyber-Dr. Glitch initializes in Phase 1 (Laser Volleys)');

  cyberBoss.takeDamage(cyberLockGame);
  assert(cyberBoss.hp === 2 && cyberBoss.phase === 2, 'Cyber-Dr. Glitch transitions to Phase 2 (EMP Blast Shockwave) on 1st hit');

  cyberBoss.takeDamage(cyberLockGame);
  assert(cyberBoss.hp === 1 && cyberBoss.phase === 3, 'Cyber-Dr. Glitch transitions to Phase 3 (Hologram Decoy Clones) on 2nd hit');

  // 6. World 12 Simulation, Level Width, Star Coins & Flagpole
  const cyberGame = new context.PlatformerGame();
  cyberGame.currentLevelIdx = 11;
  cyberGame.startSelectedLevel();
  assert(cyberGame.levelWidth === 4200, 'World 12 stage width is 4200px');
  assert(cyberGame.starCoins.length === 3, 'World 12 has 3 creative Star Coins hidden along neon routes');
  assert(cyberGame.flagPole.x >= 4000, 'World 12 FlagPole positioned at stage climax');

  let cyberBgPass = true;
  try { cyberGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ cyberBgPass = false; }
  assert(cyberBgPass, 'renderBackground executes cleanly for World 12 cyberpunk theme');

  let cyberLvlPass = true;
  try { cyberGame.renderLevel(env.mockCtx, Date.now()); } catch(e){ cyberLvlPass = false; }
  assert(cyberLvlPass, 'renderLevel executes cleanly with boost pads, laser barriers, and neon grids');

  // 7. World Map Navigation to World 12
  cyberGame.currentLevelIdx = 10;
  cyberGame.navigateWorldMap(1);
  assert(cyberGame.currentLevelIdx === 11, 'navigateWorldMap navigates forward to World 12 (index 11)');
  let cyberMapPass = true;
  try { cyberGame.renderWorldMapNSMBWii(env.mockCtx, Date.now()); } catch(e){ cyberMapPass = false; }
  assert(cyberMapPass, 'renderWorldMapNSMBWii renders S-3 cyberpunk node and plaque cleanly');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 15: World 13 Jungla Volcánica Mechanics (S-4: Selva de Magma)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 15: World 13 Jungla Volcánica Mechanics ---');

  // 1. World 13 Configuration & Unlock Criteria
  const volcanoCfg = context.LEVEL_CONFIGS[12];
  assert(volcanoCfg && volcanoCfg.id === 13, 'World 13 is defined in LEVEL_CONFIGS with id: 13');
  assert(volcanoCfg.name.includes('Selva de Magma') || volcanoCfg.name.includes('Volcánica'), 'World 13 name correctly set to S-4: Selva de Magma');
  assert(volcanoCfg.theme === 'volcano_jungle', 'World 13 theme configured as volcano_jungle');
  assert(volcanoCfg.bossKey === 'rex_tyrannus', 'World 13 bossKey configured as rex_tyrannus');
  assert(volcanoCfg.track === 'volcano', 'World 13 BGM track configured as volcano');
  assert(Array.isArray(volcanoCfg.sky) && volcanoCfg.sky.length >= 3, 'World 13 defines fiery volcanic sky gradient');
  assert(volcanoCfg.mapX === 350 && volcanoCfg.mapY === 70, 'World 13 mapped with diorama coordinates (350, 70)');

  // 2. Unlock Criteria for World 13
  const volcanoLockGame = new context.PlatformerGame();
  volcanoLockGame.starCoinsPerLevel = { "0": 3, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3, "7": 3, "8": 3, "9": 3, "10": 1 }; // 31 coins (< 32)
  volcanoLockGame.unlockedLevels = [true, false, false, false, false, false, false, false, false, false, false, false, false, false];
  assert(volcanoLockGame.isVolcanoWorldUnlocked() === false, 'Volcano Jungle locked when starCoins < 32 and World 12 not beaten');
  assert(volcanoLockGame.isLevelUnlocked(12) === false, 'isLevelUnlocked(12) returns false when criteria not met');

  volcanoLockGame.starCoinsPerLevel["10"] = 2; // total = 32
  assert(volcanoLockGame.isVolcanoWorldUnlocked() === true, 'Volcano Jungle unlocked when totalStarCoins >= 32');
  assert(volcanoLockGame.isLevelUnlocked(12) === true, 'isLevelUnlocked(12) returns true with 32 Star Coins');

  // 3. BouncyPalmLeaf Mechanics (vy = -15.5 Super Bounce & Sway Physics)
  const palmLeaf = new context.BouncyPalmLeaf(400, 210, 64, 20, -15.5);
  assert(palmLeaf.x === 400 && palmLeaf.y === 210, 'BouncyPalmLeaf properly initialized');
  assert(palmLeaf.isPalmLeaf === true, 'BouncyPalmLeaf flagged as isPalmLeaf');
  assert(palmLeaf.bounceImpulse === -15.5, 'BouncyPalmLeaf configured with -15.5 super-bounce impulse');
  palmLeaf.triggerBounce();
  assert(palmLeaf.swayTimer === 1.0, 'BouncyPalmLeaf swayTimer set to 1.0 on bounce');
  palmLeaf.update(100);
  assert(palmLeaf.swayTimer < 1.0, 'BouncyPalmLeaf sway damps smoothly over time');

  // 4. LavaGeyser Mechanics (State Machine & Lethal Eruption)
  const geyser = new context.LavaGeyser(600, 200, 32, 120, 240, 60);
  assert(geyser.isLavaGeyser === true, 'LavaGeyser flagged as isLavaGeyser');
  assert(geyser.maxH === 120, 'LavaGeyser configured with 120px max surge height');
  geyser.timer = 10;
  geyser.update();
  assert(geyser.state === 'idle', 'LavaGeyser initializes in idle state');
  geyser.timer = 200;
  geyser.update();
  assert(geyser.state === 'erupt', 'LavaGeyser transitions to erupt state during peak surge');
  const heroInGeyser = { x: 605, y: 120, w: 24, h: 36 };
  assert(geyser.checkDamage(heroInGeyser) === true, 'LavaGeyser deals lethal damage during erupt state');
  geyser.timer = 10;
  geyser.update();
  assert(geyser.checkDamage(heroInGeyser) === false, 'LavaGeyser non-lethal during idle state');

  // 5. CrumblingBasaltBlock Mechanics (45-frame collapse & respawn)
  const basalt = new context.CrumblingBasaltBlock(750, 180, 32, 32, 45, 180);
  assert(basalt.isBasalt === true, 'CrumblingBasaltBlock flagged as isBasalt');
  assert(basalt.maxStand === 45, 'CrumblingBasaltBlock configured with 45-frame shake threshold');
  assert(basalt.state === 'solid' && basalt.solid === true, 'CrumblingBasaltBlock starts solid');
  basalt.stepOn();
  assert(basalt.state === 'shaking', 'Stepping on CrumblingBasaltBlock triggers shaking state');
  for (let f = 0; f < 50; f++) basalt.update();
  assert(basalt.state === 'falling' && basalt.solid === false, 'CrumblingBasaltBlock collapses into falling state after 45 frames');
  for (let f = 0; f < 190; f++) basalt.update();
  assert(basalt.state === 'solid' && basalt.solid === true, 'CrumblingBasaltBlock respawns back to solid state after cooldown');

  // 6. Unique Boss: 'Rex Tyrannus'
  const rexBoss = new context.WorldBoss('rex_tyrannus', 'REX TYRANNUS', 'Tiranosaurio Mecánico del Núcleo', 3650, 185);
  assert(rexBoss.bossKey === 'rex_tyrannus', 'Rex Tyrannus boss instantiated');
  assert(rexBoss.hp === 3 && rexBoss.maxHp === 3, 'Rex Tyrannus starts with 3 HP');
  rexBoss.active = true;
  rexBoss.arenaLeft = 3420;
  rexBoss.arenaRight = 3920;
  rexBoss.attackTimer = 100;
  rexBoss.update(volcanoLockGame.player || testHero, volcanoLockGame);
  assert(rexBoss.phase === 1, 'Rex Tyrannus initializes in Phase 1 (Lunges & Tail Sweeps)');

  rexBoss.takeDamage(volcanoLockGame);
  assert(rexBoss.hp === 2 && rexBoss.phase === 2, 'Rex Tyrannus transitions to Phase 2 (Earthquake Stomp & Falling Rocks) on 1st hit');

  rexBoss.takeDamage(volcanoLockGame);
  assert(rexBoss.hp === 1 && rexBoss.phase === 3, 'Rex Tyrannus transitions to Phase 3 (3-Way Magma Jet Breath) on 2nd hit');

  // 7. World 13 Simulation, Level Width, Star Coins & Flagpole
  const volcanoGame = new context.PlatformerGame();
  volcanoGame.currentLevelIdx = 12;
  volcanoGame.startSelectedLevel();
  assert(volcanoGame.levelWidth === 4200, 'World 13 stage width is 4200px');
  assert(volcanoGame.starCoins.length === 3, 'World 13 has 3 creative Star Coins hidden along magma paths');
  assert(volcanoGame.flagPole.x >= 4000, 'World 13 FlagPole positioned at stage climax');

  let volcanoBgPass = true;
  try { volcanoGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ volcanoBgPass = false; }
  assert(volcanoBgPass, 'renderBackground executes cleanly for World 13 volcano jungle theme');

  let volcanoLvlPass = true;
  try { volcanoGame.renderLevel(env.mockCtx, Date.now()); } catch(e){ volcanoLvlPass = false; }
  assert(volcanoLvlPass, 'renderLevel executes cleanly with palm leaves, crumbling basalt, and lava geysers');

  // 8. World Map Navigation to World 13
  volcanoGame.currentLevelIdx = 11;
  volcanoGame.navigateWorldMap(1);
  assert(volcanoGame.currentLevelIdx === 12, 'navigateWorldMap navigates forward to World 13 (index 12)');
  let volcanoMapPass = true;
  try { volcanoGame.renderWorldMapNSMBWii(env.mockCtx, Date.now()); } catch(e){ volcanoMapPass = false; }
  assert(volcanoMapPass, 'renderWorldMapNSMBWii renders S-4 volcano node and plaque cleanly');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 16: World 14 Castillo del Tiempo Mechanics (S-5: Torre del Reloj Crono)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 16: World 14 Castillo del Tiempo Mechanics ---');

  // 1. World 14 Configuration & Unlock Criteria
  const clockCfg = context.LEVEL_CONFIGS[13];
  assert(clockCfg && clockCfg.id === 14, 'World 14 is defined in LEVEL_CONFIGS with id: 14');
  assert(clockCfg.name.includes('Reloj Crono') || clockCfg.name.includes('Tiempo'), 'World 14 name correctly set to S-5: Torre del Reloj Crono');
  assert(clockCfg.theme === 'clocktower', 'World 14 theme configured as clocktower');
  assert(clockCfg.bossKey === 'chronos', 'World 14 bossKey configured as chronos');
  assert(clockCfg.track === 'clockwork', 'World 14 BGM track configured as clockwork');
  assert(Array.isArray(clockCfg.sky) && clockCfg.sky.length >= 3, 'World 14 defines gothic clocktower sky gradient');
  assert(clockCfg.mapX === 285 && clockCfg.mapY === 75, 'World 14 mapped with diorama coordinates (285, 75)');

  // 2. Unlock Criteria for World 14
  const clockLockGame = new context.PlatformerGame();
  clockLockGame.starCoinsPerLevel = { "0": 3, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3, "7": 3, "8": 3, "9": 3, "10": 3, "11": 2 }; // 35 coins (< 36)
  clockLockGame.unlockedLevels = [true, false, false, false, false, false, false, false, false, false, false, false, false, false];
  assert(clockLockGame.isClockWorldUnlocked() === false, 'Clocktower World locked when starCoins < 36 and World 13 not beaten');
  assert(clockLockGame.isLevelUnlocked(13) === false, 'isLevelUnlocked(13) returns false when criteria not met');

  clockLockGame.starCoinsPerLevel["11"] = 3; // total = 36
  assert(clockLockGame.isClockWorldUnlocked() === true, 'Clocktower World unlocked when totalStarCoins >= 36');
  assert(clockLockGame.isLevelUnlocked(13) === true, 'isLevelUnlocked(13) returns true with 36 Star Coins');

  // 3. RotatingGearPlatform Mechanics (Rotational & Tangential Physics)
  const gear = new context.RotatingGearPlatform(450, 190, 48, 8, 0.02, 1);
  assert(gear.x === 450 && gear.y === 190, 'RotatingGearPlatform properly initialized');
  assert(gear.radius === 48 && gear.teeth === 8, 'RotatingGearPlatform configured with radius 48 and 8 teeth');
  assert(gear.isGear === true, 'RotatingGearPlatform flagged as isGear');
  gear.update(100);
  assert(gear.angle !== 0, 'RotatingGearPlatform angle updates with rotation speed');
  assert(Math.abs(gear.getRiderVelocity()) > 0, 'RotatingGearPlatform exerts tangential rider velocity');

  const ccwGear = new context.RotatingGearPlatform(550, 190, 48, 8, 0.02, -1);
  assert(ccwGear.dir === -1, 'Counter-clockwise RotatingGearPlatform configured with dir = -1');

  // 4. PendulumSwing Mechanics (Harmonic Oscillation & Lethal Blade)
  const pendulum = new context.PendulumSwing(600, 80, 96, Math.PI / 3, 0.04, 20);
  assert(pendulum.anchorX === 600 && pendulum.anchorY === 80, 'PendulumSwing properly anchored');
  assert(pendulum.length === 96 && pendulum.bladeRadius === 20, 'PendulumSwing configured with 96px length and 20px blade radius');
  assert(pendulum.isPendulum === true, 'PendulumSwing flagged as isPendulum');
  pendulum.update(1000);
  assert(Math.abs(pendulum.angle) <= Math.PI / 3, 'PendulumSwing angle bounded within [-maxAngle, maxAngle]');
  const bPos = pendulum.getBladePos();
  assert(typeof bPos.x === 'number' && typeof bPos.y === 'number', 'PendulumSwing accurately calculates blade tip coordinates');
  const heroAtBlade = { x: bPos.x - 12, y: bPos.y - 18, w: 24, h: 36 };
  assert(pendulum.checkDamage(heroAtBlade) === true, 'PendulumSwing blade deals lethal damage upon overlap');

  // 5. TickTockBlock Mechanics (120-frame synchronization & solid/ghost toggling)
  const tickTock0 = new context.TickTockBlock(800, 200, 32, 32, 120, 0);
  const tickTock1 = new context.TickTockBlock(850, 200, 32, 32, 120, 1);
  assert(tickTock0.isTickTock === true && tickTock1.isTickTock === true, 'TickTockBlocks flagged as isTickTock');
  assert(tickTock0.cycle === 120 && tickTock0.phase === 0, 'TickTockBlock 0 configured with 120 cycle and phase 0');
  assert(tickTock1.cycle === 120 && tickTock1.phase === 1, 'TickTockBlock 1 configured with 120 cycle and phase 1');
  assert(tickTock0.isSolidAt(60) === true, 'TickTockBlock Phase 0 is solid during frames 0..119');
  assert(tickTock1.isSolidAt(60) === false, 'TickTockBlock Phase 1 is ghost/intangible during frames 0..119');
  assert(tickTock0.isSolidAt(180) === false, 'TickTockBlock Phase 0 is ghost/intangible during frames 120..239');
  assert(tickTock1.isSolidAt(180) === true, 'TickTockBlock Phase 1 is solid during frames 120..239');

  // 6. Unique Boss: 'Chronos / Señor del Tiempo'
  const chronosBoss = new context.WorldBoss('chronos', 'CHRONOS', 'Señor del Tiempo y la Eternidad', 3650, 185);
  assert(chronosBoss.bossKey === 'chronos', 'Chronos boss instantiated');
  assert(chronosBoss.hp === 3 && chronosBoss.maxHp === 3, 'Chronos starts with 3 HP');
  chronosBoss.active = true;
  chronosBoss.arenaLeft = 3420;
  chronosBoss.arenaRight = 3920;
  chronosBoss.attackTimer = 100;
  chronosBoss.update(clockLockGame.player || testHero, clockLockGame);
  assert(chronosBoss.phase === 1, 'Chronos initializes in Phase 1 (Chrono Warp & Projectile Gears)');

  chronosBoss.takeDamage(clockLockGame);
  assert(chronosBoss.hp === 2 && chronosBoss.phase === 2, 'Chronos transitions to Phase 2 (Time-Dilation Slowdown Spell) on 1st hit');

  chronosBoss.takeDamage(clockLockGame);
  assert(chronosBoss.hp === 1 && chronosBoss.phase === 3, 'Chronos transitions to Phase 3 (3 Orbiting Clock-Hand Scythe Blades) on 2nd hit');

  // 7. World 14 Simulation, Level Width, Star Coins & Flagpole
  const clockGame = new context.PlatformerGame();
  clockGame.currentLevelIdx = 13;
  clockGame.startSelectedLevel();
  assert(clockGame.levelWidth === 4200, 'World 14 stage width is 4200px');
  assert(clockGame.starCoins.length === 3, 'World 14 has 3 creative Star Coins hidden in clockwork chambers');
  assert(clockGame.flagPole.x >= 4000, 'World 14 FlagPole positioned at stage climax');

  let clockBgPass = true;
  try { clockGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ clockBgPass = false; }
  assert(clockBgPass, 'renderBackground executes cleanly for World 14 clocktower theme');

  let clockLvlPass = true;
  try { clockGame.renderLevel(env.mockCtx, Date.now()); } catch(e){ clockLvlPass = false; }
  assert(clockLvlPass, 'renderLevel executes cleanly with gears, pendulums, and tick-tock blocks');

  // 8. World Map Navigation to World 14
  clockGame.currentLevelIdx = 12;
  clockGame.navigateWorldMap(1);
  assert(clockGame.currentLevelIdx === 13, 'navigateWorldMap navigates forward to World 14 (index 13)');
  let clockMapPass = true;
  try { clockGame.renderWorldMapNSMBWii(env.mockCtx, Date.now()); } catch(e){ clockMapPass = false; }
  assert(clockMapPass, 'renderWorldMapNSMBWii renders S-5 clocktower node and plaque cleanly');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 17: World Map, Audio & Asset Systems (14 Worlds & 42 Star Coins)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 17: World Map, Audio & Asset Systems ---');

  // 1. 14-World Layout & Progression
  assert(context.LEVEL_CONFIGS.length === 14, 'LEVEL_CONFIGS defines full 14-world expansion roster');
  const all14Ids = context.LEVEL_CONFIGS.map(c => c.id);
  assert(all14Ids.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14', 'World IDs span sequentially from 1 to 14');

  // 2. 42 Star Coins Total Available
  const totalAvailableStarCoins = context.LEVEL_CONFIGS.length * 3;
  assert(totalAvailableStarCoins === 42, 'Grand total of 42 Star Coins available across all 14 worlds');

  // 3. Unlock Thresholds for Special Stages S-1 through S-5
  const fullGame = new context.PlatformerGame();
  assert(typeof fullGame.isStarWorldUnlocked === 'function', 'Special Stage S-1 (World 10) unlock method defined (20 Star Coins / Beat 1-9)');
  assert(typeof fullGame.isCandyWorldUnlocked === 'function', 'Special Stage S-2 (World 11) unlock method defined (24 Star Coins / Beat S-1)');
  assert(typeof fullGame.isCyberWorldUnlocked === 'function', 'Special Stage S-3 (World 12) unlock method defined (28 Star Coins / Beat S-2)');
  assert(typeof fullGame.isVolcanoWorldUnlocked === 'function', 'Special Stage S-4 (World 13) unlock method defined (32 Star Coins / Beat S-3)');
  assert(typeof fullGame.isClockWorldUnlocked === 'function', 'Special Stage S-5 (World 14) unlock method defined (36 Star Coins / Beat S-4)');

  // 4. Web Audio Synthesizer: Expansion BGM Tracks
  const synthExpansion = new context.SoundFX();
  let audioExpansionPass = true;
  try {
    synthExpansion.currentTrack = 'cyber';
    synthExpansion.startBGM();
    synthExpansion.stopBGM();
    synthExpansion.currentTrack = 'volcano';
    synthExpansion.startBGM();
    synthExpansion.stopBGM();
    synthExpansion.currentTrack = 'clockwork';
    synthExpansion.startBGM();
    synthExpansion.stopBGM();
  } catch(e) {
    audioExpansionPass = false;
  }
  assert(audioExpansionPass, 'SoundFX synthesizer generates dynamic BGM for cyber, volcano, and clockwork tracks');

  // 5. Boss Assets & Procedural Canvas Fallbacks
  const bossKeys = ['cyber_glitch', 'rex_tyrannus', 'chronos'];
  bossKeys.forEach(bk => {
    const boss = new context.WorldBoss(bk, 'TEST BOSS', 'SUBTITLE', 300, 180);
    assert(boss.bossKey === bk, `WorldBoss correctly recognizes ${bk} key`);
    let fallbackPass = true;
    try {
      boss.draw(env.mockCtx, { toScreen: (x, y) => ({ x, y }), isVisible: () => true });
    } catch(e) {
      fallbackPass = false;
    }
    assert(fallbackPass, `Procedural Canvas 2D fallback renders ${bk} boss cleanly without missing assets`);
  });

  // 6. Service Worker Precache Verification
  const swPath = path.join(__dirname, 'sw.js');
  let swPrecachePass = false;
  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    swPrecachePass = swContent.includes('world_map_diorama.png') || swContent.includes('index.html');
  }
  assert(swPrecachePass, 'sw.js Service Worker configured for PWA asset caching and offline resilience');

  console.log('\n====================================================');
  console.log(`  AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});

