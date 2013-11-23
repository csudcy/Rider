"use strict";
/*
TODO:
 * Connections
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
		connections: {}
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

	if (qs('#show_nodes').checked) {
		//Draw the nodes
		c.fillStyle = 'black';
		c.lineWidth = 0.5;
		c.strokeStyle = 'white';
		c.font = "20px Arial bold";
		c.textAlign = 'center';
		c.textBaseline = 'top';
		_nodes_iter(function(node) {
			//Draw the node
			c.beginPath();
			c.arc(node.x, node.y, NODE_R, 0, 2 * Math.PI);
			c.fill();
			c.stroke();
			//Draw the name
			c.fillText(node.name, node.x, node.y+NODE_R);
			c.strokeText(node.name, node.x, node.y+NODE_R);
		});
	}

	if (qs('#show_connections').checked) {
		//Draw the connections
		_connections_iter(function(connection) {
		});
	}
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

function _add_node(x, y, name) {
	//Add a new node with the given attributes
	//Find the first free id
	var node_id = 0;
	while (node_id in BOARD.nodes) {
		node_id++;
	}
	//Add a new node
	var node = {};
	node.id = node_id;
	node.x = parseInt(x, 10);
	node.y = parseInt(y, 10);
	node.name = name;
	BOARD.nodes[node_id] = node;
}

function _remove_node(node_id) {
	//Remove the node specified by id & any connections it is used by
	_connections_iter(function(connection) {
		if (connection.node1_id === node_id || connection.node2_id === node_id) {
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
	console.log('Todo: _find_connection');
}

function _add_connection(node1, node2) {
	//Add a new connection with the given attributes
	console.log('Todo: _add_connection');
	//Find the first free id
	var connection_id = 0;
	while (connection_id in BOARD.connections) {
		connection_id++;
	}
	//Add a new connection
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
	console.log('Todo: _load_image_click');
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
	console.log('Todo: _connection_ok');
}

function _connection_delete_click() {
	//Delete the connection currently being edited
	console.log('Todo: _connection_delete');
}

function _connection_cancel_click() {
	//Close the connection dialog
	_close_dialogs();
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
	Canvas listeners
\********************************************/

var node_dragged = false,
	node_current;

function _canvas_mouse_move(e) {
	//Deal with what happens when the mouse is moved
	//console.log('Todo: _canvas_mouse_move', e);
	e.preventDefault();

	switch (_get_mode()) {
		case 'node':
			node_dragged = true;
			if (e.which == 1) {
				//We could be dragging an element
				if (node_current) {
					node_current.x = e.canvasX();
					node_current.y = e.canvasY();
					_draw_board();
				}
			}
			//Check what the mouse cursor should be
			if (_find_node(e.canvasX(), e.canvasY())) {
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
	//Deal with what happens when the mouse is pressed
	//console.log('Todo: _canvas_mouse_down', e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			//Reset whether this mouse action has been a drag
			node_current = _find_node(e.canvasX(), e.canvasY());
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
	//console.log('Todo: _canvas_mouse_up', e);
	e.preventDefault();
	switch (_get_mode()) {
		case 'node':
			//Only open the node dialog if the mouse wasnt dragged
			if (!node_dragged) {
				if (e.which == 1) {
					//Add/Edit node
					if (node_current) {
						//Setup dialog for edit
						qs('#node_id').value = node_current.id;
						qs('#node_x').value = node_current.x;
						qs('#node_y').value = node_current.y;
						qs('#node_name').value = node_current.name;
						qs('#node_delete').disabled = false;
					} else {
						//Setup dialog for add
						qs('#node_id').value = '';
						qs('#node_x').value = e.canvasX();
						qs('#node_y').value = e.canvasY();
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

	//On escape, _close_dialogs
	document.addEventListener('keyup', function(e) {
		if (e.which == 27) {
			_close_dialogs();
		}
	});

	//Add canvas mouse listeners
	var board = qs('#board');
	board.addEventListener('mousemove', _canvas_mouse_move);
	board.addEventListener('mousedown', _canvas_mouse_down);
	board.addEventListener('mouseup', _canvas_mouse_up);

	//Make the canvas the correct size
	board.width = 800;
	board.height = 600;

	if (localStorage.last_board) {
		_load_board(localStorage.last_board);
	} else {
		_new_board();
	}
	_draw_board();
};
