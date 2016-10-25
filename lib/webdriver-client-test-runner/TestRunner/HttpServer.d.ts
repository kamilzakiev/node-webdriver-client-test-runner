export declare module HttpServer {
    function getUrl(path: string): string;
    function start(port?: number): void;
    function stop(): void;
}
