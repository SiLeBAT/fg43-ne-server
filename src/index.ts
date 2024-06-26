
import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { InversifyExpressServer } from 'inversify-express-utils';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

// local
import { injectable } from 'inversify';

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
    }
    tokenValidation?: {
        validator: Function,
        jwtSecret: string;
    },
    logging: {
        logger: ServerLogger,
        logLevel: string;
    },
    container: any,
    publicDir?: string,
    contentSecurityPolicyDirectives?: Record<string, null | Iterable<string>>,
    customApp?: Application
}
interface ServerFactory {
    (configuration: ServerConfiguration): Server
}

@injectable()
class DefaultServer implements Server {
    private server: InversifyExpressServer;

    constructor(configuration: ServerConfiguration) {
        this.initialise(configuration);
    }

    startServer() {
        const app = this.server.build();
        app.listen(app.get('port'), () =>
            app.get('logger').info('API running', { port: app.get('port') })
        );
    }

    private initialise(
        {
            api,
            logging,
            container,
            tokenValidation,
            publicDir = path.join(__dirname, '/public'),
            contentSecurityPolicyDirectives = {},
            customApp

        }: ServerConfiguration) {


        this.server = new InversifyExpressServer(container, null, {
            rootPath: api.root
        }, customApp);

        this.server.setConfig(app => {
            app.set('port', api.port);
            app.set('logger', logging.logger);

            app.disable('x-powered-by');

            const scriptSources = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
            const styleSources = ["'self'", "'unsafe-inline'"];
            const connectSources = ["https://mibi-portal.bfr.bund.de/", "'self'"];

            // Common security headers
            app.use(
                helmet({
                    frameguard: {
                        action: 'deny'
                    },
                    contentSecurityPolicy: {
                        useDefaults: true,
                        directives: {
                            ...contentSecurityPolicyDirectives,
                            defaultSrc: ["'self'"],
                            scriptSrc: scriptSources,
                            scriptSrcElem: scriptSources,
                            styleSrc: styleSources,
                            connectSrc: connectSources,
                            'script-src-attr': null, // not supported by firefox
                        }
                    }
                })
            );

            app.use((req, res, next) => {
                res.setHeader(
                    'Cache-Control',
                    'no-store, must-revalidate, max-age=0'
                );
                // deprecated (helmet sets it to "0")
                res.setHeader('X-XSS-Protection', '1; mode=block');
                next();
            });

            app.use(cors());

            app.use(compression());
            app.use(express.json({ limit: '50mb' }));

            app.use(
                morgan(this.mapLevelToMorganFormat(logging.logLevel))
            );

            app.use(express.static(publicDir));

            app.use(
                api.root + api.docPath + api.version,
                swaggerUi.serve,
                swaggerUi.setup(undefined, {
                    swaggerUrl: api.root + api.version
                })
            );

            if (tokenValidation) {
                const { validator, jwtSecret } = tokenValidation;
                app.use(
                    api.root + api.version + '/*',
                    validator(
                        api.root + api.version,
                        jwtSecret
                    )
                );
            }

        });

        this.server.setErrorConfig(app => {
            app.use(
                (
                    // tslint:disable-next-line
                    err: any,
                    req: express.Request,
                    res: express.Response,
                    next: express.NextFunction
                ) => {
                    if (err.status === 401) {
                        app.get('logger').warn(
                            `Log caused error with status 401. error=${err}`
                        );
                        res.status(401)
                            .send({
                                code: 2,
                                message: err.message
                            })
                            .end();
                    }
                }
            );

            app.get('*', (req: express.Request, res: express.Response) => {
                res.sendFile(
                    path.join(publicDir + '/index.html')
                );
            });
        });
    }

    private mapLevelToMorganFormat(level: string): string {
        switch (level) {
            case 'trace':
                return 'dev';
            case 'info':
                return 'combined';
            case 'error':
                return 'combined';
            case 'verbose':
                return 'dev';
            case 'warn':
                return 'combined';
            case 'silly':
                return 'dev';
            case 'debug':
                return 'dev';
            default:
                return 'info';
        }
    }
}

const createServer: ServerFactory = function (configuration: ServerConfiguration): Server {
    return new DefaultServer(configuration);
}

export { Server, ServerConfiguration, ServerFactory, createServer };

