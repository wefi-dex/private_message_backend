import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import allRoutes from './route'
import { config } from '../config'
import { logger } from '../util/logger'
import userAuthMiddleware from './middleware/validAuth'

export class REST {
  public app = express()

  constructor() {
    // Log every request
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      next();
    });

    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, AUTHORIZATION',
      )
      next()
    })

    this.app.use(cors({
      origin: config.cors.origin.split(',').map(origin => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }))
    this.app.use(helmet())
    this.app.use(express.json())
    
    // Public file download endpoint (no authentication required)
    this.app.get('/files/:filename', (req, res) => {
      const { filename } = req.params;
      const filePath = require('path').join(__dirname, '../../../uploads', filename);
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }
      res.download(filePath, filename);
    });
    
    // Protected API routes (authentication required)
    this.app.use('/api', userAuthMiddleware)
    this.app.use('/api', allRoutes)
    this.app.use('/api', (req, res) => {
      res.status(404).json({ success: false, message: 'Not found' });
    });

    // Keep this for non-API routes
    this.app.use((_, res) => {
      res.status(404).send('Not found');
    });

    this.app.get('/ping', (_req: Request, res: Response) => {
      res.send('pong')
    })

    this.app.listen(config.port, '0.0.0.0', async () => {
      logger.info(`API is running on port ${config.port} and accessible from all network interfaces`)
    })
  }
}
