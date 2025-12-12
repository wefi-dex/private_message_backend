import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import jwt from "jsonwebtoken";
import pool from "../../util/postgre";
import bcrypt from "bcrypt";
import { config } from "../../config";
import { emailService } from "../../util/emailService";
import {
  generateVerificationCode,
  getExpirationTime,
  validateEmail,
  sanitizeEmail,
  isVerificationCodeExpired,
} from "../../util/verificationUtils";
import { v4 as uuidv4 } from "uuid";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    username,
    password,
    email,
    bio = "",
    avatar = "",
    alias = "",
  } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      message: "Username, password, and email are required.",
    }) as Response;
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ message: "Please provide a valid email address." }) as Response;
  }

  const sanitizedEmail = sanitizeEmail(email);

  // Check if email already exists (for re-registration logic)
  const existingEmailResult = await pool.query(
    'SELECT id, email_verified, username FROM "User" WHERE email = $1',
    [sanitizedEmail]
  );

  // Check if username already exists (excluding current user if re-registering)
  let existingUserResult;
  if (
    existingEmailResult.rows.length > 0 &&
    !existingEmailResult.rows[0].email_verified
  ) {
    // Re-registration case: exclude the current user from username check
    existingUserResult = await pool.query(
      'SELECT id FROM "User" WHERE username = $1 AND id != $2',
      [username, existingEmailResult.rows[0].id]
    );
  } else {
    // New registration case: check all usernames
    existingUserResult = await pool.query(
      'SELECT id FROM "User" WHERE username = $1',
      [username]
    );
  }

  if (existingUserResult.rows.length > 0) {
    return res
      .status(400)
      .json({ message: "Username already exists." }) as Response;
  }

  // Check if email is already verified (for re-registration logic)
  if (existingEmailResult.rows.length > 0) {
    const existingUser = existingEmailResult.rows[0];

    // If email is already verified, prevent re-registration
    if (existingUser.email_verified) {
      return res
        .status(400)
        .json({
          message: "Email already registered and verified.",
        }) as Response;
    }

    // If email exists but not verified, return special response to show verification UI
    return res.status(409).json({
      message:
        "Email already registered but not verified. Please verify your email first.",
      needsVerification: true,
      email: sanitizedEmail,
      existingUsername: existingUser.username,
      errorType: "email_not_verified",
    }) as Response;
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = getExpirationTime(15); // 15 minutes

  let user;

  if (existingEmailResult.rows.length > 0) {
    // Re-registration: Update existing unverified user
    const existingUser = existingEmailResult.rows[0];
    const result = await pool.query(
      `UPDATE "User"
       SET username = $1, password = $2, bio = $3, avatar = $4, alias = $5, verification_code = $6, verification_code_expires = $7, email_verified = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id, username, email, bio, avatar, alias, email_verified, created_at`,
      [
        username,
        hashedPassword,
        bio,
        avatar,
        alias,
        verificationCode,
        expiresAt,
        false,
        existingUser.id,
      ]
    );
    user = result.rows[0];
  } else {
    // New registration: Create new user
    const userId = uuidv4();
    const result = await pool.query(
      `INSERT INTO "User" (id, username, password, email, bio, avatar, alias, verification_code, verification_code_expires, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id, username, email, bio, avatar, alias, email_verified, created_at`,
      [
        userId,
        username,
        hashedPassword,
        sanitizedEmail,
        bio,
        avatar,
        alias,
        verificationCode,
        expiresAt,
        false,
      ]
    );
    user = result.rows[0];
  }

  // Send verification email
  const emailSent = await emailService.sendVerificationEmail(
    sanitizedEmail,
    username,
    verificationCode
  );

  if (!emailSent) {
    // If email fails, still create user but notify about email issue
    console.error(`Failed to send verification email to ${sanitizedEmail}`);
    // Return 201 but with emailSent: false so frontend can handle it
    const isReRegistration = existingEmailResult.rows.length > 0;
    return res.status(201).json({
      message:
        'Registration successful, but failed to send verification email. Please use "Resend Code" to receive your verification code.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        alias: user.alias,
        email_verified: user.email_verified,
      },
      emailSent: false,
      isReRegistration,
    }) as Response;
  }

  const isReRegistration = existingEmailResult.rows.length > 0;

  const message = isReRegistration
    ? "Account updated successfully. Please check your email for the new verification code."
    : "Registration successful. Please check your email for verification code.";

  res.status(201).json({
    message,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      alias: user.alias,
      email_verified: user.email_verified,
    },
    emailSent: true,
    isReRegistration,
  }) as Response;
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).json({
      message: "Email and verification code are required.",
    }) as Response;
  }

  const sanitizedEmail = sanitizeEmail(email);

  // Find user by email
  const userResult = await pool.query(
    'SELECT id, username, verification_code, verification_code_expires, email_verified FROM "User" WHERE email = $1',
    [sanitizedEmail]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: "User not found." }) as Response;
  }

  const user = userResult.rows[0];

  // Check if already verified
  if (user.email_verified) {
    return res
      .status(400)
      .json({ message: "Email is already verified." }) as Response;
  }

  // Check if verification code matches
  if (user.verification_code !== verificationCode) {
    return res
      .status(400)
      .json({ message: "Invalid verification code." }) as Response;
  }

  // Check if verification code is expired
  if (isVerificationCodeExpired(user.verification_code_expires)) {
    return res.status(400).json({
      message: "Verification code has expired. Please request a new one.",
    }) as Response;
  }

  // Mark email as verified and clear verification code
  await pool.query(
    'UPDATE "User" SET email_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = NOW() WHERE id = $1',
    [user.id]
  );

  res.status(200).json({
    message: "Email verified successfully! You can now log in.",
    user: {
      id: user.id,
      username: user.username,
      email: sanitizedEmail,
      email_verified: true,
    },
  }) as Response;
});

export const resendVerificationCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required." }) as Response;
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email - also check verification_code to ensure they need a code
    const userResult = await pool.query(
      'SELECT id, username, email_verified, verification_code FROM "User" WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." }) as Response;
    }

    const user = userResult.rows[0];

    // Check if already verified - only block if truly verified (explicitly true)
    // Use strict comparison to avoid issues with null/undefined
    if (user.email_verified === true) {
      return res
        .status(400)
        .json({
          message: "Email is already verified. You can log in now.",
        }) as Response;
    }

    // If email_verified is null or false, allow resending
    // This handles cases where the field might be incorrectly set

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = getExpirationTime(15); // 15 minutes

    // Update verification code and ensure email_verified is false
    await pool.query(
      'UPDATE "User" SET verification_code = $1, verification_code_expires = $2, email_verified = false, updated_at = NOW() WHERE id = $3',
      [verificationCode, expiresAt, user.id]
    );

    // Send new verification email
    const emailSent = await emailService.sendVerificationEmail(
      sanitizedEmail,
      user.username,
      verificationCode
    );

    if (!emailSent) {
      console.error(`Failed to send verification email to ${sanitizedEmail}`);
      return res.status(500).json({
        message:
          "Failed to send verification email. Please check your email configuration or try again later.",
        emailSent: false,
      }) as Response;
    }

    res.status(200).json({
      message: "New verification code sent to your email.",
      emailSent: true,
    }) as Response;
  }
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Password is required." }) as Response;
  }

  if (!username && !email) {
    return res
      .status(400)
      .json({ message: "Username or email is required." }) as Response;
  }

  // Determine if input is username or email
  const isEmail = email || (username && username.includes("@"));
  const identifier = email || username;

  let userResult;
  if (isEmail) {
    // Search by email
    userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [
      identifier,
    ]);
  } else {
    // Search by username
    userResult = await pool.query('SELECT * FROM "User" WHERE username = $1', [
      identifier,
    ]);
  }
  if (userResult.rows.length === 0) {
    return res.status(401).json({
      message: "Invalid username or password.",
      errorType: "invalid_credentials",
    }) as Response;
  }
  const user = userResult.rows[0];

  // Check if user is banned
  if (user.banned) {
    return res.status(403).json({
      message:
        "Your account has been banned. Please contact support for more information.",
    }) as Response;
  }

  // Check if email is verified
  if (!user.email_verified) {
    return res.status(403).json({
      message:
        "Please verify your email address before logging in. Check your email for the verification code.",
      needsVerification: true,
      email: user.email,
      errorType: "email_not_verified",
    }) as Response;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({
      message: "Invalid username or password.",
      errorType: "invalid_credentials",
    }) as Response;
  }

  // Check if user needs to complete profile (for creators)
  if (user.role === "creator" && !user.creator_profile_completed) {
    const secretKey = config.jwt.secret;
    const options: jwt.SignOptions = { expiresIn: "24h" }; // Extended to 24 hours
    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, secretKey, options);

    const { ...userWithoutPassword } = user;
    return res.status(200).json({
      message: "Login successful. Please complete your creator profile.",
      token,
      user: userWithoutPassword,
      needsProfileCompletion: true,
      profileCompletionType: "creator",
    }) as Response;
  }

  // Check if user needs to select role (for users without role)
  if (!user.role) {
    const secretKey = config.jwt.secret;
    const options: jwt.SignOptions = { expiresIn: "24h" }; // Extended to 24 hours
    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, secretKey, options);

    const { ...userWithoutPassword } = user;
    return res.status(200).json({
      message: "Login successful. Please select your role.",
      token,
      user: userWithoutPassword,
      needsRoleSelection: true,
    }) as Response;
  }

  const secretKey = config.jwt.secret;
  const options: jwt.SignOptions = { expiresIn: "24h" }; // Extended to 24 hours for better user experience
  const payload = { id: user.id, username: user.username };
  const token = jwt.sign(payload, secretKey, options);

  // Exclude password and pass avatar as string
  const { ...userWithoutPassword } = user;
  // avatar is now a string (URL or null)
  res.status(200).json({ token, user: userWithoutPassword }) as Response;
});

export const requestPasswordReset = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required." }) as Response;
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, username, email_verified FROM "User" WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." }) as Response;
    }

    const user = userResult.rows[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(400).json({
        message: "Please verify your email address first.",
      }) as Response;
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    const expiresAt = getExpirationTime(15); // 15 minutes

    // Update user with reset code
    await pool.query(
      'UPDATE "User" SET password_reset_code = $1, password_reset_expires = $2, updated_at = NOW() WHERE id = $3',
      [resetCode, expiresAt, user.id]
    );

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      sanitizedEmail,
      user.username,
      resetCode
    );

    if (!emailSent) {
      console.warn(`Failed to send password reset email to ${sanitizedEmail}`);
      return res
        .status(500)
        .json({ message: "Failed to send password reset email." }) as Response;
    }

    res.status(200).json({
      message: "Password reset code sent to your email.",
      emailSent,
    }) as Response;
  }
);

export const verifyPasswordResetCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return res.status(400).json({
        message: "Email and reset code are required.",
      }) as Response;
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, username, password_reset_code, password_reset_expires FROM "User" WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." }) as Response;
    }

    const user = userResult.rows[0];

    // Check if reset code matches
    if (user.password_reset_code !== resetCode) {
      return res
        .status(400)
        .json({ message: "Invalid reset code." }) as Response;
    }

    // Check if reset code is expired
    if (isVerificationCodeExpired(user.password_reset_expires)) {
      return res.status(400).json({
        message: "Reset code has expired. Please request a new one.",
      }) as Response;
    }

    res.status(200).json({
      message: "Reset code verified successfully.",
      verified: true,
    }) as Response;
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        message: "Email, reset code, and new password are required.",
      }) as Response;
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, username, password_reset_code, password_reset_expires FROM "User" WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." }) as Response;
    }

    const user = userResult.rows[0];

    // Check if reset code matches
    if (user.password_reset_code !== resetCode) {
      return res
        .status(400)
        .json({ message: "Invalid reset code." }) as Response;
    }

    // Check if reset code is expired
    if (isVerificationCodeExpired(user.password_reset_expires)) {
      return res.status(400).json({
        message: "Reset code has expired. Please request a new one.",
      }) as Response;
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset code
    await pool.query(
      'UPDATE "User" SET password = $1, password_reset_code = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.status(200).json({
      message:
        "Password reset successfully. You can now login with your new password.",
    }) as Response;
  }
);

export const completeCreatorProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { username, displayName, bio, avatar, externalLinks } = req.body;

    if (!username || !displayName || !bio) {
      return res.status(400).json({
        message: "Username, display name, and bio are required.",
      }) as Response;
    }

    // Find the user
    const userResult = await pool.query(
      'SELECT id, role, email_verified FROM "User" WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      }) as Response;
    }

    const user = userResult.rows[0];

    // Check if user is a creator
    if (user.role !== "creator") {
      return res.status(400).json({
        message: "Only creators can complete creator profiles.",
      }) as Response;
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(400).json({
        message: "Email must be verified before completing creator profile.",
      }) as Response;
    }

    // Update user with creator profile information
    const result = await pool.query(
      `UPDATE "User"
       SET alias = $1, bio = $2, avatar = $3, external_link = $4, creator_profile_completed = TRUE, updated_at = NOW()
       WHERE id = $5
       RETURNING id, username, alias, bio, avatar, external_link, creator_profile_completed`,
      [displayName, bio, avatar || "", externalLinks || "", user.id]
    );

    const updatedUser = result.rows[0];

    res.status(200).json({
      message:
        "Creator profile completed successfully. Your account is pending admin approval.",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.alias,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        externalLink: updatedUser.external_link || "",
        creatorProfileCompleted: updatedUser.creator_profile_completed,
      },
    }) as Response;
  }
);

export const selectRole = asyncHandler(async (req: Request, res: Response) => {
  const { username, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({
      message: "Username and role are required.",
    }) as Response;
  }

  // Validate role
  if (!["fan", "creator"].includes(role)) {
    return res.status(400).json({
      message: 'Role must be either "fan" or "creator".',
    }) as Response;
  }

  // Find the user
  const userResult = await pool.query(
    'SELECT id, email_verified FROM "User" WHERE username = $1',
    [username]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({
      message: "User not found.",
    }) as Response;
  }

  const user = userResult.rows[0];

  // Check if email is verified
  if (!user.email_verified) {
    return res.status(400).json({
      message: "Email must be verified before selecting role.",
    }) as Response;
  }

  // Update user role
  const result = await pool.query(
    `UPDATE "User"
     SET role = $1, creator_approved = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, username, role, creator_approved`,
    [
      role,
      role === "creator" ? false : true, // Creators need approval, fans are auto-approved
      user.id,
    ]
  );

  const updatedUser = result.rows[0];

  const message =
    role === "creator"
      ? "Role selected successfully. Please complete your creator profile."
      : "Role selected successfully. You can now use the app.";

  res.status(200).json({
    message,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      creatorApproved: updatedUser.creator_approved,
    },
  }) as Response;
});
