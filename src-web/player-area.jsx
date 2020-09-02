const React = require('react');
const expose = require('expose');
const css = require('css');
const utils = require('utils');
const core = require('core');
const $ = require('jquery');

module.exports = class PlayerArea extends expose.Component {
  constructor(props) {
    super(props);
    this.last_index_shown = -1;

    this.show = () => {
      this.last_index_shown = -1;
      core.enable();
      this.setState({
        visible: true,
      });
    };

    this.hide = () => {
      expose.get_state('board').removeAllExtraClasses();
      core.disable();
      this.setState({
        visible: false,
      });
    };

    this.add_line = line => {
      const arr = this.state.text;
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
      const arr = this.state.text.slice(0, -1);
      this.setState({
        text: arr,
      });
    };

    this.compile = filename => {
      this.show();
      expose.get_state('board').removeAllExtraClasses();

      const _on_compile = resp => {
        console.log('RESP', resp);
        if (resp.data.success) {
          core.runFile(resp.data.file);
        } else {
          this.add_line('Failure!');
          this.setState({
            errors: resp.data.errors,
          });
        }
      };

      if (filename && typeof filename === 'object') {
        const fileList = filename;
        utils.post(
          '/compile',
          {
            files: fileList,
          },
          _on_compile
        );
        this.setState({
          text: ['Compiling... ' + fileList.join(', ')],
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
      visible: false,
      show: this.show,
      hide: this.hide,
      add_line: this.add_line,
      remove_line: this.remove_line,
      compile: this.compile,
    };

    this.expose('player-area');
  }

  componentDidUpdate() {
    const n = document.getElementById('player-text-area');
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
        id: 'player-area',
        onMouseDown: ev => {
          if (ev.nativeEvent.which === 1) {
            if (ev.target.id === 'close-player') {
              this.hide();
            } else if (ev.target.className === 'player-error') {
              const arr = ev.target;
              expose
                .get_state('file-browser')
                .loadFileExternal(arr.title, () => {
                  const id = arr.id.slice(6);
                  expose.get_state('board').centerOnNode(id);
                  $('#' + id).addClass('item-error');
                });
            } else {
              setTimeout(() => {
                core._core.catcher.onMouseDown(ev);
              });
            }
          }
          ev.stopPropagation();
          ev.nativeEvent.stopImmediatePropagation();
        },
        onWheel: ev => {
          ev.stopPropagation();
        },
        onMouseEnter: () => {
          //$('#diagram-parent').panzoom('disable');
        },
        onMouseLeave: () => {
          //$('#diagram-parent').panzoom('enable');
        },
        style: {
          cursor: 'default',
          height: window.innerHeight / 2 + 'px',
          width: '100%',
          backgroundColor: css.colors.TEXT_DARK,
          color: css.colors.TEXT_LIGHT,
          display: this.state.visible ? 'flex' : 'none',
          justifyContent: 'center',
          position: 'fixed',
          left: 0,
          top: '50%',
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
              fontFamily: 'monospace',
            },
          },
          'Close'
        )
      ),
      <div id="db" />,
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
              <br />,
              <br />
            );
          })
        )
      )
    );
  }
};
