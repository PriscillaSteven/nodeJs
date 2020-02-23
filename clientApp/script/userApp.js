'use strict';

var creUserApp = angular.module('creUserApp', [
    'cre.services',
    'cre.searchList',
    'cre.dynamicList',
    'cre.notifier',
    'cre.terminal',
    'cre.sshStepDetail',
    'ngAnimate',
    'ui.bootstrap'
]).config(['$sceProvider', function($sceProvider) {
	// Completely disable SCE to support IE7.
	$sceProvider.enabled(false);
}]);
window.creUserApp = creUserApp;