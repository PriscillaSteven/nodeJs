var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js'),
    store = new SimpleStore(__dirname + '/../../datastore/ServerScripts');

var ServerScript = function() {
    this.__defineGetter__('iterate', function() { 
        return function(callback, fin) {
            store.each(function(script, put, del, stop) {
                callback({
                    name: script.n, content: script.c,
                    enabled: script.e,
                    description: script.d, creation: script.r,
                    modification: script.m
                }, function(content, enabled, description, cb) {
                    if((typeof enabled != 'boolean') && (enabled !== undefined))
                        enabled = false;
                    put({
                        n: script.n,
                        e: (enabled === undefined) ? script.e : enabled,
                        c: content || script.c,
                        d: description || script.d,
                        r: script.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        script.r = 0;
                        cb(err);
                    });
                }, stop);
            }, fin)
        };
    });
    this.__defineGetter__('get', function() { 
        return function(name, callback) {
            store.each(function(script, put, del, stop) {
                if(script.n !== name) return;
                stop(); callback(null, {
                    name: script.n, content: script.c,
                    enabled: script.e,
                    description: script.d, creation: script.r,
                    modification: script.m
                }, function(content, enabled, description, cb) {
                    if((typeof enabled != 'boolean') && (enabled !== undefined))
                        enabled = false;
                    put({
                        n: script.n,
                        e: (enabled === undefined) ? script.e : enabled,
                        c: content || script.c,
                        d: description || script.d,
                        r: script.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        script.r = 0;
                        cb(err);
                    });
                });
            }, function(err) { 
                if(err) callback(err)
                else callback();
            })
        };
    });
    this.__defineGetter__('put', function() { 
        return function(name, content, enabled, description, callback) {
            if((typeof enabled != 'boolean') && (enabled !== undefined))
                enabled = false;
            store.each(function(script, put, del, stop) {
                if(script.n !== name) return;
                stop(); put({               // Update existing
                    n: script.n,
                    e: (enabled === undefined) ? script.e : enabled,
                    c: content || script.c,
                    d: description || script.d,
                    r: script.r || Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback);
            }, function(err) {              // Not exist yet
                if(err) callback(err);
                else store.add({
                    n: name,
                    e: enabled || false,
                    c: content || '',
                    d: description || '',
                    r: Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback);
            })
        };
    });
};

module.exports = new ServerScript;