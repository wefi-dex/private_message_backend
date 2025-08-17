require('dotenv').config();
import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.database.url,
});

export default pool;
