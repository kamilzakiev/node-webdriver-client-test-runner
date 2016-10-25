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
export declare enum TestPageInitMode {
    BeforeEach,
    BeforeAll,
    Manually,
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
    failedComparisonsRoot?: string;
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
    };
    host?: string;
    port: number;
    onInit?: () => void;
}
export declare function getConfig(configOrPath: Config | string): Config;
