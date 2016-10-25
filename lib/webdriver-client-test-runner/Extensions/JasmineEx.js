"use strict";
var externals_1 = require("../externals");
var JasmineEx;
(function (JasmineEx) {
    function getJasmineRequireEx() {
        var jasmineRequire = require("jasmine-core/lib/jasmine-core/jasmine");
        var interfaceOriginal = jasmineRequire.interface;
        jasmineRequire.interface = function () {
            var result = interfaceOriginal.apply(this, arguments);
            initJasmineInterfaceEx(result);
            return result;
        };
        return jasmineRequire;
    }
    JasmineEx.getJasmineRequireEx = getJasmineRequireEx;
    // adds additional helper methods to webdriverio.
    function initJasmineInterfaceEx(jasmineInterface) {
        var jasmineGlobal = jasmineInterface["jasmine"];
        jasmineGlobal.MAX_TIMEOUT = Math.pow(2, 31) - 1;
        var originalTreeProcessor = jasmineGlobal.TreeProcessor;
        jasmineGlobal.TreeProcessor = function (attrs) {
            jasmineGlobal.currentSuite = attrs.tree;
            var nodeStart = attrs.nodeStart;
            attrs.nodeStart = function (node) {
                jasmine.currentSuite = node;
                return nodeStart && nodeStart.apply(this, arguments);
            };
            var nodeComplete = attrs.nodeComplete;
            attrs.nodeComplete = function (node, result) {
                jasmine.currentSuite = node.parentSuite;
                return nodeComplete && nodeComplete.apply(this, arguments);
            };
            return originalTreeProcessor.apply(this, arguments);
        };
        var specExecute = jasmineGlobal.Spec.prototype.execute;
        jasmineGlobal.Spec.prototype.execute = function () {
            jasmineGlobal.currentSpec = this;
            return specExecute.apply(this, arguments);
        };
        jasmineGlobal.Suite.prototype.getAllChildren = function () {
            var result = externals_1._.clone(this.children);
            for (var i = 0; i < result.length; i++) {
                if (result[i].children) {
                    result[i].children.forEach(function (x) { return result.push(x); });
                }
            }
            return result;
        };
        var originalAddReporter = jasmineGlobal.getEnv().addReporter;
        jasmineGlobal.getEnv().addReporter = function (reporter) {
            if (reporter.jasmineDone) {
                var originalJasmineDone_1 = reporter.jasmineDone;
                reporter.jasmineDone = function (result) {
                    result.failedExpectations = externals_1._.flatten(jasmine.getEnv().topSuite().getAllChildren()
                        .map(function (x) { return x.getResult().failedExpectations; }));
                    return originalJasmineDone_1.apply(this, arguments);
                };
            }
            return originalAddReporter.apply(this, arguments);
        };
        ["it", "fit", "xit", "describe", "fdescribe", "xdescribe"]
            .forEach(function (fn) { return addFocusedBrowsersParam(jasmineInterface, fn); });
        function addFocusedBrowsersParam(jasmineInterface, name) {
            var originalFn = jasmineInterface[name];
            jasmineInterface[name] = function () {
                var paramIndex = 2;
                var argsArray = externals_1._.toArray(arguments);
                if (argsArray.length <= paramIndex
                    || (!externals_1._.isString(argsArray[paramIndex]) && !externals_1._.isArray(argsArray[paramIndex]))) {
                    return originalFn.apply(this, argsArray);
                }
                var focusedBrowsersParam = argsArray.splice(paramIndex, 1)[0];
                var focusedBrowsers = externals_1._.isString(focusedBrowsersParam) ? [focusedBrowsersParam] : focusedBrowsersParam;
                var isFocused = focusedBrowsers.some(function (x) { return x === jasmineGlobal.currentBrowser; });
                if (externals_1._.startsWith(name, "x") || focusedBrowsers.length === 0 || isFocused) {
                    return originalFn.apply(this, argsArray);
                }
                var specOrSuite = originalFn.apply(this, argsArray);
                var specsOrSuitesToPend = [specOrSuite];
                if (externals_1._.endsWith(name, "describe")) {
                    var children = specOrSuite.getAllChildren();
                    specsOrSuitesToPend = externals_1._.concat(specsOrSuitesToPend, children);
                }
                specsOrSuitesToPend.forEach(function (x) { return x.pend("Disabled for the current browser."); });
                return specOrSuite;
            };
        }
        ["it", "fit", "xit", "beforeEach", "afterEach", "beforeAll", "afterAll"]
            .forEach(function (fn) { return addPromiseSupport(jasmineInterface, fn); });
        function addPromiseSupport(jasmineInterface, name) {
            var originalFn = jasmineInterface[name];
            jasmineInterface[name] = function () {
                var oldActionIndex = externals_1._.findIndex(arguments, function (fn) { return externals_1._.isFunction(fn); });
                if (oldActionIndex < 0) {
                    return originalFn.apply(this, arguments);
                }
                var oldAction = arguments[oldActionIndex];
                if (oldAction.length > 0) {
                    return originalFn.apply(this, arguments);
                }
                arguments[oldActionIndex] = externals_1._.extend(function (done) {
                    try {
                        var result = oldAction.call(this);
                        if (externals_1.Q.isPromise(result) || result && result.then && result.then.length === 2) {
                            result.then(done, fail);
                        }
                        else {
                            done();
                        }
                    }
                    catch (error) {
                        fail(error);
                    }
                    function fail(error) {
                        switch (name) {
                            case "beforeEach":
                            case "afterEach":
                                jasmineGlobal.currentSpec.onException(error);
                                done();
                                return;
                            case "beforeAll":
                            case "afterAll":
                                jasmineGlobal.currentSuite.onException(error);
                                done();
                                return;
                            default: return done.fail(error);
                        }
                    }
                }, oldAction);
                return originalFn.apply(this, arguments);
            };
        }
    }
})(JasmineEx || (JasmineEx = {}));
var jasmineRequire = JasmineEx.getJasmineRequireEx();
exports.JasmineRequire = jasmineRequire;
