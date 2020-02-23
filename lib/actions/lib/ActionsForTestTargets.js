var Util = require(__dirname + '/../../Util'),
    TestTarget = require(__dirname + '/../../models/TestTarget');

var getLockStatus = function(tt, cb) {
    var id = tt.config.configName;
    if(!id) id = tt.config.host;
    if(!id) id = Util.inspect(tt.config);
    Util.locks.get(id, function(err, value) {
        if(err) { cb(err); return; }
        if(value && value.status && (value.status == 'locked')) cb(null, 'locked');
        else cb(null, 'normal');
    });
};

var lockTarget = function(tt, cb) {
    var id = tt.config.configName;
    if(!id) id = tt.config.host;
    if(!id) id = Util.inspect(tt.config);
    Util.locks.set(id, { status: 'locked', date: Util.now.toJSON() }, cb);
};

var unlockTarget = function(tt, cb) {
    var id = tt.config.configName;
    if(!id) id = tt.config.host;
    if(!id) id = Util.inspect(tt.config);
    Util.locks.set(id, { status: 'normal', date: Util.now.toJSON() }, cb);
};

exports.name = 'TestTargetActions';
exports.actions = {
    newTestTarget: function(reply, broadcast, u, tt_type, tt_name) {
        TestTarget.get(u.user, tt_name, function(err, tt, put, del) {
            if(err) { reply('error', err.message); return; }
            if(!tt) tt = { name: tt_name, type: tt_type, config: { host: tt_name, username: 'root' } };
            else {
                if(tt.type !== tt_type) {
                    reply('error', '`' + tt_name + '\' already exists with another type `' + tt.type + '\'');
                    return;
                }
                tt.config = config;
                tt.config.host = tt.config.host || '';
                tt.config.host = tt.config.host.trim();
            }
            TestTarget.put(u.user, tt_name, tt, function(err) {
                if(err) reply('error', err.message);
                else TestTarget.get(u.user, tt_name, function(err, tt) {
                    if(err) reply('error', err.message);
                    else if(!tt) reply('error', 'No test target found by name: ' + tt_name);
                    else getLockStatus(tt, function(err, status) {
                        if(err) reply('error', err.message);
                        else { tt.status = status; broadcast('updateTestTarget', tt); }
                    });
                });
            });
        });
    },
    listAllTestTargets: function(reply, broadcast, u) {
        TestTarget.iterate(u.user, function(tt) {
            getLockStatus(tt, function(err, status) {
                if(err) reply('error', err.message);
                else { tt.status = status; broadcast('updateTestTarget', tt); }
            });
        }, function(err) { if(err)
            reply('error', err.message); 
        });
    },
    briefTestTargets: function(reply, broadcast, u, actionId) {
        var targets = [];
        TestTarget.iterate(u.user, function(tt) {
            targets.push(tt.name);
        }, function(err) { 
            if(err) reply('error', err.message);
            else reply('briefTestTargets', targets, actionId);
        });
    },
    deleteTestTarget: function(reply, broadcast, u, tt_name) {
        TestTarget.get(u.user, tt_name, function(err, tt, put, del) {
            if(err) reply('error', err.message);
            else if(!tt) broadcast('updateTestTarget', { name: tt_name, deleteTarget: 1 });
            else del(function(err) {
                if(err) reply('error', err.message);
                else broadcast('updateTestTarget', { name: tt_name, deleteTarget: 1 });
            });
        });
    },
    putTestTarget: function(reply, broadcast, u, tt_name, config) {
        TestTarget.get(u.user, tt_name, function(err, tt, put, del) {
            if(err) { reply('error', err.message); return; }
            if(!tt) tt = { name: tt_name, config: config };
            else tt.config = config;
            tt.config.host = tt.config.host || '';
            tt.config.host = tt.config.host.trim();
            TestTarget.put(u.user, tt_name, tt, function(err) {
                if(err) reply('error', err.message);
                else TestTarget.get(u.user, tt_name, function(err, tt) {
                    if(err) reply('error', err.message);
                    else if(!tt) reply('error', 'No test target found by name: ' + tt_name);
                    else getLockStatus(tt, function(err, status) {
                        if(err) reply('error', err.message);
                        else { tt.status = status; broadcast('updateTestTarget', tt); }
                    });
                });
            });
        });
    },
    switchTestTargetLockStatus: function(reply, broadcast, u, tt_name) {
        TestTarget.get(u.user, tt_name, function(err, tt, put, del) {
            if(err) { reply('error', err.message); return; }
            getLockStatus(tt, function(err, status) {
                if(err) reply('error', err.message);
                else { 
                    if(status == 'locked') unlockTarget(tt, function(err) {
                        if(err) { reply('error', err.message); return; }
                        else { tt.status = 'normal'; broadcast('updateTestTarget', tt); }
                    });
                    else lockTarget(tt, function(err) {
                        if(err) { reply('error', err.message); return; }
                        else { tt.status = 'locked'; broadcast('updateTestTarget', tt); }
                    });
                }
            });
        });
    }
};
