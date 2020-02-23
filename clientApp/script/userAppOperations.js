'use strict';

creUserApp.controller('creUserOperations', ['$scope', 'Popup', 'Server', function($scope, Popup, Server) {
    $scope.allBuiltinOperations = { };
    $scope.allCustomOperations = { };
    $scope.operActions = {
        'getBuiltinOper': function(t, n) { 
            Server.emit('getBuiltinOperation', t, n);
        },
        'listBuiltinOpers': function() {
            Server.emit('listAllBuiltinOperations');
        },
        'getOper': function(t, n) {
            Server.emit('getCustomOperation', t, n);
        },
        'listOpers': function() {
            Server.emit('listAllCustomOperations');
        },
        'deleteOper': function(t, n) {
            Server.emit('deleteCustomOperation', t, n);
        },
        'saveOper': function(t, n, c, d) {
            Server.emit('saveCustomOperation', t, n, c, d);
        }
    };
    $scope.popupAddNewOper = function() {
        Popup.open({
            template: 
                '<div class="input-group">' +
                    '<span class="input-group-addon"><i class="glyphicon glyphicon-edit"></i></span>' +
                    '<span class="input-group-addon">Type</span>' +
                    '<input type="text" class="form-control"' +
                           'ng-model="result.type" placeholder="Operation Type"' +
                           'typeahead="type for type in validTypes | filter:$viewValue">' +
                    '<span class="input-group-addon">Name</span>' +
                    '<input type="text" class="form-control" ng-model="result.name" placeholder="Operation Name">' +
                '</div>',
            title: 'Add a new custom operation',      
            env: {
                validTypes: ['ssh', 'util', 'esx'],
                result: { type: '', name: '' }
            }, 
            disableOK: '(!result.name) || (validTypes.indexOf(result.type) < 0)',
            onOK: function (data) {
                var shouldSave = true;
                angular.forEach($scope.allCustomOperations, function(key, oper) {
                    if(data.name === oper.name && data.type === oper.type)
                        shouldSave = false;
                });
                if(shouldSave) 
                    $scope.operActions.saveOper(data.type, data.name);
            }
        });
    };
    
    $scope.popupDeleteOper = function(oper) {    
        Popup.open({
            template: [
                '<h5>Confirm Remove the Following Custom Operation?</h5>',
                '<span><strong>{{o_name}}</strong></span>'
            ].join(''),
            title: 'Remove Operation',      
            env: { o_name: oper.name }, 
            onOK: function () {
                $scope.operActions.deleteOper(oper.type, oper.name);
            }
        });
    };
    
    $scope.popupEditOper = function(oper) {     
        Popup.openEditor({
            title: 'Custom Operation `' + oper.name + '\'',
            content: oper.content,
            mode: 'javascript',
            onSave: function(content) {
                $scope.operActions.saveOper(oper.type, oper.name, content);
            }
        });
    };
    $scope.popupShowBuiltinOper = function(oper) {     
        Popup.openEditor({
            title: 'Builtin Operation `' + oper.name + '\'',
            content: oper.content,
            mode: 'javascript',
            readonly: true
        });
    };
    Server.on('updateBuiltinOperation', function(oper) {
        $scope.allBuiltinOperations[oper.name + '_' + oper.type] = oper;
        $scope.$apply();              
    });
    Server.on('updateCustomOperation', function(oper) { 
        if(oper.deleteOper)
            delete $scope.allCustomOperations[oper.name + '_' + oper.type];
        else $scope.allCustomOperations[oper.name + '_' + oper.type] = oper;
        $scope.$apply();
    });

    $scope.operActions.listBuiltinOpers();
    $scope.operActions.listOpers();
    
    $scope.$on('$destory', function() {
        delete $scope.allBuiltinOperations;
        delete $scope.allCustomOperations;
    });
    window.$opers = $scope.allCustomOperations;
}]);
