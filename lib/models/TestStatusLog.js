var Util = require(__dirname + '/../Util.js'),
    SimpleStore = require(__dirname + '/lib/SimpleStore.js');

var TestStatusLog = function() {
    SimpleStore.call(this, __dirname + '/../../datastore/TestStatusLogs');
    var add = this.add, from = this.from, to = this.to, range = this.range,
        limit = this.limit, each = this.each, filter = this.filter;
    delete this.add;
    delete this.from;
    delete this.to;
    delete this.limit;
    delete this.each;
    delete this.filter;
    delete this.range;
    this.__defineGetter__('insert', function() { return function(value, cb) {
        if(!value || typeof value !== 'object' ||
           typeof value.instance !== 'string') throw new 
            Error('Invalid data entry.');
        var toInsert = {};
        Util.getOwnProperties(value).forEach(function(prop) {
            toInsert[prop] = value[prop];
        });
        add.call(this, value, cb);
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
}
Util.inherits(TestStatusLog, SimpleStore);

module.exports = new TestStatusLog
