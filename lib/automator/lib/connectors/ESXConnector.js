var Util = require(__dirname + '/../../../Util.js');
var SSHConnector = require(__dirname + '/SSHConnector.js');

exports.Connector = SSHConnector.Connector;
exports.renderResult = SSHConnector.renderResult;
exports.translateStatus = SSHConnector.translateStatus;
exports.validateOperation = SSHConnector.validateOperation;
exports.__defineGetter__('type', function(){ return 'esx'; });
exports.validataType = function(type) {
    if(typeof type !== 'string') return false;
    if(type.match(/^[Ss]{2}[Hh]$/)) return true;
    if(type.match(/^[Ee][Ss][Xx]$/)) return true;
    else return false;
}
