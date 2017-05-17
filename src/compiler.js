'use strict';

var fs = require( 'fs' );

class File {
	constructor( json ) {
		this.json = json;
		this.name = json.name;
	}

	getRoot() {
		for ( var i in this.json.nodes ) {
			if ( this.json.nodes[ i ].type === 'root' ) {
				return this.json.nodes[ i ];
			}
		}
		return null;
	}

	getNode( id ) {
		for ( var i in this.json.nodes ) {
			if ( this.json.nodes[ i ].id === id ) {
				return this.json.nodes[ i ];
			}
		}
		return null;
	}

	getChildren( node ) {
		return this.json.links.filter( ( link ) => {
			return link.from === node.id;
		} ).map( ( link ) => {
			return this.getNode( link.to );
		} );
	}

	getParents( node ) {
		return this.json.links.filter( ( link ) => {
			return link.to === node.id;
		} ).map( ( link ) => {
			return this.getNode( link.from );
		} );
	}
}

class Compiler {
	constructor() {
		this.errors = [];
		this.already_compiled = {};
		this.has_error = {};
		this.typeFuncs = {
			root: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, 'Root node has no child.' );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, 'Root node has multiple children.' );
					return null;
				} else {
					var child = children[ 0 ];
					var ret = `${child.id}();`;
					return `files[ \`${file.name}\` ] = function(){\n` + this.compileNode( child, file ) + ret + '\n};\n';
				}
			},
			text: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, `Text node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, `Text node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var child = children[ 0 ];
					var ret =
						`// ${node.type}\n` +
						`function ${node.id}(){\n` +
						`    var text = \`${node.content}\`;\n` +
						`    core.say( text, ${child.id} );\n` +
						`}\n`;
					return ret + '\n' + this.compileNode( child, file );
				}
			},
			choice: ( node, file ) => {
				var children = file.getChildren( node );
				if( children.length === 0 ){
					this.error( file.name, `Choice node ${node.id} has no children.\n CONTENT ${node.content}` );
					return null;
				}
				var ret =
					`// ${node.type}\n` +
					`function ${node.id}(){\n` +
					`    var text = \`${node.content}\`;\n` +
					`    core.choose( text, [` +
					``;
				for( var i in children ){
					var child = children[ i ];
					if( child.type === 'text' || child.type === 'choice_text' ){
						ret += `{\n` +
							`        text: \`${child.content}\`,\n` +
							`        cb: ${child.id}\n` +
							`    },`;
					} else {
						this.error( file.name, `Choice node ${node.id} has non-text child ${child.id}.\n CONTENT ${node.content}` );
						return null;
					}
				}
				ret = ret.slice( 0, -1 );
				ret += `]);\n}\n\n`;
				var is_invalid = false;
				for( var i in children ){
					var child = children[ i ];
					var r = this.compileNode( child, file );
					if( r ){
						ret += r;
					} else {
						is_invalid = true;
					}
				}
				if( is_invalid ){
					return null;
				} else {
					return ret;
				}
			}
		};
	}

	getHeader(){
		return `var core = require( \`./core\` );\nvar player = require( \`./player\` );\nvar files = {};`;
	}
	getFooter( main_file_name ){
		return `files[ \`${main_file_name}\` ]();\n`;
	}

	error( filename, text ) {
		this.has_error[ filename ] = true;
		this.errors.push( 'ERROR: [' + filename + '] ' + text );
	}

	hasError( filename ){
		return this.has_error[ filename ];
	}

	readAndCompile( filename, cb ) {
		fs.readFile( filename, ( err, data ) => {
			if ( err ) {
				this.error( filename, 'Cannot read file. \n\n' + err );
				return cb( this.errors );
			} else {
				var json = null;
				try {
					json = JSON.parse( data.toString() );
				} catch ( e ) {
					this.error( filename, 'Cannot parse json in file. \n\n' + e );
					return cb( this.errors );
				}
				var file = new File( json );
				var ret = this.compileFile( file );
				if ( this.errors.length ) {
					cb( ret, file );
				} else {
					cb( ret, file );
				}
			}
		} );
	}

	compileFile( file ) {
		var root = file.getRoot();
		if ( root === null ) {
			this.error( file.name, 'File has no root!' );
			return null;
		}
		return this.compileNode( root, file );
	}

	compileNode( node, file ) {
		if( this.already_compiled[ node.id ] ){
			return '';
		}
		if ( this.typeFuncs[ node.type ] ) {
			this.already_compiled[ node.id ] = true;
			return this.typeFuncs[ node.type ]( node, file );
		} else {
			this.error( file.name, `Node ${node.id} has an invalid type: ${node.type}. \n\n CONTENT: ${node.content}` );
			return null;
		}
	}
}

var output_result = function( result ) {
	fs.writeFile( __dirname + '/main.compiled.js', result, ( err ) => {
		if( err ){
			console.error( 'Error writing output ./main.compiled.js', err );
		} else {
			console.log( 'Output written: ./main.compiled.js' );
		}
	} );
};

var output_errors = function( errors ) {
	console.log( '-------------' );
	errors.forEach( ( err, i ) => {
		console.log( ' ' + err );
		if( i !== errors.length - 1 ){
			console.log();
		}
	} );
	console.log( '-------------' );
	console.log();
};

var compile = function( input_files ) {
	var num_started = 0;
	var num_finished = 0;
	var c = new Compiler();
	var aggregated_result = c.getHeader();
	var main_file_name = '';
	var failed_files = [];
	input_files.forEach( ( filename, i ) => {
		num_started++;
		c.readAndCompile( filename, ( result, file ) => {
			num_finished++;
			if( i === 0 ){
				main_file_name = file.name;
			}
			if ( result && !c.hasError( file.name ) ) {
				aggregated_result += '\n\n' + result;
			} else {
				failed_files.push( file.name );
			}
			if ( num_started === num_finished ) {
				if ( c.errors.length ) {
					output_errors( c.errors );
					console.log( `Failed to compile ${failed_files.length}/${input_files.length} files:` );
					for( var j in failed_files ){
						console.log( ' ' + failed_files[ j ] );
					}
					console.log();
				}
				aggregated_result = aggregated_result + c.getFooter( main_file_name );
				output_result( aggregated_result );
			}
		} );
	} );
};

fs.readdir( __dirname + '/../tree-builder/save', ( err, dirs ) => {
	dirs = dirs.filter( ( dir ) => {
		return dir !== 'DONT_DELETE';
	} ).sort( ( a, b ) => {
		if( a === 'main.json' ){
			return -1;
		} else if( b === 'main.json' ){
			return 1;
		} else {
			return a > b ? -1 : 1;
		}
	} ).map( ( dir ) => {
		return __dirname + '/../tree-builder/save/' + dir;
	} );
	console.log( 'Compiling...' );
	for( var i in dirs ){
		console.log( ' ' + dirs[ i ] );
	}
	console.log();
	compile( dirs );
} );
