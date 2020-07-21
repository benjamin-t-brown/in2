const $ = require('jquery');
const expose = require('expose');
const utils = require('utils');

window.IN2 = true;

const _console_log = text => {
  expose.get_state('player-area').add_line(text || '');
};

class KeyCatcher {
  constructor() {
    this.disabled = false;
    this.cb = () => {};

    this.onKeypress = ev => {
      if (this.disabled) {
        return;
      }
      this.cb(String.fromCharCode(ev.which));
    };

    this.onMouseDown = ev => {
      this.onKeypress(ev);
    };

    window.addEventListener('keydown', this.onKeypress);
    //window.addEventListener('mousedown', this.onMouseDown);
  }

  setKeypressEvent(cb) {
    this.cb = cb;
  }

  disable() {
    this.disabled = true;
  }

  enable() {
    this.disabled = false;
  }
}

let disable_next_say_wait = false;
let last_choose_node_id = null;
let last_choose_nodes_selected = [];

exports._core = {
  catcher: new KeyCatcher(),
  init() {
    disable_next_say_wait = false;
    last_choose_node_id = null;
    last_choose_nodes_selected = [];
  },

  centerAtActiveNode() {
    const board = expose.get_state('board');
    board.removeAllExtraClasses();
    const active_node_id = exports.player().get('curIN2n');
    const active_file_name = exports.player().get('curIN2f');
    if (active_node_id) {
      expose
        .get_state('file-browser')
        .loadFileExternal(active_file_name, () => {
          const elem = document.getElementById(active_node_id);
          if (elem) {
            board.centerOnNode(active_node_id);
            $('#' + active_node_id).css('outline', '4px solid green');
          }
        });
    }
  },

  async say(text, cb) {
    this.centerAtActiveNode();
    if (typeof text === 'object') {
      if (text.length === 1) {
        _console_log(text);
      } else {
        exports.say(text[0], () => {
          exports.say(text.slice(1), cb);
        });
        return;
      }
    } else {
      if (text.length <= 1) {
        cb && cb();
        return;
      } else {
        _console_log(text);
      }
    }

    if (disable_next_say_wait) {
      setTimeout(() => {
        cb();
      }, 1);
      return;
    }
    return new Promise(resolve => {
      _console_log();
      _console_log('&nbsp&nbsp&nbsp&nbsp&nbspPress any key to continue...');
      this.catcher.setKeypressEvent(() => {
        expose.get_state('player-area').remove_line();
        cb && cb();
        resolve();
      });
    });
  },

  async choose(text, node_id, choices) {
    return new Promise(resolve => {
      this.centerAtActiveNode();
      if (text) {
        _console_log(text);
        _console_log();
      }
      _console_log('---------');
      const actual_choices = choices.filter(choice => {
        if (choice.c()) {
          return true;
        } else {
          return false;
        }
      });
      if (last_choose_node_id === node_id) {
        // actual_choices = actual_choices.filter( ( choice ) => {
        // 	return last_choose_nodes_selected.indexOf( choice.t ) === -1;
        // } );
      } else {
        last_choose_node_id = node_id;
        last_choose_nodes_selected = [];
      }
      let ctr = 1;
      actual_choices.forEach(choice => {
        _console_log('  ' + ctr + '.) ' + choice.t);
        ctr++;
      });
      _console_log('---------');
      this.catcher.setKeypressEvent(async key => {
        const choice = actual_choices[key - 1];
        if (choice) {
          last_choose_nodes_selected.push(choice.t);
          this.catcher.setKeypressEvent(() => {});
          _console_log();
          _console_log(choice.t);
          _console_log();
          await choice.cb();
          disable_next_say_wait = false;
          resolve();
        }
      });
    });
  },

  exit() {
    console.log('BYE!');
  },
};

exports._player = {
  state: {},
  name: 'default',
  init() {
    this.state = {};
  },

  print() {
    _console_log(this.state);
  },

  get(path) {
    let _helper = (paths, obj) => {
      let k = paths.shift();
      if (!paths.length) {
        return obj[k] === undefined ? null : obj[k];
      }

      let next_obj = obj[k];
      if (next_obj !== undefined) {
        return _helper(paths, next_obj);
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
};

exports.init = function (canvas_id, cb) {
  exports._core.init();
  exports._core.catcher.enable();
  exports._player.init();
  cb();
};

exports.core = function () {
  return exports._core;
};

exports.player = function () {
  return exports._player;
};

exports.disable = function () {
  exports._core.catcher.disable();
};

exports.enable = function () {
  exports._core.catcher.enable();
};

function evalInContext(js, context) {
  return function () {
    return eval(js); //eslint-disable-line no-eval
  }.call(context);
}

const postfix = `
player = {...player, ...exports._player};
core = {...core, ...exports._core};
`;

let standalone = '';
exports.runFile = async function (file) {
  _console_log('Success!');
  _console_log('');
  console.log('fetching standalone file');
  standalone = (await utils.get('/standalone/')).data;
  const context = {};
  console.log('Now evaluating...');
  const evalStr = standalone + '\n' + postfix + '\n' + file;
  try {
    evalInContext(evalStr, context);
    window.player = exports._player;
  } catch (e) {
    console.error(e, e.stack);
    //console.log(evalStr);
  }
};
