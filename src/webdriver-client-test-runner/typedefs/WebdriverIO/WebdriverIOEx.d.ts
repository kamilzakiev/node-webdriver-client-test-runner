declare namespace WebdriverIO {
    export interface Client<T> {
        /**
         * Takes screenshots and asserts they and baseline screenshots match using webdrivercss.
         *
         * @param options The WebdriverCSS options.
         *
         * @return Returns the WebdriverIO.Client.
         */
        assertAreaScreenshotMatch(options: WebdriverCSS.Options): Client<void>

        /**
         * Gets browser logs by a specific level, e.g. "INFO" or "SEVERE". Not working for Internet Explorer.
         *
         * @param args Log levels.
         *
         * @return Returns the WebdriverIO.Client.
         */
        getBrowserLogsByLevel(...args: string[]): Client<LogEntry[]>;


        /**
         * Initializes the console log reader. Call the function "getConsoleLogs" to use it.
         *
         * @return Returns the WebdriverIO.Client.
         */
        initConsoleLogReader(): Client<void>;

        /**
         * Gets browser console logs. The function "initConsoleLogReader" should be called before.
         *
         * @param clear Clear logs.
         *
         * @return Returns the WebdriverIO.Client.
         */
        getConsoleLogs(clear?: boolean): Client<ConsoleLog[]>;

        /**
         * Prints and returns browser console logs. The function "initConsoleLogReader" should be called before.
         *
         * @param clear Clear logs.
         *
         * @return Returns the WebdriverIO.Client.
         */
        printConsoleLogs(clear?: boolean): Client<ConsoleLog[]>;

        /**
         * Executes javascript files in the window context.
         *
         * @param files Paths to the files.
         *
         * @return Returns the WebdriverIO.Client.
         */
        executeFiles(files: string[]): Client<void>;
    }

    export interface ConsoleLog {
        type: "error" | "log" | "warn";
        message: string;
    }
}

declare enum Browser {
    Chrome,
    Chromium,
    Firefox,
    InternetExplorer
}