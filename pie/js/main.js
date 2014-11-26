// the global object
Pie = {
	mode: "editingNodes",  // 2 modes: editingNodes, connectingNodes
	events: _.extend({}, Backbone.Events),  // global events
	jsPlumb: null,
};


$(document).ready(function(){
	// interval to wait till jsplumb is ready
	var jsPlumbInterval = setInterval(function(){
		if (Pie.jsPlumb != null){
			// clear the jsPlumb interval when ready
			clearInterval(jsPlumbInterval);

			// event for changing mode, where there's a change in mode, save the mode in global Pie
			$('input[name="mode"]:radio').change(function(){
				Pie.mode = $('input[name="mode"]:radio:checked').val();
				Pie.events.trigger("modeChanged");
			});

			// populate the node collection
			var nodes = [];
			for (var i = 1; i <= 5; i++){
				nodes.push({
					name: i+"", 
					sourceEndpointNum: Math.floor(Math.random() * (4)),
					targetEndpointNum: Math.floor(Math.random() * (4)),
				});
			}
			Pie.nodeCollection = new NodeCollection(nodes);

			Pie.nodeCollectionView = new NodeCollectionView({collection: Pie.nodeCollection});
			Pie.nodeGridBoxCollectionView = new NodeGridBoxCollectionView({collection: Pie.nodeCollection});

			Pie.nodeCollectionView.render().$el.insertBefore($('#nodeGridContainer'))
			$('#nodeGridContainer').append(Pie.nodeGridBoxCollectionView.render().el);
		}
	}, 200);
});

// create a jsPlumb instance to draw connections
jsPlumb.bind("ready", function() {
	Pie.jsPlumb = jsPlumb.getInstance({  // the jsPlumb instance to draw connections
        // Anchors: ["Left", ],
		// default drag options
		// DragOptions : { cursor: 'pointer', zIndex:2000 },
		// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
		// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
		ConnectionOverlays : [
			[ "Arrow", { location:1 } ],
			[ "Label", { 
				location:0.1,
				id:"label",
				cssClass:"aLabel"
			}]
		],
		Container:"nodeGridContainer"
	})
});

// some code for making endpoints
	// var instance = jsPlumb.getInstance({
 //        Anchors: ["Left", ],
	// 	// default drag options
	// 	DragOptions : { cursor: 'pointer', zIndex:2000 },
	// 	// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
	// 	// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
	// 	ConnectionOverlays : [
	// 		[ "Arrow", { location:1 } ],
	// 		[ "Label", { 
	// 			location:0.1,
	// 			id:"label",
	// 			cssClass:"aLabel"
	// 		}]
	// 	],
	// 	Container:"body"
	// });

	// instance.addEndpoint("d1", { isTarget:true, })
	// instance.addEndpoint("d2", { isSource:true, })