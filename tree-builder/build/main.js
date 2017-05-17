(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\board.js":[function(require,module,exports){
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

},{"context":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\context.js","css":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js","dialog":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\dialog.js","react":"react","utils":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\utils.js"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\context.js":[function(require,module,exports){
'use strict';

var React = require( 'react' );
var ReactDOM = require( 'react-dom' );
var expose = require( './expose' );
var css = require( './css' );

class Context extends expose.Component {
	constructor( props ){
		super( props );
		this.expose( 'context' );
	}

	renderItem( name, cb ){
		return React.DOM.div( {
				key: name,
				onClick: cb,
				className: 'context-button',
				style: {
					padding: '5px'
				}
			}, React.DOM.span( {
				className: 'no-select'
			}, name )
		);
	}

	render() {
		if( !this.props.visible ){
			return React.DOM.div();
		}

		var elems = [];

		elems.push(
			this.renderItem( 'Link Node', this.props.linkNode.bind( null, this.props.node ) ),
			this.renderItem( 'New Text Node', this.props.createTextNode.bind( null, this.props.node ) ),
			this.renderItem( 'New Choice Node', this.props.createChoiceNode.bind( null, this.props.node ) ),
			this.renderItem( 'New PassFail Node', this.props.createPassFailNode.bind( null, this.props.node ) )
		);

		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '140px',
				padding: '5px',
				top: this.props.style.top,
				left: this.props.style.left,
				backgroundColor: css.colors.TEXT_LIGHT,
				border: '2px solid ' + css.colors.FG_NEUTRAL
			}
		}, elems );
	}
}

window.addEventListener( 'click', () => {
	exports.hide();
} );

exports.show = function( x, y, node, file, cbs ){
	ReactDOM.render(
		React.createElement( Context, {
			visible: true,
			node: node,
			file: file,
			linkNode: cbs.linkNode,
			createTextNode: cbs.createTextNode,
			createChoiceNode: cbs.createChoiceNode,
			createPassFailNode: cbs.createPassFailNode,
			style: {
				top: y,
				left: x
			}
		} ),
		document.getElementById( 'context' )
	);
};

exports.hide = function(){
	ReactDOM.render(
		React.createElement( Context, {
			visible: false
		} ),
		document.getElementById( 'context' )
	);
};

},{"./css":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js","./expose":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\expose.js","react":"react","react-dom":"react-dom"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js":[function(require,module,exports){
'use strict';

module.exports = {
	font: {
		main: 'Lucida Sans',
		bubble: 'Courier New'
	},
	colors: {
		PRIMARY: '#4A4A4A',
		PRIMARY_ALT: '#555555',
		SECONDARY: '#3344AA',
		SECONDARY_ALT: '#4455BB',
		TEXT_LIGHT: '#DEDEDE',
		TEXT_NEUTRAL: '#A5A5A5',
		TEXT_DARK: '#222222',
		BG: '#111111',
		FG: '#333333',
		BG_NEUTRAL: '#555555',
		FG_NEUTRAL: '#777777'
	}
};

},{}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\dialog.js":[function(require,module,exports){
'use strict';

var React = require( 'react' );
var ReactDOM = require( 'react-dom' );
var css = require( './css' );

var current_confirm = null;
var current_cancel = null;

class ConfirmDialog extends React.Component {
	constructor( props ){
		super( props );

		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm();
		};

		this.handleCancelClick = current_cancel = () => {
			exports.hide();
			this.props.on_cancel();
		};
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '300px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, this.props.text ),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Yes' ) ),
				React.DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'No' ) )
			)
		);
	}
}

class InputDialog extends React.Component {
	constructor( props ){
		super( props );

		this.state = {
			value: this.props.node ? this.props.node.content : ''
		};

		this.handleInputChange = ( ev ) => {
			this.setState( {
				value: ev.target.value
			} );
		};
		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm( this.state.value );
		};

		this.handleCancelClick = current_cancel = () => {
			exports.hide();
		};
	}

	componentDidMount(){
		document.getElementById( 'InputDialog-input' ).focus();
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '400px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, 'Provide Input' ),
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			},
				React.DOM.textarea( {
					id: 'InputDialog-input',
					onChange: this.handleInputChange,
					value: this.state.value,
					style: {
						backgroundColor: css.colors.BG,
						color: css.colors.TEXT_LIGHT,
						width: '100%',
						height: this.props.node ? '200px' : '20px'
					}
				} )
			),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Okay' ) ),
				React.DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Cancel' ) )
			)
		);
	}
}

class NotificationDialog extends React.Component {
	constructor( props ){
		super( props );

		this.handleConfirmClick = current_confirm = () => {
			exports.hide();
			this.props.on_confirm();
		};
		current_cancel = current_confirm;
	}

	render() {
		return React.DOM.div( {
			style: {
				position: 'absolute',
				width: '300px',
				padding: '5px',
				top: '300px',
				left: ( window.innerWidth / 2 - 140 ) + 'px',
				backgroundColor: css.colors.SECONDARY,
				border: '4px solid ' + css.colors.SECONDARY_ALT,
				color: css.colors.TEXT_LIGHT
			}
		},
			React.DOM.div( {
				style: {
					padding: '5px'
				}
			}, this.props.text ),
			React.DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				React.DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, React.DOM.span( {
					className: 'no-select'
				}, 'Okay' ) )
			)
		);
	}
}

var on_key_down = function(	ev ){
	if( ev.keyCode === 13 ) { //enter
		current_confirm();
	} else if( ev.keyCode === 27 ){ //esc
		current_cancel();
	}
};

exports.show_confirm = function( text, on_confirm, on_cancel ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( ConfirmDialog, {
			text: text,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.show_input = function( node, on_confirm, on_cancel ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( InputDialog, {
			node: node,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.show_notification = function( text, on_confirm ){
	window.addEventListener( 'keydown', on_key_down );
	ReactDOM.render(
		React.createElement( NotificationDialog, {
			text: text,
			on_confirm: on_confirm || function(){}
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.hide = function(){
	window.removeEventListener( 'keydown', on_key_down );
	ReactDOM.unmountComponentAtNode( document.getElementById( 'dialog' ) );
};

},{"./css":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js","react":"react","react-dom":"react-dom"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\expose.js":[function(require,module,exports){
'use strict';

var React = require( 'react' );

module.exports.mixin = function( id ) {
	return {
		componentWillMount: function() {
			if( id ) {
				module.exports.states[ id ] = {
					setState: function( state ) {
						this.setState( state );
					}.bind( this ),
					getState: function() {
						return this.state;
					}.bind( this )
				};
			} else {
				console.error( 'Exposed states must have a valid id.', this.props, this.state );
			}
		},
		componentWillUnmount: function() {
			if( id ) {
				delete module.exports.states[ id ];
			}
		}
	};
};

module.exports.Component = class ExposeComponent extends React.Component {
	constructor( props ){
		super( props );
		this._expose_id = null;
	}

	expose( id ){
		this._expose_id = id;
		if( module.exports.states[ this._expose_id ] ){
			console.error( 'Error, expose component exposed an id that already exists', this.expose_id, this.props );
		}
	}

	componentWillMount(){
		if( this._expose_id ) {
			module.exports.states[ this._expose_id ] = {
				setState: ( state ) => {
					this.setState( state );
				},
				getState: () => {
					return this.state;
				}
			};
		} else {
			console.error( 'Exposed states must have a valid id. Set it with "this.expose( {id} )"', this.props, this.state );
		}
	}

	componentWillUnmount() {
		if( this._expose_id ) {
			delete module.exports.states[ this._expose_id ];
		}
	}
};

module.exports.states = {};
module.exports.set_state = function( id, state ) {
	if( module.exports.states[ id ] ) {
		module.exports.states[ id ].setState( state );
	}
};
module.exports.get_state = function( id ){
	if( module.exports.states[ id ] ) {
		return module.exports.states[ id ].getState();
	} else {
		return {};
	}
};
module.exports.set_tab = function( tab ){
	module.exports.set_state( 'main', {
		className: 'fade-out-class'
	} );
	setTimeout( () => {
		module.exports.set_state( 'main', {
			className: 'fade-in-class',
			tab: tab
		} );
	}, 70 );
};

},{"react":"react"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\file-browser.js":[function(require,module,exports){
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

},{"css":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js","dialog":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\dialog.js","expose":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\expose.js","react":"react","utils":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\utils.js"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\index.js":[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./main-container":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\main-container.js","react":"react","react-dom":"react-dom"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\main-container.js":[function(require,module,exports){
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

},{"./board":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\board.js","./expose":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\expose.js","./file-browser":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\file-browser.js","css":"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\css\\index.js","react":"react"}],"D:\\Dropbox\\progs\\in2\\tree-builder\\src\\utils.js":[function(require,module,exports){
'use strict';

var mouse_x = 0;
var mouse_y = 0;
var shift = false;
var ctrl = false;

window.addEventListener( 'mousemove', ( ev ) => {
	mouse_x = ev.clientX;
	mouse_y = ev.clientY;
} );

window.addEventListener( 'keydown', ( ev ) => {
	if( ev.keyCode === 17 ) {
		ctrl = true;
	} else if( ev.keyCode === 16 ){
		shift = true;
	}
} );

window.addEventListener( 'keyup', ( ev ) => {
	if( ev.keyCode === 17 ) {
		ctrl = false;
	} else if( ev.keyCode === 16 ){
		shift = false;
	}
} );

module.exports = {
	getCurrentTime: function() {
		return +( new Date() );
	},
	random_id: function( len ) {
		var text = '';
		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghigklmnopqrstufwxyz';
		for( var i = 0; i < len; i++ ) {
			text += possible.charAt( Math.floor( Math.random() * possible.length ) );
		}
		return text;
	},
	normalize: function( x, A, B, C, D ) {
		return C + ( x - A ) * ( D - C ) / ( B - A );
	},
	get_random_value_from_array: function( arr ){
		var ind = Math.floor( module.exports.normalize( Math.random(), 0, 1, 0, arr.length ) );
		return arr[ ind ];
	},
	inArr: function( x, arr ) {
		for( var i in arr ) {
			if( x == arr[ i ] ) { //eslint-disable-line eqeqeq
				return true;
			}
		}
		return false;
	},
	in_rectangle: function( x, y, rx, ry, rw, rh ) {
		return ( x >= rx && x <= rx + rw ) && ( y >= ry && ry <= rx + rh );
	},
	to_ratio: function( useconds ) {
		return useconds / 1000000;
	},
	to_micro_seconds: function( ms ) {
		return Math.round( ms * 1000 );
	},
	to_radians: function( degrees ) {
		return ( degrees / 180.0 ) * Math.PI;
	},
	to_degrees: function( radians ) {
		return ( radians * 180.0 ) / Math.PI;
	},
	hex_to_array: function( hex ) {
		return [
			hex.substring( 1, 3 ),
			hex.substring( 3, 5 ),
			hex.substring( 5, 7 ),
			hex.substring( 7, 9 )
		].map( function( _color, i ) {
			var color = parseInt( _color, 16 );
			if( i === 3 ) {
				color = isNaN( color ) ? 1 : ( color / 255 );
			}
			return color;
		} );
	},
	hex_to_RGBA: function( hex ) {
		var arr = this.hex_to_array( hex );
		return 'rgba(' + arr.join( ',' ) + ')';
	},
	array_to_hex: function( arr ) {
		if( !Array.instanceOf( arr ) ) {
			return undefined;
		}
		var _convert = function( c, i ) {
			if( i === 3 ) {
				c = Math.round( c * 255 );
			}
			var hex = Number( c ).toString( 16 );
			return hex.length < 2 ? '0' + hex : hex;
		};
		return '#' + arr.map( _convert ).join( '' );
	},
	rgb_to_hex: function( rgb, g, b ) {
		var _digit = function( d ) {
			d = parseInt( d ).toString( 16 );
			while( d.length < 2 ) {
				d = '0' + d;
			}
			return d;
		};
		if( arguments.length === 1 ) {
			var m = rgb.match( /rgba\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/ );
			if( !m ) {
				console.log( 'Unparsable color:', rgb );
			} else {
				return '#' + m.slice( 1, 4 ).map( _digit ).join( '' );
			}
		} else if( arguments.length === 3 ) {
			return '#' + _digit( rgb ) + _digit( g ) + _digit( b );
		} else {
			return '#000000';
		}
	},
	get_mouse_pos(){
		return {
			x: mouse_x,
			y: mouse_y
		};
	},
	is_shift(){
		return shift;
	},
	is_ctrl(){
		return ctrl;
	},
	get: function( url, cb ) {
		var opts = {
			method: 'GET',
			headers: {}
		};
		var initial_time = +( new Date() );
		fetch( url, opts ).then( function( response ){
			response.json().then( function( d ){
				if( d.err ){
					console.error( 'Internal Server Error', d.err, url );
				} else {
					cb( d, +( new Date() ) - initial_time );
				}
			} );
		} ).catch( ( err ) => {
			console.error( 'Fetch GET Error', err, url );
		} );
	},
	del: function( url, cb ) {
		var opts = {
			method: 'DELETE',
			headers: {}
		};
		var initial_time = +( new Date() );
		fetch( url, opts ).then( function( response ){
			response.json().then( function( d ){
				if( d.err ){
					console.error( 'Internal Server Error', d.err, url );
				} else {
					cb( d, +( new Date() ) - initial_time );
				}
			} );
		} ).catch( ( err ) => {
			console.error( 'Fetch DEL Error', err, url );
		} );
	},
	post: function( url, data, cb ) {
		var opts = {
			method: 'POST',
			body: JSON.stringify( data ),
			headers: {}
		};
		var initial_time = +( new Date() );
		fetch( url, opts ).then( function( response ){
			response.json().then( function( d ){
				if( d.err ){
					console.error( 'Internal Server Error', d.err, url );
				} else {
					cb( d, +( new Date() ) - initial_time );
				}
			} );
		} ).catch( ( err ) => {
			console.error( 'Fetch POST Error', err, url );
		} );
	}
};

window.utils = module.exports;

},{}]},{},["D:\\Dropbox\\progs\\in2\\tree-builder\\src\\index.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9hcmQuanMiLCJzcmMvY29udGV4dC5qcyIsInNyYy9jc3MvaW5kZXguanMiLCJzcmMvZGlhbG9nLmpzIiwic3JjL2V4cG9zZS5qcyIsInNyYy9maWxlLWJyb3dzZXIuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFpbi1jb250YWluZXIuanMiLCJzcmMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoICdyZWFjdCcgKTtcbnZhciBjc3MgPSByZXF1aXJlKCAnY3NzJyApO1xudmFyIHV0aWxzID0gcmVxdWlyZSggJ3V0aWxzJyApO1xudmFyIGNvbnRleHQgPSByZXF1aXJlKCAnY29udGV4dCcgKTtcbnZhciBkaWFsb2cgPSByZXF1aXJlKCAnZGlhbG9nJyApO1xudmFyIGpzUGx1bWIgPSB3aW5kb3cuanNQbHVtYjtcblxud2luZG93Lm9uX25vZGVfY2xpY2sgPSBmdW5jdGlvbiggZWxlbSApIHtcblx0Y29uc29sZS5sb2coICdDbGljayBFdmVudCBOb3QgT3ZlcndyaXR0ZW4hJywgZWxlbSApO1xufTtcblxud2luZG93Lm9uX25vZGVfdW5jbGljayA9IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRjb25zb2xlLmxvZyggJ1VuY2xpY2sgRXZlbnQgTm90IE92ZXJ3cml0dGVuIScsIGVsZW0gKTtcbn07XG5cbndpbmRvdy5vbl9ub2RlX2RibGNsaWNrID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdGNvbnNvbGUubG9nKCAnREJMQ2xpY2sgRXZlbnQgTm90IE92ZXJ3cml0dGVuIScsIGVsZW0gKTtcbn07XG5cbndpbmRvdy5vbl9ub2RlX3JjbGljayA9IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRjb25zb2xlLmxvZyggJ1JDbGljayBFdmVudCBOb3QgT3ZlcndyaXR0ZW4hJywgZWxlbSApO1xufTtcblxud2luZG93Lm9uX2RlbGV0ZV9jbGljayA9IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRjb25zb2xlLmxvZyggJ0RlbGV0ZUNsaWNrIEV2ZW50IE5vdCBPdmVyd3JpdHRlbiEnLCBlbGVtICk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEJvYXJkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoIHByb3BzICkge1xuXHRcdHN1cGVyKCBwcm9wcyApO1xuXG5cdFx0dGhpcy5wbHVtYiA9IG51bGw7XG5cdFx0dGhpcy5maWxlID0gcHJvcHMuZmlsZTtcblx0XHR0aGlzLnBhbm5pbmcgPSBmYWxzZTtcblx0XHR0aGlzLm9mZnNldF94ID0gMDtcblx0XHR0aGlzLm9mZnNldF95ID0gMDtcblx0XHR0aGlzLmxhc3RfbW91c2VfeCA9IDA7XG5cdFx0dGhpcy5sYXN0X21vdXNlX3kgPSAwO1xuXHRcdHRoaXMubGFzdF9vZmZzZXRfeCA9IDA7XG5cdFx0dGhpcy5sYXN0X29mZnNldF95ID0gMDtcblx0XHR0aGlzLmxpbmtfbm9kZSA9IG51bGw7XG5cdFx0dGhpcy5kcmFnX3NldCA9IFtdO1xuXHRcdHRoaXMuem9vbSA9IDE7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0aHRtbDogJydcblx0XHR9O1xuXG5cdFx0dGhpcy5vbktleWRvd24gPSAoIGV2ICkgPT4ge1xuXHRcdFx0aWYoIHRoaXMubGlua19ub2RlICYmIGV2LmtleUNvZGUgPT09IDI3ICl7XG5cdFx0XHRcdHRoaXMuZXhpdExpbmtNb2RlKCk7XG5cdFx0XHR9IGVsc2UgaWYoIHRoaXMuZHJhZ19zZXQubGVuZ3RoICYmIGV2LmtleUNvZGUgPT09IDI3ICl7XG5cdFx0XHRcdHRoaXMuZHJhZ19zZXQgPSBbXTtcblx0XHRcdFx0dGhpcy5wbHVtYi5jbGVhckRyYWdTZWxlY3Rpb24oKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5vbkNsaWNrID0gKCkgPT4ge1xuXHRcdH07XG5cblx0XHR0aGlzLm9uTW91c2VNb3ZlID0gKCBldiApID0+IHtcblx0XHRcdGlmICggdGhpcy5wYW5uaW5nICkge1xuXHRcdFx0XHR0aGlzLm9mZnNldF94ID0gdGhpcy5sYXN0X29mZnNldF94IC0gKCB0aGlzLmxhc3RfbW91c2VfeCAtIGV2LmNsaWVudFggKTtcblx0XHRcdFx0dGhpcy5vZmZzZXRfeSA9IHRoaXMubGFzdF9vZmZzZXRfeSAtICggdGhpcy5sYXN0X21vdXNlX3kgLSBldi5jbGllbnRZICk7XG5cdFx0XHRcdHRoaXMucmVuZGVyQXRPZmZzZXQoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5vbk1vdXNlVXAgPSAoKSA9PiB7XG5cdFx0XHR0aGlzLnBhbm5pbmcgPSBmYWxzZTtcblx0XHR9O1xuXG5cdFx0dGhpcy5vblNjcm9sbCA9ICggZXYgKSA9PiB7XG5cdFx0XHRpZiggZXYuZGVsdGFZID4gMCApeyAvL3Njcm9sbCBkb3duXG5cdFx0XHRcdHRoaXMuem9vbSArPSAwLjM7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnpvb20gLT0gMC4zO1xuXHRcdFx0fVxuXHRcdFx0aWYoIHRoaXMuem9vbSA+IDQgKXtcblx0XHRcdFx0dGhpcy56b29tID0gNDtcblx0XHRcdH0gZWxzZSBpZiggdGhpcy56b29tIDwgMSApIHtcblx0XHRcdFx0dGhpcy56b29tID0gMTtcblx0XHRcdH1cblx0XHRcdHRoaXMucmVuZGVyQXRPZmZzZXQoKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5vbk5vZGVDbGljayA9IHdpbmRvdy5vbl9ub2RlX2NsaWNrID0gKCBlbGVtICkgPT4ge1xuXHRcdFx0dmFyIGZpbGVfbm9kZSA9IHRoaXMuZ2V0Tm9kZSggZWxlbS5pZCApO1xuXHRcdFx0aWYoIHRoaXMubGlua19ub2RlICl7XG5cdFx0XHRcdHZhciBlcnIgPSB0aGlzLmFkZExpbmsoIHRoaXMubGlua19ub2RlLCBmaWxlX25vZGUgKTtcblx0XHRcdFx0aWYoIGVyciApe1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoICdFcnJvcicsICdDYW5ub3QgY3JlYXRlIGxpbmsnLCBlcnIgKTtcblx0XHRcdFx0XHRkaWFsb2cuc2hvd19ub3RpZmljYXRpb24oICdDYW5ub3QgY3JlYXRlIGxpbmsuICcgKyBlcnIgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmV4aXRMaW5rTW9kZSgpO1xuXHRcdFx0fSBlbHNlIGlmKCB1dGlscy5pc19zaGlmdCgpIHx8IHV0aWxzLmlzX2N0cmwoKSApe1xuXHRcdFx0XHR2YXIgaW5kID0gdGhpcy5kcmFnX3NldC5pbmRleE9mKCBmaWxlX25vZGUuaWQgKTtcblx0XHRcdFx0aWYoIGluZCA9PT0gLTEgKXtcblx0XHRcdFx0XHR0aGlzLnBsdW1iLmFkZFRvRHJhZ1NlbGVjdGlvbiggZmlsZV9ub2RlLmlkICk7XG5cdFx0XHRcdFx0dGhpcy5kcmFnX3NldC5wdXNoKCBmaWxlX25vZGUuaWQgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnBsdW1iLnJlbW92ZUZyb21EcmFnU2VsZWN0aW9uKCBmaWxlX25vZGUuaWQgKTtcblx0XHRcdFx0XHR0aGlzLmRyYWdfc2V0LnNwbGljZSggaW5kLCAxICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLm9uTm9kZVVuY2xpY2sgPSB3aW5kb3cub25fbm9kZV91bmNsaWNrID0gKCBlbGVtICkgPT4ge1xuXHRcdFx0dmFyIGZpbGVfbm9kZSA9IHRoaXMuZ2V0Tm9kZSggZWxlbS5pZCApO1xuXHRcdFx0ZmlsZV9ub2RlLmxlZnQgPSBlbGVtLnN0eWxlLmxlZnQ7XG5cdFx0XHRmaWxlX25vZGUudG9wID0gZWxlbS5zdHlsZS50b3A7XG5cdFx0XHR0aGlzLmZpbGUubm9kZXMuZm9yRWFjaCggKCBub2RlX2ZpbGUgKSA9PiB7XG5cdFx0XHRcdHZhciBub2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIG5vZGVfZmlsZS5pZCApO1xuXHRcdFx0XHRub2RlX2ZpbGUubGVmdCA9IG5vZGUuc3R5bGUubGVmdDtcblx0XHRcdFx0bm9kZV9maWxlLnRvcCA9IG5vZGUuc3R5bGUudG9wO1xuXHRcdFx0fSApO1xuXHRcdFx0dGhpcy5zYXZlRmlsZSgpO1xuXHRcdH07XG5cblx0XHR0aGlzLm9uTm9kZURibENsaWNrID0gd2luZG93Lm9uX25vZGVfZGJsY2xpY2sgPSAoIGVsZW0gKSA9PiB7XG5cdFx0XHR2YXIgZmlsZV9ub2RlID0gdGhpcy5nZXROb2RlKCBlbGVtLmlkICk7XG5cdFx0XHRkaWFsb2cuc2hvd19pbnB1dCggZmlsZV9ub2RlLCAoIGNvbnRlbnQgKSA9PiB7XG5cdFx0XHRcdGZpbGVfbm9kZS5jb250ZW50ID0gY29udGVudDtcblx0XHRcdFx0dGhpcy5idWlsZERpYWdyYW0oKTtcblx0XHRcdFx0dGhpcy5zYXZlRmlsZSgpO1xuXHRcdFx0fSApO1xuXHRcdH07XG5cblx0XHR0aGlzLm9uTm9kZVJDbGljayA9IHdpbmRvdy5vbl9ub2RlX3JjbGljayA9ICggZWxlbSApID0+IHtcblx0XHRcdHRoaXMuZGlzYWJsZV9jb250ZXh0ID0gdHJ1ZTtcblx0XHRcdHZhciB7IHgsIHkgfSA9IHV0aWxzLmdldF9tb3VzZV9wb3MoKTtcblx0XHRcdGNvbnRleHQuc2hvdyggeCwgeSwgdGhpcy5nZXROb2RlKCBlbGVtLmlkICksIHRoaXMuZmlsZSwge1xuXHRcdFx0XHRsaW5rTm9kZTogZnVuY3Rpb24oIHBhcmVudCApe1xuXHRcdFx0XHRcdHRoaXMuZW50ZXJMaW5rTW9kZSggcGFyZW50ICk7XG5cdFx0XHRcdH0uYmluZCggdGhpcyApLFxuXHRcdFx0XHRjcmVhdGVUZXh0Tm9kZTogZnVuY3Rpb24oIHBhcmVudCApIHtcblx0XHRcdFx0XHRpZiAoIHBhcmVudC50eXBlID09PSAndGV4dCcgJiYgdGhpcy5ub2RlSGFzQ2hpbGQoIHBhcmVudCApICkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvciggJ2Nhbm5vdCBjcmVhdGUgdGV4dCBub2RlIGZyb20gcGFyZW50IHdpdGggY2hpbGQgYWxyZWFkeScgKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5hZGROb2RlKCBwYXJlbnQsICd0ZXh0JyApO1xuXHRcdFx0XHR9LmJpbmQoIHRoaXMgKSxcblx0XHRcdFx0Y3JlYXRlQ2hvaWNlTm9kZTogZnVuY3Rpb24oIHBhcmVudCApIHtcblx0XHRcdFx0XHRpZiAoIHBhcmVudC50eXBlID09PSAndGV4dCcgJiYgdGhpcy5ub2RlSGFzQ2hpbGQoIHBhcmVudCApICkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvciggJ2Nhbm5vdCBjcmVhdGUgY2hvaWNlIG5vZGUgZnJvbSBwYXJlbnQgd2l0aCBjaGlsZCBhbHJlYWR5JyApO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLmFkZE5vZGUoIHBhcmVudCwgJ2Nob2ljZScgKTtcblx0XHRcdFx0fS5iaW5kKCB0aGlzICksXG5cdFx0XHRcdGNyZWF0ZVBhc3NGYWlsTm9kZTogZnVuY3Rpb24oIHBhcmVudCApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyggJ0NyZWF0ZSBQYXNzRmFpbCBub2RlJywgcGFyZW50ICk7XG5cdFx0XHRcdH0uYmluZCggdGhpcyApXG5cdFx0XHR9ICk7XG5cdFx0fTtcblxuXHRcdHRoaXMub25Db25uUkNsaWNrID0gKCBwYXJhbXMsIGV2ICkgPT4ge1xuXHRcdFx0dmFyIGZyb20gPSBwYXJhbXMuc291cmNlSWQuc3BsaXQoICdfJyApWyAwIF07XG5cdFx0XHR2YXIgdG8gPSBwYXJhbXMudGFyZ2V0SWQuc3BsaXQoICdfJyApWyAwIF07XG5cdFx0XHR2YXIgaW5kID0gdGhpcy5nZXRMaW5rSW5kZXgoIGZyb20sIHRvICk7XG5cdFx0XHRpZiAoIGluZCA+IC0xICkge1xuXHRcdFx0XHRkaWFsb2cuc2hvd19jb25maXJtKCAnQXJlIHlvdSBzdXJlIHlvdSB3aXNoIHRvIGRlbGV0ZSB0aGlzIGxpbms/JywgKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuZmlsZS5saW5rcy5zcGxpY2UoIGluZCwgMSApO1xuXHRcdFx0XHRcdHRoaXMuYnVpbGREaWFncmFtKCk7XG5cdFx0XHRcdH0gKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoICdFUlJPUicsICdubyBsaW5rIGV4aXN0cyB0aGF0IHlvdSBqdXN0IGNsaWNrZWQgb24nLCBmcm9tLCB0bywgdGhpcy5maWxlLmxpbmtzICk7XG5cdFx0XHR9XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH07XG5cblx0XHR0aGlzLm9uRGVsZXRlQ2xpY2sgPSB3aW5kb3cub25fZGVsZXRlX2NsaWNrID0gKCBlbGVtICkgPT4ge1xuXHRcdFx0ZGlhbG9nLnNob3dfY29uZmlybSggJ0FyZSB5b3Ugc3VyZSB5b3Ugd2lzaCB0byBkZWxldGUgdGhpcyBub2RlPycsICgpID0+IHtcblx0XHRcdFx0dGhpcy5kZWxldGVOb2RlKCB0aGlzLmdldE5vZGUoIGVsZW0uaWQgKSApO1xuXHRcdFx0fSApO1xuXHRcdH07XG5cblx0XHRkb2N1bWVudC5vbmNvbnRleHRtZW51ID0gKCkgPT4ge1xuXHRcdFx0aWYgKCB0aGlzLmRpc2FibGVfY29udGV4dCApIHtcblx0XHRcdFx0dGhpcy5kaXNhYmxlX2NvbnRleHQgPSBmYWxzZTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMoIHByb3BzICkge1xuXHRcdHRoaXMuZmlsZSA9IHByb3BzLmZpbGU7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRqc1BsdW1iLnJlYWR5KCAoKSA9PiB7XG5cdFx0XHR0aGlzLnBsdW1iID0ganNQbHVtYi5nZXRJbnN0YW5jZSgge1xuXHRcdFx0XHRQYWludFN0eWxlOiB7IHN0cm9rZVdpZHRoOiAxIH0sXG5cdFx0XHRcdEFuY2hvcnM6IFsgWyAnVG9wUmlnaHQnIF0gXSxcblx0XHRcdFx0Q29udGFpbmVyOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ2RpYWdyYW0nICksXG5cdFx0XHR9ICk7XG5cblx0XHRcdHRoaXMuYnVpbGREaWFncmFtKCk7XG5cdFx0XHR0aGlzLnJlbmRlckF0T2Zmc2V0KCk7XG5cdFx0fSApO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAnbW91c2Vtb3ZlJywgdGhpcy5vbk1vdXNlTW92ZSApO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAnbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwICk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdrZXlkb3duJywgdGhpcy5vbktleWRvd24gKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vbkNsaWNrICk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICd3aGVlbCcsIHRoaXMub25TY3JvbGwgKTtcblx0fVxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lciggJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUgKTtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lciggJ21vdXNldXAnLCB0aGlzLm9uTW91c2VVcCApO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCAna2V5ZG93bicsIHRoaXMub25LZXlkb3duICk7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoICdjbGljaycsIHRoaXMub25DbGljayApO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCAnd2hlZWwnLCB0aGlzLm9uU2Nyb2xsICk7XG5cdFx0dGhpcy5leGl0TGlua01vZGUoKTtcblx0fVxuXHRjb21wb25lbnREaWRVcGRhdGUoKSB7XG5cdFx0dGhpcy5idWlsZERpYWdyYW0oKTtcblx0XHR0aGlzLnJlbmRlckF0T2Zmc2V0KCk7XG5cdH1cblx0cmVuZGVyQXRPZmZzZXQoKSB7XG5cdFx0dmFyIG9mZnNldCA9IGB0cmFuc2xhdGUoICR7dGhpcy5vZmZzZXRfeH1weCwgJHt0aGlzLm9mZnNldF95fXB4ICkgc2NhbGUoICR7MS90aGlzLnpvb219LCAkezEvdGhpcy56b29tfSApYDtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ2RpYWdyYW0nICkuc3R5bGUudHJhbnNmb3JtID0gb2Zmc2V0O1xuXHR9XG5cblx0c2F2ZUZpbGUoKSB7XG5cdFx0dmFyIGZpbGUgPSB0aGlzLmZpbGU7XG5cdFx0aWYgKCBmaWxlICE9PSBudWxsICkge1xuXHRcdFx0dXRpbHMucG9zdCggJy9maWxlLycgKyBmaWxlLm5hbWUsIGZpbGUsICgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coICdTdWNjZXNmdWxseSBzYXZlZC4nICk7XG5cdFx0XHR9ICk7XG5cdFx0fVxuXHR9XG5cblx0YnVpbGREaWFncmFtKCkge1xuXHRcdHZhciBmaWxlID0gdGhpcy5maWxlO1xuXHRcdGlmICggZmlsZSApIHtcblx0XHRcdHZhciBodG1sID0gZmlsZS5ub2Rlcy5yZWR1Y2UoICggcHJldiwgY3VyciApID0+IHtcblx0XHRcdFx0cmV0dXJuIHByZXYgKyB0aGlzLmdldE5vZGVIVE1MKCBjdXJyICk7XG5cdFx0XHR9LCAnJyApO1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdkaWFncmFtJyApLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0XHR0aGlzLnBsdW1iLmRyYWdnYWJsZSggZmlsZS5ub2Rlcy5tYXAoICggbm9kZSApID0+IHtcblx0XHRcdFx0cmV0dXJuIG5vZGUuaWQ7XG5cdFx0XHR9ICksIHtcblx0XHRcdFx0Y29udGFpbm1lbnQ6IHRydWVcblx0XHRcdH0gKTtcblx0XHRcdGZpbGUubGlua3MuZm9yRWFjaCggKCBsaW5rICkgPT4ge1xuXHRcdFx0XHR2YXIgY29ubmVjdGlvbiA9IHRoaXMucGx1bWIuY29ubmVjdCgge1xuXHRcdFx0XHRcdHNvdXJjZTogbGluay5mcm9tICsgJ19mcm9tJyxcblx0XHRcdFx0XHR0YXJnZXQ6IGxpbmsudG8gKyAnX3RvJyxcblx0XHRcdFx0XHRwYWludFN0eWxlOiB7IHN0cm9rZTogJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKScsIHN0cm9rZVdpZHRoOiA4IH0sXG5cdFx0XHRcdFx0ZW5kcG9pbnRTdHlsZToge1xuXHRcdFx0XHRcdFx0ZmlsbDogY3NzLmNvbG9ycy5QUklNQVJZLFxuXHRcdFx0XHRcdFx0b3V0bGluZVN0cm9rZTogY3NzLmNvbG9ycy5URVhUX0xJR0hULFxuXHRcdFx0XHRcdFx0b3V0bGluZVdpZHRoOiA1XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRjb25uZWN0b3I6IFsgJ0Zsb3djaGFydCcsXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdG1pZHBvaW50OiAwLjYsXG5cdFx0XHRcdFx0XHRcdGN1cnZpbmVzczogMzAsXG5cdFx0XHRcdFx0XHRcdGNvcm5lclJhZGl1czogMyxcblx0XHRcdFx0XHRcdFx0c3R1YjogMCxcblx0XHRcdFx0XHRcdFx0YWx3YXlzUmVzcGVjdFN0dWJzOiB0cnVlXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XSxcblx0XHRcdFx0XHRlbmRwb2ludDogWyAnRG90JywgeyByYWRpdXM6IDcgfSBdLFxuXHRcdFx0XHRcdG92ZXJsYXlzOiBbIFsgJ0Fycm93JywgeyBsb2NhdGlvbjogMC42LCB3aWR0aDogMjAsIGxlbmd0aDogMjAgfSBdIF0sXG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0Y29ubmVjdGlvbi5iaW5kKCAnY29udGV4dG1lbnUnLCB0aGlzLm9uQ29ublJDbGljayApO1xuXHRcdFx0fSApO1xuXHRcdH1cblx0fVxuXG5cdGVudGVyTGlua01vZGUoIHBhcmVudCApe1xuXHRcdGNvbnNvbGUubG9nKCAnRU5URVIgTElOSyBNT0RFJyApO1xuXHRcdHNldFRpbWVvdXQoICgpID0+IHtcblx0XHRcdHRoaXMubGlua19ub2RlID0gcGFyZW50O1xuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdkaWFncmFtLWFyZWEnICkuY2xhc3NOYW1lID0gJ25vLWRyYWcgbGlua2luZyc7XG5cdFx0fSwgMTUwICk7XG5cdH1cblx0ZXhpdExpbmtNb2RlKCl7XG5cdFx0Y29uc29sZS5sb2coICdFWElUIExJTksgTU9ERScgKTtcblx0XHR0aGlzLmxpbmtfbm9kZSA9IGZhbHNlO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCAnZGlhZ3JhbS1hcmVhJyApLmNsYXNzTmFtZSA9ICduby1kcmFnIG1vdmFibGUnO1xuXHR9XG5cblx0Z2V0Tm9kZSggaWQgKSB7XG5cdFx0aWYgKCB0aGlzLmZpbGUgKSB7XG5cdFx0XHRmb3IgKCB2YXIgaSBpbiB0aGlzLmZpbGUubm9kZXMgKSB7XG5cdFx0XHRcdGlmICggdGhpcy5maWxlLm5vZGVzWyBpIF0uaWQgPT09IGlkICkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGUubm9kZXNbIGkgXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fVxuXG5cdGdldExpbmtJbmRleCggZnJvbV9pZCwgdG9faWQgKSB7XG5cdFx0aWYgKCB0aGlzLmZpbGUgKSB7XG5cdFx0XHRmb3IgKCB2YXIgaSBpbiB0aGlzLmZpbGUubGlua3MgKSB7XG5cdFx0XHRcdGlmICggdGhpcy5maWxlLmxpbmtzWyBpIF0uZnJvbSA9PT0gZnJvbV9pZCAmJiB0aGlzLmZpbGUubGlua3NbIGkgXS50byA9PT0gdG9faWQgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiAtMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxuXG5cdG5vZGVIYXNDaGlsZCggbm9kZSApIHtcblx0XHRpZiAoIHRoaXMuZmlsZSApIHtcblx0XHRcdGZvciAoIHZhciBpIGluIHRoaXMuZmlsZS5saW5rcyApIHtcblx0XHRcdFx0aWYgKCB0aGlzLmZpbGUubGlua3NbIGkgXS5mcm9tID09PSBub2RlLmlkICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdGFkZExpbmsoIGZyb20sIHRvICl7XG5cdFx0dmFyIGxpbmsgPSB0aGlzLmdldExpbmtJbmRleCggZnJvbS5pZCwgdG8uaWQgKTtcblx0XHRpZiggbGluayAhPT0gLTEgKXtcblx0XHRcdHJldHVybiAnVGhhdCBzcGVjaWZpYyBsaW5rIGFscmVhZHkgZXhpc3RzLic7XG5cdFx0fVxuXG5cdFx0aWYoIGZyb20udHlwZSA9PT0gJ3RleHQnICYmIHRoaXMubm9kZUhhc0NoaWxkKCBmcm9tICkgKXtcblx0XHRcdHJldHVybiAnVGhhdCB0ZXh0IG5vZGUgYWxyZWFkeSBoYXMgYSBjaGlsZC4nO1xuXHRcdH1cblxuXHRcdHRoaXMuZmlsZS5saW5rcy5wdXNoKCB7XG5cdFx0XHRmcm9tOiBmcm9tLmlkLFxuXHRcdFx0dG86IHRvLmlkXG5cdFx0fSApO1xuXHRcdHRoaXMuc2F2ZUZpbGUoKTtcblx0XHR0aGlzLmJ1aWxkRGlhZ3JhbSgpO1xuXHR9XG5cblx0YWRkTm9kZSggcGFyZW50LCB0eXBlICkge1xuXHRcdHZhciBpZCA9IHV0aWxzLnJhbmRvbV9pZCggMTAgKTtcblx0XHR0aGlzLmZpbGUubm9kZXMucHVzaCgge1xuXHRcdFx0aWQ6IGlkLFxuXHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdGNvbnRlbnQ6ICdUaGlzIG5vZGUgY3VycmVudGx5IGhhcyBubyBhY3R1YWwgY29udGVudC4nLFxuXHRcdFx0bGVmdDogcGFyZW50LmxlZnQsXG5cdFx0XHR0b3A6IHBhcnNlSW50KCBwYXJlbnQudG9wICkgKyAyMDAgKyAncHgnXG5cdFx0fSApO1xuXHRcdHRoaXMuZmlsZS5saW5rcy5wdXNoKCB7XG5cdFx0XHR0bzogaWQsXG5cdFx0XHRmcm9tOiBwYXJlbnQuaWRcblx0XHR9ICk7XG5cdFx0dGhpcy5zYXZlRmlsZSgpO1xuXHRcdHRoaXMuYnVpbGREaWFncmFtKCk7XG5cdH1cblxuXHRkZWxldGVOb2RlKCBub2RlICl7XG5cdFx0Zm9yKCB2YXIgaSBpbiB0aGlzLmZpbGUubm9kZXMgKXtcblx0XHRcdGlmKCBub2RlID09PSB0aGlzLmZpbGUubm9kZXNbIGkgXSApe1xuXHRcdFx0XHR0aGlzLmZpbGUubm9kZXMuc3BsaWNlKCBpLCAxICk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuZmlsZS5saW5rcyA9IHRoaXMuZmlsZS5saW5rcy5maWx0ZXIoICggbGluayApID0+IHtcblx0XHRcdGlmKCBsaW5rLnRvID09PSBub2RlLmlkIHx8IGxpbmsuZnJvbSA9PT0gbm9kZS5pZCApe1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHR0aGlzLmJ1aWxkRGlhZ3JhbSgpO1xuXHR9XG5cblx0Z2V0Tm9kZUhUTUwoIG5vZGUgKSB7XG5cdFx0dmFyIHN0eWxlID0ge1xuXHRcdFx0bGVmdDogbm9kZS5sZWZ0IHx8IG51bGwsXG5cdFx0XHR0b3A6IG5vZGUudG9wIHx8IG51bGwsXG5cdFx0XHR3aWR0aDogbm9kZS53aWR0aCB8fCBudWxsLFxuXHRcdFx0aGVpZ2h0OiBub2RlLmhlaWdodCB8fCBudWxsXG5cdFx0fTtcblx0XHR2YXIgc3R5bGVfc3RyID0gJyc7XG5cdFx0Zm9yICggdmFyIGkgaW4gc3R5bGUgKSB7XG5cdFx0XHRpZiAoIHN0eWxlWyBpIF0gKSB7XG5cdFx0XHRcdHN0eWxlX3N0ciArPSBgJHtpfToke3N0eWxlW2ldfTsgYDtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICcnO1xuXHRcdGlmICggbm9kZS50eXBlID09PSAnY2hvaWNlJyB8fCBub2RlLnR5cGUgPT09ICdjaG9pY2VfY29uZGl0aW9uYWwnICkge1xuXHRcdFx0Y2xhc3NOYW1lID0gJ2l0ZW0tY2hvaWNlJztcblx0XHR9IGVsc2UgaWYgKCBub2RlLnR5cGUgPT09ICdyb290JyApIHtcblx0XHRcdGNsYXNzTmFtZSA9ICdpdGVtLXJvb3QnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjbGFzc05hbWUgPSAnaXRlbS10ZXh0Jztcblx0XHR9XG5cdFx0cmV0dXJuIGA8ZGl2IGNsYXNzPVwiJHtjbGFzc05hbWV9XCIgYCArXG5cdFx0XHRgc3R5bGU9XCIke3N0eWxlX3N0cn1cIiBpZD1cIiR7bm9kZS5pZH1cIiBgICtcblx0XHRcdGBvbm1vdXNlZG93bj1cIm9uX25vZGVfY2xpY2soJHtub2RlLmlkfSlcIiBgICtcblx0XHRcdGBvbm1vdXNldXA9XCJvbl9ub2RlX3VuY2xpY2soJHtub2RlLmlkfSlcIiBgICtcblx0XHRcdGBvbmRibGNsaWNrPVwib25fbm9kZV9kYmxjbGljaygke25vZGUuaWR9KVwiIGAgK1xuXHRcdFx0YG9uY29udGV4dG1lbnU9XCJvbl9ub2RlX3JjbGljaygke25vZGUuaWR9KVwiIGAgK1xuXHRcdFx0YD5gICtcblx0XHRcdGA8ZGl2IGNsYXNzPVwiaXRlbS1jb250ZW50XCI+PHNwYW4gY2xhc3M9XCJuby1zZWxlY3RcIj4ke25vZGUuY29udGVudH08L3NwYW4+PC9kaXY+YCArXG5cdFx0XHRgPGRpdiBjbGFzcz1cImFuY2hvci10b1wiIGlkPVwiJHtub2RlLmlkfV90b1wiPjwvZGl2PmAgK1xuXHRcdFx0YDxkaXYgY2xhc3M9XCJhbmNob3ItZnJvbVwiIGlkPVwiJHtub2RlLmlkfV9mcm9tXCI+PC9kaXY+YCArXG5cdFx0XHQoIG5vZGUudHlwZSA9PT0gJ3Jvb3QnID8gJycgOiBgPGRpdiBvbmNsaWNrPVwib25fZGVsZXRlX2NsaWNrKCR7bm9kZS5pZH0pXCIgY2xhc3M9XCJpdGVtLWRlbGV0ZVwiIGlkPVwiJHtub2RlLmlkfV9kZWxldGVcIj48c3BhbiBjbGFzcz1cIm5vLXNlbGVjdFwiPlg8L3NwYW4+PC9kaXY+YCApICtcblx0XHRcdGA8L2Rpdj5gO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiBSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRcdGlkOiAnZGlhZ3JhbS1hcmVhJyxcblx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tZHJhZyBtb3ZhYmxlJyxcblx0XHRcdFx0b25Nb3VzZURvd246ICggZXYgKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5wYW5uaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHR0aGlzLmxhc3RfbW91c2VfeCA9IGV2LnBhZ2VYO1xuXHRcdFx0XHRcdHRoaXMubGFzdF9tb3VzZV95ID0gZXYucGFnZVk7XG5cdFx0XHRcdFx0dGhpcy5sYXN0X29mZnNldF94ID0gdGhpcy5vZmZzZXRfeDtcblx0XHRcdFx0XHR0aGlzLmxhc3Rfb2Zmc2V0X3kgPSB0aGlzLm9mZnNldF95O1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRHJhZ1N0YXJ0OiAoIGV2ICkgPT4ge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRyb3A6ICggZXYgKSA9PiB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0cG9zaXRpb246ICdyZWxhdGl2ZScsXG5cdFx0XHRcdFx0d2lkdGg6ICcyNDAwcHgnLFxuXHRcdFx0XHRcdGhlaWdodDogJzI0MDBweCdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0aWQ6ICdkaWFncmFtJyxcblx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tZHJhZycsXG5cdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0d2lkdGg6ICcxMDAlJyxcblx0XHRcdFx0XHRoZWlnaHQ6ICcxMDAlJyxcblx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IGNzcy5jb2xvcnMuQkdcblx0XHRcdFx0fVxuXHRcdFx0fSApXG5cdFx0KTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSggJ3JlYWN0JyApO1xudmFyIFJlYWN0RE9NID0gcmVxdWlyZSggJ3JlYWN0LWRvbScgKTtcbnZhciBleHBvc2UgPSByZXF1aXJlKCAnLi9leHBvc2UnICk7XG52YXIgY3NzID0gcmVxdWlyZSggJy4vY3NzJyApO1xuXG5jbGFzcyBDb250ZXh0IGV4dGVuZHMgZXhwb3NlLkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCBwcm9wcyApe1xuXHRcdHN1cGVyKCBwcm9wcyApO1xuXHRcdHRoaXMuZXhwb3NlKCAnY29udGV4dCcgKTtcblx0fVxuXG5cdHJlbmRlckl0ZW0oIG5hbWUsIGNiICl7XG5cdFx0cmV0dXJuIFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0a2V5OiBuYW1lLFxuXHRcdFx0XHRvbkNsaWNrOiBjYixcblx0XHRcdFx0Y2xhc3NOYW1lOiAnY29udGV4dC1idXR0b24nLFxuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdHBhZGRpbmc6ICc1cHgnXG5cdFx0XHRcdH1cblx0XHRcdH0sIFJlYWN0LkRPTS5zcGFuKCB7XG5cdFx0XHRcdGNsYXNzTmFtZTogJ25vLXNlbGVjdCdcblx0XHRcdH0sIG5hbWUgKVxuXHRcdCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0aWYoICF0aGlzLnByb3BzLnZpc2libGUgKXtcblx0XHRcdHJldHVybiBSZWFjdC5ET00uZGl2KCk7XG5cdFx0fVxuXG5cdFx0dmFyIGVsZW1zID0gW107XG5cblx0XHRlbGVtcy5wdXNoKFxuXHRcdFx0dGhpcy5yZW5kZXJJdGVtKCAnTGluayBOb2RlJywgdGhpcy5wcm9wcy5saW5rTm9kZS5iaW5kKCBudWxsLCB0aGlzLnByb3BzLm5vZGUgKSApLFxuXHRcdFx0dGhpcy5yZW5kZXJJdGVtKCAnTmV3IFRleHQgTm9kZScsIHRoaXMucHJvcHMuY3JlYXRlVGV4dE5vZGUuYmluZCggbnVsbCwgdGhpcy5wcm9wcy5ub2RlICkgKSxcblx0XHRcdHRoaXMucmVuZGVySXRlbSggJ05ldyBDaG9pY2UgTm9kZScsIHRoaXMucHJvcHMuY3JlYXRlQ2hvaWNlTm9kZS5iaW5kKCBudWxsLCB0aGlzLnByb3BzLm5vZGUgKSApLFxuXHRcdFx0dGhpcy5yZW5kZXJJdGVtKCAnTmV3IFBhc3NGYWlsIE5vZGUnLCB0aGlzLnByb3BzLmNyZWF0ZVBhc3NGYWlsTm9kZS5iaW5kKCBudWxsLCB0aGlzLnByb3BzLm5vZGUgKSApXG5cdFx0KTtcblxuXHRcdHJldHVybiBSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdFx0d2lkdGg6ICcxNDBweCcsXG5cdFx0XHRcdHBhZGRpbmc6ICc1cHgnLFxuXHRcdFx0XHR0b3A6IHRoaXMucHJvcHMuc3R5bGUudG9wLFxuXHRcdFx0XHRsZWZ0OiB0aGlzLnByb3BzLnN0eWxlLmxlZnQsXG5cdFx0XHRcdGJhY2tncm91bmRDb2xvcjogY3NzLmNvbG9ycy5URVhUX0xJR0hULFxuXHRcdFx0XHRib3JkZXI6ICcycHggc29saWQgJyArIGNzcy5jb2xvcnMuRkdfTkVVVFJBTFxuXHRcdFx0fVxuXHRcdH0sIGVsZW1zICk7XG5cdH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsICgpID0+IHtcblx0ZXhwb3J0cy5oaWRlKCk7XG59ICk7XG5cbmV4cG9ydHMuc2hvdyA9IGZ1bmN0aW9uKCB4LCB5LCBub2RlLCBmaWxlLCBjYnMgKXtcblx0UmVhY3RET00ucmVuZGVyKFxuXHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoIENvbnRleHQsIHtcblx0XHRcdHZpc2libGU6IHRydWUsXG5cdFx0XHRub2RlOiBub2RlLFxuXHRcdFx0ZmlsZTogZmlsZSxcblx0XHRcdGxpbmtOb2RlOiBjYnMubGlua05vZGUsXG5cdFx0XHRjcmVhdGVUZXh0Tm9kZTogY2JzLmNyZWF0ZVRleHROb2RlLFxuXHRcdFx0Y3JlYXRlQ2hvaWNlTm9kZTogY2JzLmNyZWF0ZUNob2ljZU5vZGUsXG5cdFx0XHRjcmVhdGVQYXNzRmFpbE5vZGU6IGNicy5jcmVhdGVQYXNzRmFpbE5vZGUsXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHR0b3A6IHksXG5cdFx0XHRcdGxlZnQ6IHhcblx0XHRcdH1cblx0XHR9ICksXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdjb250ZXh0JyApXG5cdCk7XG59O1xuXG5leHBvcnRzLmhpZGUgPSBmdW5jdGlvbigpe1xuXHRSZWFjdERPTS5yZW5kZXIoXG5cdFx0UmVhY3QuY3JlYXRlRWxlbWVudCggQ29udGV4dCwge1xuXHRcdFx0dmlzaWJsZTogZmFsc2Vcblx0XHR9ICksXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdjb250ZXh0JyApXG5cdCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Zm9udDoge1xuXHRcdG1haW46ICdMdWNpZGEgU2FucycsXG5cdFx0YnViYmxlOiAnQ291cmllciBOZXcnXG5cdH0sXG5cdGNvbG9yczoge1xuXHRcdFBSSU1BUlk6ICcjNEE0QTRBJyxcblx0XHRQUklNQVJZX0FMVDogJyM1NTU1NTUnLFxuXHRcdFNFQ09OREFSWTogJyMzMzQ0QUEnLFxuXHRcdFNFQ09OREFSWV9BTFQ6ICcjNDQ1NUJCJyxcblx0XHRURVhUX0xJR0hUOiAnI0RFREVERScsXG5cdFx0VEVYVF9ORVVUUkFMOiAnI0E1QTVBNScsXG5cdFx0VEVYVF9EQVJLOiAnIzIyMjIyMicsXG5cdFx0Qkc6ICcjMTExMTExJyxcblx0XHRGRzogJyMzMzMzMzMnLFxuXHRcdEJHX05FVVRSQUw6ICcjNTU1NTU1Jyxcblx0XHRGR19ORVVUUkFMOiAnIzc3Nzc3Nydcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSggJ3JlYWN0JyApO1xudmFyIFJlYWN0RE9NID0gcmVxdWlyZSggJ3JlYWN0LWRvbScgKTtcbnZhciBjc3MgPSByZXF1aXJlKCAnLi9jc3MnICk7XG5cbnZhciBjdXJyZW50X2NvbmZpcm0gPSBudWxsO1xudmFyIGN1cnJlbnRfY2FuY2VsID0gbnVsbDtcblxuY2xhc3MgQ29uZmlybURpYWxvZyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCBwcm9wcyApe1xuXHRcdHN1cGVyKCBwcm9wcyApO1xuXG5cdFx0dGhpcy5oYW5kbGVDb25maXJtQ2xpY2sgPSBjdXJyZW50X2NvbmZpcm0gPSAoKSA9PiB7XG5cdFx0XHRleHBvcnRzLmhpZGUoKTtcblx0XHRcdHRoaXMucHJvcHMub25fY29uZmlybSgpO1xuXHRcdH07XG5cblx0XHR0aGlzLmhhbmRsZUNhbmNlbENsaWNrID0gY3VycmVudF9jYW5jZWwgPSAoKSA9PiB7XG5cdFx0XHRleHBvcnRzLmhpZGUoKTtcblx0XHRcdHRoaXMucHJvcHMub25fY2FuY2VsKCk7XG5cdFx0fTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gUmVhY3QuRE9NLmRpdigge1xuXHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdHdpZHRoOiAnMzAwcHgnLFxuXHRcdFx0XHRwYWRkaW5nOiAnNXB4Jyxcblx0XHRcdFx0dG9wOiAnMzAwcHgnLFxuXHRcdFx0XHRsZWZ0OiAoIHdpbmRvdy5pbm5lcldpZHRoIC8gMiAtIDE0MCApICsgJ3B4Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjc3MuY29sb3JzLlNFQ09OREFSWSxcblx0XHRcdFx0Ym9yZGVyOiAnNHB4IHNvbGlkICcgKyBjc3MuY29sb3JzLlNFQ09OREFSWV9BTFQsXG5cdFx0XHRcdGNvbG9yOiBjc3MuY29sb3JzLlRFWFRfTElHSFRcblx0XHRcdH1cblx0XHR9LFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdHBhZGRpbmc6ICc1cHgnXG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMucHJvcHMudGV4dCApLFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtZW5kJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XHRSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnY29uZmlybS1idXR0b24nLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ29uZmlybUNsaWNrXG5cdFx0XHRcdH0sIFJlYWN0LkRPTS5zcGFuKCB7XG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tc2VsZWN0J1xuXHRcdFx0XHR9LCAnWWVzJyApICksXG5cdFx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdjYW5jZWwtYnV0dG9uJyxcblx0XHRcdFx0XHRvbkNsaWNrOiB0aGlzLmhhbmRsZUNhbmNlbENsaWNrXG5cdFx0XHRcdH0sIFJlYWN0LkRPTS5zcGFuKCB7XG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tc2VsZWN0J1xuXHRcdFx0XHR9LCAnTm8nICkgKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn1cblxuY2xhc3MgSW5wdXREaWFsb2cgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvciggcHJvcHMgKXtcblx0XHRzdXBlciggcHJvcHMgKTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHR2YWx1ZTogdGhpcy5wcm9wcy5ub2RlID8gdGhpcy5wcm9wcy5ub2RlLmNvbnRlbnQgOiAnJ1xuXHRcdH07XG5cblx0XHR0aGlzLmhhbmRsZUlucHV0Q2hhbmdlID0gKCBldiApID0+IHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoIHtcblx0XHRcdFx0dmFsdWU6IGV2LnRhcmdldC52YWx1ZVxuXHRcdFx0fSApO1xuXHRcdH07XG5cdFx0dGhpcy5oYW5kbGVDb25maXJtQ2xpY2sgPSBjdXJyZW50X2NvbmZpcm0gPSAoKSA9PiB7XG5cdFx0XHRleHBvcnRzLmhpZGUoKTtcblx0XHRcdHRoaXMucHJvcHMub25fY29uZmlybSggdGhpcy5zdGF0ZS52YWx1ZSApO1xuXHRcdH07XG5cblx0XHR0aGlzLmhhbmRsZUNhbmNlbENsaWNrID0gY3VycmVudF9jYW5jZWwgPSAoKSA9PiB7XG5cdFx0XHRleHBvcnRzLmhpZGUoKTtcblx0XHR9O1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKXtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ0lucHV0RGlhbG9nLWlucHV0JyApLmZvY3VzKCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0XHR3aWR0aDogJzQwMHB4Jyxcblx0XHRcdFx0cGFkZGluZzogJzVweCcsXG5cdFx0XHRcdHRvcDogJzMwMHB4Jyxcblx0XHRcdFx0bGVmdDogKCB3aW5kb3cuaW5uZXJXaWR0aCAvIDIgLSAxNDAgKSArICdweCcsXG5cdFx0XHRcdGJhY2tncm91bmRDb2xvcjogY3NzLmNvbG9ycy5TRUNPTkRBUlksXG5cdFx0XHRcdGJvcmRlcjogJzRweCBzb2xpZCAnICsgY3NzLmNvbG9ycy5TRUNPTkRBUllfQUxULFxuXHRcdFx0XHRjb2xvcjogY3NzLmNvbG9ycy5URVhUX0xJR0hUXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0XHRwYWRkaW5nOiAnNXB4J1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAnUHJvdmlkZSBJbnB1dCcgKSxcblx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0XHRwYWRkaW5nOiAnNXB4J1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XHRSZWFjdC5ET00udGV4dGFyZWEoIHtcblx0XHRcdFx0XHRpZDogJ0lucHV0RGlhbG9nLWlucHV0Jyxcblx0XHRcdFx0XHRvbkNoYW5nZTogdGhpcy5oYW5kbGVJbnB1dENoYW5nZSxcblx0XHRcdFx0XHR2YWx1ZTogdGhpcy5zdGF0ZS52YWx1ZSxcblx0XHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjc3MuY29sb3JzLkJHLFxuXHRcdFx0XHRcdFx0Y29sb3I6IGNzcy5jb2xvcnMuVEVYVF9MSUdIVCxcblx0XHRcdFx0XHRcdHdpZHRoOiAnMTAwJScsXG5cdFx0XHRcdFx0XHRoZWlnaHQ6IHRoaXMucHJvcHMubm9kZSA/ICcyMDBweCcgOiAnMjBweCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKVxuXHRcdFx0KSxcblx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LWVuZCdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2NvbmZpcm0tYnV0dG9uJyxcblx0XHRcdFx0XHRvbkNsaWNrOiB0aGlzLmhhbmRsZUNvbmZpcm1DbGlja1xuXHRcdFx0XHR9LCBSZWFjdC5ET00uc3Bhbigge1xuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ25vLXNlbGVjdCdcblx0XHRcdFx0fSwgJ09rYXknICkgKSxcblx0XHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2NhbmNlbC1idXR0b24nLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ2FuY2VsQ2xpY2tcblx0XHRcdFx0fSwgUmVhY3QuRE9NLnNwYW4oIHtcblx0XHRcdFx0XHRjbGFzc05hbWU6ICduby1zZWxlY3QnXG5cdFx0XHRcdH0sICdDYW5jZWwnICkgKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn1cblxuY2xhc3MgTm90aWZpY2F0aW9uRGlhbG9nIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoIHByb3BzICl7XG5cdFx0c3VwZXIoIHByb3BzICk7XG5cblx0XHR0aGlzLmhhbmRsZUNvbmZpcm1DbGljayA9IGN1cnJlbnRfY29uZmlybSA9ICgpID0+IHtcblx0XHRcdGV4cG9ydHMuaGlkZSgpO1xuXHRcdFx0dGhpcy5wcm9wcy5vbl9jb25maXJtKCk7XG5cdFx0fTtcblx0XHRjdXJyZW50X2NhbmNlbCA9IGN1cnJlbnRfY29uZmlybTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gUmVhY3QuRE9NLmRpdigge1xuXHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdHdpZHRoOiAnMzAwcHgnLFxuXHRcdFx0XHRwYWRkaW5nOiAnNXB4Jyxcblx0XHRcdFx0dG9wOiAnMzAwcHgnLFxuXHRcdFx0XHRsZWZ0OiAoIHdpbmRvdy5pbm5lcldpZHRoIC8gMiAtIDE0MCApICsgJ3B4Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjc3MuY29sb3JzLlNFQ09OREFSWSxcblx0XHRcdFx0Ym9yZGVyOiAnNHB4IHNvbGlkICcgKyBjc3MuY29sb3JzLlNFQ09OREFSWV9BTFQsXG5cdFx0XHRcdGNvbG9yOiBjc3MuY29sb3JzLlRFWFRfTElHSFRcblx0XHRcdH1cblx0XHR9LFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdHBhZGRpbmc6ICc1cHgnXG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMucHJvcHMudGV4dCApLFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtZW5kJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XHRSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnY29uZmlybS1idXR0b24nLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ29uZmlybUNsaWNrXG5cdFx0XHRcdH0sIFJlYWN0LkRPTS5zcGFuKCB7XG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tc2VsZWN0J1xuXHRcdFx0XHR9LCAnT2theScgKSApXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufVxuXG52YXIgb25fa2V5X2Rvd24gPSBmdW5jdGlvbihcdGV2ICl7XG5cdGlmKCBldi5rZXlDb2RlID09PSAxMyApIHsgLy9lbnRlclxuXHRcdGN1cnJlbnRfY29uZmlybSgpO1xuXHR9IGVsc2UgaWYoIGV2LmtleUNvZGUgPT09IDI3ICl7IC8vZXNjXG5cdFx0Y3VycmVudF9jYW5jZWwoKTtcblx0fVxufTtcblxuZXhwb3J0cy5zaG93X2NvbmZpcm0gPSBmdW5jdGlvbiggdGV4dCwgb25fY29uZmlybSwgb25fY2FuY2VsICl7XG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAna2V5ZG93bicsIG9uX2tleV9kb3duICk7XG5cdFJlYWN0RE9NLnJlbmRlcihcblx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCBDb25maXJtRGlhbG9nLCB7XG5cdFx0XHR0ZXh0OiB0ZXh0LFxuXHRcdFx0b25fY29uZmlybTogb25fY29uZmlybSB8fCBmdW5jdGlvbigpe30sXG5cdFx0XHRvbl9jYW5jZWw6IG9uX2NhbmNlbCB8fCBmdW5jdGlvbigpe31cblx0XHR9ICksXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdkaWFsb2cnIClcblx0KTtcbn07XG5cbmV4cG9ydHMuc2hvd19pbnB1dCA9IGZ1bmN0aW9uKCBub2RlLCBvbl9jb25maXJtLCBvbl9jYW5jZWwgKXtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdrZXlkb3duJywgb25fa2V5X2Rvd24gKTtcblx0UmVhY3RET00ucmVuZGVyKFxuXHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoIElucHV0RGlhbG9nLCB7XG5cdFx0XHRub2RlOiBub2RlLFxuXHRcdFx0b25fY29uZmlybTogb25fY29uZmlybSB8fCBmdW5jdGlvbigpe30sXG5cdFx0XHRvbl9jYW5jZWw6IG9uX2NhbmNlbCB8fCBmdW5jdGlvbigpe31cblx0XHR9ICksXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdkaWFsb2cnIClcblx0KTtcbn07XG5cbmV4cG9ydHMuc2hvd19ub3RpZmljYXRpb24gPSBmdW5jdGlvbiggdGV4dCwgb25fY29uZmlybSApe1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggJ2tleWRvd24nLCBvbl9rZXlfZG93biApO1xuXHRSZWFjdERPTS5yZW5kZXIoXG5cdFx0UmVhY3QuY3JlYXRlRWxlbWVudCggTm90aWZpY2F0aW9uRGlhbG9nLCB7XG5cdFx0XHR0ZXh0OiB0ZXh0LFxuXHRcdFx0b25fY29uZmlybTogb25fY29uZmlybSB8fCBmdW5jdGlvbigpe31cblx0XHR9ICksXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdkaWFsb2cnIClcblx0KTtcbn07XG5cbmV4cG9ydHMuaGlkZSA9IGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCAna2V5ZG93bicsIG9uX2tleV9kb3duICk7XG5cdFJlYWN0RE9NLnVubW91bnRDb21wb25lbnRBdE5vZGUoIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCAnZGlhbG9nJyApICk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCAncmVhY3QnICk7XG5cbm1vZHVsZS5leHBvcnRzLm1peGluID0gZnVuY3Rpb24oIGlkICkge1xuXHRyZXR1cm4ge1xuXHRcdGNvbXBvbmVudFdpbGxNb3VudDogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiggaWQgKSB7XG5cdFx0XHRcdG1vZHVsZS5leHBvcnRzLnN0YXRlc1sgaWQgXSA9IHtcblx0XHRcdFx0XHRzZXRTdGF0ZTogZnVuY3Rpb24oIHN0YXRlICkge1xuXHRcdFx0XHRcdFx0dGhpcy5zZXRTdGF0ZSggc3RhdGUgKTtcblx0XHRcdFx0XHR9LmJpbmQoIHRoaXMgKSxcblx0XHRcdFx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zdGF0ZTtcblx0XHRcdFx0XHR9LmJpbmQoIHRoaXMgKVxuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvciggJ0V4cG9zZWQgc3RhdGVzIG11c3QgaGF2ZSBhIHZhbGlkIGlkLicsIHRoaXMucHJvcHMsIHRoaXMuc3RhdGUgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRcdGlmKCBpZCApIHtcblx0XHRcdFx0ZGVsZXRlIG1vZHVsZS5leHBvcnRzLnN0YXRlc1sgaWQgXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5Db21wb25lbnQgPSBjbGFzcyBFeHBvc2VDb21wb25lbnQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvciggcHJvcHMgKXtcblx0XHRzdXBlciggcHJvcHMgKTtcblx0XHR0aGlzLl9leHBvc2VfaWQgPSBudWxsO1xuXHR9XG5cblx0ZXhwb3NlKCBpZCApe1xuXHRcdHRoaXMuX2V4cG9zZV9pZCA9IGlkO1xuXHRcdGlmKCBtb2R1bGUuZXhwb3J0cy5zdGF0ZXNbIHRoaXMuX2V4cG9zZV9pZCBdICl7XG5cdFx0XHRjb25zb2xlLmVycm9yKCAnRXJyb3IsIGV4cG9zZSBjb21wb25lbnQgZXhwb3NlZCBhbiBpZCB0aGF0IGFscmVhZHkgZXhpc3RzJywgdGhpcy5leHBvc2VfaWQsIHRoaXMucHJvcHMgKTtcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnRXaWxsTW91bnQoKXtcblx0XHRpZiggdGhpcy5fZXhwb3NlX2lkICkge1xuXHRcdFx0bW9kdWxlLmV4cG9ydHMuc3RhdGVzWyB0aGlzLl9leHBvc2VfaWQgXSA9IHtcblx0XHRcdFx0c2V0U3RhdGU6ICggc3RhdGUgKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5zZXRTdGF0ZSggc3RhdGUgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0U3RhdGU6ICgpID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zdGF0ZTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5lcnJvciggJ0V4cG9zZWQgc3RhdGVzIG11c3QgaGF2ZSBhIHZhbGlkIGlkLiBTZXQgaXQgd2l0aCBcInRoaXMuZXhwb3NlKCB7aWR9IClcIicsIHRoaXMucHJvcHMsIHRoaXMuc3RhdGUgKTtcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZiggdGhpcy5fZXhwb3NlX2lkICkge1xuXHRcdFx0ZGVsZXRlIG1vZHVsZS5leHBvcnRzLnN0YXRlc1sgdGhpcy5fZXhwb3NlX2lkIF07XG5cdFx0fVxuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zdGF0ZXMgPSB7fTtcbm1vZHVsZS5leHBvcnRzLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKCBpZCwgc3RhdGUgKSB7XG5cdGlmKCBtb2R1bGUuZXhwb3J0cy5zdGF0ZXNbIGlkIF0gKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMuc3RhdGVzWyBpZCBdLnNldFN0YXRlKCBzdGF0ZSApO1xuXHR9XG59O1xubW9kdWxlLmV4cG9ydHMuZ2V0X3N0YXRlID0gZnVuY3Rpb24oIGlkICl7XG5cdGlmKCBtb2R1bGUuZXhwb3J0cy5zdGF0ZXNbIGlkIF0gKSB7XG5cdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzLnN0YXRlc1sgaWQgXS5nZXRTdGF0ZSgpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7fTtcblx0fVxufTtcbm1vZHVsZS5leHBvcnRzLnNldF90YWIgPSBmdW5jdGlvbiggdGFiICl7XG5cdG1vZHVsZS5leHBvcnRzLnNldF9zdGF0ZSggJ21haW4nLCB7XG5cdFx0Y2xhc3NOYW1lOiAnZmFkZS1vdXQtY2xhc3MnXG5cdH0gKTtcblx0c2V0VGltZW91dCggKCkgPT4ge1xuXHRcdG1vZHVsZS5leHBvcnRzLnNldF9zdGF0ZSggJ21haW4nLCB7XG5cdFx0XHRjbGFzc05hbWU6ICdmYWRlLWluLWNsYXNzJyxcblx0XHRcdHRhYjogdGFiXG5cdFx0fSApO1xuXHR9LCA3MCApO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSggJ3JlYWN0JyApO1xudmFyIGNzcyA9IHJlcXVpcmUoICdjc3MnICk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCAndXRpbHMnICk7XG52YXIgZXhwb3NlID0gcmVxdWlyZSggJ2V4cG9zZScgKTtcbnZhciBkaWFsb2cgPSByZXF1aXJlKCAnZGlhbG9nJyApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEZpbGVCcm93c2VyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoIHByb3BzICl7XG5cdFx0c3VwZXIoIHByb3BzICk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdGZpbGVfbGlzdDogW11cblx0XHR9O1xuXG5cdFx0dGhpcy5vbkZpbGVDbGljayA9IGZ1bmN0aW9uKCBmaWxlbmFtZSApe1xuXHRcdFx0dGhpcy5sb2FkRmlsZSggZmlsZW5hbWUgKTtcblx0XHR9LmJpbmQoIHRoaXMgKTtcblxuXHRcdHRoaXMub25DcmVhdGVDbGljayA9ICgpID0+IHtcblx0XHRcdGRpYWxvZy5zaG93X2lucHV0KCBudWxsLCAoIG5hbWUgKSA9PiB7XG5cdFx0XHRcdHZhciBlcnIgPSB0aGlzLmNyZWF0ZUZpbGUoIG5hbWUgKTtcblx0XHRcdFx0aWYoIGVyciApe1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoIGVyciApO1xuXHRcdFx0XHRcdGRpYWxvZy5zaG93X25vdGlmaWNhdGlvbiggZXJyICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5vbkRlbGV0ZUNsaWNrID0gZnVuY3Rpb24oIGZpbGVuYW1lICl7XG5cdFx0XHRkaWFsb2cuc2hvd19jb25maXJtKCAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSBcIicgKyBmaWxlbmFtZSArICdcIj8nLCAoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZGVsZXRlRmlsZSggZmlsZW5hbWUgKTtcblx0XHRcdH0gKTtcblx0XHR9LmJpbmQoIHRoaXMgKTtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucmVmcmVzaEZpbGVMaXN0KCAoKSA9PiB7XG5cdFx0XHR0aGlzLmxvYWRGaWxlKCAnZGVmYXVsdC5qc29uJyApO1xuXHRcdH0gKTtcblx0fVxuXG5cdHJlZnJlc2hGaWxlTGlzdCggY2IgKSB7XG5cdFx0dXRpbHMuZ2V0KCAnL2ZpbGUnLCAoIHJlc3AgKSA9PiB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKCB7XG5cdFx0XHRcdGZpbGVfbGlzdDogcmVzcC5kYXRhXG5cdFx0XHR9ICk7XG5cdFx0XHRpZiggY2IgKXtcblx0XHRcdFx0Y2IoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdH1cblx0bG9hZEZpbGUoIG5hbWUgKSB7XG5cdFx0Y29uc29sZS5sb2coICdMT0FEIEZJTEUnLCBuYW1lICk7XG5cdFx0dXRpbHMuZ2V0KCAnL2ZpbGUvJyArIG5hbWUsICggcmVzcCApID0+IHtcblx0XHRcdGV4cG9zZS5zZXRfc3RhdGUoICdtYWluJywge1xuXHRcdFx0XHRjdXJyZW50X2ZpbGU6IHJlc3AuZGF0YVxuXHRcdFx0fSApO1xuXHRcdH0gKTtcblx0fVxuXHRjcmVhdGVGaWxlKCBuYW1lICkge1xuXHRcdGlmKCBuYW1lLmxlbmd0aCA8IDIgKXtcblx0XHRcdHJldHVybiAnVGhhdCBuYW1lIGlzIHRvbyBzaG9ydCc7XG5cdFx0fVxuXHRcdGlmKCBuYW1lLnNsaWNlKCAtNSApICE9PSAnLmpzb24nICkge1xuXHRcdFx0bmFtZSA9IG5hbWUgKyAnLmpzb24nO1xuXHRcdH1cblx0XHRpZiggdGhpcy5zdGF0ZS5maWxlX2xpc3QuaW5kZXhPZiggbmFtZSApICE9PSAtMSApe1xuXHRcdFx0cmV0dXJuICdBIGZpbGUgd2l0aCB0aGF0IG5hbWUgYWxyZWFkeSBleGlzdHMuJztcblx0XHR9XG5cdFx0dmFyIGZpbGUgPSB7XG5cdFx0XHRuYW1lOiBuYW1lLFxuXHRcdFx0bm9kZXM6IFsge1xuXHRcdFx0XHRpZDogdXRpbHMucmFuZG9tX2lkKCAxMCApLFxuXHRcdFx0XHR0eXBlOiAncm9vdCcsXG5cdFx0XHRcdGNvbnRlbnQ6ICdSb290Jyxcblx0XHRcdFx0dG9wOiAnMjBweCcsXG5cdFx0XHRcdGxlZnQ6ICcyMHB4J1xuXHRcdFx0fSBdLFxuXHRcdFx0bGlua3M6IFtdXG5cdFx0fTtcblx0XHR1dGlscy5wb3N0KCAnL2ZpbGUvJyArIGZpbGUubmFtZSwgZmlsZSwgKCkgPT4ge1xuXHRcdFx0dGhpcy5yZWZyZXNoRmlsZUxpc3QoICgpID0+IHtcblx0XHRcdFx0dGhpcy5sb2FkRmlsZSggbmFtZSApO1xuXHRcdFx0fSApO1xuXHRcdH0gKTtcblx0fVxuXHRkZWxldGVGaWxlKCBuYW1lICl7XG5cdFx0aWYoIG5hbWUgPT09ICdkZWZhdWx0Lmpzb24nICl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHV0aWxzLmRlbCggJy9maWxlLycgKyBuYW1lLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnJlZnJlc2hGaWxlTGlzdCggKCkgPT4ge1xuXHRcdFx0XHRpZiggbmFtZSA9PT0gdGhpcy5wcm9wcy5jdXJyZW50X2ZpbGVfbmFtZSApe1xuXHRcdFx0XHRcdGV4cG9zZS5zZXRTdGF0ZSggJ21haW4nLCB7XG5cdFx0XHRcdFx0XHRjdXJyZW50X2ZpbGU6IG51bGxcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9ICk7XG5cdH1cblxuXHRyZW5kZXIoKXtcblx0XHR2YXIgZWxlbXMgPSB0aGlzLnN0YXRlLmZpbGVfbGlzdC5tYXAoICggZmlsZW5hbWUgKSA9PiB7XG5cdFx0XHRyZXR1cm4gUmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRrZXk6IGZpbGVuYW1lLFxuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcdFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdmaWxlJyxcblx0XHRcdFx0XHRvbkNsaWNrOiB0aGlzLm9uRmlsZUNsaWNrLmJpbmQoIHRoaXMsIGZpbGVuYW1lICksXG5cdFx0XHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogdGhpcy5wcm9wcy5jdXJyZW50X2ZpbGVfbmFtZSA9PT0gZmlsZW5hbWUgPyBjc3MuY29sb3JzLlNFQ09OREFSWSA6IG51bGwsXG5cdFx0XHRcdFx0XHR3aWR0aDogJzg4JScsXG5cdFx0XHRcdFx0XHRwYWRkaW5nOiAnNXB4Jyxcblx0XHRcdFx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0XHRcdFx0Y29sb3I6IGNzcy5jb2xvcnMuVEVYVF9MSUdIVFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0XHRSZWFjdC5ET00uc3Bhbigge1xuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tc2VsZWN0J1xuXHRcdFx0XHRcdH0sIGZpbGVuYW1lIClcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuRE9NLnNwYW4oIHtcblx0XHRcdFx0XHRvbkNsaWNrOiB0aGlzLm9uRGVsZXRlQ2xpY2suYmluZCggdGhpcywgZmlsZW5hbWUgKSxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdmaWxlLWRlbGV0ZScsXG5cdFx0XHRcdH0sIFJlYWN0LkRPTS5zcGFuKCB7IGNsYXNzTmFtZTogJ25vLXNlbGVjdCcgfSwgJ1gnICkgKVxuXHRcdFx0KTtcblx0XHR9ICk7XG5cblx0XHRpZiggIWVsZW1zLmxlbmd0aCApe1xuXHRcdFx0ZWxlbXMgPSBSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0cGFkZGluZzogJzEwcHgnLFxuXHRcdFx0XHRcdGNvbG9yOiBjc3MuY29sb3JzLlRFWFRfTkVVVFJBTFxuXHRcdFx0XHR9XG5cdFx0XHR9LCAnKE5vIEZpbGVzKScgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUmVhY3QuRE9NLmRpdigge1xuXHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjc3MuY29sb3JzLkJHX05FVVRSQUwsXG5cdFx0XHRcdHdpZHRoOiAnMTAwJScsXG5cdFx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0XHR9XG5cdFx0fSwgUmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdGhlaWdodDogJzM2cHgnLFxuXHRcdFx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2NvbmZpcm0tYnV0dG9uJyxcblx0XHRcdFx0XHRvbkNsaWNrOiB0aGlzLm9uQ3JlYXRlQ2xpY2tcblx0XHRcdFx0fSwgJ0NyZWF0ZSBGaWxlJyApXG5cdFx0XHQpLFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXG5cdFx0XHR9LCBlbGVtcyApXG5cdFx0KTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBSZWFjdCA9IHJlcXVpcmUoICdyZWFjdCcgKTtcbnZhciBSZWFjdERPTSA9IHJlcXVpcmUoICdyZWFjdC1kb20nICk7XG52YXIgTWFpbkNvbnRhaW5lciA9IHJlcXVpcmUoICcuL21haW4tY29udGFpbmVyJyApO1xuXG52YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2RpdicgKTtcbmRvY3VtZW50LmJvZHkucHJlcGVuZCggY29udGFpbmVyICk7XG5cbnZhciBNYWluID0gZ2xvYmFsLk1haW4gPSB7fTtcblxudmFyIG1haW5fcHJvcHMgPSB7XG5cdG1haW46IE1haW5cbn07XG5NYWluLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHRSZWFjdERPTS5yZW5kZXIoXG5cdFx0UmVhY3QuY3JlYXRlRWxlbWVudCggTWFpbkNvbnRhaW5lciwgbWFpbl9wcm9wcyApLFxuXHRcdGNvbnRhaW5lclxuXHQpO1xufTtcbk1haW4ucmVuZGVyKCk7XG5cbnZhciBfcmVzaXplX3RpbWVvdXQgPSBudWxsO1xud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdyZXNpemUnLCBmdW5jdGlvbigpIHtcblx0aWYoIF9yZXNpemVfdGltZW91dCAhPT0gbnVsbCApIHtcblx0XHRjbGVhclRpbWVvdXQoIF9yZXNpemVfdGltZW91dCApO1xuXHR9XG5cdF9yZXNpemVfdGltZW91dCA9IHNldFRpbWVvdXQoIE1haW4ucmVuZGVyLCAxMDAgKTtcbn0gKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0ID0gcmVxdWlyZSggJ3JlYWN0JyApO1xudmFyIGV4cG9zZSA9IHJlcXVpcmUoICcuL2V4cG9zZScgKTtcbnZhciBjc3MgPSByZXF1aXJlKCAnY3NzJyApO1xuXG52YXIgRmlsZUJyb3dzZXIgPSByZXF1aXJlKCAnLi9maWxlLWJyb3dzZXInICk7XG52YXIgQm9hcmQgPSByZXF1aXJlKCAnLi9ib2FyZCcgKTtcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNYWluQ29udGFpbmVyIGV4dGVuZHMgZXhwb3NlLkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCBwcm9wcyApIHtcblx0XHRzdXBlciggcHJvcHMgKTtcblx0XHR0aGlzLmV4cG9zZSggJ21haW4nICk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdGN1cnJlbnRfZmlsZTogbnVsbFxuXHRcdH07XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIFJlYWN0LkRPTS5kaXYoIHtcblx0XHRcdFx0Y2xhc3NOYW1lOiAnbm8tZHJhZycsXG5cdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYXJvdW5kJyxcblx0XHRcdFx0XHRoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCArICdweCcsXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBjc3MuY29sb3JzLlNFQ09OREFSWVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0UmVhY3QuRE9NLmRpdigge1xuXHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdHdpZHRoOiAnY2FsYyggMTAwJSAtIDIwMHB4ICknLFxuXHRcdFx0XHRcdGhlaWdodDogJzEwMCUnLFxuXHRcdFx0XHRcdG92ZXJmbG93OiAnaGlkZGVuJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LCB0aGlzLnN0YXRlLmN1cnJlbnRfZmlsZSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoIEJvYXJkLCB7XG5cdFx0XHRcdGZpbGU6IHRoaXMuc3RhdGUuY3VycmVudF9maWxlXG5cdFx0XHR9ICkgOiBudWxsICksXG5cdFx0XHRSZWFjdC5ET00uZGl2KCB7XG5cdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0d2lkdGg6ICcyMDBweCcsXG5cdFx0XHRcdFx0aGVpZ2h0OiAnMTAwJSdcblx0XHRcdFx0fVxuXHRcdFx0fSwgUmVhY3QuY3JlYXRlRWxlbWVudCggRmlsZUJyb3dzZXIsIHtcblx0XHRcdFx0Y3VycmVudF9maWxlX25hbWU6IHRoaXMuc3RhdGUuY3VycmVudF9maWxlID8gdGhpcy5zdGF0ZS5jdXJyZW50X2ZpbGUubmFtZSA6IG51bGxcblx0XHRcdH0gKSApXG5cdFx0KTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1vdXNlX3ggPSAwO1xudmFyIG1vdXNlX3kgPSAwO1xudmFyIHNoaWZ0ID0gZmFsc2U7XG52YXIgY3RybCA9IGZhbHNlO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggJ21vdXNlbW92ZScsICggZXYgKSA9PiB7XG5cdG1vdXNlX3ggPSBldi5jbGllbnRYO1xuXHRtb3VzZV95ID0gZXYuY2xpZW50WTtcbn0gKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdrZXlkb3duJywgKCBldiApID0+IHtcblx0aWYoIGV2LmtleUNvZGUgPT09IDE3ICkge1xuXHRcdGN0cmwgPSB0cnVlO1xuXHR9IGVsc2UgaWYoIGV2LmtleUNvZGUgPT09IDE2ICl7XG5cdFx0c2hpZnQgPSB0cnVlO1xuXHR9XG59ICk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAna2V5dXAnLCAoIGV2ICkgPT4ge1xuXHRpZiggZXYua2V5Q29kZSA9PT0gMTcgKSB7XG5cdFx0Y3RybCA9IGZhbHNlO1xuXHR9IGVsc2UgaWYoIGV2LmtleUNvZGUgPT09IDE2ICl7XG5cdFx0c2hpZnQgPSBmYWxzZTtcblx0fVxufSApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Z2V0Q3VycmVudFRpbWU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiArKCBuZXcgRGF0ZSgpICk7XG5cdH0sXG5cdHJhbmRvbV9pZDogZnVuY3Rpb24oIGxlbiApIHtcblx0XHR2YXIgdGV4dCA9ICcnO1xuXHRcdHZhciBwb3NzaWJsZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWdrbG1ub3BxcnN0dWZ3eHl6Jztcblx0XHRmb3IoIHZhciBpID0gMDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0dGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGggKSApO1xuXHRcdH1cblx0XHRyZXR1cm4gdGV4dDtcblx0fSxcblx0bm9ybWFsaXplOiBmdW5jdGlvbiggeCwgQSwgQiwgQywgRCApIHtcblx0XHRyZXR1cm4gQyArICggeCAtIEEgKSAqICggRCAtIEMgKSAvICggQiAtIEEgKTtcblx0fSxcblx0Z2V0X3JhbmRvbV92YWx1ZV9mcm9tX2FycmF5OiBmdW5jdGlvbiggYXJyICl7XG5cdFx0dmFyIGluZCA9IE1hdGguZmxvb3IoIG1vZHVsZS5leHBvcnRzLm5vcm1hbGl6ZSggTWF0aC5yYW5kb20oKSwgMCwgMSwgMCwgYXJyLmxlbmd0aCApICk7XG5cdFx0cmV0dXJuIGFyclsgaW5kIF07XG5cdH0sXG5cdGluQXJyOiBmdW5jdGlvbiggeCwgYXJyICkge1xuXHRcdGZvciggdmFyIGkgaW4gYXJyICkge1xuXHRcdFx0aWYoIHggPT0gYXJyWyBpIF0gKSB7IC8vZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblx0aW5fcmVjdGFuZ2xlOiBmdW5jdGlvbiggeCwgeSwgcngsIHJ5LCBydywgcmggKSB7XG5cdFx0cmV0dXJuICggeCA+PSByeCAmJiB4IDw9IHJ4ICsgcncgKSAmJiAoIHkgPj0gcnkgJiYgcnkgPD0gcnggKyByaCApO1xuXHR9LFxuXHR0b19yYXRpbzogZnVuY3Rpb24oIHVzZWNvbmRzICkge1xuXHRcdHJldHVybiB1c2Vjb25kcyAvIDEwMDAwMDA7XG5cdH0sXG5cdHRvX21pY3JvX3NlY29uZHM6IGZ1bmN0aW9uKCBtcyApIHtcblx0XHRyZXR1cm4gTWF0aC5yb3VuZCggbXMgKiAxMDAwICk7XG5cdH0sXG5cdHRvX3JhZGlhbnM6IGZ1bmN0aW9uKCBkZWdyZWVzICkge1xuXHRcdHJldHVybiAoIGRlZ3JlZXMgLyAxODAuMCApICogTWF0aC5QSTtcblx0fSxcblx0dG9fZGVncmVlczogZnVuY3Rpb24oIHJhZGlhbnMgKSB7XG5cdFx0cmV0dXJuICggcmFkaWFucyAqIDE4MC4wICkgLyBNYXRoLlBJO1xuXHR9LFxuXHRoZXhfdG9fYXJyYXk6IGZ1bmN0aW9uKCBoZXggKSB7XG5cdFx0cmV0dXJuIFtcblx0XHRcdGhleC5zdWJzdHJpbmcoIDEsIDMgKSxcblx0XHRcdGhleC5zdWJzdHJpbmcoIDMsIDUgKSxcblx0XHRcdGhleC5zdWJzdHJpbmcoIDUsIDcgKSxcblx0XHRcdGhleC5zdWJzdHJpbmcoIDcsIDkgKVxuXHRcdF0ubWFwKCBmdW5jdGlvbiggX2NvbG9yLCBpICkge1xuXHRcdFx0dmFyIGNvbG9yID0gcGFyc2VJbnQoIF9jb2xvciwgMTYgKTtcblx0XHRcdGlmKCBpID09PSAzICkge1xuXHRcdFx0XHRjb2xvciA9IGlzTmFOKCBjb2xvciApID8gMSA6ICggY29sb3IgLyAyNTUgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBjb2xvcjtcblx0XHR9ICk7XG5cdH0sXG5cdGhleF90b19SR0JBOiBmdW5jdGlvbiggaGV4ICkge1xuXHRcdHZhciBhcnIgPSB0aGlzLmhleF90b19hcnJheSggaGV4ICk7XG5cdFx0cmV0dXJuICdyZ2JhKCcgKyBhcnIuam9pbiggJywnICkgKyAnKSc7XG5cdH0sXG5cdGFycmF5X3RvX2hleDogZnVuY3Rpb24oIGFyciApIHtcblx0XHRpZiggIUFycmF5Lmluc3RhbmNlT2YoIGFyciApICkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0dmFyIF9jb252ZXJ0ID0gZnVuY3Rpb24oIGMsIGkgKSB7XG5cdFx0XHRpZiggaSA9PT0gMyApIHtcblx0XHRcdFx0YyA9IE1hdGgucm91bmQoIGMgKiAyNTUgKTtcblx0XHRcdH1cblx0XHRcdHZhciBoZXggPSBOdW1iZXIoIGMgKS50b1N0cmluZyggMTYgKTtcblx0XHRcdHJldHVybiBoZXgubGVuZ3RoIDwgMiA/ICcwJyArIGhleCA6IGhleDtcblx0XHR9O1xuXHRcdHJldHVybiAnIycgKyBhcnIubWFwKCBfY29udmVydCApLmpvaW4oICcnICk7XG5cdH0sXG5cdHJnYl90b19oZXg6IGZ1bmN0aW9uKCByZ2IsIGcsIGIgKSB7XG5cdFx0dmFyIF9kaWdpdCA9IGZ1bmN0aW9uKCBkICkge1xuXHRcdFx0ZCA9IHBhcnNlSW50KCBkICkudG9TdHJpbmcoIDE2ICk7XG5cdFx0XHR3aGlsZSggZC5sZW5ndGggPCAyICkge1xuXHRcdFx0XHRkID0gJzAnICsgZDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkO1xuXHRcdH07XG5cdFx0aWYoIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHR2YXIgbSA9IHJnYi5tYXRjaCggL3JnYmFcXCgoXFxkezEsM30pLChcXGR7MSwzfSksKFxcZHsxLDN9KVxcKS8gKTtcblx0XHRcdGlmKCAhbSApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coICdVbnBhcnNhYmxlIGNvbG9yOicsIHJnYiApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuICcjJyArIG0uc2xpY2UoIDEsIDQgKS5tYXAoIF9kaWdpdCApLmpvaW4oICcnICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmKCBhcmd1bWVudHMubGVuZ3RoID09PSAzICkge1xuXHRcdFx0cmV0dXJuICcjJyArIF9kaWdpdCggcmdiICkgKyBfZGlnaXQoIGcgKSArIF9kaWdpdCggYiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gJyMwMDAwMDAnO1xuXHRcdH1cblx0fSxcblx0Z2V0X21vdXNlX3Bvcygpe1xuXHRcdHJldHVybiB7XG5cdFx0XHR4OiBtb3VzZV94LFxuXHRcdFx0eTogbW91c2VfeVxuXHRcdH07XG5cdH0sXG5cdGlzX3NoaWZ0KCl7XG5cdFx0cmV0dXJuIHNoaWZ0O1xuXHR9LFxuXHRpc19jdHJsKCl7XG5cdFx0cmV0dXJuIGN0cmw7XG5cdH0sXG5cdGdldDogZnVuY3Rpb24oIHVybCwgY2IgKSB7XG5cdFx0dmFyIG9wdHMgPSB7XG5cdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0aGVhZGVyczoge31cblx0XHR9O1xuXHRcdHZhciBpbml0aWFsX3RpbWUgPSArKCBuZXcgRGF0ZSgpICk7XG5cdFx0ZmV0Y2goIHVybCwgb3B0cyApLnRoZW4oIGZ1bmN0aW9uKCByZXNwb25zZSApe1xuXHRcdFx0cmVzcG9uc2UuanNvbigpLnRoZW4oIGZ1bmN0aW9uKCBkICl7XG5cdFx0XHRcdGlmKCBkLmVyciApe1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3InLCBkLmVyciwgdXJsICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2IoIGQsICsoIG5ldyBEYXRlKCkgKSAtIGluaXRpYWxfdGltZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApLmNhdGNoKCAoIGVyciApID0+IHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoICdGZXRjaCBHRVQgRXJyb3InLCBlcnIsIHVybCApO1xuXHRcdH0gKTtcblx0fSxcblx0ZGVsOiBmdW5jdGlvbiggdXJsLCBjYiApIHtcblx0XHR2YXIgb3B0cyA9IHtcblx0XHRcdG1ldGhvZDogJ0RFTEVURScsXG5cdFx0XHRoZWFkZXJzOiB7fVxuXHRcdH07XG5cdFx0dmFyIGluaXRpYWxfdGltZSA9ICsoIG5ldyBEYXRlKCkgKTtcblx0XHRmZXRjaCggdXJsLCBvcHRzICkudGhlbiggZnVuY3Rpb24oIHJlc3BvbnNlICl7XG5cdFx0XHRyZXNwb25zZS5qc29uKCkudGhlbiggZnVuY3Rpb24oIGQgKXtcblx0XHRcdFx0aWYoIGQuZXJyICl7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvciggJ0ludGVybmFsIFNlcnZlciBFcnJvcicsIGQuZXJyLCB1cmwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYiggZCwgKyggbmV3IERhdGUoKSApIC0gaW5pdGlhbF90aW1lICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9ICkuY2F0Y2goICggZXJyICkgPT4ge1xuXHRcdFx0Y29uc29sZS5lcnJvciggJ0ZldGNoIERFTCBFcnJvcicsIGVyciwgdXJsICk7XG5cdFx0fSApO1xuXHR9LFxuXHRwb3N0OiBmdW5jdGlvbiggdXJsLCBkYXRhLCBjYiApIHtcblx0XHR2YXIgb3B0cyA9IHtcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoIGRhdGEgKSxcblx0XHRcdGhlYWRlcnM6IHt9XG5cdFx0fTtcblx0XHR2YXIgaW5pdGlhbF90aW1lID0gKyggbmV3IERhdGUoKSApO1xuXHRcdGZldGNoKCB1cmwsIG9wdHMgKS50aGVuKCBmdW5jdGlvbiggcmVzcG9uc2UgKXtcblx0XHRcdHJlc3BvbnNlLmpzb24oKS50aGVuKCBmdW5jdGlvbiggZCApe1xuXHRcdFx0XHRpZiggZC5lcnIgKXtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKCAnSW50ZXJuYWwgU2VydmVyIEVycm9yJywgZC5lcnIsIHVybCApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNiKCBkLCArKCBuZXcgRGF0ZSgpICkgLSBpbml0aWFsX3RpbWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0gKS5jYXRjaCggKCBlcnIgKSA9PiB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCAnRmV0Y2ggUE9TVCBFcnJvcicsIGVyciwgdXJsICk7XG5cdFx0fSApO1xuXHR9XG59O1xuXG53aW5kb3cudXRpbHMgPSBtb2R1bGUuZXhwb3J0cztcbiJdfQ==
