var Util = require(__dirname + '/../Util'),
    levelup = require('levelup'),
    storeDB = levelup(
        __dirname + '/../../datastore/ServerStates',
        { valueEncoding: 'json' }
    );

var ServerState = function() { 
    Util.EventEmitter.call(this);
    this.setMaxListeners(0);
};
Util.inherits(ServerState, Util.EventEmitter);
ServerState.prototype.get = function(key, cb) {
    cb = cb || function(err, value) { if(err) Util.log('Error: ' + err.message); };
    if(typeof cb !== 'function') throw new Error('Invalid parameter.');
    storeDB.get(key, function(err, value) {
        if(err) {
            if(err.notFound) cb();
            else cb(err);
        } else cb(undefined, value);
    })
};
ServerState.prototype.set = function(key, value, cb) {
    cb = cb || function(err)  { if(err) Util.log('Error: ' + err.message); };
    if(typeof cb !== 'function') throw new Error('Invalid parameter.');
    var s = this;
    s.get(key, function(err, origValue) {
        if(err) { cb(err); return; }
        if(value === origValue) { cb(); return; }
        storeDB.put(key, value, function(err) {
            if(!err) s.emit('update', { key: key, value: value });
            cb(err);
        });
    });
};
ServerState.prototype.del = function(key, cb) {
    cb = cb || function(err) { if(err) Util.log('Error: ' + err.message); };
    if(typeof cb !== 'function') throw new Error('Invalid parameter.');
    storeDB.del(key, cb);
};
ServerState.prototype.each = function(onData, onFin) {
    var onFin = onFin || function(err) { if(err) Util.log('Error: ' + err.message); },
        onData = onData || function(err, value) { if(err) Util.log('Error: ' + err.message); },
        error = undefined;
    if((typeof onFin !== 'function') || (typeof onData !== 'function')) throw new Error('Invalid parameter.');
    storeDB.createReadStream()
    .on('data', function(data) { onData(data.key, data.value); })
    .on('error', function(err) { error = err; })
    .on('end', function() { Util.later(function() { onFin(error); }); });
}

module.exports = new ServerState;