// ------------------------------------------------
// 2/20/2012
// Jeremy Wang
// 
// simulates a pyjamas Button
// ------------------------------------------------

function Button(str, handler, type, icon) {
    this.$element = $('<a>');
    this.element = this.$element.get(0);
    this.$element.addClass('btn');
    if(type)
        this.$element.addClass(type);
    if(icon) {
        this.$icon = $('<i>');
        this.$icon.addClass(icon);
    }
    
    this.style = this.element.style;
    this.handler = handler;

    this.$element.click(this.handler);

    this.getText = function() {
        return this.text;
    }

    this.setText = function(str) {
        this.text = $.trim(str);
        this.$element.text(' ' + this.text);
        this.$element.prepend(this.$icon);
    }

    this.setText(str);
}
