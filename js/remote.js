// ------------------------------------------------
// 2/22/2012
// Jeremy Wang
// 
// Carry out AJAX remote procedure calls
// to retrieve data
// ------------------------------------------------

function AJAX(script, handler, params) {
    var xmlhttp;
    if (window.XMLHttpRequest) { // IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    }
    else { // IE5,6
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange=function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var response = xmlhttp.responseText;
            if(response.length > 0)
                handler.callback(xmlhttp.responseText);
            else
                handler.error('Empty response');
        }
        else if(xmlhttp.readyState == 4) {
            handler.error('Error: ' + xmlhttp.status);
        }
    }
    xmlhttp.open("POST", script, true);
    var data = '';
    for(p in params) {
        if(params[p] && params[p] instanceof Array) {
            for(a in params[p]) {
                data += '&' + p + '=' + params[p][a];
            }
        }
        else {
            data += '&' + p + '=' + params[p];
        }
    }
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(data);
}

function RPC(script, handler, params) {
    var tmp_handler = new function() {
        this.callback = function (response) {
            try {
                var data = null;
                eval('data = ' + response);
            }
            catch(err) {
                handler.error('Error: ' + response);
                return;
            }
            handler.callback(data);
        }
        this.error = function(response) {
            handler.error(response);
        }
    }
    AJAX(script, tmp_handler, params);
}

function remote_dump(script, callback, params) {
    var tmp_handler = new function() {
        this.callback = function (response) {
            callback(response);
        }
    }
    AJAX(script, tmp_handler, params);
}
