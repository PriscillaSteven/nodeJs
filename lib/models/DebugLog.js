var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js');

var DebugLog = function() {
    if(Util.isSlave) {
        this.insert = function(msg) {
            process.send({ type: '__debug_log', content: msg });
        };
        return this;
    }
    SimpleStore.call(this, __dirname + '/../../datastore/DebugLogs');
    var add = this.add, from = this.from, to = this.to, range = this.range,
        limit = this.limit, each = this.each, filter = this.filter;
    delete this.add;
    delete this.from;
    delete this.to;
    delete this.limit;
    delete this.each;
    delete this.filter;
    delete this.range;
    this.__defineGetter__('insert', function() { return function(message, cb) {
        if(!cb) cb = function(err) { 
            if(err) console.log(
                'Debug message lost, error: ' + err.message +
                '\n Message: ' + message
            ); 
        };
        if(typeof cb !== 'function') throw new
            Error('Invalid callback!');
        add.call(this, message, cb);
    }; });
    this.__defineGetter__('range', function() {
        return function(startDate, endDate, reverse) {
            if(reverse) return range(endDate, startDate);
            else return range(startDate, endDate);
        };
    });
    this.__defineGetter__('recent', function() {
        var plug = range(new Date(Util.now.toDateString()), Util.now);
        var res = function(days) {
            var n = Util.now;
            return range(new Date(n.getTime() - 86400000 * days), n)
        };
        res.limit = plug.limit;
        res.filter = plug.filter;
        res.each = plug.each;
        return res;
    });
};
Util.inherits(DebugLog, SimpleStore);

module.exports = new DebugLog;
