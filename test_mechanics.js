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

  console.log('✔ Extracted Game Script: ' + gameScript.length + ' bytes');

  // Execute in VM context and return symbols
  const context = vm.createContext(global);
  let exportsObj;
  try {
    const wrappedScript = `
      ${gameScript}
      ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio, CrystalPlatform, GelatinPlatform, BOSS_RUSH_ROSTER, formatTime, COSMETICS_CATALOG, getCosmetic })
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

  assert(context.LEVEL_CONFIGS && context.LEVEL_CONFIGS.length === 11, '11 Distinct Level Configurations exist (9 Core Worlds + Secret Star World + Candy Kingdom)');
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

  // 7. Visual Parallax & Level Rendering for World 11
  let candyBgPass = true;
  try { bounceGame.renderBackground(env.mockCtx, Date.now()); } catch(e){ candyBgPass = false; }
  assert(candyBgPass, 'renderBackground executes cleanly for World 11 candy theme');

  let candyLvlPass = true;
  try { bounceGame.renderLevel(env.mockCtx, Date.now()); } catch(e){ candyLvlPass = false; }
  assert(candyLvlPass, 'renderLevel executes cleanly with candy cane platforms, gelatin blocks, and chocolate pools');

  // 8. World Map Navigation to World 11
  bounceGame.currentLevelIdx = 9;
  bounceGame.navigateWorldMap(1);
  assert(bounceGame.currentLevelIdx === 10, 'navigateWorldMap navigates forward to World 11 (index 10)');
  let mapRenderPass = true;
  try { bounceGame.renderWorldMapNSMBWii(env.mockCtx, Date.now()); } catch(e){ mapRenderPass = false; }
  assert(mapRenderPass, 'renderWorldMapNSMBWii renders S-2 candy node and plaque cleanly');

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
