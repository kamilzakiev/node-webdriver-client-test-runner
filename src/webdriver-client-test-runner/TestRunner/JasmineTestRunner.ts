import {_, Q, Path, Globule, Chalk} from "../externals";
import {Helpers, JasmineRequire} from "../exports";

export module JasmineTestRunner {
    export function init() {
        let jasmine = JasmineRequire.core(JasmineRequire);
        let jasmineInterface = JasmineRequire.interface(jasmine, jasmine.getEnv());
        for (let property in jasmineInterface) {
            global[property] = jasmineInterface[property];
        }
    }

    export function loadRunnables<T>(
        files: string[],
        values: T[],
        getName: (value: T) => string,
        onAddSuites: (value: T, onAddSuites: () => void)  => void) {

        let result: jasmine.Suite[] = [];
        for(let value of values) {
            let suite: jasmine.Suite = <any>describe(getName(value), () => {
                onAddSuites(value, () => {
                    files.forEach(require);

                    //We have to remove all required specs from the require.cache
                    //to get the ability to add all suites again.
                    files.forEach(file => { delete require.cache[require.resolve(file)]; }); 
                });
            });

            result.push(suite);
        }

        return result;
    }

    export function execute(runnablesToRun?: jasmine.Suite | jasmine.Suite[]) {
        let runnablesIdToRun: string[] = runnablesToRun
            ? _.isArray(runnablesToRun) ?  runnablesToRun.map(x => x.id) : [runnablesToRun.id]
            : undefined;

        let defer = Q.defer();
        jasmine.getEnv().addReporter({
            jasmineDone: (value) => {
                setTimeout(() => {
                    if(value.failedExpectations.length > 0){
                        defer.reject(value);
                    } else {
                        defer.resolve(value);
                    }
                }, 1);
            }
        });

        jasmine.getEnv().execute(runnablesIdToRun);
        return defer.promise;
    }
}