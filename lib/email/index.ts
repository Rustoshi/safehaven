import nodemailer from "nodemailer"
import { renderWelcomeEmail } from "./templates/WelcomeEmail"
import { renderPasswordResetEmail } from "./templates/PasswordResetEmail"
import { renderEmailVerificationSuccessEmail } from "./templates/EmailVerificationSuccessEmail"
import { renderOtpEmail } from "./templates/OtpEmail"
import { BANK_NAME } from "@/lib/brand"

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Mailtrap SMTP configuration
const MAILTRAP_HOST = process.env.MAILTRAP_HOST || "live.smtp.mailtrap.io"
const MAILTRAP_PORT = parseInt(process.env.MAILTRAP_PORT || "587", 10)
const MAILTRAP_USER = process.env.MAILTRAP_USER || ""
const MAILTRAP_PASS = process.env.MAILTRAP_PASS || ""
const FROM_EMAIL = process.env.MAILTRAP_FROM || `${BANK_NAME} <noreply@summittrustbank.com>`

// Check if email is configured
const isEmailConfigured = Boolean(MAILTRAP_USER && MAILTRAP_PASS)

// Create reusable transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured) {
    return null
  }
  
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAILTRAP_HOST,
      port: MAILTRAP_PORT,
      auth: {
        user: MAILTRAP_USER,
        pass: MAILTRAP_PASS,
      },
    })
  }
  
  return transporter
}

// ── Safe email sender (never throws) ──────────────────────────────────────────

async function sendEmail(options: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  // Check if configured
  if (!isEmailConfigured) {
    console.warn("[Email] Mailtrap SMTP not configured — skipping email send")
    return false
  }

  const transport = getTransporter()
  if (!transport) {
    console.warn("[Email] Failed to create transporter — skipping email send")
    return false
  }

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    console.log(`[Email] Sent "${options.subject}" to ${options.to}`)
    return true
  } catch (err) {
    console.error("[Email] Failed to send email:", err instanceof Error ? err.message : err)
    return false
  }
}

// ── sendWelcomeEmail ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  to:        string,
  firstName: string
): Promise<boolean> {
  const html = renderWelcomeEmail({ firstName })

  return sendEmail({
    to,
    subject: `Welcome to ${BANK_NAME}`,
    html,
  })
}

// ── sendPasswordResetEmail ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to:         string,
  firstName:  string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`
  const html = renderPasswordResetEmail({ firstName, resetUrl })

  return sendEmail({
    to,
    subject: `Reset your ${BANK_NAME} password`,
    html,
  })
}

// ── sendEmailVerifiedEmail ────────────────────────────────────────────────────

export async function sendEmailVerifiedEmail(
  to:        string,
  firstName: string
): Promise<boolean> {
  const html = renderEmailVerificationSuccessEmail({ firstName })

  return sendEmail({
    to,
    subject: `Your ${BANK_NAME} email has been verified`,
    html,
  })
}

// ── sendOtpEmail (email verification during signup) ───────────────────────────

export async function sendOtpEmail(
  to:        string,
  firstName: string,
  otp:       string
): Promise<boolean> {
  const html = renderOtpEmail({ firstName, otp })

  return sendEmail({
    to,
    subject: `${otp} is your ${BANK_NAME} verification code`,
    html,
  })
}

// ── Generic email sender for custom emails ────────────────────────────────────

export async function sendCustomEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  return sendEmail({ to, subject, html })
}
