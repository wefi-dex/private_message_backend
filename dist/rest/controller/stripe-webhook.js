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
exports.handleStripeWebhook = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const stripe_1 = require("../../config/stripe");
const postgre_1 = __importDefault(require("../../util/postgre"));
const logger_1 = require("../../util/logger");
// Stripe webhook handler
exports.handleStripeWebhook = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({
            success: false,
            message: 'Missing stripe signature',
        });
    }
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, stripe_1.STRIPE_CONFIG.webhookSecret);
    }
    catch (err) {
        logger_1.logger.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({
            success: false,
            message: 'Invalid signature',
        });
    }
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            yield handlePaymentIntentSucceeded(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            yield handlePaymentIntentFailed(event.data.object);
            break;
        case 'invoice.payment_succeeded':
            yield handleInvoicePaymentSucceeded(event.data.object);
            break;
        case 'invoice.payment_failed':
            yield handleInvoicePaymentFailed(event.data.object);
            break;
        case 'customer.subscription.created':
            yield handleSubscriptionCreated(event.data.object);
            break;
        case 'customer.subscription.updated':
            yield handleSubscriptionUpdated(event.data.object);
            break;
        case 'customer.subscription.deleted':
            yield handleSubscriptionDeleted(event.data.object);
            break;
        default:
            logger_1.logger.info(`Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
}));
// Handle successful payment intent
function handlePaymentIntentSucceeded(paymentIntent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { creator_id, subscriber_id, type, plan_id, plan_name } = paymentIntent.metadata;
            // Update transaction status
            yield postgre_1.default.query(`UPDATE "PaymentTransaction"
       SET status = 'completed', updated_at = NOW()
       WHERE external_payment_id = $1`, [paymentIntent.id]);
            if (type === 'subscription') {
                // Update subscription status
                yield postgre_1.default.query(`UPDATE "CreatorSubscription"
         SET status = 'active', updated_at = NOW()
         WHERE external_payment_id = $1`, [paymentIntent.id]);
                // Update creator's earnings
                const amount = paymentIntent.amount / 100; // Convert from cents
                yield postgre_1.default.query(`UPDATE "User"
         SET total_earnings = total_earnings + $1,
             monthly_earnings = monthly_earnings + $1,
             updated_at = NOW()
         WHERE id = $2`, [amount, creator_id]);
                logger_1.logger.info(`Subscription payment completed: ${paymentIntent.id}`);
            }
            else if (type === 'tip') {
                // Update creator's earnings for tip
                const amount = paymentIntent.amount / 100; // Convert from cents
                yield postgre_1.default.query(`UPDATE "User"
         SET total_earnings = total_earnings + $1,
             monthly_earnings = monthly_earnings + $1,
             updated_at = NOW()
         WHERE id = $2`, [amount, creator_id]);
                logger_1.logger.info(`Tip payment completed: ${paymentIntent.id}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling payment intent succeeded:', error);
        }
    });
}
// Handle failed payment intent
function handlePaymentIntentFailed(paymentIntent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Update transaction status
            yield postgre_1.default.query(`UPDATE "PaymentTransaction"
       SET status = 'failed', updated_at = NOW()
       WHERE external_payment_id = $1`, [paymentIntent.id]);
            // Update subscription status if it's a subscription payment
            if (paymentIntent.metadata.type === 'subscription') {
                yield postgre_1.default.query(`UPDATE "CreatorSubscription"
         SET status = 'cancelled', updated_at = NOW()
         WHERE external_payment_id = $1`, [paymentIntent.id]);
            }
            logger_1.logger.info(`Payment failed: ${paymentIntent.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling payment intent failed:', error);
        }
    });
}
// Handle successful invoice payment
function handleInvoicePaymentSucceeded(invoice) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // This handles recurring subscription payments
            const subscriptionId = invoice.subscription;
            // Update subscription end date
            yield postgre_1.default.query(`UPDATE "CreatorSubscription"
       SET end_date = end_date + INTERVAL '1 month',
           updated_at = NOW()
       WHERE external_payment_id = $1`, [subscriptionId]);
            // Create new transaction record for recurring payment
            const subscriptionResult = yield postgre_1.default.query(`SELECT cs.creator_id, cs.subscriber_id, sp.price, sp.name
       FROM "CreatorSubscription" cs
       JOIN "SubscriptionPlan" sp ON cs.plan_id = sp.id
       WHERE cs.external_payment_id = $1`, [subscriptionId]);
            if (subscriptionResult.rows.length > 0) {
                const subscription = subscriptionResult.rows[0];
                yield postgre_1.default.query(`INSERT INTO "PaymentTransaction"
         (subscription_id, creator_id, subscriber_id, amount, currency,
          payment_method, external_payment_id, status, transaction_type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    subscriptionId,
                    subscription.creator_id,
                    subscription.subscriber_id,
                    subscription.price,
                    'usd',
                    'stripe',
                    invoice.id,
                    'completed',
                    'subscription',
                    `Recurring payment for ${subscription.name} plan`,
                ]);
                // Update creator's earnings
                yield postgre_1.default.query(`UPDATE "User"
         SET total_earnings = total_earnings + $1,
             monthly_earnings = monthly_earnings + $1,
             updated_at = NOW()
         WHERE id = $2`, [subscription.price, subscription.creator_id]);
            }
            logger_1.logger.info(`Invoice payment succeeded: ${invoice.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling invoice payment succeeded:', error);
        }
    });
}
// Handle failed invoice payment
function handleInvoicePaymentFailed(invoice) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const subscriptionId = invoice.subscription;
            // Update subscription status
            yield postgre_1.default.query(`UPDATE "CreatorSubscription"
       SET status = 'cancelled', updated_at = NOW()
       WHERE external_payment_id = $1`, [subscriptionId]);
            logger_1.logger.info(`Invoice payment failed: ${invoice.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling invoice payment failed:', error);
        }
    });
}
// Handle subscription created
function handleSubscriptionCreated(subscription) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.logger.info(`Subscription created: ${subscription.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling subscription created:', error);
        }
    });
}
// Handle subscription updated
function handleSubscriptionUpdated(subscription) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Update subscription status based on Stripe status
            let status = 'active';
            if (subscription.status === 'canceled') {
                status = 'cancelled';
            }
            else if (subscription.status === 'past_due') {
                status = 'pending';
            }
            yield postgre_1.default.query(`UPDATE "CreatorSubscription"
       SET status = $1, updated_at = NOW()
       WHERE external_payment_id = $2`, [status, subscription.id]);
            logger_1.logger.info(`Subscription updated: ${subscription.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling subscription updated:', error);
        }
    });
}
// Handle subscription deleted
function handleSubscriptionDeleted(subscription) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Update subscription status
            yield postgre_1.default.query(`UPDATE "CreatorSubscription"
       SET status = 'cancelled', updated_at = NOW()
       WHERE external_payment_id = $1`, [subscription.id]);
            logger_1.logger.info(`Subscription deleted: ${subscription.id}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling subscription deleted:', error);
        }
    });
}
