require('dotenv').config()
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

const BASE_URL = 'http://localhost:8000/api'

async function testRegistrationFlow() {
  // Test data
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'testpassword123',
    email: 'admin@nyxcipher.ai', // Using your company email for testing
  }

  try {
    // Step 1: Register user
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    })

    const registerData = await registerResponse.json()

    if (!registerResponse.ok) {
      console.error('❌ Registration failed:', registerData.message)
      return
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testRegistrationFlow()
