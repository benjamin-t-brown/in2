/*
global
G_display
G_ui
*/

let ctr = 0;
document.addEventListener('keydown', () => {
  console.log('KEYDOWN');
  ctr++;
  G_ui.Dialog(ctr % 2 ? 'left' : 'right');
});

const load = async () => {
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
  G_display.drawSprite('bg-floor1-left', 0, 0);

  G_ui.Dialog();
};

let lastChooseNodeId;
let lastChooseNodesSelected;
var core = /*eslint-disable-line*/ {
  async init(canvasId) {
    console.log('[standalone] init');
    lastChooseNodeId = null;
    lastChooseNodesSelected = [];
    await G_display.init(canvasId);
    await load();
    // G_display.setLoop(() => {

    // });
  },

  async say(text, cb) {
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

    return new Promise(resolve => {
      addLine();
      addLine('&nbsp&nbsp&nbsp&nbsp&nbspPress any key to continue...');
      catcher.setK(() => {
        cb && cb();
        resolve();
      });
    });
  },
  async choose(text, nodeId, choices) {
    return new Promise(resolve => {
      const sep = '----------';
      if (text) {
        addLine(text);
        addLine();
      }
      addLine(sep, 'choiceStyle');
      const actualChoices = choices.filter(choice => {
        if (choice.c()) {
          return true;
        } else {
          return false;
        }
      });
      if (lastChooseNodeId !== nodeId) {
        lastChooseNodeId = nodeId;
        lastChooseNodesSelected = [];
      }
      let ctr = 1;
      actualChoices.forEach(choice => {
        addLine('<b>  ' + ctr + '.) ' + choice.t + '</b>', 'choiceStyle');
        ctr++;
      });
      addLine(sep, 'choiceStyle');
      catcher.setK(async key => {
        const choice = actualChoices[key - 1];
        if (choice) {
          lastChooseNodesSelected.push(choice.t);
          catcher.setK(() => {});
          addLine();
          addLine(choice.t, 'chosenStyle');
          addLine();
          await choice.cb();
          resolve();
        }
      });
    });
  },
  async defer(func, args) {
    args = args || [player.get('curIN2n'), player.get('curIN2f')];
    await func.apply(null, args);
  },

  exit() {
    console.log('[standalone] EXIT');
    G_display.stop();
  },
};

var player = /*eslint-disable-line*/ {
  state: {
    //curIN2n
    //curIN2f
    //lasIN2f
  },
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
    if (this.get(path) === null) {
      this.set(path, val);
    }
  },
};

var addLine = text => {
  console.log('ADD LINE', text);
  console.log(text);
};

var catcher = new (function () {
  let cb = () => {};
  this.setK = _cb => (cb = _cb);
  window.addEventListener('keydown', ev => {
    if (this.disabled) {
      return;
    }
    cb(String.fromCharCode(ev.which));
  });
})();
