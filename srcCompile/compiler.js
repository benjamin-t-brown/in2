'use strict';

var fs = require( 'fs' );
var player = require( './engine/player' ); //eslint-disable-line no-unused-vars
var scene = require( './engine/scene' ); //eslint-disable-line no-unused-vars

//This program can compile compatible json files into IN2 *.compiled.js files.
//Usage:
//  Compile all files within the ${ProjectDir}/tree-builder/save directory into ${ProjectDir}/src/main.compiled.js
//    node compiler.js
//  Compile file <filename> within the ${ProjectDir}/tree-builder/save directory into ${ProjectDir}/src/out/<filename>.compiled.js
//    node compiler.js --file <filename>

//node types:
// root, text, choice, choice_text, choice_conditional, pass_fail, pass_text, fail_text, next_file, action, picture

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
		} ).sort( ( a, b ) => {
			var y1 = parseFloat( a.top );
			var y2 = parseFloat( b.top );
			if( y1 < y2 ) {
				return -1;
			} else {
				return 1;
			}
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

function _create_action_node( content, id, child_id ){
	try {
		eval( content ); //eslint-disable-line no-eval
	} catch ( e ) {
		console.log( 'COULD NOT EVAL', content, e.stack );
		return 'error' + e;
	}
	var ret =
		`// ACTION\n` +
		`scope.${id} = function(){\n` +
		`    ${content};\n` +
		`    scope.${child_id}();\n` +
		`};\n`;
	return ret;
}

function _create_text_node( content, id, child_id ){
	try {
		eval( `\`${content}\`` ); //eslint-disable-line no-eval
	} catch ( e ) {
		return 'error' + e;
	}
	if( content.length === 0 ){
		content = 'LOL THIS HAS NO CONTENT';
	}
	var ret =
		`// TEXT\n` +
		`scope.${id} = function(){\n` +
		`    player.set( 'current_in2_node', '${id}' );\n` +
		`    var text = \`${content}\`;\n` +
		`    core.say( text, scope.${child_id} );\n` +
		`};\n`;
	return ret;
}

class Compiler {
	constructor() {
		this.errors = [];
		this.files_to_verify = [];
		this.already_compiled = {};
		this.has_error = {};
		this.typeFuncs = {
			root: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, 'Root node has no child.' );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, 'Root node has multiple children.' );
					return null;
				} else {
					var child = children[ 0 ];
					var ret =
						`if( !id ){\n` +
						`    scope.${child.id}();\n` +
						`}\n` +
						`else {\n` +
						`    scope[ id ]();\n` +
						`}\n`;
					return `files[ \`${file.name}\` ] = function( id ){\n` +
						`player.set( 'current_in2_file', '${file.name}' );\n` +
						this.compileNode( child, file ) + ret +
						`};\n`;
				}
			},
			text: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Text node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, `Text node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var child = children[ 0 ];
					var ret = _create_text_node( node.content, node.id, child.id );
					if( ret.slice( 0, 5 ) === 'error' ){
						this.error( file.name, node.id, 'Text node content could not be evaluated. ' + ret.slice( 5 ) + `\n CONTENT ${node.content}` );
						return null;
					}
					return ret + '\n' + this.compileNode( child, file );
				}
			},
			choice: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Choice node ${node.id} has no children.\n CONTENT ${node.content}` );
					return null;
				}
				try {
					eval( `\`${node.content}\`` ); //eslint-disable-line no-eval
				} catch ( e ) {
					this.error( file.name, node.id, 'Choice node content could not be evaluated. ' + e + `\n CONTENT ${node.content}` );
					return null;
				}
				var ret =
					`// ${node.type}\n` +
					`scope.${node.id} = function(){\n` +
					`    player.set( 'current_in2_node', '${node.id}' );\n` +
					`    var text = \`${node.content}\`;\n` +
					`    core.choose( text, '${node.id}', [` +
					``;
				var nodes_to_compile = [];
				for ( var i in children ) {
					var condition_child = children[ i ];
					var text_child = null;
					if ( condition_child.type === 'test' || condition_child.type === 'choice_text' ) {
						text_child = condition_child;
						condition_child = null;
					} else if ( condition_child.type === 'choice_conditional' ) {
						text_child = file.getChildren( condition_child )[ 0 ];
						if ( !text_child ) {
							this.error( file.name, condition_child.id, 'Choice Condition node has no child.\n CONTENT ${condition_child.content}' );
							return null;
						}
					} else {
						this.error( file.name, condition_child.id, `Choice node ${node.id} has non-text child ${condition_child.id}.\n CONTENT ${node.content}` );
						return null;
					}
					try {
						eval( `\`${text_child.content}\`` ); //eslint-disable-line no-eval
					} catch ( e ) {
						this.error( file.name, node.id, 'Choice Text node content could not be evaluated. ' + e + `\n CONTENT ${node.content}` );
						return null;
					}
					nodes_to_compile.push( text_child );
					ret += `{\n` +
						`        text: \`${text_child.content}\`,\n` +
						`        cb: scope.${text_child.id},\n` +
						`        condition: () => { ${condition_child ? 'return ' + condition_child.content : 'return true;'} }\n` +
						`    },`;
					if ( condition_child ) {
						try {
							eval( condition_child.content ); //eslint-disable-line no-eval
						} catch ( e ) {
							this.error( file.name, condition_child.id, 'Choice Condition node could not be evaluated. ' + e + `\n CONTENT ${condition_child.content}` );
							return null;
						}
					}
				}
				ret = ret.slice( 0, -1 );
				ret += `]);\n};\n\n`;
				var is_invalid = false;
				for ( var i in nodes_to_compile ) {
					var child = nodes_to_compile[ i ];
					var r = this.compileNode( child, file );
					if ( r ) {
						ret += r;
					} else {
						is_invalid = true;
					}
				}
				if ( is_invalid ) {
					return null;
				} else {
					return ret;
				}
			},
			switch: ( node, file ) => {
				const children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Switch node ${node.id} has no children.\n CONTENT ${node.content}` );
					return null;
				}
				const nodes_to_compile = [];
				let ret = `//${node.type}\n`;
				ret += `scope.${node.id} = function(){\n`;
				for( const i in children ) {
					const child = children[ i ];
					if( child.type !== 'switch_conditional' && child.type !== 'switch_default' ) {
						this.error( file.name, node.id, `Switch node ${node.id} has invalid child.\n CONTENT ${node.content}` );
						return null;
					}
					const children2 = file.getChildren( child );
					const child2 = children2[ 0 ];
					if( !child2 ) {
						this.error( file.name, child.id, `Switch child ${child.id} has no children.\n CONTENT ${child.content}` );
						return null;
					}
					const content = child.content === 'default' ? 'true' : child.content.trim().replace( /\n/g, ' ' );
					if( content.indexOf( ';' ) > -1 ) {
						this.error( file.name, node.id, `Switch child ${child.id} has invalid conditional with ';'.\n CONTENT ${child.content}` );
						return null;
					}
					ret += `    ${Number(i)===0?'if':'else if'}(${content})\n        scope.${child2.id}();\n`;
					nodes_to_compile.push( child2 );
				}
				ret += '}';
				let is_invalid = false;
				for ( const i in nodes_to_compile ) {
					const node = nodes_to_compile[ i ];
					const r = this.compileNode( node, file );
					if ( r !== null ) {
						ret += '\n' + r;
					} else {
						is_invalid = true;
					}
				}
				if ( is_invalid ) {
					return null;
				} else {
					return ret;
				}
			},
			pass_fail: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length !== 2 ) {
					this.error( file.name, node.id, `PassFail node ${node.id} has incorrect children amount.\n CONTENT ${node.content}` );
					return null;
				}
				var ret =
					`// ${node.type}\n` +
					`scope.${node.id} = function(){\n` +
					`    player.set( 'current_in2_node', '${node.id}' );\n` +
					`    var condition = ( function(){ return ${node.content} } )();\n` +
					``;
				try {
					eval( node.content ); //eslint-disable-line no-eval
				} catch ( e ) {
					this.error( file.name, node.id, 'PassFail node content could not be evaluated. ' + e + `\n CONTENT ${node.content}` );
					return null;
				}
				for ( var i in children ) {
					var child = children[ i ];
					var children2 = file.getChildren( child );
					if ( children2.length === 0 ) {
						this.error( file.name, child.id, `PassFail node ${node.id} text child ${child.type} has no child.\n CONTENT ${node.content}` );
						return null;
					} else if ( children2.length > 1 ) {
						this.error( file.name, child.id, `PassFail node ${node.id} text child ${child.type} has multiple children.\n CONTENT ${node.content}` );
						return null;
					}
					var child2 = children2[ 0 ];
					if ( child.type === 'pass_text' ) {
						ret +=
							`    if( condition ){\n` +
							`        player.set( 'current_in2_node', '${child.id}' );\n` +
							`        var text = \`${child.content}\`;\n` +
							`        core.say( text, scope.${child2.id} );\n` +
							`    }\n`;
					} else if ( child.type === 'fail_text' ) {
						ret +=
							`    if( !condition ){\n` +
							`        player.set( 'current_in2_node', '${child.id}' );\n` +
							`        var text = \`${child.content}\`;\n` +
							`        core.say( text, scope.${child2.id} );\n` +
							`    }\n`;
					}
				}
				ret += '};';
				for ( var i in children ) {
					var children2 = file.getChildren( children[ i ] );
					var child2 = children2[ 0 ];
					ret += '\n' + this.compileNode( child2, file );
				}
				return ret;
			},
			action: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Action node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, `Action node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var child = children[ 0 ];
					var ret = _create_action_node( node.content, node.id, child.id );
					if( ret.slice( 0, 5 ) === 'error' ){
						this.error( file.name, node.id, 'Action node content could not be evaluated. ' + ret.slice( 5 ) + `\n CONTENT ${node.content}` );
						return null;
					}
					return ret + '\n' + this.compileNode( child, file );
				}
			},
			picture: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Picture node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, `Picture node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var child = children[ 0 ];
					var ret =
						`// ${node.type}\n` +
						`scope.${node.id} = function(){\n` +
						`    core.picture( \`${node.content}\` );\n` +
						`    scope.${child.id}();\n` +
						`};\n`;
					return ret + '\n' + this.compileNode( child, file );
				}
			},
			chunk: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Chunk node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, `Chunk node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var content_list = node.content.split( /\n/g );
					var is_error = false;

					var node_list = content_list.map( ( content, i ) => {
						var id = node.id + '_' + i;
						var child_id = node.id + '_' + ( i + 1 );
						var local_node;
						//console.log( 'PARSE CHUNK NODE: ' + content.slice( 0, 20 ) );
						if( content[ 0 ] === '#' || content.length === 0 ){
							//console.log( ' action' );
							local_node = _create_action_node( content.slice( 1 ), id, child_id );
						} else {
							//console.log( ' text' );
							local_node = _create_text_node( content, id, child_id );
						}

						if( local_node.slice( 0, 5 ) === 'error' ){
							console.log( 'CONTENT', content );
							this.error( file.name, node.id, `Chunk node content could not be evaluated. LINE ${i+1} ` + local_node.slice( 5 ) + `\n CONTENT ${node.content}`);
							is_error = true;
							return null;
						}
						return local_node;
					} );

					if( is_error ){
						return null;
					}

					var child = children[ 0 ];
					var first_ret =
						`// ${node.type} FIRST\n` +
						`scope.${node.id} = function(){\n` +
						`    scope.${node.id + '_0'}();\n` +
						`};\n`;
					var last_ret =
						`// ${node.type} LAST\n` +
						`scope.${node.id + '_' + ( node_list.length ) } = function(){\n` +
						`    scope.${child.id}();\n` +
						`};\n`;
					return first_ret + node_list.join( '\n' ) + last_ret + this.compileNode( child, file );
				}
			},
			trigger: ( node, file ) => {
				var children = file.getChildren( node );
				if ( children.length === 0 ) {
					this.error( file.name, node.id, `Trigger node ${node.id} has no child.\n CONTENT ${node.content}` );
					return null;
				} else if ( children.length > 1 ) {
					this.error( file.name, node.id, `Trigger node ${node.id} has multiple children.\n CONTENT ${node.content}` );
					return null;
				} else {
					var child = children[ 0 ];
					var spl = node.content.split( ',' );
					var trigger_name = spl[ 0 ];
					var trigger_val = spl[ 1 ] || 'true';
					if( typeof trigger_val === 'string' ){
						trigger_val = trigger_val.trim();
					}
					var ret = _create_action_node( `player.set( "${trigger_name}", ${trigger_val} )`, node.id, child.id );
					if( ret.slice( 0, 5 ) === 'error' ){
						this.error( file.name, node.id, 'Trigger node content could not be evaluated. ' + ret.slice( 5 ) + `\n CONTENT ${node.content}` );
						return null;
					}
					return ret + '\n' + this.compileNode( child, file );
				}
			},
			next_file: ( node ) => {
				this.files_to_verify.push( node.content );
				var ret =
					`// ${node.type}\n` +
					`scope.${node.id} = function(){\n` +
					`    var key = \`${node.content}\`;\n` +
					`    var func = files[ key ];\n` +
					`    if( func ) {\n` +
					`        func();\n` +
					`    } else {\n` +
					"        core.say( `EXECUTION WARNING, no file exists named ${key}. You are probably running a subset of all the files, and not the whole scenario. ` + Object.keys( files ), files.exit );\n" +
					`    }\n` +
					`};\n`;
				return ret;
			}
		};
		this.typeFuncs.choice_text = this.typeFuncs.text;
	}

	//header for output file (not individual compiled files)
	getHeader() {
		var ret =
			`/* eslint semi: 0 */\n` +
			`/* eslint semi-spacing: 0 */\n` +
			`/* eslint no-extra-semi: 0 */\n` +
			`'use strict';\n` +
			`var core = require( \`engine/core\` );\n` +
			`var player = require( \`engine/player\` );\n` +
			`var scene = require( \`engine/scene\` );\n` +
			`var files = {};\n` +
			`var scope = {};`;
		return ret;

	}
	//footer for entire file (not individual compiled files)
	getFooter( main_file_name ) {
		var ret =
			`files.exit = function(){\n` +
			`    core.exit()\n` +
			`};\n` +
			`files[ \`${main_file_name}\` ]();\n`;
		return ret;
	}

	error( filename, node_id, text ) {
		this.has_error[ filename ] = true;
		this.errors.push( filename + '|' + node_id + '|' + text );
	}

	hasError( filename ) {
		return this.has_error[ filename ];
	}

	readAndCompile( filename, cb ) {
		fs.readFile( filename, ( err, data ) => {
			if ( err ) {
				this.error( filename, null, 'Cannot read file. \n\n' + err );
				return cb( this.errors );
			} else {
				var json = null;
				try {
					json = JSON.parse( data.toString() );
				} catch ( e ) {
					this.error( filename, null, 'Cannot parse json in file. \n\n' + e );
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
			this.error( file.name, null, 'File has no root!' );
			return null;
		}
		return this.compileNode( root, file );
	}

	compileNode( node, file ) {
		if ( this.already_compiled[ node.id ] ) {
			return '';
		}
		if ( this.typeFuncs[ node.type ] ) {
			this.already_compiled[ node.id ] = true;
			return this.typeFuncs[ node.type ]( node, file );
		} else {
			this.error( file.name, node.id, `Node ${node.id} has an invalid type: ${node.type}. \n\n CONTENT: ${node.content}` );
			return null;
		}
	}
}

var output_result = function ( result, output_url ) {
	fs.writeFile( __dirname + output_url, result, ( err ) => {
		if ( err ) {
			console.error( 'Error writing output ' + output_url, err );
		} else {
			console.log( 'Output written: ' + output_url );
		}
	} );
};

var output_errors = function ( errors ) {
	console.log( '-------------' );
	errors.forEach( ( err, i ) => {
		console.log( ' ' + err );
		if ( i !== errors.length - 1 ) {
			console.log();
		}
	} );
	console.log( '-------------' );
	console.log();
};

//the first file listed in "input_files" will be the entrypoint for the program
var compile = function ( input_files, output_url ) {
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
			if ( file ) {
				if ( i === 0 ) {
					main_file_name = file.name;
				}
				if ( result && !c.hasError( file.name ) ) {
					aggregated_result += '\n\n' + result;
				} else {
					failed_files.push( file.name );
				}
			}
			if ( num_started === num_finished ) {
				if ( c.errors.length ) {
					output_errors( c.errors );
					console.log( `Failed. Could not compile ${failed_files.length} of ${input_files.length} files:` );
					for ( var j in failed_files ) {
						console.log( ' ' + failed_files[ j ] );
					}
				}
				aggregated_result = aggregated_result + c.getFooter( main_file_name );
				console.log();
				output_result( aggregated_result, output_url );
			}
		} );
	} );
};

var argv = require( 'minimist' )( process.argv.slice( 2 ) );

if ( argv.file ) {
	console.log( 'Compiling ' + argv.file + '...' );
	compile( [ __dirname + '/../tree-builder/save/' + argv.file ], '/out/' + argv.file + '.compiled.js' );
} else if ( argv.files ) {
	console.log( 'Compiling ' + argv.files + '...' );
	var filelist = argv.files.split( ',' ).map( ( filename ) => {
		return __dirname + '/../tree-builder/save/' + filename;
	} );
	compile( filelist, '/main.compiled.js' );
} else {
	fs.readdir( __dirname + '/../tree-builder/save', ( err, dirs ) => {
		dirs = dirs.filter( ( dir ) => {
			if( dir === 'DONT_DELETE' || dir.indexOf( 'loader.js' ) > -1 ) {
				return false;
			}
			if( fs.statSync(__dirname + '/../save/' + dir).isDirectory() ) {
				return false;
			}
			return true;
		} ).sort( ( a, b ) => {
			if ( a === 'main.json' ) {
				return -1;
			} else if ( b === 'main.json' ) {
				return 1;
			} else {
				return a > b ? -1 : 1;
			}
		} ).map( ( dir ) => {
			return __dirname + '/../tree-builder/save/' + dir;
		} );
		console.log( 'Compiling...' );
		for ( var i in dirs ) {
			console.log( ' ' + dirs[ i ] );
		}
		console.log();
		compile( dirs, '/main.compiled.js' );
	} );
}
