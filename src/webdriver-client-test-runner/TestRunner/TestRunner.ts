import {Helpers, WebdriverIO, HttpServer} from "../exports";
import {_, Q, Path, FS, Globule, Url, mkdirp, rimraf, Chalk, commandLineArgs} from "../externals";
import * as WebdriverCSS from "webdrivercss-custom-v4-compatible";
import {JasmineTestRunner} from "./JasmineTestRunner";
import * as TestRunnerConfig from "./TestRunnerConfig";
import Config = TestRunnerConfig.Config;
import InitTestMode = TestRunnerConfig.TestPageInitMode;
import ConfigCapabilities = TestRunnerConfig.ConfigCapabilities;

export module TestRunner {
    export interface TestRunnerOptions {
        config: Config | string;
        configEx: Config | string;
        updateBaselineImages?: boolean;
    }

    interface BrowserInfo {
        screen: Screen;
        window: {
            innerWidth: number,
            innerHeight: number,
            outerWidth: number,
            outerHeight: number
        }
    }

    let currentTestRunnerInternal: TestRunnerInternal;
    Object.defineProperty(global, "browser", { get: function() { return currentTestRunnerInternal.webdriverClient; }});

    /**
     * Gets the current config.
     *
     * @return Returns the config.
     */
    export function getCurrentConfig() {
        return currentTestRunnerInternal && _.cloneDeep(currentTestRunnerInternal.config);
    }

    /**
     * Gets the string path by the full name of the current spec.
     *
     * @return Returns the string path.
     */
    export function getCurrentSpecPath(): string {
        if(!jasmine || !jasmine.currentSpec || !jasmine.currentSuite) {
            return null;
        }

        let currentSuite = jasmine.currentSuite;
        let suites: jasmine.Suite[] = [];
        while(currentSuite && currentSuite !== jasmine.getEnv().topSuite()) {
            suites.push(currentSuite);
            currentSuite = currentSuite.parentSuite;
        }

        let descriptions = suites.reverse().map(x => x.description);
        descriptions.push(jasmine.currentSpec.description);

        return descriptions.map(x => x.replace(/[^a-z0-9 -/]/gi, "")).join("/");
    }

    /**
     * Runs tests using the path to the config file.
     *
     * @param options Test runner options
     * @return Returns the promise.
     */
    export function run(options: TestRunnerOptions): Promise<any> {
        return Q()
            .then(() => {
                if(currentTestRunnerInternal) {
                    throw new Error("Test runner is already working!");
                }
            })
            .then(() => currentTestRunnerInternal = new TestRunnerInternal(options))
            .then(() => currentTestRunnerInternal.run())
            .catch(logError)
            .finally(() => currentTestRunnerInternal = undefined);
    }

    /**
     * Gets test runner options from command line arguments
     *
     * @return Returns test runner options.
     */
    export function getCommandLineOptions(): TestRunnerOptions {
         let options = commandLineArgs([
                 { name: 'configPath', type: String, defaultOption: true },
                 { name: 'autoRunSeleniumServer', type: Boolean },
                 { name: 'updateBaselineImages', type: Boolean }
             ]);
        return options;
    }

    function logError(error): any {
        if(error && _.isArray(error.failedExpectations)) { // only a jasmine reporter should print failed expectations.
            throw error;
        } else {
            Helpers.logError(error);
        }
    }

    class TestRunnerInternal {
        public config: Config;
        public webdriverClient: WebdriverIO.Client<void>;
        private static DefaultStartPagePath = Path.join(__dirname, "../../../resources/blank-page.html");
        private options: TestRunnerOptions;
        private currentBrowserInfo: BrowserInfo;
        private currentCapabilities: ConfigCapabilities;

        constructor(options: TestRunnerOptions) {
            if(!options) {
                throw new Error("The test runner options should be specified!");
            }

            this.options = options;
            this.config = TestRunnerConfig.getConfig(this.options.config);

            if(this.options.configEx) {
                _.extendWith(this.config, TestRunnerConfig.getConfig(this.options.configEx),
                    (obj: any[], src: any[]) => {
                        if(!_.isArray(obj) && !_.isArray(src)) {
                            return _.extend(obj, src);
                        }

                        return obj.concat(src);
                    });
            }
        }

        public run() {
            return Q()
                .then(() => HttpServer.start())
                .then(() => {
                    this.clearBaselineImages();
                    this.initJasmine();
                    let files = Helpers.getFilesByGlob(this.config.specs, this.config.rootDir);
                    JasmineTestRunner.loadRunnables(files,
                        this.config.capabilities,
                        x => `[${x.getDefaultName()}]`,
                        (c, addSuites) => this.initTestsByCapabilities(c, addSuites));
                })
                .then(() => JasmineTestRunner.execute())
                .finally(() => HttpServer.stop());
        }

        private clearBaselineImages() {
            if(this.config.webdrivercss && this.options.updateBaselineImages) {
                rimraf.sync(this.config.webdrivercss.screenshotRoot);
                rimraf.sync(this.config.webdrivercss.failedComparisonsRoot);
            }
        }

        private initJasmine() {
            JasmineTestRunner.init();
            jasmine.DEFAULT_TIMEOUT_INTERVAL = this.config.jasmine.defaultTimeoutInterval;
            if(_.isFunction(this.config.jasmine.getReporter)) {
                 jasmine.getEnv().addReporter(this.config.jasmine.getReporter());
            }

            jasmine.beforeEachInitTestPage = (url) => {
                beforeEach(() => this.initWebdriverIOAndTestPage(url).catch(error => {
                        jasmine.currentSpec.pend("Disabled due to an error during the webdriver client initialization");
                        throw error;
                    }));
            };

            jasmine.beforeAllInitTestPage = (url) => {
                beforeAll(() => this.initWebdriverIOAndTestPage(url).catch(error => {
                        jasmine.currentSuite.getAllChildren().forEach(x =>
                            x.pend("Disabled due to an error during the webdriver client initialization"));
                        throw error;
                    }));
            };

            jasmine.afterEachCloseBrowser = () => {
                afterEach(() => this.closeWebdriverIO(true));
            };

            jasmine.afterAllCloseBrowser = () => {
                afterAll(() => this.closeWebdriverIO(true));
            };

            this.config.jasmine.onInit && this.config.jasmine.onInit();
        }

        private initTestsByCapabilities(capabilities: TestRunnerConfig.ConfigCapabilities, addSuites: () => void) {
            jasmine.currentBrowser = capabilities.browserName;
            beforeAll(() => {
                jasmine.currentBrowser = capabilities.browserName;
                this.currentCapabilities = capabilities;
                this.currentBrowserInfo = null;
            });

            switch(this.config.testPageInitMode) {
                case InitTestMode.BeforeAll: jasmine.beforeAllInitTestPage(); break;
                case InitTestMode.BeforeEach: jasmine.beforeEachInitTestPage(); break;
            }

            jasmine.afterAllCloseBrowser();

            afterEach(() => this.webdriverClient && this.webdriverClient.printConsoleLogs(true));

            addSuites();
        }

        private initTestPage(url?: string) {
            return Q.fcall(() => {
                    url = url || this.config.defaultTestPageUrl;
                    if(url) {
                        if(Url.parse(url) && Url.parse(url).host) {
                        } else {
                            url = Path.isAbsolute(url) ? url : Path.join(this.config.rootDir, url);
                        }
                    } else {
                        url = TestRunnerInternal.DefaultStartPagePath;
                    }
                })
                .then(() => this.webdriverClient
                    .url(FS.existsSync(url) ? HttpServer.getUrl(url) : url)
                    .initConsoleLogReader()
                    .then(() => this.addFileLinksOnTestPage(url)) // adds css/script links.
                    .then(() => { // executes scripts.
                        if(_.isArray(this.config.execFiles)) {
                            let files = Helpers.getFilesByGlob(this.config.execFiles, this.config.rootDir);
                            return this.webdriverClient.executeFiles(files);
                        }
                     })
                    .then(() => { // waits until the page is not ready for testing.
                        if(_.isFunction(this.config.waitUntil)) {
                            return this.webdriverClient.waitUntil(() => this.webdriverClient
                                    .execute(this.config.waitUntil)
                                    .then(result => !!result.value));
                        }
                    }));
        }

        private printBrowserInfo() {
            let browserInfo: BrowserInfo = <BrowserInfo>{};
            return this.webdriverClient.execute(function(){ 
                    return JSON.stringify((function(obj) {
                        var ret = {};
                        for (var i in obj) {
                            ret[i] = obj[i];
                        }
                        return ret;
                    })(screen))})
                .then(result => browserInfo.screen = JSON.parse(result.value))
                .execute(function(){
                    return { 
                        innerWidth: window.innerWidth,
                        innerHeight: window.innerHeight,
                        outerWidth: window.outerWidth,
                        outerHeight: window.outerHeight
                    };
                })
                .then(result => browserInfo.window = result.value)
                .then(() => {
                    if(_.isEqual(browserInfo, this.currentBrowserInfo)) {
                        return;
                    }

                    this.currentBrowserInfo = browserInfo;
                    console.log(Chalk.gray(`
======================================================
Screen size: ${browserInfo.screen.width}x${browserInfo.screen.height}. Available size: ${browserInfo.screen.availWidth}x${browserInfo.screen.availHeight}.
Inner size: ${browserInfo.window.innerWidth}x${browserInfo.window.innerHeight}. Outer size: ${browserInfo.window.outerWidth}x${browserInfo.window.outerHeight}.
======================================================
`
                    ));
                });
        }

        private addFileLinksOnTestPage(url: string) {
            if(!_.isArray(this.config.files)) {
                return;
            }

            let isFile = FS.existsSync(url);
            let files = _.flatten(this.config.files.map(v => {
                if(Url.parse(v) && Url.parse(v).host) {
                    return v;
                } else {
                    if(isFile) {
                        let startPageDirName = Path.dirname(url);
                        return Helpers.getFilesByGlob(v, this.config.rootDir).map(x => HttpServer.getUrl(x));
                    }
                }
            })).filter(x => !!x);

            return this.webdriverClient.executeAsync(function(files: string[], done: () => void) {
                (function addFileLinksAsync(index: number) {
                    setTimeout(function() {
                        if(files[index]) {
                            addFileLink(files[index], function() {
                                addFileLinksAsync(index + 1);
                            });
                        } else {
                            done();
                        }
                    }, 0);
                })(0);
                function addFileLink(src: string, onload: () => any) {
                    switch(src && /[^.]+$/.exec(src)[0]) {
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
        }

        private initWebdriverIOAndTestPage(url?: string) {
            return Q()
                .then(() => {
                    if(this.currentCapabilities.browserName === Browser.InternetExplorer) { // IE WebDriver works unstable and shoud be closed before navigating.
                        return this.closeWebdriverIO(false);
                    }
                })
                .then(() => {
                    if(!this.webdriverClient) {
                        return this.initWebdriverIO();
                    }
                })
                .then(() => this.initTestPage(url));
        }

        private initWebdriverIO() {
            let timeout = this.config.jasmine.defaultTimeoutInterval;
            return Q.fcall(() => this.webdriverClient = WebdriverIO.remote({ // sets the webrdriverio client as a global variable.
                    desiredCapabilities: this.getDesiredCapabilities(this.currentCapabilities),
                    waitforTimeout: timeout,
                    host: this.config.webdriverio.host,
                    port: parseFloat(<any>this.config.webdriverio.port)
                }))
                .then(() => this.initWebdriverCSS())
                .then(() => this.webdriverClient.init()) // initializes the webdriverio client.
                .then(() => { // sets a window size.
                    if(this.config.webdriverio
                        && this.config.webdriverio.viewportSize
                        && this.config.webdriverio.viewportSize.width > 0
                        && this.config.webdriverio.viewportSize.height > 0) {
                        return this.webdriverClient
                            .setViewportSize(this.config.webdriverio.viewportSize, true)
                            .windowHandlePosition({ x: 0, y: 0 });
                    }
                })
                .then(() => this.webdriverClient // sets a timeout.
                    .timeouts("script", timeout)
                    .timeouts("page load", timeout)
                    .timeouts("implicit", timeout)
                    .timeoutsAsyncScript(timeout)
                    .timeoutsImplicitWait(timeout)
                )
                .then(() => this.printBrowserInfo())
                .then(() => {
                    this.config.webdriverio.onInit && this.config.webdriverio.onInit();
                });
        }

        private getDesiredCapabilities(capabilities: ConfigCapabilities) {
            capabilities = _.cloneDeep(this.currentCapabilities);
            if(capabilities.browserName === <any>Browser.Chromium) {
                if(!(<any>capabilities).chromeOptions
                    || !(<any>capabilities).chromeOptions.binary
                    || !FS.existsSync((<any>capabilities).chromeOptions.binary)) {
                    throw new Error("Missing chromium binary path");
                }

                capabilities.browserName = Browser.Chrome;
            }

            delete capabilities.getDefaultName;
            delete capabilities.name;
            return capabilities;
        }

        private initWebdriverCSS() {
            if(!this.config.webdrivercss) {
                return;
            }

            return WebdriverCSS.init(this.webdriverClient, _.cloneDeep(this.config.webdrivercss));
        }

        private closeWebdriverIO(printConsoleLogs: boolean) {
            return Q()
                .then(() => this.webdriverClient && printConsoleLogs && this.webdriverClient.printConsoleLogs(true))
                .then(() => this.webdriverClient && this.webdriverClient.end()) // closes the browser window.
                .catch(error => {
                    if(error && error["seleniumStack"]) { // supresses an unknown error on appveyor on IE
                        let seleniumStack = error["seleniumStack"];
                        if(seleniumStack
                            && seleniumStack["type"] === "UnknownError"
                            && seleniumStack["orgStatusMessage"] === "Can't obtain updateLastError method for class com.sun.jna.Native") {
                            return;
                        }
                    }

                    if(error && error.toString() === "Error: Could not initialize class org.openqa.selenium.os.Kernel32") {  // supresses an unknown error on appveyor on IE
                        //console.log("\n" + Chalk.red(error));
                        return;
                    }

                    logError(error);
                })
                .finally(() => this.webdriverClient = undefined);
        }
    }
}