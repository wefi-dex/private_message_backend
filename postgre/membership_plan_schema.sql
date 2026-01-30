-- Membership Plan Schema (for Apple In-App Purchase subscriptions)
-- These are the monthly membership plans (Gold, Platinum, Diamond) that users can subscribe to

CREATE TABLE IF NOT EXISTS "MembershipPlan" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "Gold Lounge", "Platinum Lounge", "Diamond Lounge"
    tier_key VARCHAR(20) NOT NULL UNIQUE, -- e.g., "gold", "platinum", "diamond"
    apple_product_id VARCHAR(255) NOT NULL UNIQUE, -- App Store Connect product ID
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    features JSONB, -- Array of feature strings
    display_order INTEGER DEFAULT 0, -- Order for display in UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default membership plans
INSERT INTO "MembershipPlan" (tier_name, tier_key, apple_product_id, price, currency, description, features, display_order) VALUES
('Gold Lounge', 'gold', 'com.tan1007.privatemessage.gold_monthly', 19.99, 'USD', 'Gold membership tier with essential features', '["Invite up to 50 fans", "Private 1:1 chats in your lounge", "QR code invitations for fans", "Essential lounge customization options", "Priority onboarding support"]', 1),
('Platinum Lounge', 'platinum', 'com.tan1007.privatemessage.platinum_monthly', 49.99, 'USD', 'Platinum membership tier with premium features', '["Invite up to 50 fans", "Private 1:1 chats in your lounge", "QR code invitations for fans", "Essential lounge customization options", "Priority onboarding support"]', 2),
('Diamond Lounge', 'diamond', 'com.tan1007.privatemessage.diamond_monthly', 99.99, 'USD', 'Diamond membership tier with all premium features', '["Invite up to 50 fans", "Private 1:1 chats in your lounge", "QR code invitations for fans", "Essential lounge customization options", "Priority onboarding support"]', 3)
ON CONFLICT (tier_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_plan_tier_key ON "MembershipPlan"(tier_key);
CREATE INDEX IF NOT EXISTS idx_membership_plan_apple_product_id ON "MembershipPlan"(apple_product_id);
CREATE INDEX IF NOT EXISTS idx_membership_plan_is_active ON "MembershipPlan"(is_active);
