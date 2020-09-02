const React = require('react');
const css = require('css');
const utils = require('utils');
const expose = require('expose');
const dialog = require('dialog');
const core = require('core');

//This file represents the file browser on the right side of the screen.
//It can:
// 1.) List all files from the api endpoint at GET /file
// 2.) Load a file onto the board when it is clicked at GET /file/<filename>
// 3.) Rename a file if it is double clicked
// 4.) Create a new file by clicking the button at the top
// 5.) Delete a file by clicking the red 'x' on the right at DEL GET /file/<filename>
// 6.) Uses LocalStorage to remember the last file you had open

module.exports = class FileBrowser extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('file-browser');
    const filter = localStorage.getItem('last_filter_value');
    this.state = {
      file_list: [],
      filter: filter || '',
      checked_files: {},
      check_all: false,
    };

    this.onFileClick = function (filename) {
      this.loadFile(filename);
    }.bind(this);

    this.onFileCheckboxClick = function (filename, ev) {
      if (filename === this.props.current_file_name) {
        return;
      }
      const ns = this.state.checked_files;
      ns[filename] = !!ev.target.checked;
      this.setState({
        checked_files: ns,
      });
    }.bind(this);

    this.onCheckAllClick = ev => {
      const ns = {};
      for (const i in this.state.checked_files) {
        if (i === this.props.current_file_name) {
          ns[i] = this.state.checked_files[i];
        } else {
          ns[i] = !!ev.target.checked;
        }
      }
      this.setState({
        checked_files: ns,
        check_all: !!ev.target.checked,
      });
    };

    this.onCompileFileClick = () => {
      expose.get_state('player-area').compile(this.props.current_file_name);
    };

    this.getCheckedFiles = () => {
      const checked_files = [];
      for (const i in this.state.checked_files) {
        if (this.state.checked_files[i]) {
          if (i === this.props.current_file_name) {
            checked_files.unshift(i);
          } else {
            checked_files.push(i);
          }
        }
      }
      return checked_files;
    };

    this.onCompileSelectedClick = () => {
      expose.get_state('player-area').compile(this.getCheckedFiles());
    };

    this.onCompileAllClick = () => {
      expose.get_state('player-area').compile();
    };

    this.onFileDoubleClick = function (filename) {
      dialog.show_input(filename, name => {
        this.renameFile(filename, name);
      });
    }.bind(this);

    this.onCreateClick = () => {
      dialog.show_input(null, name => {
        const err = this.createFile(name);
        if (err) {
          console.error(err);
          dialog.show_notification(err);
        }
      });
    };

    this.onCopyClick = () => {
      expose.get_state('board').copySelection();
    };

    this.onPasteClick = () => {
      expose.get_state('board').pasteSelection();
    };

    this.onDeleteClick = function (filename) {
      dialog.show_confirm(
        'Are you sure you want to delete "' + filename + '"?',
        () => {
          this.deleteFile(filename);
        }
      );
    }.bind(this);

    this.handleFilterChange = ev => {
      localStorage.setItem('last_filter_value', ev.target.value);
      this.setState({
        filter: ev.target.value,
      });
    };

    this.loadFileExternal = (filename, cb) => {
      this.loadFile(filename, cb);
    };
    this.state.loadFileExternal = this.loadFileExternal;
  }

  componentDidMount() {
    this.refreshFileList(() => {
      const file = localStorage.getItem('last_file_name');
      this.loadFile(file || 'default.json');
    });
  }

  refreshFileList(cb) {
    utils.get('/file', resp => {
      const new_checked_files = {};
      const checked_files = this.state.checked_files;
      resp.data.forEach(filename => {
        new_checked_files[filename] = checked_files[filename] || false;
      });

      this.setState({
        file_list: resp.data,
        checked_files: new_checked_files,
      });
      if (cb) {
        cb();
      }
    });
  }
  validateName(name) {
    if (name.length < 2) {
      return 'That name is too short';
    }
    if (this.state.file_list.indexOf(name) !== -1) {
      return 'A file with that name already exists.';
    }
    return false;
  }

  renameFile(old_name, new_name) {
    if (new_name.length > 1 && new_name.slice(-5) !== '.json') {
      new_name = new_name + '.json';
    }
    const err = this.validateName(new_name);
    if (err) {
      console.error(err);
      dialog.show_notification(err);
      return;
    }
    console.log('Rename', old_name, 'to', new_name);
    utils.get('/file/' + old_name, resp => {
      console.log('got old data');
      resp.data.name = new_name;
      utils.post('/file/' + new_name, resp.data, () => {
        console.log('saved new file');
        this.deleteFile(old_name, () => {
          this.loadFile(new_name);
        });
      });
    });
  }
  loadFile(name, cb) {
    console.log('try load file', name, this.props.current_file_name);
    if (!name) {
      return;
    }
    if (this.props.current_file_name === name) {
      if (cb) {
        cb();
      }
      return;
    }
    utils.get('/file/' + name, resp => {
      localStorage.setItem('last_file_name', name);
      const ns = this.state.checked_files;
      ns[name] = true;

      expose.set_state('main', {
        current_file: resp.data,
        checked_files: ns,
      });
      if (cb) {
        cb();
      }
    });
  }
  createFile(name) {
    if (name.length > 1 && name.slice(-5) !== '.json') {
      name = name + '.json';
    }
    const err = this.validateName(name);
    if (err) {
      return err;
    }
    const file = {
      name: name,
      nodes: [
        {
          id: utils.random_id(3),
          type: 'root',
          content: 'Root',
          top: '20px',
          left: '20px',
        },
      ],
      links: [],
    };
    utils.post('/file/' + file.name, file, () => {
      console.log('File created', file.name);
      this.refreshFileList(() => {
        this.loadFile(name);
      });
    });
  }
  deleteFile(name, cb) {
    if (name === 'default.json') {
      return;
    }
    utils.del('/file/' + name, () => {
      this.refreshFileList(() => {
        if (cb) {
          cb(name);
        } else {
          if (name === this.props.current_file_name) {
            expose.set_state('main', {
              current_file: null,
            });
          }
        }
      });
    });
  }

  render() {
    let is_valid_regex = true;
    try {
      this.regex = new RegExp(this.state.filter);
    } catch (e) {
      is_valid_regex = false;
    }
    let elems = this.state.file_list
      .filter(filename => {
        if (this.state.filter) {
          if (is_valid_regex) {
            return filename.search(this.state.filter) > -1;
          } else {
            return filename.indexOf(this.state.filter) > -1;
          }
        } else {
          return true;
        }
      })
      .map(filename => {
        return React.createElement(
          'div',
          {
            key: filename,
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              width: '280px',
            },
          },
          React.createElement('input', {
            type: 'checkbox',
            checked: this.state.checked_files[filename],
            onChange: this.onFileCheckboxClick.bind(this, filename),
            style: {
              marginTop: '6px',
            },
          }),
          React.createElement(
            'div',
            {
              className: 'file',
              onClick: this.onFileClick.bind(this, filename),
              onDoubleClick: this.onFileDoubleClick.bind(this, filename),
              title: filename,
              style: {
                backgroundColor:
                  this.props.current_file_name === filename
                    ? css.colors.FG_NEUTRAL
                    : null,
                padding: '5px',
                cursor: 'pointer',
                color: css.colors.TEXT_LIGHT,
                width: '240px',
                textOverflow: 'ellipsis',
                whiteSpace: 'pre',
                overflow: 'hidden',
              },
            },
            React.createElement(
              'span',
              {
                className: 'no-select',
              },
              filename
            )
          ),
          React.createElement(
            'span',
            {
              onClick: this.onDeleteClick.bind(this, filename),
              className: 'file-delete',
            },
            React.createElement('span', { className: 'no-select' }, 'X')
          )
        );
      });

    if (!elems.length) {
      elems = React.createElement(
        'div',
        {
          style: {
            padding: '10px',
            color: css.colors.TEXT_NEUTRAL,
          },
        },
        '(No Files)'
      );
    }

    return React.createElement(
      'div',
      {
        //prevents the board from moving when you click anywhere on the file browser
        onMouseDown: ev => {
          ev.stopPropagation();
          ev.nativeEvent.stopImmediatePropagation();
        },
        onMouseEnter: () => {
          //$('#diagram-parent').panzoom('disable');
        },
        onMouseLeave: () => {
          //$('#diagram-parent').panzoom('enable');
        },
        onWheel: ev => {
          ev.stopPropagation();
        },
        style: {
          backgroundColor: css.colors.BG_NEUTRAL,
          overflowY: 'scroll',
          height: window.innerHeight + 'px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            height: '52px',
            display: 'flex',
            justifyContent: 'space-around',
          },
        },
        React.createElement(
          'div',
          {
            className: 'confirm-button',
            onClick: this.onCompileFileClick,
          },
          React.createElement(
            'span',
            { className: 'no-select' },
            'Compile File'
          )
        ),
        React.createElement(
          'div',
          {
            className: 'confirm-button',
            onClick: this.onCompileSelectedClick,
          },
          React.createElement(
            'span',
            { className: 'no-select' },
            'Compile Selected'
          )
        ),
        React.createElement(
          'div',
          {
            className: 'confirm-button',
            onClick: this.onCompileAllClick,
          },
          React.createElement('span', { className: 'no-select' }, 'Compile All')
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            height: '30px',
            display: 'flex',
            justifyContent: 'space-around',
          },
        },
        React.createElement('input', {
          placeholder: 'Filter...',
          value: this.state.filter,
          onChange: this.handleFilterChange,
          style: {
            width: 'calc( 100% - 10px )',
            padding: '3px',
          },
        })
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'flex-start',
          },
        },
        React.createElement(
          'div',
          {
            className: 'confirm-button-secondary',
            onClick: this.onCreateClick,
          },
          React.createElement('span', { className: 'no-select' }, 'New File')
        ),
        React.createElement(
          'div',
          {
            className: 'confirm-button-secondary',
            onClick: this.onCopyClick,
          },
          React.createElement('span', { className: 'no-select' }, 'Copy')
        ),
        React.createElement(
          'div',
          {
            className: 'confirm-button-secondary',
            onClick: this.onPasteClick,
          },
          React.createElement('span', { className: 'no-select' }, 'Paste')
        )
      ),
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="confirm-button confirm-button-player"
          onClick={async () => {
            const resp = await new Promise(resolve => {
              utils.get('/compile', resolve);
            });
            let states = {};
            if (resp.error) {
              states.error = resp.error;
            } else if (resp.data.success === false) {
              states = resp.data.errors;
            } else {
              states = await core.runFileDry(resp.data.file);
            }
            dialog.set_shift_req(true);
            dialog.show_input(
              {
                content: JSON.stringify(states, null, 2),
              },
              () => {
                dialog.set_shift_req(false);
              },
              () => {
                dialog.set_shift_req(false);
              }
            );
          }}
        >
          PLAYER STORE
        </div>
      </div>,
      <div
        style={{
          textAlign: 'center',
          color: css.colors.TEXT_LIGHT,
          textDecoration: 'underline',
        }}
      >
        {this.props.current_file_name?.slice(0, -5) || '(None Selected)'}
      </div>,
      <div>
        {React.createElement('input', {
          type: 'checkbox',
          checked: this.state.check_all,
          onChange: this.onCheckAllClick,
          style: {
            marginTop: '6px',
            padding: '3px',
          },
        })}
      </div>,
      React.createElement(
        'div',
        {
          style: {
            width: 'calc( 100% - 14px )',
          },
        },
        elems
      )
    );
  }
};
