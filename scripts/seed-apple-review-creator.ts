/**
 * One-off: grant active platform subscription to creator_demo@kevesta.com
 * so they have full permission (invite link, posting) for Apple review.
 * Run: npx ts-node scripts/seed-apple-review-creator.ts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
import pool from '../src/util/postgre';

const SQL = `
INSERT INTO "CreatorPlatformSubscription" (
  creator_id,
  plan_id,
  status,
  start_date,
  end_date,
  auto_renew,
  payment_method,
  external_payment_id
)
SELECT
  u.id,
  (SELECT id FROM "PlatformSubscriptionPlan" WHERE is_active = true ORDER BY price ASC LIMIT 1),
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  false,
  'apple_review',
  'apple_review_creator_demo'
FROM "User" u
WHERE LOWER(TRIM(u.email)) = 'creator_demo@kevesta.com'
  AND u.role = 'creator'
  AND NOT EXISTS (
    SELECT 1 FROM "CreatorPlatformSubscription" cps
    WHERE cps.creator_id = u.id AND cps.status = 'active' AND cps.end_date > NOW()
  )
`;

async function main() {
  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, email, role FROM "User" WHERE LOWER(TRIM(email)) = 'creator_demo@kevesta.com'`
    );
    if (userRes.rows.length === 0) {
      console.log('User creator_demo@kevesta.com not found in this database. Create the account first or run against the DB where it exists.');
      return;
    }
    const user = userRes.rows[0];
    if (user.role !== 'creator') {
      await client.query(
        `UPDATE "User" SET role = 'creator', updated_at = NOW() WHERE id = $1`,
        [user.id]
      );
      console.log(`Updated role from "${user.role}" to "creator" for creator_demo@kevesta.com.`);
    }

    const existingRes = await client.query(
      `SELECT 1 FROM "CreatorPlatformSubscription" WHERE creator_id = $1 AND status = 'active' AND end_date > NOW()`,
      [user.id]
    );
    if (existingRes.rows.length > 0) {
      console.log('User already has an active platform subscription. No insert needed.');
      return;
    }

    const res = await client.query(SQL);
    const rowCount = res.rowCount ?? 0;
    if (rowCount > 0) {
      console.log('OK: Inserted active platform subscription for creator_demo@kevesta.com');
    } else {
      console.log('No row inserted (unexpected).');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
