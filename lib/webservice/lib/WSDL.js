var util = require('util'),
	Util = require(__dirname + '/../../Util'),
	XSD = require(__dirname + '/XSD'),
	LocalContext = require(__dirname + '/LocalContext');

function WSDL(loader, json, location) {
	LocalContext.call(this, json);
	if(!(loader instanceof require('./ResourceLoader')))
		throw new TypeError();
	this.resLoader = loader;
	var wsdlNS = 'http://schemas.xmlsoap.org/wsdl/',
		xsdNS = 'http://www.w3.org/2001/XMLSchema',
		soapNS = 'http://schemas.xmlsoap.org/wsdl/soap/',
		parentPath = location.replace(/\/[a-zA-Z0-9\.\?\=\%\-\&\#\+]*$/,''),
		expandPath = function(p) {
			if(p.match(/^https?\:\/\/.*$/)) return p;
			else return parentPath + '/' + p;
		};;
	this.__defineGetter__('instanceType', function() { return 'wsdl'; });
	this.name = '';
	this.message = { };
	this.portType = { };
	this.binding = { };
	this.service = { };
	// wsdl name
	Util.arrayEach(this.getChildByTagNameNS(json, 'name', wsdlNS), function(name) { this.name = name; }, this);
	// wsdl import/include	
	Util.arrayEach(this.getChildByTagNameNS(json, 'import', wsdlNS), function(imp) {
		loader.loadWSDLByURL(expandPath(imp.location), imp.namespace);
	}, this);
	Util.arrayEach(this.getChildByTagNameNS(json, 'include', wsdlNS), function(inc) {
		loader.loadWSDLByURL(expandPath(inc.location), inc.namespace || this.targetNamespace);
	}, this);
	// parse types
	Util.arrayEach(this.getChildByTagNameNS(json, 'types', wsdlNS), function(type) {
		Util.arrayEach(this.getChildByTagNameNS(type, 'schema', xsdNS), function(schema) {
			XSD.call(this, loader, schema, schema.targetNamespace || this.targetNamespace, location);
		}, this);
		Util.arrayEach(this.getChildByTagNameNS(type, 'schema', wsdlNS), function(schema) {
			XSD.call(this, loader, schema, schema.targetNamespace || this.targetNamespace, location);
		}, this);
	}, this);
	// parse message
	Util.arrayEach(this.getChildByTagNameNS(json, 'message', wsdlNS), function(message) {
		this.message[message.name] = this.message[message.name] || { };
		Util.arrayEach(this.getChildByTagNameNS(message, 'part', wsdlNS), function(part) {
			var parsed = this.parseNamespace(part.element);
			this.message[message.name][part.name] = { 
				element: parsed.value,
				elementNamespace: parsed.namespace
			};
		}, this);
	}, this);
	// parse portType
	Util.arrayEach(this.getChildByTagNameNS(json, 'portType', wsdlNS), function(portType) {
		this.portType[portType.name] = { };
		Util.arrayEach(this.getChildByTagNameNS(portType, 'operation', wsdlNS), function(oper) {
			var input = this.parseNamespace(oper.input.message),
				output = this.parseNamespace(oper.output.message);
			this.portType[portType.name][oper.name] = {
				input: {
					message: input.value,
					messageNamespace: input.namespace
				},
				output: {
					message: output.value,
					messageNamespace: output.namespace
				}
			};
		}, this);
	}, this);
	// parse binding
	Util.arrayEach(this.getChildByTagNameNS(json, 'binding', wsdlNS), function(binding) {
		var targetPortType = this.parseNamespace(binding.type),
			soapBinding = this.getChildByTagNameNS(binding, 'binding', soapNS);
		this.binding[binding.name] = { 
			bindingStyle: soapBinding.style,
			bindingTransport: soapBinding.transport,
			portType: targetPortType.value,
			portTypeNamespace: targetPortType.namespace,
			operations: { }
		};
		Util.arrayEach(this.getChildByTagNameNS(binding, 'operation', wsdlNS), function(oper) {
			this.binding[binding.name].operations[oper.name] = {
				soapAction: this.getChildByTagNameNS(oper, 'operation', soapNS).soapAction,
				input: this.getChildByTagNameNS(oper.input, 'body', soapNS).use,
				outpus: this.getChildByTagNameNS(oper.output, 'body', soapNS).use
			}
		}, this);
	}, this);
	// parse service
	Util.arrayEach(this.getChildByTagNameNS(json, 'service', wsdlNS), function(service) {
		this.service[service.name] = { };
		Util.arrayEach(this.getChildByTagNameNS(service, 'port', wsdlNS), function(port) {
			var binding =  this.parseNamespace(port.binding);
			this.service[service.name][port.name] = {
				binding: binding.value,
				bindingNamespace: binding.namespace,
				location: this.getChildByTagNameNS(port, 'address', soapNS).location
			};
		},this);
	}, this);
}
util.inherits(WSDL, LocalContext);

module.exports = WSDL;