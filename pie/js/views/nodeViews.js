var NodeView = Backbone.View.extend({
	model: Node,
	className: "node",

	initialize: function(){
		this.inGrid = false;  // whether the node is in the grid

		// trap when the mode has changed
		Pie.events.on("modeChanged", $.proxy(this.resetDragging, this));
	},

	setInGrid: function(){
		this.inGrid = true;
		this.resetDragging();
	},

	setOffGrid: function(){
		this.inGrid = false;
		this.resetDragging();
	},

	resetDragging: function(){
		if (Pie.mode == "editingNodes"){
			// if this node is in the grid, disable dragging;
			// otherwise, enable dragging
			if (this.inGrid){
				this.disableDragging();
			}else{
				this.enableDragging();
			}
		}else if (Pie.mode == "connectingNodes"){
			this.disableDragging();
		}else{
			console.err("Unexpected Mode.")
		}
	},

	enableDragging: function(){
		this.$el.draggable("enable");
	},

	disableDragging: function(){
		this.$el.draggable("disable");
	},

	render: function(){
		this.$el.html(this.template(this.model.toJSON()));
		this.$el.data("nodeView", this);

		var nodeView = this;
		this.$el.draggable({
			helper: "clone",
		});

		return this;
	},

	template: _.template(
		'<div>N: <%= name %></div>' +
		'<div>S: <%= sourceEndpointNum %></div>' +
		'<div>T: <%= targetEndpointNum %></div>'
	),
});

var NodeCollectionView = Backbone.View.extend({
	collection: NodeCollection,
	className: "nodeCollection",
	events: {
		
	},

	initialize: function(){
	},

	addOne: function(m){
		var nv = new NodeView({model: m});
		m.nodeView = nv;
		this.$el.append(nv.render().el);
	},

	render: function(){
		this.$el.html();
		this.collection.forEach(this.addOne, this);
		return this;
	},
});

var NodeGridBoxView = Backbone.View.extend({
	model: Node,
	className: "nodeGridBox",
	events: {
		"click": "clicked",
		"click .removeGridBoxBtn": "removeClicked",
	},

	initialize: function(options){
		this.options = options;

		if (this.model){
			this.bindModel();
		}

		// trigger when the mode has changed or a node has been selected
		Pie.events.on("modeChanged", $.proxy(this.modeChanged, this));
		Pie.events.on("nodeSelectionCompleted", $.proxy(this.removeAllDecorativeClasses, this));
	},

	modeChanged: function(){
		this.removeAllDecorativeClasses();
		this.toggleRemoveBtn();
		this.toggleGrabCursor();
	},

	bindModel: function(){
		this.model.on("change:selected", this.render, this);
		this.model.collection.on("change:selected", this.toggleConnectionClass, this);
	},

	toggleConnectionClass: function(event){
		// add the connection class to node with connect to this node
		// or can be connect to this node
		if (this.model != undefined){

			// if the selected node is this node; 
			// Or the selected node cant have more connection
			// Or the selected node is the 2nd selected node, do nothing
			if (this.model.cid == event.cid) return;
			if (event.collection.selectedNodes().length == 2) return;

			// if this node is connected to the selected node
			if (this.model.hasConnectionWith(event.cid)){
				this.$el.addClass('canDisconnect');

			// if this node can have more connection
			}else if (this.model.targetsLeft() > 0 && event.sourcesLeft() > 0){
				this.$el.addClass('canConnect');
			}else{
				this.$el.addClass('disabled');
			}
		}
	},

	unbindModel: function(){
		this.model.off("change:selected");
	},

	// connect to the given node as a source
	connectTo: function(el){
		Pie.jsPlumb.connect({
		  source: this.el,
		  target: el,
		  detachable:false,
		},
		{
			anchors: ["Right", "Left"],
			connector: [ "Bezier", { curviness: 50 } ],
		});
	},

	checkAllConnections: function(){
		var allConnections = Pie.jsPlumb.getConnections();
		var sourceConnections = allConnections.filter(function(c){
			// if (c.source)
		});
		// check the sources

		// chekc the targets
	},

	setModel: function(model){
		this.model = model;
		this.model._gridView = this;
		this.bindModel();
		this.render();
	},

	toggleSelectedClass: function(){
		if (this.model.get("selected")){
			this.$el.addClass("selected");
		}else{
			this.$el.removeClass("selected");
		}
	},

	removeSelectedClass: function(){
		// if (this.model.get("selected")){
			this.$el.removeClass("selected");
		// }else{
		// 	this.$el.removeClass("selected");
		// }
	},

	droppableOver: function(){
		this.$el.addClass("droppableOver");
	},

	droppableOut: function(){
		this.$el.removeClass("droppableOver")
	},

	removeAllDecorativeClasses: function(){
		this.$el.removeClass("droppableOver selected removing canConnect canDisconnect disabled");
	},

	// remove the node from this grid
	removeNode: function(){
		// if there is a model in this grid
		if ((typeof this.model) == "object"){
			this.model.nodeView.setOffGrid();
			this.model = undefined;

			this.render();
		}

		this.$el.removeData("nodeGridView");
	},

	removeClicked: function(event){
		event.stopPropagation();
		var c = confirm("Removing this node would destroy all of the connections. Continue?")
		if (c){
			this.model.disconnectAllConnections();
			this.removeNode();
		}

		return false;
	},

	clicked: function(){
		if (Pie.mode == "connectingNodes"){
			if (this.model != undefined){
				// whether the user clicked the selected node to cancel selection
				if (this.model.get('selected')){
					this.model.resetSelected();

					Pie.events.trigger("nodeSelectionCompleted");

				// new selection
				}else{
					var selectedNodes = this.model.collection.selectedNodes();
					var validated = false;  // whether to make this node a selected

					// check whether this node is gonna be a source of a target
					if (selectedNodes.length == 0){  // a source
						if (this.model.get('connectTo').length < this.model.get('sourceEndpointNum')){
							validated = true;
						}
					}else if (selectedNodes.length == 1){  // a target
						if (this.model.get('connectBy').length < this.model.get('targetEndpointNum')){
							validated = true;
						}
					}else{  // an error
						console.err("illegal number of node selected");
					}

					this.model.setSelected();

					Pie.events.trigger("nodeSelected", this);
				}
			}
		}else if (Pie.mode == "editingNodes"){
		}else{
			console.err("Unexpected Mode.")
		}
	},

	// show the remove btn in editing mode; not show otherwish
	toggleRemoveBtn: function(){
		if (Pie.mode == "editingNodes"){
			this.$('.removeGridBoxBtn').show();
		}else{
			this.$('.removeGridBoxBtn').hide();
		}
	},

	// show the grab cursor in editing mode
	toggleGrabCursor: function(){
		if (Pie.mode == "editingNodes"){
			this.$el.addClass("grabCursor");
		}else{
			this.$el.removeClass("grabCursor");
		}
	},

	render: function(){
		// detach all connection to this node
		Pie.jsPlumb.detachAllConnections(this.el);

		// set this view's id
		this.$el.attr('id', this.options.id);

		// this.resetDragAndDrop();
		this.removeAllDecorativeClasses();

		// if there is a model in this grid
		if ((typeof this.model) == "object"){
			this.$el.html(this.template(this.model.toJSON()));

			var connectToArray = this.model.get("connectTo");

			for (var i = 0; i < connectToArray.length; i++){
				this.connectTo(this.model.collection.get(connectToArray[i])._gridView.el);
			}

			var connectByArray = this.model.get("connectBy");

			for (var i = 0; i < connectByArray.length; i++){
				this.model.collection.get(connectByArray[i])._gridView.connectTo(this.el);
			}

			// decorations
			this.$el.addClass('hasNode');
			this.toggleRemoveBtn();
			this.toggleGrabCursor();
			this.toggleSelectedClass();

		// no node in this grid
		}else{
			this.$el.empty();
			this.$el.removeClass('hasNode');
		}

		// enable droppable if there is no node in this grid
		var curGridView = this;
		// if (this.model == undefined){
			var curGridView = this;
			this.$el.droppable({
				accept: ".node, .nodeGridBox.hasNode",
				tolerance: "pointer",
				over: function(){
					// accept a node when its in editing mode and this grid view has no node
					if(Pie.mode=="editingNodes" && !curGridView.$el.hasClass('hasNode')){
						curGridView.droppableOver();
					}
				},
				out: function(){
					// accept a node when its in editing mode and this grid view has no node
					if(Pie.mode=="editingNodes" && !curGridView.$el.hasClass('hasNode')){
						curGridView.droppableOut();
					}
				},
				drop: function(event, ui){
					// accept a node when its in editing mode and this grid view has no node
					if(Pie.mode=="editingNodes" && !curGridView.$el.hasClass('hasNode')){
						// moving into this view from outside grid
						if (ui.draggable.hasClass('node')){
							// get the current dragging view
							var nodeView = ui.draggable.data("nodeView");

							// disable the nodeView from dragging
							nodeView.setInGrid();

							// add the node to the grid view
							curGridView.setModel(nodeView.model);

						// moving into this view from andother grid view
						}else if (ui.draggable.hasClass('nodeGridBox')){
							// get the current dragging view
							var nodeGridView = ui.draggable.data("nodeGridView");
							var nodeModel = nodeGridView.model;
							var nodeView = nodeModel.nodeView;

							nodeGridView.removeNode();

							// disable the nodeView from dragging
							nodeView.setInGrid();

							// add the node to the grid view
							curGridView.setModel(nodeView.model);
						}

						return true;
					}else{
						return false;
					}
				},
			});

		// disable droppable if there is a node in this grid
		// }else{
			// FIXME
			this.$el.data("nodeGridView", this);

			this.$el.draggable({
				helper: "clone",
				start: function(){
					curGridView.$el.addClass('removing');
				},
				stop: function(){
					curGridView.$el.removeClass('removing');
				},

				// enable dragging when editing mode is on and this grid has a node
				drag: function(event, ui) { 
					if(Pie.mode=="editingNodes" && curGridView.$el.hasClass('hasNode')) return true;
					else return false;
				}
			});
		// }

		return this;
	},


	template: _.template(
		'<div class="removeGridBoxBtn">X</div>' +
		'<div>N: <%= name %></div>' +
		'<div>S: <%= sourceEndpointNum %></div>' +
		'<div>T: <%= targetEndpointNum %></div>'
	),
});

var NodeGridBoxCollectionView = Backbone.View.extend({
	className: "nodeGridBoxCollection",
	collection: NodeCollection,
	events: {
	},

	initialize: function(){
		Pie.events.on("nodeSelected", this.setConnection, this);
	},

	setConnection: function(){
		var selectedNodes = this.collection.selectedNodes();

		// connection/disconnection whene there are 2 nodes selected
		if (selectedNodes.length == 2){
			var status = this.collection.setConnection();

			// unable to finish connection/disconnection
			if (status.code == -1){
				alert(status.message);
			}

			if (status.nodes != undefined){
				// remove selected attribute from the nodes involved
				status.nodes.forEach(function(node){
					node.resetSelected();
				})
			}

			Pie.events.trigger("nodeSelectionCompleted");
		}
	},

	render: function(){
		this.$el.html();
		// make 32 grid box
		for (var i=0; i< 32; i++){
			this.$el.append(new NodeGridBoxView({model: undefined, id: "nodeGridBox" + i}).render().el);
		}
		return this;
	},
});