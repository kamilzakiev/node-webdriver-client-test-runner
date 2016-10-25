declare class Launcher {
    constructor(configFilePath: string, options: any);
    configParser: ConfigParser;
    endHandler: any;
    exitHandler: any;

    run(): Promise<number>;
}

declare class ConfigParser {
    getConfig(): any;
}

declare module Launcher {

}
declare module "webdriverio/build/lib/launcher" {
    export = Launcher;
}