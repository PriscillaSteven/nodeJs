var Util = require(__dirname + '/../../Util'),
    webservice = require(__dirname + '/../../webservice');

var inspectorCache = { };

exports.name = 'WebserviceInspectorActions';
exports.socketCleanup = function(reply, broadcast, user, socket) {
    Util.log('Clean up webservices initialised by connection ' + socket.id + '.\n');
    if(inspectorCache[socket.id]) {
        inspectorCache[socket.id].removeAllListeners();
        delete inspectorCache[socket.id];
    }
};
exports.actions = {
    loadWSDLFromURL: function(reply, broadcast, u, location, socket) {
        if(inspectorCache[socket.id]) {
            inspectorCache[socket.id].removeAllListeners();
            delete inspectorCache[socket.id];
        }
        inspectorCache[socket.id] = new webservice();
        inspectorCache[socket.id].on('ready', function() {
            Util.properties(inspectorCache[socket.id].services, function(srv) {
                reply('hasServiceWithName', srv);
            });
        });
        inspectorCache[socket.id].on('error', function(err) { reply('error', err.message); });
        inspectorCache[socket.id].loadWSDLByURL({ url: location, strictSSL: false });
    },
    loadWSDLFromContent: function(reply, broadcast, u, content, socket) {
        if(inspectorCache[socket.id]) {
            inspectorCache[socket.id].removeAllListeners();
            delete inspectorCache[socket.id];
        }
        inspectorCache[socket.id] = new webservice();
        inspectorCache[socket.id].on('ready', function() {
            Util.properties(inspectorCache[socket.id].services, function(srv) {
                reply('hasServiceWithName', srv);
            });
        });
        inspectorCache[socket.id].on('error', function(err) { reply('error', err.message); });
        inspectorCache[socket.id].loadWSDLByContent(content);
    },
    listServices: function(reply, broadcast, u, socket) {
        if(!inspectorCache[socket.id]) reply('error', 'None webservice loaded yet!');
        else Util.properties(inspectorCache[socket.id].services, function(srv) {
            reply('hasServiceWithName', srv);
        });
    },
    listPorts: function(reply, broadcast, u, service, socket) {
        if(!inspectorCache[socket.id]) reply('error', 'None webservice loaded yet!');
        else if(!inspectorCache[socket.id].services[service]) 
            reply('error', 'No webservice with name `' + service + '\' found!');
        else Util.properties(inspectorCache[socket.id].services[service], function(port) {
            reply('hasPortWithName', port, service);
        });
    },
    listMethods: function(reply, broadcast, u, service, port, socket) {
        if(!inspectorCache[socket.id]) reply('error', 'None webservice loaded yet!');
        else if(!inspectorCache[socket.id].services[service]) 
            reply('error', 'No webservice with name `' + service + '\' found!');
        else if(!inspectorCache[socket.id].services[service][port]) 
            reply('error', 'No port with name `' + port + '\' found in service `' + service + '\'!');
        else Util.properties(inspectorCache[socket.id].services[service][port], function(method) {
            reply('hasMethodWithName', method, port, service);
        });
    },
    describeMethod: function(reply, broadcast, u, service, port, method, socket) {
        if(!inspectorCache[socket.id]) reply('error', 'None webservice loaded yet!');
        else if(!inspectorCache[socket.id].services[service]) 
            reply('error', 'No webservice with name `' + service + '\' found!');
        else if(!inspectorCache[socket.id].services[service][port]) 
            reply('error', 'No port with name `' + port + '\' found in service `' + service + '\'!');
        else if(!inspectorCache[socket.id].services[service][port][method]) 
            reply('error', 'No method with name `' + method + '\' found in service `' + service + '\'!');
        else {
            var desc = undefined;
            try { desc = inspectorCache[socket.id].services[service][port][method].describe(); }
            catch(err) { 
                reply('error', 'Failed getting method description:\n' + err.message);// + ' stack: ' + err.stack);
                return;
            }
            reply('describeMethod', desc, method, port, service);
        }
    },
    invokeMethod: function(reply, broadcast, u, service, port, method, overrideSrvLoc, input, socket) {
        if(!inspectorCache[socket.id]) reply('error', 'None webservice loaded yet!');
        else if(!inspectorCache[socket.id].services[service]) 
            reply('error', 'No webservice with name `' + service + '\' found!');
        else if(!inspectorCache[socket.id].services[service][port]) 
            reply('error', 'No port with name `' + port + '\' found in service `' + service + '\'!');
        else if(!inspectorCache[socket.id].services[service][port][method]) 
            reply('error', 'No method with name `' + method + '\' found in service `' + service + '\'!');
        else {
            var inst = undefined;
            try {
                if(!input) input = { };
                if(typeof input === 'string') input = JSON.parse(input);
                inst = inspectorCache[socket.id].services[service][port][method].create(input, overrideSrvLoc); }
            catch(err) { 
                reply('error', 'Failed creating method invoking instance:\n' + err.message);
                return;
            }
            inst.then(function(err, res) {
                if(err) reply('error', 'Method invocation error:\n' + JSON.stringify(err, undefined, '  '));
                else reply('methodInvocationResult', res, method, port, service);
            });
        }
    }
};