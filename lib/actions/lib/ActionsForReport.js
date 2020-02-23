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

exports.name = 'ReportActions';
exports.actions = {
	getTestSummary: function(reply, broadcast, user, instanceId, fromTime) { 
		TestHistory.range(fromTime, null).filter({
			instance: instanceId
		}).each(function(item, p, d, stop) {
			if(item.status === 'running') return;
			stop();
			NotifyService.generateTestSummary(instanceId, item.start, function(err, subject, report) {
				if(err) reply('updateTest', { notFound: true });
				else reply('testSummary', item.start, subject, report);
			});
		}, function(err) {
			//Not found, repley error.
			reply('updateTest', { notFound: true });
		});	
	},
	getTestInstance: function(reply, broadcast, user, instanceId, fromTime) { 
		TestHistory.range(fromTime, null).filter({
			instance: instanceId
		}).each(function(item, p, d, stop) {
			if(item.status === 'running') return;
			stop();
			prepareTestInstanceHistoryItem(item, 0, function(res) {
				reply('updateTest', res);
			});
		}, function(err) {
			//Not found, repley error.
			reply('updateTest', { notFound: true });
		});	
	},
    getCaseInfoOfTest: function(reply, broadcast, user, approxRange, instanceId, suitId, caseId) {
    	var operationsInfo = [ ];
		TestHistory.range(approxRange.from, approxRange.to).filter({
			instance: instanceId,
		}).each(function(instance, p, d, stop) {
			stop(); 
    		TestStatusLog.range(instance.start, instance.end).filter({
				instance: instanceId,
				suite: suitId,
				case: caseId
    		}).each(function(statusLog, p, d, stop) {
    			if(statusLog.mainType === 'caseStarted') {
    				operationsInfo = statusLog.caseInformation;
    				operationsInfo.forEach(function(oper) {
    					oper.started = false;
    					oper.finished = false;
    					if(oper.type === 'ssh') {
    						try {
    							oper.target.conn = 
    								new Buffer(JSON.stringify(oper.target)).toString('base64');
    						} catch(err) { 
    							Util.log('Failed to parse conn string: ' + err.message + '\n'); 
    						}
    					}
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
						case: caseId,
					});
					stop();
    			}
    		}, function(err) {
    			// Not finished yet
				reply('updateCaseInfoOfTest', {
					operations: operationsInfo,
					instance: instanceId,
					suite: suitId,
					case: caseId,
				});
    		});
		}, function(err) { });	    	
    },
    getOperationInfoOfCaseInTest: function(
    	reply, broadcast, user, approxRange,
    	instanceId, suitId, caseId, operId) {
    	var stepsInfo = [];
    	TestHistory.range(approxRange.from, approxRange.to).filter({
			instance: instanceId,
		}).each(function(instance, p, d, stop) {
			stop(); 
    		TestStatusLog.range(instance.start, instance.end).filter({
				instance: instanceId,
				suite: suitId,
				case: caseId,
				operation: operId
    		}).each(function(statusLog, p, d, stop) {
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
						case: caseId,
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
					case: caseId,
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
			if(statusLog.subType === 'stepFinished') stop();
			// else if(statusLog.subType === 'stepStarted') noop();
			else if(statusLog.subType === 'stepUpdateOuput')
				reply('updateSSHStepDetail', { id: stepId, newData: (new Buffer(statusLog.newData)).toString('utf8') });
		}, function(err) { });
	}
};