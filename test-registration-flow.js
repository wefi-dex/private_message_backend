require('dotenv').config()
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

const BASE_URL = 'http://localhost:8000/api'

async function testRegistrationFlow() {
  console.log('🧪 Testing Email Verification Registration Flow...\n')

  // Test data
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'testpassword123',
    email: 'admin@nyxcipher.ai', // Using your company email for testing
  }

  try {
    // Step 1: Register user
    console.log('📝 Step 1: Registering user...')
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    })

    const registerData = await registerResponse.json()
    console.log('Registration Response:', registerData)

    if (!registerResponse.ok) {
      console.error('❌ Registration failed:', registerData.message)
      return
    }

    console.log('✅ Registration successful!')
    console.log('📧 Verification email should be sent to:', testUser.email)
    console.log('\n📋 Next steps:')
    console.log('1. Check your email for the 6-digit verification code')
    console.log(
      '2. Use the code to verify your email via POST /api/auth/verify-email',
    )
    console.log('3. Then login via POST /api/auth/login')

    // Example verification request
    console.log('\n📝 Example verification request:')
    console.log('POST /api/auth/verify-email')
    console.log(
      'Body:',
      JSON.stringify(
        {
          email: testUser.email,
          verificationCode: '123456', // Replace with actual code from email
        },
        null,
        2,
      ),
    )

    // Example login request
    console.log('\n📝 Example login request (after verification):')
    console.log('POST /api/auth/login')
    console.log(
      'Body:',
      JSON.stringify(
        {
          username: testUser.username,
          password: testUser.password,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\n🔧 Make sure your backend server is running on port 8000')
    console.log('Run: npm run dev')
  }
}

// Run the test
testRegistrationFlow()
