import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import allRoutes from './route'
import { config } from '../config'
import { logger } from '../util/logger'
import userAuthMiddleware from './middleware/validAuth'
import pool from '../util/postgre'

export class REST {
  public app = express()

  constructor() {
    // Log every request
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      next()
    })

    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, AUTHORIZATION',
      )
      next()
    })

    this.app.use(
      cors({
        origin: config.cors.origin.split(',').map((origin) => origin.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      }),
    )
    this.app.use(helmet())
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }))

    // Error handler for payload too large
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        if (err.type === 'entity.too.large') {
          return res.status(413).json({
            success: false,
            message:
              'Request payload too large. Please try with a smaller image or reduce image quality.',
          })
        }
        next(err)
      },
    )

    // Public file download endpoint (no authentication required)
    this.app.get('/files/:filename', (req, res) => {
      const { filename } = req.params
      const filePath = require('path').join(
        __dirname,
        '../../../uploads',
        filename,
      )
      const fs = require('fs')
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, message: 'File not found.' })
      }
      res.download(filePath, filename)
    })

    // Protected API routes (authentication required)
    this.app.use('/api', userAuthMiddleware)
    this.app.use('/api', allRoutes)
    this.app.use('/api', (req, res) => {
      res.status(404).json({ success: false, message: 'Not found' })
    })

    this.app.get('/ping', (_req: Request, res: Response) => {
      res.send('pong')
    })

    // Debug endpoint to view all users (for development only)
    this.app.get('/debug/users', async (_req: Request, res: Response) => {
      try {
        const result = await pool.query(
          'SELECT id, username, email, alias, bio, avatar, role, created_at FROM "User" ORDER BY created_at DESC',
        )
        
        res.json({
          success: true,
          message: 'All users from database',
          count: result.rows.length,
          users: result.rows,
        })
      } catch (error) {
        console.error('Debug endpoint error:', error)
        res.status(500).json({ success: false, message: 'Database error' })
      }
    })

    // Keep this for non-API routes
    this.app.use((_, res) => {
      res.status(404).send('Not found')
    })

    this.app.listen(config.port, '0.0.0.0', async () => {
      logger.info(
        `API is running on port ${config.port} and accessible from all network interfaces`,
      )
    })
  }
}
