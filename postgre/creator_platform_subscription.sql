-- Creator Platform Subscription Schema
-- This file creates the necessary tables for creators to pay the platform for posting privileges

-- Platform Subscription Plans Table
CREATE TABLE IF NOT EXISTS "PlatformSubscriptionPlan" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_days INTEGER NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Creator Platform Subscriptions Table
CREATE TABLE IF NOT EXISTS "CreatorPlatformSubscription" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES "PlatformSubscriptionPlan"(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    payment_method VARCHAR(50),
    external_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform Payment Transactions Table
CREATE TABLE IF NOT EXISTS "PlatformPaymentTransaction" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES "CreatorPlatformSubscription"(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    external_payment_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_type VARCHAR(20) DEFAULT 'platform_subscription' CHECK (transaction_type IN ('platform_subscription', 'platform_feature')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default platform subscription plans
INSERT INTO "PlatformSubscriptionPlan" (name, description, price, duration_days, features) VALUES
('Creator Basic', 'Basic creator platform subscription - allows posting content', 9.99, 30, '{"posting": true, "basic_analytics": true, "standard_support": true}'),
('Creator Pro', 'Professional creator platform subscription with advanced features', 19.99, 30, '{"posting": true, "advanced_analytics": true, "priority_support": true, "custom_branding": true, "scheduled_posts": true}'),
('Creator Elite', 'Elite creator platform subscription with all premium features', 49.99, 30, '{"posting": true, "advanced_analytics": true, "priority_support": true, "custom_branding": true, "scheduled_posts": true, "exclusive_features": true, "dedicated_manager": true}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creator_platform_subscription_creator_id ON "CreatorPlatformSubscription"(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_platform_subscription_status ON "CreatorPlatformSubscription"(status);
CREATE INDEX IF NOT EXISTS idx_platform_payment_transaction_creator_id ON "PlatformPaymentTransaction"(creator_id);
CREATE INDEX IF NOT EXISTS idx_platform_payment_transaction_status ON "PlatformPaymentTransaction"(status);

-- Add platform subscription status to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS platform_subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (platform_subscription_status IN ('active', 'inactive', 'expired', 'pending', 'trial'));
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS platform_subscription_end_date TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;
