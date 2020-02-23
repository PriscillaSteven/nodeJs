var util = require('util'),
	Util = require(__dirname + '/../../Util'),
	LocalContext = require(__dirname + '/LocalContext'),
	ResourceLoader = require(__dirname + '/ResourceLoader');

function XSD(loader, json, defaultTargetNamespace, location) {
	LocalContext.call(this, json, defaultTargetNamespace);
	if(!(loader instanceof require('./ResourceLoader')))
		throw new TypeError();
	
	var xsdNS = 'http://www.w3.org/2001/XMLSchema',
		parentPath = location.replace(/\/[a-zA-Z0-9\.\?\=\%\-\&\#\+]*$/,''),
		expandPath = function(p) {
			if(p.match(/^https?\:\/\/.*$/)) return p;
			else return parentPath + '/' + p;
		};
	this.__defineGetter__('instanceType', function() { return 'xsd'; });

	// first check any imported/included XSD in types/schema
	Util.arrayEach(this.getChildByTagName(json, 'import'), function(imp) {
		loader.loadXSDByURL(expandPath(imp.schemaLocation), imp.namespace);
	}, this);
	Util.arrayEach(this.getChildByTagName(json, 'include'), function(inc) {
		loader.loadXSDByURL(expandPath(inc.schemaLocation), inc.namespace || this.targetNamespace);
	}, this);

	// check defined elements
	Util.arrayEach(this.getChildByTagName(json, 'element'), function(el) {
		// builtin type, simpleType, complexType maybe defined
		// here in place or referenced by 'type' attrib
		this.element = this.element || { };
		if(el.type) {
			var parsedType = this.parseNamespace(el.type);
			this.element[el.name] = {
				type: parsedType.value,
				typeNamespace: parsedType.namespace
			};
		} else {
			// this element has an inline definition, simpleType or complexType
			var t = this.getChildByTagName(el, 'simpleType');
			if(t) {
				this.element[el.name] = {
					inlineSimpleType: this.stripNSIdentifier(t, xsdNS)
				};
			} else {
				t = this.getChildByTagName(el, 'complexType');
				if(!t) return; // This should not happen.
				this.element[el.name] = {
					inlineComplexType: this.stripNSIdentifier(t, xsdNS)
				};
			}
		}
	}, this);
	// check simpleType definitions
	Util.arrayEach(this.getChildByTagName(json, 'simpleType'), function(st) {
		this.simpleType = this.simpleType || { };
		this.simpleType[st.name] = this.stripNSIdentifier(st, xsdNS);
	}, this);
	// check complexType definitions
	Util.arrayEach(this.getChildByTagName(json, 'complexType'), function(ct) {
		this.complexType = this.complexType || { };
		this.complexType[ct.name] = this.stripNSIdentifier(ct, xsdNS);
	}, this);
}
util.inherits(XSD, LocalContext);

module.exports = XSD;