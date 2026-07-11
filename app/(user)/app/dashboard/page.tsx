import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserDashboardData } from "@/lib/services/dashboard-user.service"
import { DashboardClient } from "@/components/user/dashboard/DashboardClient"
import { connectDB } from "@/lib/db/connection"
import PaymentMethod from "@/lib/models/PaymentMethod"
import { BANK_NAME } from "@/lib/brand"

export const metadata: Metadata = { title: `Dashboard — ${BANK_NAME}` }

async function fetchBtcRate(): Promise<number> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const res = await fetch(`${base}/api/wallet/btc-rate`, {
      cache: "no-store",
    })
    if (res.ok) {
      const json = await res.json()
      return json.rate || json.usd || 0
    }
  } catch {
    // Non-critical
  }
  return 0
}

async function getBitcoinWalletAddress(): Promise<string | null> {
  try {
    await connectDB()
    const btcMethod = await PaymentMethod.findOne({ 
      type: "bitcoin", 
      isEnabled: true 
    }).lean()
    return btcMethod?.paymentInfo?.walletAddress || null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [data, btcRate, adminBtcWallet] = await Promise.all([
    getUserDashboardData(session.user.id),
    fetchBtcRate(),
    getBitcoinWalletAddress(),
  ])

  return (
    <DashboardClient
      data={data}
      btcRate={btcRate}
      session={session}
      adminBtcWallet={adminBtcWallet}
    />
  )
}
