import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import pool from "../../util/postgre";
import { logger } from "../../util/logger";
import fs from "fs";
import path from "path";
import {
  stripe,
  createPaymentIntent,
  createStripeCustomer,
} from "../../config/stripe";

// Debug logging helper
const debugLog = (data: any) => {
  try {
    // Use absolute path to workspace root
    const logPath = "/Volumes/Work/g-10/.cursor/debug.log";
    const logEntry = JSON.stringify({ ...data, timestamp: Date.now() }) + "\n";
    fs.appendFileSync(logPath, logEntry, "utf8");
    // Also log to console for immediate visibility
    console.log(`[DEBUG] ${data.location}: ${data.message}`, data.data || {});
  } catch (e) {
    // Log to console if file logging fails
    console.error("Debug log error:", e);
    console.log(
      `[DEBUG-FALLBACK] ${data.location}: ${data.message}`,
      data.data || {}
    );
  }
};

// Get platform subscription plans
export const getPlatformSubscriptionPlans = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE is_active = true ORDER BY price ASC'
      );
      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      logger.error("Error getting platform subscription plans:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get platform subscription plans",
      });
    }
  }
);

// Get creator's platform subscription status
export const getCreatorPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const result = await pool.query(
        `SELECT cps.*, psp.name as plan_name, psp.price, psp.description, psp.features
         FROM "CreatorPlatformSubscription" cps
         JOIN "PlatformSubscriptionPlan" psp ON cps.plan_id = psp.id
         WHERE cps.creator_id = $1 AND cps.status IN ('active', 'trial')
         ORDER BY cps.created_at DESC
         LIMIT 1`,
        [creatorId]
      );

      if (result.rows.length > 0) {
        res.status(200).json({
          success: true,
          data: result.rows[0],
        });
      } else {
        res.status(200).json({
          success: true,
          data: null,
        });
      }
    } catch (error: any) {
      logger.error("Error getting creator platform subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get creator platform subscription",
      });
    }
  }
);

// Create platform subscription for creator
export const createPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id;
    const { planId, customerId } = req.body;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    try {
      // Get creator details
      const creatorResult = await pool.query(
        'SELECT email, username, alias FROM "User" WHERE id = $1',
        [creatorId]
      );

      if (creatorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Creator not found",
        });
      }

      // Check if plan exists
      const planResult = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE id = $1 AND is_active = true',
        [planId]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Platform subscription plan not found",
        });
      }

      const plan = planResult.rows[0];

      // Check if creator already has an active platform subscription
      const existingSubscriptionResult = await pool.query(
        'SELECT * FROM "CreatorPlatformSubscription" WHERE creator_id = $1 AND status IN ($2, $3)',
        [creatorId, "active", "trial"]
      );

      if (existingSubscriptionResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You already have an active platform subscription",
        });
      }

      // For development/testing, skip Stripe integration
      const stripeCustomerId = customerId || "test_customer_" + Date.now();
      const paymentIntentId = "test_payment_intent_" + Date.now();

      // Calculate end date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // Create platform subscription in database
      const subscriptionResult = await pool.query(
        `INSERT INTO "CreatorPlatformSubscription"
         (creator_id, plan_id, end_date, payment_method, external_payment_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [creatorId, planId, endDate, "test", paymentIntentId]
      );

      const subscription = subscriptionResult.rows[0];

      // Create platform payment transaction
      const transactionResult = await pool.query(
        `INSERT INTO "PlatformPaymentTransaction"
         (subscription_id, creator_id, amount, currency, payment_method,
          external_payment_id, status, transaction_type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          subscription.id,
          creatorId,
          plan.price,
          "usd",
          "test",
          paymentIntentId,
          "completed", // For testing, mark as completed
          "platform_subscription",
          `Platform subscription to ${plan.name} plan`,
        ]
      );

      // Update user's platform subscription status
      await pool.query(
        `UPDATE "User"
         SET platform_subscription_status = 'active',
             platform_subscription_end_date = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [endDate, creatorId]
      );

      res.status(201).json({
        success: true,
        message: "Platform subscription created successfully",
        data: {
          subscription,
          transaction: transactionResult.rows[0],
          paymentIntent: {
            id: paymentIntentId,
            clientSecret: "test_secret",
            amount: plan.price * 100,
            currency: "usd",
          },
          customerId: stripeCustomerId,
        },
      });
    } catch (error: any) {
      logger.error("Error creating platform subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create platform subscription",
      });
    }
  }
);

// Start free trial for creator
export const startFreeTrial = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      // Check if creator has already used trial
      const userResult = await pool.query(
        'SELECT has_used_trial FROM "User" WHERE id = $1',
        [creatorId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Creator not found",
        });
      }

      const user = userResult.rows[0];

      if (user.has_used_trial) {
        return res.status(400).json({
          success: false,
          message: "You have already used your free trial",
        });
      }

      // Check if creator already has an active subscription
      const existingSubscriptionResult = await pool.query(
        'SELECT * FROM "CreatorPlatformSubscription" WHERE creator_id = $1 AND status IN ($2, $3)',
        [creatorId, "active", "trial"]
      );

      if (existingSubscriptionResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You already have an active subscription or trial",
        });
      }

      // Get basic plan for trial
      const planResult = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE name = $1 AND is_active = true',
        ["Creator Basic"]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Basic plan not found for trial",
        });
      }

      const plan = planResult.rows[0];

      // Calculate trial dates (30 days)
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      // Create trial subscription
      const subscriptionResult = await pool.query(
        `INSERT INTO "CreatorPlatformSubscription"
         (creator_id, plan_id, status, start_date, end_date, payment_method, external_payment_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          creatorId,
          plan.id,
          "trial",
          trialStartDate,
          trialEndDate,
          "trial",
          "trial_" + Date.now(),
        ]
      );

      // Update user's trial status
      await pool.query(
        `UPDATE "User"
         SET platform_subscription_status = 'trial',
             platform_subscription_end_date = $1,
             trial_start_date = $2,
             trial_end_date = $3,
             has_used_trial = true,
             updated_at = NOW()
         WHERE id = $4`,
        [trialEndDate, trialStartDate, trialEndDate, creatorId]
      );

      res.status(201).json({
        success: true,
        message: "Free trial started successfully",
        data: {
          subscription: subscriptionResult.rows[0],
          trialEndDate,
        },
      });
    } catch (error: any) {
      logger.error("Error starting free trial:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to start free trial",
      });
    }
  }
);

// Cancel platform subscription
export const cancelPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    let creatorId = req.user?.id;
    const { subscriptionId } = req.params;

    // For testing purposes, use a default creator ID if no authenticated user
    if (!creatorId) {
      creatorId = "922d9805-ee01-4f9b-a121-6129d684d4bf"; // Test creator ID
    }

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required",
      });
    }

    try {
      // Update subscription status to cancelled
      const result = await pool.query(
        `UPDATE "CreatorPlatformSubscription"
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND creator_id = $2
         RETURNING *`,
        [subscriptionId, creatorId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Update user's platform subscription status
      await pool.query(
        `UPDATE "User"
         SET platform_subscription_status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`,
        [creatorId]
      );

      res.status(200).json({
        success: true,
        message: "Platform subscription cancelled successfully",
        data: result.rows[0],
      });
    } catch (error: any) {
      logger.error("Error cancelling platform subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel platform subscription",
      });
    }
  }
);

// Check if creator has permission to post
export const checkCreatorPostingPermission = asyncHandler(
  async (req: Request, res: Response) => {
    let creatorId = req.user?.id;

    // For testing purposes, use a default creator ID if no authenticated user
    if (!creatorId) {
      creatorId = "922d9805-ee01-4f9b-a121-6129d684d4bf"; // Test creator ID
    }

    try {
      // Check if creator has active platform subscription or trial
      const subscriptionResult = await pool.query(
        `SELECT cps.*, psp.name as plan_name
         FROM "CreatorPlatformSubscription" cps
         JOIN "PlatformSubscriptionPlan" psp ON cps.plan_id = psp.id
         WHERE cps.creator_id = $1 AND cps.status IN ('active', 'trial')
         AND cps.end_date > NOW()
         ORDER BY cps.created_at DESC
         LIMIT 1`,
        [creatorId]
      );

      if (subscriptionResult.rows.length > 0) {
        const subscription = subscriptionResult.rows[0];
        res.status(200).json({
          success: true,
          canPost: true,
          subscription: {
            id: subscription.id,
            planName: subscription.plan_name,
            status: subscription.status,
            endDate: subscription.end_date,
          },
        });
      } else {
        res.status(200).json({
          success: true,
          canPost: false,
          message: "No active platform subscription found",
        });
      }
    } catch (error: any) {
      logger.error("Error checking creator posting permission:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check posting permission",
      });
    }
  }
);

// Create payment intent for Apple Pay / subscription upgrade
export const createPaymentIntentEndpoint = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("[PAYMENT] createPaymentIntentEndpoint called", {
      userId: req.user?.id,
      amount: req.body.amount,
      hasAuth: !!req.user,
    });
    // #region agent log
    debugLog({
      location: "payment.ts:440",
      message: "createPaymentIntentEndpoint entry",
      data: {
        userId: req.user?.id,
        amount: req.body.amount,
        currency: req.body.currency,
        hasMetadata: !!req.body.metadata,
        stripeConfigured: !!stripe,
      },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    });
    // #endregion

    // Ensure stripe_customer_id column exists before any database operations
    // This must happen early to avoid errors in subsequent queries
    try {
      await pool.query(
        'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)'
      );
    } catch (alterError: any) {
      // Column might already exist - that's fine, continue
      // PostgreSQL error codes: 42710 = duplicate_column, or check message
      if (
        !alterError.message?.includes("already exists") &&
        !alterError.message?.includes("duplicate") &&
        alterError.code !== "42710"
      ) {
        logger.warn(
          "Warning: Could not ensure stripe_customer_id column exists:",
          alterError.message
        );
        // Continue anyway - we'll handle errors in individual queries
      }
    }

    const userId = req.user?.id;
    const { amount, currency = "usd", metadata } = req.body;

    if (!userId) {
      // #region agent log
      debugLog({
        location: "payment.ts:447",
        message: "No userId - auth required",
        data: {},
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      });
      // #endregion
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!amount || amount <= 0) {
      // #region agent log
      debugLog({
        location: "payment.ts:453",
        message: "Invalid amount",
        data: { amount },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      });
      // #endregion
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // Check if Stripe is configured
    // #region agent log
    debugLog({
      location: "payment.ts:460",
      message: "Stripe config check",
      data: { stripeIsNull: !stripe, stripeType: typeof stripe },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    });
    // #endregion
    if (!stripe) {
      logger.error(
        "Stripe is not configured - STRIPE_SECRET_KEY is missing or invalid"
      );
      // #region agent log
      debugLog({
        location: "payment.ts:464",
        message: "Stripe not configured - returning 500",
        data: {},
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      });
      // #endregion
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured. Please contact support.",
        error: "stripe_not_configured",
      });
    }

    try {
      // #region agent log
      debugLog({
        location: "payment.ts:472",
        message: "Starting user lookup",
        data: { userId },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      });
      // #endregion

      // Ensure stripe_customer_id column exists before any operations
      try {
        await pool.query(
          'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)'
        );
      } catch (alterError: any) {
        // If column already exists or other error, log but continue
        // PostgreSQL might return different error messages
        if (
          !alterError.message?.includes("already exists") &&
          !alterError.message?.includes("duplicate column")
        ) {
          logger.warn(
            "Error ensuring stripe_customer_id column:",
            alterError.message
          );
        }
      }

      // Get user details
      const userResult = await pool.query(
        'SELECT email, username, alias FROM "User" WHERE id = $1',
        [userId]
      );
      // #region agent log
      debugLog({
        location: "payment.ts:477",
        message: "User lookup result",
        data: {
          userFound: userResult.rows.length > 0,
          hasEmail: userResult.rows[0]?.email,
          hasUsername: !!userResult.rows[0]?.username,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      });
      // #endregion

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult.rows[0];
      // #region agent log
      debugLog({
        location: "payment.ts:485",
        message: "User data extracted",
        data: {
          email: user.email,
          username: user.username,
          alias: user.alias,
          hasEmail: !!user.email,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      });
      // #endregion

      // Get or create Stripe customer
      let customerId = metadata?.customerId;
      // #region agent log
      debugLog({
        location: "payment.ts:490",
        message: "Customer ID check",
        data: { hasCustomerIdInMetadata: !!customerId },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      });
      // #endregion

      if (!customerId) {
        // #region agent log
        debugLog({
          location: "payment.ts:492",
          message: "Checking DB for existing customer ID",
          data: { userId },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "C",
        });
        // #endregion
        // Check if user already has a Stripe customer ID stored
        // Column should already exist from earlier check, but handle error just in case
        let customerCheckResult;
        try {
          customerCheckResult = await pool.query(
            'SELECT stripe_customer_id FROM "User" WHERE id = $1',
            [userId]
          );
        } catch (selectError: any) {
          // If column still doesn't exist, create it and retry
          if (
            selectError.message?.includes(
              'column "stripe_customer_id" does not exist'
            )
          ) {
            await pool.query(
              'ALTER TABLE "User" ADD COLUMN stripe_customer_id VARCHAR(255)'
            );
            customerCheckResult = await pool.query(
              'SELECT stripe_customer_id FROM "User" WHERE id = $1',
              [userId]
            );
          } else {
            throw selectError;
          }
        }

        // #region agent log
        debugLog({
          location: "payment.ts:497",
          message: "Customer ID query result",
          data: {
            hasExistingCustomerId:
              !!customerCheckResult.rows[0]?.stripe_customer_id,
          },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "C",
        });
        // #endregion

        if (
          customerCheckResult.rows.length > 0 &&
          customerCheckResult.rows[0].stripe_customer_id
        ) {
          customerId = customerCheckResult.rows[0].stripe_customer_id;
          // #region agent log
          debugLog({
            location: "payment.ts:502",
            message: "Using existing customer ID",
            data: { customerId },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          });
          // #endregion
        } else {
          // #region agent log
          debugLog({
            location: "payment.ts:505",
            message: "Creating new Stripe customer",
            data: {
              email: user.email || `${user.username}@example.com`,
              name: user.alias || user.username,
            },
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          });
          // #endregion
          // Create new Stripe customer
          try {
            const customer = await createStripeCustomer(
              user.email || `${user.username}@example.com`,
              user.alias || user.username
            );
            customerId = customer.id;
            // #region agent log
            debugLog({
              location: "payment.ts:510",
              message: "Stripe customer created",
              data: { customerId },
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            });
            // #endregion

            // Store customer ID in database
            // Column should already exist from earlier check, but handle error just in case
            try {
              await pool.query(
                'UPDATE "User" SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
                [customerId, userId]
              );
            } catch (dbError: any) {
              // If column doesn't exist, add it and retry
              if (
                dbError.message?.includes(
                  'column "stripe_customer_id" does not exist'
                )
              ) {
                try {
                  await pool.query(
                    'ALTER TABLE "User" ADD COLUMN stripe_customer_id VARCHAR(255)'
                  );
                  await pool.query(
                    'UPDATE "User" SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
                    [customerId, userId]
                  );
                } catch (retryError: any) {
                  logger.error(
                    "Database error storing customer ID after column creation:",
                    retryError
                  );
                  // Don't throw - customer was created, just couldn't store ID
                }
              } else {
                logger.error("Database error storing customer ID:", dbError);
                // Don't throw - customer was created, just couldn't store ID
              }
            }
          } catch (stripeCustomerError: any) {
            logger.error(
              "Error creating Stripe customer:",
              stripeCustomerError
            );
            throw new Error(
              `Failed to create payment account: ${stripeCustomerError.message || "Please check your Stripe configuration."}`
            );
          }
        }
      }

      // Create payment intent with Stripe
      // #region agent log
      debugLog({
        location: "payment.ts:549",
        message: "Creating payment intent",
        data: {
          amount: Math.round(amount),
          currency,
          customerId,
          hasMetadata: !!metadata,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      });
      // #endregion
      try {
        const paymentIntent = await createPaymentIntent(
          Math.round(amount), // Amount should already be in cents
          currency,
          customerId,
          {
            userId,
            ...metadata,
          }
        );
        // #region agent log
        debugLog({
          location: "payment.ts:560",
          message: "Payment intent created successfully",
          data: {
            paymentIntentId: paymentIntent.id,
            hasClientSecret: !!paymentIntent.client_secret,
          },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "D",
        });
        // #endregion

        res.status(200).json({
          success: true,
          data: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            customerId,
          },
        });
      } catch (stripeError: any) {
        logger.error("Stripe API error:", stripeError);
        // #region agent log
        debugLog({
          location: "payment.ts:568",
          message: "Stripe API error caught",
          data: {
            errorType: stripeError.type,
            errorMessage: stripeError.message,
            errorCode: stripeError.code,
            errorStatus: stripeError.statusCode,
          },
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "D",
        });
        // #endregion
        // Provide more detailed error message
        let errorMessage = "Failed to create payment intent";
        if (stripeError.message) {
          errorMessage = stripeError.message;
        } else if (stripeError.type) {
          errorMessage = `Stripe error: ${stripeError.type}`;
        }
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: stripeError.type || "stripe_api_error",
        });
      }
    } catch (error: any) {
      console.error("[PAYMENT ERROR] Outer catch block:", {
        message: error.message,
        type: error.type,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      });
      logger.error("Error creating payment intent:", error);
      logger.error("Error details:", {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack,
      });
      // #region agent log
      debugLog({
        location: "payment.ts:568",
        message: "Outer catch block - general error",
        data: {
          errorType: error.type,
          errorMessage: error.message,
          errorCode: error.code,
          errorName: error.name,
          hasStack: !!error.stack,
        },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      });
      // #endregion

      // Provide more specific error messages
      let errorMessage = "Failed to create payment intent";
      let statusCode = 500;

      if (error.message) {
        errorMessage = error.message;
      } else if (error.type === "StripeAuthenticationError") {
        errorMessage =
          "Stripe authentication failed. Please check your Stripe API keys.";
        statusCode = 500;
      } else if (error.type === "StripeInvalidRequestError") {
        errorMessage = `Invalid payment request: ${error.message || "Please check your request parameters."}`;
        statusCode = 400;
      } else if (error.message?.includes("Stripe")) {
        errorMessage = `Stripe error: ${error.message}`;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.type || "internal_server_error",
      });
    }
  }
);

// Upgrade user membership subscription (Gold, Platinum, Diamond)
export const upgradeMembershipSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { planId, paymentIntentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment Intent ID is required",
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      logger.error(
        "Stripe is not configured - STRIPE_SECRET_KEY is missing or invalid"
      );
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured. Please contact support.",
        error: "stripe_not_configured",
      });
    }

    // TypeScript type guard: stripe is guaranteed to be non-null after the check above
    const stripeInstance = stripe;

    try {
      // Verify payment intent with Stripe
      const paymentIntent =
        await stripeInstance.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          success: false,
          message: `Payment not completed. Status: ${paymentIntent.status}`,
        });
      }

      // Validate plan ID
      const validPlans = ["gold", "platinum", "diamond"];
      if (!validPlans.includes(planId.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan ID. Must be one of: gold, platinum, diamond",
        });
      }

      // Get user details
      const userResult = await pool.query(
        'SELECT id, email, username, alias FROM "User" WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Map plan IDs to membership tier names
      const planMapping: Record<string, string> = {
        gold: "Gold Lounge",
        platinum: "Platinum Lounge",
        diamond: "Diamond Lounge",
      };

      const membershipTier = planMapping[planId.toLowerCase()];

      // Update membership tier in User table
      try {
        await pool.query(
          `UPDATE "User"
           SET membership_tier = $1,
               membership_updated_at = NOW(),
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, membership_tier`,
          [membershipTier, userId]
        );
      } catch (error: any) {
        // If column doesn't exist, add it
        if (error.message.includes('column "membership_tier" does not exist')) {
          await pool.query(`
            ALTER TABLE "User"
            ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(50),
            ADD COLUMN IF NOT EXISTS membership_updated_at TIMESTAMP
          `);
          await pool.query(
            `UPDATE "User"
             SET membership_tier = $1,
                 membership_updated_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2
             RETURNING id, membership_tier`,
            [membershipTier, userId]
          );
        } else {
          throw error;
        }
      }

      // Create a membership subscription record for tracking history
      try {
        await pool.query(
          `INSERT INTO "UserMembership" (user_id, tier, payment_intent_id, status, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET tier = $2, payment_intent_id = $3, status = $4, updated_at = NOW()`,
          [userId, membershipTier, paymentIntentId, "active"]
        );
      } catch (error: any) {
        // If table doesn't exist, create it
        if (
          error.message.includes('relation "UserMembership" does not exist')
        ) {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS "UserMembership" (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
              tier VARCHAR(50) NOT NULL,
              payment_intent_id VARCHAR(255),
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          `);
          await pool.query(
            `INSERT INTO "UserMembership" (user_id, tier, payment_intent_id, status, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [userId, membershipTier, paymentIntentId, "active"]
          );
        } else {
          logger.error("Error creating membership record:", error);
          // Don't fail the request if membership record creation fails
        }
      }

      res.status(200).json({
        success: true,
        message: `Successfully upgraded to ${membershipTier}`,
        data: {
          userId,
          membershipTier,
          paymentIntentId,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error upgrading membership subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upgrade membership subscription",
      });
    }
  }
);
