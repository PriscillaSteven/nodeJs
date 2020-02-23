var Util = require(__dirname + '/../../Util'),
    User = require(__dirname + '/../../models/User'),
    AutomationService = require(__dirname + '/../../AutomationService'),
    Operation = require(__dirname + '/../../models/Operation');

exports.name = 'OperationActions';
exports.actions = {
    'getBuiltinOperation': function(reply, broadcast, u, type, name) {
        var oper = AutomationService.BuiltinOperations.get(type, name);
        reply('updateBuiltinOperation',{
            type: type, name: name, content: oper 
        });
    },
    'listAllBuiltinOperations': function(reply, broadcast, u) {
        AutomationService.BuiltinOperations.discover(function(t, n, content) {
            reply('updateBuiltinOperation', { type: t, name: n, content: content });
        });
    },
    'getCustomOperation': function(reply, broadcast, u, type, name) {
        Operation.get(u.user, type, name, function(err, oper) {
            if(err) reply('error', err.message);
            else if(!oper) reply('error', 'No "' + type + '" operation found by name: ' + name); 
            else reply('updateCustomOperation', oper);
        });
    },
    'listAllCustomOperations': function(reply, broadcast, u) {
        Operation.iterate(u.user, function(oper) {
            reply('updateCustomOperation', {
                name: oper.name,
                type: oper.type, 
                content: oper.content,
                modification: oper.modification 
            });
        }, function(err) { if(err) reply('error', err.message); });
    },
    'deleteCustomOperation': function(reply, broadcast, u, t, n) {
        Operation.get(u.user, t, n, function(err, oper, put, del) {
            if(err) reply('error', err.message);
            else if(!oper) broadcast('updateCustomOperation', { name: n, type: t, deleteOper: 1 });
            else del(function(err) {
                if(err) reply('error', err.message);
                else broadcast('updateCustomOperation', { name: n, type: t, deleteOper: 1 });
            });
        });
    },
    'saveCustomOperation': function(reply, broadcast, u, t, n, c, d) {
        reply('info', 'Saving "' + t + '" operation with name: ' + n);
        Operation.put(u.user, t, n, c, d, function(err) {
            if(err) reply('error', err.message);
            else Operation.get(u.user, t, n, function(err, oper) {
                if(err) reply('error', err.message); 
                else if(!oper) reply('error', 'No "' + type + '" operation found by name: ' + name); 
                else {
                    broadcast('updateCustomOperation', {
                        name: oper.name,
                        type: oper.type, 
                        content: oper.content,
                        modification: oper.modification 
                    });
                    reply('info', 'Saved "' + t + '" operation: ' + n);
                }
            });
        });
    }
};