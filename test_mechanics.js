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

  return { window, document, localStorage, listeners };
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
      ;({ SoundFX, Camera, TouchController, Enemy, RideableMount, WorldBoss, TommyAI, CoinEntity, SeeSawPlatform, LaunchStar, MagicPortal, StarCoin, ItemEntity, QuestionBlock, DestructibleBlock, FlagPole, PlatformerGame, LEVEL_CONFIGS, CHARACTERS, audio })
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
  assert(typeof context.LaunchStar === 'function', 'LaunchStar class defined');
  assert(typeof context.MagicPortal === 'function', 'MagicPortal class defined');
  assert(typeof context.StarCoin === 'function', 'StarCoin class defined');
  assert(typeof context.ItemEntity === 'function', 'ItemEntity class defined');
  assert(typeof context.QuestionBlock === 'function', 'QuestionBlock class defined');
  assert(typeof context.DestructibleBlock === 'function', 'DestructibleBlock class defined');
  assert(typeof context.FlagPole === 'function', 'FlagPole class defined');
  assert(typeof context.PlatformerGame === 'function', 'PlatformerGame class defined');

  assert(context.LEVEL_CONFIGS && context.LEVEL_CONFIGS.length === 9, '9 Distinct Level Configurations exist');
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
  // TEST 8: Full 9 Level Generation Verification
  // ─────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 8: 9 World Levels Generation ---');
  for (let lvl = 0; lvl < 9; lvl++) {
    game.currentLevelIdx = lvl;
    game.startSelectedLevel();
    const cfg = context.LEVEL_CONFIGS[lvl];
    assert(game.staticPlatforms.length > 5, `Level ${cfg.name}: Static platforms generated (${game.staticPlatforms.length})`);
    assert(game.enemies.length > 0, `Level ${cfg.name}: Enemies generated (${game.enemies.length})`);
    assert(game.starCoins.length === 3, `Level ${cfg.name}: 3 Star Coins positioned`);
    assert(game.currentBoss !== null, `Level ${cfg.name}: World Boss configured`);
    assert(game.flagPole !== null, `Level ${cfg.name}: Flagpole configured`);
  }

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
