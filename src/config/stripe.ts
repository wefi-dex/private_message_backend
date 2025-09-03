import Stripe from 'stripe'

// Initialize Stripe with environment variables
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_...',
  {
    apiVersion: '2025-08-27.basil',
  },
)

// Stripe configuration
export const STRIPE_CONFIG = {
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
}

// Stripe product IDs for subscription plans
export const STRIPE_PRODUCTS = {
  basic: {
    name: 'Basic Creator Subscription',
    description: 'Basic creator subscription with standard features',
    price: 999, // $9.99 in cents
    interval: 'month',
    features: ['messages', 'basic_content'],
  },
  premium: {
    name: 'Premium Creator Subscription',
    description:
      'Premium subscription with exclusive content and priority support',
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
    description:
      'VIP subscription with all premium features and personal interaction',
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
}

// Helper function to create Stripe customer
export const createStripeCustomer = async (email: string, name?: string) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'private_message_app',
      },
    })
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw new Error('Failed to create payment account')
  }
}

// Helper function to create Stripe payment intent
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  customerId?: string,
  metadata?: any,
) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })
    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment')
  }
}

// Helper function to create Stripe subscription
export const createStripeSubscription = async (
  customerId: string,
  priceId: string,
  metadata?: any,
) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })
    return subscription
  } catch (error) {
    console.error('Error creating Stripe subscription:', error)
    throw new Error('Failed to create subscription')
  }
}
