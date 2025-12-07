const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Database configuration
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://username:password@localhost:5432/private_message_db',
})

async function runMigration() {
  try {

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      'postgre',
      'creator_feed_schema.sql',
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    await pool.query(sql)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)

    // If tables already exist, that's okay
    if (error.message.includes('already exists')) {
      return
    }

    throw error
  } finally {
    await pool.end()
  }
}

// Run the migration
runMigration()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration process failed:', error)
    process.exit(1)
  })
