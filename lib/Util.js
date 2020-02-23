var os = require('os'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    events = require('events'),
    child_process = require('child_process'),
    ssh = require('ssh2'),
    uuid = require('node-uuid'),
    units = require('node-units'),
    esprima = require('esprima'),
    Contextify = require('contextify');

require('time')(Date);

exports.AWS = require("aws-sdk");
exports.request =  require('request');
exports.exec = child_process.exec;
exports.EOL = os.EOL;
exports.tmpdir = os.tmpdir;
exports.platform = os.platform;
exports.hostname = os.hostname;
exports.vm = require('vm');
exports.Contextify = Contextify;
exports.syntaxCheck = esprima.parse;
exports.uuid = uuid.v4;
exports.uuidv1 = uuid.v1;
exports.setTimeout = setTimeout;
exports.setInterval = setInterval;
exports.setImmediate = setImmediate;
exports.clearTimeout = clearTimeout;
exports.clearInterval = clearInterval;
exports.sep = path.sep;
exports.join = path.join;
exports.resolve = path.resolve;
exports.dirname = path.dirname;
exports.basename = path.basename;
exports.readFile = fs.readFile;
exports.readFileSync = fs.readFileSync;
exports.writeFile = fs.writeFile;
exports.writeFileSync = fs.writeFileSync;
exports.Buffer = Buffer;
exports.inspect = util.inspect;
exports.inherits = util.inherits;
exports.EventEmitter = events.EventEmitter;
var __laterQueue = { },
    __laterInterval = 10,
    __laterHandler = undefined,
    __onRunLater = function() {
        var newLaterQueue = { },
            shouldReschedule = false;
        exports.getOwnProperties(__laterQueue).forEach(function(t) {
            var remainTime = Number(t);
            if(remainTime === 0) {
                __laterQueue[t].forEach(function(cb) {
                    exports.setImmediate(cb);
                });
            } else {
                newLaterQueue[remainTime - __laterInterval] = __laterQueue[t];
                shouldReschedule = true;
            }
        });
        __laterQueue = newLaterQueue;
        if(shouldReschedule)
            __laterHandler = exports.setTimeout(__onRunLater, __laterInterval);
        else __laterHandler = undefined;
    };
exports.later = function(cb, timeout) {
    if(typeof cb !== 'function') return;
    else if(typeof timeout === 'number') {
        timeout = timeout - timeout % __laterInterval;
        __laterQueue[timeout] = __laterQueue[timeout] || [];
        __laterQueue[timeout].push(cb);
        if(!__laterHandler) __onRunLater();
    } else return exports.setImmediate(cb);
};
exports.random = function(max) {
    if(max) return Math.floor(Math.random() * max);
    else return Math.random();
};
exports.tabspace = function(num, width) {
    if(typeof num == 'undefined') num = 0;
    if(typeof num !== 'number') throw new Error('Argument should be number.');
    if(typeof width == 'undefined') width = 4;
    if(typeof width !== 'number') throw new Error('Argument should be number.');
    var result = '';
    for(var i = 0 ; i < num * width ; i++) result += ' ';
    return result;
}
exports.isFile = function(filePath) {
    var target = null;
    try { 
        filePath = path.resolve(filePath);
        target = fs.lstatSync(filePath);
    } catch(err) { target = null; }
    if((!target) || (!target.isFile())) return false;
    else return true;
}
exports.isDir = function(dirPath) {
    var target = null;
    try { 
        dirPath = path.resolve(dirPath);
        target = fs.lstatSync(dirPath);
    } catch(err) { target = null; }
    if((!target) || (!target.isDirectory())) return false;
    else return true;
}
exports.lsDir = function(dirPath) {
    try { return fs.readdirSync(dirPath); }
    catch(err) { return [] ; }
}
var __logWatcher = function() { };
exports.__defineSetter__('logWatcher', function(value) {
    if(typeof value === "function")
        __logWatcher = value;
    else throw new Error('Invalid log watcher function.');
});
exports.log = function(str, target) {
    if(!target || (typeof target.write !== 'function')) {
        process.stdout.write(str);
    } else target.write(str);
    DebugLog.insert(str, function(err, id) {
        __logWatcher(str);
    });
}
exports.extend = function(dest) { return { from: function(src) {
    if((!src )|| (!dest)) return;
    if(typeof src !== 'object') return;
    for(var prop in src) {
        if(!src.hasOwnProperty(prop)) continue;
        if(!dest.hasOwnProperty(prop)) {
            dest[prop] = src[prop];
            continue;
        }
        if((typeof dest[prop]) !==
           (typeof src[prop])) {
            if(Array.isArray(dest[prop]))
                dest[prop].push(src[prop])
            continue;
        } else {
            if((typeof src[prop] === 'string') &&
               (dest[prop] !== src[prop]))
                dest[prop] += src[prop];
            else if(Array.isArray(src[prop]))
                dest[prop] = dest[prop].concat(src[prop]);
            else if(Buffer.isBuffer(src[prop]))
                dest[prop] = Buffer.concat([
                    dest[prop],
                    src[prop]]
                );
            else if((typeof src[prop] === 'number') ||
                    (typeof src[prop] === 'boolean') ||
                    (typeof src[prop] === 'function'))
                dest[prop] = [dest[prop]].push(src[prop]);
            else exports.extend(dest[prop]).from(src[prop]);
        }
    }
} }; };
// This function must be seperated out, cause there's stringified reference...
function shallow(obj) {
    if(typeof obj === 'undefined' || obj === null) return null;
    if(obj instanceof String || typeof obj === 'string')  return obj.toString();
    else if(obj instanceof Number || typeof obj === 'number') return Number(obj.toString());
    else if(obj instanceof Boolean || typeof obj === 'boolean') return eval('(' + obj.toString() + ')');
    else if(obj instanceof Function || typeof obj === 'function') return eval('(' + obj.toString() +')');
    else if(obj instanceof RegExp) return eval(obj.toString());
    else if(Array.isArray(obj)) {
        var res = [];
        obj.forEach(function(o) { res.push(shallow(o)); });
        return res;
    } else {
        var result = {};
        for(var prop in obj) if(obj.hasOwnProperty(prop)) {
             result[prop] = shallow(obj[prop]);
        }
        return result;
    }
};
exports.shallow = shallow;
exports.arrayEach = function(target, cb, binding) {
    if(Array.isArray(target)) {
        target.forEach(cb, binding);
    } else if(target !== undefined) cb.call(binding, target, 0, [target]);
    else return;
};
exports.properties = function(obj, cb, binding) {
    for(var p in obj)
        if(obj.hasOwnProperty(p))
            cb.call(binding, p);
};
exports.walk = function(obj, cb, binding, payload) {
    if(typeof obj !== 'object') return;
    var objIsArray = Array.isArray(obj);
    exports.properties(obj, function(prop) {
        var payloadToUse = undefined;
        if(objIsArray && obj[prop]._$payload) {
            payloadToUse = obj[prop]._$payload;
            delete obj[prop]._$payload;
        } else payloadToUse = payload;
        exports.walk(obj[prop], cb, binding, cb.call(binding, prop, obj, payloadToUse));
    });
};
exports.getOwnProperties = function(object) {
    var result = [];
    for(var prop in object) if(object.hasOwnProperty(prop))
        result.push(prop);
    return result;
}
exports.sendMail = function (mailConfig, onFinish) {
    var config = JSON.parse(fs.readFileSync(__dirname + "/../mail.json").toString());
    if(!config) config = { };
    var smtpMailer = require('nodemailer').createTransport(
        "SMTP",
        // { host: mailConfig.host }
        {
            host: config.host || "smtp.office365.com",
            port: config.port || "587",
            auth: config.auth || {
                user: "Automation@Arcservemail.onmicrosoft.com",
                pass: "Boxa6033"
            }
        }
    );
    if(config.from) mailConfig.from = config.from;
    if(config.to) mailConfig.to = config.to;
    smtpMailer.sendMail(mailConfig, function(error, message) {
        smtpMailer.close();
        if(typeof onFinish == 'function')
            onFinish(error, message);
    });
}
// files: array[{name: string, content: string}]
exports.compress = function(files, onData, onFinish) {
    if(!Array.isArray(files)) return;
    var resultArchive = require('archiver')('zip');
    if(onData) resultArchive.on('data', onData);
    for(var i = 0 ; i < files.length ; i ++)
        resultArchive.append(files[i].contents, { name: files[i].name })
    if(onFinish) resultArchive.finalize(onFinish);
    else resultArchive.finalize();
}
var __unitConv = function(convStr) {
    //try { return require('node-units').convert(convStr); }
    try { return units.convert(convStr); }
    catch(err) {
        exports.log(convStr + '\n' + err.message + '\n' + err.stack + '\n');
        return '';
    }
}
exports.unitConv = __unitConv;
exports.lpad = function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};
var __last = Date.now(),
    __last_sub = 0;
exports.tid = function(time, width) {    
    width = width || 20; 
    if(time === undefined || time === null) time = Date.now();
    else if(typeof time === 'number') time = time;   
    else if(time instanceof Date) time = time.getTime();
    else if(typeof time === 'string') {
        time = Number(time);
        if(Number.isNaN(time)) throw new 
            Error('Invalid parameter.');
    } else throw new 
        Error('Invalid parameter.');
    
    if(time === __last) {
        var right = ++__last_sub;
        if(right > 9999) {
            __last += 1;
            __last_sub = 0;
            return exports.lpad(__last + '0000', width);
        } else return exports.lpad(
            time + '' + 
            exports.lpad(right, 4),
            width
        );
    } else {
        __last = time;
        __last_sub = 0;
        return exports.lpad(time + '0000', width);
    }
}

var Storer = function(getter, setter) { 
    if( getter && 
        ((typeof getter !== 'function') ||
         (getter.length !== 1)) )
       throw new Error('Invalid `getter\' provided.')
    if( setter && 
        ((typeof setter !== 'function') ||
         (setter.length !== 2)) )
       throw new Error('Invalid `setter\' provided.')
    var storedNames = {};
    this.__defineGetter__('get', function() {
        return function(name) {
            if(getter) return getter(name);
            else return this['_$_' + name];
        };
    });
    this.__defineGetter__('set', function() {
        return function(name, value) {        
            value = exports.shallow(value);
            //exports.log('Setting `' + name + '\' to `' + value + '\'\n'); 
            storedNames[name] = null;
            this['_$_' + name] = value;
            if(setter) setter(name, value);
        };
    });
    this.__defineGetter__('enumerate', function() {
        return function(callback) {
            for(var name in storedNames) 
                if(storedNames.hasOwnProperty(name))
                    callback(name);
        };
    });
    this.__defineGetter__('dump', function() {  
        var self = this;  
        return function() {    
            self.enumerate(function(prop) {
                exports.log(
                    prop + (prop.match(/:$/) ? '' : ':') + ' ' +
                    self.get(prop) + '\n'
                );
            });
        };
    })
    this.__defineGetter__('plain', function() {
        var result = {};
        for(var name in storedNames)
            if(storedNames.hasOwnProperty(name))
                result[name] = this['_$_' + name];
        return result;
    });
}
exports.Storer = Storer;

var Element = function(tag, properties, children, tab) {
    if(typeof tag !== 'string') throw new Error('\'tag\' can only be string type.');
    children = children || []
    if(!Array.isArray(children)) throw new Error('\'children\' can only be Array type.');
    this.tag = tag;
    this.prop = properties || {};
    this.children = children;
    this.tab = tab || 0;
}
Element.prototype.toString = function() {
    var result = '\n' + exports.tabspace(this.tab) + '<' + this.tag;
    for(var key in this.prop) {
        if(this.prop.hasOwnProperty(key)) {
            if(this.prop[key] && (typeof this.prop[key] !== 'string')) this.prop[key] = this.prop[key].toString();
            if((typeof this.prop[key] == 'string') && this.prop[key]) { 
                if(this.prop[key].indexOf(' ') >= 0) result += ' ' + key + '="' + this.prop[key] + '"';
                else  result += ' ' + key + '=' + this.prop[key] + '';
            } else result += ' ' + key.toString();
        }
    }
    result += '>';
    var needNewLine = false;
    for(var i = 0; i < this.children.length; i ++) {
        var child = this.children[i];
        if(child instanceof Element) {
            needNewLine = true;
            result += child.toString();
        } else {
            needNewLine = false;
            if(typeof child !== 'undefined' && child !== null)
                result += child.toString();
          /*var content = child.toString().split('\n');
            for(var i = 0 ; i < content.length; i++) {
                content[i] = exports.tabspace(this.tab + 1) + content[i];
            }
            result += content.reduce(function(priv, cur){ return priv + '\n' + cur; });*/
        }
    }
    if(needNewLine) result += '\n' + exports.tabspace(this.tab);
    result += '</' + this.tag + '>';
    return result;
}
Element.prototype.addChild = function(child) { if(!child) throw new Error('Empty child element.') ;this.children.push(child); }
Element.prototype.createChild = function(tag, properties, children, tab) {
    tab = tab || (this.tab + 1);
    var newChild = new Element(tag, properties, children, tab);
    this.addChild(newChild);
    return newChild;
}
exports.Element = Element;

// host - < string > - Hostname or IP address of the server. Default: 'localhost'
// port - < integer > - Port number of the server. Default: 22
// hostHash - < string > - 'md5' or 'sha1'. The host's key is hashed using this method and passed to the hostVerifier function. Default: (none)
// hostVerifier - < function > - Function that is passed a string hex hash of the host's key for verification purposes. Return true to continue with the connection, false to reject and disconnect. Default: (none)
// username - < string > - Username for authentication. Default: (none)
// password - < string > - Password for password-based user authentication. Default: (none)
// agent - < string > - Path to ssh-agent's UNIX socket for ssh-agent-based user authentication. Windows users: set to 'pageant' for authenticating with Pageant or (actual) path to a cygwin "UNIX socket." Default: (none)
// privateKey - < mixed > - Buffer or string that contains a private key for key-based user authentication (OpenSSH format). Default: (none)
// passphrase - < string > - For an encrypted private key, this is the passphrase used to decrypt it. Default: (none)
// publicKey - < mixed > - Optional Buffer or string that contains a public key for key-based user authentication (OpenSSH format). If publicKey is not set, it will be generated from the privateKey. Default: (none)
// tryKeyboard - < boolean > - Try keyboard-interactive user authentication if primary user authentication method fails. Default: false
// pingInterval - < integer > - How often (in milliseconds) to send SSH-level keepalive packets to the server. Default: (60000)
// readyTimeout - < integer > - How often (in milliseconds) to wait for the SSH handshake to complete. Default: (10000)
// sock - < ReadableStream > - A ReadableStream to use for communicating with the server instead of creating and using a new TCP connection (useful for connection hopping).
var SSHTarget = function() {
    if(!(this instanceof SSHTarget))
        return new SSHTarget;
    events.EventEmitter.call(this);
    this._$conf = { };
    this._$keyboardResponse = '';
};
util.inherits(SSHTarget, events.EventEmitter);
var sshConnEvents = [
        'banner',
        'ready',
        'tcp connection',
        'srcIP',
        'srcPort',
        'dstIP',
        'dstPort',
        'x11',
        'srcIP',
        'srcPort',
        //'keyboard-interactive',
        'change password',
        'error',
        'end',
        'close',
        'debug'
    ],
    sshConnMethods = [
        //'connect',
        'exec',
        'shell',
        'forwardIn',
        'unforwardIn',
        'forwardOut',
        'sftp',
        'subsys',
        'end'
    ],
    confItems = [
        'host',
        'port',
        'username',
        'password',
        'agent',
        'privateKey',
        'passphrase',
        'publicKey'
        //'tryKeyboard'
    ];
// tryKeyboard
SSHTarget.prototype.__defineGetter__('_sock', function() { 
    if(this._$connection) return this._$connection._sock;
    else return undefined;
});
SSHTarget.prototype.__defineGetter__('keyboardResponse', function() { return this._$keyboardResponse; }); 
SSHTarget.prototype.__defineSetter__('keyboardResponse', function(value) { 
    if(value && Array.isArray(value)) this._$keyboardResponse = value; 
    else if(value) this._$keyboardResponse = [value]; 
    else this._$keyboardResponse = undefined; 
});
confItems.forEach(function(item) {
    SSHTarget.prototype.__defineSetter__(item, function(value) { 
        if((value === null) || (value === undefined))
            delete this._$conf[item];
        else this._$conf[item] = value;
    });
    SSHTarget.prototype.__defineGetter__(item, function() { return this._$conf[item]; }); 
});
sshConnMethods.forEach(function(method) {
    SSHTarget.prototype[method] = function() {
        if(this._$connection instanceof ssh)
            this._$connection[method].apply(this._$connection, arguments);
    }
});
SSHTarget.prototype.connect = function(conf) {
    var st = this;
    if(conf) {
        confItems.forEach(function(item) { if(conf[item]) st[item] = conf[item]; });
        if(conf.keyboardResponse) st.keyboardResponse = conf.keyboardResponse;
    }
    st._$connection = new ssh;
    // try emulating an interactive console if possible
    st._$conf['tryKeyboard'] = true;
    st._$conf['readyTimeout'] = 60000; // Give user time to input
    if(typeof conf.debug === 'function') 
        st._$conf['debug'] = conf.debug;
    if(!st.keyboardResponse && st.password)
        st.keyboardResponse = [st.password];
    st._$connection.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
        if(Array.isArray(st.keyboardResponse)) { // respond with predefined message(s)
            if(instructions) st.emit('prompt', instructions);
            var promptPhase = 0;
            for(promptPhase = 0 ; promptPhase < st.keyboardResponse.length; promptPhase ++) {
                st.emit('prompt', prompts[promptPhase].prompt);
                if(prompts[promptPhase].echo) st.emit('prompt', st.keyboardResponse[promptPhase]);
                else st.emit('prompt', '[auto answered by saved config]\r\n');
            }
            if(promptPhase < prompts.length) {
                st.emit('prompt', prompts[promptPhase].prompt);
                st.answer = function(data) {
                    data = data.toString();
                    st.keyboardResponse[promptPhase] = st.keyboardResponse[promptPhase] || '';
                    if(prompts[promptPhase].echo)
                        st.emit('prompt', data.replace(/\r$/, ''));
                    if(/\r$/.test(data)) {
                        st.keyboardResponse[promptPhase] += data.replace(/\r$/, '');
                        st.emit('prompt', '\r\n');
                        promptPhase += 1;
                        if(promptPhase === prompts.length) {
                            exports.log('Auth response: ' + exports.inspect(st.keyboardResponse) + '\n');
                            delete st.answer;
                            finish(st.keyboardResponse);
                        } else st.emit('prompt', prompts[promptPhase].prompt);
                    } else st.keyboardResponse[promptPhase] += data;
                };                    
            } else {
                exports.log('Auth response: ' + exports.inspect(st.keyboardResponse) + '\n');
                delete st.answer;
                finish(st.keyboardResponse);
            }
        } else { // collect user input and continue auth
            var promptPhase = 0,
                res = [];
            st.emit('prompt', instructions);
            st.emit('prompt', prompts[promptPhase].prompt);
            delete st.answer;
            st.answer = function(data) {
                data = data.toString();
                res[promptPhase] = res[promptPhase] || '';
                if(prompts[promptPhase].echo) 
                    st.emit('prompt', data.replace(/\r$/, ''));
                if(/\r$/.test(data)) {
                    res[promptPhase] += data.replace(/\r$/, '');
                    st.emit('prompt', '\r\n');
                    promptPhase += 1;
                    if(promptPhase === prompts.length) {
                        exports.log('Auth response: ' + exports.inspect(res) + '\n');
                        delete st.answer;
                        finish(res);
                    } else st.emit('prompt', prompts[promptPhase].prompt);
                } else res[promptPhase] += data;
            };
        }
    });

    sshConnEvents.forEach(function(event) {
        st._$connection.on(event, function() {
            var args = [event];
            for(var i = 0; i < arguments.length; i ++)
                args[i + 1] = arguments[i];
            st.emit.apply(st, args);
        });
    });
    //exports.log('Connect conf: ' + exports.inspect(st._$conf) + '\n');
    st._$connection.connect(st._$conf);
};
exports.SSHTarget = SSHTarget;

var ConnectorSelector = function(searchPath) {
    var conns = [],
        expectsFuncs = [
            'Connector',
            'renderResult',
            'translateStatus',
            'validateOperation',
            'validataType'
        ];
    exports.lsDir(searchPath).forEach(function(connectorFile) {
        exports.log('Checking possible connector in file: `' + connectorFile + '\' ... ');
        var conn = undefined,
            error = undefined;
        try { conn = require(exports.resolve(searchPath, connectorFile)); }
        catch(err) { 
            conn = { }; 
            error = err;
        }
        if(typeof conn.type !== 'string') {
            exports.log('ignored.\n');
            exports.log('    Missing target type definition.\n');
            if(error) {
                exports.log('Error: ' + error.message + '\n');
                exports.log('Stack: ' + error.stack + '\n');
            }
            return;
        }
        for(var i = 0; i < expectsFuncs.length; i ++)
            if(typeof conn[expectsFuncs[i]] !== 'function') {
            exports.log('ignored.\n');
            exports.log('    Missing function `' + expectsFuncs[i] + '\'.\n');
            if(error) {
                exports.log('Error: ' + error.message + '\n');
                exports.log('Stack: ' + error.stack + '\n');
            }
            return;
        }
        conns.push(conn);
        exports.log('loaded.\n');
    });

    this.__defineGetter__('get', function() {
        return function(type) {
            for(var i = 0 ; i < conns.length; i++) {
                try { 
                    if(conns[i].validataType(type))
                        return conns[i];
                } catch(err) { continue; }
            }
            return null;
        };
    });
    var types = [];
    for(var i = 0 ; i < conns.length; i++) {
        try { types.push(conns[i].type) }
        catch(err) { continue; }
    }
    this.__defineGetter__('types', function() { return types; });
}
exports.ConnectorSelector = ConnectorSelector;

exports.__defineGetter__('now', function() { return new Date; });
exports.__defineGetter__('utcseconds', function() { 
    return Math.floor((new Date).getTime()/1000);
});

exports.__defineGetter__('isSlave', function() {
    if(process.env['SLAVE_AUTOMATOR']) return true;
    else return false;
});

exports.__defineGetter__('locks', function() { return Locks; });

/**
 * Late imports
 */
var DebugLog = require('./models/DebugLog');
var Locks = require('./models/Locks');
