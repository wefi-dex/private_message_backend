import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { config } from '../../config'

const userAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Allow unauthenticated access to /auth, POST /user (registration), admin endpoints, and file operations
  if (
    req.path.startsWith('/auth') ||
    (req.path === '/user' && req.method === 'POST') ||
    (req.path === '/check-username' && req.method === 'GET') ||
    req.path.startsWith('/reports') ||
    req.path.startsWith('/analytics') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/file') ||
    req.path.startsWith('/download') ||
    req.path.startsWith('/files')
  ) {
    return next();
  }
  const authHeader = req.headers['authorization'];
  let token = undefined;
  if (authHeader) {
    // Accept both 'Bearer <token>' and just '<token>'
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }
  }
  if (!token) {
    return res.status(403).json({ message: 'Token is required' })
  }
  jwt.verify(
    token,
    config.jwt.secret,
    (err: any, decoded: any) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid token' })
      }
      req.user = decoded as JwtPayload
      next()
    },
  )
}

export default userAuthMiddleware
