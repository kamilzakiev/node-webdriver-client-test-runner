"use strict";
var exports_1 = require("../exports");
var externals_1 = require("../externals");
var WebdriverIO = require("webdriverio");
var WebdriverIOEx;
(function (WebdriverIOEx) {
    function getWebdriverIOEx() {
        global.Browser = {
            Chrome: "chrome",
            Chromium: "chromium",
            Firefox: "firefox",
            InternetExplorer: "internet explorer",
            Edge: "edge"
        };
        var originalRemote = WebdriverIO.remote;
        WebdriverIO.remote = function () {
            var client = originalRemote.apply(this, arguments);
            return client.then(function () { return initWebdriverIOEx(client); });
        };
        /*let originalMultiremote = WebdriverIO.multiremote;
        WebdriverIO.multiremote = function() {
            let client: WebdriverIO.Client<void> = originalMultiremote.apply(this, arguments);
            return client.then(() => initWebdriverIOEx(client));
        };*/
        return WebdriverIO;
    }
    WebdriverIOEx.getWebdriverIOEx = getWebdriverIOEx;
    // adds additional helper methods to webdriverio.
    function initWebdriverIOEx(client) {
        return externals_1.Q.all([
            addCommand("assertAreaScreenshotMatch", function (options) {
                var pageName = exports_1.TestRunner.getCurrentSpecPath();
                return client
                    .webdrivercss(pageName, options)
                    .then(function (result) {
                    return exports_1.JasmineHelpers.webdriverCSSMatch(result);
                });
            }),
            addCommand("getBrowserLogsByLevel", function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                return client.log('browser')
                    .then(function (result) {
                    if (!externals_1._.isArray(result.value)) {
                        throw new Error("state: " + result.state);
                    }
                    return args.length
                        ? result.value.filter(function (log) { return args.some(function (level) { return log.level === level; }); })
                        : result.value;
                });
            }),
            addCommand("initConsoleLogReader", function () {
                return client.execute(function () {
                    var consoleLogkey = "webdriverioClientConsoleLogReaderScript";
                    if (window.console[consoleLogkey]) {
                        return false;
                    }
                    window.console[consoleLogkey] = [];
                    var consoleFnNames = ["log", "error", "warn"];
                    var consoleFunctions = consoleFnNames.map(function (n) { return window.console[n]; });
                    consoleFnNames.forEach(function (type, i) { return window.console[type] = function (text) {
                        var message = {
                            type: type,
                            message: text && text.toString()
                        };
                        window.console[consoleLogkey].push(message);
                        return consoleFunctions[i].apply(window.console, arguments);
                    }; });
                    return true;
                }).then(function (res) { return res.value; });
            }),
            addCommand("getConsoleLogs", function (clear) {
                return client.execute(function (clear) {
                    var consoleLogkey = "webdriverioClientConsoleLogReaderScript";
                    if (window.console[consoleLogkey] === undefined) {
                        return undefined;
                    }
                    var logs = window.console[consoleLogkey];
                    if (clear) {
                        window.console[consoleLogkey] = [];
                    }
                    return logs;
                }, clear).then(function (res) { return res.value; });
            }),
            addCommand("printConsoleLogs", function (clear) {
                return client.getConsoleLogs(clear)
                    .then(function (logs) {
                    if (externals_1._.isArray(logs)) {
                        logs.forEach(printLog);
                    }
                });
                function printLog(log) {
                    var color = {
                        log: externals_1.Chalk.white,
                        warn: externals_1.Chalk.yellow,
                        error: externals_1.Chalk.red
                    }[log.type];
                    console[log.type]("\n" + color("[CLIENT-CONSOLE-" + log.type.toUpperCase() + "] " + log.message));
                }
            }),
            addCommand("executeFiles", function (files) {
                return files.reduce(function (promise, file) {
                    return promise.then(function () {
                        var src = externals_1.FS.readFileSync(file, "utf8");
                        return client.execute(function (code) { eval.call(window, code); }, src);
                    });
                }, externals_1.Q());
            }),
            replaceCommand("execute", function execute(script) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return executeClientTryCatchedScript(script, args, function (script, args) { return client.executeAsync.apply(client, [script].concat(args)); });
            }),
            replaceCommand("selectorExecute", function selectorExecute(selectors, script) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                return executeClientTryCatchedScript(script, args, function (script, args) { return client.selectorExecuteAsync.apply(client, [selectors, script].concat(args)); });
            })
        ]);
        function executeClientTryCatchedScript(script, args, fn) {
            var key = "webdriverioClientTryCatchedScript";
            var keyMessage = key + "ErrorMessage";
            var keyStack = key + "ErrorStack";
            var consoleMessages = key + "ConsoleMessages";
            if (typeof script === 'string' || typeof script === 'function') {
                if (typeof script !== 'function' && script.trim().indexOf('function') !== 0) {
                    script = "function " + key + "(){ " + script + "; }";
                }
                else {
                    script = "function " + key + "(){ return (" + script + ").apply(this, arguments); }";
                }
                args = (args || []).concat([
                    script.toString(),
                    ("({ " + keyMessage + ": (error instanceof Error) ? error.message : error,\n                        " + keyStack + ": (error instanceof Error) ? error.stack : \"Error: \" + error })")
                ]);
                return fn(function () {
                    var done = Array.prototype.pop.apply(arguments);
                    var errorScript = Array.prototype.pop.apply(arguments);
                    var script = Array.prototype.pop.apply(arguments);
                    var args = arguments;
                    try {
                        done(eval("(" + script + ").apply(null, args)"));
                    }
                    catch (error) {
                        done(eval(errorScript));
                    }
                }, args)
                    .then(function (result) {
                    throwClientError(result);
                    return result;
                });
            }
            else {
                return fn(script, args);
            }
            function throwClientError(result) {
                if (!result.value || !result.value.hasOwnProperty(keyMessage) || !result.value.hasOwnProperty(keyStack)) {
                    return;
                }
                var splitStack = (result.value[keyStack] || "").split("\n");
                if (splitStack.length > 6) {
                    var endIndex = externals_1._.findIndex(splitStack, function (line) { return externals_1._.startsWith(externals_1._.trimStart(line), "at " + key); });
                    if (endIndex >= 0) {
                        splitStack = splitStack.splice(0, endIndex);
                    }
                    if (!externals_1._.startsWith(externals_1._.trimStart(splitStack[1]), "at ")) {
                        splitStack.splice(1, 1);
                    }
                }
                var targetStack = "[CLIENT-ERROR] " + splitStack.join("\n");
                var error = new Error(result.value[keyMessage]);
                try {
                    throw error;
                }
                catch (ex) { }
                Object.defineProperty(error, "stack", { get: function () { return targetStack; } });
                throw error;
            }
        }
        function addCommand(commandName, customMethod) {
            return client.addCommand(commandName, customMethod.bind(client), true);
        }
        function replaceCommand(commandName, customMethod) {
            var originalMethod = client[commandName];
            if (!originalMethod.original) {
                customMethod.original = originalMethod;
                return client.addCommand(commandName, customMethod.bind(client), true);
            }
        }
    }
    var SpecialKeys;
    (function (SpecialKeys) {
        SpecialKeys.CANCEL = "\uE001";
        SpecialKeys.HELP = "\uE002";
        SpecialKeys.BACK_SPACE = "\uE003";
        SpecialKeys.TAB = "\uE004";
        SpecialKeys.CLEAR = "\uE005";
        SpecialKeys.RETURN = "\uE006";
        SpecialKeys.ENTER = "\uE007";
        SpecialKeys.SHIFT = "\uE008";
        SpecialKeys.CONTROL = "\uE009";
        SpecialKeys.ALT = "\uE00A";
        SpecialKeys.PAUSE = "\uE00B";
        SpecialKeys.ESCAPE = "\uE00C";
        SpecialKeys.SPACE = "\uE00D";
        SpecialKeys.PAGE_UP = "\uE00E";
        SpecialKeys.PAGE_DOWN = "\uE00F";
        SpecialKeys.END = "\uE010";
        SpecialKeys.HOME = "\uE011";
        SpecialKeys.ARROW_LEFT = "\uE012";
        SpecialKeys.ARROW_UP = "\uE013";
        SpecialKeys.ARROW_RIGHT = "\uE014";
        SpecialKeys.ARROW_DOWN = "\uE015";
        SpecialKeys.INSERT = "\uE016";
        SpecialKeys.DELETE = "\uE017";
        SpecialKeys.SEMICOLON = "\uE018";
        SpecialKeys.EQUALS = "\uE019";
        SpecialKeys.NUMPAD0 = "\uE01A";
        SpecialKeys.NUMPAD1 = "\uE01B";
        SpecialKeys.NUMPAD2 = "\uE01C";
        SpecialKeys.NUMPAD3 = "\uE01D";
        SpecialKeys.NUMPAD4 = "\uE01E";
        SpecialKeys.NUMPAD5 = "\uE01F";
        SpecialKeys.NUMPAD6 = "\uE020";
        SpecialKeys.NUMPAD7 = "\uE021";
        SpecialKeys.NUMPAD8 = "\uE022";
        SpecialKeys.NUMPAD9 = "\uE023";
        SpecialKeys.MULTIPLY = "\uE024";
        SpecialKeys.ADD = "\uE025";
        SpecialKeys.SEPARATOR = "\uE026";
        SpecialKeys.SUBTRACT = "\uE027";
        SpecialKeys.DECIMAL = "\uE028";
        SpecialKeys.DIVIDE = "\uE029";
        SpecialKeys.F1 = "\uE031";
        SpecialKeys.F2 = "\uE032";
        SpecialKeys.F3 = "\uE033";
        SpecialKeys.F4 = "\uE034";
        SpecialKeys.F5 = "\uE035";
        SpecialKeys.F6 = "\uE036";
        SpecialKeys.F7 = "\uE037";
        SpecialKeys.F8 = "\uE038";
        SpecialKeys.F9 = "\uE039";
        SpecialKeys.F10 = "\uE03A";
        SpecialKeys.F11 = "\uE03B";
        SpecialKeys.F12 = "\uE03C";
        SpecialKeys.META = "\uE03D";
        SpecialKeys.COMMAND = "\uE03D";
    })(SpecialKeys = WebdriverIOEx.SpecialKeys || (WebdriverIOEx.SpecialKeys = {}));
})(WebdriverIOEx || (WebdriverIOEx = {}));
var webdriverIO = WebdriverIOEx.getWebdriverIOEx();
exports.WebdriverIO = webdriverIO;
