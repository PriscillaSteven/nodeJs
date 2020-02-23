'use strict';

var creWsInspectorApp = 
window.$creWsInspectorApp = angular.module('creWsInspectorApp', [
    'cre.services',
    'cre.searchList',
    'cre.dynamicList',
    'cre.notifier',
    'ui.bootstrap'
])
.controller('creWsInspectorMain', ['$scope', 'Server', 'Events', 'Popup', function($scope, Server, Events, Popup) {
    $scope.wsdlDef = {
        url: 'https://luyu-cusvr:8014/WebServiceImpl/services/LinuximagingServiceImpl?wsdl',
        //url: "https://linuxteam:8015/services/EdgeServiceImpl?wsdl",
        content: ''
    };
    $scope.services = undefined;
    $scope.invocationResultCache = undefined;
    $scope.actionText = 'Create Service'; // or `Reset Service'
    Events.on('invalid', function() { console.log('Invalidating ...'); $scope.$apply(); });
    Server.on('error', function(message) { Events.emit('notifyError', message); });
    Server.on('hasServiceWithName', function(service) { 
        if(!$scope.services) return;
        $scope.services[service] = { };
        Server.emit('listPorts', service);
        Events.invalidate();
    });
    Server.on('hasPortWithName', function(port, service) {
        if(!$scope.services) return;
        $scope.services[service] = $scope.services[service] || { };
        $scope.services[service][port] = $scope.services[service][port] || { };
        Server.emit('listMethods', service, port);
        Events.invalidate();
    });
    Server.on('hasMethodWithName', function(method, port, service) {
        if(!$scope.services) return;
        $scope.services[service] = $scope.services[service] || { };
        $scope.services[service][port] = $scope.services[service][port] || { };
        $scope.services[service][port][method] = $scope.services[service][port][method] || { };
        Server.emit('describeMethod', service, port, method);
        Events.invalidate();
    });
    Server.on('describeMethod', function(desc, method, port, service) {
        if(!$scope.services) return;
        $scope.services[service] = $scope.services[service] || { };
        $scope.services[service][port] = $scope.services[service][port] || { };
        $scope.services[service][port][method] = desc;
        $scope.services[service][port][method].name = method;
    });
    Server.on('methodInvocationResult', function(res, method, port, service) {
        if(!$scope.services) return;
        $scope.invocationResultCache[service] = $scope.invocationResultCache[service] || { };
        $scope.invocationResultCache[service][port] = $scope.invocationResultCache[service][port] || { };
        $scope.invocationResultCache[service][port][method] = res;
        Events.invalidate();
    });

    $scope.invokeMethod = function(service, port, method, overrideSrvLoc, input) {
        Server.emit('invokeMethod', service, port, method, overrideSrvLoc, input);
    };
    $scope.wsdlAction = function() {
        if($scope.actionText === 'Create Service') {
            if($scope.wsdlDef.url && (! $scope.wsdlDef.content)) {                
                $scope.services = { };
                $scope.invocationResultCache = { };
                Server.emit('loadWSDLFromURL', $scope.wsdlDef.url);
                $scope.actionText = 'Reset Service';
            } else if((! $scope.wsdlDef.url) && $scope.wsdlDef.content) {            
                $scope.services = { };
                $scope.invocationResultCache = { };
                Server.emit('loadWSDLFromContent', $scope.wsdlDef.content);
                $scope.actionText = 'Reset Service';
            } else setTimeout(function() {
                Events.emit('notifyError', 'Either Url or Content should be provided.');
            }, 0);
        } else if($scope.actionText === 'Reset Service') {
            delete $scope.services;
            delete $scope.invocationResultCache;
            $scope.actionText = 'Create Service';
        }
    };
    $scope.popupMethodDetail = function(service, port, method) {
        if(!$scope.services || 
            !$scope.services[service] || 
            !$scope.services[service][port] || 
            !$scope.services[service][port][method]) {
            Events.emit('notifyError', 'Method instance not found.');
            return;
        }      
        console.log('Getting detail of ' + method + ' ' + port + ' ' + service);
        console.log($scope.services[service][port][method]);
        Popup.open({
            template: [
                '<div class="col-md-12" style="height: 40px">',
                '    <strong><em>Input request data:</em></strong>',
                '    <button class="btn btn-sm btn-default pull-right" ng-click="invoke(usrRequest)">Invoke</button>',
                '</div>',                
                "<div ui-ace=\"{ mode: 'json' }\" ",
                    "ng-model='usrRequest'",
                    "ng-style='{ height: \"250px\" }'>",
                "</div>",
                '<div class="col-md-12">',
                '    <hr>',
                '    <strong><em>Response data:</em></strong>',
                '</div>',  
                '<pre>{{resultCache[service][port][method] | json}}</pre>',
                '<hr>',
                '<accordion close-others="false">',
                '    <accordion-group is-open="requestOpen" ng-init="requestOpen = false">',                   
                '        <accordion-heading>', 
                '            <strong><em>{{requestOpen ? "Hide" : "Show"}} request description</em></strong>',               
                '        </accordion-heading>',
                '        <pre>{{desc.request | json}}</pre>',
                '    </accordion-group>',  
                '    <accordion-group is-open="responseOpen" ng-init="responseOpen = false">',                   
                '        <accordion-heading>',      
                '            <strong><em>{{responseOpen ? "Hide" : "Show"}} response description</em></strong>',          
                '        </accordion-heading>',
                '        <pre>{{desc.response | json}}</pre>',
                '    </accordion-group>',  
                '</accordion>',
            ].join('\n'),
            title: 'Invocation detail of method `' + method + '\'',      
            env: { 
                desc: $scope.services[service][port][method],
                invoke: function(usrRequest) {
                    $scope.invokeMethod(service, port, method, '', usrRequest);
                },
                usrRequest: '{ }',
                service: service,
                port: port,
                method: method,
                resultCache: $scope.invocationResultCache
            },
            showOKBtn: 'false',
            textCancelBtn: 'Close'
        });
    };

    Server.on('name', function() { $scope.ready = true; });
    Server.subscribe('wsInspector');
    
    window.$inspector = $scope;
}]);
