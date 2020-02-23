'use strict';

creUserApp.controller('creUserTestDefinitions', [
    '$scope', 'Popup', 'Events', 'Server', 'ServerStates', 'TestHistory', 
    function($scope, Popup, Events, Server, ServerStates, TestHistory) {
    $scope.testDefinitions = { };
    $scope.testTriggers = { };
    $scope.tdActions = {
        launch: function(testDefinitionName) { TestHistory.launchTest(testDefinitionName); },
        listTest: function() { Server.emit( 'listAllTestDefinitions' ); },
        newTest: function(td_name) { Server.emit( 'newTestDefinition', td_name ); },
        deleteTest: function(td_name) { Server.emit( 'deleteTestDefinition', td_name ); },
        copyTest: function(td_name, ntd_name) { Server.emit( 'copyTestDefinition', td_name, ntd_name ); },
        listServerStates: function(cb) { 
            ServerStates.once('allKeysOfServerStates', cb);
            ServerStates.listKeysOfServerStates();
        },
        setTrigger: function(td_name, tg_name) { Server.emit(
            'setTriggerOfTestDefinition', td_name, tg_name
        ); },
        newSuite: function(td_name, s_name, insert_pos) { Server.emit(
            'newSuiteOfTestDefinition', td_name, s_name, insert_pos
        ); },
        deleteSuite: function(td_name, s_name) { Server.emit(
            'deleteSuiteOfTestDefinition', td_name, s_name
        ); },
        copySuite: function(td_name, s_name, ns_name) { Server.emit(
            'copySuiteOfTestDefinition', td_name, s_name, ns_name
        ); },
        switchSuiteState: function(td_name, s_name, enable) { Server.emit(
            'switchStateSuiteOfTestDefinition', td_name, s_name, enable
        ); },
        newCase: function(td_name, s_name, c_name, insert_pos) { Server.emit(
            'newCaseOfSuiteInTestDefinition', td_name, s_name, c_name, insert_pos
        ); },
        deleteCase: function(td_name, s_name, c_name, case_idx) { Server.emit(
            'deleteCaseOfSuiteInTestDefinition', td_name, s_name, c_name, case_idx
        ); },
        putCase: function(td_name, s_name, c_name, c_idx, content) { Server.emit(
            'putCaseOfSuiteInTestDefinition', td_name, s_name, c_name, c_idx, content
        ); },
        switchCaseState: function(td_name, s_name, c_name, c_idx, enable) { Server.emit(
            'switchStateCaseOfSuiteInTestDefinition', td_name, s_name, c_name, c_idx, enable
        ); },
        setTargets: function(td_name, s_name, c_name, c_idx, targets) { Server.emit(
            'setTargetsForCaseOfSuiteInTestDefinition', td_name, s_name, c_name, c_idx, targets
        ); },
        switchUpdateProtal: function(td_name) { Server.emit('switchUpdateProtalOfTestDefinition', td_name); },
        briefTestTargets: function(actionId) { Server.emit('briefTestTargets', actionId); }
    };

    $scope.popupSetTrigger = function(td_name) {
        $scope.tdActions.listServerStates(function(serverStats) {
            if(serverStats.length <= 0) {
                Events.emit('notifyInfo', 'No Server States available as triggers.')
                return;
            }
            Popup.open({
                template: [
                    '<div class="input-group">' ,
                        '<span class="input-group-addon">Trigger</span>' ,
                        '<input type="text" class="form-control"' ,
                               'ng-model="result.trigger" placeholder="Name"' ,
                               'typeahead="type for type in allTriggers | filter:$viewValue">' ,
                    '</div>',
                    '<div><em>Note: Leave empty to clear trigger</em></div>'
                ].join('\n'),
                title: 'Set Trigger for Test Definition: ' + td_name,      
                env: { result: { trigger: '' }, allTriggers: serverStats }, 
                disableOK: 'result.trigger && (allTriggers.indexOf(result.trigger) < 0)',
                onOK: function (result) {
                    $scope.tdActions.setTrigger(td_name, result.trigger);
                }
            });
        });
    };
    $scope.popupCreateTest = function() {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">',
                        '<i class="glyphicon glyphicon-edit"></i>',
                    '</span>',
                    '<span class="input-group-addon">Name</span>',
                    '<input type="text" class="form-control" ',
                            'ng-model="result.name" ',
                            'placeholder="Test Definition Name">',
                '</div>'
            ].join(''),
            title: 'Add a New Test Definition',      
            env: { result: { name: '' } }, 
            onOK: function (result) {
                var shouldSave = true;
                angular.forEach($scope.testDefinitions, function(testDefinition) {
                    if(result.name === testDefinition.name) shouldSave = false;
                });
                if(shouldSave) $scope.tdActions.newTest(result.name);
            }
        });
    };
    $scope.popupRemoveTest= function(td_name) {
        Popup.open({
            template: [
                '<h5>Confirm Remove the Following Test Definition?</h5>',
                '<span><strong>{{td_name}}</strong></span>'
            ].join(''),
            title: 'Remove Test',      
            env: { td_name: td_name }, 
            onOK: function () {
                $scope.tdActions.deleteTest(td_name);
            }
        });
    };
    $scope.popupCopyTest= function(td) {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">New Test</span>',
                    '<input type="text" class="form-control" ',
                            'ng-model="result.name" placeholder="Name">',
                    '<span class="input-group-addon">Based On `' + td.name + '\'</span>',
                '</div>'
            ].join(''),
            title: 'Copy Test',      
            env: { result: { name: '' } }, 
            disableOK: '(!result.name)',
            onOK: function (result) {
                var shouldSave = true;
                angular.forEach($scope.testDefinitions, function(testDefinition) {
                    if(result.name === testDefinition.name) shouldSave = false;
                });
                if(shouldSave) $scope.tdActions.copyTest(td.name, result.name);
            }
        });
    };
    $scope.popupAddSuiteToTest= function(td, s_idx) {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">',
                        '<i class="glyphicon glyphicon-edit"></i>',
                    '</span>',
                    '<span class="input-group-addon">Name</span>',
                    '<input type="text" class="form-control" ',
                            'ng-model="result.name" ',
                            'placeholder="Suite Name">',
                '</div>'
            ].join(''),
            title: 'Add Suite',         
            env: { result: { name: '' } }, 
            onOK: function (result) {
                $scope.tdActions.newSuite(td.name, result.name, s_idx);
            }
        });
    };
    $scope.popupRemoveSuiteFromTest= function(td, s_name) {
        Popup.open({
            template: [
                '<h5>Confirm Remove the Suite?</h5>',
                '<span><strong>{{s_name}}</strong></span>'
            ].join(''),
            title: 'Remove Suite',      
            env: { s_name: s_name }, 
            onOK: function () {
                $scope.tdActions.deleteSuite(td.name, s_name);
            }
        });
    };
    $scope.popupCopySuiteOfTest= function(td, s_name) {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">New Suite</span>',
                    '<input type="text" class="form-control" ',
                            'ng-model="result.name" placeholder="Name">',
                    '<span class="input-group-addon">Based On `' + s_name + '\'</span>',
                '</div>'
            ].join(''),
            title: 'Copy Suite',      
            env: { result: { name: '' } }, 
            disableOK: '(!result.name)',
            onOK: function (result) {
                $scope.tdActions.copySuite(td.name, s_name, result.name);
            }
        });
    };
    $scope.popupAddCaseToSuite = function(td, s_name, c_idx) {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">',
                        '<i class="glyphicon glyphicon-edit"></i>',
                    '</span>',
                    '<span class="input-group-addon">Name</span>',
                    '<input type="text" class="form-control" ',
                            'ng-model="result.name" ',
                            'placeholder="Case Name">',
                '</div>'
            ].join(''),
            title: 'Add Case To Suite',         
            env: { result: { name: '' } }, 
            onOK: function (result) {
                $scope.tdActions.newCase(td.name, s_name, result.name, c_idx);
            }
        });
    };
    $scope.popupRemoveCaseFromSuite = function(td, s_name, c_idx) {
        var case_ = td.suites[s_name].cases[c_idx];
        if(case_) Popup.open({
            template: [
                '<h5>Confirm Remove the Case?</h5>',
                '<span><strong>{{c_name}}</strong></span>'
            ].join(''),
            title: 'Remove Case',      
            env: { c_name: case_.name }, 
            onOK: function () {
                $scope.tdActions.deleteCase(td.name, s_name, case_.name, c_idx);
            }
        });
    };
    $scope.expandTargets = function(case_) {
        case_.targetsArr = case_.targetsArr || [];
        var pos = 0;
        angular.forEach(case_.targets, function(value, key) {
            case_.targetsArr[pos] = case_.targetsArr[pos] || { };
            case_.targetsArr[pos].varName = key;
            case_.targetsArr[pos].configName = value;
            pos ++;
        });
        case_.targetsArr.splice(pos);
        return case_.targetsArr;
    }
    $scope.popupRemoveTargetFromCase = function(td, suiteName, case_, t_idx) {
        var t = case_.targetsArr[t_idx];
        if(case_) Popup.open({
            template: [
                '<span><strong>{{varName}}</strong> as target <strong>{{configName}}</strong></span>'
            ].join(''),
            title: 'Confirm Remove this Target?',      
            env: t, 
            onOK: function () {
                var caseSet = td.suites[suiteName].cases,
                    c_idx = Number.NaN,
                    targets = { };
                for(var i = 0; i < caseSet.length; i ++) {
                    if(caseSet[i] === case_)
                        c_idx = i;
                }
                angular.extend(targets, case_.targets);
                delete targets[t.varName];
                console.log(targets);
                console.log(t.varName);
                $scope.tdActions.setTargets(td.name, suiteName, case_.name, c_idx, targets);
            }
        });
    };
    $scope.popupAddTargetToCase = function(td, suiteName, case_) {
        var id = Date.now();

        $scope[id] = function(targets) {
            Popup.open({
                template: 
                    '<div class="input-group">' +
                        '<span class="input-group-addon"><i class="glyphicon glyphicon-edit"></i></span>' +
                        '<span class="input-group-addon">Set</span>' +
                        '<input type="text" class="form-control" ng-model="result.name" placeholder="Case Variable Name">' +
                        '<span class="input-group-addon">To</span>' +
                        '<input type="text" class="form-control"' +
                               'ng-model="result.configName" placeholder="Saved Target Name"' +
                               'typeahead="type for type in validTargets | filter:$viewValue">' +
                    '</div>',
                title: 'Add a test target to case',      
                env: {
                    validTargets: targets,
                    result: { configName: '', name: '' },
                    checkValid: function(result) {
                        if(!result.name || !result.configName) return false;
                        if(targets.indexOf(result.configName) >= 0) return true;
                        return targets.some(function(t){ 
                            try { return eval('new RegExp(' + result.configName + ')').exec(t); }
                            catch(err) { return null; }
                        });
                    }
                }, 
                disableOK: '!checkValid(result)',
                onOK: function (data) {
                    var caseSet = td.suites[suiteName].cases,
                        c_idx = Number.NaN,
                        targets = { };
                    for(var i = 0; i < caseSet.length; i ++) {
                        if(caseSet[i] === case_)
                            c_idx = i;
                    }
                    angular.extend(targets, case_.targets);
                    targets[data.name] = data.configName;
                    $scope.tdActions.setTargets(td.name, suiteName, case_.name, c_idx, targets);
                }
            });
            delete $scope[id];
        };
        $scope.tdActions.briefTestTargets(id);
    };
    $scope.popupEditCase = function(td, s_name, c_idx, case_) {
        Popup.openEditor({
            title: 'Case `' + case_.name + '\'',
            content: case_.content,
            type: 'javascript',
            onSave: function(content) {
                $scope.tdActions.putCase(td.name, s_name, case_.name, c_idx, content);
            }
        });
    };
    var listeners = {
        updateTestDefinition: function(td) {
            console.log('Update: ' + td.name + ', ' + td.modification);
            $scope.$apply(function(scope) {
                scope.testDefinitions[td.name] = td;
            });
        },
        deleteTestDefinition: function(td_name) {
            console.log('Delete: ' + td_name);
            $scope.$apply(function(scope) {
                delete scope.testDefinitions[td_name];
            });
        },
        briefTestTargets: function(targets, actionId) {
            if(typeof $scope[actionId] === 'function') 
                $scope[actionId](targets);
        }
    };
    angular.forEach(listeners, function(value, name) {
        Server.removeAllListeners(name);
        Server.on(name, value); 
    });

    $scope.$watch(function() { return $scope.name; }, function() {
        if($scope.name) $scope.tdActions.listTest();
    });

    window.$tds = $scope.testDefinitions;
}]);