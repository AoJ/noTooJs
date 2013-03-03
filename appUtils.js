var http = require('http');
var util = require('util');

/*
app.configure(function(){
  appUtils.configure(this);
});

app.listen();

*/

var gracefullyExiting = false;
exports.gracefullyExiting = function(req, res, next) {

    if (!gracefullyExiting) {
        return next();
    }
    res.setHeader("Connection", "close");
    return res.send(502, "Server is in the process of restarting.");
}


exports.configure = function(app) {
    app.set('ip', process.env.IP || undefined);
    app.set('port', process.env.PORT || process.argv[2] || 3000);
    app.set('gracefullyExiting', false);

    app.listen = listen;
    app.use(exports.gracefullyExiting);


    app.get('/__health', function(req, res, next) {
        //if(req.query.auth != 'xdds') return next();
        res.send({
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        })
    })
};


var listen = function() {
        var app = this;
        var server = http.createServer(app);
        var listenCb = function() {
                util.log(util.format('server listen on %s:%s', app.get('ip') || '', app.get('port')));

                /*
                  SIGTERM  termination request, sent to the program
                  SIGSEGV  invalid memory access (segmentation fault)
                  SIGINT   external interrupt, usually initiated by the user, ctrl + c
                  SIGILL   invalid program image, such as invalid instruction
                  SIGABRT  abnormal termination condition, as is e.g. initiated by abort()
                  SIGFPE   erroneous arithmetic operation such as divide by zero
                */
                process.on('SIGTERM', function(e) {
                    safeExiting(server, 'SIGTERM');
                });
                process.on('SIGINT', function(e) {
                    safeExiting(server, 'SIGINT');
                });
            };

        var args = arguments.length > 0 ? arguments : [app.get('port'), app.get('ip'), listenCb];
        return server.listen.apply(server, args);
    };


function safeExiting(app, EV) {
    gracefullyExiting = true;
    util.log("Received kill signal (" + EV + "), shutting down");
    setTimeout(function() {
        util.error("Could not close connections in time, forcefully shutting down");
        return process.exit(1);
    }, 10 * 1000);
    return app.close(function() {
        return process.exit();
    });
}
