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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectRole = exports.completeCreatorProfile = exports.resetPassword = exports.verifyPasswordResetCode = exports.requestPasswordReset = exports.login = exports.resendVerificationCode = exports.verifyEmail = exports.register = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const postgre_1 = __importDefault(require("../../util/postgre"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../../config");
const emailService_1 = require("../../util/emailService");
const verificationUtils_1 = require("../../util/verificationUtils");
const uuid_1 = require("uuid");
exports.register = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, email, bio = '', avatar = '', alias = '', } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({
            message: 'Username, password, and email are required.',
        });
    }
    // Validate email format
    if (!(0, verificationUtils_1.validateEmail)(email)) {
        return res
            .status(400)
            .json({ message: 'Please provide a valid email address.' });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Check if email already exists (for re-registration logic)
    const existingEmailResult = yield postgre_1.default.query('SELECT id, email_verified, username FROM "User" WHERE email = $1', [sanitizedEmail]);
    // Check if username already exists (excluding current user if re-registering)
    let existingUserResult;
    if (existingEmailResult.rows.length > 0 &&
        !existingEmailResult.rows[0].email_verified) {
        // Re-registration case: exclude the current user from username check
        existingUserResult = yield postgre_1.default.query('SELECT id FROM "User" WHERE username = $1 AND id != $2', [username, existingEmailResult.rows[0].id]);
    }
    else {
        // New registration case: check all usernames
        existingUserResult = yield postgre_1.default.query('SELECT id FROM "User" WHERE username = $1', [username]);
    }
    if (existingUserResult.rows.length > 0) {
        return res
            .status(400)
            .json({ message: 'Username already exists.' });
    }
    // Check if email is already verified (for re-registration logic)
    if (existingEmailResult.rows.length > 0) {
        const existingUser = existingEmailResult.rows[0];
        // If email is already verified, prevent re-registration
        if (existingUser.email_verified) {
            return res
                .status(400)
                .json({ message: 'Email already registered and verified.' });
        }
        // If email exists but not verified, return special response to show verification UI
        return res.status(409).json({
            message: 'Email already registered but not verified. Please verify your email first.',
            needsVerification: true,
            email: sanitizedEmail,
            existingUsername: existingUser.username,
            errorType: 'email_not_verified',
        });
    }
    // Hash password
    const saltRounds = 10;
    const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
    // Generate verification code
    const verificationCode = (0, verificationUtils_1.generateVerificationCode)();
    const expiresAt = (0, verificationUtils_1.getExpirationTime)(15); // 15 minutes
    let user;
    if (existingEmailResult.rows.length > 0) {
        // Re-registration: Update existing unverified user
        const existingUser = existingEmailResult.rows[0];
        const result = yield postgre_1.default.query(`UPDATE "User"
       SET username = $1, password = $2, bio = $3, avatar = $4, alias = $5, verification_code = $6, verification_code_expires = $7, email_verified = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id, username, email, bio, avatar, alias, email_verified, created_at`, [
            username,
            hashedPassword,
            bio,
            avatar,
            alias,
            verificationCode,
            expiresAt,
            false,
            existingUser.id,
        ]);
        user = result.rows[0];
    }
    else {
        // New registration: Create new user
        const userId = (0, uuid_1.v4)();
        const result = yield postgre_1.default.query(`INSERT INTO "User" (id, username, password, email, bio, avatar, alias, verification_code, verification_code_expires, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id, username, email, bio, avatar, alias, email_verified, created_at`, [
            userId,
            username,
            hashedPassword,
            sanitizedEmail,
            bio,
            avatar,
            alias,
            verificationCode,
            expiresAt,
            false,
        ]);
        user = result.rows[0];
    }
    // Send verification email
    const emailSent = yield emailService_1.emailService.sendVerificationEmail(sanitizedEmail, username, verificationCode);
    if (!emailSent) {
        // If email fails, still create user but notify about email issue
        console.warn(`Failed to send verification email to ${sanitizedEmail}`);
    }
    const isReRegistration = existingEmailResult.rows.length > 0;
    const message = isReRegistration
        ? 'Account updated successfully. Please check your email for the new verification code.'
        : 'Registration successful. Please check your email for verification code.';
    res.status(201).json({
        message,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            alias: user.alias,
            email_verified: user.email_verified,
        },
        emailSent,
        isReRegistration,
    });
}));
exports.verifyEmail = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode) {
        return res.status(400).json({
            message: 'Email and verification code are required.',
        });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Find user by email
    const userResult = yield postgre_1.default.query('SELECT id, username, verification_code, verification_code_expires, email_verified FROM "User" WHERE email = $1', [sanitizedEmail]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // Check if already verified
    if (user.email_verified) {
        return res
            .status(400)
            .json({ message: 'Email is already verified.' });
    }
    // Check if verification code matches
    if (user.verification_code !== verificationCode) {
        return res
            .status(400)
            .json({ message: 'Invalid verification code.' });
    }
    // Check if verification code is expired
    if ((0, verificationUtils_1.isVerificationCodeExpired)(user.verification_code_expires)) {
        return res.status(400).json({
            message: 'Verification code has expired. Please request a new one.',
        });
    }
    // Mark email as verified and clear verification code
    yield postgre_1.default.query('UPDATE "User" SET email_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = NOW() WHERE id = $1', [user.id]);
    res.status(200).json({
        message: 'Email verified successfully! You can now log in.',
        user: {
            id: user.id,
            username: user.username,
            email: sanitizedEmail,
            email_verified: true,
        },
    });
}));
exports.resendVerificationCode = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Find user by email
    const userResult = yield postgre_1.default.query('SELECT id, username, email_verified FROM "User" WHERE email = $1', [sanitizedEmail]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // Check if already verified
    if (user.email_verified) {
        return res
            .status(400)
            .json({ message: 'Email is already verified.' });
    }
    // Generate new verification code
    const verificationCode = (0, verificationUtils_1.generateVerificationCode)();
    const expiresAt = (0, verificationUtils_1.getExpirationTime)(15); // 15 minutes
    // Update verification code
    yield postgre_1.default.query('UPDATE "User" SET verification_code = $1, verification_code_expires = $2, updated_at = NOW() WHERE id = $3', [verificationCode, expiresAt, user.id]);
    // Send new verification email
    const emailSent = yield emailService_1.emailService.sendVerificationEmail(sanitizedEmail, user.username, verificationCode);
    if (!emailSent) {
        console.warn(`Failed to send verification email to ${sanitizedEmail}`);
    }
    res.status(200).json({
        message: 'New verification code sent to your email.',
        emailSent,
    });
}));
exports.login = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    if (!password) {
        return res
            .status(400)
            .json({ message: 'Password is required.' });
    }
    if (!username && !email) {
        return res
            .status(400)
            .json({ message: 'Username or email is required.' });
    }
    // Determine if input is username or email
    const isEmail = email || (username && username.includes('@'));
    const identifier = email || username;
    let userResult;
    if (isEmail) {
        // Search by email
        userResult = yield postgre_1.default.query('SELECT * FROM "User" WHERE email = $1', [
            identifier,
        ]);
    }
    else {
        // Search by username
        userResult = yield postgre_1.default.query('SELECT * FROM "User" WHERE username = $1', [
            identifier,
        ]);
    }
    if (userResult.rows.length === 0) {
        return res.status(401).json({
            message: 'Invalid username or password.',
            errorType: 'invalid_credentials',
        });
    }
    const user = userResult.rows[0];
    // Check if user is banned
    if (user.banned) {
        return res.status(403).json({
            message: 'Your account has been banned. Please contact support for more information.',
        });
    }
    // Check if email is verified
    if (!user.email_verified) {
        return res.status(403).json({
            message: 'Please verify your email address before logging in. Check your email for the verification code.',
            needsVerification: true,
            email: user.email,
            errorType: 'email_not_verified',
        });
    }
    const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({
            message: 'Invalid username or password.',
            errorType: 'invalid_credentials',
        });
    }
    // Check if user needs to complete profile (for creators)
    if (user.role === 'creator' && !user.creator_profile_completed) {
        const secretKey = config_1.config.jwt.secret;
        const options = { expiresIn: '24h' }; // Extended to 24 hours
        const payload = { id: user.id, username: user.username };
        const token = jsonwebtoken_1.default.sign(payload, secretKey, options);
        const userWithoutPassword = __rest(user, []);
        return res.status(200).json({
            message: 'Login successful. Please complete your creator profile.',
            token,
            user: userWithoutPassword,
            needsProfileCompletion: true,
            profileCompletionType: 'creator',
        });
    }
    // Check if user needs to select role (for users without role)
    if (!user.role) {
        const secretKey = config_1.config.jwt.secret;
        const options = { expiresIn: '24h' }; // Extended to 24 hours
        const payload = { id: user.id, username: user.username };
        const token = jsonwebtoken_1.default.sign(payload, secretKey, options);
        const userWithoutPassword = __rest(user, []);
        return res.status(200).json({
            message: 'Login successful. Please select your role.',
            token,
            user: userWithoutPassword,
            needsRoleSelection: true,
        });
    }
    const secretKey = config_1.config.jwt.secret;
    const options = { expiresIn: '24h' }; // Extended to 24 hours for better user experience
    const payload = { id: user.id, username: user.username };
    const token = jsonwebtoken_1.default.sign(payload, secretKey, options);
    // Exclude password and pass avatar as string
    const userWithoutPassword = __rest(user
    // avatar is now a string (URL or null)
    , []);
    // avatar is now a string (URL or null)
    res.status(200).json({ token, user: userWithoutPassword });
}));
exports.requestPasswordReset = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Find user by email
    const userResult = yield postgre_1.default.query('SELECT id, username, email_verified FROM "User" WHERE email = $1', [sanitizedEmail]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // Check if email is verified
    if (!user.email_verified) {
        return res.status(400).json({
            message: 'Please verify your email address first.',
        });
    }
    // Generate reset code
    const resetCode = (0, verificationUtils_1.generateVerificationCode)();
    const expiresAt = (0, verificationUtils_1.getExpirationTime)(15); // 15 minutes
    // Update user with reset code
    yield postgre_1.default.query('UPDATE "User" SET password_reset_code = $1, password_reset_expires = $2, updated_at = NOW() WHERE id = $3', [resetCode, expiresAt, user.id]);
    // Send password reset email
    const emailSent = yield emailService_1.emailService.sendPasswordResetEmail(sanitizedEmail, user.username, resetCode);
    if (!emailSent) {
        console.warn(`Failed to send password reset email to ${sanitizedEmail}`);
        return res
            .status(500)
            .json({ message: 'Failed to send password reset email.' });
    }
    res.status(200).json({
        message: 'Password reset code sent to your email.',
        emailSent,
    });
}));
exports.verifyPasswordResetCode = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, resetCode } = req.body;
    if (!email || !resetCode) {
        return res.status(400).json({
            message: 'Email and reset code are required.',
        });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Find user by email
    const userResult = yield postgre_1.default.query('SELECT id, username, password_reset_code, password_reset_expires FROM "User" WHERE email = $1', [sanitizedEmail]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // Check if reset code matches
    if (user.password_reset_code !== resetCode) {
        return res
            .status(400)
            .json({ message: 'Invalid reset code.' });
    }
    // Check if reset code is expired
    if ((0, verificationUtils_1.isVerificationCodeExpired)(user.password_reset_expires)) {
        return res.status(400).json({
            message: 'Reset code has expired. Please request a new one.',
        });
    }
    res.status(200).json({
        message: 'Reset code verified successfully.',
        verified: true,
    });
}));
exports.resetPassword = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
        return res.status(400).json({
            message: 'Email, reset code, and new password are required.',
        });
    }
    const sanitizedEmail = (0, verificationUtils_1.sanitizeEmail)(email);
    // Find user by email
    const userResult = yield postgre_1.default.query('SELECT id, username, password_reset_code, password_reset_expires FROM "User" WHERE email = $1', [sanitizedEmail]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // Check if reset code matches
    if (user.password_reset_code !== resetCode) {
        return res
            .status(400)
            .json({ message: 'Invalid reset code.' });
    }
    // Check if reset code is expired
    if ((0, verificationUtils_1.isVerificationCodeExpired)(user.password_reset_expires)) {
        return res.status(400).json({
            message: 'Reset code has expired. Please request a new one.',
        });
    }
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = yield bcrypt_1.default.hash(newPassword, saltRounds);
    // Update password and clear reset code
    yield postgre_1.default.query('UPDATE "User" SET password = $1, password_reset_code = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $2', [hashedPassword, user.id]);
    res.status(200).json({
        message: 'Password reset successfully. You can now login with your new password.',
    });
}));
exports.completeCreatorProfile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, displayName, bio, avatar, externalLinks } = req.body;
    if (!username || !displayName || !bio) {
        return res.status(400).json({
            message: 'Username, display name, and bio are required.',
        });
    }
    // Find the user
    const userResult = yield postgre_1.default.query('SELECT id, role, email_verified FROM "User" WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({
            message: 'User not found.',
        });
    }
    const user = userResult.rows[0];
    // Check if user is a creator
    if (user.role !== 'creator') {
        return res.status(400).json({
            message: 'Only creators can complete creator profiles.',
        });
    }
    // Check if email is verified
    if (!user.email_verified) {
        return res.status(400).json({
            message: 'Email must be verified before completing creator profile.',
        });
    }
    // Update user with creator profile information
    const result = yield postgre_1.default.query(`UPDATE "User"
       SET alias = $1, bio = $2, avatar = $3, external_link = $4, creator_profile_completed = TRUE, updated_at = NOW()
       WHERE id = $5
       RETURNING id, username, alias, bio, avatar, external_link, creator_profile_completed`, [displayName, bio, avatar || '', externalLinks || '', user.id]);
    const updatedUser = result.rows[0];
    res.status(200).json({
        message: 'Creator profile completed successfully. Your account is pending admin approval.',
        user: {
            id: updatedUser.id,
            username: updatedUser.username,
            displayName: updatedUser.alias,
            bio: updatedUser.bio,
            avatar: updatedUser.avatar,
            externalLink: updatedUser.external_link || '',
            creatorProfileCompleted: updatedUser.creator_profile_completed,
        },
    });
}));
exports.selectRole = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, role } = req.body;
    if (!username || !role) {
        return res.status(400).json({
            message: 'Username and role are required.',
        });
    }
    // Validate role
    if (!['fan', 'creator'].includes(role)) {
        return res.status(400).json({
            message: 'Role must be either "fan" or "creator".',
        });
    }
    // Find the user
    const userResult = yield postgre_1.default.query('SELECT id, email_verified FROM "User" WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({
            message: 'User not found.',
        });
    }
    const user = userResult.rows[0];
    // Check if email is verified
    if (!user.email_verified) {
        return res.status(400).json({
            message: 'Email must be verified before selecting role.',
        });
    }
    // Update user role
    const result = yield postgre_1.default.query(`UPDATE "User"
     SET role = $1, creator_approved = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, username, role, creator_approved`, [
        role,
        role === 'creator' ? false : true, // Creators need approval, fans are auto-approved
        user.id,
    ]);
    const updatedUser = result.rows[0];
    const message = role === 'creator'
        ? 'Role selected successfully. Please complete your creator profile.'
        : 'Role selected successfully. You can now use the app.';
    res.status(200).json({
        message,
        user: {
            id: updatedUser.id,
            username: updatedUser.username,
            role: updatedUser.role,
            creatorApproved: updatedUser.creator_approved,
        },
    });
}));
