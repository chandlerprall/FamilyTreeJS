(function() {
	
	var merge = function() {
		
		var merged = {};
		
		for (var i = 0; i < arguments.length; i++) {
			var source = arguments[i];
			if (typeof source !== 'object') { continue; } // Each argument must be an object
			
			for (var key in source) {
				var value = source[key];
				if (typeof value !== 'object') {
					// Simple value
					merged[key] = value;
				} else {
					// Value is an object
					if (typeof merged[key] === 'undefined') {
						merged[key] = deep_copy(value);
					} else {
						merged[key] = merge(merged[key], value);
					}
				}
			}
		}
		
		return merged;
		
	};
	
	window['merge'] = merge;
	
	var deep_copy = function(source) {
		
		var copied = {};
		
		if (typeof source !== 'object') {
			return copied;
		}
		
		for (var key in source) {
			var value = source[key];
			if (typeof value === 'object') {
				value = deep_copy(value);
			}
			copied[key] = value;
		}
		
		return copied;
		
	};
	
	var nextNodeID = (function() {
		var nodes = 0;
		return function() {
			return 'ft_node_' + nodes++;
		}
	})()
	
	window['FamilyTreeJS'] = {
		
		AUTHOR: 'Chandler Prall <chandler.prall@gmail.com>',
		VERSION: '.1',
		
		FamilyTree: function() {
		
			/**
			 * FamilyTree private members
			 */
			var tree_element = null;
			var scroll_info = { 'scrolling':false, 'x1':0, 'x2':0, 'y1':0, 'y2':0 };
			
			this.config = {
				compressable: true,			
				node: {
					fontcolor: 'black',
					background: 'white',
					height: 30,
					width: 100,
					borderwidth: 1,
					bordercolor: 'black',
					spacingVertical: 40,
					spacingHorizontal: 15
				},
				line: {
					offsetY: 0,
					width: 2,
					color: 'random'
				}
			};
			
			var people = []; // Holds all people in the family tree
			
			
			/**
			 * Class Person
			 */
			var Person = function(identity, config, details) {
				
				this.node_id = nextNodeID();
				this.identity = identity;
				this.details = (typeof details !== 'undefined') ? details : {};
				
				this.parents = [];
				this.children = [];
				
				this.leveled = false;
				this.level = null;
				this.rendered = false;
				this.on_grid = false;
				this.starting_pos = null;
				this.connected = false;
				
				this.node = null;
				this.config = config;
				this.line_color = null;
				
				this.birth = function(identity, details) {
					
					var config = deep_copy(this.config);
					if (typeof details !== 'undefined' && typeof details.config !== 'undefined') {
						config = merge(config, details.config);
					}
					
					// Create new person
					var person = new Person(identity, deep_copy(config), details);
					
					// Add parent/child relatonship
					person.parents.push(this);
					this.children.push(person);
					if (typeof details !== 'undefined' && typeof details.partner !== 'undefined') {
						person.parents.push(details.partner);
						details.partner.children.push(person);
					}
					
					people.push(person);
					
					return person;
					
				};
				
				this.Level = function(level) {
					
					this.level = level;
					this.leveled = true;
					
					for (var i = 0; i < this.parents.length; i++) {
						if (!this.parents[i].leveled) {
							this.parents[i].Level(level - 1);
						}
					}
					
					for (var i = 0; i < this.children.length; i++) {
						if (!this.children[i].leveled) {
							this.children[i].Level(level + 1);
						}
					}
					
				};
				
				this.GetMaxNodeWidth = function() {
					
					var width = 0;
					
					var has_children = false;
					
					for (var i = 0; i < this.children.length; i++) {
						if (this.children[i].parents[0] === this) {
							has_children = true;
							width += this.children[i].GetMaxNodeWidth();
						}
					}
					
					return width + ((has_children) ? 0 : 1);
					
				};
				
				this.FillGrid = function(grid, starting_pos) {
					
					if (this.on_grid) {
						return grid;
					}
					
					if (typeof grid[this.level] === 'undefined') {
						grid[this.level] = [];
					};
					
					this.on_grid = true;
					
					// Make sure our main parent is on the grid
					if (this.parents.length > 0) {
						if (typeof grid[this.level-1] === 'undefined') {
							grid[this.level-1] = [];
						}
						//grid = this.parents[0].FillGrid(grid, grid[this.level-1].length);
						grid = this.parents[0].FillGrid(grid, starting_pos);
						if (this.parents[0].starting_pos > starting_pos) {
							starting_pos = this.parents[0].starting_pos;
						}
					}
					
					while (typeof grid[this.level][starting_pos] !== 'undefined' && grid[this.level][starting_pos] !== null) {
						starting_pos++;
					}
					
					this.starting_pos = starting_pos;
					
					while (starting_pos > grid[this.level].length) {
						grid[this.level].push(null);
					}
					
					grid[this.level][starting_pos] = this;
					for (var i = 0; i < this.GetMaxNodeWidth() - 1; i++) {
						grid[this.level].push(null);
					}
					
					// Lists of partners & children
					var partners = [];
					var children = [];
					for (var i = 0; i < this.children.length; i++) {
						if (this === this.children[i].parents[0]) {
							children.push(this.children[i]);
						}
						
						for (var j = 0; j < this.children[i].parents.length; j++) {
							if (this !== this.children[i].parents[j]) {
								var found = false;
								for (var k = 0; k < partners.length; k++) {
									if (partners[k] === this.children[i].parents[j]) {
										found = true;
									}
								}
								if (!found) {
									partners.push(this.children[i].parents[j]);
								}
							}
						}
					}
					
					// Put the partners on our grid
					for (var i = 0; i < partners.length; i++) {
						grid = partners[i].FillGrid(grid, starting_pos + this.GetMaxNodeWidth());
					}
					
					// Add our children
					var children_aggregate_size = 0;
					for (var i = 0; i < children.length; i++) {
						grid = children[i].FillGrid(grid, starting_pos + children_aggregate_size);
						children_aggregate_size += children[i].GetMaxNodeWidth();
					}
					
					return grid;
				};
				
				this.IsChildNo = function() {
					
					if (this.parents.length === 0) {
						return 0;
					}
					
					parent = this.parents[0];
					for (var i = 0; i < parent.children.length; i++) {
						if (parent.children[i].node_id === this.node_id) {
							return i;
						}
					}
					
				};
				
				this.DrawConnections = function(target) {
					
					this.connected = true;
					
					for (var i = 0; i < this.children.length; i++) {
						var child = this.children[i];
						if (!child.connected) {
							for (var j = 0; j < child.parents.length; j++) {
								var parent = child.parents[j];
								
								if (this.line_color === null) {
									switch (this.config.line.color) {
										case 'random':
											this.line_color = 'rgb(' + parseInt(Math.random() * 255) + ',' + parseInt(Math.random() * 255) + ',' + parseInt(Math.random() * 255) + ')';
											break;
										case 'inherit':
											this.line_color = this.parents[0].line_color;
											this.config.line.color = this.line_color;
										default:
											this.line_color = this.config.line.color;
									}
								}
								
								if (child.parents.length > 0 || this !== parent) {
									
									if (child.parents.length > 1) {
										var other_parent = parent;
									}
									
									// Draw line down from me
									var shape = AutoshapeJS.createShape({
										'shape': 'Box',
										'color': this.line_color,
										'width': this.config.line.width + 'px',
										'height': ((this.config.node.spacingVertical / 2) + this.config.line.offsetY) + 'px',
										'position': 'absolute',
										'left': ((this.config.node.borderwidth * 2) + this.node.element.offsetLeft + (this.config.node.width / 2)) + 'px',
										'top': ((this.config.node.borderwidth * 2) + this.node.element.offsetTop + this.config.node.height)+1 + 'px'
									});
									shape.attachTo(target);
									
									if (typeof other_parent !== 'undefined') {
										
										// Draw line down from other parent
										var shape = AutoshapeJS.createShape({
											'shape': 'Box',
											'color': this.line_color,
											'width': this.config.line.width + 'px',
											'height': (((this.level - other_parent.level)*this.config.node.spacingVertical) + ((this.level - other_parent.level) * (this.config.node.spacingVertical / 2))) + ((this.config.node.spacingVertical / 2) + this.config.line.offsetY) + 'px',
											'position': 'absolute',
											'left': ((this.config.node.borderwidth * 2) + other_parent.node.element.offsetLeft + (this.config.node.width / 2)) + 'px',
											'top': ((this.config.node.borderwidth * 2) + other_parent.node.element.offsetTop + this.config.node.height)+1 + 'px'
										});
										shape.attachTo(target);
										
										// Draw line across to other parent
										var shape = AutoshapeJS.createShape({
											'shape': 'Box',
											'color': this.line_color,
											'width': (this.node.element.offsetLeft < other_parent.node.element.offsetLeft) ?
												((this.config.node.borderwidth * 2) + other_parent.node.element.offsetLeft - this.node.element.offsetLeft) + 'px'
												: ((this.config.node.borderwidth * 2) + this.node.element.offsetLeft - other_parent.node.element.offsetLeft) + 'px',
											'height': this.config.line.width + 'px',
											'position': 'absolute',
											'left': (this.node.element.offsetLeft < other_parent.node.element.offsetLeft) ?
												((this.config.node.borderwidth * 2) + this.node.element.offsetLeft + (this.config.node.width / 2)) + 'px'
												: ((this.config.node.borderwidth * 2) + other_parent.node.element.offsetLeft + (this.config.node.width / 2)) + 'px',
											'top': ((this.config.node.borderwidth * 2) + other_parent.node.element.offsetTop + this.config.node.height + (this.config.node.spacingVertical / 2) + this.config.line.offsetY) + 'px'
										});
										
										shape.attachTo(target);
									}
									
									// Draw line across to child
									var shape_width = child.node.element.offsetLeft - this.node.element.offsetLeft;
									if (shape_width < 0) shape_width *= -1;
									var shape_left = (this.node.element.offsetLeft < child.node.element.offsetLeft) ? this.node.element.offsetLeft + (this.config.node.borderwidth*2) + (this.config.node.width / 2) : child.node.element.offsetLeft + (this.config.node.borderwidth*2) + (this.config.node.width / 2) ;
									var shape = AutoshapeJS.createShape({
										'shape': 'Box',
										'color': this.line_color,
										'width': shape_width + 'px',
										'height': this.config.line.width + 'px',
										'position': 'absolute',
										'left': shape_left + 'px',
										'top': ((this.config.node.borderwidth * 2) + this.node.element.offsetTop + this.config.node.height + (this.config.node.spacingVertical / 2) + this.config.line.offsetY) + 'px'
									});
									shape.attachTo(target);
									
									// Draw line down to child
									var shape = AutoshapeJS.createShape({
										'shape': 'Box',
										'color': this.line_color,
										'width': this.config.line.width + 'px',
										'height': (this.config.node.spacingVertical / 2) + 1 + this.config.node.height - (this.config.line.offsetY) + 'px',
										'position': 'absolute',
										'left': ((this.config.node.borderwidth * 2) + child.node.element.offsetLeft + (this.config.node.width / 2)) + 'px',
										'top': ((this.config.node.borderwidth * 2) + child.node.element.offsetTop - (this.config.node.spacingVertical / 2) + this.config.line.offsetY) + 'px'
									});
									shape.attachTo(target);
									
									
									child.DrawConnections(target);
									
								}
							}
						}
					}
				}
				
			};
			
			
			/**
			 * AddPerson function
			 * 
			 * used to add a 'parentless' person to the family tree (no higher-level nodes)
			 */
			this.AddPerson = function(identity, details) {
				
				var config = deep_copy(this.config);
				if (typeof details !== 'undefined' && typeof details.config !== 'undefined') {
					config = merge(config, details.config);
				}
				
				var person = new Person(identity, config, details);
				people.push(person);
				return person;
				
			};
			
			
			var MouseCoordinatesFromEvent = function(e) {
				var pos = {x:null, y:null};
				if (e.pageX || e.pageY) 	{
					pos.x = e.pageX;
					pos.y = e.pageY;
				} else if (e.clientX || e.clientY) 	{
					pos.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
					pos.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
				}
				return pos;
			};
			
			
			/**
			 * Render function
			 *
			 * renders the family tree
			 */
			this.Render = function(element) {
				
				tree_element = element;
				tree_element.style.position = 'relative';
				tree_element.innerHTML = '';
				
				// Generate all the people's levels so we know where they are at
				people[0].Level(0);
				
				min_level = 0;
				for (var i = 0; i < people.length; i++) {
					if (people[i].level < min_level) {
						min_level = people[i].level;
					}
				}
				
				if (min_level < 0) {
					var level_increase = min_level * -1
					for (var i = 0; i < people.length; i++) {
						people[i].level += level_increase;
					}
				}
				
				var grid = {};
				
				grid = people[0].FillGrid(grid, 0);
				
				// Compress the grid
while_loop:
				while (true) {
					for (var i in grid) {
						level = grid[i];
						
						for (var j = 1; j < level.length; j++) {
							node = level[j];
							
							if (node !== null && (level[j-1] === null) && node.config.compressable === true) {
								// It's a candidate to move, nothing to it's left. Is anything around it may conflict with?
								
								// Are we already above our first parent? If so we shouldn't wander away
								if (node.parents.length) {
									if (grid[node.level-1] === null || typeof grid[node.level-1] !== 'undefined') {
										if (grid[node.level-1][j] !== null && grid[node.level-1][j] === node.parents[0]) {
											continue;
										}
									}
								}
								
								var clear_above = true;
								var clear_below = true;
								
								/*
								if (typeof grid[node.level-1] !== 'undefined') {
									if (grid[node.level-1][j-1] !== null && typeof grid[node.level-1][j-1] !== 'undefined' && grid[node.level-1][j-1].children.length > 0) {
										// We're blocked if the thing above isn't our parent
										
										clear_above = false;
										
										for (var k = 0; k < node.parents.length; k++) {
											if (grid[node.level-1][j-1] === node.parents[k]) {
												clear_above = true;
											}
										}
										
									}
								}
								*/
								
								if (typeof grid[node.level+1] !== 'undefined') {
									if (grid[node.level+1][j-1] !== null && typeof grid[node.level+1][j-1] !== 'undefined' && grid[node.level+1][j-1].parents.length > 0) {
										// We're blocked if the thing below isn't our child
										
										clear_below = false;
										
										for (var k = 0; k < node.children.length; k++) {
											if (grid[node.level+1][j-1] === node.children[k]) {
												clear_below = true;
											}
										}
										
									}
								}
								
								if (clear_above && clear_below) {
									grid[i][j-1] = node;
									grid[i][j] = null;
									continue while_loop;
								}
							}
						}
						
					}
					
					break;
				}
				
				var all_nodes = [];
				
				for (var level in grid) {
					var nodes = grid[level];
					for (var i = 0; i < nodes.length; i++) {
						var node = nodes[i];
						if (node !== null) {
							this.RenderNode(node, tree_element, level, i);
							all_nodes.push(node);
						}
					}
				}
				
				for (var node in all_nodes) {
					node = all_nodes[node];
					node.DrawConnections(tree_element);
				}
				
				// Setup the drag ability
				tree_element.onselectstart = function() { return false; };
				tree_element.unselectable = 'on';
				tree_element.style.MozUserSelect = 'none';
				
				tree_element.style.cursor = 'move';
				tree_element.onmousedown = function(e) {
					scroll_info.scrolling = true;
					
					e = e || window.event;
					var mouse_coordinates = MouseCoordinatesFromEvent(e);
					
					scroll_info.x = mouse_coordinates.x;
					scroll_info.y = mouse_coordinates.y;
				};
				tree_element.onmouseup = function(e) {
					if (scroll_info.scrolling) {
						scroll_info.scrolling = false;
						
						e = e || window.event;
						var mouse_coordinates = MouseCoordinatesFromEvent(e);
						
						if (scroll_info.x !== null && scroll_info.y !== null) {
							
							delta = {
								x: scroll_info.x - mouse_coordinates.x,
								y: scroll_info.y - mouse_coordinates.y
							}
							
							tree_element.scrollLeft += delta.x;
							tree_element.scrollTop += delta.y;
							
						}
					}
				};
				tree_element.onmousemove = function(e) {
					if (scroll_info.scrolling) {
						
						e = e || window.event;
						var mouse_coordinates = MouseCoordinatesFromEvent(e);
						
						if (scroll_info.x !== null && scroll_info.y !== null) {
							
							delta = {
								x: scroll_info.x - mouse_coordinates.x,
								y: scroll_info.y - mouse_coordinates.y
							}
							
							tree_element.scrollLeft += delta.x;
							tree_element.scrollTop += delta.y;
							
						}
						
						scroll_info.x = mouse_coordinates.x;
						scroll_info.y = mouse_coordinates.y;
						
					}
				}
				tree_element.onmouseout = function(e) {
					e = e || window.event;
					
					// Check to see if we are, in fact, still in the tree_element
					var element = e.relatedTarget || e.toElement;
					
					if (typeof element !== 'undefined') {
					
						while (element !== null && element !== tree_element) {
							element = element.parentNode;
						}
						
						if (element !== tree_element) {
							scroll_info.scrolling = false;
						}
					
					}
				}
				
			};
			
			this.RenderNode = function(person, element, level, position) {
				
				var node_left = position * (this.config.node.width + this.config.node.spacingHorizontal);
				
				var shape = AutoshapeJS.createShape({
					'shape': 'Box',
					'color': person.config.node.background,
					'borderwidth': person.config.node.borderwidth + 'px',
					'bordercolor': person.config.node.bordercolor,
					'width': this.config.node.width + 'px',
					'height': this.config.node.height + 'px',
					'position': 'absolute',
					'left': node_left + 'px',
					'top': (level * (this.config.node.height + this.config.node.spacingVertical)) + 'px',
					'opacity': (person.identity.length > 0) ? 1 : 0
				});
				shape.attachTo(element);
				shape.element.innerHTML = person.identity;
				if (typeof person.details.blurb !== 'undefined') {
					shape.element.innerHTML += '<div class="blurb">' + person.details.blurb + '</div>';
				}
				shape.element.style.color = person.config.node.fontcolor;
				shape.element.style.textAlign = 'center';
				shape.element.className = 'familytree-node';
				
				person.node = shape;
				
			};
			
			this.center = function() {
				
				var view_center = {
						x: tree_element.clientWidth / 2,
						y: tree_element.clientHeight / 2
					}
				
				if (arguments.length == 0) {
					
					// Center the whole tree
					var center = {
						x: tree_element.scrollWidth / 2,
						y: tree_element.scrollHeight / 2
					}
					
				} else {
					
					// Center on a specific node
					var node = arguments[0];
					var center = {
						x: node.node.element.offsetLeft + (node.config.node.width / 2),
						y: node.node.element.offsetTop + (node.config.node.height / 2),
					}
					
				}
				
				tree_element.scrollLeft = center.x - view_center.x;
				tree_element.scrollTop = center.y - view_center.y;
				
			}
		
		}
		
	};
	
})();