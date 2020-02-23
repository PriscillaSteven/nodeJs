var request = require('request'),
    parser = require('xml2json'),
    LocalContext = require(__dirname + '/LocalContext'),
    Util = require(__dirname + '/../../Util');

function stripNS(str) {
    str = (str && str.toString()) || '';
    return str.replace(/^.*:/, '');
}
function stripNSRecursive(obj) {
    var result = undefined;
    if(typeof obj === 'object') {
        if(Buffer.isBuffer(obj)) result = obj;
        else if(Array.isArray(obj)) {
            result = [];
            Util.arrayEach(obj, function(o) {
                result.push(stripNSRecursive(o));
            });
        } else {
            result = { };
            Util.properties(obj, function(prop) {
                var sprop = stripNS(prop);
                if((sprop !== prop) && obj.hasOwnProperty(sprop))
                    result[prop] = stripNSRecursive(obj[prop]);
                else result[sprop] = stripNSRecursive(obj[prop]);
            });
        }
    } else result = obj;
    return result;
}
// Here we're assuming that each type is unique across different namespaces.
function describeObj(typeCache, depList, obj) {
    if(!obj) return { };
    if(obj['_$type'] && obj['_$namespace']) {
        if(!depList[obj['_$type']]) {
            depList[obj['_$type']] = { };
            depList[obj['_$type']] = describeObj(typeCache, depList, typeCache[obj['_$namespace']][obj['_$type']]);
        }
        return obj['_$type'];
    } else if(obj['_$type'] || obj['_$namespace']) throw new Error('Invalid object.');
    else {
        if(Array.isArray(obj)) return obj;
        var desc = { };
        Util.properties(obj, function(prop) {
            if(/^_\$.*$/.exec(prop)) {
                if(prop === '_$attrs') {
                    Util.properties(obj[prop], function(attr) {
                        desc['~' + attr] = obj[prop][attr];
                    });
                } else if(prop === '_$choices') {
                    Util.arrayEach(obj[prop], function(choice) {
                        var pNameList = [],
                            tNameList = [],
                            occur = '';
                        Util.properties(choice, function(item) {
                            if(item === '_$occurrence') occur = choice[item];
                            else {
                                pNameList.push(item);
                                tNameList.push(describeObj(typeCache, depList, choice[item]));
                            }
                        });
                        desc[pNameList.join(occur + '|') + occur] = tNameList.join('|');
                    });
                } else if(prop === '_$base') desc['@'] = describeObj(typeCache, depList, obj[prop]);
                else throw new Error('Unhandled system prop ' + prop + '\n');
            } else {
                if((typeof obj[prop] === 'string') || Array.isArray(obj[prop])) desc[prop] = obj[prop];
                else desc[prop] = describeObj(typeCache, depList, obj[prop]);
            }
        });
        return desc;
    }
    throw new Error('Invalid code path.');
}
// Process the type and it's dependencies, currently only a few format supported, hopefully enough for `JAX-WS RI'
// We may run into some type defined in third party namespaces, thus should allow unknow types when processing dependencies. 
// ex. 'ArrayOfstring' in 'http://schemas.microsoft.com/2003/10/Serialization/Arrays'
function processType(typeCache, resLoader, rawType, ctx) {
    var xsdNS = 'http://www.w3.org/2001/XMLSchema';
    if(!rawType || !(ctx instanceof LocalContext))
        throw new Error('Invalid raw type or context.');
    var result = undefined;
    // Function to process attributes
    var processAttrs = function(target) {
        var attrs = { };
        Util.arrayEach(target.attribute, function(attr) {
            attrs[attr.name + ((attr.use === 'required') ? '' : '?')] = stripNS(attr.type);
        });     
        return attrs;           
    }
    if(rawType.sequence) {
        result = { '_$attrs': processAttrs(rawType) };
        var processElements = function(elements, context, target) {
            Util.arrayEach(elements, function(el) {
                var elType = undefined,
                    elTypeNS = undefined;
                // Find occurrence info
                if(el.minOccurs === 'unbounded') el.minOccurs = 0;
                if(el.maxOccurs === 'unbounded') el.maxOccurs = Number.MAX_VALUE;
                if(typeof el.minOccurs !== 'number') el.minOccurs = 1;
                if(typeof el.maxOccurs !== 'number') el.maxOccurs = 1;
                var namePost = '';
                if(el.minOccurs === 1 && el.maxOccurs === 1) namePost = '';
                else if(el.minOccurs === 0 && el.maxOccurs === 1) namePost = '?';
                else namePost = '*';
                if(el.ref) {
                    var referred = context.parseNamespace(el.ref),
                        refEl = resLoader.searchInNamespace(referred.namespace, ['element', referred.value]);
                    if(!refEl) throw new Error(
                        'Referred element `' + referred.value + '\' not found in namespace `' + referred.namespace + '\'.'
                    );
                    elType = refEl.type;
                    elTypeNS = refEl.typeNamespace;
                } else {
                    if(!el.type) {
                        if(el.complexType) target[el.name + namePost] = processType(typeCache, resLoader, el.complexType, context);
                        else if(el.simpleType) throw new Error('Not supported.');
                        else throw new Error('Invalid element definition, no type specified.');
                        return;
                    }
                    var parsed = context.parseNamespace(el.type);
                    elType = parsed.value;
                    elTypeNS = parsed.namespace;
                }
                // Basic Type
                if(elTypeNS === xsdNS) target[el.name + namePost] = elType;
                else {
                    // console.log('ns: ' + elTypeNS + ' type: ' + elType);
                    cacheType(typeCache, resLoader, elTypeNS, elType, true);
                    target[el.name + namePost] = { '_$type': elType, '_$namespace': elTypeNS };
                }
            });
        }
        processElements(rawType.sequence.element, ctx, result);
        Util.arrayEach(rawType.sequence.choice, function(ch) {
            result['_$choices'] = result['_$choices'] || [];
            var thisChoice = { };
            // Find occurrence info
            if(ch.minOccurs === 'unbounded') ch.minOccurs = 0;
            if(ch.maxOccurs === 'unbounded') ch.maxOccurs = Number.MAX_VALUE;
            if(typeof ch.minOccurs !== 'number') ch.minOccurs = 1;
            if(typeof ch.maxOccurs !== 'number') ch.maxOccurs = 1;
            if(ch.minOccurs === 1 && ch.maxOccurs === 1) thisChoice['_$occurrence'] = '';
            else if(ch.minOccurs === 0 && ch.maxOccurs === 1) thisChoice['_$occurrence'] = '?';
            else thisChoice['_$occurrence'] = '*';            
            processElements(ch.element, ctx, thisChoice);
            result['_$choices'].push(thisChoice);
        });
    } else if(rawType.simpleContent || rawType.complexContent) {
        // We're processing some complexType
        // Under complexContent/simpleContent we only support [extension]
        result = processType(typeCache, resLoader, rawType.simpleContent ||rawType.complexContent, ctx);        
    } else if(rawType.extension) {        
        var baseType = ctx.parseNamespace(rawType.extension.base);
        if(baseType.namespace === xsdNS) {
            // If rawType.extension.base is base type(ie. under xsd namespace), then it has only [attribute]s.
            result = { '_$attrs': processAttrs(rawType.extension) };
        } else {
            // If rawType.extension.base is defined type, then it may have [attribute]s or [sequence,element]s.
            result = processType(typeCache, resLoader, rawType.extension, ctx) || { }; // in case that no sequence is defined.
            cacheType(typeCache, resLoader, baseType.namespace, baseType.value, true);
            result['_$base'] = { '_$type': baseType.value, '_$namespace': baseType.namespace };
        }
    } else if(rawType.restriction) {
        // We're processing some simpleType, only support enumeration for now, and ignore [base].
        result = [];
        Util.arrayEach(rawType.restriction.enumeration, 
            function(entry) { entry.value && result.push(entry.value); });
    }
 
    return result;
}
function cacheType(typeCache, resLoader, ns, tname, tolerate) {
    console.log('ns: ' + ns + ' tname: ' + tname);
    if(!ns || !tname) throw new Error('Invalid operation.');
    if(typeCache[ns] && (typeCache[ns][tname] !== undefined)) 
        return; // Already cached this type.
    typeCache[ns] = typeCache[ns] || { };
    typeCache[ns][tname] = { }; // Make it there to prevent dead lock.
    // Find and process this type.
    var typeSearch = resLoader.searchInNamespace(ns, ['simpleType', tname], true);
    if(!typeSearch.target)
        typeSearch = resLoader.searchInNamespace(ns, ['complexType', tname], true);
    if(!tolerate && !typeSearch.target) throw new Error(
        'Type `' + tname + '\' not found in namespace `' + ns + '\'.'
    );
    // Possibly thirdparty type, tolerate it.
    if(!typeSearch.target) typeCache[ns][tname] = 'any';
    // Process this type.
    else typeCache[ns][tname] = processType(typeCache, resLoader, typeSearch.target, typeSearch.context);
}
function setupMessage(typeCache, resLoader, msg, ctx) {
    // find the element definition
    var message = resLoader.searchInNamespace(msg.messageNamespace, ['message', msg.message]);
    if(!message) throw new Error(
        'Message `' + msg.message + '\' not found in namespace `' + msg.messageNamespace + '\'.'
    );
    //console.log(Util.inspect(message));
    var msgParts = [];
    Util.properties(message, function(part) {
        if(!message[part].element || !message[part].elementNamespace) throw new Error(
            'Invalid part definition in message `' + msg.message + '\'.'
        );
        msgParts.push(message[part]);
    })
    if(msgParts.lenght <= 0) throw new Error('No parts found in message `' + msg.message + '\'.');
    var types = [];
    Util.arrayEach(msgParts, function(part) {
        var element = resLoader.searchInNamespace(part.elementNamespace, ['element', part.element]);
        if(!element) throw new Error(
            'Element `' + part.element + '\' not found in namespace `' + part.elementNamespace + '\'.'
        );
        // console.log(Util.inspect(message));
        if(element.type && element.typeNamespace) {
            cacheType(typeCache, resLoader, element.typeNamespace, element.type);
            types.push({ type: element.type, namespace: element.typeNamespace });
        } else if(element.inlineComplexType) {
            typeCache[part.elementNamespace][part.element] =
                processType(typeCache, resLoader, element.inlineComplexType, ctx) || { }; // in case nothing defined
            cacheType(typeCache, resLoader, part.elementNamespace, part.element);
            types.push({ type: part.element, namespace: part.elementNamespace });
        } else throw new Error(
            'Type not found in element `' + part.element + '\' or this simple type is inline defined in element which is not supported.'
        );
    });
    return types;
}

function Action(action, io, context, resLoader, serviceLocation, globalTypeCache, globalState) {
    this._action = action;
    this._serviceLocation = serviceLocation;
    this._globalState = globalState || { };
    this._globalTypeCache = globalTypeCache || { };
    this._context = context;
    this._request = setupMessage(this._globalTypeCache, resLoader, io.input, context);
    this._response = setupMessage(this._globalTypeCache, resLoader, io.output, context);
}
function descWrapper(targets, typeCache) {
    var depList = { },
        parts = [];
    Util.arrayEach(targets, function(target) {
        depList[target.type] = describeObj(
            typeCache, depList,
            typeCache[target.namespace][target.type]
        );
        parts.push(target);
    });
    return {
        parts: parts,
        typeList: depList
    }
}
Action.prototype.describeRequest = function() { 
    return descWrapper(this._request, this._globalTypeCache);
};
Action.prototype.describeResponse = function() {
    return descWrapper(this._response, this._globalTypeCache);
};
Action.prototype.describe = function() {
    return {
        request: this.describeRequest(),
        response: this.describeResponse()
    };
};
// cbForEntry => function(name, type, value)
// cbForArray => function(name, type, valueArray)
function processMemberAccordingToName(typeList, mName, tNameOrObj, json, cbForEntry, cbForArray) {
    var isAttr = false,
        presentOrNot = false,
        isArray = false,
        nmName = mName.toString().replace(/^~/, '').replace(/\?$/, '').replace(/\*$/, '');;
    if(/^~.*$/.test(mName)) isAttr = true;
    if(/^.*\?$/.test(mName)) presentOrNot = true;
    else if(/^.*\*$/.test(mName)) isArray = true;
    var cb = isArray ? cbForArray : cbForEntry;

    // Note we should take basic type and defined types into account.
    // And basic type can be treated the same as unknow type(any).
    if(presentOrNot && !json.hasOwnProperty(nmName)) return;
    else if(!isArray && !json.hasOwnProperty(nmName)) 
        throw new Error('Cannot find mandentory member `' + nmName + '\'.');

    if(typeof tNameOrObj === 'object') { // inline type
        if(isAttr) throw new Error('BUG: inline type in attr.')
        cb(nmName, tNameOrObj, json[nmName]);
    } else if(Array.isArray(tNameOrObj)) { // enumration
        if(isAttr) throw new Error('BUG: enumeration in attr.')
        if(tNameOrObj.indexOf(json[nmName]) < 0) throw new Error(
            'Value not in enumeration. Valid values are: ' + 
            JSON.stringify(tNameOrObj) + '.'
        );
        cb(nmName, 'enum', json[nmName]);
    } else {
        if(typeList[tNameOrObj]) {
            if(isAttr) throw new Error('BUG: complex type in attr.')
            cb(nmName, typeList[tNameOrObj], json[nmName]);
        } else {
            if(isAttr) cb(nmName, 'attr', json[nmName]);
            else cb(nmName, 'any', json[nmName]);
        }
    }
}
// cb => function((obj)interRes, (array)path, (string)valueType, (any)value)
// Errors will be thrown directly when met.
function matchType(typeList, typeDefObj, json, cb, currentPath, currentRes) {
    currentPath = currentPath || [ ];
    currentRes = currentRes || { };
    if(!typeDefObj) throw new Error('BUG: cannot process undefined type.');
    if(Array.isArray(typeDefObj)) { // Processing enumeration type
        if(typeDefObj.indexOf(json) < 0) throw new Error(
            'Value not in enumeration. Valid values are: ' + 
            JSON.stringify(typeDefObj) + '.'
        ); else cb(currentRes, currentPath, 'enum', json);
    } else Util.properties(typeDefObj, function(member) {
        if(member === '@') { // Process some base(super?) type here.
            if(typeof typeDefObj[member] === 'string') {
                var nTypeDefObj = typeList[typeDefObj[member]];
                if(!nTypeDefObj) throw new Error('BUG: type `' + typeDefObj[member] + '\' absent.');
                matchType(typeList, nTypeDefObj, json, cb, currentPath, currentRes);
            } else matchType(typeList, typeDefObj[member], json, cb, currentPath, currentRes);
        } else {
            var queue = [];
            if(typeof typeDefObj[member] === 'string') {
                // if this member is not inline definition nor enumeration,
                // we can then handle it as choices.
                // Drawback is that we're not ensuring only one choice is present.
                var mNames = member.split('|'),
                    tNames = typeDefObj[member].split('|');
                if(mNames.length !== tNames.length) 
                    throw new Error('BUG: cannot determine proper choices.');
                Util.arrayEach(mNames, function(mName, idx) {
                    queue.push({ name: mName, item: tNames[idx] });                    
                });
            } else queue.push({ name: member, item: typeDefObj[member] });
            Util.arrayEach(queue, function(q) {
                processMemberAccordingToName(typeList, q.name, q.item, json, 
                    function(name, type, value) {
                    var newPath = currentPath.slice();
                    newPath.push(name);
                    if(type === 'attr' || type === 'any' || type === 'enum')
                        cb(currentRes, newPath, type, value);
                    else if(typeof type === 'object')
                        matchType(typeList, type, value, cb, newPath, currentRes);
                    else throw new Error('BUG: XXX');
                }, function(name, type, valueArray) {
                    // console.log('arr for ' + name);
                    var newPath = currentPath.slice();
                    newPath.push(name);
                    var arrRes = [];
                    Util.arrayEach(valueArray, function(v) {
                        if(typeof type === 'object')
                            arrRes.push(matchType(typeList, type, v, cb));
                        else arrRes.push(v);
                    });
                    cb(currentRes, newPath, 'array', arrRes);
                });
            });
        }
    });
    return currentRes;
}
function setValueToPath(target, path, value) {
    if(!target) throw new Error('Invalid target.');
    var currTarget = target;
    Util.arrayEach(path, function(level, idx) {
        if(idx >= path.length - 1) {
            if(currTarget[level]) {
                if(Array.isArray(currTarget[level]))
                    currTarget[level].push(value);
                else currTarget[level] = [currTarget[level], value];
            } else currTarget[level] = value;
        } else {
            if(!currTarget[level]) currTarget[level] = { };
            currTarget = currTarget[level];
        }
    })
}
function constructRequestForOnePart(typeList, type, json) { // => XML string
    // console.log('constructRequestForOnePart:');
    // console.log('currentType: ' + type);
    // console.log('Input: ' + JSON.stringify(json, undefined, '  '));
    var res = matchType(typeList, typeList[type], json, function(interRes, path, valueType, value) {
        if(valueType === 'enum' || valueType === 'any' || valueType === 'array')
            setValueToPath(interRes, path, value);
        else if(valueType === 'attr') {
            setValueToPath(interRes, path, value);
            throw new Error('TODO: Implement attributes support.');
        } else throw new Error('BUG: invalid data type ' + JSON.stringify(valueType));
    });
    var obj2xml = function(obj) {
        var res = '';
        Util.properties(obj, function(p) {
            Util.arrayEach(obj[p], function(o) {
                res += '    <' + p + '>';
                if(typeof o === 'object') res += obj2xml(o);
                else res += o.toString();
                res += '</' + p + '>\n';
            });
        });
        return res;
    };
    return obj2xml(res);
}
function constructResponseForOnePart(typeList, type, json) { // => json obj
    // console.log('constructResponseForOnePart:');
    // console.log('currentType: ' + type);
    // console.log('output: ' + JSON.stringify(json, undefined, '  '));
    var res = matchType(typeList, typeList[type], json, function(interRes, path, valueType, value) {
        if(valueType === 'enum' || valueType === 'any' || valueType === 'attr' || valueType === 'array')
            setValueToPath(interRes, path, value);
        else throw new Error('BUG: invalid data type ' + JSON.stringify(valueType));
    });
    return res;
}
Action.prototype.create = function(inputArguments, overrideWsLoc, headers) {
    var inputArguments = inputArguments || { },
        headers = headers || { },
        globalState = this._globalState,
        srvLoc = overrideWsLoc || this._serviceLocation,
        namespace = this._namespace,
        requestDesc = this.describeRequest(),
        responseDesc = this.describeResponse(),
        requestXML = [
            '<?xml version="1.0"?>',
            '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
            '    <!-- soap:Header / -->',
            '    <soap:Body>',
            requestDesc.parts.reduce(function(prevRes, current, idx) {
                return (prevRes + '\n' + [
                '        <ns' + (idx + 1) + ':' + current.type + ' xmlns:ns' + (idx + 1) + '="' + current.namespace + '">',
                constructRequestForOnePart(requestDesc.typeList, current.type, inputArguments),
                '        </ns' + (idx + 1) + ':' + current.type + '>',                    
                ].join('\n'));
            }, ''),
            '    </soap:Body>',
            '</soap:Envelope>'
        ].join('\n');
    return {
        then: function(cb) {
            if(!headers.cookie) headers.cookie = globalState.cookie;
            request({
                url: srvLoc,
                body: requestXML,
                strictSSL: false,
                method: 'POST',
                headers: headers
            }, function(error, response, body) {
                if (error || (response.statusCode !== 200)) {
                    if(error) {
                        error.requestXML = requestXML;
                        if(response) error.statusCode = response.statusCode;
                    } else {
                        error = new Error('Service returned code ' + (response ? response.statusCode : 'ERROR'));
                        error.requestXML = requestXML;
                        if(response) error.statusCode = response.statusCode;
                    }
                    var parsedRes = undefined;
                    try { 
                        parsedRes = JSON.parse(parser.toJson(body));
                        // usually like Envelope -> Body -> Fault -> { faultcode, faultstring }
                        Util.properties(parsedRes, function(envelope) {
                            if(stripNS(envelope) === 'Envelope') {
                                Util.properties(parsedRes[envelope], function(body) {
                                    if(stripNS(body) === 'Body') {                                        
                                        Util.properties(parsedRes[envelope][body], function(fault) {
                                            if(stripNS(fault) === 'Fault') {
                                                error.fault = {
                                                    faultcode: parsedRes[envelope][body][fault].faultcode,
                                                    faultstring: parsedRes[envelope][body][fault].faultstring
                                                };
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } catch(err) { 
                        parsedRes = body;
                        error.parserError = err;
                    }
                    cb(error, parsedRes);
                } else {
                    var parsedRes = undefined,
                        parserError = undefined,
                        responseData = { };
                    try { 
                        parsedRes = JSON.parse(parser.toJson(body));
                        parsedRes = stripNSRecursive(parsedRes);
                        // usually like Envelope -> Body -> { RESPONSE }
                        Util.properties(parsedRes, function(envelope) {
                            if(stripNS(envelope) === 'Envelope') {
                                Util.properties(parsedRes[envelope], function(body) {
                                    if(stripNS(body) === 'Body') {  
                                        Util.properties(parsedRes[envelope][body], function(partName) {
                                            Util.arrayEach(responseDesc.parts, function(part) {
                                                if(part.type === stripNS(partName)) {
                                                    responseData[part.type] = constructResponseForOnePart(
                                                        responseDesc.typeList, part.type, 
                                                        parsedRes[envelope][body][partName]
                                                    );
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    } catch(err) {
                        responseData = body
                        parsedRes = body;
                        parserError = err;
                    }
                    if(response.headers && response.headers['set-cookie'])
                        globalState.cookie = response.headers['set-cookie'];
                    cb(parserError, responseData, response.headers);
                }
            }); // request(opt, cb)
        } //then: function(cb)
    }; // return
};

module.exports = Action;