import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import jwt from 'jsonwebtoken'
import pool from '../../util/postgre'
import bcrypt from 'bcrypt'
import { config } from '../../config'
import {
  generateVerificationCode,
  getExpirationTime,
  isVerificationCodeExpired,
  sanitizeEmail,
} from '../../util/verificationUtils'
import { EmailService } from '../../util/emailService'

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'Username and password are required.' }) as Response
  }

  const userResult = await pool.query(
    'SELECT * FROM "User" WHERE username = $1',
    [username],
  )
  if (userResult.rows.length === 0) {
    return res
      .status(401)
      .json({ message: 'Invalid username or password.' }) as Response
  }
  const user = userResult.rows[0]

  // Check if user is banned
  if (user.banned) {
    return res
      .status(403)
      .json({
        message:
          'Your account has been banned. Please contact support for more information.',
      }) as Response
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    return res
      .status(401)
      .json({ message: 'Invalid username or password.' }) as Response
  }

  const secretKey = config.jwt.secret
  const options = { expiresIn: '1h' }
  const payload = { id: user.id, username: user.username }
  const token = jwt.sign(payload, secretKey, options)

  // Exclude password and pass avatar as string
  const { password: userPassword, ...userWithoutPassword } = user
  // avatar is now a string (URL or null)
  res.status(200).json({ token, user: userWithoutPassword }) as Response
})

// VERIFY EMAIL
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body

  if (!email || !verificationCode) {
    return res
      .status(400)
      .json({
        message: 'Email and verification code are required.',
      }) as Response
  }

  const sanitizedEmail = sanitizeEmail(email)

  // Find user by email
  const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [
    sanitizedEmail,
  ])

  if (userResult.rows.length === 0) {
    return res
      .status(404)
      .json({ message: 'User not found with this email address.' }) as Response
  }

  const user = userResult.rows[0]

  // Check if already verified
  if (user.email_verified) {
    return res
      .status(200)
      .json({ message: 'Email is already verified.', user }) as Response
  }

  // Check if verification code matches
  if (user.verification_code !== verificationCode) {
    return res
      .status(400)
      .json({ message: 'Invalid verification code.' }) as Response
  }

  // Check if verification code has expired
  if (
    user.verification_code_expires &&
    isVerificationCodeExpired(user.verification_code_expires)
  ) {
    return res
      .status(400)
      .json({
        message: 'Verification code has expired. Please request a new one.',
      }) as Response
  }

  // Update user to mark email as verified
  await pool.query(
    'UPDATE "User" SET email_verified = $1, verification_code = NULL, verification_code_expires = NULL WHERE email = $2',
    [true, sanitizedEmail],
  )

  // Get updated user
  const updatedUserResult = await pool.query(
    'SELECT * FROM "User" WHERE email = $1',
    [sanitizedEmail],
  )
  const updatedUser = updatedUserResult.rows[0]
  const { password: userPassword, ...userWithoutPassword } = updatedUser

  return res.status(200).json({
    message: 'Email verified successfully.',
    user: userWithoutPassword,
  }) as Response
})

// RESEND VERIFICATION CODE
export const resendVerificationCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' }) as Response
    }

    const sanitizedEmail = sanitizeEmail(email)

    // Find user by email
    const userResult = await pool.query(
      'SELECT * FROM "User" WHERE email = $1',
      [sanitizedEmail],
    )

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: 'User not found with this email address.',
        }) as Response
    }

    const user = userResult.rows[0]

    // Check if already verified
    if (user.email_verified) {
      return res
        .status(200)
        .json({ message: 'Email is already verified.' }) as Response
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const expirationTime = getExpirationTime(15) // 15 minutes

    // Update user with new verification code
    await pool.query(
      'UPDATE "User" SET verification_code = $1, verification_code_expires = $2 WHERE email = $3',
      [verificationCode, expirationTime, sanitizedEmail],
    )

    // Send verification email
    const emailService = new EmailService()
    const emailSent = await emailService.sendVerificationEmail(
      sanitizedEmail,
      user.username || user.alias || 'User',
      verificationCode,
    )

    if (!emailSent) {
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again later.',
        emailSent: false,
      }) as Response
    }

    return res.status(200).json({
      message: 'Verification code sent to your email.',
      emailSent: true,
    }) as Response
  },
)
