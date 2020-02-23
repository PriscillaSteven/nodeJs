var Util = require(__dirname + '/Util'),
    Actions = require(__dirname + '/actions'),
    ScheduleService = require(__dirname + '/ScheduleService'),
    AutomationService = require(__dirname + '/AutomationService'),
    ServerScript =  require(__dirname + '/models/ServerScript'),
    User = require(__dirname + '/models/User'),
    io = require('socket.io'),
    ioClient = require('socket.io-client');

var singleton = null;
var initApp = function(socket) {
    socket.on('subscribe', function(user) {
        if(user === singleton.supervisor) {
            socket.subscribed = true;
            socket.emit('name', 'Supervisor');  
            Util.log('Supervisor connected: ' + socket.id + '\n');
            socket.on('launchTest', function(maintainerName, testDefName) {
                var u = new User(maintainerName),
                    start = Util.now.getTime();
                u.id(function(err, id) {
                    if(err) { socket.emit('error', err.message); return; }
                    var launcher = Actions.find('TestHistoryActions', 'launchTest');
                    if(launcher) {
                        launcher(function() {
                            Util.log('Supervisor launch test fulfilled. ' + (Util.now.getTime() - start) +'ms\n');
                            socket.emit.apply(socket, arguments);
                        }, function() {
                            var sockets = singleton.io.of('/app').in(id);
                            sockets.emit.apply(sockets, arguments);
                        }, u, testDefName);
                    }
                });
            });
            socket.on('updateServerState', function(name, value) {
                var u = new User('state'),
                    start = Util.now.getTime();
                u.id(function(err, id) {
                    if(err) { socket.emit('error', err.message); return; }
                    var updater = Actions.find('ServerStateActions', 'updateServerState');
                    if(updater) {
                        updater(function() {
                            Util.log('Supervisor update state fulfilled. ' + (Util.now.getTime() - start) +'ms\n');
                            socket.emit.apply(socket, arguments);
                        }, function() {
                            var sockets = singleton.io.of('/app').in(id);
                            sockets.emit.apply(sockets, arguments);
                        }, u, name, value);
                    }
                });
            });
            return;
        }
        else if(user === 'report') {
            var u = new User('report');
            u.id(function(err, id) {
                if(err) socket.emit('error', err.message);
                else if(socket.subscribed) Util.log('Already subscribed.\n');
                else {
                    socket.subscribed = true;
                    Util.log('New connection: ' + socket.id + '\n');
                    // Register action handlers.
                    Actions.register(socket, u, function() {
                        var sockets = singleton.io.of('/app').in(id);
                        sockets.emit.apply(sockets, arguments);
                    }, 'ReportActions');
                    socket.join(id);
                    socket.emit('name', 'Reporter');  
                }
            });
        } else if(user === 'state') {
            var u = new User('state');
            u.id(function(err, id) {
                if(err) socket.emit('error', err.message);
                else if(socket.subscribed) Util.log('Already subscribed.\n');
                else {
                    socket.subscribed = true;
                    Util.log('New connection: ' + socket.id + '\n');
                    // Register action handlers.
                    var broadcast = function() {
                        var sockets = singleton.io.of('/app').in(id);
                        sockets.emit.apply(sockets, arguments);
                    };
                    Actions.register(socket, u, broadcast, 'ServerStateActions');
                    Actions.register(socket, u, broadcast, 'ServerScriptActions');
                    socket.join(id);
                    socket.emit('name', 'State');  
                }
            });
        } else if(user === 'console') {
            var u = new User('console');
            u.id(function(err, id) {
                if(err) socket.emit('error', err.message);
                else if(socket.subscribed) Util.log('Already subscribed.\n');
                else {
                    socket.subscribed = true;
                    Util.log('New connection: ' + socket.id + '\n');
                    var broadcast = function() { };
                    Actions.register(socket, u, broadcast, 'ConsoleActions');
                    socket.join(id);
                    socket.emit('name', 'Console');  
                }
            });
        } else if(user === 'AutoDB') {
            var u = new User('AutoDB');
            u.id(function(err, id) {
                if(err) socket.emit('error', err.message);
                else if(socket.subscribed) Util.log('Already subscribed.\n');
                else {
                    socket.subscribed = true;
                    Util.log('New connection: ' + socket.id + '\n');
                    var broadcast = function() { };
                    Actions.register(socket, u, broadcast, 'AutoDBActions');
                    socket.join(id);
                    socket.emit('name', 'Automation Database');  
                }
            });
        } else if(user === 'wsInspector') {
            var u = new User('wsInspector');
            u.id(function(err, id) {
                if(err) socket.emit('error', err.message);
                else if(socket.subscribed) Util.log('Already subscribed.\n');
                else {
                    socket.subscribed = true;
                    Util.log('New connection: ' + socket.id + '\n');
                    var broadcast = function() { };
                    Actions.register(socket, u, broadcast, 'WebserviceInspectorActions');
                    socket.join(id);
                    socket.emit('name', 'Webservice Inspector');  
                }
            });
        } else {
            var u = new User(user);
            u.name(function(err, name) {
                if(err) socket.emit('error', err.message);
                else if(!name) socket.emit('error', user + ' not found');
                else u.id(function(err, id) {
                    if(err) socket.emit('error', err.message);
                    else if(socket.subscribed) {
                        Util.log('Already subscribed.\n');
                        singleton.io.of('/app').in(id).emit(
                            'updateRunningTestsCount',
                            Util.getOwnProperties(AutomationService.runningTestInstances(id)).length
                        );
                    } else {
                        socket.subscribed = true;
                        Util.log('New connection: ' + socket.id + '\n');
                        // Register action handlers.
                        var broadcast = function() {
                            var sockets = singleton.io.of('/app').in(id);
                            sockets.emit.apply(sockets, arguments);
                        };
                        Actions.register(socket, u, broadcast, 'OperationActions');
                        Actions.register(socket, u, broadcast, 'TestDefinitionActions');
                        Actions.register(socket, u, broadcast, 'TestTargetActions');
                        Actions.register(socket, u, broadcast, 'TestHistoryActions');
                        Actions.register(socket, u, broadcast, 'ServerStateActions');
                        singleton.io.of('/app').in(id).emit(
                            'updateRunningTestsCount',
                            Util.getOwnProperties(AutomationService.runningTestInstances(id)).length
                        );
                        socket.join(id);
                        socket.emit('name', name);  
                    }
                });
            });
        }
    });
    socket.on('disconnect', function() { Util.log('Disconnected: ' + socket.id + '\n'); });
};

var ClientBroker = function(server) {
    if(!server && singleton) return singleton;
    else if(server && !singleton) singleton = this;
    else return null;
    
    Util.EventEmitter.call(this);
    this.setMaxListeners(0);
    
    var _io = io.listen(server);
    _io.set('log level', 1); // reduce logging
    this.__defineGetter__('io', function() { return _io; });    
    // Accept application socket connection request
    _io.of('/app').on('connection', initApp);
    // Setup log watcher
    Util.logWatcher = function(msg) {
        _io.of('/app').in('monitor').emit('logOfServerConsole', msg);
    }

    // Setup running tests count watcher
    AutomationService.on('updateRunningTestsCount', function(msg) {
        _io.of('/app').in(msg.uid).emit('updateRunningTestsCount', msg.runningTestsCount);
    });

    // Supervisor id
    var _sid = Util.tid();
    this.__defineGetter__('supervisor', function() { return _sid; });    
    // Initialise supervisor client.
    var startSupervisor = function(onDisconnect) {
        var _ioClient = ioClient.connect('http://localhost/app', {
            reconnection : false
        });
        _ioClient.on('connect', function() {
            _ioClient.on('error', function(err) { 
                Util.log("Failure detected on supervisor client:\n" + Util.inspect(err || { }, { depth: null }) + '\n');
            });
            _ioClient.on('disconnect', function() { if(typeof onDisconnect === 'function') Util.later(function() { onDisconnect(); }); });
            _ioClient.on('name', function() {
                // Init schedule service
                ScheduleService.on('requestAction', function(ev) {
                    if(ev.type === 'launchTest') {
                        _ioClient.emit('launchTest', ev.data.maintainerName, ev.data.testDefinitionName);
                    } else if (ev.type === 'updateServerState') {
                        _ioClient.emit('updateServerState', ev.data.name, ev.data.value);
                    } else Util.log('Unhandled action request: ' + Util.inspect(ev) + '\n');
                });
                ServerScript.iterate(function(script) {
                    if(script.enabled){
			Util.log("cb script name is " + script.name + " \n");
                        ScheduleService.putScript(script.name, script.content);
		    }
                }, function(err) {
                    if(err) throw err;
                    ScheduleService.updateTriggers();
                    ScheduleService.interval = 2.5 * 60 * 1000; // 2.5 min
                    ScheduleService.enabled = true;
                });
            });
            _ioClient.emit('subscribe', _sid);
        });
        return _ioClient;
    }
    var restartSupervisor = function(err) { startSupervisor(restartSupervisor); }    
    startSupervisor(restartSupervisor);
}

Util.inherits(ClientBroker, Util.EventEmitter)

module.exports = ClientBroker;
