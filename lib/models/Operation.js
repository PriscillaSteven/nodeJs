var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js'),
    store = new SimpleStore(__dirname + '/../../datastore/Operations');

var Operation = function() {
    this.__defineGetter__('iterate', function() { 
        return function(user, callback, fin) {
            store.each(function(oper, put, del, stop) {
                callback({
                    name: oper.n, type: oper.t, content: oper.c,
                    description: oper.d, creation: oper.r,
                    modification: oper.m
                }, function(content, description, cb) {
                    put({
                        n: oper.n, t: oper.t,
                        c: content || oper.c,
                        d: description || oper.d,
                        r: oper.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        oper.r = 0;
                        cb(err);
                    });
                }, stop);
            }, fin, user)
        };
    });
    this.__defineGetter__('get', function() { 
        return function(user, type, name, callback) {
            store.each(function(oper, put, del, stop) {
                if(oper.n !== name || oper.t !== type) return;
                stop(); callback(null, {
                    name: oper.n, type: oper.t, content: oper.c,
                    description: oper.d, creation: oper.r,
                    modification: oper.m
                }, function(content, description, cb) {
                    put({
                        n: oper.n, t: oper.t,
                        c: content || oper.c,
                        d: description || oper.d,
                        r: oper.r || Util.now.getTime(),
                        m: Util.now.getTime()
                    },cb);
                }, function(cb) {
                    del(function(err) {
                        oper.r = 0;
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
        return function(user, type, name, content, description, callback) {
            store.each(function(oper, put, del, stop) {
                if(oper.n !== name || oper.t !== type) return;
                stop(); put({               // Update existing
                    n: oper.n, t: oper.t,
                    c: content || oper.c,
                    d: description || oper.d,
                    r: oper.r || Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback);
            }, function(err) {              // Not exist yet
                if(err) callback(err);
                else store.add({
                    n: name, t: type,
                    c: content || '',
                    d: description || '',
                    r: Util.now.getTime(),
                    m: Util.now.getTime()
                }, callback, user);
            }, user)
        };
    });
};

module.exports = new Operation;