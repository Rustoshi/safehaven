import mongoose          from "mongoose"
import { connectDB }     from "@/lib/db/connection"
import CardApplication   from "@/lib/models/CardApplication"
import { createAuditLog } from "@/lib/services/auth.service"
import { notifyUser }    from "@/lib/services/deposit.service"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CardListItem {
  id:            string
  userId:        string
  userName:      string
  userEmail:     string
  userKycStatus: string
  cardNetwork:   string
  cardType:      string
  creditLimit?:  number
  spendingLimit?: number
  preferredLimit?: number
  dailySpendLimit?: number
  balance:       number
  status:        string
  cardNumber?:   string
  cvv?:          string
  expiryMonth?:  number
  expiryYear?:   number
  cardholderName?: string
  isVirtual:     boolean
  applicationFee: number
  adminNote?:    string
  appliedAt:     string
  approvedAt?:   string
  cancelledAt?:  string
}

export interface CardDetail extends CardListItem {
  userFirstName: string
  userLastName:  string
  userPhone?:    string
}

export interface CardStats {
  pendingCount:    number
  approvedCount:   number
  rejectedCount:   number
  activeCount:     number
  frozenCount:     number
  cancelledCount:  number
  totalCreditIssued: number
}

export interface GetCardParams {
  page?:      number
  limit?:     number
  status?:    string
  cardType?:  string
  userId?:    string
  dateFrom?:  string
  dateTo?:    string
  sortBy?:    string
  sortOrder?: "asc" | "desc"
}

export interface CardApprovalData {
  creditLimit:   number
  spendingLimit: number
  adminNote?:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function luhnCheckDigit(partial: string): string {
  const digits = partial.split("").map(Number).reverse()
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i]
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return String((10 - (sum % 10)) % 10)
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("")
}

function generateCardNumber(network: "visa" | "mastercard"): { full: string; masked: string; last4: string } {
  let prefix: string
  if (network === "visa") {
    prefix = "4" + randomDigits(5)
  } else {
    const bin = 51 + Math.floor(Math.random() * 5) // 51-55
    prefix = String(bin) + randomDigits(4)
  }
  const partial = prefix + randomDigits(9) // 15 digits
  const full = partial + luhnCheckDigit(partial)
  const last4 = full.slice(-4)
  const masked = full.slice(0, 4) + " **** **** " + last4
  return { full, masked, last4 }
}

function generateCVV(): string {
  return String(100 + Math.floor(Math.random() * 900))
}

function buildCardMatch(params: GetCardParams): Record<string, unknown> {
  const match: Record<string, unknown> = {}
  if (params.status)   match.status   = params.status
  if (params.cardType) match.cardType = params.cardType
  if (params.userId && mongoose.Types.ObjectId.isValid(params.userId))
    match.userId = new mongoose.Types.ObjectId(params.userId)
  if (params.dateFrom || params.dateTo) {
    const range: Record<string, Date> = {}
    if (params.dateFrom) range.$gte = new Date(params.dateFrom)
    if (params.dateTo)   range.$lte = new Date(params.dateTo)
    match.appliedAt = range
  }
  return match
}

function serializeCard(
  doc:  Record<string, unknown>,
  user: Record<string, unknown>
): CardListItem {
  return {
    id:            String(doc._id),
    userId:        String(doc.userId),
    userName:      `${user.firstName} ${user.lastName}`,
    userEmail:     user.email as string,
    userKycStatus: user.kycStatus as string,
    cardNetwork:   (doc.cardNetwork as string) || "visa",
    cardType:      doc.cardType   as string,
    creditLimit:   doc.creditLimit  as number | undefined,
    spendingLimit: doc.spendingLimit as number | undefined,
    preferredLimit: doc.preferredLimit as number | undefined,
    dailySpendLimit: doc.dailySpendLimit as number | undefined,
    balance:       (doc.balance as number) ?? 0,
    status:        doc.status    as string,
    cardNumber:    doc.cardNumber as string | undefined,
    cvv:           doc.cvv as string | undefined,
    expiryMonth:   doc.expiryMonth as number | undefined,
    expiryYear:    doc.expiryYear  as number | undefined,
    cardholderName: doc.cardholderName as string | undefined,
    isVirtual:     (doc.isVirtual as boolean) ?? true,
    applicationFee: (doc.applicationFee as number) ?? 0,
    adminNote:     doc.adminNote  as string | undefined,
    appliedAt:     (doc.appliedAt as Date).toISOString(),
    approvedAt:    (doc.approvedAt  as Date | undefined)?.toISOString(),
    cancelledAt:   (doc.cancelledAt as Date | undefined)?.toISOString(),
  }
}

// ── getCardApplications ───────────────────────────────────────────────────────

export async function getCardApplications(
  params: GetCardParams
): Promise<{ cards: CardListItem[]; total: number; pages: number; stats: CardStats }> {
  await connectDB()

  const page  = Math.max(1,   params.page  ?? 1)
  const limit = Math.min(100, params.limit ?? 20)
  const skip  = (page - 1) * limit
  const match = buildCardMatch(params)

  const sortField = params.sortBy === "cardType" ? "cardType" : "appliedAt"
  const sortDir   = params.sortOrder === "asc" ? 1 : -1

  // Build a separate match for stats that excludes status filter (show global stats)
  const statsMatch = buildCardMatch({ ...params, status: undefined })

  const [docs, total, aggStats] = await Promise.all([
    CardApplication.find(match)
      .populate("userId", "firstName lastName email kycStatus phone")
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),

    CardApplication.countDocuments(match),

    // Stats should be global (not filtered by status tab)
    CardApplication.aggregate([
      { $match: statsMatch },
      { $group: {
        _id:              null,
        pendingCount:     { $sum: { $cond: [{ $eq: ["$status", "pending"]   }, 1, 0] } },
        approvedCount:    { $sum: { $cond: [{ $eq: ["$status", "approved"]  }, 1, 0] } },
        rejectedCount:    { $sum: { $cond: [{ $eq: ["$status", "rejected"]  }, 1, 0] } },
        activeCount:      { $sum: { $cond: [{ $eq: ["$status", "active"]    }, 1, 0] } },
        frozenCount:      { $sum: { $cond: [{ $eq: ["$status", "frozen"]    }, 1, 0] } },
        cancelledCount:   { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        totalCreditIssued:{ $sum: { $ifNull: ["$creditLimit", 0] } },
      }},
    ]),
  ])

  const s = aggStats[0] ?? {}
  const stats: CardStats = {
    pendingCount:     s.pendingCount    ?? 0,
    approvedCount:    s.approvedCount   ?? 0,
    rejectedCount:    s.rejectedCount   ?? 0,
    activeCount:      s.activeCount     ?? 0,
    frozenCount:      s.frozenCount     ?? 0,
    cancelledCount:   s.cancelledCount  ?? 0,
    totalCreditIssued:s.totalCreditIssued ?? 0,
  }

  const cards = docs.map((doc) => {
    const rawDoc  = doc as unknown as Record<string, unknown>
    const rawUser = (rawDoc.userId ?? {}) as Record<string, unknown>
    return serializeCard(rawDoc, rawUser)
  })

  return { cards, total, pages: Math.ceil(total / limit), stats }
}

// ── getCardById ───────────────────────────────────────────────────────────────

export async function getCardById(id: string): Promise<CardDetail | null> {
  await connectDB()
  if (!mongoose.Types.ObjectId.isValid(id)) return null

  const doc = await CardApplication.findById(id)
    .populate("userId", "firstName lastName email phone kycStatus")
    .lean()
  if (!doc) return null

  const rawDoc  = doc as unknown as Record<string, unknown>
  const rawUser = (rawDoc.userId ?? {}) as Record<string, unknown>

  return {
    ...serializeCard(rawDoc, rawUser),
    userFirstName: rawUser.firstName as string,
    userLastName:  rawUser.lastName  as string,
    userPhone:     rawUser.phone     as string | undefined,
  }
}

// ── approveCard ───────────────────────────────────────────────────────────────

export async function approveCard(
  cardId:     string,
  data:       CardApprovalData,
  adminId:    string,
  adminEmail: string,
  req?:       Request
): Promise<Record<string, unknown>> {
  await connectDB()

  if (data.creditLimit <= 0) throw new Error("Credit limit must be greater than 0")

  const card = await CardApplication.findById(cardId).populate("userId", "firstName lastName email kycStatus")
  if (!card)                     throw new Error("Card application not found")
  if (card.status !== "pending") throw new Error("Card application is not pending")

  const user = card.userId as unknown as Record<string, unknown>

  // KYC check for credit cards
  if (card.cardType === "credit" && user.kycStatus !== "verified") {
    throw new Error("User KYC must be verified before approving a credit card")
  }

  const network = card.cardNetwork || "visa"
  const { full, masked, last4 } = generateCardNumber(network as "visa" | "mastercard")
  const cvv = generateCVV()
  const now        = new Date()
  const expiryYear = now.getFullYear() + (Math.random() < 0.5 ? 3 : 4)
  const expiryMonth = Math.floor(Math.random() * 12) + 1

  const updated = await CardApplication.findByIdAndUpdate(
    cardId,
    {
      status:         "active",
      creditLimit:    data.creditLimit,
      spendingLimit:  data.spendingLimit,
      cardNumber:     full,
      cvv,
      expiryMonth,
      expiryYear,
      cardholderName: `${user.firstName as string} ${user.lastName as string}`.toUpperCase(),
      reviewedBy:     new mongoose.Types.ObjectId(adminId),
      approvedAt:     now,
      ...(data.adminNote ? { adminNote: data.adminNote } : {}),
    },
    { new: true }
  )

  await createAuditLog(adminId, adminEmail, "card.approve", "CardApplication", cardId, {
    cardNetwork: network, cardType: card.cardType, creditLimit: data.creditLimit, last4,
  }, req)

  await notifyUser(
    String(card.userId), "card", "Card application approved",
    `Your card application has been approved. Your card ending in ${last4} is now active.`,
    { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}

// ── rejectCard ────────────────────────────────────────────────────────────────

export async function rejectCard(
  cardId:     string,
  reason:     string,
  adminId:    string,
  adminEmail: string,
  req?:       Request
): Promise<Record<string, unknown>> {
  await connectDB()

  const card = await CardApplication.findById(cardId)
  if (!card)                     throw new Error("Card application not found")
  if (card.status !== "pending") throw new Error("Card application is not pending")

  const updated = await CardApplication.findByIdAndUpdate(
    cardId,
    {
      status:     "rejected",
      adminNote:  reason,
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      approvedAt: new Date(),
    },
    { new: true }
  )

  await createAuditLog(adminId, adminEmail, "card.reject", "CardApplication", cardId, { reason }, req)
  await notifyUser(
    String(card.userId), "card", "Card application declined",
    `Your card application has been declined. Reason: ${reason}`, { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}

// ── freezeCard ────────────────────────────────────────────────────────────────

export async function freezeCard(
  cardId:     string,
  reason:     string,
  adminId:    string,
  adminEmail: string,
  req?:       Request
): Promise<Record<string, unknown>> {
  await connectDB()

  const card = await CardApplication.findById(cardId)
  if (!card)                    throw new Error("Card not found")
  if (card.status !== "active") throw new Error("Card is not active")

  const updated = await CardApplication.findByIdAndUpdate(
    cardId, { status: "frozen", adminNote: reason }, { new: true }
  )

  const last4 = card.cardNumber?.slice(-4) ?? "****"
  await createAuditLog(adminId, adminEmail, "card.freeze", "CardApplication", cardId, { reason }, req)
  await notifyUser(
    String(card.userId), "card", "Card frozen",
    `Your card ending in ${last4} has been frozen. Reason: ${reason}`, { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}

// ── unfreezeCard ──────────────────────────────────────────────────────────────

export async function unfreezeCard(
  cardId:     string,
  adminId:    string,
  adminEmail: string,
  req?:       Request
): Promise<Record<string, unknown>> {
  await connectDB()

  const card = await CardApplication.findById(cardId)
  if (!card)                     throw new Error("Card not found")
  if (card.status !== "frozen")  throw new Error("Card is not frozen")

  const updated = await CardApplication.findByIdAndUpdate(
    cardId, { status: "active" }, { new: true }
  )

  const last4 = card.cardNumber?.slice(-4) ?? "****"
  await createAuditLog(adminId, adminEmail, "card.unfreeze", "CardApplication", cardId, {}, req)
  await notifyUser(
    String(card.userId), "card", "Card unfrozen",
    `Your card ending in ${last4} has been unfrozen and is now active.`, { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}

// ── cancelCard ────────────────────────────────────────────────────────────────

export async function cancelCard(
  cardId:     string,
  reason:     string,
  adminId:    string,
  adminEmail: string,
  req?:       Request
): Promise<Record<string, unknown>> {
  await connectDB()

  const card = await CardApplication.findById(cardId)
  if (!card) throw new Error("Card not found")
  if (!["active", "frozen"].includes(card.status)) throw new Error("Card cannot be cancelled in its current state")

  const updated = await CardApplication.findByIdAndUpdate(
    cardId,
    { status: "cancelled", cancelledAt: new Date(), adminNote: reason },
    { new: true }
  )

  await createAuditLog(adminId, adminEmail, "card.cancel", "CardApplication", cardId, { reason }, req)
  await notifyUser(
    String(card.userId), "card", "Card cancelled",
    "Your card has been cancelled. Contact support if you have questions.", { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}

// ── updateCardLimits ──────────────────────────────────────────────────────────

export async function updateCardLimits(
  cardId:       string,
  limits:       { creditLimit?: number; spendingLimit?: number },
  adminId:      string,
  adminEmail:   string,
  req?:         Request
): Promise<Record<string, unknown>> {
  await connectDB()

  const card = await CardApplication.findById(cardId)
  if (!card)                    throw new Error("Card not found")
  if (card.status !== "active") throw new Error("Card is not active")

  const last4   = card.cardNumber?.slice(-4) ?? "****"
  const updates: Record<string, unknown> = {}
  if (limits.creditLimit  != null) updates.creditLimit  = limits.creditLimit
  if (limits.spendingLimit != null) updates.spendingLimit = limits.spendingLimit

  const updated = await CardApplication.findByIdAndUpdate(cardId, updates, { new: true })

  await createAuditLog(adminId, adminEmail, "card.limits_updated", "CardApplication", cardId, limits as Record<string, unknown>, req)
  await notifyUser(
    String(card.userId), "card", "Card limits updated",
    `Your card ending in ${last4} limits have been updated.`, { cardId }
  )

  return (updated!.toObject()) as unknown as Record<string, unknown>
}
