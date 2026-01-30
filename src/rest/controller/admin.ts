import { Request, Response } from 'express';
import pool from '../../util/postgre';
import { logger } from '../../util/logger';

// Type definitions for database rows
interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  reporter_username: string;
  reported_username: string;
}

  interface UserRow {
    id: string;
    password: string;
    phone: string;
    username: string;
    bio: string;
    avatar: string;
    created_at: Date;
    updated_at: Date;
    role: string;
    alias: string;
    banned: boolean;
    reports_count: string;
    blocks_count: string;
  }

interface StatsRow {
  total_users?: string;
  total_reports?: string;
  pending_reports?: string;
  total_blocks?: string;
  banned_users?: string;
  month?: Date;
  new_users?: string;
  reason?: string;
  count?: string;
  status?: string;
}

// Get all users for admin panel
export const getAllUsers = async (req: Request, res: Response) => {
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
               COUNT(DISTINCT ur.id) as reports_count,
               COUNT(DISTINCT ub.id) as blocks_count
             FROM "User" u
             LEFT JOIN "UserReport" ur ON u.id = ur.reported_id
             LEFT JOIN "UserBlock" ub ON u.id = ub.blocked_id
             GROUP BY u.id, u.password, u.phone, u.username, u.bio, u.avatar, u.created_at, u.updated_at, u.role, u.alias, u.banned
             ORDER BY u.created_at DESC
           `;
    
    const result = await pool.query(query);
    
               const users = result.rows.map((row: UserRow) => ({
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
             reports_count: parseInt(row.reports_count),
             blocks_count: parseInt(row.blocks_count)
             // Note: password is excluded from response for security
           }));

    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Error getting all users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all reports for admin panel
export const getAllReports = async (req: Request, res: Response) => {
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
    
    const result = await pool.query(query);
    
    const reports = result.rows.map((row: ReportRow) => ({
      id: row.id,
      reporter_id: row.reporter_id,
      reported_id: row.reported_id,
      reason: row.reason,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reporter: {
        username: row.reporter_username
      },
      reported: {
        username: row.reported_username
      }
    }));

    res.json({ success: true, data: reports });
  } catch (error) {
    logger.error('Error getting all reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get specific report
export const getReport = async (req: Request, res: Response) => {
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
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    const report = result.rows[0] as ReportRow;
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
        username: report.reporter_username
      },
      reported: {
        username: report.reported_username
      }
    };

    res.json({ success: true, data: formattedReport });
  } catch (error) {
    logger.error('Error getting report:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update report status
export const updateReportStatus = async (req: Request, res: Response) => {
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
    
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating report status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete report
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM "UserReport" WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if user exists
    const userCheckQuery = 'SELECT id, username FROM "User" WHERE id = $1';
    const userCheckResult = await pool.query(userCheckQuery, [id]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Delete user (this will cascade to related records due to foreign key constraints)
    const deleteQuery = 'DELETE FROM "User" WHERE id = $1 RETURNING id, username';
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const deletedUser = result.rows[0];
    
    res.json({ 
      success: true, 
      message: `User "${deletedUser.username}" deleted successfully`,
      data: { id: deletedUser.id, username: deletedUser.username }
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Ban user (admin only)
export const banUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if user exists
    const userCheckQuery = 'SELECT id, username, banned FROM "User" WHERE id = $1';
    const userCheckResult = await pool.query(userCheckQuery, [id]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userCheckResult.rows[0];
    
    if (user.banned) {
      return res.status(400).json({ success: false, message: 'User is already banned' });
    }
    
    // Ban the user
    const banQuery = 'UPDATE "User" SET banned = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, username';
    const result = await pool.query(banQuery, [id]);
    
    const bannedUser = result.rows[0];
    
    res.json({ 
      success: true, 
      message: `User "${bannedUser.username}" has been banned successfully`,
      data: { id: bannedUser.id, username: bannedUser.username, banned: true }
    });
  } catch (error) {
    logger.error('Error banning user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Unban user (admin only)
export const unbanUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if user exists
    const userCheckQuery = 'SELECT id, username, banned FROM "User" WHERE id = $1';
    const userCheckResult = await pool.query(userCheckQuery, [id]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userCheckResult.rows[0];
    
    if (!user.banned) {
      return res.status(400).json({ success: false, message: 'User is not banned' });
    }
    
    // Unban the user
    const unbanQuery = 'UPDATE "User" SET banned = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, username';
    const result = await pool.query(unbanQuery, [id]);
    
    const unbannedUser = result.rows[0];
    
    res.json({ 
      success: true, 
      message: `User "${unbannedUser.username}" has been unbanned successfully`,
      data: { id: unbannedUser.id, username: unbannedUser.username, banned: false }
    });
  } catch (error) {
    logger.error('Error unbanning user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get total users
    const usersQuery = 'SELECT COUNT(*) as total_users FROM "User"';
    const usersResult = await pool.query(usersQuery);
    
    // Get total reports
    const reportsQuery = 'SELECT COUNT(*) as total_reports FROM "UserReport"';
    const reportsResult = await pool.query(reportsQuery);
    
    // Get pending reports
    const pendingQuery = 'SELECT COUNT(*) as pending_reports FROM "UserReport" WHERE status = \'pending\'';
    const pendingResult = await pool.query(pendingQuery);
    
    // Get total blocks
    const blocksQuery = 'SELECT COUNT(*) as total_blocks FROM "UserBlock"';
    const blocksResult = await pool.query(blocksQuery);
    
    // Get banned users
    const bannedQuery = 'SELECT COUNT(*) as banned_users FROM "User" WHERE banned = TRUE';
    const bannedResult = await pool.query(bannedQuery);
    
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
    const growthResult = await pool.query(growthQuery);
    
    // Get report types distribution
    const reportTypesQuery = `
      SELECT 
        reason,
        COUNT(*) as count
      FROM "UserReport"
      GROUP BY reason
      ORDER BY count DESC
    `;
    const reportTypesResult = await pool.query(reportTypesQuery);
    
    const stats = {
      totalUsers: parseInt((usersResult.rows[0] as StatsRow).total_users || '0'),
      totalReports: parseInt((reportsResult.rows[0] as StatsRow).total_reports || '0'),
      pendingReports: parseInt((pendingResult.rows[0] as StatsRow).pending_reports || '0'),
      totalBlocks: parseInt((blocksResult.rows[0] as StatsRow).total_blocks || '0'),
      bannedUsers: parseInt((bannedResult.rows[0] as StatsRow).banned_users || '0'),
      userGrowth: growthResult.rows,
      reportTypes: reportTypesResult.rows
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response) => {
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
    
    const result = await pool.query(query);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get report statistics
export const getReportStats = async (req: Request, res: Response) => {
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
    
    const [statusResult, reasonResult, monthlyResult] = await Promise.all([
      pool.query(statusQuery),
      pool.query(reasonQuery),
      pool.query(monthlyQuery)
    ]);
    
    const stats = {
      byStatus: statusResult.rows,
      byReason: reasonResult.rows,
      byMonth: monthlyResult.rows
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error getting report stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get pending creators (creators waiting for approval)
export const getPendingCreators = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.alias,
        u.bio,
        u.avatar,
        u.role,
        u.created_at,
        u.updated_at,
        u.creator_approved,
        u.creator_approval_date,
        u.creator_approval_admin_id,
        u.creator_approval_notes
      FROM "User" u
      WHERE u.role = 'creator' 
        AND (u.creator_approved IS NULL OR u.creator_approved = FALSE)
      ORDER BY u.created_at ASC
    `;
    
    const result = await pool.query(query);
    
    const creators = result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email || null,
      alias: row.alias || null,
      bio: row.bio || null,
      avatar: row.avatar || null,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      creator_approved: row.creator_approved || false,
      creator_approval_date: row.creator_approval_date || null,
      creator_approval_admin_id: row.creator_approval_admin_id || null,
      creator_approval_notes: row.creator_approval_notes || null
    }));

    res.json({ success: true, data: creators });
  } catch (error) {
    logger.error('Error getting pending creators:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Approve or reject a creator
export const approveCreator = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, notes } = req.body;
    const adminId = req.user?.id || 'admin'; // Get admin ID from auth or use default
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Approved status must be a boolean' });
    }
    
    // First check if creator exists
    const userCheckQuery = 'SELECT id, username, role FROM "User" WHERE id = $1';
    const userCheckResult = await pool.query(userCheckQuery, [id]);
    
    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }
    
    const user = userCheckResult.rows[0];
    
    if (user.role !== 'creator') {
      return res.status(400).json({ success: false, message: 'User is not a creator' });
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
      RETURNING 
        id, 
        username, 
        email, 
        alias, 
        bio, 
        avatar, 
        creator_approved, 
        creator_approval_date, 
        creator_approval_admin_id, 
        creator_approval_notes
    `;
    
    const approvalDate = approved ? new Date() : null;
    const result = await pool.query(updateQuery, [
      approved,
      approvalDate,
      adminId,
      notes || null,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }
    
    const updatedCreator = result.rows[0];
    
    res.json({ 
      success: true, 
      message: `Creator "${updatedCreator.username}" has been ${approved ? 'approved' : 'rejected'} successfully`,
      data: updatedCreator
    });
  } catch (error) {
    logger.error('Error approving creator:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create subscription plan (Admin only)
export const createSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { name, description, price, currency = 'USD', duration_days, features, is_active = true } = req.body;

    // Validate required fields
    if (!name || !price || !duration_days) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and duration_days are required',
      });
    }

    // Validate price is positive
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0',
      });
    }

    // Validate duration_days is positive
    if (duration_days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration days must be greater than 0',
      });
    }

    // Check if a plan with the same name already exists
    const existingPlan = await pool.query(
      'SELECT id FROM "PlatformSubscriptionPlan" WHERE LOWER(name) = LOWER($1) AND is_active = true',
      [name]
    );

    if (existingPlan.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A subscription plan with the name "${name}" already exists. Please use a different name or update the existing plan.`,
      });
    }

    // Insert new subscription plan
    const result = await pool.query(
      `INSERT INTO "PlatformSubscriptionPlan" 
       (name, description, price, currency, duration_days, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        price,
        currency,
        duration_days,
        features ? JSON.stringify(features) : null,
        is_active,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error creating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription plan',
    });
  }
};

// Update subscription plan (Admin only)
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, currency, duration_days, features, is_active } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    // Check if plan exists
    const planCheck = await pool.query(
      'SELECT * FROM "PlatformSubscriptionPlan" WHERE id = $1',
      [id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0',
        });
      }
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(currency);
    }
    if (duration_days !== undefined) {
      if (duration_days <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Duration days must be greater than 0',
        });
      }
      updates.push(`duration_days = $${paramIndex++}`);
      values.push(duration_days);
    }
    if (features !== undefined) {
      updates.push(`features = $${paramIndex++}`);
      values.push(features ? JSON.stringify(features) : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);
    // Add plan ID as last parameter
    values.push(id);

    const updateQuery = `
      UPDATE "PlatformSubscriptionPlan"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subscription plan',
    });
  }
};

// Clean up duplicate subscription plans (Admin only)
// Keeps the most recent plan for each name and deactivates/deletes older duplicates
export const cleanupDuplicateSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    // Find duplicate plans by name
    const duplicates = await pool.query(
      `SELECT name, COUNT(*) as count, array_agg(id ORDER BY created_at DESC) as ids
       FROM "PlatformSubscriptionPlan"
       WHERE is_active = true
       GROUP BY name
       HAVING COUNT(*) > 1`
    );

    if (duplicates.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No duplicate plans found',
        data: { cleaned: 0 },
      });
    }

    let cleanedCount = 0;
    const cleanedPlans: string[] = [];

    // For each duplicate name, keep the first (most recent) and deactivate the rest
    for (const duplicate of duplicates.rows) {
      const ids = duplicate.ids;
      const keepId = ids[0]; // Keep the most recent one
      const removeIds = ids.slice(1); // Remove the older ones

      // Deactivate older duplicates
      for (const removeId of removeIds) {
        await pool.query(
          `UPDATE "PlatformSubscriptionPlan" 
           SET is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [removeId]
        );
        cleanedCount++;
        cleanedPlans.push(removeId);
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleaned up ${cleanedCount} duplicate subscription plan(s)`,
      data: {
        cleaned: cleanedCount,
        deactivatedPlanIds: cleanedPlans,
        duplicatesFound: duplicates.rows.length,
      },
    });
  } catch (error: any) {
    logger.error('Error cleaning up duplicate subscription plans:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clean up duplicate plans',
    });
  }
};

// Delete subscription plan (Admin only)
export const deleteSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    // Check if plan exists
    const planCheck = await pool.query(
      'SELECT * FROM "PlatformSubscriptionPlan" WHERE id = $1',
      [id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await pool.query(
      `SELECT COUNT(*) as count 
       FROM "CreatorPlatformSubscription" 
       WHERE plan_id = $1 AND status IN ('active', 'trial')`,
      [id]
    );

    const subscriptionCount = parseInt(activeSubscriptions.rows[0].count);

    if (subscriptionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${subscriptionCount} active subscription(s). Please deactivate the plan instead or wait for subscriptions to expire.`,
      });
    }

    // Delete the plan
    await pool.query(
      'DELETE FROM "PlatformSubscriptionPlan" WHERE id = $1',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Subscription plan deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete subscription plan',
    });
  }
};

// Get all subscriptions (Admin only)
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const { status, creator_id, plan_id } = req.query;

    // Build query with optional filters
    let query = `
      SELECT 
        cps.id,
        cps.creator_id,
        cps.plan_id,
        cps.status,
        cps.start_date,
        cps.end_date,
        cps.auto_renew,
        cps.payment_method,
        cps.external_payment_id,
        cps.created_at,
        cps.updated_at,
        psp.name as plan_name,
        psp.price as plan_price,
        psp.description as plan_description,
        psp.duration_days,
        u.username as creator_username,
        u.email as creator_email,
        u.alias as creator_alias,
        u.avatar as creator_avatar
      FROM "CreatorPlatformSubscription" cps
      JOIN "PlatformSubscriptionPlan" psp ON cps.plan_id = psp.id
      JOIN "User" u ON cps.creator_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      query += ` AND cps.status = $${paramIndex++}`;
      params.push(status);
    }

    if (creator_id) {
      query += ` AND cps.creator_id = $${paramIndex++}`;
      params.push(creator_id);
    }

    if (plan_id) {
      query += ` AND cps.plan_id = $${paramIndex++}`;
      params.push(plan_id);
    }

    query += ` ORDER BY cps.created_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    logger.error('Error getting all subscriptions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get subscriptions',
    });
  }
};

// ==================== MEMBERSHIP PLAN MANAGEMENT (Apple IAP) ====================

// Get all membership plans (Admin only)
export const getAllMembershipPlans = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "MembershipPlan" 
       ORDER BY display_order ASC, created_at ASC`
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Error getting membership plans:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get membership plans',
    });
  }
};

// Create membership plan (Admin only)
export const createMembershipPlan = async (req: Request, res: Response) => {
  try {
    const {
      tier_name,
      tier_key,
      apple_product_id,
      price,
      currency = 'USD',
      description,
      features,
      display_order = 0,
      is_active = true,
    } = req.body;

    // Validate required fields
    if (!tier_name || !tier_key || !apple_product_id || !price) {
      return res.status(400).json({
        success: false,
        message: 'tier_name, tier_key, apple_product_id, and price are required',
      });
    }

    // Validate price is positive
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0',
      });
    }

    // Check if tier_key already exists
    const existingTier = await pool.query(
      'SELECT id FROM "MembershipPlan" WHERE tier_key = $1',
      [tier_key]
    );

    if (existingTier.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A membership plan with tier_key "${tier_key}" already exists.`,
      });
    }

    // Check if apple_product_id already exists
    const existingProduct = await pool.query(
      'SELECT id FROM "MembershipPlan" WHERE apple_product_id = $1',
      [apple_product_id]
    );

    if (existingProduct.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A membership plan with apple_product_id "${apple_product_id}" already exists.`,
      });
    }

    // Insert new membership plan
    const result = await pool.query(
      `INSERT INTO "MembershipPlan" 
       (tier_name, tier_key, apple_product_id, price, currency, description, features, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tier_name,
        tier_key,
        apple_product_id,
        price,
        currency,
        description || null,
        features ? JSON.stringify(features) : null,
        display_order,
        is_active,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Membership plan created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error creating membership plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create membership plan',
    });
  }
};

// Update membership plan (Admin only)
export const updateMembershipPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tier_name,
      tier_key,
      apple_product_id,
      price,
      currency,
      description,
      features,
      display_order,
      is_active,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    // Check if plan exists
    const planCheck = await pool.query(
      'SELECT * FROM "MembershipPlan" WHERE id = $1',
      [id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (tier_name !== undefined) {
      updates.push(`tier_name = $${paramIndex++}`);
      values.push(tier_name);
    }
    if (tier_key !== undefined) {
      // Check if tier_key conflicts with another plan
      const conflictCheck = await pool.query(
        'SELECT id FROM "MembershipPlan" WHERE tier_key = $1 AND id != $2',
        [tier_key, id]
      );
      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Another plan with tier_key "${tier_key}" already exists.`,
        });
      }
      updates.push(`tier_key = $${paramIndex++}`);
      values.push(tier_key);
    }
    if (apple_product_id !== undefined) {
      // Check if apple_product_id conflicts with another plan
      const conflictCheck = await pool.query(
        'SELECT id FROM "MembershipPlan" WHERE apple_product_id = $1 AND id != $2',
        [apple_product_id, id]
      );
      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Another plan with apple_product_id "${apple_product_id}" already exists.`,
        });
      }
      updates.push(`apple_product_id = $${paramIndex++}`);
      values.push(apple_product_id);
    }
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0',
        });
      }
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(currency);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (features !== undefined) {
      updates.push(`features = $${paramIndex++}`);
      values.push(features ? JSON.stringify(features) : null);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(display_order);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);
    // Add plan ID as last parameter
    values.push(id);

    const updateQuery = `
      UPDATE "MembershipPlan"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    res.status(200).json({
      success: true,
      message: 'Membership plan updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error updating membership plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update membership plan',
    });
  }
};

// Delete membership plan (Admin only)
export const deleteMembershipPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    // Check if plan exists
    const planCheck = await pool.query(
      'SELECT * FROM "MembershipPlan" WHERE id = $1',
      [id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    // Check if plan has active memberships
    const activeMemberships = await pool.query(
      `SELECT COUNT(*) as count 
       FROM "UserMembership" 
       WHERE tier = (SELECT tier_name FROM "MembershipPlan" WHERE id = $1) AND status = 'active'`,
      [id]
    );

    const membershipCount = parseInt(activeMemberships.rows[0].count);

    if (membershipCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${membershipCount} active membership(s). Please deactivate the plan instead.`,
      });
    }

    // Delete the plan
    await pool.query('DELETE FROM "MembershipPlan" WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Membership plan deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting membership plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete membership plan',
    });
  }
};