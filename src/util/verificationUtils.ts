import crypto from 'crypto'

export function generateVerificationCode(): string {
  // Generate a 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateSecureToken(): string {
  // Generate a secure random token for password reset
  return crypto.randomBytes(32).toString('hex')
}

export function isVerificationCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function getExpirationTime(minutes: number = 15): Date {
  const expirationTime = new Date()
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes)
  return expirationTime
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
