import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db/connection"
import User from "@/lib/models/User"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.user.id)
      .select("preferredCurrency kycStatus kycTier firstName lastName email")
      .lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      preferredCurrency: user.preferredCurrency || "USD",
      kycStatus:         user.kycStatus || "unverified",
      kycTier:           user.kycTier ?? 1,
      firstName:         user.firstName,
      lastName:          user.lastName,
      email:             user.email,
    })
  } catch (err) {
    console.error("[User Profile API]", err)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}
