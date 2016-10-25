var gulp = require("gulp");
var runSequence = require("run-sequence");
var builder = require("tsconfig-extended-typescript-builder");

var runnerTsConfigPath = __dirname + "/src/webdriver-client-test-runner/tsconfig.json";

gulp.task("build", () => {
    return builder.build(runnerTsConfigPath);
});

gulp.task("clean", () => {
    return builder.clean(runnerTsConfigPath);
});

gulp.task("clean-build", () => {
    return runSequence("clean", "build");
});