'use strict';

var http_server = require( './http-server' );
var fs = require( 'fs' );

var PORT = 8888;
var SAVE_DIR = __dirname + '/../save/';

http_server.start( PORT, __dirname + '/..' );
process.on( 'SIGINT', function() {
	console.log( 'SIGINT' );
	process.exit();
} );
process.on( 'SIGTERM', function() {
	console.log( 'SIGTERM' );
	process.exit();
} );
process.on( 'exit', function() {
	process.stdout.write( "Bye" );
} );

console.log( 'Now listening on port: ' + PORT );

// Save a file
http_server.post( 'file', ( obj, resp, data ) => {
	fs.writeFile( SAVE_DIR + '/' + data.name, JSON.stringify( data ), ( err ) => {
		http_server.reply( resp, {
			err: err
		} );
	} );
} );

// Delete a file
http_server.del( 'file', ( obj, resp ) => {
	fs.unlink( SAVE_DIR + '/' + obj.event_args[ 0 ], ( err ) => {
		http_server.reply( resp, {
			err: err
		} );
	} );
} );

// Get file contents or get list of all files
http_server.get( 'file', ( obj, resp ) => {
	if( obj.event_args[ 0 ] ) {
		fs.readFile( SAVE_DIR + '/' + obj.event_args[ 0 ], ( err, data ) => {
			var ret_data;
			try {
				ret_data = JSON.parse( data.toString() );
			} catch( e ) {
				if( !err ) {
					err = 'Invalid JSON in file "' + obj.event_args[ 0 ] + '"';
				}
				ret_data = null;
			}
			http_server.reply( resp, {
				err: err,
				data: ret_data
			} );
		} );
	} else {
		fs.readdir( __dirname + '/../save', ( err, dirs ) => {
			var ret = {
				err: err,
				data: null
			};
			ret.data = dirs.filter( ( dir ) => {
				return dir !== 'DONT_DELETE';
			} );
			http_server.reply( resp, ret );
		} );
	}
} );
