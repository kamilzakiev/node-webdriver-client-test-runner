"use strict";
var exports_1 = require("./exports");
module.exports.run = function (args) {
    exports_1.TestRunner.run(exports_1.TestRunner.getCommandLineOptions()).then(function () {
        console.log('Done');
        process.exit(0);
    }, function () {
        console.log('Done');
        process.exit(-1);
    });
};
