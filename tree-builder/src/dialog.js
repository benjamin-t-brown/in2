'use strict';

var React = require( 'react' );
var ReactDOM = require( 'react-dom' );
var css = require( './css' );

var current_confirm = null;
var current_cancel = null;

class ConfirmDialog extends React.Component {
	constructor( props ){
		super( props );

		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm();
		};

		this.handleCancelClick = current_cancel = () => {
			exports.hide();
			this.props.on_cancel();
		};
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '300px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, this.props.text ),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Yes' ) ),
				React.DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'No' ) )
			)
		);
	}
}

class InputDialog extends React.Component {
	constructor( props ){
		super( props );

		this.state = {
			value: this.props.node ? this.props.node.content : ''
		};

		this.handleInputChange = ( ev ) => {
			this.setState( {
				value: ev.target.value
			} );
		};
		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm( this.state.value );
		};

		this.handleCancelClick = current_cancel = () => {
			exports.hide();
		};
	}

	componentDidMount(){
		document.getElementById( 'InputDialog-input' ).focus();
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '400px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, 'Provide Input' ),
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			},
				React.DOM.textarea( {
					id: 'InputDialog-input',
					onChange: this.handleInputChange,
					value: this.state.value,
					style: {
						backgroundColor: css.colors.BG,
						color: css.colors.TEXT_LIGHT,
						width: '100%',
						height: this.props.node ? '200px' : '20px'
					}
				} )
			),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Okay' ) ),
				React.DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Cancel' ) )
			)
		);
	}
}

class NotificationDialog extends React.Component {
	constructor( props ){
		super( props );

		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm();
		};
		current_cancel = current_confirm;
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '300px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, this.props.text ),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Okay' ) )
			)
		);
	}
}

var on_key_down = function(	ev ){
	if( ev.keyCode === 13 ) { //enter
		current_confirm();
	} else if( ev.keyCode === 27 ){ //esc
		current_cancel();
	}
};

exports.show_confirm = function( text, on_confirm, on_cancel ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( ConfirmDialog, {
			text: text,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.show_input = function( node, on_confirm, on_cancel ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( InputDialog, {
			node: node,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.show_notification = function( text, on_confirm ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( NotificationDialog, {
			text: text,
			on_confirm: on_confirm || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.hide = function(){
	window.removeEventListener( 'keydown', on_key_down );
	ReactDOM.unmountComponentAtNode( document.getElementById( 'dialog' ) );
};
