/**
 * Run all PostgreSQL migrations in order.
 * Usage: DATABASE_URL="postgresql://..." node run-migrations.js
 * Or: npm run db:migrate (after adding script)
 */
require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const MIGRATION_ORDER = [
  'create_user_table.sql',
  'add_role_to_user.sql',
  'add_email_verification.sql',
  'add_password_reset.sql',
  'add_creator_approval.sql',
  'add_creator_profile_fields.sql',
  'add_banned_to_user.sql',
  'create_block_report_tables.sql',
  'creator_feed_schema.sql',
  'membership_plan_schema.sql',
  'creator_platform_subscription.sql',
  'create_payment_transaction_and_membership.sql',
  'payment_review_schema.sql',
];

const postgreDir = path.join(__dirname, 'postgre');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL. Set it in .env or: DATABASE_URL="postgresql://..." node run-migrations.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  console.log('Database URL:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
  try {
    for (const file of MIGRATION_ORDER) {
      const filePath = path.join(postgreDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn('Skip (not found):', file);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log('OK:', file);
    }
    console.log('All migrations completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
