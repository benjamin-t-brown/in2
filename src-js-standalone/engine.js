class KeyCatcher {
  constructor() {
    this.cb = () => {};
    window.addEventListener('keydown', ev => {
      if (this.disabled) {
        return;
      }
      this.cb(String.fromCharCode(ev.which));
    });
  }

  setK(cb) {
    this.cb = cb;
  }
}

let disableNextSayWait;
let lastChooseNodeId;
let lastChooseNodesSelected;
let lines = [];
let catcher = new KeyCatcher();

let bodyStyle = {
  'font-family': 'monospace',
  margin: '0px',
  'background-color': '#1D1E19',
};
let textareaStyle = {
  'max-width': '600px',
  'min-height': '100%',
  'margin-left': 'auto',
  'margin-right': 'auto',
  'background-color': '#303030',
  padding: '5px',
};
let textStyle = {
  color: '#ABAE81',
};
let choiceStyle = {
  color: '#EFEFEF',
};
let chosenStyle = {
  color: '#BFB',
};

let stylize = style => {
  let agg = '';
  for (let i in style) {
    agg += i + ':' + style[i] + ';';
  }
  return agg;
};

let addLine = (text, style) => {
  let html = `<div style=${stylize(textareaStyle)}>`;
  lines.push({
    t: `${(text || '').replace(/\n/g, '<br/>')}`,
    s: stylize(style || textStyle),
  });
  lines.forEach(({ t, s }, i) => {
    if (t.indexOf('Press any key') > -1 && i < lines.length - 1) {
      return;
    }
    html += `<p style="${s}">${t}</p>`;
  });
  document.body.innerHTML = html + '</div>';
  window.scrollTo(0, document.body.scrollHeight);
};

window.Core = class {
  init() {
    disableNextSayWait = false;
    lastChooseNodeId = null;
    lastChooseNodesSelected = [];
  }

  say(text, cb) {
    if (typeof text === 'object') {
      if (text.length === 1) {
        addLine(text);
      } else {
        exports.say(text[0], () => {
          exports.say(text.slice(1), cb);
        });
        return;
      }
    } else {
      if (text.length <= 1) {
        return cb();
      } else {
        addLine(text, disableNextSayWait && chosenStyle);
      }
    }

    if (disableNextSayWait) {
      setTimeout(() => {
        cb();
      }, 1);
      return;
    }
    addLine();
    addLine('&nbsp&nbsp&nbsp&nbsp&nbspPress any key to continue...');
    catcher.setK(() => {
      cb();
    });
  }

  choose(text, nodeId, choices) {
    const sep = '----------';
    if (text) {
      addLine(text);
      addLine();
    }
    addLine(sep, choiceStyle);
    const actualChoices = choices.filter(choice => {
      if (choice.condition()) {
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
      addLine('<b>  ' + ctr + '.) ' + choice.text + '</b>', choiceStyle);
      ctr++;
    });
    addLine(sep, choiceStyle);
    catcher.setK(key => {
      const choice = actualChoices[key - 1];
      if (choice) {
        lastChooseNodesSelected.push(choice.text);
        catcher.setK(() => {});
        disableNextSayWait = true;
        choice.cb();
        addLine();
        disableNextSayWait = false;
      }
    });
  }
};

window.Player = class {
  constructor() {
    this.state = {};
  }

  get(path) {
    let _helper = (paths, obj) => {
      let k = paths.shift();
      if (!paths.length) {
        return obj[k] === undefined ? null : obj[k];
      }

      let nextObj = obj[k];
      if (nextObj !== undefined) {
        return _helper(paths, nextObj);
      } else {
        return null;
      }
    };

    return _helper(path.split('.'), this.state);
  }

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
  }

  setIfUnset(path, val) {
    if (this.get(path) === null) {
      this.set(path, val);
    }
  }
};

window.player = new window.Player();
window.core = new window.Core();
document.body.style = stylize(bodyStyle);
