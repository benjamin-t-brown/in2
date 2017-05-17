'use strict';
var React = require( 'react' );
var ReactDOM = require( 'react-dom' );
var MainContainer = require( './main-container' );

var container = document.createElement( 'div' );
document.body.prepend( container );

var Main = global.Main = {};

var main_props = {
	main: Main
};
Main.render = function() {
	ReactDOM.render(
		React.createElement( MainContainer, main_props ),
		container
	);
};
Main.render();

var _resize_timeout = null;
window.addEventListener( 'resize', function() {
	if( _resize_timeout !== null ) {
		clearTimeout( _resize_timeout );
	}
	_resize_timeout = setTimeout( Main.render, 100 );
} );
