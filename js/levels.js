/**
 * Super Rivelles Peris World - Level & World System
 * Map definitions, tile arrays, spawner helpers and block interactions
 */

class Level {
  constructor(data) {
    this.name = data.name;
    this.worldId = data.worldId || 1;
    this.theme = data.theme || 'valley'; // valley, candy, cloud, lava
    this.tileSize = 32;
    this.widthInTiles = data.widthInTiles || 100;
    this.heightInTiles = data.heightInTiles || 14;
    this.map = data.map || [];

    this.playerSpawn = data.playerSpawn || { x: 60, y: 300 };
    this.bgm = data.bgm || 'world1';

    // Entities
    this.enemies = [];
    this.collectibles = [];
    this.movingPlatforms = [];
    this.projectiles = [];
    this.goal = null;
    this.boss = null;

    this.spawnData = data;
    this.resetEntities();
  }

  resetEntities() {
    this.enemies = [];
    this.collectibles = [];
    this.movingPlatforms = [];
    this.projectiles = [];
    this.goal = null;
    this.boss = null;

    // Deep clone map for breakable/question blocks
    this.tiles = JSON.parse(JSON.stringify(this.map));

    // Instantiate Enemies
    if (this.spawnData.enemies) {
      this.spawnData.enemies.forEach(e => {
        this.enemies.push(new Enemy(e.x * this.tileSize, e.y * this.tileSize, e.type));
      });
    }

    // Instantiate Collectibles
    if (this.spawnData.collectibles) {
      this.spawnData.collectibles.forEach(c => {
        this.collectibles.push(new Collectible(c.x * this.tileSize, c.y * this.tileSize, c.type));
      });
    }

    // Instantiate Moving Platforms
    if (this.spawnData.movingPlatforms) {
      this.spawnData.movingPlatforms.forEach(p => {
        this.movingPlatforms.push(new MovingPlatform(
          p.x * this.tileSize, p.y * this.tileSize,
          p.w * this.tileSize, p.h || 16,
          p.distX * this.tileSize, (p.distY || 0) * this.tileSize,
          p.speed || 1.2
        ));
      });
    }

    // Instantiate Goal or Boss
    if (this.spawnData.goal) {
      this.goal = new GoalPole(this.spawnData.goal.x * this.tileSize, this.spawnData.goal.y * this.tileSize);
    }

    if (this.spawnData.boss) {
      this.boss = new BossGromble(this.spawnData.boss.x * this.tileSize, this.spawnData.boss.y * this.tileSize);
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= this.widthInTiles || row < 0 || row >= this.heightInTiles) {
      return 0;
    }
    return this.tiles[row * this.widthInTiles + col] || 0;
  }

  setTile(col, row, tileType) {
    if (col < 0 || col >= this.widthInTiles || row < 0 || row >= this.heightInTiles) return;
    this.tiles[row * this.widthInTiles + col] = tileType;
  }

  hitBlock(col, row, player, particleEngine, soundEngine) {
    const tile = this.getTile(col, row);
    const blockX = col * this.tileSize;
    const blockY = row * this.tileSize;

    if (tile === 2) { // Question Mark Block
      this.setTile(col, row, 3); // Turn into empty block
      soundEngine.playCoin();

      // Spawn item or coin based on luck / level
      const itemTypes = ['coin', 'coin', 'mushroom', 'star', 'bubble', 'fire_flower'];
      const chosen = itemTypes[Math.floor(Math.random() * itemTypes.length)];

      if (chosen === 'coin') {
        window.gameEngine.addCoin();
        particleEngine.emit(blockX + 16, blockY, 8, {
          colors: ['#FFD700', '#FFF9C4'],
          shape: 'sparkle',
          speed: 3
        });
        particleEngine.addText("+100", blockX + 16, blockY - 10, '#FFD700');
      } else {
        this.collectibles.push(new Collectible(blockX + 4, blockY - 32, chosen));
        soundEngine.playPowerup();
      }
    } else if (tile === 4) { // Breakable Brick
      if (player.powerState === 'mega') {
        this.setTile(col, row, 0); // Smash brick!
        soundEngine.playStomp();
        particleEngine.emit(blockX + 16, blockY + 16, 12, {
          colors: ['#B71C1C', '#8D6E63'],
          speed: 4
        });
        particleEngine.addText("+50", blockX + 16, blockY, '#FFF');
        window.gameEngine.addScore(50);
      } else {
        soundEngine.playStomp();
        particleEngine.emit(blockX + 16, blockY + 16, 4, {
          color: '#B71C1C',
          speed: 1.5
        });
      }
    }
  }

  update(player, particleEngine, soundEngine) {
    // Update Moving Platforms
    for (const p of this.movingPlatforms) {
      p.update(player);
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this, player, particleEngine, soundEngine);
      if (!e.alive && !e.squashed) {
        this.enemies.splice(i, 1);
      }
    }

    // Update Boss
    if (this.boss && this.boss.alive) {
      this.boss.update(this, player, particleEngine, soundEngine);
    }

    // Update Collectibles
    for (const c of this.collectibles) {
      c.update(player, particleEngine, soundEngine);
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this, particleEngine, soundEngine);

      // Check collision with Enemies
      for (const enemy of this.enemies) {
        if (enemy.alive && Math.hypot(p.x - enemy.x, p.y - enemy.y) < 24) {
          enemy.defeat(particleEngine, soundEngine);
          p.life = 0;
          break;
        }
      }

      // Check collision with Boss
      if (this.boss && this.boss.alive && this.boss.hurtTimer === 0 && Math.hypot(p.x - this.boss.x - 32, p.y - this.boss.y - 32) < 36) {
        this.boss.takeHit(particleEngine, soundEngine);
        p.life = 0;
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Goal
    if (this.goal) {
      this.goal.update(player, soundEngine, particleEngine);
    }
  }

  render(ctx, camera) {
    const ts = this.tileSize;
    const offsetX = camera.getOffsetX();
    const offsetY = camera.getOffsetY();

    // Calculate visible tile range
    const startCol = Math.max(0, Math.floor(offsetX / ts));
    const endCol = Math.min(this.widthInTiles, Math.ceil((offsetX + camera.width) / ts) + 1);
    const startRow = Math.max(0, Math.floor(offsetY / ts));
    const endRow = Math.min(this.heightInTiles, Math.ceil((offsetY + camera.height) / ts) + 1);

    // Draw Map Tiles
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = this.getTile(c, r);
        if (tile > 0) {
          ProceduralRenderer.drawTile(ctx, tile, c * ts - offsetX, r * ts - offsetY, ts, ts, this.theme);
        }
      }
    }

    // Draw Moving Platforms
    for (const p of this.movingPlatforms) {
      p.render(ctx, camera);
    }

    // Draw Collectibles
    for (const c of this.collectibles) {
      c.render(ctx, camera);
    }

    // Draw Enemies
    for (const e of this.enemies) {
      e.render(ctx, camera);
    }

    // Draw Boss
    if (this.boss && this.boss.alive) {
      this.boss.render(ctx, camera);
    }

    // Draw Projectiles
    for (const p of this.projectiles) {
      p.render(ctx, camera);
    }

    // Draw Goal
    if (this.goal) {
      this.goal.render(ctx, camera);
    }
  }
}

/* Level Builder Helpers */
function buildLevel1() {
  const w = 110;
  const h = 14;
  const map = new Array(w * h).fill(0);

  const setT = (c, r, t) => { if (c >= 0 && c < w && r >= 0 && r < h) map[r * w + c] = t; };

  // Ground with pits
  for (let c = 0; c < w; c++) {
    if ((c >= 30 && c <= 33) || (c >= 55 && c <= 58) || (c >= 78 && c <= 80)) continue; // Pits
    setT(c, 12, 1);
    setT(c, 13, 1);
  }

  // Tutorial Question Blocks & Bricks
  setT(8, 8, 2);  // ? Coin
  setT(10, 8, 4); // Brick
  setT(12, 8, 2); // ? Power-up
  setT(14, 8, 4); // Brick

  // Green Pipes
  const makePipe = (col, height) => {
    for (let i = 0; i < height; i++) {
      setT(col, 11 - i, 7);
      setT(col + 1, 11 - i, 8);
    }
    setT(col, 12 - height, 5);
    setT(col + 1, 12 - height, 6);
  };

  makePipe(18, 2);
  makePipe(26, 3);
  makePipe(45, 2);
  makePipe(68, 3);

  // Trampoline
  setT(38, 11, 10);

  // High Platforms
  for (let c = 40; c <= 48; c++) setT(c, 7, 9);
  setT(44, 4, 2);

  // Castle Staircase
  for (let step = 0; step < 5; step++) {
    for (let r = 11 - step; r <= 11; r++) {
      setT(90 + step, r, 1);
    }
  }

  return new Level({
    name: "1-1: Sunshine Valley",
    worldId: 1,
    theme: "valley",
    widthInTiles: w,
    heightInTiles: h,
    map: map,
    playerSpawn: { x: 60, y: 320 },
    bgm: "world1",
    enemies: [
      { x: 14, y: 11, type: "beetle" },
      { x: 22, y: 11, type: "beetle" },
      { x: 35, y: 11, type: "snail" },
      { x: 50, y: 11, type: "flapper" },
      { x: 62, y: 11, type: "beetle" },
      { x: 74, y: 11, type: "snail" }
    ],
    collectibles: [
      { x: 8, y: 6, type: "coin" },
      { x: 10, y: 6, type: "coin" },
      { x: 12, y: 6, type: "coin" },
      { x: 20, y: 9, type: "star_coin" }, // Star Coin 1
      { x: 44, y: 3, type: "star_coin" }, // Star Coin 2
      { x: 70, y: 7, type: "star_coin" }  // Star Coin 3
    ],
    goal: { x: 100, y: 6 }
  });
}

function buildLevel2() {
  const w = 115;
  const h = 14;
  const map = new Array(w * h).fill(0);
  const setT = (c, r, t) => { if (c >= 0 && c < w && r >= 0 && r < h) map[r * w + c] = t; };

  // Candy Floor
  for (let c = 0; c < w; c++) {
    if ((c >= 22 && c <= 27) || (c >= 48 && c <= 54) || (c >= 70 && c <= 76)) continue;
    setT(c, 12, 1);
    setT(c, 13, 1);
  }

  // Bouncy Gummy Pads (Trampolines)
  setT(20, 11, 10);
  setT(46, 11, 10);
  setT(68, 11, 10);

  // Candy Cane Cloud Platforms
  for (let c = 28; c <= 36; c++) setT(c, 7, 9);
  for (let c = 55; c <= 63; c++) setT(c, 6, 9);

  return new Level({
    name: "2-1: Candy Wonderland",
    worldId: 2,
    theme: "candy",
    widthInTiles: w,
    heightInTiles: h,
    map: map,
    playerSpawn: { x: 60, y: 320 },
    bgm: "world2",
    enemies: [
      { x: 16, y: 11, type: "flapper" },
      { x: 32, y: 6, type: "flapper" },
      { x: 40, y: 11, type: "snail" },
      { x: 60, y: 5, type: "flapper" },
      { x: 80, y: 11, type: "beetle" }
    ],
    movingPlatforms: [
      { x: 23, y: 9, w: 3, distX: 2, speed: 1.2 },
      { x: 71, y: 8, w: 3, distX: 2.5, speed: 1.5 }
    ],
    collectibles: [
      { x: 24, y: 6, type: "star_coin" },
      { x: 58, y: 3, type: "star_coin" },
      { x: 73, y: 5, type: "star_coin" }
    ],
    goal: { x: 105, y: 6 }
  });
}

function buildLevel3() {
  const w = 120;
  const h = 14;
  const map = new Array(w * h).fill(0);
  const setT = (c, r, t) => { if (c >= 0 && c < w && r >= 0 && r < h) map[r * w + c] = t; };

  // Floating Island Cloud Formations
  for (let c = 0; c < 18; c++) { setT(c, 12, 1); setT(c, 13, 1); }
  for (let c = 24; c < 34; c++) setT(c, 10, 9);
  for (let c = 40; c < 50; c++) setT(c, 8, 9);
  for (let c = 56; c < 66; c++) setT(c, 6, 9);
  for (let c = 72; c < 82; c++) setT(c, 8, 9);
  for (let c = 90; c < 120; c++) { setT(c, 12, 1); setT(c, 13, 1); }

  setT(16, 11, 10); // Super Jump Trampoline

  return new Level({
    name: "3-1: Cloud Castle Sky",
    worldId: 3,
    theme: "cloud",
    widthInTiles: w,
    heightInTiles: h,
    map: map,
    playerSpawn: { x: 60, y: 320 },
    bgm: "world3",
    enemies: [
      { x: 28, y: 8, type: "flapper" },
      { x: 45, y: 6, type: "flapper" },
      { x: 61, y: 4, type: "flapper" },
      { x: 77, y: 6, type: "flapper" }
    ],
    movingPlatforms: [
      { x: 35, y: 9, w: 3, distX: 2, distY: 2, speed: 1.3 },
      { x: 67, y: 7, w: 3, distX: 2, distY: -2, speed: 1.3 }
    ],
    collectibles: [
      { x: 28, y: 7, type: "star_coin" },
      { x: 61, y: 3, type: "star_coin" },
      { x: 80, y: 5, type: "star_coin" }
    ],
    goal: { x: 110, y: 6 }
  });
}

function buildLevel4() {
  const w = 110;
  const h = 14;
  const map = new Array(w * h).fill(0);
  const setT = (c, r, t) => { if (c >= 0 && c < w && r >= 0 && r < h) map[r * w + c] = t; };

  // Lava Fortress
  for (let c = 0; c < 25; c++) { setT(c, 12, 1); setT(c, 13, 1); }
  for (let c = 32; c < 50; c++) { setT(c, 12, 1); setT(c, 13, 1); }
  // Boss Battle Arena Floor
  for (let c = 60; c < 110; c++) { setT(c, 12, 1); setT(c, 13, 1); }

  // Fortress Arena Walls
  for (let r = 0; r < 12; r++) {
    setT(60, r, 1);
    setT(108, r, 1);
  }

  return new Level({
    name: "4-1: Lava Lair & Boss Battle",
    worldId: 4,
    theme: "lava",
    widthInTiles: w,
    heightInTiles: h,
    map: map,
    playerSpawn: { x: 60, y: 320 },
    bgm: "world4",
    enemies: [
      { x: 18, y: 11, type: "beetle" },
      { x: 38, y: 11, type: "snail" }
    ],
    collectibles: [
      { x: 20, y: 9, type: "star_coin" },
      { x: 42, y: 9, type: "star_coin" },
      { x: 54, y: 7, type: "star" } // Invincible Star before Boss Arena
    ],
    boss: { x: 92, y: 10 }
  });
}

window.levelBuilders = [buildLevel1, buildLevel2, buildLevel3, buildLevel4];
