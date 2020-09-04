/*
global
G_display
*/

class G_Animation {
  constructor(loop) {
    this.loop = loop || false;
    this.sprites = [];
    this.done = false;
    this.totalDurationMs = 0;
    this.currentSpriteIndex = 0;
    this.timestampStart = 0;
  }
  reset() {
    this.done = false;
    this.currentSpriteIndex = 0;
  }
  start() {
    const now = G_display.getCurrentTime();
    this.timestampStart = now;
  }
  getDurationMs() {
    return this.totalDurationMs;
  }
  addSprite({ name, duration, offsetX, offsetY, opacity }) {
    this.sprites.push({
      name,
      timestampBegin: this.totalDurationMs,
      timestampEnd: this.totalDurationMs + duration,
      durationMs: duration,
      offsetX: offsetX || 0,
      offsetY: offsetY || 0,
      opacity,
    });
    this.totalDurationMs += duration;
  }
  getAnimIndex(timestampNow) {
    let lastIndex = 0;
    let leftI = this.currentSpriteIndex;
    let rightI = this.sprites.length - 1;
    while (leftI <= rightI) {
      const midI = leftI + Math.floor((rightI - leftI) / 2);
      lastIndex = midI;
      const { timestampEnd, timestampBegin } = this.sprites[midI];

      const beginTime = timestampBegin + this.timestampStart;
      const endTime = timestampEnd + this.timestampStart;

      if (timestampNow < endTime && timestampNow > beginTime) {
        return midI;
      }

      if (timestampNow >= endTime) {
        leftI = midI + 1;
      } else {
        rightI = midI - 1;
      }
    }
    return lastIndex;
  }
  getSprite() {
    return this.sprites[this.currentSpriteIndex].name;
  }
  getSpriteSize(i) {
    const now = G_display.getCurrentTime();
    i = i || this.getAnimIndex(now);
    const { name } = this.sprites[i];
    const { clip_w, clip_h } = G_display.getSprite(name);
    return {
      width: clip_w,
      height: clip_h,
    };
  }
  isDone() {
    return this.done;
  }
  update() {
    const now = G_display.getCurrentTime();
    if (this.currentSpriteIndex === this.sprites.length - 1) {
      if (this.loop && now - this.timestampStart > this.totalDurationMs) {
        let newStart = this.timestampStart + this.totalDurationMs;
        this.reset();
        this.start();
        if (now - newStart < this.totalDurationMs) {
          this.timestampStart = newStart;
        }
      }
    }
    this.currentSpriteIndex = this.getAnimIndex(now);
  }
}
