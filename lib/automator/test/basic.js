var Automator = require(__dirname + '/../Automator.js'),
    Util = require(__dirname + '/../../Util.js');

var operationStr = "declareOperation([\n\
    //{ cmd: 'sleep 1', async: false },\n\
    //{ cmd: 'sleep 2', async: false },\n\
    //{ cmd: 'sleep 11', async: true },\n\
    //{ cmd: 'sleep 12', async: true },\n\
    //{ cmd: 'echo O1', async: true },\n\
    //{ cmd: 'dd if=/dev/urandom bs=10 count=1', async: true },\n\
    { cmd: 'echo O3', async: true },\n\
    { cmd: 'echo O4', async: true },\n\
    { cmd: 'sleep 1', async: true },\n\
    { cmd: 'sleep 2', async: true },\n\
    { cmd: 'sleep 3', async: true },\n\
]);";
var caseStr = "targets = [\n\
    //{ host: 'luvyu01-olsvr', username: 'root', password: 'cnbjrdqa2#' } ,\n\
    //{ host: 'luvyu01-nfsvr', username: 'root', password: 'cnbjrdqa2#' } ,\n\
    //{ host: 'luvyu01-s11364', username: 'root', password: 'cnbjrdqa2#' } ,\n\
    //{ host: 'luvyu01-s11364r', username: 'root', password: 'cnbjrdqa2#' } ,\n\
    //{ host: 'luvyu01-rhel63', username: 'root', password: 'cnbjrdqa2#' }\n\
    { host: 'luyu426-bbb', username: 'test', password: 'test' }\n\
];\n\
targets.test({test:'context'});\n\
targets.test({context:'test'});\n";

var auto = new Automator;
auto.on('status', function(msg) {
    console.log(Util.inspect(msg, { depth: null }));
});
auto.on('finish', function(info) {
    console.log('stdout: ', info.stdout);
    console.log('stderr: ', info.stderr);
    console.log('code: ', info.code);
    console.log('error: ', info.error);
    console.log('signal: ', info.signal);
});
auto.loadOperation('ssh', 'test', operationStr);
auto.runCase(caseStr);
