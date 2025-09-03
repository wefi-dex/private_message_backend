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
exports.approveCreator = exports.getPendingCreators = exports.getReportStats = exports.getUserStats = exports.getDashboardStats = exports.unbanUser = exports.banUser = exports.deleteUser = exports.deleteReport = exports.updateReportStatus = exports.getReport = exports.getAllReports = exports.getAllUsers = void 0;
const postgre_1 = __importDefault(require("../../util/postgre"));
const logger_1 = require("../../util/logger");
// Get all users for admin panel
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
             SELECT
               u.id,
               u.password,
               u.phone,
               u.username,
               u.bio,
               u.avatar,
               u.created_at,
               u.updated_at,
               u.role,
               u.alias,
               u.banned,
               u.email,
               u.email_verified,
               u.creator_approved,
               u.creator_approval_date,
               u.creator_approval_admin_id,
               u.creator_approval_notes,
               COUNT(DISTINCT ur.id) as reports_count,
               COUNT(DISTINCT ub.id) as blocks_count
             FROM "User" u
             LEFT JOIN "UserReport" ur ON u.id = ur.reported_id
             LEFT JOIN "UserBlock" ub ON u.id = ub.blocked_id
             GROUP BY u.id, u.password, u.phone, u.username, u.bio, u.avatar, u.created_at, u.updated_at, u.role, u.alias, u.banned, u.email, u.email_verified, u.creator_approved, u.creator_approval_date, u.creator_approval_admin_id, u.creator_approval_notes
             ORDER BY u.created_at DESC
           `;
        const result = yield postgre_1.default.query(query);
        const users = result.rows.map((row) => ({
            id: row.id,
            phone: row.phone,
            username: row.username,
            bio: row.bio,
            avatar: row.avatar,
            created_at: row.created_at,
            updated_at: row.updated_at,
            role: row.role,
            alias: row.alias,
            banned: row.banned,
            email: row.email,
            email_verified: row.email_verified,
            creator_approved: row.creator_approved,
            creator_approval_date: row.creator_approval_date,
            creator_approval_admin_id: row.creator_approval_admin_id,
            creator_approval_notes: row.creator_approval_notes,
            reports_count: parseInt(row.reports_count),
            blocks_count: parseInt(row.blocks_count),
            // Note: password is excluded from response for security
        }));
        res.json({ success: true, data: users });
    }
    catch (error) {
        logger_1.logger.error('Error getting all users:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getAllUsers = getAllUsers;
// Get all reports for admin panel
const getAllReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT
        ur.id,
        ur.reporter_id,
        ur.reported_id,
        ur.reason,
        ur.description,
        ur.status,
        ur.created_at,
        ur.updated_at,
        reporter.username as reporter_username,
        reported.username as reported_username
      FROM "UserReport" ur
      LEFT JOIN "User" reporter ON ur.reporter_id = reporter.id
      LEFT JOIN "User" reported ON ur.reported_id = reported.id
      ORDER BY ur.created_at DESC
    `;
        const result = yield postgre_1.default.query(query);
        const reports = result.rows.map((row) => ({
            id: row.id,
            reporter_id: row.reporter_id,
            reported_id: row.reported_id,
            reason: row.reason,
            description: row.description,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            reporter: {
                username: row.reporter_username,
            },
            reported: {
                username: row.reported_username,
            },
        }));
        res.json({ success: true, data: reports });
    }
    catch (error) {
        logger_1.logger.error('Error getting all reports:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getAllReports = getAllReports;
// Get specific report
const getReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const query = `
      SELECT
        ur.id,
        ur.reporter_id,
        ur.reported_id,
        ur.reason,
        ur.description,
        ur.status,
        ur.created_at,
        ur.updated_at,
        reporter.username as reporter_username,
        reported.username as reported_username
      FROM "UserReport" ur
      LEFT JOIN "User" reporter ON ur.reporter_id = reporter.id
      LEFT JOIN "User" reported ON ur.reported_id = reported.id
      WHERE ur.id = $1
    `;
        const result = yield postgre_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'Report not found' });
        }
        const report = result.rows[0];
        const formattedReport = {
            id: report.id,
            reporter_id: report.reporter_id,
            reported_id: report.reported_id,
            reason: report.reason,
            description: report.description,
            status: report.status,
            created_at: report.created_at,
            updated_at: report.updated_at,
            reporter: {
                username: report.reporter_username,
            },
            reported: {
                username: report.reported_username,
            },
        };
        res.json({ success: true, data: formattedReport });
    }
    catch (error) {
        logger_1.logger.error('Error getting report:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getReport = getReport;
// Update report status
const updateReportStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const query = `
      UPDATE "UserReport"
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
        const result = yield postgre_1.default.query(query, [status, id]);
        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'Report not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        logger_1.logger.error('Error updating report status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.updateReportStatus = updateReportStatus;
// Delete report
const deleteReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM "UserReport" WHERE id = $1 RETURNING *';
        const result = yield postgre_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'Report not found' });
        }
        res.json({ success: true, message: 'Report deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting report:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.deleteReport = deleteReport;
// Delete user (admin only)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First check if user exists
        const userCheckQuery = 'SELECT id, username FROM "User" WHERE id = $1';
        const userCheckResult = yield postgre_1.default.query(userCheckQuery, [id]);
        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Delete user (this will cascade to related records due to foreign key constraints)
        const deleteQuery = 'DELETE FROM "User" WHERE id = $1 RETURNING id, username';
        const result = yield postgre_1.default.query(deleteQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const deletedUser = result.rows[0];
        res.json({
            success: true,
            message: `User "${deletedUser.username}" deleted successfully`,
            data: { id: deletedUser.id, username: deletedUser.username },
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.deleteUser = deleteUser;
// Ban user (admin only)
const banUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First check if user exists
        const userCheckQuery = 'SELECT id, username, banned FROM "User" WHERE id = $1';
        const userCheckResult = yield postgre_1.default.query(userCheckQuery, [id]);
        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userCheckResult.rows[0];
        if (user.banned) {
            return res
                .status(400)
                .json({ success: false, message: 'User is already banned' });
        }
        // Ban the user
        const banQuery = 'UPDATE "User" SET banned = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, username';
        const result = yield postgre_1.default.query(banQuery, [id]);
        const bannedUser = result.rows[0];
        res.json({
            success: true,
            message: `User "${bannedUser.username}" has been banned successfully`,
            data: { id: bannedUser.id, username: bannedUser.username, banned: true },
        });
    }
    catch (error) {
        logger_1.logger.error('Error banning user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.banUser = banUser;
// Unban user (admin only)
const unbanUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First check if user exists
        const userCheckQuery = 'SELECT id, username, banned FROM "User" WHERE id = $1';
        const userCheckResult = yield postgre_1.default.query(userCheckQuery, [id]);
        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userCheckResult.rows[0];
        if (!user.banned) {
            return res
                .status(400)
                .json({ success: false, message: 'User is not banned' });
        }
        // Unban the user
        const unbanQuery = 'UPDATE "User" SET banned = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, username';
        const result = yield postgre_1.default.query(unbanQuery, [id]);
        const unbannedUser = result.rows[0];
        res.json({
            success: true,
            message: `User "${unbannedUser.username}" has been unbanned successfully`,
            data: {
                id: unbannedUser.id,
                username: unbannedUser.username,
                banned: false,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error unbanning user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.unbanUser = unbanUser;
// Get dashboard statistics
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get total users
        const usersQuery = 'SELECT COUNT(*) as total_users FROM "User"';
        const usersResult = yield postgre_1.default.query(usersQuery);
        // Get total reports
        const reportsQuery = 'SELECT COUNT(*) as total_reports FROM "UserReport"';
        const reportsResult = yield postgre_1.default.query(reportsQuery);
        // Get pending reports
        const pendingQuery = 'SELECT COUNT(*) as pending_reports FROM "UserReport" WHERE status = \'pending\'';
        const pendingResult = yield postgre_1.default.query(pendingQuery);
        // Get total blocks
        const blocksQuery = 'SELECT COUNT(*) as total_blocks FROM "UserBlock"';
        const blocksResult = yield postgre_1.default.query(blocksQuery);
        // Get banned users
        const bannedQuery = 'SELECT COUNT(*) as banned_users FROM "User" WHERE banned = TRUE';
        const bannedResult = yield postgre_1.default.query(bannedQuery);
        // Get user growth (from first user to current month)
        const growthQuery = `
      WITH user_months AS (
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as new_users
        FROM "User"
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      month_series AS (
        SELECT generate_series(
          (SELECT MIN(month) FROM user_months),
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) as month
      )
      SELECT
        ms.month,
        COALESCE(um.new_users, 0) as new_users
      FROM month_series ms
      LEFT JOIN user_months um ON ms.month = um.month
      ORDER BY ms.month
    `;
        const growthResult = yield postgre_1.default.query(growthQuery);
        // Get report types distribution
        const reportTypesQuery = `
      SELECT
        reason,
        COUNT(*) as count
      FROM "UserReport"
      GROUP BY reason
      ORDER BY count DESC
    `;
        const reportTypesResult = yield postgre_1.default.query(reportTypesQuery);
        const stats = {
            totalUsers: parseInt(usersResult.rows[0].total_users || '0'),
            totalReports: parseInt(reportsResult.rows[0].total_reports || '0'),
            pendingReports: parseInt(pendingResult.rows[0].pending_reports || '0'),
            totalBlocks: parseInt(blocksResult.rows[0].total_blocks || '0'),
            bannedUsers: parseInt(bannedResult.rows[0].banned_users || '0'),
            userGrowth: growthResult.rows,
            reportTypes: reportTypesResult.rows,
        };
        res.json({ success: true, data: stats });
    }
    catch (error) {
        logger_1.logger.error('Error getting dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getDashboardStats = getDashboardStats;
// Get user statistics
const getUserStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get users with their report and block counts
        const query = `
      SELECT
        u.id,
        u.username,
        u.phone,
        u.role,
        u.bio,
        u.avatar,
        u.alias,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT ur.id) as reports_count,
        COUNT(DISTINCT ub.id) as blocks_count
      FROM "User" u
      LEFT JOIN "UserReport" ur ON u.id = ur.reported_id
      LEFT JOIN "UserBlock" ub ON u.id = ub.blocked_id
      GROUP BY u.id, u.username, u.phone, u.role, u.bio, u.avatar, u.alias, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
    `;
        const result = yield postgre_1.default.query(query);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        logger_1.logger.error('Error getting user stats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getUserStats = getUserStats;
// Get report statistics
const getReportStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get reports by status
        const statusQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM "UserReport"
      GROUP BY status
    `;
        // Get reports by reason
        const reasonQuery = `
      SELECT
        reason,
        COUNT(*) as count
      FROM "UserReport"
      GROUP BY reason
      ORDER BY count DESC
    `;
        // Get reports by month
        const monthlyQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM "UserReport"
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `;
        const [statusResult, reasonResult, monthlyResult] = yield Promise.all([
            postgre_1.default.query(statusQuery),
            postgre_1.default.query(reasonQuery),
            postgre_1.default.query(monthlyQuery),
        ]);
        const stats = {
            byStatus: statusResult.rows,
            byReason: reasonResult.rows,
            byMonth: monthlyResult.rows,
        };
        res.json({ success: true, data: stats });
    }
    catch (error) {
        logger_1.logger.error('Error getting report stats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getReportStats = getReportStats;
// Get pending creator approvals
const getPendingCreators = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.bio,
        u.avatar,
        u.alias,
        u.created_at,
        u.updated_at,
        u.role,
        u.creator_approved,
        u.creator_approval_date,
        u.creator_approval_admin_id,
        u.creator_approval_notes
      FROM "User" u
      WHERE u.role = 'creator' AND u.creator_approved = FALSE
      ORDER BY u.created_at ASC
    `;
        const result = yield postgre_1.default.query(query);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        logger_1.logger.error('Error getting pending creators:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.getPendingCreators = getPendingCreators;
// Approve creator
const approveCreator = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { approved, notes } = req.body;
        if (typeof approved !== 'boolean') {
            return res
                .status(400)
                .json({ success: false, message: 'Approved must be a boolean' });
        }
        // Check if user exists and is a creator
        const userCheckQuery = 'SELECT id, username, role, creator_approved FROM "User" WHERE id = $1';
        const userCheckResult = yield postgre_1.default.query(userCheckQuery, [id]);
        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userCheckResult.rows[0];
        if (user.role !== 'creator') {
            return res
                .status(400)
                .json({ success: false, message: 'User is not a creator' });
        }
        if (user.creator_approved === approved) {
            return res.status(400).json({
                success: false,
                message: `User is already ${approved ? 'approved' : 'not approved'}`,
            });
        }
        // Update creator approval status
        const updateQuery = `
      UPDATE "User"
      SET
        creator_approved = $1,
        creator_approval_date = $2,
        creator_approval_admin_id = $3,
        creator_approval_notes = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, username, creator_approved, creator_approval_date
    `;
        const result = yield postgre_1.default.query(updateQuery, [
            approved,
            approved ? new Date() : null,
            approved ? 'admin' : null, // You can replace this with actual admin ID
            notes || null,
            id,
        ]);
        const updatedUser = result.rows[0];
        res.json({
            success: true,
            message: `Creator "${updatedUser.username}" has been ${approved ? 'approved' : 'rejected'} successfully`,
            data: updatedUser,
        });
    }
    catch (error) {
        logger_1.logger.error('Error approving creator:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.approveCreator = approveCreator;
