/**
 * Super Rivelles Peris World - Audio Synthesizer
 * Web Audio API procedural sound effects & background music synth
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    
    this.sfxVolume = 0.7;
    this.musicVolume = 0.45;
    this.isMuted = false;
    
    this.bgmTimer = null;
    this.currentTrack = null;
    this.isPlayingBgm = false;
    
    this.initAudioContext = this.initAudioContext.bind(this);
  }

  initAudioContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.gain.value = this.musicVolume;
      
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  /* Sound Effects Synthesizer */
  playTone(freq, type = 'square', duration = 0.1, gainVal = 0.3, freqEnd = null) {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), now + duration);
      }

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  playJump(charType = 'leo') {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;

    const baseFreq = charType === 'mia' ? 220 : (charType === 'sparky' ? 180 : 150);
    this.playTone(baseFreq, 'square', 0.16, 0.25, baseFreq * 2.8);
  }

  playDoubleJump() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(350, 'triangle', 0.18, 0.3, 750);
  }

  playCoin() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Quick dual-tone chime (B5 -> E6)
    this.playTone(987.77, 'square', 0.08, 0.25);
    setTimeout(() => {
      this.playTone(1318.51, 'square', 0.25, 0.25);
    }, 70);
  }

  playStar() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    // Rapid arpeggio chime
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.15, 0.2), i * 50);
    });
  }

  playPowerup() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.12, 0.28), i * 60);
    });
  }

  playFireball() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(600, 'sawtooth', 0.12, 0.2, 120);
  }

  playStomp() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(280, 'sawtooth', 0.1, 0.35, 70);
  }

  playSpring() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(180, 'sine', 0.3, 0.4, 880);
  }

  playHurt() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(160, 'sawtooth', 0.25, 0.35, 40);
  }

  playBossHit() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(120, 'square', 0.3, 0.4, 40);
  }

  playLevelComplete() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.50, d: 0.3 },
      { f: 880.00, d: 0.15 },
      { f: 1046.50, d: 0.5 }
    ];
    let time = 0;
    melody.forEach(note => {
      setTimeout(() => this.playTone(note.f, 'square', note.d, 0.3), time * 1000);
      time += note.d + 0.04;
    });
  }

  playGameOver() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.25, 0.25), i * 180);
    });
  }

  playClick() {
    this.initAudioContext();
    if (!this.ctx || this.isMuted) return;
    this.playTone(600, 'sine', 0.04, 0.15, 900);
  }

  /* Procedural Chiptune Music Generator */
  startBgm(trackName = 'world1') {
    this.initAudioContext();
    if (this.currentTrack === trackName && this.isPlayingBgm) return;
    this.stopBgm();
    
    this.currentTrack = trackName;
    this.isPlayingBgm = true;

    // Track patterns (Notes in Hz, durations in 16th notes)
    const tracks = {
      menu: {
        tempo: 130,
        melody: [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 261.63],
        bass: [130.81, 0, 164.81, 0, 196.00, 0, 130.81, 0]
      },
      world1: { // Sunshine Valley (Happy & bright)
        tempo: 140,
        melody: [
          329.63, 329.63, 0, 329.63, 0, 261.63, 329.63, 0,
          392.00, 0, 0, 0, 196.00, 0, 0, 0,
          261.63, 0, 0, 196.00, 0, 0, 164.81, 0,
          220.00, 0, 246.94, 0, 233.08, 220.00, 0, 0
        ],
        bass: [
          130.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
          98.00, 0, 146.83, 0, 98.00, 0, 146.83, 0,
          110.00, 0, 164.81, 0, 110.00, 0, 164.81, 0,
          87.31, 0, 130.81, 0, 98.00, 0, 146.83, 0
        ]
      },
      world2: { // Candy Wonderland (Bouncy waltz-like)
        tempo: 145,
        melody: [
          392.00, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00,
          349.23, 392.00, 440.00, 493.88, 523.25, 493.88, 440.00, 392.00
        ],
        bass: [196.00, 0, 196.00, 0, 174.61, 0, 174.61, 0]
      },
      world3: { // Cloud Castle (Dreamy & airy)
        tempo: 135,
        melody: [
          523.25, 0, 659.25, 0, 783.99, 0, 1046.50, 0,
          880.00, 0, 698.46, 0, 587.33, 0, 523.25, 0
        ],
        bass: [130.81, 164.81, 196.00, 261.63, 174.61, 220.00, 146.83, 130.81]
      },
      world4: { // Lava Lair & Boss Battle (Tense & driving)
        tempo: 160,
        melody: [
          146.83, 146.83, 174.61, 146.83, 220.00, 207.65, 196.00, 174.61,
          146.83, 146.83, 174.61, 146.83, 293.66, 0, 261.63, 0
        ],
        bass: [73.42, 73.42, 87.31, 73.42, 110.00, 103.83, 98.00, 87.31]
      }
    };

    const track = tracks[trackName] || tracks.world1;
    let step = 0;
    const stepDuration = (60 / track.tempo) / 4; // 16th note

    const playStep = () => {
      if (!this.isPlayingBgm || !this.ctx || this.isMuted) {
        this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
        return;
      }

      const melNote = track.melody[step % track.melody.length];
      const bassNote = track.bass[step % track.bass.length];
      const now = this.ctx.currentTime;

      // Play Lead Melody Note
      if (melNote > 0) {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = trackName === 'world3' ? 'sine' : (trackName === 'world4' ? 'sawtooth' : 'square');
          osc.frequency.setValueAtTime(melNote, now);
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.8);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + stepDuration * 1.8);
        } catch (e) {}
      }

      // Play Bass Note
      if (bassNote > 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassNote, now);
          bassGain.gain.setValueAtTime(0.22, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);
          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.5);
        } catch (e) {}
      }

      step++;
      this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
