# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR (primary development loop)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no test suite, linter, or formatter configured. Verification is done by running `npm run dev` and playing the game in a browser.

## Overview

A retro, local 2-player arcade soccer game ("SUPER SOCCER DUEL") built with **Phaser 4** (Arcade physics) and bundled with **Vite**. Two players share one keyboard for a timed 5-a-side match. Despite the repo name (`agent-football`) and package name (`soccer-game`), there is no AI/LLM component — "agent" behavior refers to in-game AI for teammates and goalkeepers.

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

- **Teams:** two arrays `bluePlayers` / `redPlayers` of 4 outfield sprites each (the "5-a-side" count includes the keeper). Only one player per team is human-controlled at a time; `activeBlueIdx` / `activeRedIdx` track it. `handleAutoPlayerSwitching()` reassigns control each frame to whichever teammate is closest to the ball.
- **Fake 3D ball height:** the ball has a manual Z axis (`ballZ`, `ballZVelocity`, `gravityZ`) integrated in `updateBallHeight()`, independent of Arcade physics (which is purely top-down 2D). The sprite's rendered `y` is offset upward by `ballZ`, and a separate shadow circle tracks the ground position and scales with height. **Goal and goalkeeper-save checks gate on `ballZ`** (a shot flying too high doesn't count / can't be saved), so any change to scoring or saves must account for ball height.
- **AI:** `updateTeammatesAI()` drives non-active teammates with possession-aware positioning (attack support / nearest-presses-ball / defensive shape). `updateGkAI()` lerps keepers toward the ball's Y and probabilistically triggers dive animations.
- **Kicking/passing:** `triggerTeamKick()` decides between a pass and a shot — `findTeammateInDirection()` looks for a teammate aligned with the input direction (dot-product test); if found it passes, otherwise it shoots toward the opponent goal.
- **Coaches:** speech-bubble feedback via `showCoachShout()`, driven both by game events (goals, saves) and by the DOM coach-shout input.

### Sprite slicing (important, non-obvious)
Several textures are **manually sub-sliced at runtime** rather than loaded as uniform spritesheets:
- Players load as spritesheets with fixed `frameWidth: 352, frameHeight: 768`.
- The **goalkeeper** and **goalposts** textures are single images cut into named frames via hardcoded pixel rectangles in `createGoalkeeperFrames()` and `createGoalpostFrames()` (`this.textures.get(...).add(name, 0, x, y, w, h)`). These coordinates are tied to the exact source PNGs in `public/assets/`. If a goalkeeper or goalposts asset is replaced, these pixel coordinates must be recomputed or the frames will be misaligned.

Goal posts/back-net collisions use invisible `add.rectangle(...)` static bodies (`postsGroup`) positioned by hand — visually separate from the rendered goalpost images.

### Audio (`src/audio.js`)
`Sound` is a singleton `SoundManager` that synthesizes all SFX at runtime with the **Web Audio API** (oscillators + noise buffers) — there are no audio asset files. The `AudioContext` is created lazily and resumed on demand to satisfy browser autoplay policies.

## Assets

Game assets live in `public/assets/` (served at `/assets/...`) under `backgrounds/`, `sprites/`, `ui/`. `preprocess_assets.py` is a one-off offline utility (flood-fill white→transparent) that generated these PNGs from a source directory on the original author's machine; its hardcoded `/Users/...` paths are not part of the runtime and won't work as-is.

## Dead code

`src/counter.js` and `src/assets/` (`hero.png`, `vite.svg`, `javascript.svg`) are leftover Vite-template files and are not imported by the game.
