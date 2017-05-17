'use strict';

var React = require( 'react' );
var ReactDOM = require( 'react-dom' );
var expose = require( './expose' );
var css = require( './css' );

class Context extends expose.Component {
	constructor( props ){
		super( props );
		this.expose( 'context' );
	}

	renderItem( name, cb ){
		return React.DOM.div( {
				key: name,
				onClick: cb,
				className: 'context-button',
				style: {
					padding: '5px'
				}
			}, React.DOM.span( {
				className: 'no-select'
			}, name )
		);
	}

	render() {
		if( !this.props.visible ){
			return React.DOM.div();
		}

		var elems = [];

		elems.push(
			this.renderItem( 'Link Node', this.props.linkNode.bind( null, this.props.node ) ),
			this.renderItem( 'New Text Node', this.props.createTextNode.bind( null, this.props.node ) ),
			this.renderItem( 'New Choice Node', this.props.createChoiceNode.bind( null, this.props.node ) ),
			this.renderItem( 'New PassFail Node', this.props.createPassFailNode.bind( null, this.props.node ) )
		);

		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '140px',
				padding: '5px',
				top: this.props.style.top,
				left: this.props.style.left,
				backgroundColor: css.colors.TEXT_LIGHT,
				border: '2px solid ' + css.colors.FG_NEUTRAL
			}
		}, elems );
	}
}

window.addEventListener( 'click', () => {
	exports.hide();
} );

exports.show = function( x, y, node, file, cbs ){
	ReactDOM.render(
		React.createElement( Context, {
			visible: true,
			node: node,
			file: file,
			linkNode: cbs.linkNode,
			createTextNode: cbs.createTextNode,
			createChoiceNode: cbs.createChoiceNode,
			createPassFailNode: cbs.createPassFailNode,
			style: {
				top: y,
				left: x
			}
		} ),
		document.getElementById( 'context' )
	);
};

exports.hide = function(){
	ReactDOM.render(
		React.createElement( Context, {
			visible: false
		} ),
		document.getElementById( 'context' )
	);
};
