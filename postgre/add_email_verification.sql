-- Migration: Add email verification fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);

-- Add index for verification code lookups
CREATE INDEX IF NOT EXISTS idx_user_verification_code ON "User"(verification_code);
