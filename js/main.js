import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { CookingSystem } from "./cooking.js";
import { RidePhysics } from "./physics.js";
import { createGameScene } from "./scene.js";
import { GameUI } from "./ui.js";
import { GameAudio } from "./audio.js";

const FINISH_DISTANCE = 1640;
const mount = document.querySelector("#scene");
const ui = new GameUI();
const audio = new GameAudio();
const ride = new RidePhysics(FINISH_DISTANCE);
const cooking = new CookingSystem();
const gameScene = createGameScene(THREE, mount, FINISH_DISTANCE, cooking);
const keys = new Set();
let state = "ready";
let scoreMode = false;
let nickname = "";
let touchSteer = 0;
let gameTime = 0;
let previousTime = performance.now();

function startGame(scoreNickname = "") {
  audio.startRide();
  scoreMode = Boolean(scoreNickname);
  nickname = scoreNickname;
  ride.reset();
  ride.finishDistance = scoreMode ? Infinity : FINISH_DISTANCE;
  gameScene.setFinishVisible(!scoreMode);
  gameScene.resetObstacles();
  cooking.reset();
  gameTime = 0;
  state = "running";
  ui.showGame(scoreMode);
}

function finishGame() {
  if (state !== "running") return;
  state = "finished";
  audio.finish();
  ui.showResult(ride, cooking);
}

function gameOver() {
  if (state !== "running") return;
  state = "finished";
  audio.gameOver();
  ui.showResult(ride, cooking, {
    gameOver: true,
    scoreMode,
    nickname,
  });
}

function returnHome() {
  audio.stopMusic();
  state = "ready";
  scoreMode = false;
  nickname = "";
  ride.reset();
  ride.finishDistance = FINISH_DISTANCE;
  gameScene.setFinishVisible(true);
  cooking.reset();
  ui.showStart();
}

function flashCollision() {
  const flash = document.querySelector("#collisionFlash");
  flash.classList.remove("active");
  flash.style.animation = "none";
  void flash.offsetWidth;
  requestAnimationFrame(() => {
    flash.style.animation = "";
    flash.classList.add("active");
  });
}

function flipSpam() {
  if (state !== "running" || !cooking.flip()) return;
  audio.flip();
  if (cooking.lastInterval < cooking.targetStart - 1)
    ui.showToast("너무 빨라요! 기름이 튈 때까지 조금 기다려요.");
  else if (cooking.lastInterval > cooking.targetEnd + 4)
    ui.showToast("조금 늦었어요! 다음엔 가장자리가 타기 전에.");
  else ui.showToast("좋아요!");
}

ui.bind({
  onStart: startGame,
  onRetry: () => startGame(scoreMode ? nickname : ""),
  onHome: returnHome,
  onSteer: (value) => {
    touchSteer = value;
  },
  onJump: () => {
    if (ride.jumpHeight <= 0.02) {
      ride.jump();
      audio.jump();
    }
  },
});

document
  .querySelectorAll("button")
  .forEach((button) => button.addEventListener("click", () => audio.click()));

mount.addEventListener("pointerdown", (event) => {
  if (event.button === 0) flipSpam();
});

addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.code))
    event.preventDefault();
  keys.add(event.code);
  if (
    state === "running" &&
    !event.repeat &&
    ["KeyW", "ArrowUp"].includes(event.code)
  ) {
    if (ride.jumpHeight <= 0.02) {
      ride.jump();
      audio.jump();
    }
  }
  if (state === "running" && event.code === "KeyS") {
    const wasAirborne = ride.jumpHeight > 0.02;
    ride.land();
    if (wasAirborne) audio.land();
  }
  if (state === "ready" && event.code === "Enter") startGame();
  if (state === "running" && event.code === "KeyF") flipSpam();
});

addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("blur", () => keys.clear());
addEventListener("resize", () => gameScene.resize());
ui.showStart();

function checkTraffic(previousRide) {
  const previousPlayerZ = 7 - previousRide.distance;
  const currentPlayerZ = gameScene.camera.position.z;
  for (const obstacle of gameScene.obstacles) {
    if (obstacle.userData.hit) continue;
    const type = obstacle.userData.type;
    const travelZ = currentPlayerZ - previousPlayerZ;
    const crossingTime =
      Math.abs(travelZ) < 0.0001
        ? 0
        : Math.max(
            0,
            Math.min(1, (obstacle.position.z - previousPlayerZ) / travelZ),
          );
    const playerZAtCrossing = previousPlayerZ + travelZ * crossingTime;
    const playerXAtCrossing =
      previousRide.x + (ride.x - previousRide.x) * crossingTime;
    const playerHalfDepth = 0.25;
    const obstacleHalfDepth = type === "car" ? 2 : 0.35;
    if (
      Math.abs(obstacle.position.z - playerZAtCrossing) >
      playerHalfDepth + obstacleHalfDepth
    )
      continue;
    const playerHalfWidth = 0.35;
    const obstacleHalfWidth = type === "car" ? 2.35 : 0.45;
    const lateralDistance = Math.abs(obstacle.position.x - playerXAtCrossing);
    if (lateralDistance > playerHalfWidth + obstacleHalfWidth) continue;
    const jumpHeightAtCrossing =
      previousRide.jumpHeight +
      (ride.jumpHeight - previousRide.jumpHeight) * crossingTime;
    const clearanceHeight = type === "car" ? 1.45 : 1.15;
    if (jumpHeightAtCrossing >= clearanceHeight) continue;
    obstacle.userData.hit = true;
    const pointsLost = type === "car" && lateralDistance <= 0.28 ? 20 : 10;
    flashCollision();
    audio.collision();
    ride.hit(pointsLost);
    if (ride.gameOver) {
      gameOver();
      return;
    }
    ui.showToast(`충돌! 주행점수 -${pointsLost}점`);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previousTime) / 1000, 0.04);
  previousTime = now;
  gameTime += dt;
  if (state === "running") {
    const keyboardSteer =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const previousRide = {
      distance: ride.distance,
      x: ride.x,
      jumpHeight: ride.jumpHeight,
    };
    const wasAirborne = ride.jumpHeight > 0.02;
    ride.update(dt, keyboardSteer || touchSteer);
    if (wasAirborne && ride.jumpHeight === 0) audio.land();
    audio.update(ride.speed);
    cooking.update(dt);
    gameScene.updateCamera(ride, dt);
    gameScene.cookingRig.update(dt, cooking, gameTime);
    checkTraffic(previousRide);
    ui.update(dt, ride, cooking, scoreMode);
    if (ride.gameOver || (scoreMode && cooking.gameOver)) gameOver();
    else if (!scoreMode && ride.distance >= FINISH_DISTANCE) finishGame();
  } else if (state === "ready") {
    gameScene.camera.position.x +=
      (0 - gameScene.camera.position.x) * (1 - Math.exp(-2 * dt));
    gameScene.camera.position.y = 1.72 + Math.sin(gameTime * 2) * 0.02;
    gameScene.camera.position.z = 7;
    gameScene.camera.rotation.set(-0.035, 0, 0);
    gameScene.cookingRig.update(dt, cooking, gameTime);
  }
  gameScene.render();
}

requestAnimationFrame(frame);
