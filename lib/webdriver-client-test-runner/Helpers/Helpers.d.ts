import { Q } from "../externals";
export declare module Helpers {
    function isAppveyor(): boolean;
    function logError(error: any): any;
    function isVSO(): boolean;
    function callInSequence(sequence: ((value?: any) => Promise<any>)[]): Promise<any>;
    function getFilesByGlob(glob: string[] | string, rootDir?: string): string[];
    function getJavaVersion(): Q.Promise<{}>;
    function getScreenResolution(): Q.Promise<{
        width: number;
        height: number;
    }>;
    function setScreenResolution(width: number, height: number): Q.Promise<boolean>;
    function removeBOMSymbol(content: string): string;
    function executePSCommands(commands: string[] | string): Q.Promise<PowerShellResult>;
    interface PowerShellResult {
        output: string[];
        errors: string[];
    }
}
