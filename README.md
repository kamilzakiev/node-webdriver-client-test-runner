# webdriver-client-test-runner
Test runner for visual regression testing and not only.

##Installation
Ensure that a selenium/browser WebDriver is started.
Install the NPM package:
```sh
npm install webdriver-client-test-runner@https://github.com/DenisKudelin/webdriver-client-test-runner.git
```
An example repository using webdriver-client-test-runner can be found [here.](https://github.com/DenisKudelin/powerbi-visuals-image-comparison-tests)

##Configuration
The configuration file contains all necessary information to run your test suite. Here is an example configuration with all supported properties:
```js
// All patterns or paths are relative to the directory where the config file resides.
module.exports = {

    // Jasmine configuration.
    jasmine: {
        defaultTimeoutInterval: 30000
    },

	// [REQUIRED] Patterns of test files to run.
    specs: [
        "./lib/tests/**/*Tests.js",
    ],

	// [REQUIRED] Browser list to run tests. All specs will be launched for each browser.
    capabilities: [{
        browserName: "chrome"
    }/*,{
       browserName: "chromium", // we also can use "chromium" as the browser name, but a path to chrome.exe should be defined.
       chromeOptions: {
           binary: "path to chrome.exe",
       }
    },{
        browserName: "firefox" // is not supported yet
    },{
        browserName: "internet explorer" // is not supported yet
    }*/],

	// Url or path to a html file that will be opened before all specs are started. If not defined, the blank page will be used.
	defaultTestPageUrl: "https://www.microsoft.com",

	// Urls or patterns to *.css/*.js files that will be inserted to the start page as link or script blocks. Can be used only for local pages.
    files: [
        "../Externals/JQuery/jquery.js",
    ],

	// Patterns to *.js files that will be evaluated on the start page.
    execFiles: [
        "../helpers/**.js",
    ],

	// Webdrivercss configuration. (These are the default settings)
    webdrivercss: {
        screenshotRoot: "screenshots/", // The path to save original screenshots
        failedComparisonsRoot: "screenshots/failedComparisons", // The path to save differences from original screenshots
        misMatchTolerance: 0, // Number between 0 and 100 that defines the degree of mismatch to consider two images as identical, increasing this value will decrease test coverage.
        gmOptions: { // Graphics Magick options
            appPath: require("graphics-magick-binaries").getGMBinariesPathForCurrentSystem() // Path to the Graphics Magick binaries
        }
    },
}
```

##Writing tests
To write tests we use Jasmine test framework. To access the browser functions we use the global variable "browser".
Here is an example test:
```js
describe("Microsoft", () => {
    it("pagebodyTest", () => {
        // Tests run in NodeJS context
        // Use "browser.execute" (http://webdriver.io/api/protocol/execute.html) to run code in browser context
        return browser
            // Statement below creates a screenshot and performs verification
            .assertAreaScreenshotMatch({ 
                name: "pagebody", // By default, this will be mapped to ./screenshots/originals/chrome/Microsoft/pagebodyTest.pagebody.1920px.baseline.png
                elem: "div.row-fluid pagebody"
            }/*,[Browser.Chrome]*/); // We are able to spcify a list with focused browsers to
                                     // jasmine spec or description and it will be available only for these browsers
    });
});
```

##Usage

#### Using exposed NodeJS Api
For example, we can use the gulp to run our tests:
```js
var gulp = require("gulp");
var webdriverClientTestRunner = require("webdriver-client-test-runner");

gulp.task("run", () => {
    return webdriverClientTestRunner.TestRunner.run({
            config: "./config.js"  // Path to our config file.
        }), webdriverClientTestRunner.Helpers.logError)
        .then(() => process.exit(0), (ex) => process.exit(1));
});
```
Now we can run our tests:
```sh
gulp run
```

#### From command line
```sh
webdriver-client-test-runner <path-to-config-file>
```
