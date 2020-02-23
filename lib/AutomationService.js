var Util = require(__dirname + '/Util.js'),
    Automator = require(__dirname + '/automator'),
    TestHistory = require(__dirname + '/models/TestHistory'),
    TestStatusLog = require(__dirname + '/models/TestStatusLog'),
    TestTarget = require(__dirname + '/models/TestTarget'),
    User = require(__dirname + '/models/User'),
    Operation = require(__dirname + '/models/Operation'),
    ServerState = require(__dirname + '/models/ServerState'),
    TestDefinition = require(__dirname + '/models/TestDefinition');

/**
 *  This limits total concurrent running cases number.
 */
var autoPoolSize = 50,
    runningPool = { },
    changeRunningPool = function(service, maintainerId, instanceID, obj) { 
        if(obj) {  //Test starting.            
            runningPool[maintainerId] = runningPool[maintainerId] || { };
            runningPool[maintainerId][instanceID] = obj;
        } else {   //Test finished.
            runningPool[maintainerId] = runningPool[maintainerId] || { };
            delete runningPool[maintainerId][instanceID];
        }
        //Notify running count change.
        service.emit('updateRunningTestsCount', {
            uid: maintainerId,
            runningTestsCount: Util.getOwnProperties(runningPool[maintainerId]).length
        });        
    };

var launchTestInstance = function(service, instanceID, testDefinitionName, testDefinitionConfig, maintainer, suites, operations, env, targets, trigger) {
    var historyRecordID = null,
        passed = true;
    TestHistory.insert({ 
        instance: instanceID,
        maintainer: maintainer.user,
        testDefinition: testDefinitionName,
        testConfig: testDefinitionConfig,
        suites: suites, 
        trigger: trigger,
        env: env,
        targets: targets,
        operations: operations,
        start: Util.now.getTime(),
        status: 'running'
    }, function(err, id) {
        if(err) {
            service.emit(instanceID, {
                type: 'testInstanceError',
                message: 'Failed to operate DB.\n Error: ' + err.message
            });
            service.removeAllListeners(instanceID);
            return;
        }
        maintainer.id(function(err, uid) {
            if(!err) {
                changeRunningPool(service, uid, instanceID, { 
                    testDefinition: testDefinitionName,
                    start: Util.now.getTime()
                });
            } else Util.log('Error: ' + err.message + '\n' + err.stack + '\n');
        });
        historyRecordID = id;
        TestStatusLog.insert({
            instance:instanceID,
            type:'testInstanceStarted'
        }, function(err) { 
            if(err) Util.log('DB failure: ' + err.message + '\n' + err.stack + '\n');
            else service.emit(instanceID, { type: 'testInstanceStarted' });
        });
        Util.getOwnProperties(suites)
            .forEach(function(sname) { Util.later(function() {
            var suiteGlobal = { },
                suite = suites[sname],
                oneCase = function(index) {
                    if(index >= suite.cases.length) {
                        suite.finished = true;
                        suite.passed = true;
                        suite.end = Util.now.getTime();
                        suite.cases.forEach(function(c) {
                            suite.passed = suite.passed && c.passed;
                        });             
                        TestHistory.update(historyRecordID, {
                            status: 'running',
                            suites: suites
                        }, function(err) {
                            if(err) service.emit(instanceID, {
                                type: 'testInstanceError',
                                message: 'DB failure: ' + err.message
                            });       
                            service.emit(instanceID, {
                                type: 'testInstanceProgress',
                                mainType: 'suiteFinished',
                                instance: instanceID,
                                suite: suite.id,
                                passed: suite.passed
                            });
                        });
                        passed = passed && suite.passed;   
                        wrapSuiteFinish(allFinish);
                        return;
                    }
                    service.$alloc(function(automator){
                        automator.setOwner(instanceID);
                        automator.on('message', function(msg) {
                            if(msg.type) msg.mainType = msg.type;
                            msg.type = 'testInstanceProgress';
                            msg.instance = instanceID;
                            msg.suite = suite.id;
                            msg.case = suite.cases[index].id;
                            TestStatusLog.insert(msg, function(err) {  
                                if(err) Util.log('DB failure: ' + err.message + '\n' + err.stack + '\n');
                                else if(msg.mainType !== 'caseFinished') service.emit(instanceID, msg);
                                else {
                                    // caseFinished is handled below.
                                    suite.cases[index]._$finishMsg = msg;
                                }
                            });
                            if(msg.mainType === 'updateSuiteGlobal')
                                suiteGlobal[msg.name] = msg.value;
                        });
                        automator.on('end', function() { 
                            suite.cases[index].end = Util.now.getTime();
                            suite.cases[index].passed = automator.passed;
                            suite.cases[index].results = automator.results;
                            var msg = suite.cases[index]._$finishMsg || { };
                            delete suite.cases[index]._$finishMsg;
                            TestHistory.update(historyRecordID, {
                                status: 'running',
                                suites: suites
                            }, function(err) {
                                if(err) service.emit(instanceID, {
                                    type: 'testInstanceError',
                                    message: 'DB failure: ' + err.message
                                }); 
                                service.emit(instanceID, msg);                                
                            });
                            oneCase(index + 1); 
                        });
                        operations.forEach(function(oper) {
                            automator.loadOperation(
                                oper.type,
                                oper.name,
                                oper.content,
                                instanceID
                            );
                        });               
                        suite.cases[index].start = Util.now.getTime();
                        Util.getOwnProperties(suiteGlobal).forEach(function(key) {
                            automator.setSuiteGlobal(key, suiteGlobal[key], instanceID);
                        });
                        if(typeof suite.cases[index].targets === 'object')
                            Util.getOwnProperties(suite.cases[index].targets).forEach(function(customName) {
                            var targetName = suite.cases[index].targets[customName];
                            if(targetName.match(/^\/.*\/$/)) {
                                // This should be a regexp representing a group of targets.
                                try {
                                    var r = eval(targetName);
                                    if(r && r instanceof RegExp) targetName = r;
                                } catch(err) {
                                    Util.log('Failed to parse the target as regexp. Ignoring ... ' + targetName + '\n');
                                    return;
                                }
                                suite.cases[index].targets[customName] = [];
                                Util.getOwnProperties(targets).forEach(function(tName) {
                                    if(tName.match(targetName)) {
                                        var t = { configName: tName };
                                        Util.extend(t).from(targets[tName]);
                                        suite.cases[index].targets[customName].push(t);
                                    }
                                })
                            } else {
                                suite.cases[index].targets[customName] = { 
                                    configName: targetName,
                                };
                                Util.extend(suite.cases[index].targets[customName]).from(targets[targetName]);
                            }
                        });
                        // Util.log(Util.inspect(targets, { depth: null }) + '\n');
                        // Util.log(Util.inspect(suite.cases[index].targets, { depth: null }) + '\n');
                        automator.runCase(
                            suite.cases[index].content, 
                            env,   
                            suite.cases[index].targets,                        
                            instanceID
                        );
                        TestHistory.update(historyRecordID, { suites: suites }, function(err) {
                            if(err) {
                                service.emit(instanceID, {
                                    type: 'testInstanceError',
                                    message: 'DB failure: ' + err.message
                                });
                                TestStatusLog.insert({
                                    instance:instanceID,
                                    type:'testInstanceError',
                                    message: err.massage,
                                    stack: err.stack
                                }, function(nerr) { Util.log('ERROR!!\n' + 
                                    'Orig ERROR:\n' + err.message + '\n' + err.stack + 
                                    '\n Log ERROR:\n' + nerr.message + '\n' + err.stack
                                ); });
                            }
                        })
                    });
                };
            suite.start = Util.now.getTime();
            oneCase(0);
            service.emit(instanceID, {
                type: 'testInstanceProgress',
                mainType: 'suiteStarted',
                instance: instanceID,
                suite: suite.id
            });
        }); });
        // Wait all suites finish.
        var wrapSuiteFinish = function(onAllSuitesFinish) {
            var snames = Util.getOwnProperties(suites);
            for(var i = 0; i < snames.length; i ++)
                if(!suites[snames[i]].finished) return;
            Util.later(onAllSuitesFinish);
        };
        // When all suites finished.
        var allFinish = function() {
            TestHistory.update(historyRecordID, {
                end: Util.now.getTime(),
                status: 'finished',
                suites: suites,
                passed: passed
            }, function(err) {
                if(err) service.emit(instanceID, {
                    type: 'testInstanceError',
                    message: 'DB failure: ' + err.message
                });              
                TestStatusLog.insert({
                    instance:instanceID,
                    type:'testInstanceFinished.'
                }, function(err) { 
                    if(err) Util.log('DB failure: ' + err.message + '\n' + err.stack + '\n');
                    else service.emit(instanceID, { type: 'testInstanceFinished' });
                    Util.log('Test instance `' + instanceID + '\' finshed.\n');
                    maintainer.id(function(err, uid) {
                        if(!err) changeRunningPool(service, uid, instanceID)
                        else Util.log('Error: ' + err.message + '\n' + err.stack + '\n');
                    });  
                    service.removeAllListeners(instanceID);                
                });
            });
        };
        //In case none suite is run.
        wrapSuiteFinish(allFinish);
    });    
};
    
var AutomationService = function() {
    Util.EventEmitter.call(this);
    this.setMaxListeners(0);
    var pool = new Array(autoPoolSize);
    var self = this;
    this.__defineGetter__('$pool', function() { return pool; });
    this.__defineGetter__('$alloc', function() { return function(cb) {
        var tryAlloc = function(onGot) {
            for(var i = 0; i < pool.length; i++) {
                if(!pool[i]) {
                    pool[i] = new Automator();
                    return onGot(pool[i]);
                } else if(pool[i] instanceof Automator) {
                    if(pool[i].closed) {
                        pool[i] = new Automator();
                        return onGot(pool[i]);
                    } else if(!pool[i].owner) {
                        return onGot(pool[i]);
                    } else continue;
                } else throw new
                    Error('Invalid object in pool, this shouldn\'t happen.');
            }
            Util.later(function() { tryAlloc(onGot); }, Util.random(1000));
        };
        tryAlloc(cb);
    }; });
    this.__defineGetter__('totalSlots', function() { return autoPoolSize; });
    this.__defineGetter__('freeSlots', function() {
        var count = 0;
        for(var i = 0; i < pool.length; i++) {
            var automator = pool[i];
            if(!automator) count ++;
            else if(automator instanceof Automator) {
                if(automator.closed) count ++;
                else if(!automator.owner) count ++;
            } else throw new
                Error('Invalid object in pool, this should never happen.');
        }
        return count;
    });
};

Util.inherits(AutomationService, Util.EventEmitter);

AutomationService.prototype.createTestInstance = function(maintainer, testDefinitionName) {    
    if(!(maintainer instanceof User)) throw new 
        Error('Invalid maintainer specification.');
    if(typeof testDefinitionName !== 'string') throw new
        Error('Invalid test definition name.');        
    
    var instanceID = Util.uuid(), service = this;
    /**
     *  Fetch test definition and attach uuid to each suite and case
     */
    TestDefinition.get(maintainer.user, testDefinitionName, function(err, testDef) {
        if(err || !testDef) {
            service.emit(instanceID, {
                type: 'testInstanceError',
                message: 'Could not find test definition: ' +
                    testDefinitionName + (err ? 
                    ('\n Error: ' + err.message) : '')
            });
            service.removeAllListeners(instanceID);
            return;
        }
        var suites = Util.shallow(testDef.suites),
            env = { },
            targets = { },
            operations = [];
        Util.getOwnProperties(suites).forEach(function(sname) {
            if(!suites[sname].enabled) {
                delete suites[sname];
                return;
            }
            suites[sname].id = Util.uuid();
            suites[sname].finished = false;
            for(var i = 0; i < suites[sname].cases.length;) {
                var case_ = suites[sname].cases[i];
                if(!case_.enabled) suites[sname].cases.splice(i, 1);
                else {
                    case_.id = Util.uuid();
                    case_.content = case_.content || 'throw new Error("Empty case.");';
                    if(typeof case_.targets === 'object') Util.getOwnProperties(case_.targets).forEach(function(t) {
                        targets[case_.targets[t]] = { };
                    });
                    i++;
                }
            };         
        });
        var loadTargets = function() {
            var targetNames = Util.getOwnProperties(targets),
                unresolvedCount = targetNames.length,
                wrapFinish = function() {
                    if(unresolvedCount === 0) launchTestInstance(
                        service, instanceID, testDefinitionName, testDef.config, maintainer, 
                        suites, operations, env, targets, testDef.trigger
                    );
                };
            targetNames.forEach(function(target) {
                if(target.match(/^\/.*\/$/)) {
                    // This should be a regexp representing a group of targets.
                    try {
                        var r = eval(target);
                        if(r && r instanceof RegExp) {
                            delete targets[target];
                            target = r;
                        }
                    } catch(err) {
                        Util.log('Failed to parse the target as regexp. Ignoring ... ' + target + '\n');
                        return;
                    }
                    TestTarget.match(maintainer.user, target, function(tTarget) {
                        targets[tTarget.name] = tTarget.config || { };
                    }, function(err) {
                        if(err) {
                            service.emit(instanceID, {
                                type: 'testInstanceError',
                                message: 'Could not load test target. ' + target + (err ? ('\n Error: ' + err.message) : '')
                            });
                            service.removeAllListeners(instanceID);
                            return;
                        }
                        unresolvedCount -= 1;
                        wrapFinish();
                    })
                } else TestTarget.get(maintainer.user, target, function(err, tTarget) {
                    if(err || (!tTarget)) {
                        service.emit(instanceID, {
                            type: 'testInstanceError',
                            message: 'Could not load test target. ' + (err ? ('\n Error: ' + err.message) : '')
                        });
                        service.removeAllListeners(instanceID);
                        return;
                    }
                    targets[target] = tTarget.config || { };
                    unresolvedCount -= 1;
                    wrapFinish();
                });
            });
            wrapFinish();
        };
        var loadOperations = function() {  
            Operation.iterate(maintainer.user, function(oper) {
                oper.from = 'user';
                operations.push(oper);
            }, function(err) {
                if(err) { 
                    service.emit(instanceID, {
                        type: 'testInstanceError',
                        message: 'Could not load user operation. ' + (err ? ('\n Error: ' + err.message) : '')
                    });
                    service.removeAllListeners(instanceID);
                    return;
                }
                Automator.Operations.discover(function(type, name, content) {
                    operations.push({
                        type: type,
                        name: name,
                        content: content,
                        from: 'builtin'
                    });
                }, function() { loadTargets(); });
            })
        };
        ServerState.each(function(key, value) {
            env[key] = value;
        }, function(err) {
            if(err) { 
                service.emit(instanceID, {
                    type: 'testInstanceError',
                    message: 'Could not load server states. ' + (err ? ('\n Error: ' + err.message) : '')
                });
                service.removeAllListeners(instanceID);
                return;
            }
            loadOperations();
        });
    });
    Util.log('Test instance `' + instanceID + '\' launched.\n');
    return instanceID;
};

AutomationService.prototype.runningTestInstances = function(maintainerId) { return (runningPool[maintainerId] || { }); };

module.exports = new AutomationService;
module.exports.BuiltinOperations = Automator.Operations;