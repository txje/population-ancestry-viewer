// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// Forked from GenomeTrack.py
// - converted to raw javascript from pyjamas
// colored genome tracks with scale and highlighting
//
// GenomeTrack contains one or more DataRows and handles
// drawing the axis scale, manages clicking and highlighting,
// and sorting and reordering strains
// ------------------------------------------------

function GenomeTrack(window, parent, t, sortable, clickhandler) {
  if(sortable == null)
    sortable = false;
  // axis scale sizes and units
  this.SCALES = [1,2,5,10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000,2500000,5000000,10000000,25000000,50000000,100000000]
  this.UNITS = {0:"", 1000:"K", 1000000:"M"}

  // initialize track
  this.size_mult = parent.size_mult;
  this.HIGHLIGHT_HEIGHT = 12 * this.size_mult + "px";
  this.TITLE_FONT = 10 * this.size_mult + "px";

  /* -------------------------------------------------------
     Data management
     -------------------------------------------------------
  */
  
  // add a DataRow to this track to be displayed
  this.addRow = function(label, chrom, color_map, colordata, textdata) {
    if(!textdata)
      textdata = [];
    datarow = new DataRow(colordata, label, chrom, textdata, color_map, this.size_mult);
    this.rows.push(datarow);
    this.canvas.add(datarow.element);
  }
  
  // determine if the range is outside the currently displayed resolution range
  this.outOfRange = function(start, end) {
    if(end - start < this.min_resolution || (this.max_resolution != null && end - start > this.max_resolution) || end > this.data_max || start < this.data_min)
      return true;
    return false;
  }
  
  // adds color data for a certain resolution
  this.addColorData = function(label, min_resolution, max_resolution, data, num) {
    if(data == null)
      data = [];
    if(num == null)
      num = 0;
    this.min_resolution = min_resolution;
    this.max_resolution = max_resolution;
    this.data_min = null;
    this.data_max = null;
    for(var d in data) {
      if(this.data_min == null || d[0] < this.data_min)
        this.data_min = d[0];
      if(this.data_max == null || d[1] > this.data_max)
        this.data_max = d[1];
    }
    for(var r in this.rows) {
      if(this.rows[r].label === label) {
        if(num == 0)
          this.rows[r].colordata = data;
        else if(num == 1)
          this.rows[r].colordata2 = data;
        break;
      }
    }
  }
  
  // add text data to overlay
  this.addTextData = function(label, data) {
    if(data == null)
      data = [];
    for(var r in this.rows) {
      if(this.rows[r].label === label) {
        this.rows[r].textdata = data;
        break;
      }
    }
  }

  // clear text data
  this.clearText = function() {
    for(r in this.rows)
      r.clearText();
  }
  
  // remove all data row and reset highlighter (used before receiving new data)
  this.empty = function() {
    this.rows = [];
    this.canvas.clear();
    this.resetHighlighter();
  }
  
  // remove secondary color data
  this.clearColorData2 = function() {
    for(r in this.rows) {
      r.colordata2 = [];
      //r.showcolordata2 = False
    }
  }
  
  // hide secondary color data (used only for diagnostic alleles)
  this.togglecolor2 = function(value) {
    for(r in this.rows) {
      if(value == null)
        this.rows[r].showcolordata2 = (!this.rows[r].showcolordata2);
      else
        this.rows[r].showcolordata2 = value;
    }
  }

  // call to update display bounds, propogates to all included DataRows
  this.update = function(start, end, width, height, height2, gap, left) {
    this.start = start;
    this.end = end;
    this.width = width;
    this.height = height;
    this.height2 = height2;
    this.left = left;
    this.gap = gap;
    this.drawAxis(start, end, width, gap, left);
    for(r in this.rows) {
      this.rows[r].update(start, end, width, height, height2, gap, left);
    }
    for(r in this.rows) {
      if(this.rows[r].colordata == null) {
        this.rows[r].style.display = 'none';
      }
      else {
        this.rows[r].style.display = 'block';
      }
    }
  }

  /* -------------------------------------------------------
     Highlighting
     -------------------------------------------------------
  */

  // display highlighted region (selected by clicking and dragging)
  this.drawHighlighter = function() {
    // left - width
    x = Math.min(this.highlight_bounds[0], this.highlight_bounds[1]);
    width = Math.max(this.highlight_bounds[0], this.highlight_bounds[1]) - x;
    this.highlighter.style.display = 'block';
    this.highlighter.style.left = x + 'px';
    this.highlighter.style.width = width + 'px';
    
    // top - height
    this.highlighter.style.top = $(this.canvas.element).offset().top + 'px';
    var height = 0;
    for(r in this.rows) {
      if(this.rows[r].colordata != null)
        height += this.rows[r].height + this.rows[r].gap;
    }
    this.highlighter.style.height = height + 'px';
    this.highlighter.style.height = $(this.canvas.element).height() + 'px';
    
    x -= $(this.canvas.element).offset().left + this.left;
    this.hstart = Math.floor(parseInt(this.start) + (x/this.unit));
    this.hend = Math.floor(parseInt(this.start) + ((x+width)/this.unit));
    
    this.zoom_sort.style.display = 'block';
    this.center.style.display = 'none';
    this.highlight_range.textContent = this.hstart + " - " + this.hend;
    this.zoom_sort.setText("Zoom"); // show zoom button
  }

  // display the currently highlighted region bounds
  this.drawPosition = function() {
    x = Math.min(this.highlight_bounds[0], this.highlight_bounds[1]);
    this.highlighter.style.display = 'block';
    this.highlighter.style.left = (x-1) + 'px';
    this.highlighter.style.width = '2px';
    
    // top - height
    this.highlighter.style.top = $(this.canvas.element).offset().top + 'px';
    var height = 0;
    for(r in this.rows) {
      if(this.rows[r].colordata != null)
        height += this.rows[r].height + this.rows[r].gap;
    }
    this.highlighter.style.height = height + 'px';
    this.highlighter.style.height = $(this.canvas.element).height() + 'px';
    
    this.highlight_range.textContent = Math.floor(parseInt(this.start) + ((x-$(this.canvas.element).offset().left-this.left)/this.unit));
    if(this.sortable) {
      this.zoom_sort.style.display = 'block';
      this.zoom_sort.setText("Sort");
    }
    else {
      this.zoom_sort.style.display = 'none';
    }
    this.center.style.display = 'block';
  }
  
  // hide the highlighter
  this.resetHighlighter = function() {
    this.highlight_bounds = [0,0];
    this.highlighting = false;
    this.highlighter.style.display = 'none';
    this.highlight_range.textContent = "";
    this.zoom_sort.style.display = 'none';
    this.center.style.display = 'none';
  }
  
  this.highlight = function(bounds) {
    this.highlight_bounds = bounds;
    this.drawHighlighter();
  }
  
  this.position = function(bounds) {
    this.highlight_bounds = bounds;
    this.drawPosition();
  }
  
  this.zoomClick = function() {
    if(this.highlight_bounds[0] == this.highlight_bounds[1] && this.zoom_sort.getText() == 'Sort') {
      this.sortClick();
      return;
    }
    var x1 = Math.min(this.highlight_bounds[0], this.highlight_bounds[1]) - $(this.canvas.element).offset().left - this.left; // current highlight_bounds are absolute to the page
    var x2 = Math.max(this.highlight_bounds[0], this.highlight_bounds[1]) - $(this.canvas.element).offset().left - this.left;
    var left = Math.floor(parseInt(this.start) + (x1 / this.unit));
    var right = Math.floor(parseInt(this.start) + (x2 / this.unit));
    this.parent.parent.zoom([left, right]);
  }
  
  this.centerClick = function() {
    var x = this.highlight_bounds[0] - $(this.canvas.element).offset().left - this.left; // current highlight_bounds are absolute to the page
    var pos = Math.floor(parseInt(this.start) + (x / this.unit));
    this.parent.parent.center(pos);
  }

  /* -------------------------------------------------------
     Event handlers
     -------------------------------------------------------
  */

  // handles mouse down events (used to start strain dragging and highlighting)
  this.onMouseDown = function(e) {
    e = $.event.fix(e || window.event);
    var x = e.pageX;
    var y = e.pageY;
    // y is normalized by the top of the first actual data row
    y -= $(this.canvas.element).offset().top;
    e.preventDefault();
    
    // strain dragging
    if(x < this.left+$(this.element).offset().left) {
      if(this.track_type == 'strain') {
        if(this.dragging) { // previously highlighting, just switch to strain dragging
          this.highlighting = false;
        }
        var drag_index = this.dragIndex(y);
        this.startDrag(drag_index);
      }
    }
    // highlighting
    else {
      this.highlighting = true;
      this.parent.parent.highlight([x,x]); // propogate - first parent is the specific track object, grandparent is mpv
    }
    return false;
  }

  // handles mouse movement on highlighting and strain dragging
  this.onMouseMove = function(e) {
    e = $.event.fix(e || window.event);
    var x = e.pageX;
    var y = e.pageY;
    y -= $(this.canvas.element).offset().top;
    e.preventDefault();
    
    // strain dragging
    if(x < this.left+$(this.canvas.element).offset().left) {
      // handle dragging strain
      if(this.dragging) {
        var index = this.dragIndex(y);
        this.doDrag(index);
      }
    }
    // highlighting
    else if(this.highlighting) {
      this.highlight_bounds[1] = x;
      this.parent.parent.highlight(this.highlight_bounds); // propogate - first parent is the specific track object, grandparent is mpv
    }
    return false;
  }

  // captures mouse button up events, ends highlighting and strain dragging
  this.onMouseUp = function(e) {
    e = $.event.fix(e || window.event);
    var x = e.pageX;
    var y = e.pageY;
    y -= $(this.canvas.element).offset().top;
    e.preventDefault();
    
    // strain dragging
    if(x < this.left+$(this.element).offset().left) {
      // handle dropping strain
      if(this.dragging) {
        var drop_index = this.dragIndex(y);
        this.doDrag(drop_index);
        this.stopDrag(this.dragging_index, drop_index);
      }
    }
    // highlighting
    else {
      if(this.highlight_bounds[0] == this.highlight_bounds[1]) {
        this.drawPosition();
        this.parent.parent.point(this.highlight_bounds); // propogate
      }
      
      this.highlighting = false;
    }
    return false;
  }

  /* -------------------------------------------------------
     Dragging
     -------------------------------------------------------
  */

  this.startDrag = function(index) {
    this.dragging_index = index;
    this.rows[this.dragging_index].style.opacity = '0.5';
    this.rows[this.dragging_index].style.filter = 'alpha(opacity=50)'; // IE
    this.dragging = true;
  }
  
  this.doDrag = function(drag_index) {
    var r = this.rows[this.dragging_index];
    this.canvas.remove(r.element);
    this.canvas.insert(r.element, drag_index);
  }

  // updates strain order during dragging
  this.stopDrag = function(drag, drop) {
    this.rows[drag].style.opacity = '1.0';
    this.rows[drag].style.filter = 'alpha(opacity=100)'; // IE
    this.relocate(drag, drop);
    
    // propogate
    var labels = [];
    for(r in this.rows)
      labels.push(this.rows[r].label);
    this.parent.parent.reorder(labels);

    this.dragging = false;
  }
  
  this.relocate = function(drag, drop) {
    var r = this.rows[drag];
    this.canvas.remove(r.element);
    this.canvas.insert(r.element, drag);
    if(drag < drop)
      var inc = 1;
    else
      var inc = -1;
    for(var i = drag; ((i < drop && inc == 1) || (i > drop && inc == -1)); i += inc) {
      this.rows[i] = this.rows[i+inc];
    }
    this.rows[drop] = r;
  }
  
  this.reorder = function(labels) {
    var i = 0;
    var newrows = [];
    for(l in labels) {
      var r = 0;
      while(r < this.rows.length) {
        if(this.rows[r].label === labels[l]) {
          newrows.push(this.rows.splice(r,1)[0]);
          break;
        }
        r++;
      }
    }
    this.rows = newrows.concat(this.rows);
    for(r in this.rows) {
      this.canvas.remove(this.rows[r].element);
      this.canvas.add(this.rows[r].element);
    }
  }
  
  this.dragIndex = function(y) {
    // identify the strain index under position y, taking into account hidden rows (with no data) above this one
    var index = 0;
    var vert = 0; // just add up heights until we get there
    while(vert < y) {
      if(this.rows[index].colordata != null)
        vert += this.rows[index].height + this.rows[index].gap;
      index += 1
    }
    return index - 1;
  }

  /* -------------------------------------------------------
     Axis
     -------------------------------------------------------
  */
  
  // draw the axis
  this.drawAxis = function(start, end, width, gap, left) {
    this.xaxis.clear();
    this.xaxis.width = width;
    var len = end - start;
    var s = 0;
    for(; s < this.SCALES.length; s++) {
      if(len/this.SCALES[s] >= 4 && len/this.SCALES[s] <= 10) {
        break;
      }
    }
    var scale = this.SCALES[s];
    var display_unit = "";
    for(key in this.UNITS) {
      if(scale >= key/2 && ((this.UNITS[key] == "K" && display_unit == "") || this.UNITS[key] == "M")) {
        display_unit = this.UNITS[key];
      }
    }
    var start_label = parseInt(start/scale);
    if(start % scale > 0)
      start_label++;
    var end_label = parseInt(end/scale);
    this.unit = parseFloat(width-left)/len;
    for(var i = start_label; i <= end_label; i++) {
      x = left + this.unit * (i*scale - start);
      var t = i * scale;
      if(display_unit == 'M')
        t /= 1000000;
      else if(display_unit == 'K')
        t /= 1000;
      this.xaxis.drawText(t + display_unit, x-10, 0);
    }
  }

  /* -------------------------------------------------------
     Sorting
     -------------------------------------------------------
  */

  // sorts DataRows by strain in the given order
  this.sortStrains = function(order) {
    var newrows = [];
    for(o in order)
      for(r in order[o])
        newrows.push(this.rows[order[o][r]]);
    this.rows = newrows;
    this.canvas.clear();
    for(r in this.rows) {
      this.canvas.add(this.rows[r].element);
      this.rows[r].drawTrack();
    }
  }

  // handles a click of the "Sort" button
  this.sortClick = function() {
    // sort rows
    var pix = this.highlight_bounds[0];
    var i = 0;
    var order1 = [];
    var order2 = [];
    for(var j = 0; j < this.rows.length; j++) {
      if(this.rows[j].colordata)
        order1.push(j);
      else
        order2.push(j);
    }
    order = [order1, order2]; // the first contains indices for all rows, the other is the unsortable set
    while(true) {
      if(this.sortOut(pix+i, order))
        break;
      if(i != 0 && this.sortOut(pix-i, order))
        break;
      i++;
    }
    
    //this.sortStrains(order);
    this.parent.parent.sort(order);
  }

  // sort at pix respecting the existing order
  this.sortOut = function(pix, order) {
    pix = pix - $(this.canvas.element).offset().left - this.left;
    if(pix < 0 || pix > this.width)
      return true;
    pos = parseInt((pix)/this.unit) + this.start;
    var i = 0;
    while(i < order.length-1) { // further sort each group except the last (unsortable)
      var sorter = {};
      for(b in order[i]) {
        var r = order[i][b];
        for(a in this.rows[r].colordata) {
          var d = this.rows[r].colordata[a];
          if(pos >= d[0] && pos <= d[1]) {
            if(sorter.hasOwnProperty(d[2]+''))
              sorter[d[2]+''].push(r);
            else
              sorter[d[2]+''] = [r];
            break;
          }
          if(pos < d[0]) { // no data at pos
            if(sorter.hasOwnProperty(""))
              sorter[""].push(r);
            else
              sorter[""] = [r];
            break;
          }
        }
        if(pos > d[1]) {
          if(sorter.hasOwnProperty(""))
            sorter[""].push(r);
          else
            sorter[""] = [r];
        }
      }
      order.splice(i, 1); // remove existing block
      // add new sorted blocks
      for(key in sorter) {
        order.splice(i, 0, sorter[key]);
      }
      i += sorter.length;
    }
    for(b in order.slice(0, order.length-1)) { // every sorted group must contain only one strain except the last (unsortable)
      if(order[b].length > 1) {
        return false;
      }
    }
    return true;
  }

  /* -------------------------------------------------------
     Initialization / event listeners
     -------------------------------------------------------
  */
  
      
  //this.vert = VerticalPanel();
  //this.appendChild(vert);
  this.window = window; // we need a handle to the window we are working in to be able to get scroll coordinates
  this.parent = parent;
  this.track_type = t;
  this.sortable = sortable;
      
  // multiple rows per "track"
  this.rows = [];
  // each row stores an entire chromosome of data for one strain
  
  this.panel = new VerticalPanel();
  this.element = this.panel.element;
  // prevents clicking and dragging from causing browser (text) highlighting [hopefully]
  this.element.addEventListener('mousedown', function(){return false;}, false);
  
  // header bar
  this.position_info = new HorizontalPanel();
  this.position_info.element.style.marginLeft = '100px';
  
  this.makeButton = function(amt, f, type, num) {
    var a = $('<a>');
    a.addClass('btn');
    a.click(attacher(this, function(amt,e){this.parent.parent[f](amt)}, amt));
    for(var n = 0; n < num; n++) {
      var i = $('<i>');
      i.addClass(type);
      a.append(i);
    }
    return a.get(0);
  }
  
  // navigation here
  this.position_info.add(this.makeButton(-0.5, 'pan', 'glyphicon glyphicon-chevron-left', 2));
  this.position_info.add(this.makeButton(-0.2, 'pan', 'glyphicon glyphicon-chevron-left', 1));
  this.position_info.add(this.makeButton(0.2, 'pan', 'glyphicon glyphicon-chevron-right', 1));
  this.position_info.add(this.makeButton(0.5, 'pan', 'glyphicon glyphicon-chevron-right', 2));
  this.position_info.add(this.makeButton(0.5, 'zoomRatio', 'glyphicon glyphicon-zoom-out', 1));
  
  // Highlighting and position info, zoom and sort buttons
  this.highlight_range = document.createElement('DIV');
  this.position_info.add(this.highlight_range);
  this.zoom_sort = new Button('Zoom', attacher(this, this.zoomClick));
  this.center = new Button('Center', attacher(this, this.centerClick));
  this.center.style.display = 'none';
  this.position_info.add(this.zoom_sort.element);
  this.position_info.add(this.center.element);
  this.panel.add(this.position_info.element);
  
  // Canvas and scale
  this.canvas = new VerticalPanel(true); // VerticalPanel with MouseListener (tight=true)
  this.panel.add(this.canvas.element);
  // TextDrawPanel must be given an absolute height in pixels otherwise the underlying AbsolutePanel will not resize itself to fit its contents
  this.xaxis = new TextDrawPanel('100%', 10*this.size_mult*2, this.size_mult);
  this.panel.add(this.xaxis.element);
  
  // Highlighter
  this.highlight_bounds = [0,0];
  this.highlighting = false;
  this.highlighter = new VerticalPanel();
  this.panel.add(this.highlighter.element);
  this.highlighter.style.position = 'absolute';
  this.highlighter.style.opacity = 0.25;
  this.highlighter.style.filter = 'alpha(opacity=25)'; //IE
  this.highlighter.style.backgroundColor = '#FF0000';
  this.highlighter.style.display = 'none';
  this.highlighter.addText("");
  this.linked_tracks = [];
  
  // Strain Dragging
  this.dragging = false;
  this.dragging_index = null;
  
  this.clickhandler = clickhandler;
  this.click = function(e) {
    e = $.event.fix(e || window.event);
    var x = e.pageX - $(this.canvas.element).offset().left - this.left;
    var y = e.pageY - $(this.canvas.element).offset().top;
    var pos = Math.floor(parseInt(this.start) + (x / this.unit));
    this.clickhandler.call(this.parent.parent, pos, Math.max(this.dragIndex(y)-1, 0));
  }
  
  this.canvas.element.addEventListener('mousedown', attacher(this, this.onMouseDown), false);
  this.canvas.element.addEventListener('mouseup', attacher(this, this.onMouseUp), false);
  this.canvas.element.addEventListener('mousemove', attacher(this, this.onMouseMove), false);
  
  if(this.clickhandler)
    this.canvas.element.addEventListener('click', attacher(this, this.click), false);
  
  this.highlighter.element.addEventListener('mousedown', attacher(this, this.onMouseDown), false);
  this.highlighter.element.addEventListener('mouseup', attacher(this, this.onMouseUp), false);
  this.highlighter.element.addEventListener('mousemove', attacher(this, this.onMouseMove), false);
}
