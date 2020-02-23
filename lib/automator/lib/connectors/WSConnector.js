var Util = require(__dirname + '/../../../Util.js'),
    webservice = require(__dirname + '/../../../webservice');

/*
    Each item in result array is in the form: {
        name: string,
        passed: boolean,
        message: string,
        error: object, // if any
        start: number,
        finish: number,
        async: boolean
    }
*/
var defaultOnOperationFinish = function(stepsResultArray) {
};
/*
    Validate step and return stringified result
    Result should look like '{ "prop": "value" }'
    Step definition: {
        name: string,
        method: string,
        request: object or function() => object, 
        judgeSuccess: function(response) => boolean,
        next: string or function() => string, // Use this to implement loop, default to next step
        async: boolean
    }
*/
var validateStep = function(step) {

}
var validateOperation = function(content) {    
    if(!content) return { valid: false, 
        content: 'throw new Error("Empty operation body.");' 
    } ;
    try {
        var ctx =  Util.vm.createContext({ 
            '_$Util': Util,
            '_$validateStep': validateStep,
            content: null
        }) ;
        content = 'var declareOperation = ' +
            (function(steps, onOperFin) {
                onOperFin = (typeof onOperFin == 'function' && onOperFin) || function() { };
                var content ='var _$steps = [';
                _$Util.arrayEach(steps, function(step, i) { content += _$validateStep(step[key]) + ',\n'; });
                content +=  '];\nvar _$onOperationFinish = ' + onOperFin.toString() + ';\n';
            }).toString() + ';\n' + content;
        Util.vm.runInContext(content, ctx);
        if(!ctx.content) throw new Error('Invalid operation.');
        return { 
            valid: true, 
            type: exports.type,
            content: ctx.content
        } ;
    } catch(err) { return { 
        valid: false, 
        content: err.message
    } ; }
}

var translateStatus = function(resObj, status) {
    if((!status) || (!resObj)) return; // This should not happen.
    if(!resObj.logs) resObj.logs = [];
    resObj.logs.push(status.content);
}

var WSConnector =  function(target) {
    Util.EventEmitter.call(this);  
    if((!target) || (typeof target !== 'string')) return null;
    this.__defineGetter__('target', function(){ return Util.shallow(target); });
}
Util.inherits(WSConnector, Util.EventEmitter);

WSConnector.prototype.runOperation = function(
    operationStr, param, caseGlobal, suiteGlobal, sync) {  
    var self_ = this,
        ctx = { };
    if(!sync) { setImmediate(function() {
        self_.runOperation(operationStr, param, caseGlobal, suiteGlobal, true);
    }); return; }
    if(!(caseGlobal instanceof Util.Storer) || !(suiteGlobal instanceof Util.Storer))
        throw new Error('Wrong typeof global object. `Storer\' expected.');
    this.emit('ready');
    ctx.CASE = caseGlobal;
    ctx.SUITE = suiteGlobal;
    ctx.passed = false;
    ctx.message = 'Operation not run yet.';
    ctx._$WS = webservice;
    ctx._$Util = Util;
    ctx._$target = this.target;
    ctx._$param = param;
    ctx._$end = function() {
        self_.emit('end', ctx.passed, ctx.message);
    };
    ctx = Util.Contextify(ctx);
    try {
        ctx.run(operationStr);
        ctx.run('(' + (function() {

        }).toString() + ')()');
    } catch(err) {
        this.emit('end', false, err.message);
    }
}

//TODO: Implement this.
var renderResult = function(resObj) { return new Util.Element('div'); }

exports.Connector = WSConnector;
exports.renderResult = renderResult;
exports.translateStatus = translateStatus;
exports.validateOperation = validateOperation;
exports.__defineGetter__('type', function(){ return 'ws'; });
exports.validataType = function(type) {
    if(typeof type !== 'string') return false;
    if(type.match(/^[Ww][Ss]$/)) return true;
    else return false;
};