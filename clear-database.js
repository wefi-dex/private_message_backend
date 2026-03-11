require('dotenv').config()
const { Pool } = require('pg')

// Database configuration - use .env or pass DATABASE_URL (remote DBs like Render require SSL)
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://username:password@localhost:5432/private_message_db'
const pool = new Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
})

async function clearDatabase() {
  const client = await pool.connect()

  try {
    // Get all tables in public schema (quote identifiers for mixed-case names)
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    const tables = tablesResult.rows.map((r) => r.tablename)
    if (tables.length === 0) {
      return
    }
    // Quote each table name (required for mixed-case like "User", "MembershipPlan")
    const quoted = tables.map((t) => `"${t}"`).join(', ')
    await client.query(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`)
  } catch (error) {
    console.error('Clear database failed:', error.message)
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
  .catch((err) => {
    console.error('Clear database failed:', err.message)
    process.exit(1)
  })
