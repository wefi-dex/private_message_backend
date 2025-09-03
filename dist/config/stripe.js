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
exports.createStripeSubscription = exports.createPaymentIntent = exports.createStripeCustomer = exports.STRIPE_PRODUCTS = exports.STRIPE_CONFIG = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
// Initialize Stripe with environment variables
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
    apiVersion: '2025-08-27.basil',
});
// Stripe configuration
exports.STRIPE_CONFIG = {
    // Test keys - replace with production keys in production
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
    // Webhook secret for verifying webhook events
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...',
    // Currency and payment settings
    currency: 'usd',
    paymentMethods: ['card', 'sepa_debit', 'sofort'],
    // Subscription settings
    subscriptionSettings: {
        trialPeriodDays: 0,
        automaticTax: { enabled: true },
    },
    // Payout settings
    payoutSettings: {
        schedule: 'manual', // or 'automatic'
        delayDays: 7,
    },
};
// Stripe product IDs for subscription plans
exports.STRIPE_PRODUCTS = {
    basic: {
        name: 'Basic Creator Subscription',
        description: 'Basic creator subscription with standard features',
        price: 999, // $9.99 in cents
        interval: 'month',
        features: ['messages', 'basic_content'],
    },
    premium: {
        name: 'Premium Creator Subscription',
        description: 'Premium subscription with exclusive content and priority support',
        price: 1999, // $19.99 in cents
        interval: 'month',
        features: [
            'messages',
            'exclusive_content',
            'priority_support',
            'custom_tips',
        ],
    },
    vip: {
        name: 'VIP Creator Subscription',
        description: 'VIP subscription with all premium features and personal interaction',
        price: 4999, // $49.99 in cents
        interval: 'month',
        features: [
            'messages',
            'exclusive_content',
            'priority_support',
            'custom_tips',
            'personal_calls',
            'exclusive_events',
        ],
    },
};
// Helper function to create Stripe customer
const createStripeCustomer = (email, name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield exports.stripe.customers.create({
            email,
            name,
            metadata: {
                source: 'private_message_app',
            },
        });
        return customer;
    }
    catch (error) {
        console.error('Error creating Stripe customer:', error);
        throw new Error('Failed to create payment account');
    }
});
exports.createStripeCustomer = createStripeCustomer;
// Helper function to create Stripe payment intent
const createPaymentIntent = (amount_1, ...args_1) => __awaiter(void 0, [amount_1, ...args_1], void 0, function* (amount, currency = 'usd', customerId, metadata) {
    try {
        const paymentIntent = yield exports.stripe.paymentIntents.create({
            amount,
            currency,
            customer: customerId,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return paymentIntent;
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        throw new Error('Failed to create payment');
    }
});
exports.createPaymentIntent = createPaymentIntent;
// Helper function to create Stripe subscription
const createStripeSubscription = (customerId, priceId, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscription = yield exports.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            metadata,
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });
        return subscription;
    }
    catch (error) {
        console.error('Error creating Stripe subscription:', error);
        throw new Error('Failed to create subscription');
    }
});
exports.createStripeSubscription = createStripeSubscription;
