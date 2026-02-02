-- Admin Payment Review System Schema
-- This file creates the necessary tables for admin payment review functionality

-- Payment Review Requests Table
CREATE TABLE IF NOT EXISTS "PaymentReviewRequest" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('payout', 'subscription_approval', 'payment_issue', 'refund_request')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    description TEXT,
    admin_notes TEXT,
    admin_id UUID REFERENCES "User"(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payout Requests Table
CREATE TABLE IF NOT EXISTS "PayoutRequest" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    admin_notes TEXT,
    admin_id UUID REFERENCES "User"(id),
    processed_at TIMESTAMP,
    stripe_payout_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Issues Table
CREATE TABLE IF NOT EXISTS "PaymentIssue" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('failed_payment', 'double_charge', 'refund_request', 'subscription_cancellation', 'billing_dispute')),
    transaction_id UUID REFERENCES "PaymentTransaction"(id),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    admin_notes TEXT,
    admin_id UUID REFERENCES "User"(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Creator Payment Verification Table
CREATE TABLE IF NOT EXISTS "CreatorPaymentVerification" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    verification_documents JSONB,
    admin_notes TEXT,
    admin_id UUID REFERENCES "User"(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Audit Log Table
CREATE TABLE IF NOT EXISTS "PaymentAuditLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES "User"(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_review_request_creator_id ON "PaymentReviewRequest"(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_review_request_status ON "PaymentReviewRequest"(status);
CREATE INDEX IF NOT EXISTS idx_payment_review_request_type ON "PaymentReviewRequest"(request_type);
CREATE INDEX IF NOT EXISTS idx_payout_request_creator_id ON "PayoutRequest"(creator_id);
CREATE INDEX IF NOT EXISTS idx_payout_request_status ON "PayoutRequest"(status);
CREATE INDEX IF NOT EXISTS idx_payment_issue_user_id ON "PaymentIssue"(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_issue_status ON "PaymentIssue"(status);
CREATE INDEX IF NOT EXISTS idx_payment_issue_priority ON "PaymentIssue"(priority);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_admin_id ON "PaymentAuditLog"(admin_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_entity ON "PaymentAuditLog"(entity_type, entity_id);

-- Add payment review related columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS payment_verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS payment_verification_notes TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS payout_details JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS minimum_payout_amount DECIMAL(10,2) DEFAULT 50.00;

-- Create a view for payment review dashboard
CREATE OR REPLACE VIEW "PaymentReviewDashboard" AS
SELECT
    prr.id,
    prr.creator_id,
    u.username as creator_username,
    u.alias as creator_alias,
    u.email as creator_email,
    prr.request_type,
    prr.amount,
    prr.currency,
    prr.status,
    prr.description,
    prr.created_at,
    CASE
        WHEN prr.status = 'pending' THEN 1
        WHEN prr.status = 'under_review' THEN 2
        WHEN prr.status = 'approved' THEN 3
        WHEN prr.status = 'rejected' THEN 4
        ELSE 5
    END as priority_order
FROM "PaymentReviewRequest" prr
JOIN "User" u ON prr.creator_id = u.id
WHERE prr.status IN ('pending', 'under_review')
ORDER BY priority_order, prr.created_at DESC;
