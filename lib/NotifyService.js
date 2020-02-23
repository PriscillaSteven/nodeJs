var Util = require(__dirname + '/Util.js'),
    User = require(__dirname + '/models/User'),
    ServerState = require(__dirname + '/models/ServerState'),
    TestHistory = require(__dirname + '/models/TestHistory'),
    TestStatusLog = require(__dirname + '/models/TestStatusLog');

var summaryStyles = '\
table { border: solid #CCCCCC 1.0pt; }\
table tr td {\
    border: solid #CCCCCC 1.0pt;\
    padding: .75pt .75pt .75pt .75pt;\
    font-size: 10.0pt;\
    white-space:nowrap;\
}\
.spliter_div { height: 20px; }\
.title {\
    color: white;\
    background: #336699;\
    font-size: 13.0pt;\
}\
.header_color { background: #F4E9D3; }\
.center_text { text-align: center; }\
.header_color_center_text {\
    background: #F4E9D3;\
    text-align: center;\
}\
.red { color: red; }\
.red_center_text {\
    color: red;\
    text-align: center;\
}\
.header_color_red_center_text {\
    color: red;\
    background: #F4E9D3;\
    text-align: center;\
}\
.green { color: green; }\
.green_center_text {\
    color: green;\
    text-align: center;\
}\
.header_color_green_center_text {\
    color: green;\
    background: #F4E9D3;\
    text-align: center;\
}';

function Report(instance) { 
	this.instance = Util.shallow(instance); 
	this.instance.global = { };
}
Report.prototype.updateGlobal = function(status) {
	try {
		if(status.mainType === 'updateSuiteGlobal') {
			this.instance.global[status.name] = status.value;			
			Util.log('Upating ' + status.name + ' to ' + status.value + '\n');
		}
	} catch(ex) { 
		Util.log('Failed to parse status: ' + Util.inspect(status) + '\n');
	}

};
Report.prototype.getReport = function() {
	var suites = this.instance.suites;
	var global = this.instance.global;
	try {
	    var suiteNames = Util.getOwnProperties(suites),
	        totalCases = 0,
	        totalSuites = suiteNames.length,
	        passedCases = 0,
	        passedSuites = 0;
	    suiteNames.forEach(function(sname) {
	        var suite = suites[sname];
	        totalCases += suite.cases.length;
	        suite.cases.forEach(function(case_) {
	            if(case_.passed) passedCases += 1;
	        });
	        if(suite.passed) passedSuites += 1;
	    });
	    
	    var html = new Util.Element('html'),
	        head = html.createChild('head'),
	        style = head.createChild('style',{},[summaryStyles]),
	        body = html.createChild('body'),
	        passed = (totalSuites === passedSuites),
	        env_table = body.createChild('table');
	    env_table.createChild('tr')
	             .createChild('td',{colspan: 7, class: 'title'}, ['Summary']);
	    env_table.createChild('tr',null, [ 
	        new Util.Element(
	            'td',
	            {colspan: 3, class: 'header_color'}, 
	            ['Overall Status:']
	        ),
	        new Util.Element(
	            'td',
	            {colspan: 4, class: (passed?'green':'red')}, 
	            [(passed?'ACCEPTED':'REJECTED')]
	        )
	    ]);
	    Util.getOwnProperties(global).forEach(function(prop) {
	    	env_table.createChild(
	            'tr',
	            null,
	            [ new Util.Element(
	                'td',
	                {colspan: 3, class: 'header_color'}, 
	                [prop]
	              ), new Util.Element(
	                'td',
	                {colspan: 4},
	                [(typeof global[prop] === 'string') ? global[prop].replace(/\n/g, "<br>") : global[prop]]
	              )
	            ]
	        );
	    });
	        
	    body.createChild('div', {class: 'spliter_div'}, ['<span>&nbsp<span>']);      
	    
	    var coverage_table = body.createChild('table');
	    coverage_table.createChild('tr', null, [
	        new Util.Element(
	            'td', {colspan: 17, class: 'title'}, ['Suites Statistic'] ),
	        new Util.Element(
	            'td',{colspan: 17, class: 'title'}, ['Total Cases Statistic'])
	    ]);
	    coverage_table.createChild('tr',{nowrap:null}, [
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, []),
	        new Util.Element('td',{colspan: 5, class: 'header_color_center_text'}, ['Passed']),
	        new Util.Element('td',{colspan: 5, class: 'header_color_center_text'}, ['Failed']),
	        new Util.Element('td',{colspan: 6, class: 'header_color_center_text'}, ['Total Test Suites']),
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, []),
	        new Util.Element('td',{colspan: 5, class: 'header_color_center_text'}, ['Passed']),
	        new Util.Element('td',{colspan: 5, class: 'header_color_center_text'}, ['Failed']),
	        new Util.Element('td',{colspan: 6, class: 'header_color_center_text'}, ['Total Test Cases'])
	    ]);
	    coverage_table.createChild('tr',{nowrap:null}, [
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, ['#']),
	        new Util.Element('td',{colspan: 5, class: 'green_center_text'}, [passedSuites]),
	        new Util.Element('td',{colspan: 5, class: 'red_center_text'}, [totalSuites - passedSuites]),
	        new Util.Element('td',{colspan: 6, class: 'center_text'}, [totalSuites]),
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, ['#']),
	        new Util.Element('td',{colspan: 5, class: 'green_center_text'}, [passedCases]),
	        new Util.Element('td',{colspan: 5, class: 'red_center_text'}, [totalCases - passedCases]),
	        new Util.Element('td',{colspan: 6, class: 'center_text'}, [totalCases])
	    ]);
	    coverage_table.createChild('tr',{nowrap:null}, [
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, ['%']),
	        new Util.Element('td',{colspan: 5, class: 'green_center_text'}, [(passedSuites/totalSuites*100).toPrecision(4)+'%']),
	        new Util.Element('td',{colspan: 5, class: 'red_center_text'}, [((totalSuites-passedSuites)/totalSuites*100).toPrecision(4)+'%']),
	        new Util.Element('td',{colspan: 6, class: 'center_text'}, ['100.0%']),
	        new Util.Element('td',{colspan: 1, class: 'header_color_center_text'}, ['%']),
	        new Util.Element('td',{colspan: 5, class: 'green_center_text'}, [(passedCases/totalCases*100).toPrecision(4)+'%']),
	        new Util.Element('td',{colspan: 5, class: 'red_center_text'}, [((totalCases-passedCases)/totalCases*100).toPrecision(4)+'%']),
	        new Util.Element('td',{colspan: 6, class: 'center_text'}, ['100.0%'])
	    ]);
	    body.createChild('div', {class: 'spliter_div'}, ['<span>&nbsp<span>']);                    
	    
	    var details_table = body.createChild('table');
	    details_table.createChild('tr')
	                 .createChild('td',{colspan: 10, class: 'title'}, ['Details']);
	    details_table.createChild('tr',null, [
	        new Util.Element(
	            'td',{colspan: 4, class: 'header_color_center_text'}, ['Suite']),
	        new Util.Element(
	            'td',{colspan: 6, class: 'header_color_center_text'}, ['Cases'])
	    ]);
	    suiteNames.forEach(function(sname) {
	        var suite = suites[sname],
	        	suite_tr = details_table.createChild('tr');
	        suite_tr.createChild('td', {
	            colspan: 4,
	            class: 'header_color_' + (suite.passed?'green':'red') + '_center_text'
	        }, [sname]);
	        var cases_tr = suite_tr.createChild('td', {colspan: 6} );
	        suite.cases.forEach(function(case_, idx) {
	            var idxstr = idx + '.';
	            if(idxstr.length == 2) idxstr += ' ';
	            cases_tr.createChild('div',{
	                class: (case_.passed ? 'green' : 'red')
	            }, [idxstr + case_.name]);
	        });
	    });
	    
	    return html.toString();
	    // callback({ 
	    //     summary: html.toString(), 
	    //     passed: passed,
	    //     files: [{ 
	    //         fileName: 'log.json',
	    //         contents: Util.inspect(suites, { depth: null }),
	    //     }]
	    // });
    } catch(err) {
        // callback({ 
        //     summary: err.message, 
        //     passed: false,
        //     files: [{ 
        //         fileName: 'log.json',
        //         contents: Util.inspect(suites, { depth: null }),
        //     }]
        // });
		Util.log('Failed generate report: ' + err.message + '\n' + err.stack + '\n');
		return Util.inspect(suites, { depth: null });
    }
};
// host: this.mailConfig.smtp,
// from: this.mailConfig.sendas,
// to: this.mailConfig.to,
// subject: this.tryGetTitle(report.passed),
// html: report.summary,
// attachments: report.files,      
var smtp = 'mail.ca.com',
	sendas= 'arcserve.automation@ca.com';
function NotifyService() { }
NotifyService.prototype.sendTestReport = function(maintainer, testInstanceId) {
	if(typeof testInstanceId !== 'string') {
		Util.log('Error generating report: No instance specified.\n');
		return;
	}
	if(!(maintainer instanceof User)) {
		Util.log('Error generating report: Invalid user ' + Util.inspect(maintainer) + '\n');
		return;
	}
	var start = Util.now.getTime(),
		reportGen = function(instance) {
			var //rawReport = '',
				report = new Report(instance);		
			//rawReport += Util.inspect(instance, { depth: null }) + '\n';
			TestStatusLog.range(instance.start, instance.end).filter({
				instance: testInstanceId,
			}).each(function(statusLog, p, d, stop) {
				//rawReport += Util.inspect(statusLog, { depth: null }) + '\n';
				report.updateGlobal(statusLog);
			}, function(err) {
				report.updateGlobal({
					mainType: 'updateSuiteGlobal', 
					name: 'Finish Time:', 
					value: new Date(instance.end).toString()
				});
				report.updateGlobal({
					mainType: 'updateSuiteGlobal', 
					name: 'Detailed Report:', 
					value: '<a href="http://' + Util.hostname() + '/report/' + 
						testInstanceId + '?start=' + instance.start + '">Click</a>'
				});
				Util.log('Finished generating report in ' + (Util.now.getTime() - start) + 'ms.\n');
				var subject = '[' + (instance.passed ? 'ACCEPTED' : 'REJECTED') + ']';
				if(instance.trigger && instance.trigger.trim() && instance.env[instance.trigger.trim()])
					subject += '[' + instance.env[instance.trigger.trim()] + ']';
				subject += instance.testDefinition;
				Util.sendMail({
			        host: smtp, from: 'Automation@arcserve.com', //sendas,
			        to: "Yu.Lu@arcserve.com", //maintainer.user + '@ca.com',
			        //bcc: 'luvyu01@ca.com',
			        subject: subject,
			        html: report.getReport(),  
			        //attachments:[{fileName: 'raw.log', contents: rawReport}]                             
			    }, function(error) {
			        if(error) Util.log('Failed to send mail: ' + error.message + '\n');
			        else Util.log('Report sent to ' + maintainer.user + '\n');
			        Util.log('Total ' + (Util.now.getTime() - start) + 'ms.\n');
			    });
			});
		};
	Util.log('Start sending report.\n');
	TestHistory.range(0, start, true).filter({
		instance: testInstanceId
	}).each(function(instance, p, d, stop) {
		stop(); 
		reportGen(instance);
	}, function(err) { 
		Util.log('WARNNING: not found, time maybe wrong, retrying ...\n');
		TestHistory.range(start, 99999999999999999999).filter({
			instance: testInstanceId
		}).each(function(instance, p, d, stop) {
			stop(); 
			reportGen(instance)
		}, function(err) { 			
			Util.log('Error generating report: Test instance not found: ' + testInstanceId + '\n');
		});	
	});	
};
NotifyService.prototype.generateTestSummary = function(testInstanceId, start, cb) {
	if(typeof cb !== 'function') {
		Util.log('Error generating report: Invalid callback.\n');
		return;
	}
	var reverse = false;
	if(typeof start !== 'number') {
		 start = 0;
		 reverse = true;
	}
	var reportGen = function(instance) {
		var //rawReport = '',
			report = new Report(instance);		
		//rawReport += Util.inspect(instance, { depth: null }) + '\n';
		TestStatusLog.range(instance.start, instance.end).filter({
			instance: testInstanceId,
		}).each(function(statusLog, p, d, stop) {
			//rawReport += Util.inspect(statusLog, { depth: null }) + '\n';
			report.updateGlobal(statusLog);
		}, function(err) {
			if(err) { cb(err); return; }
			report.updateGlobal({
				mainType: 'updateSuiteGlobal', 
				name: 'Finish Time:', 
				value: new Date(instance.end).toString()
			});
			Util.log('Finished generating report in ' + (Util.now.getTime() - start) + 'ms.\n');
			var subject = '[' + (instance.passed ? 'ACCEPTED' : 'REJECTED') + ']';
			if(instance.trigger && instance.trigger.trim() && instance.env[instance.trigger.trim()])
				subject += '[' + instance.env[instance.trigger.trim()] + ']';
			subject += instance.testDefinition;
			cb(null, subject, report.getReport());
		});
	}
	TestHistory.range(0, start, reverse).filter({
		instance: testInstanceId
	}).each(function(instance, p, d, stop) {
		stop(); 
		reportGen(instance)
	}, function(err) { 
		Util.log('WARNNING: not found, time maybe wrong, retrying ...\n');
		TestHistory.range(start, 99999999999999999999).filter({
			instance: testInstanceId
		}).each(function(instance, p, d, stop) {
			stop(); 
			reportGen(instance)
		}, function(err) { 			
			Util.log('Error generating report: Test instance not found: ' + testInstanceId + '\n');
			cb(err);
		});	
	});	
};
NotifyService.prototype.updateTestProgressToPortal = function(maintainer, testInstanceId) {	
	var updateProtal = function(instance) {
		if(!instance.testConfig || !instance.testConfig.autoUpdateProtal) return;
		Util.properties(instance.suites, function(suiteName) {
			var suite = instance.suites[suiteName],
				updateData = {
					bqname: suiteName,
					casenumber: suite.cases.length,
					passedcasenumber: 0, 
					failedcasenumber: 0,
					remaincasenumber: suite.cases.length,
					runmachine: Util.hostname(), 
					buildnumber: 'None',
					status: 'InProgress',
				 	comment: 'None',
				 	timetaken: (Util.now.getTime() - suite.start),
				 	platform: Util.platform(),
				 	owner: maintainer.user
				};
			Util.arrayEach(suite.cases, function(case_) {
				if(case_.end) updateData.remaincasenumber -= 1;
				if(case_.end && !case_.passed) updateData.failedcasenumber += 1;
				if(case_.end && case_.passed) updateData.passedcasenumber += 1;
			});
			if(suite.finished && suite.passed) updateData.status = 'Passed';
			else if(suite.finished && !suite.passed) updateData.status = 'Failed';
			else updateData.status = 'InProgress';
			if(suite.finished) updateData.comment = 
				'http://' + Util.hostname() + '/report/' + testInstanceId + '?start=' + instance.start;
			var sendStatus = function() {
				Util.request({
					url: "http://mabji01-hm02:3000/bqinfos/updatedb",
					method: "POST",
					body: JSON.stringify(updateData),
					headers: {
						"Content-type": "application/json",
						"Accept": "application/json"
					}
				}, function(err, response, body) {
					Util.log('Update protal `' + "http://mabji01-hm02:3000/bqinfos/updatedb" + '\'' +
						(response ? (' \nstatusCode: ' + response.statusCode) : '') + 
						(err ? (' \nerror: ' + err.message) : '') + 
						(body ? (' \nresponse: ' + body) : '') + 
						'\n');
				});
			}
			TestStatusLog.range(instance.start, instance.start + 24 * 3600 * 1000).filter({
				instance: testInstanceId,
			}).each(function(statusLog, p, d, stop) {
				if(statusLog.mainType === 'updateSuiteGlobal' && statusLog.name === 'Build Version:') {
					stop();
					if(statusLog.value.toString().indexOf('.') == -1)
						updateData.buildnumber = 'r7.0.' + statusLog.value + '.0.0';
					else updateData.buildnumber = 'r7.0.' + statusLog.value + '.0';
					sendStatus();
				}
			}, function(err) {
				updateData.buildnumber = 'None';
				sendStatus();
			});
		});
	};
	var start = Util.now.getTime();
	TestHistory.range(0, start, true).filter({
		instance: testInstanceId
	}).each(function(instance, p, d, stop) {
		stop(); 
		updateProtal(instance);
	}, function(err) { 
		Util.log('WARNNING: not found, time maybe wrong, retrying ...\n');
		TestHistory.range(start, 99999999999999999999).filter({
			instance: testInstanceId
		}).each(function(instance, p, d, stop) {
			stop(); 
			updateProtal(instance)
		}, function(err) { 			
			Util.log('Error generating report: Test instance not found: ' + testInstanceId + '\n');
		});	
	});	
}

module.exports = new NotifyService();
