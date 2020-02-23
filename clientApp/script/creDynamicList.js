'use strict';

angular.module('cre.dynamicList', ['cre.services', 'ui.bootstrap'])
.directive('creDynamicListHelper', [function() {
    return function(scope) {
        if(scope.$last && angular.isFunction(scope._$update))
            scope._$update();
        scope.$on('$destroy', function() {
            scope._$update();
        })
    }
}])
.directive('creDynamicList', ['Events', function(Events) {
	return {
        restrict: 'EA',
		scope: true,
		replace: true,
        template: function(tElement, tAttrs) {
            var hasItems = (tAttrs.items ? true : false),
                headingParts = [
                    '<span class="pull-right glyphicon" ng-class="{',
                        "'glyphicon-chevron-down': _$expanded, ",
                        "'glyphicon-chevron-right': !_$expanded",
                    '}" ng-click="_$toggleExpand()" ', 
                    'ng-show="' + hasItems + '" title="Toggle Detail"></span>',
                    '<span class="pull-right glyphicon" ng-show="',
                        '((!!_$entryRemoveExpression) || (!!_$entryAddExpression)) && _$expanded',
                    '" ng-click="_$editing = !_$editing" ng-class="{',
                        "'glyphicon-ok-circle': _$editing, ",
                        "'glyphicon-edit': !_$editing",
                    '}" title="Toggle Edit">&nbsp;</span>',
                    '<span ng-show="' + hasItems + '" class="pull-right">&nbsp;&nbsp;&nbsp;&nbsp;</span>'
                ],
                bodyParts = [],
                otherParts = [];
            angular.forEach(tElement.children(), function(value) {
                var cl = value.attributes['class'];
                if(cl) cl = cl.value;
                cl = cl || '';
                if(cl.indexOf('heading-transclude') >= 0) headingParts.push(value.outerHTML);
                else if(cl.indexOf('body-transclude') >= 0) bodyParts.push(value.outerHTML);
                else otherParts.push(value.outerHTML);
            });
            return [
                '<div class="panel panel-default" ng-class=\'{',
                        '"panel-default": !_$type, ',
                        '"panel-success": _$type === "success",',
                        '"panel-danger": _$type === "danger",',
                        '"panel-info": _$type === "info"',
                    '}\'>',
                    '<div class="panel-heading">',
                        headingParts.join('\n'),
                    '</div>',                        
                    '<div class="panel-body" ',
                        'ng-show="' + ((bodyParts.length > 0) ? '_$expanded' :'false') + '">',
                        bodyParts.join('\n'),
                    '</div>',
                    ((tAttrs.listStyle === 'panel') ? [
                        '<div class="panel-body panel-group" ng-if="_$expanded"  style="padding:5px;">',
                            '<div class="panel panel-default" style="border: none;" cre-dynamic-list-helper',
                                (tAttrs.items ? 'ng-repeat="' + tAttrs.items + '">' : '>'),
                                otherParts.join('\n'),
                            '</div>',
                        '</div>',
                    ].join('\n') : [
                        '<ul class="list-group" ng-if="_$expanded && ' + (tAttrs.items ? 'true': 'false') + '">',
                            '<li class="list-group-item" cre-dynamic-list-helper',
                                (tAttrs.items ? 'ng-repeat="' + tAttrs.items + '">' : '>'),
                                otherParts.join('\n'),
                            '</li>',
                        '</ul>',
                    ].join('\n')),
                '</div>'
            ].join('\n');
        },
        link: function(scope, iElemnet, iAttrs) {     
            // Initialise all local varibles to make them independent from parent.
            scope._$listExpandExpression = iAttrs.listExpanded;
            scope._$listCollapsedExpression = iAttrs.listCollapsed;
            scope._$entryRemoveExpression = iAttrs.entryRemove;
            scope._$entryAddExpression = iAttrs.entryAdd;
            scope._$type = iAttrs.type;
            scope._$expanded = iAttrs.initialOpen || false;
            scope._$editing = false;    
            scope.$on('_$dlcollapse', function() { scope._$expanded = false; });
            scope._$toggleExpand = function() {
                if(scope._$expanded) scope.$broadcast('_$dlcollapse');
                else scope._$expanded = true;
            };
            scope.$watch(function() { return scope._$expanded; }, function() {
                if(scope._$expanded) scope.$eval(scope._$listExpandExpression);
                else scope.$eval(scope._$listCollapsedExpression);
            });
            scope._$update = function() { setTimeout(function() { scope.$apply(); }, 0); }
            scope._$getItem = function(index) {
                for(var i = 0; i < iElemnet[0].children[2].children.length; i ++) {                    
                    var elem = angular.element(iElemnet[0].children[2].children[i]),
                        func = elem.attr('editing-function');
                    if((func === 'add') || (func === 'remove')) continue;
                    else if(index === 0) return elem.scope();
                    else index -= 1;
                }
            }
            var addEntryTemplate = function(index) {
                    return [
                        '<p editing-function="add" class="alert-success" style="margin: 0; text-align:center" ',
                            'onmouseover="this.innerText=\'Add a new entry ...\'" ',
                            'onmouseleave="this.innerText=\'&nbsp;\'" ',
                            'onclick="var s = angular.element(this).scope(); s.$eval(s._$entryAddExpression, { $index: ' + index + ' }); s.$apply();">',
                            '&nbsp;',
                        '</p>'
                    ].join('');
                },
                removeEntryTemplate = function(index, x, y, w, h) {
                    return [
                        '<div editing-function="remove" class="alert-danger" style="',
                            'left: ' + x + 'px; top: ' + y + 'px; width: ' + w + 'px; height: ' + h + 'px; ',
                            'margin: 0; text-align:center; vertical-align:middle; ',
                            'position: absolute; opacity: 0.5; z-index: 1000;"',
                            'onmouseover="this.children[0].innerText = \'Remove this entry ...\'" ',
                            'onmouseleave="this.children[0].innerText = \'&nbsp;\'" ',
                            'onclick="var s = angular.element(this).scope()._$getItem(' + index + '); s.$eval(s._$entryRemoveExpression, s); s.$apply();">',
                            '<span style="display: inline-block; line-height:' + h + 'px;',
                                'vertical-align:middle; text-align:center;">',
                                '&nbsp;',
                            '<span>',
                        '</div>'
                    ].join('');
                },
                lastSig = '',
                updateListEntries = function() {
                    var listGroup = angular.element(iElemnet[0].children[2]);
                    if(!listGroup[0]) return;
                    var newSig = 
                        '' + scope._$editing + listGroup.children().length + 
                        listGroup[0].clientHeight + listGroup[0].clientWidth;
                    if(newSig === lastSig) {
                        //console.log('DL: Early return');
                        return;
                    }
                    //console.log('DL: Updating ...');
                    lastSig = newSig;
                    if(listGroup.children().length === 0) 
                        scope._$editing = true;
                    // First remove all editing helpers and check each entry content
                    angular.forEach(listGroup.children(), function(entry, index) {
                        var elem = angular.element(entry),
                            func = elem.attr('editing-function');
                        if((func === 'add') || (func === 'remove')) elem.remove();
                    });
                    // Then add helpers if needed
                    if(scope._$editing) {
                        var idxShift = 0;
                        if(scope._$entryAddExpression) {
                            listGroup.prepend(addEntryTemplate(0));
                            idxShift -= 1;
                        }
                        angular.forEach(listGroup.children(), function(entry, index) {
                            if(index + idxShift < 0) return;
                            var elem = angular.element(entry);
                            if(scope._$entryAddExpression) 
                                elem.after(addEntryTemplate(index + 1 + idxShift));
                            if(scope._$entryRemoveExpression) {
                                listGroup.append(removeEntryTemplate(index + idxShift, 
                                    elem[0].clientLeft + elem[0].offsetLeft, 
                                    elem[0].clientTop + elem[0].offsetTop,
                                    elem[0].clientWidth, elem[0].clientHeight
                                ));
                            }
                        });
                    }
                };
            scope.$watch(function() {
                var listGroup = angular.element(iElemnet[0].children[2]);
                if(!listGroup[0]) return '';
                return '' + scope._$editing + listGroup.children().length +
                    listGroup[0].clientHeight + listGroup[0].clientWidth;
            }, function() { 
                if(!angular.element(iElemnet[0].children[2])[0]) return '';
                //console.log('DL: Invalidating ...')
                Events.invalidate('$dynamicListUpdate', 100);
            }, true);  
            Events.on('$dynamicListUpdate', updateListEntries);
            scope.$on('$destroy', function() {
                Events.removeListener('$dynamicListUpdate', updateListEntries);
                //console.log('DL: Removed updater.');
            })
		}
	};
}]);