import nodemailer from 'nodemailer'
import { config } from '../config'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
  ): Promise<boolean> {
    const subject = 'Verify Your Email - Private Message App'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Private Message!</h2>
        <p>Hi ${username},</p>
        <p>Thank you for registering with Private Message. Please verify your email address by entering the verification code below:</p>

        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
        </div>

        <p><strong>This code will expire in 15 minutes.</strong></p>

        <p>If you didn't create an account with Private Message, please ignore this email.</p>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from Private Message. Please do not reply to this email.
        </p>
      </div>
    `

    const text = `
      Welcome to Private Message!

      Hi ${username},

      Thank you for registering with Private Message. Please verify your email address by entering the verification code below:

      Verification Code: ${verificationCode}

      This code will expire in 15 minutes.

      If you didn't create an account with Private Message, please ignore this email.
    `

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    })
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetCode: string,
  ): Promise<boolean> {
    const subject = 'Password Reset - Private Message App'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Use the code below to reset your password:</p>

        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #dc3545; font-size: 32px; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
        </div>

        <p><strong>This code will expire in 15 minutes.</strong></p>

        <p>If you didn't request a password reset, please ignore this email.</p>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from Private Message. Please do not reply to this email.
        </p>
      </div>
    `

    return this.sendEmail({
      to: email,
      subject,
      html,
    })
  }
}

export const emailService = new EmailService()
