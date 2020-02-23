var Util = require(__dirname + '/../Util.js'),
    Expects = require(__dirname + '/lib/Expects.js');

var connectors = new Util.ConnectorSelector(__dirname + '/lib/connectors');

if(require.main === module) {
    var Standalone = require(__dirname + '/lib/Standalone.js'),
        runner = new Standalone();
    runner.run(function() {        
        var caseGlobal = new Util.Storer(null, function(name, value) {
                process.send({
                    type: 'updateCaseGlobal', 
                    name: name,
                    value: value
                })
            }),
            case_ = new Expects(runner.suiteGlobal, caseGlobal);         
        process.on('message', function(msg) {
            if(msg && (msg.cmd === 'setOperation')) {
                var res = case_.loadOperation(
                    msg.type,
                    msg.name, 
                    msg.content
                );
                res.type = 'operationLoadResult';
                res.operationName = msg.name;
                res.operationType = msg.type;
                process.send(res);
            } else if(msg && (msg.cmd === 'setCaseGlobal')) 
                caseGlobal.set(msg.name, msg.value);
            else if(msg && (msg.cmd === 'setSuiteGlobal')) 
                runner.suiteGlobal.set(msg.name, msg.value);
            else if(msg && (msg.cmd === 'exit')) 
                process.exit(msg.code || 0);
            else if(msg && (msg.cmd === 'launch')) {
                if(!msg.case) {
                    process.stderr.write('Undefined case, exiting.\n');
                    process.exit(1);
                }
                case_.loadCase(msg.case, msg.env, msg.targets);
                process.send({
                    type: 'caseLoadResult',
                    loaded: case_.loaded,
                    message: case_.message
                });
                if(!case_.loaded) process.exit(1);
                case_.on('status', function(status){ process.send(status) });
                case_.on('end', function(){            
                    process.send({
                        type: 'caseFinished',
                        passed: case_.passed, 
                        results: case_.results,
                    });
                    process.exit(0); 
                });
                case_.runCase();
            } else process.send({
                type: 'unknownCommand',
                command: msg
            });
        });
    });
    return;
}

var Automator = function() {
    Util.EventEmitter.call(this);
    var _automator = this,
        stdoutBuffer = '',
        stderrBuffer = '',
        code = undefined,
        error = undefined,
        signal = undefined,
        results = null,
        passed = false,
        closed = false,
        child = require('child_process').fork(
            module.filename, [], { 
            env: { 'SLAVE_AUTOMATOR': 'true' }, 
            silent: true 
        });
    child.stdout.on('data', function(data) { stdoutBuffer += data; });
    child.stderr.on('data', function(data) { stderrBuffer += data; });
    child.on('error', function(err) { error = err; });
    child.on('close', function(_code, _signal) {
        if(stderrBuffer) Util.log("STDERR: " + stderrBuffer + "\n");
        code = _code,
        signal = _signal,
        closed = true,
        _automator.emit('message', {
            type: 'automatorDestroyed',
            stdout: stdoutBuffer,
            stderr: stderrBuffer,
            code: code,
            error: error,
            signal: signal
        });
        Util.later(function(){ _automator.emit('end'); });
    });
    child.on('message', function(msg) { 
        if(msg.type === '__debug_log') {
            Util.log(msg.content);
            return;
        } else if(msg.type === '__get_lock') {
            //Util.log("[LCKREQ] getting " + msg.key + "\n");
            Util.locks.get(msg.key, function(err, val) {
                //Util.log("[LCKREQ] got " + msg.key + "\n");
                child.send({ type: '__get_lock_reply', error: err, value: val, ts: msg.ts });            
            });
        } else if(msg.type === '__set_lock') { 
            //Util.log("[LCKREQ] setting" + msg.key + "\n");
            Util.locks.set(msg.key, msg.value, function(err) {
                //Util.log("[LCKREQ] set " + msg.key + "\n");
                child.send({ type: '__set_lock_reply', error: err, ts: msg.ts });             
            });
        } else if(msg.type === 'caseFinished') {
            passed = msg.passed;
            results = msg.results;
        }
        if(!msg.type) msg.type = 'updateTestStatus';
        _automator.emit('message', msg);
    });
    this.__defineGetter__('passed', function(){ 
        if(!this.closed) return false;
        else return passed; 
    });
    this.__defineGetter__('results', function(){ return results; });
    this.__defineGetter__('_child', function(){ return child; });
    this.__defineGetter__('destroy', function(){ return function() {
        child.kill();
    }; });
    this.__defineGetter__('closed', function(){ return closed; });
    this.__defineGetter__('setOwner', function(){ return function(owner) {
        if(this.owner) throw new
            Error('This Automator is already owned by `' + this.owner + '\'.');
        delete this.setOwner;
        this.__defineGetter__('owner', function() { return owner; })
    }; });
}
Util.inherits(Automator, Util.EventEmitter);
Automator.prototype._sendMessage = function(msg, auth) {    
    if(this.closed) throw new
        Error('Cannot interact with dead automator.');
    if(this.owner && this.owner !== auth) throw new Error(
        'This Automator is owned by `' + 
        this.owner + '\'. ' +
        'Thus requires owner id to perform any action.'
    );
    return this._child.send(msg);
};
Automator.prototype.loadOperation = function(type, name, content, auth) {
    return this._sendMessage({ 
        cmd: 'setOperation', 
        name: name, 
        type: type,
        content: content
    }, auth);
};
Automator.prototype.setSuiteGlobal = function(name, value, auth) {
    return this._sendMessage({ 
        cmd: 'setSuiteGlobal', 
        name: name, 
        value: value,
    }, auth);
};
Automator.prototype.setCaseGlobal = function(name, value, auth) {
    return this._sendMessage({ 
        cmd: 'setCaseGlobal', 
        name: name, 
        value: value,
    }, auth);
};
Automator.prototype.runCase = function(caseString, env, targets, auth) {
    return this._sendMessage({ 
        cmd: 'launch', 
        case: caseString,
        env: env,
        targets: targets
    }, auth);
};
module.exports = Automator;

/**
 *  Some operation management utility.
 */
var operCache = {},
    operationPath = Util.resolve(__dirname, 'operations');
module.exports.Operations = {
    setSeekPath: function(p) {
        if(Util.isDir(Util.resolve(p))) 
            operationPath = Util.resolve(p);
        else throw new
            Error('Invalid path: ' + p);
    },
    has: function(type, name) {
        var operID = type + Util.sep + name;
        if(operCache[operID]) return true;
        var fn = Util.resolve(operationPath, type, name + '.operation');
        if(Util.isFile(fn)) {
            operCache[operID] =
                Util.readFileSync(fn, { encoding: 'ascii' });
            return true;
        } else return false;
    },
    get: function(type, name) {
        var operID = type + Util.sep + name;
        if(operCache[operID]) return operCache[operID];
        var fn = Util.resolve(operationPath, type, name + '.operation');
        if(Util.isFile(fn)) {
            operCache[operID] = Util.readFileSync(fn, { encoding: 'ascii' });
            return operCache[operID];
        } else return '';
    },
    reload: function() {
        Util.getOwnProperties(operCache).forEach(function(operID) {
            var fn = Util.resolve(operationPath, operID + '.operation');
            if(Util.isFile(fn)) 
                operCache[operID] = Util.readFileSync(fn, { encoding: 'ascii' });
            else delete operCache[operID];
        });
    },
    discover: function(cb, fin) {
        connectors.types.forEach(function(type) {
            var operationsDir = Util.resolve(operationPath, type);
            try {
                if(Util.isDir(operationsDir))
                    Util.lsDir(operationsDir)
                        .forEach(function(operFile) {
                    var fullName = Util.resolve(operationPath, type, operFile);
                    if(Util.isFile(fullName))
                        var name = Util.basename(operFile).replace(/\.operation$/, ''),
                            operID = type + Util.sep + name;
                        operCache[operID] = Util.readFileSync(fullName, { encoding: 'ascii' });
                        if(typeof cb === 'function') cb(type, name, operCache[operID]);
                });
            } catch(ex) {
                Util.log('Failed to discover operations: ' + ex.message + '\n');
            }
        });
        if(typeof fin === 'function') fin();
    }
}
