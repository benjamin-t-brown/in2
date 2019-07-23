'use strict';

var fs = require( 'fs' );

class Player {
	constructor( ) {
		this.state = {
			inventory: [],
			booleans: {},
			combat: {}
		};
		this.name = 'default';
	}

	writeSave( cb ) {
		var save_url = './game-saves/' + name + '.sav';
		fs.writeFile( save_url, ( err ) => {
			if ( err ) {
				console.log( 'Error reading save at "' + save_url + '"' );
			}
			cb();
		} );
	}

	loadSave( name, cb ) {
		this.name = name;
		var save_url = './game-saves/' + name + '.sav';
		fs.readFile( save_url, ( err, data ) => {
			if ( err ) {
				console.log( 'Error loading save at "' + save_url + '"' );
			}
			try {
				this.state = JSON.parse( data.toString() );
			} catch ( e ) {
				console.log( 'Error loading save at "' + save_url + '", malformed save file.' );
			}
			cb();
		} );
	}

	print() {
		console.log( this.state );
	}

	get( path ) {
		let _helper = ( paths, obj ) => {
			let k = paths.shift();
			if( !paths.length ){
				return obj[ k ] || null;
			}

			let next_obj = obj[ k ];
			if( next_obj ){
				return _helper( paths, next_obj );
			} else {
				return null;
			}
		};

		return _helper( path.split( '.' ), this.state );
	}

	set( path, val ) {
		val = val === undefined ? true : val;
		let _helper = ( keys, obj ) => {
			let k = keys.shift();
			if( k === undefined ){
				return;
			}
			if( !keys.length ){
				obj[ k ] = val;
			}

			if( !obj[ k ] ){
				obj[ k ] = {};
			}
			_helper( keys, obj[ k ] );
		};

		_helper( path.split( '.' ), this.state );
	}

	setIfUnset( path, val ) {
		if( this.get( path ) === null ) {
			this.set( path, val );
		}
	}

	compare(){
		return false;
	}

	hasItem( name ){
		return this.state.inventory.indexOf( name ) > -1;
	}
	addItem( name ){
		if( name ){
			this.state.inventory.push( name );
		}
	}
	removeItem( name ){
		var ind = this.state.inventory.indexOf( name );
		if( ind > -1 ){
			this.state.inventory.splice( ind, 1 );
		}
	}
}

module.exports = new Player();
