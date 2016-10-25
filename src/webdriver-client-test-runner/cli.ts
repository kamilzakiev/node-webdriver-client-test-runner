import {TestRunner} from "./exports";

module.exports.run = function (args: string[]) {

    TestRunner.run(TestRunner.getCommandLineOptions()).then(
        () => {
            console.log('Done');
            process.exit(0);
        },
        () => {
            console.log('Done');
            process.exit(-1);
        });

}

