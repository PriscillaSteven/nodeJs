var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js');

var serial = 0;
var getTS = function() { return Util.now.toJSON() + "-" + (serial++) ; }
var Locks = function() {
    if(Util.isSlave) {
        // Util.log("setting up locks in child process.\n");
        var cbCache = { };
        process.on('message', function(msg) {
            if(msg.type == '__get_lock_reply') {
                var cb = cbCache[msg.ts];
                delete cbCache[msg.ts];
                if(typeof cb === 'function') 
                    cb(msg.error, msg.value);
            } else if(msg.type == '__set_lock_reply') {
                var cb = cbCache[msg.ts];
                delete cbCache[msg.ts];
                if(typeof cb === 'function') 
                    cb(msg.error);
            }
        });
        this.__defineGetter__('get', function() {
            return function(key, cb) {
                var ts = getTS();
                cbCache[ts] = cb;
                process.send({ type: '__get_lock', key: key, ts: ts });
            };
        });
        this.__defineGetter__('set', function() {
            return function(key, value, cb) {
                var ts = getTS();
                cbCache[ts] = cb;
                process.send({ type: '__set_lock', key: key, value: value, ts: ts });
            };
        });
        return this;
    } else {
        Util.log("setting up locks in main process.\n");
        var store = new SimpleStore(__dirname + '/../../datastore/Locks');
        this.__defineGetter__('get', function() { 
            return function(key, callback) {
                // Util.log("main getting " + key + '\n');
                store.each(function(value, put, del, stop) {
                    stop(); 
		            callback(null, value);
                }, function(err) { 
                    if(err) callback(err)
                    else callback();
                }, key)
            };
        });
        this.__defineGetter__('set', function() { 
            return function(key, value, callback) {
                // Util.log("main setting " + key + '\n');
                store.each(function(val, put, del, stop) {
                    stop(); 
                    put(value, callback);
                }, function(err) {
                    if(err) callback(err);
                    else store.add(value, callback, key);
                }, key);
            };
        });
        return this;
    }
};

module.exports = new Locks;

