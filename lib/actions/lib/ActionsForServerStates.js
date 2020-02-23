var Util = require(__dirname + '/../../Util'),
    ServerState = require(__dirname + '/../../models/ServerState');

exports.name = 'ServerStateActions';
exports.actions = {
    // Actions of Server ServerState.
    listKeysOfServerStates: function(reply, broadcast, u) {
    	var states = [];
    	ServerState.each(function(key, value) {
    		states.push(key);
		}, function(err) {
			if(err) {
				reply('error', err.message);
				reply('allKeysOfServerStates', []);
				return;
			}
			reply('allKeysOfServerStates', states);
		});
    },
    listServerStates: function(reply, broadcast, u) {
        ServerState.each(function(key, value) {
            reply('updateServerState', key, value);
        }, function(err) { if(err) reply('error', err); });
    },
    updateServerState: function(reply, broadcast, u, key, value) {
        ServerState.get(key, function(err, preValue) {
            if(err) reply('error', err);
            else if(preValue !== value) ServerState.set(key, value, function(err) {
                if(err) reply('error', err);
                else broadcast('updateServerState', key, value);
            });
        });
    },
    removeServerState: function(reply, broadcast, u, key) {
        ServerState.del(key, function(err) {
            if(err) reply('error', err);
            else broadcast('removeServerState', key);
        });
    },
    getServerConsole: function(reply, broadcast, u, socket) { socket.join('monitor'); }
};