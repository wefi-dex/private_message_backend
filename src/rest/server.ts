import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import allRoutes from "./route";
import { config } from "../config";
import { logger } from "../util/logger";
import userAuthMiddleware from "./middleware/validAuth";
import pool from "../util/postgre";
import { fileService } from "../util/fileService";

export class REST {
  public app = express();

  constructor() {
    // Log every request
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      next();
    });

    // CORS configuration - Allow all origins (for development/production flexibility)
    // WARNING: In production, consider restricting to specific domains for security
    this.app.use(
      cors({
        origin: true, // Allow all origins
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Origin",
          "Accept",
          "Cache-Control",
          "X-File-Name",
        ],
        exposedHeaders: ["Content-Disposition"],
        preflightContinue: false,
        optionsSuccessStatus: 204,
      }) as unknown as express.RequestHandler
    );
    this.app.use(helmet());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ limit: "10mb", extended: true }));

    // Error handler for payload too large
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        if (err.type === "entity.too.large") {
          return res.status(413).json({
            success: false,
            message:
              "Request payload too large. Please try with a smaller image or reduce image quality.",
          });
        }
        next(err);
      }
    );

    // Public file download endpoints (no authentication required)
    // Serve files from uploads folder via /uploads/:filename route
    this.app.get("/uploads/:filename", async (req, res) => {
      const { filename } = req.params;

      try {
        const fileInfo = await fileService.getFileInfo(filename);
        if (!fileInfo) {
          return res
            .status(404)
            .json({ success: false, message: "File not found." });
        }

        const { stream } = fileService.createFileStream(filename);

        // Set CORS headers for image/file access
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header(
          "Content-Type",
          fileInfo.mimeType || "application/octet-stream"
        );
        res.header(
          "Content-Disposition",
          `inline; filename="${fileInfo.filename}"`
        );
        res.header("Content-Length", fileInfo.size.toString());

        stream.pipe(res);

        stream.on("error", () => {
          if (!res.headersSent) {
            res
              .status(500)
              .json({ success: false, message: "Error reading file." });
          }
        });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: "Error serving file." });
      }
    });

    // Protected API routes (authentication required)
    this.app.use("/api", userAuthMiddleware);
    this.app.use("/api", allRoutes);
    this.app.use("/api", (req, res) => {
      res.status(404).json({ success: false, message: "Not found" });
    });

    // Global error handler - must be after all routes
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        logger.error("Unhandled error:", err);

        // Don't send response if headers already sent
        if (res.headersSent) {
          return next(err);
        }

        // Return JSON error response
        res.status(err.status || 500).json({
          success: false,
          message:
            err.message ||
            "An unexpected error occurred. Please try again later.",
          error: err.type || "internal_server_error",
          ...(config.isDevelopment && { stack: err.stack }),
        });
      }
    );

    this.app.get("/ping", (_req: Request, res: Response) => {
      res.send("pong");
    });

    // Debug endpoint to view all users (for development only)
    if (config.isDevelopment) {
      this.app.get("/debug/users", async (_req: Request, res: Response) => {
        try {
          const result = await pool.query(
            'SELECT id, username, email, alias, bio, avatar, role, created_at FROM "User" ORDER BY created_at DESC'
          );
          res.json({
            success: true,
            message: "All users from database",
            count: result.rows.length,
            users: result.rows,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: "Database error" });
        }
      });
    }

    // Keep this for non-API routes
    this.app.use((_, res) => {
      res.status(404).send("Not found");
    });

    this.app.listen(config.port, "0.0.0.0", async () => {
      logger.info(
        `API is running on port ${config.port} and accessible from all network interfaces`
      );
    });
  }
}
