var Service = require(__dirname + '/../Service'),
    Util = require(__dirname + '/../../Util');

function testWSDLForProduct(host, services) {
    Util.arrayEach(services, function(srv) {
        var service = new Service,
            wsdl = host + srv + '?wsdl';
        Util.log('Testing webservice at `' + wsdl + '\':\n');
        service.loadWSDLByURL({ url: wsdl, strictSSL: false });
        service.on('ready', function() {            
            Util.properties(service.services, function(s) {
                Util.log('  Service: `' + s +'\':\n');
                Util.properties(service.services[s], function(port) {
                    Util.log('    Port: `' + s +'\':\n');
                    Util.properties(service.services[s][port], function(method) {
                        Util.log('      Method: `' + method +'\':\n');
                        var m = service.services[s][port][method];
                        // Util.log(JSON.stringify(m.describe(), undefined, ' ') + '\n');
                    });
                });
            });
        });
        service.on('error', function(err) {
            Util.log('Service(' + wsdl + ') met error: ' + err.message + '\n Stack:\n' + srr.stack + '\n');
        });
    });
}

var testTargets = {
        udp: 'https://luvyu01-autosvr:8015',
        winD2D: 'https://luvyu01-autosvr:8014',
        linuxD2D: 'https://luvyu01-cos63:8014'
    },
    udpServices = [
        '/services/EdgeServiceImpl',
        '/services/EdgeRHAServiceImpl',
        '/services/EdgeService4LinuxD2DImpl',
        '/services/EdgeMsp4ClientServiceImpl'
    ],
    winD2DServices = [
        '/RPSWebServiceImpl/services/RPSService4CPMImpl',
        '/RPSWebServiceImpl/services/RPSService4D2DImpl',
        '/RPSWebServiceImpl/services/RPSService4RPSImpl',
        '/RPSWebServiceImpl/services/RPSServiceImpl',
        '/WebServiceImpl/services/FlashServiceImpl',
        '/WebServiceImpl/services/WebServiceImpl'
    ],
    linuxD2DServices = [
        '/WebServiceImpl/services/LinuximagingServiceImpl'
    ];

testWSDLForProduct(testTargets.udp, udpServices);
testWSDLForProduct(testTargets.winD2D, winD2DServices);
testWSDLForProduct(testTargets.linuxD2D, linuxD2DServices);

/*    Manual testings below    */
function manual() {
    var lynxWSDL = "https://luvyu01-cos63:8014/WebServiceImpl/services/LinuximagingServiceImpl?wsdl",
        winWSDL = "https://luvyu01-autosvr:8014/WebServiceImpl/services/WebServiceImpl?wsdl",
        udpWSDL= "https://luvyu01-autosvr:8015/services/EdgeServiceImpl?wsdl",
        esxWSDL = "https://155.35.82.69/sdk/vimService.wsdl",
        cb = function(err, res, headers) {
            if(err) {
                console.log(err);
                console.log(err.statusCode);
                console.log(err.requestXML);
                console.log(err.fault);
            }
            if(res) console.log(JSON.stringify(res, undefined, '  ')); 
            if(headers) console.log(JSON.stringify(headers, undefined, '  ')); 
        },
        S = require('./Service'),
        s = new S;
    s.on('ready', function() { console.log('Done loading WSDL.'); });
    s.on('error', function(err) { console.log(err.message + '\n' + err.stack); });
    s.loadWSDLByURL({ url: esxWSDL, strictSSL: false });

    // Windows part
    var srv =  s.services.WebServiceImpl.WebServiceImplHttpSoap11Endpoint,
        gviReq = srv.getVersionInfo.create();
    gviReq.then(cb);

    // UDP part
    var srv = s.services.EdgeServiceImpl.EdgeServiceImplHttpSoap11Endpoint,
        vuReq = srv.validateUser.create({
            arg0: 'administrator',
            arg1: 'cnbjrdqa2#'
        }),
        gplReq = srv.getPlanList.create(),
        gwluReq = srv.getWindowsLocalUsers.create(),
        gslReq = srv.getServerList.create(),
        gsgReq = srv.getSourceGroups.create(),
        gtlReq = srv.getTaskList.create();
    vuReq.then(cb);
    gplReq.then(cb);
    gwluReq.then(cb);
    gslReq.then(cb);
    gsgReq.then(cb);
    gtlReq.then(cb);
    // console.log(JSON.stringify(srv.getHashRoleEnvInfo.describe(), null, '  '));
    // console.log(JSON.stringify(srv.getServerList.describe(), null, '  '));
    // console.log(JSON.stringify(srv.importVMs.describe(), null, '  '));
    // console.log(JSON.stringify(srv.queryMostRecentBackupStatusDrillin.describe(), null, '  '));

    // Linux part
    var srv = s.services.LinuximagingServiceImpl.LinuximagingServiceImplHttpSoap11Endpoint,
        vuReq = srv.validateUser.create({
            arg0: 'root',
            arg1: 'cnbjrdqa2#'
        }),
        gbjsbnn = srv.getBackupJobScriptByNodeName.create({
            arg0: 'luvyu01-cos63'
        }),
        gviReq = srv.getVersionInfo.create(),
        gsiReq = srv.getD2DServerInfo.create(),
        gsilReq = srv.getD2DServerInfoList.create(),
        gjslReq = srv.getJobScriptList.create();
    vuReq.then(cb);
    gbjsbnn.then(cb);
    gviReq.then(cb);
    gsiReq.then(cb);
    gsilReq.then(cb);
    gjslReq.then(cb);

    for(var p in srv) console.log(JSON.stringify(srv[p].describe(), undefined, '  '));
}
// Returns the result of the hook function in each level
//   the hook function is like function(currentElementPath, elementType)
// We only support a subset of xsd definitions.
// Maybe implement new ones when needed.
// function walkElement(el, hook, currPath, countLimits) {
//  currPath = currPath || [];
//  countLimits = countLimits || [];
//  Util.arrayEach(el.element, function(e) {
//         var minOccurs = ((typeof e.minOccurs === 'undefined') ? 1 : e.minOccurs),
//             maxOccurs = ((typeof e.maxOccurs === 'undefined') ? 1 : e.maxOccurs),
//             newCountLimits = undefined,
//             newPath = undefined;
//         if(minOccurs === 'unbounded') minOccurs = 0;
//         if(maxOccurs === 'unbounded') maxOccurs = Number.MAX_VALUE;
//         newCountLimits = countLimits.slice().concat([[minOccurs, maxOccurs]]);
//         newPath = currPath.slice().concat([e.name]);
//      if(typeof e.type === 'string') hook(newPath, newCountLimits, stripNS(e.type));
//      else if(e.type && (typeof e.type !== 'string')) throw new Error('Should not happen.');
//      else if(typeof e.simpleType === 'string') hook(newPath, newCountLimits, stripNS(e.simpleType));
//      else if(typeof e.simpleType === 'object') hook(newPath, newCountLimits, e.simpleType.restriction);
//      else if(typeof e.complexType === 'object') {
//          if(e.complexType.complexContent && e.complexType.complexContent.extension) {
//              walkElement(e.complexType.complexContent.extension.baseType.sequence, hook, newPath, newCountLimits);
//              walkElement(e.complexType.complexContent.extension.sequence, hook, newPath, newCountLimits);
//          } else if(e.complexType.sequence) walkElement(e.complexType.sequence, hook, newPath, newCountLimits);
//          else throw new Error('Should not happen.');
//      } else return;
//  });
// }
// function describeObj(obj) {
//     var objCache = { };
//     walkElement(obj, function(currentElementPath, countLimits, elementType) {
//         var currObj = objCache;
//         for(var i = 1; i < currentElementPath.length; i++) {
//             var limit = countLimits[i],
//                 pathName = currentElementPath[i];
//             if((limit[0] === 1) && (limit[1] === 1)) pathName = pathName;
//             else if((limit[0] === 0) && (limit[1] === 1)) pathName += '?';
//             else pathName += '*';
//             if(i === (currentElementPath.length - 1)) {                
//                 if(typeof elementType === 'string') currObj[pathName] = elementType;
//                 else if(typeof elementType === 'object' && Array.isArray(elementType.enumeration)) {
//                     var enumeration = [];
//                     Util.arrayEach(elementType.enumeration, function(entry) {
//                         enumeration.push(entry.value || entry);
//                     });
//                     currObj[pathName] = enumeration;
//                 } else throw new Error('Unexpected element type: ' + Util.inspect(elementType, { depth: null }));
//             }else {
//                 currObj[pathName] = currObj[pathName] || { };
//                 currObj = currObj[pathName];
//             }
//         }
//     });
//     return objCache;
// }


// Create an instance of this action and return a promise-like object
// Action.prototype.create = function(inputArguments, overrideWsLoc, headers) {
//  var inputArguments = inputArguments || { },
//         headers = headers || { },
//         globalState = this._globalState,
//         srvLoc = overrideWsLoc || this._serviceLocation,
//         requestMsgName = this._input.element.name,
//         responseMsgName = this._output.element.name,
//         namespace = this._namespace,
//         baseXMLTemplate = [
//             '<?xml version="1.0"?>',
//             '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
//             '    <!-- soap:Header / -->',
//             '    <soap:Body>',
//             '        <ns1:' + requestMsgName + ' xmlns:ns1="' + namespace + '">',
//             '%message%',
//             '        </ns1:' + requestMsgName + '>',
//             '    </soap:Body>',
//             '</soap:Envelope>'
//         ].join('\n'),
//         requestTemplateObj = this.describeRequest(),
//         responseTemplateObj = this.describeResponse(),
//         feedTemplateWithData = function(templateObj, inputObj) {        
//             if(typeof templateObj !== 'object') throw new TypeError();                
//             var res = '';
//             Util.properties(templateObj, function(path) {
//                 var propName = path.replace(/[\?\*]$/, '');
//                 if(typeof templateObj[path] === 'string') {
//                     var valType = templateObj[path];
//                     Util.arrayEach(inputObj[propName], function(eachVal) {
//                         // Should validate the data type?
//                         res += '<' + propName + '>' + eachVal + '</' + propName+ '>';
//                     });
//                 } else {                    
//                     Util.arrayEach(inputObj[propName], function(eachVal) {
//                         // Should validate the data type?
//                         res += '<' + propName + '>' + feedTemplateWithData(templateObj[path], eachVal) + '</' + propName+ '>';
//                     });
//                 }
//             });
//             return res;
//         },
//         requestXML = baseXMLTemplate.replace('%message%', feedTemplateWithData(requestTemplateObj, inputArguments));
//  return {
//      then: function(cb) {
//             if(!headers.cookie) headers.cookie = globalState.cookie;
//             request({
//                 url: srvLoc,
//                 body: requestXML,
//                 strictSSL: false,
//                 method: 'POST',
//                 headers: headers
//             }, function(error, response, body) {
//                 if (error || (response.statusCode !== 200)) {
//                  if(error) {
//                         error.requestXML = requestXML;
//                         if(response) error.statusCode = response.statusCode;
//                  } else {
//                      error = new Error('Service returned code ' + (response ? response.statusCode : 'ERROR'));
//                      error.requestXML = requestXML;
//                         if(response) error.statusCode = response.statusCode;
//                  }
//                     var parsedRes = undefined;
//                     try { 
//                         parsedRes = JSON.parse(parser.toJson(body));
//                         // usually like Envelope -> Body -> Fault -> { faultcode, faultstring }
//                         Util.properties(parsedRes, function(envelope) {
//                             if(stripNS(envelope) === 'Envelope') {
//                                 Util.properties(parsedRes[envelope], function(body) {
//                                     if(stripNS(body) === 'Body') {                                        
//                                         Util.properties(parsedRes[envelope][body], function(fault) {
//                                             if(stripNS(fault) === 'Fault') {
//                                                 error.fault = {
//                                                     faultcode: parsedRes[envelope][body][fault].faultcode,
//                                                     faultstring: parsedRes[envelope][body][fault].faultstring
//                                                 };
//                                             }
//                                         });
//                                     }
//                                 });
//                             }
//                         });
//                     } catch(err) { 
//                         parsedRes = body;
//                         error.parserError = err;
//                     }
//                     cb(error, parsedRes);
//                 } else {
//                     var parsedRes = undefined,
//                         parserError = undefined;
//                     try { 
//                         responseTemplateObj = responseTemplateObj;
//                         parsedRes = JSON.parse(parser.toJson(body)); 
//                         var responseData = undefined,
//                             getProp = function(target, prop, cb) {
//                                 if(target[prop]) cb(target[prop]);
//                                 else Util.properties(target, function(p) {
//                                     if(stripNS(p) === prop) cb(target[p]);
//                                 });
//                             },
//                             constructResponse = function(templateObj, res) {
//                                 if(typeof templateObj !== 'object') throw new TypeError();   
//                                 var result = { };
//                                 Util.properties(templateObj, function(eachProp) {
//                                     if(eachProp.match(/^.*\?$/)) {
//                                         var cleanProp = eachProp.replace(/\?$/, '');
//                                         result[cleanProp] = null;
//                                         getProp(res, cleanProp, function(val) {
//                                             if(typeof templateObj[eachProp] === 'string')
//                                                 result[cleanProp] = val;
//                                             else result[cleanProp] = constructResponse(templateObj[eachProp], val);
//                                         });
//                                     } else if(eachProp.match(/^.*\*$/)) {
//                                         var cleanProp = eachProp.replace(/\*$/, '');
//                                         result[cleanProp] = [];
//                                         getProp(res, cleanProp, function(val) {
//                                             Util.arrayEach(val, function(v) {
//                                                 if(typeof templateObj[eachProp] === 'string')
//                                                     result[cleanProp].push(v);
//                                                 else result[cleanProp].push(constructResponse(templateObj[eachProp], v));
//                                             });
//                                         });
//                                     } else {
//                                         result[eachProp] = null;
//                                         getProp(res, eachProp, function(val) {
//                                             if(typeof templateObj[eachProp] === 'string')
//                                                 result[eachProp] = val;
//                                             else result[eachProp] = constructResponse(templateObj[eachProp], val);
//                                         });
//                                     }
//                                 });
//                                 return result;
//                             };
//                         // usually like Envelope -> Body -> { RESPONSE }
//                         Util.properties(parsedRes, function(envelope) {
//                             if(stripNS(envelope) === 'Envelope') {
//                                 Util.properties(parsedRes[envelope], function(body) {
//                                     if(stripNS(body) === 'Body') {                                        
//                                         Util.properties(parsedRes[envelope][body], function(target) {
//                                             if(stripNS(target) === responseMsgName) {
//                                                 responseData = constructResponse(responseTemplateObj, parsedRes[envelope][body][target]);
//                                             }
//                                         });
//                                     }
//                                 });
//                             }
//                         });
//                     } catch(err) {
//                         responseData = body
//                         parsedRes = body;
//                         parserError = err;
//                     }
//                     if(response.headers && response.headers['set-cookie'])
//                         globalState.cookie = response.headers['set-cookie'];
//                     cb(parserError, responseData, response.headers);
//                 }
//             });
//      }
//  }
// };