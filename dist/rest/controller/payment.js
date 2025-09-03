"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCreatorPaymentAnalytics = exports.updateCreatorPaymentSettings = exports.cancelSubscription = exports.getCreatorSubscribers = exports.getUserSubscriptions = exports.sendTip = exports.createSubscription = exports.getCreatorSubscriptionInfo = exports.getSubscriptionPlans = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const postgre_1 = __importDefault(require("../../util/postgre"));
const stripe_1 = require("../../config/stripe");
// Get all subscription plans
exports.getSubscriptionPlans = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield postgre_1.default.query('SELECT * FROM "SubscriptionPlan" WHERE is_active = true ORDER BY price ASC');
        res.status(200).json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        // If table doesn't exist yet, return default plans
        if (error.message.includes('relation') &&
            error.message.includes('does not exist')) {
            res.status(200).json({
                success: true,
                data: [
                    {
                        id: 'basic-plan',
                        name: 'Basic',
                        description: 'Basic creator subscription with standard features',
                        price: 9.99,
                        currency: 'USD',
                        duration_days: 30,
                        features: {
                            messages: true,
                            exclusive_content: false,
                            priority_support: false,
                        },
                        is_active: true,
                    },
                    {
                        id: 'premium-plan',
                        name: 'Premium',
                        description: 'Premium subscription with exclusive content and priority support',
                        price: 19.99,
                        currency: 'USD',
                        duration_days: 30,
                        features: {
                            messages: true,
                            exclusive_content: true,
                            priority_support: true,
                            custom_tips: true,
                        },
                        is_active: true,
                    },
                    {
                        id: 'vip-plan',
                        name: 'VIP',
                        description: 'VIP subscription with all premium features and personal interaction',
                        price: 49.99,
                        currency: 'USD',
                        duration_days: 30,
                        features: {
                            messages: true,
                            exclusive_content: true,
                            priority_support: true,
                            custom_tips: true,
                            personal_calls: true,
                            exclusive_events: true,
                        },
                        is_active: true,
                    },
                ],
            });
        }
        else {
            throw error;
        }
    }
}));
// Get creator's subscription plans and settings
exports.getCreatorSubscriptionInfo = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { creatorId } = req.params;
    // Get creator's subscription settings
    const creatorResult = yield postgre_1.default.query('SELECT subscription_enabled, subscription_price, subscription_description, total_earnings, monthly_earnings FROM "User" WHERE id = $1', [creatorId]);
    if (creatorResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Creator not found',
        });
    }
    const creator = creatorResult.rows[0];
    // Get creator's payment settings
    const paymentSettingsResult = yield postgre_1.default.query('SELECT * FROM "CreatorPaymentSettings" WHERE creator_id = $1', [creatorId]);
    const paymentSettings = paymentSettingsResult.rows[0] || null;
    // Get active subscriptions count
    const subscriptionsResult = yield postgre_1.default.query('SELECT COUNT(*) as active_subscribers FROM "CreatorSubscription" WHERE creator_id = $1 AND status = $2', [creatorId, 'active']);
    const activeSubscribers = parseInt(subscriptionsResult.rows[0].active_subscribers);
    res.status(200).json({
        success: true,
        data: {
            creator,
            paymentSettings,
            activeSubscribers,
            subscriptionEnabled: creator.subscription_enabled,
        },
    });
}));
// Create a subscription with Stripe integration
exports.createSubscription = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { creatorId, planId, paymentMethod, paymentIntentId, customerId } = req.body;
    const subscriberId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!subscriberId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    if (!creatorId || !planId) {
        return res.status(400).json({
            success: false,
            message: 'Creator ID and plan ID are required',
        });
    }
    // Get subscriber details
    const subscriberResult = yield postgre_1.default.query('SELECT email, username, alias FROM "User" WHERE id = $1', [subscriberId]);
    if (subscriberResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Subscriber not found',
        });
    }
    const subscriber = subscriberResult.rows[0];
    // Check if creator exists and has subscription enabled
    const creatorResult = yield postgre_1.default.query('SELECT subscription_enabled, subscription_price, username, alias FROM "User" WHERE id = $1 AND role = $2', [creatorId, 'creator']);
    if (creatorResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Creator not found',
        });
    }
    const creator = creatorResult.rows[0];
    if (!creator.subscription_enabled) {
        return res.status(400).json({
            success: false,
            message: 'This creator does not have subscriptions enabled',
        });
    }
    // Check if plan exists
    const planResult = yield postgre_1.default.query('SELECT * FROM "SubscriptionPlan" WHERE id = $1 AND is_active = true', [planId]);
    if (planResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Subscription plan not found',
        });
    }
    const plan = planResult.rows[0];
    // Check if subscription already exists
    const existingSubscriptionResult = yield postgre_1.default.query('SELECT * FROM "CreatorSubscription" WHERE creator_id = $1 AND subscriber_id = $2 AND status = $3', [creatorId, subscriberId, 'active']);
    if (existingSubscriptionResult.rows.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'You already have an active subscription to this creator',
        });
    }
    try {
        // Create or get Stripe customer
        let stripeCustomerId = customerId;
        if (!stripeCustomerId) {
            const stripeCustomer = yield (0, stripe_1.createStripeCustomer)(subscriber.email, subscriber.alias || subscriber.username);
            stripeCustomerId = stripeCustomer.id;
        }
        // Create Stripe payment intent for the subscription
        const paymentIntent = yield (0, stripe_1.createPaymentIntent)(Math.round(plan.price * 100), // Convert to cents
        'usd', stripeCustomerId, {
            creator_id: creatorId,
            subscriber_id: subscriberId,
            plan_id: planId,
            plan_name: plan.name,
            type: 'subscription',
        });
        // Calculate end date
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);
        // Create subscription in database
        const subscriptionResult = yield postgre_1.default.query(`INSERT INTO "CreatorSubscription"
       (creator_id, subscriber_id, plan_id, end_date, payment_method, external_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [creatorId, subscriberId, planId, endDate, 'stripe', paymentIntent.id]);
        const subscription = subscriptionResult.rows[0];
        // Create payment transaction
        const transactionResult = yield postgre_1.default.query(`INSERT INTO "PaymentTransaction"
       (subscription_id, creator_id, subscriber_id, amount, currency, payment_method,
        external_payment_id, status, transaction_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            subscription.id,
            creatorId,
            subscriberId,
            plan.price,
            'usd',
            'stripe',
            paymentIntent.id,
            'pending', // Will be updated when payment is confirmed
            'subscription',
            `Subscription to ${plan.name} plan`,
        ]);
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: {
                subscription,
                transaction: transactionResult.rows[0],
                paymentIntent: {
                    id: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                },
                customerId: stripeCustomerId,
            },
        });
    }
    catch (error) {
        console.error('Subscription creation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create subscription',
        });
    }
}));
// Send tip to creator with Stripe integration
exports.sendTip = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { creatorId, amount, message, customerId } = req.body;
    const subscriberId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!subscriberId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    if (!creatorId || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Creator ID and valid amount are required',
        });
    }
    // Check if creator exists
    const creatorResult = yield postgre_1.default.query('SELECT id FROM "User" WHERE id = $1 AND role = $2', [creatorId, 'creator']);
    if (creatorResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Creator not found',
        });
    }
    try {
        // Get subscriber details
        const subscriberResult = yield postgre_1.default.query('SELECT email, username, alias FROM "User" WHERE id = $1', [subscriberId]);
        if (subscriberResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found',
            });
        }
        const subscriber = subscriberResult.rows[0];
        // Create or get Stripe customer
        let stripeCustomerId = customerId;
        if (!stripeCustomerId) {
            const stripeCustomer = yield (0, stripe_1.createStripeCustomer)(subscriber.email, subscriber.alias || subscriber.username);
            stripeCustomerId = stripeCustomer.id;
        }
        // Create Stripe payment intent for the tip
        const paymentIntent = yield (0, stripe_1.createPaymentIntent)(Math.round(amount * 100), // Convert to cents
        'usd', stripeCustomerId, {
            creator_id: creatorId,
            subscriber_id: subscriberId,
            type: 'tip',
            message: message || 'Tip sent to creator',
        });
        // Create tip transaction in database
        const transactionResult = yield postgre_1.default.query(`INSERT INTO "PaymentTransaction"
       (creator_id, subscriber_id, amount, currency, payment_method,
        external_payment_id, status, transaction_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            creatorId,
            subscriberId,
            amount,
            'usd',
            'stripe',
            paymentIntent.id,
            'pending', // Will be updated when payment is confirmed
            'tip',
            message || 'Tip sent to creator',
        ]);
        res.status(201).json({
            success: true,
            message: 'Tip payment intent created successfully',
            data: {
                transaction: transactionResult.rows[0],
                paymentIntent: {
                    id: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                },
                customerId: stripeCustomerId,
            },
        });
    }
    catch (error) {
        console.error('Tip creation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create tip payment',
        });
    }
}));
// Get user's subscriptions
exports.getUserSubscriptions = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    try {
        const result = yield postgre_1.default.query(`SELECT cs.*, sp.name as plan_name, sp.description as plan_description, sp.price,
                u.username as creator_username, u.alias as creator_alias, u.avatar as creator_avatar
         FROM "CreatorSubscription" cs
         JOIN "SubscriptionPlan" sp ON cs.plan_id = sp.id
         JOIN "User" u ON cs.creator_id = u.id
         WHERE cs.subscriber_id = $1
         ORDER BY cs.created_at DESC`, [userId]);
        res.status(200).json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        // If tables don't exist yet, return empty array
        if (error.message.includes('relation') &&
            error.message.includes('does not exist')) {
            console.log('Subscription tables do not exist yet. Returning empty array.');
            res.status(200).json({
                success: true,
                data: [],
            });
        }
        else if (error.message.includes('column') &&
            error.message.includes('does not exist')) {
            console.log('Subscription columns do not exist yet. Returning empty array.');
            res.status(200).json({
                success: true,
                data: [],
            });
        }
        else {
            console.error('Database error in getUserSubscriptions:', error);
            throw error;
        }
    }
}));
// Get creator's subscribers
exports.getCreatorSubscribers = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!creatorId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    const result = yield postgre_1.default.query(`SELECT cs.*, sp.name as plan_name, sp.price,
            u.username as subscriber_username, u.alias as subscriber_alias, u.avatar as subscriber_avatar
     FROM "CreatorSubscription" cs
     JOIN "SubscriptionPlan" sp ON cs.plan_id = sp.id
     JOIN "User" u ON cs.subscriber_id = u.id
     WHERE cs.creator_id = $1 AND cs.status = $2
     ORDER BY cs.created_at DESC`, [creatorId, 'active']);
    res.status(200).json({
        success: true,
        data: result.rows,
    });
}));
// Cancel subscription
exports.cancelSubscription = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { subscriptionId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    // Check if subscription exists and belongs to user
    const subscriptionResult = yield postgre_1.default.query('SELECT * FROM "CreatorSubscription" WHERE id = $1 AND subscriber_id = $2', [subscriptionId, userId]);
    if (subscriptionResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Subscription not found',
        });
    }
    const subscription = subscriptionResult.rows[0];
    // Cancel subscription
    yield postgre_1.default.query('UPDATE "CreatorSubscription" SET status = $1, auto_renew = $2, updated_at = NOW() WHERE id = $3', ['cancelled', false, subscriptionId]);
    res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully',
    });
}));
// Update creator payment settings
exports.updateCreatorPaymentSettings = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { subscriptionEnabled, subscriptionPrice, subscriptionDescription, paymentEnabled, minimumSubscriptionAmount, customTipAmounts, payoutSchedule, payoutThreshold, } = req.body;
    if (!creatorId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    try {
        // Update user subscription settings
        yield postgre_1.default.query(`UPDATE "User"
         SET subscription_enabled = $1, subscription_price = $2, subscription_description = $3, updated_at = NOW()
         WHERE id = $4`, [
            subscriptionEnabled,
            subscriptionPrice,
            subscriptionDescription,
            creatorId,
        ]);
        // Update or create payment settings
        const paymentSettingsResult = yield postgre_1.default.query('SELECT id FROM "CreatorPaymentSettings" WHERE creator_id = $1', [creatorId]);
        if (paymentSettingsResult.rows.length > 0) {
            // Update existing settings
            yield postgre_1.default.query(`UPDATE "CreatorPaymentSettings"
           SET payment_enabled = $1, minimum_subscription_amount = $2, custom_tip_amounts = $3,
               payout_schedule = $4, payout_threshold = $5, updated_at = NOW()
           WHERE creator_id = $6`, [
                paymentEnabled,
                minimumSubscriptionAmount,
                customTipAmounts,
                payoutSchedule,
                payoutThreshold,
                creatorId,
            ]);
        }
        else {
            // Create new settings
            yield postgre_1.default.query(`INSERT INTO "CreatorPaymentSettings"
           (creator_id, payment_enabled, minimum_subscription_amount, custom_tip_amounts, payout_schedule, payout_threshold)
           VALUES ($1, $2, $3, $4, $5, $6)`, [
                creatorId,
                paymentEnabled,
                minimumSubscriptionAmount,
                customTipAmounts,
                payoutSchedule,
                payoutThreshold,
            ]);
        }
        res.status(200).json({
            success: true,
            message: 'Payment settings updated successfully',
        });
    }
    catch (error) {
        // If payment settings table doesn't exist, just update user settings
        if (error.message.includes('relation') &&
            error.message.includes('does not exist')) {
            res.status(200).json({
                success: true,
                message: 'Payment settings updated successfully (basic settings only)',
            });
        }
        else {
            throw error;
        }
    }
}));
// Get payment analytics for creator
exports.getCreatorPaymentAnalytics = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!creatorId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    try {
        // Get total earnings
        const earningsResult = yield postgre_1.default.query('SELECT total_earnings, monthly_earnings FROM "User" WHERE id = $1', [creatorId]);
        // Get active subscribers count
        const subscribersResult = yield postgre_1.default.query('SELECT COUNT(*) as active_subscribers FROM "CreatorSubscription" WHERE creator_id = $1 AND status = $2', [creatorId, 'active']);
        // Get recent transactions
        const transactionsResult = yield postgre_1.default.query(`SELECT * FROM "PaymentTransaction"
        WHERE creator_id = $1
        ORDER BY created_at DESC
        LIMIT 10`, [creatorId]);
        // Get monthly earnings breakdown
        const monthlyBreakdownResult = yield postgre_1.default.query(`SELECT
           DATE_TRUNC('month', created_at) as month,
           SUM(amount) as total_amount,
           COUNT(*) as transaction_count
         FROM "PaymentTransaction"
         WHERE creator_id = $1 AND status = 'completed'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month DESC
         LIMIT 6`, [creatorId]);
        res.status(200).json({
            success: true,
            data: {
                earnings: earningsResult.rows[0] || {
                    total_earnings: 0,
                    monthly_earnings: 0,
                },
                activeSubscribers: parseInt(((_b = subscribersResult.rows[0]) === null || _b === void 0 ? void 0 : _b.active_subscribers) || '0'),
                recentTransactions: transactionsResult.rows || [],
                monthlyBreakdown: monthlyBreakdownResult.rows || [],
            },
        });
    }
    catch (error) {
        // If tables don't exist yet, return default data
        if (error.message.includes('relation') &&
            error.message.includes('does not exist')) {
            res.status(200).json({
                success: true,
                data: {
                    earnings: { total_earnings: 0, monthly_earnings: 0 },
                    activeSubscribers: 0,
                    recentTransactions: [],
                    monthlyBreakdown: [],
                },
            });
        }
        else {
            throw error;
        }
    }
}));
