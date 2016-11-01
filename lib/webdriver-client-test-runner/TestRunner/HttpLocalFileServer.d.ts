export declare module HttpLocalFileServer {
    function getUrl(path: string): string;
    function start(port?: number): void;
    function isHttpLocalFileServerUrl(url: string): boolean;
    function stop(): void;
}
