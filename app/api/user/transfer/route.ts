import { NextRequest, NextResponse } from "next/server"
import { z }         from "zod"
import mongoose      from "mongoose"
import { auth }      from "@/lib/auth"
import { connectDB } from "@/lib/db/connection"
import User          from "@/lib/models/User"
import Account       from "@/lib/models/Account"
import Transaction   from "@/lib/models/Transaction"
import { getAppSettings } from "@/lib/services/settings.service"

const transferSchema = z.object({
  fromWalletType:      z.enum(["fiat", "bitcoin"]),
  recipientIdentifier: z.string().min(1), // account number or BTC address
  amount:              z.number().positive(),
  pin:                 z.string().min(4).max(6), // Allow 4-6 digit PINs
  description:         z.string().max(200).optional(),
  // International transfer fields (optional)
  transferType:        z.enum(["local", "international"]).optional(),
  intlMethod:          z.string().nullable().optional(),
  intlFields:          z.any().optional(),
}).passthrough()

async function generateRef(prefix: string): Promise<string> {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  for (let i = 0; i < 10; i++) {
    const suffix = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("")
    const ref = `${prefix}-${suffix}`
    const exists = await Transaction.findOne({ reference: ref }).lean()
    if (!exists) return ref
  }
  throw new Error("Failed to generate unique reference")
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let body: unknown
    try { body = await req.json() }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      console.error("[Transfer Validation Error]", JSON.stringify(parsed.error.flatten(), null, 2))
      console.error("[Transfer Request Body]", JSON.stringify(body, null, 2))
      const issues = parsed.error.flatten()
      const fieldErrors = Object.entries(issues.fieldErrors).map(([k, v]) => `${k}: ${v?.join(", ")}`).join("; ")
      return NextResponse.json({ 
        error: fieldErrors || "Validation error", 
        issues 
      }, { status: 422 })
    }

    const { fromWalletType, recipientIdentifier, amount, pin, description, transferType, intlMethod, intlFields } = parsed.data
    const isInternational = transferType === "international"

    await connectDB()

    // Check if KYC is required for transfers
    const appSettings = await getAppSettings()
    if (appSettings.kycRequiredForTransfer === true) {
      // Fetch user's KYC status
      const userKyc = await User.findById(session.user.id).select("kycTier kycStatus").lean() as { kycTier?: number; kycStatus?: string } | null
      // User must have kycStatus of "verified" to proceed
      if (!userKyc || userKyc.kycStatus !== "verified") {
        return NextResponse.json({ 
          error: "Identity verification required. Please complete KYC verification before making transfers.",
          kycRequired: true
        }, { status: 403 })
      }
    }

    // Verify PIN
    const sender = await User.findById(session.user.id).select("transferPin firstName lastName isActive isSuspended").lean()
    if (!sender) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const s = sender as Record<string, unknown>
    if (!s.isActive || s.isSuspended) {
      return NextResponse.json({ error: "Your account is suspended" }, { status: 403 })
    }
    if (!s.transferPin) {
      return NextResponse.json({ error: "Transfer PIN not set. Contact support." }, { status: 400 })
    }
    if (s.transferPin !== pin) {
      return NextResponse.json({ error: "Invalid transfer PIN" }, { status: 403 })
    }

    // Get sender's account
    const senderAccount = await Account.findOne({ userId: session.user.id, walletType: fromWalletType })
    if (!senderAccount) {
      return NextResponse.json({ error: "Source account not found" }, { status: 400 })
    }
    if (senderAccount.isFrozen) {
      return NextResponse.json({ error: "Your account is frozen" }, { status: 403 })
    }

    const isBtc = fromWalletType === "bitcoin"
    const divisor = isBtc ? 1e8 : 100
    const amountSmallest = isBtc ? Math.round(amount * 1e8) : Math.round(amount * 100)
    const balanceField = isBtc ? "btcBalance" : "balance"
    const currentBalance = isBtc ? senderAccount.btcBalance : senderAccount.balance
    const currency = isBtc ? "BTC" : (senderAccount.currency || "USD")

    if (currentBalance < amountSmallest) {
      return NextResponse.json({
        error: `Insufficient balance. Available: ${(currentBalance / divisor).toFixed(isBtc ? 8 : 2)} ${currency}`,
      }, { status: 400 })
    }

    // Handle international transfers (external - no recipient account in our system)
    if (isInternational) {
      // Fetch app settings for international transfer fees
      const appSettings = await getAppSettings()
      const feeType = (appSettings.internationalTransferFeeType as "flat" | "percentage") || "flat"
      const flatFee = Number(appSettings.internationalTransferFee ?? 15)
      const percentFee = Number(appSettings.internationalTransferFeePercent ?? 2.5)
      
      // Calculate fee based on type
      let feeAmount = 0
      if (feeType === "flat") {
        feeAmount = flatFee
      } else {
        feeAmount = amount * (percentFee / 100)
      }
      const feeSmallest = Math.round(feeAmount * 100) // Convert to cents
      const totalDebit = amountSmallest + feeSmallest
      
      // Check if user has enough balance for amount + fee
      if (currentBalance < totalDebit) {
        return NextResponse.json({
          error: `Insufficient balance. Transfer amount: $${amount.toFixed(2)}, Fee: $${feeAmount.toFixed(2)}, Total: $${((amountSmallest + feeSmallest) / 100).toFixed(2)}. Available: $${(currentBalance / 100).toFixed(2)}`,
        }, { status: 400 })
      }

      const dbSession = await mongoose.startSession()
      let outRef = ""

      try {
        dbSession.startTransaction()
        outRef = await generateRef("INTL")

        // Debit sender (amount + fee)
        await Account.findByIdAndUpdate(
          senderAccount._id,
          { $inc: { [balanceField]: -totalDebit } },
          { session: dbSession }
        )

        // Build recipient name from intlFields (cast to string safely)
        const fields = intlFields as Record<string, unknown> | undefined
        const recipientName = String(fields?.beneficiaryName || fields?.recipientName || "International Recipient")

        // Create outgoing transaction for international transfer
        await Transaction.create([{
          accountId:   senderAccount._id,
          userId:      new mongoose.Types.ObjectId(session.user.id),
          type:        "transfer_out",
          amount:      amountSmallest,
          currency,
          status:      "pending", // International transfers are pending until processed
          description: description || `International transfer via ${intlMethod || "wire"}`,
          reference:   outRef,
          transferType: "international",
          isGenerated: false,
          fee: feeSmallest,
          feeType: feeType,
          externalRecipient: {
            name: recipientName,
            bankName: String(fields?.bankName || fields?.institution || "International Bank"),
            accountNumber: String(fields?.accountNumber || fields?.iban || recipientIdentifier),
            swiftCode: fields?.swiftCode ? String(fields.swiftCode) : undefined,
            routingNumber: fields?.routingNumber ? String(fields.routingNumber) : undefined,
            country: fields?.country ? String(fields.country) : undefined,
          },
          metadata: {
            intlMethod,
            feeAmount,
            feeType,
            ...(fields || {}),
          },
        }], { session: dbSession })

        // Create fee transaction if fee > 0
        if (feeSmallest > 0) {
          await Transaction.create([{
            accountId:   senderAccount._id,
            userId:      new mongoose.Types.ObjectId(session.user.id),
            type:        "fee",
            amount:      feeSmallest,
            currency,
            status:      "completed",
            description: `International transfer fee (${feeType === "flat" ? `$${flatFee}` : `${percentFee}%`})`,
            reference:   `${outRef}-FEE`,
            isGenerated: true,
            metadata: {
              relatedTransfer: outRef,
              feeType,
              feeRate: feeType === "flat" ? flatFee : percentFee,
            },
          }], { session: dbSession })
        }

        await dbSession.commitTransaction()

        return NextResponse.json({
          success:   true,
          reference: outRef,
          amount,
          fee: feeAmount,
          feeType,
          total: amount + feeAmount,
          currency,
          recipientName,
          message:   `$${amount.toLocaleString()} international transfer initiated. Fee: $${feeAmount.toFixed(2)}. Processing may take 1-3 business days.`,
        })
      } catch (err) {
        await dbSession.abortTransaction()
        throw err
      } finally {
        dbSession.endSession()
      }
    }

    // Handle internal/local transfers (recipient has account in our system)
    let recipientAccount
    if (isBtc) {
      recipientAccount = await Account.findOne({
        walletType: "bitcoin",
        btcAddress: recipientIdentifier,
      })
    } else {
      recipientAccount = await Account.findOne({
        accountNumber: recipientIdentifier,
        walletType: "fiat",
      })
    }

    if (!recipientAccount) {
      return NextResponse.json({ error: "Recipient account not found" }, { status: 404 })
    }
    if (String(recipientAccount.userId) === session.user.id) {
      return NextResponse.json({ error: "Cannot transfer to your own account" }, { status: 400 })
    }
    if (recipientAccount.isFrozen) {
      return NextResponse.json({ error: "Recipient account is unavailable" }, { status: 400 })
    }

    // Get recipient name
    const recipient = await User.findById(recipientAccount.userId).select("firstName lastName").lean()
    const recipientName = recipient
      ? `${(recipient as Record<string, unknown>).firstName} ${(recipient as Record<string, unknown>).lastName}`
      : "Unknown"

    // Execute transfer atomically
    const dbSession = await mongoose.startSession()
    let outRef = ""
    let inRef = ""

    try {
      dbSession.startTransaction()

      outRef = await generateRef("TFR")
      inRef = await generateRef("TFR")

      // Debit sender
      await Account.findByIdAndUpdate(
        senderAccount._id,
        { $inc: { [balanceField]: -amountSmallest } },
        { session: dbSession }
      )

      // Credit recipient
      await Account.findByIdAndUpdate(
        recipientAccount._id,
        { $inc: { [balanceField]: amountSmallest } },
        { session: dbSession }
      )

      // Outgoing transaction
      await Transaction.create([{
        accountId:   senderAccount._id,
        userId:      new mongoose.Types.ObjectId(session.user.id),
        type:        "transfer_out",
        amount:      amountSmallest,
        currency,
        status:      "completed",
        description: description || `Transfer to ${recipientName}`,
        reference:   outRef,
        toAccountId: recipientAccount._id,
        transferType: "internal",
        isGenerated: false,
        processedAt: new Date(),
      }], { session: dbSession })

      // Incoming transaction
      await Transaction.create([{
        accountId:     recipientAccount._id,
        userId:        recipientAccount.userId,
        type:          "transfer_in",
        amount:        amountSmallest,
        currency,
        status:        "completed",
        description:   description || `Transfer from ${s.firstName} ${s.lastName}`,
        reference:     inRef,
        fromAccountId: senderAccount._id,
        transferType:  "internal",
        isGenerated:   false,
        processedAt:   new Date(),
      }], { session: dbSession })

      await dbSession.commitTransaction()
    } catch (err) {
      await dbSession.abortTransaction()
      throw err
    } finally {
      dbSession.endSession()
    }

    return NextResponse.json({
      success:   true,
      reference: outRef,
      amount,
      currency,
      recipientName,
      message:   `$${amount.toLocaleString()} sent to ${recipientName} successfully`,
    })
  } catch (err) {
    console.error("[POST /api/user/transfer]", err)
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 })
  }
}
