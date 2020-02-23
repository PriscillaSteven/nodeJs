var Util = require(__dirname + '/../../Util.js'),
    levelup = require('levelup');

/**
    Note: '~' and '$' are not allowed in Schema entry name.
    Schema example:
    schema = {
        "foo" : "string",       // Acceptable types are 'string', 'boolean', 'number'.
        "bar" : {               // Sub schema can be just like a normal one.
            "sub": {
                "nest": 'string',
                "id": 'number',
            },
            "message": "string"
        },
        "~arrStrs": "string",   // Entry begins with '~' indicates it's an collection.
        "~arrObjs": {           // This is a collection of objects using sub schema.
            "id": "number",
            "~keys": "string" 
        }
    };
 */

var dbAction = function(db, type, path, dataType, args) {
    //Util.log('Action ' + type + ': ' + path + '\n');
    if(!db || !db instanceof levelup || db._status.match('clos'))
        throw new Error('DB not ready yet. ' + type + ': ' + path + '.' + Util.inspect(args));
    else if(type === 'get') { // Get some entry
        if(typeof args[0] !== 'function') throw new Error('Proper callback required.');
        db.get(path, function(err, value) {
            if(err) {
                if(err.notFound) args[0](undefined, undefined);
                else args[0](err, undefined);
            } else args[0](undefined, value);
        });
    } else if(type === 'set') { // Set some entry
        if(typeof args[0] !== dataType) throw new Error('Invalid data type, `' + dataType + '\' expected.');
        if(typeof args[1] !== 'function') throw new Error('Proper callback required.');
        db.put(path, args[0], function(err) {
            if(err) args[1](err);
            else args[1](undefined);
        });
    } else if(type === 'delRange') {
        db.createReadStream({
            keys: true, values: false,
            start: path, end: path + dbAction.sep + dbAction.sep
        }).on('data', function(key) {
            db.del(key, function(err) { if(err) Util.log('Faile to delete key: ' + key + '\n'); });
        }).on('error', function(err) { Util.log('Faile to delete key: ' + key + '\n'); })
        .on('end', function() { });
    } else if(type === 'iterKeyRange') {
        var lastKey = '',
            errored = false,
            onData = args[0],
            onFin = args[1] || function(err) { if(err) throw err; };
        if(typeof onData !== 'function' ||
            typeof onFin !== 'function') throw new
            Error('Invalid callbacks.');
        db.createReadStream({
            keys: true, values: false,
            start: path, end: path + dbAction.sep + dbAction.sep
        }).on('data', function(key) {
            var k = key.replace(path + dbAction.sep, '').split(dbAction.sep)[0];
            if(lastKey !== k) { lastKey = k; onData(k); }
        }).on('error', function(err) { errored = true; onFin(err); })
        .on('end', function() { if(!errored) onFin(); });
    } else throw new
        Error('Not Implemented action: `' + type + '\'.');
};
dbAction.sep = '~';

var Schema = function(s, rootKey) {
    if(typeof rootKey !== 'string' || !rootKey) throw new Error('Invalid index key: ' + rootKey);
    s = Util.shallow(s);
    var schema = this,
        path = '';
    if(rootKey.indexOf('$') > 0) throw new Error('Invalid root.');
    else if(rootKey.indexOf('$') < 0) path = '$' + rootKey;
    else path = rootKey;
    schema.__defineGetter__('$delete', function() {
        return function(db) { dbAction(db, 'delRange', path); }
    });
    Util.getOwnProperties(s).forEach(function(entry) {
        entry = Buffer(entry).toString('ascii');
        if(entry.indexOf('$') !== -1) throw new
            Error('Invalid character `$\' in entry name: `' + entry + '\'.');
        else if(entry.indexOf(dbAction.sep) === 0) { // Creating a collection
            var _e = entry.replace(dbAction.sep,''),
                dPath = path + dbAction.sep + _e;
            if(_e.indexOf(dbAction.sep) !== -1) throw new Error('Invalid entry ' + 'name: `' + _e + '\'.');
            else if((s[entry] === 'string') || (s[entry] === 'number') || (s[entry] === 'boolean')) {                
                schema.__defineGetter__(_e, function() { 
                    var i = function(index) {
                        var res = function(db, cb) { dbAction(db, 'get', dPath + dbAction.sep + index, s[entry], [cb]); };
                        res.set = function(db, value, cb) { dbAction(db, 'set', dPath + dbAction.sep + index, s[entry], [value, cb]); };
                        res.delete = function(db) { dbAction(db, 'delRange', dPath + dbAction.sep + index); };
                        res.get = res;
                        return res;
                    };
                    i.__defineGetter__('$keys', function() { return function(db, onKey, onFin) { dbAction(db, 'iterKeyRange', dPath, '', [onKey, onFin]); } });
                    i.__defineGetter__('$new', function() { return i(Util.tid()); });
                    i.__defineGetter__('$index', function() { return i; });
                    return i;
                });
            } else if(typeof s[entry] === 'object') {
                schema.__defineGetter__(_e, function() { 
                    var i = function(index) { return new Schema(s[entry], dPath + dbAction.sep + index); };
                    i.__defineGetter__('$keys', function() { return function(db, onKey, onFin) { dbAction(db, 'iterKeyRange', dPath, '', [onKey, onFin]); } });
                    i.__defineGetter__('$new', function() { return new Schema(s[entry], dPath + dbAction.sep + Util.tid()); });
                    i.__defineGetter__('$index', function() { return i; });
                    return i;
                });
            }
            else throw new Error('Unsupported entry type: `' + s[entry] + '\'.');
        } else if(entry.indexOf(dbAction.sep) === -1) { // Creating a entry
            if( s[entry] === 'string' || s[entry] === 'number' || s[entry] === 'boolean') {
                // Entry is normal types
                schema.__defineGetter__(entry, function() { 
                    var _s = function(db, cb) { dbAction(db, 'get', path + dbAction.sep + entry, s[entry], [cb]); };
                    _s.set = function(db, value, cb) { dbAction(db, 'set', path + dbAction.sep + entry, s[entry], [value, cb]); }
                    _s.get = _s;
                    return _s;
                });
            } else if(typeof s[entry] === 'object')  // Entry is schema
                schema[entry] = new Schema(s[entry], path + dbAction.sep + entry);
            else throw new Error('Unsupported entry type: `' + s[entry] + '\'.');
        } else throw new
            Error('Invalid character `' + dbAction.sep + '\' in entry name: `' + entry + '\'.');
    });
};

module.exports = Schema;