-- PaymentTransaction: fan-to-creator payments (subscriptions, tips). Referenced by PaymentIssue and analytics.
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('subscription', 'tip', 'platform_subscription')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    external_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_creator_id ON "PaymentTransaction"(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_subscriber_id ON "PaymentTransaction"(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_status ON "PaymentTransaction"(status);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_created_at ON "PaymentTransaction"(created_at);

-- UserMembership: fan subscription tier per user (Apple IAP). Code may create on-the-fly; ensure table exists.
CREATE TABLE IF NOT EXISTS "UserMembership" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,
    payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_membership_user_id ON "UserMembership"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_membership_tier ON "UserMembership"(tier);
