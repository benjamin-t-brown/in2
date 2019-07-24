import React from 'react';
import expose from 'expose';
import css from 'css';
import Board from 'board';
import FileBrowser from 'file-browser';
import PlayerArea from 'player-area';

window.expose = expose;

export default class MainContainer extends expose.Component {
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
