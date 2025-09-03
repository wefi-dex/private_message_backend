"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REST = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const route_1 = __importDefault(require("./route"));
const config_1 = require("../config");
const logger_1 = require("../util/logger");
const validAuth_1 = __importDefault(require("./middleware/validAuth"));
const postgre_1 = __importDefault(require("../util/postgre"));
class REST {
    constructor() {
        this.app = (0, express_1.default)();
        // Log every request
        this.app.use((req, res, next) => {
            next();
        });
        this.app.use((0, cors_1.default)({
            origin: config_1.config.cors.origin.split(',').map((origin) => origin.trim()),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Origin',
                'Accept',
                'Cache-Control',
                'X-File-Name',
            ],
            exposedHeaders: ['Content-Disposition'],
        }));
        this.app.use((0, helmet_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
        // Error handler for payload too large
        this.app.use((err, req, res, next) => {
            if (err.type === 'entity.too.large') {
                return res.status(413).json({
                    success: false,
                    message: 'Request payload too large. Please try with a smaller image or reduce image quality.',
                });
            }
            next(err);
        });
        // Public file download endpoint (no authentication required)
        this.app.get('/files/:filename', (req, res) => {
            const { filename } = req.params;
            const filePath = require('path').join(__dirname, '../../../uploads', filename);
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return res
                    .status(404)
                    .json({ success: false, message: 'File not found.' });
            }
            res.download(filePath, filename);
        });
        // Protected API routes (authentication required)
        this.app.use('/api', validAuth_1.default);
        this.app.use('/api', route_1.default);
        this.app.use('/api', (req, res) => {
            res.status(404).json({ success: false, message: 'Not found' });
        });
        this.app.get('/ping', (_req, res) => {
            res.send('pong');
        });
        // Debug endpoint to view all users (for development only)
        if (config_1.config.isDevelopment) {
            this.app.get('/debug/users', (_req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield postgre_1.default.query('SELECT id, username, email, alias, bio, avatar, role, created_at FROM "User" ORDER BY created_at DESC');
                    res.json({
                        success: true,
                        message: 'All users from database',
                        count: result.rows.length,
                        users: result.rows,
                    });
                }
                catch (error) {
                    console.error('Debug endpoint error:', error);
                    res.status(500).json({ success: false, message: 'Database error' });
                }
            }));
        }
        // Keep this for non-API routes
        this.app.use((_, res) => {
            res.status(404).send('Not found');
        });
        this.app.listen(config_1.config.port, '0.0.0.0', () => __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info(`API is running on port ${config_1.config.port} and accessible from all network interfaces`);
        }));
    }
}
exports.REST = REST;
