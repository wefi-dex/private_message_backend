-- Add creator profile fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS creator_profile_completed BOOLEAN DEFAULT FALSE;

-- Add index for creator profile completion
CREATE INDEX IF NOT EXISTS idx_user_creator_profile_completed ON "User"(creator_profile_completed);

-- Add index for creator approval status
CREATE INDEX IF NOT EXISTS idx_user_creator_approved ON "User"(creator_approved);

-- Update existing users to have creator_profile_completed = false
UPDATE "User" SET creator_profile_completed = FALSE WHERE creator_profile_completed IS NULL;
