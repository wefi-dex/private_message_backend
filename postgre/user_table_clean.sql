-- User table cleanup: consolidate schema reference and add missing indexes/constraints.
-- Run this after all other User migrations (create_user_table, add_*, payment_review_schema, creator_platform_subscription).
-- Safe to run multiple times (IF NOT EXISTS / DO blocks).

-- 1) Ensure username has an index for by-username lookups (invite links, login)
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(username);

-- 2) Optional: enforce unique username so invite links and login are unambiguous.
--    Uncomment if you want to enforce uniqueness (will fail if duplicate usernames exist).
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_unique ON "User"(username) WHERE username IS NOT NULL AND username != '';

-- 3) Index for role (creator/fan) for filtering
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);

-- 4) Index for created_at if you often sort/filter by signup date
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"(created_at);
