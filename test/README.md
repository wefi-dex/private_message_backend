# Payment System Test Suite

## Overview

This test suite provides comprehensive testing for the payment system functionality, including subscriptions, tips, webhooks, and admin payment management. The tests ensure that all payment-related features work correctly and securely.

## Test Structure

### 📁 Test Files

1. **`payment-system.test.js`** - Core payment functionality tests
2. **`webhook-tests.js`** - Stripe webhook handling tests
3. **`admin-payment-tests.js`** - Admin payment review tests
4. **`run-tests.js`** - Test runner and reporting

### 🧪 Test Categories

#### 1. **Subscription Plans**

- ✅ Get available subscription plans
- ✅ Plan validation and ordering
- ✅ Plan feature verification

#### 2. **Creator Subscription Management**

- ✅ Creator subscription info retrieval
- ✅ Non-existent creator handling
- ✅ Subscription status validation

#### 3. **Subscription Creation**

- ✅ Successful subscription creation
- ✅ Duplicate subscription prevention
- ✅ Authentication requirements
- ✅ Required field validation

#### 4. **Tipping System**

- ✅ Tip payment creation
- ✅ Amount validation
- ✅ Custom tip amounts
- ✅ Tip message handling

#### 5. **User Subscriptions**

- ✅ User subscription retrieval
- ✅ Creator subscriber lists
- ✅ Subscription data validation

#### 6. **Payment Intent Management**

- ✅ Payment intent creation
- ✅ Amount validation
- ✅ Currency handling

#### 7. **Admin Payment Review**

- ✅ Payment review dashboard
- ✅ Payout request management
- ✅ Payment issue handling
- ✅ Audit logging

#### 8. **Webhook Handling**

- ✅ Webhook signature verification
- ✅ Payment intent events
- ✅ Subscription events
- ✅ Error handling

#### 9. **Security Tests**

- ✅ Authentication requirements
- ✅ Authorization checks
- ✅ Input validation
- ✅ Resource ownership

#### 10. **Performance Tests**

- ✅ Concurrent request handling
- ✅ Response time validation
- ✅ Load testing

## 🚀 Getting Started

### Prerequisites

1. **Server Running**: Ensure the backend server is running on `http://localhost:8000`
2. **Database Setup**: Payment system database tables should be created
3. **Dependencies**: Install test dependencies

```bash
npm install axios chai mocha
```

### Environment Setup

Create a `.env.test` file for test configuration:

```env
# Test Configuration
TEST_BASE_URL=http://localhost:8000
NODE_ENV=test

# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/test_db
```

## 🏃‍♂️ Running Tests

### Run All Tests

```bash
# Using the test runner
node test/run-tests.js all

# Or using npm script (if configured)
npm run test:payment
```

### Run Specific Test Categories

```bash
# Core payment functionality
node test/run-tests.js payment

# Webhook tests
node test/run-tests.js webhook

# Admin payment tests
node test/run-tests.js admin
```

### Individual Test Files

```bash
# Run specific test files directly
node test/payment-system.test.js
node test/webhook-tests.js
node test/admin-payment-tests.js
```

## 📊 Test Reports

### Report Generation

Tests automatically generate detailed reports in the `test-reports/` directory:

- **JSON Reports**: Detailed test results in JSON format
- **HTML Reports**: Visual test reports for easy viewing
- **Console Output**: Real-time test progress and results

### Report Structure

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "duration": 15000
  },
  "results": [
    {
      "file": "payment-system.test.js",
      "success": true,
      "duration": 5000,
      "error": null
    }
  ]
}
```

## 🧪 Test Data

### Test Users

The test suite creates and manages test users:

```javascript
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
```

### Test Plans

```javascript
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
```

## 🔧 Test Configuration

### Test Runner Configuration

```javascript
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3,
  parallel: false,
  coverage: true,
  reportDir: './test-reports',
  testFiles: [
    './test/payment-system.test.js',
    './test/webhook-tests.js',
    './test/admin-payment-tests.js',
  ],
}
```

### Environment Variables

| Variable                | Description              | Default                 |
| ----------------------- | ------------------------ | ----------------------- |
| `TEST_BASE_URL`         | Base URL for API testing | `http://localhost:8000` |
| `NODE_ENV`              | Environment mode         | `test`                  |
| `STRIPE_SECRET_KEY`     | Stripe test secret key   | Required                |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret    | Required                |

## 🛠️ Test Utilities

### Helper Functions

```javascript
// Authentication helper
const generateAuthToken = async (userData) => {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, userData)
  return response.data.token
}

// User creation helper
const createTestUser = async (userData) => {
  const response = await axios.post(`${BASE_URL}/api/auth/register`, userData)
  return response.data.user
}

// Webhook signature helper
const createWebhookSignature = (payload, secret) => {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  return `t=${timestamp},v1=${signature}`
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Server Not Running**

```
❌ Server is not running
Please start the server before running tests
```

**Solution**: Start the backend server with `npm run dev`

#### 2. **Database Connection Issues**

```
❌ Database connection failed
```

**Solution**: Ensure database is running and connection string is correct

#### 3. **Authentication Failures**

```
❌ Admin authentication failed
```

**Solution**: Verify test user credentials and database setup

#### 4. **Stripe Configuration**

```
❌ Stripe webhook signature verification failed
```

**Solution**: Check Stripe test keys and webhook secret configuration

### Debug Mode

Enable debug logging:

```bash
DEBUG=payment-tests node test/run-tests.js all
```

### Verbose Output

```bash
# Run with verbose output
node test/run-tests.js all --verbose
```

## 📈 Test Coverage

### Current Coverage Areas

- ✅ **API Endpoints**: All payment-related endpoints tested
- ✅ **Authentication**: JWT token validation and role-based access
- ✅ **Data Validation**: Input validation and error handling
- ✅ **Database Operations**: CRUD operations for payment entities
- ✅ **Webhook Processing**: Stripe webhook event handling
- ✅ **Security**: Authentication, authorization, and input sanitization
- ✅ **Error Handling**: Graceful error handling and user feedback
- ✅ **Performance**: Response time and concurrent request handling

### Coverage Gaps

- 🔄 **Integration Tests**: End-to-end payment flow testing
- 🔄 **Load Testing**: High-volume transaction testing
- 🔄 **Stress Testing**: System behavior under extreme conditions
- 🔄 **Security Penetration**: Advanced security testing

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Payment System Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:payment
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: test-reports/
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:payment:quick"
    }
  }
}
```

## 📝 Adding New Tests

### Test Structure Template

```javascript
describe('New Feature Tests', () => {
  test('Should perform expected behavior', async () => {
    // Arrange
    const testData = {
      /* test data */
    }

    // Act
    const response = await axios.post('/api/endpoint', testData)

    // Assert
    expect(response.status).to.equal(200)
    expect(response.data.success).to.be.true
  })
})
```

### Test Naming Convention

- **Feature Tests**: `FeatureName.test.js`
- **Integration Tests**: `integration/FeatureName.integration.test.js`
- **Unit Tests**: `unit/FeatureName.unit.test.js`

### Test Data Management

```javascript
// Create test data factories
const createTestSubscription = (overrides = {}) => ({
  creatorId: 'test-creator-id',
  planId: 'test-plan-id',
  amount: 9.99,
  ...overrides,
})
```

## 🎯 Best Practices

### Test Writing Guidelines

1. **Arrange-Act-Assert**: Structure tests with clear sections
2. **Descriptive Names**: Use clear, descriptive test names
3. **Isolation**: Each test should be independent
4. **Cleanup**: Always clean up test data
5. **Error Testing**: Test both success and failure scenarios

### Performance Guidelines

1. **Timeout Management**: Set appropriate timeouts for async operations
2. **Resource Cleanup**: Clean up resources after tests
3. **Parallel Execution**: Use parallel execution when possible
4. **Mocking**: Mock external dependencies for faster tests

### Security Guidelines

1. **Test Data Isolation**: Use separate test databases
2. **Credential Management**: Never commit real credentials
3. **Input Validation**: Test all input validation scenarios
4. **Authorization**: Test all authorization scenarios

## 📚 Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Jest Testing Framework](https://jestjs.io/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Axios HTTP Client](https://axios-http.com/)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Add comprehensive test coverage
3. Update this documentation
4. Ensure all tests pass
5. Add appropriate error handling
6. Include performance considerations

---

This test suite ensures the payment system is robust, secure, and reliable for production use.
