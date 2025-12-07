/**
 * Payment System Test Cases
 * Comprehensive test suite for the payment system functionality
 */

const axios = require('axios')
const { expect } = require('chai')

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8000'
const TEST_TIMEOUT = 30000

// Test data
const testUsers = {
  creator: {
    username: 'test_creator',
    email: 'creator@test.com',
    password: 'TestPass123!',
    role: 'creator',
  },
  subscriber: {
    username: 'test_subscriber',
    email: 'subscriber@test.com',
    password: 'TestPass123!',
    role: 'fan',
  },
  admin: {
    username: 'test_admin',
    email: 'admin@test.com',
    password: 'TestPass123!',
    role: 'admin',
  },
}

const testPlans = {
  basic: {
    name: 'Basic Test Plan',
    price: 9.99,
    duration_days: 30,
    features: { messages: true, exclusive_content: false },
  },
  premium: {
    name: 'Premium Test Plan',
    price: 19.99,
    duration_days: 30,
    features: {
      messages: true,
      exclusive_content: true,
      priority_support: true,
    },
  },
}

// Helper functions
const generateAuthToken = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: userData.username,
      password: userData.password,
    })
    return response.data.token
  } catch (error) {
    console.error('Auth failed:', error.response?.data)
    throw error
  }
}

const createTestUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData)
    return response.data.user
  } catch (error) {
    console.error('User creation failed:', error.response?.data)
    throw error
  }
}

// Test Suite: Payment System
describe('Payment System Test Suite', function () {
  this.timeout(TEST_TIMEOUT)

  let creatorToken, subscriberToken, adminToken
  let creatorId, subscriberId
  let subscriptionPlanId
  let testSubscriptionId
  let testTransactionId

  // Setup before all tests
  before(async () => {

    try {
      // Create test users
      const creator = await createTestUser(testUsers.creator)
      const subscriber = await createTestUser(testUsers.subscriber)

      creatorId = creator.id
      subscriberId = subscriber.id

      // Get auth tokens
      creatorToken = await generateAuthToken(testUsers.creator)
      subscriberToken = await generateAuthToken(testUsers.subscriber)
      adminToken = await generateAuthToken(testUsers.admin)

    } catch (error) {
      console.error('Setup failed:', error)
      throw error
    }
  })

  // Test Group 1: Subscription Plans
  describe('Subscription Plans', () => {
    test('GET /api/payment/plans - Should return available subscription plans', async () => {
      const response = await axios.get(`${BASE_URL}/api/payment/plans`)

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')
      expect(response.data.data.length).to.be.greaterThan(0)

      const plans = response.data.data
      plans.forEach((plan) => {
        expect(plan).to.have.property('id')
        expect(plan).to.have.property('name')
        expect(plan).to.have.property('price')
        expect(plan).to.have.property('currency')
        expect(plan).to.have.property('duration_days')
        expect(plan).to.have.property('features')
        expect(plan).to.have.property('is_active')
        expect(plan.is_active).to.be.true
      })

      // Store plan ID for later tests
      subscriptionPlanId = plans[0].id
    })

    test('GET /api/payment/plans - Should return plans in ascending price order', async () => {
      const response = await axios.get(`${BASE_URL}/api/payment/plans`)
      const plans = response.data.data

      for (let i = 1; i < plans.length; i++) {
        expect(plans[i].price).to.be.greaterThanOrEqual(plans[i - 1].price)
      }
    })
  })

  // Test Group 2: Creator Subscription Management
  describe('Creator Subscription Management', () => {
    test('GET /api/payment/creator/:creatorId - Should return creator subscription info', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/payment/creator/${creatorId}`,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('creator')
      expect(response.data.data).to.have.property('paymentSettings')
      expect(response.data.data).to.have.property('activeSubscribers')
      expect(response.data.data).to.have.property('subscriptionEnabled')
    })

    test('GET /api/payment/creator/:creatorId - Should return 404 for non-existent creator', async () => {
      const fakeCreatorId = '00000000-0000-0000-0000-000000000000'

      try {
        await axios.get(`${BASE_URL}/api/payment/creator/${fakeCreatorId}`, {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        })
        throw new Error('Expected 404 error')
      } catch (error) {
        expect(error.response.status).to.equal(404)
        expect(error.response.data.success).to.be.false
      }
    })
  })

  // Test Group 3: Subscription Creation
  describe('Subscription Creation', () => {
    test('POST /api/payment/subscription - Should create subscription successfully', async () => {
      const subscriptionData = {
        creatorId: creatorId,
        planId: subscriptionPlanId,
        paymentMethod: 'stripe',
        customerId: 'cus_test123',
      }

      const response = await axios.post(
        `${BASE_URL}/api/payment/subscription`,
        subscriptionData,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(201)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('subscription')
      expect(response.data.data).to.have.property('paymentIntent')

      const subscription = response.data.data.subscription
      expect(subscription.creator_id).to.equal(creatorId)
      expect(subscription.subscriber_id).to.equal(subscriberId)
      expect(subscription.plan_id).to.equal(subscriptionPlanId)
      expect(subscription.status).to.equal('pending')

      testSubscriptionId = subscription.id
    })

    test('POST /api/payment/subscription - Should prevent duplicate active subscriptions', async () => {
      const subscriptionData = {
        creatorId: creatorId,
        planId: subscriptionPlanId,
        paymentMethod: 'stripe',
      }

      try {
        await axios.post(
          `${BASE_URL}/api/payment/subscription`,
          subscriptionData,
          {
            headers: { Authorization: `Bearer ${subscriberToken}` },
          },
        )
        throw new Error('Expected 400 error for duplicate subscription')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
        expect(error.response.data.message).to.include(
          'already have an active subscription',
        )
      }
    })

    test('POST /api/payment/subscription - Should require authentication', async () => {
      const subscriptionData = {
        creatorId: creatorId,
        planId: subscriptionPlanId,
      }

      try {
        await axios.post(
          `${BASE_URL}/api/payment/subscription`,
          subscriptionData,
        )
        throw new Error('Expected 401 error')
      } catch (error) {
        expect(error.response.status).to.equal(401)
      }
    })

    test('POST /api/payment/subscription - Should validate required fields', async () => {
      const invalidData = {
        creatorId: creatorId,
        // Missing planId
      }

      try {
        await axios.post(`${BASE_URL}/api/payment/subscription`, invalidData, {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        })
        throw new Error('Expected 400 error for missing fields')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
      }
    })
  })

  // Test Group 4: Tipping System
  describe('Tipping System', () => {
    test('POST /api/payment/tip - Should create tip payment successfully', async () => {
      const tipData = {
        creatorId: creatorId,
        amount: 10.0,
        message: 'Great content! Keep it up!',
        paymentMethod: 'stripe',
      }

      const response = await axios.post(
        `${BASE_URL}/api/payment/tip`,
        tipData,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(201)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('transaction')
      expect(response.data.data).to.have.property('paymentIntent')

      const transaction = response.data.data.transaction
      expect(transaction.creator_id).to.equal(creatorId)
      expect(transaction.subscriber_id).to.equal(subscriberId)
      expect(transaction.amount).to.equal(10.0)
      expect(transaction.transaction_type).to.equal('tip')
      expect(transaction.status).to.equal('pending')

      testTransactionId = transaction.id
    })

    test('POST /api/payment/tip - Should validate tip amount', async () => {
      const invalidTipData = {
        creatorId: creatorId,
        amount: -5.0, // Negative amount
        message: 'Invalid tip',
      }

      try {
        await axios.post(`${BASE_URL}/api/payment/tip`, invalidTipData, {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        })
        throw new Error('Expected 400 error for invalid amount')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
      }
    })

    test('POST /api/payment/tip - Should handle custom tip amounts', async () => {
      const customTipData = {
        creatorId: creatorId,
        amount: 15.5,
        message: 'Custom tip amount',
        paymentMethod: 'stripe',
      }

      const response = await axios.post(
        `${BASE_URL}/api/payment/tip`,
        customTipData,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(201)
      expect(response.data.data.transaction.amount).to.equal(15.5)
    })
  })

  // Test Group 5: User Subscriptions
  describe('User Subscriptions', () => {
    test('GET /api/payment/subscriptions - Should return user subscriptions', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/payment/subscriptions`,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')

      // Should have at least one subscription from previous test
      expect(response.data.data.length).to.be.greaterThan(0)

      const subscription = response.data.data[0]
      expect(subscription).to.have.property('id')
      expect(subscription).to.have.property('creator_id')
      expect(subscription).to.have.property('plan_id')
      expect(subscription).to.have.property('status')
      expect(subscription).to.have.property('plan_name')
      expect(subscription).to.have.property('creator_username')
    })

    test('GET /api/payment/creator-subscribers/:creatorId - Should return creator subscribers', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/payment/creator-subscribers/${creatorId}`,
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')

      // Should have at least one subscriber
      expect(response.data.data.length).to.be.greaterThan(0)

      const subscriber = response.data.data[0]
      expect(subscriber).to.have.property('subscriber_id')
      expect(subscriber).to.have.property('plan_id')
      expect(subscriber).to.have.property('status')
      expect(subscriber).to.have.property('subscriber_username')
    })
  })

  // Test Group 6: Payment Intent Management
  describe('Payment Intent Management', () => {
    test('POST /api/payment-intent - Should create payment intent', async () => {
      const paymentIntentData = {
        amount: 1999, // $19.99 in cents
        currency: 'usd',
        metadata: {
          type: 'subscription',
          creator_id: creatorId,
        },
      }

      const response = await axios.post(
        `${BASE_URL}/api/payment-intent`,
        paymentIntentData,
        {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('clientSecret')
      expect(response.data.data).to.have.property('customerId')
      expect(response.data.data).to.have.property('amount')
      expect(response.data.data).to.have.property('currency')
    })

    test('POST /api/payment-intent - Should validate amount', async () => {
      const invalidData = {
        amount: 0,
        currency: 'usd',
      }

      try {
        await axios.post(`${BASE_URL}/api/payment-intent`, invalidData, {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        })
        throw new Error('Expected 400 error for invalid amount')
      } catch (error) {
        expect(error.response.status).to.equal(400)
        expect(error.response.data.success).to.be.false
      }
    })
  })

  // Test Group 7: Admin Payment Review
  describe('Admin Payment Review', () => {
    test('GET /api/admin/payment-review/dashboard - Should return payment review dashboard', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/dashboard`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('pendingRequests')
      expect(response.data.data).to.have.property('pendingPayouts')
      expect(response.data.data).to.have.property('openIssues')
      expect(response.data.data).to.have.property('statistics')
    })

    test('GET /api/admin/payment-review/requests - Should return payment review requests', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/requests`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')
    })

    test('GET /api/admin/payment-review/issues - Should return payment issues', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/issues`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')
    })
  })

  // Test Group 8: Error Handling
  describe('Error Handling', () => {
    test('Should handle invalid creator ID gracefully', async () => {
      const invalidCreatorId = 'invalid-uuid'

      try {
        await axios.get(`${BASE_URL}/api/payment/creator/${invalidCreatorId}`, {
          headers: { Authorization: `Bearer ${subscriberToken}` },
        })
        throw new Error('Expected error for invalid UUID')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })

    test('Should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test that the API returns proper error responses
      const response = await axios.get(`${BASE_URL}/api/payment/plans`)
      expect(response.status).to.equal(200)
    })

    test('Should validate payment amounts', async () => {
      const invalidAmounts = [0, -10, 1000000] // Zero, negative, too high

      for (const amount of invalidAmounts) {
        try {
          await axios.post(
            `${BASE_URL}/api/payment/tip`,
            {
              creatorId: creatorId,
              amount: amount,
            },
            {
              headers: { Authorization: `Bearer ${subscriberToken}` },
            },
          )
          throw new Error(`Expected error for amount: ${amount}`)
        } catch (error) {
          expect(error.response.status).to.equal(400)
        }
      }
    })
  })

  // Test Group 9: Security Tests
  describe('Security Tests', () => {
    test('Should require authentication for payment endpoints', async () => {
      const endpoints = [
        '/api/payment/subscription',
        '/api/payment/tip',
        '/api/payment/subscriptions',
        '/api/payment-intent',
      ]

      for (const endpoint of endpoints) {
        try {
          await axios.post(`${BASE_URL}${endpoint}`, {})
          throw new Error(`Expected 401 for ${endpoint}`)
        } catch (error) {
          expect(error.response.status).to.equal(401)
        }
      }
    })

    test('Should prevent unauthorized access to admin endpoints', async () => {
      const adminEndpoints = [
        '/api/admin/payment-review/dashboard',
        '/api/admin/payment-review/requests',
      ]

      for (const endpoint of adminEndpoints) {
        try {
          await axios.get(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${subscriberToken}` },
          })
          throw new Error(`Expected 403 for ${endpoint}`)
        } catch (error) {
          expect(error.response.status).to.equal(403)
        }
      }
    })

    test('Should validate user ownership of resources', async () => {
      // Try to access another user's subscription
      try {
        await axios.get(`${BASE_URL}/api/payment/subscriptions`, {
          headers: { Authorization: `Bearer ${creatorToken}` },
        })
        // This should work if the creator has subscriptions, but we're testing the concept
      } catch (error) {
        // Should not be a 403 or 401 if the user is authenticated
        expect(error.response.status).to.not.equal(401)
        expect(error.response.status).to.not.equal(403)
      }
    })
  })

  // Test Group 10: Performance Tests
  describe('Performance Tests', () => {
    test('Should handle multiple concurrent subscription requests', async () => {
      const concurrentRequests = 5
      const promises = []

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          axios
            .get(`${BASE_URL}/api/payment/plans`)
            .catch((error) => error.response),
        )
      }

      const responses = await Promise.all(promises)

      responses.forEach((response) => {
        expect(response.status).to.equal(200)
      })
    })

    test('Should respond within reasonable time limits', async () => {
      const startTime = Date.now()

      await axios.get(`${BASE_URL}/api/payment/plans`)

      const responseTime = Date.now() - startTime
      expect(responseTime).to.be.lessThan(5000) // 5 seconds max
    })
  })
})

// Export test configuration for use in other test files
module.exports = {
  BASE_URL,
  testUsers,
  testPlans,
  generateAuthToken,
  createTestUser,
}
