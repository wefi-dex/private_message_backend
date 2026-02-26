-- Grant active platform subscription to Apple review creator account
-- so they have full permission (invite link, posting) without code changes.
-- Run once after the creator_demo@kevesta.com user exists.

-- Insert active platform subscription for creator_demo@kevesta.com
-- Uses the first active plan; end_date = 1 year from now.
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
  );
