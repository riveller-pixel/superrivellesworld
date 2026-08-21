/**
 * Super Rivelles Peris World - Main Game Coordinator
 * Canvas game loop, state management, level progression and persistence
 */

// Global settings
window.gameSettings = {
  kidMode: localStorage.getItem('srw_kid_mode') !== 'false', // Default true for kids!
  sfxVolume: parseFloat(localStorage.getItem('srw_sfx_vol')) || 0.7,
  musicVolume: parseFloat(localStorage.getItem('srw_music_vol')) || 0.45,
  vibration: localStorage.getItem('srw_vib') !== 'false'
};

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Virtual Internal Resolution (16:9 kid platformer aspect ratio)
    this.virtualWidth = 640;
    this.virtualHeight = 360;

    this.input = new InputManager();
    this.camera = new Camera(this.virtualWidth, this.virtualHeight);
    this.particleEngine = new ParticleSystem();

    // Game Progression State
    this.score = 0;
    this.coins = 0;
    this.starCoins = 0;
    this.lives = 3;
    this.selectedChar = 'leo';
    this.currentLevelIndex = 0;
    this.gameState = 'TITLE'; // TITLE, PLAYING, PAUSED, VICTORY, GAMEOVER

    this.level = null;
    this.player = null;

    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fixedStep = 1000 / 60; // 60 FPS fixed physics step
    this.bgFrame = 0;

    this.initCanvas();
    this.initLevelCards();
    this.bindEvents();

    // Start Game Loop
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  initCanvas() {
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  bindEvents() {
    // Start Game Button
    const startBtn = document.getElementById('btn-play-game');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        soundEngine.playClick();
        this.startGame(this.currentLevelIndex);
      });
    }

    // Victory Next Level Button
    const nextBtn = document.getElementById('btn-victory-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        soundEngine.playClick();
        uiManager.stopConfetti();
        uiManager.hideAllModals();
        const nextIndex = (this.currentLevelIndex + 1) % window.levelBuilders.length;
        this.startGame(nextIndex);
      });
    }

    // Try Again Button (Game Over)
    const retryBtn = document.getElementById('btn-retry-game');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        soundEngine.playClick();
        uiManager.hideAllModals();
        this.lives = 3;
        this.startGame(this.currentLevelIndex);
      });
    }

    // Pause Resume Button
    const resumeBtn = document.getElementById('btn-pause-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        soundEngine.playClick();
        this.togglePause();
      });
    }

    // Pause Quit Button
    const quitBtn = document.getElementById('btn-pause-quit');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        soundEngine.playClick();
        uiManager.hideAllModals();
        this.gameState = 'TITLE';
        soundEngine.startBgm('menu');
        uiManager.showModal('modal-title-menu');
      });
    }
  }

  initLevelCards() {
    const worldCards = document.querySelectorAll('.world-card');
    worldCards.forEach(card => {
      card.addEventListener('click', () => {
        const levelIdx = parseInt(card.dataset.levelIndex, 10);
        soundEngine.playClick();
        worldCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.startGame(levelIdx);
      });
    });
  }

  setSelectedCharacter(charType) {
    this.selectedChar = charType;
    if (this.player) {
      this.player.charType = charType;
      this.player.applyCharacterPerks();
    }
  }

  startGame(levelIndex = 0) {
    this.currentLevelIndex = levelIndex;
    uiManager.hideAllModals();
    uiManager.stopConfetti();

    // Build fresh level
    this.level = window.levelBuilders[this.currentLevelIndex]();
    this.player = new Player(this.level.playerSpawn.x, this.level.playerSpawn.y, this.selectedChar);
    this.camera.follow(this.player, this.level.widthInTiles * this.level.tileSize, this.level.heightInTiles * this.level.tileSize);
    this.particleEngine.clear();

    this.gameState = 'PLAYING';
    soundEngine.startBgm(this.level.bgm);

    uiManager.updateHUD({
      score: this.score,
      coins: this.coins,
      starCoins: this.starCoins,
      lives: this.lives,
      currentLevelName: this.level.name
    });
    uiManager.updateKidModeBadge();
  }

  addScore(pts) {
    this.score += pts;
    uiManager.updateHUD({
      score: this.score,
      coins: this.coins,
      starCoins: this.starCoins,
      lives: this.lives,
      currentLevelName: this.level.name
    });
  }

  addCoin() {
    this.coins++;
    this.addScore(100);
    if (this.coins >= 100) {
      this.coins = 0;
      this.lives++;
      soundEngine.playStar();
    }
  }

  addStarCoin() {
    this.starCoins++;
    this.addScore(1000);
  }

  handlePlayerDeath() {
    this.lives--;
    if (this.lives <= 0) {
      this.gameState = 'GAMEOVER';
      soundEngine.stopBgm();
      uiManager.showModal('modal-gameover');
    } else {
      // Respawn at level start
      this.player = new Player(this.level.playerSpawn.x, this.level.playerSpawn.y, this.selectedChar);
      this.player.invulnerableTimer = 120;
    }
    uiManager.updateHUD({
      score: this.score,
      coins: this.coins,
      starCoins: this.starCoins,
      lives: this.lives,
      currentLevelName: this.level.name
    });
  }

  triggerLevelWin() {
    this.gameState = 'VICTORY';
    this.player.state = 'win';
    soundEngine.stopBgm();

    // Mark world completed in storage
    localStorage.setItem(`srw_world_${this.currentLevelIndex + 1}_cleared`, 'true');

    setTimeout(() => {
      uiManager.startConfetti();
      uiManager.showModal('modal-victory');
    }, 1200);
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      uiManager.showModal('modal-pause');
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      uiManager.hideAllModals();
    }
  }

  gameLoop(currentTime) {
    const elapsed = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += Math.min(elapsed, 100); // Prevent spiral of death

    while (this.accumulator >= this.fixedStep) {
      this.updatePhysics();
      this.accumulator -= this.fixedStep;
    }

    this.render();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  updatePhysics() {
    this.input.update();

    if (this.gameState === 'PLAYING' || this.gameState === 'VICTORY') {
      if (this.player && this.level) {
        this.player.update(this.input, this.level, this.particleEngine, window.soundEngine);
        this.level.update(this.player, this.particleEngine, window.soundEngine);
        this.camera.update();
      }
      this.particleEngine.update();
    }
  }

  render() {
    this.bgFrame++;
    this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Draw Parallax Background based on World Theme
    this.renderBackground();

    // Draw Active Level & Entities
    if (this.level && this.gameState !== 'TITLE') {
      this.level.render(this.ctx, this.camera);
      if (this.player) {
        this.player.render(this.ctx, this.camera);
      }
      this.particleEngine.render(this.ctx, this.camera);
    }
  }

  renderBackground() {
    const theme = this.level ? this.level.theme : 'valley';
    const camX = this.camera.getOffsetX();

    if (theme === 'candy') {
      // Pink Sweet Wonderland Sky
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
      grad.addColorStop(0, '#F48FB1');
      grad.addColorStop(1, '#FCE4EC');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

      // Sugar Mountains
      this.ctx.fillStyle = 'rgba(240, 98, 146, 0.4)';
      this.drawRollingHills(camX * 0.15, 240, 160, 70);
      this.ctx.fillStyle = 'rgba(233, 30, 99, 0.6)';
      this.drawRollingHills(camX * 0.35, 270, 110, 50);
    } else if (theme === 'cloud') {
      // Sky Blue Atmosphere with fluffy clouds
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
      grad.addColorStop(0, '#29B6F6');
      grad.addColorStop(1, '#E1F5FE');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

      // Big Fluffy Parallax Clouds
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.drawCloud(100 - (camX * 0.1) % 800, 60, 60);
      this.drawCloud(360 - (camX * 0.15) % 800, 90, 80);
      this.drawCloud(620 - (camX * 0.12) % 800, 40, 50);
    } else if (theme === 'lava') {
      // Lava Fortress Dark Sky
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
      grad.addColorStop(0, '#212121');
      grad.addColorStop(1, '#BF360C');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

      // Castle Spires in background
      this.ctx.fillStyle = '#263238';
      for (let i = 0; i < 8; i++) {
        const sx = i * 160 - (camX * 0.2) % 1280;
        this.ctx.fillRect(sx, 160, 40, 200);
        this.ctx.beginPath();
        this.ctx.moveTo(sx - 10, 160);
        this.ctx.lineTo(sx + 20, 110);
        this.ctx.lineTo(sx + 50, 160);
        this.ctx.fill();
      }
    } else {
      // Valley Sunny Blue Sky
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
      grad.addColorStop(0, '#42A5F5');
      grad.addColorStop(0.7, '#90CAF9');
      grad.addColorStop(1, '#E3F2FD');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

      // Distant Rolling Green Hills
      this.ctx.fillStyle = '#81C784';
      this.drawRollingHills(camX * 0.15, 250, 180, 60);
      this.ctx.fillStyle = '#4CAF50';
      this.drawRollingHills(camX * 0.35, 280, 120, 45);

      // Sunny Clouds
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.drawCloud(80 - (camX * 0.08) % 700, 50, 50);
      this.drawCloud(320 - (camX * 0.1) % 700, 75, 65);
      this.drawCloud(540 - (camX * 0.09) % 700, 40, 45);
    }
  }

  drawRollingHills(offset, baseY, wavelength, amplitude) {
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.virtualHeight);
    for (let x = 0; x <= this.virtualWidth; x += 10) {
      const y = baseY + Math.sin((x + offset) / wavelength) * amplitude;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.virtualWidth, this.virtualHeight);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawCloud(x, y, radius) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    this.ctx.arc(x + radius * 0.5, y - radius * 0.2, radius * 0.7, 0, Math.PI * 2);
    this.ctx.arc(x + radius, y, radius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
  uiManager.showModal('modal-title-menu');
  soundEngine.startBgm('menu');
});
