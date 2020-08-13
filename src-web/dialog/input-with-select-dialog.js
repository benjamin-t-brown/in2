const React = require('react');
const css = require('css');

module.exports = class InputWithSelectDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.default_value || this.props.options[0],
      select_value: this.props.default_value || this.props.options[0],
      options: this.props.options,
    };

    this.handleSelectChange = ev => {
      this.setState({
        value: ev.target.value,
        select_value: ev.target.value,
      });
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
    document.getElementById('InputDialogFileSelect-input').focus();
  }

  render() {
    return React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          width: '400px',
          padding: '5px',
          top: '300px',
          left: window.innerWidth / 2 - 140 + 'px',
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
          id: 'InputDialogFileSelect-input',
          onChange: this.handleInputChange,
          value: this.state.value,
          style: {
            backgroundColor: css.colors.BG,
            color: css.colors.TEXT_LIGHT,
            width: '100%',
            height: '20px',
          },
        }),
        React.createElement('div', { style: { height: '10px' } }),
        React.createElement(
          'select',
          {
            onChange: this.handleSelectChange,
            style: {
              width: '100%',
              height: '30px',
              value: this.state.select_value,
            },
          },
          this.props.options.map(option => {
            return React.createElement(
              'option',
              {
                key: option,
                value: option,
                name: option,
              },
              option
            );
          })
        )
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
    );
  }
};
