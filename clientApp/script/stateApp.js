'use strict';

var creStateApp = 
window.$creStateApp = angular.module('creStateApp', [
    'cre.services',
    'cre.searchList',
    'cre.terminal',
    'cre.notifier',
    'ui.bootstrap'
])
.config(['$sceProvider', function($sceProvider) {
    // Completely disable SCE to support IE7.
    $sceProvider.enabled(false);
}])
.controller('creStateMain', [
    '$scope', '$modal', 'Server', 'ServerStates', 'Events', 'StateMachine', 'Popup', 
    function($scope, $modal, Server, ServerStates, Events, StateMachine, Popup) {
    $scope.shouldShow = function() {
        return (StateMachine.get('activeView') === 'main');
    };
    Events.on('resize', function() {
        $scope.$apply();
    });
    Server.on('error', function(message) {
        Events.emit('notifyError', message);
    });
    Server.on('info', function(message) {
        Events.emit('notifyInfo', message);
    });

    StateMachine.push('activeView', 'main');
    $scope.allStates = [];
    $scope.addNewEntry = function() {
        Popup.open({
            template: 
                '<div class="input-group">' +
                    '<span class="input-group-addon"><i class="glyphicon glyphicon-edit"></i></span>' +
                    '<span class="input-group-addon">Name</span>' +
                    '<input type="text" class="form-control" ng-model="result.name" placeholder="Desired State Name">' +
                '</div>',
            title: 'Add a Server State',      
            env: { result: { name: '' } }, 
            onOK: function (result) {
                var shouldSave = true;
                $scope.allStates.forEach(function(state) {
                    if(result.name === state.name)
                        shouldSave = false;
                });
                if(shouldSave) ServerStates.updateServerState(result.name, ''); 
            }
        });
    };
    $scope.subAction = function(state) { 
        if(state.subStatus === 'Cancel') {
            state.status = 'Edit';
            state.subStatus = 'Remove';
            ServerStates.listServerStates();
        }
        else if(state.subStatus === 'Remove') {
            Popup.open({
                template: [
                    '<div class="input-group">',
                        '<span class="input-group-addon">Name</span>',
                        '<input type="text" class="form-control" ng-model="name" disabled>',
                        '<span class="input-group-addon">Value</span>',
                        '<input type="text" class="form-control" ng-model="value" disabled>',
                    '</div>'
                ].join('\n'),
                title: 'Confirm remove this entry?',
                env: { name: state.name, value: state.value }, 
                onOK: function (result) {
                    ServerStates.removeServerState(state.name);
                    state.status = 'Removing';
                    state.subStatus = '';
                }
            });
        }
    };
    $scope.action = function(state) { 
        if(state.status === 'Edit') {
            state.status = 'Save';
            state.subStatus = 'Cancel';
        }
        else if(state.status === 'Save') {
            ServerStates.updateServerState(state.name, state.value); 
            state.status = 'Edit';
            state.subStatus = 'Remove';
        }
    };
    ServerStates.on('updateServerState', function(key, value) {
        $scope.$apply(function(scope) {
            for(var i = 0; i < scope.allStates.length; i ++) {
                if(scope.allStates[i].name === key) {
                    scope.allStates[i].value = value;
                    scope.allStates[i].status = 'Edit';
                    scope.allStates[i].subStatus = 'Remove';
                    return;
                }
            }
            scope.allStates.push({ 
                name: key, value: value,
                status: 'Edit', subStatus: 'Remove'
            });
        });
    });
    ServerStates.on('removeServerState', function(key) {
        $scope.$apply(function(scope) {
            for(var i = 0; i < scope.allStates.length; i ++) {
                if(scope.allStates[i].name === key) {
                    scope.allStates.splice(i, 1);
                    return;
                }
            }
        });
    });
    ServerStates.on('logOfServerConsole', function(data) {
        Events.emit('serverdata', data.replace(/\n/g, '\r\n'));
    });

    // Server script related.
    $scope.allServerScripts = [];
    Server.on('updateServerScript', function(script) {
        $scope.$apply(function(scope) {
            for(var i = 0; i < scope.allServerScripts.length; i ++) {
                if(scope.allServerScripts[i].name === script.name) {
                    scope.allServerScripts[i].modification = script.modification;
                    scope.allServerScripts[i].enabled = script.enabled;
                    return;
                }
            }
            scope.allServerScripts.push(script);
        });
    });
    Server.on('deleteServerScript', function(name) {
        $scope.$apply(function(scope) {
            for(var i = 0; i < scope.allServerScripts.length; i ++) {
                if(scope.allServerScripts[i].name === name) {
                    scope.allServerScripts.splice(i, 1);
                    return;
                }
            }
        });
    });
    Server.on('contentOfServerScript', function(ev) {
        Popup.openEditor({
            title: 'Server Script `' + ev.name + '\'',
            content: ev.content,
            mode: 'sh',
            onSave: function(content) {
                Server.emit('saveContentOfServerScript', ev.name, content)
            }
        });  
    });
    $scope.newScript = function() {
        Popup.open({
            template: 
                '<div class="input-group">' +
                    '<span class="input-group-addon"><i class="glyphicon glyphicon-edit"></i></span>' +
                    '<span class="input-group-addon">Name</span>' +
                    '<input type="text" class="form-control" ng-model="result.name" placeholder="Script Name">' +
                '</div>',
            title: 'Add a new server script',      
            env: { result: { name: '' } }, 
            onOK: function (result) {
                var shouldSave = true;
                $scope.allServerScripts.forEach(function(script) {
                    if(result.name === script.name)
                        shouldSave = false;
                });
                if(shouldSave) Server.emit('newServerScript', result.name);
            }     
        });
    };
    $scope.removeScript =  function(script) {
        Popup.open({
            template: [
                '<div class="input-group">',
                    '<span class="input-group-addon">Name</span>',
                    '<input type="text" class="form-control" ng-model="name" disabled>',
                '</div>'
            ].join('\n'),
            title: 'Confirm remove this script?',
            env: { name: script.name }, 
            onOK: function (result) {
                Server.emit('deleteServerScript', script.name);
            }
        });
    };
    $scope.fetchScript =  function(script) {
        Server.emit('getContentOfServerScript', script.name);
    };
    $scope.switchEnable =  function(script) {
        if(script.enabled) Server.emit('disableServerScript', script.name);
        else Server.emit('enableServerScript', script.name);
    };



    Server.on('name', function() {
        ServerStates.getServerConsole();
        ServerStates.listServerStates();
        Server.emit('listAllServerScripts');
    });
    Server.subscribe('state');

    Server.state(function(newState) {
        if(newState === 'connected')
            Server.subscribe('state');
    });
}]);