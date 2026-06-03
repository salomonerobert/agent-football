# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR (primary development loop)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no test suite, linter, or formatter configured. Verification is done by running `npm run dev` and playing the game in a browser.

## Overview

A retro, local 2-player arcade soccer game ("Worldcup Mania") built with **Phaser 4** (Arcade physics) and bundled with **Vite**. Two players share one keyboard for a timed 5-a-side match. Despite the repo name (`agent-football`) and package name (`soccer-game`), there is no AI/LLM component — "agent" behavior refers to in-game AI for teammates and goalkeepers.

## Architecture

The app is split between a DOM/HTML shell and a single Phaser scene that owns all gameplay.

### DOM shell vs. Phaser canvas (`src/main.js`)
`main.js` injects the entire page chrome (start screen, controls guide, game-over overlay, coach "shout" input bar) as an HTML string into `#app`, then wires DOM event listeners. The Phaser game is **lazily instantiated** only when "KICK OFF!" is clicked (`startPhaserGame`), with a fixed 1408×768 canvas mounted in `#phaser-container`.

Communication crosses the DOM↔Phaser boundary in two ways:
- **DOM → Phaser:** `main.js` reaches into the live scene via `gameInstance.scene.getScene('SoccerGameScene')` and calls scene methods / mutates scene state directly (e.g. rematch resets `score1`/`matchTime`, the coach shout bar calls `scene.triggerPlayerKick`, `scene.showCoachShout`, etc.).
- **Phaser → DOM:** the scene fires a `window` `CustomEvent('soccer-game-over', { detail })` at full time; `main.js` listens for it to populate and show the game-over overlay.

Because `main.js` calls scene methods by name, renaming or changing the signature of scene methods referenced there (`showCoachShout`, `triggerPlayerKick`, `resetPositionsAfterGoal`, `startTimer`) will silently break the DOM controls.

### Game scene (`src/game.js`)
`SoccerGameScene` is the whole game in one class. Key subsystems within the standard Phaser `preload`/`create`/`update` lifecycle:

- **Teams:** two arrays `bluePlayers` / `redPlayers` of 4 outfield sprites each (the "5-a-side" count includes the keeper). Only one player per team is human-controlled at a time; `activeBlueIdx` / `activeRedIdx` track it. `handleAutoPlayerSwitching()` reassigns control to whichever teammate is closest to the ball (with margin + cooldown hysteresis), but **defers to the possessor** — control is pinned to whoever is dribbling.
- **Ball possession (`updatePossession()`):** the core ball↔player model. There is **no** ball-vs-outfield-player physics collider; instead the nearest player within ~46px of a slow, grounded ball *captures* it (`this.possessor`), and while possessed the ball is glued to the dribbler's feet each frame via `ball.body.reset(...)` (sticky/arcade dribbling). `lastTouchTeam` records the last team to touch it (drives throw-in/goal-kick awards); `captureReadyAt` is a short post-kick window during which the ball can't be re-captured so it actually leaves the kicker. Only **tackles, GK saves, and going out of bounds** break possession — defending requires a tackle.
- **Fake 3D ball height & rolling:** the ball has a manual Z axis (`ballZ`, `ballZVelocity`, `gravityZ`) integrated in `updateBallHeight(delta)`, independent of Arcade physics (purely top-down 2D). The rendered `y` is offset up by `ballZ`; a shadow tracks the ground position and scales with height. The same method also spins the sprite (rolling) and sets **dynamic drag** (heavy on the ground for rolling friction, light in the air). **Goal and GK-save checks gate on `ballZ`** (a shot too high doesn't count / can't be saved), and out-of-bounds uses the ball's *ground* y (`body.y + halfHeight`), not the z-offset render y.
- **Kicking (`releaseKick()`):** kicks are **hold-to-charge** — input handlers track `pNCharging`/`pNChargeStart`, and on key-up `chargePower()` maps the hold to a power in [0.35, 1.0] that scales pass/shot speed, loft and camera shake. `findTeammateInDirection()` (dot-product test) decides pass vs shot. `triggerTeamKick()` is a thin fixed-power wrapper used by the coach "shoot" command. A per-team power bar is drawn in `updatePowerMeter()`.
- **Slide tackle (`startTackle()` / `updateTackles()`):** SHIFT (P1) / `/` (P2) lunge the active player in the facing direction (no dedicated frame — pose faked with rotation + tint), with a cooldown. A sliding player steals the ball on contact and knocks back/stuns opponents.
- **Out of bounds (`checkOutOfBounds()` / `doRestart()`):** the ball is **not** `collideWorldBounds`; crossing a touchline → throw-in, crossing a goal line outside the scoring mouth → goal kick. Both award possession to the team opposite `lastTouchTeam` and resume via the nearest player. A dribbled (possessed) ball never counts as out.
- **AI:** `updateTeammatesAI()` drives non-active teammates with possession-aware positioning (attack support / nearest-presses-ball / defensive shape). `updateGkAI()` lerps keepers toward the ball's Y and probabilistically triggers dive animations.
- **Coaches:** speech-bubble feedback via `showCoachShout()`, driven both by game events (goals, saves, throw-ins) and by the DOM coach-shout input.

### Sprite slicing (important, non-obvious)
Several textures are **manually sub-sliced at runtime** rather than loaded as uniform spritesheets:
- Players load as spritesheets with fixed `frameWidth: 352, frameHeight: 768`.
- The **goalkeeper** texture is a single image cut into named frames via hardcoded pixel rectangles in `createGoalkeeperFrames()` (`this.textures.get(...).add(name, 0, x, y, w, h)`), and the **crowd** strips likewise in `createCrowdStrips()`. These coordinates are tied to the exact source PNGs in `public/assets/`; replacing those assets means recomputing the rectangles or the frames will be misaligned.

Goals are **drawn programmatically** as top-down nets in `drawGoals()` (the original isometric `goalposts.png` is unused). Goal/back-net collisions use invisible `add.rectangle(...)` static bodies built in `buildGoalColliders()` and grouped in `postsGroup`; all goal geometry (`goalMouthTop/Bottom`, `leftGoalLine/Back`, `rightGoalLine/Back`) is shared between the drawn nets, the colliders, and the scoring test in `checkGoals()`.

### Audio (`src/audio.js`)
`Sound` is a singleton `SoundManager` that synthesizes all SFX at runtime with the **Web Audio API** (oscillators + noise buffers) — there are no audio asset files. The `AudioContext` is created lazily and resumed on demand to satisfy browser autoplay policies.

## Assets

Game assets live in `public/assets/` (served at `/assets/...`) under `backgrounds/`, `sprites/`, `ui/`. `preprocess_assets.py` is a one-off offline utility (flood-fill white→transparent) that generated these PNGs from a source directory on the original author's machine; its hardcoded `/Users/...` paths are not part of the runtime and won't work as-is.

## Dead code

`src/counter.js` and `src/assets/` (`hero.png`, `vite.svg`, `javascript.svg`) are leftover Vite-template files and are not imported by the game.
