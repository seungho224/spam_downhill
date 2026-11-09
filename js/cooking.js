import { clamp } from "./utils.js";

export class CookingSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.targetStart = 6 + Math.floor(Math.random() * 3);
    this.targetEnd = this.targetStart + 3;
    this.elapsed = 0;
    this.sinceFlip = 0;
    this.flipCount = 0;
    this.airTime = 0;
    this.lastInterval = 0;
    this.doneness = 0;
    this.items = Array.from({ length: 7 }, (_, index) => ({
      qualitySum: 0,
      flips: 0,
      sinceFlip: 0,
      scorch: 0,
      cookedLevel: 0,
      faceDown: false,
      flipStartRotation: 0,
      flipEndRotation: 0,
      flipHeight: 0,
      x: 0,
      z: 0,
      rotationY: 0,
      layoutIndex: index,
    }));
    this.randomizeArrangement();
  }

  randomizeArrangement() {
    let seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const phase = random() * Math.PI * 2;
    const slots = [{ x: 0, z: 0, rotationY: random() * Math.PI }];
    for (let index = 0; index < 6; index++) {
      const angle = phase + (index * Math.PI) / 3 + (random() - 0.5) * 0.02;
      const radius = 0.428 + random() * 0.004;
      slots.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        rotationY: -angle,
      });
    }
    for (let index = slots.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [slots[index], slots[swap]] = [slots[swap], slots[index]];
    }
    this.items.forEach((item, index) => {
      item.x = slots[index].x;
      item.z = slots[index].z;
      item.rotationY = slots[index].rotationY;
    });
  }

  update(dt) {
    this.elapsed += dt;
    this.sinceFlip += dt;
    this.airTime = Math.max(0, this.airTime - dt);
    this.doneness = clamp(this.elapsed / 31, 0, 1.2);
    const contactDt = this.airTime > 0 ? 0 : dt;
    this.items.forEach((item) => {
      item.sinceFlip += contactDt;
      item.cookedLevel = clamp(item.cookedLevel + contactDt / 27, 0, 1);
      if (item.sinceFlip > 16)
        item.scorch = clamp(item.scorch + contactDt * 0.026, 0, 1);
    });
  }

  flip() {
    if (this.airTime > 0.14) return false;
    const interval = this.sinceFlip;
    this.lastInterval = interval;
    this.items.forEach((item, index) => {
      const pieceInterval = interval + (index - 3) * 0.12;
      const quality =
        pieceInterval < this.targetStart
          ? clamp(pieceInterval / this.targetStart, 0.15, 1)
          : pieceInterval > this.targetEnd
            ? clamp(1 - (pieceInterval - this.targetEnd) / 6, 0.1, 1)
            : 1;
      item.qualitySum += quality;
      item.flips += 1;
      item.sinceFlip = 0;
      item.scorch = Math.max(0, item.scorch - 0.2);
      item.flipStartRotation = item.faceDown ? Math.PI : 0;
      item.faceDown = !item.faceDown;
      item.flipEndRotation = item.faceDown ? Math.PI : 0;
      item.flipHeight = 0.38 + Math.random() * 0.28;
    });
    this.flipCount += 1;
    this.sinceFlip = 0;
    this.airTime = 0.68;
    return true;
  }

  get rating() {
    if (this.items[0].flips < 2) return 0;
    const timing = clamp(1 - Math.abs(this.elapsed - 31) / 17, 0, 1);
    const itemRatings = this.items.map((item) => {
      const rhythm = item.qualitySum / item.flips;
      const turnBonus = clamp(item.flips / 3, 0, 1);
      const burnPenalty = 1 - item.scorch * 0.72;
      return rhythm * turnBonus * burnPenalty;
    });
    const average =
      itemRatings.reduce((sum, rating) => sum + rating, 0) / itemRatings.length;
    return clamp(average * timing, 0, 1);
  }

  get stars() {
    return Math.round(this.rating * 5);
  }

  get score() {
    return this.stars * 10;
  }

  get heatLevel() {
    return clamp(this.sinceFlip / 12, 0, 1);
  }

  get gameOver() {
    return this.items.every((item) => item.scorch >= 1);
  }
}
