/**
 * Super Rivelles Peris World - Game Engine Core
 * Game loop, input handling, camera tracking, particle engine & procedural drawing
 */

class InputManager {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      action: false,
      dash: false
    };

    this.prevKeys = { ...this.keys };
    this.touchActive = false;
    this.gamepadIndex = null;

    this.setupKeyboardListeners();
    this.setupTouchListeners();
    this.setupGamepadListeners();
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.updateKeyState(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.updateKeyState(e.code, false);
    });
  }

  updateKeyState(code, isPressed) {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = isPressed;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = isPressed;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = isPressed;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = isPressed;
        break;
      case 'Space':
      case 'KeyZ':
      case 'KeyK':
        this.keys.jump = isPressed;
        break;
      case 'KeyX':
      case 'KeyJ':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.action = isPressed;
        this.keys.dash = isPressed;
        break;
    }
  }

  setupTouchListeners() {
    // Detect touch device
    window.addEventListener('touchstart', () => {
      this.touchActive = true;
      const touchControls = document.getElementById('touch-controls');
      if (touchControls && touchControls.style.display !== 'block') {
        touchControls.style.display = 'block';
      }
    }, { once: true });

    // Touch Button bindings with haptic feedback
    const bindTouchBtn = (elemId, keyName) => {
      const el = document.getElementById(elemId);
      if (!el) return;

      const triggerPress = (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
        el.classList.add('active');
        if (navigator.vibrate && window.gameSettings?.vibration) {
          navigator.vibrate(12);
        }
      };

      const triggerRelease = (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
        el.classList.remove('active');
      };

      el.addEventListener('touchstart', triggerPress, { passive: false });
      el.addEventListener('touchend', triggerRelease, { passive: false });
      el.addEventListener('touchcancel', triggerRelease, { passive: false });
      el.addEventListener('mousedown', triggerPress);
      el.addEventListener('mouseup', triggerRelease);
      el.addEventListener('mouseleave', triggerRelease);
    };

    bindTouchBtn('btn-left', 'left');
    bindTouchBtn('btn-right', 'right');
    bindTouchBtn('btn-down', 'down');
    bindTouchBtn('btn-jump', 'jump');
    bindTouchBtn('btn-action', 'action');
  }

  setupGamepadListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      console.log("Gamepad connected:", e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
  }

  pollGamepad() {
    if (this.gamepadIndex === null) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];
    if (!gp) return;

    // D-Pad / Stick
    const stickX = gp.axes[0];
    const stickY = gp.axes[1];
    
    this.keys.left = this.keys.left || stickX < -0.3 || (gp.buttons[14] && gp.buttons[14].pressed);
    this.keys.right = this.keys.right || stickX > 0.3 || (gp.buttons[15] && gp.buttons[15].pressed);
    this.keys.down = this.keys.down || stickY > 0.4 || (gp.buttons[13] && gp.buttons[13].pressed);
    this.keys.jump = this.keys.jump || (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed); // A or B
    this.keys.action = this.keys.action || (gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[3] && gp.buttons[3].pressed); // X or Y
  }

  isJustPressed(key) {
    return this.keys[key] && !this.prevKeys[key];
  }

  update() {
    this.pollGamepad();
    this.prevKeys = { ...this.keys };
  }
}

class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 0;
    this.y = 0;
    this.width = viewportWidth;
    this.height = viewportHeight;
    this.target = null;
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.minX = 0;
    this.maxX = 10000;
  }

  shake(amount = 8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  follow(target, mapWidth, mapHeight) {
    this.target = target;
    this.maxX = Math.max(0, mapWidth - this.width);
  }

  update() {
    if (this.target) {
      // Smooth horizontal following with deadzone
      const targetCamX = this.target.x - this.width * 0.38;
      this.x += (targetCamX - this.x) * 0.12;

      // Clamp within map bounds
      this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

      // Fixed vertical or gentle tracking
      const targetCamY = Math.min(0, this.target.y - this.height * 0.5);
      this.y += (targetCamY - this.y) * 0.08;
    }

    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }
  }

  getOffsetX() {
    const shake = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
    return Math.floor(this.x + shake);
  }

  getOffsetY() {
    const shake = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
    return Math.floor(this.y + shake);
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  emit(x, y, count = 8, config = {}) {
    for (let i = 0; i < count; i++) {
      const angle = config.angle !== undefined ? config.angle + (Math.random() - 0.5) * (config.spread || Math.PI * 0.5) : Math.random() * Math.PI * 2;
      const speed = (config.speed || 3) * (0.5 + Math.random() * 0.8);
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed + (config.vx || 0),
        vy: Math.sin(angle) * speed + (config.vy || 0),
        gravity: config.gravity !== undefined ? config.gravity : 0.15,
        color: Array.isArray(config.colors) ? config.colors[Math.floor(Math.random() * config.colors.length)] : (config.color || '#FFD700'),
        size: (config.size || 5) * (0.7 + Math.random() * 0.6),
        alpha: 1,
        life: config.life || 30,
        maxLife: config.life || 30,
        shape: config.shape || 'circle' // 'circle', 'star', 'sparkle', 'square'
      });
    }
  }

  addText(text, x, y, color = '#FFFFFF') {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -2,
      alpha: 1,
      life: 45,
      color: color
    });
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.vy *= 0.95;
      t.life--;
      t.alpha = Math.max(0, t.life / 45);

      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    const offsetX = camera.getOffsetX();
    const offsetY = camera.getOffsetY();

    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      const px = p.x - offsetX;
      const py = p.y - offsetY;

      if (p.shape === 'star') {
        this.drawStar(ctx, px, py, 4, p.size, p.size * 0.4);
      } else if (p.shape === 'sparkle') {
        ctx.fillRect(px - p.size * 0.5, py - p.size * 0.5, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render floating texts
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Fredoka, sans-serif';
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, t.x - offsetX + 1, t.y - offsetY + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x - offsetX, t.y - offsetY);
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}

class ProceduralRenderer {
  static drawCharacter(ctx, x, y, width, height, charType, facingRight, state, powerState, starTimer, frame) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    if (!facingRight) ctx.scale(-1, 1);

    // Star invincibility flashing rainbow glow
    if (starTimer > 0) {
      const hue = (frame * 18) % 360;
      ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
      ctx.shadowBlur = 16;
    }

    const scale = powerState === 'mega' ? 1.35 : 1.0;
    ctx.scale(scale, scale);

    const isRunning = state === 'running';
    const isJumping = state === 'jumping';
    const legOffset = isRunning ? Math.sin(frame * 0.3) * 6 : 0;
    const bodyBob = isRunning ? Math.abs(Math.sin(frame * 0.3)) * 2 : 0;

    switch (charType) {
      case 'mia':
        this.renderMia(ctx, isJumping, legOffset, bodyBob, powerState);
        break;
      case 'dino':
        this.renderDino(ctx, isJumping, legOffset, bodyBob, powerState);
        break;
      case 'sparky':
        this.renderSparky(ctx, isJumping, legOffset, bodyBob, powerState);
        break;
      case 'leo':
      default:
        this.renderLeo(ctx, isJumping, legOffset, bodyBob, powerState);
        break;
    }

    // Bubble Shield Visual
    if (powerState === 'bubble') {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 220, 255, 0.75)';
      ctx.fillStyle = 'rgba(130, 235, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -height * 0.2, width * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  static renderLeo(ctx, isJumping, legOffset, bodyBob, powerState) {
    // Leo the Brave Lion
    const furColor = powerState === 'fire' ? '#FFF9C4' : '#FFA726';
    const maneColor = powerState === 'fire' ? '#D32F2F' : '#E65100';

    // Mane (Back)
    ctx.fillStyle = maneColor;
    ctx.beginPath();
    ctx.arc(0, -12 - bodyBob, 18, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(0, 4 - bodyBob, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue Explorer Vest
    ctx.fillStyle = '#1976D2';
    ctx.beginPath();
    ctx.roundRect(-10, -4 - bodyBob, 20, 14, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(0, -12 - bodyBob, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = maneColor;
    ctx.beginPath();
    ctx.arc(-9, -20 - bodyBob, 4, 0, Math.PI * 2);
    ctx.arc(9, -20 - bodyBob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Snout & Nose
    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.ellipse(3, -9 - bodyBob, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(5, -11 - bodyBob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Big Kid-Friendly Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(3, -15 - bodyBob, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E88E5';
    ctx.beginPath();
    ctx.arc(4.5, -15 - bodyBob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(5, -15 - bodyBob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, -8 - bodyBob, 3, 0.1, Math.PI * 0.8);
    ctx.stroke();

    // Legs / Boots
    ctx.fillStyle = '#5D4037';
    if (isJumping) {
      ctx.fillRect(-9, 12, 6, 5);
      ctx.fillRect(3, 10, 6, 5);
    } else {
      ctx.fillRect(-9 + legOffset, 12, 6, 8);
      ctx.fillRect(3 - legOffset, 12, 6, 8);
    }
  }

  static renderMia(ctx, isJumping, legOffset, bodyBob, powerState) {
    // Princess Mia with Magic Wand
    const dressColor = powerState === 'fire' ? '#FF5252' : '#EC407A';

    // Dress
    ctx.fillStyle = dressColor;
    ctx.beginPath();
    ctx.moveTo(0, -6 - bodyBob);
    ctx.lineTo(-14, 16);
    ctx.lineTo(14, 16);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFD180';
    ctx.beginPath();
    ctx.arc(0, -12 - bodyBob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Golden Hair
    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(0, -15 - bodyBob, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-11, -8 - bodyBob, 6, 0, Math.PI * 2);
    ctx.arc(11, -8 - bodyBob, 6, 0, Math.PI * 2);
    ctx.fill();

    // Tiara / Crown
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(-7, -20 - bodyBob);
    ctx.lineTo(-4, -26 - bodyBob);
    ctx.lineTo(0, -22 - bodyBob);
    ctx.lineTo(4, -26 - bodyBob);
    ctx.lineTo(7, -20 - bodyBob);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(3, -13 - bodyBob, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7B1FA2';
    ctx.beginPath();
    ctx.arc(4.5, -13 - bodyBob, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#D81B60';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3, -8 - bodyBob, 2.5, 0, Math.PI);
    ctx.stroke();

    // Magic Wand in Hand
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 2 - bodyBob);
    ctx.lineTo(16, -6 - bodyBob);
    ctx.stroke();
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(17, -7 - bodyBob, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Shoes
    ctx.fillStyle = '#C2185B';
    ctx.fillRect(-7 + legOffset, 16, 5, 4);
    ctx.fillRect(2 - legOffset, 16, 5, 4);
  }

  static renderDino(ctx, isJumping, legOffset, bodyBob, powerState) {
    // Speedy Dino Max
    const dinoColor = powerState === 'fire' ? '#E64A19' : '#4CAF50';
    const bellyColor = '#C8E6C9';

    // Tail
    ctx.fillStyle = dinoColor;
    ctx.beginPath();
    ctx.moveTo(-10, 6 - bodyBob);
    ctx.lineTo(-20, 2 - bodyBob);
    ctx.lineTo(-10, 14 - bodyBob);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = dinoColor;
    ctx.beginPath();
    ctx.roundRect(-10, -8 - bodyBob, 22, 24, 8);
    ctx.fill();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(3, 4 - bodyBob, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = dinoColor;
    ctx.beginPath();
    ctx.roundRect(-4, -20 - bodyBob, 18, 14, 6);
    ctx.fill();

    // Back Spikes
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(-6, -18 - bodyBob); ctx.lineTo(-10, -14 - bodyBob); ctx.lineTo(-6, -10 - bodyBob);
    ctx.moveTo(-10, -6 - bodyBob); ctx.lineTo(-14, -2 - bodyBob); ctx.lineTo(-10, 2 - bodyBob);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6, -15 - bodyBob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(8, -15 - bodyBob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nostril & Big Grin
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(11, -12 - bodyBob, 2, 2);
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(7, -10 - bodyBob, 4, 0.1, Math.PI * 0.7);
    ctx.stroke();

    // Stomping Feet
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(-7 + legOffset, 14, 7, 7);
    ctx.fillRect(3 - legOffset, 14, 7, 7);
  }

  static renderSparky(ctx, isJumping, legOffset, bodyBob, powerState) {
    // Sparky the Robot
    const robotColor = powerState === 'fire' ? '#D32F2F' : '#00ACC1';

    // Antenna
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17 - bodyBob);
    ctx.lineTo(0, -26 - bodyBob);
    ctx.stroke();
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(0, -27 - bodyBob, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Head Box
    ctx.fillStyle = robotColor;
    ctx.beginPath();
    ctx.roundRect(-11, -17 - bodyBob, 22, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#ECEFF1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Screen Eyes (Glowing Visor)
    ctx.fillStyle = '#18FFFF';
    ctx.beginPath();
    ctx.roundRect(-8, -14 - bodyBob, 16, 7, 2);
    ctx.fill();
    ctx.fillStyle = '#006064';
    ctx.fillRect(-5, -12 - bodyBob, 3, 3);
    ctx.fillRect(2, -12 - bodyBob, 3, 3);

    // Body Box
    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.roundRect(-10, 0 - bodyBob, 20, 16, 4);
    ctx.fill();

    // Battery / Heart Gauge
    ctx.fillStyle = '#00E676';
    ctx.fillRect(-6, 4 - bodyBob, 12, 5);

    // Wheels / Hover Thrusters
    ctx.fillStyle = '#78909C';
    if (isJumping) {
      // Rocket Fire
      ctx.fillStyle = '#FF9100';
      ctx.beginPath();
      ctx.moveTo(-6, 16); ctx.lineTo(0, 24); ctx.lineTo(6, 16);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-5 + legOffset, 17, 4, 0, Math.PI * 2);
      ctx.arc(5 - legOffset, 17, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static drawTile(ctx, tileType, x, y, width, height, worldTheme = 'valley') {
    switch (tileType) {
      case 1: // Ground Block
        this.renderGroundBlock(ctx, x, y, width, height, worldTheme);
        break;
      case 2: // Question Mark (?) Block
        this.renderQuestionBlock(ctx, x, y, width, height, false);
        break;
      case 3: // Empty / Hit Block
        this.renderQuestionBlock(ctx, x, y, width, height, true);
        break;
      case 4: // Breakable Brick
        this.renderBrickBlock(ctx, x, y, width, height, worldTheme);
        break;
      case 5: // Pipe Top Left
      case 6: // Pipe Top Right
      case 7: // Pipe Body Left
      case 8: // Pipe Body Right
        this.renderPipePart(ctx, tileType, x, y, width, height);
        break;
      case 9: // Cloud / Bridge Platform
        this.renderCloudPlatform(ctx, x, y, width, height, worldTheme);
        break;
      case 10: // Trampoline / Spring
        this.renderTrampoline(ctx, x, y, width, height);
        break;
      default:
        break;
    }
  }

  static renderGroundBlock(ctx, x, y, w, h, worldTheme) {
    if (worldTheme === 'candy') {
      ctx.fillStyle = '#F8BBD0';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#E91E63'; // Frosting top
      ctx.beginPath();
      ctx.roundRect(x, y, w, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF'; // Sprinkles
      ctx.fillRect(x + 6, y + 4, 4, 2);
      ctx.fillRect(x + 20, y + 5, 4, 2);
    } else if (worldTheme === 'lava') {
      ctx.fillStyle = '#37474F';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#D84315';
      ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = '#263238';
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else if (worldTheme === 'cloud') {
      ctx.fillStyle = '#E1F5FE';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#81D4FA';
      ctx.fillRect(x, y, w, 6);
    } else { // Valley Grass
      ctx.fillStyle = '#8D6E63'; // Dirt
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#4CAF50'; // Lush Green Grass
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#2E7D32';
      // Grass blades
      for (let i = 0; i < w; i += 8) {
        ctx.fillRect(x + i, y + 6, 4, 4);
      }
    }
  }

  static renderQuestionBlock(ctx, x, y, w, h, isEmpty) {
    if (isEmpty) {
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    } else {
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#FF6F00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Question Mark (?)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + w / 2, y + h / 2 + 1);

      // Screws in corners
      ctx.fillStyle = '#FF8F00';
      ctx.fillRect(x + 3, y + 3, 3, 3);
      ctx.fillRect(x + w - 6, y + 3, 3, 3);
      ctx.fillRect(x + 3, y + h - 6, 3, 3);
      ctx.fillRect(x + w - 6, y + h - 6, 3, 3);
    }
  }

  static renderBrickBlock(ctx, x, y, w, h, worldTheme) {
    const brickColor = worldTheme === 'candy' ? '#BA68C8' : (worldTheme === 'lava' ? '#4E342E' : '#B71C1C');
    ctx.fillStyle = brickColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#D32F2F';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // Brick mortar lines
    ctx.strokeStyle = '#FFCDD2';
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h / 2);
    ctx.stroke();
  }

  static renderPipePart(ctx, type, x, y, w, h) {
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x + 3, y, 6, h); // Highlight shine
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  static renderCloudPlatform(ctx, x, y, w, h, worldTheme) {
    ctx.fillStyle = worldTheme === 'candy' ? '#FF80AB' : '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x, y + 4, w, h - 8, 12);
    ctx.fill();
    ctx.strokeStyle = worldTheme === 'candy' ? '#FF4081' : '#B3E5FC';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  static renderTrampoline(ctx, x, y, w, h) {
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 4, w - 4, 10, 4);
    ctx.fill();
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 14); ctx.lineTo(x + 12, y + h); ctx.lineTo(x + 18, y + 14);
    ctx.lineTo(x + 24, y + h);
    ctx.stroke();
  }
}
