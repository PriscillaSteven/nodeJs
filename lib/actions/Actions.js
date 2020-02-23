var Util = require(__dirname + '/../Util'),
    User = require(__dirname + '/../models/User');

var groups = { },
    cleanups = { };

var Actions = function() {
    var groupsPath = __dirname + '/lib';
    Util.lsDir(groupsPath).forEach(function(path) {
        try {
            var group = require(Util.resolve(groupsPath, path));
            Util.getOwnProperties(group.actions).forEach(function(n) {
                if(typeof group.actions[n] !== 'function')
                    throw new Error(); 
            });
            groups[group.name] = group.actions;
            cleanups[group.name] = group.socketCleanup;
        } catch(e) {
            Util.log('Cannot load action group in file: ' + path + ', ' + e.toString() + '\n');
        }
    });
};

Actions.prototype.register = function(socket, user, broadcast, group) {
    if(!user instanceof User) throw new Error('Invalid user.');
    if((!group) || (group === 'all')) {
        // Register all action handlers
        var actions = this;
        Util.getOwnProperties(groups).forEach(function(singleGroup) {
            actions.register(socket, user, broadcast, singleGroup);
        });
    } else {
        // Find corresponding action group and register.
        Util.getOwnProperties(groups[group]).forEach(function(action) {
            socket.on(action, function() {
                //var start = Util.now.getTime();
                //Util.log('Client ' + user.user + ' request: ' + action + '\n');
                groups[group][action].apply({ }, [function() {
                    //Util.log('Fullfilling ' + user.user + ' request: ' + action + '. ' + (Util.now.getTime() - start) +'ms\n');
                    socket.emit.apply(socket, arguments);
                }, broadcast, user].concat([].slice.call(arguments, 0)).concat([socket]));
            });
        });
        // Register cleanup function is present
        if(typeof cleanups[group] === 'function') {
            socket.on('disconnect', function() {
                cleanups[group](function() {
                    //Util.log('Fullfilling ' + user.user + ' request: ' + action + '.\n');
                    socket.emit.apply(socket, arguments);
                }, broadcast, user, socket);
            })
        }
        Util.log('Registered action group: ' + group  + '\n');
    }
};

Actions.prototype.groups = function() { return Util.getOwnProperties(groups); };

Actions.prototype.find = function(groupName, actionName) {
    var group = groups[groupName];
    if(group) return group[actionName];
};

module.exports = new Actions();