'use strict';

var creReportApp = 
window.$creReportApp = angular.module('creReportApp', [
    'cre.services',
    'cre.dynamicList',
    'cre.terminal',
    'cre.sshStepDetail',
    'ui.bootstrap'
])
.config(['$sceProvider', function($sceProvider) {
    // Completely disable SCE to support IE7.
    $sceProvider.enabled(false);
}])
.controller('creReportMain', ['$scope', 'Server', 'Events', function($scope, Server, Events) {
    Server.on('error', function(message) {
        $scope.error = message;
        $scope.notFound = true;
        $scope.$apply();
    });

    $scope.reportSummary = undefined;
    $scope.instanceDetail = undefined;
    $scope.caseInfoCache = { };
    $scope.operationInfoCache = { };
    var countNumbers = function(testInstance) {
        testInstance.passedSuitesNum = 0;
        testInstance.failedSuitesNum = 0;
        testInstance.runningSuitesNum = 0;
        angular.forEach(testInstance.suites, function(suite) {
            if(suite.passed) testInstance.passedSuitesNum += 1;
            else testInstance.failedSuitesNum += 1;
            suite.passedCasesNum = 0;
            suite.failedCasesNum = 0;
            angular.forEach(suite.cases, function(case_) {
                if(case_.passed) suite.passedCasesNum += 1;
                else suite.failedCasesNum += 1;
            });
            suite.totalCasesNum = suite.passedCasesNum + suite.failedCasesNum;
        });
        testInstance.totalSuitesNum = testInstance.passedSuitesNum + testInstance.failedSuitesNum;
    };
    Server.on('updateTest', function(instance) {
        $scope.notFound = instance.notFound;
        $scope.instanceDetail = instance;
        countNumbers($scope.instanceDetail);
        Events.invalidate();
    });

    $scope.requestCaseInfo = function(instance, suite, case_, clearResult) {
        if(clearResult) delete $scope.caseInfoCache[case_.id];
        else {
            $scope.caseInfoCache[case_.id] = { };
            Server.emit('getCaseInfoOfTest', {
                from: instance.start - 86400000,
                to: instance.start + 86400000,
            }, instance.instance, suite.id, case_.id);
        }
    };
    var updateCaseInfo = function(detail) {
        if(angular.isObject($scope.caseInfoCache[detail.case])) {
            angular.extend($scope.caseInfoCache[detail.case], detail);
            Events.invalidate();
        }
    };
    Server.removeAllListeners('updateCaseInfoOfTest');
    Server.on('updateCaseInfoOfTest', updateCaseInfo);

    $scope.requestOperInfo = function(instance, suite, case_, operation, clearResult) {
        if(clearResult) delete $scope.operationInfoCache[operation.id];
        else {
            $scope.operationInfoCache[operation.id] = { };
            Server.emit('getOperationInfoOfCaseInTest', {
                from: instance.start - 86400000,
                to: instance.start + 86400000,
            }, instance.instance, suite.id, case_.id, operation.id);
        }
    };
    var updateOperInfo = function(detail) {
        if(angular.isObject($scope.operationInfoCache[detail.operation])) {
            angular.extend($scope.operationInfoCache[detail.operation], detail);
            Events.invalidate();
        }
    };
    Server.removeAllListeners('updateOperationInfoOfCaseInTest');
    Server.on('updateOperationInfoOfCaseInTest', updateOperInfo);

    $scope.requestSSHStepDetail = function(step) {
        Server.emit('getSSHStepDetail', {
            from: step.start,
            to: step.end + 60000,
        }, step.id);
    };
    var updateSSHDetail =  function(detail) { 
        Events.emit(detail.id, detail.newData); 
    };
    Server.removeAllListeners('updateSSHStepDetail');
    Server.on('updateSSHStepDetail', updateSSHDetail);

    var onInvalid = function() {    
        $scope.reportHeight = document.getElementById('reportFrame').contentWindow.document.body.scrollHeight;  
        if(!$scope.reportHeight) Events.invalidate('invalid', 500);  
        $scope.$apply();
    };
    Events.on('invalid', onInvalid);
    $scope.$on('$destroy', function() { 
        Events.removeListener('invalid', onInvalid); 
        Server.off('updateCaseInfoOfTest', updateCaseInfo);
        Server.off('updateOperationInfoOfCaseInTest', updateOperInfo);
        Server.off('updateSSHStepDetail', updateSSHDetail);
    });

    Server.on('name', function() {
        var instance = location.pathname.replace('/report/', ''),
            start = location.search.split('?');
        if(start.length === 2) {
            start = start[1].split('=');
            if(start.length === 2) start = parseInt(start[1]);
            else start = 0;
        } else start = 0;
        if((typeof start !== 'number') || (!start)) start = 0;
        instance = instance || '00000000-0000-0000-0000-000000000000';
        Server.on('testSummary', function(start, subject, report) {
            $scope.summaryTitle = subject;
            document.getElementById('reportFrame').contentWindow.document.write(report);
            Server.emit('getTestInstance', instance, start);
        })
        Server.emit('getTestSummary', instance, start);
    });
    Server.subscribe('report');

    $scope.openConsole = function(target) {
        window.open(
            location.protocol + '//' + location.host + '/' + 'console?target=' + $scope.instanceDetail.maintainer + '/' + target.configName, 
            '', 'resizable=yes,width=800,height=600'
        );
    };
    
    window.$report = $scope;
}]);