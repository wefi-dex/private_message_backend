import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import pool from '../../util/postgre'
import { logger } from '../../util/logger'

// Get comprehensive analytics dashboard
export const getAnalyticsDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const { period = 'monthly', start_date, end_date } = req.query
    const adminId = req.user?.id

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    try {
      // Calculate date range
      const endDate = end_date ? new Date(end_date as string) : new Date()
      const startDate = start_date ? new Date(start_date as string) : new Date()

      if (period === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (period === 'yearly') {
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      // Get revenue analytics
      const revenueResult = await pool.query(
        `SELECT
          SUM(CASE WHEN transaction_type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
          SUM(CASE WHEN transaction_type = 'tip' THEN amount ELSE 0 END) as tip_revenue,
          SUM(amount) as total_revenue,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN transaction_type = 'subscription' THEN 1 END) as subscription_count,
          COUNT(CASE WHEN transaction_type = 'tip' THEN 1 END) as tip_count,
          AVG(amount) as average_transaction_value
        FROM "PaymentTransaction"
        WHERE status = 'completed'
        AND created_at >= $1 AND created_at <= $2`,
        [startDate, endDate],
      )

      // Get user analytics
      const userResult = await pool.query(
        `SELECT
          COUNT(DISTINCT creator_id) as active_creators,
          COUNT(DISTINCT subscriber_id) as active_subscribers,
          COUNT(DISTINCT CASE WHEN transaction_type = 'subscription' THEN subscriber_id END) as subscription_users,
          COUNT(DISTINCT CASE WHEN transaction_type = 'tip' THEN subscriber_id END) as tip_users
        FROM "PaymentTransaction"
        WHERE status = 'completed'
        AND created_at >= $1 AND created_at <= $2`,
        [startDate, endDate],
      )

      // Get top performing creators
      const topCreatorsResult = await pool.query(
        `SELECT
          u.username,
          u.alias,
          SUM(pt.amount) as total_earnings,
          COUNT(DISTINCT pt.subscriber_id) as total_subscribers,
          COUNT(CASE WHEN pt.transaction_type = 'subscription' THEN 1 END) as subscription_count,
          COUNT(CASE WHEN pt.transaction_type = 'tip' THEN 1 END) as tip_count
        FROM "PaymentTransaction" pt
        JOIN "User" u ON pt.creator_id = u.id
        WHERE pt.status = 'completed'
        AND pt.created_at >= $1 AND pt.created_at <= $2
        GROUP BY u.id, u.username, u.alias
        ORDER BY total_earnings DESC
        LIMIT 10`,
        [startDate, endDate],
      )

      // Get daily revenue trend
      const dailyTrendResult = await pool.query(
        `SELECT
          DATE(created_at) as date,
          SUM(amount) as daily_revenue,
          COUNT(*) as daily_transactions,
          COUNT(DISTINCT creator_id) as daily_creators,
          COUNT(DISTINCT subscriber_id) as daily_subscribers
        FROM "PaymentTransaction"
        WHERE status = 'completed'
        AND created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30`,
        [startDate, endDate],
      )

      res.status(200).json({
        success: true,
        data: {
          period: {
            type: period,
            start_date: startDate,
            end_date: endDate,
          },
          revenue: revenueResult.rows[0],
          users: userResult.rows[0],
          top_creators: topCreatorsResult.rows,
          daily_trend: dailyTrendResult.rows,
        },
      })
    } catch (error: any) {
      logger.error('Error getting analytics dashboard:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics dashboard',
      })
    }
  },
)

// Get creator performance analytics
export const getCreatorPerformanceAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const { creator_id, period = 'monthly', start_date, end_date } = req.query
    const adminId = req.user?.id

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (!creator_id) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required',
      })
    }

    try {
      const endDate = end_date ? new Date(end_date as string) : new Date()
      const startDate = start_date ? new Date(start_date as string) : new Date()

      if (period === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (period === 'yearly') {
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      // Get creator performance data
      const performanceResult = await pool.query(
        `SELECT
          u.username,
          u.alias,
          u.email,
          u.total_earnings,
          u.monthly_earnings,
          COUNT(pt.id) as total_transactions,
          SUM(pt.amount) as period_earnings,
          COUNT(CASE WHEN pt.transaction_type = 'subscription' THEN 1 END) as subscription_count,
          COUNT(CASE WHEN pt.transaction_type = 'tip' THEN 1 END) as tip_count,
          COUNT(DISTINCT pt.subscriber_id) as unique_subscribers,
          AVG(pt.amount) as average_transaction_value,
          MAX(pt.created_at) as last_transaction_date
        FROM "User" u
        LEFT JOIN "PaymentTransaction" pt ON u.id = pt.creator_id
          AND pt.status = 'completed'
          AND pt.created_at >= $1 AND pt.created_at <= $2
        WHERE u.id = $3
        GROUP BY u.id, u.username, u.alias, u.email, u.total_earnings, u.monthly_earnings`,
        [startDate, endDate, creator_id],
      )

      // Get subscriber growth trend
      const subscriberTrendResult = await pool.query(
        `SELECT
          DATE(created_at) as date,
          COUNT(DISTINCT subscriber_id) as daily_subscribers
        FROM "PaymentTransaction"
        WHERE creator_id = $1
        AND status = 'completed'
        AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30`,
        [creator_id, startDate, endDate],
      )

      res.status(200).json({
        success: true,
        data: {
          creator_info: performanceResult.rows[0],
          subscriber_trend: subscriberTrendResult.rows,
        },
      })
    } catch (error: any) {
      logger.error('Error getting creator performance analytics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get creator performance analytics',
      })
    }
  },
)

// Track analytics event
export const trackAnalyticsEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const { event_type, event_data, session_id } = req.body
    const userId = req.user?.id

    if (!event_type) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required',
      })
    }

    try {
      const result = await pool.query(
        `INSERT INTO "AnalyticsEvent" (user_id, event_type, event_data, session_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          event_type,
          event_data || {},
          session_id,
          req.ip,
          req.get('User-Agent'),
        ],
      )

      res.status(201).json({
        success: true,
        data: result.rows[0],
      })
    } catch (error: any) {
      logger.error('Error tracking analytics event:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to track analytics event',
      })
    }
  },
)
