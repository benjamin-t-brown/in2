'use strict';

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
		return React.createElement(
			'div',
			{
				style: {
					position: 'absolute',
					width: '300px',
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
				this.props.text,
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
						'Okay',
					),
				),
			),
		);
	}
};
