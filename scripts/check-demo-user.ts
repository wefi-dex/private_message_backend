/**
 * One-off: check creator_demo@kevesta.com user (id, email, username, role).
 * Run: npx ts-node scripts/check-demo-user.ts
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
})
import pool from '../src/util/postgre'

async function main() {
  const res = await pool.query(
    `SELECT id, email, username, role FROM "User" WHERE LOWER(TRIM(email)) = $1`,
    ['creator_demo@kevesta.com'],
  )
  if (res.rows.length === 0) {
    return
  }
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
