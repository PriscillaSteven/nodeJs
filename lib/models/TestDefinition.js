var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js'),
    store = new SimpleStore(__dirname + '/../../datastore/TestDefinitions');

var TestDefinition = function() {
    this.__defineGetter__('iterate', function() { 
        return function(user, callback, fin) {
            store.each(function(td, put, del, stop) {
                callback({
                    name: td.n, suites: td.s, trigger: td.t,
                    description: td.d, creation: td.r,
                    config: td.c, modification: td.m
                }, function(target, cb) {
                    put({
                        n: td.n, 
                        t: target.trigger || td.t,
                        s: target.suites || td.s,
                        c: target.config || td.c,
                        d: target.description || td.d,
                        r: td.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        td.r = 0;
                        cb(err);
                    });
                }, stop);
            }, fin, user)
        };
    });
    this.__defineGetter__('get', function() { 
        return function(user, name, callback) {
            store.each(function(td, put, del, stop) {
                if(td.n !== name) return;
                stop(); callback(null, {
                    name: td.n, suites: td.s, trigger: td.t,
                    description: td.d, creation: td.r,
                    config: td.c, modification: td.m
                }, function(target, cb) {
                    put({
                        n: td.n,
                        t: target.trigger || td.t,
                        s: target.suites || td.s,
                        c: target.config || td.c,
                        d: target.description || td.d,
                        r: td.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        td.r = 0;
                        cb(err);
                    });
                });
            }, function(err) { 
                if(err) callback(err)
                else callback();
            }, user)
        };
    });
    this.__defineGetter__('put', function() { 
        return function(user, name, target, callback) {
            store.each(function(td, put, del, stop) {
                if(td.n !== name) return;
                stop(); put({               // Update existing
                    n: td.n,
                    t: target.trigger || td.t,
                    s: target.suites || td.s,
                    c: target.config || td.c,
                    d: target.description || td.d,
                    r: td.r || Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback);
            }, function(err) {              // Not exist yet
                if(err) callback(err);
                else store.add({
                    n: name,
                    t: target.trigger || ' ',
                    s: target.suites || { },
                    c: target.config || { },
                    d: target.description || '',
                    r: Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback, user);
            }, user);
        };
    });
};

module.exports = new TestDefinition;