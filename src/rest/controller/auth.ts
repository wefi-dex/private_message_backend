import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import jwt from 'jsonwebtoken'
import pool from '../../util/postgre'
import bcrypt from 'bcrypt'
import { config } from '../../config'
import { emailService } from '../../util/emailService'
import {
  generateVerificationCode,
  getExpirationTime,
  validateEmail,
  sanitizeEmail,
  isVerificationCodeExpired,
} from '../../util/verificationUtils'
import { v4 as uuidv4 } from 'uuid'

export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    username,
    password,
    email,
    role = 'fan',
    bio = '',
    avatar = '',
  } = req.body

  if (!username || !password || !email) {
    return res.status(400).json({
      message: 'Username, password, and email are required.',
    }) as Response
  }

  // Validate role
  if (!['fan', 'creator'].includes(role)) {
    return res.status(400).json({
      message: 'Role must be either "fan" or "creator".',
    }) as Response
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ message: 'Please provide a valid email address.' }) as Response
  }

  const sanitizedEmail = sanitizeEmail(email)

  // Check if email already exists (for re-registration logic)
  const existingEmailResult = await pool.query(
    'SELECT id, email_verified FROM "User" WHERE email = $1',
    [sanitizedEmail],
  )

  // Check if username already exists (excluding current user if re-registering)
  let existingUserResult
  if (
    existingEmailResult.rows.length > 0 &&
    !existingEmailResult.rows[0].email_verified
  ) {
    // Re-registration case: exclude the current user from username check
    existingUserResult = await pool.query(
      'SELECT id FROM "User" WHERE username = $1 AND id != $2',
      [username, existingEmailResult.rows[0].id],
    )
  } else {
    // New registration case: check all usernames
    existingUserResult = await pool.query(
      'SELECT id FROM "User" WHERE username = $1',
      [username],
    )
  }

  if (existingUserResult.rows.length > 0) {
    return res
      .status(400)
      .json({ message: 'Username already exists.' }) as Response
  }

  // Check if email is already verified (for re-registration logic)
  if (existingEmailResult.rows.length > 0) {
    const existingUser = existingEmailResult.rows[0]

    // If email is already verified, prevent re-registration
    if (existingUser.email_verified) {
      return res
        .status(400)
        .json({ message: 'Email already registered and verified.' }) as Response
    }

    // If email exists but not verified, allow re-registration
    console.log(
      `Allowing re-registration for unverified email: ${sanitizedEmail}`,
    )
  }

  // Hash password
  const saltRounds = 10
  const hashedPassword = await bcrypt.hash(password, saltRounds)

  // Generate verification code
  const verificationCode = generateVerificationCode()
  const expiresAt = getExpirationTime(15) // 15 minutes

  let user

  if (existingEmailResult.rows.length > 0) {
    // Re-registration: Update existing unverified user
    const existingUser = existingEmailResult.rows[0]
    const result = await pool.query(
      `UPDATE "User"
       SET username = $1, password = $2, bio = $3, avatar = $4, verification_code = $5, verification_code_expires = $6, email_verified = $7, role = $8, creator_approved = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING id, username, email, bio, avatar, email_verified, role, creator_approved, created_at`,
      [
        username,
        hashedPassword,
        bio,
        avatar,
        verificationCode,
        expiresAt,
        false,
        role,
        role === 'creator' ? false : true, // Creators need approval, fans are auto-approved
        existingUser.id,
      ],
    )
    user = result.rows[0]
  } else {
    // New registration: Create new user
    const userId = uuidv4()
    const result = await pool.query(
      `INSERT INTO "User" (id, username, password, email, bio, avatar, verification_code, verification_code_expires, email_verified, role, creator_approved, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id, username, email, bio, avatar, email_verified, role, creator_approved, created_at`,
      [
        userId,
        username,
        hashedPassword,
        sanitizedEmail,
        bio,
        avatar,
        verificationCode,
        expiresAt,
        false,
        role,
        role === 'creator' ? false : true, // Creators need approval, fans are auto-approved
      ],
    )
    user = result.rows[0]
  }

  // Send verification email
  const emailSent = await emailService.sendVerificationEmail(
    sanitizedEmail,
    username,
    verificationCode,
  )

  if (!emailSent) {
    // If email fails, still create user but notify about email issue
    console.warn(`Failed to send verification email to ${sanitizedEmail}`)
  }

  const isReRegistration = existingEmailResult.rows.length > 0
  const isCreator = role === 'creator'
  const approvalMessage = isCreator
    ? ' Your creator account is pending admin approval. You will be notified once approved.'
    : ''

  const message = isReRegistration
    ? `Account updated successfully. Please check your email for the new verification code.${approvalMessage}`
    : `Registration successful. Please check your email for verification code.${approvalMessage}`

  res.status(201).json({
    message,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      email_verified: user.email_verified,
      role: user.role,
      creator_approved: user.creator_approved,
    },
    emailSent,
    isReRegistration,
    isCreator,
  }) as Response
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body

  if (!email || !verificationCode) {
    return res.status(400).json({
      message: 'Email and verification code are required.',
    }) as Response
  }

  const sanitizedEmail = sanitizeEmail(email)

  // Find user by email
  const userResult = await pool.query(
    'SELECT id, username, verification_code, verification_code_expires, email_verified FROM "User" WHERE email = $1',
    [sanitizedEmail],
  )

  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: 'User not found.' }) as Response
  }

  const user = userResult.rows[0]

  // Check if already verified
  if (user.email_verified) {
    return res
      .status(400)
      .json({ message: 'Email is already verified.' }) as Response
  }

  // Check if verification code matches
  if (user.verification_code !== verificationCode) {
    return res
      .status(400)
      .json({ message: 'Invalid verification code.' }) as Response
  }

  // Check if verification code is expired
  if (isVerificationCodeExpired(user.verification_code_expires)) {
    return res.status(400).json({
      message: 'Verification code has expired. Please request a new one.',
    }) as Response
  }

  // Mark email as verified and clear verification code
  await pool.query(
    'UPDATE "User" SET email_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = NOW() WHERE id = $1',
    [user.id],
  )

  res.status(200).json({
    message: 'Email verified successfully! You can now log in.',
    user: {
      id: user.id,
      username: user.username,
      email: sanitizedEmail,
      email_verified: true,
    },
  }) as Response
})

export const resendVerificationCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' }) as Response
    }

    const sanitizedEmail = sanitizeEmail(email)

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, username, email_verified FROM "User" WHERE email = $1',
      [sanitizedEmail],
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' }) as Response
    }

    const user = userResult.rows[0]

    // Check if already verified
    if (user.email_verified) {
      return res
        .status(400)
        .json({ message: 'Email is already verified.' }) as Response
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const expiresAt = getExpirationTime(15) // 15 minutes

    // Update verification code
    await pool.query(
      'UPDATE "User" SET verification_code = $1, verification_code_expires = $2, updated_at = NOW() WHERE id = $1',
      [verificationCode, expiresAt, user.id],
    )

    // Send new verification email
    const emailSent = await emailService.sendVerificationEmail(
      sanitizedEmail,
      user.username,
      verificationCode,
    )

    if (!emailSent) {
      console.warn(`Failed to send verification email to ${sanitizedEmail}`)
    }

    res.status(200).json({
      message: 'New verification code sent to your email.',
      emailSent,
    }) as Response
  },
)

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body

  if (!password) {
    return res
      .status(400)
      .json({ message: 'Password is required.' }) as Response
  }

  if (!username && !email) {
    return res
      .status(400)
      .json({ message: 'Username or email is required.' }) as Response
  }

  // Determine if input is username or email
  const isEmail = email || (username && username.includes('@'))
  const identifier = email || username

  let userResult
  if (isEmail) {
    // Search by email
    userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [
      identifier,
    ])
  } else {
    // Search by username
    userResult = await pool.query('SELECT * FROM "User" WHERE username = $1', [
      identifier,
    ])
  }
  if (userResult.rows.length === 0) {
    return res.status(401).json({
      message: 'Invalid username or password.',
      errorType: 'invalid_credentials',
    }) as Response
  }
  const user = userResult.rows[0]

  // Check if user is banned
  if (user.banned) {
    return res.status(403).json({
      message:
        'Your account has been banned. Please contact support for more information.',
    }) as Response
  }

  // Check if email is verified
  if (!user.email_verified) {
    return res.status(403).json({
      message:
        'Please verify your email address before logging in. Check your email for the verification code.',
      needsVerification: true,
      email: user.email,
      errorType: 'email_not_verified',
    }) as Response
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    return res.status(401).json({
      message: 'Invalid username or password.',
      errorType: 'invalid_credentials',
    }) as Response
  }

  const secretKey = config.jwt.secret
  const options = { expiresIn: '1h' }
  const payload = { id: user.id, username: user.username }
  const token = jwt.sign(payload, secretKey, options)

  // Exclude password and pass avatar as string
  const { password: userPassword, ...userWithoutPassword } = user
  // avatar is now a string (URL or null)
  console.log('Backend login: User data being returned:', userWithoutPassword)
  res.status(200).json({ token, user: userWithoutPassword }) as Response
})
