/**
 * Super Rivelles Peris World - Game Entities
 * Player, Enemies, Power-ups, Collectibles, Moving Platforms & Bosses
 */

class Player {
  constructor(x, y, charType = 'leo') {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.width = 28;
    this.height = 36;
    this.charType = charType;

    this.vx = 0;
    this.vy = 0;
    this.facingRight = true;
    this.onGround = false;
    this.wasOnGround = false;

    // Movement tuning
    this.accel = 0.55;
    this.friction = 0.82;
    this.maxSpeed = 5.2;
    this.gravity = 0.48;
    this.jumpForce = -10.8;

    // Character perks
    this.applyCharacterPerks();

    // Coyote time & Jump Buffering (kid-friendly responsiveness)
    this.coyoteCounter = 0;
    this.coyoteMax = 8;
    this.jumpBuffer = 0;
    this.jumpBufferMax = 6;
    this.hasDoubleJumped = false;
    this.floatTimer = 0;

    // States & Power-ups
    this.state = 'idle'; // idle, running, jumping, falling, hurt, win
    this.powerState = 'normal'; // normal, mega, fire, bubble
    this.starTimer = 0; // invincibility frame counter
    this.invulnerableTimer = 0; // post-hit blinking counter
    this.shootCooldown = 0;

    // Rescued by cloud balloon (Kid Mode)
    this.isBalloonRescuing = false;
    this.balloonY = 0;

    this.frame = 0;
  }

  applyCharacterPerks() {
    switch (this.charType) {
      case 'dino':
        this.maxSpeed = 6.2;
        this.accel = 0.65;
        break;
      case 'mia':
        this.jumpForce = -11.2;
        this.gravity = 0.42;
        break;
      case 'sparky':
        this.jumpForce = -9.8;
        this.canDoubleJump = true;
        break;
      case 'leo':
      default:
        this.maxSpeed = 5.2;
        this.jumpForce = -10.8;
        break;
    }
  }

  update(input, level, particleEngine, soundEngine) {
    this.frame++;

    if (this.isBalloonRescuing) {
      this.updateBalloonRescue(level);
      return;
    }

    if (this.state === 'win') {
      this.x += 1.5;
      return;
    }

    // Decrement timers
    if (this.starTimer > 0) this.starTimer--;
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Horizontal Movement
    if (input.keys.left) {
      this.vx -= this.accel;
      this.facingRight = false;
    } else if (input.keys.right) {
      this.vx += this.accel;
      this.facingRight = true;
    } else {
      this.vx *= this.friction;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // Clamp horizontal speed
    const currentMaxSpeed = input.keys.dash ? this.maxSpeed * 1.3 : this.maxSpeed;
    this.vx = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, this.vx));

    // Jump Buffering & Coyote Time
    if (this.onGround) {
      this.coyoteCounter = this.coyoteMax;
      this.hasDoubleJumped = false;
      this.floatTimer = 0;
    } else {
      this.coyoteCounter = Math.max(0, this.coyoteCounter - 1);
    }

    if (input.isJustPressed('jump')) {
      this.jumpBuffer = this.jumpBufferMax;
    } else {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - 1);
    }

    // Execute Jump
    if (this.jumpBuffer > 0 && this.coyoteCounter > 0) {
      this.vy = this.jumpForce;
      this.onGround = false;
      this.coyoteCounter = 0;
      this.jumpBuffer = 0;
      soundEngine.playJump(this.charType);
      particleEngine.emit(this.x + this.width / 2, this.y + this.height, 6, {
        color: '#FFFFFF',
        speed: 2,
        gravity: 0.05
      });
    } else if (this.charType === 'sparky' && input.isJustPressed('jump') && !this.onGround && !this.hasDoubleJumped) {
      // Sparky Double Jump
      this.vy = this.jumpForce * 0.95;
      this.hasDoubleJumped = true;
      soundEngine.playDoubleJump();
      particleEngine.emit(this.x + this.width / 2, this.y + this.height, 10, {
        colors: ['#00E5FF', '#18FFFF', '#FFFFFF'],
        shape: 'sparkle',
        speed: 3
      });
    } else if (this.charType === 'mia' && input.keys.jump && this.vy > 0 && this.floatTimer < 20) {
      // Mia Floaty Star Jump
      this.vy *= 0.75;
      this.floatTimer++;
      if (this.frame % 3 === 0) {
        particleEngine.emit(this.x + this.width / 2, this.y + this.height, 2, {
          colors: ['#FF80AB', '#FFD700'],
          shape: 'star',
          size: 4
        });
      }
    }

    // Variable jump height (releasing jump cuts upward velocity)
    if (!input.keys.jump && this.vy < -3) {
      this.vy *= 0.5;
    }

    // Action (Shoot Fireball / Wand Sparkle)
    if (input.isJustPressed('action') && (this.powerState === 'fire' || this.starTimer > 0) && this.shootCooldown === 0) {
      this.shootCooldown = 18;
      const spawnX = this.facingRight ? this.x + this.width + 4 : this.x - 12;
      const fireball = new Fireball(spawnX, this.y + 8, this.facingRight, this.charType);
      level.projectiles.push(fireball);
      soundEngine.playFireball();
    }

    // Apply Gravity
    this.vy += this.gravity;
    if (this.vy > 12) this.vy = 12;

    // Movement Dust Particles
    if (this.onGround && Math.abs(this.vx) > 3.5 && this.frame % 6 === 0) {
      particleEngine.emit(this.x + (this.facingRight ? 4 : this.width - 4), this.y + this.height, 2, {
        color: '#E0E0E0',
        speed: 1.5,
        gravity: 0.05
      });
    }

    // Update Physics & Collisions
    this.wasOnGround = this.onGround;
    this.x += this.vx;
    this.handleHorizontalCollisions(level, particleEngine, soundEngine);

    this.y += this.vy;
    this.handleVerticalCollisions(level, particleEngine, soundEngine);

    // Fall below level safety check
    if (this.y > level.heightInTiles * level.tileSize + 80) {
      if (window.gameSettings?.kidMode) {
        this.triggerBalloonRescue(particleEngine, soundEngine);
      } else {
        this.die(soundEngine, particleEngine);
      }
    }

    // State Determination
    if (!this.onGround) {
      this.state = this.vy < 0 ? 'jumping' : 'falling';
    } else if (Math.abs(this.vx) > 0.4) {
      this.state = 'running';
    } else {
      this.state = 'idle';
    }
  }

  handleHorizontalCollisions(level, particleEngine, soundEngine) {
    const ts = level.tileSize;
    const leftTile = Math.floor(this.x / ts);
    const rightTile = Math.floor((this.x + this.width) / ts);
    const topTile = Math.floor(this.y / ts);
    const bottomTile = Math.floor((this.y + this.height - 1) / ts);

    for (let r = topTile; r <= bottomTile; r++) {
      for (let c = leftTile; c <= rightTile; c++) {
        const tile = level.getTile(c, r);
        if (this.isSolidTile(tile)) {
          if (this.vx > 0) { // Moving right
            this.x = c * ts - this.width;
            this.vx = 0;
          } else if (this.vx < 0) { // Moving left
            this.x = (c + 1) * ts;
            this.vx = 0;
          }
        }
      }
    }
  }

  handleVerticalCollisions(level, particleEngine, soundEngine) {
    const ts = level.tileSize;
    const leftTile = Math.floor((this.x + 2) / ts);
    const rightTile = Math.floor((this.x + this.width - 3) / ts);
    const topTile = Math.floor(this.y / ts);
    const bottomTile = Math.floor((this.y + this.height) / ts);

    this.onGround = false;

    for (let r = topTile; r <= bottomTile; r++) {
      for (let c = leftTile; c <= rightTile; c++) {
        const tile = level.getTile(c, r);

        if (tile === 10 && this.vy > 0) { // Trampoline
          this.y = r * ts - this.height;
          this.vy = -16.5;
          soundEngine.playSpring();
          particleEngine.emit(this.x + this.width / 2, this.y + this.height, 12, {
            colors: ['#FF5252', '#FFD700', '#FFFFFF'],
            speed: 4
          });
          return;
        }

        if (this.isSolidTile(tile)) {
          if (this.vy > 0) { // Landing on ground
            this.y = r * ts - this.height;
            this.vy = 0;
            this.onGround = true;
          } else if (this.vy < 0) { // Hitting head on ceiling/block
            this.y = (r + 1) * ts;
            this.vy = 0;
            level.hitBlock(c, r, this, particleEngine, soundEngine);
          }
        }
      }
    }
  }

  isSolidTile(tile) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(tile);
  }

  powerUp(type, particleEngine, soundEngine) {
    soundEngine.playPowerup();
    if (type === 'star') {
      this.starTimer = 600; // ~10 seconds
      particleEngine.addText("STAR POWER!", this.x + this.width / 2, this.y - 15, '#FFD700');
    } else if (type === 'mega') {
      this.powerState = 'mega';
      this.width = 36;
      this.height = 48;
      particleEngine.addText("MEGA SIZE!", this.x + this.width / 2, this.y - 15, '#FF9800');
    } else if (type === 'fire') {
      this.powerState = 'fire';
      particleEngine.addText("MAGIC WAND!", this.x + this.width / 2, this.y - 15, '#E91E63');
    } else if (type === 'bubble') {
      this.powerState = 'bubble';
      particleEngine.addText("SHIELD ON!", this.x + this.width / 2, this.y - 15, '#00E5FF');
    }
  }

  takeDamage(particleEngine, soundEngine) {
    if (this.starTimer > 0 || this.invulnerableTimer > 0) return;

    if (this.powerState === 'bubble') {
      this.powerState = 'normal';
      this.invulnerableTimer = 60;
      soundEngine.playHurt();
      particleEngine.emit(this.x + this.width / 2, this.y + this.height / 2, 14, {
        colors: ['#00E5FF', '#80D8FF'],
        speed: 3
      });
      return;
    }

    if (this.powerState === 'mega' || this.powerState === 'fire') {
      this.powerState = 'normal';
      this.width = 28;
      this.height = 36;
      this.invulnerableTimer = 90;
      soundEngine.playHurt();
      return;
    }

    this.die(soundEngine, particleEngine);
  }

  die(soundEngine, particleEngine) {
    if (window.gameSettings?.kidMode) {
      this.triggerBalloonRescue(particleEngine, soundEngine);
      return;
    }

    soundEngine.playGameOver();
    window.gameEngine.handlePlayerDeath();
  }

  triggerBalloonRescue(particleEngine, soundEngine) {
    this.isBalloonRescuing = true;
    this.vx = 0;
    this.vy = 0;
    this.x = Math.max(80, this.x - 120);
    this.y = 80;
    this.invulnerableTimer = 120;
    soundEngine.playSpring();
    particleEngine.addText("KID RESCUE!", this.x, this.y - 20, '#FFD700');
  }

  updateBalloonRescue(level) {
    this.y += 1.5;
    if (this.y >= 200 || this.onGround) {
      this.isBalloonRescuing = false;
      this.vy = 0;
    }
  }

  render(ctx, camera) {
    if (this.invulnerableTimer > 0 && Math.floor(this.frame / 4) % 2 === 0) {
      return; // Blinking invisibility while invulnerable
    }

    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());

    ProceduralRenderer.drawCharacter(
      ctx, px, py, this.width, this.height,
      this.charType, this.facingRight, this.state,
      this.powerState, this.starTimer, this.frame
    );

    // Render Cloud Balloon when rescuing in Kid Mode
    if (this.isBalloonRescuing) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py - 20, 18, 0, Math.PI * 2);
      ctx.arc(px + this.width / 2 - 12, py - 16, 12, 0, Math.PI * 2);
      ctx.arc(px + this.width / 2 + 12, py - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + this.width / 2, py - 10);
      ctx.lineTo(px + this.width / 2, py);
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Fireball {
  constructor(x, y, goingRight, charType) {
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 12;
    this.vx = goingRight ? 6.5 : -6.5;
    this.vy = 2;
    this.charType = charType;
    this.life = 120;
  }

  update(level, particleEngine, soundEngine) {
    this.life--;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.35; // Gravity

    const ts = level.tileSize;
    const tileX = Math.floor(this.x / ts);
    const tileY = Math.floor((this.y + this.height) / ts);

    // Bounce on floor
    if (level.getTile(tileX, tileY) > 0) {
      this.vy = -4.5;
    }

    // Sparkle trail
    if (this.life % 3 === 0) {
      particleEngine.emit(this.x + 6, this.y + 6, 1, {
        color: this.charType === 'mia' ? '#FF80AB' : '#FF9800',
        shape: 'sparkle',
        speed: 1,
        life: 15
      });
    }
  }

  render(ctx, camera) {
    const px = this.x - camera.getOffsetX();
    const py = this.y - camera.getOffsetY();

    ctx.save();
    ctx.fillStyle = this.charType === 'mia' ? '#00E5FF' : '#FF5722';
    ctx.beginPath();
    ctx.arc(px + 6, py + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 4, py + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* Enemies */
class Enemy {
  constructor(x, y, type = 'beetle') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = 30;
    this.height = 28;
    this.vx = -1.2;
    this.vy = 0;
    this.alive = true;
    this.squashed = false;
    this.squashTimer = 0;
    this.shellMoving = false;
    this.frame = Math.random() * 100;
  }

  update(level, player, particleEngine, soundEngine) {
    this.frame++;

    if (this.squashed) {
      this.squashTimer++;
      if (this.squashTimer > 25) this.alive = false;
      return;
    }

    if (this.type === 'flapper') {
      // Sine wave hovering
      this.x += this.vx;
      this.y += Math.sin(this.frame * 0.08) * 1.5;
    } else {
      // Standard Ground Enemy
      this.vy += 0.45;
      this.x += this.vx;
      this.y += this.vy;

      const ts = level.tileSize;
      const tileUnder = level.getTile(Math.floor((this.x + 15) / ts), Math.floor((this.y + this.height) / ts));
      if (tileUnder > 0) {
        this.y = Math.floor((this.y + this.height) / ts) * ts - this.height;
        this.vy = 0;
      }

      // Reverse on wall collision
      const tileWall = level.getTile(Math.floor((this.x + (this.vx > 0 ? this.width : 0)) / ts), Math.floor((this.y + 10) / ts));
      if (tileWall > 0) {
        this.vx *= -1;
      }
    }

    // Check interaction with Player
    if (this.checkPlayerCollision(player)) {
      if (player.starTimer > 0 || player.powerState === 'mega') {
        this.defeat(particleEngine, soundEngine);
      } else if (player.vy > 0 && player.y + player.height - player.vy <= this.y + 12) {
        // Player stomps enemy
        player.vy = -8.5;
        soundEngine.playStomp();
        particleEngine.addText("+200", this.x + 15, this.y, '#FFD700');
        window.gameEngine.addScore(200);

        if (this.type === 'snail') {
          this.shellMoving = !this.shellMoving;
          this.vx = this.shellMoving ? (player.facingRight ? 7 : -7) : 0;
        } else {
          this.squashed = true;
        }
      } else {
        player.takeDamage(particleEngine, soundEngine);
      }
    }
  }

  checkPlayerCollision(player) {
    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }

  defeat(particleEngine, soundEngine) {
    this.alive = false;
    soundEngine.playStomp();
    particleEngine.emit(this.x + 15, this.y + 14, 12, {
      colors: ['#FF5722', '#FFD700', '#FFFFFF'],
      speed: 3
    });
    particleEngine.addText("+300", this.x + 15, this.y, '#85F8CE');
    window.gameEngine.addScore(300);
  }

  render(ctx, camera) {
    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());

    ctx.save();
    if (this.type === 'beetle') {
      // Googly Beetle
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.arc(px + 15, py + (this.squashed ? 20 : 14), 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px + 10, py + 12, 4, 0, Math.PI * 2);
      ctx.arc(px + 20, py + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px + (this.vx > 0 ? 11 : 9), py + 12, 2, 0, Math.PI * 2);
      ctx.arc(px + (this.vx > 0 ? 21 : 19), py + 12, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'snail') {
      // Spiky Snail
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(px + 15, py + 14, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === 'flapper') {
      // Winged Star
      ctx.fillStyle = '#FF4081';
      ctx.beginPath();
      ctx.arc(px + 15, py + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      // Flapping wings
      const wingY = Math.sin(this.frame * 0.3) * 6;
      ctx.beginPath();
      ctx.ellipse(px + 5, py + 10 + wingY, 6, 3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(px + 25, py + 10 + wingY, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* Boss King Gromble */
class BossGromble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.maxHp = 3;
    this.hp = 3;
    this.vx = -1.8;
    this.vy = 0;
    this.alive = true;
    this.state = 'idle'; // idle, jump, charge, hurt
    this.timer = 0;
    this.hurtTimer = 0;
  }

  update(level, player, particleEngine, soundEngine) {
    this.timer++;
    if (this.hurtTimer > 0) this.hurtTimer--;

    // Gravity & Ground
    this.vy += 0.5;
    this.x += this.vx;
    this.y += this.vy;

    const ts = level.tileSize;
    if (level.getTile(Math.floor((this.x + 32) / ts), Math.floor((this.y + this.height) / ts)) > 0) {
      this.y = Math.floor((this.y + this.height) / ts) * ts - this.height;
      this.vy = 0;
    }

    // Boss AI Pattern
    if (this.timer % 120 === 0) {
      this.vy = -11; // Super Jump Slam!
      soundEngine.playSpring();
      if (window.gameEngine && window.gameEngine.camera) window.gameEngine.camera.shake(6);
    }
    if (this.timer % 180 === 0) {
      // Shoot Lava Fireball
      const fb = new Fireball(this.x - 10, this.y + 20, false, 'boss');
      fb.vx = -5.5;
      level.projectiles.push(fb);
      soundEngine.playFireball();
    }

    // Turn towards player
    if (this.x < player.x - 120) this.vx = 1.6;
    if (this.x > player.x + 120) this.vx = -1.6;

    // Check hit by Player or Fireball
    if (this.checkCollision(player) && this.hurtTimer === 0) {
      if (player.vy > 0 && player.y + player.height - player.vy <= this.y + 24) {
        player.vy = -10;
        this.takeHit(particleEngine, soundEngine);
      } else {
        player.takeDamage(particleEngine, soundEngine);
      }
    }
  }

  takeHit(particleEngine, soundEngine) {
    this.hp--;
    this.hurtTimer = 60;
    soundEngine.playBossHit();
    if (window.gameEngine && window.gameEngine.camera) window.gameEngine.camera.shake(12);
    particleEngine.emit(this.x + 32, this.y + 32, 20, {
      colors: ['#FF5722', '#FFD700', '#FFFFFF'],
      speed: 5
    });

    if (this.hp <= 0) {
      this.alive = false;
      particleEngine.addText("BOSS DEFEATED!", this.x + 32, this.y - 20, '#FFD700');
      soundEngine.playLevelComplete();
      window.gameEngine.triggerLevelWin();
    }
  }

  checkCollision(rect) {
    return (
      rect.x < this.x + this.width &&
      rect.x + rect.width > this.x &&
      rect.y < this.y + this.height &&
      rect.y + rect.height > this.y
    );
  }

  render(ctx, camera) {
    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());

    ctx.save();
    if (this.hurtTimer > 0 && Math.floor(this.hurtTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // King Gromble (Spiky Dragon/Turtle Boss)
    ctx.fillStyle = '#D84315';
    ctx.beginPath();
    ctx.roundRect(px, py, this.width, this.height, 16);
    ctx.fill();

    // Spiky Crown
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(px + 16, py - 4);
    ctx.lineTo(px + 24, py - 18);
    ctx.lineTo(px + 32, py - 8);
    ctx.lineTo(px + 40, py - 18);
    ctx.lineTo(px + 48, py - 4);
    ctx.closePath();
    ctx.fill();

    // Glowing Red Eyes
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(px + 20, py + 22, 7, 0, Math.PI * 2);
    ctx.arc(px + 44, py + 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D50000';
    ctx.beginPath();
    ctx.arc(px + 18, py + 22, 3.5, 0, Math.PI * 2);
    ctx.arc(px + 42, py + 22, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Health Bar above head
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px, py - 26, this.width, 6);
    ctx.fillStyle = '#00E676';
    ctx.fillRect(px, py - 26, (this.width * (this.hp / this.maxHp)), 6);

    ctx.restore();
  }
}

/* Collectible Item */
class Collectible {
  constructor(x, y, type = 'coin') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = type === 'star_coin' ? 32 : 24;
    this.height = type === 'star_coin' ? 32 : 24;
    this.collected = false;
    this.frame = Math.random() * 100;
  }

  update(player, particleEngine, soundEngine) {
    this.frame++;
    if (this.collected) return;

    if (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    ) {
      this.collect(player, particleEngine, soundEngine);
    }
  }

  collect(player, particleEngine, soundEngine) {
    this.collected = true;

    if (this.type === 'coin') {
      soundEngine.playCoin();
      window.gameEngine.addCoin();
      particleEngine.emit(this.x + 12, this.y + 12, 6, {
        colors: ['#FFD700', '#FFF9C4'],
        shape: 'sparkle',
        speed: 2
      });
      particleEngine.addText("+100", this.x + 12, this.y, '#FFD700');
    } else if (this.type === 'star_coin') {
      soundEngine.playStar();
      window.gameEngine.addStarCoin();
      particleEngine.emit(this.x + 16, this.y + 16, 16, {
        colors: ['#FFD700', '#FF9800', '#FFFFFF'],
        shape: 'star',
        speed: 4
      });
      particleEngine.addText("STAR COIN!", this.x + 16, this.y, '#FFD700');
    } else if (['mushroom', 'star', 'fire_flower', 'bubble'].includes(this.type)) {
      player.powerUp(this.type === 'fire_flower' ? 'fire' : (this.type === 'mushroom' ? 'mega' : this.type), particleEngine, soundEngine);
    }
  }

  render(ctx, camera) {
    if (this.collected) return;
    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());
    const bob = Math.sin(this.frame * 0.1) * 3;

    ctx.save();
    if (this.type === 'coin') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 12 + bob, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF59D';
      ctx.fillRect(px + 11, py + 6 + bob, 2, 12);
    } else if (this.type === 'star_coin') {
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ProceduralRenderer.renderGroundBlock; // Helper ref
      ctx.beginPath();
      ctx.arc(px + 16, py + 16 + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 18px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', px + 16, py + 16 + bob);
    } else if (this.type === 'mushroom') {
      ctx.fillStyle = '#F44336';
      ctx.beginPath();
      ctx.arc(px + 12, py + 10 + bob, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px + 12, py + 6 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE0B2';
      ctx.fillRect(px + 7, py + 10 + bob, 10, 8);
    } else if (this.type === 'star') {
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(px + 12, py + 12 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 8, py + 9 + bob, 2, 4);
      ctx.fillRect(px + 14, py + 9 + bob, 2, 4);
    }
    ctx.restore();
  }
}

/* Moving Platforms */
class MovingPlatform {
  constructor(x, y, width, height, moveDistX = 80, moveDistY = 0, speed = 1.2) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.moveDistX = moveDistX;
    this.moveDistY = moveDistY;
    this.speed = speed;
    this.progress = 0;
  }

  update(player) {
    this.progress += 0.02 * this.speed;
    const nextX = this.startX + Math.sin(this.progress) * this.moveDistX;
    const nextY = this.startY + Math.cos(this.progress) * this.moveDistY;

    const deltaX = nextX - this.x;
    const deltaY = nextY - this.y;

    // Move player with platform if standing on it
    if (
      player.onGround &&
      player.x + player.width > this.x &&
      player.x < this.x + this.width &&
      Math.abs(player.y + player.height - this.y) < 5
    ) {
      player.x += deltaX;
      player.y += deltaY;
    }

    this.x = nextX;
    this.y = nextY;
  }

  render(ctx, camera) {
    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());

    ctx.save();
    ctx.fillStyle = '#FF7043';
    ctx.beginPath();
    ctx.roundRect(px, py, this.width, this.height, 6);
    ctx.fill();
    ctx.strokeStyle = '#D84315';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/* Goal Flagpole */
class GoalPole {
  constructor(x, y, height = 180) {
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = height;
    this.flagY = y;
    this.reached = false;
  }

  update(player, soundEngine, particleEngine) {
    if (!this.reached && player.x + player.width >= this.x && player.x <= this.x + this.width + 30) {
      this.reached = true;
      soundEngine.playLevelComplete();
      particleEngine.emit(this.x + 10, this.y + 20, 30, {
        colors: ['#FFD700', '#FF4081', '#00E5FF', '#76FF03'],
        shape: 'star',
        speed: 5
      });
      window.gameEngine.triggerLevelWin();
    }

    if (this.reached && this.flagY < this.y + this.height - 30) {
      this.flagY += 3;
    }
  }

  render(ctx, camera) {
    const px = Math.floor(this.x - camera.getOffsetX());
    const py = Math.floor(this.y - camera.getOffsetY());

    ctx.save();
    // Pole
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(px + 6, py, 6, this.height);
    // Golden Top Orb
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + 9, py - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    // Flag
    ctx.fillStyle = '#00E676';
    const currentFlagY = py + (this.flagY - this.y);
    ctx.beginPath();
    ctx.moveTo(px + 12, currentFlagY);
    ctx.lineTo(px + 44, currentFlagY + 14);
    ctx.lineTo(px + 12, currentFlagY + 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
