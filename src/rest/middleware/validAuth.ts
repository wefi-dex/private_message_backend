import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { config } from '../../config'

const userAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Payment endpoints require authentication - verify token first
  const paymentEndpoints = ['/payment/create-intent', '/subscription/upgrade']
  const isPaymentEndpoint = paymentEndpoints.some((endpoint) =>
    req.path.includes(endpoint),
  )

  // Allow unauthenticated access to authentication endpoints, public file downloads, subscription plans, and admin endpoints
  const publicPaths = [
    req.path.startsWith('/auth'),
    req.path === '/user' && req.method === 'POST',
    req.path === '/check-username' && req.method === 'GET',
    req.path === '/by-username' && req.method === 'GET', // Allow public username lookup for invite codes
    req.path.startsWith('/files'), // Public file downloads only
    req.path.startsWith('/file/upload'), // Allow image/file uploads during onboarding
    req.path === '/subscription-plans', // Public subscription plans
    req.path.startsWith('/admin'), // Admin endpoints (for simplified admin panel)
    req.path.startsWith('/analytics'), // Analytics endpoints (for simplified admin panel)
    req.path.startsWith('/reports'), // Reports endpoints (for simplified admin panel)
    req.path === '/user-subscriptions', // User subscriptions endpoint (for simplified admin panel)
    req.path.startsWith('/creator') && !req.path.includes('/payment-'), // Creator feed endpoints (for testing) but not payment settings
    req.path.startsWith('/posts'), // Posts endpoints (for testing)
    req.path.startsWith('/fan'), // Fan feed endpoints (for testing)
  ]

  // If it's a public path and not a payment endpoint, allow through
  if (
    publicPaths.some((condition) => condition === true) &&
    !isPaymentEndpoint
  ) {
    return next()
  }

  // For payment endpoints and protected routes, verify authentication
  const authHeader = req.headers['authorization']

  let token = undefined
  if (authHeader) {
    // Accept both 'Bearer <token>' and just '<token>'
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      token = authHeader
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid token.',
    })
  }

  jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      })
    }
    req.user = decoded as JwtPayload
    next()
  })
}

export default userAuthMiddleware
