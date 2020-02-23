var Util = require(__dirname+ '/../../../Util.js')

var declarer = function(on, func) {
    if(typeof on === 'string' && typeof func === 'function') {
        if(func.length !== 2 && func.length !== 3) throw new 
            Error(
                'When operation accepts target, it ' + 
                'should have signature like: ' + 
                'function(target, param [, onFinish]) { ... }'
            );
        content = func.toString();
        accepts = on;
    } else if(typeof on === 'function' && typeof func === 'undefined') {
        if(on.length !== 1 && on.length !== 2) throw new 
            Error(
                'When operation accepts no target, it ' + 
                'should have signature like: ' + 
                'function(param [, onFinish]) { ... }'
            );
        content = on.toString();
    } else throw new
        Error('Invalid operation declaration.');
}

var validateOperation = function(content) {    
    if(!content) return { 
        valid: false, 
        content: 'Empty operation body.' 
    } ;
    try {
        var ctx =  Util.vm.createContext({ 
            content: null,
            accepts: null
        }) ;
        content = 'var declareOperation = ' +
                  declarer.toString() + '\n' + 
                  content;
        Util.vm.runInContext(content, ctx);
        if(!ctx.content) throw new 
            Error('Invalid operation.');
        return { 
            valid: true, 
            type: exports.type,
            content: ctx.content,
            accepts: ctx.accepts
        } ;
    } catch(err) { return { 
        valid: false, 
        content: err.message
    } ; }
}

var renderResult = function(resObj) {
    //TODO: Implement this.
    var result = new Util.Element('div');
    return result;
}
var translateStatus = function(resObj, status) {
    if((!status) || (!resObj))
        return; // This should not happen.
    if(!resObj.logs) 
        resObj.logs = [];
    resObj.logs.push(status.content);
}

var UtilConnector =  function(target) {
    Util.EventEmitter.call(this);
    if(target) this.__defineGetter__(
        'target', 
        function(){ return Util.shallow(target); }
    );
}
Util.inherits(UtilConnector, Util.EventEmitter);

UtilConnector.prototype.runOperation = function(
    operationStr, param, caseGlobal, suiteGlobal, sync) {  
    var self_ = this,
        ctx = {};
    if(!sync) { 
        Util.later(function() { self_.runOperation(operationStr, param, caseGlobal, suiteGlobal, true); });        
        return; 
    }
    if(!(caseGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof case global object. `Storer\' expected.'
        );
    if( !(suiteGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof suite global object. `Storer\' expected.'
        );
    this.emit('ready');
    ctx.CASE = caseGlobal;
    ctx.SUITE = suiteGlobal;
    ctx.passed = false;
    ctx.message = '';
    ctx.Util = Util;
    ctx.__target = this.target;
    ctx.__param = param;
    ctx.update = function(status) { 
        if(typeof status === 'string') {
            status.split(/[\r\n]+/).forEach(function(s) {
                if(!s) return;
                Util.log('    ' + s + '\n');
                self_.emit('status', { content: s });
            });
        } else Util.log(
            'WARNNING: Dropping invalid status, should be `string\'.'
        );
    };
    ctx.__end = function() {
        self_.emit('end', ctx.passed, ctx.message);
    };
    ctx = Util.Contextify(ctx);
    try {
        ctx.run('var __operFunc = ' + operationStr);
        ctx.run('(' + (function() {
            if(__target) {
                if(__operFunc.length === 2) {
                    try { __operFunc(__target, __param); }
                    catch(err) { 
                        passed = false;
                        message = err.message;
                    }
                    __end();
                } else if(__operFunc.length === 3) 
                    __operFunc(__target, __param, __end);
                else throw new 
                    Error('Invalid operation function.');
            } else {
                if(__operFunc.length === 1) {
                    try { __operFunc(__param); }
                    catch(err) { 
                        passed = false;
                        message = err.message;
                    }
                    __end();
                } else if(__operFunc.length === 2)
                    __operFunc(__param, __end);
                else throw new 
                    Error('Invalid operation function.');
            }
        }).toString() + ')()');
    } catch(err) {
        this.emit('end', false, err.stack);
    }
}

exports.Connector = UtilConnector;
exports.renderResult = renderResult;
exports.translateStatus = translateStatus;
exports.validateOperation = validateOperation;
exports.__defineGetter__('type', function(){ return 'util'; });
exports.validataType = function(type) {
    if(typeof type !== 'string') return false;
    if(type.match(/^[Uu][Tt][Ii][Ll]$/)) return true;
    else return false;
};
