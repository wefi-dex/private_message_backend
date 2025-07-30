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

    this.app.use(cors())
    this.app.use(helmet())
    this.app.use(express.json())
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

    this.app.listen(config.port, async () => {
      logger.info(`API is running on port ${config.port}`)
    })
  }
}
