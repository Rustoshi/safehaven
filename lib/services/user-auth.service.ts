import crypto from "crypto"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db/connection"
import User, { type IUser } from "@/lib/models/User"
import Account from "@/lib/models/Account"
import Notification from "@/lib/models/Notification"
import AuditLog from "@/lib/models/AuditLog"
import { BANK_NAME } from "@/lib/brand"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterData {
  firstName: string
  lastName:  string
  email:     string
  password:  string
  pin:       string
  phone?:    string
  currency:  string
}

// ── Validation helpers ────────────────────────────────────────────────────────

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const NAME_REGEX     = /^[a-zA-Z][a-zA-Z\-']{1,49}$/
const PHONE_REGEX    = /^\+[1-9]\d{6,14}$/
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.")
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain at least one lowercase letter.")
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain at least one uppercase letter.")
  }
  if (!/\d/.test(password)) {
    throw new Error("Password must contain at least one number.")
  }
}

function validateName(value: string, fieldName: string): void {
  if (!value || value.length < 2) {
    throw new Error(`${fieldName} must be at least 2 characters.`)
  }
  if (value.length > 50) {
    throw new Error(`${fieldName} must be 50 characters or fewer.`)
  }
  if (!NAME_REGEX.test(value)) {
    throw new Error(`${fieldName} can only contain letters, hyphens, and apostrophes.`)
  }
}

// ── Random generators ─────────────────────────────────────────────────────────

function randomDigits(length: number): string {
  let result = ""
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString()
  }
  return result
}

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

function randomBase58(length: number): string {
  let result = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += BASE58_ALPHABET[bytes[i] % BASE58_ALPHABET.length]
  }
  return result
}

function randomUpperLetters(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

async function generateUniqueAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    // 10-digit number starting with a non-zero digit (realistic bank format)
    const num = String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000))
    const exists = await Account.exists({ accountNumber: num })
    if (!exists) return num
  }
  throw new Error("Unable to generate a unique account number. Please try again.")
}

function generateReferralCode(firstName: string): string {
  const prefix = firstName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X")
  return prefix + randomAlphanumeric(5)
}

// ── Audit log helper (user-context — uses the user's own id/email) ────────────

async function createUserAuditLog(
  userId:      string,
  userEmail:   string,
  action:      string,
  targetType?: string,
  targetId?:   string,
  payload?:    Record<string, unknown>
): Promise<void> {
  try {
    await AuditLog.create({
      adminId:    userId,
      adminEmail: userEmail,
      action,
      targetType,
      targetId,
      payload,
    })
  } catch {
    // Swallow — audit failure must not break the flow
    console.error("[AuditLog] user audit write failed")
  }
}

// ── registerUser ──────────────────────────────────────────────────────────────

export async function registerUser(
  data: RegisterData
): Promise<{ user: IUser }> {
  await connectDB()

  // Validate inputs
  validateName(data.firstName, "First name")
  validateName(data.lastName, "Last name")
  validatePassword(data.password)

  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    throw new Error("Phone number must be in international format (e.g. +1234567890).")
  }

  // Check duplicate email
  const emailLower = data.email.toLowerCase().trim()
  const existingUser = await User.findOne({ email: emailLower }).lean()
  if (existingUser) {
    throw new Error("An account with this email already exists.")
  }

  // Validate PIN
  if (!/^\d{4}$/.test(data.pin)) {
    throw new Error("PIN must be exactly 4 digits.")
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12)

  // Generate tokens / codes
  const referralCode = generateReferralCode(data.firstName)

  // Create user
  const user = await User.create({
    firstName:   data.firstName.trim(),
    lastName:    data.lastName.trim(),
    email:       emailLower,
    passwordHash,
    phone:       data.phone?.trim() || undefined,
    role:        "user",
    kycStatus:   "unverified",
    kycTier:     1,
    isActive:    true,
    isSuspended: false,
    emailVerified:          true,
    transferPin: data.pin,
    referralCode,
    preferredCurrency: data.currency.toUpperCase(),
  })

  // Create fiat account
  const fiatAccountNumber = await generateUniqueAccountNumber()
  await Account.create({
    userId:        user._id,
    walletType:    "fiat",
    currency:      data.currency.toUpperCase(),
    accountNumber: fiatAccountNumber,
    routingNumber: "0" + randomDigits(8),
    swiftCode:     "NVPY" + randomUpperLetters(4),
    iban:          "US" + randomDigits(2) + "NVPY" + randomDigits(16),
    balance:       0,
    btcBalance:    0,
    isFrozen:      false,
  })

  // Create bitcoin account
  const btcAccountNumber = await generateUniqueAccountNumber()
  await Account.create({
    userId:        user._id,
    walletType:    "bitcoin",
    accountNumber: btcAccountNumber,
    btcAddress:    "1" + randomBase58(33),
    btcBalance:    0,
    balance:       0,
    isFrozen:      false,
  })

  // Welcome notification
  await Notification.create({
    userId:  user._id,
    type:    "system",
    channel: "in_app",
    subject: `Welcome to ${BANK_NAME}`,
    body:    "Your account is set up and ready. Complete KYC to unlock all features.",
  })

  // Audit log
  await createUserAuditLog(
    user._id.toString(),
    user.email,
    "user.register",
    "User",
    user._id.toString()
  )

  return { user }
}

// ── verifyEmail ───────────────────────────────────────────────────────────────

export async function verifyEmail(token: string): Promise<IUser> {
  await connectDB()

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerified:          false,
  })

  if (!user) {
    throw new Error("Invalid or expired verification link.")
  }

  user.emailVerified = true
  user.emailVerificationToken = undefined
  await user.save()

  await createUserAuditLog(
    user._id.toString(),
    user.email,
    "user.email_verified",
    "User",
    user._id.toString()
  )

  return user
}

// ── requestPasswordReset ──────────────────────────────────────────────────────

export async function requestPasswordReset(
  email: string
): Promise<{ token: string; firstName: string } | null> {
  await connectDB()

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) return null

  const passwordResetToken  = crypto.randomBytes(32).toString("hex")
  const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  user.passwordResetToken  = passwordResetToken
  user.passwordResetExpiry = passwordResetExpiry
  await user.save()

  return { token: passwordResetToken, firstName: user.firstName }
}

// ── resetPassword ─────────────────────────────────────────────────────────────

export async function resetPassword(
  token:       string,
  newPassword: string
): Promise<void> {
  await connectDB()

  const user = await User.findOne({
    passwordResetToken:  token,
    passwordResetExpiry: { $gt: new Date() },
  })

  if (!user) {
    throw new Error("Invalid or expired reset link.")
  }

  validatePassword(newPassword)

  user.passwordHash       = await bcrypt.hash(newPassword, 12)
  user.passwordResetToken  = undefined
  user.passwordResetExpiry = undefined
  await user.save()

  await createUserAuditLog(
    user._id.toString(),
    user.email,
    "user.password_reset_completed",
    "User",
    user._id.toString()
  )
}

// ── changePassword ────────────────────────────────────────────────────────────

export async function changePassword(
  userId:          string,
  currentPassword: string,
  newPassword:     string
): Promise<void> {
  await connectDB()

  const user = await User.findById(userId)
  if (!user) throw new Error("User not found.")

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isMatch) throw new Error("Current password is incorrect.")

  validatePassword(newPassword)

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  await user.save()

  await createUserAuditLog(
    user._id.toString(),
    user.email,
    "user.password_changed",
    "User",
    user._id.toString()
  )
}
