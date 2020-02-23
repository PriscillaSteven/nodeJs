var Util = require(__dirname + '/../../Util.js'),
    levelup = require('levelup');

var idWidth = 20;
    
var SimpleStore = function(dbPath, valueEncoding) {
    if(!valueEncoding) valueEncoding = 'json';
    if(typeof valueEncoding !== 'string') throw new
        Error('Invalid valueEncoding option');
    if(typeof dbPath !== 'string') throw new 
        Error('Invalid DB path.');
    var db = levelup(Util.resolve(dbPath), { valueEncoding: valueEncoding });
    this.__defineGetter__('$db', function() { return db; });
    this.__defineGetter__('location', function() { return db.location; });
    this.__defineGetter__('status', function() { return db._status; });
    this.__defineGetter__('close', function() { return db.close.bind(db); });
    this.__defineGetter__('open', function() { return db.open.bind(db); });
    
    var walk = function(callback, fin, from, to, limit, filter, prefix) {
        if(!fin) fin = function(err) {
            if(err) Util.log(
                'Error when iterating throw database: ' + 
                err.message + '\n'
            ); else Util.log('Done iterating database.\n');
        };
        
        if( typeof callback !== 'function' ||
            !(callback.length >= 1 && callback.length <= 5) ||
            typeof fin !== 'function' ||
            fin.length !== 1) throw new 
            Error('Invalid callbacks.');
                
        if(limit === undefined || limit === null) limit = -1;
        if(typeof limit !== 'number') throw new
            Error('Invalid `limit\' option.');
        
        var isIdStr = function(str) {
            if(typeof str !== 'string' ||
                str.length !== idWidth)
                return false;
            for(var i = 0; i < str.length; i++)
                if(str[i] < '0' || str[i] > '9') return false;
            return true;
        };
        //Util.log('Will walk `' + Util.basename(dbPath) + '\' from ' + from);
        if(from instanceof Date) 
            from = Util.lpad(from.getTime() + '0000', idWidth);
        else if(typeof from === 'number')
            from = Util.lpad(from + '0000', idWidth);
        else if(isIdStr(from))
            from = Util.lpad(from, idWidth);
        else if(!from) from = Util.lpad(0, idWidth);
        else throw new
            Error('Invalid `from\' option.');
        //Util.log(':' + from);
        
        //Util.log(' to ' + to);
        if(to instanceof Date)
            to = Util.lpad(to.getTime() + '0000', idWidth);
        else if(typeof to === 'number')
            to = Util.lpad(to + '0000', idWidth);
        else if(isIdStr(to))
            to = Util.lpad(to, idWidth);
        else if(!to) to = Util.lpad(9, idWidth, '9');
        else throw new
            Error('Invalid `to\' option.');
        //Util.log(':' + to + '\n');
        
        if(filter) {
            filter = Util.shallow(filter);
            Util.getOwnProperties(filter).forEach(function(f) {
                if(typeof filter[f] !== 'string' &&
                    !filter[f] instanceof RegExp) throw new Error(
                    'Invalid filter entry `' + f + 
                    '\' expected `string\' or `RegExp\', got `' +
                    (typeof filter[f]) + '\'.'
                );
            });
        }
        
        var reverse = (to < from),
            errored = false;         
        if(prefix) prefix = prefix + '~';
        else prefix = ''
        var stream = db.createReadStream({ 
            start: prefix + from, 
            end: prefix + to, 
            reverse: reverse,
            limit: limit,
            valueEncoding: valueEncoding
        }).on('data', function(data) {
            var dataValid = true;
            if(filter) Util.getOwnProperties(data.value).forEach(function(e) {
                if(typeof filter[e] === 'string' && 
                    data.value[e] !== filter[e])
                    dataValid = false;
                else if(filter[e] instanceof RegExp &&
                        !filter[e].exec(data.value[e]))
                    dataValid = false;
            });
            dataValid && callback( data.value, 
            function(newValue, cb) {                        // Put function
                db.put(data.key, newValue, function(err) {
                    if(typeof cb === 'function') cb(err);
                    else if(err) throw err;
                });
            }, function(cb) {                               // Delete function
                db.del(data.key, function(err) {
                    if(typeof cb === 'function') cb(err);
                    else if(err) throw err;
                });
            }, function() { stream.destroy(); },            // Stop method
            data.key);                                      // Data index
        })
        .on('error', function(err) { (errored = true) && fin(err); })
        .on('end', function() { if(!errored) fin(); });
    };
    this.__defineGetter__('from', function(){ return function(from) { return {
        to: function(to) { return {
            limit: function(count) { return {
                filter: function(f) { return {
                    each:function(callback, fin, prefix) {
                        walk(callback, fin, from, to, count, f, prefix);
                } }; },
                each: function(callback, fin, prefix) {
                    walk(callback, fin, from, to, count, null, prefix);
            } }; },
            filter: function(f) { return {
                each: function(callback, fin, prefix) {
                    walk(callback, fin, from, to, null, f, prefix);
            } }; },
            each: function(callback, fin, prefix) {
                walk(callback, fin, from, to, null, null, prefix);
            } }; 
        },
        limit: function(count) { return {
            filter: function(f) { return {
                each: function(callback, fin, prefix) {
                    walk(callback, fin, from, null, count, f, prefix);
            } }; },
            each: function(callback, fin, prefix) {
                walk(callback, fin, from, null, count, null, prefix);
            } }; 
        },        
        filter: function(f) { return {
            each: function(callback, fin, prefix) {
                walk(callback, fin, from, null, null, f, prefix);
        } }; },
        each: function(callback, fin, prefix) {
            return walk(callback, fin, from, null, null, null, prefix);
        }
    }; }; });
    this.__defineGetter__('to', function() { return function(to) { return {
        limit: function(count) { return {            
            filter: function(f) { return {
                each: function(callback, fin, prefix) {
                    walk(callback, fin, null, to, count, f, prefix);
            } }; },
            each: function(callback, fin, prefix) {
                walk(callback, fin, null, to, count, null, prefix);
            } }; },            
        filter: function(f) { return {
            each: function(callback, fin, prefix) {
                walk(callback, fin, null, to, null, f, prefix);
        } }; },
        each: function(callback, fin, prefix) {
            return walk(callback, fin, null, to, null, null, prefix);
        } 
    }; }; });
    this.__defineGetter__('range', function() { return function(from, to) {
        return {
            limit: function(count) { return {                
                filter: function(f) { return {
                    each: function(callback, fin, prefix) {
                        walk(callback, fin, from, to, count, f, prefix);
                } }; },
                each: function(callback, fin, prefix) {
                    walk(callback, fin, from, to, count, null, prefix);
                } }; },
            filter: function(f) { return {
                each: function(callback, fin, prefix) {
                    walk(callback, fin, from, to, null, f, prefix);
            } }; },
            each: function(callback, fin, prefix) {
                return walk(callback, fin, from, to, null, null, prefix);
            } 
        };
    }; });
    this.__defineGetter__('limit',function(){return function(count) { return {
        filter: function(f) { return {
            each: function(callback, fin, prefix) {
                walk(callback, fin, null, null, count, f, prefix);
        } }; },
        each: function(callback, fin, prefix) {
            return walk(callback, fin, null, null, count, null, prefix);
        }
    }; }; });
    this.__defineGetter__('filter', function() { return function(f) { return {
        each: function(callback, fin, prefix) {
            walk(callback, fin, null, null, null, f, prefix);
    } }; }; });
    this.__defineGetter__('each', function() {
        return function(callback, fin, prefix) {
            return walk(callback, fin, null, null, null, null, prefix);
        };
    });
    this.__defineGetter__('add', function() {
        return function(value, callback, prefix) {
            var store = this;
            var id = Util.tid(null, idWidth);
            if(!callback) callback = function(err, id) {
                if(err) Util.log(
                    'Unhandled failure inserting to `' + 
                    Util.basename(store.$db.location) + '\', Error: ' + 
                    err.message + '\n'
                ); else Util.log(
                    'Unhandled insertion to `' + 
                    Util.basename(store.$db.location) + '\', Key: ' + 
                    id + '\n'
                );
            }
            if( typeof callback !== 'function' || 
               (callback.length !== 2 &&
                callback.length !== 1)) throw new Error(
                'Callback should have signature like:' + 
                ' function(err[, id]) { ... }.'
            );                   
            if(prefix) id = prefix + '~' + id;
            try {
                store.$db.put(id, value, function(err) {
                    if(err) callback(err, id);
                    else callback(null, id);
                });
            } catch(ex) { 
                Util.log('Fatal DB error: ' + Util.inspect(ex) + '\n');
                callback(ex, id);
            }
        };
    });    
    this.__defineGetter__('update', function() {
        var store = this;
        return function(id, value, cb) {
            store.$db.get(id, function(err, old) {
                if(err) {
                    if(err.notFound) store.$db.put(id, value, cb);
                    else cb(err);
                }
                if(typeof old === 'object' && typeof value === 'object') {
                    Util.getOwnProperties(value).forEach(function(p) {
                        old[p] = value[p];
                    });
                } else old = value;
                store.$db.put(id, old, cb);
            });
        };
    });
};

module.exports = SimpleStore;
