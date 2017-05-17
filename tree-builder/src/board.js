'use strict';

var React = require( 'react' );
var css = require( 'css' );
var utils = require( 'utils' );
var context = require( 'context' );
var dialog = require( 'dialog' );
var jsPlumb = window.jsPlumb;

window.on_node_click = function( elem ) {
	console.log( 'Click Event Not Overwritten!', elem );
};

window.on_node_unclick = function( elem ) {
	console.log( 'Unclick Event Not Overwritten!', elem );
};

window.on_node_dblclick = function( elem ) {
	console.log( 'DBLClick Event Not Overwritten!', elem );
};

window.on_node_rclick = function( elem ) {
	console.log( 'RClick Event Not Overwritten!', elem );
};

window.on_delete_click = function( elem ) {
	console.log( 'DeleteClick Event Not Overwritten!', elem );
};

module.exports = class Board extends React.Component {
	constructor( props ) {
		super( props );

		this.plumb = null;
		this.file = props.file;
		this.panning = false;
		this.offset_x = 0;
		this.offset_y = 0;
		this.last_mouse_x = 0;
		this.last_mouse_y = 0;
		this.last_offset_x = 0;
		this.last_offset_y = 0;
		this.link_node = null;
		this.drag_set = [];
		this.zoom = 1;

		this.state = {
			html: ''
		};

		this.onKeydown = ( ev ) => {
			if( this.link_node && ev.keyCode === 27 ){
				this.exitLinkMode();
			} else if( this.drag_set.length && ev.keyCode === 27 ){
				this.drag_set = [];
				this.plumb.clearDragSelection();
			}
		};

		this.onClick = () => {
		};

		this.onMouseMove = ( ev ) => {
			if ( this.panning ) {
				this.offset_x = this.last_offset_x - ( this.last_mouse_x - ev.clientX );
				this.offset_y = this.last_offset_y - ( this.last_mouse_y - ev.clientY );
				this.renderAtOffset();
			}
		};

		this.onMouseUp = () => {
			this.panning = false;
		};

		this.onScroll = ( ev ) => {
			if( ev.deltaY > 0 ){ //scroll down
				this.zoom += 0.3;
			} else {
				this.zoom -= 0.3;
			}
			if( this.zoom > 4 ){
				this.zoom = 4;
			} else if( this.zoom < 1 ) {
				this.zoom = 1;
			}
			this.renderAtOffset();
		};

		this.onNodeClick = window.on_node_click = ( elem ) => {
			var file_node = this.getNode( elem.id );
			if( this.link_node ){
				var err = this.addLink( this.link_node, file_node );
				if( err ){
					console.error( 'Error', 'Cannot create link', err );
					dialog.show_notification( 'Cannot create link. ' + err );
				}
				this.exitLinkMode();
			} else if( utils.is_shift() || utils.is_ctrl() ){
				var ind = this.drag_set.indexOf( file_node.id );
				if( ind === -1 ){
					this.plumb.addToDragSelection( file_node.id );
					this.drag_set.push( file_node.id );
				} else {
					this.plumb.removeFromDragSelection( file_node.id );
					this.drag_set.splice( ind, 1 );
				}

			}
		};

		this.onNodeUnclick = window.on_node_unclick = ( elem ) => {
			var file_node = this.getNode( elem.id );
			file_node.left = elem.style.left;
			file_node.top = elem.style.top;
			this.file.nodes.forEach( ( node_file ) => {
				var node = document.getElementById( node_file.id );
				node_file.left = node.style.left;
				node_file.top = node.style.top;
			} );
			this.saveFile();
		};

		this.onNodeDblClick = window.on_node_dblclick = ( elem ) => {
			var file_node = this.getNode( elem.id );
			dialog.show_input( file_node, ( content ) => {
				file_node.content = content;
				this.buildDiagram();
				this.saveFile();
			} );
		};

		this.onNodeRClick = window.on_node_rclick = ( elem ) => {
			this.disable_context = true;
			var { x, y } = utils.get_mouse_pos();
			context.show( x, y, this.getNode( elem.id ), this.file, {
				linkNode: function( parent ){
					this.enterLinkMode( parent );
				}.bind( this ),
				createTextNode: function( parent ) {
					if ( parent.type === 'text' && this.nodeHasChild( parent ) ) {
						console.error( 'cannot create text node from parent with child already' );
						return;
					}
					this.addNode( parent, 'text' );
				}.bind( this ),
				createChoiceNode: function( parent ) {
					if ( parent.type === 'text' && this.nodeHasChild( parent ) ) {
						console.error( 'cannot create choice node from parent with child already' );
						return;
					}
					this.addNode( parent, 'choice' );
				}.bind( this ),
				createPassFailNode: function( parent ) {
					console.log( 'Create PassFail node', parent );
				}.bind( this )
			} );
		};

		this.onConnRClick = ( params, ev ) => {
			var from = params.sourceId.split( '_' )[ 0 ];
			var to = params.targetId.split( '_' )[ 0 ];
			var ind = this.getLinkIndex( from, to );
			if ( ind > -1 ) {
				dialog.show_confirm( 'Are you sure you wish to delete this link?', () => {
					this.file.links.splice( ind, 1 );
					this.buildDiagram();
				} );
			} else {
				console.error( 'ERROR', 'no link exists that you just clicked on', from, to, this.file.links );
			}
			ev.preventDefault();
		};

		this.onDeleteClick = window.on_delete_click = ( elem ) => {
			dialog.show_confirm( 'Are you sure you wish to delete this node?', () => {
				this.deleteNode( this.getNode( elem.id ) );
			} );
		};

		document.oncontextmenu = () => {
			if ( this.disable_context ) {
				this.disable_context = false;
				return false;
			} else {
				return true;
			}
		};
	}

	componentWillReceiveProps( props ) {
		this.file = props.file;
	}

	componentDidMount() {
		jsPlumb.ready( () => {
			this.plumb = jsPlumb.getInstance( {
				PaintStyle: { strokeWidth: 1 },
				Anchors: [ [ 'TopRight' ] ],
				Container: document.getElementById( 'diagram' ),
			} );

			this.buildDiagram();
			this.renderAtOffset();
		} );
		window.addEventListener( 'mousemove', this.onMouseMove );
		window.addEventListener( 'mouseup', this.onMouseUp );
		window.addEventListener( 'keydown', this.onKeydown );
		window.addEventListener( 'click', this.onClick );
		window.addEventListener( 'wheel', this.onScroll );
	}
	componentWillUnmount() {
		window.removeEventListener( 'mousemove', this.onMouseMove );
		window.removeEventListener( 'mouseup', this.onMouseUp );
		window.removeEventListener( 'keydown', this.onKeydown );
		window.removeEventListener( 'click', this.onClick );
		window.removeEventListener( 'wheel', this.onScroll );
		this.exitLinkMode();
	}
	componentDidUpdate() {
		this.buildDiagram();
		this.renderAtOffset();
	}
	renderAtOffset() {
		var offset = `translate( ${this.offset_x}px, ${this.offset_y}px ) scale( ${1/this.zoom}, ${1/this.zoom} )`;
		document.getElementById( 'diagram' ).style.transform = offset;
	}

	saveFile() {
		var file = this.file;
		if ( file !== null ) {
			utils.post( '/file/' + file.name, file, () => {
				console.log( 'Succesfully saved.' );
			} );
		}
	}

	buildDiagram() {
		var file = this.file;
		if ( file ) {
			var html = file.nodes.reduce( ( prev, curr ) => {
				return prev + this.getNodeHTML( curr );
			}, '' );
			document.getElementById( 'diagram' ).innerHTML = html;
			this.plumb.draggable( file.nodes.map( ( node ) => {
				return node.id;
			} ), {
				containment: true
			} );
			file.links.forEach( ( link ) => {
				var connection = this.plumb.connect( {
					source: link.from + '_from',
					target: link.to + '_to',
					paintStyle: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 8 },
					endpointStyle: {
						fill: css.colors.PRIMARY,
						outlineStroke: css.colors.TEXT_LIGHT,
						outlineWidth: 5
					},
					connector: [ 'Flowchart',
						{
							midpoint: 0.6,
							curviness: 30,
							cornerRadius: 3,
							stub: 0,
							alwaysRespectStubs: true
						}
					],
					endpoint: [ 'Dot', { radius: 7 } ],
					overlays: [ [ 'Arrow', { location: 0.6, width: 20, length: 20 } ] ],
				} );
				connection.bind( 'contextmenu', this.onConnRClick );
			} );
		}
	}

	enterLinkMode( parent ){
		console.log( 'ENTER LINK MODE' );
		setTimeout( () => {
			this.link_node = parent;
			document.getElementById( 'diagram-area' ).className = 'no-drag linking';
		}, 150 );
	}
	exitLinkMode(){
		console.log( 'EXIT LINK MODE' );
		this.link_node = false;
		document.getElementById( 'diagram-area' ).className = 'no-drag movable';
	}

	getNode( id ) {
		if ( this.file ) {
			for ( var i in this.file.nodes ) {
				if ( this.file.nodes[ i ].id === id ) {
					return this.file.nodes[ i ];
				}
			}
			return null;
		} else {
			return null;
		}
	}

	getLinkIndex( from_id, to_id ) {
		if ( this.file ) {
			for ( var i in this.file.links ) {
				if ( this.file.links[ i ].from === from_id && this.file.links[ i ].to === to_id ) {
					return i;
				}
			}
			return -1;
		} else {
			return -1;
		}
	}

	nodeHasChild( node ) {
		if ( this.file ) {
			for ( var i in this.file.links ) {
				if ( this.file.links[ i ].from === node.id ) {
					return true;
				}
			}
			return false;
		} else {
			false;
		}
	}

	addLink( from, to ){
		var link = this.getLinkIndex( from.id, to.id );
		if( link !== -1 ){
			return 'That specific link already exists.';
		}

		if( from.type === 'text' && this.nodeHasChild( from ) ){
			return 'That text node already has a child.';
		}

		this.file.links.push( {
			from: from.id,
			to: to.id
		} );
		this.saveFile();
		this.buildDiagram();
	}

	addNode( parent, type ) {
		var id = utils.random_id( 10 );
		this.file.nodes.push( {
			id: id,
			type: type,
			content: 'This node currently has no actual content.',
			left: parent.left,
			top: parseInt( parent.top ) + 200 + 'px'
		} );
		this.file.links.push( {
			to: id,
			from: parent.id
		} );
		this.saveFile();
		this.buildDiagram();
	}

	deleteNode( node ){
		for( var i in this.file.nodes ){
			if( node === this.file.nodes[ i ] ){
				this.file.nodes.splice( i, 1 );
				break;
			}
		}

		this.file.links = this.file.links.filter( ( link ) => {
			if( link.to === node.id || link.from === node.id ){
				return false;
			} else {
				return true;
			}
		} );

		this.buildDiagram();
	}

	getNodeHTML( node ) {
		var style = {
			left: node.left || null,
			top: node.top || null,
			width: node.width || null,
			height: node.height || null
		};
		var style_str = '';
		for ( var i in style ) {
			if ( style[ i ] ) {
				style_str += `${i}:${style[i]}; `;
			}
		}
		var className = '';
		if ( node.type === 'choice' || node.type === 'choice_conditional' ) {
			className = 'item-choice';
		} else if ( node.type === 'root' ) {
			className = 'item-root';
		} else {
			className = 'item-text';
		}
		return `<div class="${className}" ` +
			`style="${style_str}" id="${node.id}" ` +
			`onmousedown="on_node_click(${node.id})" ` +
			`onmouseup="on_node_unclick(${node.id})" ` +
			`ondblclick="on_node_dblclick(${node.id})" ` +
			`oncontextmenu="on_node_rclick(${node.id})" ` +
			`>` +
			`<div class="item-content"><span class="no-select">${node.content}</span></div>` +
			`<div class="anchor-to" id="${node.id}_to"></div>` +
			`<div class="anchor-from" id="${node.id}_from"></div>` +
			( node.type === 'root' ? '' : `<div onclick="on_delete_click(${node.id})" class="item-delete" id="${node.id}_delete"><span class="no-select">X</span></div>` ) +
			`</div>`;
	}

	render() {
		return React.DOM.div( {
				id: 'diagram-area',
				className: 'no-drag movable',
				onMouseDown: ( ev ) => {
					this.panning = true;
					this.last_mouse_x = ev.pageX;
					this.last_mouse_y = ev.pageY;
					this.last_offset_x = this.offset_x;
					this.last_offset_y = this.offset_y;
					ev.preventDefault();
				},
				onDragStart: ( ev ) => {
					ev.preventDefault();
					return false;
				},
				onDrop: ( ev ) => {
					ev.preventDefault();
					return false;
				},
				style: {
					position: 'relative',
					width: '2400px',
					height: '2400px'
				}
			},
			React.DOM.div( {
				id: 'diagram',
				className: 'no-drag',
				style: {
					width: '100%',
					height: '100%',
					backgroundColor: css.colors.BG
				}
			} )
		);
	}
};
