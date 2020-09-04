/*
global
G_Animation
G_ui
*/

var G_display = {
  pictures: {},
  sprites: {},
  animations: {},
  canvas: null,
  numLoading: 1, // at least it's not infinity
  numLoaded: 1,
  error: false,
  started: false,
  isStopped: false,
  frameMultiplier: 1,
  elapsedMs: 0,
  currentAnimationFrame: null,

  async init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`No canvas exists with id: "${canvasId}"`);
    }
    this.canvas.width = 512;
    this.canvas.height = 512;
    G_ui.Loading();

    console.log(
      '[standalone] Display loaded.',
      Object.keys(this.pictures).length,
      'images.'
    );
  },
  getCtx() {
    return this.canvas.getContext('2d');
  },
  setCanvas(canvas) {
    this.storedCanvas = this.canvas;
    this.canvasId = canvas.id;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
  },
  restoreCanvas() {
    this.canvas = this.storedCanvas;
  },
  createSprite(x, y, w, h, htmlImageElement) {
    return [x, y, w, h, htmlImageElement];
  },
  createAnimation(name, cb) {
    this.animations[name] = cb;
  },
  createAnimationFromPicture(name) {
    this.createAnimation(name, () => {
      const a = new G_Animation(false);
      a.addSprite({ name, duration: 100 });
      return a;
    });
  },
  getSprite(name) {
    const sprite = this.sprites[name];
    if (sprite) {
      return this.sprites[name];
    } else {
      throw new Error('No sprite exists named: ' + name);
    }
  },
  getAnimation(k, t) {
    let key = k;
    if (t) {
      key = k + '_' + t;
    }

    if (this.animations[key]) {
      return this.animations[key]();
    } else {
      throw new Error('No animation named: ' + key);
    }
  },
  async loadImage(path, name) {
    this.numLoading++;
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.pictures[name] = img;
        this.sprites[name] = this.createSprite(
          0,
          0,
          img.width,
          img.height,
          img
        );
        this.createAnimationFromPicture(name);
        this.numLoaded++;
        G_ui.Loading();
        resolve(img);
      };
      img.src = path;
    });
  },
  async loadSound(path, name) {
    return new Promise((resolve, reject) => {
      const sound = new Audio(path);
      sound.autoplay = false;
      sound.oncanplay = () => {
        sound.oncanplay = null;
        sound.currentTime = 99999999999;
        const soundDuration = sound.currentTime;
        sound.currentTime = 0;
        sound.onended = function () {
          sound.pause();
          sound.currentTime = 0;
        };
        this.sounds[name] = {
          sound,
          audio: sound,
          soundDuration,
        };
        resolve(sound);
      };
      sound.addEventListener('error', e => {
        reject(
          'Cannot load sound: name="' + name + '", url="' + path + '" ' + e
        );
      });
      sound.src = path;
    });
  },
  async loadAnimationReel(
    name,
    spritesheetPath,
    spriteWidth,
    spriteHeight,
    loop
  ) {
    const image = this.loadImage(spritesheetPath, spritesheetPath);
    const { width, height } = image;
    const numSpritesX = Math.floor(width / spriteWidth);
    const numSpritesY = Math.floor(height / spriteHeight);

    const currentAnim = {
      name,
      loop,
      sprites: [],
    };

    for (let i = 0; i < numSpritesY; i++) {
      for (let j = 0; j < numSpritesX; j++) {
        const spriteIndex = i * numSpritesX + j;
        const spriteName = name + '_' + spriteIndex;
        this.sprites[spriteName] = this.createSprite(
          j * spriteWidth,
          i * spriteHeight,
          spriteWidth,
          spriteHeight,
          image
        );
        currentAnim.sprites.push({
          name: spriteName,
          duration: 100,
        });
      }
    }
    this.createAnimation(name, () => {
      this.createAnimation(name, () => {
        const a = new Animation(currentAnim.loop);
        currentAnim.sprites.forEach(obj => {
          a.addSprite({
            name: obj.name,
            duration: obj.duration,
            opacity: obj.opacity,
            offsetX: obj.offsetX,
            offsetY: obj.offsetY,
          });
        });
        return a;
      });
    });
  },
  getSound(name) {
    const soundObj = this.sounds[name];
    if (!soundObj) {
      console.warn(`[standalone] No sound exists with name ${name}`);
      return null;
    }
    const s = {
      ...soundObj,
      //soundDuration merged in from soundObj
      audio: soundObj.audio.cloneNode(),
      soundName: name,
      duration: 0,
      isPlaying: false,
      isPaused: false,
    };
    s.sound = s.audio;
    return s;
  },
  playSound(soundObj) {
    if (!soundObj) {
      console.warn('[standalone] No soundObj given');
      return;
    }
    const { sound } = soundObj;
    sound.play();
    soundObj.lastStartTimestamp = this.now;
    soundObj.isPlaying = true;
  },
  playSoundName(soundName) {
    this.playSound(this.getSound(soundName));
  },
  stopSound(soundObj) {
    const { sound } = soundObj;
    sound.pause();
    sound.currentTime = 0;
    soundObj.isPlaying = false;
  },
  drawText(text, x, y) {
    const ctx = this.getCtx();
    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  },
  drawRect(x, y, w, h, c) {
    const ctx = this.getCtx();
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  },
  drawSprite(sprite, x, y, params) {
    const ctx = this.getCtx();
    let s = this.getSprite(sprite);
    let { width, height, centered, bottom, rotation, opacity, scale } =
      params || {};
    if (s) {
      ctx.save();
      const [spriteX, spriteY, spriteW, spriteH, img] = s;
      if (opacity !== undefined) {
        ctx.globalAlpha = params.opacity;
      }
      let w = width ? width : spriteW;
      let h = height ? height : spriteH;
      if (scale !== undefined) {
        w = spriteW * scale;
        h = spriteH * scale;
      }
      if (rotation !== undefined) {
        centered = false;
        x -= w / 2;
        y -= w / 2;
        ctx.translate(x, y);
        ctx.translate(w / 2, h / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        x = -w / 2;
        y = -h / 2;
      }
      let _x = Math.round(x);
      let _y = Math.round(y);
      if (centered) {
        _x = Math.round(x - w / 2);
        _y = Math.round(y - h / 2);
      } else if (bottom) {
        _x = Math.round(x - w / 2);
        _y = Math.round(y - h);
      }
      ctx.drawImage(
        img,
        spriteX,
        spriteY,
        spriteW,
        spriteH,
        _x,
        _y,
        Math.round(w),
        Math.round(h)
      );
      ctx.restore();
    }
  },
  drawSpriteToCanvas(sprite, canvas) {
    this.setCanvas(canvas);
    this.drawSprite(sprite, 0, 0);
    this.restoreCanvas();
  },
  getCurrentTime() {
    return this.now;
  },
  stop() {
    this.isStopped = true;
  },
  setLoop(cb) {
    this.isStopped = false;
    const startTime = performance.now();
    let prevNow = startTime;
    const _loop = () => {
      let now = performance.now();
      const sixtyFpsMs = 16.666;
      const dt = now - prevNow;
      const fm = dt / sixtyFpsMs;
      this.frameMultiplier = fm > 2 ? 2 : fm;
      this.elapsedMs = now - startTime;
      prevNow = now;

      cb();
      if (!this.error && !this.isStopped) {
        requestAnimationFrame(_loop);
      }
    };
    if (!this.started) {
      this.started = true;
      this.currentAnimationFrame = requestAnimationFrame(_loop);
    }
  },
};
