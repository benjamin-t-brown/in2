var React = require('react');
var ReactDOM = require('react-dom');
var expose = require('./expose');
var css = require('./css');
var utils = require('utils');
var dialog = require('dialog');

class Context extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('context');
  }

  renderItem(name, cb) {
    return React.createElement(
      'div',
      {
        key: name,
        onClick: cb,
        className: 'context-button',
        style: {
          padding: '5px',
        },
      },
      React.createElement(
        'span',
        {
          className: 'no-select',
        },
        name
      )
    );
  }

  render() {
    if (!this.props.visible) {
      return React.createElement('div');
    }

    var elems = [];

    for (var i in this.props.cbs) {
      var name = i.split(/(?=[A-Z])/).join(' ');
      name = name.slice(0, 1).toUpperCase() + name.slice(1);
      elems.push(this.renderItem(name, this.props.cbs[i].bind(null, this.props.node)));
    }

    if (elems.length === 0) {
      elems.push(this.renderItem('(No Action)', () => {}));
    }

    return React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          width: '140px',
          padding: '5px',
          top: this.props.style.top,
          left: this.props.style.left,
          backgroundColor: css.colors.TEXT_LIGHT,
          border: '2px solid ' + css.colors.FG_NEUTRAL,
        },
      },
      elems
    );
  }
}

window.addEventListener('click', () => {
  exports.hide();
});

exports.show = function(x, y, node, file, cbs) {
  ReactDOM.render(
    React.createElement(Context, {
      visible: true,
      node: node,
      file: file,
      cbs: cbs,
      style: {
        top: y,
        left: x,
      },
    }),
    document.getElementById('context')
  );
};

exports.hide = function() {
  ReactDOM.render(
    React.createElement(Context, {
      visible: false,
    }),
    document.getElementById('context')
  );
};

exports.show_context_menu = function(board, elem) {
  if (utils.is_ctrl()) {
    return;
  }
  board.disable_context = true;
  var { x, y } = utils.get_mouse_pos();
  var cbs = {};
  var file_node = board.getNode(elem.id);
  if (file_node.type !== 'next_file' && board.nodeCanHaveChild(file_node)) {
    if (file_node.type === 'choice') {
      cbs.linkNode = function(parent) {
        this.enterLinkMode(parent);
      }.bind(board);
      cbs.createTextChoiceNode = function(parent) {
        this.addNode(parent, 'choice_text');
      }.bind(board);
      cbs.createConditionalChoiceNode = function(parent) {
        var added_node = this.addNode(parent, 'choice_conditional', 'true;');
        this.addNode(added_node, 'choice_text');
      }.bind(board);
    } else if (file_node.type === 'choice_conditional') {
      cbs.linkNode = function(parent) {
        this.enterLinkMode(parent);
      }.bind(board);
      cbs.createTextChoiceNode = function(parent) {
        this.addNode(parent, 'choice_text');
      }.bind(board);
    } else if (file_node.type === 'switch') {
      cbs.linkNode = function(parent) {
        this.enterLinkMode(parent);
      }.bind(board);
      cbs.createSwitchConditionalNode = function(parent) {
        this.addNode(parent, 'switch_conditional', `player.get('something')`);
      }.bind(board);
    } else {
      cbs.linkNode = function(parent) {
        this.enterLinkMode(parent);
      }.bind(board);
      cbs.createTextNode = function(parent) {
        this.addNode(parent, 'text');
      }.bind(board);
      cbs.createChoiceNode = function(parent) {
        this.addNode(parent, 'choice');
      }.bind(board);
      cbs.createPassFailNode = function(parent) {
        this.addPassFailNode(parent);
      }.bind(board);
      cbs.createActionNode = function(parent) {
        this.addNode(parent, 'action', ``);
      }.bind(board);
      cbs.createChunkNode = function(parent) {
        this.addNode(parent, 'chunk', ``);
      }.bind(board);
      cbs.createSwitchNode = function(parent) {
        this.addSwitchNode(parent);
      }.bind(board);
      cbs.createTriggerNode = function(parent) {
        this.addNode(parent, 'trigger', ``);
      }.bind(board);
      cbs.createDeferNode = function(parent) {
        this.addNode(parent, 'defer', `engine.defer();`);
      }.bind(board);
      cbs.createNextFileNode = function(parent) {
        dialog.show_input_with_select(
          expose.get_state('file-browser').file_list,
          null,
          name => {
            this.addNode(parent, 'next_file', name);
          }
        );
      }.bind(board);
    }
  }

  exports.show(x, y, file_node, board.file, cbs);
};
