const React = require('react');
const expose = require('./expose');
const css = require('css');

const FileBrowser = require('./file-browser');
const Board = require('./board');
const PlayerArea = require('./player-area');

window.expose = expose;

module.exports = class MainContainer extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('main');
    this.state = {
      current_file: null,
    };
  }

  render() {
    return React.createElement(
      'div',
      {
        className: 'no-drag',
        style: {
          height: window.innerHeight + 'px',
          backgroundColor: css.colors.SECONDARY,
        },
      },
      React.createElement(
        'div',
        {
          id: 'player-resizer',
          style: {
            display: 'flex',
            justifyContent: 'space-around',
            overflow: 'hidden',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              width: 'calc( 100% - 260px )',
              overflow: 'hidden',
            },
          },
          this.state.current_file
            ? React.createElement(Board, {
                file: this.state.current_file,
              })
            : null
        ),
        React.createElement(
          'div',
          {
            style: {
              width: '260px',
            },
          },
          React.createElement(FileBrowser, {
            current_file_name: this.state.current_file
              ? this.state.current_file.name
              : null,
          })
        )
      ),
      React.createElement('div', {}, React.createElement(PlayerArea, {}))
    );
  }
};
