var express = require('express'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    Util = require(__dirname + '/lib/Util'),
    ClientBroker = new (require(__dirname + '/lib/ClientBroker'))(server);

//require('livereload').createServer().watch(__dirname + "/clientApp");

app.get('/*',function(req,res,next){
    res.header( 'X-UA-Compatible', 'IE=edge,chrome=1');
    next(); // http://expressjs.com/guide.html#passing-route control
});

app.use('/public', express.static(__dirname + '/clientApp/style'));
app.use('/public', express.static(__dirname + '/clientApp/script'));
app.use('/public', express.static(__dirname + '/clientApp/script/thirdparty'));
app.use('/public', express.static(__dirname + '/clientApp/bower_components'));
app.get('/state', function(req, res) {
    res.sendfile(__dirname + '/clientApp/state.html', { maxAge: 3000 });
});
app.get(/^\/report\/[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/report.html', { maxAge: 3000 });
});
app.get(/^\/console$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/console.html', { maxAge: 3000 });
});
app.get(/^\/wsInspector$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/wsInspector.html', { maxAge: 3000 });
});
app.get(/^\/([a-zA-Z\$]{5}\d{2})\/?$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/user.html', { maxAge: 3000 });
});
app.get(/^\/([a-zA-Z\$]{5}\d{2})\/([a-zA-Z]+)$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/partials/user/' + req.params[1] + '.html', { maxAge: 3000 });
});
// Added to clone auto db statistic previously owned by Li, Yang
app.get('/auto', function(req, res) {
    res.sendfile(__dirname + '/clientApp/auto.html', { maxAge: 3000 });
});

app.get('/ubuntu', function(req, res) {
    res.sendfile(__dirname + '/clientApp/user.html', { maxAge: 3000 });
});
app.get(/^\/ubuntu\/([a-zA-Z]+)$/, function(req, res) {
    res.sendfile(__dirname + '/clientApp/partials/user/' + req.params[0] + '.html', { maxAge: 3000 });
});

server.listen(80);
