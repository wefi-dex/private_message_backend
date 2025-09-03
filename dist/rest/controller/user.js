"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getUserReports = exports.reportUser = exports.checkIfBlocked = exports.getBlockedUsers = exports.unblockUser = exports.blockUser = exports.getConnectedUsers = exports.getConnectionHistory = exports.respondToConnectionRequest = exports.getPendingConnectionRequests = exports.getUserByUsername = exports.getUserConnectionStatus = exports.createUserConnection = exports.checkUsernameDuplicate = exports.getAllUsers = exports.getUser = exports.updateUser = exports.deleteUser = exports.createUser = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const postgre_1 = __importDefault(require("../../util/postgre")); // PostgreSQL pool
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
// CREATE USER
exports.createUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    if (!body.password) {
        return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    const hashedPassword = yield bcrypt_1.default.hash(body.password, 10);
    const id = (0, uuid_1.v4)();
    // created_at will use DEFAULT NOW()
    const updated_at = new Date();
    const role = body.role === 'creator' ? 'creator' : 'fan';
    try {
        yield postgre_1.default.query(`INSERT INTO "User" (id, phone, username, password, role, bio, avatar, alias, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            id,
            body.phone || null,
            body.username || null,
            hashedPassword,
            role,
            body.bio || null,
            body.avatar || null,
            body.alias || null,
            updated_at
        ]);
        return res.status(200).json({ success: true, message: 'User is successfully created.', id, role, alias: body.alias });
    }
    catch (error) {
        console.error('Error while creating user:', error);
        return res.status(400).json({ success: false, message: 'Error while creating user.', error });
    }
}));
// DELETE USER
exports.deleteUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    try {
        yield postgre_1.default.query('DELETE FROM "User" WHERE id = $1', [userId]);
        return res.status(200).json({ success: true, message: 'User is successfully deleted.' });
    }
    catch (error) {
        return res.status(400).json({ success: false, error });
    }
}));
// UPDATE USER
exports.updateUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    const body = req.body;
    const updated_at = new Date();
    try {
        // First get the current user data
        const currentUserResult = yield postgre_1.default.query('SELECT * FROM "User" WHERE id = $1', [userId]);
        if (currentUserResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        const currentUser = currentUserResult.rows[0];
        // Merge current data with new data (partial update)
        const updatedUser = {
            phone: body.phone !== undefined ? body.phone : currentUser.phone,
            username: body.username !== undefined ? body.username : currentUser.username,
            bio: body.bio !== undefined ? body.bio : currentUser.bio,
            avatar: body.avatar !== undefined ? body.avatar : currentUser.avatar,
            role: body.role !== undefined ? (body.role === 'creator' ? 'creator' : 'fan') : currentUser.role,
            alias: body.alias !== undefined ? body.alias : currentUser.alias,
            updated_at
        };
        const result = yield postgre_1.default.query(`UPDATE "User" SET phone = $1, username = $2, bio = $3, avatar = $4, role = $5, alias = $6, updated_at = $7 WHERE id = $8 RETURNING *`, [
            updatedUser.phone,
            updatedUser.username,
            updatedUser.bio,
            updatedUser.avatar,
            updatedUser.role,
            updatedUser.alias,
            updatedUser.updated_at,
            userId
        ]);
        return res.status(200).json({ success: true, message: 'User is successfully updated', data: result.rows[0] });
    }
    catch (error) {
        return res.status(400).json({ success: false, error });
    }
}));
// GET USER
exports.getUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    try {
        const result = yield postgre_1.default.query('SELECT * FROM "User" WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        // avatar is now a string
        const user = result.rows[0];
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        return res.status(400).json({ success: false, error });
    }
}));
// GET ALL USERS
exports.getAllUsers = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield postgre_1.default.query('SELECT id, username, alias, bio, avatar, role, phone, created_at, updated_at FROM "User"');
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, error });
    }
}));
// CHECK USERNAME DUPLICATE
exports.checkUsernameDuplicate = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { username } = req.query;
    if (Array.isArray(username)) {
        username = username[0];
    }
    if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ available: false, message: 'Username is required' });
    }
    try {
        const result = yield postgre_1.default.query('SELECT id FROM "User" WHERE username = $1', [username]);
        return res.json({ available: result.rows.length === 0 });
    }
    catch (err) {
        console.error('DB error in checkUsernameDuplicate:', err);
        return res.status(500).json({ available: false, message: 'Database error', error: err });
    }
}));
// CREATE USER CONNECTION
exports.createUserConnection = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, target_user_id } = req.body;
    if (!user_id || !target_user_id) {
        return res.status(400).json({ success: false, message: 'user_id and target_user_id are required.' });
    }
    if (user_id === target_user_id) {
        return res.status(400).json({ success: false, message: 'Cannot connect to yourself.' });
    }
    try {
        const result = yield postgre_1.default.query(`INSERT INTO "UserConnection" (user_id, target_user_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (user_id, target_user_id) DO NOTHING RETURNING id`, [user_id, target_user_id]);
        // If a new connection was created, trigger Firebase update
        if (result.rows.length > 0) {
            try {
                const { db } = yield Promise.resolve().then(() => __importStar(require('../../utils/firebase')));
                const connectionRequestsRef = db.ref(`connectionRequests/${target_user_id}`);
                yield connectionRequestsRef.set({
                    timestamp: Date.now(),
                    from: user_id,
                    connectionId: result.rows[0].id
                });
            }
            catch (firebaseError) {
                console.error('Firebase update failed:', firebaseError);
                // Don't fail the request if Firebase update fails
            }
        }
        return res.status(200).json({ success: true, message: 'Connection request sent.' });
    }
    catch (error) {
        console.error('Error while creating user connection:', error);
        return res.status(400).json({ success: false, message: 'Error while creating connection.', error });
    }
}));
// GET USER CONNECTION STATUS
exports.getUserConnectionStatus = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, target_user_id } = req.query;
    if (!user_id || !target_user_id) {
        return res.status(400).json({ status: null, message: 'user_id and target_user_id are required.' });
    }
    try {
        const result = yield postgre_1.default.query('SELECT status, user_id, target_user_id FROM "UserConnection" WHERE (user_id = $1 AND target_user_id = $2) OR (user_id = $2 AND target_user_id = $1)', [user_id, target_user_id]);
        if (result.rows.length === 0) {
            return res.status(200).json({ status: null });
        }
        // Optionally, you can return who sent the request as well
        return res.status(200).json({ status: result.rows[0].status, user_id: result.rows[0].user_id, target_user_id: result.rows[0].target_user_id });
    }
    catch (error) {
        return res.status(400).json({ status: null, message: 'Failed to get connection status', error });
    }
}));
// GET USER BY USERNAME WITH CONNECTION STATUS
exports.getUserByUsername = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, user_id } = req.query;
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ success: false, message: 'username is required' });
    }
    try {
        const userResult = yield postgre_1.default.query('SELECT id, username, alias, bio, avatar, role, phone, created_at, updated_at FROM "User" WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userResult.rows[0];
        let connectionStatus = null;
        let connectionUserId = null;
        if (user_id && user.id !== user_id) {
            const connResult = yield postgre_1.default.query('SELECT status, user_id, target_user_id FROM "UserConnection" WHERE (user_id = $1 AND target_user_id = $2) OR (user_id = $2 AND target_user_id = $1)', [user_id, user.id]);
            if (connResult.rows.length > 0) {
                connectionStatus = connResult.rows[0].status;
                connectionUserId = connResult.rows[0].user_id;
            }
        }
        return res.status(200).json({ success: true, data: Object.assign(Object.assign({}, user), { connectionStatus, connectionUserId }) });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get user', error });
    }
}));
// GET PENDING CONNECTION REQUESTS FOR CREATOR
exports.getPendingConnectionRequests = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.params;
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT uc.id, uc.user_id, uc.target_user_id, uc.status, uc.created_at,
              u.username, u.alias, u.bio, u.avatar, u.role
       FROM "UserConnection" uc
       JOIN "User" u ON uc.user_id = u.id
       WHERE uc.target_user_id = $1 AND uc.status = 'pending'
       ORDER BY uc.created_at DESC`, [user_id]);
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get pending requests', error });
    }
}));
// ACCEPT OR REJECT CONNECTION REQUEST
exports.respondToConnectionRequest = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { connection_id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    if (!connection_id || !action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'connection_id and action (accept/reject) are required' });
    }
    try {
        // Get the connection details first
        const connectionResult = yield postgre_1.default.query('SELECT user_id, target_user_id FROM "UserConnection" WHERE id = $1', [connection_id]);
        if (connectionResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Connection request not found' });
        }
        const { user_id, target_user_id } = connectionResult.rows[0];
        if (action === 'accept') {
            yield postgre_1.default.query('UPDATE "UserConnection" SET status = $1 WHERE id = $2', ['accepted', connection_id]);
        }
        else {
            yield postgre_1.default.query('DELETE FROM "UserConnection" WHERE id = $1', [connection_id]);
        }
        // Trigger Firebase update for both users
        try {
            const { db } = yield Promise.resolve().then(() => __importStar(require('../../utils/firebase')));
            // Update for the creator (target_user_id)
            const creatorRef = db.ref(`connectionRequests/${target_user_id}`);
            yield creatorRef.set({
                timestamp: Date.now(),
                action: action,
                connectionId: connection_id,
                from: user_id
            });
            // Update for the fan (user_id) - they might want to know their request was processed
            const fanRef = db.ref(`connectionRequests/${user_id}`);
            yield fanRef.set({
                timestamp: Date.now(),
                action: action,
                connectionId: connection_id,
                to: target_user_id
            });
        }
        catch (firebaseError) {
            console.error('Firebase update failed:', firebaseError);
            // Don't fail the request if Firebase update fails
        }
        return res.status(200).json({
            success: true,
            message: `Connection request ${action}ed successfully`
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to respond to request', error });
    }
}));
// GET CONNECTION HISTORY FOR CREATOR
exports.getConnectionHistory = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.params;
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT uc.id, uc.user_id, uc.target_user_id, uc.status, uc.created_at, uc.updated_at,
              u.username, u.alias, u.bio, u.avatar, u.role
       FROM "UserConnection" uc
       JOIN "User" u ON uc.user_id = u.id
       WHERE uc.target_user_id = $1 AND uc.status IN ('accepted', 'rejected')
       ORDER BY uc.updated_at DESC`, [user_id]);
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get connection history', error });
    }
}));
// GET CONNECTED USERS FOR HOMEPAGE
exports.getConnectedUsers = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.params;
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT DISTINCT u.id, u.username, u.alias, u.bio, u.avatar, u.role, u.created_at, u.updated_at
       FROM "User" u
       INNER JOIN "UserConnection" uc ON (
         (uc.user_id = $1 AND uc.target_user_id = u.id) OR 
         (uc.target_user_id = $1 AND uc.user_id = u.id)
       )
       WHERE uc.status = 'accepted' 
         AND u.id != $1
         AND u.id NOT IN (
           SELECT blocked_id FROM "UserBlock" WHERE blocker_id = $1
         )
         AND u.id NOT IN (
           SELECT blocker_id FROM "UserBlock" WHERE blocked_id = $1
         )
       ORDER BY u.alias, u.username`, [user_id]);
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get connected users', error });
    }
}));
// BLOCK USER
exports.blockUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { blocker_id, blocked_id } = req.body;
    if (!blocker_id || !blocked_id) {
        return res.status(400).json({ success: false, message: 'blocker_id and blocked_id are required' });
    }
    if (blocker_id === blocked_id) {
        return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }
    try {
        // Check if user exists
        const userResult = yield postgre_1.default.query('SELECT id FROM "User" WHERE id = $1', [blocked_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User to block not found' });
        }
        // Insert block record
        yield postgre_1.default.query('INSERT INTO "UserBlock" (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT (blocker_id, blocked_id) DO NOTHING', [blocker_id, blocked_id]);
        return res.status(200).json({ success: true, message: 'User blocked successfully' });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to block user', error });
    }
}));
// UNBLOCK USER
exports.unblockUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { blocker_id, blocked_id } = req.body;
    if (!blocker_id || !blocked_id) {
        return res.status(400).json({ success: false, message: 'blocker_id and blocked_id are required' });
    }
    try {
        const result = yield postgre_1.default.query('DELETE FROM "UserBlock" WHERE blocker_id = $1 AND blocked_id = $2', [blocker_id, blocked_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Block record not found' });
        }
        return res.status(200).json({ success: true, message: 'User unblocked successfully' });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to unblock user', error });
    }
}));
// GET BLOCKED USERS
exports.getBlockedUsers = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.params;
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT ub.blocked_id, u.username, u.alias, u.bio, u.avatar, u.role, ub.created_at as blocked_at
       FROM "UserBlock" ub
       JOIN "User" u ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC`, [user_id]);
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get blocked users', error });
    }
}));
// CHECK IF USER IS BLOCKED
exports.checkIfBlocked = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, target_user_id } = req.query;
    if (!user_id || !target_user_id) {
        return res.status(400).json({ success: false, message: 'user_id and target_user_id are required' });
    }
    try {
        const result = yield postgre_1.default.query('SELECT * FROM "UserBlock" WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)', [user_id, target_user_id]);
        const isBlocked = result.rows.length > 0;
        const blockedByMe = result.rows.some(row => row.blocker_id === user_id);
        const blockedByThem = result.rows.some(row => row.blocker_id === target_user_id);
        return res.status(200).json({
            success: true,
            data: {
                isBlocked,
                blockedByMe,
                blockedByThem
            }
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to check block status', error });
    }
}));
// REPORT USER
exports.reportUser = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reporter_id, reported_id, reason, description } = req.body;
    if (!reporter_id || !reported_id || !reason) {
        return res.status(400).json({ success: false, message: 'reporter_id, reported_id, and reason are required' });
    }
    if (reporter_id === reported_id) {
        return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }
    try {
        // Check if user exists
        const userResult = yield postgre_1.default.query('SELECT id FROM "User" WHERE id = $1', [reported_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User to report not found' });
        }
        // Insert report record
        const result = yield postgre_1.default.query('INSERT INTO "UserReport" (reporter_id, reported_id, reason, description) VALUES ($1, $2, $3, $4) RETURNING id', [reporter_id, reported_id, reason, description || null]);
        return res.status(200).json({
            success: true,
            message: 'User reported successfully',
            reportId: result.rows[0].id
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to report user', error });
    }
}));
// GET USER REPORTS (for admin purposes)
exports.getUserReports = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.params;
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT ur.id, ur.reason, ur.description, ur.status, ur.created_at, ur.updated_at,
              u.username, u.alias, u.bio, u.avatar, u.role
       FROM "UserReport" ur
       JOIN "User" u ON ur.reported_id = u.id
       WHERE ur.reporter_id = $1
       ORDER BY ur.created_at DESC`, [user_id]);
        return res.status(200).json({ success: true, data: result.rows });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to get user reports', error });
    }
}));
