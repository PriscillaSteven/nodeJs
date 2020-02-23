var Util = require(__dirname + '/../../../Util.js');

var SSHConnectionRetry = 5;

var validateTarget = function(target) {
    if(!target) return null;
    if( target.hasOwnProperty('maxSessions') && 
       (typeof target.maxSessions !== 'number') )
       return null;
    if(!target.hasOwnProperty('maxSessions'))
        target.maxSessions = 10;
    if(!target.hasOwnProperty('host') || 
       !target.hasOwnProperty('password'))
        return null;
    if((typeof target.host !== 'string') || 
       (typeof target.password !== 'string'))
       return null;
    return target;
}

var newSSHConnection = function(connector, sync) {
    if(!sync) {
        setImmediate(function() {
            // We absolutely want it to be sync next time
            newSSHConnection(connector, true);
        }) ;
        return;
    }
    var conn = new Util.SSHTarget,//new (require('ssh2')),
        target = connector.target;
    conn.target = target;
    target.port = target.port || 22;
    target.username = target.username || 'root';
    target._connected = false;
    // target.debug = function(s) { Util.log(s + "\n"); };
    if(!target._retryCount) target._retryCount = 0;
    conn.on('connect', function() { 
        //Util.log('  ' + target.host + ': connnect\n');
    });
    conn.on('end', function() { 
        //Util.log('  ' + target.host + ': end\n');
    });
    conn.on('close', function(hadError) {        
        if((!target._connected) && (!hadError)) {
            if(target._retryCount < SSHConnectionRetry) {
                target._retryCount += 1;
                Util.log('  ' + target.host + 
                         ': Unexpected disconnect, retrying: ' + 
                         target._retryCount + '\n');
                newSSHConnection(connector, target);
            } else connector.emit('_end', conn._err || new 
                Error('Cannot connect to target.') );
        } else connector.emit(
            '_end', conn._err ||
            ( hadError ? 
            ( new Error(
                target.host +
                ': Connection closed with unknown error.'
            )) : null));
    });
    conn.on('error', function(err) {  
        //Util.log('  ' + target.host + ': errored\n');
        conn._err = err;
    });
    conn.on('ready', function () {
        //Util.log('  ' + target.host + ': ready\n');
        target._connected = true;        
        conn._keepAlive = 0;
        conn.safeEnd = (function(onConnRealEnd) {
            var _connSelf = this;
            if(_connSelf._keepAlive <= 0) {
                if(_connSelf._sock) {
                   _connSelf.end();
                   if(typeof onConnRealEnd == 'function')
                       onConnRealEnd(_connSelf);
                }
            } else setTimeout(function() {
                _connSelf.safeEnd(onConnRealEnd);
            }, 100);
        }).bind(conn);
        connector.emit('_ready', conn);
    });
    conn.connect(target);
}

var defaultOnOperationFinish = function(allSteps) {
    message = '';
    passed = true;
    if(!Array.isArray(allSteps)) {
        passed = false;
        message = 'The steps result is empty, unexpected error.\n';
        return;
    }
    for(var i = 0 ; i < allSteps.length ; i ++) {
        if(allSteps[i].error) {
            message += 'Step `' + 
                       ( allSteps[i].name ?
                         allSteps[i].name :
                         allSteps[i].cmdStr ) + 
                       '\' errored: ' + 
                       allSteps[i].error + '\n';
        } else if((!allSteps[i].passed) && allSteps[i].isCritical) {
            message += 'Critical step `' + 
                       ( allSteps[i].name ?
                         allSteps[i].name :
                         allSteps[i].cmdStr ) + 
                       '\' failed.\n';
            passed = false;
        } else if ((!allSteps[i].passed) && (!allSteps[i].isCritical)) {
            if(allSteps[i].async) {
                message += 'Async step `' + 
                           ( allSteps[i].name ? 
                             allSteps[i].name : 
                             allSteps[i].cmdStr ) + 
                           '\' failed.\n';
                passed = false;
            } else message += 'Step `' + 
                              ( allSteps[i].name ?
                                allSteps[i].name :
                                allSteps[i].cmdStr ) +
                              '\' failed but not critical.\n';
        }
    }
    if(passed) message += 'All steps in the opertion passed.\n';
}

var _validateSteps = function(steps) {
    if(!Array.isArray(steps))
        throw new Error('Expects should be an `array\'.');
    var namedSteps = { };
    steps.__defineGetter__('namedSteps', function() { return namedSteps; });
    steps.forEach(function(step, i) { 
        eval('steps[' + i.toString() + '].__defineGetter__("index", ' + 
             'function(){ return ' + i.toString() + ' ; }) ;');
        var name = step.name,
            cmd = step.cmd,
            timeout = step.timeout,
            async = step.async,
            critical = step.critical,
            judgeSuccess = step.judgeSuccess,
            expect = step.expect,
            monitor = step.monitor,
            next = step.next,
            ptyHeight = step.ptyHeight,
            ptyWidth = step.ptyWidth;
            
        if(!name) step.__defineGetter__('name', function() { return null; });
        else if(typeof name === 'string')
            step.__defineGetter__('name', function() { return name; });
        else throw new 
            Error('Step\'s `name\' should be a `string\'.');
        if(name) {
            if (steps.namedSteps[name]) throw new
                Error('Multiple steps with the same name(`' + name + '\') found.');
            else steps.namedSteps[name] = step;
        }
        
        if(!timeout) timeout = 600;
        if(typeof timeout === 'number' )
            step.__defineGetter__('timeout', function() { return timeout; });
        else if(typeof timeout === 'function' )
            step.__defineGetter__('timeout', function() { return timeout(); });
        else throw new 
            Error('Step\'s `timeout\' should be a `number\'.');
        
        if(typeof cmd === 'string')
            step.__defineGetter__('cmd', function() { return cmd; });
        else if (typeof cmd === 'function')
            step.__defineGetter__('cmd', function() { return cmd(); });
        else throw new
            Error('Step\'s `cmd\' should be a `string\' or `function\'.');

        if(typeof async === 'undefined') async = false;
        if(typeof async === 'boolean')
            step.__defineGetter__('async', function() { return async; });
        else if (typeof async === 'function')
            step.__defineGetter__('async', function() { return async(); });
        else throw new
            Error('Step\'s `async\' should be a `boolean\'.');
        
        if(typeof critical === 'undefined') critical = true;
        if(typeof critical === 'boolean')
            step.__defineGetter__('critical', function() { return critical; });
        else if (typeof critical === 'function')
            step.__defineGetter__('critical', function() { return critical(); });
        else throw new
            Error('Step\'s `critical\' should be a `boolean\'.');  
            
        if(!judgeSuccess) judgeSuccess = function(exitStatus) {
            return (exitStatus === 0);
        };
        if(typeof judgeSuccess === 'function')
            step.__defineGetter__('judgeSuccess', function() { return judgeSuccess; });
        else throw new 
            Error('Step\'s `judgeSuccess\' should be a `function\'.'); 
        
        if(!expect) expect = function() { }
        if(typeof expect === 'function')
            step.__defineGetter__('expect', function() { return expect; });
        else throw new 
            Error('Step\'s `expect\' should be a `function\'.'); 
            
        if(!monitor) monitor = function() { }
        if(typeof monitor === 'function')
            step.__defineGetter__('monitor', function() { return monitor; });
        else throw new 
            Error('Step\'s `monitor\' should be a `function\'.'); 
        
        if(!next) next = function() { return (this.index + 1); } ;
        if(typeof next !== 'function' &&
            typeof next !== 'number' &&
            typeof next !== 'string') throw new 
            Error('Step\'s `next\' should be a `function\', `number\' or `string\'.'); 
        step.__defineGetter__('next', function() {
            try {
                var nextStep = null;
                if(typeof next === 'function') nextStep = next.call(step);
                else nextStep = next;
                if(typeof nextStep === 'number') return nextStep;
                else if(typeof nextStep === 'string') {
                    if(steps.namedSteps[nextStep]) 
                        return steps.namedSteps[nextStep].index;
                    else throw new Error('No step named `' + nextStep + '\'');
                } else throw new Error('Invalid next step specification.');
            } catch(err) { 
                __Util.log(__Util.inspect(err) + '\n');
                return -1; 
            }
        });
        
        if(!ptyHeight) ptyHeight = 0;
        if(typeof ptyHeight === 'number' )
            step.__defineGetter__('ptyHeight', function() { return ptyHeight; });
        else if(typeof ptyHeight === 'function' )
            step.__defineGetter__('ptyHeight', function() { return ptyHeight(); });
        else throw new 
            Error('Step\'s `ptyHeight\' should be a `number\' or `function\'.');
        
        if(!ptyWidth) ptyWidth = 0;
        if(typeof ptyWidth === 'number' )
            step.__defineGetter__('ptyWidth', function() { return ptyWidth; });
        else if(typeof ptyWidth === 'function' )
            step.__defineGetter__('ptyWidth', function() { return ptyWidth(); });
        else throw new 
            Error('Step\'s `ptyWidth\' should be a `number\' or `function\'.');
    });
}

var declarer = function(steps, onOperationFinish) {
    onOperationFinish = 
        (typeof onOperationFinish == 'function' && onOperationFinish) || 
            defaultOnOperationFinish;
    var steps_str = [];
    for(var i = 0; i < steps.length; i ++) {
        var step = steps[i];
        var step_str = '{'
        for(var key in step) if(step.hasOwnProperty(key)) {
            step_str += '\n    ' + key + ': ';
            if(typeof step[key] == 'function') 
                step_str += step[key].toString();
            else step_str += require('util').inspect(
                    step[key], 
                    { depth: null }
                );
            step_str += ',';
        }
        step_str += '\n},';
        steps_str.push(step_str);
    }
    var result = '[';
    for(var i = 0; i < steps_str.length; i ++) {
        var step_str = steps_str[i];
        result += '\n' + step_str;
    }
    result += '\n]';
    content =  'var _steps = ' + result +
               ';\nvar _onOperationFinish = ' + 
               onOperationFinish.toString() + 
               ';\n';
}

var _runStep = function(stepNumber, sync) {
    if(!sync) {
        __Util.later(function() {
            // We absolutely want it to be sync next time
            _runStep(stepNumber, true);
        }) ;
        return;
    }
    if(stepNumber >= _steps.length) { _connEnd(); return; }
    else if (stepNumber < 0) { 
        _connEnd(new Error('Failed to determine the next step.'));
        return;
    } else if(stepNumber == 0) { /*Start up initialization*/ } 
    if((typeof _conn.target.maxSessions == 'number') && 
       (_conn._keepAlive >= (_conn.target.maxSessions - 2))) {
        __Util.later(function() { 
            _runStep(stepNumber); 
        }, 100);
        return;
    }
    var step = _steps[stepNumber],
        cmd = step.cmd,
        async = step.async;
        critical = step.critical,
        _stepOutput = "";
    if(!cmd) { _runStep(step.next); return; }
    __Util.log(
        '    step ' + stepNumber + ': ' + 
        (step.name ? step.name : cmd) + '  [' + 
        (critical ? 'critical ' : '') + 
        (async ? 'a' : '') +
        'sync]\n'
    );
    _conn.exec(cmd, { 
        env: {
            OUTPUT: _lastStepOutput
        },
        pty: { 
            rows: step.ptyHeight || 40,
            cols: step.ptyWidth || 80
        }
    }, function(err, stream) {
        if(err) {
            var timestamp = (new Date()).toJSON(),
                status = {    
                rawBuffer: 'SSH failed for `' + 
                    (step.name || cmd) + '\'' +
                    err.message + '\n' + err.stack,
                name: step.name || cmd,
                cmdStr: cmd,
                isCritical: critical,
                isAsync: _conn.currentAsync,
                passed: false,
                startTimestamp: timestamp,
                finishTimestamp: timestamp,
                error: err,
            };
            _stepsLog.push(status);
            __updateStatus({ 
                type: 'stepErrored',
                error: err.message,
                name: status.name,
                cmdStr: status.cmdStr, 
                isCritical: status.isCritical,
                isAsync: status.isAsync,
                passed: status.passed,
                step: __Util.uuid(),
                finishTimestamp: status.finishTimestamp
            });
            if(critical) _connEnd(
                new Error('Can not run step `' + status.name + '\'.')
            );
            else _runStep(step.next);
            return;
        }
        //__Util.log(__Util.inspect(stream, { depth: null }));
        var stepUUID = __Util.uuid(),
            lineBuffer = '',
            finished = false,
            preProcessData = function(content) { 
                log.rawBuffer = __Util.Buffer.concat([
                    log.rawBuffer,
                    content
                ]);     
                __updateStatus({           
                    type: 'stepUpdateOuput',
                    step: stepUUID,
                    newData: new __Util.Buffer(content)
                });
                try { return content.toString('utf8'); }
                catch(err) { 
                    __Util.log('Error decoding buffer, maybe binary.\n');
                    __Util.log('Detail: ' + err.message + '\n');
                    __Util.log(err.stack + '\n');
                    return ''; 
                }
            },
            timeoutHandler = __Util.later(function() { 
                if(!finished) {
                    finished = true; 
                    __updateStatus({           
                        type: 'stepUpdateOuput',
                        step: stepUUID,
                        newData: new __Util.Buffer(
                            'Timeout reached: ' + step.timeout
                        )
                    });
                    __Util.log('Killing connection due to timeout.\n');
                    stream.end(); 
                }
            }, step.timeout*1000),
            safeWrite = function(data) {
                if (finished) return;
                else if(typeof data == 'string'){ stream.write(data); }
            };
        var log = {
            rawBuffer: new __Util.Buffer(0),
            target: _conn.target.host,
            name: step.name || cmd,
            cmdStr: cmd,
            isCritical: critical,
            isAsync: _conn.currentAsync,
            passed: false,
            startTimestamp: (new Date()).toJSON()
        };
        _stepsLog.push(log);
        __updateStatus({
            type: 'stepStarted',
            name: log.name,
            cmdStr: log.cmdStr,
            isCritical: log.isCritical,
            isAsync: log.isAsync,
            startTimestamp: log.startTimestamp,
            step: stepUUID
        });
        stream.on('data', function(content, type) {
            content = preProcessData(content);
            if(!content) return;
            _stepOutput = _stepOutput + content;
            _stepOutput = _stepOutput.replace(/[\r\n]/g, ' ').replace(/ +/g, ' ');
            var response = '';
            //monitors have more priority over steps
            try { response = step.monitor(content); }
            catch(err) { 
                log.error = err.message;
                stream.end();
            }
            if(response) safeWrite(response);
            lineBuffer += content;
            lines = lineBuffer.split('\n');
            for(var i = 0; i < lines.length ; i++) {
                if(i == (lines.length - 1)) {
                    if(lines[i]) lineBuffer = lines[i];
                    else lineBuffer = '';
                    continue;
                } 
                line = lines[i] + '\n';
                response = null;
                try { response = step.expect(line); }
                catch(err) { 
                    log.error = err.message;
                    stream.end();
                }
                if(response) safeWrite(response + '');
            }
            
        });
        stream.on('close', function() {
            _lastStepOutput = _stepOutput;
            _conn._keepAlive -= 1;
            if(step.judgeSuccess(log.signal || log.exitCode)) {
                if(!log.error) log.passed = true;
                if(!async) _runStep(step.next);
            } else {
                if(critical) _connEnd();
                else if(!async) _runStep(step.next);
            }
            __updateStatus({
                type: 'stepFinished',
                passed: (log.error ? false : log.passed),
                exitCode: log.exitCode,
                signal: log.signal,
                hasCoreDump: log.hasCoreDump,
                finishTimestamp: log.finishTimestamp,
                step: stepUUID,
                error: log.error
            });
        });
        stream.on('exit', function(exitCode, signal, didCoreDump) {
            __Util.clearTimeout(timeoutHandler);
            finished = true;
            log.finishTimestamp = (new Date()).toJSON();
            log.exitCode = exitCode;
            log.signal = signal;
            log.hasCoreDump = didCoreDump;
        });
        _conn._keepAlive += 1;
        if(async) _runStep(step.next);    
    });
};

var SSHConnector = function(target) {
    Util.EventEmitter.call(this);  
    var _target = validateTarget(target);
    if(!_target) return null;
    this.__defineGetter__('target', function(){ return _target; });
}

Util.inherits(SSHConnector, Util.EventEmitter);

SSHConnector.prototype.runOperation = function(
    operationStr, context, caseGlobal, suiteGlobal ) {    
    var _connector = this;
    if(!(caseGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof case global object. `Storer\' expected.'
        );
    if( !(suiteGlobal instanceof Util.Storer))
        throw new Error(
            'Wrong typeof suite global object. `Storer\' expected.'
        );
    if(typeof context !== 'object') context = { };
    this.on('_ready', function(conn) {
        _connector.emit('ready'); 
        Util.log('    target is: ' + _connector.target.host + '\n');
        context.__defineGetter__('target', function() { 
            return _connector.target.host;
        });
        context.__defineGetter__('CASE', function() { return caseGlobal; });
        context.__defineGetter__('SUITE', function() { return suiteGlobal; });
        context.__defineGetter__('_conn', function() { return conn; });
        context.__defineGetter__('__Util', function() { return Util; });
        context.__defineGetter__('__updateStatus', function() {
            return function(status) { _connector.emit('status', status) };
        });   
        Util.Contextify(context).run(
            'var _stepsLog = [];\n' +
            'var _lastStepOutput = "";\n' +
            'var _runStep = ' +
            _runStep.toString() + ';\n' +
            'var __validateSteps = ' +
            _validateSteps.toString() + ';\n' +
            operationStr + '\n' +
            'var _connEnd = function(error) {\n' +
            '    _conn.safeEnd(function(){\n' +
            '        passed = false;\n' +
            '        message = null;\n' + 
            '        try { _onOperationFinish(_stepsLog); }\n' +
            '        catch(err) {\n' +
            '            passed = false;\n' +
            '            message = err.message + "\\n" +\n' + 
            '                      err.stack + "\\n";\n' +
            '        }\n' +
            '        if(!message)\n' + 
            '            message = "No detailed message.\\n"\n' +
            '        if(error) {\n' + 
            '            passed = false;\n' +
            '            message += error.message + "\\n"\n' +
          //'                       + error.stack + "\\n";\n' +
            '        }\n' +
            '    });\n' +
            '};\n' +
            '__validateSteps(_steps);\n' +
            '_runStep(0);'
        );
    });
    this.on('_end', function(err) {
        if(err) _connector.emit(
            'end', 
            false,
            'Connection failed: ' + err.message
        ); else _connector.emit(
            'end', 
            context.passed,
            context.message
        );
    });
    newSSHConnection(this);
}

var validateOperation = function(content) {    
    if(!content) return { 
        valid: false, 
        content: 'Empty operation body.' 
    } ;
    try {
        var ctx =  Util.vm.createContext({ 
            content: null,
            require: require
        }) ;
        content = 'var defaultOnOperationFinish = ' + 
                  defaultOnOperationFinish.toString() + '\n' + 
                  'var declareOperation = ' +
                  declarer.toString() + '\n' + 
                  content;
        Util.vm.runInContext(content, ctx);
        if(!ctx.content) throw new 
            Error('Invalid operation.');
        return { 
            valid: true, 
            type: exports.type,
            content: ctx.content,
            accepts: 'object'
        } ;
    } catch(err) { return { 
        valid: false, 
        content: err.message 
    } ; }
}

var translateStatus = function(resObj, status) {
    if((!status) || (!resObj))
        return; // This should not happen.
    if(!resObj.steps) 
        resObj.steps = {};
    if(!resObj.steps[status.step]) 
        resObj.steps[status.step] = { };
    var tergetObj = resObj.steps[status.step];
    if(status.type === 'stepStarted') {
        tergetObj.name = status.name;
        tergetObj.cmdStr = status.cmdStr;
        tergetObj.isAsync = status.isAsync;
        tergetObj.isCritical = status.isCritical;
        tergetObj.startTimestamp = status.startTimestamp;
    } else if (status.type === 'stepUpdateOuput') {
        if(!tergetObj.output)
            tergetObj.output = '';
        tergetObj.output += status.newData.toString('ascii');
    } else if (status.type === 'stepFinished') {
        tergetObj.error = status.error;
        tergetObj.passed = status.passed;
        tergetObj.signal = status.signal;
        tergetObj.exitCode = status.exitCode;
        tergetObj.hasCoreDump = status.hasCoreDump;
        tergetObj.finishTimestamp = status.finishTimestamp;
    } else if (status.type === 'stepErrored') {
        tergetObj.name = status.name;
        tergetObj.error = status.error;
        tergetObj.cmdStr = status.cmdStr;
        tergetObj.passed = status.passed;
        tergetObj.isAsync = status.isAsync;
        tergetObj.isCritical = status.isCritical;
        tergetObj.finishTimestamp = status.finishTimestamp;
    } else return; // This should not happen either.
}

//TODO: Implement this.
var renderResult = function(resObj) { return new Util.Element('div'); }

exports.Connector = SSHConnector;
exports.renderResult = renderResult;
exports.translateStatus = translateStatus;
exports.validateOperation = validateOperation;
exports.__defineGetter__('type', function(){ return 'ssh'; });
exports.validataType = function(type) {
    if(typeof type !== 'string') return false;
    if(type.match(/^[Ss]{2}[Hh]$/)) return true;
    else return false;
}
