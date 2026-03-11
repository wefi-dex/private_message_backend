-- Manually grant active platform subscription to creator_demo@kevesta.com
-- so they see the "subscribed" UI and can use creator features (invite, posting) without payment.
-- Run once: psql $DATABASE_URL -f postgre/seed_creator_demo_active_subscription.sql
-- Or: node -e "require('dotenv').config(); const {Pool}=require('pg'); const fs=require('fs'); const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}}); p.query(fs.readFileSync('postgre/seed_creator_demo_active_subscription.sql','utf8')).then(()=>{console.log('OK'); p.end();}).catch(e=>{console.error(e); p.end(); process.exit(1);});"

-- 1) Remove any existing platform subscription for this creator (so re-run is safe)
DELETE FROM "CreatorPlatformSubscription"
WHERE creator_id = (SELECT id FROM "User" WHERE LOWER(TRIM(email)) = 'creator_demo@kevesta.com' AND role = 'creator' LIMIT 1);

-- 2) Insert active platform subscription (uses first active plan by price)
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
  'manual_seed',
  'seed_creator_demo'
FROM "User" u
WHERE LOWER(TRIM(u.email)) = 'creator_demo@kevesta.com'
  AND u.role = 'creator'
LIMIT 1;

-- 3) Update User so app sees platform_subscription_status = 'active' and end_date
UPDATE "User"
SET
  platform_subscription_status = 'active',
  platform_subscription_end_date = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'creator_demo@kevesta.com'
  AND role = 'creator';
