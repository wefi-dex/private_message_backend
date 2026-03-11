/**
 * One-off: grant active platform subscription to creator_demo@kevesta.com
 * so they have full permission (invite link, posting) for Apple review.
 * Cleans any existing subscription for this user, then inserts a fresh one.
 * Run: npx ts-node scripts/seed-apple-review-creator.ts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
import pool from '../src/util/postgre';

const DEMO_EMAIL = 'creator_demo@kevesta.com';
/** Username used in invite link https://pm.me/invite/creatordemo - must exist in DB for lookup */
const DEMO_USERNAME = 'creatordemo';

const INSERT_SQL = `
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
WHERE LOWER(TRIM(u.email)) = $1
  AND u.role = 'creator'
`;

async function main() {
  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, email, role FROM "User" WHERE LOWER(TRIM(email)) = $1`,
      [DEMO_EMAIL]
    );
    if (userRes.rows.length === 0) {
      console.log(`User ${DEMO_EMAIL} not found. Create the account first or run against the DB where it exists.`);
      return;
    }
    const user = userRes.rows[0];
    if (user.role !== 'creator') {
      await client.query(
        `UPDATE "User" SET role = 'creator', updated_at = NOW() WHERE id = $1`,
        [user.id]
      );
      console.log(`Updated role to "creator" for ${DEMO_EMAIL}.`);
    }

    // Ensure demo user has a valid username so invite link (pm.me/invite/USERNAME) and lookup work
    const currentUsername = (user.username && String(user.username).trim()) || '';
    if (currentUsername !== DEMO_USERNAME) {
      await client.query(
        `UPDATE "User" SET username = $1, updated_at = NOW() WHERE id = $2`,
        [DEMO_USERNAME, user.id]
      );
      console.log(`Set username to "${DEMO_USERNAME}" for invite link (was: ${currentUsername || '(empty)'}).`);
    }

    // Clean: delete any existing platform subscriptions for this creator
    const deleteRes = await client.query(
      `DELETE FROM "CreatorPlatformSubscription" WHERE creator_id = $1`,
      [user.id]
    );
    const deleted = deleteRes.rowCount ?? 0;
    if (deleted > 0) {
      console.log(`Cleaned ${deleted} existing subscription row(s) for ${DEMO_EMAIL}.`);
    }

    // Insert fresh record
    const insertRes = await client.query(INSERT_SQL, [DEMO_EMAIL]);
    const inserted = insertRes.rowCount ?? 0;
    if (inserted > 0) {
      console.log(`OK: Inserted active platform subscription for ${DEMO_EMAIL}.`);
    } else {
      console.log('No row inserted (check that an active PlatformSubscriptionPlan exists).');
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
