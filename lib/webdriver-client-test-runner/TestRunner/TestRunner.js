"use strict";
var exports_1 = require("../exports");
var externals_1 = require("../externals");
var WebdriverCSS = require("webdrivercss-custom-v4-compatible");
var JasmineTestRunner_1 = require("./JasmineTestRunner");
var TestRunnerConfig = require("./TestRunnerConfig");
var InitTestMode = TestRunnerConfig.TestPageInitMode;
var TestRunner;
(function (TestRunner) {
    var currentTestRunnerInternal;
    Object.defineProperty(global, "browser", { get: function () { return currentTestRunnerInternal.webdriverClient; } });
    /**
     * Gets the current config.
     *
     * @return Returns the config.
     */
    function getCurrentConfig() {
        return currentTestRunnerInternal && externals_1._.cloneDeep(currentTestRunnerInternal.config);
    }
    TestRunner.getCurrentConfig = getCurrentConfig;
    /**
     * Gets the string path by the full name of the current spec.
     *
     * @return Returns the string path.
     */
    function getCurrentSpecPath() {
        if (!jasmine || !jasmine.currentSpec || !jasmine.currentSuite) {
            return null;
        }
        var currentSuite = jasmine.currentSuite;
        var suites = [];
        while (currentSuite && currentSuite !== jasmine.getEnv().topSuite()) {
            suites.push(currentSuite);
            currentSuite = currentSuite.parentSuite;
        }
        var descriptions = suites.reverse().map(function (x) { return x.description; });
        descriptions.push(jasmine.currentSpec.description);
        return descriptions.map(function (x) { return x.replace(/[^a-z0-9 -/]/gi, ""); }).join("/");
    }
    TestRunner.getCurrentSpecPath = getCurrentSpecPath;
    /**
     * Runs tests using the path to the config file.
     *
     * @param options Test runner options
     * @return Returns the promise.
     */
    function run(options) {
        return externals_1.Q()
            .then(function () {
            if (currentTestRunnerInternal) {
                throw new Error("Test runner is already working!");
            }
        })
            .then(function () { return currentTestRunnerInternal = new TestRunnerInternal(options); })
            .then(function () { return currentTestRunnerInternal.run(); })
            .catch(logError)
            .finally(function () { return currentTestRunnerInternal = undefined; });
    }
    TestRunner.run = run;
    /**
     * Gets test runner options from command line arguments
     *
     * @return Returns test runner options.
     */
    function getCommandLineOptions() {
        var options = externals_1.commandLineArgs([
            { name: 'configPath', type: String, defaultOption: true },
            { name: 'autoRunSeleniumServer', type: Boolean },
            { name: 'updateBaselineImages', type: Boolean }
        ]);
        return options;
    }
    TestRunner.getCommandLineOptions = getCommandLineOptions;
    function logError(error) {
        if (error && externals_1._.isArray(error.failedExpectations)) {
            throw error;
        }
        else {
            exports_1.Helpers.logError(error);
        }
    }
    var TestRunnerInternal = (function () {
        function TestRunnerInternal(options) {
            if (!options) {
                throw new Error("The test runner options should be specified!");
            }
            this.options = options;
            this.config = TestRunnerConfig.getConfig(this.options.config);
            if (this.options.configEx) {
                externals_1._.extendWith(this.config, TestRunnerConfig.getConfig(this.options.configEx), function (obj, src) {
                    if (!externals_1._.isArray(obj) && !externals_1._.isArray(src)) {
                        return externals_1._.extend(obj, src);
                    }
                    return obj.concat(src);
                });
            }
        }
        TestRunnerInternal.prototype.run = function () {
            var _this = this;
            return externals_1.Q()
                .then(function () { return exports_1.HttpServer.start(); })
                .then(function () {
                _this.clearBaselineImages();
                _this.initJasmine();
                var files = exports_1.Helpers.getFilesByGlob(_this.config.specs, _this.config.rootDir);
                JasmineTestRunner_1.JasmineTestRunner.loadRunnables(files, _this.config.capabilities, function (x) { return ("[" + x.getDefaultName() + "]"); }, function (c, addSuites) { return _this.initTestsByCapabilities(c, addSuites); });
            })
                .then(function () { return JasmineTestRunner_1.JasmineTestRunner.execute(); })
                .finally(function () { return exports_1.HttpServer.stop(); });
        };
        TestRunnerInternal.prototype.clearBaselineImages = function () {
            if (this.config.webdrivercss && this.options.updateBaselineImages) {
                externals_1.rimraf.sync(this.config.webdrivercss.screenshotRoot);
                externals_1.rimraf.sync(this.config.webdrivercss.failedComparisonsRoot);
            }
        };
        TestRunnerInternal.prototype.initJasmine = function () {
            var _this = this;
            JasmineTestRunner_1.JasmineTestRunner.init();
            jasmine.DEFAULT_TIMEOUT_INTERVAL = this.config.jasmine.defaultTimeoutInterval;
            if (externals_1._.isFunction(this.config.jasmine.getReporter)) {
                jasmine.getEnv().addReporter(this.config.jasmine.getReporter());
            }
            jasmine.beforeEachInitTestPage = function (url) {
                beforeEach(function () { return _this.initWebdriverIOAndTestPage(url).catch(function (error) {
                    jasmine.currentSpec.pend("Disabled due to an error during the webdriver client initialization");
                    throw error;
                }); });
            };
            jasmine.beforeAllInitTestPage = function (url) {
                beforeAll(function () { return _this.initWebdriverIOAndTestPage(url).catch(function (error) {
                    jasmine.currentSuite.getAllChildren().forEach(function (x) {
                        return x.pend("Disabled due to an error during the webdriver client initialization");
                    });
                    throw error;
                }); });
            };
            jasmine.afterEachCloseBrowser = function () {
                afterEach(function () { return _this.closeWebdriverIO(true); });
            };
            jasmine.afterAllCloseBrowser = function () {
                afterAll(function () { return _this.closeWebdriverIO(true); });
            };
            this.config.jasmine.onInit && this.config.jasmine.onInit();
        };
        TestRunnerInternal.prototype.initTestsByCapabilities = function (capabilities, addSuites) {
            var _this = this;
            jasmine.currentBrowser = capabilities.browserName;
            beforeAll(function () {
                jasmine.currentBrowser = capabilities.browserName;
                _this.currentCapabilities = capabilities;
                _this.currentBrowserInfo = null;
            });
            switch (this.config.testPageInitMode) {
                case InitTestMode.BeforeAll:
                    jasmine.beforeAllInitTestPage();
                    break;
                case InitTestMode.BeforeEach:
                    jasmine.beforeEachInitTestPage();
                    break;
            }
            jasmine.afterAllCloseBrowser();
            afterEach(function () { return _this.webdriverClient && _this.webdriverClient.printConsoleLogs(true); });
            addSuites();
        };
        TestRunnerInternal.prototype.initTestPage = function (url) {
            var _this = this;
            return externals_1.Q.fcall(function () {
                url = url || _this.config.defaultTestPageUrl;
                if (url) {
                    if (externals_1.Url.parse(url) && externals_1.Url.parse(url).host) {
                    }
                    else {
                        url = externals_1.Path.isAbsolute(url) ? url : externals_1.Path.join(_this.config.rootDir, url);
                    }
                }
                else {
                    url = TestRunnerInternal.DefaultStartPagePath;
                }
            })
                .then(function () { return _this.webdriverClient
                .url(externals_1.FS.existsSync(url) ? exports_1.HttpServer.getUrl(url) : url)
                .initConsoleLogReader()
                .then(function () { return _this.addFileLinksOnTestPage(url); }) // adds css/script links.
                .then(function () {
                if (externals_1._.isArray(_this.config.execFiles)) {
                    var files = exports_1.Helpers.getFilesByGlob(_this.config.execFiles, _this.config.rootDir);
                    return _this.webdriverClient.executeFiles(files);
                }
            })
                .then(function () {
                if (externals_1._.isFunction(_this.config.waitUntil)) {
                    return _this.webdriverClient.waitUntil(function () { return _this.webdriverClient
                        .execute(_this.config.waitUntil)
                        .then(function (result) { return !!result.value; }); });
                }
            }); });
        };
        TestRunnerInternal.prototype.printBrowserInfo = function () {
            var _this = this;
            var browserInfo = {};
            return this.webdriverClient.execute(function () {
                return JSON.stringify((function (obj) {
                    var ret = {};
                    for (var i in obj) {
                        ret[i] = obj[i];
                    }
                    return ret;
                })(screen));
            })
                .then(function (result) { return browserInfo.screen = JSON.parse(result.value); })
                .execute(function () {
                return {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight
                };
            })
                .then(function (result) { return browserInfo.window = result.value; })
                .then(function () {
                if (externals_1._.isEqual(browserInfo, _this.currentBrowserInfo)) {
                    return;
                }
                _this.currentBrowserInfo = browserInfo;
                console.log(externals_1.Chalk.gray("\n======================================================\nScreen size: " + browserInfo.screen.width + "x" + browserInfo.screen.height + ". Available size: " + browserInfo.screen.availWidth + "x" + browserInfo.screen.availHeight + ".\nInner size: " + browserInfo.window.innerWidth + "x" + browserInfo.window.innerHeight + ". Outer size: " + browserInfo.window.outerWidth + "x" + browserInfo.window.outerHeight + ".\n======================================================\n"));
            });
        };
        TestRunnerInternal.prototype.addFileLinksOnTestPage = function (url) {
            var _this = this;
            if (!externals_1._.isArray(this.config.files)) {
                return;
            }
            var isFile = externals_1.FS.existsSync(url);
            var files = externals_1._.flatten(this.config.files.map(function (v) {
                if (externals_1.Url.parse(v) && externals_1.Url.parse(v).host) {
                    return v;
                }
                else {
                    if (isFile) {
                        var startPageDirName = externals_1.Path.dirname(url);
                        return exports_1.Helpers.getFilesByGlob(v, _this.config.rootDir).map(function (x) { return exports_1.HttpServer.getUrl(x); });
                    }
                }
            })).filter(function (x) { return !!x; });
            return this.webdriverClient.executeAsync(function (files, done) {
                (function addFileLinksAsync(index) {
                    setTimeout(function () {
                        if (files[index]) {
                            addFileLink(files[index], function () {
                                addFileLinksAsync(index + 1);
                            });
                        }
                        else {
                            done();
                        }
                    }, 0);
                })(0);
                function addFileLink(src, onload) {
                    switch (src && /[^.]+$/.exec(src)[0]) {
                        case "js":
                            var script = document.createElement("script");
                            script.onload = onload;
                            script.onerror = onload;
                            script.src = src;
                            script.type = "text/javascript";
                            var head = document.getElementsByTagName("head")[0];
                            (head || document.body || document).appendChild(script);
                            break;
                        case "css":
                            var link = document.createElement("link");
                            link.href = src;
                            link.type = "text/css";
                            link.rel = "stylesheet";
                            var head = document.getElementsByTagName("head")[0];
                            (head || document.body || document).appendChild(link);
                            onload();
                            break;
                    }
                }
            }, files);
        };
        TestRunnerInternal.prototype.initWebdriverIOAndTestPage = function (url) {
            var _this = this;
            return externals_1.Q()
                .then(function () {
                if (_this.currentCapabilities.browserName === Browser.InternetExplorer) {
                    return _this.closeWebdriverIO(false);
                }
            })
                .then(function () {
                if (!_this.webdriverClient) {
                    return _this.initWebdriverIO();
                }
            })
                .then(function () { return _this.initTestPage(url); });
        };
        TestRunnerInternal.prototype.initWebdriverIO = function () {
            var _this = this;
            var timeout = this.config.jasmine.defaultTimeoutInterval;
            return externals_1.Q.fcall(function () { return _this.webdriverClient = exports_1.WebdriverIO.remote({
                desiredCapabilities: _this.getDesiredCapabilities(_this.currentCapabilities),
                waitforTimeout: timeout,
                host: _this.config.webdriverio.host,
                port: parseFloat(_this.config.webdriverio.port)
            }); })
                .then(function () { return _this.initWebdriverCSS(); })
                .then(function () { return _this.webdriverClient.init(); }) // initializes the webdriverio client.
                .then(function () {
                if (_this.config.webdriverio
                    && _this.config.webdriverio.viewportSize
                    && _this.config.webdriverio.viewportSize.width > 0
                    && _this.config.webdriverio.viewportSize.height > 0) {
                    return _this.webdriverClient
                        .setViewportSize(_this.config.webdriverio.viewportSize, true)
                        .windowHandlePosition({ x: 0, y: 0 });
                }
            })
                .then(function () { return _this.webdriverClient // sets a timeout.
                .timeouts("script", timeout)
                .timeouts("page load", timeout)
                .timeouts("implicit", timeout)
                .timeoutsAsyncScript(timeout)
                .timeoutsImplicitWait(timeout); })
                .then(function () { return _this.printBrowserInfo(); })
                .then(function () {
                _this.config.webdriverio.onInit && _this.config.webdriverio.onInit();
            });
        };
        TestRunnerInternal.prototype.getDesiredCapabilities = function (capabilities) {
            capabilities = externals_1._.cloneDeep(this.currentCapabilities);
            if (capabilities.browserName === Browser.Chromium) {
                if (!capabilities.chromeOptions
                    || !capabilities.chromeOptions.binary
                    || !externals_1.FS.existsSync(capabilities.chromeOptions.binary)) {
                    throw new Error("Missing chromium binary path");
                }
                capabilities.browserName = Browser.Chrome;
            }
            delete capabilities.getDefaultName;
            delete capabilities.name;
            return capabilities;
        };
        TestRunnerInternal.prototype.initWebdriverCSS = function () {
            if (!this.config.webdrivercss) {
                return;
            }
            return WebdriverCSS.init(this.webdriverClient, externals_1._.cloneDeep(this.config.webdrivercss));
        };
        TestRunnerInternal.prototype.closeWebdriverIO = function (printConsoleLogs) {
            var _this = this;
            return externals_1.Q()
                .then(function () { return _this.webdriverClient && printConsoleLogs && _this.webdriverClient.printConsoleLogs(true); })
                .then(function () { return _this.webdriverClient && _this.webdriverClient.end(); }) // closes the browser window.
                .catch(function (error) {
                if (error && error["seleniumStack"]) {
                    var seleniumStack = error["seleniumStack"];
                    if (seleniumStack
                        && seleniumStack["type"] === "UnknownError"
                        && seleniumStack["orgStatusMessage"] === "Can't obtain updateLastError method for class com.sun.jna.Native") {
                        return;
                    }
                }
                if (error && error.toString() === "Error: Could not initialize class org.openqa.selenium.os.Kernel32") {
                    //console.log("\n" + Chalk.red(error));
                    return;
                }
                logError(error);
            })
                .finally(function () { return _this.webdriverClient = undefined; });
        };
        TestRunnerInternal.DefaultStartPagePath = externals_1.Path.join(__dirname, "../../../resources/blank-page.html");
        return TestRunnerInternal;
    }());
})(TestRunner = exports.TestRunner || (exports.TestRunner = {}));
