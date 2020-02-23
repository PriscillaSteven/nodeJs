// var term = new Terminal({
//     //cols: 80,
//     //rows: 24,
//     useStyle: true,
//     screenKeys: true
//   });

// term.on('data', function(data) {
//     socket.emit('data', data);
// });

// term.on('title', function(title) {
//     document.title = title;
// });

// term.open(document.body);

// term.write('\x1b[31mWelcome to term.js!\x1b[m\r\n');

// socket.on('data', function(data) {
//     term.write(data);
// });

// socket.on('disconnect', function() {
//     term.destroy();
// });
'use strict';

angular.module('cre.terminal', ['cre.services'])
.directive('creTerminal', ['Events', function(Events) {
	return {
        restrict: 'EA',
		scope: true,
		replace: true,
        template: function(tElement, tAttrs) {
            return [
            	'<div class="panel panel-primary" style="margin-bottom: 0">',
            		'<div class="panel-heading" ng-show="_$title">',
            			'<h6 class="panel-title">{{_$title}}</h6>',
            		'</div>',
            		'<div class="panel-body code" style="padding: 0;',
            			'padding-left: {{_$innerPaddingLeft}}px;',
            			'padding-top: {{_$innerPaddingTop}}px;',
            			'background-color: rgb(0,0,0); height: 100%">',
            		'</div>',
            	'</div>'
            ].join('\n');
        },
        link: function(scope, iElemnet, iAttrs) { 
        	var termElem = angular.element(iElemnet[0].children[1]);
        	Terminal.brokenBold = true; // Goodbye Bold fonts
			scope._$term = new Terminal({
				cols: 10,
			    rows: 1,
				useStyle: true,
				screenKeys: true
			});
			scope._$term.open(termElem[0]);
			var fontWidth = scope._$term.element.children[0].clientWidth / 10,
				fontHeight = scope._$term.element.children[0].clientHeight,
				currentCol = 10,
				currentRow = 1;
			//console.log('term: ' + fontWidth + ':' + fontHeight);
			iAttrs.$observe('inEvent', function(value) {
				if(!value) return;
				if(!angular.isFunction(scope._$writeTerminal))
					scope._$writeTerminal = function(data) { 
						scope._$term.write(data);
					};
				if(scope._$inEventName)
					Events.removeListener(scope._$inEventName, scope._$writeTerminal);
				scope._$inEventName = value;
				Events.on(scope._$inEventName, scope._$writeTerminal);
			});
			iAttrs.$observe('outEvent', function(value) {
				if(!value) return;
				if(angular.isFunction(scope._$sendData))
					scope._$term.removeListener('data', scope._$sendData);
				scope._$sendData = function(c) { Events.emit(value, c) };
				scope._$term.on('data', scope._$sendData)
			});
			iAttrs.$observe('resizeEvent', function(value) {
				if(!value) return;
				scope._$rezied = function(col, row) { Events.emit(value, col, row) };
			});
			iAttrs.$observe('titleEvent', function(value) {
				if(!value) return;
				if(angular.isFunction(scope._$changeTitle))
					scope._$term.removeListener('title', scope._$changeTitle);
				scope._$changeTitle = function(t) { Events.emit(value, t) };
				scope._$term.on('title', scope._$changeTitle)
			});
			scope._$title = '';
			if(typeof iAttrs.noTitleBar === 'undefined') {
				scope._$term.on('title', function(t) {
					scope.$apply(function() { scope._$title = t; });
				});
			}
			var doResize = function(width, height) {
				var nCol = Math.floor(width / fontWidth),
					nRow = Math.floor(height / fontHeight);
				(nCol <= 0)  && (nCol = 1);
				(nRow <= 0)  && (nRow = 1);
				if((currentRow !== nRow) || (currentCol !== nCol)) {
					currentRow = nRow; currentCol = nCol;
					scope._$term.resize(nCol, nRow);
					if(angular.isFunction(scope._$rezied)) scope._$rezied(nCol, nRow);
				}
				scope._$innerPaddingLeft = (width - nCol * fontWidth) / 2;
				scope._$innerPaddingTop = (height - nRow * fontHeight) /2;
			}
			scope._$innerPaddingLeft = 0;
			scope._$innerPaddingTop = 0;
			scope.$watch(function() {
				return {
					width: termElem[0].clientWidth - 10,
					height: termElem[0].clientHeight - 10
				};
			}, function(nValue) {
				if((nValue.width <= 0) || (nValue.height <= 0)) return;
				doResize(nValue.width, nValue.height);
			}, true);
			var invalidate = function() { scope.$apply(); };
			scope.$on('$destroy', function() {
				if(angular.isFunction(scope._$changeTitle))
					scope._$term.removeListener('title', scope._$changeTitle);
				if(angular.isFunction(scope._$sendData))
					scope._$term.removeListener('data', scope._$sendData);
				if(angular.isFunction(scope._$writeTerminal) && scope._$inEventName)
					Events.removeListener(scope._$inEventName, scope._$writeTerminal);
				scope._$term.destroy();
				clearInterval(scope._$term._blink);
				Events.removeListener('resize', invalidate);
				console.log('Term destroying.')
			});
			Events.on('resize', invalidate);
			//doResize(termElem[0].clientWidth - 10, termElem[0].clientHeight);
			window.$te = scope._$term;
		}
	};
}]);