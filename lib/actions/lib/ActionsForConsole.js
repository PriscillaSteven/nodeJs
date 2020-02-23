var Util = require(__dirname + '/../../Util'),
	User = require(__dirname + '/../../models/User'),
	TestTarget = require(__dirname + '/../../models/TestTarget');

var connectionCache = { };

exports.name = 'ConsoleActions';
exports.socketCleanup = function(reply, broadcast, user, socket) {
	if(connectionCache[socket.id]) {
		if(connectionCache[socket.id].shell) {
			try { connectionCache[socket.id].shell.end(); }
			catch(err) { Util.log('Error: ' + err.message + '\n'); }
			delete connectionCache[socket.id].shell;
		}
		if(connectionCache[socket.id].conn) {
			try { connectionCache[socket.id].conn.end(); }
			catch(err) { Util.log('Error: ' + err.message + '\n'); }
			delete connectionCache[socket.id].conn;
		}
	}
	Util.log('Clean up console associated with connection ' + socket.id + '.\n');
	delete connectionCache[socket.id];
}
exports.actions = {
	requestConsole: function(reply, broadcast, user, conn, cols, rows, socket) { 
		if(!conn || typeof cols !== 'number' || typeof rows !== 'number' || !socket) {
			reply('error', 'Unacceptable params: ' + Util.inspect(arguments));
			Util.log('Invalid parameters.\n');
			retrun;
		}
		Util.log('User requesting console: ' + Util.inspect(conn) + '\n');
		var targetInfo = undefined;
		try { targetInfo = unescape(conn).match(/^([a-zA-Z\$]{5}\d{2})\/(.*)$/); }
		catch(err) { 
			targetInfo = undefined; reply('error', err.message);
			Util.log('Failed to parse connection string: ' + err.message + '\n');
		}
		if(!targetInfo) {
			targetInfo = unescape(conn).match(/^(ubuntu)\/(.*)$/);
			if(!targetInfo) {
				reply('error', 'Failed to parse target console.\n');
				return;			
			}
		}
		var user = new User(targetInfo[1]),
			targetName = targetInfo[2];
		user.id(function(err, id) {
			if(err) reply('error', err.message);
			else if(!id) reply('error', 'Invalid user `' + user.user + '\'.');
			else TestTarget.get(user.user, targetName, function(err, tTarget) {
				if(err) reply('error', err.message);
				else if(!tTarget) reply('error', 'Target `' + targetName + '\' not found for user `' + user.user + '\'.');
				else {
					if(tTarget.type !== 'ssh' && tTarget.type != 'esx') {
						reply('error', 'No console available for target of type `' + tTarget.type + '\'');
						return;
					}
					var target = tTarget.config;
					reply('initTitle', target.host);
					if(connectionCache[socket.id]) {
						reply('error', 'Console already setup for this connection.\n');
						return;			
					}
					var conn = new Util.SSHTarget;
					connectionCache[socket.id] = { target: target, conn: conn, shell: undefined };
			        conn.authorized = false;
					conn.on('prompt', function(p) { reply('consoleData', p); });
			        conn.on('connect', function() { 
			            reply('consoleData', 'Connected to ' + target.host + '.\r\n'); 
			        });
			        conn.on('error', function(err) { 
			            reply('consoleData', 'Connection error, ' + err.message + '.\r\n'); 
			        });
			        conn.on('close', function(hadError) { 
			            reply('consoleData', 'Disconnected with ' + target.host + '.\r\n');
			        });
			        conn.on('ready', function () { conn.shell({ rows: rows, cols: cols, term: 'linux'}, function(err, stream) {
			        	if(err) {
			        		reply('error', 'Can\'t create console, ' + err.message);
			        		return;
			        	}
			        	conn.authorized = true;
			            reply('consoleData', 'Authorized user ' + target.username + '.\r\n');
			            stream.setEncoding('ascii');
			            stream.on('data', function(data, type) { reply('consoleData', data); });
			            stream.on('error', function(err) { reply('error', Util.inspect(err)); });
				        connectionCache[socket.id].shell = stream;
			            // ioSocket.on('message', function(msg, callback) {
			            //     try { stream.write(msg); }
			            //     catch(err) { 
			            //         ioSocket.send('Lost connection with ' + proxy_.target.host + '.\r\n');
			            //         console.log('cannot write stream.\n' + err.message);
			            //     }
			            // });
			        }) });
			        conn.connect(target);			
				}
			});
		});
	},
	resizeConsole: function(reply, broadcast, user, cols, rows, socket) { 
		if(typeof cols !== 'number' || typeof rows !== 'number' || !socket) {
			reply('error', 'Unacceptable params: ' + Util.inspect(arguments));
			Util.log('Invalid parameters.\n');
			retrun;
		}
		if((!connectionCache[socket.id]) || (!connectionCache[socket.id].shell)) {
			reply('info', 'Console not ready yet.');
			return;
		}
		try { connectionCache[socket.id].shell.setWindow(rows, cols, 0, 0); }
        catch(err) { reply('error', 'Connection error, ' + err.message); }		
	},
	userInput: function(reply, broadcast, user, c, socket) { 
		if(!c || !socket) {
			reply('error', 'Unacceptable params: ' + Util.inspect(arguments));
			Util.log('Invalid parameters.\n');
			retrun;
		}
		if(!connectionCache[socket.id]) {
			reply('info', 'Console not ready yet.');
			return;
		}
		try { 
			if(connectionCache[socket.id].conn.authorized)
				connectionCache[socket.id].shell.write(c); 
			else if(connectionCache[socket.id].conn.answer)
				connectionCache[socket.id].conn.answer(c);
			else reply('info', 'Console not ready yet.');
		} catch(err) { reply('error', 'Connection error, ' + err.message); }
	}
	//Emits: 'consoleData', data
};
