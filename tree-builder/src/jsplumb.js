'use strict';

var jsPlumbToolkit = window.jsPlumbToolkit;
var jsPlumbToolkitUtil = window.jsPlumbToolkitUtil;

exports.init = function() {

	jsPlumbToolkit.ready( function() {
		var toolkit = jsPlumbToolkit.newInstance( {
			idFunction: ( n ) => {
				return n.id;
			},
			typeFunction: ( n ) => {
				return n.type;
			},
			nodeFactory: function( type, data, cb ) {
				data.id = jsPlumbToolkitUtil.uuid();
				cb( data );
			},
			beforeStartConnect: function( node /*, edgeType*/ ) {
				// limit edges from start node to 1. if any other type of node, return
				return ( node.data.type === 'start' && node.getEdges().length > 0 ) ? false : { label: '...' };
			}
		} );

		toolkit.render( {
			container: document.getElementById( 'jtk-demo-canvas' ),
			view: {
				nodes: {
					'start': {
						template: 'tmplStart'
					},
					'selectable': {
						events: {
							tap: function( params ) {
								toolkit.toggleSelection( params.node );
							}
						}
					},
					'table': {
						template: 'tmplTable'
					},
					'question': {
						parent: 'selectable',
						template: 'tmplQuestion'
					},
					'action': {
						parent: 'selectable',
						template: 'tmplAction'
					},
					'output': {
						parent: 'selectable',
						template: 'tmplOutput'
					}
				},
				edges: {
					'default': {
						anchor: [ 'Top', 'Bottom' ],
						endpoint: 'Blank',
						connector: [ 'Flowchart', { cornerRadius: 5 } ],
						paintStyle: { strokeWidth: 2, stroke: '#f76258', outlineWidth: 3, outlineStroke: 'transparent' }, //	paint style for this edge type.
						hoverPaintStyle: { strokeWidth: 2, stroke: 'rgb(67,67,67)' }, // hover paint style for this edge type.
						events: {
							'dblclick': function() {}
						},
						overlays: [
						[ 'Arrow', { location: 1, width: 10, length: 10 } ],
						[ 'Arrow', { location: 0.3, width: 10, length: 10 } ]
					]
					}
				},
				ports: {
					'start': {
						edgeType: 'default'
					},
					'source': {
						maxConnections: -1,
						edgeType: 'default'
					},
					'target': {
						maxConnections: -1,
						isTarget: true
					}
				}
			},
			layout: {
				type: 'Absolute'
			},
			events: {
				canvasClick: function() {
					toolkit.clearSelection();
				},
				edgeAdded: function() {},
				nodeDropped: function() {}
			},
			miniview: {
				container: document.getElementById( 'miniview' )
			},
		} );

		toolkit.load( {
			data: {
				"nodes": [ {
					"id": "book",
					"name": "Book",
					"type": "table",
					"columns": [
						{
							"id": "id",
							"datatype": "integer",
							"primaryKey": true
						},
						{
							"id": "isbn",
							"datatype": "varchar"
						},
						{
							"id": "title",
							"datatype": "varchar"
						} ]
				} ]
			}
		} );
	} );
};
