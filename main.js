"use strict";
/*
Load background image
Save/Load
Details:
	Node
		Name
	Connection
		Colour 1
		Colour 2
		Tunnel
		Locomotive
Modes:
	Node edit
		Click free space to add a node
		Click a node to edit it
		Double click a node to delete
		Drag a node to move it
	Connection edit
		Click node to highlight it
		Click second node to create a connection
		Click connection to edit it
		Double click connection to delete it
	Play
*/
var nodes = {},
	connections = {};

var COLOURS = {
	red: {
		name: 'Red',
		colour: '#F00'
	},
	green: {
		name: 'Green',
		colour: '#0F0'
	},
	blue: {
		name: 'Blue',
		colour: '#00F'
	},
	black: {
		name: 'Black',
		colour: '#000'
	},
	grey: {
		name: 'Grey',
		colour: '#999'
	},
	white: {
		name: 'White',
		colour: '#FFF'
	},
	yellow: {
		name: 'Yellow',
		colour: '#880'
	},
	pink: {
		name: 'Pink',
		colour: '#F99'
	},
	orange: {
		name: 'Orange',
		colour: '#F80'
	}
};
var NODE_R = 10;

/********************************************\
	General helpers
\********************************************/

function qs(s) {
	return document.querySelector(s);
}

function qsa(s) {
	return document.querySelectorAll(s);
}

function _get_mode() {
	//Get the currently selected mode
	return qs('[name=mode]:checked').value;
}

function _open_dialog(selector) {
	//Show the given dialog
	qs('#mask').style.display = 'block';
	Array.prototype.slice.call(qsa('.dialog'), 0).forEach(function(e) {
		e.style.display = 'none';
	});
	qs(selector).style.display = 'block';
}

function _close_dialogs() {
	//Hide the dialog mask
	qs('#mask').style.display = 'none';
}

function _draw_layout() {
	//Draw the nodes & connections onto the canvas
	var c = qs('#board').getContext("2d");
	//Clear the canvas
	c.fillStyle = 'white';
	c.fillRect(0, 0, c.canvas.width, c.canvas.height);
	//Draw the nodes
	_nodes_iter(function(node) {
		//Draw the node
		c.fillStyle = 'black';
		c.beginPath();
		c.arc(node.x, node.y, NODE_R, 0, 2 * Math.PI);
		c.fill();
		//Draw the name
		c.font = "20px Georgia";
		c.fillText(node.name, node.x+NODE_R, node.y+NODE_R);
	});
	//Draw the connections
	_connections_iter(function(connection) {
	});
}

/********************************************\
	Node helpers
\********************************************/

function _nodes_iter(func) {
	Object.keys(nodes).forEach(function(node_id) {
		func(nodes[node_id]);
	});
}

function _find_node(x, y) {
	//Find out if there is a node at (x,y)
	var min_d,
		min_node;
	_nodes_iter(function(node) {
		//Calc distance from x,y to node.x,node.y
		var d = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
		if (d <= NODE_R) {
			if (min_d === undefined || d < min_d) {
				min_d = d;
				min_node = node;
			}
		}
	});
	return min_node;
}

function _add_node(x, y, name) {
	//Add a new node at (x, y) with name
	console.log('Todo: _add_node');
}

function _remove_node(id) {
	//Remove the node specified by id
	console.log('Todo: _remove_node');
}

/********************************************\
	Connection helpers
\********************************************/

function _connections_iter(func) {
	Object.keys(connections).forEach(function(connection_id) {
		func(connections[connection_id]);
	});
}

function _find_connection(x, y) {
	//Todo
	console.log('Todo: _find_connection');
}

function _add_connection(node1, node2) {
	//Todo
	console.log('Todo: _add_connection');
}

function _remove_connection(id) {
	//Todo
	console.log('Todo: _remove_connection');
}

/********************************************\
	Main click listeners
\********************************************/

function _load_image() {
	//Todo
	console.log('Todo: _load_image');
}

function _export() {
	//Todo
	console.log('Todo: _export');
}

function _import() {
	//Todo
	console.log('Todo: _import');
}

/********************************************\
	Node dialog click listeners
\********************************************/

function _node_ok() {
	//Save the node currently being edited
	console.log('Todo: _node_ok');
	var node_id = qs('#node_id').value;
	if (node_id) {
		//Editing
		var node = nodes[node_id];
		node.name = qs('#node_name').value;
	} else {
		//Find the first free id
		var node_id = 0;
		while (node_id in nodes) {
			node_id++;
		}
		//Adding
		var node = {};
		node.id = node_id;
		node.x = parseInt(qs('#node_x').value, 10);
		node.y = parseInt(qs('#node_y').value, 10);
		node.name = qs('#node_name').value;
		nodes[node_id] = node;
	}
	_close_dialogs();
	_draw_layout();
}

function _node_delete() {
	//Delete the node currently being edited
	console.log('Todo: _node_delete');
}

function _node_cancel() {
	//Close the node dialog
	_close_dialogs();
}

/********************************************\
	Connection dialog click listeners
\********************************************/

function _connection_ok() {
	//Save the connection currently being edited
	console.log('Todo: _connection_ok');
}

function _connection_delete() {
	//Delete the connection currently being edited
	console.log('Todo: _connection_delete');
}

function _connection_cancel() {
	//Close the connection dialog
	_close_dialogs();
}

/********************************************\
	Canvas listeners
\********************************************/

var node_dragged = false,
	node_current;

function _canvas_mouse_move(e) {
	//Todo
	console.log('Todo: _canvas_mouse_move');
	//console.log(e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			node_dragged = true;
			if (e.which == 1) {
				//We could be dragging an element
				if (node_current) {
					node_current.x = e.offsetX;
					node_current.y = e.offsetY;
					_draw_layout();
				}
			}
			//Check what the mouse cursor should be
			if (_find_node(e.offsetX, e.offsetY)) {
				qs('#board').style.cursor = 'pointer';
			} else {
				qs('#board').style.cursor = 'auto';
			}
			break;
		case 'connection':
			break;
		case 'play':
			break;
	}
}

function _canvas_mouse_down(e) {
	//Deal with what happens when the mouse is down
	console.log('Todo: _canvas_mouse_down');
	//console.log(e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			//Reset whether this mouse action has been a drag
			node_current = _find_node(e.offsetX, e.offsetY);
			node_dragged = false;
			break;
		case 'connection':
			break;
		case 'play':
			break;
	}
}

function _canvas_mouse_up(e) {
	//Deal with what happens when the mouse is released
	console.log('Todo: _canvas_mouse_up');
	//console.log(e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			//Only open the node dialog if the mouse wasnt dragged
			if (!node_dragged) {
				//Find if we are over a node
				var node = _find_node(e.offsetX, e.offsetY);
				if (node) {
					//Setup dialog for edit
					qs('#node_id').value = node.id;
					qs('#node_x').value = node.x;
					qs('#node_y').value = node.y;
					qs('#node_name').value = node.name;
					qs('#node_delete').disabled = false;
				} else {
					//Setup dialog for add
					qs('#node_id').value = '';
					qs('#node_x').value = e.offsetX;
					qs('#node_y').value = e.offsetY;
					qs('#node_name').value = '';
					qs('#node_delete').disabled = true;
				}
				//Show the add node dialog
				_open_dialog('#dialog_node');
			}
			break;
		case 'connection':
			break;
		case 'play':
			break;
	}
}

/********************************************\
	Main method
\********************************************/

document.onreadystatechange = function() {
	if (document.readyState !== 'complete') return;
	//Add click listeners
	qs('#load_image').addEventListener('click', _load_image);
	qs('#import').addEventListener('click', _import);
	qs('#export').addEventListener('click', _export);
	qs('#node_ok').addEventListener('click', _node_ok);
	qs('#node_delete').addEventListener('click', _node_delete);
	qs('#node_cancel').addEventListener('click', _node_cancel);
	qs('#connection_ok').addEventListener('click', _connection_ok);
	qs('#connection_delete').addEventListener('click', _connection_delete);
	qs('#connection_cancel').addEventListener('click', _connection_cancel);

	document.addEventListener('keyup', function(e) {
		//On escape, _close_dialogs
		if (e.which == 27) {
			_close_dialogs();
		}
	});

	//Add canvas mouse listeners
	var board = qs('#board');
	board.addEventListener('mousemove', _canvas_mouse_move);
	board.addEventListener('mousedown', _canvas_mouse_down);
	board.addEventListener('mouseup', _canvas_mouse_up);
};
