const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const startBtn = document.getElementById("start-btn");
const tiltBtn = document.getElementById("tilt-btn");
const messageEl = document.getElementById("message");

let width = 0;
let height = 0;
let gameRunning = false;
let lastTime = 0;
let score = 0;
let speed = 360;
let baseSpeed = 360;
let speedMultiplier = 1;
let obstacles = [];
let spawnTimer = 0;
let activePattern = null;
let patternIndex = 0;
let laneCount = 3;
let laneWidth = 0;
let tiltEnabled = false;
let tiltValue = 0;

const player = {
  lane: 1,
  x: 0,
  y: 0,
  width: 60,
  height: 90,
  color: "#f94144",
  tiltOffset: 0,
};

const patterns = [
  [0, 2],
  [1],
  [0, 1],
  [1, 2],
  [0, 2, 1],
  [0],
  [2],
  [0, 1, 2],
];

const patternGaps = [160, 220, 180, 200, 240, 170, 190, 260];

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  laneWidth = width / laneCount;
  player.y = height - 160;
  player.x = laneWidth * (player.lane + 0.5) - player.width / 2;
}

function resetGame() {
  score = 0;
  speed = baseSpeed;
  speedMultiplier = 1;
  obstacles = [];
  spawnTimer = 0;
  activePattern = null;
  patternIndex = 0;
  player.lane = 1;
  player.tiltOffset = 0;
  messageEl.textContent = "Swipe left/right or tilt to dodge obstacles.";
}

function startGame() {
  if (gameRunning) return;
  resetGame();
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  gameRunning = false;
  messageEl.textContent = "Crashed! Tap Start to run again.";
}

function update(delta) {
  speedMultiplier += delta * 0.00002;
  speed = baseSpeed * speedMultiplier;
  score += delta * 0.01 * speedMultiplier;
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    if (!activePattern || patternIndex >= activePattern.length) {
      const choice = Math.floor(Math.random() * patterns.length);
      activePattern = patterns[choice];
      patternIndex = 0;
    }
    const lane = activePattern[patternIndex];
    obstacles.push({
      lane,
      x: laneWidth * (lane + 0.5) - 40,
      y: -120,
      width: 80,
      height: 120,
      color: "#577590",
    });
    spawnTimer = Math.max(120, patternGaps[patternIndex % patternGaps.length] - speedMultiplier * 10);
    patternIndex += 1;
  }

  player.tiltOffset = tiltEnabled ? tiltValue * laneWidth * 0.35 : 0;
  const targetX = laneWidth * (player.lane + 0.5) - player.width / 2 + player.tiltOffset;
  player.x += (targetX - player.x) * 0.25;

  obstacles = obstacles.filter((obs) => {
    obs.y += (speed * delta) / 1000;
    return obs.y < height + 200;
  });

  for (const obs of obstacles) {
    if (
      obs.x < player.x + player.width &&
      obs.x + obs.width > player.x &&
      obs.y < player.y + player.height &&
      obs.y + obs.height > player.y
    ) {
      endGame();
      break;
    }
  }

  scoreEl.textContent = Math.floor(score).toString();
  speedEl.textContent = `${speedMultiplier.toFixed(2)}x`;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 1; i < laneCount; i += 1) {
    const x = laneWidth * i;
    ctx.fillRect(x - 2, 0, 4, height);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  for (const obs of obstacles) {
    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }
}

function loop(time) {
  if (!gameRunning) {
    draw();
    return;
  }
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function handleSwipe(startX, endX) {
  const delta = endX - startX;
  if (Math.abs(delta) < 30) return;
  if (delta < 0 && player.lane > 0) {
    player.lane -= 1;
  }
  if (delta > 0 && player.lane < laneCount - 1) {
    player.lane += 1;
  }
}

let touchStartX = 0;
canvas.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0].clientX;
});

canvas.addEventListener("touchend", (event) => {
  const touchEndX = event.changedTouches[0].clientX;
  handleSwipe(touchStartX, touchEndX);
});

canvas.addEventListener("pointerdown", (event) => {
  touchStartX = event.clientX;
});

canvas.addEventListener("pointerup", (event) => {
  handleSwipe(touchStartX, event.clientX);
});

startBtn.addEventListener("click", () => {
  startGame();
});

function enableTiltSupport() {
  tiltEnabled = true;
  tiltBtn.classList.add("hidden");
  messageEl.textContent = "Tilt active! Swipe to shift lanes faster.";
}

if (typeof DeviceOrientationEvent !== "undefined") {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    tiltBtn.classList.remove("hidden");
    tiltBtn.addEventListener("click", async () => {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === "granted") {
          enableTiltSupport();
        }
      } catch (error) {
        messageEl.textContent = "Tilt unavailable. Swipe controls only.";
      }
    });
  } else {
    enableTiltSupport();
  }

  window.addEventListener("deviceorientation", (event) => {
    if (!tiltEnabled) return;
    const gamma = event.gamma ?? 0;
    tiltValue = Math.max(-1, Math.min(1, gamma / 30));
  });
}

window.addEventListener("resize", resize);
resize();
draw();
