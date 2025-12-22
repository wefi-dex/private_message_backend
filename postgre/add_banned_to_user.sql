-- Migration: Add 'banned' column to User table for admin ban functionality
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for better performance when checking banned status
CREATE INDEX IF NOT EXISTS idx_user_banned ON "User"(banned); 