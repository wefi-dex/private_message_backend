-- Migration: Add password reset fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Add index for password reset code lookups
CREATE INDEX IF NOT EXISTS idx_user_password_reset_code ON "User"(password_reset_code);
