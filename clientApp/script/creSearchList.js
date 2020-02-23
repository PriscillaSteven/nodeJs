'use strict';


angular.module('cre.searchList', ['cre.services'])
.filter('creSearchListOrderBy', ['orderByFilter', function(orderByFilter) {
	return function() {
		//return arguments[0];
		var args = arguments;
		if(angular.isArray(args[0])) {
			return orderByFilter(args[0], args[1], args[2]);
		} else if(angular.isObject(args[0])) {
			var values = [];
			angular.forEach(args[0], function(value, idx) {
				value._$idx = idx;
				values[values.length] = value;
			});
			return orderByFilter(values, args[1], args[2]);
		} else return null;
	};
}])
.filter('creSearchListFilter', ['filterFilter', function(filterFilter) {
	return function() {
		var args = arguments;
		if(angular.isArray(args[0])) {
			return filterFilter(args[0], args[1], args[2]);
		} else if(angular.isObject(args[0])) {
			var result = { };
			angular.forEach(args[0], function(item, entry) {
				result[entry] = filterFilter([item], args[1], args[2])[0];
				if(!result[entry]) delete result[entry];
			});
			return result;
		} else return null;
	};
}])
.directive('creSearchListHelper', [function() {
    return function(scope) {
        if(scope.$last && angular.isFunction(scope._$update))
            scope._$update();
        scope.$on('$destroy', function() {
            scope._$update();
        })
    }
}])
.directive('creSearchList', ['$parse', function($parse) {
	return {
        restrict: 'EA',
		scope: true,
		transclude: true,
		replace: false,
		template: 
			'<div class="input-group">' +
                '<span ng-repeat-start="_$entry in _$filterInfo" class="input-group-addon">{{_$entry.header}}</span>' +
                '<input ng-repeat-end class="form-control" ng-model="_$itemFilter[_$entry.name]" placeholder="{{_$entry.placeholder}}">' +
                '<span class="input-group-addon" ng-if="(_$actions.length > 0)"></span>' +
                '<div class="input-group-btn" ng-if="(_$actions.length > 0)">' +
                    '<button class="btn btn-default" ng-repeat="_$action in _$actions" ng-click="_$action.action()">{{_$action.name}}</button>' +
                '</div>' +
            '</div>' +
            '<hr>' +
            '<div class="panel-group">' +
                '<div class="panel panel-default" ng-show="(_$childrenCount === 0) && (!!_$emptyMessage)">' +
                    '<div class="panel-heading">{{_$emptyMessage}}</div>' +
                '</div>' +
                '<div ng-transclude style="border: none;" class="panel panel-default" cre-search-list-helper></div>' +
            '</div>',
        compile: function compile(tElement, tAttrs) {
			var repeat = window.document.createAttribute('ng-repeat');
            repeat.nodeValue = tAttrs.items;
            repeat.nodeValue += ' | creSearchListFilter: _$itemFilter';
            if(tAttrs.orderBy) {
                repeat.nodeValue += ' | creSearchListOrderBy: ';
                repeat.nodeValue += angular.toJson($parse(tAttrs.orderBy)());
                if(typeof tAttrs.reverse !== 'undefined') 
                	repeat.nodeValue += ': true';
			}
			tElement[0].children[2].children[1].attributes.setNamedItem(repeat);

        	return function(scope, iElemnet, iAttrs) {
    			scope._$emptyMessage = iAttrs.emptyMessage;

    			var filter = scope.$eval(iAttrs.filter);
				scope._$filterInfo = [ ];
				scope._$itemFilter = { };
				angular.forEach(filter, function(v, k) {
					scope._$itemFilter[k] = '';
					scope._$filterInfo.push({ 
						name: k, header: v.header,
						placeholder: v.placeholder
					});
				});

				var actions = scope.$eval(iAttrs.actions);
				if(angular.isArray(actions)) {
					scope._$actions = [];
					angular.forEach(actions, function(v) {
						if(v.name) scope._$actions.push({
							name: v.name,
							action: function() { scope.$eval(v.action); }
						});
					});
				} else scope._$actions = [];

                var saveCountExpr = iAttrs.saveCount;

				scope._$childrenCount = 0;
				scope._$update = function(index) {
	                setTimeout(function() { 
                        if(typeof saveCountExpr === 'string')
                            scope.$eval('( ' + saveCountExpr + ' ) = ( ' + scope._$childrenCount + ' )');
	                    scope.$apply();
	                }, 0);
				};

				var items = angular.element(iElemnet[0].children[2]);
	            scope.$watch(function() {
	                return items.children().length - 1;
	            }, function(n) { scope._$childrenCount = n; }); 
    		};
        }
	};
}]);