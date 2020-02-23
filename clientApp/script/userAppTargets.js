'use strict';

creUserApp.controller('creUserTargets', ['$scope', 'Popup', 'Server', function($scope, Popup, Server) {
    $scope.allTestTargets = { };
    $scope.targetActions = {
        'newTarget': function(t, n) { Server.emit('newTestTarget', t, n); },
        'listTargets': function() { Server.emit('listAllTestTargets'); },
        'deleteTarget': function(n) { Server.emit('deleteTestTarget', n); },
        'saveTarget': function(n, config) { Server.emit('putTestTarget', n, config); },
        'switchTargetLockStatus': function(n) { Server.emit('switchTestTargetLockStatus', n); }
    };
    $scope.popupAddNewTarget = function() {
        Popup.open({
            template: 
                '<div class="input-group">' +
                    '<span class="input-group-addon"><i class="glyphicon glyphicon-edit"></i></span>' +
                    '<span class="input-group-addon">Type</span>' +
                    '<input type="text" class="form-control"' +
                           'ng-model="result.type" placeholder="Target Type"' +
                           'typeahead="type for type in validTypes | filter:$viewValue">' +
                    '<span class="input-group-addon">Name</span>' +
                    '<input type="text" class="form-control" ng-model="result.name" placeholder="Target Name">' +
                '</div>',
            title: 'Add a new custom target action',
            env: {
                validTypes: ['ssh', 'esx'],
                result: { type: '', name: '' }
            }, 
            disableOK: '(!result.name) || (validTypes.indexOf(result.type) < 0)',
            onOK: function (data) {
                var shouldSave = true;
                angular.forEach($scope.allTestTargets, function(key, target) {
                    if(data.name === target.name && data.type === target.type)
                        shouldSave = false;
                });
                if(shouldSave) 
                    $scope.targetActions.newTarget(data.type, data.name);
            }
        });
    };
    
    $scope.popupDeleteTarget = function(target) {    
        Popup.open({
            template: [
                '<h5>Confirm Remove the Following Test Target?</h5>',
                '<span><strong>{{t_name}}</strong></span>'
            ].join(''),
            title: 'Remove Target',      
            env: { t_name: target.name }, 
            onOK: function () {
                $scope.targetActions.deleteTarget(target.name);
            }
        });
    };

    $scope.switchLock = function(target) {
        $scope.targetActions.switchTargetLockStatus(target.name);
    }
    
    Server.on('updateTestTarget', function(target) { 
        if(!angular.isObject(target.config)) target.config = { };
        if(target.deleteTarget)
            delete $scope.allTestTargets[target.name];
        else {
            $scope.allTestTargets[target.name] = $scope.allTestTargets[target.name] || { };
            angular.extend($scope.allTestTargets[target.name], target);
        }
        $scope.$apply();
    });

    $scope.targetActions.listTargets();
    
    $scope.$on('$destory', function() {
        delete $scope.allTestTargets;
    });

    $scope.openConsole = function(target) {
        window.open(
            location.protocol + '//' + location.host + '/' + 'console?target=' + $scope.targetUser + '/' + target.name, 
            '', 'resizable=yes,width=800,height=600'
        );
    }
    window.$targets = $scope.allTestTargets;
}]);
