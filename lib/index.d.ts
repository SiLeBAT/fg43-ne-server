import { interfaces } from 'inversify';
interface ServerLogger {
}
interface Server {
    startServer(): void;
}
interface ServerConfiguration {
    api: {
        root: string;
        version: string;
        port: number;
        docPath: string;
    };
    tokenValidation?: {
        validator: Function;
        jwtSecret: string;
    };
    logging: {
        logger: ServerLogger;
        logLevel: string;
    };
    container: interfaces.Container;
    publicDir?: string;
    contentSecurityPolicyDirectives?: Record<string, null | Iterable<string>>;
}
interface ServerFactory {
    (configuration: ServerConfiguration): Server;
}
declare const createServer: ServerFactory;
export { createServer, ServerConfiguration, Server, ServerFactory };
