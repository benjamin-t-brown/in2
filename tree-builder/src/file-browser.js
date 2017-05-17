'use strict';

var React = require( 'react' );
var css = require( 'css' );
var utils = require( 'utils' );
var expose = require( 'expose' );
var dialog = require( 'dialog' );

module.exports = class FileBrowser extends React.Component {
	constructor( props ){
		super( props );
		this.state = {
			file_list: []
		};

		this.onFileClick = function( filename ){
			this.loadFile( filename );
		}.bind( this );

		this.onCreateClick = () => {
			dialog.show_input( null, ( name ) => {
				var err = this.createFile( name );
				if( err ){
					console.error( err );
					dialog.show_notification( err );
				}
			} );
		};

		this.onDeleteClick = function( filename ){
			dialog.show_confirm( 'Are you sure you want to delete "' + filename + '"?', () => {
				this.deleteFile( filename );
			} );
		}.bind( this );
	}

	componentDidMount() {
		this.refreshFileList( () => {
			this.loadFile( 'default.json' );
		} );
	}

	refreshFileList( cb ) {
		utils.get( '/file', ( resp ) => {
			this.setState( {
				file_list: resp.data
			} );
			if( cb ){
				cb();
			}
		} );
	}
	loadFile( name ) {
		console.log( 'LOAD FILE', name );
		utils.get( '/file/' + name, ( resp ) => {
			expose.set_state( 'main', {
				current_file: resp.data
			} );
		} );
	}
	createFile( name ) {
		if( name.length < 2 ){
			return 'That name is too short';
		}
		if( name.slice( -5 ) !== '.json' ) {
			name = name + '.json';
		}
		if( this.state.file_list.indexOf( name ) !== -1 ){
			return 'A file with that name already exists.';
		}
		var file = {
			name: name,
			nodes: [ {
				id: utils.random_id( 10 ),
				type: 'root',
				content: 'Root',
				top: '20px',
				left: '20px'
			} ],
			links: []
		};
		utils.post( '/file/' + file.name, file, () => {
			this.refreshFileList( () => {
				this.loadFile( name );
			} );
		} );
	}
	deleteFile( name ){
		if( name === 'default.json' ){
			return;
		}
		utils.del( '/file/' + name, () => {
			this.refreshFileList( () => {
				if( name === this.props.current_file_name ){
					expose.setState( 'main', {
						current_file: null
					} );
				}
			} );
		} );
	}

	render(){
		var elems = this.state.file_list.map( ( filename ) => {
			return React.DOM.div( {
				key: filename,
				style: {
					display: 'flex',
					justifyContent: 'space-between'
				}
			},
				React.DOM.div( {
					className: 'file',
					onClick: this.onFileClick.bind( this, filename ),
					style: {
						backgroundColor: this.props.current_file_name === filename ? css.colors.SECONDARY : null,
						width: '88%',
						padding: '5px',
						cursor: 'pointer',
						color: css.colors.TEXT_LIGHT
					}
				},
					React.DOM.span( {
						className: 'no-select'
					}, filename )
				),
				React.DOM.span( {
					onClick: this.onDeleteClick.bind( this, filename ),
					className: 'file-delete',
				}, React.DOM.span( { className: 'no-select' }, 'X' ) )
			);
		} );

		if( !elems.length ){
			elems = React.DOM.div( {
				style: {
					padding: '10px',
					color: css.colors.TEXT_NEUTRAL
				}
			}, '(No Files)' );
		}

		return React.DOM.div( {
			style: {
				backgroundColor: css.colors.BG_NEUTRAL,
				width: '100%',
				height: '100%'
			}
		}, React.DOM.div( {
				style: {
					height: '36px',
					display: 'flex',
					justifyContent: 'space-around'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.onCreateClick
				}, 'Create File' )
			),
			React.DOM.div( {

			}, elems )
		);
	}
};
