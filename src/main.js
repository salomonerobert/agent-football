import './style.css';
import Phaser from 'phaser';
import { SoccerGameScene } from './game';
import { Sound } from './audio';

let gameInstance = null;

// HTML Structure for premium design matching reference GIF
document.querySelector('#app').innerHTML = `
  <div class="game-wrapper">
    <!-- Title Header -->
    <header class="game-header">
      <h1 class="neon-text">SUPER SOCCER DUEL</h1>
      <p class="sub-title">Retro 2-Player Arcade Soccer</p>
    </header>

    <!-- Main Container -->
    <main class="game-container">
      
      <!-- Start Screen -->
      <div id="start-screen" class="menu-screen active">
        <div class="menu-content">
          <div class="promo-visual">
            <div class="visual-team blue-glow">P1</div>
            <div class="versus">VS</div>
            <div class="visual-team red-glow">P2</div>
          </div>

          <div class="controls-guide">
            <div class="guide-column p1-guide">
              <h3 class="blue-text">Player 1 (BLUE)</h3>
              <div class="control-row"><span>W / S</span><label>Move Up / Down</label></div>
              <div class="control-row"><span>A / D</span><label>Move Left / Right</label></div>
              <div class="control-row"><span>SPACE</span><label>Power Kick / Shoot</label></div>
            </div>
            <div class="guide-column p2-guide">
              <h3 class="red-text">Player 2 (RED)</h3>
              <div class="control-row"><span>▲ / ▼</span><label>Move Up / Down</label></div>
              <div class="control-row"><span>◀ / ▶</span><label>Move Left / Right</label></div>
              <div class="control-row"><span>ENTER</span><label>Power Kick / Shoot</label></div>
            </div>
          </div>

          <div class="menu-actions">
            <button id="audio-toggle-btn" class="action-btn secondary">
              🔊 SOUND: ON
            </button>
            <button id="kick-off-btn" class="action-btn primary pulse">
              KICK OFF!
            </button>
          </div>
        </div>
      </div>

      <!-- Phaser Game Canvas Container -->
      <div id="phaser-container" class="canvas-container"></div>

      <!-- Game Over Overlay -->
      <div id="game-over-screen" class="menu-screen">
        <div class="menu-content game-over-box">
          <h2 class="game-over-title">FULL TIME!</h2>
          <div class="final-winner" id="winner-announcement">BLUE TEAM WINS!</div>
          
          <div class="final-score-board">
            <div class="score-box blue-text" id="final-p1-score">3</div>
            <div class="score-divider">-</div>
            <div class="score-box red-text" id="final-p2-score">1</div>
          </div>

          <button id="rematch-btn" class="action-btn primary">
            REMATCH!
          </button>
        </div>
      </div>

    </main>

    <!-- Interactive Coach Shout Bar (Directly below the game screen, matching GIF) -->
    <div class="coach-shout-bar active">
      <div class="coach-bar-content">
        <input type="text" id="shout-message-input" placeholder="Type coach instructions (e.g., shoot, jump, defend)..." />
        <button id="shout-send-btn">Shout!</button>
      </div>
    </div>

    <!-- Footer Info -->
    <footer class="game-footer">
      <p>Use a single keyboard to play local head-to-head matches with friends!</p>
    </footer>
  </div>
`;

// Audio toggle logic
const audioBtn = document.getElementById('audio-toggle-btn');
audioBtn.addEventListener('click', () => {
  const isEnabled = Sound.toggle();
  audioBtn.textContent = isEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
  Sound.playMenuClick();
});

// Kick off button starts the game
const kickOffBtn = document.getElementById('kick-off-btn');
kickOffBtn.addEventListener('click', () => {
  Sound.playMenuClick();
  document.getElementById('start-screen').classList.remove('active');
  
  // Initialize Phaser Game
  startPhaserGame();
});

// Rematch button restarts the scene
const rematchBtn = document.getElementById('rematch-btn');
rematchBtn.addEventListener('click', () => {
  Sound.playMenuClick();
  document.getElementById('game-over-screen').classList.remove('active');
  
  if (gameInstance) {
    const scene = gameInstance.scene.getScene('SoccerGameScene');
    scene.score1 = 0;
    scene.score2 = 0;
    scene.matchTime = 90;
    scene.scoreText1.setText('0');
    scene.scoreText2.setText('0');
    scene.timeText.setText('01:30');
    scene.resetPositionsAfterGoal();
    scene.startTimer();
    scene.gameActive = true;
    
    scene.ball.body.setEnable(true);
    scene.player1.body.setEnable(true);
    scene.player2.body.setEnable(true);
    
    Sound.playWhistle();
  }
});

// Interactive Shout send trigger
const shoutInput = document.getElementById('shout-message-input');
const shoutBtn = document.getElementById('shout-send-btn');

function triggerShout() {
  const msg = shoutInput.value.trim();
  if (msg && gameInstance) {
    const scene = gameInstance.scene.getScene('SoccerGameScene');
    if (scene && scene.gameActive) {
      Sound.playMenuClick();
      // Display shout visual speech bubble for Coach 1 (Player 1's Coach)
      scene.showCoachShout(1, msg.toUpperCase());
      
      // Interactive AI reactions!
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg === 'shoot' || lowerMsg === 'kick') {
        scene.triggerPlayerKick(scene.player1, 1);
      } else if (lowerMsg === 'jump' || lowerMsg === 'head') {
        // High hop on the field!
        scene.tweens.add({
          targets: scene.player1,
          y: scene.player1.y - 80,
          duration: 150,
          yoyo: true,
          onStart: () => { Sound.playJump(); }
        });
      } else if (lowerMsg === 'defend') {
        // Move Player 1 back to defensive area
        scene.player1.setPosition(380, scene.player1.y);
        scene.showCoachShout(1, 'FALLING BACK!');
      } else if (lowerMsg === 'attack') {
        // Advance Player 1 forward
        scene.player1.setPosition(750, scene.player1.y);
        scene.showCoachShout(1, 'GOING FORWARD!');
      }
    }
    shoutInput.value = '';
  }
}

shoutBtn.addEventListener('click', triggerShout);
shoutInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    triggerShout();
  }
});

function startPhaserGame() {
  if (gameInstance) return;

  const config = {
    type: Phaser.AUTO,
    width: 1408,
    height: 768,
    parent: 'phaser-container',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [SoccerGameScene]
  };

  gameInstance = new Phaser.Game(config);
}

// Listen for Game Over event
window.addEventListener('soccer-game-over', (e) => {
  const { winnerMsg, winColor, score1, score2 } = e.detail;
  
  const winnerAnnouncement = document.getElementById('winner-announcement');
  winnerAnnouncement.textContent = winnerMsg;
  winnerAnnouncement.style.color = winColor;
  
  document.getElementById('final-p1-score').textContent = score1;
  document.getElementById('final-p2-score').textContent = score2;
  
  document.getElementById('game-over-screen').classList.add('active');
});
