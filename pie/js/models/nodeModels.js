var Node = Backbone.Model.extend({
	defaults: function() {
		return {
			name: "",
			sourceEndpointNum: 0,
			targetEndpointNum: 0,

			selected: false,  // selected for the next connection
			selectedTime: 0,  // time this node is being selected for connection
			connectTo: [],  // the id of the nodes this node connects to as a source
			connectBy: [],  // the id of the nodes those connect to this node
		};
	},

	initialize: function(){
		// trap when the mode has changed
		Pie.events.on("modeChanged", $.proxy(this.resetSelected, this));
	},

	addConnectTo: function(nodeID){
		// if this node not connecting to the other node
		if (this.get('connectTo').indexOf(nodeID) == -1){
			this.get('connectTo').push(nodeID);
		}
	},

	addConnectBy: function(nodeID){
		// if this node not connecting by the other node
		if (this.get('connectBy').indexOf(nodeID) == -1){
			this.get('connectBy').push(nodeID);
		}
	},

	disconnectFromSource: function(sourceID){
		var sourceNode = this.collection.get(sourceID);
		var sourceNodeArray = sourceNode.get('connectTo');
		var curNodeIndex = sourceNodeArray.indexOf(this.cid);
		sourceNodeArray.splice(curNodeIndex, 1);

		var curNodeArray = this.get('connectBy');
		var sourceNodeIndex = curNodeArray.indexOf(sourceID);
		curNodeArray.splice(sourceNodeIndex, 1)
	},

	disconnectFromTarget: function(targetID){
		var targetNode = this.collection.get(targetID);
		var targetNodeArray = targetNode.get('connectBy');
		var curNodeIndex = targetNodeArray.indexOf(this.cid);
		targetNodeArray.splice(curNodeIndex, 1);

		var curNodeArray = this.get('connectTo');
		var targetNodeIndex = curNodeArray.indexOf(targetID);
		curNodeArray.splice(targetNodeIndex, 1)
	},

	disconnectFrom: function(otherID){
		// check whether the other node is a source or target
		// the other node is a target
		if (this.isConnectedTo(otherID)){
			this.disconnectFromTarget(otherID);

		// the other node is a source
		}else{
			this.disconnectFromSource(otherID);
		}
	},

	disconnectAllConnections: function(){
		// get the clone of the arrays
		var connectBy = this.get('connectBy').slice(0);
		var connectTo = this.get('connectTo').slice(0);

		// disconnect all sources
		for (var i = 0; i < connectBy.length; i++){
			this.disconnectFromSource(connectBy[i]);
		}

		// disconnect all targets
		for (var i = 0; i < connectTo.length; i++){
			this.disconnectFromTarget(connectTo[i]);
		}
	},

	isConnectedTo: function(id){
		return this.get('connectTo').indexOf(id) >= 0;
	},

	isConnectedBy: function(id){
		return this.get('connectBy').indexOf(id) >= 0;
	},

	// whether this node is connect to the node with the given id
	hasConnectionWith: function(id){
		return this.get('connectBy').indexOf(id) >= 0 || this.get('connectTo').indexOf(id) >= 0;
	},

	sourcesLeft: function(){
		return this.get('sourceEndpointNum') - this.get('connectTo').length;
	},

	targetsLeft: function(){
		return this.get('targetEndpointNum') - this.get('connectBy').length;
	},

	setSelected: function(){
		this.set('selected', true);
		this.set('selectedTime', new Date());
	},

	resetSelected: function(){
		this.set('selected', false);
		this.set('selectedTime', 0);
	},


	// urlRoot: Manager.url+"/updateUser",
});

var NodeCollection = Backbone.Collection.extend({
	model: Node,
	// comparator: "name",

	initialize: function(){
		// this.on("change:selected", this.setConnection, this);
	},

	selectedNodes: function(){
		return this.filter(function(m){
			if (m.get("selected")) return true;
		});
	},

	resetSelected: function(modelArray){
		for (var i = 0; i < modelArray.length; i++){
			modelArray[i].resetSelected();
		}
	},

	// return 1 if success, -1 if failure, 0 no connection/disconnection created, 
	setConnection: function(){
		var selectedNodes = this.selectedNodes();

		// connection/disconnection whene there are 2 nodes selected
		if (selectedNodes.length == 2){
			// set the node with a earlier selected time as the source node
			var sourceNode = selectedNodes[0].get("selectedTime") < selectedNodes[1].get("selectedTime") ?
				selectedNodes[0] : selectedNodes[1];
			// set the node with a earlier selected time as the target node
			var targetNode = selectedNodes[0].get("selectedTime") > selectedNodes[1].get("selectedTime") ?
				selectedNodes[0] : selectedNodes[1];

			// if the 2 nodes are not connected, connect them
			if (!sourceNode.hasConnectionWith(targetNode.cid)){

				// TODO: condition checking whether too many connection
				// if the source node cannot have any more targets
				if (sourceNode.sourcesLeft() == 0){
					// this.resetSelected([sourceNode, targetNode]);

					return {code: -1, message: "Source node cannot have more connection", nodes: [sourceNode, targetNode]};
				// if the target node cannot have any more source
				}else if (targetNode.targetsLeft() == 0){
					// this.resetSelected([sourceNode, targetNode]);

					return {code: -1, message: "Target node cannot have more connection", nodes: [sourceNode, targetNode]};
				}

				// TODO: change cid to id if use id later
				sourceNode.addConnectTo(targetNode.cid);
				targetNode.addConnectBy(sourceNode.cid);

				// set selected attribute to false, which triggers the grid views to render
				// this.resetSelected([sourceNode, targetNode]);

				return {code: 1, message: "success", nodes: [sourceNode, targetNode]};

			// disconnect the 2 nodes
			}else{
				sourceNode.disconnectFrom(targetNode.cid);

				// set selected attribute to false, which triggers the grid views to render
				// this.resetSelected([sourceNode, targetNode]);

				return {code: 1, message: "success", nodes: [sourceNode, targetNode]};
			}
		}

		return {code: 0, message: "no connection/disconnection"};;
	},

	//url: Manager.url+"/updateUsers",
});