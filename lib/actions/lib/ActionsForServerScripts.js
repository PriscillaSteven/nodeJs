var Util = require(__dirname + '/../../Util'),
    ServerScript = require(__dirname + '/../../models/ServerScript')
    ScheduleService = require(__dirname + '/../../ScheduleService');

exports.name = 'ServerScriptActions';
exports.actions = {
    // Actions of Server Script.
    newServerScript: function(reply, broadcast, u, name) {
        exports.actions.saveContentOfServerScript(reply, broadcast, u, name, undefined);
    },
    listAllServerScripts: function(reply, broadcast, u) {
        ServerScript.iterate(function(script) {
            reply('updateServerScript', {
                name: script.name,
                modification: script.modification,
                enabled: script.enabled || false
            });
        }, function(err) { 
            if(err) reply('error', err.message);
        });
    },
    deleteServerScript: function(reply, broadcast, u, name) {
        ServerScript.get(name, function(err, script, put, del) {
            if(err) reply('error', err.message);
            else if(!script) broadcast('deleteServerScript', name);
            else del(function(err) {
                if(err) reply('error', err.message);
                else {
                    broadcast('deleteServerScript', name);
                    ScheduleService.removeScript(name);
                }
            });
        });
    },
    getContentOfServerScript: function(reply, broadcast, u, name) {
        ServerScript.get(name, function(err, script) {
            if(err) reply('error', err.message);
            else if(!script) reply('error', 'No server script found by name: ' + name);
            else reply('contentOfServerScript', {
                name: script.name,
                content: script.content
            });
        });
    },
    saveContentOfServerScript: function(reply, broadcast, u, name, content) {
        reply('info', 'Saving server script with name: ' + name);
        ServerScript.put(name, content, undefined, undefined, function(err) {
            if(err) reply('error', err.message);
            else ServerScript.get(name, function(err, script) {
                if(err) reply('error', err.message);
                else if(!script) reply('error', 'No server script found by name: ' + name);
                else {
                    broadcast('updateServerScript', {
                        name: script.name,
                        modification: script.modification,
                        enabled: script.enabled
                    });
                    if(script.enabled) 
                        ScheduleService.putScript(name, content);
                    reply('info', 'Saved server script: ' + name);
                }
            });
        });
    },
    enableServerScript: function(reply, broadcast, u, name) {
        reply('info', 'Enabling server script with name: ' + name);
        ServerScript.put(name, undefined, true, undefined, function(err) {
            if(err) reply('error', err.message);
            else ServerScript.get(name, function(err, script) {
                if(err) reply('error', err.message);
                else if(!script) reply('error', 'No server script found by name: ' + name);
                else {
                    broadcast('updateServerScript', {
                        name: script.name,
                        modification: script.modification,
                        enabled: script.enabled
                    });
                    ScheduleService.putScript(name, script.content);
                    reply('info', 'Enabled server script: ' + name);
                }
            });
        });
    },
    disableServerScript: function(reply, broadcast, u, name) {
        reply('info', 'Disabling server script with name: ' + name);
        ServerScript.put(name, undefined, false, undefined, function(err) {
            if(err) reply('error', err.message);
            else ServerScript.get(name, function(err, script) {
                if(err) reply('error', err.message);
                else if(!script) reply('error', 'No server script found by name: ' + name);
                else {
                    broadcast('updateServerScript', {
                        name: script.name,
                        modification: script.modification,
                        enabled: script.enabled
                    });
                    ScheduleService.removeScript(name);
                    reply('info', 'Disabled server script: ' + name);
                }
            });
        });
    }
};