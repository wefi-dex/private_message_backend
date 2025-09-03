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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const userAuthMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Allow unauthenticated access to authentication endpoints, public file downloads, and subscription plans
    if (req.path.startsWith('/auth') ||
        (req.path === '/user' && req.method === 'POST') ||
        (req.path === '/check-username' && req.method === 'GET') ||
        req.path.startsWith('/files') || // Public file downloads only
        req.path === '/subscription-plans' // Public subscription plans
    ) {
        return next();
    }
    const authHeader = req.headers['authorization'];
    let token = undefined;
    if (authHeader) {
        // Accept both 'Bearer <token>' and just '<token>'
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
        else {
            token = authHeader;
        }
    }
    if (!token) {
        return res.status(403).json({ message: 'Token is required' });
    }
    jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
});
exports.default = userAuthMiddleware;
