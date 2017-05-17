'use strict';

var React = require( 'react' );
var expose = require( './expose' );
var css = require( 'css' );

var FileBrowser = require( './file-browser' );
var Board = require( './board' );

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );
		this.state = {
			current_file: null
		};
	}

	render() {
		return React.DOM.div( {
				className: 'no-drag',
				style: {
					display: 'flex',
					justifyContent: 'space-around',
					height: window.innerHeight + 'px',
					backgroundColor: css.colors.SECONDARY
				}
			},
			React.DOM.div( {
				style: {
					width: 'calc( 100% - 200px )',
					height: '100%',
					overflow: 'hidden'
				}
			}, this.state.current_file ? React.createElement( Board, {
				file: this.state.current_file
			} ) : null ),
			React.DOM.div( {
				style: {
					width: '200px',
					height: '100%'
				}
			}, React.createElement( FileBrowser, {
				current_file_name: this.state.current_file ? this.state.current_file.name : null
			} ) )
		);
	}
};
