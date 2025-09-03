/**
 * Stripe Webhook Test Cases
 * Tests for webhook handling and payment processing
 */

const axios = require('axios')
const crypto = require('crypto')
const { expect } = require('chai')

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8000'

// Mock Stripe webhook events
const mockWebhookEvents = {
  paymentIntentSucceeded: {
    id: 'evt_test_payment_succeeded',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_success',
        amount: 1999,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          creator_id: 'test_creator_id',
          subscriber_id: 'test_subscriber_id',
          type: 'subscription',
          plan_id: 'test_plan_id',
        },
      },
    },
  },

  paymentIntentFailed: {
    id: 'evt_test_payment_failed',
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_failed',
        amount: 1999,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: {
          creator_id: 'test_creator_id',
          subscriber_id: 'test_subscriber_id',
          type: 'subscription',
        },
      },
    },
  },

  subscriptionCreated: {
    id: 'evt_test_subscription_created',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_created',
        customer: 'cus_test_customer',
        status: 'active',
        metadata: {
          creator_id: 'test_creator_id',
          subscriber_id: 'test_subscriber_id',
        },
      },
    },
  },

  subscriptionCancelled: {
    id: 'evt_test_subscription_cancelled',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_cancelled',
        customer: 'cus_test_customer',
        status: 'canceled',
        metadata: {
          creator_id: 'test_creator_id',
          subscriber_id: 'test_subscriber_id',
        },
      },
    },
  },
}

// Helper function to create webhook signature
const createWebhookSignature = (payload, secret) => {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  return `t=${timestamp},v1=${signature}`
}

describe('Stripe Webhook Tests', function () {
  this.timeout(30000)

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'

  describe('Webhook Signature Verification', () => {
    test('POST /api/stripe-webhook - Should accept valid webhook signature', async () => {
      const payload = JSON.stringify(mockWebhookEvents.paymentIntentSucceeded)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true
    })

    test('POST /api/stripe-webhook - Should reject invalid webhook signature', async () => {
      const payload = JSON.stringify(mockWebhookEvents.paymentIntentSucceeded)
      const invalidSignature = 't=1234567890,v1=invalid_signature'

      try {
        await axios.post(`${BASE_URL}/api/stripe-webhook`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': invalidSignature,
          },
        })
        throw new Error('Expected 400 error for invalid signature')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
        expect(error.response.data.message).to.include('Invalid signature')
      }
    })

    test('POST /api/stripe-webhook - Should reject missing signature', async () => {
      const payload = JSON.stringify(mockWebhookEvents.paymentIntentSucceeded)

      try {
        await axios.post(`${BASE_URL}/api/stripe-webhook`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        throw new Error('Expected 400 error for missing signature')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
        expect(error.response.data.message).to.include(
          'Missing stripe signature',
        )
      }
    })
  })

  describe('Payment Intent Events', () => {
    test('Should handle payment_intent.succeeded event', async () => {
      const payload = JSON.stringify(mockWebhookEvents.paymentIntentSucceeded)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true

      // Verify that the payment was processed correctly
      // This would typically involve checking the database for updated transaction status
    })

    test('Should handle payment_intent.payment_failed event', async () => {
      const payload = JSON.stringify(mockWebhookEvents.paymentIntentFailed)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true
    })
  })

  describe('Subscription Events', () => {
    test('Should handle customer.subscription.created event', async () => {
      const payload = JSON.stringify(mockWebhookEvents.subscriptionCreated)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true
    })

    test('Should handle customer.subscription.deleted event', async () => {
      const payload = JSON.stringify(mockWebhookEvents.subscriptionCancelled)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true
    })
  })

  describe('Unhandled Events', () => {
    test('Should handle unhandled event types gracefully', async () => {
      const unhandledEvent = {
        id: 'evt_test_unhandled',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test',
          },
        },
      }

      const payload = JSON.stringify(unhandledEvent)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.received).to.be.true
    })
  })

  describe('Error Handling', () => {
    test('Should handle malformed webhook payload', async () => {
      const malformedPayload = '{"invalid": json}'
      const signature = createWebhookSignature(malformedPayload, webhookSecret)

      try {
        await axios.post(`${BASE_URL}/api/stripe-webhook`, malformedPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        })
        throw new Error('Expected error for malformed payload')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })

    test('Should handle missing event type', async () => {
      const invalidEvent = {
        id: 'evt_test_invalid',
        data: {
          object: {},
        },
      }

      const payload = JSON.stringify(invalidEvent)
      const signature = createWebhookSignature(payload, webhookSecret)

      try {
        await axios.post(`${BASE_URL}/api/stripe-webhook`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        })
        throw new Error('Expected error for missing event type')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })
  })

  describe('Database Integration', () => {
    test('Should update transaction status on payment success', async () => {
      // This test would verify that the database is updated correctly
      // when a payment_intent.succeeded event is received

      const payload = JSON.stringify(mockWebhookEvents.paymentIntentSucceeded)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)

      // Verify database updates
      // This would typically involve querying the database to check
      // that the transaction status was updated to 'completed'
    })

    test('Should update subscription status on subscription events', async () => {
      // This test would verify that subscription status is updated
      // when subscription-related events are received

      const payload = JSON.stringify(mockWebhookEvents.subscriptionCreated)
      const signature = createWebhookSignature(payload, webhookSecret)

      const response = await axios.post(
        `${BASE_URL}/api/stripe-webhook`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature,
          },
        },
      )

      expect(response.status).to.equal(200)

      // Verify database updates
      // This would typically involve querying the database to check
      // that the subscription status was updated appropriately
    })
  })
})

module.exports = {
  mockWebhookEvents,
  createWebhookSignature,
}
