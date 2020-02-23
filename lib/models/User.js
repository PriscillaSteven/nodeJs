var Util = require(__dirname + '/../Util'),
    Schema = require(__dirname + '/lib/Schema'),
    levelup = require('levelup'),
    storeDB = levelup(
        __dirname + '/../../datastore/Users',
        { valueEncoding: 'json' }
    );

var userSchema = { 
    'id': 'string',
    'nm': 'string',
    // '~t': {             // Triggers:
    //     'n': 'string',  //  name
    //     's': 'string',  //  server local script content
    //     'u': 'number',  //  last updated timestamp
    //     'e': 'boolean', //  state, true for enabled, false for disabled
    //     '~t': 'string'  //  target tests, array of IDs
    // }
};

var usersCache = {};
var usersCacheByID = {};

var User = function(username) {
    if(usersCache[username]) return usersCache[username];
    var theSchema = new Schema(userSchema, username);
    this.__defineGetter__('theSchema', function() { return theSchema; });
    this.__defineGetter__('user', function() { return username; });
    // Set a value to track the indices
    storeDB.put('~' + username, Util.now.getTime(), function(err) {
        if(err) Util.log('WARNNING: Failed key set.' + ' Error: ' + err.message);
    });
};
User.prototype.__defineGetter__('id', function() {
    var u = this,
        theSchema = this.theSchema;
    return function(cb) { 
        if(u.$id) Util.later(function() { cb(null, u.$id); });
        else theSchema.id.get(storeDB, function(err, value) {
            if(err) cb(err);
            else if(!value) {
                var _id = Util.uuid();
                theSchema.id.set(storeDB, _id, function(_e) {
                    if(_e) cb(_e);
                    else {
                        u.__defineGetter__('$id',function(){ return _id; });
                        usersCacheByID[_id] = u;
                        cb(null, _id);
                    }
                }); 
            } else {
                u.__defineGetter__('$id',function(){ return value; });
                usersCacheByID[value] = u;
                cb(null, value);
            }
        });
    };
});
User.prototype.__defineGetter__('name', function() {
    var theSchema = this.theSchema,
        get = function(cb) { theSchema.nm.get(storeDB, cb); };
    get.get = get;
    get.set = function(value, cb) { 
        theSchema.nm.set(storeDB, value, cb); 
    };
    return get;
});
// User.prototype.__defineGetter__('newTrigger', function() {
//     var u = this,
//         theSchema = this.theSchema;
//     return function(name, cb) {
//         u.triggers(function(err, triggers) {
//             if(err) cb(err);
//             else {
//                 var exists = false;
//                 triggers.forEach(function(t) {
//                     if(t === name) {
//                         exists = true;
//                         u.trigger(name, cb);
//                     }
//                 });
//                 if(exists) return;
//                 var newEntry = theSchema.t.$new;
//                 newEntry.n.set(storeDB, name, function(err) {
//                     if(err) cb(err);
//                     else newEntry.u.set(storeDB, Util.now.getTime(), function(err) {
//                         if(err) cb(err);
//                         else u.trigger(name, cb);
//                     });
//                 });
//             }
//         });
//     };
// });
// User.prototype.__defineGetter__('trigger', function() {
//     var theSchema = this.theSchema;
//     return function(target, cb) {
//         if((typeof target !== 'string') || (typeof cb !== 'function'))
//             throw new Error('Invalid parameters.')
//         var triggersCount = 1,
//             wrapNotFount = function(err) {
//                 if(err) error = err;
//                 triggersCount -= 1;
//                 if(triggersCount === 0) cb(err);
//             };
//         theSchema.t.$keys(storeDB, function(triggerKey) {
//             triggersCount += 1;
//             theSchema.t(triggerKey).n(storeDB, function(err, name) {
//                 if(err) { cb(err); return; }
//                 else if(name !== target) wrapNotFount();
//                 else if(name === target) {
//                     var triggerInfo = {
//                         testDefinitions: [],
//                         del: function() { theSchema.t(triggerKey).$delete(storeDB); }
//                     };
//                     triggerInfo.__defineGetter__('name', function() { return name; });
//                     theSchema.t(triggerKey).s(storeDB, function(err, script) {
//                         if(err) { cb(err); return; }
//                         var scriptContent = script;
//                         triggerInfo.__defineGetter__('script', function() { return scriptContent; });
//                         triggerInfo.__defineSetter__('script', function(value) { 
//                             scriptContent = value;
//                             theSchema.t(triggerKey).s.set(
//                                 storeDB, value,
//                                 function(err) { if(err) Util.log('Error: ' + err + '\n'); }
//                             );
//                         });
//                         theSchema.t(triggerKey).u(storeDB, function(err, update) {
//                             if(err) { cb(err); return; }
//                             var upContent = update;
//                             triggerInfo.__defineGetter__('update', function() { return upContent; });
//                             triggerInfo.__defineSetter__('update', function(value) { 
//                                 upContent = value;
//                                 theSchema.t(triggerKey).u.set(
//                                     storeDB, value,
//                                     function(err) { if(err) Util.log('Error: ' + err + '\n'); }
//                                 );
//                             });
//                             theSchema.t(triggerKey).e(storeDB, function(err, enabled) {
//                                 if(err) { cb(err); return; }
//                                 var enContent = enabled;
//                                 triggerInfo.__defineGetter__('enabled', function() { return enContent; });
//                                 triggerInfo.__defineSetter__('enabled', function(value) { 
//                                     enContent = value;
//                                     theSchema.t(triggerKey).e.set(
//                                         storeDB, value,
//                                         function(err) { if(err) Util.log('Error: ' + err + '\n'); }
//                                     );
//                                 });
//                                 var count = 1,
//                                     error = undefined;
//                                 theSchema.t(triggerKey).t.$keys(storeDB, function(testKey) {
//                                     count += 1;
//                                     theSchema.t(triggerKey).t(testKey)(storeDB, function(err, testDef) {
//                                         if(err) error = err;
//                                         count -= 1;
//                                         triggerInfo.testDefinitions.push({id: testDef, del: function() {
//                                             theSchema.t(triggerKey).t(testKey).delete(storeDB);
//                                         }});
//                                         if(count === 0) cb(error, triggerInfo);
//                                     });
//                                 }, function(err) { 
//                                     if(err) error = err;
//                                     count -= 1;
//                                     if(count === 0) cb(error, triggerInfo);
//                                 });
//                             });
//                         });
//                     });
//                 }
//             });
//         }, function(err) { wrapNotFount(err); });
//     };
// });
// User.prototype.__defineGetter__('triggers', function() {
//     var theSchema = this.theSchema;
//     return function(cb) {
//         if(typeof cb === 'function') {
//             // Find all target triggers.
//             var waitCount = 1,
//                 error = undefined,
//                 triggerNames = [],
//                 wrapFin = function() { 
//                     waitCount -= 1; 
//                     if(waitCount === 0) cb(error, triggerNames);
//                 };
//             theSchema.t.$keys(storeDB, function(triggerKey) {
//                 waitCount += 1;
//                 theSchema.t(triggerKey).n(storeDB, function(err, name) {
//                     if(err) error = error || err;
//                     triggerNames.push(name);
//                     wrapFin();
//                 });
//             }, function(err) { error = error || err; wrapFin(); });
//         } else throw new Error('Invalid parameters.');
//     };
// });

module.exports = User;
module.exports.byID = function(id, cb) {
    Util.later(function() { cb(usersCacheByID[id]); })
};
module.exports.__defineGetter__('each', function() {
    return function(cb, fin) {
        var errored = false,
            cb = cb || function() {},
            fin = fin || function() {};
        var s = storeDB
        .createReadStream({ start: '~', end: '~~', keys: true, values: false })
        .on('data', function(key) { cb(new User(key.replace('~', '')), function() { s.destroy(); }) })
        .on('error', function(err) { (errored = true) && fin(err); })
        .on('end', function() { (!errored) && fin(); });
    }
});