/*
global
G_display
G_ui
*/

let loaded = false;
const IS_IN2 = !!window.IN2;
const load = async () => {
  console.log('IN2', window.IN2);
  if (loaded) {
    console.log('[standalone] Already loaded.');
    return;
  }
  console.log('[standalone] Load assets...');
  await Promise.all([
    G_display.loadImage('res/images/ada-regular.png', 'ada-regular'),
    G_display.loadImage('res/images/ada-talking.png', 'ada-talking'),
    G_display.loadImage('res/images/ada-happy.png', 'ada-happy'),
    G_display.loadImage('res/images/ada-angry.png', 'ada-angry'),
    G_display.loadImage('res/images/ada-sarcastic.png', 'ada-sarcastic'),
    G_display.loadImage('res/images/ada-surprised.png', 'ada-surprised'),
    G_display.loadImage('res/images/ada-thinking.png', 'ada-thinking'),
    G_display.loadImage('res/images/iroha-regular.png', 'iroha-regular'),
    G_display.loadImage('res/images/iroha-angry.png', 'iroha-angry'),
    G_display.loadImage('res/images/bg-floor1-left.png', 'bg-floor1-left'),
    G_display.loadImage('res/images/ui-black-bar.png', 'ui-black-bar'),
  ]);
  loaded = true;
};

var core = (window.core = /*eslint-disable-line*/ {
  async init(canvasId) {
    console.log('[standalone] init');
    await G_display.init(canvasId);
    await load();
    // G_display.setLoop(() => {

    // });
  },

  async say(text, cb) {
    console.log('[standalone] SAY INNER', text);
    try {
      if (typeof text === 'object') {
        if (text.length === 1) {
          addLine(text);
        } else {
          core.say(text[0], () => {
            core.say(text.slice(1), cb);
          });
          return;
        }
      } else {
        if (text.length <= 1) {
          cb && cb();
          return;
        } else {
          addLine(text);
        }
      }

      if (IS_IN2) {
        return;
      }

      return new Promise(resolve => {
        catcher.setK(() => {
          cb && cb();
          resolve();
        });
      });
    } catch (e) {
      console.log('Caught something', e);
    }
  },
  async choose(text, nodeId, choices) {
    return new Promise(resolve => {
      if (text) {
        addLine('both: ' + text);
      } else {
        addLine('both: Choose what?');
      }
      const actualChoices = choices
        .filter(choice => {
          if (choice.c()) {
            return true;
          } else {
            return false;
          }
        })
        .map((choice, i) => {
          return {
            text: i + 1 + '.) ' + choice.t,
            cb: async () => {
              this.onChoose();
              await choice.cb();
              resolve();
            },
          };
        });
      G_ui.Choices({
        choices: actualChoices,
        visible: true,
      });
    });
  },
  onChoose() {
    G_ui.Choices({
      choices: [],
      visible: false,
    });
  },
  async defer(func, args) {
    args = args || [this.get('curIN2n'), this.get('curIN2f')];
    await func.apply(null, args);
  },

  once() {
    const nodeId = this.get('curIN2n');
    const key = 'once.' + nodeId;
    if (!this.get(key)) {
      this.set(key);
      return true;
    }
    return false;
  },

  exit() {
    console.log('[standalone] EXIT');
    catcher.removeListener();
    G_display.stop();
    G_ui.Choices({
      choices: [],
      visible: false,
    });
    // removeEventListener('onkeydown', onKeyDown);
  },
});

var player = (window.player = /*eslint-disable-line*/ {
  state: {
    //curIN2n
    //curIN2f
    //lasIN2f
  },
  init() {},
  get(path) {
    let _helper = (paths, obj) => {
      let k = paths.shift();
      if (!paths.length) {
        return obj[k] === undefined ? undefined : obj[k];
      }

      let nextObj = obj[k];
      if (nextObj !== undefined) {
        return _helper(paths, nextObj);
      } else {
        return undefined;
      }
    };

    return _helper(path.split('.'), this.state);
  },
  set(path, val) {
    if (path === 'curIN2n') {
      return this.set('nodes.' + val);
    }
    if (path === 'curIN2f') {
      return this.set('files.' + val.replace('.json', ''));
    }
    val = val === undefined ? true : val;
    let _helper = (keys, obj) => {
      let k = keys.shift();
      if (k === undefined) {
        return;
      }
      if (!keys.length) {
        obj[k] = val;
        return;
      }

      if (!obj[k]) {
        obj[k] = {};
      }
      _helper(keys, obj[k]);
    };

    _helper(path.split('.'), this.state);
  },
  setIfUnset(path, val) {
    if (this.get(path) === undefined) {
      this.set(path, val);
    }
  },
});

var engine = (window.engine = {
  CONVERSATION_KEY: 'conversation',
  setBackground(sprite) {
    G_display.drawSprite(sprite, 0, 0);
  },
  setConversation1(label, baseSprite) {
    player.set(this.CONVERSATION_KEY, {
      leftLabel: label,
      leftBaseSprite: baseSprite,
      leftSprite: baseSprite,
      rightLabel: '',
      rightBaseSprite: '',
      rightSprite: '',
    });
  },
  setConversation2(leftLabel, leftBaseSprite, rightLabel, rightBaseSprite) {
    player.set(this.CONVERSATION_KEY, {
      leftLabel,
      leftBaseSprite,
      leftSprite: '',
      rightLabel,
      rightBaseSprite,
      rightSprite: '',
    });
  },
  emote(label, spriteName) {
    const conversation = player.get(this.CONVERSATION_KEY);
    if (!conversation) {
      throw new Error('No conversation has been set, cannot emote');
    }
    if (label === conversation.leftLabel) {
      conversation.leftSprite = spriteName;
      conversation.rightSprite = '';
    } else if (label === conversation.rightLabel) {
      conversation.rightSprite = spriteName;
      conversation.leftSprite = '';
    }
  },
  setSprites(leftSpriteName, rightSpriteName) {
    const conversation = player.get(this.CONVERSATION_KEY);
    if (!conversation) {
      throw new Error('No conversation has been set, cannot setSprites');
    }
    conversation.leftSprite = leftSpriteName;
    conversation.rightSprite = rightSpriteName;
  },
  unsetSprites() {
    const conversation = player.get(this.CONVERSATION_KEY);
    if (!conversation) {
      throw new Error('No conversation has been set, cannot unsetSprites');
    }
    conversation.leftSprite = '';
    conversation.rightSprite = '';
  },
});

var addLine = text => {
  let {
    leftLabel,
    leftBaseSprite,
    leftSprite,
    rightLabel,
    rightBaseSprite,
    rightSprite,
  } = player.get(engine.CONVERSATION_KEY) || {
    leftLabel: '',
    leftSprite: '',
    leftBaseSprite: '',
    rightLabel: '',
    rightSprite: '',
    rightBaseSprite: '',
  };

  let speaker = '';
  if (text.match(/^([,\-a-zA-Z0-9]*): /)) {
    const [label, emotion, emotion2] = text
      .slice(0, text.indexOf(':'))
      .split(',');

    if (label === leftLabel) {
      speaker = 'left';
      if (emotion) {
        leftSprite = emotion;
      }
    } else if (label === rightLabel) {
      speaker = 'right';
      if (emotion) {
        rightSprite = emotion;
      }
    } else if (leftLabel && rightLabel) {
      speaker = 'both';
      if (emotion) {
        leftSprite = emotion;
      }
      if (emotion2) {
        rightSprite = emotion2;
      }
    }
    text = text.slice(text.indexOf(':') + 1).trim();
  }

  G_ui.Dialog({
    text,
    leftPortraitSprite: leftSprite || leftBaseSprite,
    rightPortraitSprite: rightSprite || rightBaseSprite,
    leftPortraitLabel: leftLabel,
    rightPortraitLabel: rightLabel,
    speaker,
    visible: true,
  });
};

var catcher = new (function () {
  let cb = () => {};
  this.setK = _cb => (cb = _cb);
  const listener = ev => {
    if (this.disabled) {
      return;
    }
    cb(String.fromCharCode(ev.which));
  };
  this.removeListener = () => {
    window.removeEventListener('keydown', listener);
  };
  window.addEventListener('keydown', listener);
})();
