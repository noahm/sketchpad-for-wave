// Code originally part of CanvasPaint
// by Christopher Clay <canvas@c3o.org>
//
// Modified for Google Wave
// by Noah Manneschmidt <noah@manneschmidt.net>
//
// The code in this file is dedicated to the Public Domain
// http://creativecommons.org/licenses/publicdomain/
//


//some global vars
var canvas, c, canvastemp, ctemp, wsp, co, check;
var iface = { dragging:false, resizing:false }

function init() { 

	wsp = document.getElementById('workspace');

	//set up canvas
	canvas = document.getElementById('canvas');
	if(canvas.getContext) {
		c = canvas.getContext("2d");
	
		//set up defaults
		c.tool = new tool.brush();
		c.lineWidth = 1;
		c.strokeStyle = '#000';
		c.fillStyle = '#FFF';
		c.tertStyle = '#DDD';
		c.strokeFill = 1; //outline shapes

		c.fillRect(0, 0, canvas.width, canvas.height); //fill with background color (=not transparent)

		//set up overlay canvas (for preview when drawing lines, rects etc)
		canvastemp = document.getElementById("canvastemp");
		ctemp = canvastemp.getContext("2d");

		//set up events
		//window.onmouseup = bodyUp;
		//window.onmousemove = bodyMove;
		canvas.onmousedown = canvastemp.onmousedown = c_down;
		canvas.onmousemove = canvastemp.onmousemove = c_move;
		canvas.onmouseout = canvastemp.onmouseout = c_out;
		canvas.onmouseup = canvastemp.onmouseup = c_up;
		selTool(document.getElementById('brush'));
		selSetting(document.getElementById('brush-settings').childNodes[3], 'c.lineWidth=5;c.lineCap=\'round\'');

	} else { //go away, IE!
    // deal with absence of canvas?
	}

}

function clearCanvas(c) {
	c.clearRect(0,0,c.canvas.width,c.canvas.height);
}

function getxy(e, o) {
//gets mouse position relative to object o

	if(c) {
		var bo = getpos(o);
		var x = e.clientX - bo.x; //+ wsp.scrollLeft;	//correct for canvas position, workspace scroll offset
		var y = e.clientY - bo.y; //+ wsp.scrollTop;
		//x += document.documentElement.scrollLeft;	//correct for window scroll offset
		//y += document.documentElement.scrollTop;
		return { x: x-.5, y: y-.5 }; //-.5 prevents antialiasing of stroke lines
	}
}

function getpos(o) {
//gets position of object o
	var bo, x, y, b; x = y = 0;
	if (o.getBoundingClientRect) { // standards-based
		bo = o.getBoundingClientRect();
		x = bo.left; y = bo.top;
	} else { //opera, safari etc
		while(o && o.nodeName != 'BODY') {
			x += o.offsetLeft;
			y += o.offsetTop;
			b = parseInt(document.defaultView.getComputedStyle(o,null).getPropertyValue('border-width'));
			if(b > 0) { x += b; y +=b; }
			o = o.offsetParent;
		}
	}
	return { x:x, y:y }
}

var tool = {

	_shapes: function() {

		this.down = this._down = function() {
			activateTempCanvas();
			this.start = { x:m.x, y:m.y } 
			this.status = 1;
			c.beginPath();
		}
		this._move = function() {
			ctemp.clearRect(0, 0, canvastemp.width, canvastemp.height);
		}
		this._up = function() {
			canvastemp.style.display='none';
			this.status = 0;
			saveState();
		}

	},

	_brushes: function() {

		this.down = function() {
			this.last = null;
			this.cp = null;
			this.lastcp = null;
			this.disconnected = null;
			c.beginPath();

			this.sstart = this.last = { x:m.x, y:m.y } //extra s in sstart to not affect status bar display
			this.status = 1;
		}
		this.move = function(e) { 

			if(this.disconnected) {	//re-entering canvas: dont draw a line
				this.disconnected = null;
				this.last = { x:m.x, y:m.y }
			} else {				//draw connecting line
				this.draw();
			}
			c.moveTo(m.x, m.y);

		}
		this.up = function() {
			if(this.sstart && this.sstart.x == m.x && this.sstart.y == m.y) {
				drawDot(m.x, m.y, c.lineWidth, c.strokeStyle);
			}
			this.sstart = null;
			this.status = 0;
			saveState();
		}
		this.draw = function() {

			//unpretty
			c.lineTo(m.x, m.y);
			c.stroke();	
			c.beginPath();
			
			this.last = { x:m.x, y:m.y }
		}

	},


	brush: function() {

		this.name = 'brush';
		this.status = 0;
		this.inherit = tool._brushes; this.inherit();

	},


	airbrush: function() {
	
		this.name = 'airbrush';
		this.status = 0;

		c.lineCap = 'square';

		this.down = function() {
			this.drawing = setInterval('c.tool.draw()', 50);
			this.last = { x:m.x, y:m.y }
			this.lineCap = 'square';
			this.status = 1;
		}
		this.move = function(e) { 
			this.last = { x:m.x, y:m.y }
		}
		this.up = function(e) {
			clearInterval(this.drawing);
			this.status = 0;
			saveState();
		}
		
		this.draw = function() {
			//iface.txy.innerHTML = this.last.x+'/'+this.last.y;
			c.save();
			c.beginPath();
			c.arc(this.last.x, this.last.y, c.lineWidth*4, 0, Math.PI*2, true);
			c.clip();
			for(var i=c.lineWidth*15; i>0; i--) {
				var rndx = c.tool.last.x + Math.round(Math.random()*(c.lineWidth*8)-(c.lineWidth*4));
				var rndy = c.tool.last.y + Math.round(Math.random()*(c.lineWidth*8)-(c.lineWidth*4));
				drawDot(rndx, rndy, 1, c.strokeStyle);
			}
			c.restore();
		}


	},


	line: function() {

		this.name = 'line';
		this.status = 0;
		this.inherit = tool._shapes; this.inherit();

		c.lineCap = 'round';
		c.lineWidth = 1;

		this.move = function(e) {
			this._move();
			drawLine(this.start.x, this.start.y, m.x, m.y, e.shiftKey, ctemp);
		}
		this.up = function(e) {
			this._up();
			drawLine(this.start.x, this.start.y, m.x, m.y, e.shiftKey, c);
			saveState();
		}

	},


	rectangle: function() {

		this.name = 'rectangle';
		this.status = 0;
		this.inherit = tool._shapes; this.inherit();

		this.move = function(e) {
			this._move();
			drawRectangle(this.start.x, this.start.y, m.x, m.y, e.shiftKey, ctemp);
		}
		this.up = function(e) {
			this._up();
			drawRectangle(this.start.x, this.start.y, m.x, m.y, e.shiftKey, c);
			saveState();
		}

	},


	ellipse: function() {

		this.name = 'ellipse';
		this.status = 0;
		this.inherit = tool._shapes; this.inherit();

		this.down = function(e) {
			this._down();
			this.lastLineWidth = c.lineWidth;
			if(c.strokeFill == 3) { c.lineWidth+=1.1; ctemp.lineWidth+=1.1; } //hm
		}
		this.move = function(e) {
			this._move();
			drawEllipse(this.start.x, this.start.y, m.x, m.y, e.shiftKey, ctemp);
		}
		this.up = function(e) {
			this._up();
			drawEllipse(this.start.x, this.start.y, m.x, m.y, e.shiftKey, c);
			if(c.strokeFill == 3) { c.lineWidth = this.lastLineWidth; ctemp.lineWidth = this.lastLineWidth; }
			saveState();
		}

	},


	curve: function() {

		this.name = 'curve';
		this.status = 0;

		c.lineCap = 'round';
		c.lineWidth = 1;

		this.down = function() {
			if(this.status==0) { //starting
				undoSave();
				activateTempCanvas();
				this.start = { x:m.x, y:m.y } 
				this.end = null;
				this.bezier1 = null;
				this.status = 5;
				c.beginPath();
			} else if(this.status==4 || this.status==2) { //continuing
				this.status--;
			}
		}
		this.move = function(e) {
			
			if(this.status==5) {
				clearCanvas(ctemp);
				drawLine(this.start.x, this.start.y, m.x, m.y, e.shiftKey, ctemp);
				ctemp.stroke();

			} else if(this.status == 3 || this.status == 1) {
				clearCanvas(ctemp);
				ctemp.moveTo(this.start.x, this.start.y);
				var b1x = (this.bezier1) ? this.bezier1.x : m.x;
				var b1y = (this.bezier1) ? this.bezier1.y : m.y;
				var b2x = (this.bezier1) ? m.x : this.end.x;
				var b2y = (this.bezier1) ? m.y : this.end.y;

				ctemp.bezierCurveTo(b1x, b1y, b2x, b2y, this.end.x, this.end.y);
				ctemp.stroke();
			}
		}
		this.up = function() {
			if(this.status==5) { //setting endpoint     // && source.id != 'body'
				this.end = { x:m.x, y:m.y }
				this.status = 4;
			} else if(this.status==3) { //setting bezier1  && source.id != 'body'
				this.bezier1 = { x:m.x, y:m.y }
				clearCanvas(ctemp);
				ctemp.moveTo(this.start.x, this.start.y);
				ctemp.bezierCurveTo(m.x, m.y, this.end.x, this.end.y, this.end.x, this.end.y);
				ctemp.stroke();
				this.status = 2;
			} else if(this.status==1) { //setting bezier2  && source.id != 'body'
				canvastemp.style.display='none';
				c.moveTo(this.start.x, this.start.y);
				c.bezierCurveTo(this.bezier1.x, this.bezier1.y,  m.x, m.y, this.end.x, this.end.y);
				c.stroke();
				this.status = 0;
				saveState();
			}
		}
	
	}

}


function c_down(e) {
//handles mousedown on the canvas depending on tool selected

	var source = e.currentTarget;
	m = getxy(e, canvas);

	if(c.tool.name != 'select' && c.tool.name != 'eraser' && c.tool.name != 'picker') { //no color switching for these
		if(e.ctrlKey) {							 //ctrl: switch tert & stroke
			var temp = c.tertStyle;
			c.tertStyle = c.strokeStyle;
			c.strokeStyle = temp;
		}
		if(e.button == 2 && c.tool.name != 'eraser') { //right: switch stroke & fill
			var temp = c.strokeStyle;
			c.strokeStyle = c.fillStyle;
			c.fillStyle = temp;
		}
	}

	c.tool.down(e);
	c.moveTo(m.x, m.y); //?

	return false;
}


function c_up(e) {
//handles mouseup on the canvas depending on tool selected

	m = getxy(e, canvas);

	e.stopPropagation();

	c.tool.up(e);
	
	if(c.tool.name != 'select' && c.tool.name != 'eraser' && c.tool.name != 'picker') { //no color switching for these
		if(e.button == 2 && c.tool.name != 'eraser') { //right: switch stroke & fill back
			var temp = c.fillStyle;
			c.fillStyle = c.strokeStyle;
			c.strokeStyle = temp;
		}
		if(e.ctrlKey) { 
			var temp = c.strokeStyle;
			c.strokeStyle = c.tertStyle;
			c.tertStyle = temp;
		}
	}

	return false;
}

function c_move(e) {
	m = getxy(e, canvas);
	e.stopPropagation();

	if(c.tool.status > 0) {
		c.tool.move(e);
	}

	return false;
}

function c_out(e) {
	//var source = e.currentTarget;

	if(c && (c.tool.name=='pencil' || c.tool.name=='eraser' || c.tool.name=='brush') && c.tool.status==1) { 
		c.tool.disconnected = 1;
		m = getxy(e, canvas);
		c.tool.draw();
	}

}


function activateTempCanvas() {
//resets and shows overlay canvas

	if(m) { ctemp.moveTo(m.x, m.y); }							//copy context from main
	ctemp.lineCap = c.lineCap;
	ctemp.lineWidth = c.lineWidth;
	ctemp.strokeStyle = c.strokeStyle;
	ctemp.fillStyle = c.fillStyle;
	ctemp.clearRect(0, 0, canvastemp.width, canvastemp.height);	//clear
	canvastemp.style.display='block';							//show
	canvastemp.style.position='relative';						//wtfbbq

}

function bodyMove(e) {
//lets the user move outside the canvas while drawing shapes and lines
	if(c.tool.status > 0) { c_move(e); }
}


function bodyUp(e) {
//stops drawing even if mouseup happened outside canvas
	if(c && c.tool.name != 'polygon' && c.tool.status > 0) {
		c_up(e);
	}
}

function drawDot(x, y, size, col, trg) {

	x = Math.floor(x)+1; //prevent antialiasing of 1px dots
	y = Math.floor(y)+1;

	if(x>0 && y>0) {

		if(!trg) { trg = c; }
		if(col || size) { var lastcol = trg.fillStyle; var lastsize = trg.lineWidth; }
		if(col)  { trg.fillStyle = col;  }
		if(size) { trg.lineWidth = size; }	
		if(trg.lineCap == 'round') {
			trg.arc(x, y, trg.lineWidth/2, 0, (Math.PI/180)*360, false);
			trg.fill();
		} else {
			var dotoffset = (trg.lineWidth > 1) ? trg.lineWidth/2 : trg.lineWidth;
			trg.fillRect((x-dotoffset), (y-dotoffset), trg.lineWidth, trg.lineWidth);
		}
		if(col || size) { trg.fillStyle = lastcol; trg.lineWidth = lastsize; }

	}
}



function drawLine(x1, y1, x2, y2, mod, trg) { 

	if(trg.lineWidth % 2 == 0) { x1 = Math.floor(x1); y1 = Math.floor(y1); x2 = Math.floor(x2); y2 = Math.floor(y2); } //no antialiasing

	trg.beginPath();
	trg.moveTo(x1, y1);
	if(mod) {
		var dx = Math.abs(x2-x1);
		var dy = Math.abs(y2-y1);	
		var dd = Math.abs(dx-dy);
		if(dx > 0 && dy > 0 && dx != dy) {
			if(dd < dx && dd < dy) { //diagonal
				if(dx < dy) {
					y2 = y1+(((y2-y1)/dy)*dx);
				} else {
					x2 = x1+(((x2-x1)/dx)*dy);
				}
			} else if(dx < dy) {
				x2 = x1;
			} else if(dy < dx) {
				y2 = y1;
			}
		}
	}
	trg.lineTo(x2, y2);
	trg.stroke();
	trg.beginPath();
	return { x:x2, y:y2 }
}

function drawEllipse(x1, y1, x2, y2, mod, trg) {
	//bounding box. this maybe isn't the best idea?
	 
	var dx = Math.abs(x2-x1);
	var dy = Math.abs(y2-y1);
	
	if(mod && !(dx==dy)) { 	//shift held down: constrain
		if(dx < dy) {
			x2 = x1+(((x2-x1)/dx)*dy);
		} else {
  		y2 = y1+(((y2-y1)/dy)*dx);
		} 
	}

  var KAPPA = 4 * ((Math.sqrt(2) -1) / 3);
	var rx = (x2-x1)/2;
	var ry = (y2-y1)/2;	
  var cx = x1+rx;
  var cy = y1+ry;

	trg.beginPath();
  trg.moveTo(cx, cy - ry);
  trg.bezierCurveTo(cx + (KAPPA * rx), cy - ry,  cx + rx, cy - (KAPPA * ry), cx + rx, cy);  
  trg.bezierCurveTo(cx + rx, cy + (KAPPA * ry), cx + (KAPPA * rx), cy + ry, cx, cy + ry); 
  trg.bezierCurveTo(cx - (KAPPA * rx), cy + ry, cx - rx, cy + (KAPPA * ry), cx - rx, cy); 
  trg.bezierCurveTo(cx - rx, cy - (KAPPA * ry), cx - (KAPPA * rx), cy - ry, cx, cy - ry); 

	if(c.strokeFill == 1 || c.strokeFill == 3) { trg.stroke(); }
	if(c.strokeFill == 2 || c.strokeFill == 3) { trg.fill();   }
}


function drawRectangle(x1, y1, x2, y2, mod, trg) {

	var dx = Math.abs(x2-x1);
	var dy = Math.abs(y2-y1);

	if(mod && dx != dy) {	//shift held down: constrain
		if(dx < dy) {
			y2 = y1+(((y2-y1)/dy)*dx);
		} else {
			x2 = x1+(((x2-x1)/dx)*dy);
		}
	}
	
	if(c.strokeFill == 2 || trg.lineWidth % 2 == 0) {    //no antialiasing
		x1 = Math.floor(x1); y1 = Math.floor(y1); x2 = Math.floor(x2); y2 = Math.floor(y2);
	}
	trg.rect(x1, y1, (x2-x1), (y2-y1));
	if(c.strokeFill == 2 || c.strokeFill == 3) { trg.fill(); }
	if(c.strokeFill == 1 || c.strokeFill == 3) { trg.stroke(); }

}


function constrain(n, min, max) {
	if(n > max) return max;
	if(n < min) return min;
	return n;
}

function intersects(m, start, dim) {
//checks if m(x,y) is between start(x,y) and start+dim(x,y)
	if(	m.x >= start.x && m.y >= start.y &&
		m.x <= (start.x+dim.x) && m.y <= (start.y+dim.y)) {
		return true;
	} else {
		return false;
	}
}

function selCol(o, e, context) {
	col = (typeof(o) == 'string') ? o : o.style.backgroundColor;
	var colorind;
	if(context == 1 || (e && e.button == 2)) { //right
		colorind = document.getElementById('currcolback');
		c.fillStyle = col;
		ctemp.fillStyle=col;
	} else {
		colorind = document.getElementById('currcolfore');
		c.strokeStyle=col;
		ctemp.strokeStyle=col;
	}
  
  if(colorind) {
    colorind.style.backgroundColor = col;
  }
  
	if(e) e.preventDefault();

}

function selTool(o) {

	c.tool.status = 0;
	canvastemp.style.display='none';
	var newtool = o.id;

	document.getElementById('workspace').className = newtool;

	//button highlighting
	var toolbarbtns = document.getElementById('buttons').getElementsByTagName('li');
	for(var i=0; i<toolbarbtns.length;i++) {
		if(toolbarbtns[i].className == 'sel') { toolbarbtns[i].className=''; }
	}
	o.className = 'sel';
	 
	//reset color (after eraser and select)
	if(c.lastStrokeStyle) { selCol(c.lastStrokeStyle); c.lastStrokeStyle = null }
	
	if(c.tool.name == 'polygon') { c.tool.close(); }

	c.lastTool = c.tool.name;
	c.tool = new tool[newtool]();

	var newtool = shareSettingsPanels(c.tool.name);

	//settings panel switching
	var settingpanels = document.getElementById('settings').getElementsByTagName('div');
	for(var i=0; i<settingpanels.length;i++) {
		if(settingpanels[i].style.display == 'block') { settingpanels[i].style.display='none'; }
	}
	if(document.getElementById(newtool+'-settings')) {
		document.getElementById(newtool+'-settings').style.display = 'block';
		if(newtool != 'zoom') { //cause this would switch back
			var settingbtns = document.getElementById(newtool+'-settings').childNodes;
			for(var i=0; i<settingbtns.length;i++) { //reapply last selection
				if(settingbtns[i].className == 'sel') { settingbtns[i].onclick(); }
			}
		}
	}

}

function saveState() {
	//save to google
	//console.log(canvas.toDataURL());
	wavestate = wave.getState();
	wavestate.submitValue('image', canvas.toDataURL());
}

function selSetting(o, sett) {

	c.tool.status = 0;
	canvastemp.style.display='none';

	var newtool = shareSettingsPanels(c.tool.name);
	
	if(document.getElementById(newtool+'-settings')) {
		var settingbtns = document.getElementById(newtool+'-settings').childNodes;
		for(var i=0; i<settingbtns.length;i++) {
			if(settingbtns[i].className == 'sel') { settingbtns[i].className=''; }
		}
		o.className = 'sel';
		eval(sett);
	}
}

function shareSettingsPanels(tool) {
	if(tool=='select' || tool=='text')  { return 'select';  }
	if(tool=='line'   || tool=='curve') { return 'line'; }
	if(tool=='rectangle' || tool=='polygon'|| tool=='ellipse' || tool=='rounded') { return 'shape'; }
	if(tool=='ffselect' || tool=='select'|| tool=='text') { return 'trans'; }
	return tool;
}


function buttonReset(o) {
	if(o.className=='down') { o.className=''; }  //todo why isn't this working
}
function buttonDown(e, o) {
	if(e.button != 2 && o.className != 'sel') { o.className='down'; } //not on rightclick
}
