declare function it(expectation: string, assertion?: () => void, focusedBrowsers?: Browser[] | Browser, timeout?: number): void;
declare function it(expectation: string, assertion?: (done: DoneFnEx) => void, focusedBrowsers?: Browser[] | Browser,  timeout?: number): void;
declare function xit(expectation: string, assertion?: () => void, focusedBrowsers?: Browser[] | Browser, timeout?: number): void;
declare function xit(expectation: string, assertion?: (done: DoneFnEx) => void, focusedBrowsers?: Browser[] | Browser,  timeout?: number): void;
declare function fit(expectation: string, assertion?: () => void, focusedBrowsers?: Browser[] | Browser, timeout?: number): void;
declare function fit(expectation: string, assertion?: (done: DoneFnEx) => void, focusedBrowsers?: Browser[] | Browser,  timeout?: number): void;

declare function describe(description: string, specDefinitions: () => void, focusedBrowsers?: Browser[] | Browser): void;
declare function fdescribe(description: string, specDefinitions: () => void, focusedBrowsers?: Browser[] | Browser): void;
declare function xdescribe(description: string, specDefinitions: () => void, focusedBrowsers?: Browser[] | Browser): void;

declare namespace jasmine {
    export const MAX_TIMEOUT: number;
    export let currentBrowser: Browser;
    export let currentSpec: jasmine.Spec;
    export let currentSuite: jasmine.Suite;
    export function beforeEachInitTestPage(url?: string): void;
    export function beforeAllInitTestPage(url?: string): void;
    export function afterEachCloseBrowser(): void;
    export function afterAllCloseBrowser(): void;

    interface Suite {
        getAllChildren(): SuiteOrSpec[];
    }
}

interface DoneFnEx extends Function {
    (): void;
    fail: (message?: Error|string) => void;
}