import * as Http from "http";
import {_, Q, Path, FS, Globule, Url, Chalk} from "../externals";

export module HttpServer {
    (function init(){
        process.on("exit", stop);
    })();

    let server: Http.Server;

    export function getUrl(path: string) {
        return server && `http://localhost:${server.address().port}/${path || ""}`;
    }

    export function start(port: number = 0) {
        if(server) {
            throw new Error("Http server is already running!");
        }

        server = Http.createServer((request, response) => {
            let path = Url.parse(request.url).pathname.slice(1);
            if(!Path.isAbsolute(path) || !FS.existsSync(path)) {
                response.writeHead(404, {"Content-Type": "text/plain"});
                response.write("404 Not Found\n");
                response.end();
                return;

            }

            FS.readFile(path, "binary", (err, file) => {
                if(err) {        
                    response.writeHead(500, {"Content-Type": "text/plain"});
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

    export function stop() {
        server && server.close();
        server = undefined;
    }
}