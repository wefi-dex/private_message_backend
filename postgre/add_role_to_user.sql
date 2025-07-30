-- Migration: Add 'role' column to User table for creator/fan distinction
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'fan'; 