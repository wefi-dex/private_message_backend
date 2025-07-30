const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/private_message'
});

async function runMigration() {
  try {
    console.log('Running block and report tables migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'postgre', 'create_block_report_tables.sql'), 
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Block and report tables created successfully');
    
    // Test the tables by checking if they exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('UserBlock', 'UserReport')
    `);
    
    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 