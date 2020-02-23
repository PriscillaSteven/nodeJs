'use strict';

/* Services */

angular.module('cre.services', ['ui.bootstrap', 'ui.ace'])

.factory('StateMachine', function(){
    var state = { };
    // Debug
    window.$state = state;
    return {
        get: function(key) { 
            if(!state[key]) state[key] = [];
            return state[key][state[key].length - 1];
        },
        pop: function(key) { 
            if(!state[key]) state[key] = [];
            return state[key].pop();
        },
        push: function(key, value) { 
            if(!state[key]) state[key] = [];
            return state[key].push(value);
        }
    };
})

.factory('Events', function(){
    var ee = new EventEmitter();    
    // Debug
    window.$events = ee;
    // Global window events.
    var invalidTimers = { };
    window.onload = function() { ee.emit('load'); };
    window.onresize = function() { ee.emit('resize'); };
    return {
        on: function() { ee.on.apply(ee, arguments); },
        emit: function() { ee.emit.apply(ee, arguments); },
        removeListener: function() { ee.removeListener.apply(ee, arguments); },
        removeAllListeners: function() { ee.removeAllListeners.apply(ee, arguments); },
        off: function() { ee.off.apply(ee, arguments); },
        invalidate: function(target, period) {
            if(!target) target = 'invalid';
            if(!period) period = 500;
            if(invalidTimers[target]) return; //clearTimeout(invalidTimers[target]);
            invalidTimers[target] = setTimeout(function() {
                invalidTimers[target] = undefined;
                ee.emit(target);
            }, period);
        }
    };
})

.factory('Server', function(){
    var socket = io.connect('/app'),
        _state = 'disconnected',
        _stateNotify = null,
        stateChange = function(newState) {
            if(_state === newState) return;
            _state = newState;
            if(typeof _stateNotify === 'function')
                _stateNotify(_state);
        };
    socket.on('error', function() { 
        console.log('Recieved error from server:')
        console.dir(arguments);
    });
    socket.on('connect', function() { stateChange('connected'); });
    socket.on('connecting', function() { stateChange('connecting'); });
    socket.on('disconnect', function() { stateChange('disconnected'); });
    socket.on('connect_failed', function() { stateChange('disconnected'); });
    socket.on('error', function() { stateChange('disconnected'); });
    socket.on('reconnect_failed', function() { stateChange('disconnected'); });
    socket.on('reconnect', function() { stateChange('connected'); });
    socket.on('connecting', function() { stateChange('connecting'); });

    return {
        emit: function(){ 
            // console.log('Emitting:');
            // console.dir(arguments);
            socket.emit.apply(socket, arguments); 
         },
        on: function() { socket.on.apply(socket, arguments); },
        once: function() { socket.once.apply(socket, arguments); },
        removeListener: function() { socket.removeListener.apply(socket, arguments); },
        removeAllListeners: function() { socket.removeAllListeners.apply(socket, arguments); },
        subscribe: function(user) { socket.emit('subscribe', user); },
        state: function(callback) { 
            if(typeof callback === 'function') _stateNotify = callback;
            return _state;
        }
    };
})

.factory('Popup', ['$modal', 'Events', function($modal, Events) {
    return {
        open: function(options) {
            options = options || { };
            options.env = options.env || { };
            options.env.result = options.env.result || { };

            $modal.open({
                template: 
                    '<div>' +
                        '<div class="modal-header" ng-show="!!title">' +
                            '<h4>{{title}}</h4>' +
                        '</div>' +
                        '<div class="modal-body">' + 
                            (options.template || '') +
                        '</div>' +
                        '<div class="modal-footer">' +
                            '<button class="btn btn-primary" ng-disabled="' +
                            (options.disableOK || 'false') +
                            '" ng-show="' +
                            (options.showOKBtn || 'true') +
                            '" ng-click="ok()">' +
                            (options.textOKBtn || 'OK') + '</button>' +
                            '<button class="btn btn-warning" ng-show="' +
                            (options.showCancelBtn || 'true') +
                            '" ng-click="cancel()">' +
                            (options.textCancelBtn || 'Cancel') + '</button>' +
                        '</div>' +
                    '</div>',
                controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
                    angular.forEach(options.env, function(value, key){
                        $scope[key] = value;
                    });
                    $scope.title = options.title || '';
                    $scope.ok = function () { $modalInstance.close($scope.result); };
                    $scope.cancel = function () { $modalInstance.dismiss('cancel'); };
                }],
                backdrop: options.backdrop || false,
                keyboard: options.keyboard || false
            }).result.then(function(data) {
                if(angular.isFunction(options.onOK)) 
                    options.onOK(data);
            }, function() {
                if(angular.isFunction(options.onCancel)) 
                    options.onCancel();
            });
        },
        openEditor: function(options) {
            options = options || { };
            $modal.open({
                template: [
                    '<div>',
                        '<div class="modal-header" ng-show="!!title">',
                            '<h4>{{title}}</h4>',
                        '</div>',
                        "<div class='modal-body' style='padding: 0'>",
                            "<div ui-ace=\"{ mode: editor.mode, onLoad: aceLoad }\" ",
                                "ng-model='editor.content'",
                                "readonly='" + (options.readonly || 'false') + "'",
                                "ng-style='{ height: editor.size.height + \"px\" }'>",
                            "</div>",
                        '</div>',
                        '<div class="modal-footer" style="margin-top: 0">',
                            "<div style='text-align: center; width: 100%'>",
                                "<span><code>",
                                    "{{editor.cursorPos.row + 1}} : {{editor.cursorPos.column + 1}}",
                                "</code></span>",
                            "</div>",
                            '<button class="btn btn-primary"',
                                'ng-disabled="' + (options.readonly || 'false') + '"',
                                'ng-click="ok()">' + (options.readonly ? 'Readonly' : 'Save') + '</button>',
                            '<button class="btn btn-warning" ng-click="cancel()">Close</button>',
                        '</div>',
                    '</div>'
                ].join('\n'),
                controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
                    angular.forEach(options.env, function(value, key){
                        $scope[key] = value;
                    });
                    $scope.editor = { 
                        content: options.content || '', 
                        mode: options.mode || 'javascript',
                        cursorPos: { row: 0, column: 0 },
                        size: {
                            width: window.innerWidth - 50,
                            height: window.innerHeight - 250
                        }
                    };
                    $scope.title = options.title || '';
                    $scope.ok = function () { $modalInstance.close($scope.editor.content); };
                    $scope.cancel = function () { $modalInstance.dismiss('cancel'); };
                    $scope.aceLoad = function(editor) {
                        console.log('editor loading');
                        var cursorMon = function() {
                                setTimeout(function() {
                                    $scope.editor.cursorPos = 
                                        editor.session.selection.getCursor();
                                    $scope.$apply();  
                                }, 0);
                            },
                            resizer = function() {
                                setTimeout(function() {   
                                    $scope.editor.size = {
                                        width: window.innerWidth - 50,
                                        height: window.innerHeight - 250
                                    };
                                    $scope.$apply();  
                                }, 0);
                            };
                        editor.session.selection.on("changeCursor", cursorMon);
                        if(!options.readonly) editor.commands.addCommand({
                            name: 'saveFile',
                            bindKey: {
                                win: 'Ctrl-s',
                                linux: 'Ctrl-s',
                                mac: 'Command-s',
                                sender: 'editor|cli'
                            },
                            exec: function(env, args, request) {
                                if(angular.isFunction(options.onSave)) 
                                    options.onSave($scope.editor.content);
                            }
                        });
                        Events.on('resize', resizer);
                        $scope.$on('$destroy', function() {
                            editor.session.selection.off("changeCursor", cursorMon);
                            $acee.commands.removeCommand('saveFile');
                            Events.off('resize', resizer);
                            console.log('editor destroy');
                        });
                        resizer();
                        window.$acee = editor;
                    };
                }],
                backdrop: options.backdrop || false,
                keyboard: options.keyboard || false
            }).result.then(function(data) {
                if(angular.isFunction(options.onSave)) 
                    options.onSave(data);
            }, function() {
                if(angular.isFunction(options.onCancel)) 
                    options.onCancel();
            });
        }
    };
}])

.factory('ServerStates', ['Events', 'Server', function(Events, Server) {
    var validEventNames = [
            'allKeysOfServerStates',
            'updateServerState',
            'removeServerState',
            'logOfServerConsole'
        ], validRequests = [
            'listKeysOfServerStates',       //
            'listServerStates',             //
            'updateServerState',            //key, value
            'removeServerState',            //key
            'getServerConsole'              //
        ], res = {
            on: function(eventName, handler) {
                if(validEventNames.indexOf(eventName) < 0) 
                    throw new Error('Invalid event: ' + eventName);
                Server.on(eventName, handler);
            },
            once: function(eventName, handler) {
                if(validEventNames.indexOf(eventName) < 0) 
                    throw new Error('Invalid event: ' + eventName);
                Server.once(eventName, handler);
            },
            off: function(eventName, handler) { Server.removeListener(eventName, handler); }
        };
    angular.forEach(validRequests, function(reqName) {
        res[reqName] = function() {
            var args = [reqName];
            for(var i = 0; i < arguments.length; i++) {
                args[args.length] = arguments[i];
            }
            Server.emit.apply(undefined, args);
        };
    });
    window.$ServerStates = res;
    return res;
}])

.factory('TestHistory', ['Events', 'Server', function(Events, Server) {
    var validEventNames = [
            'updateTest',
            'updateStatusOfRunningTest',
            'updateCaseInfoOfTest',
            'updateOperationInfoOfCaseInTest',
            'updateSSHStepDetail'
        ], validRequests = [
            'launchTest',                   //testDefinitionName
            'listRunningTests',             //
            'listRangeOfTests',             //fromTime, toTime
            'getCaseInfoOfTest',            //approxRange, instanceId, suitId, caseId
            'getOperationInfoOfCaseInTest', //approxRange, instanceId, suitId, caseId, operId
            'getSSHStepDetail'              //approxRange, stepId
        ], res = {
            on: function(eventName, handler) {
                if(validEventNames.indexOf(eventName) < 0) 
                    throw new Error('Invalid event: ' + eventName);
                Server.on(eventName, handler);
            },
            once: function(eventName, handler) {
                if(validEventNames.indexOf(eventName) < 0) 
                    throw new Error('Invalid event: ' + eventName);
                Server.once(eventName, handler);
            },
            off: function(eventName, handler) { Server.removeListener(eventName, handler); },
            removeAllListeners: function(eventName) { Server.removeAllListeners(eventName); }
        };
    angular.forEach(validRequests, function(reqName) {
        res[reqName] = function() {
            var args = [reqName];
            for(var i = 0; i < arguments.length; i++) {
                args[args.length] = arguments[i];
            }
            Server.emit.apply(undefined, args);
        };
    });
    window.$TestHistory = res;
    return res;
}]);