# 🌟 Super Rivelles Peris World 🦁

A delightful, responsive 2D web platformer adventure game built for kids! Explore magical worlds, collect gold coins & star medals, unlock unique heroes, gain super power-ups, and defeat funny monsters and bosses.

![Game Preview](https://img.shields.io/badge/Super_Rivelles_World-Game_Engine-purple?style=for-the-badge)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-orange?style=for-the-badge&logo=html5)
![Material Design 3](https://img.shields.io/badge/Material_Design-3-blue?style=for-the-badge&logo=android)
![Web Audio API](https://img.shields.io/badge/Web_Audio-Synthesizer-green?style=for-the-badge)

---

## 🎮 Playable Heroes

- **🦁 Leo the Lion Explorer**: Balanced speed, brave jump, and classic explorer gear.
- **👑 Princess Mia**: Floaty star jump with gentle descending glides.
- **🦖 Speedy Dino Max**: Turbo speed runner with ground-shaking stomps.
- **🤖 Sparky the Robot**: Double rocket jump with sparkle thrusters.

---

## 🗺️ Exciting Adventure Worlds

1. **🌻 World 1-1: Sunshine Valley** — Rolling green hills, mystery `?` blocks, friendly beetles, bouncy trampolines, and flagpole castle finish.
2. **🍭 World 2-1: Candy Wonderland** — Sweet pink candy mountains, gummy bounce pads, moving chocolate wafer platforms, and star flappers.
3. **☁️ World 3-1: Cloud Castle Sky** — Floating cloud islands, high-altitude leaps, and elevator clouds.
4. **🌋 World 4-1: Lava Lair & Boss Battle** — Fortress drawbridge, fireball traps, and the showdown against **King Gromble** (3-phase boss fight)!

---

## ✨ Features & Mechanics

- **🍄 Mega Mushroom**: Grow giant and smash through brick blocks.
- **🔥 Magic Fire Wand**: Launch bouncing fireballs to bonk monsters.
- **⭐ Starman**: Rainbow glowing invincibility mode with star trails.
- **🛡️ Bubble Shield**: Protective forcefield that absorbs hits.
- **🌟 Kid Mode (Default ON)**: Infinite lives & friendly cloud balloon rescues from bottomless pits.
- **📱 Android & Mobile Touch Controls**: 56dp+ on-screen D-Pad and action buttons with haptic feedback (`navigator.vibrate`).
- **🎵 Web Audio API Chiptune Synth**: 100% self-contained sound effects and background music (zero external audio files).
- **📱 PWA Ready**: Installable as a standalone app on Android and iOS devices.

---

## 🕹️ Controls

| Action | Keyboard (Desktop) | Touch (Mobile / Tablet) | Gamepad (Controller) |
|---|---|---|---|
| **Move** | Arrow Keys / `A` `D` | Left & Right D-Pad | Left Stick / D-Pad |
| **Crouch** | Down Arrow / `S` | Down D-Pad | Down on D-Pad / Stick |
| **Jump** | `Space` / `Z` / `K` | `▲ JUMP` (Green Button) | `A` / `B` |
| **Magic / Dash** | `X` / `J` / `Shift` | `🔥 MAGIC` (Red Button) | `X` / `Y` |
| **Pause** | `P` / Top-right ⏸️ icon | Top-right ⏸️ icon | Start / Menu Button |

---

## 🚀 Getting Started

### 1. Run Directly
Double click `index.html` in your browser!

### 2. Local HTTP Server
```bash
npx serve .
# or
node -e "require('http').createServer((req,res)=>{let f='.'+req.url;if(f==='./')f='./index.html';require('fs').readFile(f,(e,c)=>{res.writeHead(e?404:200);res.end(c||'');});}).listen(3000,()=>console.log('http://localhost:3000/'));"
```
Open `http://localhost:3000/` in your browser.

---

## 📄 License
MIT License. Made with ❤️ for kids everywhere!
