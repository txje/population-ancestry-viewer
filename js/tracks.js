// -------------------------------------------------
// Jeremy Wang
// 2/21/2012
//
// Contains all track-specific code encapsulated in
// an object for each track
// -------------------------------------------------

function ColorTrack() {

  this.init = function(window, parent, width, height, height2, trackdata, clickhandler) {
    this.flow = new VerticalPanel();
    this.element = this.flow.element;
    this.width = width;
    this.height = height;
    this.height2 = height2; // height2 is the height of the second data set
    this.size_mult = parent.size_mult;
    this.style = this.element.style;
    this.strains = null;
    this.chrom = null;
    this.start = null;
    this.end = null;
    this.parent = parent;
    
    this.title = trackdata[0];
    this.dataset = trackdata[1];
    this.tracktype = trackdata[2];
    this.downloadable = trackdata[3];
    this.recolorable = trackdata[4];

    this.track = new GenomeTrack(window, this, this.tracktype, (this.tracktype=='strain'), clickhandler);

    this.flow.add(this.track.element);
    
    if(this.downloadable) {
      this.button = new Button('Download ' + this.title, attacher(this, this.dump), 'btn-primary', 'glyphicon glyphicon-download');
      this.flow.add(this.button.element);
    }
    
    if(this.recolorable) {
      var info = document.createTextNode("Click recolor button to reassign colors on a strain-by-strain basis greedily in the order strains are listed (may take a few seconds)");
      this.flow.add(info);
      
      this.recolor_button = new Button("Recolor", attacher(this, this.recolor), 'btn-primary');
      this.flow.add(this.recolor_button.element);
    }
  }

  this.update = function(chrom, start, end, strains) {
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(start, end)) {
      this.track.empty();
      if(this.tracktype == 'strain')
        for(s in strains)
          this.track.addRow(strains[s], chrom, metadata.colors);
      else //this.tracktype == 'single'
        this.track.addRow('Histogram', chrom, metadata.colors);
      this.request(chrom, strains, "json");
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }
  
   this.dump=function(){
    this.request(this.chrom, this.start, this.end, this.strains, "text", 1);
  }
  
  this.callback = function(data) {
    for(s in data) {
      if(s == 'colors')
        continue;
      // used a couple techniques to reduce transfer size
      // fill out colors from indices
      // change from (start,length) to (start,end)
      for(i in data[s][0]) {
        // non-histogram data
        if(!(data[s][0][i][2][0] instanceof Array)) {
          data[s][0][i][1] = data[s][0][i][0]+data[s][0][i][1];
          data[s][0][i][2] = data['colors'][data[s][0][i][2]];
        }
        // handle histogram data
        else {
          hist_colors = [];
          for(j in data[s][0][i][2]) {
            hist_colors.push([data['colors'][data[s][0][i][2][j][0]], data[s][0][i][2][j][1]]);
          }
          data[s][0][i][1] = data[s][0][i][0]+data[s][0][i][1];
          data[s][0][i][2] = hist_colors;
        }
      }
      for(i in data[s][1]) {
        data[s][1][i][1] = data[s][1][i][0]+data[s][1][i][1];
        data[s][1][i][2] = data['colors'][data[s][1][i][2]];
      }
      // no minimum or maximum resolution
      this.track.addColorData(s, 0, null, data[s][0], 0);
      this.track.addColorData(s, 0, null, data[s][1], 1);
    }
    this.track.update(this.start, this.end, this.width, this.height, this.height2, 2, 100); // last 2: gap, left
  }
  
  this.error = function(err) {
    alert(err);
  }
  
  this.toString = function() {
    return this.dataset;
  }
}

function VCF(window, parent, width, height, height2, trackdata, clickhandler, metadata) {

  // basically uses the super() constructor
  this.init(window, parent, width, height, height2, trackdata, clickhandler);
 
  this.update = function(chrom, start, end, strains) {
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(start, end)) {
      this.track.empty();
      for(s in strains)
        this.track.addRow(strains[s], chrom, metadata.colors);
      this.request(chrom, start, end, strains, "json");
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }

  this.request = function(chrom, start, end, strains, fmt) {
    if (fmt == "json"){
      RPC('services/service.py', this, {'name': metadata.name, 'chrom':chrom, 'start':start, 'end':end, 'strain':strains, 'format':fmt, 'gene':0});
    }
    else{
      remote_dump('services/service.py', attacher(this, download, metadata.name + "_download.csv"), {'data_type': this.dataset, 'chrom':chrom, 'start':start, 'end':end, 'name':this.title, 'strain':strains, 'format':fmt, 'gene':1});
    }
  }

  this.callback = function(data) {
    /* --------------------------------------------------
     * we need to deconvolve the SNP data here and only
     * send usable color block data to the track
     * --------------------------------------------------*/

    if(data[metadata.name] == null) {
      // probably window is too large
      this.track.highlight_range.textContent = "Maximum viewable window for this dataset is " + metadata["maximum_resolution"];
      return;
    }
    var header_row = data[metadata.name]['*'][0]; // we have to get the sample names from the header, since all the ones we asked for may not have been found
    for(var i = 9; i < header_row.length; i++) {
      var s = header_row[i];
      var strain_data = [];
      for(var j = 1; j < data[metadata.name]['*'].length; j++) {
        var d = data[metadata.name]['*'][j];
        d[0] = parseInt(d[0]);
        d[1] = parseInt(d[1]);
        var allele = parseInt(d[i][0]) + parseInt(d[i][2]);
        strain_data.push([d[1], d[1]+(d[4]=="<DEL>"?0:d[4].length), (allele==0?"REF":(allele==1?"HET":(allele==2?"ALT":"NA")))]); // (start, end, REF/HET/ALT)
      }
      this.track.addColorData(s, 0, metadata["maximum_resolution"], strain_data);
    }
    this.track.update(this.start, this.end, this.width, this.height, this.height2, 2, 100); // last 2: gap, left
  }
  this.error = function(err) {
    alert(err);
  }
  this.toString = function() {
    return metadata.name;
  }
}

function BED(window, parent, width, height, height2, trackdata, clickhandler, metadata) {

  this.recolor = function() {
    // in the original MPV, colors were hardcoded, but PGV uses an indexed hash (metadata.colors, which MAY NOT all be integers)
    for(r in this.track.rows) {
      for(b in this.track.rows[r].colordata) {
        this.track.rows[r].colordata[b][2] = this.track.rows[r].colordata[b][2] + "_unrecolored"; // mark this color block as NOT YET CHANGED by appending to the color name (key)
      }
    }

    // convert hash keys to a list of available colors
    var available_colors = [];
    for(col in metadata.colors) {
      available_colors.push(col);
    }
    var n_colors = available_colors.length;
    metadata.colors["unrecolored"] = [255,255,255,1];

    var color_index = 0;
    for(r in this.track.rows) { // for each track, top to bottom
      var newcolor = false;
      var indices = [];
      for(var r2 = parseInt(r)+1; r2 < this.track.rows.length; r2++) {
          indices.push(0);
      }
      for(b in this.track.rows[r].colordata) { // for each color block
        var source_block = this.track.rows[r].colordata[b];
        if(!(source_block[2].endsWith("_unrecolored"))) // color already assigned (from previous row)
          continue;
        var newcolor = true;
        for(var r2 = parseInt(r)+1; r2 < this.track.rows.length; r2++) { // for each successive row
          while(indices[r2-r-1] < this.track.rows[r2].colordata.length && this.track.rows[r2].colordata[indices[r2-r-1]][1] < source_block[0])
            indices[r2-r-1] += 1;
          var index = indices[r2-r-1];
          while(index < this.track.rows[r2].colordata.length && this.track.rows[r2].colordata[index][0] <= source_block[1]) {
            // overlapping
            var match_block = this.track.rows[r2].colordata[index];
            if(match_block.length == 3 && match_block[2] == source_block[2]) {
              // deal with partial overlap
              if(match_block[0] < source_block[0]) { // hang over left side
                this.track.rows[r2].colordata.splice(index, 0, [match_block[0], source_block[0]-1, match_block[2]]);
                index += 1;
                this.track.rows[r2].colordata[index][0] = source_block[0];
              }
              if(match_block[1] > source_block[1]) { // hang over right side
                this.track.rows[r2].colordata.splice(index+1, 0, [source_block[1]+1, match_block[1], match_block[2]]);
                this.track.rows[r2].colordata[index][1] = source_block[1];
              }
              if(color_index < n_colors) {
                this.track.rows[r2].colordata[index][2] = available_colors[color_index];
              } else {
                this.track.rows[r2].colordata[index][2] = "unrecolored";
              }
            }
            index += 1;
          }
        }
        if(color_index < n_colors) {
          this.track.rows[r].colordata[b][2] = available_colors[color_index];
        } else {
          this.track.rows[r].colordata[b][2] = "unrecolored";
        }
      }
      if(newcolor)
        color_index += 1;
    }
    // update tracks
    this.track.update(this.start, this.end, this.width, this.height, 0, 2, 100)
  }

  // basically uses the super() constructor
  this.init(window, parent, width, height, height2, trackdata, clickhandler);
  this.update = function(chrom, start, end, strains) {
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(start, end)) {
      this.track.empty();
      for(s in strains)
        this.track.addRow(strains[s], chrom, metadata.colors);
      this.request(chrom, start, end, strains, "json");
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }

  this.request = function(chrom, start, end, strains, fmt) {
    if (fmt == "json"){;
      RPC('services/service.py', this, {'name': metadata.name, 'chrom':chrom, 'start':start, 'end':end, 'strain':strains, 'format':fmt, 'gene':0});
    }
    else{
      remote_dump('services/service.py', attacher(this, download, metadata.name + "_download.csv"), {'data_type': this.dataset, 'chrom':chrom, 'start':start, 'end':end, 'name':this.title, 'strain':strains, 'format':fmt, 'gene':1});
    }
  }

  this.dump=function(){
    this.request(this.chrom, this.start, this.end, this.strains, 'text');
  }

  this.callback = function(data) {
    for(s in data[metadata.name]) {
      this.track.addColorData(s, 0, metadata["maximum_resolution"], data[metadata.name][s]);
    }
    this.track.update(this.start, this.end, this.width, this.height, this.height2, 2, 100); // last 2: gap, left
  }
  this.error = function(err) {
    alert(err);
  }
  this.toString = function() {
    return metadata.name;
  }
}

function GENES(window, parent, width, height, height2, trackdata, clickhandler, metadata) {

  this.recolor = function() {
    // in the original MPV, colors were hardcoded, but PGV uses an indexed hash (metadata.colors, which MAY NOT all be integers)
    for(r in this.track.rows) {
      for(b in this.track.rows[r].colordata) {
        this.track.rows[r].colordata[b][2] = this.track.rows[r].colordata[b][2] + "_unrecolored"; // mark this color block as NOT YET CHANGED by appending to the color name (key)
      }
    }

    // convert hash keys to a list of available colors
    var available_colors = [];
    for(col in metadata.colors) {
      available_colors.push(col);
    }
    var n_colors = available_colors.length;
    metadata.colors["unrecolored"] = [255,255,255,1];

    var color_index = 0;
    for(r in this.track.rows) { // for each track, top to bottom
      var newcolor = false;
      var indices = [];
      for(var r2 = parseInt(r)+1; r2 < this.track.rows.length; r2++) {
          indices.push(0);
      }
      for(b in this.track.rows[r].colordata) { // for each color block
        var source_block = this.track.rows[r].colordata[b];
        if(!(source_block[2].endsWith("_unrecolored"))) // color already assigned (from previous row)
          continue;
        var newcolor = true;
        for(var r2 = parseInt(r)+1; r2 < this.track.rows.length; r2++) { // for each successive row
          while(indices[r2-r-1] < this.track.rows[r2].colordata.length && this.track.rows[r2].colordata[indices[r2-r-1]][1] < source_block[0])
            indices[r2-r-1] += 1;
          var index = indices[r2-r-1];
          while(index < this.track.rows[r2].colordata.length && this.track.rows[r2].colordata[index][0] <= source_block[1]) {
            // overlapping
            var match_block = this.track.rows[r2].colordata[index];
            if(match_block.length == 3 && match_block[2] == source_block[2]) {
              // deal with partial overlap
              if(match_block[0] < source_block[0]) { // hang over left side
                this.track.rows[r2].colordata.splice(index, 0, [match_block[0], source_block[0]-1, match_block[2]]);
                index += 1;
                this.track.rows[r2].colordata[index][0] = source_block[0];
              }
              if(match_block[1] > source_block[1]) { // hang over right side
                this.track.rows[r2].colordata.splice(index+1, 0, [source_block[1]+1, match_block[1], match_block[2]]);
                this.track.rows[r2].colordata[index][1] = source_block[1];
              }
              if(color_index < n_colors) {
                this.track.rows[r2].colordata[index][2] = available_colors[color_index];
              } else {
                this.track.rows[r2].colordata[index][2] = "unrecolored";
              }
            }
            index += 1;
          }
        }
        if(color_index < n_colors) {
          this.track.rows[r].colordata[b][2] = available_colors[color_index];
        } else {
          this.track.rows[r].colordata[b][2] = "unrecolored";
        }
      }
      if(newcolor)
        color_index += 1;
    }
    // update tracks
    this.track.update(this.start, this.end, this.width, this.height, 0, 2, 100)
  }

  // basically uses the super() constructor
  this.init(window, parent, width, height, height2, trackdata, clickhandler);

  // this.update = function(chrom, start, end, strains) {
  this.update = function(chrom, start, end, strains) {
    strains = ['Gene'];	  
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(start, end)) {
      this.track.empty();
      for(s in strains)
        this.track.addRow(strains[s], chrom, metadata.colors);
      this.request(chrom, start, end, strains, 'json');
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }
  this.request = function(chrom, start, end, strains, fmt) {
    if (fmt == "json"){
      RPC('services/service.py', this, {'name': metadata.name, 'chrom':chrom, 'start':start, 'end':end, 'strain':strains, 'format':fmt, 'gene':0});
    }
    else{
      remote_dump('services/service.py', attacher(this, download, metadata.name + "_download.csv"), {'data_type': this.dataset, 'chrom':chrom, 'start':start, 'end':end, 'name':this.title, 'strain':strains, 'format':fmt, 'gene':1});
    }
  }
  this.callback = function(data) {
    for(s in data[metadata.name]) {
      this.track.addColorData(s, 0, metadata["maximum_resolution"], data[metadata.name][s]);
    }
    this.track.update(this.start, this.end, this.width, this.height, this.height2, 2, 100); // last 2: gap, left
  }
  this.error = function(err) {
    alert(err);
  }
  this.toString = function() {
    return metadata.name;
  }
}
VCF.prototype = new ColorTrack();
BED.prototype = new ColorTrack();
GENES.prototype = new ColorTrack();
