var Util = require(__dirname + '/Util.js'),
    User = require(__dirname + '/models/User'),
    ServerState = require(__dirname + '/models/ServerState'),
    TestDefinition = require(__dirname + '/models/TestDefinition'),
    AutomationService = require(__dirname + '/AutomationService');

function ScheduleService() {
	Util.EventEmitter.call(this);
	this._$interval = Number.MAX_VALUE;
	this._$timeoutHandler = undefined;
	this._$enabled = false;
	this._$scripts = [];
	var ss = this;
	this._$schedule = function() {
		
		if(!ss._$enabled) return;
		ss._$scheduling = true;
		 Util.log('Scheduling once ...\n');
		var start = Util.now.getTime();
		var runScript = function(idx) {
			var script = ss._$scripts[idx];

			if(script) {
				// Read all state values and setup the env
				var env = { };
				ServerState.each(function(key, value) {
					env[key] = value;
				//	Util.log("key is " + key + ", value " + value+ " \n");
				}, function(err) {
					if(err) { runScript(idx + 1); return; }
					// Start to run the script
					var tmpScriptPath = Util.resolve(Util.tmpdir(), Util.uuid());
				//	Util.log("tmpScriptPath is "+ tmpScriptPath + "\n");
					if(Util.platform() === 'win') tmpScriptPath += '.bat';
					Util.writeFile(tmpScriptPath, script.content || '', function(err) {
						if(err) { 
							Util.exec('rm -rf "' + tmpScriptPath + '"', function(e, so, se) {
								if(e) Util.log(
									'Failed to rm the tmp script file: ' + tmpScriptPath + 
									'\nError: ' + err.message + '\n'
								);
							});
							runScript(idx + 1);
							return;
						}
						// Give tmp script exec rights
						Util.exec(
							(Util.platform() === 'win') ? '' : 'dos2unix "' + tmpScriptPath + '"; chmod +x "' + tmpScriptPath + '"', 
							{ timeout: 10000 }, function(err, stdout, stderr) {
							if(err)  { 
								Util.exec('rm -rf "' + tmpScriptPath + '"', function(e, so, se) {
									if(e) Util.log(
										'Failed to rm the tmp script file: ' + tmpScriptPath + 
										'\nError: ' + err.message + '\n'
									);
								});
								runScript(idx + 1);
								return;
							}
							// Run the script
							Util.exec(tmpScriptPath, { timeout: 150000, env: env }, function(err, stdout, stderr) {
								Util.exec('rm -rf "' + tmpScriptPath + '"', function(e, so, se) {
									if(e) Util.log(
										'Failed to rm the tmp script file: ' + tmpScriptPath + 
										'\nError: ' + err.message + '\n'
									);
								});
								if(err)  { runScript(idx + 1); return; }
								// Analyse the output, lines like:
								// 	 KEY=VALUE
								stdout.toString().split(Util.EOL)
									.map(function(l){ if(l.indexOf('=') !== -1) return l.split('=');})
									.filter(function(l){return ((l !== undefined) && (l.length === 2));})
									.forEach(function(kvp) {
									// Save each key value pair
								//	    Util.log("name: " + kvp[0].trim() +" , value:"+ kvp[1].trim() + "\n");
										if(kvp[0].trim().indexOf("UbuntuDriverV7.0")>=0){
											if(Util.isFile(__dirname + "/../failedDriver/V7/failedDriverList")){
												if(kvp[0].trim().indexOf("UpdateList")>=0){
													//	Util.log("V7/failedDriverList file exists， update from failed file \n");
														kvp[1]=Util.readFileSync(__dirname + "/../failedDriver/V7/failedDriverList").toString();
														ss.emit('requestAction', { 
														type: 'updateServerState',
														data: { name: kvp[0].trim(), value: kvp[1].trim() }
														});
												}
											
											}else{
											//	Util.log("V7/failedDriverList file not exists， update \n");
												ss.emit('requestAction', { 
												type: 'updateServerState',
												data: { name: kvp[0].trim(), value: kvp[1].trim() }
												});
											}
										}else if(kvp[0].trim().indexOf("UbuntuDriverV7U1")>=0){
											if(Util.isFile(__dirname + "/../failedDriver/V7U1/failedDriverList")){
												if(kvp[0].trim().indexOf("UpdateList")>=0){
											//			Util.log("V7U1/failedDriverList file exists， update from failed file \n");
														kvp[1]=Util.readFileSync(__dirname + "/../failedDriver/V7U1/failedDriverList").toString();
														ss.emit('requestAction', { 
														type: 'updateServerState',
														data: { name: kvp[0].trim(), value: kvp[1].trim() }
														});
												}
											
											}else{
										//		Util.log("V7U1/failedDriverList file not exists， update \n");
												ss.emit('requestAction', { 
												type: 'updateServerState',
												data: { name: kvp[0].trim(), value: kvp[1].trim() }
												});
											}
											
                                                                                	
										} else if(kvp[0].trim().indexOf("UbuntuDriverU4")>=0){
											if(Util.isFile(__dirname + "/../failedDriver/U4/failedDriverList")){
												if(kvp[0].trim().indexOf("UpdateList")>=0){
													//	Util.log("U4/failedDriverList file exists， update from failed file \n");
														kvp[1]=Util.readFileSync(__dirname + "/../failedDriver/U4/failedDriverList").toString();
														ss.emit('requestAction', { 
														type: 'updateServerState',
														data: { name: kvp[0].trim(), value: kvp[1].trim() }
														});
												}
											
											}else{
											//	Util.log("U4/failedDriverList file not exists， update \n");
												ss.emit('requestAction', { 
												type: 'updateServerState',
												data: { name: kvp[0].trim(), value: kvp[1].trim() }
												});
											}
                                                                                
										}else if(kvp[0].trim().indexOf("UbuntuDriverU2")>=0){
											if(Util.isFile(__dirname + "/../failedDriver/U2/failedDriverList")){
												if(kvp[0].trim().indexOf("UpdateList")>=0){
													//	Util.log("U2/failedDriverList file exists， update from failed file \n");
														kvp[1]=Util.readFileSync(__dirname + "/../failedDriver/U2/failedDriverList").toString();
														ss.emit('requestAction', { 
														type: 'updateServerState',
														data: { name: kvp[0].trim(), value: kvp[1].trim() }
														});
												}
											
											}else{
											//	Util.log("U2/failedDriverList file not exists， update \n");
												ss.emit('requestAction', { 
												type: 'updateServerState',
												data: { name: kvp[0].trim(), value: kvp[1].trim() }
												});
											}
											
                                          
										} else{
										//	Util.log("not driver parameter \n");
											ss.emit('requestAction', { 
											type: 'updateServerState',
											data: { name: kvp[0].trim(), value: kvp[1].trim() }
											});
										}

									
								});				
								// Start next round
								runScript(idx + 1);
							});
						});
					});
				});
			} else {
				ss._$scheduling = false;
//				Util.log("again enable is " + ss._$enabled + "\n");
				// Finished running scripts, check whether need to start the next schedule
				if(ss._$enabled) {
					this._$timeoutHandler = 
						setTimeout(function() { ss._$schedule(); }, ss._$interval);
				} else this._$timeoutHandler = undefined;
				Util.log('Schedule ' + (Util.now.getTime() - start) + 'ms\n');
			}
		};
		// Run all the supplied server scripts, from the first one.
		runScript(0);
	};
}
Util.inherits(ScheduleService, Util.EventEmitter);
ScheduleService.prototype.updateTriggers = function(maintainer) {
	var ss = this;
	// Setup state change listener.
	if(typeof ss._$stateChangeMonitor !== 'function') {
		ss._$stateChangeMonitor = function(ev) {
//		        Util.log('State updated: ' + Util.inspect(ev) + '\n');
			var state = ev.key,
				newVal = ev.value;
			Util.getOwnProperties(ss._$triggersCache).forEach(function(e) {
				if(ss._$triggersCache[e] === state) {
					// Start the test.
					var info = e.split('~');
				//	Util.log("info[0] " + info[0]+ " info[1] " + info[1]);
					ss.emit('requestAction', { 
						type: 'launchTest',
						data: { maintainerName: info[0], testDefinitionName: info[1] }
					});
				}
			});
		};
	}
	if(ServerState.listeners('update').indexOf(ss._$stateChangeMonitor) < 0)
		ServerState.on('update', ss._$stateChangeMonitor);
	if(!ss._$triggersCache) ss._$triggersCache = { };
	if(!maintainer) {
		// Clear all triggers
		ss._$triggersCache = { };
		// Update triggers of all maintainers.
		User.each(function(user) { 
			ss.updateTriggers(user);
		}, function(err) {
			if(err) Util.log('Iterate user failed. Error update trigger: ' + err.message + '\n');
		})
	} else if(maintainer instanceof User) {
		// Update triggers of specific maintainer.		
		// First clear all triggers of this user from cache.
		Util.getOwnProperties(ss._$triggersCache).forEach(function(e) {
			if(e.indexOf(maintainer.user) >= 0) delete ss._$triggersCache[e];
		});
		// Find all test definitions for the user
		TestDefinition.iterate(maintainer.user, function(td, put, del, stop) {
			ss._$triggersCache[maintainer.user + '~' + td.name] = td.trigger;
		}, function(err) {
			if(err) Util.log('Iterate test def failed. Error update trigger: ' + err.message + '\n');
			//Util.log(Util.inspect(ss._$triggersCache) + '\n');
		});
	} else throw new Error('Invalid parameter.');
};
ScheduleService.prototype.__defineGetter__('interval', function() { return this._$interval; });
ScheduleService.prototype.__defineSetter__('interval', function(value) {
	if(typeof value !== 'number') throw new TypeError();
	if(value === 0) this._$interval = Number.MAX_VALUE;
	else this._$interval = value;
	Util.log('Interval of Schedule Service is now: ' + this._$interval + '\n');
});
ScheduleService.prototype.__defineGetter__('enabled', function() {
	return this._$enabled;
});
ScheduleService.prototype.__defineSetter__('enabled', function(value) {
	if(this._$enabled === value) return;
	if(typeof value !== 'boolean') throw new TypeError();
	this._$enabled = value;
	if(value && (!this._$scheduling)) this._$schedule();
	else if(this._$timeoutHandler) {
		clearTimeout(this._$timeoutHandler);
		this._$timeoutHandler = undefined;
	}
	Util.log('Schedule Service ' + (value ? 'enabled' : 'disabled') + '.\n');
});
ScheduleService.prototype.putScript = function(id, content) {
	for(var i = 0; i < this._$scripts.length; i++) {
		if(this._$scripts[i].id === id) {
			this._$scripts[i].content = content || ' ';
			return;
		}
	}
	this._$scripts.push({ id: id, content: content || ' ' });
};
ScheduleService.prototype.removeScript = function(id) {
	for(var i = 0; i < this._$scripts.length; i++) {
		if(this._$scripts[i].id === id) {
			this._$scripts.splice(i, 1);
			return;
		}
	}
};
ScheduleService.prototype.scriptIds = function() {
	return this._$scripts.map(function(item) { return item.id; });
};

module.exports = new ScheduleService();
