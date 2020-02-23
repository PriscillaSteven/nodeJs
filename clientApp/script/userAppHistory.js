'use strict';

creUserApp.controller('creUserHistory', [
    '$scope', '$window', 'TestHistory', 'Events', 
    function($scope, $window, TestHistory, Events) {
	$scope.caseInfoCache = { };
    $scope.operationInfoCache = { };
	$scope.runningTestList = { };
	$scope.historyTestList = { };
    var today = new Date((new Date()).toDateString());
	$scope.currentSearchRange = { from: today, to: today };
    $scope.searchTests = function() {
        $scope.historyTestList = { };
        TestHistory.listRangeOfTests(
            $scope.currentSearchRange.from.getTime(),
            $scope.currentSearchRange.to.getTime() + 86400000
        );
    };

    var updateRunningTestStatus = function(statusLog) { 
        if (statusLog.mainType === 'suiteStarted') {
            TestHistory.listRunningTests();
        } else if (statusLog.mainType === 'caseStarted') {
            if($scope.caseInfoCache[statusLog.caseId]) {
                $scope.caseInfoCache[statusLog.caseId].operations = statusLog.caseInformation;
                $scope.caseInfoCache[statusLog.caseId].operations.forEach(function(oper) {
                    oper.started = false;
                    oper.finished = false;
                    $scope.$apply();
                });
            }
        } else if (statusLog.mainType === 'operationStarted') {
            if($scope.caseInfoCache[statusLog.caseId]) {
                $scope.caseInfoCache[statusLog.caseId].operations.forEach(function(oper) {
                    if(oper.id === statusLog.operation) {
                        oper.started = true;
                        oper.finished = false;
                        $scope.$apply();
                    }
                });
            }
        } else if (statusLog.subType === 'stepStarted') {
            if($scope.operationInfoCache[statusLog.operation]) {
                $scope.operationInfoCache[statusLog.operation].steps.push({              
                    id: statusLog.step,
                    name: statusLog.name,
                    cmd: statusLog.cmdStr,
                    critical: statusLog.isCritical,
                    start: (new Date(statusLog.startTimestamp)).getTime()
                }); 
                $scope.$apply();
            }
        } else if(statusLog.subType === 'stepUpdateOuput') {
            Events.emit(statusLog.step, statusLog.newData);
        } else if(statusLog.subType === 'stepFinished') {
            if($scope.operationInfoCache[statusLog.operation]) {
                $scope.operationInfoCache[statusLog.operation].steps.forEach(function(step) {
                    if(step.id === statusLog.step) {                        
                        step.end = (new Date(statusLog.finishTimestamp)).getTime();
                        step.passed = statusLog.passed;
                        step.exitCode = statusLog.exitCode;
                        step.exitSignal = statusLog.exitSignal;
                        $scope.$apply();
                    }
                }); 
            }
        } else if (statusLog.mainType === 'operationFinished') {
            if($scope.caseInfoCache[statusLog.caseId]) {
                $scope.caseInfoCache[statusLog.caseId].operations.forEach(function(oper) {
                    if(oper.id === statusLog.operation) {
                        oper.started = true;
                        oper.finished = true;
                        oper.passed = statusLog.passed;
                        oper.message = statusLog.message;
                        $scope.$apply();
                    }
                });
            }
        } else if (statusLog.mainType === 'caseFninished') {
            if($scope.caseInfoCache[statusLog.caseId]) {
                $scope.caseInfoCache[statusLog.caseId].passed = statusLog.passed;
                $scope.$apply();
            }
            TestHistory.listRunningTests();
        }  else if (statusLog.mainType === 'automatorDestroyed') { //'caseFninished'
            if($scope.caseInfoCache[statusLog.caseId]) {
                var case_ = $scope.caseInfoCache[statusLog.caseId];
                    case_.exitSignal = statusLog.signal;
                    case_.exitCode = statusLog.code;
                    $scope.$apply();
            }
            TestHistory.listRunningTests();
        } else if (statusLog.mainType === 'suiteFinished') {
            TestHistory.listRunningTests();
        } else {
            var evName = statusLog.type;
            if(statusLog.mainType) evName += ':' + statusLog.mainType;
            if(statusLog.subType) evName += ':' + statusLog.subType;
            window[evName] = statusLog;
            console.log('Not listened event, ' + evName);
        }
    };
    TestHistory.removeAllListeners('updateStatusOfRunningTest');
    TestHistory.on('updateStatusOfRunningTest', updateRunningTestStatus);

    var updateTest = function(testInstance) {        
        $scope.$apply(function() {
            if(testInstance.status === 'running') {
                $scope.runningTestList[testInstance.instance] = 
                    $scope.runningTestList[testInstance.instance] || { };
                // angular.extend($scope.runningTestList[testInstance.instance], testInstance);
                // perform granular extend
                var targetInstance = $scope.runningTestList[testInstance.instance];
                targetInstance.instance = targetInstance.instance || testInstance.instance;
                targetInstance.maintainer = targetInstance.maintainer || testInstance.maintainer;
                targetInstance.start = targetInstance.start || testInstance.start;
                targetInstance.status = targetInstance.status || testInstance.status;
                targetInstance.testDefinition = targetInstance.testDefinition || testInstance.testDefinition;
                targetInstance.trigger = targetInstance.trigger || testInstance.trigger;
                if(!targetInstance.suites) targetInstance.suites = testInstance.suites;
                else {
                    angular.forEach(testInstance.suites, function(suite, suiteName) {
                        // extend each suite
                        var targetSuite = targetInstance.suites[suiteName];
                        targetSuite.id = targetSuite.id || suite.id;
                        targetSuite.end = targetSuite.end || suite.end;
                        targetSuite.start = targetSuite.start || suite.start;
                        targetSuite.passed = targetSuite.passed || suite.passed;
                        targetSuite.enabled = targetSuite.enabled || suite.enabled;
                        targetSuite.finished = targetSuite.finished || suite.finished;
                        if(!targetSuite.cases) targetSuite.cases = suite.cases;
                        else {
                            angular.forEach(suite.cases, function(case_, idx) {
                                // extend each case too
                                var targetCase = targetSuite.cases[idx];
                                targetCase.id = targetCase.id || case_.id;
                                targetCase.end = targetCase.end || case_.end;
                                targetCase.name = targetCase.name || case_.name;
                                targetCase.start = targetCase.start || case_.start;
                                targetCase.passed = targetCase.passed || case_.passed;
                                targetCase.enabled = targetCase.enabled || case_.enabled;
                                targetCase.targets = targetCase.targets || case_.targets;
                            });
                        }
                    });
                }
            } else {
                // Count numbers
                testInstance.passedSuitesNum = 0;
                testInstance.failedSuitesNum = 0;
                testInstance.runningSuitesNum = 0;
                angular.forEach(testInstance.suites, function(suite) {
                    if(suite.finished) {
                        if(suite.passed) testInstance.passedSuitesNum += 1;
                        else testInstance.failedSuitesNum += 1;
                        suite.passedCasesNum = 0;
                        suite.failedCasesNum = 0;
                        suite.runningCasesNum = 0;
                        angular.forEach(suite.cases, function(case_) {
                            if(case_.end){
                                if(case_.passed) suite.passedCasesNum += 1;
                                else suite.failedCasesNum += 1;
                            } else suite.runningCasesNum += 1;
                        });
                        suite.totalCasesNum = 
                            suite.passedCasesNum + suite.failedCasesNum + suite.runningCasesNum;
                    } else testInstance.runningSuitesNum += 1;
                });
                testInstance.totalSuitesNum = 
                    testInstance.passedSuitesNum + testInstance.failedSuitesNum + testInstance.runningSuitesNum;
                delete $scope.runningTestList[testInstance.instance];
                if((testInstance.start <= ($scope.currentSearchRange.to.getTime() + 86400000)) &&
                    (testInstance.start >= $scope.currentSearchRange.from.getTime())) {
                    $scope.historyTestList[testInstance.instance] = 
                        $scope.historyTestList[testInstance.instance] || { };
                    angular.extend($scope.historyTestList[testInstance.instance], testInstance);
                } else delete $scope.historyTestList[testInstance.instance];
            }
        });
    };
    TestHistory.removeAllListeners('updateTest');
    TestHistory.on('updateTest', updateTest);
    
    $scope.requestCaseInfo = function(instance, suite, case_, clearResult) {
        if(clearResult) delete $scope.caseInfoCache[case_.id];
        else {
            $scope.caseInfoCache[case_.id] = { };
            TestHistory.getCaseInfoOfTest({
                from: instance.start - 86400000,
                to: instance.start + 86400000
            }, instance.instance, suite.id, case_.id);
        }
    };
    var updateCaseInfo = function(detail) {
        if(angular.isObject($scope.caseInfoCache[detail.caseId])) {
            angular.extend($scope.caseInfoCache[detail.caseId], detail);
            Events.invalidate();
        }
    };
    TestHistory.removeAllListeners('updateCaseInfoOfTest');
    TestHistory.on('updateCaseInfoOfTest', updateCaseInfo);

    $scope.requestOperInfo = function(instance, suite, case_, operation, clearResult) {
        if(clearResult) delete $scope.operationInfoCache[operation.id];
        else {
            $scope.operationInfoCache[operation.id] = { };
            TestHistory.getOperationInfoOfCaseInTest({
                from: instance.start - 86400000,
                to: instance.start + 86400000
            }, instance.instance, suite.id, case_.id, operation.id);
        }
    };
    var updateOperInfo = function(detail) {
        if(angular.isObject($scope.operationInfoCache[detail.operation])) {
            angular.extend($scope.operationInfoCache[detail.operation], detail);
            Events.invalidate();
        }
    };
    TestHistory.removeAllListeners('updateOperationInfoOfCaseInTest');
    TestHistory.on('updateOperationInfoOfCaseInTest', updateOperInfo);

    $scope.requestSSHStepDetail = function(step) {
        TestHistory.getSSHStepDetail({
            from: step.start,
            to: step.end + 60000
        }, step.id);
    };
    var updateSSHDetail =  function(detail) { 
        Events.emit(detail.id, detail.newData); 
    };
    TestHistory.removeAllListeners('updateSSHStepDetail');
    TestHistory.on('updateSSHStepDetail', updateSSHDetail);


    var onInvalid = function() { $scope.$apply(); };
    Events.on('invalid', onInvalid);
    $scope.$on('$destroy', function() { 
        Events.removeListener('invalid', onInvalid); 
        TestHistory.off('updateCaseInfoOfTest', updateCaseInfo);
        TestHistory.off('updateOperationInfoOfCaseInTest', updateOperInfo);
        TestHistory.off('updateSSHStepDetail', updateSSHDetail);
    });
    $scope.$watch(function() { return $scope.name; }, function() {
        if($scope.name) {
            TestHistory.listRunningTests();
            TestHistory.listRangeOfTests(
                $scope.currentSearchRange.from.getTime(),
                $scope.currentSearchRange.to.getTime() + 86400000
            );
        }
    });

    $scope.openConsole = function(target) {
        window.open(
            location.protocol + '//' + location.host + '/' + 'console?target=' + $scope.targetUser + '/' + target.configName, 
            '', 'resizable=yes,width=800,height=600'
        );
    };

    window.$history = $scope;
    window.$w = $window;
}]);