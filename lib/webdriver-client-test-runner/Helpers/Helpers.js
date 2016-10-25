"use strict";
var externals_1 = require("../externals");
var Helpers;
(function (Helpers) {
    function isAppveyor() {
        return 'CI' in process.env && 'APPVEYOR' in process.env;
    }
    Helpers.isAppveyor = isAppveyor;
    function logError(error) {
        if (error instanceof Error) {
            console.log("\n" + externals_1.Chalk.red("Error: " + JSON.stringify(error.message)));
            console.log(externals_1.Chalk.red(error.stack));
        }
        else {
            console.log("\n" + externals_1.Chalk.red("Error: " + JSON.stringify(error)));
        }
        throw error;
    }
    Helpers.logError = logError;
    function isVSO() {
        return 'agent.jobstatus' in process.env
            && 'AGENT_ID' in process.env
            && 'AGENT_MACHINENAME' in process.env
            && 'AGENT_NAME' in process.env;
    }
    Helpers.isVSO = isVSO;
    function callInSequence(sequence) {
        return sequence.reduce(function (previous, current) {
            return previous.then(current);
        }, externals_1.Q());
    }
    Helpers.callInSequence = callInSequence;
    function getFilesByGlob(glob, rootDir) {
        var files = externals_1.Globule.find(glob || [], { srcBase: rootDir });
        return files.map(function (x) { return externals_1.Path.isAbsolute(x) ? x : externals_1.Path.join(rootDir, x); });
    }
    Helpers.getFilesByGlob = getFilesByGlob;
    function getJavaVersion() {
        var deffer = externals_1.Q.defer();
        var spawn = externals_1.child_process.spawn('java', ['-version']);
        spawn.on('error', function (err) { return deffer.reject(err); });
        spawn.stderr.on('data', function (data) {
            data = data.toString().split('\n')[0];
            var javaVersion = new RegExp('java version').test(data)
                ? data.split(' ')[2].replace(/"/g, '')
                : false;
            if (javaVersion) {
                deffer.resolve(javaVersion);
            }
            else {
                deffer.resolve(null);
            }
        });
        return deffer.promise;
    }
    Helpers.getJavaVersion = getJavaVersion;
    function getScreenResolution() {
        return executePSCommands("(Get-WmiObject -Class Win32_VideoController).VideoModeDescription")
            .then(function (result) {
            var matches = /(\d+)[^\d]+(\d+)/.exec(result.output[0]);
            if (!matches || matches.length < 3) {
                throw new Error("getScreenResolution error" + JSON.stringify(result));
            }
            return { width: parseFloat(matches[1]), height: parseFloat(matches[2]) };
        });
    }
    Helpers.getScreenResolution = getScreenResolution;
    function setScreenResolution(width, height) {
        return getScreenResolution().then(function (resolution) {
            if (resolution.width === width && resolution.height === height) {
                return false;
            }
            return executePSCommands([
                removeBOMSymbol(externals_1.FS.readFileSync(externals_1.Path.join(__dirname, "./set-screenresolution.ps1"), "utf8")),
                ("Set-ScreenResolution " + width + " " + height)])
                .then(function (result) {
                if (!result.output[0] || result.errors.length > 0 || externals_1._.trimEnd(result.output[0]) !== "Success") {
                    throw new Error("setScreenResolution error" + JSON.stringify(result));
                }
                return true;
            });
        });
    }
    Helpers.setScreenResolution = setScreenResolution;
    function removeBOMSymbol(content) {
        return content && content.replace(/^\uFEFF/, "");
    }
    Helpers.removeBOMSymbol = removeBOMSymbol;
    function executePSCommands(commands) {
        var defer = externals_1.Q.defer();
        var result = { output: [], errors: [] };
        var child = externals_1.child_process.spawn("powershell.exe", ["-ExecutionPolicy", "unrestricted", "-Command", "-"]);
        child.on("exit", function () { return defer.resolve(result); });
        child.on("error", defer.reject);
        child.stdout.on("data", function (data) {
            result.output.push(data.toString());
        });
        child.stderr.on("data", function (data) {
            result.errors.push(data.toString());
        });
        (externals_1._.isArray(commands) ? commands : [commands]).forEach(function (cmd) {
            var base64Command = new Buffer(cmd, "utf8").toString("base64");
            child.stdin.write("iex ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(\"" + base64Command + "\")))\n");
        });
        child.stdin.end();
        return defer.promise;
    }
    Helpers.executePSCommands = executePSCommands;
})(Helpers = exports.Helpers || (exports.Helpers = {}));
