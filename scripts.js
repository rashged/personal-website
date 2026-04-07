const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedEl = document.getElementById('speed');

const world = {
  segLen: 24,
  visibleSegs: 42,
  width: 14,
  fov: 280,
  camY: 6.4,
};

const state = {
  running: false,
  distance: 0,
  score: 0,
  best: Number(localStorage.getItem('glassSlopeBest') || 0),
  speed: 8,
  maxSpeed: 16,
  targetX: 0,
  playerX: 0,
  playerRadius: 0.55,
  sway: 0,
  stripes: [],
  hazards: [],
  holes: [],
  laneSeed: 0,
};

bestEl.textContent = String(state.best);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function projectPoint(x, y, z) {
  const depth = z + 1;
  const scale = world.fov / depth;
  return {
    x: canvas.clientWidth * 0.5 + x * scale,
    y: canvas.clientHeight * 0.56 + (y - world.camY) * scale,
    scale,
  };
}

function resetTrack() {
  state.stripes = [];
  state.hazards = [];
  state.holes = [];
  state.laneSeed = 0;

  for (let i = 4; i < 600; i += 1) {
    if (i % 7 === 0) {
      state.stripes.push(i);
    }
  }

  let lastHazardZ = -999;
  let lastHoleZ = -999;
  for (let i = 18; i < 600; i += 1) {
    if (i - lastHazardZ > 22 && Math.random() < 0.05) {
      const lane = (Math.sin(i * 1.2) + Math.cos(i * 0.51)) * 0.28;
      state.hazards.push({
        z: i,
        x: lane * (world.width * 0.52),
        size: 0.72 + Math.random() * 0.24,
      });
      lastHazardZ = i;
      continue;
    }

    if (i - lastHoleZ > 34 && Math.random() < 0.035) {
      const holeCenter = Math.sin(i * 0.53) * world.width * 0.26;
      state.holes.push({
        z: i,
        x: holeCenter,
        width: 2.15 + Math.random() * 0.7,
      });
      lastHoleZ = i;
    }
  }
}

function startGame() {
  state.running = true;
  state.distance = 0;
  state.score = 0;
  state.speed = 8;
  state.targetX = 0;
  state.playerX = 0;
  state.sway = 0;
  resetTrack();
  overlay.classList.remove('show');
}

function gameOver() {
  state.running = false;
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('glassSlopeBest', String(state.best));
    bestEl.textContent = String(state.best);
  }

  overlayTitle.textContent = 'Run Ended';
  overlayText.textContent = `Score ${Math.floor(state.score)} • Tap Start to try again.`;
  startBtn.textContent = 'Restart';
  overlay.classList.add('show');
}

startBtn.addEventListener('click', () => {
  overlayTitle.textContent = 'Ready to Roll?';
  overlayText.textContent = 'Use A/D, ←/→, or swipe to dodge holes and blocks.';
  startBtn.textContent = 'Start Game';
  startGame();
});

window.addEventListener('keydown', (e) => {
  if (!state.running && (e.code === 'Space' || e.code === 'Enter')) {
    startGame();
    return;
  }

  if (!state.running) return;

  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    state.targetX -= 1.2;
  }

  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    state.targetX += 1.2;
  }

  state.targetX = Math.max(-world.width * 0.44, Math.min(world.width * 0.44, state.targetX));
});

let touchStartX = null;
window.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
});

window.addEventListener('touchend', (e) => {
  if (!state.running || touchStartX == null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 25) {
    state.targetX += Math.sign(dx) * 1.5;
    state.targetX = Math.max(-world.width * 0.44, Math.min(world.width * 0.44, state.targetX));
  }
  touchStartX = null;
});

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  g.addColorStop(0, '#0c1730');
  g.addColorStop(0.5, '#0a1224');
  g.addColorStop(1, '#05070f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  for (let i = 0; i < 5; i += 1) {
    const y = (i / 5) * canvas.clientHeight;
    ctx.strokeStyle = 'rgba(113, 168, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.clientWidth, y);
    ctx.stroke();
  }
}

function drawTrack() {
  const baseZ = state.distance;

  for (let i = world.visibleSegs; i >= 2; i -= 1) {
    const z1 = i * world.segLen - (baseZ % world.segLen);
    const z2 = (i - 1) * world.segLen - (baseZ % world.segLen);
    const w1 = world.width * (1 + i * 0.012);
    const w2 = world.width * (1 + (i - 1) * 0.012);

    const left1 = projectPoint(-w1, 0, z1);
    const right1 = projectPoint(w1, 0, z1);
    const left2 = projectPoint(-w2, 0, z2);
    const right2 = projectPoint(w2, 0, z2);

    const hue = 208 + Math.sin((baseZ + i * 5) * 0.01) * 16;
    const alpha = 0.28 + (1 - i / world.visibleSegs) * 0.38;

    ctx.beginPath();
    ctx.moveTo(left1.x, left1.y);
    ctx.lineTo(right1.x, right1.y);
    ctx.lineTo(right2.x, right2.y);
    ctx.lineTo(left2.x, left2.y);
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 95%, 62%, ${alpha})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(180, 222, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawStripe(segmentZ) {
  const z1 = segmentZ - state.distance;
  const z2 = z1 - world.segLen * 0.8;
  if (z2 < 10 || z1 > world.visibleSegs * world.segLen) return;

  const width = world.width * 0.7;
  const a = projectPoint(-width, 0.03, z1);
  const b = projectPoint(width, 0.03, z1);
  const c = projectPoint(width, 0.03, z2);
  const d = projectPoint(-width, 0.03, z2);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(100, 210, 255, 0.4)';
  ctx.fill();
}

function drawHazard(h) {
  const z = h.z - state.distance;
  if (z < 10 || z > world.visibleSegs * world.segLen) return;
  const p = projectPoint(h.x, 0.65 + Math.sin((z + h.x) * 0.09) * 0.1, z);
  const radius = Math.max(4, h.size * p.scale * 0.3);

  const glow = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius * 2.5);
  glow.addColorStop(0, 'rgba(255, 120, 120, 0.95)');
  glow.addColorStop(1, 'rgba(255, 80, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 87, 87, 0.9)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHole(hole) {
  const z = hole.z - state.distance;
  if (z < 10 || z > world.visibleSegs * world.segLen) return;

  const left = projectPoint(hole.x - hole.width * 0.5, 0.02, z);
  const right = projectPoint(hole.x + hole.width * 0.5, 0.02, z);
  const inner = projectPoint(hole.x, -0.25, z);

  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.quadraticCurveTo(inner.x, inner.y, right.x, right.y);
  ctx.quadraticCurveTo(inner.x, inner.y + (right.y - left.y) * 0.3, left.x, left.y);
  ctx.fillStyle = 'rgba(8, 11, 21, 0.9)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(118, 171, 255, 0.35)';
  ctx.stroke();
}

function drawPlayer() {
  const bob = Math.sin(state.sway * 0.25) * 0.2;
  const p = projectPoint(state.playerX, 0.9 + bob, 19);
  const r = Math.max(8, state.playerRadius * p.scale * 0.85);

  const grad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.35, r * 0.15, p.x, p.y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#a8dbff');
  grad.addColorStop(0.75, '#0a84ff');
  grad.addColorStop(1, '#2354c8');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function checkCollisions() {
  const playerZ = state.distance + 19;

  for (const h of state.hazards) {
    if (Math.abs(h.z - playerZ) < 1.7) {
      const dx = Math.abs(h.x - state.playerX);
      if (dx < state.playerRadius + h.size * 0.36) return true;
    }
  }

  for (const hole of state.holes) {
    if (Math.abs(hole.z - playerZ) < 1.5) {
      if (Math.abs(hole.x - state.playerX) < hole.width * 0.5 - 0.35) return true;
    }
  }

  return false;
}

let lastTime = performance.now();
function tick(now) {
  const dt = Math.min(0.032, (now - lastTime) / 1000);
  lastTime = now;

  if (state.running) {
    state.speed = Math.min(state.maxSpeed, state.speed + dt * 0.2);
    state.distance += state.speed * dt * 13;
    state.score += state.speed * dt * 5;
    state.sway += state.speed * dt;

    state.playerX += (state.targetX - state.playerX) * Math.min(1, dt * 10);

    if (checkCollisions()) {
      gameOver();
    }

    scoreEl.textContent = Math.floor(state.score);
    speedEl.textContent = `${(state.speed / 8).toFixed(1)}x`;
  }

  drawBackground();
  drawTrack();

  for (const stripe of state.stripes) drawStripe(stripe);
  for (const hole of state.holes) drawHole(hole);
  for (const hazard of state.hazards) drawHazard(hazard);

  drawPlayer();

  requestAnimationFrame(tick);
}

window.addEventListener('resize', resize);
resize();
resetTrack();
requestAnimationFrame(tick);
