import { NextRequest, NextResponse } from "next/server"
import { adminGuard }               from "@/lib/middleware/adminGuard"
import { getCardById }              from "@/lib/services/card.service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminGuard()
  if (error) return error

  const { id } = await params
  const card = await getCardById(id)
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(card)
}
