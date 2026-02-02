require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'postgre', 'membership_plan_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the whole script (CREATE TABLE, INSERT, CREATE INDEX)
    await client.query(sql);
    console.log('MembershipPlan table created and default plans inserted.');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('MembershipPlan table or indexes already exist.');
      return;
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
