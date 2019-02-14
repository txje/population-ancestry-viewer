// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// Forked from DataRow.py
// - converted to raw javascript (from pyjamas)
// draws a stored data row as a color map
// ------------------------------------------------

function DataRow(colordata, label, chrom, textdata, color_map, size_mult) {
    if(textdata == null)
        textdata = [];
    if(size_mult == null)
        size_mult = 1;

    // base pair scales at which to change axis resolution
    this.SCALES = [1,2,5,10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000,2500000,5000000,10000000,25000000,50000000,100000000];

    // base pair units
    this.UNITS = {0:"", 1000:"K", 1000000:"M"};

    // initialize row
    this.BIGTRACK_HEIGHT = 50;
    this.SMALLTRACK_HEIGHT = 15;
    this.TRACK_FONT = 7;
    this.BIGTRACK_HEIGHT *= size_mult;
    this.SMALLTRACK_HEIGHT *= size_mult;
    this.TRACK_FONT *= size_mult;
    
    // row label (displayed on left)
    this.label = label;
    // data rendered into main color blocks
    this.colordata = colordata;
    this.color_indices = null; // indices representing different colors, supports dynamic recoloring
    // secondary color blocks (if any)
    this.colordata2 = [];
    // overlayed text data (if any)
    this.textdata = textdata;
    // currently displayed chromosome
    this.chrom = chrom;
    this.apanel = new AbsolutePanel(0,0); // size will be adjusted when data is updated
    this.canvas = document.createElement('CANVAS');
    this.canvas.clear = function() {
        var ctx = this.getContext('2d');
        ctx.clearRect(0, 0, this.width, this.height+this.height2);
    }
    this.textpanel = new TextDrawPanel(0, 0, size_mult);
    
    this.apanel.add(this.canvas, 0, 0);
    this.apanel.add(this.textpanel.element, 0, 0);

    // flag indicating whether to display secondary color
    this.showcolordata2 = false;
    
    // axis (with scale)
    this.axis = new TextDrawPanel(0, 0, size_mult);
    this.axis.style.cursor = 'pointer';
    this.panel = new HorizontalPanel();

    this.panel.add(this.axis.element);
    this.panel.add(this.apanel.element);
    this.element = this.panel.element;
    this.style = this.element.style;
    
    // update data and physical bounds of row and redraw
    this.update = function(start, end, width, height, height2, gap, left) {
        if(start != null)
            this.start = start;
        if(end != null)
            this.end = end;
        if(width != null)
            this.width = width;
        if(height != null)
            this.height = height;
        if(height2 != null)
            this.height2 = height2;
        if(gap != null)
            this.gap = gap
        if(left != null)
            this.left = left // space on the left side of the canvas to draw the label
        if(this.showcolordata2) {
            this.total_height = this.height + this.height2;
        }
        else
            this.total_height = this.height;
        this.axis.element.style.width = this.left + "px";
        this.axis.element.style.height = this.total_height + "px";
        this.apanel.element.style.width = (this.width-this.left) + "px";
        this.apanel.element.style.height = this.total_height + "px";
        this.textpanel.element.style.width = (this.width-this.left) + "px";
        this.textpanel.element.style.height = this.total_height + "px";
        this.canvas.style.width = this.width-this.left + 'px';
        this.canvas.style.height = this.total_height + 'px';
        this.drawTrack();
    }
    
    // clear text data
    this.clearText = function() {
        this.textdata = [];
        this.textpanel.clear();
    }
    
    // display row data within the given bounds
    this.drawTrack = function() {
        this.axis.clear();
        this.canvas.clear();
        this.canvas.setAttribute('width', this.width-this.left);
        this.canvas.setAttribute('height', this.total_height);
        var ctx = this.canvas.getContext('2d');
        ctx.save();
        
        // begin, end, length -> base pair measures
        // left, right, width, height -> pixel measures
        // unit = pixels/base pair (<<1)
        
        var chrom = this.chrom;
        if(chrom == 'X')
            chrom = 20;
        this.begin = this.start;
        this.stop = this.end;
        var len = this.stop-this.begin;
        var unit = (this.width-this.left)/len;
        var right = len * unit;
        
        // draw scale
        for(var i = 0; i < this.SCALES.length; i++) {
            var scale = this.SCALES[i];
            if(Math.floor(len/scale) >= 4 && Math.floor(len/scale) <= 10)
                break;
        }
        var display_unit = "";
        for(key in this.UNITS)
            if(scale >= key/2 && ((this.UNITS[key] == "K" && display_unit == "") || this.UNITS[key] == "M"))
                display_unit = this.UNITS[key];
        start_label = parseInt(this.begin/scale);
        if(this.begin % scale > 0)
            start_label++;
        end_label = parseInt(this.stop/scale);
        for(var i = start_label; i <= end_label; i++) {
            var x = unit * (i*scale - this.begin);
            ctx.LineWidth = 1;
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(x, 0, 1, this.total_height);
        }
        if(this.colordata == null)
            return;

        // draw label
        var data = this.filter_data();
        colordata = data[0];
        colordata2 = data[1];
        textdata = data[2];
        this.axis.drawText(this.label, 0, 0);
        // draw outline
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, right, this.total_height-this.gap);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(0, 0, right, this.total_height-this.gap);
        // draw color blocks
        // first color may or may not contain height values, if it does, use them
        for(c in colordata) {
            var block = colordata[c];
            if (block[2] !== "undef"){
                block[0] = parseInt(block[0]);
                block[1] = parseInt(block[1]);
                // this starts the current block at the midpoint of the overlap between the last block
                // the end may still be drawn under the next block, but this is invisible
                if(c == 0 || block[0] >= colordata[c-1][1])
                    var st = block[0];
                else
                    var st = block[0] + (colordata[c-1][1] - block[0]) / 2;
                if(st > this.start)
                    var block_start = (st-this.begin) * unit;
                else
                    var block_start = 0;
                if(block[1] < this.end)
                    var block_end = (block[1]-this.begin) * unit;
                else
                    var block_end = (this.stop-this.begin) * unit;
                if(block[2] != null) {
                    // height
                    if(this.showcolordata2)
                        var top = this.height2 - 1;
                    else
                        var top = 0;
                    if(block.length > 3) {
                        top += this.height - (block[3]/100*this.height);
                        var h = block[3]/100*this.height;
                    }
                    else {
                        var h = this.height;
                    }
                    // regular or histogram
                    // histogram
                    if(block[2][0] instanceof Array) {
                        var bottom = top + h - this.gap;
                        for(i in block[2]) {
                            var color = color_map[block[2][i][0]];
                            var ychange = block[2][i][1] * (h - this.gap)/100;
                            // opacity
                            if(color.length > 3)
                                var color = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + color[3] + ')';
                            else
                                var color = 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
                            ctx.fillStyle = color;
                            ctx.fillRect(block_start,bottom - ychange,Math.max(1, block_end-block_start),ychange);
                            bottom -= ychange;
                        }
                    }
                    // regular
                    else {
                      // opacity
                      var color = color_map[block[2]]
                      if(color == null) {
                        console.log(block[2], color_map);
                      }
                      if(color.length > 3)
                        var color = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + color[3] + ')';
                      else
                        var color = 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
                      ctx.fillStyle = color;
                      ctx.fillRect(block_start,top,Math.max(1, block_end-block_start),h - this.gap);
                    }
                }
            }
        }
        // second color set includes height values and is drawn above the original track
        if(this.showcolordata2 && colordata2.length > 0) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, this.total_height-this.SMALLTRACK_HEIGHT-this.gap, right, 1);
            for(c in colordata2) {
                var block = colordata2[c];
                // this starts the current block at the midpoint of the overlap between the last block
                // the end may still be drawn under the next block, but this is invisible
                if(c == 0 || block[0] >= colordata2[c-1][1])
                    var st = block[0];
                else
                    var st = block[0] + (colordata2[c-1][1] - block[0]) / 2;
                if(st > this.start)
                    var block_start = (st-this.begin) * unit;
                else
                    var block_start = 0;
                if(block[1] < this.end)
                    var block_end = (block[1]-this.begin) * unit;
                else
                    var block_end = (this.stop-this.begin) * unit;
                if(block[2] != null) {
                    // height
                    if(block.length > 3) {
                        var top = this.total_height-(block[3]*this.height2) - this.SMALLTRACK_HEIGHT; // push it on top of the other
                        var h = block[3]*this.height2;
                    }
                    else {
                        var top = this.total_height-this.height - this.SMALLTRACK_HEIGHT;
                        var h = this.height2;
                    }
                    // opacity
                    var color = color_map[block[2]];
                    if(color.length > 3)
                        var color = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + color[3] + ')';
                    else
                        var color = 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
                    ctx.fillStyle = color;
                    ctx.fillRect(block_start,top,Math.max(block_end-block_start, 1),h - this.gap);
                }
            }
        }
        this.textpanel.clear();
        // draw text data
        for(t in textdata) {
            pos = (textdata[t][0]-this.start) * unit;
            this.textpanel.drawText(textdata[t][1], pos-2, -1, 'arial', this.TRACK_FONT);
        }
        ctx.restore();
        this.unit = unit;
        return;
    }
    
    // filter stored data to within the given display bounds
    this.filter_data = function() {
        var colorstart = null;
        var colorend = null;
        for(var i = 0; i < this.colordata.length; i++) {
            if(this.colordata[i][1] < this.start)
                continue;
            else if(this.colordata[i][0] <= this.end && colorstart == null)
                colorstart = i;
            else if(this.colordata[i][0] > this.end) {
                colorend = i;
                break;
            }
        }
        if(colorend == null)
            colorend = this.colordata.length;
        var color2start = null;
        var color2end = null;
        for(var i = 0; i < this.colordata2.length; i++) {
            if(this.colordata2[i][1] < this.start)
                continue;
            else if(this.colordata2[i][0] <= this.end && color2start == null)
                color2start = i;
            else if(this.colordata2[i][0] > this.end) {
                color2end = i;
                break;
            }
        }
        if(this.colordata2 && color2end == null)
            color2end = this.colordata2.length;
        var textstart = null;
        var textend = null;
        for(var i = 0; i < this.textdata.length; i++) {
            if(this.textdata[i][0] < this.start)
                continue;
            else if(this.textdata[i][0] <= this.end && textstart == null)
                textstart = i;
            else if(this.textdata[i][0] > this.end) {
                textend = i;
                break;
            }
        }
        if(this.textdata && textend == null)
            textend = this.textdata.length;
        return [this.colordata.slice(colorstart, colorend), this.colordata2.slice(color2start, color2end), this.textdata.slice(textstart, textend)];
    }
}
