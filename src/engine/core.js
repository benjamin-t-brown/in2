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

var catcher = exports.catcher = new KeyCatcher();

var disable_next_say_wait = false;

exports.choose = function choose( text, choices ) {
	if ( typeof text === 'object' ) {
		if ( text.length === 1 ) {
			console.log( text[ 0 ] );
			console.log( '---------' );
		} else {
			exports.say( text[ 0 ], () => {
				choose( text.slice( 1 ), choices );
			} );
		}
	} else {
		console.log( text );
		console.log( '---------' );
	}
	choices.forEach( ( choice, i ) => {
		console.log( '  ' + ( i + 1 ) + '.) ' + choice.text );
	} );
	console.log( '---------' );
	console.log();
	catcher.setKeypressEvent( ( key ) => {
		var choice = choices[ key - 1 ];
		if ( choice ) {
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
