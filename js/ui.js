/**
 * Super Rivelles Peris World - Material Design 3 UI Manager
 * Handles HUD updates, modals, character picker, settings and celebration confetti
 */

class UIManager {
  constructor() {
    this.confettiParticles = [];
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.confettiCtx = this.confettiCanvas ? this.confettiCanvas.getContext('2d') : null;
    this.isConfettiActive = false;

    this.initModals();
    this.initCharacterPreviews();
    this.initSettings();
    this.resizeConfettiCanvas();
    window.addEventListener('resize', () => this.resizeConfettiCanvas());
  }

  resizeConfettiCanvas() {
    if (!this.confettiCanvas) return;
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  initModals() {
    // Buttons to open modals
    const bindModal = (btnId, modalId) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      if (btn && modal) {
        btn.addEventListener('click', () => {
          soundEngine.playClick();
          this.showModal(modalId);
        });
      }
    };

    bindModal('btn-menu-char-select', 'modal-char-select');
    bindModal('btn-menu-level-select', 'modal-level-select');
    bindModal('btn-menu-settings', 'modal-settings');
    bindModal('btn-hud-settings', 'modal-settings');

    // Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        this.hideAllModals();
      });
    });

    // Pause Button
    const pauseBtn = document.getElementById('btn-hud-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        soundEngine.playClick();
        window.gameEngine.togglePause();
      });
    }

    // Audio Mute Button
    const muteBtn = document.getElementById('btn-hud-sound');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = !window.soundEngine.isMuted;
        window.soundEngine.setMuted(isMuted);
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }
  }

  initCharacterPreviews() {
    const characters = ['leo', 'mia', 'dino', 'sparky'];
    characters.forEach(charType => {
      const canvas = document.getElementById(`char-preview-${charType}`);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = 64;
      canvas.height = 64;

      // Draw character centered
      ProceduralRenderer.drawCharacter(ctx, 16, 12, 28, 36, charType, true, 'idle', 'normal', 0, 0);

      // Card selection click
      const card = document.getElementById(`char-card-${charType}`);
      if (card) {
        card.addEventListener('click', () => {
          soundEngine.playClick();
          document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          window.gameEngine.setSelectedCharacter(charType);
        });
      }
    });
  }

  initSettings() {
    const kidModeSwitch = document.getElementById('switch-kid-mode');
    const sfxSlider = document.getElementById('slider-sfx');
    const musicSlider = document.getElementById('slider-music');
    const vibSwitch = document.getElementById('switch-vibration');

    if (kidModeSwitch) {
      kidModeSwitch.checked = window.gameSettings.kidMode;
      kidModeSwitch.addEventListener('change', (e) => {
        window.gameSettings.kidMode = e.target.checked;
        localStorage.setItem('srw_kid_mode', e.target.checked);
        this.updateKidModeBadge();
        soundEngine.playClick();
      });
    }

    if (sfxSlider) {
      sfxSlider.value = window.gameSettings.sfxVolume * 100;
      sfxSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        window.soundEngine.setSfxVolume(val);
        localStorage.setItem('srw_sfx_vol', val);
      });
    }

    if (musicSlider) {
      musicSlider.value = window.gameSettings.musicVolume * 100;
      musicSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        window.soundEngine.setMusicVolume(val);
        localStorage.setItem('srw_music_vol', val);
      });
    }

    if (vibSwitch) {
      vibSwitch.checked = window.gameSettings.vibration;
      vibSwitch.addEventListener('change', (e) => {
        window.gameSettings.vibration = e.target.checked;
        localStorage.setItem('srw_vib', e.target.checked);
        soundEngine.playClick();
      });
    }
  }

  updateKidModeBadge() {
    const badge = document.getElementById('hud-kid-badge');
    if (badge) {
      badge.style.display = window.gameSettings.kidMode ? 'inline-block' : 'none';
    }
  }

  showModal(modalId) {
    this.hideAllModals();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('visible');
  }

  hideAllModals() {
    document.querySelectorAll('.md-modal-scrim').forEach(modal => {
      modal.classList.remove('visible');
    });
  }

  updateHUD(state) {
    const scoreEl = document.getElementById('hud-score');
    const coinsEl = document.getElementById('hud-coins');
    const starsEl = document.getElementById('hud-stars');
    const livesEl = document.getElementById('hud-lives');
    const worldEl = document.getElementById('hud-world-name');

    if (scoreEl) scoreEl.textContent = state.score.toString().padStart(6, '0');
    if (coinsEl) coinsEl.textContent = `x${state.coins.toString().padStart(2, '0')}`;
    if (starsEl) starsEl.textContent = `★ ${state.starCoins}`;
    if (livesEl) livesEl.textContent = window.gameSettings.kidMode ? '∞' : `❤ x${state.lives}`;
    if (worldEl) worldEl.textContent = state.currentLevelName;
  }

  startConfetti() {
    this.isConfettiActive = true;
    this.confettiParticles = [];
    const colors = ['#FFD700', '#FF4081', '#00E5FF', '#76FF03', '#E040FB', '#FF6E40'];

    for (let i = 0; i < 120; i++) {
      this.confettiParticles.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        w: 10 + Math.random() * 8,
        h: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    this.renderConfetti();
  }

  renderConfetti() {
    if (!this.isConfettiActive || !this.confettiCtx) return;

    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    for (const p of this.confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate(p.rot);
      this.confettiCtx.fillStyle = p.color;
      this.confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.confettiCtx.restore();

      if (p.y > window.innerHeight + 20) {
        p.y = -20;
        p.x = Math.random() * window.innerWidth;
      }
    }

    requestAnimationFrame(() => this.renderConfetti());
  }

  stopConfetti() {
    this.isConfettiActive = false;
    if (this.confettiCtx && this.confettiCanvas) {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }
}

window.uiManager = new UIManager();
