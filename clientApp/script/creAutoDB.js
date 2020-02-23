'use strict';

var creAutoDBApp = 
window.$creAutoDBApp = angular.module('creAutoDBApp', [
    'cre.services',
    'cre.searchList',
    'cre.dynamicList',
    'cre.notifier',
    'ui.bootstrap'
])
.controller('creAutoDBMain', ['$scope', 'Server', 'Events', 'Popup', function($scope, Server, Events, Popup) {
    $scope.INIT = 0;
    $scope.RETRIVING = 1;
    $scope.DONE = 2;
    $scope.DOWNLOADINGCSV = 3

    $scope.bqsetsDBName = 'auto_test_sets';
    $scope.bqsetsEntries = [];
    $scope.bqsetsStatus = $scope.INIT;
    $scope.bqinfoDBName = 'bqinfos';
    $scope.bqinfoEntries = [];
    $scope.bqinfoStatus = $scope.INIT;
    $scope.bqinfoFilter = 'SPOG';
    $scope.conf = {
        currentFilteredItemCount: 0
    };

    Events.on('invalid', function() { console.log('Invalidating ...'); $scope.$apply(); });
    Server.on('error', function(message) { Events.emit('notifyError', message); });

    Server.on('recordset', function(recordset) { 
        Events.invalidate();
    });
    Server.on('entry', function(ent) {
        if(ent['_dbname'] == $scope.bqsetsDBName)
            $scope.bqsetsEntries.push(ent);
        else if(ent['_dbname'] == $scope.bqinfoDBName)
            $scope.bqinfoEntries.push(ent);
        Events.invalidate();
    });
    Server.on('done', function(message) {
        if(message.startsWith($scope.bqsetsDBName))
            $scope.bqsetsStatus = $scope.DONE;
        else if(message.startsWith($scope.bqinfoDBName))
            $scope.bqinfoStatus = $scope.DONE;
        Events.invalidate();
    });
    $scope.downloadAllBQInfoAsCSV = function() {
        $scope.bqinfoStatus = $scope.DOWNLOADINGCSV;
        Events.invalidate();
         var result = [ 
            '"bqname"',
            '"casenumber"',
            '"passedcasenumber"',
            '"failedcasenumber"',
            '"remaincasenumber"',
            '"runmachine"',
            '"buildnumber"',
            '"status"',
            '"comment"',
            '"created_at"',
            '"updated_at"',
            '"platform"',
            '"timetaken"',
            '"owner"',
            '"user"',
            '"cmd"',
            '"password"',
            '"log"',
        ].join(",") + '\n';
        $scope.bqinfoEntries.forEach(function(ent) {
            result += [
                '"' + ent.bqname + '"',
                '"' + ent.casenumber + '"',
                '"' + ent.passedcasenumber + '"',
                '"' + ent.failedcasenumber + '"',
                '"' + ent.remaincasenumber + '"',
                '"' + ent.runmachine + '"',
                '"' + ent.buildnumber + '"',
                '"' + ent.status + '"',
                '"' + ent.comment + '"',
                '"' + ent.created_at + '"',
                '"' + ent.updated_at + '"',
                '"' + ent.platform + '"',
                '"' + ent.timetaken + '"',
                '"' + ent.owner + '"',
                '"' + ent.user + '"',
                '"' + ent.cmd + '"',
                '"' + ent.password + '"',
                '"' + ent.log + '"',
            ].join(",") + '\n';
        });
        saveAs(new Blob([result], { type: 'text/csv;charset=utf-8' }), 'allBQInfoEntries.csv');
        $scope.bqinfoStatus = $scope.DONE;
        Events.invalidate();
    }
    $scope.downloadAllBQSetsAsCSV = function() {
        $scope.bqsetsStatus = $scope.DOWNLOADINGCSV;
        Events.invalidate();
        var result = [ 
            '"branch_1"',
            '"branch_2"',
            '"product"',
            '"id"',
            '"set_name"',
            '"set_type"',
            '"set_owner"',
            '"case_number"',
            '"platform"',
            '"qateam"',
            '"scrum"',
            '"frequency"',
            '"location"',
            '"runmachine"',
            '"cmd"',
            '"comment"',
            '"user"',
            '"password"',
            '"category"',
        ].join(",") + '\n';
        $scope.bqsetsEntries.forEach(function(ent) {
            result += [
                '"' + ent.branch_1 + '"',
                '"' + ent.branch_2 + '"',
                '"' + ent.product + '"',
                '"' + ent.id + '"',
                '"' + ent.set_name + '"',
                '"' + ent.set_type + '"',
                '"' + ent.set_owner + '"',
                '"' + ent.case_number + '"',
                '"' + ent.platform + '"',
                '"' + ent.qateam + '"',
                '"' + ent.scrum + '"',
                '"' + ent.frequency + '"',
                '"' + ent.location + '"',
                '"' + ent.runmachine + '"',
                '"' + ent.cmd + '"',
                '"' + ent.comment + '"',
                '"' + ent.user + '"',
                '"' + ent.password + '"',
                '"' + ent.category_id + '"',
            ].join(",") + '\n';
        });
        saveAs(new Blob([result], { type: 'text/csv;charset=utf-8' }), 'allBQSetsEntries.csv');
        // var hiddenElement = document.createElement('a');
        // hiddenElement.href = 'data:attachment/csv,' + encodeURI(result);
        // hiddenElement.target = '_blank';
        // hiddenElement.download = 'allBQSetsEntries.csv';
        // hiddenElement.click();
        $scope.bqsetsStatus = $scope.DONE;
        Events.invalidate();
    }
    // $scope.popupEntryDetail = function(ent) {
    //     Popup.open({
    //         template: [
    //             '<pre>{{entry | json}}</pre>',
    //         ].join('\n'),
    //         title: ent.set_name,      
    //         env: { 
    //             entry: ent
    //         },
    //         showOKBtn: 'false',
    //         textCancelBtn: 'Close'
    //     });
    // };


    Server.on('name', function() { 
        $scope.ready = true; 
        //Server.emit('listEntries', $scope.bqinfoDBName);
        //Server.emit('listEntries', $scope.bqsetsDBName, 'set_name', 'HBBU');
        Events.invalidate();
    });
    Server.subscribe('AutoDB');
    
    $scope.loadDB = function (dbname, filterField, filter) {
        Server.emit('listEntries', dbname, filterField, filter);
        if(dbname == $scope.bqsetsDBName)
            $scope.bqsetsStatus = $scope.RETRIVING;
        else if(dbname == $scope.bqinfoDBName)
            $scope.bqinfoStatus = $scope.RETRIVING;   
        Events.invalidate();
    }

    window.$autodb = $scope;
}]);
