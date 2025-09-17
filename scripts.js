const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const waveElement = document.getElementById('wave');
const timerElement = document.getElementById('timer');
const bestScoreElement = document.getElementById('bestScore');
const healthFillElement = document.getElementById('healthFill');
const healthMeterElement = document.querySelector('.health-bar');
const startModal = document.getElementById('startModal');
const gameOverModal = document.getElementById('gameOverModal');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreElement = document.getElementById('finalScore');

const STORAGE_KEY = 'eliteShooterBestScore';
let storedBestScore = 0;
try {
  const savedScore = localStorage.getItem(STORAGE_KEY);
  if (savedScore) {
    storedBestScore = Number(savedScore) || 0;
  }
} catch (error) {
  storedBestScore = 0;
}
bestScoreElement.textContent = storedBestScore.toString();

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const pointer = {
  x: canvas.width / 2,
  y: canvas.height / 2,
};

const gameState = {
  running: false,
  lastTimestamp: 0,
  elapsedTime: 0,
  spawnCooldown: 1.2,
  score: 0,
  wave: 1,
  bullets: [],
  enemies: [],
  particles: [],
  floatingTexts: [],
  isFiring: false,
  bestScore: storedBestScore,
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 22,
    speed: 240,
    health: 100,
    maxHealth: 100,
    fireCooldown: 0,
    invulnerable: 0,
    recoil: 0,
    angle: 0,
  },
};

const FIRE_RATE = 7; // bullets per second
const BULLET_SPEED = 680;
const BULLET_LIFE = 1.3;
const ENEMY_BASE_SPEED = 38;
const ENEMY_BASE_HEALTH = 32;
const ENEMY_COLORS = ['#f97316', '#fb7185', '#facc15', '#6366f1', '#22d3ee'];
const PARTICLE_COLORS = ['#38bdf8', '#67e8f9', '#bae6fd', '#f97316'];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function resetGameState() {
  gameState.running = true;
  gameState.lastTimestamp = 0;
  gameState.elapsedTime = 0;
  gameState.spawnCooldown = 1.1;
  gameState.score = 0;
  gameState.wave = 1;
  gameState.bullets = [];
  gameState.enemies = [];
  gameState.particles = [];
  gameState.floatingTexts = [];
  gameState.isFiring = false;
  controls.up = false;
  controls.down = false;
  controls.left = false;
  controls.right = false;
  gameState.player.x = canvas.width / 2;
  gameState.player.y = canvas.height / 2;
  gameState.player.health = gameState.player.maxHealth;
  gameState.player.fireCooldown = 0;
  gameState.player.invulnerable = 0;
  gameState.player.recoil = 0;
  gameState.player.angle = 0;
  pointer.x = canvas.width / 2;
  pointer.y = canvas.height / 2;
  updateHud();
}

function startGame() {
  startModal.classList.add('hidden');
  gameOverModal.classList.add('hidden');
  resetGameState();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState.running = false;
  finalScoreElement.textContent = Math.floor(gameState.score).toString();
  gameOverModal.classList.remove('hidden');
  if (gameState.score > gameState.bestScore) {
    gameState.bestScore = Math.floor(gameState.score);
    bestScoreElement.textContent = gameState.bestScore.toString();
    try {
      localStorage.setItem(STORAGE_KEY, gameState.bestScore.toString());
    } catch (error) {
      // ignore storage issues silently
    }
  }
}

function getPointerPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  pointer.x = (clientX - rect.left) * scaleX;
  pointer.y = (clientY - rect.top) * scaleY;
}

function handlePointerDown(event) {
  event.preventDefault();
  gameState.isFiring = true;
  if (event.type.startsWith('touch')) {
    const touch = event.touches[0];
    if (touch) {
      getPointerPosition(touch.clientX, touch.clientY);
    }
  } else {
    getPointerPosition(event.clientX, event.clientY);
  }
}

function handlePointerMove(event) {
  if (event.type.startsWith('touch')) {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      getPointerPosition(touch.clientX, touch.clientY);
    }
  } else {
    getPointerPosition(event.clientX, event.clientY);
  }
}

function handlePointerUp(event) {
  if (event.type.startsWith('touch')) {
    event.preventDefault();
    if (event.touches.length === 0) {
      gameState.isFiring = false;
    }
  } else {
    gameState.isFiring = false;
  }
}

function updateControls(event, isPressed) {
  switch (event.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      controls.up = isPressed;
      break;
    case 's':
    case 'arrowdown':
      controls.down = isPressed;
      break;
    case 'a':
    case 'arrowleft':
      controls.left = isPressed;
      break;
    case 'd':
    case 'arrowright':
      controls.right = isPressed;
      break;
  }
}

function spawnEnemy() {
  const radius = 18 + Math.random() * 20;
  const spawnEdge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (spawnEdge === 0) {
    x = Math.random() * canvas.width;
    y = -radius * 2;
  } else if (spawnEdge === 1) {
    x = canvas.width + radius * 2;
    y = Math.random() * canvas.height;
  } else if (spawnEdge === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + radius * 2;
  } else {
    x = -radius * 2;
    y = Math.random() * canvas.height;
  }

  const difficultyBoost = 1 + gameState.wave * 0.08 + gameState.elapsedTime / 90;
  const speed = ENEMY_BASE_SPEED + Math.random() * 18;
  const enemy = {
    x,
    y,
    radius,
    color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
    speed: speed * difficultyBoost,
    maxHealth: ENEMY_BASE_HEALTH + radius * 1.4 + gameState.wave * 8,
    health: ENEMY_BASE_HEALTH + radius * 1.4 + gameState.wave * 8,
    angle: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
  };

  gameState.enemies.push(enemy);
}

function shootBullet() {
  const player = gameState.player;
  const angle = player.angle;
  const offsetDistance = player.radius + 18;
  const startX = player.x + Math.cos(angle) * offsetDistance;
  const startY = player.y + Math.sin(angle) * offsetDistance;
  const spread = (controls.left || controls.right || controls.up || controls.down)
    ? (Math.random() - 0.5) * 0.1
    : (Math.random() - 0.5) * 0.06;
  const finalAngle = angle + spread;

  const bullet = {
    x: startX,
    y: startY,
    radius: 5,
    angle: finalAngle,
    vx: Math.cos(finalAngle) * BULLET_SPEED,
    vy: Math.sin(finalAngle) * BULLET_SPEED,
    life: BULLET_LIFE,
    damage: 34,
  };

  gameState.bullets.push(bullet);
  player.recoil = 6;
  createMuzzleFlash(startX, startY, finalAngle);
}

function createMuzzleFlash(x, y, angle) {
  const flashCount = 6;
  for (let i = 0; i < flashCount; i += 1) {
    const speed = 180 + Math.random() * 140;
    const life = 0.2 + Math.random() * 0.15;
    const offsetAngle = angle + (Math.random() - 0.5) * 0.6;
    gameState.particles.push({
      x,
      y,
      vx: Math.cos(offsetAngle) * speed,
      vy: Math.sin(offsetAngle) * speed,
      life,
      maxLife: life,
      radius: 2 + Math.random() * 2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      glow: true,
    });
  }
}

function createImpactEffect(x, y, color) {
  const particleCount = 18 + Math.floor(Math.random() * 12);
  for (let i = 0; i < particleCount; i += 1) {
    const speed = 120 + Math.random() * 240;
    const life = 0.4 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    gameState.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      radius: 1.5 + Math.random() * 3,
      color,
      glow: false,
    });
  }
}

function addFloatingText(x, y, text, color = '#f8fafc') {
  gameState.floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.1,
    maxLife: 1.1,
  });
}

function updatePlayer(dt) {
  const player = gameState.player;
  const moveVector = {
    x: (controls.right ? 1 : 0) - (controls.left ? 1 : 0),
    y: (controls.down ? 1 : 0) - (controls.up ? 1 : 0),
  };

  const magnitude = Math.hypot(moveVector.x, moveVector.y);
  if (magnitude > 0) {
    moveVector.x /= magnitude;
    moveVector.y /= magnitude;
  }

  player.x += moveVector.x * player.speed * dt;
  player.y += moveVector.y * player.speed * dt;

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  player.angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.recoil = Math.max(0, player.recoil - dt * 22);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (gameState.isFiring && player.fireCooldown === 0) {
    shootBullet();
    player.fireCooldown = 1 / FIRE_RATE;
  }
}

function updateBullets(dt) {
  for (let i = gameState.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = gameState.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -40 ||
      bullet.x > canvas.width + 40 ||
      bullet.y < -40 ||
      bullet.y > canvas.height + 40
    ) {
      gameState.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  const player = gameState.player;
  for (let i = gameState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = gameState.enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const directionX = dx / distance;
    const directionY = dy / distance;
    const wobble = Math.sin(gameState.elapsedTime * 4 + enemy.wobbleOffset) * 0.3;

    enemy.angle = Math.atan2(dy, dx);
    enemy.x += (directionX + wobble * directionY) * enemy.speed * dt;
    enemy.y += (directionY - wobble * directionX) * enemy.speed * dt;

    if (distance < enemy.radius + player.radius) {
      if (player.invulnerable === 0) {
        player.health -= 24;
        player.invulnerable = 1;
        createImpactEffect(player.x, player.y, '#f87171');
        addFloatingText(player.x, player.y - player.radius - 10, 'ضرر!', '#f87171');
        if (player.health <= 0) {
          player.health = 0;
          endGame();
        }
        updateHud();
      }
    }

    if (
      enemy.x < -enemy.radius * 3 ||
      enemy.x > canvas.width + enemy.radius * 3 ||
      enemy.y < -enemy.radius * 3 ||
      enemy.y > canvas.height + enemy.radius * 3
    ) {
      gameState.enemies.splice(i, 1);
    }
  }
}

function handleCollisions() {
  for (let i = gameState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = gameState.enemies[i];

    for (let j = gameState.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = gameState.bullets[j];
      const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);

      if (distance < enemy.radius + bullet.radius) {
        enemy.health -= bullet.damage;
        gameState.bullets.splice(j, 1);
        createImpactEffect(bullet.x, bullet.y, '#38bdf8');

        if (enemy.health <= 0) {
          const points = Math.round(18 + enemy.maxHealth * 0.4);
          gameState.score += points;
          addFloatingText(enemy.x, enemy.y, `+${points}`, '#38bdf8');
          createImpactEffect(enemy.x, enemy.y, enemy.color);
          gameState.enemies.splice(i, 1);
          updateHud();
        }
        break;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = gameState.particles.length - 1; i >= 0; i -= 1) {
    const particle = gameState.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) {
      gameState.particles.splice(i, 1);
    }
  }
}

function updateFloatingTexts(dt) {
  for (let i = gameState.floatingTexts.length - 1; i >= 0; i -= 1) {
    const text = gameState.floatingTexts[i];
    text.y -= 40 * dt;
    text.life -= dt;
    if (text.life <= 0) {
      gameState.floatingTexts.splice(i, 1);
    }
  }
}

function updateHud() {
  scoreElement.textContent = Math.floor(gameState.score).toString();
  waveElement.textContent = gameState.wave.toString();
  timerElement.textContent = formatTime(gameState.elapsedTime);
  const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
  const clampedPercent = Math.max(0, Math.min(100, healthPercent));
  healthFillElement.style.width = `${clampedPercent}%`;
  healthMeterElement.setAttribute('aria-valuenow', Math.round(clampedPercent).toString());
  healthMeterElement.setAttribute(
    'aria-valuetext',
    `${Math.round(clampedPercent)} بالمائة`
  );
}

function updateWave() {
  const computedWave = 1 + Math.floor(gameState.elapsedTime / 20) + Math.floor(gameState.score / 400);
  gameState.wave = Math.max(1, computedWave);
}

function updateSpawn(dt) {
  gameState.spawnCooldown -= dt;
  if (gameState.spawnCooldown <= 0) {
    spawnEnemy();
    const difficulty = 1 + gameState.elapsedTime / 28 + gameState.wave * 0.3;
    gameState.spawnCooldown = Math.max(0.35, 1.1 / difficulty);
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    20,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.75
  );
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
  gradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.9)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const spacing = 80;
  for (let x = 0; x <= canvas.width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const player = gameState.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  const bodyGradient = ctx.createRadialGradient(0, 0, player.radius * 0.2, 0, 0, player.radius);
  bodyGradient.addColorStop(0, '#38bdf8');
  bodyGradient.addColorStop(1, '#0f172a');

  ctx.fillStyle = bodyGradient;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  const turretLength = player.radius + 24 - player.recoil;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(player.radius * 0.2, -6, turretLength, 12);

  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(player.radius * 0.2, -4, turretLength, 8);

  ctx.restore();

  if (player.invulnerable > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(gameState.elapsedTime * 20) * 0.2;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets() {
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
  ctx.shadowBlur = 10;

  gameState.bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawEnemies() {
  ctx.save();
  gameState.enemies.forEach((enemy) => {
    const gradient = ctx.createRadialGradient(enemy.x, enemy.y, enemy.radius * 0.3, enemy.x, enemy.y, enemy.radius);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.4, enemy.color);
    gradient.addColorStop(1, '#0f172a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + Math.sin(gameState.elapsedTime * 6 + enemy.wobbleOffset) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  gameState.particles.forEach((particle) => {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawFloatingTexts() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 18px Cairo, sans-serif';
  gameState.floatingTexts.forEach((text) => {
    const alpha = Math.max(0, text.life / text.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  });
  ctx.restore();
}

function renderScene() {
  drawBackground();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawFloatingTexts();
}

function gameLoop(timestamp) {
  if (!gameState.running) {
    return;
  }

  if (!gameState.lastTimestamp) {
    gameState.lastTimestamp = timestamp;
  }
  const delta = (timestamp - gameState.lastTimestamp) / 1000;
  const dt = Math.min(delta, 0.045);
  gameState.lastTimestamp = timestamp;

  gameState.elapsedTime += dt;
  updateWave();
  updatePlayer(dt);
  updateSpawn(dt);
  updateBullets(dt);
  updateEnemies(dt);
  handleCollisions();
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateHud();
  renderScene();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  updateControls(event, true);
});

window.addEventListener('keyup', (event) => {
  updateControls(event, false);
});

window.addEventListener('blur', () => {
  controls.up = false;
  controls.down = false;
  controls.left = false;
  controls.right = false;
  gameState.isFiring = false;
});

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mouseleave', () => {
  gameState.isFiring = false;
});

canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
canvas.addEventListener('touchend', handlePointerUp, { passive: false });
canvas.addEventListener('touchcancel', handlePointerUp, { passive: false });

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

renderScene();
updateHud();
