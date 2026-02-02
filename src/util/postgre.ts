require('dotenv').config();
import { Pool } from 'pg';
import { config } from '../config';

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = config.database.url || '';

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  // Render and most managed Postgres require SSL; localhost does not
  ssl:
    isProduction || (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))
      ? { rejectUnauthorized: false }
      : false,
});

// Handle pool errors
pool.on('error', () => {
  process.exit(-1);
});

export default pool;
