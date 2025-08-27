import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../../config";
import { promisify } from "util";

// Promisify jwt.verify for async/await usage
const verifyAsync = promisify<string, jwt.Secret, jwt.VerifyOptions | undefined, string | JwtPayload>(jwt.verify);

const userAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Allow unauthenticated access to certain routes
  if (
    req.path.startsWith("/auth") ||
    (req.path === "/user" && req.method === "POST") ||
    (req.path === "/check-username" && req.method === "GET") ||
    req.path.startsWith("/reports") ||
    req.path.startsWith("/analytics") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/file") ||
    req.path.startsWith("/download") ||
    req.path.startsWith("/files")
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];

  let token: string | undefined;
  if (authHeader) {
    // Accept both 'Bearer <token>' and '<token>'
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  }

  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }

  try {
    const decoded = (await verifyAsync(token, config.jwt.secret)) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default userAuthMiddleware;
