var React = require('react');
var css = require('css');

module.exports = class InputDialog extends React.Component {
  constructor(props) {
    super(props);

    var value = '';
    if (this.props.node) {
      value = this.props.node.content;
    } else if (this.props.default_text) {
      value = this.props.default_text;
    }

    this.state = {
      value: value,
    };

    this.handleInputChange = ev => {
      this.setState({
        value: ev.target.value,
      });
    };
    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm(this.state.value);
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
    };
  }

  componentDidMount() {
    document.getElementById('InputDialog-input').focus();
  }

  render() {
    return (
      <div
        onWheel={ev => ev.stopPropagation()}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        {React.createElement(
          'div',
          {
            style: {
              width: '60%',
              minWidth: '500px',
              padding: '5px',
              top: '300px',
              left: window.innerWidth / 2 - 250 + 'px',
              backgroundColor: css.colors.SECONDARY,
              border: '4px solid ' + css.colors.SECONDARY_ALT,
              color: css.colors.TEXT_LIGHT,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                padding: '5px',
              },
            },
            'Provide Input'
          ),
          React.createElement(
            'div',
            {
              style: {
                padding: '5px',
              },
            },
            React.createElement('textarea', {
              id: 'InputDialog-input',
              onChange: this.handleInputChange,
              value: this.state.value,
              spellCheck: this.props.whitespace ? false : '',
              style: {
                padding: '5px',
                background: 'rgb(53, 53, 53)',
                resize: 'none',
                whiteSpace: this.props.whiteSpace ? 'pre' : '',
                color: css.colors.TEXT_LIGHT,
                width: '100%',
                height: this.props.node ? undefined : '20px',
                minHeight: this.props.node ? '65%' : undefined,
              },
            })
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
              },
            },
            React.createElement(
              'div',
              {
                className: 'confirm-button',
                onClick: this.handleConfirmClick,
              },
              React.createElement(
                'span',
                {
                  className: 'no-select',
                },
                'Okay'
              )
            ),
            React.createElement(
              'div',
              {
                className: 'cancel-button',
                onClick: this.handleCancelClick,
              },
              React.createElement(
                'span',
                {
                  className: 'no-select',
                },
                'Cancel'
              )
            )
          )
        )}
      </div>
    );
  }
};
