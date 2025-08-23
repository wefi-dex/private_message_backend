require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function runEmailVerificationMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔧 Running email verification migration...')

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Read and execute the migration
      const migrationPath = path.join(
        __dirname,
        'postgre/add_email_verification.sql',
      )
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

      console.log('Migration SQL:', migrationSQL)

      // Split and execute each statement
      const statements = migrationSQL.split(';').filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement)
          console.log('✅ Executed:', statement.trim().substring(0, 50) + '...')
        }
      }

      await client.query('COMMIT')
      console.log('✅ Email verification migration completed successfully!')

      // Verify the columns were added
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'User' AND column_name IN ('email', 'email_verified', 'verification_code', 'verification_code_expires')
        ORDER BY column_name
      `)

      console.log('✅ Verified columns:')
      result.rows.forEach((row) => {
        console.log(
          `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`,
        )
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
runEmailVerificationMigration()
