var Util = require(__dirname + '/../../Util.js');

var connectors = new Util.ConnectorSelector(__dirname + '/connectors');

var Expects = function(suiteGlobal, caseGlobal) {
    if(!caseGlobal)
        caseGlobal = new Util.Storer;
    if(!(caseGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof case global object. `Storer\' expected.'
        );
    if(!(suiteGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof suite global object. `Storer\' expected.'
        );
    require('events').EventEmitter.call(this);
    var definedOperations = {},
        /*definedOperations[name] = { 
            valid: boolean, 
            type: string,
            content: string
        };*/
        caseOnSuccessOperations = [],
        caseOnFailureOperations = [],
        caseOperations = [];
        /*caseOperations.push({ 
            name: string,
            type: string,
            target: array[object],
            context: object
        });*/
    this.__defineGetter__('connectors', function() { return connectors ; });
    this.__defineGetter__('definedOperations', function() { 
        return definedOperations ;
    });
    this.__defineGetter__('caseOperations', function() { 
        return caseOperations ;
    });
    this.__defineGetter__('caseOnSuccessOperations', function() { 
        return caseOnSuccessOperations ;
    });
    this.__defineGetter__('caseOnFailureOperations', function() { 
        return caseOnFailureOperations ;
    });
    this.__defineGetter__('caseGlobal', function() { return caseGlobal ; });
    this.__defineGetter__('suiteGlobal', function() { return suiteGlobal ;});
    if(!Util.isSlave) {
        var _operationResults = [];
        /*_operationResults.push({ 
            operation: string[uuid],
            passed: boolean,
            messge: string
        });*/
        this.__defineGetter__('operationResults', function() { 
            return _operationResults; 
        });
        this.__defineGetter__('passed', function() { 
            return this.operationResults.reduce(function(priv, cur) {
                return { passed: (priv.passed && cur.passed) };
            }, { passed: true } ).passed;
        });
    } else {
        var _results = [];
        this.__defineGetter__('results', function() { return _results; });
        this.passed = true;
    }
    var self = this;
    this.__defineGetter__('builtinOperations', function() {
        return {
            wait: function(params, currentOperIdx) {
                Util.log('Syncing operations.\n');
                if(typeof self.__runningOperationCount === 'undefined')
                    self.__runningOperationCount = 0;
                var handle = Util.setInterval(function() {
                    if(self.__runningOperationCount !== 0) return;
                    Util.clearInterval(handle);
                    Util.log('Synced operations.\n');
                    self.runCase(currentOperIdx + 1);
                }, 100);
            }
        };
    });
    var asyncQueues = {};
    this.__defineGetter__('asyncQueues', function() { return asyncQueues; });
}

Util.inherits(Expects, Util.EventEmitter);

Expects.prototype.loadCase = function(caseContent, env, targets) {
    if((typeof caseContent !== 'string') || (!caseContent)){ 
        this.__defineGetter__('loaded', function() { return false; } );
        this.__defineGetter__('message', function() { 
            return 'Invalid case content, expected non-empty string.';
        } );
        return ;
    }
    try { Util.syntaxCheck(caseContent); }
    catch(err) { 
        this.__defineGetter__('loaded', function() { return false; } );
        this.__defineGetter__('message', function() { return err.message + '\n' + err.stack;} );
        return ;
    }
    
    var defined = this.definedOperations,
        builtin = this.builtinOperations,
        ctx = Util.Contextify({
            defined: defined,
            builtin: builtin,
            caseOpers: this.caseOperations,
            __caseOnSuccessOpers: this.caseOnSuccessOperations,
            __caseOnFailureOpers: this.caseOnFailureOperations,
            __Util: Util,
        });
    // Bring up utils function shallow and class WrapperObject
    ctx.run('var __shallow = ' + Util.shallow.toString());
    ctx.run('var $ = function(obj) { return new (' + (function(obj) {
        // Judge type of `obj'
        var type = null,
            wrapper = this;
        if(typeof obj === 'string') type = /[Ss]tring/;
        else if(typeof obj === 'number') type = /[Nn]umber/;
        else if(typeof obj === 'boolean') type = /[Bb]oolean/;
        else if(typeof obj === 'function') type = /[Ff]unction/;
        else if(obj instanceof RegExp) type = /[Rr]eg[Ee]xp/;
        else if(Array.isArray(obj)) type = /[Aa]rray/;
        else type = /[Oo]bject/;
        //__Util.log('current type is ' + type + '\n');
        __Util.getOwnProperties(defined).forEach(function(o) {
            if(((typeof defined[o].accepts) === 'string') &&
                defined[o].accepts.match(type))  {
                wrapper.__defineGetter__(o, eval(
                '(function() { return this.__getOperation("' + o + '");})'
                ));
                //__Util.log('Added operation getter for ' + o + '\n');
            }
        });      
        var asyncQueue = '';
        this.__defineGetter__('sync', function() {
            var self = this;
            return function() {
                asyncQueue = '';
                return self;
            };
        });
        this.__defineGetter__('async', function() {
            var self = this;
            return function(queue) {
                if((typeof queue === 'string') || queue)
                    asyncQueue = queue;
                else asyncQueue = '__commonasyncqueue';
                return self;
            };
        });
        this.__defineGetter__('asyncQueue',function() { return asyncQueue; });
        this.__getOperation = function(name) { return function(params) {
            if(defined.hasOwnProperty(name))
                caseOpers.push({ 
                    name: name,
                    type: defined[name].type,
                    target: __shallow(obj),
                    context: (params ? __shallow(params) : {}),
                    async: this.asyncQueue,
                    id: __Util.uuid()
                });
            else throw new Error(
                'Unknown operation `' + 
                name + '\' for target: ' +
                __Util.inspect(obj, { depth: null }) + '.'
            );
            //__Util.log(
            //    'Added ' + (this.isSync ? '' : 'a') + 
            //    'sync operation: ' + name + '\n'
            //);
            return this;
        } }
        //__Util.log('Done setup WrapperObject.\n');
    }).toString() + ')(obj); }');
    // Bring up builtin operations, these are used as standalone functions.
    Util.getOwnProperties(builtin).forEach(function(operName) {
        var execStr = 'var ' + operName + ' = function(params) {\n' +
            '    caseOpers.push({\n' +
            '        name: "' + operName + '",\n' +
            '        type: "__builtin__",\n' +
            '        context: (params ? __shallow(params) : {}),\n' +
            '        id: __Util.uuid()\n' +
            '    });\n' +
            '}\n';    
        ctx.run(execStr);    
    });
    // Bring up operations that accepts no targets.
    // These are also used as standalone functions like builtins.
    Util.getOwnProperties(defined).forEach(function(operName) {
        if(typeof defined[operName].accepts === 'string') return;
        var execStr = 'var ' + operName + ' = function(params) {\n' +
            '    caseOpers.push({\n' +
            '        name: "' + operName + '",\n' +
            '        type: "' + defined[operName].type + '",\n' +
            '        context: (params ? __shallow(params) : {}),\n' +
            '        id: __Util.uuid()\n' +
            '    });\n' +
            '}\n';        
        ctx.run(execStr); 
    });
    // Setup case result hooks
    ctx.run('var CASE = { onSuccess: undefined, onFailure: undefined };');
    // Bring up server states in 'env'
    ctx.run('var ENV = ' + Util.inspect(env, { depth: null }) + ';');
    ctx.run('var STATES = ENV; var STA = ENV; var STAT = ENV;');
    try { 
        // Bring up defined targets
        if(targets) {
            Util.getOwnProperties(targets).forEach(function(target) {
                if(Array.isArray(targets[target])) {
                    ctx.run('var ' + target + ' = [];');
                    targets[target].forEach(function(t) {
			 ctx.run(target + '.push($(' + Util.inspect(t, { depth: null }) + '));');
                    });
		Util.log("target1 is " + target + "\n");
                } else {ctx.run(
                    'var ' + target + ' = $(' + 
                    Util.inspect(targets[target], { depth: null }) + ');'
                );
		Util.log("target2 is " + target+ " \n");
	      }
            });
            // Use only defined targets, do not aollow custom targets in case.
            ctx.run('delete $;');
        }
        ctx.run(caseContent);
	ctx.run('if(typeof CASE.onSuccess === "function") { caseOpers = __caseOnSuccessOpers; CASE.onSuccess(); }');
	ctx.run('if(typeof CASE.onFailure === "function") { caseOpers = __caseOnFailureOpers; CASE.onFailure(); }');
    } catch(err) { 
        this.__defineGetter__('loaded', function() { return false; } );
        this.__defineGetter__('message', function() { return err.message + '\n' + err.stack; } );
        return ;
    }
    if(this.caseOperations.length <= 0) {
        this.__defineGetter__('loaded', function() { return false ; } );
        this.__defineGetter__('message', function() { 
            return 'No operations loaded by case.'; 
        } );
    } else this.__defineGetter__('loaded', function() { return true ; } );
};

// Validates syntax and saves operation
Expects.prototype.discoverOperations = function(dir) {
    if(!Util.isDir(dir)) return;
    var _self = this;
    this.connectors.types.forEach(function(type) {
        // We expect a `type' sub directory to contain all `type' operations
        var operationsDir = Util.resolve(dir, type);
        if(Util.isDir(operationsDir)) {
            var operationFiles = Util.lsDir(operationsDir);
            for(var i = 0 ; i < operationFiles.length ; i ++) {
                var operationFile = operationFiles[i];
                if(operationFile.match(/.*\.operation$/)) {
                    var res = _self.loadOperation(
                        type, 
                        Util.basename(operationFile)
                            .replace(/.operation$/,''), 
                        Util.readFileSync(
                            Util.resolve(operationsDir, operationFile),
                            'ascii'
                        )
                    );
                    if(!res.loaded) {
                        Util.log(
                            'Warnning : Cannot load `' + 
                            type + '\' operation: `' + 
                            operationFile + '\'\n'
                        );
                        Util.log(
                            '    Error: ' + res.message + '\n'
                        );
                    }
                }
            }
        }
    });    
}

// Validates syntax and saves operation
Expects.prototype.loadOperation = function(type, name, content) {
    try { Util.syntaxCheck(content); }
    catch(err) { return { loaded: false, message: err.message } ; }
    var connector = this.connectors.get(type);
    if(!connector) return {
        loaded: false,
        message: 'No connector of type `' + type + '\' is defined.'
    };
    var result = connector.validateOperation(content);
    if(result.valid) {
        delete result.valid;
        result.type = type;
        this.definedOperations[name] = result;
        return { loaded: true } ;
    } else return {
        loaded: false,
        message: 'Failed to validate this ' + type + 
                 ' operation. Error: ' +  result.content
    } ;
}

Expects.prototype.waitAsyncOpers = function(cb) {
    var _self = this;
    if(this.__runningOperationCount) {
        Util.log('Syncing ' + this.__runningOperationCount + ' operations.\n');
        var handle = Util.setInterval(function() {
            if(_self.__runningOperationCount !== 0) return;
            Util.clearInterval(handle);
            Util.log('Synced operations.\n');
            cb();
        }, 100);
    } else Util.later(cb, 100);
};
Expects.prototype.runOper = function (oper, operIdx) {
    var _self = this;
    if(oper.type === '__builtin__') {
        this.builtinOperations[oper.name](
            oper.context,
            operIdx
        );
        return;
    }

    if(!Util.isSlave) {
        var operationResult = { };
        Util.extend(operationResult).from(oper);
        delete operationResult.context;
        delete operationResult.accepts;
        this.operationResults.push(operationResult);
    }
    oper.content = this.definedOperations[oper.name].content;
    Util.log(
        'Operation[' + oper.type + ']: ' +  
        oper.name + '\n'
    );
    try {
        var connector = this.connectors.get(oper.type),
            conn = new (connector.Connector)(oper.target);
    } catch(err) {
        throw new Error(
            'Invalid operation type(`' + 
            oper.type + '\') or target: ' +
            Util.inspect(oper.target) + '\n'
        );
    }
	// On target ready to run operation
    conn.on('ready', function() { 
        if(Util.isSlave) {
            _self.emit('status', { 
                type: 'operationStarted', 
                name: oper.name,
                operation: oper.id,
                operationType: oper.type,
                target: oper.target
            });
            return;
        }
        else Util.log('  operation running.\n');
    });        
    conn.on('status', function(status) {
        if(Util.isSlave) {
            status.operation = oper.id;
            if(status.type) status.subType = status.type;
            status.type = 'operationUpdate';
            _self.emit('status', status);
            return;
        }
        try {
            connector.translateStatus(
                operationResult, 
                status
            );
        } catch(err) {
            Util.log(
                'WARNNING: Failed to translate status: ' + 
                Util.inspect(status, { depth: null }) + '\n' +
                '  Error : ' + err.message + '\n' +
                err.stack + '\n'
            );
        }
    });
    // On target ends executing operation
    conn.on('end', function(passed, message) { 
        if(Util.isSlave) {
            _self.emit('status',  {
                type: 'operationFinished', 
                operation: oper.id,
                passed: passed,
                message: message,
            });
            _self.passed = _self.passed && passed;
            //_self.messages.push(message); 
        } else {            
            if((operIdx >= this.caseOperations.length) && (!passed)) {
                operationResult.passed = true;
                operationResult.message = "Ignored failures in after-case hooks. \n" + message; 
            } else {
                operationResult.passed = passed;
                operationResult.message = message; 
            }
            Util.log(message.split('\n').map(function(i){
                if(i.trim()) return '    ' + i.trim();
                else return '';
            }).join('\n'));    
            Util.log(
                '  operation ' +
                (passed ? 'passed' : 'failed') + '\n'
            );  
        }
        _self.__runningOperationCount -= 1;
        if(oper.async) {
            _self.asyncQueues[oper.async].running = false;
            if(passed) {
                var nextOper = _self.asyncQueues[oper.async].operations[_self.asyncQueues[oper.async].operations.indexOf(oper) + 1];
                if(nextOper) _self.runOper(nextOper, -1);
            }
        } else {
            if(passed) _self.runCase(operIdx + 1);
            else {
                Util.log("Ending case for failed operation.\n");
                _self.waitAsyncOpers(function() { _self.emit('end'); });                    
            }
        }
    });
    if(oper.async) { // async operation
        if(!_self.asyncQueues[oper.async])
            _self.asyncQueues[oper.async] = { operations: [], running: false };
        if(_self.asyncQueues[oper.async].operations.indexOf(oper) >= 0) {
            _self.asyncQueues[oper.async].running = true;
            _self.__runningOperationCount += 1;
            conn.runOperation(
                oper.content,
                oper.context, 
                _self.caseGlobal, 
                _self.suiteGlobal
            );
        } else { // queuing the oper
            _self.asyncQueues[oper.async].operations.push(oper);
            if(!_self.asyncQueues[oper.async].running) {
                _self.asyncQueues[oper.async].running = true;
                _self.__runningOperationCount += 1;
                conn.runOperation(
                    oper.content,
                    oper.context, 
                    _self.caseGlobal, 
                    _self.suiteGlobal
                );
            }
            _self.runCase(operIdx + 1);
        }            
    } else { // sync operation            
        _self.__runningOperationCount += 1;
        conn.runOperation(
            oper.content,
            oper.context, 
            _self.caseGlobal, 
            _self.suiteGlobal
        );
    }
};
//run_ctx => runCase
Expects.prototype.runCase = function(operationIndex) {
    var _self = this;
    if(!operationIndex) operationIndex = 0;
    if(typeof operationIndex !== 'number')
        throw new Error('Invalid operation index, should be a `number\'.');
    
    if(operationIndex == 0) {
        this.__runningOperationCount = 0;
        if(Util.isSlave) this.emit('status', { 
            type: 'caseStarted',
            caseInformation: this.caseOperations.concat(this.caseOnSuccessOperations).concat(this.caseOnFailureOperations)
        });
    } 
    if(operationIndex >= this.caseOperations.length) {
        this.waitAsyncOpers(function() {
            var afterCaseOperations;
            if(_self.passed) afterCaseOperations = _self.caseOnSuccessOperations;
            else afterCaseOperations = _self.caseOnFailureOperations;
            if(operationIndex >= (_self.caseOperations.length + afterCaseOperations.length)) _self.waitAsyncOpers(function() { _self.emit('end'); });		
	        else _self.runOper(afterCaseOperations[operationIndex - _self.caseOperations.length], operationIndex);
        });	   
    } else this.runOper(this.caseOperations[operationIndex], operationIndex);
}

module.exports = Expects;
