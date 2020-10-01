const React = require('react');
const css = require('css');

module.exports = class NotificationDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm();
    };
    window.current_cancel = window.current_confirm;
  }

  render() {
    return (
      <div
        style={{
          left: 0,
          top: 0,
          position: 'fixed',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {React.createElement(
          'div',
          {
            style: {
              maxWidth: '600px',
              padding: '1rem',
              backgroundColor: css.colors.SECONDARY,
              border: '4px solid ' + css.colors.SECONDARY_ALT,
              color: css.colors.TEXT_LIGHT,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '128px',
              justifyContent: 'space-between',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                padding: '5px',
              },
            },
            this.props.text
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
            )
          )
        )}
      </div>
    );
  }
};
