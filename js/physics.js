const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

export class RidePhysics {
  constructor(finishDistance) {
    this.finishDistance = finishDistance;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.lateralVelocity = 0;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
    this.speed = 43;
    this.distance = 0;
    this.collisions = 0;
    this.score = 50;
    this.hitTimer = 0;
  }

  jump() {
    if (this.jumpHeight <= 0.02) this.jumpVelocity = 12;
  }

  land() {
    if (this.jumpHeight > 0.02) {
      this.jumpVelocity = Math.min(this.jumpVelocity, -18);
    }
  }

  update(dt, steer) {
    this.lateralVelocity = lerp(
      this.lateralVelocity,
      steer * 11,
      1 - Math.exp(-8 * dt),
    );
    this.x = clamp(this.x + this.lateralVelocity * dt, -5.8, 5.8);
    if (Math.abs(this.x) >= 5.8) this.lateralVelocity *= -0.12;

    this.jumpVelocity -= 30 * dt;
    this.jumpHeight = Math.max(0, this.jumpHeight + this.jumpVelocity * dt);
    if (this.jumpHeight === 0) this.jumpVelocity = 0;

    this.hitTimer = Math.max(0, this.hitTimer - dt);
    const targetSpeed = this.hitTimer > 0 ? 36 : 53;
    this.speed = lerp(this.speed, targetSpeed, 1 - Math.exp(-1.4 * dt));
    this.distance = Math.min(
      this.finishDistance,
      this.distance + this.speed * dt,
    );
  }

  hit(pointsLost) {
    this.collisions += 1;
    this.score = Math.max(0, this.score - pointsLost);
    this.hitTimer = 1.4;
    this.speed = Math.max(32, this.speed * 0.68);
  }

  get gameOver() {
    return this.score === 0;
  }
}
