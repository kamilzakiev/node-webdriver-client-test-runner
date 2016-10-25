"use strict";
var externals_1 = require("../externals");
var exports_1 = require("../exports");
var JasmineTestRunner;
(function (JasmineTestRunner) {
    function init() {
        var jasmine = exports_1.JasmineRequire.core(exports_1.JasmineRequire);
        var jasmineInterface = exports_1.JasmineRequire.interface(jasmine, jasmine.getEnv());
        for (var property in jasmineInterface) {
            global[property] = jasmineInterface[property];
        }
    }
    JasmineTestRunner.init = init;
    function loadRunnables(files, values, getName, onAddSuites) {
        var result = [];
        var _loop_1 = function(value) {
            var suite = describe(getName(value), function () {
                onAddSuites(value, function () {
                    files.forEach(require);
                    //We have to remove all required specs from the require.cache
                    //to get the ability to add all suites again.
                    files.forEach(function (file) { delete require.cache[require.resolve(file)]; });
                });
            });
            result.push(suite);
        };
        for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
            var value = values_1[_i];
            _loop_1(value);
        }
        return result;
    }
    JasmineTestRunner.loadRunnables = loadRunnables;
    function execute(runnablesToRun) {
        var runnablesIdToRun = runnablesToRun
            ? externals_1._.isArray(runnablesToRun) ? runnablesToRun.map(function (x) { return x.id; }) : [runnablesToRun.id]
            : undefined;
        var defer = externals_1.Q.defer();
        jasmine.getEnv().addReporter({
            jasmineDone: function (value) {
                setTimeout(function () {
                    if (value.failedExpectations.length > 0) {
                        defer.reject(value);
                    }
                    else {
                        defer.resolve(value);
                    }
                }, 1);
            }
        });
        jasmine.getEnv().execute(runnablesIdToRun);
        return defer.promise;
    }
    JasmineTestRunner.execute = execute;
})(JasmineTestRunner = exports.JasmineTestRunner || (exports.JasmineTestRunner = {}));
