-- Keep only one membership plan active (Gold). Deactivate Platinum and Diamond.
UPDATE "MembershipPlan"
SET is_active = false, updated_at = NOW()
WHERE tier_key IN ('platinum', 'diamond');
