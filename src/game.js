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
  }

  preload() {
    this.load.image('pitch', '/assets/backgrounds/pitch.png');
    this.load.image('crowd', '/assets/backgrounds/crowd_stands.png');
    this.load.image('goalposts', '/assets/sprites/goalposts.png');
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

    // 2. Crowd Stands (Spectators at Top and Bottom)
    this.add.image(width / 2, 90, 'crowd').setScale(1, 0.22);
    this.add.image(width / 2, 730, 'crowd').setScale(1, 0.12).setFlipY(true);

    // Slice goalkeeper & goalposts textures
    this.createGoalkeeperFrames();
    this.createGoalpostFrames();

    // Static boundaries for goal collisions
    this.postsGroup = this.physics.add.staticGroup();

    // Left Goal Posts
    const leftTopPost = this.add.rectangle(252, 260, 16, 16, 0xffffff, 0);
    const leftBottomPost = this.add.rectangle(252, 500, 16, 16, 0xffffff, 0);
    this.physics.add.existing(leftTopPost, true);
    this.physics.add.existing(leftBottomPost, true);
    this.postsGroup.add(leftTopPost);
    this.postsGroup.add(leftBottomPost);

    // Left Goal Back net
    const leftBackNet = this.add.rectangle(120, 380, 240, 10, 0xffffff, 0);
    this.physics.add.existing(leftBackNet, true);
    this.postsGroup.add(leftBackNet);

    // Right Goal Posts
    const rightTopPost = this.add.rectangle(1156, 260, 16, 16, 0xffffff, 0);
    const rightBottomPost = this.add.rectangle(1156, 500, 16, 16, 0xffffff, 0);
    this.physics.add.existing(rightTopPost, true);
    this.physics.add.existing(rightBottomPost, true);
    this.postsGroup.add(rightTopPost);
    this.postsGroup.add(rightBottomPost);

    // 3. Render cropped, correctly-scaled Goalposts (expose clean pitch while preserving nets)
    this.leftGoal = this.add.image(126, 380, 'goalposts_left').setScale(0.38);
    this.rightGoal = this.add.image(1282, 380, 'goalposts_right').setScale(0.38);

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
      p.body.setSize(160, 250);
      p.body.setOffset(96, 420);
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
      p.body.setSize(160, 250);
      p.body.setOffset(96, 420);
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
    this.gk1 = this.physics.add.sprite(165, 380, 'goalkeeper_ready_0');
    this.gk1.setScale(0.22); // Perfectly proportional goalkeeper
    this.gk1.setCollideWorldBounds(true);
    this.gk1.body.setImmovable(true);
    this.gk1.play('gk_ready');
    this.gk1.body.setSize(120, 160);
    this.gk1.body.setOffset(40, 20);

    // 7. AI Goalkeeper 2 (Right Goal)
    this.gk2 = this.physics.add.sprite(1243, 380, 'goalkeeper_ready_0');
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
    this.ball.setCollideWorldBounds(true);
    this.ball.setDamping(true);
    this.ball.setDrag(0.982);
    this.ball.setBounce(0.78);
    this.ball.body.setCircle(120);
    this.ball.body.setOffset(51, 51);

    // Bounds
    this.physics.world.setBounds(0, 175, width, 550);

    this.physics.add.collider(this.ball, this.postsGroup, () => {
      if (this.ballZ < 40) Sound.playBounce();
    });

    // Dribbling colliders
    this.bluePlayers.forEach(p => {
      this.physics.add.collider(p, this.ball, this.handlePlayerBallCollision, null, this);
    });
    this.redPlayers.forEach(p => {
      this.physics.add.collider(p, this.ball, this.handlePlayerBallCollision, null, this);
    });

    // GK block
    this.physics.add.collider(this.ball, this.gk1, this.handleGkBlock, null, this);
    this.physics.add.collider(this.ball, this.gk2, this.handleGkBlock, null, this);

    // Control Indicators
    this.blueIndicator = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0x60a5fa).setOrigin(0.5);
    this.redIndicator = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xf87171).setOrigin(0.5);

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
      
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });

    this.p1KickTime = 0;
    this.p2KickTime = 0;

    this.startTimer();
    this.gameActive = true;
    Sound.playWhistle();
  }

  update(time, delta) {
    if (!this.gameActive) return;

    this.updateBallHeight();
    this.handleAutoPlayerSwitching();

    const activeP1 = this.bluePlayers[this.activeBlueIdx];
    const activeP2 = this.redPlayers[this.activeRedIdx];

    this.blueIndicator.setPosition(activeP1.x, activeP1.y - 38);
    this.redIndicator.setPosition(activeP2.x, activeP2.y - 38);

    this.handlePlayer1Input(activeP1, time);
    this.handlePlayer2Input(activeP2, time);

    this.updateTeammatesAI();
    this.updateGkAI();
    this.checkGoals();
  }

  updateBallHeight() {
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

    this.ball.y = this.ball.body.y + this.ball.body.halfHeight - this.ballZ;
    this.ballShadow.x = this.ball.x;
    this.ballShadow.y = this.ball.body.y + this.ball.body.halfHeight;

    const scaleFactor = Math.max(0.3, 1 - this.ballZ / 200);
    this.ballShadow.setScale(scaleFactor);
    this.ballShadow.setAlpha(Math.max(0.1, 0.35 - this.ballZ / 400));
  }

  handleAutoPlayerSwitching() {
    let minBlueDist = Infinity;
    let closestBlueIdx = 0;
    this.bluePlayers.forEach((p, idx) => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (d < minBlueDist) {
        minBlueDist = d;
        closestBlueIdx = idx;
      }
    });

    if (closestBlueIdx !== this.activeBlueIdx) {
      this.bluePlayers[this.activeBlueIdx].setVelocity(0, 0);
      this.activeBlueIdx = closestBlueIdx;
    }

    let minRedDist = Infinity;
    let closestRedIdx = 0;
    this.redPlayers.forEach((p, idx) => {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (d < minRedDist) {
        minRedDist = d;
        closestRedIdx = idx;
      }
    });

    if (closestRedIdx !== this.activeRedIdx) {
      this.redPlayers[this.activeRedIdx].setVelocity(0, 0);
      this.activeRedIdx = closestRedIdx;
    }
  }

  handlePlayer1Input(activePlayer, time) {
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

    const isKicking = this.keys.space.isDown;
    if (isKicking && time > this.p1KickTime + 300) {
      activePlayer.play('blue_kick', true);
      this.p1KickTime = time;
      this.triggerTeamKick(activePlayer, 1, dx, dy);
    } else if (time > this.p1KickTime + 180) {
      if (isRunning) {
        activePlayer.play('blue_run', true);
      } else {
        activePlayer.play('blue_idle', true);
      }
    }
  }

  handlePlayer2Input(activePlayer, time) {
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
    } else if (this.keys.down.isDown && !this.keys.enter.isDown) {
      dy = 1;
    }

    const speed = 240;
    if (dx !== 0 && dy !== 0) {
      activePlayer.setVelocity(dx * speed * 0.707, dy * speed * 0.707);
    } else {
      activePlayer.setVelocity(dx * speed, dy * speed);
    }

    const isRunning = dx !== 0 || dy !== 0;

    const isKicking = this.keys.enter.isDown;
    if (isKicking && time > this.p2KickTime + 300) {
      activePlayer.play('red_kick', true);
      this.p2KickTime = time;
      this.triggerTeamKick(activePlayer, 2, dx, dy);
    } else if (time > this.p2KickTime + 180) {
      if (isRunning) {
        activePlayer.play('red_run', true);
      } else {
        activePlayer.play('red_idle', true);
      }
    }
  }

  triggerTeamKick(player, teamNum, dx, dy) {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
    if (dist < 75) {
      Sound.playKick();
      this.cameras.main.shake(80, 0.004);

      const teammates = teamNum === 1 ? this.bluePlayers : this.redPlayers;
      const passTarget = this.findTeammateInDirection(player, teammates, dx, dy);
      
      if (passTarget) {
        const angleRad = Phaser.Math.Angle.Between(player.x, player.y, passTarget.x, passTarget.y);
        const passSpeed = 450;
        
        this.ball.setVelocity(Math.cos(angleRad) * passSpeed, Math.sin(angleRad) * passSpeed);
        this.ballZVelocity = 2.8;
        
        this.showCoachShout(teamNum, 'BRILLIANT PASS!');
      } else {
        const targetX = teamNum === 1 ? 1408 : 0;
        const angleRad = Phaser.Math.Angle.Between(player.x, player.y, targetX, this.ball.y) + (Math.random() * 0.12 - 0.06);
        const shootSpeed = 580;
        
        this.ball.setVelocity(Math.cos(angleRad) * shootSpeed, Math.sin(angleRad) * shootSpeed);
        this.ballZVelocity = 7.5 + Math.random() * 3.5;
        
        this.showCoachShout(teamNum, 'SHOOT!!!');
      }
    }
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

  handlePlayerBallCollision(player, ball) {
    const pVelX = player.body.velocity.x;
    const pVelY = player.body.velocity.y;

    if (Math.abs(pVelX) > 10 || Math.abs(pVelY) > 10) {
      ball.setVelocityX(pVelX * 0.85 + (player.x < ball.x ? 22 : -22));
      ball.setVelocityY(pVelY * 0.85 + (player.y < ball.y ? 22 : -22));

      if (this.ballZ === 0 && Math.random() < 0.3) {
        this.ballZVelocity = 1.6;
        Sound.playBounce();
      }
    }
  }

  handleGkBlock(ball, gk) {
    if (this.ballZ < 65) {
      Sound.playBounce();
      this.cameras.main.shake(80, 0.003);
      
      const direction = gk.x < 700 ? 1 : -1;
      ball.setVelocityX(direction * (240 + Math.random() * 160));
      ball.setVelocityY((Math.random() * 2 - 1) * 150);
      this.ballZVelocity = 3.5 + Math.random() * 2.5;

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

    if (this.ballZ < 80) {
      if (this.ball.x < 240 && this.ball.y > 260 && this.ball.y < 500) {
        this.scoreGoal(2);
      }
      else if (this.ball.x > 1168 && this.ball.y > 260 && this.ball.y < 500) {
        this.scoreGoal(1);
      }
    }
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
    
    this.ball.setPosition(width / 2, 380);
    this.ball.setVelocity(0, 0);
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
      p.play('red_idle');
    });
    this.activeRedIdx = 0;

    this.gk1.setPosition(165, 380);
    this.gk2.setPosition(1243, 380);

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

  createGoalpostFrames() {
    // Dynamically slice Left and Right goals from goalposts.png
    // Left Goal Segment 0: X [35 to 673], Y [89 to 700] (Width: 639, Height: 612)
    this.textures.get('goalposts').add('goalposts_left', 0, 35, 89, 639, 612);
    
    // Right Goal Segment 1: X [733 to 1364], Y [71 to 706] (Width: 632, Height: 636)
    this.textures.get('goalposts').add('goalposts_right', 0, 733, 71, 632, 636);
  }
}
