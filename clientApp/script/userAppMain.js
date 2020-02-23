'use strict';

creUserApp.controller('creUserMain', ['$scope', 'Events', 'Server', function($scope, Events, Server) {
    // Determin target user
    var userinfo = location.pathname.match(/\/([a-zA-Z\$]{5}\d{2})\/?/);
    if(userinfo) $scope.targetUser = userinfo[1];
    else if(location.pathname.match(/\/ubuntu\/?/)) {
        $scope.targetUser = 'ubuntu';
    } else {
        $scope.targetUser = '';
    }
    
    // Watch server connection status
    Server.state(function(newState) {
        if(newState === 'connected')
            Server.subscribe($scope.targetUser);
    });
    
    // Setup view switch and navigation items
    $scope.naviItems =  [
        { name: 'Tests', elClass: 'active' },
        { name: 'Targets', elClass: '' },
        { name: 'Operations', elClass: '' },
        { name: 'History', elClass: '' }
    ];
    Server.on('updateRunningTestsCount', function(count) {
        $scope.naviItems.forEach(function(item) {
            if(item.name === 'History')
                item.count = count;
        });
        $scope.$apply();
    });
    $scope.activeView = function() {
        var result = '';
        $scope.naviItems.forEach(function(item) {
            if(item.elClass === 'active') result = location.href + '/' + item.name;
        });
        return result;
    } ;
    $scope.switchView = function(to) {
        for(var i = 0; i < $scope.naviItems.length; i ++) {
            if($scope.naviItems[i].name === to) {
                $scope.naviItems[i].elClass = 'active';
                Events.emit('show' + to);
            } else $scope.naviItems[i].elClass = '';
        }
    };    
    
    // Subscribe this client
    Server.on('name', function(name) {
        $scope.$apply(function(scope) { scope.name = name; });
    });
    Server.subscribe($scope.targetUser);
    
    window.$mainScope = $scope;
        
    Events.on('resize', function() {
        $scope.$apply();
    });

    Server.on('error', function(message) {
        Events.emit('notifyError', message);
    });
    Server.on('info', function(message) {
        Events.emit('notifyInfo', message);
    });
}]);
