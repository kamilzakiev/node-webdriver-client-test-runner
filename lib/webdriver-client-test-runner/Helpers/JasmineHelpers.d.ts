export declare module JasmineHelpers {
    /**
     * Adds the area screenshots match expectation using webdrivercss comparison results.
     *
     * @param pageResults Comparsion results of a webdrivercss call.
     */
    function webdriverCSSMatch(pageResults: WebdriverCSS.ComparisonResults | WebdriverIO.Client<WebdriverCSS.ComparisonResults>): void;
}
