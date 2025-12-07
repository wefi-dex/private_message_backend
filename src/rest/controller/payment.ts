import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import pool from '../../util/postgre'
import { logger } from '../../util/logger'

// Get platform subscription plans
export const getPlatformSubscriptionPlans = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE is_active = true ORDER BY price ASC',
      )
      res.status(200).json({
        success: true,
        data: result.rows,
      })
    } catch (error: any) {
      logger.error('Error getting platform subscription plans:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get platform subscription plans',
      })
    }
  },
)

// Get creator's platform subscription status
export const getCreatorPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    try {
      const result = await pool.query(
        `SELECT cps.*, psp.name as plan_name, psp.price, psp.description, psp.features
         FROM "CreatorPlatformSubscription" cps
         JOIN "PlatformSubscriptionPlan" psp ON cps.plan_id = psp.id
         WHERE cps.creator_id = $1 AND cps.status IN ('active', 'trial')
         ORDER BY cps.created_at DESC
         LIMIT 1`,
        [creatorId],
      )

      if (result.rows.length > 0) {
        res.status(200).json({
          success: true,
          data: result.rows[0],
        })
      } else {
        res.status(200).json({
          success: true,
          data: null,
        })
      }
    } catch (error: any) {
      logger.error('Error getting creator platform subscription:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get creator platform subscription',
      })
    }
  },
)

// Create platform subscription for creator
export const createPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id
    const { planId, customerId } = req.body

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      })
    }

    try {
      // Get creator details
      const creatorResult = await pool.query(
        'SELECT email, username, alias FROM "User" WHERE id = $1',
        [creatorId],
      )

      if (creatorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Creator not found',
        })
      }

      // Check if plan exists
      const planResult = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE id = $1 AND is_active = true',
        [planId],
      )

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Platform subscription plan not found',
        })
      }

      const plan = planResult.rows[0]

      // Check if creator already has an active platform subscription
      const existingSubscriptionResult = await pool.query(
        'SELECT * FROM "CreatorPlatformSubscription" WHERE creator_id = $1 AND status IN ($2, $3)',
        [creatorId, 'active', 'trial'],
      )

      if (existingSubscriptionResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active platform subscription',
        })
      }

      // For development/testing, skip Stripe integration
      const stripeCustomerId = customerId || 'test_customer_' + Date.now()
      const paymentIntentId = 'test_payment_intent_' + Date.now()

      // Calculate end date
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + plan.duration_days)

      // Create platform subscription in database
      const subscriptionResult = await pool.query(
        `INSERT INTO "CreatorPlatformSubscription"
         (creator_id, plan_id, end_date, payment_method, external_payment_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [creatorId, planId, endDate, 'test', paymentIntentId],
      )

      const subscription = subscriptionResult.rows[0]

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
          'usd',
          'test',
          paymentIntentId,
          'completed', // For testing, mark as completed
          'platform_subscription',
          `Platform subscription to ${plan.name} plan`,
        ],
      )

      // Update user's platform subscription status
      await pool.query(
        `UPDATE "User"
         SET platform_subscription_status = 'active',
             platform_subscription_end_date = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [endDate, creatorId],
      )

      res.status(201).json({
        success: true,
        message: 'Platform subscription created successfully',
        data: {
          subscription,
          transaction: transactionResult.rows[0],
          paymentIntent: {
            id: paymentIntentId,
            clientSecret: 'test_secret',
            amount: plan.price * 100,
            currency: 'usd',
          },
          customerId: stripeCustomerId,
        },
      })
    } catch (error: any) {
      logger.error('Error creating platform subscription:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create platform subscription',
      })
    }
  },
)

// Start free trial for creator
export const startFreeTrial = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorId = req.user?.id

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    try {
      // Check if creator has already used trial
      const userResult = await pool.query(
        'SELECT has_used_trial FROM "User" WHERE id = $1',
        [creatorId],
      )

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Creator not found',
        })
      }

      const user = userResult.rows[0]

      if (user.has_used_trial) {
        return res.status(400).json({
          success: false,
          message: 'You have already used your free trial',
        })
      }

      // Check if creator already has an active subscription
      const existingSubscriptionResult = await pool.query(
        'SELECT * FROM "CreatorPlatformSubscription" WHERE creator_id = $1 AND status IN ($2, $3)',
        [creatorId, 'active', 'trial'],
      )

      if (existingSubscriptionResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active subscription or trial',
        })
      }

      // Get basic plan for trial
      const planResult = await pool.query(
        'SELECT * FROM "PlatformSubscriptionPlan" WHERE name = $1 AND is_active = true',
        ['Creator Basic'],
      )

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Basic plan not found for trial',
        })
      }

      const plan = planResult.rows[0]

      // Calculate trial dates (30 days)
      const trialStartDate = new Date()
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 30)

      // Create trial subscription
      const subscriptionResult = await pool.query(
        `INSERT INTO "CreatorPlatformSubscription"
         (creator_id, plan_id, status, start_date, end_date, payment_method, external_payment_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          creatorId,
          plan.id,
          'trial',
          trialStartDate,
          trialEndDate,
          'trial',
          'trial_' + Date.now(),
        ],
      )

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
        [trialEndDate, trialStartDate, trialEndDate, creatorId],
      )

      res.status(201).json({
        success: true,
        message: 'Free trial started successfully',
        data: {
          subscription: subscriptionResult.rows[0],
          trialEndDate,
        },
      })
    } catch (error: any) {
      logger.error('Error starting free trial:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start free trial',
      })
    }
  },
)

// Cancel platform subscription
export const cancelPlatformSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    let creatorId = req.user?.id
    const { subscriptionId } = req.params

    // For testing purposes, use a default creator ID if no authenticated user
    if (!creatorId) {
      creatorId = '922d9805-ee01-4f9b-a121-6129d684d4bf' // Test creator ID
    }

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required',
      })
    }

    try {
      // Update subscription status to cancelled
      const result = await pool.query(
        `UPDATE "CreatorPlatformSubscription"
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND creator_id = $2
         RETURNING *`,
        [subscriptionId, creatorId],
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found',
        })
      }

      // Update user's platform subscription status
      await pool.query(
        `UPDATE "User"
         SET platform_subscription_status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`,
        [creatorId],
      )

      res.status(200).json({
        success: true,
        message: 'Platform subscription cancelled successfully',
        data: result.rows[0],
      })
    } catch (error: any) {
      logger.error('Error cancelling platform subscription:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel platform subscription',
      })
    }
  },
)

// Check if creator has permission to post
export const checkCreatorPostingPermission = asyncHandler(
  async (req: Request, res: Response) => {
    let creatorId = req.user?.id

    // For testing purposes, use a default creator ID if no authenticated user
    if (!creatorId) {
      creatorId = '922d9805-ee01-4f9b-a121-6129d684d4bf' // Test creator ID
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
        [creatorId],
      )

      if (subscriptionResult.rows.length > 0) {
        const subscription = subscriptionResult.rows[0]
        res.status(200).json({
          success: true,
          canPost: true,
          subscription: {
            id: subscription.id,
            planName: subscription.plan_name,
            status: subscription.status,
            endDate: subscription.end_date,
          },
        })
      } else {
        res.status(200).json({
          success: true,
          canPost: false,
          message: 'No active platform subscription found',
        })
      }
    } catch (error: any) {
      logger.error('Error checking creator posting permission:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check posting permission',
      })
    }
  },
)
