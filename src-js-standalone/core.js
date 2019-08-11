/**
 * Core File for IN2 execution.
 *
 * Any "var" in this file is on purpose hoisted.  The Style variables are supposed to
 * be hoisted into the window and accessed via window[nameStyle].
 */

let isDarkMode = true;
var bodyStyle, textareaStyle, textStyle, choiceStyle, chosenStyle; //eslint-disable-line

let setStyle = () => {
  bodyStyle = {
    'font-family': 'monospace',
    'font-size': '16px',
    margin: '0px',
    'background-color': isDarkMode ? '#1D1E19' : '#CCC',
  };
  textareaStyle = {
    'max-width': '600px',
    'min-width': '600px',
    'min-height': '100%',
    'margin-left': 'auto',
    'margin-right': 'auto',
    'background-color': isDarkMode ? '#333' : '#EEE',
    padding: '5px',
  };
  textStyle = {
    color: isDarkMode ? '#BB8' : '#333',
  };
  choiceStyle = {
    color: isDarkMode ? '#EEE' : '#111',
  };
  chosenStyle = {
    color: isDarkMode ? '#BFB' : '#181',
  };
};

var stylize = style => {
  let agg = '';
  for (let i in style) {
    agg += i + ':' + style[i] + ';';
  }
  return agg;
};

let lines = [];
let render = () => {
  let html = `<div style=${stylize(textareaStyle)}>`;
  lines.slice(-100).forEach(({ t, s }, i) => {
    if (t.indexOf('Press any key') > -1 && i < lines.length - 1) {
      return;
    }
    html += `<p style="${stylize(window[s])}">${t}</p>`;
  });
  if (window.root) {
    window.root.innerHTML = html + '</div>';
    window.root.scrollTop = window.root.scrollHeight;
  }
};

let addLine = (text, style) => {
  lines.push({
    t: `${(text || '').replace(/\n/g, '<br/>')}`,
    s: style || 'textStyle',
  });
  render();
};

let catcher = new (function() {
  let cb = () => {};
  this.setK = _cb => (cb = _cb);
  window.addEventListener('keydown', ev => {
    if (this.disabled) {
      return;
    }
    cb(String.fromCharCode(ev.which));
    if (ev.key === 'm' && !window.IN2) {
      isDarkMode = !isDarkMode;
      setStyle();
      document.body.style = stylize(bodyStyle);
      render();
    }
  });
})();

let lastChooseNodeId;
let lastChooseNodesSelected;
var core = /*eslint-disable-line*/ {
  init() {
    lastChooseNodeId = null;
    lastChooseNodesSelected = [];
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
        addLine('<b>  ' + ctr + '.) ' + choice.text + '</b>', 'choiceStyle');
        ctr++;
      });
      addLine(sep, 'choiceStyle');
      catcher.setK(async key => {
        const choice = actualChoices[key - 1];
        if (choice) {
          lastChooseNodesSelected.push(choice.text);
          catcher.setK(() => {});
          addLine();
          addLine(choice.text, 'chosenStyle');
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

  exit() {},
};

var player = /*eslint-disable-line*/ {
  state: {
    //curIN2n
    //curIN2f
    //lasIN2f
    //event
    //nextFile
  },
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
