import React from 'react';
import expose from 'expose';
import Board from 'board';
import FileBrowser from 'file-browser';
import PlayerArea from 'player-area';
import injectSheet from 'react-jss';

window.expose = expose;

class StatusBar extends expose.Component {
  constructor(props) {
    super(props);

    this.state = {
      isInLinkMode: false,
      hoverText: '',
    };

    this.expose('status-bar');
  }

  render() {
    return (
      <div
        id="status-bar"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          margin: '5px',
          color: 'white',
        }}
      >
        {this.state.isInLinkMode
          ? 'Select a NODE to link (ESC to cancel).'
          : this.state.hoverText}
      </div>
    );
  }
}

class MainContainer extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('main');
    this.state = {
      current_file: null,
    };
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div
          className={'no-drag ' + classes.main}
          style={{ height: window.innerHeight + 'px' }}
        >
          <div id="player-resizer" className={classes.playerResizer}>
            <div className={classes.boardParent}>
              {this.state.current_file && (
                <Board file={this.state.current_file} />
              )}
            </div>
            <div className={classes.fileBrowserParent}>
              <FileBrowser
                current_file_name={this.state.current_file?.name || null}
              />
            </div>
          </div>
        </div>
        <PlayerArea />
        <StatusBar />
      </>
    );
  }
}

const styles = css => ({
  main: {
    backgroundColor: css.colors.SECONDARY,
  },
  playerResizer: {
    display: 'flex',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  boardParent: {
    width: 'calc(100% - 260px)',
    overflow: 'hidden',
  },
  fileBrowserParent: {
    width: '300px',
    fontFamily: 'monospace',
  },
});

export default injectSheet(styles)(MainContainer);
