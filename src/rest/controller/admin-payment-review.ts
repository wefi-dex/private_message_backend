import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import pool from "../../util/postgre";
import { logger } from "../../util/logger";
import { stripe } from "../../config/stripe";

// Get payment review dashboard data
export const getPaymentReviewDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      // Get pending payment review requests
      const pendingRequestsResult = await pool.query(
        `SELECT
          prr.id,
          prr.creator_id,
          u.username as creator_username,
          u.alias as creator_alias,
          u.email as creator_email,
          prr.request_type,
          prr.amount,
          prr.currency,
          prr.status,
          prr.description,
          prr.created_at,
          u.total_earnings,
          u.monthly_earnings
        FROM "PaymentReviewRequest" prr
        JOIN "User" u ON prr.creator_id = u.id
        WHERE prr.status IN ('pending', 'under_review')
        ORDER BY prr.created_at DESC`
      );

      // Get pending payout requests
      const pendingPayoutsResult = await pool.query(
        `SELECT
          pr.id,
          pr.creator_id,
          u.username as creator_username,
          u.alias as creator_alias,
          pr.amount,
          pr.currency,
          pr.payment_method,
          pr.status,
          pr.created_at
        FROM "PayoutRequest" pr
        JOIN "User" u ON pr.creator_id = u.id
        WHERE pr.status IN ('pending', 'processing')
        ORDER BY pr.created_at DESC`
      );

      // Get open payment issues
      const openIssuesResult = await pool.query(
        `SELECT
          pi.id,
          pi.user_id,
          u.username,
          u.alias,
          pi.issue_type,
          pi.description,
          pi.status,
          pi.priority,
          pi.created_at
        FROM "PaymentIssue" pi
        JOIN "User" u ON pi.user_id = u.id
        WHERE pi.status IN ('open', 'under_review')
        ORDER BY
          CASE pi.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          pi.created_at DESC`
      );

      // Get payment statistics
      const statsResult = await pool.query(
        `SELECT
          COUNT(*) as total_pending_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_requests,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending_amount
        FROM "PaymentReviewRequest"
        WHERE status IN ('pending', 'under_review')`
      );

      res.status(200).json({
        success: true,
        data: {
          pendingRequests: pendingRequestsResult.rows,
          pendingPayouts: pendingPayoutsResult.rows,
          openIssues: openIssuesResult.rows,
          stats: statsResult.rows[0],
        },
      });
    } catch (error: any) {
      logger.error("Error getting payment review dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment review dashboard",
      });
    }
  }
);

// Get payment review request details
export const getPaymentReviewRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          prr.*,
          u.username as creator_username,
          u.alias as creator_alias,
          u.email as creator_email,
          u.total_earnings,
          u.monthly_earnings,
          u.payment_verification_status,
          u.payout_method,
          u.payout_details
        FROM "PaymentReviewRequest" prr
        JOIN "User" u ON prr.creator_id = u.id
        WHERE prr.id = $1`,
        [requestId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Payment review request not found",
        });
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      logger.error("Error getting payment review request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment review request",
      });
    }
  }
);

// Update payment review request status
export const updatePaymentReviewRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!status || !["approved", "rejected", "under_review"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    try {
      // Get the request details
      const requestResult = await pool.query(
        'SELECT * FROM "PaymentReviewRequest" WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Payment review request not found",
        });
      }

      const request = requestResult.rows[0];

      // Update the request status
      await pool.query(
        `UPDATE "PaymentReviewRequest"
         SET status = $1, admin_notes = $2, admin_id = $3, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [status, admin_notes, adminId, requestId]
      );

      // Log the action
      await pool.query(
        `INSERT INTO "PaymentAuditLog" (admin_id, action, entity_type, entity_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          adminId,
          "update_payment_review_request",
          "PaymentReviewRequest",
          requestId,
          { status: request.status, admin_notes: request.admin_notes },
          { status, admin_notes },
        ]
      );

      // Handle specific actions based on request type and status
      if (status === "approved") {
        if (request.request_type === "payout") {
          // Process payout
          await processPayout(
            request.creator_id,
            request.amount,
            request.currency,
            adminId
          );
        } else if (request.request_type === "subscription_approval") {
          // Enable subscription features
          await pool.query(
            `UPDATE "User"
             SET subscription_enabled = true, updated_at = NOW()
             WHERE id = $1`,
            [request.creator_id]
          );
        }
      }

      res.status(200).json({
        success: true,
        message: "Payment review request updated successfully",
      });
    } catch (error: any) {
      logger.error("Error updating payment review request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment review request",
      });
    }
  }
);

// Create payout request
export const createPayoutRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { amount, payment_method, payment_details } = req.body;
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    try {
      // Check if creator has enough earnings
      const creatorResult = await pool.query(
        'SELECT total_earnings, minimum_payout_amount FROM "User" WHERE id = $1',
        [creatorId]
      );

      if (creatorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Creator not found",
        });
      }

      const creator = creatorResult.rows[0];

      if (amount > creator.total_earnings) {
        return res.status(400).json({
          success: false,
          message: "Insufficient earnings for payout",
        });
      }

      if (amount < creator.minimum_payout_amount) {
        return res.status(400).json({
          success: false,
          message: `Minimum payout amount is $${creator.minimum_payout_amount}`,
        });
      }

      // Create payout request
      const result = await pool.query(
        `INSERT INTO "PayoutRequest" (creator_id, amount, payment_method, payment_details)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [creatorId, amount, payment_method, payment_details]
      );

      res.status(201).json({
        success: true,
        message: "Payout request created successfully",
        data: result.rows[0],
      });
    } catch (error: any) {
      logger.error("Error creating payout request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payout request",
      });
    }
  }
);

// Process payout (admin function)
async function processPayout(
  creatorId: string,
  amount: number,
  currency: string,
  adminId: string
) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file."
      );
    }

    // Create Stripe payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        creator_id: creatorId,
        admin_id: adminId,
        type: "creator_payout",
      },
    });

    // Update payout request status
    await pool.query(
      `UPDATE "PayoutRequest"
       SET status = 'processing', stripe_payout_id = $1, admin_id = $2, updated_at = NOW()
       WHERE creator_id = $3 AND amount = $4 AND status = 'pending'`,
      [payout.id, adminId, creatorId, amount]
    );

    // Deduct from creator's earnings
    await pool.query(
      `UPDATE "User"
       SET total_earnings = total_earnings - $1, updated_at = NOW()
       WHERE id = $2`,
      [amount, creatorId]
    );

    logger.info(`Payout processed: ${payout.id} for creator ${creatorId}`);
  } catch (error: any) {
    logger.error("Error processing payout:", error);
    throw new Error("Failed to process payout");
  }
}

// Get payment issues
export const getPaymentIssues = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, priority } = req.query;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      let query = `
        SELECT
          pi.*,
          u.username,
          u.alias,
          u.email,
          pt.amount as transaction_amount,
          pt.currency as transaction_currency
        FROM "PaymentIssue" pi
        JOIN "User" u ON pi.user_id = u.id
        LEFT JOIN "PaymentTransaction" pt ON pi.transaction_id = pt.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND pi.status = $${paramCount}`;
        params.push(status);
      }

      if (priority) {
        paramCount++;
        query += ` AND pi.priority = $${paramCount}`;
        params.push(priority);
      }

      query += ` ORDER BY
        CASE pi.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        pi.created_at DESC`;

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      logger.error("Error getting payment issues:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment issues",
      });
    }
  }
);

// Update payment issue
export const updatePaymentIssue = asyncHandler(
  async (req: Request, res: Response) => {
    const { issueId } = req.params;
    const { status, admin_notes, resolution_notes } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      await pool.query(
        `UPDATE "PaymentIssue"
         SET status = $1, admin_notes = $2, resolution_notes = $3, admin_id = $4,
             resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
             updated_at = NOW()
         WHERE id = $5`,
        [status, admin_notes, resolution_notes, adminId, issueId]
      );

      res.status(200).json({
        success: true,
        message: "Payment issue updated successfully",
      });
    } catch (error: any) {
      logger.error("Error updating payment issue:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment issue",
      });
    }
  }
);

// Get payment audit log
export const getPaymentAuditLog = asyncHandler(
  async (req: Request, res: Response) => {
    const { entity_type, entity_id, limit = 50, offset = 0 } = req.query;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      let query = `
        SELECT
          pal.*,
          u.username as admin_username,
          u.alias as admin_alias
        FROM "PaymentAuditLog" pal
        JOIN "User" u ON pal.admin_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (entity_type) {
        paramCount++;
        query += ` AND pal.entity_type = $${paramCount}`;
        params.push(entity_type);
      }

      if (entity_id) {
        paramCount++;
        query += ` AND pal.entity_id = $${paramCount}`;
        params.push(entity_id);
      }

      query += ` ORDER BY pal.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      logger.error("Error getting payment audit log:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment audit log",
      });
    }
  }
);
