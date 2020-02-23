'use strict';

var creConsoleApp = 
window.creConsoleApp = angular.module('creConsoleApp', [
    'cre.services',
    'cre.terminal',
    'cre.notifier',
    'ui.bootstrap'
])
.controller('creConsoleMain', [
    '$scope', '$modal', 'Server', 'ServerStates', 'Events', 'StateMachine', 'Popup', 
    function($scope, $modal, Server, ServerStates, Events, StateMachine, Popup) {   

    Events.on('resize', function() { $scope.$apply(); });
    $scope.$watch(function() { return {
        width: window.document.body.clientWidth,
        height: window.document.body.clientHeight
    }; }, function(nValue) {
        $scope.termWidth = nValue.width;
        $scope.termHeight = nValue.height;
    }, true);
 
    Server.removeAllListeners('initTitle');
    Server.on('initTitle', function(t) { window.document.title = t; });
    Server.removeAllListeners('consoleData');
    Server.on('consoleData', function(d) { Events.emit('serverData', d); });
    Events.removeAllListeners('userInput');
    Events.on('userInput', function(c) { Server.emit('userInput', c); });
    Events.removeAllListeners('titleChange');
    Events.on('titleChange', function(title) { window.document.title = title; });
    Events.removeAllListeners('termResized');
    Events.on('termResized', function(cols, rows) {
        $scope.rows = rows; $scope.cols = cols;
        Server.emit('resizeConsole', cols, rows); 
    });

    var conn = location.search.match(/.*target=(.*)/);
    if(conn) conn = conn[1];
    else conn = "";
    Server.on('name', function() {
        Server.removeAllListeners('error');
        Server.on('error', function(msg) { Events.emit('notifyError', msg); });
        Server.removeAllListeners('info');
        Server.on('info', function(msg) { Events.emit('notifyInfo', msg); });
        Server.emit('requestConsole', conn, $scope.cols, $scope.rows);        
    });
    Server.subscribe('console');

    Server.state(function(newState) {
        if(newState === 'connected') {
            Server.subscribe('console');
            console.log('reconnecting');
        }
    });
}]);