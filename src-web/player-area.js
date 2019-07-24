var React = require('react');
var expose = require('expose');
var css = require('css');
var utils = require('utils');
var engine = require('engine'); //eslint-disable-line no-unused-vars
var $ = require('jquery');

class PictureArea extends expose.Component {
  constructor(props) {
    super(props);
    this.state = {
      pic: '',
    };
    this.expose('picture');

    this.state.setPicture = url => {
      this.setState({
        pic: url,
      });
    };
  }

  render() {
    return React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundImage: this.state.pic ? 'url(' + this.state.pic + ')' : null,
        },
      },
      React.createElement('canvas', {
        id: 'canvas_scene',
        width: '400px',
        height: '400px',
      })
    );
  }
}

module.exports = class PlayerArea extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('player-area');
    this.visible = false;
    this.last_index_shown = -1;

    this.show = () => {
      this.last_index_shown = -1;
      this.visible = true;
      document.getElementById('player-resizer').className = 'player_visible';
    };

    this.hide = () => {
      this.visible = false;
      expose.get_state('board').removeAllExtraClasses();
      engine.disable();
      document.getElementById('player-resizer').className = 'player_invisible';
    };

    this.add_line = line => {
      var arr = this.state.text;
      arr.push(line);
      if (this.timeout !== null) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => {
        this.timeout = null;
        this.setState({
          text: arr,
        });
      }, 100);
    };

    this.remove_line = () => {
      var arr = this.state.text;
      arr = arr.slice(0, -1);
      this.setState({
        text: arr,
      });
    };

    this.compile = filename => {
      this.show();
      expose.get_state('board').removeAllExtraClasses();
      expose.get_state('picture').setPicture('');

      var _on_compile = resp => {
        console.log('RESP', resp);
        if (resp.data.success) {
          this.add_line('Success!');
          this.add_line('');
          var file = resp.data.file
            .replace(/require\( .engine.core. \)/, 'engine.core()')
            .replace(/require\( .engine.player. \)/, 'engine.player()')
            .replace(/require\( .engine.scene. \)/, 'engine.scene()')
            .replace(/console.log\(/g, 'alert(');
          engine.init('canvas_scene', () => {
            let ctx = document.getElementById('canvas_scene').getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 400, 400);
            console.log('Now evaluating...', { file });
            eval(file); //eslint-disable-line no-eval
          });
        } else {
          this.add_line('Failure!');
          this.setState({
            errors: resp.data.errors,
          });
        }
      };

      if (filename && typeof filename === 'object') {
        var filelist = filename;
        utils.post(
          '/compile',
          {
            files: filelist,
          },
          _on_compile
        );
        this.setState({
          text: ['Compiling... ' + filelist.join(', ')],
          errors: [],
        });
      } else {
        this.setState({
          text: ['Compiling... ' + (filename ? filename : 'ALL')],
          errors: [],
        });
        utils.get('/compile' + (filename ? '/' + filename : ''), _on_compile);
      }
    };

    this.onEscapePress = ev => {
      if (ev.which === 27) {
        this.hide();
      }
    };

    this.state = {
      text: [],
      errors: [],
      show: this.show,
      hide: this.hide,
      add_line: this.add_line,
      remove_line: this.remove_line,
      compile: this.compile,
    };
  }

  componentDidUpdate() {
    var n = document.getElementById('player-text-area');
    n.scrollTop = n.scrollHeight;
    this.last_index_shown = this.state.text.length - 1;
  }
  componentDidMount() {
    this.last_index_shown = this.state.text.length - 1;
    window.addEventListener('keydown', this.onEscapePress);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onEscapePress);
  }

  render() {
    return React.createElement(
      'div',
      {
        onMouseDown: ev => {
          if (ev.nativeEvent.which === 1) {
            if (ev.target.id === 'close-player') {
              this.hide();
            } else if (ev.target.className === 'player-error') {
              var arr = ev.target;
              expose.get_state('file-browser').loadFileExternal(arr.title, () => {
                var id = arr.id.slice(6);
                expose.get_state('board').centerOnNode(id);
                $('#' + id).addClass('item-error');
              });
            }
          }
          ev.stopPropagation();
          ev.nativeEvent.stopImmediatePropagation();
        },
        onMouseEnter: () => {
          $('#diagram-parent').panzoom('disable');
        },
        onMouseLeave: () => {
          $('#diagram-parent').panzoom('enable');
        },
        style: {
          height: window.innerHeight / 2 + 'px',
          width: '100%',
          backgroundColor: css.colors.TEXT_DARK,
          color: css.colors.TEXT_LIGHT,
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          borderTop: '2px solid ' + css.colors.PRIMARY_ALT,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '30x',
          },
        },
        React.createElement(
          'div',
          {
            id: 'close-player',
            style: {
              position: 'absolute',
              right: '10px',
              top: '5px',
              color: 'red',
              fontSize: '16px',
              cursor: 'pointer',
            },
          },
          'Close'
        )
      ),
      React.createElement(
        'div',
        {
          id: 'picture',
          style: {
            width: '400px', //'700px', //'360px',
            height: '400px', //'475px', //'235px',
          },
        },
        React.createElement(PictureArea)
      ),
      React.createElement(
        'div',
        {
          id: 'player-text-area',
          style: {
            height: '100%',
            backgroundColor: css.colors.BG,
            overflowY: 'scroll',
            width: '700px',
            font: '18px courier new',
          },
        },
        React.createElement('div', {
          dangerouslySetInnerHTML: {
            __html:
              this.state.text.reduce((prev, curr, i) => {
                if (curr.indexOf('EXECUTION WARNING') > -1) {
                  return (
                    prev +
                    '<br/><span style="color:red">' +
                    curr.replace(/\n/g, '<br/>') +
                    '</span>'
                  );
                } else if (
                  i > this.last_index_shown &&
                  curr.indexOf('Press any key to continue') === -1
                ) {
                  return (
                    prev +
                    '<br/><span class="new-player-text">' +
                    curr.replace(/\n/g, '<br/>') +
                    '</span>'
                  );
                } else {
                  return prev + '<br/>' + curr.replace(/\n/g, '<br/>');
                }
              }, '') + '<br/> &nbsp <br/>',
          },
          style: {
            width: '90%',
            paddingLeft: '5%',
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              width: '90%',
              paddingLeft: '5%',
            },
          },
          this.state.errors.map(error => {
            return React.createElement(
              'div',
              {
                key: error.text + error.node_id,
                className: 'player-error',
                title: error.filename,
                id: 'error_' + error.node_id,
                style: {
                  width: '100%',
                },
              },
              error.filename + '|' + error.node_id + '|' + error.text,
              React.createElement('br'),
              React.createElement('br')
            );
          })
        )
      )
    );
  }
};
