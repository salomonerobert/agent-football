import './style.css';
import Phaser from 'phaser';
import { SoccerGameScene } from './game';
import { Sound } from './audio';

let gameInstance = null;
let currentProfiles = {};

// Toggle to show/hide the "Debug logs" panel entirely. Set to false to remove
// the panel from the UI (it will not be rendered and no logs are collected).
const DEBUG_LOGS_ENABLED = true;
const MAX_DEBUG_ENTRIES = 200;

// Inject the premium automated dashboard HTML structure
document.querySelector('#app').innerHTML = `
  <div class="game-wrapper">
    <!-- Title Header -->
    <header class="game-header">
      <h1 class="neon-text">Worldcup Mania</h1>
      <p class="sub-title">Gemini-powered Agentic Football</p>
    </header>

    <!-- Simulation Speed Control -->
    <div class="sim-speed-bar">
      <div class="slider-header">
        <span class="slider-label" style="color: var(--gold-accent); font-weight: 800;">Simulation Speed</span>
        <span class="slider-val" id="val-sim-speed" style="color: #ffffff; font-weight: 800;">1.00x</span>
      </div>
      <input 
        type="range" 
        class="slider-input" 
        id="sim-speed-input" 
        min="0.5" 
        max="3" 
        step="0.25" 
        value="1" 
      />
    </div>

    <!-- Phaser Game Canvas Container -->
    <main class="game-container">
      
      <!-- Start Screen -->
      <div id="start-screen" class="menu-screen active">
        <div class="menu-content">
          <div class="promo-visual">
            <div class="visual-team blue-glow">BLUE (AI)</div>
            <div class="versus">VS</div>
            <div class="visual-team red-glow">RED (AI)</div>
          </div>

          <div style="text-align: center; color: var(--text-muted); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
            <p>Welcome to the Automated Soccer Simulator Sandbox!</p>
            <p>Both teams play autonomously based on their behavioral attributes. Manually update individual files under the player_state/ folder on disk to tweak attributes, or adjust simulation speed to run experiments.</p>
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

    <!-- Interactive Coach Shout Bar (Sandbox shout interaction) -->
    <div class="coach-shout-bar active">
      <div class="coach-bar-content">
        <input type="text" id="shout-message-input" placeholder="Shout instructions (e.g., shoot, defend, attack)..." />
        <button id="shout-send-btn">Shout!</button>
      </div>
    </div>

    ${DEBUG_LOGS_ENABLED ? `
    <!-- Debug Logs Panel -->
    <details id="debug-log-panel" class="debug-log-panel">
      <summary class="debug-log-summary">
        <span class="debug-log-title">🛠️ Debug logs</span>
        <span class="debug-log-hint">player config changes detected while polling player_state/*.json</span>
        <button id="debug-log-clear" class="debug-log-clear" type="button">Clear</button>
      </summary>
      <div id="debug-log-body" class="debug-log-body">
        <div class="debug-empty">Waiting for player config changes…</div>
      </div>
    </details>
    ` : ''}

    <!-- Footer Info -->
    <footer class="game-footer">
      <p>Configure player attributes to run experiments and test defensive vs aggressive configurations.</p>
    </footer>
  </div>
`;

let lastFetchedTexts = {
  defender: "",
  midfielder: "",
  forward: "",
  goalkeeper: ""
};

// ---- Debug logs: track and render per-attribute config changes ----------

// Format a value for display in the debug log (round floats, mark missing).
function fmtDebugValue(v) {
  if (v === undefined) return '∅';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

// Compute the list of attribute-level differences between two profiles.
function diffProfile(oldProfile, newProfile) {
  const changes = [];
  const keys = new Set([
    ...Object.keys(oldProfile || {}),
    ...Object.keys(newProfile || {})
  ]);
  keys.forEach(key => {
    const before = oldProfile ? oldProfile[key] : undefined;
    const after = newProfile ? newProfile[key] : undefined;
    if (before !== after) changes.push({ key, before, after });
  });
  return changes;
}

// Append a log entry (newest on top) describing changes to a role's config.
function appendDebugLog(role, changes, label) {
  if (!DEBUG_LOGS_ENABLED || changes.length === 0) return;
  const body = document.getElementById('debug-log-body');
  if (!body) return;

  const placeholder = body.querySelector('.debug-empty');
  if (placeholder) placeholder.remove();

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `debug-entry debug-${role}`;

  const changesHtml = changes.map(c =>
    `<span class="debug-change"><span class="debug-key">${c.key}</span> ` +
    `<span class="debug-from">${fmtDebugValue(c.before)}</span>` +
    `<span class="debug-arrow"> → </span>` +
    `<span class="debug-to">${fmtDebugValue(c.after)}</span></span>`
  ).join('');

  entry.innerHTML =
    `<div class="debug-entry-head">` +
    `<span class="debug-time">[${time}]</span>` +
    `<span class="debug-role">${role.toUpperCase()}</span>` +
    (label ? `<span class="debug-label">${label}</span>` : '') +
    `</div>` +
    `<div class="debug-entry-changes">${changesHtml}</div>`;

  body.prepend(entry);

  while (body.children.length > MAX_DEBUG_ENTRIES) {
    body.removeChild(body.lastChild);
  }
}

// Fetch and load initial profiles from individual JSON files
async function loadProfiles() {
  try {
    const roles = ['defender', 'midfielder', 'forward', 'goalkeeper'];
    const fetched = await Promise.all(roles.map(async role => {
      const res = await fetch(`/player_state/${role}.json?t=` + Date.now());
      const text = await res.text();
      return { role, text, json: JSON.parse(text) };
    }));

    // Store last fetched texts and profiles
    fetched.forEach(({ role, text, json }) => {
      lastFetchedTexts[role] = text;
      currentProfiles[role] = json;
      // Log the initial values so the panel shows the starting config.
      appendDebugLog(role, diffProfile({}, json), 'initial load');
    });

    window.currentProfiles = currentProfiles; // Expose globally for Phaser

    // If the game scene is already running, update it
    if (gameInstance) {
      const scene = gameInstance.scene.getScene('SoccerGameScene');
      if (scene) {
        scene.updateBlueProfiles(currentProfiles);
      }
    }
  } catch (err) {
    console.error("Failed to load player profiles:", err);
  }
}

// Check individual JSON files on disk for changes
async function checkJSONForChanges() {
  try {
    const roles = ['defender', 'midfielder', 'forward', 'goalkeeper'];
    let changed = false;

    await Promise.all(roles.map(async role => {
      const res = await fetch(`/player_state/${role}.json?t=` + Date.now());
      const text = await res.text();
      if (text !== lastFetchedTexts[role]) {
        console.log(`Detected changes in player_state/${role}.json on disk. Updating simulation...`);
        const newProfile = JSON.parse(text);
        const changes = diffProfile(currentProfiles[role], newProfile);
        appendDebugLog(role, changes, 'applied');
        lastFetchedTexts[role] = text;
        currentProfiles[role] = newProfile;
        changed = true;
      }
    }));

    if (changed) {
      window.currentProfiles = currentProfiles;

      // If the game scene is already running, update it
      if (gameInstance) {
        const scene = gameInstance.scene.getScene('SoccerGameScene');
        if (scene) {
          scene.updateBlueProfiles(currentProfiles);
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch player profiles for update check:", err);
  }
}

// Debug logs: clear button (stop the click from toggling the <details>)
const debugClearBtn = document.getElementById('debug-log-clear');
if (debugClearBtn) {
  debugClearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const body = document.getElementById('debug-log-body');
    if (body) {
      body.innerHTML = '<div class="debug-empty">Waiting for player config changes…</div>';
    }
  });
}

// Audio toggling
const audioBtn = document.getElementById('audio-toggle-btn');
audioBtn.addEventListener('click', () => {
  const isEnabled = Sound.toggle();
  audioBtn.textContent = isEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
  Sound.playMenuClick();
});

// Kick off starts the simulation
const kickOffBtn = document.getElementById('kick-off-btn');
kickOffBtn.addEventListener('click', () => {
  Sound.playMenuClick();
  document.getElementById('start-screen').classList.remove('active');
  startPhaserGame();
});

// Rematch button starts the match again
const rematchBtn = document.getElementById('rematch-btn');
rematchBtn.addEventListener('click', () => {
  Sound.playMenuClick();
  document.getElementById('game-over-screen').classList.remove('active');

  if (gameInstance) {
    const scene = gameInstance.scene.getScene('SoccerGameScene');
    scene.restartMatch();
    Sound.playWhistle();
  }
});

// Simulation speed slider listener
document.getElementById('sim-speed-input').addEventListener('input', (e) => {
  const speed = parseFloat(e.target.value);
  document.getElementById('val-sim-speed').textContent = speed.toFixed(2) + 'x';

  if (gameInstance) {
    const scene = gameInstance.scene.getScene('SoccerGameScene');
    if (scene) {
      scene.setSimulationSpeed(speed);
    }
  }
});

// Coach Shouts sandbox interface interaction
const shoutInput = document.getElementById('shout-message-input');
const shoutBtn = document.getElementById('shout-send-btn');

let currentSessionId = null;

async function sendInstructionToAgent(msg) {
  try {
    // 1. Create a session if we don't have one
    if (!currentSessionId) {
      console.log("Creating new agent session...");
      const sessionRes = await fetch('/apps/football_agents/users/user/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({
          state: {
            __session_metadata__: {
              displayName: "Football Coach Session"
            }
          }
        })
      });
      if (!sessionRes.ok) {
        throw new Error(`Failed to create session: ${sessionRes.statusText}`);
      }
      const sessionData = await sessionRes.json();
      currentSessionId = sessionData.id;
      console.log(`Agent session created successfully. Session ID: ${currentSessionId}`);
    }

    // 2. Send the message to /run_sse
    console.log(`Sending instruction to agent: "${msg}"`);
    const runRes = await fetch('/run_sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appName: "football_agents",
        userId: "user",
        sessionId: currentSessionId,
        newMessage: {
          role: "user",
          parts: [{ text: msg }]
        },
        streaming: false,
        stateDelta: null
      })
    });

    if (!runRes.ok) {
      throw new Error(`Failed to run agent: ${runRes.statusText}`);
    }

    const text = await runRes.text();
    console.log("Agent raw SSE response:", text);

    // Extract all JSON data from SSE format: lines starting with 'data: '
    const lines = text.split('\n');
    let huddleData = null;

    for (const line of lines) {
      if (line.trim().startsWith('data: ')) {
        const jsonStr = line.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.content && event.content.parts) {
            for (const part of event.content.parts) {
              if (part.text) {
                const trimmedText = part.text.trim();
                // Check if it looks like JSON containing the huddle
                if (trimmedText.startsWith('{') && trimmedText.includes('"huddle"')) {
                  try {
                    const parsed = JSON.parse(trimmedText);
                    if (parsed.huddle) {
                      huddleData = parsed.huddle;
                    }
                  } catch (e) {
                    console.warn("Failed to parse inner JSON part:", e);
                  }
                }
              }
            }
          }
        } catch (err) {
          // Silent catch for non-JSON or partial event chunks
        }
      }
    }

    if (huddleData) {
      console.log("Extracted huddle data:", huddleData);
      if (gameInstance) {
        const scene = gameInstance.scene.getScene('SoccerGameScene');
        if (scene && scene.gameActive) {
          // Trigger player shouts sequentially
          scene.showTeamHuddle(huddleData);
        }
      }
    } else {
      console.warn("No huddle data found in agent response.");
    }
  } catch (err) {
    console.error("Error communicating with agent on port 8000:", err);
  }
}

function triggerShout() {
  const msg = shoutInput.value.trim();
  if (msg) {
    if (gameInstance) {
      const scene = gameInstance.scene.getScene('SoccerGameScene');
      if (scene && scene.gameActive) {
        Sound.playMenuClick();
        scene.showCoachShout(1, msg.toUpperCase());

        const lowerMsg = msg.toLowerCase();
        if (lowerMsg === 'shoot' || lowerMsg === 'kick') {
          scene.coachShoot(1);
        } else if (lowerMsg === 'jump' || lowerMsg === 'head') {
          scene.coachJump(1);
        } else if (lowerMsg === 'defend') {
          scene.coachDefend(1);
        } else if (lowerMsg === 'attack') {
          scene.coachAttack(1);
        }
      }
    }

    // Asynchronously call the agent
    sendInstructionToAgent(msg);
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

  gameInstance.events.once('ready', () => {
    const scene = gameInstance.scene.getScene('SoccerGameScene');
    if (scene) {
      scene.updateBlueProfiles(currentProfiles);
      const speedVal = parseFloat(document.getElementById('sim-speed-input').value);
      scene.setSimulationSpeed(speedVal);
    }
  });
}

// Listen for game-over event and update UI scoreboard overlay
window.addEventListener('soccer-game-over', (e) => {
  const { winnerMsg, winColor, score1, score2 } = e.detail;

  const winnerAnnouncement = document.getElementById('winner-announcement');
  winnerAnnouncement.textContent = winnerMsg;
  winnerAnnouncement.style.color = winColor;

  document.getElementById('final-p1-score').textContent = score1;
  document.getElementById('final-p2-score').textContent = score2;

  document.getElementById('game-over-screen').classList.add('active');
});

// Load profiles initially on start
loadProfiles();

// Check for changes on disk every 2 seconds
setInterval(checkJSONForChanges, 2000);
