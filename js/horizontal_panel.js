// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// simulates a pyjamas HorizontalPanel
// ------------------------------------------------

function HorizontalPanel() {
    this.element = document.createElement('DIV');
    this.table = document.createElement('TABLE');
    this.element.appendChild(this.table);
    this.row = this.table.insertRow(0);
    
    this.children = [];
    
    this.style = this.element.style;
    
    this.add = function(a) {
        var cell = this.row.insertCell(this.row.cells.length);
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
        var cell = this.children[i].parentNode; // node > td
        cell.parentNode.removeChild(cell); // td > tr
        this.children.pop(i);
        return true;
    }
    
    this.remove = function(a) {
        for(var i = 0; i < this.row.cells.length; i++) {
            if(this.row.cells[i].childNodes[0] == a) {
                this.row.deleteCell(i);
                this.children.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    
    this.insert = function(a, i) {
        var cell = this.row.insertCell(i);
        cell.appendChild(a);
        this.children.splice(i, 0, a);
        return a;
    }
    
    this.clear = function() {
        while(this.table.rows[0].cells.length > 0)
            this.table.rows[0].deleteCell(0);
        this.children = [];
    }
}
