// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// simulates a pyjamas VerticalPanel
// ------------------------------------------------

function VerticalPanel(tight) {
    this.element = document.createElement('DIV');
    this.table = document.createElement('TABLE');
    if(tight) {
        this.table.setAttribute('cellspacing', '0');
        this.table.setAttribute('cellpadding', '0');
    }
    this.element.appendChild(this.table);
    
    this.children = [];
    
    this.style = this.element.style;
    
    this.add = function(a) {
        var row = this.table.insertRow(this.table.rows.length);
        var cell = row.insertCell(0);
        cell.appendChild(a);
        this.children[this.children.length] = a;
        return a;
    }
    
    this.addText = function(a) {
        return this.add(document.createTextNode(a));
    }
    
    this.pop = function(i) {
        if(i == null)
            var i = this.children.length - 1;
        var row = this.children[i].parentNode.parentNode; // node > td > tr
        row.parentNode.removeChild(row); // tr > table
        this.children.pop(i);
        return true;
    }
    
    this.remove = function(a) {
        for(var i = 0; i < this.table.rows.length; i++) {
            if(this.table.rows[i].cells[0].childNodes[0] == a) {
                this.table.deleteRow(i);
                this.children.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    
    this.insert = function(a, i) { // a is an element and i is the index to insert it before
        var row = this.table.insertRow(i);
        var cell = row.insertCell(0);
        cell.appendChild(a);
        this.children.splice(i, 0, a);
        return a;
    }
    
    this.clear = function() {
        while(this.table.rows.length > 0)
            this.table.deleteRow(0);
        this.children = [];
    }
}
