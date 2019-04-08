'use strict';

class KeyCatcher {
	constructor() {
		this.cb = () => {};

		this.on_keypress = ( data ) => {
			var key = data.toString();
			if ( key && /[a-zA-Z0-9-_ \r\n]/.test( key ) ) {
				this.cb( key );
			} else {
				console.log( 'Non-standard keypress detected, exiting...' );
				process.exit( 0 );
			}
		};

		process.stdin.setRawMode( true );
		process.stdin.resume();
		process.stdin.on( 'data', this.on_keypress );
	}

	setKeypressEvent( cb ) {
		this.cb = cb;
	}
}

var catcher = null;

var disable_next_say_wait = false;
var last_choose_node_id = null;
var last_choose_nodes_selected = [];

exports.init = function(){
	catcher = exports.catcher = new KeyCatcher();
};

exports.choose = function choose( text, node_id, choices ) {
	if( text ){
		console.log( text );
	}
	console.log( '---------' );
	var actual_choices = choices.filter( ( choice ) => {
		if( choice.condition() ){
			return true;
		} else {
			return false;
		}
	} );
	if( last_choose_node_id === node_id ){
		actual_choices = actual_choices.filter( ( choice ) => {
			return last_choose_nodes_selected.indexOf( choice.text ) === -1;
		} );
	} else {
		last_choose_node_id = node_id;
		last_choose_nodes_selected = [];
	}
	var ctr = 1;
	actual_choices.forEach( ( choice ) => {
		console.log( '  ' + ( ctr ) + '.) ' + choice.text );
		ctr++;
	} );
	console.log( '---------' );
	catcher.setKeypressEvent( ( key ) => {
		var choice = actual_choices[ key - 1 ];
		if ( choice ) {
			last_choose_nodes_selected.push( choice.text );
			catcher.setKeypressEvent( () => {} );
			process.stdout.write( '  ' + key + '.) ');
			disable_next_say_wait = true;
			choice.cb();
			console.log();
			disable_next_say_wait = false;
		}
	} );
};

exports.say = function say( text, cb ) {
	if ( typeof text === 'object' ) {
		if ( text.length === 1 ) {
			console.log( text );
		} else {
			exports.say( text[ 0 ], () => {
				exports.say( text.slice( 1 ), cb );
			} );
			return;
		}
	} else {
		console.log( text );
	}

	if( disable_next_say_wait ){
		setTimeout( () => {
			cb();
		}, 1 );
		return;
	}
	console.log();
	process.stdout.write( ' Press any key to continue...\r' );
	catcher.setKeypressEvent( () => {
		process.stdout.write( '                                 \r' );
		cb();
	} );
};

exports.picture = function(){};

exports.exit = function(){
	process.exit( 0 );
};
