var Util = require(__dirname + '/../../Util.js');

var generateCasesSummary = function(suite_result, title) {
//suite_result : [
//    {
//        fileName: suite_config[current_case_idx],
//        passed: passed,
//    },
//    ...
//]
//returns: html string
    if(typeof title == 'string') title = title.replace(/\//g, '');
    var html = new Util.Element('html');
    var head = html.createChild('head');
    var style = head.createChild('style',{},['\
h1, h2, h3, h4 { margin: 0; }\
div {\
    margin-bottom: 3px;\
    margin-right: 5px;\
    margin-left: 4px;\
    margin-top: 2px;\
    outline-left: 1px solid;\
    outline-top: 1px solid;\
    box-shadow: 2px 2px 1px #888888;\
}\
.root_div { border: solid 1px; }\
.passed { background: #e5eeaa; }\
.failed { background: #ffe5aa; }\
.case_list {\
    background: #F6F4F0;\
    border: solid 1px;\
    box-shadow: none;\
}\
']);
    var passed_cases_num = 0;
    var total_cases_num = 0;
    for(var i = 0 ; i < suite_result.length ; i++) {
        total_cases_num ++;
        suite_result[i].passed && passed_cases_num++;
    }
    var root_div = html.createChild('body').createChild('div', {class: 'root_div'});
    root_div.createChild('h1', {class: 'header_color_h1'},[(title||'Case suite report')]);
    var case_list = root_div.createChild('div', {class: 'case_list'});  
    case_list.createChild('h3', { },['Case status:(' + passed_cases_num + ' out of ' + total_cases_num + ' passed)']);
    for(var i = 0 ; i < suite_result.length ; i++) {
        var case_result = suite_result[i];
        case_list.createChild('div',{
            class: (case_result.passed?'passed':'failed')
        },[
            new Util.Element('a',{
                href: case_result.fileName.replace('.suite', '') + '.html'
            }, [(case_result.passed ? '[Passed]' : '[Failed]') + ' \'' + case_result.fileName + '\''])
        ]);
    }
    return html.toString();
}

var generateCaseReport = function(ctxs, title) {
    return require('util').inspect(ctxs, {depth: null});
    var alloc_id = (function(){return this.id ++;}).bind({id:1});
    var html = new Util.Element('html');
    var head = html.createChild('head');
    var style = head.createChild('style',{},['\
h1, h2, h3, h4 { margin: 0; }\
div {\
    margin-bottom: 3px;\
    margin-right: 5px;\
    margin-left: 4px;\
    margin-top: 2px;\
    outline-left: 1px solid;\
    outline-top: 1px solid;\
    box-shadow: 2px 2px 1px #888888;\
}\
textarea {\
    overflow:auto;\
    width: auto;\
    height: auto;\
    margin: 0;\
    outline: none;\
    background: #F0F0F0;\
    border: none;\
    resize: none;\
    max-width: 100%;\
}\
.root_div { border: solid 1px; }\
.spliter_div {\
    width: auto;\
    height: 10px;\
    box-shadow: none;\
}\
.passed { background: #e5eeaa; }\
.failed { background: #ffe5aa; }\
.func_list {\
    background: #F6F4F0;\
    border: solid 1px;\
    box-shadow: none;\
}\
.targets_res_div { box-shadow: none; }\
.target_steps_div { box-shadow: none; }\
.step_detail_div { box-shadow: none; }\
.step_detail_div div { box-shadow: none; }\
.step_output {\
    border: 1px solid #aaaaaa;\
    background: #F9F9F9;\
    font-family: monospace;\
}\
.func_results { background: #F5F3EF; }\
.func_result {\
    background: #D0D0D0;\
    border: solid 1px;\
}\
.targets_list_div { background: #F6F4F0; }\
.passeded_h2 { background: #e5feaa; }\
.target_res_div { background: #E0E0E0; border: solid 1px; }\
.targets_checkpoint_div { background: #E0E0E0; border: solid 1px; }\
.step_failed_ignore_h4 {background: #efeeaa; }\
.step_div { background: #F0F0F0; border: solid 1px; }\
.steps_checkpoint_div { background: #F0F0F0; border: solid 1px; }\
.error_detail { width: 100% }\
.targets_checkpoint_msg { width: 100% }\
.steps_checkpoint_msg { width: 100% }'
    ]);
    var body = html.createChild('body');
    var root_div = body.createChild('div',{class: 'root_div'});
    root_div.createChild('h1', {class: 'header_color_h1'},[(title||'Case report')]);
    var func_list = root_div.createChild('div', {class: 'func_list'});  
    func_list.createChild('h3', { },['Run operations:']);
    for(var h = 0 ; h < ctxs.length; h ++) {
        var ctx = ctxs[h];
        ctx._report_id = alloc_id();
        func_list.createChild('div',{
            class: (ctx.passed?'passed':'failed')
        },[new Util.Element('a',{
            href: '#a' + ctx._report_id
        }, [(ctx.passed ? '[Passed]' : '[Failed]') + ' \'' + ctx.func_name + '\''])]);
    }
    func_list.createChild('div',{class:'spliter_div'});
    for(var i = 0 ; i < ctxs.length; i ++) {
        var ctx = ctxs[i];
        root_div.createChild('div',{class: 'spliter_div'});
        var func_result = root_div.createChild('div', {class: 'func_result'});
        func_result.createChild('h2',{
            class: (ctx.passed?'passeded_h2':'failed'),
            id: ctx._report_id
        }, [new Util.Element('a',{
            name: 'a' + ctx._report_id,
        }, [(ctx.passed ? '[Passed]' : '[Failed]') + ' Operation: \'' + ctx.func_name + '\''])]);
        var show_hide_target_id = alloc_id();
        var show_hide_attr = {type:"checkbox", value:show_hide_target_id};
        if(ctx.passed) show_hide_attr.checked = null;
        func_result.createChild('input',  show_hide_attr,['Hide operation detail']);
        func_result.createChild('div',{class: 'spliter_div'});
        style.addChild('input[value="'+show_hide_target_id+'"]:checked ~ div[id="'+show_hide_target_id+'"]{ display:none; }');
        var targets_res_div = func_result.createChild('div', {class: 'targets_res_div', id: show_hide_target_id});
        for(var j = 0; j < ctx.targets.length; j ++ ) {
            var target = ctx.targets[j];
            var target_res_div = targets_res_div.createChild('div', {class: 'target_res_div'});
            target_res_div.createChild('h3',{
                class: (ctx.results[target.host].passed?'passed':'failed'),
            }, [(ctx.results[target.host].passed ? '[Passed]' : '[Failed]') + ' Target \'' + target.host + '\'']);
            if(ctx.results[target.host].error) {
                var err = ctx.results[target.host].error;
                var errmsg = '';
                if(err && err.message && err.stack) errmsg = err.message + '\n' + err.stack;
                else errmsg = err.toString();
                target_res_div.createChild('textarea',{
                    class: 'error_detail',
                    rows: errmsg.split('\n').length, 
                    readonly: null
                }, [errmsg]);
            }
            var show_hide_target_id = alloc_id();
            var show_hide_attr = {type:"checkbox", value:show_hide_target_id};
            if(ctx.results[target.host].passed) show_hide_attr.checked = null;
            target_res_div.createChild('input',  show_hide_attr,['Hide target detail']);
            style.addChild('input[value="'+show_hide_target_id+'"]:checked ~ div[id="'+show_hide_target_id+'"]{ display:none; }');
            var target_steps_div = target_res_div.createChild('div', {class: 'target_steps_div', id: show_hide_target_id});
            target_res_div.createChild('div',{class: 'spliter_div'});
            target_steps_div.createChild('div',{class: 'spliter_div'});
            for(var k = 0; k < ctx.results[target.host].step_logs.length; k ++ ) {
                var step = ctx.results[target.host].step_logs[k];
                var step_div = target_steps_div.createChild('div',{class: 'step_div'});
                var step_result_class = 'passed';
                if(!step.passed && !step.is_critical) step_result_class = 'step_failed_ignore_h4';
                else if(!step.passed) step_result_class = 'failed';
                step_div.createChild('h4',{ 
                    class: step_result_class
                },[(step.passed ? '[Passed]' : '[Failed]') + ' Step \'' + (step.name ? step.name : step.cmd_str) + '\'']);
                var show_hide_target_id = alloc_id();
                var show_hide_attr = {type:"checkbox", value:show_hide_target_id};
                if(step.passed) show_hide_attr.checked = null;
                step_div.createChild('input', show_hide_attr,['Hide step detail']);
                style.addChild('input[value="'+show_hide_target_id+'"]:checked ~ div[id="'+show_hide_target_id+'"]{ display:none; }');
                var step_detail_div = step_div.createChild('div', {class: 'step_detail_div', id: show_hide_target_id});
                var output_buffer_lines = step.raw_buffer.split('\n');
                var buffer_line_num = output_buffer_lines.length;
                var max_line_length = 0;
                for(var l = 0; l < buffer_line_num; l ++)
                    if(output_buffer_lines[l].length > max_line_length)
                        max_line_length = output_buffer_lines[l].length;
                buffer_line_num = (buffer_line_num > 20) ? 20: buffer_line_num;
                step_detail_div.createChild('div', {class: 'step_output_header'}, ['Output: ']);
                step_detail_div.createChild('textarea', {
                    class: 'step_output', 
                    rows: buffer_line_num, 
                    cols: (max_line_length > 80) ? max_line_length : 80, 
                    readonly: null
                }, [step.raw_buffer]);
                step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Command line: ' + step.cmd_str]);
                step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Critical step: ' + step.is_critical]);
                step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Start time: ' + (new Date(step.start_timestamp)).toLocaleString()]);
                step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Finish time: ' + (new Date(step.finish_timestamp)).toLocaleString()]);
                
                if(typeof step.exit_code == 'number')
                    step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Exit code: ' + step.exit_code]);
                if(step.signal)
                    step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Recieved signal: ' + step.signal]);
                if(step.has_core_dump)
                    step_detail_div.createChild('div',{class: 'step_detail_bullet'}, ['Core dump: ' + step.has_core_dump]);
            }
            var steps_checkpoint = target_steps_div.createChild('div',{class: 'steps_checkpoint_div'});
            steps_checkpoint.createChild('h4',{
                class: (ctx.results[target.host].passed ? 'passed' : 'failed')
            }, [(ctx.results[target.host].passed ? '[Passed]' : '[Failed]') + ' Checkpoint for steps']);
            steps_checkpoint.createChild('textarea',{
                class: 'steps_checkpoint_msg',
                rows: (ctx.results[target.host].message || '').split('\n').length, 
                readonly: null
            }, [ctx.results[target.host].message || 'No detailed steps checkpoint message.']);
            targets_res_div.createChild('div',{class: 'spliter_div'});
        }
        var targets_checkpoint = targets_res_div.createChild('div', {class: 'targets_checkpoint_div'});
        targets_checkpoint.createChild('h3',{
            class : (ctx.passed ? 'passed' : 'failed')
        }, [(ctx.passed ? '[Passed]' : '[Failed]') + ' Checkpoint for targets']);
        targets_checkpoint.createChild('textarea',{
            class: 'targets_checkpoint_msg',
            rows: (ctx.message || '').split('\n').length, 
            readonly: null
        }, [ctx.message || 'No detailed operation checkpoint message.']);
        func_result.createChild('div',{class: 'spliter_div'});
    }
    root_div.createChild('div',{class: 'spliter_div'});
    return html.toString();
}

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

exports.generateSuitesReport = function(suites, global, callback) {
    if(typeof callback !== 'function') throw new
        Error('Invalid callback function.');
    try {
    var suiteNames = Util.getOwnProperties(suites),
        totalCases = 0,
        totalSuites = suiteNames.length,
        passedCases = 0,
        passedSuites = 0;
    suiteNames.forEach(function(sname) {
        var suite = suites[sname],
            suitePassed = true,
            caseNames = Util.getOwnProperties(suite);
        totalCases += caseNames.length;
        caseNames.forEach(function(caseName) {
            if(suite[caseName].passed) passedCases += 1;
            else suitePassed = false;
        });
        if(suitePassed) passedSuites += 1;
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
    global.enumerate(function(prop) {
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
            'td',{colspan: 4, class: 'header_color_center_text'}, ['Suit']),
        new Util.Element(
            'td',{colspan: 6, class: 'header_color_center_text'}, ['Cases'])
    ]);
    suiteNames.forEach(function(sname) {
        var suite = suites[sname],
        suitePassed = true,
        caseNames = Util.getOwnProperties(suite);
        caseNames.forEach(function(caseName) { 
            if(!suite[caseName].passed) suitePassed = false;
        });
        var suite_tr = details_table.createChild('tr');
        suite_tr.createChild('td', {
            colspan: 4,
            class: 'header_color_' + (suitePassed?'green':'red') + '_center_text'
        }, [sname.nicename]);
        var cases_tr = suite_tr.createChild('td', {colspan: 6} );
        caseNames.forEach(function(caseName, idx) {
            var idxstr = idx + '.';
            if(idxstr.length == 2) idxstr += ' ';
            cases_tr.createChild('div',{
                class: (suite[caseName].passed ? 'green' : 'red')
            }, [idxstr + caseName.nicename]);
        });
    });
    
    callback({ 
        summary: html.toString(), 
        passed: passed,
        files: [{ 
            fileName: 'log.json',
            contents: Util.inspect(suites, { depth: null }),
        }]
    });
    } catch(err) {
        callback({ 
            summary: err.message, 
            passed: false,
            files: [{ 
                fileName: 'log.json',
                contents: Util.inspect(suites, { depth: null }),
            }]
        });
    }
}
exports.generateCasesReport = function(cases, global , callback) {
    if(typeof callback !== 'function')
        return;
    
    
    callback({
        summary: 'Ondemand automation.', 
        passed: true,
        files: [{ 
            fileName: 'log.json',
            contents: Util.inspect(cases, { depth: null }),
        }]
    });
}
