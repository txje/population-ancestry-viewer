// ------------------------------------------------
// 2/16/2012
// Jeremy Wang
// 
// Forked from TextDrawPanel.py
// - converted to raw javascript
// ------------------------------------------------

function TextDrawPanel(width, height, size_mult) {
    this.DEFAULT_FONT = '"Helvetica Neue", Helvetica';
    this.DEFAULT_SIZE = 10 * size_mult;
    this.panel = new AbsolutePanel(width, height);
    this.element = this.panel.element;
    
    this.style = this.element.style;
    // draws formatted text at the given location
    this.drawText = function (text, x, y, font, size) {
        if(font == null)
            font = this.DEFAULT_FONT;
        if(size == null)
            size = this.DEFAULT_SIZE;
        var str = document.createElement('P')
        str.textContent = text;
        str.style.fontFamily = font;
        str.style.fontSize = size;
        this.panel.add(str, x, y);
    }
    this.clear = function () {
        while(this.element.hasChildNodes())
            this.element.removeChild(this.element.firstChild);
    }
}
