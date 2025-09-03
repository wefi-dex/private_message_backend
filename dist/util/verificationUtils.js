"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationCode = generateVerificationCode;
exports.generateSecureToken = generateSecureToken;
exports.isVerificationCodeExpired = isVerificationCodeExpired;
exports.getExpirationTime = getExpirationTime;
exports.validateEmail = validateEmail;
exports.sanitizeEmail = sanitizeEmail;
const crypto_1 = __importDefault(require("crypto"));
function generateVerificationCode() {
    // Generate a 6-digit numeric code
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function generateSecureToken() {
    // Generate a secure random token for password reset
    return crypto_1.default.randomBytes(32).toString('hex');
}
function isVerificationCodeExpired(expiresAt) {
    return new Date() > expiresAt;
}
function getExpirationTime(minutes = 15) {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
    return expirationTime;
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function sanitizeEmail(email) {
    return email.toLowerCase().trim();
}
