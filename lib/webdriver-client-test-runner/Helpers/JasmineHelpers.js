"use strict";
var externals_1 = require("../externals");
var JasmineHelpers;
(function (JasmineHelpers) {
    /**
     * Adds the area screenshots match expectation using webdrivercss comparison results.
     *
     * @param pageResults Comparsion results of a webdrivercss call.
     */
    function webdriverCSSMatch(pageResults) {
        var pages = externals_1._.keys(pageResults);
        if (!pages.length) {
            throw new Error("Comparsion results shouldn't be empty");
        }
        pages.forEach(function (page) {
            if (!page.length) {
                throw new Error("Comparsion results shouldn't be empty");
            }
            pageResults[page].forEach(function (result) {
                var name = result.properties && result.properties.name;
                expect(result.isWithinMisMatchTolerance)
                    .toBeTruthy("Page: " + page + ", name: " + name + ", mismatch: " + result.misMatchPercentage + "%)");
            });
        });
    }
    JasmineHelpers.webdriverCSSMatch = webdriverCSSMatch;
})(JasmineHelpers = exports.JasmineHelpers || (exports.JasmineHelpers = {}));
