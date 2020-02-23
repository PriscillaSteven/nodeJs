var Util = require(__dirname + '/../../Util'),
    sql = require('mssql'),
    sqlConfig = {
        user: 'sa',
        password: 'P@ssw1rd',
        server: 'mabji01-hm02',
        database: 'autodb'
    };

exports.name = 'AutoDBActions';
exports.actions = {
    listEntries: function(reply, broadcast, u, dbname, filterField, filter) {
        var connection = new sql.Connection(sqlConfig, function(err) {
            if(err) {
                reply('error', err.message);
                return;
            }
            var request = connection.request();
            request.stream = true;
            request.on('recordset', function(columns) { reply('recordset', columns); });
            request.on('row', function(row) { 
                row['_dbname'] = dbname; 
                reply('entry', row); 
            });
            request.on('error', function(err) { reply('error', dbname + ':' + err.message); });
            request.on('done', function(returnValue) { reply('done', dbname + ':' + returnValue); });
            var query = 'select * from dbo.' + dbname;
            if(filterField && filter) {
                query += ' where ' + filterField + ' like ' + "'%" + filter + "%'";
            }
            query += ';';
            request.query(query);
            Util.log('SQL: ' + query + '\n');
        });
    }
};
