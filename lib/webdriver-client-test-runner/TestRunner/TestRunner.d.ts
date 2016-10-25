import * as TestRunnerConfig from "./TestRunnerConfig";
import Config = TestRunnerConfig.Config;
export declare module TestRunner {
    interface TestRunnerOptions {
        config: Config | string;
        configEx: Config | string;
        updateBaselineImages?: boolean;
    }
    /**
     * Gets the current config.
     *
     * @return Returns the config.
     */
    function getCurrentConfig(): TestRunnerConfig.Config;
    /**
     * Gets the string path by the full name of the current spec.
     *
     * @return Returns the string path.
     */
    function getCurrentSpecPath(): string;
    /**
     * Runs tests using the path to the config file.
     *
     * @param options Test runner options
     * @return Returns the promise.
     */
    function run(options: TestRunnerOptions): Promise<any>;
    /**
     * Gets test runner options from command line arguments
     *
     * @return Returns test runner options.
     */
    function getCommandLineOptions(): TestRunnerOptions;
}
