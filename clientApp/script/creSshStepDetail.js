'use strict';

angular.module('cre.sshStepDetail', ['cre.services', 'cre.terminal'])
.directive('creSshStepDetail', ['Events', function(Events) {
	return {
        restrict: 'EA',
		scope: false,
		replace: true,
        template: function(tElement, tAttrs) {
            return [
            	'<div class="panel panel-default">',
	            	'<div class="panel-heading">',
                        '<span class="label" ng-if="' + tAttrs.end + '" ng-class="{',
                            '\'label-success\': ' + tAttrs.passed + ',',
                            '\'label-danger\': !' + tAttrs.passed,
                        '}">',
                            'Step {{(' + tAttrs.passed + ' === false) ? "Failed" : "Passed"}}',
                        '</span>',
                        '<span class="label label-warning" ng-if="!' + tAttrs.end + '">Step Running</span>',
	            		'&nbsp;&nbsp;{{' + tAttrs.name + '}}',
                        '<span class="pull-right glyphicon" ng-class="{',
                            "'glyphicon-chevron-down': _$showSum, ",
                            "'glyphicon-chevron-right': !_$showSum",
                        '}" ng-click="_$showSum = !_$showSum; _$termHidden = true;"', 
                        ' ng-init="_$showSum = false; _$termHidden = true;"></span>',
	            	'</div>',
            		'<div class="panel-body" style="padding-bottom: 0" ng-show="_$showSum">',
            			'<p><strong><em>Command: </em></strong><kbd>{{' + tAttrs.cmd + '}}</kbd></p>',
            			'<p>',
                            '<span ng-if="' + tAttrs.end + '"><strong><em>Exit: </em></strong><code>{{' + tAttrs.exitStatus + ' | json}}</code></span>',
                            '<span><strong><em>Critical: </em></strong><code>{{' + tAttrs.critical + '}}</code></span>',
            				'<span><strong><em>Start: </em></strong>',
            				'<code>{{' + tAttrs.start + ' | date:"yyyy-MM-dd HH:mm:ss.sss"}}</code></span>',
            				'<span ng-if="' + tAttrs.end + '"><strong><em>Finish: </em></strong>',
            				'<code ng-if="' + tAttrs.end + '">{{' + tAttrs.end + ' | date:"yyyy-MM-dd HH:mm:ss.sss"}}</code></span>',
            			'</p>',
            		'</div>',
                    '<div class="panel-body alert-info" style="padding: 0; text-align: center"',
                        'ng-show="_$showSum && _$termHidden" ng-click="_$termHidden = false; _$getDetail();">',
                        '<span><em>Click to load details.</em></span>',
                    '</div>',
            		'<cre-terminal ng-if="_$showSum && !_$termHidden"',
                        'in-event="{{' + tAttrs.id + '}}" style="height: 250px; border: none;">',
                    '</cre-terminal>',
            	'</div>'
            ].join('\n');
        },
        link: function(scope, iElemnet, iAttrs) { 
            scope._$getDetail = function() {
                if(iAttrs.onRequestDetail) 
                    scope.$eval(iAttrs.onRequestDetail);
            };
		}
	};
}]);