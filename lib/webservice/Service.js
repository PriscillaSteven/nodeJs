var util = require('util'),
    events = require('events'),
    Util = require(__dirname + '/../Util'),
    Action = require(__dirname + '/lib/Action'),
    ResourceLoader = require(__dirname + '/lib/ResourceLoader');

var notFoundMsg = 'Element not found! Possible incomplete WSDL definition.';

function setupService(srvInstance, resLoader, srvName) {
    srvInstance.services[srvName] = { };
    var ports = resLoader.searchInNamespace(resLoader._mainNamespace, ['service', srvName]);
    Util.properties(ports, function(portName) {
        srvInstance.services[srvName][portName] = { };
        var serviceLocation = ports[portName].location,
            // Find the binding
            binding = resLoader.searchInNamespace(ports[portName].bindingNamespace, ['binding', ports[portName].binding]);
        if(!binding) throw new Error("Expecting binding `" + ports[portName].binding + "', but not found.");
            // Find the portType
        var portType = resLoader.searchInNamespace(binding.portTypeNamespace, ['portType', binding.portType], true);
        if(!portType.target) throw new Error("Expecting port `" + binding.portType + "', but not found.");
        Util.properties(binding.operations, function(operName) {
            // Create new Action based on the input/output of this operation
            if(!portType.target[operName]) throw new Error("Expecting operation `" + operName + "', but not found.");
            srvInstance.services[srvName][portName][operName] = new Action(
                operName, portType.target[operName], portType.context, resLoader, serviceLocation, 
                srvInstance._typeCache, srvInstance._actionsGlobalState
            );
        });
    });
}

function Service() {
    var srvInstance = this,
        resLoader = new ResourceLoader();
	events.EventEmitter.call(srvInstance);
    srvInstance._resLoader = resLoader;
    resLoader.on('error', function(err) { srvInstance.emit('error', err); });
    resLoader.on('resReady', function() {
        try {
            Util.properties(resLoader.searchInNamespace(resLoader._mainNamespace, 'service'), function(srvName) {
                setupService(srvInstance, resLoader, srvName);
            });
        } catch(err) { 
            srvInstance.emit('error', new Error('Error parsing WSDL: ' + err.message));
            return;
        }
        srvInstance.emit('ready');
    });
    srvInstance._actionsGlobalState = { };    
    srvInstance._typeCache = { }; 
    srvInstance.services = { };
}
util.inherits(Service, events.EventEmitter);

Service.prototype.loadWSDLByURL = function(urlOpt) {
    this._resLoader.loadWSDLByURL(urlOpt);
};
Service.prototype.loadWSDLByContent = function(content) {
    this._resLoader.loadWSDLByContent(content);
};

module.exports = Service;

// Operations:
//    deleteTargetMachineList
//    modifyTargetMachineList
//    getTargetMachineByName
//    captureServer
//    addTargetMachine
//    loginNode
//    getTargetMachineList
//    getTargetMachineProtectedState
//    getDiskInfo
//    submitRestoreJob
//    getLogList
//    getBackupJobScriptByUUID
//    getBackupJobScriptByJobName
//    getBackupJobScriptByNodeName
//    getRestoreJobScriptByUUID
//    holeJobScheule
//    getSupportedFSType
//    getCurrentD2DTime
//    getCatalogItems
//    getPagedCatalogItems
//    getFileFolderWithCredentials
//    createFolder
//    removeMountPoint
//    checkRecoveryPointPasswd
//    getJobStatusList
//    getJobStatusPagingList
//    getJobHistoryList
//    runJob
//    runJobByName
//    deleteJob
//    deleteJobByJobName
//    cancelJob
//    cancelJobByJobName
//    deleteJobHistory
//    submitBackupJob
//    getMachineList
//    getRecoveryPointList
//    getDataStore
//    getFileFolderBySearch
//    startSearch
//    stopSearch
//    getScripts
//    getTargetMachinePagingList
//    addNodeByDiscovery
//    getNodeDiscoverySettings
//    getDashboardInformation
//    getJobSummaryInformation
//    validateUser
//    validateByKey
//    getJobScriptList
//    addBackupTargetIntoJobScript
//    getVersionInfo
//    getServerCapability
//    addRestoreTargetIntoBMRJob
//    validateNode
//    getVmList
//    getVmTie1List
//    verifyVirtualMachine
//    runJobByJobnameAndNodename
//    runJobByPlanIdAndNodename
//    deleteJobForNodes
//    unRegisterNodeInfo
//    getD2DServerInfo
//    isManagedByOtherServer
//    exportJobs
//    importJobs
//    getNextPage
//    getSearchResult
//    getFileVersion
//    getSearchVolList
//    addD2DServer
//    modifyD2DServer
//    deleteD2DServer
//    getD2DServerInfoList
//    resyncD2DServer2Edge
//    registerD2DServer
//    unRegisterD2DServer
//    validateRegistrationInfo
//    authD2DServer
//    updateSelfInfoToRemoteD2DServer
//    updateSelfInfoToCenterD2DServer
//    releaseD2DRegistrationInfo
//    updateBackupLocation
//    addBackupLocation
//    deleteBackupLocation
//    validateBackupLocation
//    getBackupLocationList
//    getAllBackupLocation
//    getBackupMachineList
//    getComponentStatusList
//    addLicenseKey
//    unBindLicenses
//    releaseLicensedMachine
//    getLicensedMachinePagingList
//    checkCentralLicense
//    savePlan
//    deletePlan
//    enablePlan
//    addSourceNodesToBackupPlan
//    getNodeBackupInfo
// function createAction(actionName, input, output, serviceLocation) {
// return function() {
//     console.log('Invoking ' + actionName + ' at: ' + serviceLocation);
//     console.log(util.inspect(input, { depth: null }));
//     console.log(util.inspect(output, { depth: null }));        
// }
// }