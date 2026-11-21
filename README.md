# Midnight Gallery — Make the best stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Van7art/best-stealth-game-20261121-1759-entry/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Van7art/best-stealth-game-20261121-1759-entry/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down museum heist. You are a thief in the Midnight Gallery after
closing time: steal the Sunken Idol, the Crimson Vase and the Gilded Mask,
then slip out the exit unseen.

Three wardens patrol the halls with visible vision cones that bend around
walls and pedestals. Two security cameras sweep the galleries. Two laser
doorways blink live and dark on a fixed rhythm — cross only while dark.
Shadow pockets hide you; sneaking keeps your footsteps quiet; a tossed
pebble lures the nearest guard away to look. Get spotted and suspicion
rises; at full, the alarm sounds and every guard gives chase. Get caught
and the night is over. Slip out with all three artifacts for a GHOST
rating.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests — the game is static files under `game/`.

## Controls

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Mouse click** — toss a pebble toward the clicked floor tile
- **M** — mute sound, **P** — pause, **R** — restart, **Enter** — start

## Layout

- `game/index.html` — page, canvas, status line
- `game/styles.css` — page chrome
- `game/src/main.js` — entry point, game loop, screenshot scenes
- `game/src/config.js` — tuning constants
- `game/src/level.js` — the museum floor plan
- `game/src/vision.js` — line of sight, vision cones, spotting
- `game/src/guards.js` — patrol, suspicion, investigation, chase
- `game/src/cameras.js` — sweeping security cameras
- `game/src/lasers.js` — blinking laser doorways
- `game/src/player.js` — the thief: movement, pebbles, pickups
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio effects
- `game/src/render.js` — all canvas drawing and HUD
- `game/src/shots.js` — scripted screenshot scenes (`?shot=cover|sneak|alarm|exit`)
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes `dossier.json`)

## Screenshots

`?shot=cover` stages the level at its best, `?shot=sneak` catches the
thief hiding in shadow as a guard closes in, `?shot=alarm` shows the
full alarm with every guard chasing, and `?shot=exit` shows the getaway
at the exit door.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4e96xqxt&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
