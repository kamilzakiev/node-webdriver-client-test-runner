"use strict";
var Http = require("http");
var externals_1 = require("../externals");
var HttpLocalFileServer;
(function (HttpLocalFileServer) {
    (function init() {
        process.on("exit", stop);
    })();
    var server;
    function getUrl(path) {
        return server && "http://localhost:" + server.address().port + "/" + (path || "");
    }
    HttpLocalFileServer.getUrl = getUrl;
    function start(port) {
        if (port === void 0) { port = 0; }
        if (server) {
            throw new Error("Http server is already running!");
        }
        server = Http.createServer(function (request, response) {
            var path = externals_1.Url.parse(request.url).pathname.slice(1);
            if (!externals_1.Path.isAbsolute(path) || !externals_1.FS.existsSync(path)) {
                response.writeHead(404, { "Content-Type": "text/plain" });
                response.write("404 Not Found\n");
                response.end();
                return;
            }
            externals_1.FS.readFile(path, "binary", function (err, file) {
                if (err) {
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.write(err + "\n");
                    response.end();
                    return;
                }
                response.writeHead(200);
                response.write(file, "binary");
                response.end();
            });
        }).listen(port, "localhost");
    }
    HttpLocalFileServer.start = start;
    function isHttpLocalFileServerUrl(url) {
        var parserUrl = externals_1.Url.parse(url);
        var adress = server.address();
        return parseInt(parserUrl.port) === adress.port
            && (parserUrl.hostname === adress.address || parserUrl.hostname === "localhost");
    }
    HttpLocalFileServer.isHttpLocalFileServerUrl = isHttpLocalFileServerUrl;
    function stop() {
        server && server.close();
        server = undefined;
    }
    HttpLocalFileServer.stop = stop;
})(HttpLocalFileServer = exports.HttpLocalFileServer || (exports.HttpLocalFileServer = {}));
