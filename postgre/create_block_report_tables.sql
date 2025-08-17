-- SQL migration to create Block and Report tables
CREATE TABLE IF NOT EXISTS "UserBlock" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS "UserReport" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_block_blocker ON "UserBlock"(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_block_blocked ON "UserBlock"(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_report_reporter ON "UserReport"(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_report_reported ON "UserReport"(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_report_status ON "UserReport"(status); 