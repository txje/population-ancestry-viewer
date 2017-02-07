// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// Forked from TreePanel.py
// - converted to raw javascript
// draws trees and accessory information
// ------------------------------------------------

function TreePanel(size_mult) {
    // initialize tree display
    this.size_mult = size_mult;
    this.PAGE_WIDTH = 1000 * size_mult;
    this.PAGE_HEIGHT = 800 * size_mult;
    this.TITLE_FONT = (11 * size_mult) + 'px';
    this.FONT = '\"Helvetica Neue\", Helvetica';
    this.WIDTH = 400 * size_mult;
    this.HEIGHT = 400 * size_mult;
    this.TEXT_WIDTH = 300 * size_mult;
    this.TEXT_HEIGHT = 300 * size_mult;
    this.ROOT_X = 150 * size_mult;
    this.ROOT_Y = 150 * size_mult;
    this.LINE_WIDTH = 3 * size_mult;
    this.INFO_X = 400 * size_mult;
    this.LABEL_OFFSET_X = 5 * size_mult;
    this.LABEL_OFFSET_Y = 5 * size_mult;
    this.BRANCH_SCALE = 8 * size_mult;
    
    this.panel = new AbsolutePanel(this.PAGE_WIDTH, this.PAGE_HEIGHT);
    this.element = this.panel.element;
    this.element.style.overflow = 'hidden';
    
    this.style = this.element.style;
    
    this.children = [];
    
    this.clear = this.panel.clear;
    
    // primary function - parses tree info, draws matrix, strains, annotation, and tree
    this.make = function(tree_info, strains, origin_colors) {
        this.parse(tree_info);
        this.makeMatrixTable();
        this.makeStrainTable(strains, origin_colors);
        this.makeTree();
        
        this.info = new VerticalPanel();
        this.info.table.style.fontFamily = this.FONT;
        this.info.table.style.fontSize = this.TITLE_FONT;
        
        // add all of the info to the panel
        var loc = $("<b style='font-size:20pt'>" + this.inside[0] + " - " + this.inside[1] + "</b>").get(0);
        this.info.add(loc);
        this.info.addText("Middle: " + this.middle[0] + "-" + this.middle[1]);
        this.info.addText("Outside: " + this.outside[0] + "-" + this.outside[1]);
        this.info.addText("SNPs: Left-" + this.snps[0] + ", Middle-" + this.snps[1] + ", Right-" + this.snps[2]);
        this.info.addText("Informative: Left-" + this.inf[0] + ", Middle-" + this.inf[1] + ", Right-" + this.inf[2]);
        this.info.addText("VINOs: Left-" + this.vinos[0] + ", Middle-" + this.vinos[1] + ", Right-" + this.vinos[2]);
        this.info.addText("Haplotypes: " + this.haplotypes);
        this.info.addText("Strains:");
        this.info.add(this.straintable);
        
        // distance matrix
        var mat = new VerticalPanel();
        mat.addText("Distance Matrix:");
        mat.add(this.matrixtable);
        
        this.panel.add(this.tree, 0, 0);
        //this.panel.add(this.treeText.element, 0, 0);
        this.panel.add(this.info.element, this.INFO_X, 0);
        this.panel.add(mat.element, this.INFO_X/2-100, this.PAGE_HEIGHT-300);
    }
    
    // initiates drawing of the tree itself
    this.makeTree = function() {
        this.tree = document.createElement('canvas');
        this.tree.setAttribute('id', 'tree_viewport');
        this.tree.setAttribute('width', this.WIDTH);
        this.tree.setAttribute('height', this.HEIGHT);
        var positions = [];
        for(var i in this.treenodes)
            positions[i] = [0,0];
        this.layoutNode(-1, 0, null, this.ROOT_X, this.ROOT_Y, 360, positions); // this does NOT work, but doesn't hurt
        this.arbor = arborTree(this.tree, this.treenodes, this.edges, positions);
        
        /* -------- Old tree drawing ---------
        this.treeText = new TextDrawPanel(this.TEXT_WIDTH, this.TEXT_HEIGHT, this.size_mult);
        var c = this.tree.getContext('2d');
        var ctx = this.tree.getContext('2d');
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = this.LINE_WIDTH;
        ctx.beginPath();
        // begins the tree drawing, starting at the root node
        this.drawNode(ctx, -1, 0, null, this.ROOT_X, this.ROOT_Y); // draw tree, starting at center
        ctx.stroke();
        */
    }
    
    // recursively determines a starting node layout
    this.layoutNode = function(previous_node, node, current_angle, x, y, angle_span, positions) {
        if(angle_span == null)
            angle_span = 360;
        // spread outgoing edges out over 180 degrees in the same direction as the incoming edge
        var usable_edges = [];
        for(var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            if(node == e[0] || node == e[1]) {
                if(previous_node == e[1] || previous_node == e[0])
                    continue;
                usable_edges.push(e);
            }
        }
        if(current_angle == null)
            var angle = angle_span/usable_edges.length;
        else
            var angle = angle_span/(usable_edges.length + 1);
        if(current_angle == null)
            current_angle = 0;
        current_angle -= angle*(usable_edges.length-1)/2;
        current_angle += 90;
        for(var i = 0; i < usable_edges.length; i++) {
            var e = usable_edges[i];
            current_angle += angle;
            current_angle = current_angle % 360;
            radians = parseInt(current_angle*2*Math.PI/360);
            var newx = Math.cos(radians)*e[2]*this.LABEL_OFFSET_X+x;
            var newy = Math.sin(radians)*e[2]*this.LABEL_OFFSET_Y+y;
            positions[node] = [newx, newy];
            if(node == e[1])
                sinknode = this.treenodes[e[0]];
            else
                sinknode = this.treenodes[e[1]];
            if(node == e[1])
                this.layoutNode(node, e[0], current_angle+180, newx, newy, 180, positions);
            else
                this.layoutNode(node, e[1], current_angle+180, newx, newy, 180, positions);
        }
    }
    
    // recursively handles the tree by drawing a single edge/node and propogating to all of its children
    this.drawNode = function(ctx, previous_node, node, current_angle, x, y, angle_span) {
        if(angle_span == null)
            angle_span = 360;
        // spread outgoing edges out over 180 degrees in the same direction as the incoming edge
        var usable_edges = [];
        for(var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            if(node == e[0] || node == e[1]) {
                if(previous_node == e[1] || previous_node == e[0])
                    continue;
                usable_edges.push(e);
            }
        }
        if(current_angle == null)
            var angle = angle_span/usable_edges.length;
        else
            var angle = angle_span/(usable_edges.length + 1);
        if(current_angle == null)
            current_angle = 0;
        current_angle -= angle*(usable_edges.length-1)/2;
        current_angle += 90;
        for(var i = 0; i < usable_edges.length; i++) {
            var e = usable_edges[i];
            current_angle += angle;
            current_angle = current_angle % 360;
            radians = parseInt(current_angle*2*Math.PI/360);
            ctx.moveTo(x, y);
            var newx = Math.cos(radians)*e[2]*this.LABEL_OFFSET_X+x;
            var newy = Math.sin(radians)*e[2]*this.LABEL_OFFSET_Y+y;
            ctx.lineTo(newx, newy);
            if(node == e[1])
                sinknode = this.treenodes[e[0]];
            else
                sinknode = this.treenodes[e[1]];
            if(sinknode[0] && sinknode[0].length > 0) {
                this.treeText.drawText(sinknode[0], newx+Math.cos(radians)*this.BRANCH_SCALE-5, newy+Math.sin(radians)*this.BRANCH_SCALE-5);
            }
            if(node == e[1])
                this.drawNode(ctx, node, e[0], current_angle+180, newx, newy, 180);
            else
                this.drawNode(ctx, node, e[1], current_angle+180, newx, newy, 180);
        }
    }
    
    // constructs a table to display the distance matrix
    this.makeMatrixTable = function() {
        this.matrixtable = document.createElement('TABLE');
        this.matrixtable.style.fontSize = this.TITLE_FONT;
        this.matrixtable.style.fontFamily = this.FONT;
        
        // x-axis labels
        var row = this.matrixtable.insertRow(0);
        row.insertCell(0);
        for(var col = 0; col < this.nodes.length; col++) {
            var cell = row.insertCell(col+1);
            cell.appendChild(document.createTextNode(this.nodes[col][0]));
        }
        for(var r = 0; r < this.matrix.length; r++) {
            var row = this.matrixtable.insertRow(r+1);
        
            // y-axis label
            var cell = row.insertCell(0);
            cell.appendChild(document.createTextNode(this.nodes[r][0]));
            
            for(var col = 0; col < this.matrix[r].length; col++) {
                var cell = row.insertCell(col+1);
                cell.appendChild(document.createTextNode(this.matrix[r][col]));
            }
        }
    }

    // constructs a table to display the strains in the tree
    this.makeStrainTable = function(strains, colors) {
        var base_16 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        this.straintable = document.createElement('TABLE');
        this.straintable.style.fontSize = this.TITLE_FONT;
        this.straintable.style.fontFamily = this.FONT;
        
        for(var i = 0; i < this.nodes.length; i++) {
            var row = this.straintable.insertRow(i);
            var cell = row.insertCell(0);
            cell.appendChild(document.createTextNode(this.nodes[i][0]));
            cell.style.verticalAlign = 'top';
            cell = row.insertCell(1);
            var straintext = this.nodes[i][1] + "<br/>";
            for(var s = 0; s < this.nodes[i][2].length; s++) {
                if(s % 5 == 0 && s/5 >= 1)
                    straintext += "\n<br/>";
                var strain = this.nodes[i][2][s];
                /*
                if(this.nodes[i][2][s] == "BTBR T<+>tf/J")
                    strain = "BTBR T+tf/J";
                if(this.nodes[i][2][s] == "ZRDCT Rax<+>ChUmdJ")
                    strain = "ZRDCT Rax+ChUmdJ";
                if(this.nodes[i][2][s] == "AEJ/GnRk a[e]/a[e]")
                    strain = "AEJ/GnRk";
                */
                if(!colors[strain])
                    color = [0,0,0];
                else
                    color = colors[strain];
                color_string = "#" + base_16[parseInt(color[0]/16)] + base_16[(color[0]%16)] + base_16[parseInt(color[1]/16)] + base_16[(color[1]%16)] + base_16[parseInt(color[2]/16)] + base_16[(color[2]%16)];
                if(strains.indexOf(strain) != -1)
                    straintext += "<b><a style='text-decoration:none; color:" + color_string + "'>" + this.nodes[i][2][s] + "</a></b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                else
                    straintext += "<a style='text-decoration:none; color:" + color_string + "'>" + this.nodes[i][2][s] + "</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
            }
            this.straintable.rows[i].cells[1].innerHTML = straintext;
        }
    }
    
    // parse the raw tree data from the RPC
    this.parse = function(info) {
        // file format:
        //
        // [unique "middle"] start,end
        // [inside] start,end
        // [outside] start,end
        // [all SNPs in] left,middle,right
        // [informative SNPs in] left,middle,right
        // [VINOs] left,middle,right
        // haplotypes
        // strains
        // matrix
        //
        // node1 [index,label,description,strain_index]
        // node2
        // ...
        // nodeX
        //
        // edge1 [source_index,sink_index,weight]
        // edge2
        // ...
        // edgeX
        var data = info.split('\n');
        this.middle = data[0].split(',');
        this.inside = data[1].split(',');
        this.outside = data[2].split(',');
        this.snps = data[3].split(',');
        this.inf = data[4].split(',');
        this.vinos = data[5].split(',');
        this.haplotypes = data[6];
        var strains = [];
        var groups = data[7].split(',');
        for(var i = 0; i < groups.length; i++) {
            strains[i] = groups[i].split('|');
        }
        this.matrix = [];
        var row = data[8].split(',');
        for(var i = 0; i < row.length; i++) {
            this.matrix[i] = row[i].split('|');
        }
        
        this.treenodes = [];
        this.nodes = [];
        for(var i = 0; i < this.matrix.length; i++)
            this.nodes[i] = [];
        var i = 11;
        while(data[i] != "") {
            var datum = data[i].split(',');
            if(datum[3] != "")
                this.treenodes.push([datum[1], datum[2], strains[parseInt(datum[3])]]);
            else
                this.treenodes.push([]);
            if(datum[3] != "")
                this.nodes[parseInt(datum[3])] = [datum[1], datum[2], strains[parseInt(datum[3])]]
            i++;
        }
        this.edges = [];
        i += 2;
        while(i < data.length && data[i] != "") {
            var datum = data[i].split(',');
            this.edges.push([parseInt(datum[0]), parseInt(datum[1]), parseInt(datum[2])]);
            i++;
        }
    }
    
    this.noTree = function() {
        var a = document.createElement('A');
        a.style.color = '#000000';
        a.style.textDecoration = 'none';
        a.innerText = 'No tree.';
        this.panel.add(a, 0, 0);
    }
}
