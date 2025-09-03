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
    console.log('Starting creator feed migration...')

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      'postgre',
      'creator_feed_schema.sql',
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    await pool.query(sql)

    console.log('✅ Creator feed migration completed successfully!')
    console.log(
      'Created tables: creator_posts, post_likes, post_comments, followers',
    )
    console.log('Added indexes and triggers for better performance')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)

    // If tables already exist, that's okay
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables already exist, migration skipped')
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
    console.log('Migration process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration process failed:', error)
    process.exit(1)
  })
