// a not-so-elegant but critical piece of scoping and closure
function attacher() {
    var o = arguments[0];
    var f = arguments[1];
    var params = [];
    for(var i = 2; i < arguments.length; i++)
        params.push(arguments[i]);
    return function() {
        var newparams = [];
        for(var i in arguments)
            newparams.push(arguments[i]);
        return f.apply(o, params.concat(newparams));
    }
}

function download(filename, text) {
  var element = document.createElement('a');
  /*
  var sl=/\\n/gi;
  var tab=/\\t/gi;
  var info=/\;/gi;
  var quote=/\"/gi;
  var newText= text.replace(sl,"\n");
  newText= newText.replace(info," ");
  newText= newText.replace(tab,",");
  newText= newText.replace(quote,"");
  */
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
