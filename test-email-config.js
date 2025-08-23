require('dotenv').config()
const nodemailer = require('nodemailer')

async function testEmailConfig() {
  console.log('🧪 Testing email configuration...')

  // Check environment variables
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@privatemessage.com',
  }

  console.log('📧 Email Configuration:')
  console.log(`  Host: ${emailConfig.host}`)
  console.log(`  Port: ${emailConfig.port}`)
  console.log(`  Secure: ${emailConfig.secure}`)
  console.log(`  User: ${emailConfig.user}`)
  console.log(`  From: ${emailConfig.from}`)
  console.log(
    `  Password: ${emailConfig.password ? '***SET***' : '***NOT SET***'}`,
  )

  if (!emailConfig.user || !emailConfig.password) {
    console.log('\n❌ Email configuration incomplete!')
    console.log('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file')
    console.log('\n📝 Example for Gmail:')
    console.log('EMAIL_USER=your-email@gmail.com')
    console.log('EMAIL_PASSWORD=your-app-password')
    return
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    })

    // Verify connection
    console.log('\n🔍 Verifying email connection...')
    await transporter.verify()
    console.log('✅ Email connection verified successfully!')

    // Send test email
    console.log('\n📤 Sending test email...')
    const testEmail = {
      from: emailConfig.from,
      to: emailConfig.user, // Send to yourself for testing
      subject: 'Test Email - Private Message App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Configuration Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p>If you received this email, your email service is properly configured!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from Private Message App
          </p>
        </div>
      `,
      text: 'This is a test email to verify your email configuration is working correctly.',
    }

    const info = await transporter.sendMail(testEmail)
    console.log('✅ Test email sent successfully!')
    console.log(`📧 Message ID: ${info.messageId}`)
    console.log(`📬 Check your inbox at: ${emailConfig.user}`)
  } catch (error) {
    console.error('❌ Email test failed:', error.message)
    console.log('\n🔧 Troubleshooting tips:')
    console.log('1. Make sure your email credentials are correct')
    console.log('2. For Gmail, use an App Password (not your regular password)')
    console.log('3. Enable 2-Factor Authentication on your Google account')
    console.log('4. Check if your email provider allows SMTP access')
  }
}

// Run the test
testEmailConfig()
