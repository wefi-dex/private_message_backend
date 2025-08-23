require('dotenv').config()
const { Pool } = require('pg')

// Database configuration - using the same as the main app
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://username:password@localhost:5432/private_message_db',
})

async function clearDatabase() {
  const client = await pool.connect()

  try {
    console.log('Starting database cleanup...')

    // Disable foreign key checks temporarily (if needed)
    await client.query('SET session_replication_role = replica;')

    // Clear all tables in the correct order (respecting foreign key constraints)
    const tables = ['UserReport', 'UserBlock', 'User']

    for (const table of tables) {
      console.log(`Clearing table: ${table}`)
      await client.query(`DELETE FROM "${table}";`)
      console.log(`✓ Cleared ${table}`)
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;')

    console.log('\n✅ Database cleared successfully!')
    console.log('All user data, reports, and blocks have been removed.')
    console.log('Table structures are preserved.')
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the script
clearDatabase()
  .then(() => {
    console.log('Database cleanup completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error)
    process.exit(1)
  })
