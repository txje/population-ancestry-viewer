
var TRACK_WIDTH = 800;
var TRACK_LEFT = 100;
var BIGTRACK_HEIGHT = 50;
var SMALLTRACK_HEIGHT = 15;
var TRACK_GAP = 2;


function Viewer(window, size_mult, metadata) {

    this.window = window;
    this.size_mult = size_mult;

    // set page attributes
    this.flow = new VerticalPanel();
    this.element = this.flow.element;

    // tracks cannot reference each other directly, but can call methods defined here which then propogate back down
    this.highlight = function(bounds) {
        for(t in this.tracks) {
            if(this.tracks[t].hasOwnProperty('track') && this.tracks[t].track.hasOwnProperty('highlight')) // filters out the Tree, basically
                this.tracks[t].track.highlight(bounds);
        }
    }
    
    // click on a single point to center
    this.point = function(bounds) {
        for(t in this.tracks) {
            if(this.tracks[t].hasOwnProperty('track') && this.tracks[t].track.hasOwnProperty('position'))
                this.tracks[t].track.position(bounds);
        }
    }
    
    this.reorder = function(labels) {
        for(t in this.tracks) {
            if(this.tracks[t].hasOwnProperty('track') && this.tracks[t].track.hasOwnProperty('reorder'))
                this.tracks[t].track.reorder(labels);
        }
    }
    
    this.zoom = function(bounds) {
        this.start = bounds[0];
        this.end = bounds[1];
        this.update();
    }
    
    this.sort = function(order) {
        for(t in this.tracks) {
            if(this.tracks[t].hasOwnProperty('track') && this.tracks[t].track.sortable)
                this.tracks[t].track.sortStrains(order);
        }
    }
    
    this.zoomRatio = function(amt) {
        var range = (this.end - this.start) / amt;
        var center = this.start + (this.end - this.start)/2;
        if(center - range/2 < 0) {
            center = range/2;
        }
        if(center + range/2 > this.chroms[this.chrom].length) {
            center = this.chroms[this.chrom].length - range/2;
        }
        this.start = Math.floor(Math.max(center - range/2, 0));
        this.end = Math.floor(Math.min(center + range/2, this.chroms[this.chrom].length));
        this.update();
    }
    
    this.pan = function(amt) {
        var change = Math.floor((parseInt(this.end) - parseInt(this.start)) * amt);
        if(this.start + change < 0)
            change = 0 - this.start;
        else if(this.end + change > this.chroms[this.chrom].length)
            change = this.chroms[this.chrom].length - this.end;
        this.start += change;
        this.end += change;
        this.update();
    }
    
    this.center = function(pos) {
        var range = this.end - this.start;
        if(pos - range/2 < 0) {
            pos = Math.floor(range/2);
        }
        if(pos + range/2 > this.chroms[this.chrom].length) {
            pos = this.chroms[this.chrom].length - Math.floor(range/2);
        }
        this.start = pos - Math.floor(range/2);
        this.end = pos + Math.floor(range/2);
        this.update();
    }
    
    this.update = function(chrom, start, end, strains) {
        if(chrom) {
            this.chrom = chrom;
        }
        if(start != null)
            this.start = parseInt(start);
        if(end != null)
            this.end = parseInt(end);
        dispBounds(this.start, this.end);
        if(strains)
            this.strains = strains;
        var chrlen = this.chroms[this.chrom].length;
        if(this.start < 0)
            this.start = 0;
        if(this.end > chrlen)
            this.end = chrlen;
        for(i in this.tracks) {
            var t = this.tracks[i];
            t.update(this.chrom, this.start, this.end, this.strains);
        }
    }

    // Data Tracks (initialize)
    this.tracks = [];
    for(var t = 0; t < metadata.tracks.length; t++) {
      var track = metadata.tracks[t];
      if(track.type == "vcf")
        this.tracks[t] = new VCF(window, this, TRACK_WIDTH, SMALLTRACK_HEIGHT, BIGTRACK_HEIGHT-SMALLTRACK_HEIGHT, [track.name, track.type, 'strain', false], null, track);
      else if(track.type == "bed")
        this.tracks[t] = new BED(window, this, TRACK_WIDTH, SMALLTRACK_HEIGHT, BIGTRACK_HEIGHT-SMALLTRACK_HEIGHT, [track.name, track.type, 'strain', false], null, track);
      else
        console.log("Unknown track type for track:", track);
    }
    
    var t;
    for(t in this.tracks) {
        var vert = new VerticalPanel();
        vert.style.padding = '10px';
        vert.style.border = '1px solid #CCCCCC';
        vert.style.borderRadius = '5px';
        t = this.tracks[t];
        var title_bar = new HorizontalPanel();
        title_bar.style.fontSize = '12pt';
        var $showhide = $('<i>');
        $showhide.addClass('icon-chevron-up');
        $showhide.css('cursor', 'pointer');
        $showhide.css('margin-left', '5px');
        var handler = function(event) {
            var t = event.data.t;
            var $button = $(this);
            if(t.style.display != 'none') {
                t.style.display = 'none';
                $button.addClass('icon-chevron-down');
                $button.removeClass('icon-chevron-up');
            }
            else {
                t.style.display = 'block';
                $button.addClass('icon-chevron-up');
                $button.removeClass('icon-chevron-down');
            }
        };
        $showhide.click({t:t}, handler);
        
        title_bar.add(document.createTextNode(t.title + ' '));
        title_bar.add($showhide.get(0));
        vert.add(title_bar.element);
        vert.add(t.element);
        this.flow.add(vert.element);
    }

    this.chroms = {};
    for(var c = 0; c < metadata.chromosomes.length; c++) {
      var chr = metadata.chromosomes[c];
      this.chroms[chr.name] = chr;
    }
        
    this.chrom = metadata.chromosomes[0].name;
    this.start = 20000000; //0;
    this.end = 20099999; //this.chroms[this.chrom].length;
    this.strains = [];
    this.sets = [];
    for(var s = 0; s < metadata.samples.length; s++) {
      this.strains.push(metadata.samples[s].name);
      if(!(metadata.samples[s].set in this.sets))
        this.sets[metadata.samples[s].set] = [];
      this.sets[metadata.samples[s].set].push(metadata.samples[s].name);
    }
    
    this.update();
}
