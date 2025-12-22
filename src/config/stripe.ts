import Stripe from "stripe";
import fs from "fs";
import path from "path";

// Debug logging helper
const debugLog = (data: any) => {
  try {
    // Use absolute path to workspace root
    const logPath = "/Volumes/Work/g-10/.cursor/debug.log";
    const logEntry = JSON.stringify({ ...data, timestamp: Date.now() }) + "\n";
    fs.appendFileSync(logPath, logEntry, "utf8");
    // Also log to console for immediate visibility
    console.log(`[DEBUG] ${data.location}: ${data.message}`, data.data || {});
  } catch (e) {
    // Log to console if file logging fails
    console.error("Debug log error:", e);
    console.log(
      `[DEBUG-FALLBACK] ${data.location}: ${data.message}`,
      data.data || {}
    );
  }
};

// Initialize Stripe with environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_...";

// Validate Stripe key is set and not a placeholder
const isStripeKeyValid =
  stripeSecretKey &&
  stripeSecretKey !== "sk_test_..." &&
  !stripeSecretKey.includes("your_stripe") &&
  !stripeSecretKey.includes("placeholder") &&
  stripeSecretKey.startsWith("sk_");

if (!isStripeKeyValid) {
  console.error(
    "❌ ERROR: Stripe secret key is not properly configured!\n" +
      "   Please set STRIPE_SECRET_KEY in your .env file with a valid Stripe key.\n" +
      "   Get your keys from: https://dashboard.stripe.com/apikeys\n" +
      "   Current value: " +
      (stripeSecretKey || "not set")
  );
}

export const stripe = isStripeKeyValid
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

// Stripe configuration
export const STRIPE_CONFIG = {
  // Test keys - replace with production keys in production
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_...",
  secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_...",

  // Webhook secret for verifying webhook events
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_...",

  // Currency and payment settings
  currency: "usd",
  paymentMethods: ["card", "sepa_debit", "sofort"],

  // Subscription settings
  subscriptionSettings: {
    trialPeriodDays: 0,
    automaticTax: { enabled: true },
  },

  // Payout settings
  payoutSettings: {
    schedule: "manual", // or 'automatic'
    delayDays: 7,
  },
};

// Stripe product IDs for subscription plans
export const STRIPE_PRODUCTS = {
  basic: {
    name: "Basic Creator Subscription",
    description: "Basic creator subscription with standard features",
    price: 999, // $9.99 in cents
    interval: "month",
    features: ["messages", "basic_content"],
  },
  premium: {
    name: "Premium Creator Subscription",
    description:
      "Premium subscription with exclusive content and priority support",
    price: 1999, // $19.99 in cents
    interval: "month",
    features: [
      "messages",
      "exclusive_content",
      "priority_support",
      "custom_tips",
    ],
  },
  vip: {
    name: "VIP Creator Subscription",
    description:
      "VIP subscription with all premium features and personal interaction",
    price: 4999, // $49.99 in cents
    interval: "month",
    features: [
      "messages",
      "exclusive_content",
      "priority_support",
      "custom_tips",
      "personal_calls",
      "exclusive_events",
    ],
  },
};

// Helper function to create Stripe customer
export const createStripeCustomer = async (email: string, name?: string) => {
  // #region agent log
  debugLog({
    location: "stripe.ts:85",
    message: "createStripeCustomer entry",
    data: { email, name, stripeIsNull: !stripe },
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "C",
  });
  // #endregion
  try {
    // Validate Stripe is initialized
    if (!stripe) {
      // #region agent log
      debugLog({
        location: "stripe.ts:90",
        message: "Stripe is null in createStripeCustomer",
        data: {},
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      });
      // #endregion
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file. " +
          "Get your keys from: https://dashboard.stripe.com/apikeys"
      );
    }
    // #region agent log
    debugLog({
      location: "stripe.ts:106",
      message: "Calling Stripe customers.create",
      data: { email, name },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "C",
    });
    // #endregion

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: "private_message_app",
      },
    });
    // #region agent log
    debugLog({
      location: "stripe.ts:115",
      message: "Stripe customer created successfully",
      data: { customerId: customer.id },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "C",
    });
    // #endregion
    return customer;
  } catch (error: any) {
    console.error("Error creating Stripe customer:", error);
    // #region agent log
    debugLog({
      location: "stripe.ts:118",
      message: "Stripe customer creation error",
      data: {
        errorType: error.type,
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.statusCode,
      },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "C",
    });
    // #endregion
    // Provide more detailed error information
    if (error.type === "StripeAuthenticationError") {
      throw new Error(
        "Stripe authentication failed. Please check your STRIPE_SECRET_KEY."
      );
    } else if (error.type === "StripeInvalidRequestError") {
      throw new Error(
        `Invalid Stripe request: ${error.message || "Please check your request parameters."}`
      );
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to create payment account");
    }
  }
};

// Helper function to create Stripe payment intent
export const createPaymentIntent = async (
  amount: number,
  currency: string = "usd",
  customerId?: string,
  metadata?: any
) => {
  // #region agent log
  debugLog({
    location: "stripe.ts:94",
    message: "createPaymentIntent entry",
    data: {
      amount,
      currency,
      customerId,
      hasMetadata: !!metadata,
      stripeIsNull: !stripe,
    },
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  });
  // #endregion
  try {
    // Validate Stripe is initialized
    if (!stripe) {
      // #region agent log
      debugLog({
        location: "stripe.ts:100",
        message: "Stripe is null in createPaymentIntent",
        data: {},
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      });
      // #endregion
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file. " +
          "Get your keys from: https://dashboard.stripe.com/apikeys"
      );
    }

    // Validate amount
    if (!amount || amount <= 0) {
      // #region agent log
      debugLog({
        location: "stripe.ts:108",
        message: "Invalid amount in createPaymentIntent",
        data: { amount },
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      });
      // #endregion
      throw new Error("Invalid amount. Amount must be greater than 0.");
    }

    const paymentIntentParams: any = {
      amount: Math.round(amount), // Ensure amount is an integer
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Add customer if provided
    if (customerId) {
      paymentIntentParams.customer = customerId;
    }

    // Add metadata if provided
    if (metadata) {
      paymentIntentParams.metadata = metadata;
    }
    // #region agent log
    debugLog({
      location: "stripe.ts:173",
      message: "Calling Stripe API",
      data: {
        amount: paymentIntentParams.amount,
        currency: paymentIntentParams.currency,
        hasCustomer: !!paymentIntentParams.customer,
        hasMetadata: !!paymentIntentParams.metadata,
      },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    });
    // #endregion

    const paymentIntent =
      await stripe.paymentIntents.create(paymentIntentParams);
    // #region agent log
    debugLog({
      location: "stripe.ts:176",
      message: "Stripe API call succeeded",
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        hasClientSecret: !!paymentIntent.client_secret,
      },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    });
    // #endregion
    return paymentIntent;
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    // #region agent log
    debugLog({
      location: "stripe.ts:178",
      message: "Stripe API error in createPaymentIntent",
      data: {
        errorType: error.type,
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.statusCode,
        errorRaw: JSON.stringify(error).substring(0, 500),
      },
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    });
    // #endregion
    // Provide more detailed error information
    if (error.type === "StripeAuthenticationError") {
      throw new Error(
        "Stripe authentication failed. Please check your STRIPE_SECRET_KEY."
      );
    } else if (error.type === "StripeInvalidRequestError") {
      throw new Error(
        `Invalid Stripe request: ${error.message || "Please check your request parameters."}`
      );
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to create payment intent. Please try again.");
    }
  }
};

// Helper function to create Stripe subscription
export const createStripeSubscription = async (
  customerId: string,
  priceId: string,
  metadata?: any
) => {
  try {
    // Validate Stripe is initialized
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file. " +
          "Get your keys from: https://dashboard.stripe.com/apikeys"
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });
    return subscription;
  } catch (error) {
    console.error("Error creating Stripe subscription:", error);
    throw new Error("Failed to create subscription");
  }
};
