import {_, Q, Path, Globule, Chalk, child_process, Url, FS} from "../externals";

export module Helpers {
    export function isAppveyor(): boolean {
        return 'CI' in process.env && 'APPVEYOR' in process.env;
    }

    export function logError(error): any {
        if(error instanceof Error) {
            console.log("\n" + Chalk.red("Error: " + JSON.stringify(error.message)));
            console.log(Chalk.red(error.stack));
        } else {
            console.log("\n" + Chalk.red("Error: " + JSON.stringify(error)));
        }

        throw error;
    }

    export function isVSO() {
        return 'agent.jobstatus' in process.env
            && 'AGENT_ID' in process.env
            && 'AGENT_MACHINENAME' in process.env
            && 'AGENT_NAME' in process.env;
    }

    export function callInSequence(sequence: ((value?: any) => Promise<any>)[]): Promise<any> {
        return sequence.reduce((previous: Promise<any>, current: (value?: any) => Promise<any>) => {
            return previous.then(current);
        }, Q());
    }

    export function getFilesByGlob(glob: string[] | string, rootDir?: string) {
        let files: string[] = Globule.find(glob || [], { srcBase: rootDir });
        return files.map(x => Path.isAbsolute(x) ? x : Path.join(rootDir, x));
    }

    export function getJavaVersion() {
        let deffer = Q.defer();
        var spawn = child_process.spawn('java', ['-version']);

        spawn.on('error', (err) => deffer.reject(err));
        spawn.stderr.on('data', data => {
            data = data.toString().split('\n')[0];
            var javaVersion = new RegExp('java version').test(data)
                ? data.split(' ')[2].replace(/"/g, '')
                : false;
            if(javaVersion) {
                deffer.resolve(javaVersion);
            } else {
                deffer.resolve(null);
            }
        });

        return deffer.promise;
    }

    export function getCallerFilePath(): string {
        let originalFunc = (<any>Error).prepareStackTrace;
        (<any>Error).prepareStackTrace = function (err, stack) { return stack; };
        try {
            let error: { stack: any[]} = <any>new Error();
            error.stack.shift(); // Removes the current file.
            let currentfile = error.stack.shift().getFileName();
            let callerfile;
            while (error.stack.length) {
                callerfile = error.stack.shift().getFileName();
                if(currentfile !== callerfile) {
                    return callerfile;
                }
            }
        } catch (e) {
        } finally {
            (<any>Error).prepareStackTrace = originalFunc; 
        }
    }

    export function getScreenResolution() {
        return executePSCommands("(Get-WmiObject -Class Win32_VideoController).VideoModeDescription")
            .then((result) => {
                let matches = /(\d+)[^\d]+(\d+)/.exec(result.output[0]);
                if(!matches || matches.length < 3) {
                    throw new Error("getScreenResolution error" + JSON.stringify(result));
                }

                return { width: parseFloat(matches[1]), height: parseFloat(matches[2]) };
            });
    }

    export function setScreenResolution(width: number, height: number) {
        return getScreenResolution().then((resolution) => {
            if(resolution.width === width && resolution.height === height) {
                return false;
            }

            return executePSCommands([
                    removeBOMSymbol(FS.readFileSync(Path.join(__dirname, "./set-screenresolution.ps1"), "utf8")),
                    `Set-ScreenResolution ${width} ${height}`])
                .then((result) => {
                    if(!result.output[0] || result.errors.length > 0 || _.trimEnd(result.output[0]) !== "Success") {
                        throw new Error("setScreenResolution error" + JSON.stringify(result));
                    }

                    return true;
                });
        });
    }

    export function removeBOMSymbol(content: string): string {
        return content && content.replace(/^\uFEFF/, "");
    }

    export function executePSCommands(commands: string[] | string) {
        let defer = Q.defer<PowerShellResult>();
        var result: PowerShellResult = { output: [], errors: [] };
        var child = child_process.spawn("powershell.exe",
            ["-ExecutionPolicy", "unrestricted", "-Command", "-"]);
        child.on("exit", () => defer.resolve(result));
        child.on("error", defer.reject);

        child.stdout.on("data", (data) => {
            result.output.push(data.toString());
        });
        child.stderr.on("data", (data) => {
            result.errors.push(data.toString());
        });

        (_.isArray(commands) ? commands : [commands]).forEach((cmd) => {
            let base64Command = new Buffer(cmd, "utf8").toString("base64");
            child.stdin.write(`iex ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${base64Command}")))\n`);
        });
        child.stdin.end();

        return defer.promise;
    }

    export interface PowerShellResult {
        output: string[];
        errors: string[];
    }
}