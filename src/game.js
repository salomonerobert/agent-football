import Phaser from 'phaser';
import { Sound } from './audio';

export class SoccerGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SoccerGameScene' });
    this.score1 = 0;
    this.score2 = 0;
    this.matchTime = 90;
    this.timerEvent = null;
    this.gameActive = false;
    this.isResetting = false;
    
    // Keyboard controls
    this.keys = null;

    // 3D Ball flight variables
    this.ballZ = 0;
    this.ballZVelocity = 0;
    this.gravityZ = -0.28;

    // 5-a-side team player tracking
    this.bluePlayers = [];
    this.redPlayers = [];
    this.activeBlueIdx = 0;
    this.activeRedIdx = 0;

    // Active-player auto-switch debouncing (prevents the controlled player
    // from oscillating between teammates that are near-equidistant to the ball)
    this.lastBlueSwitch = 0;
    this.lastRedSwitch = 0;

    // Ball possession model — replaces the old ball↔player bounce collider.
    // `possessor` is the outfield sprite currently dribbling (or null);
    // `lastTouchTeam` (1/2) drives throw-in/goal-kick awards; `captureReadyAt`
    // is a short window after a kick during which the ball can't be re-captured
    // so it actually leaves the kicker's feet.
    this.possessor = null;
    this.lastTouchTeam = 0;
    this.captureReadyAt = 0;

    // Charged-kick state (hold to build power, release to kick)
    this.p1Charging = false;
    this.p1ChargeStart = 0;
    this.p2Charging = false;
    this.p2ChargeStart = 0;

    // Slide-tackle state per player { active, endAt, cooldownUntil }
    this.p1Tackle = { active: false, endAt: 0, cooldownUntil: 0 };
    this.p2Tackle = { active: false, endAt: 0, cooldownUntil: 0 };

    // Out-of-bounds restart guard (throw-in / goal kick in progress)
    this.throwInActive = false;
  }

  preload() {
    this.load.image('pitch', '/assets/backgrounds/pitch.png');
    this.load.image('crowd', '/assets/backgrounds/crowd_stands.png');
    this.load.image('ad_board', '/assets/ui/ad_board.png');
    this.load.image('scoreboard', '/assets/ui/scoreboard.png');
    this.load.image('coach_portrait', '/assets/ui/coach_portrait.png');
    this.load.image('shout_input', '/assets/ui/shout_input.png');
    this.load.image('ball', '/assets/sprites/ball.png');

    // Load players sheets
    this.load.spritesheet('player_blue', '/assets/sprites/player_blue_team.png', {
      frameWidth: 352,
      frameHeight: 768
    });
    this.load.spritesheet('player_red', '/assets/sprites/player_red_team.png', {
      frameWidth: 352,
      frameHeight: 768
    });

    this.load.image('goalkeeper', '/assets/sprites/goalkeeper.png');
  }

  create() {
    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;

    // Reset team structures
    this.bluePlayers = [];
    this.redPlayers = [];
    this.activeBlueIdx = 0;
    this.activeRedIdx = 0;

    // 1. Pitch background (grass)
    this.add.image(width / 2, height / 2, 'pitch');

    // 2. Crowd Stands — show a full-width strip at native aspect ratio so the
    //    spectators are NOT squished. We slice a horizontal band out of the
    //    source texture and render it at scale 1 (the band's own aspect ratio
    //    already matches the screen width, so no distortion occurs).
    this.createCrowdStrips();
    // Drawn after the (opaque) pitch so the stands sit on top of its edges.
    this.add.image(width / 2, 75, 'crowd', 'crowd_top');
    this.add.image(width / 2, height - 40, 'crowd', 'crowd_bottom').setFlipY(true);

    // Slice goalkeeper texture into animation frames
    this.createGoalkeeperFrames();

    // 3. Goals — geometry shared by the drawn nets, the collision walls and
    //    the goal-line scoring test in checkGoals().
    this.goalMouthTop = 262;
    this.goalMouthBottom = 498;
    this.leftGoalLine = 238;   // ball crosses this (moving left) to score
    this.leftGoalBack = 150;
    this.rightGoalLine = 1170;
    this.rightGoalBack = 1258;

    this.postsGroup = this.physics.add.staticGroup();
    this.buildGoalColliders(this.leftGoalBack, this.leftGoalLine);
    this.buildGoalColliders(this.rightGoalLine, this.rightGoalBack);
    this.drawGoals();

    this.createPlayerAnimations();

    // 4. Create Outfield Blue Team (5-a-side)
    const blueSpawnCoords = [
      { x: 450, y: 380, role: 'active' },
      { x: 320, y: 250, role: 'teammate' },
      { x: 320, y: 510, role: 'teammate' },
      { x: 560, y: 380, role: 'teammate' }
    ];
    blueSpawnCoords.forEach((coord, idx) => {
      const p = this.physics.add.sprite(coord.x, coord.y, 'player_blue', 0);
      p.setScale(0.07); // Outfield players consistent size
      p.setCollideWorldBounds(true);
      // Body aligned to the visible figure (art spans y~134-651 in the frame)
      p.body.setSize(150, 430);
      p.body.setOffset(101, 200);
      p.setData('team', 1);
      p.setData('idx', idx);
      this.physics.add.collider(p, this.postsGroup);
      this.bluePlayers.push(p);
    });

    // 5. Create Outfield Red Team
    const redSpawnCoords = [
      { x: 958, y: 380, role: 'active' },
      { x: 1088, y: 250, role: 'teammate' },
      { x: 1088, y: 510, role: 'teammate' },
      { x: 848, y: 380, role: 'teammate' }
    ];
    redSpawnCoords.forEach((coord, idx) => {
      const p = this.physics.add.sprite(coord.x, coord.y, 'player_red', 0);
      p.setScale(0.07);
      p.setFlipX(true);
      p.setCollideWorldBounds(true);
      p.body.setSize(150, 430);
      p.body.setOffset(101, 200);
      p.setData('team', 2);
      p.setData('idx', idx);
      this.physics.add.collider(p, this.postsGroup);
      this.redPlayers.push(p);
    });

    // Colliders between players
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        this.physics.add.collider(this.bluePlayers[i], this.redPlayers[j]);
      }
      for (let k = i + 1; k < 4; k++) {
        this.physics.add.collider(this.bluePlayers[i], this.bluePlayers[k]);
        this.physics.add.collider(this.redPlayers[i], this.redPlayers[k]);
      }
    }

    // 6. AI Goalkeeper 1 (Left Goal)
    // Goalkeepers are consistent and slightly larger than outfield players!
    this.gk1 = this.physics.add.sprite(242, 380, 'goalkeeper', 'goalkeeper_ready_0');
    this.gk1.setScale(0.22); // Perfectly proportional goalkeeper
    this.gk1.setCollideWorldBounds(true);
    this.gk1.body.setImmovable(true);
    this.gk1.play('gk_ready');
    this.gk1.body.setSize(120, 160);
    this.gk1.body.setOffset(40, 20);

    // 7. AI Goalkeeper 2 (Right Goal)
    this.gk2 = this.physics.add.sprite(1166, 380, 'goalkeeper', 'goalkeeper_ready_0');
    this.gk2.setScale(0.22);
    this.gk2.setFlipX(true);
    this.gk2.setCollideWorldBounds(true);
    this.gk2.body.setImmovable(true);
    this.gk2.play('gk_ready');
    this.gk2.body.setSize(120, 160);
    this.gk2.body.setOffset(40, 20);

    // 8. Ball Shadow
    this.ballShadow = this.add.circle(width / 2, 380, 5, 0x000000, 0.35);

    // 9. Ball Sprite
    this.ball = this.physics.add.sprite(width / 2, 380, 'ball');
    this.ball.setScale(0.042);
    // The ball is NOT world-bounds-bound: it must be allowed to cross the
    // touchlines / goal lines so checkOutOfBounds() can award a throw-in.
    // A hard clamp in checkOutOfBounds keeps it from ever leaving the canvas.
    this.ball.setCollideWorldBounds(false);
    this.ball.setDamping(true);
    // Drag is set dynamically each frame in updateBallHeight() — heavy on the
    // ground (rolling friction) so the ball slows and settles, light in the air.
    this.ball.setDrag(0.55);
    this.ball.setBounce(0.78);
    // The ball art is a ~170px-radius circle centred at (~702, 384) in the
    // 1408x768 frame — centre the physics body on it so collisions and the
    // height-offset logic in updateBallHeight() line up with the visible ball.
    this.ball.body.setCircle(170, 532, 214);

    // Bounds — match the visible playfield (kept clear of the crowd strips)
    this.physics.world.setBounds(0, 150, width, 540);

    this.physics.add.collider(this.ball, this.postsGroup, () => {
      if (this.ballZ < 40) Sound.playBounce();
    });

    // Ball↔player contact is handled by the possession model in
    // updatePossession() (sticky dribbling), NOT a physics bounce collider.

    // GK block
    this.physics.add.collider(this.ball, this.gk1, this.handleGkBlock, null, this);
    this.physics.add.collider(this.ball, this.gk2, this.handleGkBlock, null, this);

    // Control Indicators
    this.blueIndicator = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0x60a5fa).setOrigin(0.5);
    this.redIndicator = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xf87171).setOrigin(0.5);

    // Power meter for charged kicks — redrawn each frame above the charging
    // player (see updatePowerMeter); empty when nobody is charging.
    this.powerBarGfx = this.add.graphics();

    // 10. Ad Boards
    this.adBoard = this.add.image(width / 2, 715, 'ad_board').setScale(0.22);

    // 11. Scoreboard
    this.scoreboard = this.add.image(width / 2, 70, 'scoreboard').setScale(0.35);

    this.scoreText1 = this.add.text(width / 2 - 78, 62, '0', {
      fontFamily: '"Outfit", "Inter", Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scoreText2 = this.add.text(width / 2 + 78, 62, '0', {
      fontFamily: '"Outfit", "Inter", Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.timeText = this.add.text(width / 2, 100, '01:30', {
      fontFamily: '"Outfit", "Inter", Arial, sans-serif',
      fontSize: '16px',
      color: '#ffcc00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.setupCoaches();

    // Keys
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT, // P1 slide tackle

      up: Phaser.Input.Keyboard.KeyCodes.UP,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      slash: Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH // P2 slide tackle
    });

    this.p1KickTime = 0;
    this.p2KickTime = 0;

    this.startTimer();
    this.gameActive = true;
    Sound.playWhistle();
  }

  update(time, delta) {
    if (!this.gameActive) return;

    this.updateBallHeight(delta);
    this.updatePossession(time);
    this.handleAutoPlayerSwitching(time);

    const activeP1 = this.bluePlayers[this.activeBlueIdx];
    const activeP2 = this.redPlayers[this.activeRedIdx];

    this.blueIndicator.setPosition(activeP1.x, activeP1.y - 38);
    this.redIndicator.setPosition(activeP2.x, activeP2.y - 38);

    this.handlePlayer1Input(activeP1, time);
    this.handlePlayer2Input(activeP2, time);
    this.updateTackles(time);
    this.updatePowerMeter(time, activeP1, activeP2);

    this.updateTeammatesAI();
    this.updateGkAI();
    this.checkGoals();
    this.checkOutOfBounds(time);
  }

  updateBallHeight(delta) {
    if (this.ballZ > 0 || this.ballZVelocity > 0) {
      this.ballZVelocity += this.gravityZ;
      this.ballZ += this.ballZVelocity;

      if (this.ballZ <= 0) {
        this.ballZ = 0;
        this.ballZVelocity = -this.ballZVelocity * 0.45;

        if (Math.abs(this.ballZVelocity) > 0.5) {
          Sound.playBounce();
        } else {
          this.ballZVelocity = 0;
        }
      }
    }

    // Rolling friction: a loose ball on the ground decelerates and settles;
    // a lofted ball keeps its pace until it lands. (Damping is enabled, so
    // drag is a per-second retention coefficient — lower = more friction.)
    // The possessor dribbles by directly setting velocity, so leave its drag
    // light to avoid fighting the glue.
    const airborne = this.ballZ > 5;
    this.ball.body.drag.set(this.possessor || airborne ? 0.9 : 0.55);

    // Visual roll — spin the sprite in the travel direction, scaled by speed.
    // Barely spins when lofted (it's flying, not rolling).
    const v = this.ball.body.velocity;
    const speed = Math.hypot(v.x, v.y);
    const dir = Math.abs(v.x) > 1 ? Math.sign(v.x) : (Math.abs(v.y) > 1 ? Math.sign(v.y) : 0);
    const groundedFactor = Math.max(0, 1 - this.ballZ / 120);
    this.ball.rotation += dir * speed * 0.00009 * (delta || 16) * groundedFactor;

    this.ball.y = this.ball.body.y + this.ball.body.halfHeight - this.ballZ;
    this.ballShadow.x = this.ball.x;
    this.ballShadow.y = this.ball.body.y + this.ball.body.halfHeight;

    const scaleFactor = Math.max(0.3, 1 - this.ballZ / 200);
    this.ballShadow.setScale(scaleFactor);
    this.ballShadow.setAlpha(Math.max(0.1, 0.35 - this.ballZ / 400));
  }

  handleAutoPlayerSwitching(time) {
    // When a team has the ball, control is pinned to the dribbler by
    // updatePossession() — don't let the chase heuristic override it.
    const possTeam = this.possessor ? this.possessor.getData('team') : 0;
    if (possTeam !== 1) {
      this.activeBlueIdx = this.resolveActivePlayer(
        this.bluePlayers, this.activeBlueIdx, 'blue', time
      );
    }
    if (possTeam !== 2) {
      this.activeRedIdx = this.resolveActivePlayer(
        this.redPlayers, this.activeRedIdx, 'red', time
      );
    }
  }

  // Reassign control to the teammate nearest the ball, but only when that
  // candidate is meaningfully closer than the current player AND a short
  // cooldown has elapsed. Without this hysteresis the active index oscillates
  // between near-equidistant players every frame, making the keys appear to
  // drive several players at once.
  resolveActivePlayer(team, activeIdx, key, time) {
    const SWITCH_MARGIN = 55;   // px the candidate must beat the current by
    const SWITCH_COOLDOWN = 280; // ms minimum between switches

    let closestIdx = activeIdx;
    let closestDist = Infinity;
    team.forEach((p, idx) => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = idx;
      }
    });

    if (closestIdx === activeIdx) return activeIdx;

    const lastSwitch = key === 'blue' ? this.lastBlueSwitch : this.lastRedSwitch;
    const activeDist = Phaser.Math.Distance.Between(
      team[activeIdx].x, team[activeIdx].y, this.ball.x, this.ball.y
    );

    if (closestDist + SWITCH_MARGIN < activeDist && time - lastSwitch > SWITCH_COOLDOWN) {
      team[activeIdx].setVelocity(0, 0); // hand the old player back to the AI cleanly
      if (key === 'blue') this.lastBlueSwitch = time; else this.lastRedSwitch = time;
      return closestIdx;
    }

    return activeIdx;
  }

  // Sticky-dribbling possession. A loose ball on the ground is captured by the
  // nearest outfield player; while possessed it glues to the dribbler's feet
  // and control snaps to that player. Replaces the old bounce collider.
  updatePossession(time) {
    const CAPTURE_RADIUS = 46;
    const FOOT_OFFSET = 26;

    if (this.possessor) {
      const p = this.possessor;
      // Possession ends if the carrier is disabled or the ball was kicked away.
      if (!p.body || !p.body.enable) {
        this.possessor = null;
      } else {
        const dir = p.flipX ? -1 : 1;
        // Glue the ball just ahead of the dribbler's feet. body.reset() teleports
        // it cleanly (zeroing the postUpdate delta) so it tracks without jitter;
        // the follow-up velocity gives it momentum for a natural roll/release.
        this.ball.body.reset(p.x + dir * FOOT_OFFSET, p.y + 8);
        this.ball.setVelocity(p.body.velocity.x + dir * 30, p.body.velocity.y);
        this.ballZ = 0;
        this.ballZVelocity = 0;
        this.lastTouchTeam = p.getData('team');

        // Pin control to the carrier so the human drives whoever has the ball.
        if (p.getData('team') === 1) this.activeBlueIdx = p.getData('idx');
        else this.activeRedIdx = p.getData('idx');
        return;
      }
    }

    // No possessor: try to capture a slow, grounded ball with the nearest
    // outfield player (skipped briefly after a kick, and during restarts).
    if (this.throwInActive || time < this.captureReadyAt || this.ballZ > 45) return;

    let best = null;
    let bestDist = CAPTURE_RADIUS;
    [...this.bluePlayers, ...this.redPlayers].forEach(p => {
      if (!p.body || !p.body.enable) return;
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    });

    if (best) {
      this.possessor = best;
      this.lastTouchTeam = best.getData('team');
    }
  }

  handlePlayer1Input(activePlayer, time) {
    // A sliding player can't be steered or kick — the lunge owns the velocity.
    if (this.p1Tackle.active) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.a.isDown) {
      dx = -1;
      activePlayer.setFlipX(true);
    } else if (this.keys.d.isDown) {
      dx = 1;
      activePlayer.setFlipX(false);
    }

    if (this.keys.w.isDown) {
      dy = -1;
    } else if (this.keys.s.isDown) {
      dy = 1;
    }

    const speed = 240;
    if (dx !== 0 && dy !== 0) {
      activePlayer.setVelocity(dx * speed * 0.707, dy * speed * 0.707);
    } else {
      activePlayer.setVelocity(dx * speed, dy * speed);
    }

    const isRunning = dx !== 0 || dy !== 0;

    // Slide tackle (Left SHIFT)
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
      this.startTackle(activePlayer, 1, dx, dy, time);
    }

    // Hold SPACE to charge, release to kick with power proportional to hold.
    if (this.keys.space.isDown) {
      if (!this.p1Charging) {
        this.p1Charging = true;
        this.p1ChargeStart = time;
      }
    } else if (this.p1Charging) {
      this.p1Charging = false;
      const power = this.chargePower(time - this.p1ChargeStart);
      activePlayer.play('blue_kick', true);
      this.p1KickTime = time;
      this.releaseKick(activePlayer, 1, dx, dy, power);
    }

    if (time > this.p1KickTime + 180) {
      if (isRunning) {
        activePlayer.play('blue_run', true);
      } else {
        activePlayer.play('blue_idle', true);
      }
    }
  }

  handlePlayer2Input(activePlayer, time) {
    if (this.p2Tackle.active) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.left.isDown) {
      dx = -1;
      activePlayer.setFlipX(true);
    } else if (this.keys.right.isDown) {
      dx = 1;
      activePlayer.setFlipX(false);
    }

    if (this.keys.up.isDown) {
      dy = -1;
    } else if (this.keys.down.isDown) {
      dy = 1;
    }

    const speed = 240;
    if (dx !== 0 && dy !== 0) {
      activePlayer.setVelocity(dx * speed * 0.707, dy * speed * 0.707);
    } else {
      activePlayer.setVelocity(dx * speed, dy * speed);
    }

    const isRunning = dx !== 0 || dy !== 0;

    // Slide tackle (forward-slash)
    if (Phaser.Input.Keyboard.JustDown(this.keys.slash)) {
      this.startTackle(activePlayer, 2, dx, dy, time);
    }

    // Hold ENTER to charge, release to kick.
    if (this.keys.enter.isDown) {
      if (!this.p2Charging) {
        this.p2Charging = true;
        this.p2ChargeStart = time;
      }
    } else if (this.p2Charging) {
      this.p2Charging = false;
      const power = this.chargePower(time - this.p2ChargeStart);
      activePlayer.play('red_kick', true);
      this.p2KickTime = time;
      this.releaseKick(activePlayer, 2, dx, dy, power);
    }

    if (time > this.p2KickTime + 180) {
      if (isRunning) {
        activePlayer.play('red_run', true);
      } else {
        activePlayer.play('red_idle', true);
      }
    }
  }

  // Map a charge hold duration (ms) to a kick power in [0.35, 1.0].
  chargePower(heldMs) {
    const MAX_CHARGE_MS = 700;
    return 0.35 + 0.65 * Phaser.Math.Clamp(heldMs / MAX_CHARGE_MS, 0, 1);
  }

  // Release the ball with a kick whose strength scales with `power` (0..1).
  // Decides pass vs shot from the held direction, then clears possession so the
  // ball actually leaves the kicker's feet.
  releaseKick(player, teamNum, dx, dy, power) {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
    const hasBall = this.possessor === player;
    if (!hasBall && dist >= 75) return;

    Sound.playKick();
    this.cameras.main.shake(60 + power * 90, 0.003 + power * 0.004);

    // Releasing always relinquishes possession; the capture cooldown keeps the
    // same player from instantly re-grabbing the ball.
    if (this.possessor === player) this.possessor = null;
    this.captureReadyAt = this.time.now + 260;
    this.lastTouchTeam = teamNum;

    // Kick direction comes from where the player is steering; if standing still,
    // use the facing direction (flipX). The ball goes where you point it.
    let kdx = dx;
    let kdy = dy;
    if (kdx === 0 && kdy === 0) {
      kdx = player.flipX ? -1 : 1;
      kdy = 0;
    }
    const klen = Math.hypot(kdx, kdy) || 1;
    kdx /= klen;
    kdy /= klen;

    const teammates = teamNum === 1 ? this.bluePlayers : this.redPlayers;
    const passTarget = this.findTeammateInDirection(player, teammates, kdx, kdy);

    if (passTarget) {
      // A teammate lies along the aim — pass to them (low, drilled).
      const angleRad = Phaser.Math.Angle.Between(player.x, player.y, passTarget.x, passTarget.y);
      const passSpeed = 300 + 360 * power;

      this.ball.setVelocity(Math.cos(angleRad) * passSpeed, Math.sin(angleRad) * passSpeed);
      this.ballZVelocity = 1.5 + 2.5 * power;

      this.showCoachShout(teamNum, power > 0.8 ? 'BRILLIANT PASS!' : 'NICE BALL!');
    } else {
      // Open shot — fire in the exact direction the player is moving/facing.
      const shootSpeed = 420 + 360 * power;

      this.ball.setVelocity(kdx * shootSpeed, kdy * shootSpeed);
      this.ballZVelocity = (2.5 + 4 * power) + Math.random();

      this.showCoachShout(teamNum, power > 0.7 ? 'SHOOT!!!' : 'GO ON!');
    }
  }

  // Back-compat thin wrapper (coach "shoot" command uses a fixed strong power).
  triggerTeamKick(player, teamNum, dx, dy) {
    this.releaseKick(player, teamNum, dx, dy, 0.85);
  }

  findTeammateInDirection(player, teammates, dx, dy) {
    if (dx === 0 && dy === 0) return null;

    let bestTarget = null;
    let bestScore = -Infinity;

    teammates.forEach(mate => {
      if (mate === player) return;

      const tdx = mate.x - player.x;
      const tdy = mate.y - player.y;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);

      if (dist > 480) return;

      const ntx = tdx / dist;
      const nty = tdy / dist;
      const dot = ntx * dx + nty * dy;

      if (dot > 0.68) {
        const score = dot * 100 - dist * 0.1;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = mate;
        }
      }
    });

    return bestTarget;
  }

  // --- Slide tackle ---
  startTackle(player, teamNum, dx, dy, time) {
    const state = teamNum === 1 ? this.p1Tackle : this.p2Tackle;
    if (state.active || time < state.cooldownUntil) return;

    // Lunge in the held direction, or straight ahead (facing) if standing still.
    let lx = dx;
    let ly = dy;
    if (lx === 0 && ly === 0) lx = player.flipX ? -1 : 1;
    const len = Math.hypot(lx, ly) || 1;
    const LUNGE = 420;
    player.setVelocity((lx / len) * LUNGE, (ly / len) * LUNGE);

    // No dedicated slide frame (only 4 frames) — fake the pose with rotation+tint.
    player.setRotation((player.flipX ? -1 : 1) * 1.2);
    player.setTint(0xffe08a);
    player.play(teamNum === 1 ? 'blue_run' : 'red_run', true);

    state.active = true;
    state.endAt = time + 320;
    // A player committing to a slide loses the ball they were carrying.
    if (this.possessor === player) {
      this.possessor = null;
      this.captureReadyAt = time + 200;
    }
    // Cancel any kick charge in progress for this player.
    if (teamNum === 1) this.p1Charging = false; else this.p2Charging = false;
    Sound.playJump();
  }

  updateTackles(time) {
    [[this.p1Tackle, this.bluePlayers, this.activeBlueIdx, 1],
     [this.p2Tackle, this.redPlayers, this.activeRedIdx, 2]].forEach(([state, team, idx, teamNum]) => {
      if (!state.active) return;
      const tackler = team[idx];

      // Steal: a sliding player reaching the ball wins possession.
      const dBall = Phaser.Math.Distance.Between(tackler.x, tackler.y, this.ball.x, this.ball.y);
      if (dBall < 52 && time >= this.captureReadyAt) {
        if (this.possessor && this.possessor.getData('team') !== teamNum) {
          this.showCoachShout(teamNum, 'GREAT TACKLE!');
        }
        this.possessor = tackler;
        this.lastTouchTeam = teamNum;
      }

      // Knock back any opponent the slide catches and briefly stun them.
      const opponents = teamNum === 1 ? this.redPlayers : this.bluePlayers;
      opponents.forEach(opp => {
        if (!opp.body || !opp.body.enable) return;
        const d = Phaser.Math.Distance.Between(tackler.x, tackler.y, opp.x, opp.y);
        if (d < 56) {
          const ang = Phaser.Math.Angle.Between(tackler.x, tackler.y, opp.x, opp.y);
          opp.setVelocity(Math.cos(ang) * 260, Math.sin(ang) * 260);
          if (this.possessor === opp) {
            this.possessor = null;
            this.captureReadyAt = time + 150;
          }
        }
      });

      if (time >= state.endAt) {
        state.active = false;
        state.cooldownUntil = time + 900;
        tackler.setRotation(0);
        tackler.clearTint();
        tackler.setVelocity(0, 0);
      }
    });
  }

  // Draw a power bar above a charging player (one bar per charging team).
  updatePowerMeter(time, activeP1, activeP2) {
    const g = this.powerBarGfx;
    g.clear();

    const drawBar = (player, charging, startTime, color) => {
      if (!charging) return;
      const power = this.chargePower(time - startTime);
      const w = 44;
      const h = 6;
      const x = player.x - w / 2;
      const y = player.y - 52;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(x, y, w, h);
      g.fillStyle(color, 1);
      g.fillRect(x, y, w * power, h);
    };

    drawBar(activeP1, this.p1Charging, this.p1ChargeStart, 0x60a5fa);
    drawBar(activeP2, this.p2Charging, this.p2ChargeStart, 0xf87171);
  }

  handleGkBlock(ball, gk) {
    if (this.ballZ < 65) {
      Sound.playBounce();
      this.cameras.main.shake(80, 0.003);

      // A save knocks the ball off whoever carried it into the keeper.
      this.possessor = null;
      this.captureReadyAt = this.time.now + 300;

      const direction = gk.x < 700 ? 1 : -1;
      ball.setVelocityX(direction * (240 + Math.random() * 160));
      ball.setVelocityY((Math.random() * 2 - 1) * 150);
      this.ballZVelocity = 3.5 + Math.random() * 2.5;
      this.lastTouchTeam = gk.x < 700 ? 1 : 2;

      const gkNum = gk.x < 700 ? 1 : 2;
      this.showCoachShout(gkNum, 'WORLD CLASS SAVE!');
    }
  }

  updateTeammatesAI() {
    let ballDistToBlue = Phaser.Math.Distance.Between(this.bluePlayers[this.activeBlueIdx].x, this.bluePlayers[this.activeBlueIdx].y, this.ball.x, this.ball.y);
    let ballDistToRed = Phaser.Math.Distance.Between(this.redPlayers[this.activeRedIdx].x, this.redPlayers[this.activeRedIdx].y, this.ball.x, this.ball.y);
    
    const blueHasPossession = ballDistToBlue < 150;
    const redHasPossession = ballDistToRed < 150;

    this.bluePlayers.forEach((p, idx) => {
      if (idx === this.activeBlueIdx) return;

      if (blueHasPossession) {
        const targetX = this.ball.x + (idx === 3 ? 280 : 140);
        const targetY = idx === 1 ? 230 : (idx === 2 ? 530 : 380);
        this.moveTeammateTowards(p, targetX, targetY, 140);
      } else if (redHasPossession) {
        const distToBall = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
        let closestMateToBall = true;
        
        this.bluePlayers.forEach((otherP, oIdx) => {
          if (oIdx === this.activeBlueIdx || otherP === p) return;
          if (Phaser.Math.Distance.Between(otherP.x, otherP.y, this.ball.x, this.ball.y) < distToBall) {
            closestMateToBall = false;
          }
        });

        if (closestMateToBall) {
          this.moveTeammateTowards(p, this.ball.x, this.ball.y, 180);
        } else {
          const targetX = idx === 1 ? 350 : (idx === 2 ? 350 : 480);
          const targetY = idx === 1 ? 260 : (idx === 2 ? 500 : 380);
          this.moveTeammateTowards(p, targetX, targetY, 120);
        }
      } else {
        const distToBall = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
        let closestMate = true;
        this.bluePlayers.forEach((otherP, oIdx) => {
          if (oIdx === this.activeBlueIdx || otherP === p) return;
          if (Phaser.Math.Distance.Between(otherP.x, otherP.y, this.ball.x, this.ball.y) < distToBall) {
            closestMate = false;
          }
        });

        if (closestMate) {
          this.moveTeammateTowards(p, this.ball.x, this.ball.y, 160);
        } else {
          const targetX = idx === 1 ? 400 : (idx === 2 ? 400 : 550);
          const targetY = idx === 1 ? 280 : (idx === 2 ? 480 : 380);
          this.moveTeammateTowards(p, targetX, targetY, 120);
        }
      }
    });

    this.redPlayers.forEach((p, idx) => {
      if (idx === this.activeRedIdx) return;

      if (redHasPossession) {
        const targetX = this.ball.x - (idx === 3 ? 280 : 140);
        const targetY = idx === 1 ? 230 : (idx === 2 ? 530 : 380);
        this.moveTeammateTowards(p, targetX, targetY, 140);
      } else if (blueHasPossession) {
        const distToBall = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
        let closestMate = true;
        this.redPlayers.forEach((otherP, oIdx) => {
          if (oIdx === this.activeRedIdx || otherP === p) return;
          if (Phaser.Math.Distance.Between(otherP.x, otherP.y, this.ball.x, this.ball.y) < distToBall) {
            closestMate = false;
          }
        });

        if (closestMate) {
          this.moveTeammateTowards(p, this.ball.x, this.ball.y, 180);
        } else {
          const targetX = idx === 1 ? 1050 : (idx === 2 ? 1050 : 920);
          const targetY = idx === 1 ? 260 : (idx === 2 ? 500 : 380);
          this.moveTeammateTowards(p, targetX, targetY, 120);
        }
      } else {
        const distToBall = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
        let closestMate = true;
        this.redPlayers.forEach((otherP, oIdx) => {
          if (oIdx === this.activeRedIdx || otherP === p) return;
          if (Phaser.Math.Distance.Between(otherP.x, otherP.y, this.ball.x, this.ball.y) < distToBall) {
            closestMate = false;
          }
        });

        if (closestMate) {
          this.moveTeammateTowards(p, this.ball.x, this.ball.y, 160);
        } else {
          const targetX = idx === 1 ? 1000 : (idx === 2 ? 1000 : 850);
          const targetY = idx === 1 ? 280 : (idx === 2 ? 480 : 380);
          this.moveTeammateTowards(p, targetX, targetY, 120);
        }
      }
    });
  }

  moveTeammateTowards(player, x, y, speed) {
    const dx = x - player.x;
    const dy = y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      player.setVelocity(vx, vy);
      player.setFlipX(vx < 0);
      player.play(player.getData('team') === 1 ? 'blue_run' : 'red_run', true);
    } else {
      player.setVelocity(0, 0);
      player.play(player.getData('team') === 1 ? 'blue_idle' : 'red_idle', true);
    }
  }

  updateGkAI() {
    const ballX = this.ball.x;
    const ballY = this.ball.y;

    if (ballX < 450) {
      const targetY = Phaser.Math.Clamp(ballY, 280, 480);
      this.gk1.y += (targetY - this.gk1.y) * 0.08;

      if (ballX < 280 && Math.abs(ballY - this.gk1.y) > 35 && !this.gk1.anims.isPlaying && Math.random() < 0.1) {
        const isDivingUp = ballY < this.gk1.y;
        this.gk1.play(isDivingUp ? 'gk_dive_left' : 'gk_dive_right');
      }
    } else {
      this.gk1.y += (380 - this.gk1.y) * 0.05;
    }

    if (ballX > 958) {
      const targetY = Phaser.Math.Clamp(ballY, 280, 480);
      this.gk2.y += (targetY - this.gk2.y) * 0.08;

      if (ballX > 1128 && Math.abs(ballY - this.gk2.y) > 35 && !this.gk2.anims.isPlaying && Math.random() < 0.1) {
        const isDivingUp = ballY < this.gk2.y;
        this.gk2.play(isDivingUp ? 'gk_dive_right' : 'gk_dive_left');
      }
    } else {
      this.gk2.y += (380 - this.gk2.y) * 0.05;
    }
  }

  checkGoals() {
    if (this.isResetting) return;

    if (this.ballZ < 80 && this.ball.y > this.goalMouthTop && this.ball.y < this.goalMouthBottom) {
      if (this.ball.x < this.leftGoalLine) {
        this.scoreGoal(2);
      }
      else if (this.ball.x > this.rightGoalLine) {
        this.scoreGoal(1);
      }
    }
  }

  // Detect the ball leaving the field of play and award a throw-in (touchline)
  // or goal kick (goal line outside the scoring mouth) to the team that did NOT
  // touch it last. Runs after checkGoals() so a real goal always wins.
  checkOutOfBounds(time) {
    // Only a loose/kicked ball goes out — a dribbler keeps it in play.
    if (this.isResetting || this.throwInActive || this.possessor) return;

    const TOUCH_TOP = 178;
    const TOUCH_BOTTOM = 662;
    const GOAL_LINE_L = 150;
    const GOAL_LINE_R = 1258;

    const bx = this.ball.x;
    // Use the ball's ground position (not the z-offset rendered y) so a high
    // ball flying over the line isn't mis-flagged based on its visual height.
    const by = this.ball.body.y + this.ball.body.halfHeight;

    let label = null;
    let x = bx;
    let y = by;

    if (by < TOUCH_TOP) { label = 'THROW-IN'; y = TOUCH_TOP + 14; }
    else if (by > TOUCH_BOTTOM) { label = 'THROW-IN'; y = TOUCH_BOTTOM - 14; }
    else if (bx < GOAL_LINE_L) { label = 'GOAL KICK'; x = GOAL_LINE_L + 24; }
    else if (bx > GOAL_LINE_R) { label = 'GOAL KICK'; x = GOAL_LINE_R - 24; }

    if (!label) return;

    // Keep the restart spot well inside the field.
    x = Phaser.Math.Clamp(x, 60, 1348);
    y = Phaser.Math.Clamp(y, TOUCH_TOP + 14, TOUCH_BOTTOM - 14);

    const awardTeam = this.lastTouchTeam === 1 ? 2 : 1;
    this.doRestart(awardTeam, x, y, label);
  }

  // Place the ball back in play at (x, y) and hand possession to the awarded
  // team's nearest player. A short freeze prevents the OOB check from
  // re-triggering on the same frame the ball is still past the line.
  doRestart(teamNum, x, y, label) {
    this.throwInActive = true;
    this.possessor = null;
    this.captureReadyAt = this.time.now + 400;

    this.ball.body.reset(x, y);
    this.ballZ = 0;
    this.ballZVelocity = 0;

    const team = teamNum === 1 ? this.bluePlayers : this.redPlayers;
    let taker = team[0];
    let bestDist = Infinity;
    team.forEach(p => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, x, y);
      if (d < bestDist) { bestDist = d; taker = p; }
    });
    // Bring the taker to the ball and face it inward.
    const inward = teamNum === 1 ? 1 : -1;
    taker.setPosition(x - inward * 34, y);
    taker.setVelocity(0, 0);
    taker.setFlipX(inward < 0);
    if (teamNum === 1) this.activeBlueIdx = taker.getData('idx');
    else this.activeRedIdx = taker.getData('idx');
    this.lastTouchTeam = teamNum;

    const banner = this.add.text(x, y - 60, label, {
      fontFamily: '"Outfit", "Inter", Arial, sans-serif',
      fontSize: '28px',
      color: teamNum === 1 ? '#3b82f6' : '#ef4444',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(20);
    this.showCoachShout(teamNum, label + '!');
    Sound.playWhistle();

    this.time.delayedCall(700, () => {
      banner.destroy();
      this.throwInActive = false;
      // Give the taker the ball so play resumes under their control.
      this.possessor = taker;
      this.captureReadyAt = 0;
    });
  }

  scoreGoal(scoringPlayer) {
    this.isResetting = true;
    Sound.playGoal();
    this.cameras.main.shake(400, 0.012);
    this.cameras.main.flash(300, 255, 255, 255);

    if (scoringPlayer === 1) {
      this.score1++;
      this.scoreText1.setText(this.score1);
      this.showCoachShout(1, 'GOAAAAAAL!!! PERFECT!');
      this.showCoachShout(2, 'NOOO! DEFEND!', true);
    } else {
      this.score2++;
      this.scoreText2.setText(this.score2);
      this.showCoachShout(2, 'GOAAAAAAL!!! MAGNIFICENT!');
      this.showCoachShout(1, 'FOCUS GUYS! WAKE UP!', true);
    }

    const goalText = this.add.text(704, 300, 'GOAL!!!', {
      fontFamily: '"Outfit", "Inter", Arial, sans-serif',
      fontSize: '96px',
      color: scoringPlayer === 1 ? '#3b82f6' : '#ef4444',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 12,
      shadow: { color: '#000000', blur: 15, stroke: true, fill: true }
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: goalText,
      scale: 1,
      duration: 500,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: goalText,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => {
              goalText.destroy();
              this.resetPositionsAfterGoal();
            }
          });
        });
      }
    });
  }

  resetPositionsAfterGoal() {
    const width = this.sys.game.config.width;

    // Clear ball-state machines so the kickoff starts neutral.
    this.possessor = null;
    this.throwInActive = false;
    this.captureReadyAt = 0;
    this.lastTouchTeam = 0;
    this.p1Charging = false;
    this.p2Charging = false;
    this.p1Tackle = { active: false, endAt: 0, cooldownUntil: 0 };
    this.p2Tackle = { active: false, endAt: 0, cooldownUntil: 0 };
    if (this.powerBarGfx) this.powerBarGfx.clear();

    this.ball.setPosition(width / 2, 380);
    this.ball.setVelocity(0, 0);
    this.ball.setRotation(0);
    this.ballZ = 0;
    this.ballZVelocity = 0;

    const blueSpawnCoords = [
      { x: 450, y: 380 },
      { x: 320, y: 250 },
      { x: 320, y: 510 },
      { x: 560, y: 380 }
    ];
    this.bluePlayers.forEach((p, idx) => {
      p.setPosition(blueSpawnCoords[idx].x, blueSpawnCoords[idx].y);
      p.setVelocity(0, 0);
      p.setRotation(0);
      p.clearTint();
      p.play('blue_idle');
    });
    this.activeBlueIdx = 0;

    const redSpawnCoords = [
      { x: 958, y: 380 },
      { x: 1088, y: 250 },
      { x: 1088, y: 510 },
      { x: 848, y: 380 }
    ];
    this.redPlayers.forEach((p, idx) => {
      p.setPosition(redSpawnCoords[idx].x, redSpawnCoords[idx].y);
      p.setVelocity(0, 0);
      p.setRotation(0);
      p.clearTint();
      p.play('red_idle');
    });
    this.activeRedIdx = 0;

    this.gk1.setPosition(242, 380);
    this.gk2.setPosition(1166, 380);

    Sound.playWhistle();
    this.isResetting = false;
  }

  startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.matchTime--;
        
        const mins = Math.floor(this.matchTime / 60);
        const secs = this.matchTime % 60;
        this.timeText.setText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

        if (this.matchTime <= 0) {
          this.endMatch();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  endMatch() {
    this.gameActive = false;
    this.timerEvent.destroy();
    Sound.playWhistle();

    this.ball.body.setEnable(false);
    this.bluePlayers.forEach(p => p.body.setEnable(false));
    this.redPlayers.forEach(p => p.body.setEnable(false));

    let winnerMsg = 'DRAW!';
    let winColor = '#ffcc00';
    if (this.score1 > this.score2) {
      winnerMsg = 'BLUE TEAM WINS!';
      winColor = '#3b82f6';
    } else if (this.score2 > this.score1) {
      winnerMsg = 'RED TEAM WINS!';
      winColor = '#ef4444';
    }

    window.dispatchEvent(new CustomEvent('soccer-game-over', {
      detail: {
        winnerMsg,
        winColor,
        score1: this.score1,
        score2: this.score2
      }
    }));
  }

  // Full reset for a rematch — re-enables physics bodies, resets score/clock
  // and positions. Called from the DOM "REMATCH" button in main.js.
  restartMatch() {
    this.score1 = 0;
    this.score2 = 0;
    this.matchTime = 90;
    this.scoreText1.setText('0');
    this.scoreText2.setText('0');
    this.timeText.setText('01:30');
    this.isResetting = false;

    this.ball.body.setEnable(true);
    this.bluePlayers.forEach(p => p.body.setEnable(true));
    this.redPlayers.forEach(p => p.body.setEnable(true));

    this.resetPositionsAfterGoal();
    this.startTimer();
    this.gameActive = true;
  }

  setupCoaches() {
    this.coach1 = this.add.image(60, 715, 'coach_portrait').setScale(0.10);
    this.shout1 = this.add.image(160, 675, 'shout_input').setScale(0.12).setAlpha(0);
    this.shoutText1 = this.add.text(160, 668, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.coach2 = this.add.image(1348, 715, 'coach_portrait').setScale(0.10).setFlipX(true);
    this.shout2 = this.add.image(1248, 675, 'shout_input').setScale(0.12).setAlpha(0).setFlipX(true);
    this.shoutText2 = this.add.text(1248, 668, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
  }

  showCoachShout(coachNum, message, isAngry = false) {
    const shoutBg = coachNum === 1 ? this.shout1 : this.shout2;
    const shoutText = coachNum === 1 ? this.shoutText1 : this.shoutText2;

    shoutText.setText(message);
    shoutBg.setAlpha(1);
    shoutText.setAlpha(1);

    this.tweens.add({
      targets: [shoutBg, shoutText],
      scale: coachNum === 1 ? 0.15 : { x: -0.15, y: 0.15 },
      duration: 100,
      yoyo: true,
      repeat: 0,
      onComplete: () => {
        shoutBg.setScale(0.12);
        if (coachNum === 2) shoutBg.scaleX = -0.12;
        shoutText.setScale(1);
      }
    });

    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: [shoutBg, shoutText],
        alpha: 0,
        duration: 200
      });
    });
  }

  createPlayerAnimations() {
    this.anims.create({
      key: 'blue_idle',
      frames: [{ key: 'player_blue', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'blue_run',
      frames: this.anims.generateFrameNumbers('player_blue', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'blue_kick',
      frames: [{ key: 'player_blue', frame: 3 }],
      frameRate: 1
    });

    this.anims.create({
      key: 'red_idle',
      frames: [{ key: 'player_red', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'red_run',
      frames: this.anims.generateFrameNumbers('player_red', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'red_kick',
      frames: [{ key: 'player_red', frame: 3 }],
      frameRate: 1
    });
  }

  createGoalkeeperFrames() {
    const readyCoords = [
      { x: 35, w: 206 },
      { x: 263, w: 205 },
      { x: 501, w: 192 },
      { x: 730, w: 191 },
      { x: 941, w: 206 },
      { x: 1168, w: 205 }
    ];
    
    readyCoords.forEach((coord, idx) => {
      this.textures.get('goalkeeper').add(`goalkeeper_ready_${idx}`, 0, coord.x, 49, coord.w, 198);
    });

    const diveLeftCoords = [
      { x: 35, w: 255 },
      { x: 307, w: 262 },
      { x: 586, w: 251 },
      { x: 856, w: 252 },
      { x: 1119, w: 254 }
    ];
    diveLeftCoords.forEach((coord, idx) => {
      this.textures.get('goalkeeper').add(`goalkeeper_dive_left_${idx}`, 0, coord.x, 307, coord.w, 180);
    });

    const diveRightCoords = [
      { x: 35, w: 259 },
      { x: 312, w: 255 },
      { x: 583, w: 254 },
      { x: 850, w: 253 },
      { x: 1119, w: 254 }
    ];
    diveRightCoords.forEach((coord, idx) => {
      this.textures.get('goalkeeper').add(`goalkeeper_dive_right_${idx}`, 0, coord.x, 556, coord.w, 177);
    });

    this.anims.create({
      key: 'gk_ready',
      frames: [
        { key: 'goalkeeper', frame: 'goalkeeper_ready_0' },
        { key: 'goalkeeper', frame: 'goalkeeper_ready_1' },
        { key: 'goalkeeper', frame: 'goalkeeper_ready_2' },
        { key: 'goalkeeper', frame: 'goalkeeper_ready_3' },
        { key: 'goalkeeper', frame: 'goalkeeper_ready_4' },
        { key: 'goalkeeper', frame: 'goalkeeper_ready_5' }
      ],
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'gk_dive_left',
      frames: [
        { key: 'goalkeeper', frame: 'goalkeeper_dive_left_0' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_left_1' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_left_2' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_left_3' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_left_4' }
      ],
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: 'gk_dive_right',
      frames: [
        { key: 'goalkeeper', frame: 'goalkeeper_dive_right_0' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_right_1' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_right_2' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_right_3' },
        { key: 'goalkeeper', frame: 'goalkeeper_dive_right_4' }
      ],
      frameRate: 8,
      repeat: 0
    });
  }

  createCrowdStrips() {
    // The crowd source is 1408x768 and fully opaque. Adding full-width frames
    // and rendering them at scale 1 shows the spectators without the vertical
    // squish that scaling the whole image to (1, 0.22) produced.
    const tex = this.textures.get('crowd');
    tex.add('crowd_top', 0, 0, 0, 1408, 150);
    tex.add('crowd_bottom', 0, 0, 250, 1408, 80);
  }

  // Build the invisible static collision walls for one goal. The mouth faces
  // the pitch; the back and sides contain the ball once it crosses the line.
  buildGoalColliders(backX, frontX) {
    const top = this.goalMouthTop;
    const bottom = this.goalMouthBottom;
    const midX = (backX + frontX) / 2;
    const midY = (top + bottom) / 2;
    const sideW = Math.abs(frontX - backX);
    const mouthH = bottom - top;

    const addWall = (x, y, w, h) => {
      const r = this.add.rectangle(x, y, w, h, 0xffffff, 0);
      this.physics.add.existing(r, true);
      this.postsGroup.add(r);
    };

    addWall(backX, midY, 10, mouthH);        // back net
    addWall(midX, top, sideW, 10);           // top side net
    addWall(midX, bottom, sideW, 10);        // bottom side net
    addWall(frontX, top, 12, 12);            // front post (top)
    addWall(frontX, bottom, 12, 12);         // front post (bottom)
  }

  // Draw both goals as clean top-down nets aligned to the collision walls.
  drawGoals() {
    // Default depth: drawn before players/ball so they appear in front of the net.
    const g = this.add.graphics();
    const top = this.goalMouthTop;
    const bottom = this.goalMouthBottom;

    const drawGoal = (backX, frontX) => {
      const x0 = Math.min(backX, frontX);
      const x1 = Math.max(backX, frontX);
      const w = x1 - x0;
      const h = bottom - top;

      // Net fill
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(x0, top, w, h);

      // Net grid
      g.lineStyle(1, 0xffffff, 0.35);
      const step = 18;
      for (let x = x0; x <= x1; x += step) {
        g.lineBetween(x, top, x, bottom);
      }
      for (let y = top; y <= bottom; y += step) {
        g.lineBetween(x0, y, x1, y);
      }

      // Posts & crossbars (thick white frame)
      g.lineStyle(5, 0xffffff, 1);
      g.lineBetween(frontX, top, frontX, bottom); // goal line / posts plane
      g.lineBetween(x0, top, x1, top);            // top bar
      g.lineBetween(x0, bottom, x1, bottom);      // bottom bar
      g.lineBetween(backX, top, backX, bottom);   // back

      // Post nubs at the mouth
      g.fillStyle(0xffffff, 1);
      g.fillCircle(frontX, top, 4);
      g.fillCircle(frontX, bottom, 4);
    };

    drawGoal(this.leftGoalBack, this.leftGoalLine);
    drawGoal(this.rightGoalBack, this.rightGoalLine);
  }

  // --- Coach commands (invoked from the DOM shout bar in main.js) ---
  coachShoot(teamNum) {
    const player = teamNum === 1
      ? this.bluePlayers[this.activeBlueIdx]
      : this.redPlayers[this.activeRedIdx];
    const dir = teamNum === 1 ? 1 : -1;
    this.triggerTeamKick(player, teamNum, dir, 0);
  }

  coachJump(teamNum) {
    const player = teamNum === 1
      ? this.bluePlayers[this.activeBlueIdx]
      : this.redPlayers[this.activeRedIdx];
    this.tweens.add({
      targets: player,
      y: player.y - 60,
      duration: 150,
      yoyo: true,
      onStart: () => Sound.playJump()
    });
  }

  coachDefend(teamNum) {
    const player = teamNum === 1
      ? this.bluePlayers[this.activeBlueIdx]
      : this.redPlayers[this.activeRedIdx];
    player.setPosition(teamNum === 1 ? 380 : 1028, player.y);
    this.showCoachShout(teamNum, 'FALLING BACK!');
  }

  coachAttack(teamNum) {
    const player = teamNum === 1
      ? this.bluePlayers[this.activeBlueIdx]
      : this.redPlayers[this.activeRedIdx];
    player.setPosition(teamNum === 1 ? 750 : 658, player.y);
    this.showCoachShout(teamNum, 'GOING FORWARD!');
  }
}
