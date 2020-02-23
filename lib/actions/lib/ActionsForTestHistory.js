var Util = require(__dirname + '/../../Util'),
    NotifyService = require(__dirname + '/../../NotifyService'),
    AutomationService = require(__dirname + '/../../AutomationService'),
    TestHistory = require(__dirname + '/../../models/TestHistory'),
    TestStatusLog = require(__dirname + '/../../models/TestStatusLog');

var prepareTestInstanceHistoryItem = function(instance, count, cb) {
	if(instance.suites) {
		Util.getOwnProperties(instance.suites).forEach(function(sname) {
			if(instance.suites[sname].cases)
				Util.getOwnProperties(instance.suites[sname].cases).forEach(function(cname) {
					delete instance.suites[sname].cases[cname].operations;
					delete instance.suites[sname].cases[cname].content;
				});
		});		
	}
	if(typeof count === 'number')
		Util.later(function() { cb(instance); }, 0 * count);
	else cb(instance);
};

exports.name = 'TestHistoryActions';
exports.actions = {
	launchTest: function(reply, broadcast, user, testDefinitionName) { 
		user.id(function(err, uid) {
			if(err) { reply('error', err.message); return; }
			var instances = AutomationService.runningTestInstances(uid),
				shouldLaunch = true;
			Util.getOwnProperties(instances).forEach(function(instanceId) {
				if(instances[instanceId].testDefinition === testDefinitionName) {
					shouldLaunch = false;
					reply(
						'error', 'Test `' + 
						testDefinitionName + '\' already running, launched on: ' + 
						Date(instances[instanceId].start)
					);
				}
			});
			if(!shouldLaunch) return;
			reply('info', 'Starting test: ' + testDefinitionName);
			var instanceId = AutomationService.createTestInstance(user, testDefinitionName);
			AutomationService.on(instanceId, function(msg) { 
				msg.instance = instanceId;
				msg.caseId = msg.case; delete msg.case;
				var needUpdate = false;
				if(msg.type === 'testInstanceStarted') {
					reply('info', 'Started test: ' + testDefinitionName);
					needUpdate = true;
				} else if(msg.type === 'testInstanceFinished') {
					reply('info', 'Finished test: ' + testDefinitionName);
					NotifyService.sendTestReport(user, instanceId);
					needUpdate = true;
				} else if(msg.type === 'testInstanceError') {
					reply('error', msg.message);
					NotifyService.sendTestReport(user, instanceId);
				} else if(msg.type === 'testInstanceProgress') {
					if(msg.subType === 'stepUpdateOuput' && Array.isArray(msg.newData)) {
						msg.newData = (new Buffer(msg.newData)).toString('utf8');
					} else if(msg.mainType === "operationLoadResult" && msg.loaded === false) {
						broadcast('error', 'Failed to load operation ' + msg.operationType + ' ' + msg.operationName + ': ' + msg.message);
						return;
					} else if(msg.mainType === "caseLoadResult" && msg.loaded === false) {
						broadcast('error', 'Failed to load case: ' + msg.message);
						return;
					} else if(msg.mainType === "automatorDestroyed" && msg.code != 0) {
						broadcast('error', 'Automator failed: ' + msg.code + '\n' + msg.stdout + '\n' + msg.stderr);
						return;
					}
					broadcast('updateStatusOfRunningTest', msg);
					if(msg.mainType === 'caseFinished' || msg.mainType === 'suiteFinished')
						NotifyService.updateTestProgressToPortal(user, instanceId);
				} else broadcast('error', 'Unknown test instance status: ' + Util.inspect(msg, {depth: null}));
				if(needUpdate) TestHistory.range(0, Util.now, true).filter({
					instance: instanceId
				}).each(function(item, p, d, stop) {
					stop();
					prepareTestInstanceHistoryItem(item, 0, function(res) {
						broadcast('updateTest', res);
					});
				}, function(err) { Util.log('instance not found: ' + instanceId); });
			});
		});
	},
	listRangeOfTests: function(reply, broadcast, user, fromTime, toTime) { 
		var count = 0;
		TestHistory.range(fromTime, toTime).filter({
			maintainer: user.user
		}).each(function(item) {
			if(item.status === 'running') return;
			prepareTestInstanceHistoryItem(item, count ++, function(res) {
				reply('updateTest', res);
			});
		}, function(err) { });	
	},
	listRunningTests: function(reply, broadcast, user) { 
		var count = 0;
		user.id(function(err, uid) {
			if(err) { reply('error', err.message); return; }
			Util.getOwnProperties(AutomationService.runningTestInstances(uid)).forEach(function(instanceId) {
				TestHistory.range(0, Util.now, true).filter({
					instance: instanceId
				}).each(function(item, p, d, stop) {
					stop(); 
					prepareTestInstanceHistoryItem(item, count ++, function(res) {
						reply('updateTest', res);
					});
				}, function(err) { });					
			});
		});
	},
    getCaseInfoOfTest: function(reply, broadcast, user, approxRange, instanceId, suitId, caseId) {
    	var operationsInfo = [ ];
		TestHistory.range(approxRange.from, approxRange.to).filter({
    		maintainer: user.user,
			instance: instanceId,
		}).each(function(instance, p, d, stop) {
			stop(); 
    		TestStatusLog.range(instance.start, instance.end).filter({
				instance: instanceId,
				suite: suitId,
				case: caseId
    		}).each(function(statusLog, p, d, stop) {
    			statusLog.caseId = statusLog.case;
    			if(statusLog.mainType === 'caseStarted') {
    				operationsInfo = statusLog.caseInformation;
    				operationsInfo.forEach(function(oper) {
    					oper.started = false;
    					oper.finished = false;
    					// if(oper.type === 'ssh') {
    					// 	try {
    					// 		oper.target.conn = 
    					// 			new Buffer(JSON.stringify(oper.target)).toString('base64');
    					// 	} catch(err) { 
    					// 		Util.log('Failed to parse conn string: ' + err.message + '\n'); 
    					// 	}
    					// }
    				});
    			} else if(statusLog.mainType === 'operationStarted') { 
    				operationsInfo.forEach(function(oper) {
    					if(oper.id === statusLog.operation) {
    						oper.started = true;
    						oper.finished = false;
    					}
    				}); // Nothing yet. 
    			} else if(statusLog.mainType === 'operationFinished') {
    				operationsInfo.forEach(function(oper) {
    					if(oper.id === statusLog.operation) {
    						oper.started = true;
    						oper.finished = true;
    						oper.passed = statusLog.passed;
    						oper.message = statusLog.message;
    					}
    				});
    			} else if(statusLog.mainType === 'automatorDestroyed') {
					reply('updateCaseInfoOfTest', {
						exitSignal: statusLog.signal,
						exitCode: statusLog.code,
						operations: operationsInfo,
						instance: instanceId,
						suite: suitId,
						caseId: caseId,
					});
					stop();
    			}
    		}, function(err) {
    			// Not finished yet
				reply('updateCaseInfoOfTest', {
					operations: operationsInfo,
					instance: instanceId,
					suite: suitId,
					caseId: caseId,
				});
    		});
		}, function(err) { });	    	
    },
    getOperationInfoOfCaseInTest: function(
    	reply, broadcast, user, approxRange,
    	instanceId, suitId, caseId, operId) {
    	var stepsInfo = [];
    	TestHistory.range(approxRange.from, approxRange.to).filter({
    		maintainer: user.user,
			instance: instanceId,
		}).each(function(instance, p, d, stop) {
			stop(); 
    		TestStatusLog.range(instance.start, instance.end).filter({
				instance: instanceId,
				suite: suitId,
				case: caseId,
				operation: operId
    		}).each(function(statusLog, p, d, stop) {
    			statusLog.caseId = statusLog.case;
    			if(statusLog.mainType === 'operationStarted') { } // Nothing yet. 
    			else if(statusLog.mainType === 'operationUpdate') {
    				if(statusLog.subType === 'stepStarted') {
    					stepsInfo[stepsInfo.length] = {
    						id: statusLog.step,
    						name: statusLog.name,
    						cmd: statusLog.cmdStr,
    						critical: statusLog.isCritical,
    						start: (new Date(statusLog.startTimestamp)).getTime()
    					};
    				} else if(statusLog.subType === 'stepFinished') {
    					for(var i = stepsInfo.length - 1; i >= 0; i --) {
							s = stepsInfo[i];
							if(s.id === statusLog.step) {
    							s.end = (new Date(statusLog.finishTimestamp)).getTime();
    							s.passed = statusLog.passed;
    							s.exitCode = statusLog.exitCode;
    							s.exitSignal = statusLog.signal;
    							s.coreDumped = statusLog.hasCoreDump;
    							return;
    						}
						}
    				}
    			} else if(statusLog.mainType === 'operationFinished') {   
			        reply('updateOperationInfoOfCaseInTest', {
						steps: stepsInfo,
						instance: instanceId,
						suite: suitId,
						caseId: caseId,
						operation: operId
			        });
					stop();
    			}
    		}, function(err) {
    			// Not finished yet   
		        reply('updateOperationInfoOfCaseInTest', {
					steps: stepsInfo,
					instance: instanceId,
					suite: suitId,
					caseId: caseId,
					operation: operId
		        });
    		});
		}, function(err) { });	
    },
    getSSHStepDetail: function(reply, broadcast, user, approxRange, stepId) {
    	TestStatusLog.range(approxRange.from, approxRange.to).filter({
			step: stepId,
			operationType: 'ssh',
			subType: /^step.*/
		}).each(function(statusLog, p, d, stop) {
			statusLog.caseId = statusLog.case;
			if(statusLog.subType === 'stepFinished') stop();
			// else if(statusLog.subType === 'stepStarted') noop();
			else if(statusLog.subType === 'stepUpdateOuput')
				reply('updateSSHStepDetail', { id: stepId, newData: (new Buffer(statusLog.newData)).toString('utf8') });
		}, function(err) { });
	}
};
