var Util = require(__dirname + '/../../Util.js'),
    Expects = require(__dirname + '/Expects.js'),
    Reports = require(__dirname + '/ReportRender.js');

var Standalone = function() {
    String.prototype.__defineGetter__('nicename', function() { 
        try { return Util
                .basename(Util.resolve(this + ''))
                .replace(/\.case$/, '')
                .replace(/\.suite$/, '');
        } catch(err) { return ''; }
    } );
    String.prototype.__defineGetter__('suitePath', function() { 
        var __suitePath = '';
        if(Util.isDir(this + '')) __suitePath = Util.resolve(this + '');
        if((!this.match(/\.suite$/)) && Util.isDir(this + '.suite'))
            __suitePath = Util.resolve(this + '.suite');
        if(Util.isFile(Util.resolve(__suitePath, 'suite.conf')))
            return __suitePath;
        return '';
    } );
    String.prototype.__defineGetter__('casePath', function() {
        if(Util.isFile(this + '')) return Util.resolve(this + '');
        else if((!this.match(/\.case$/)) && Util.isFile(this + '.case'))
            return Util.resolve(this + '.case');
        else return '';
    } );
    String.prototype.__defineGetter__( 'content', function() {
        try { 
            if((this + '').casePath)
                return Util.readFileSync((this + '').casePath,'ascii');
            else if((this + '').suitePath)
                return Util.readFileSync(
                    Util.resolve((this + '').suitePath, 'suite.conf'),
                    'ascii'
                );
            else return '';
        } catch(err) { return ''; }
    } );
}
Standalone.prototype.tryGetTitle = function(passed) {
    if(this.suiteGlobal.get('Digest'))
        return this.suiteGlobal.get('Digest');
    else if(this.mailConfig.subject) {
        try {
            return Util.vm.runInNewContext(
                this.mailConfig.subject,
                { 
                    SUITE: this.suiteGlobal,
                    passed: passed
                }
            );
        } catch(err) {
            Util.log( err.message + '\n' + err.stack + '\n');
            return this.mailConfig.subject;
        }
    } else return 'Automation Report';
}
Standalone.prototype.sendMail = function(report) {
    var self = this;
    Util.sendMail({
        host: this.mailConfig.smtp,
        from: this.mailConfig.sendas,
        to: this.mailConfig.to,
        subject: this.tryGetTitle(report.passed),
        html: report.summary,
        attachments: report.files,                                    
    }, function(error) {
        if(error) Util.log(
            'Failed to send mail: ' + 
            error.message + '\n'
        );
        else Util.log(
            'Report sent to ' + 
            self.mailConfig.to + '\n'
        );
    });
}
Standalone.prototype.__onCaseFinish = function(caseFile, suiteDir) {
    var self = this;
    //We're running individual cases, one of them finished.
    if(this.cases) { 
        var finished = true;
        Util.getOwnProperties(this.cases).forEach(function(case_) {
            if(self.cases[case_] === null)
                finished = false;
        })
        if(finished) {
            this.suiteGlobal.set('Finish Time:', Util.now.toString());
            Reports.generateCasesReport(
                this.cases, 
                this.suiteGlobal, 
                function(report) {
                if(self.mailConfig.to)
                    self.sendMail(report);
                else Util.log(
                    Util.inspect(report, { depth: null }),
                    process.stdout
                );
            });
        }
        return;
    } else if((!caseFile) || (!suiteDir) || (!this.suites)) throw new
        Error('Unexpected error.');
    // We're running suites, one of the cases in them finished.
    var cases = Util.getOwnProperties(this.suites[suiteDir]),
        caseIdx = cases.indexOf(caseFile);
    if(caseIdx !== (cases.length - 1)) {
        // It's not the last case in a suite, just continue to the next.
        this.runCase(cases[caseIdx + 1], suiteDir);
        return;
    }
    // At least one suite is finished now, check if it's the last one.
    var finished = true;
    Util.getOwnProperties(this.suites).forEach(function(suite) {
        Util.getOwnProperties(self.suites[suite]).forEach(function(caseName) {
            if(self.suites[suite][caseName] === null)
                finished = false;
        })
    })
    if(finished) {
        this.suiteGlobal.set('Finish Time:', Util.now.toString());
        Reports.generateSuitesReport(
            this.suites, 
            this.suiteGlobal,
            function(report) {
            if(self.mailConfig.to)
                self.sendMail(report);
            else Util.log(
                Util.inspect(report, { depth: null }),
                process.stdout
            );
        });
    }
}
Standalone.prototype.runSuite = function(suiteDir) {
    Util.log('Running suite \'' + suiteDir.nicename + '\'\n');
    var ctx = Util.vm.createContext({ SUITE: this.suiteGlobal });
    try { 
        var caseList = Util.vm.runInContext(
            suiteDir.content,
            ctx,
            suiteDir.suitePath
        );
        if(!Array.isArray(caseList)) throw new
            Error('Case list array should be defined in `suite.conf\'');
    } catch(err) { 
        Util.log(
            'Failed to load suite `' + 
            suiteDir.nicename + '\'.\n' +
            'Error: ' + err.message + '\n' +
            err.stack + '\n'
        );
    }
    this.suites[suiteDir] = {};
    for(var i = 0 ; i < caseList.length ; i++)
        this.suites[suiteDir][caseList[i]] = null;
    // Only need to launch the first case.
    // Others should be run one in one.
    if(caseList.length)
        this.runCase(caseList[0], suiteDir);
}
Standalone.prototype.runCase = function(caseFile, suiteDir, sync) {
    var self = this;
    if(!sync) { Util.later(function() {
        self.runCase(caseFile, suiteDir, true);
    }); return; }
    Util.log('Running case \'' + caseFile.nicename + '\'');
    if(suiteDir) Util.log(' of suite `' + suiteDir.nicename + '\'');
    Util.log('.\n');
    var case_ = new Expects(this.suiteGlobal);
    case_.discoverOperations(Util.resolve(
        Util.dirname(module.filename),
        '..', 'operations'
    ));
    if(suiteDir) case_.loadCase((Util.resolve(
        suiteDir,
        caseFile.nicename
    )).content); else case_.loadCase(caseFile.content);
    if(case_.loaded) { 
        case_.on('end', function() {     
            var res = {
                    passed : case_.passed,
                    operations: case_.operationResults
                };
            if(self.cases) self.cases[caseFile] = res;
            else if(self.suites && suiteDir)
                self.suites[suiteDir][caseFile] = res;
            self.__onCaseFinish(caseFile, suiteDir);
        });
        case_.runCase();
    } else {
        var res = { 
                passed : false,
                message: 'Failed to load case file: ' + case_.message
            };
        if(this.cases) this.cases[caseFile] = res;
        else if(this.suites && suiteDir)
            this.suites[suiteDir][caseFile] = res;
        this.__onCaseFinish(caseFile, suiteDir);
    }
}
Standalone.prototype.showHelp = function() {
    var basename = Util.basename(process.argv[1]);
    console.log('Usage:\n' +
                '    node ' + basename + ' --suite <case suite folder path> [--suite <path>] ...\n' +
                '     or\n' +
                '    node ' + basename + ' --case <case file path> [--case <path>] ...\n' +
                '\n' +
                '  To send results as email:\n' +
                '    --to <recipients>            Example: `user@ca.com,tester@ca.com\'\n' +
                '    --sendas <sender address>    Default: `LinuxD2DAuto@ca.com\'\n' +
                '    --smtp <smtp server>         Default: `mail.ca.com\'\n' + 
                '    --subject <mail subject>\n'
    );
};

Standalone.prototype.run = function(slaveFunction) {
    // if(Util.isSlave) Util.log('Automator running in slave mode.\n');
    var _MailConfig = {
            smtp: 'mail.ca.com',
            sendas: 'LinuxD2DAuto@ca.com',
            to: null,
            subject: 
                '"[" + (passed ? "ACCEPTED" : "REJECTED") + "]"' + 
                ' + "[" + SUITE.get("Build Version:") + "]"' +
                ' + SUITE.get("Product:") + " "' +
                ' + SUITE.get("Release:") + " "' +
                ' + SUITE.get("Description:")'
        },        
        _Cases = undefined,
        _Suites = undefined;
    this.__defineGetter__('mailConfig', function() { return _MailConfig; } );
    this.__defineGetter__('cases', function() { return _Cases; } );
    this.__defineGetter__('suites', function() { return _Suites; } );
    for(var idx = 0 ; idx < process.argv.length; idx++) {
        var arg = process.argv[idx];
        if (idx < 2) continue;        
        else if(arg == '--case') {
            if(!_Cases) _Cases = {};
            if(_Suites) {
                _Suites = undefined;
                _Cases = undefined;
                idx =  Number.MAX_VALUE;
            } else {
                var para = process.argv[idx + 1];
                if((typeof para === 'string') && para.casePath)
                    _Cases[para] = null;
                else Util.log(
                    'Ignored invalid case `' +
                    para + '\'.\n'
                );
            }
        } else if(arg == '--suite') {
            if(!_Suites) _Suites = {};
            if(_Cases) {
                _Suites = undefined;
                _Cases = undefined;
                idx =  Number.MAX_VALUE;
            } else {
                var para = process.argv[idx + 1];
                if((typeof para === 'string') && para.suitePath)
                    _Suites[para] = null;
                else Util.log(
                    'Ignored invalid suite `' +
                    para + '\'.\n'
                );
            }
        } else if(arg == '--sendas') 
            this.mailConfig.sendas = process.argv[idx + 1];
        else if(arg == '--smtp') 
            this.mailConfig.smtp = process.argv[idx + 1];
        else if(arg == '--to')
            this.mailConfig.to = process.argv[idx + 1];
        else if(arg == '--subject')
            this.mailConfig.subject = process.argv[idx + 1];        
    }
    var setter = null;
    if(Util.isSlave) setter = function(name, value) {
        process.send({
            type: 'updateSuiteGlobal', 
            name: name,
            value: value
        });
    }
    var suiteGlobal = new Util.Storer(null, setter);
    suiteGlobal.set('Launch Time:', Util.now.toString());
    suiteGlobal.set('Finish Time:', Util.now.toString());
    this.__defineGetter__(
        'suiteGlobal',
        function() { return suiteGlobal; }
    );
    if(Util.isSlave) { 
        if(typeof slaveFunction !== 'function') throw new 
            Error('No proper slave function provided.');
        slaveFunction();
        return;
    } 
    var self = this;
    if(_Cases) Util.getOwnProperties(_Cases).forEach(function(case_) {
        self.runCase(case_);
    });
    else if(_Suites) Util.getOwnProperties(_Suites).forEach(function(suite) {
        self.runSuite(suite);
    });
    else this.showHelp();
};


module.exports = Standalone;
