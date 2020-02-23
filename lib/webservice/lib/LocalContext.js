var Util = require(__dirname + '/../../Util');

function LocalContext(json, defaultTargetNamespace) {
	this.targetNamespace = defaultTargetNamespace || this.targetNamespace || '';
	var paredTargetNamespace = this.parseTargetNamespace(json);
	if(this.targetNamespace && paredTargetNamespace && (this.targetNamespace !== paredTargetNamespace))
		throw new Error('Imported namespace not match.');
	else if(!this.targetNamespace) this.targetNamespace = paredTargetNamespace;
	this.defaultNamespace = this.defaultNamespace || this.parseDefaultNamespace(json) || '';
	this.localNamespaces = this.localNamespaces || this.parseLocalNamespaces(json);
	this.json = json;
}
LocalContext.prototype.parseTargetNamespace = function(json) {
	if(this instanceof LocalContext) {
		var res = json.targetNamespace;
		delete json.targetNamespace;
		return res;
	} else return json.targetNamespace;	
};
LocalContext.prototype.parseDefaultNamespace = function(json) {
	if(this instanceof LocalContext) {
		var res = json.xmlns;
		delete json.xmlns;
		return res;	
	} else return json.xmlns;	
};
LocalContext.prototype.parseLocalNamespaces = function(json, to) {
	var res = to || { };
	Util.properties(json, function(p) {
		if(p.match(/^xmlns:(.*)$/)) {
			res[p.match(/^xmlns:(.*)$/)[1]] = json[p];
			if(this instanceof LocalContext) delete json[p];
		} else return;
	}, this);
	return res;
};
LocalContext.prototype.getChildByTagNameNS = function(parent, name, namespace, localNamespaces) {
	localNamespaces = localNamespaces || this.localNamespaces || { };
	namespace = namespace || this.defaultNamespace || '';
	var res = undefined;
	Util.properties(parent, function(prop) {
		var m = /^(.+):(.+)$/.exec(prop);
		if(m && localNamespaces[m[1]] === namespace && m[2] === name) {
			res = parent[prop];
		} else if(prop === name && (namespace === this.defaultNamespace) || (namespace === '')) {
			res = parent[prop];
		}
	}, this);
	return res;
};
LocalContext.prototype.getChildByTagName = function(parent, name) {
	var res = undefined;
	Util.properties(parent, function(prop) {
		if(prop === name) res = parent[prop];
		else {
			var m = /^(.+):(.+)$/.exec(prop);
			if(m && (m[2] === name)) res = parent[prop];
		}
	}, this);
	return res;
};
LocalContext.prototype.parseNamespace = function(name) {	
	var m = /^(.+):(.+)$/.exec(name);
	if(m && this.localNamespaces[m[1]]) return {
		value: m[2],
		namespace: this.localNamespaces[m[1]]
	};
	else return {
		value: name,
		namespace: this.defaultNamespace
	};
};
LocalContext.prototype.stripNSIdentifier = function(json, inNamespace) {
	if(Array.isArray(json)) {
		var result = [];
		Util.arrayEach(json, function(item) {
			result.push(this.stripNSIdentifier(item, inNamespace));
		}, this);
		return result;
	} else if(typeof json  === 'object') {
		inNamespace = inNamespace || this.defaultNamespace;
		var result = { };
		Util.properties(json, function(prop) {
			var m = /^(.+):(.+)$/.exec(prop);
			if(m && this.localNamespaces[m[1]] === inNamespace) {
				result[m[2]] = this.stripNSIdentifier(json[prop], inNamespace);
			} else result[prop] = this.stripNSIdentifier(json[prop], inNamespace);
		}, this);
		return result;
	} else return json;
};

module.exports = LocalContext;