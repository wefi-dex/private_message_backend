import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { config } from '../../config'

const userAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Allow unauthenticated access to authentication endpoints, public file downloads, subscription plans, and admin endpoints
  if (
    req.path.startsWith('/auth') ||
    (req.path === '/user' && req.method === 'POST') ||
    (req.path === '/check-username' && req.method === 'GET') ||
    req.path.startsWith('/files') || // Public file downloads only
    req.path === '/subscription-plans' || // Public subscription plans
    // req.path.startsWith('/platform') || // Platform subscription endpoints (for testing)
    req.path.startsWith('/admin') || // Admin endpoints (for simplified admin panel)
    req.path.startsWith('/analytics') || // Analytics endpoints (for simplified admin panel)
    req.path.startsWith('/reports') || // Reports endpoints (for simplified admin panel)
    req.path === '/user-subscriptions' || // User subscriptions endpoint (for simplified admin panel)
    (req.path.startsWith('/creator') && !req.path.includes('/payment-')) || // Creator feed endpoints (for testing) but not payment settings
    req.path.startsWith('/posts') || // Posts endpoints (for testing)
    req.path.startsWith('/fan') // Fan feed endpoints (for testing)
  ) {
    return next()
  }

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
    return res.status(403).json({ message: 'Token is required' })
  }

  jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    req.user = decoded as JwtPayload
    next()
  })
}

export default userAuthMiddleware
