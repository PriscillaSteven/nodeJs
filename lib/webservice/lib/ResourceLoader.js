var util = require('util'),
	events = require('events'),
	parser = require('xml2json'),
	request = require('request'),
	Util = require(__dirname + '/../../Util'),
	XSD = require(__dirname + '/XSD'),
	WSDL = require(__dirname + '/WSDL');

// Fixes random connection failures, maybe.
var https = require('https');
https.globalAgent.options.secureProtocol = 'SSLv3_method';

/*
var R = require('./ResourceLoader'),
    r = new R;
    r.on('error', function(err) { console.log(err.message); console.log(err.stack); });
    r.on('ready', function() { console.log('Done loading wsdl.'); });
    r.loadWSDL({ 
        url: 'https://luvyu01-phy790:8014/WebServiceImpl/services/LinuximagingServiceImpl?wsdl',
        strictSSL: false
    });
*/

function checkAllRequestFullfilled(loader) {
	var allParsed = true;
	Util.properties(loader._requests, function(p) {
		if(loader._requests[p] !== 'parsed')
			allParsed = false;
	});
	if(allParsed) loader.emit('resReady');
}

function requestContent(reg, urlOpt, cb) {	
	request(urlOpt, function(err, response, body) {
		if(err) reg.emit('error', err);
		else if (response.statusCode == 200) {
			// set ctx to proper obj, by the way.
			try { cb.call(reg, JSON.parse(parser.toJson(body))); }
			catch(e) { reg.emit('error', e); }			
		} else reg.emit('error', new Error('Failed to fetch content, statusCode = ' + response.statusCode + '.'));
	});
}

function ResourceLoader() {
	events.EventEmitter.call(this);
	this._requests = { };
	this._namespaces = { };
	this._urlOptCache = undefined;
	this._mainNamespace = undefined;
}
util.inherits(ResourceLoader, events.EventEmitter);

ResourceLoader.prototype.loadWSDLByURL = function(urlOpt) {
	urlOpt = urlOpt || '';
	var url = '';
	if(typeof urlOpt !== 'string') {
		if(typeof urlOpt.url === 'string') url = urlOpt.url;
		else if(typeof urlOpt.uri === 'string') {
			url = urlOpt.uri;
			urlOpt.url = url;
			delete urlOpt.uri;
		}
	} else {
		url = urlOpt;
		urlOpt = this._urlOptCache || { };
		urlOpt.url = url;
	}
	if(!url) {
		this.emit('error', new Error('Invalid option. ' + urlOpt));
		return;
	}
	if(this._requests[url]) return; // already fetched.
	else this._requests[url] = 'fetching';

	requestContent(this, urlOpt, function(json) {
		this._urlOptCache = urlOpt;
		this._requests[url] = 'parsing';
		Util.arrayEach(json.definitions, function(definition) {
			var wsdl = undefined;
			try { wsdl = new WSDL(this, definition, url); }
			catch(e) { 
				this.emit('error', new Error('Failed to parse WSDL.\nError: ' + e.message)); 
				return;
			}
			this._namespaces[wsdl.targetNamespace] = this._namespaces[wsdl.targetNamespace] || [];
			this._namespaces[wsdl.targetNamespace].push(wsdl);
			this._mainNamespace = this._mainNamespace || wsdl.targetNamespace;
		}, this);
		this._requests[url] = 'parsed';
		checkAllRequestFullfilled(this);
	})
};
ResourceLoader.prototype.loadXSDByURL = function(url, defauleTargetNamespace) {
	if(this._requests[url]) return; // already fetched.
	else this._requests[url] = 'fetching';
	if(!this._urlOptCache) return;
	this._urlOptCache.url = url;
	requestContent(this, this._urlOptCache, function(json) {
		this._requests[url] = 'parsing';
		var xsdNS = 'http://www.w3.org/2001/XMLSchema';
		var localNS = { };
		// 	parseLocalNamespaces = XSD.prototype.parseLocalNamespaces,
		// 	getChildByTagNameNS = XSD.prototype.getChildByTagNameNS;
		// // should be only one entry ...
		// Util.properties(json, function(prop) {
		// 	parseLocalNamespaces(json[prop], localNS);
		// }, this);
		Util.arrayEach(XSD.prototype.getChildByTagName.call(null, json, 'schema'), function(schema) {
			var xsd = undefined;
			try { xsd = new XSD(this, schema, defauleTargetNamespace, url); }
			catch(e) { 
				this.emit('error', new Error('Failed to parse XSD.\nError: ' + e.message)); 
				return;
			}	
			this._namespaces[xsd.targetNamespace] = this._namespaces[xsd.targetNamespace] || [];
			this._namespaces[xsd.targetNamespace].push(xsd);
		}, this);
		this._requests[url] = 'parsed';
		checkAllRequestFullfilled(this);
	})
};
// Do not support imports in this scenario.
ResourceLoader.prototype.loadWSDLByContent = function(content) {	
	var json = undefined;
	try { json = JSON.parse(parser.toJson(content)); }
	catch(e) { this.emit('error', e); return; }	
	Util.arrayEach(json.definitions, function(definition) {
		var wsdl = undefined;
		try { wsdl = new WSDL(this, definition, ''); }
		catch(e) { 
			this.emit('error', new Error('Failed to parse WSDL.\nError: ' + e.message)); 
			return;
		}
		this._namespaces[wsdl.targetNamespace] = this._namespaces[wsdl.targetNamespace] || [];
		this._namespaces[wsdl.targetNamespace].push(wsdl);
		this._mainNamespace = wsdl.targetNamespace;
	}, this);
	checkAllRequestFullfilled(this);
};
ResourceLoader.prototype.searchInNamespace = function(namespace, searchSeq, withContext) {
	var result = undefined;
	Util.arrayEach(this._namespaces[namespace], function(ns) {
		var lv = ns,
			error = false;
		Util.arrayEach(searchSeq, function(currTarget) {
			if(lv[currTarget]) lv = lv[currTarget];
			else error = true;
		}, this);
		if(error) {
			if(withContext) return { target: undefined, context: undefined };
			else return undefined;
		} else result = {
			target: Util.shallow(lv),
			context: ns
		};
	}, this);
	if(withContext && result) return result;
	else if(withContext && (!result)) return { target: undefined, context: undefined };
	else if(result) return result.target;
	else return undefined;
};
ResourceLoader.prototype.enumrateNamespace = function(cb, bind) {
	Util.properties(this._namespaces, cb, bind);
};
module.exports = ResourceLoader;