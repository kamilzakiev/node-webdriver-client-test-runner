import {_, Q, Path, Url, FS, Chalk} from "../externals";
import {Helpers} from "../exports";

export interface Config {
    rootDir?: string;
    jasmine?: ConfigJasmine;
    webdriverio?: ConfigWebdriverIO;
    webdrivercss: ConfigWebdriverCss;
    specs?: string[];
    capabilities?: ConfigCapabilities[];
    defaultTestPageUrl?: string;
    waitUntil?: () => boolean;
    execFiles?: string[];
    testPageInitMode: TestPageInitMode;
    files?: string[];
}

export enum TestPageInitMode {
    BeforeEach = <any>"beforeEach",
    BeforeAll = <any>"beforeAll",
    Manually = <any>"manually"
}

export interface ConfigCapabilities {
    name: string;
    browserName: Browser;
    getDefaultName(): string;
}

export interface ConfigJasmine {
    defaultTimeoutInterval: number;
    getReporter?: () => jasmine.Reporter;
    onInit?: () => void;
}

export interface ConfigWebdriverCss {
    screenshotRoot?: string;
    failedComparisonsRoot?: string,
    misMatchTolerance?: number;
    screenWidth?: number[];
    saveImages?: boolean;
    updateBaseline?: boolean;
    user?: string;
    api?: string;
    key?: string;
    gmOptions?: ConfigWebdriverCssGmOptions;
}

export interface ConfigWebdriverCssGmOptions {
    appPath: string;
}

export interface ConfigWebdriverIO {
    viewportSize?: {
        width: number;
        height: number;
    },
    host?: string;
    port: number;
    onInit?: () => void;
}

export function getConfig(configOrPath: Config | string): Config {
    if(_.isString(configOrPath)) {
        return applyDefaults(readConfig(<string>configOrPath));
    } else {
        return applyDefaults(<any>configOrPath || {});
    }
}

function getDefault(): Config {
    let config: Config = {
        jasmine: {
            defaultTimeoutInterval: 30000,
            getReporter: () => {
                let JasmineConsoleReporter = require('jasmine-console-reporter-custom-1');

                return new JasmineConsoleReporter({
                    colors: Helpers.isVSO() ? 0 : 2,           // (0|false)|(1|true)|2 
                    cleanStack: true,       // (0|false)|(1|true)|2|3 
                    verbosity: 4,        // (0|false)|1|2|(3|true)|4 
                    listStyle: 'indent', // "flat"|"indent" 
                    activity: false //!helpers.isAppveyor()
                });
            }
        },
        webdriverio: {
            viewportSize: {
                width: 1900,
                height: 990
            },
            host: "localhost",
            port: 4444
        },
        webdrivercss: {
            screenshotRoot: "./screenshots/",
            failedComparisonsRoot: "./screenshots/",
            misMatchTolerance: 0,
            gmOptions: {
                appPath: require("graphics-magick-binaries").getGMBinariesPathForCurrentSystem()
            }
        },
        testPageInitMode: TestPageInitMode.BeforeAll,
    }
    
    return config;
}

function readConfig(configPath: string): Config {
    if(!configPath) {
        throw new Error("Please specify a valid location of configuration file");
    }

    configPath = Path.resolve(configPath);
    if(!FS.existsSync(configPath)) {
        throw new Error("The config file does not exist on this path");
    }

    let config: Config;
    try {
        config = require(configPath);
        if(!config) {
            throw new Error(JSON.stringify(config));
        }
    } catch(error) {
        const text = "The config file has an invalid format ";
        if(error instanceof Error) {
            error.message = text + error.message;
        } else {
            error = new Error(text + error);
        }

        throw error;
    }

    return <Config>_.defaultsDeep(config, { rootDir: Path.dirname(configPath) });
}

function applyDefaults(originalConfig: Config): Config {
    let config = <Config>_.defaultsDeep(originalConfig, getDefault());

    config.webdrivercss.screenshotRoot = Path.isAbsolute(config.webdrivercss.screenshotRoot)
        ? config.webdrivercss.screenshotRoot
        : Path.join(config.rootDir, config.webdrivercss.screenshotRoot);

    config.webdrivercss.failedComparisonsRoot = Path.isAbsolute(config.webdrivercss.failedComparisonsRoot)
        ? config.webdrivercss.failedComparisonsRoot
        : Path.join(config.rootDir, config.webdrivercss.failedComparisonsRoot);

    if(_.isArray(config.capabilities) && config.capabilities.length > 0) {
        config.capabilities.forEach(x => x.getDefaultName = () => x.name || <any>x.browserName);
    } else {
        config.capabilities = [];
    }

    try {
        FS.accessSync(config.rootDir, FS.F_OK);
    } catch (error) {
        throw new Error("config.rootDir is not accessible");
    }

    return config;
}