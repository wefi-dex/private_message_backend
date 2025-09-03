-- Migration: Add creator approval fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS creator_approved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creator_approval_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS creator_approval_admin_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS creator_approval_notes TEXT;

-- Add index for creator approval lookups
CREATE INDEX IF NOT EXISTS idx_user_creator_approved ON "User"(creator_approved);
CREATE INDEX IF NOT EXISTS idx_user_role_creator ON "User"(role) WHERE role = 'creator';
