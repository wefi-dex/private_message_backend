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
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: config_1.config.email.host,
            port: config_1.config.email.port,
            secure: config_1.config.email.secure,
            auth: {
                user: config_1.config.email.user,
                pass: config_1.config.email.password,
            },
        });
    }
    sendEmail(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(options.to)) {
                    console.error('Invalid email format:', options.to);
                    return false;
                }
                const mailOptions = {
                    from: config_1.config.email.from,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                };
                yield this.transporter.sendMail(mailOptions);
                return true;
            }
            catch (error) {
                console.error('Email sending failed:', error);
                return false;
            }
        });
    }
    sendVerificationEmail(email, username, verificationCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = 'Verify Your Email - Private Message App';
            const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Private Message!</h2>
        <p>Hi ${username},</p>
        <p>Thank you for registering with Private Message. Please verify your email address by entering the verification code below:</p>

        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
        </div>

        <p><strong>This code will expire in 15 minutes.</strong></p>

        <p>If you didn't create an account with Private Message, please ignore this email.</p>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from Private Message. Please do not reply to this email.
        </p>
      </div>
    `;
            const text = `
      Welcome to Private Message!

      Hi ${username},

      Thank you for registering with Private Message. Please verify your email address by entering the verification code below:

      Verification Code: ${verificationCode}

      This code will expire in 15 minutes.

      If you didn't create an account with Private Message, please ignore this email.
    `;
            return this.sendEmail({
                to: email,
                subject,
                html,
                text,
            });
        });
    }
    sendPasswordResetEmail(email, username, resetCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = 'Password Reset - Private Message App';
            const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Use the code below to reset your password:</p>

        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #dc3545; font-size: 32px; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
        </div>

        <p><strong>This code will expire in 15 minutes.</strong></p>

        <p>If you didn't request a password reset, please ignore this email.</p>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from Private Message. Please do not reply to this email.
        </p>
      </div>
    `;
            return this.sendEmail({
                to: email,
                subject,
                html,
            });
        });
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
