/**
 * Admin Payment Review Test Cases
 * Tests for admin payment management and review functionality
 */

const axios = require('axios')
const { expect } = require('chai')

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8000'

// Test data for admin payment review
const testPaymentData = {
  payoutRequest: {
    creatorId: 'test_creator_id',
    amount: 150.0,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      accountNumber: '1234567890',
      routingNumber: '021000021',
      accountType: 'checking',
    },
  },

  paymentIssue: {
    userId: 'test_user_id',
    issueType: 'failed_payment',
    description: 'Payment failed but was charged',
    priority: 'high',
  },

  paymentReviewRequest: {
    creatorId: 'test_creator_id',
    requestType: 'payout',
    amount: 200.0,
    description: 'Monthly payout request',
  },
}

describe('Admin Payment Review Tests', function () {
  this.timeout(30000)

  let adminToken
  let testPayoutRequestId
  let testPaymentIssueId
  let testReviewRequestId

  before(async () => {
    // Get admin authentication token
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'test_admin',
        password: 'TestPass123!',
      })
      adminToken = response.data.token
    } catch (error) {
      console.error('Admin authentication failed:', error.response?.data)
      throw error
    }
  })

  describe('Payment Review Dashboard', () => {
    test('GET /api/admin/payment-review/dashboard - Should return dashboard data', async () => {
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

      // Verify statistics structure
      const stats = response.data.data.statistics
      expect(stats).to.have.property('total_pending_requests')
      expect(stats).to.have.property('pending_requests')
      expect(stats).to.have.property('under_review_requests')
      expect(stats).to.have.property('total_pending_amount')
    })

    test('GET /api/admin/payment-review/dashboard - Should require admin authentication', async () => {
      try {
        await axios.get(`${BASE_URL}/api/admin/payment-review/dashboard`)
        throw new Error('Expected 401 error for missing authentication')
      } catch (error) {
        expect(error.response.status).to.equal(401)
      }
    })
  })

  describe('Payment Review Requests', () => {
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

      // Verify request structure if any exist
      if (response.data.data.length > 0) {
        const request = response.data.data[0]
        expect(request).to.have.property('id')
        expect(request).to.have.property('creator_id')
        expect(request).to.have.property('request_type')
        expect(request).to.have.property('amount')
        expect(request).to.have.property('status')
        expect(request).to.have.property('created_at')
      }
    })

    test('PUT /api/admin/payment-review/requests/:requestId - Should update request status', async () => {
      // First create a test review request
      const createResponse = await axios.post(
        `${BASE_URL}/api/admin/payment-review/requests`,
        testPaymentData.paymentReviewRequest,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      testReviewRequestId = createResponse.data.data.id

      // Update the request status
      const updateData = {
        status: 'approved',
        adminNotes: 'Request approved after review',
      }

      const response = await axios.put(
        `${BASE_URL}/api/admin/payment-review/requests/${testReviewRequestId}`,
        updateData,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data.status).to.equal('approved')
      expect(response.data.data.admin_notes).to.equal(
        'Request approved after review',
      )
    })

    test('PUT /api/admin/payment-review/requests/:requestId - Should validate request status', async () => {
      const invalidUpdateData = {
        status: 'invalid_status',
      }

      try {
        await axios.put(
          `${BASE_URL}/api/admin/payment-review/requests/${testReviewRequestId}`,
          invalidUpdateData,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        )
        throw new Error('Expected 400 error for invalid status')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })
  })

  describe('Payout Requests', () => {
    test('POST /api/admin/payment-review/payout - Should create payout request', async () => {
      const response = await axios.post(
        `${BASE_URL}/api/admin/payment-review/payout`,
        testPaymentData.payoutRequest,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(201)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('id')
      expect(response.data.data.creator_id).to.equal(
        testPaymentData.payoutRequest.creatorId,
      )
      expect(response.data.data.amount).to.equal(
        testPaymentData.payoutRequest.amount,
      )
      expect(response.data.data.status).to.equal('pending')

      testPayoutRequestId = response.data.data.id
    })

    test('GET /api/admin/payment-review/payouts - Should return payout requests', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/payouts`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')

      // Should have at least one payout request from previous test
      expect(response.data.data.length).to.be.greaterThan(0)

      const payout = response.data.data[0]
      expect(payout).to.have.property('id')
      expect(payout).to.have.property('creator_id')
      expect(payout).to.have.property('amount')
      expect(payout).to.have.property('status')
      expect(payout).to.have.property('payment_method')
    })

    test('PUT /api/admin/payment-review/payouts/:payoutId - Should update payout status', async () => {
      const updateData = {
        status: 'processing',
        adminNotes: 'Payout processing initiated',
      }

      const response = await axios.put(
        `${BASE_URL}/api/admin/payment-review/payouts/${testPayoutRequestId}`,
        updateData,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data.status).to.equal('processing')
    })
  })

  describe('Payment Issues', () => {
    test('POST /api/admin/payment-review/issues - Should create payment issue', async () => {
      const response = await axios.post(
        `${BASE_URL}/api/admin/payment-review/issues`,
        testPaymentData.paymentIssue,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(201)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('id')
      expect(response.data.data.user_id).to.equal(
        testPaymentData.paymentIssue.userId,
      )
      expect(response.data.data.issue_type).to.equal(
        testPaymentData.paymentIssue.issueType,
      )
      expect(response.data.data.status).to.equal('open')
      expect(response.data.data.priority).to.equal('high')

      testPaymentIssueId = response.data.data.id
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

      // Should have at least one issue from previous test
      expect(response.data.data.length).to.be.greaterThan(0)

      const issue = response.data.data[0]
      expect(issue).to.have.property('id')
      expect(issue).to.have.property('user_id')
      expect(issue).to.have.property('issue_type')
      expect(issue).to.have.property('description')
      expect(issue).to.have.property('status')
      expect(issue).to.have.property('priority')
    })

    test('PUT /api/admin/payment-review/issues/:issueId - Should update issue status', async () => {
      const updateData = {
        status: 'resolved',
        resolutionNotes: 'Issue resolved by issuing refund',
        adminNotes: 'Refund processed successfully',
      }

      const response = await axios.put(
        `${BASE_URL}/api/admin/payment-review/issues/${testPaymentIssueId}`,
        updateData,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data.status).to.equal('resolved')
      expect(response.data.data.resolution_notes).to.equal(
        'Issue resolved by issuing refund',
      )
    })
  })

  describe('Payment Audit Log', () => {
    test('GET /api/admin/payment-review/audit-log - Should return payment audit log', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/audit-log`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')

      // Verify audit log entry structure if any exist
      if (response.data.data.length > 0) {
        const auditEntry = response.data.data[0]
        expect(auditEntry).to.have.property('id')
        expect(auditEntry).to.have.property('admin_id')
        expect(auditEntry).to.have.property('action')
        expect(auditEntry).to.have.property('entity_type')
        expect(auditEntry).to.have.property('entity_id')
        expect(auditEntry).to.have.property('created_at')
      }
    })

    test('GET /api/admin/payment-review/audit-log - Should support filtering', async () => {
      const filters = {
        entity_type: 'payout_request',
        action: 'update',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      }

      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/audit-log`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: filters,
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.be.an('array')
    })
  })

  describe('Payment Analytics', () => {
    test('GET /api/admin/payment-review/analytics - Should return payment analytics', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/analytics`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
      expect(response.data.data).to.have.property('totalRevenue')
      expect(response.data.data).to.have.property('totalTransactions')
      expect(response.data.data).to.have.property('averageTransactionValue')
      expect(response.data.data).to.have.property('successRate')
      expect(response.data.data).to.have.property('monthlyTrends')
    })

    test('GET /api/admin/payment-review/analytics - Should support date range filtering', async () => {
      const dateRange = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }

      const response = await axios.get(
        `${BASE_URL}/api/admin/payment-review/analytics`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: dateRange,
        },
      )

      expect(response.status).to.equal(200)
      expect(response.data.success).to.be.true
    })
  })

  describe('Error Handling', () => {
    test('Should handle invalid request IDs gracefully', async () => {
      const invalidId = 'invalid-uuid'

      try {
        await axios.put(
          `${BASE_URL}/api/admin/payment-review/requests/${invalidId}`,
          {
            status: 'approved',
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          },
        )
        throw new Error('Expected 400 error for invalid UUID')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })

    test('Should handle non-existent resources', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      try {
        await axios.put(
          `${BASE_URL}/api/admin/payment-review/requests/${fakeId}`,
          {
            status: 'approved',
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          },
        )
        throw new Error('Expected 404 error for non-existent resource')
      } catch (error) {
        expect(error.response.status).to.equal(404)
      }
    })

    test('Should validate required fields in requests', async () => {
      const invalidData = {
        // Missing required fields
      }

      try {
        await axios.post(
          `${BASE_URL}/api/admin/payment-review/payout`,
          invalidData,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          },
        )
        throw new Error('Expected 400 error for missing required fields')
      } catch (error) {
        expect(error.response.status).to.equal(400)
      }
    })
  })

  describe('Authorization Tests', () => {
    test('Should prevent non-admin access to admin endpoints', async () => {
      // Create a regular user token
      const userResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'test_user',
        password: 'TestPass123!',
      })
      const userToken = userResponse.data.token

      const adminEndpoints = [
        '/api/admin/payment-review/dashboard',
        '/api/admin/payment-review/requests',
        '/api/admin/payment-review/issues',
      ]

      for (const endpoint of adminEndpoints) {
        try {
          await axios.get(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
          throw new Error(`Expected 403 for ${endpoint}`)
        } catch (error) {
          expect(error.response.status).to.equal(403)
        }
      }
    })
  })

  after(async () => {
    // Clean up test data
    console.log('Cleaning up admin payment test data...')

    // Delete test records if they exist
    if (testPayoutRequestId) {
      try {
        await axios.delete(
          `${BASE_URL}/api/admin/payment-review/payouts/${testPayoutRequestId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          },
        )
      } catch (error) {
        console.log('Cleanup warning:', error.message)
      }
    }

    if (testPaymentIssueId) {
      try {
        await axios.delete(
          `${BASE_URL}/api/admin/payment-review/issues/${testPaymentIssueId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          },
        )
      } catch (error) {
        console.log('Cleanup warning:', error.message)
      }
    }

    console.log('Admin payment test cleanup complete')
  })
})

module.exports = {
  testPaymentData,
}
