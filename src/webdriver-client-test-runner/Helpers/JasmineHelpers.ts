import {_, Q, Chalk} from "../externals";

export module JasmineHelpers {

    /**
     * Adds the area screenshots match expectation using webdrivercss comparison results.
     *
     * @param pageResults Comparsion results of a webdrivercss call.
     */
    export function webdriverCSSMatch(pageResults: WebdriverCSS.ComparisonResults | WebdriverIO.Client<WebdriverCSS.ComparisonResults>) {
        let pages = _.keys(pageResults);
        if(!pages.length) {
            throw new Error("Comparsion results shouldn't be empty");
        }

        pages.forEach(page => {
            if(!page.length) {
                throw new Error("Comparsion results shouldn't be empty");
            }

            pageResults[page].forEach(result => {
                let name = result.properties && result.properties.name;

                expect(result.isWithinMisMatchTolerance)
                    .toBeTruthy(`Page: ${page}, name: ${name}, mismatch: ${result.misMatchPercentage}%)`);
            });
        });
    }
}