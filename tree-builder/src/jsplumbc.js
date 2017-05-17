var minScale = 0.4;
var maxScale = 2;
var incScale = 0.1;
var plumb = null;
var $container = $( ".container" );
$diagram = $container.find( ".diagram" );
var $panzoom = null;
var links = [
	{ from: "i0", to: "i1" },
	{ from: "i1", to: "i11" },
	{ from: "i1", to: "i12" },
	{ from: "i0", to: "i2" },
	{ from: "i2", to: "i21" },
	{ from: "i0", to: "i3" },
];

jsPlumb.ready( function() {
	plumb = jsPlumb.getInstance( {
		PaintStyle: { strokeWidth: 1 },
		Anchors: [ [ "Left", "Right", "Bottom" ], [ "Top", "Bottom" ] ],
		Container: $diagram,
	} );
	_.each( links, function( link ) {
		plumb.connect( {
			source: link.from,
			target: link.to,
			connector: [ "Flowchart",
				{
					cornerRadius: 3,
					stub: 16
        }
       ],
			endpoints: [ "Blank", "Blank" ],
			overlays: [ [ "Arrow", { location: 1, width: 10, length: 10 } ] ],
		} );
	} );
	var dg = new dagre.graphlib.Graph();
	dg.setGraph( { nodesep: 30, ranksep: 30, marginx: 50, marginy: 50 } );
	dg.setDefaultEdgeLabel( function() { return {}; } );
	$container.find( ".item" ).each(
		function( idx, node ) {
			var $n = $( node );
			var box = {
				width: Math.round( $n.outerWidth() ),
				height: Math.round( $n.outerHeight() )
			};
			dg.setNode( $n.attr( 'id' ), box );
		}
	);
	plumb.getAllConnections()
		.forEach( function( edge ) { dg.setEdge( edge.source.id, edge.target.id ); } );
	dagre.layout( dg );
	var graphInfo = dg.graph();
	dg.nodes().forEach(
		function( n ) {
			var node = dg.node( n );
			var top = Math.round( node.y - node.height / 2 ) + 'px';
			var left = Math.round( node.x - node.width / 2 ) + 'px';
			$( '#' + n ).css( { left: left, top: top } );
		} );
	plumb.repaintEverything();
	_.defer( function() {
		$panzoom = $container.find( '.panzoom' ).panzoom( {
				minScale: minScale,
				maxScale: maxScale,
				increment: incScale,
				cursor: "",
				ignoreChildrensEvents: true,
			} ).on( "panzoomstart", function( e, pz, ev ) {
				$panzoom.css( "cursor", "move" );
			} )
			.on( "panzoomend", function( e, pz ) {
				$panzoom.css( "cursor", "" );
			} );
		$panzoom.parent()
			.on( 'mousewheel.focal', function( e ) {
				if ( e.ctrlKey || e.originalEvent.ctrlKey ) {
					e.preventDefault();
					var delta = e.delta || e.originalEvent.wheelDelta;
					var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
					$panzoom.panzoom( 'zoom', zoomOut, {
						animate: true,
						exponential: false,
					} );
				} else {
					e.preventDefault();
					var deltaY = e.deltaY || e.originalEvent.wheelDeltaY || ( -e.originalEvent.deltaY );
					var deltaX = e.deltaX || e.originalEvent.wheelDeltaX || ( -e.originalEvent.deltaX );
					$panzoom.panzoom( "pan", deltaX / 2, deltaY / 2, {
						animate: true,
						relative: true,
					} );
				}
			} )
			.on( "mousedown touchstart", function( ev ) {
				var matrix = $container.find( ".panzoom" ).panzoom( "getMatrix" );
				var offsetX = matrix[ 4 ];
				var offsetY = matrix[ 5 ];
				var dragstart = { x: ev.pageX, y: ev.pageY, dx: offsetX, dy: offsetY };
				$( ev.target ).css( "cursor", "move" );
				$( this ).data( 'dragstart', dragstart );
			} )
			.on( "mousemove touchmove", function( ev ) {
				var dragstart = $( this ).data( 'dragstart' );
				if ( dragstart ) {
					var deltaX = dragstart.x - ev.pageX;
					var deltaY = dragstart.y - ev.pageY;
					var matrix = $container.find( ".panzoom" ).panzoom( "getMatrix" );
					matrix[ 4 ] = parseInt( dragstart.dx ) - deltaX;
					matrix[ 5 ] = parseInt( dragstart.dy ) - deltaY;
					$container.find( ".panzoom" ).panzoom( "setMatrix", matrix );
				}
			} )
			.on( "mouseup touchend touchcancel", function( ev ) {
				$( this ).data( 'dragstart', null );
				$( ev.target ).css( "cursor", "" );
			} );
	} );
	var currentScale = 1;
	$container.find( ".diagram .item" ).draggable( {
		start: function( e ) {
			var pz = $container.find( ".panzoom" );
			currentScale = pz.panzoom( "getMatrix" )[ 0 ];
			$( this ).css( "cursor", "move" );
			pz.panzoom( "disable" );
		},
		drag: function( e, ui ) {
			ui.position.left = ui.position.left / currentScale;
			ui.position.top = ui.position.top / currentScale;
			if ( $( this ).hasClass( "jsplumb-connected" ) ) {
				plumb.repaint( $( this ).attr( 'id' ), ui.position );
			}
		},
		stop: function( e, ui ) {
			var nodeId = $( this ).attr( 'id' );
			if ( $( this ).hasClass( "jsplumb-connected" ) ) {
				plumb.repaint( nodeId, ui.position );
			}
			$( this ).css( "cursor", "" );
			$container.find( ".panzoom" ).panzoom( "enable" );
		}
	} );
} );
