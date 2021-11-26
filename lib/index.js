"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const inversify_express_utils_1 = require("inversify-express-utils");
const inversify_1 = require("inversify");
let DefaultServer = class DefaultServer {
    constructor(configuration) {
        this.initialise(configuration);
    }
    startServer() {
        const app = this.server.build();
        app.listen(app.get('port'), () => app.get('logger').info('API running', { port: app.get('port') }));
    }
    initialise({ api, logging, container, tokenValidation, publicDir = path_1.default.join(__dirname, '/public'), }) {
        this.server = new inversify_express_utils_1.InversifyExpressServer(container, null, {
            rootPath: api.root
        });
        this.server.setConfig(app => {
            app.set('port', api.port);
            app.set('logger', logging.logger);
            app.disable('x-powered-by');
            app.use(helmet_1.default({
                frameguard: {
                    action: 'deny'
                },
                contentSecurityPolicy: {
                    useDefaults: true,
                    directives: {
                        'script-src': [
                            "'self'",
                            "'unsafe-eval'",
                            "'unsafe-inline'"
                        ],
                        'script-src-attr': null
                    }
                }
            }));
            app.use((req, res, next) => {
                res.setHeader('Cache-Control', 'no-store, must-revalidate, max-age=0');
                res.setHeader('X-XSS-Protection', '1; mode=block');
                next();
            });
            app.use(cors_1.default());
            app.use(compression_1.default());
            app.use(express_1.default.json({ limit: '50mb' }));
            app.use(morgan_1.default(this.mapLevelToMorganFormat(logging.logLevel)));
            app.use(express_1.default.static(publicDir));
            app.use(api.root + api.docPath + api.version, swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(undefined, {
                swaggerUrl: api.root + api.version
            }));
            if (tokenValidation) {
                const { validator, jwtSecret } = tokenValidation;
                app.use(api.root + api.version + '/*', validator(api.root + api.version, jwtSecret));
            }
        });
        this.server.setErrorConfig(app => {
            app.use((err, req, res, next) => {
                if (err.status === 401) {
                    app.get('logger').warn(`Log caused error with status 401. error=${err}`);
                    res.status(401)
                        .send({
                        code: -1,
                        message: err.message
                    })
                        .end();
                }
            });
            app.get('*', (req, res) => {
                res.sendFile(path_1.default.join(publicDir + '/index.html'));
            });
        });
    }
    mapLevelToMorganFormat(level) {
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
};
DefaultServer = __decorate([
    inversify_1.injectable(),
    __metadata("design:paramtypes", [Object])
], DefaultServer);
const createServer = function (configuration) {
    return new DefaultServer(configuration);
};
exports.createServer = createServer;
//# sourceMappingURL=index.js.map