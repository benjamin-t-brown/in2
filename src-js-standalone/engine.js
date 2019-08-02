/**
 * Main Engine File.
 *
 * Any "var" in this file is on purpose hoisted into window/global
 */

// Style ------
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

let stylize = style => {
  let agg = '';
  for (let i in style) {
    agg += i + ':' + style[i] + ';';
  }
  return agg;
};

// Core/Player ------
let disableNextSayWait;
let lastChooseNodeId;
let lastChooseNodesSelected;
let lines = [];

let render = () => {
  let html = `<div style=${stylize(textareaStyle)}>`;
  lines.forEach(({ t, s }, i) => {
    if (t.indexOf('Press any key') > -1 && i < lines.length - 1) {
      return;
    }
    html += `<p style="${stylize(window[s])}">${t}</p>`;
  });
  window.root.innerHTML = html + '</div>';
  window.scrollTo(0, document.body.scrollHeight);
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
    if (ev.key === 'm') {
      isDarkMode = !isDarkMode;
      setStyle();
      document.body.style = stylize(bodyStyle);
      render();
    }
  });
})();

var core = /*eslint-disable-line*/ {
  init() {
    disableNextSayWait = false;
    lastChooseNodeId = null;
    lastChooseNodesSelected = [];
  },

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
        addLine(text, disableNextSayWait && 'chosenStyle');
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
  },
  choose(text, nodeId, choices) {
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
  },
};

var player = /*eslint-disable-line*/ {
  state: {},
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

// Engine ------
let map = [];
let mapWidth = 6;
let mapHeight = 6;

let pctChance = pct => {
  return pct / 100 > Math.random();
};

let createMapNode = (x, y) => {
  return {
    x,
    y,
    name: '',
    adj: {},
  };
};

let getMapNodeAt = (map, x, y) => {
  return map[y * mapWidth + x];
};

var engine = {
  init() {
    map = engine.generateMaze();
    engine.zoneMaze(map);
  },
  generateMaze() {
    let map = [];
    for (let i = 0; i < mapHeight; i++) {
      for (let j = 0; j < mapWidth; j++) {
        let node = createMapNode(j, i);
        let adj = node.adj;
        if (i === 0 && j === 0) {
          map.push(node);
          continue;
        } else if (i === 0) {
          adj.e = getMapNodeAt(map, j - 1, i);
          adj.e.adj.w = node;
        } else if (j === 0) {
          adj.n = getMapNodeAt(map, j, i - 1);
          adj.n.adj.s = node;
        } else {
          if (pctChance(50)) {
            adj.n = getMapNodeAt(map, j, i - 1);
            adj.n.adj.s = node;
          } else {
            adj.e = getMapNodeAt(map, j - 1, i);
            adj.e.adj.w = node;
          }
        }
        map.push(node);
      }
    }
    return map;
  },
  zoneMaze(map) {
    let zones = ['main', 'storage', 'flight', 'engineering', 'dorms'];
    let zoneIndex = 0;
    let startingNode = map[Math.floor(Math.random() * map.length)];
    startingNode.visited = true;
    let unvisitedList = [startingNode];
    let ctr = 0;
    while (unvisitedList.length) {
      ctr++;
      if (ctr > (mapWidth * mapHeight) / zones.length) {
        ctr = 0;
        zoneIndex++;
      }
      let node = unvisitedList.shift();
      node.zone = zones[zoneIndex];
      for (let i in node.adj) {
        let adjNode = node.adj[i];
        if (!adjNode.visited) {
          adjNode.visited = true;
          unvisitedList.unshift(adjNode);
        }
      }
    }
  },
};

// debug
var debug = {
  showMap() {
    console.log('show map', map);
    let html = `<div style="margin:10px">`;
    for (let i = 0; i < mapHeight; i++) {
      html += `<div style="display:flex; justifyContent: flex-start;">`;
      for (let j = 0; j < mapWidth; j++) {
        const node = getMapNodeAt(map, j, i);
        const styles = {
          'background-color': 'gray',
          width: '90px',
          height: '90px',
          'border-top': '2px solid black',
          'border-bottom': '2px solid black',
          'border-left': '2px solid black',
          'border-right': '2px solid black',
        };
        if (node.zone === 'main') {
          styles['background-color'] = 'purple';
        } else if (node.zone === 'flight') {
          styles['background-color'] = 'blue';
        } else if (node.zone === 'engineering') {
          styles['background-color'] = 'orange';
        } else if (node.zone === 'storage') {
          styles['background-color'] = 'brown';
        } else if (node.zone === 'dorms') {
          styles['background-color'] = 'green';
        }

        if (node.adj.n) {
          styles['border-top'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.s) {
          styles['border-bottom'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.e) {
          styles['border-left'] = `2px solid ${styles['background-color']}`;
        }
        if (node.adj.w) {
          styles['border-right'] = `2px solid ${styles['background-color']}`;
        }
        html += `<div style="${stylize(styles)}">${node.zone}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    window.db.innerHTML = html;
  },
};

// init
console.log('init');
setStyle();
document.body.style = stylize(bodyStyle);
engine.init();
debug.showMap();
