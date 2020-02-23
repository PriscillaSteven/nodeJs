'use strict';

angular.module('cre.notifier', ['cre.services', 'ui.bootstrap', 'ngAnimate'])
.directive('creNotifierItem', [function() {
    return {
        restrict: 'EA',
        scope: true,
        template: function(tElement, tAttrs) {
            return [
                '<alert type="_$type" style="text-align: center;"',
                    'close="_$del()">',
                    '<span>{{_$content}}</span>',
                '</alert>',
            ].join('\n');
        },
        link: function(scope, iElemnet, iAttrs) { 
            scope._$type = iAttrs.type;
            scope._$content = iAttrs.content;
            scope._$index = Number(iAttrs.index);
            scope._$del = function() { 
                delete scope._$messages[scope._$index]; 
            };
            var timeout = Number(iAttrs.timeout);
            if(timeout) setTimeout(function() {
                scope._$del();
                scope.$apply();
            }, timeout * 1000);
        }
    };
}])
.directive('creNotifier', ['Events',function(Events) {
	return {
        restrict: 'EA',
		scope: true,
        replace: true,
        template: function(tElement, tAttrs) {
            return [
                '<div class="container" style="',
                    'position: fixed; opacity: 0.8;',
                    'bottom: 0; left: 0; right: 0;',
                    'width: 100%; z-index: 100;">',
                    '<div class="row">',
                        '<div class="col-md-10 col-md-offset-1">',
                            '<cre-notifier-item ng-repeat="(_$idx, _$message) in _$messages"',
                                'type="{{_$message.type}}" timeout="{{_$message.timeout}}"',
                                'index="{{_$idx}}" content="{{_$message.content}}">',
                            '</cre-notifier-item>',
                        '</div>',
                    '</div>',
                '<div>'
            ].join('\n');
        },
        link: function(scope, iElemnet, iAttrs) { 
            var itemIdx = 0,
                infoEventName = iAttrs.infoEvent || undefined,
                errorEventName = iAttrs.errorEvent || undefined,
                infoTimeout = Number(iAttrs.infoTimeout) || 3;
            scope._$messages = { };
            // scope._$removeItem = function(idx) { delete scope._$messages[idx]; };
            if(infoEventName) Events.on(infoEventName, function(message) {
                scope.$apply(function() {
                    scope._$messages[itemIdx++] = {
                        type: 'info',
                        content: message,
                        timeout: infoTimeout
                    };
                });
            });
            if(errorEventName) Events.on(errorEventName, function(message) {
                scope.$apply(function() {
                    scope._$messages[itemIdx++] = {
                        type: 'danger',
                        content: message
                    };
                });
            });
		}
	};
}]);