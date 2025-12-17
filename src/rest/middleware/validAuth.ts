import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { config } from '../../config'

const userAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Allow unauthenticated access to /auth, POST /user (registration), and admin endpoints
  // Check both req.path (relative to mount point) and req.originalUrl (full path)
  const path = req.path;
  const originalUrl = req.originalUrl || req.url;
  
  // Helper to check if path matches any of the allowed patterns
  const isAllowedPath = (checkPath: string) => {
    return (
      checkPath.startsWith('/auth') ||
      (checkPath === '/user' && req.method === 'POST') ||
      (checkPath === '/check-username' && req.method === 'GET') ||
      checkPath.startsWith('/reports') ||
      checkPath.startsWith('/analytics') ||
      checkPath.startsWith('/admin')
    );
  };
  
  if (isAllowedPath(path) || isAllowedPath(originalUrl)) {
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
