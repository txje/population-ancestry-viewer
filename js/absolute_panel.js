// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// simulates a pyjamas AbsolutePanel
// ------------------------------------------------

function AbsolutePanel(width, height) {
    this.element = document.createElement('DIV');
    this.width = width;
    this.height = height;
    this.element.style.width = width + 'px';
    this.element.style.height = height + 'px';
    this.element.style.position = 'relative'; // makes all children's position:absolute relative to this element
    
    this.children = [];
    
    this.style = this.element.style;
    
    // primary function - parses tree info, draws matrix, strains, annotation, and tree
    this.add = function(a, x, y) {
        a.style.position = 'absolute';
        a.style.left = x + 'px';
        a.style.top = y + 'px';
        this.element.appendChild(a);
        this.children[this.children.length] = a;
        return a;
    }
    
    this.remove = function(a) {
        for(var i = 0; i < this.element.childNodes.length; i++) {
            if(this.element.childNodes[i] == a) {
                this.childNodes.pop(i);
                this.children.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    
    this.clear = function() {
        while(this.element.hasChildNodes())
            this.element.removeChild(this.element.firstChild);
        this.children = [];
    }
}
