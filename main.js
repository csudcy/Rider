"use strict";
/*
TODO:
 * Station name placement
 * Show conection length & locomotives
 * Play

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

var COLOURS = {
		red: {
			id: 'red',
			colour: '#F00'
		},
		green: {
			id: 'green',
			colour: '#0F0'
		},
		blue: {
			id: 'blue',
			colour: '#00F'
		},
		black: {
			id: 'black',
			colour: '#000'
		},
		grey: {
			id: 'grey',
			colour: '#999'
		},
		white: {
			id: 'white',
			colour: '#FFF'
		},
		yellow: {
			id: 'yellow',
			colour: '#FF0'
		},
		pink: {
			id: 'pink',
			colour: '#F0F'
		},
		orange: {
			id: 'orange',
			colour: '#F80'
		}
	},
	COLOUR_KEYS = Object.keys(COLOURS),
	NODE_R = 10;

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

function _open_dialog(dialog_selector, default_element_selector) {
	//Show the given dialog
	qs('#mask').style.display = 'block';
	qsa('.dialog').forEach(function(e) {
		e.style.display = 'none';
	});
	qs(dialog_selector).style.display = 'block';
	if (default_element_selector) {
		qs(default_element_selector).focus();
		qs(default_element_selector).select();
	}

}

function _close_dialogs() {
	//Hide the dialog mask
	qs('#mask').style.display = 'none';
}

//Shortest distance from point to line segment
//Adapted from http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
	//If the line length is zero, just return the distance from point to either line node
	var l2 = dist2(v, w);
	if (l2 == 0) return dist2(p, v);
	//Maths, bitch!
	var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	if (t < 0) return dist2(p, v);
	if (t > 1) return dist2(p, w);
	return dist2(
		p,
		{
			x: v.x + t * (w.x - v.x),
			y: v.y + t * (w.y - v.y)
		});
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

//Helpers to easily translate from page coordinates to canvas coordinates
MouseEvent.prototype.canvasX = function() {
	return Math.round(
		(this.offsetX / this.currentTarget.clientWidth)
		* this.currentTarget.width
	);
}
MouseEvent.prototype.canvasY = function() {
	return Math.round(
		(this.offsetY / this.currentTarget.clientHeight)
		* this.currentTarget.height
	);
}

NodeList.prototype.forEach = function(func) {
	Array.prototype.slice.call(this, 0).forEach(func);
}

CanvasRenderingContext2D.prototype.removeLineDash = function() {
	//Remove any dash that's been set
	this.setLineDash([1,0]);
}

/********************************************\
	Board helpers
\********************************************/

function _get_boards() {
	return JSON.parse(localStorage.boards || '{}');
}

function _set_boards(boards) {
	localStorage.boards = JSON.stringify(boards);
}

function _boards_iter(func) {
	//Shortcut to iterate over the connections object
	var boards = _get_boards();
	Object.keys(boards).forEach(function(board_id) {
		func(boards[board_id]);
	});
}

var BOARD;
function _new_board() {
	//Create a new board
	BOARD = {
		name: 'New Board',
		image: undefined,
		nodes: {},
		connections: {},
		objectives: []
	};
	localStorage.last_board = undefined;
}

function _save_board() {
	//Save the current board to localStorage
	var boards = _get_boards();
	boards[BOARD.name] = BOARD;
	_set_boards(boards);
	localStorage.last_board = BOARD.name;
	alert('Board saved: ' + BOARD.name);
}

function _rename_board(new_board_name) {
	//Rename the current board in localStorage
	var boards = _get_boards();
	//Only have to change localStorage if the board already exists there
	if (BOARD.name in boards) {
		//Remove the board
		delete boards[BOARD.name];
		//Change the name
		BOARD.name = new_board_name;
		//Then save the board again
		boards[BOARD.name] = BOARD;
		_set_boards(boards);
		localStorage.last_board = BOARD.name;
		alert('Board renamed: ' + BOARD.name);
	} else {
		//Just change the name
		BOARD.name = new_board_name;
	}
}

function _load_board(board_name) {
	//Load the given board from localStorage
	var boards = _get_boards();
	if (board_name in boards) {
		BOARD = boards[board_name];
		//Check all is good with the board
		_nodes_iter(function(node) {
			node.label_x = node.label_x || NODE_R;
			node.label_y = node.label_y || NODE_R;
		});
		BOARD.objectives = BOARD.objectives || [];
		localStorage.last_board = BOARD.name;
	} else {
		alert('Board not found: ' + board_name);
	}
}

function _remove_board(board_name) {
	//Remove the given board from localStorage
	var boards = _get_boards();
	if (board_name in boards) {
		delete boards[board_name];
		_set_boards(boards);
		alert('Board removed: ' + board_name);
	} else {
		alert('Board not found: ' + board_name);
	}
}

function _draw_board() {
	//Update UI to the latest board state
	//Update board name
	qs('#board_name').innerHTML = BOARD.name;
	//Clear the canvas
	var c = qs('#board').getContext("2d");
	c.fillStyle = 'white';
	c.fillRect(0, 0, c.canvas.width, c.canvas.height);
	//Show the background image
	if (BOARD.image && qs('#show_image').checked) {
		var img = new Image();
		img.src = BOARD.image;
		c.drawImage(img, 0, 0);
	}

	if (qs('#show_connections').checked) {
		//Draw the connections
		_connections_iter(function(connection) {
			var n1 = BOARD.nodes[connection.node1],
				n2 = BOARD.nodes[connection.node2];
			//Setup where the line will be
			c.beginPath();
			c.moveTo(n1.x, n1.y);
			c.lineTo(n2.x, n2.y);

			//Do the outline stroke
			c.strokeStyle = 'black';
			c.lineWidth = 7;
			if (connection.tunnel) {
				c.setLineDash([5,2]);
			} else {
				c.removeLineDash();
			}
			c.stroke();

			//Do the main stroke
			c.removeLineDash();
			c.lineWidth = 4;
			c.strokeStyle = COLOURS[connection.colour1].colour;
			c.stroke();
			if (connection.colour2 !== 'none') {
				c.setLineDash([10, 10]);
				c.strokeStyle = COLOURS[connection.colour2].colour;
				c.stroke();
			}
		});
	}

	if (qs('#show_nodes').checked) {
		//Draw the nodes
		c.fillStyle = 'black';
		c.lineWidth = 0.5;
		c.strokeStyle = 'white';
		_nodes_iter(function(node) {
			c.beginPath();
			c.arc(node.x, node.y, NODE_R, 0, 2 * Math.PI);
			c.fill();
			c.stroke();
		});

		c.lineWidth = 0.5;
		BOARD.objectives.forEach(function(objective, index) {
			console.log(index);
			var node1 = BOARD.nodes[objective.node1],
				node2 = BOARD.nodes[objective.node2];
			c.fillStyle = COLOURS[COLOUR_KEYS[index]].colour;
			c.beginPath();
			c.arc(node1.x, node1.y, NODE_R/2, 0, 2 * Math.PI);
			c.fill();
			c.beginPath();
			c.arc(node2.x, node2.y, NODE_R/2, 0, 2 * Math.PI);
			c.fill();
		});
	}

	if (qs('#show_labels').checked) {
		//Draw the labels
		c.fillStyle = 'black';
		c.lineWidth = 1;
		c.strokeStyle = 'white';
		c.font = "20px Arial bold";
		_nodes_iter(function(node) {
			c.fillText(node.name, node.x+node.label_x, node.y+node.label_y);
			c.strokeText(node.name, node.x+node.label_x, node.y+node.label_y);
		});
	}
	//Allow others to draw on the board too
	return c;
}

/********************************************\
	Node helpers
\********************************************/

function _nodes_iter(func) {
	//Shortcut to iterate over the nodes object
	Object.keys(BOARD.nodes).forEach(function(node_id) {
		func(BOARD.nodes[node_id]);
	});
}

function _find_node(x, y) {
	//Find if there is a node at (x,y)
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

function _find_node_label(x, y) {
	//Find if there is a node's label at (x,y)
	var min_d,
		min_node;
	_nodes_iter(function(node) {
		//Calc distance from x,y to node.x+node.label_x,node.y+node.label_y
		var dx = x - (node.x + node.label_x),
			dy = (node.y + node.label_y) - y;
		if (dx >= 0 && dx <= 2*NODE_R && dy >= 0 && dy <= 2*NODE_R) {
			var d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
			if (min_d === undefined || d < min_d) {
				min_d = d;
				min_node = node;
			}
		}
	});
	return min_node;
}

function _add_node(x, y, name) {
	//Add a new node with the given attributes
	//Find the first free id
	var node_id = 0;
	while (node_id in BOARD.nodes) {
		node_id++;
	}
	//Add a new node
	BOARD.nodes[node_id] = {
		id: node_id,
		x: parseInt(x, 10),
		y: parseInt(y, 10),
		label_x: NODE_R,
		label_y: NODE_R,
		name: name
	};
}

function _remove_node(node_id) {
	//Remove the node specified by id & any connections it is used by
	_connections_iter(function(connection) {
		if (connection.node1 === node_id || connection.node2 === node_id) {
			_remove_connection(connection.id);
		}
	});
	delete BOARD.nodes[node_id];
}

/********************************************\
	Connection helpers
\********************************************/

function _connections_iter(func) {
	//Shortcut to iterate over the connections object
	Object.keys(BOARD.connections).forEach(function(connection_id) {
		func(BOARD.connections[connection_id]);
	});
}

function _find_connection(x, y) {
	//Find if there is a connection at x,y
	var min_d,
		min_connection,
		p = {x:x, y:y};
	_connections_iter(function(connection) {
		var n1 = BOARD.nodes[connection.node1],
			n2 = BOARD.nodes[connection.node2];
		var d = distToSegmentSquared(p, n1, n2)

		if (d <= 25) {
			if (min_d === undefined || d < min_d) {
				min_d = d;
				min_connection = connection;
			}
		}
	});
	return min_connection;
}

function _find_connection_by_node(n1_id, n2_id) {
	//Find if there is a connection at x,y
	var found_connection;
	_connections_iter(function(connection) {
		if ((connection.node1 === n1_id && connection.node2 === n2_id)
			|| (connection.node1 === n2_id && connection.node2 === n1_id)) {
			found_connection = connection;
		}
	});
	return found_connection;
}

function _add_connection(node1, node2, length, colour1, colour2, tunnel, locomotives) {
	//Add a new connection with the given attributes
	//Find the first free id
	var connection_id = 0;
	while (connection_id in BOARD.connections) {
		connection_id++;
	}
	//Add a new connection
	BOARD.connections[connection_id] = {
		id: connection_id,
		node1: parseInt(node1, 10),
		node2: parseInt(node2, 10),
		length: parseInt(length, 10),
		colour1: colour1,
		colour2: colour2,
		tunnel: tunnel,
		locomotives: parseInt(locomotives, 10),
	};
}

function _remove_connection(connection_id) {
	//Remove the connection specified by id
	delete BOARD.connections[connection_id];
}

/********************************************\
	Main click listeners
\********************************************/

function _load_image_click() {
	//Load a background image for this board
	qs('#image_loader').click();
}

function _image_loader_change(e) {
	//Deal with a new background image being selected
	var file = e.target.files[0];

	if (!file) {
		//No file selected, clear background image
		BOARD.image = undefined;
		_draw_board();
		return;
	}

	// Only process image files.
	if (!file.type.match('image.*')) {
		alert('You must select an image!');
		return;
	}

	// Read the File objects in this FileList.
	var reader = new FileReader();
	// Listener for the onload event
	reader.onload = function(e) {
		// Create an unattached img element for manipulation
		var img = document.createElement('img');
		img.src = e.target.result;

		// Create a canvas to resize the image
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		canvas.width = qs('#board').width;
		canvas.height = qs('#board').height;

		// Work out what ratio to scale to
		var scale = Math.min(canvas.width / img.width, img.height / canvas.height);

		// Resize image
		ctx.drawImage(
			img,
			0,
			0,
			img.width,
			img.height,
			0,
			0,
			img.width * scale,
			img.height * scale
		);

		// Save resized iamge to the board
		BOARD.image = canvas.toDataURL();
		_draw_board();
	};
	// Read in the image file as a data URL.
	reader.readAsDataURL(file);
};

function _export_board_click() {
	//Export a board to textual representation
	qs('#export_json').value = JSON.stringify(BOARD);
	_open_dialog('#dialog_export');
}

function _board_option_change() {
	//Change whether something about the board is shown or hidden
	_draw_board();
}

function _import_board_click() {
	//Import a board from a textual representation
	qs('#import_json').value = '';
	_open_dialog('#dialog_import');
}

function _new_board_click() {
	//Create a new board
	if (confirm('Really create a new board?')) {
		_new_board();
		_draw_board();
	}
}

function _save_board_click() {
	//Save the current board
	_save_board();
}

function _rename_board_click() {
	//Rename the current board
	var new_board_name = prompt('Board name:', BOARD.name);
	if (new_board_name) {
		_rename_board(new_board_name);
		_draw_board();
	}
}

function _load_board_click() {
	//Load a board
	//Put the list of boards in the dialog
	var html = '', first = true;
	_boards_iter(function(board) {
		html += '<label><input type="radio" name="board" value="'+board.name+'"';
		if (first) {
			html += ' checked="checked"';
			first = false;
		}
		html += '/>'+board.name+'</label><br/>';
	})
	if (html === '') {
		alert('No saved boards found!');
		_close_dialogs();
		return;
	}
	qs('#board_list').innerHTML = html;
	//Show the dialog
	_open_dialog('#dialog_board');
}

function _add_objective_click() {
	//Add an objective
	//Sort nodes by name
	var node_list = [];
	_nodes_iter(function(node) {
		node_list.push(node);
	})
	node_list = node_list.sort(function(a, b) {
		return a.name.localeCompare(b.name);
	});
	//Populate the list of nodes
	var html = '';
	node_list.forEach(function(node) {
		html += '<option value="'+node.id+'">'+node.name+'</option>';
	});
	qs('#objective_node1').innerHTML = html;
	qs('#objective_node2').innerHTML = html;
	//Show the objective dialog
	_open_dialog('#dialog_objective');
}

function _clear_objectives_click() {
	//Clear the objectives
	if (confirm('Really clear objectives?')) {
		BOARD.objectives.length = 0;
		_draw_board();
	}
}

/********************************************\
	Node dialog click listeners
\********************************************/

function _node_ok_click() {
	//Save the node currently being edited
	var node_id = qs('#node_id').value;
	if (node_id) {
		//Editing
		var node = BOARD.nodes[node_id];
		node.name = qs('#node_name').value;
	} else {
		_add_node(
			qs('#node_x').value,
			qs('#node_y').value,
			qs('#node_name').value
		);
	}
	_close_dialogs();
	_draw_board();
}

function _node_delete_click() {
	//Delete the node currently being edited
	var node_id = qs('#node_id').value;
	if (node_id) _remove_node(node_id);
	_close_dialogs();
	_draw_board();
}

function _node_cancel_click() {
	//Close the node dialog
	_close_dialogs();
}

/********************************************\
	Connection dialog click listeners
\********************************************/

function _connection_ok_click() {
	//Save the connection currently being edited
	var connection_id = qs('#connection_id').value;
	if (connection_id) {
		//Editing
		var connection = BOARD.connections[connection_id];
		connection.length = parseInt(qs('#connection_length').value, 10);
		connection.colour1 = qs('[name=connection_colour_node1]:checked').value;
		connection.colour2 = qs('[name=connection_colour_node2]:checked').value;
		connection.tunnel = qs('#connection_tunnel').checked;
		connection.locomotives = parseInt(qs('#connection_locomotives').value, 10);
	} else {
		_add_connection(
			qs('#connection_node1_id').value,
			qs('#connection_node2_id').value,
			qs('#connection_length').value,
			qs('[name=connection_colour_node1]:checked').value,
			qs('[name=connection_colour_node2]:checked').value,
			qs('#connection_tunnel').checked,
			qs('#connection_locomotives').value
		);
	}
	_close_dialogs();
	_draw_board();
}

function _connection_delete_click() {
	//Delete the connection currently being edited
	var connection_id = qs('#connection_id').value;
	if (connection_id) _remove_connection(connection_id);
	_close_dialogs();
	_draw_board();
}

function _connection_cancel_click() {
	//Close the connection dialog
	_close_dialogs();
	//Clear anything we've added to the board
	_draw_board();
}


/********************************************\
	Board dialog click listeners
\********************************************/

function _board_load_click() {
	//Load the selected board from localStorage
	var board_id = qs('[name=board]:checked').value;
	_load_board(board_id);
	_draw_board();
	_close_dialogs();
}

function _board_delete_click() {
	//Delete the selected board from localStorage
	var board_id = qs('[name=board]:checked').value;
	if (confirm('Really delete board "'+board_id+'"?')) {
		_remove_board(board_id);
		//If the board is currently loaded, change to a new board
		if (BOARD.name === board_id) {
			_new_board();
			_draw_board();
		}
	}
	//Refresh the dialog
	_load_board_click();
}

function _board_cancel_click() {
	//Close the board dialog
	_close_dialogs();
}

/********************************************\
	Export dialog click listeners
\********************************************/

function _export_close_click() {
	//Close the export dialog
	_close_dialogs();
}

/********************************************\
	Import dialog click listeners
\********************************************/

function _import_import_click() {
	//Import the board that has been pasted into the textarea
	var board_json = qs('#import_json').value;
	if (board_json) {
		var board = JSON.parse(board_json);
		BOARD = board;
		_draw_board();
	}
	_close_dialogs();
}

function _import_cancel_click() {
	//Close the import dialog
	_close_dialogs();
}

/********************************************\
	Objective dialog click listeners
\********************************************/

function _objective_add_click() {
	//Add the selected objective
	//qs('#objective_node1 option:selected')
	BOARD.objectives.push({
		node1: qs('#objective_node1').value,
		node2: qs('#objective_node2').value
	});
	_draw_board();
	_close_dialogs();
}

function _objective_cancel_click() {
	//Close the objective dialog
	_close_dialogs();
}

/********************************************\
	Canvas listeners
\********************************************/

//Mouse tracking vars
var mouse_dragged = false,
	node_current,
	connection_current,
	label_current;

function _canvas_mouse_down(e) {
	//Deal with what happens when the mouse is pressed
	//console.log('Todo: _canvas_mouse_down', e);
	e.preventDefault();
	//Reset everything
	switch (_get_mode()) {
		case 'node':
			node_current = _find_node(e.canvasX(), e.canvasY());
			if (!node_current) {
				//Otherwise, we might be going to click on a line
				label_current = _find_node_label(e.canvasX(), e.canvasY());
			} else {
				label_current = undefined;
			}
			mouse_dragged = false;
			break;
		case 'connection':
			//If we are over a node, we can start a new connection
			node_current = _find_node(e.canvasX(), e.canvasY());
			if (!node_current) {
				//Otherwise, we might be going to click on a line
				connection_current = _find_connection(e.canvasX(), e.canvasY());
			} else {
				connection_current = undefined;
			}
			mouse_dragged = false;
			break;
		case 'play':
			break;
	}
}

function _canvas_mouse_move(e) {
	//Deal with what happens when the mouse is moved
	//console.log('Todo: _canvas_mouse_move', e);
	e.preventDefault();

	var cursor = 'auto';

	switch (_get_mode()) {
		case 'node':
			mouse_dragged = true;
			if (e.which == 1) {
				//We could be dragging an element
				if (node_current) {
					node_current.x = e.canvasX();
					node_current.y = e.canvasY();
					_draw_board();
					cursor = 'pointer';
				} else if (label_current) {
					label_current.label_x = e.canvasX() - label_current.x;
					label_current.label_y = e.canvasY() - label_current.y;
					_draw_board();
					cursor = 'crosshair';
				}
			} else {
				//Check what the mouse cursor should be
				if (_find_node(e.canvasX(), e.canvasY())) {
					cursor = 'pointer';
				} else if (_find_node_label(e.canvasX(), e.canvasY())) {
					cursor = 'crosshair';
				}

			}

			break;
		case 'connection':
			mouse_dragged = true;
			if (e.which == 1) {
				if (node_current) {
					//We are creating a new connection
					var context = _draw_board();
					context.beginPath();
					context.moveTo(node_current.x, node_current.y);
					context.lineTo(e.canvasX(), e.canvasY());
					context.lineWidth = 2;
					context.strokeStyle = 'white';
					context.stroke();
					context.lineWidth = 1;
					context.strokeStyle = 'black';
					context.stroke();
				}
			}

			//Check what the mouse cursor should be
			if (_find_node(e.canvasX(), e.canvasY())) {
				//Over a node
				cursor = 'crosshair';
			} else if (_find_connection(e.canvasX(), e.canvasY())) {
				cursor = 'pointer';
			}
			break;
		case 'play':
			break;
	}

	qs('#board').style.cursor = cursor;
}

function _canvas_mouse_up(e) {
	//Deal with what happens when the mouse is released
	//console.log('Todo: _canvas_mouse_up', e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			//Only open the node dialog if the mouse wasnt dragged
			if (!mouse_dragged) {
				if (e.which == 1) {
					//Add/Edit node
					if (node_current) {
						//Setup dialog for edit
						qs('#node_id').value = node_current.id;
						qs('#node_x').value = node_current.x;
						qs('#node_y').value = node_current.y;
						qs('#node_label_x').value = node_current.label_x;
						qs('#node_label_y').value = node_current.label_y;
						qs('#node_name').value = node_current.name;
						qs('#node_delete').disabled = false;
					} else {
						//Setup dialog for add
						qs('#node_id').value = '';
						qs('#node_x').value = e.canvasX();
						qs('#node_y').value = e.canvasY();
						qs('#node_label_x').value = NODE_R;
						qs('#node_label_y').value = NODE_R;
						qs('#node_name').value = '';
						qs('#node_delete').disabled = true;
					}
					//Show the add node dialog
					_open_dialog('#dialog_node', '#node_name');
				} else {
					//Delete node
					if (node_current) {
						_remove_node(node_current.id);
						_draw_board();
					}
				}
			}
			break;
		case 'connection':
			if (mouse_dragged) {
				if (e.which === 1 && node_current) {
					//We are making a new connection, find out if we connected to anyting
					var node_target = _find_node(e.canvasX(), e.canvasY());
					if (node_target && node_target.id !== node_current.id) {
						//Check if the link exists already
						if (_find_connection_by_node(node_current.id, node_target.id)) {
							alert('That connection already exists!');
							_draw_board();
						} else {
							//Create a new connection now
							qs('#connection_id').value = '';
							qs('#connection_node1').value = node_current.name;
							qs('#connection_node1_id').value = node_current.id;
							qs('#connection_node2').value = node_target.name;
							qs('#connection_node2_id').value = node_target.id;
							qs('#connection_length').value = 1;
							qs('[name=connection_colour_node1]').checked = true;
							qs('[name=connection_colour_node2][value=none]').checked = true;
							qs('#connection_tunnel').checked = false;
							qs('#connection_locomotives').value = 0;
							qs('#connection_delete').disabled = true;
							_open_dialog('#dialog_connection');
						}
					} else {
						//No connection, clear the dragged line from the board
						_draw_board();
					}
				}
			} else if (!mouse_dragged && connection_current) {
				if (e.which === 1) {
					//Edit the connection
					var n1 = BOARD.nodes[connection_current.node1],
						n2 = BOARD.nodes[connection_current.node2];
					qs('#connection_id').value = connection_current.id;
					qs('#connection_node1').value = n1.name;
					qs('#connection_node1_id').value = n1.id;
					qs('#connection_node2').value = n2.name;
					qs('#connection_node2_id').value = n2.id;
					qs('#connection_length').value = connection_current.length;
					qs('[name=connection_colour_node1][value='+connection_current.colour1+']').checked = true;
					qs('[name=connection_colour_node2][value='+connection_current.colour2+']').checked = true;
					qs('#connection_tunnel').checked = connection_current.tunnel;
					qs('#connection_locomotives').value = connection_current.locomotives;
					qs('#connection_delete').disabled = false;
					_open_dialog('#dialog_connection');
				} else {
					//Delete the connection
					_remove_connection(connection_current.id);
					_draw_board();
				}
			}
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
	//General click handlers
	qs('#load_image').addEventListener('click', _load_image_click);
	qs("#image_loader").addEventListener('change', _image_loader_change);
	qs('#import_board').addEventListener('click', _import_board_click);
	qs('#export_board').addEventListener('click', _export_board_click);

	qsa(".board_option").forEach(function(e) {
		e.addEventListener('change', _board_option_change);
	});

	qs('#new_board').addEventListener('click', _new_board_click);
	qs('#save_board').addEventListener('click', _save_board_click);
	qs('#rename_board').addEventListener('click', _rename_board_click);
	qs('#load_board').addEventListener('click', _load_board_click);

	qs('#add_objective').addEventListener('click', _add_objective_click);
	qs('#clear_objectives').addEventListener('click', _clear_objectives_click);

	//Node dialog click handlers
	qs('#node_ok').addEventListener('click', _node_ok_click);
	qs('#node_delete').addEventListener('click', _node_delete_click);
	qs('#node_cancel').addEventListener('click', _node_cancel_click);
	qs('#node_name').addEventListener('keyup', function(e) {
		if (e.which == 13) {
			_node_ok_click();
		}
	});

	//Connection dialog click handlers
	qs('#connection_ok').addEventListener('click', _connection_ok_click);
	qs('#connection_delete').addEventListener('click', _connection_delete_click);
	qs('#connection_cancel').addEventListener('click', _connection_cancel_click);

	//Board dialog click handlers
	qs('#board_load').addEventListener('click', _board_load_click);
	qs('#board_delete').addEventListener('click', _board_delete_click);
	qs('#board_cancel').addEventListener('click', _board_cancel_click);

	//Export dialog click handlers
	qs('#export_close').addEventListener('click', _export_close_click);

	//Import dialog click handlers
	qs('#import_import').addEventListener('click', _import_import_click);
	qs('#import_cancel').addEventListener('click', _import_cancel_click);

	//Objective dialog click handlers
	qs('#objective_add').addEventListener('click', _objective_add_click);
	qs('#objective_cancel').addEventListener('click', _objective_cancel_click);

	//On escape, _close_dialogs
	document.addEventListener('keyup', function(e) {
		if (e.which == 27) {
			_close_dialogs();
			//Clear anything we've added to the board
			_draw_board();
		}
	});

	//Add canvas mouse listeners
	var board = qs('#board');
	board.addEventListener('mousemove', _canvas_mouse_move);
	board.addEventListener('mousedown', _canvas_mouse_down);
	board.addEventListener('mouseup', _canvas_mouse_up);

	//Make the canvas the correct size
	board.width = 800;
	board.height = 510;

	if (localStorage.last_board) {
		_load_board(localStorage.last_board);
	} else {
		_new_board();
	}
	_draw_board();

	//Populate the colour selects
	function gen_colour(name, colour, text) {
		return '<label style="border: 1px solid black; background: '+colour.colour+'">'
			+'<input type="radio" name="'+name+'" value="'+colour.id+'" checked="checked"/>'
			+(text || '&nbsp;&nbsp;')
			+'</label>';
	}
	var html_colours1 = '',
		html_colours2 = '';
	Object.keys(COLOURS).forEach(function(colour_id) {
		var colour = COLOURS[colour_id];
		html_colours1 += gen_colour('connection_colour_node1', colour);
		html_colours2 += gen_colour('connection_colour_node2', colour);
	});
	//Add on the n/a option to list 2
	html_colours2 += gen_colour('connection_colour_node2', {id: 'none'}, 'N/A');
	//Put the HTML on the form
	qs('#connection_colour1').innerHTML = html_colours1;
	qs('#connection_colour2').innerHTML = html_colours2;
};
