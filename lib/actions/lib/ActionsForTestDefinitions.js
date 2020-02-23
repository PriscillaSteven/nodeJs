var Util = require(__dirname + '/../../Util'),
    //Case = require(__dirname + '/../../models/Case'),
    TestDefinition = require(__dirname + '/../../models/TestDefinition'),
    ScheduleService = require(__dirname + '/../../ScheduleService');

exports.name = 'TestDefinitionActions';
exports.actions = {
    // Actions of Test Definition.
    newTestDefinition: function(reply, broadcast, u, td_name) {
        TestDefinition.put(u.user, td_name, { }, function(err) {
            if(err) reply('error', err.message);
            else TestDefinition.get(u.user, td_name, function(err, td) {
                if(err) reply('error', err.message);
                else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                else broadcast('updateTestDefinition', td);
            });
        });
    },
    listAllTestDefinitions: function(reply, broadcast, u) {
        TestDefinition.iterate(u.user, function(td) {
            reply('updateTestDefinition', td);
        }, function(err) { if(err)
            reply('error', err.message); 
        });
    },
    deleteTestDefinition: function(reply, broadcast, u, td_name) {
        TestDefinition.get(u.user, td_name, function(err, td, put, del) {
            if(err) reply('error', err.message);
            else if(!td) broadcast('deleteTestDefinition', td_name);
            else del(function(err) {
                if(err) reply('error', err.message);
                else broadcast('deleteTestDefinition', td_name);
            });
        });
    },
    copyTestDefinition: function(reply, broadcast, u, td_name, ntd_name) {
        TestDefinition.get(u.user, td_name, function(err, td, put, del) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                TestDefinition.get(u.user, ntd_name, function(err, ttd, put, del) {
                    if(err) reply('error', err.message);
                    else if(ttd) reply('error', 'Test definition already exists with target name: ' + ntd_name);
                    else {
                        TestDefinition.put(u.user, ntd_name, Util.shallow(td), function(err) {
                            if(err) reply('error', err.message);
                            else TestDefinition.get(u.user, ntd_name, function(err, td) {
                                if(err) reply('error', err.message);
                                else if(!td) reply('error', 'No test definition found by name: ' + ntd_name);
                                else {
                                    ScheduleService.updateTriggers(u);
                                    broadcast('updateTestDefinition', td);
                                }
                            });
                        })
                    }
                });
            }
        });
    },
    setTriggerOfTestDefinition: function(reply, broadcast, u, td_name, tg_name) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                if(!tg_name) tg_name = ' ';
                if(td.trigger === tg_name) return;
                td.trigger = tg_name;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ');
                        else {
                            ScheduleService.updateTriggers(u);
                            broadcast('updateTestDefinition', td);
                        }
                    });
                });
            }
        });
    },
    // Suites actions in Test Definition.
    newSuiteOfTestDefinition: function(reply, broadcast, u, td_name, s_name) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites = td.suites || { };
                td.suites[s_name] = td.suites[s_name] || { enabled: true, cases: []};
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ');
                        else broadcast('updateTestDefinition', td);
                    });
                });
            }
        });
    },
    deleteSuiteOfTestDefinition: function(reply, broadcast, u, td_name, s_name) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites = td.suites || { };
                delete td.suites[s_name];
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });
            }
        });
    },
    copySuiteOfTestDefinition: function(reply, broadcast, u, td_name, s_name, ns_name) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites = td.suites || { };
                if(!td.suites[s_name]) {
                    reply('error', 'No test suite found by name: ' + s_name);
                    return;
                } else if(td.suites[ns_name]) {
                    reply('error', 'Suite already exists with target name: ' + ns_name);
                    return;
                }
                td.suites[ns_name] = Util.shallow(td.suites[s_name]);
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });
            }
        });
    },
    switchStateSuiteOfTestDefinition: function(reply, broadcast, u, td_name, s_name, enable) {
        if(typeof enable !== 'boolean') enable = false;
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites = td.suites || { };
                if(!td.suites[s_name]) {
                    reply('error', 'No test suite found by name: ' + s_name);
                    return;
                } 
                td.suites[s_name].enabled = enable;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });
            }
        });
    },
    // Case actions in Suite of Test Definition.
    newCaseOfSuiteInTestDefinition: function(reply, broadcast, u, td_name, s_name, c_name, c_idx) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                try {
                    var after = td.suites[s_name].cases.splice(c_idx);
                    td.suites[s_name].cases = td.suites[s_name].cases
                        .concat([{name: c_name, content: '', enabled: true}]).concat(after);
                } catch(e) {
                    reply('error', e.message);
                    return;
                }
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });
            }
        });
    },
    deleteCaseOfSuiteInTestDefinition: function(reply, broadcast, u, td_name, s_name, c_name, c_idx) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites[s_name].cases = td.suites[s_name].cases || [];
                if(!td.suites[s_name].cases[c_idx] || td.suites[s_name].cases[c_idx].name !== c_name) {
                    reply('error', 'No test case found by name: ' + c_name);
                    return;
                }
                td.suites[s_name].cases.splice(c_idx, 1);
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });       
            }         
        });
    },
    putCaseOfSuiteInTestDefinition: function(reply, broadcast, u, td_name, s_name, c_name, c_idx, content) {
        reply('info', 'Saving test case: ' + c_name);
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites[s_name].cases = td.suites[s_name].cases || [];
                if(!td.suites[s_name].cases[c_idx] || td.suites[s_name].cases[c_idx].name !== c_name) {
                    reply('error', 'No test case found by name: ' + c_name);
                    return;
                }
                td.suites[s_name].cases[c_idx].content = content;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else {
                            broadcast('updateTestDefinition', td);
                            reply('info', 'Saved test case: ' + c_name);        
                        }
                    });
                });       
            }         
        });
    },
    setTargetsForCaseOfSuiteInTestDefinition: function(reply, broadcast, u, td_name, s_name, c_name, c_idx, targets) {
        reply('info', 'Saving test case: ' + c_name);
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites[s_name].cases = td.suites[s_name].cases || [];
                if(!td.suites[s_name].cases[c_idx] || td.suites[s_name].cases[c_idx].name !== c_name) {
                    reply('error', 'No test case found by name: ' + c_name);
                    return;
                }
                td.suites[s_name].cases[c_idx].targets = targets;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else {
                            broadcast('updateTestDefinition', td);
                            reply('info', 'Saved test case: ' + c_name);        
                        }
                    });
                });       
            }         
        });
    },
    switchStateCaseOfSuiteInTestDefinition: function(reply, broadcast, u, td_name, s_name, c_name, c_idx, enable) {
        if(typeof enable !== 'boolean') enable = false;
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.suites[s_name].cases = td.suites[s_name].cases || [];
                if(!td.suites[s_name].cases[c_idx] || td.suites[s_name].cases[c_idx].name !== c_name) {
                    reply('error', 'No test case found by name: ' + c_name);
                    return;
                }
                td.suites[s_name].cases[c_idx].enabled = enable;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });       
            }         
        });
    },
    switchUpdateProtalOfTestDefinition: function(reply, broadcast, u, td_name) {
        TestDefinition.get(u.user, td_name, function(err, td) {
            if(err) reply('error', err.message);
            else if(!td) reply('error', 'No test definition found by name: ' + td_name);
            else {
                td.config = td.config || { };
                td.config.autoUpdateProtal = !td.config.autoUpdateProtal;
                TestDefinition.put(u.user, td_name, td, function(err) {
                    if(err) reply('error', err.message);
                    else TestDefinition.get(u.user, td_name, function(err, td) {
                        if(err) reply('error', err.message);
                        else if(!td) reply('error', 'No test definition found by name: ' + td_name);
                        else broadcast('updateTestDefinition', td);
                    });
                });       
            }
        });
    }
};