require('dotenv').config()
const nodemailer = require('nodemailer')

async function testEmailConfig() {

  // Check environment variables
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@privatemessage.com',
  }

  if (!emailConfig.user || !emailConfig.password) {
    console.log('\n❌ Email configuration incomplete!')
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
    await transporter.verify()

    // Send test email
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
  } catch (error) {
    console.error('❌ Email test failed:', error.message)
  }
}

// Run the test
testEmailConfig()
