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

    // Disable foreign key checks temporarily (if needed)
    await client.query('SET session_replication_role = replica;')

    // Clear all tables in the correct order (respecting foreign key constraints)
    const tables = ['UserReport', 'UserBlock', 'User']

    for (const table of tables) {
      await client.query(`DELETE FROM "${table}";`)
    }
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;')
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
    process.exit(0)
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error)
    process.exit(1)
  })
