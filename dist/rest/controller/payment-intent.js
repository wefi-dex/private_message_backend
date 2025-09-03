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
exports.confirmPaymentIntent = exports.createPaymentIntentController = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const stripe_1 = require("../../config/stripe");
const postgre_1 = __importDefault(require("../../util/postgre"));
const logger_1 = require("../../util/logger");
// Create payment intent for frontend
exports.createPaymentIntentController = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, currency, customerId, metadata } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid amount is required',
        });
    }
    try {
        // Get user details
        const userResult = yield postgre_1.default.query('SELECT email, username, alias FROM "User" WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        const user = userResult.rows[0];
        // Create or get Stripe customer
        let stripeCustomerId = customerId;
        if (!stripeCustomerId) {
            const stripeCustomer = yield (0, stripe_1.createStripeCustomer)(user.email, user.alias || user.username);
            stripeCustomerId = stripeCustomer.id;
        }
        // Create payment intent
        const paymentIntent = yield (0, stripe_1.createPaymentIntent)(amount, currency || 'usd', stripeCustomerId, Object.assign(Object.assign({}, metadata), { user_id: userId, email: user.email }));
        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                customerId: stripeCustomerId,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create payment intent',
        });
    }
}));
// Confirm payment intent (for webhook handling)
exports.confirmPaymentIntent = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentIntentId } = req.params;
    if (!paymentIntentId) {
        return res.status(400).json({
            success: false,
            message: 'Payment intent ID is required',
        });
    }
    try {
        // Update transaction status to completed
        yield postgre_1.default.query(`UPDATE "PaymentTransaction"
         SET status = 'completed', updated_at = NOW()
         WHERE external_payment_id = $1`, [paymentIntentId]);
        // Get transaction details
        const transactionResult = yield postgre_1.default.query(`SELECT * FROM "PaymentTransaction" WHERE external_payment_id = $1`, [paymentIntentId]);
        if (transactionResult.rows.length > 0) {
            const transaction = transactionResult.rows[0];
            // Update creator's earnings
            yield postgre_1.default.query(`UPDATE "User"
           SET total_earnings = total_earnings + $1,
               monthly_earnings = monthly_earnings + $1,
               updated_at = NOW()
           WHERE id = $2`, [transaction.amount, transaction.creator_id]);
            // Update subscription status if it's a subscription payment
            if (transaction.transaction_type === 'subscription') {
                yield postgre_1.default.query(`UPDATE "CreatorSubscription"
             SET status = 'active', updated_at = NOW()
             WHERE external_payment_id = $1`, [paymentIntentId]);
            }
        }
        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error confirming payment intent:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to confirm payment',
        });
    }
}));
