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

    this.track = new GenomeTrack(window, this, this.tracktype, (this.tracktype=='strain'), clickhandler);

    this.flow.add(this.track.element);
    
    if(this.downloadable) {
      this.button = new Button('Download ' + this.title, attacher(this, this.dump), 'btn-primary', 'icon-download icon-white');
      this.flow.add(this.button.element);
    }
  }

  this.update = function(chrom, start, end, strains) {
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(this.start, this.end)) {
      this.track.empty();
      if(this.tracktype == 'strain')
        for(s in strains)
          this.track.addRow(strains[s], chrom, metadata.colors);
      else //this.tracktype == 'single'
        this.track.addRow('Histogram', chrom, metadata.colors);
      this.request(chrom, strains);
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }
  
  this.request = function(chrom, strains) {
    RPC('services/service.py', this, {"chrom":chrom, "strain":strains, "data_type":this.dataset});
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
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(this.start, this.end)) {
      this.track.empty();
      for(s in strains)
        this.track.addRow(strains[s], chrom, metadata.colors);
      this.request(chrom, start, end, strains);
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }
  this.request = function(chrom, start, end, strains) {
    RPC('services/service.py', this, {'name': metadata.name, 'chrom':chrom, 'start':start, 'end':end, 'strain':strains});
  }
  this.callback = function(data) {
    /* --------------------------------------------------
     * we need to deconvolve the SNP data here and only
     * send usable color block data to the track
     * --------------------------------------------------*/

    var header_row = data[metadata.name]['*'][0]; // we have to get the sample names from the header, since all the ones we asked for may not have been found
    for(var i = 9; i < header_row.length; i++) {
      var s = header_row[i];
      var strain_data = [];
      for(var j = 1; j < data[metadata.name]['*'].length; j++) {
        var d = data[metadata.name]['*'][j];
        d[0] = parseInt(d[0]);
        d[1] = parseInt(d[1]);
        var allele = parseInt(d[i][0]) + parseInt(d[i][2]);
        strain_data.push([d[1], d[1]+(d[4]=="<DEL>"?0:d[4].length), (allele==0?"REF":(allele==1?"HET":"ALT"))]); // (start, end, REF/HET/ALT)
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

  // basically uses the super() constructor
  this.init(window, parent, width, height, height2, trackdata, clickhandler);

  this.update = function(chrom, start, end, strains) {
    this.track.resetHighlighter();
    if(strains != this.strains || chrom != this.chrom || this.track.outOfRange(this.start, this.end)) {
      this.track.empty();
      for(s in strains)
        this.track.addRow(strains[s], chrom, metadata.colors);
      this.request(chrom, start, end, strains);
    }
    else {
      this.track.update(start, end, this.width, this.height, this.height2, 2, 100);
    }
    this.chrom = chrom;
    this.start = start;
    this.end = end;
    this.strains = strains;
  }
  this.request = function(chrom, start, end, strains) {
    RPC('services/service.py', this, {'name': metadata.name, 'chrom':chrom, 'start':start, 'end':end, 'strain':strains});
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
