/**
 * One-off: check creator_demo@kevesta.com user (id, email, username, role).
 * Run: npx ts-node scripts/check-demo-user.ts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
import pool from '../src/util/postgre';

async function main() {
  const res = await pool.query(
    `SELECT id, email, username, role FROM "User" WHERE LOWER(TRIM(email)) = $1`,
    ['creator_demo@kevesta.com']
  );
  if (res.rows.length === 0) {
    console.log('No user found with email creator_demo@kevesta.com');
  } else {
    const u = res.rows[0];
    console.log('User found:');
    console.log('  id:', u.id);
    console.log('  email:', u.email);
    console.log('  username:', u.username == null ? '(NULL)' : u.username === '' ? '(empty string)' : JSON.stringify(u.username));
    console.log('  role:', u.role);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
