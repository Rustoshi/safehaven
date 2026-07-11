import { NextRequest, NextResponse } from "next/server"
import { z }                        from "zod"
import { adminGuard }               from "@/lib/middleware/adminGuard"
import { getAppSettings, updateAppSettings } from "@/lib/services/settings.service"

const transferCodeSchema = z.object({
  enabled: z.boolean(),
  code:    z.string().max(100),
  message: z.string().max(500),
  label:   z.string().max(100),
})

const updateSchema = z.object({
  swapFeePercent:           z.number().min(0).max(10).optional(),
  swapMinAmount:            z.number().min(0).max(1000).optional(),
  swapMaxAmount:            z.number().min(100).max(1_000_000).optional(),
  localTransferFee:         z.number().min(0).max(100).optional(),
  internationalTransferFee: z.number().min(0).max(500).optional(),
  internationalTransferFeeType: z.enum(["flat", "percentage"]).optional(),
  internationalTransferFeePercent: z.number().min(0).max(100).optional(),
  maxDailyTransferAmount:   z.number().min(0).optional(),
  defaultCurrency:          z.string().min(2).max(10).optional(),
  supportedCurrencies:      z.array(z.string()).min(1).max(50).optional(),
  btcPriceSource:           z.string().optional(),
  maintenanceMode:          z.boolean().optional(),
  maintenanceMessage:       z.string().max(500).optional(),
  allowRegistration:        z.boolean().optional(),
  kycRequiredForTransfer:   z.boolean().optional(),
  transferCodes: z.object({
    imfCode:          transferCodeSchema,
    swiftCode:        transferCodeSchema,
    imfClearanceCode: transferCodeSchema,
    taxCode:          transferCodeSchema,
  }).optional(),
})

export async function GET() {
  const { error } = await adminGuard()
  if (error) return error

  try {
    const settings = await getAppSettings()
    return NextResponse.json(settings)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await adminGuard()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Validation error", issues: parsed.error.flatten() }, { status: 422 })

  try {
    const settings = await updateAppSettings(parsed.data, user.id, user.email, req)
    return NextResponse.json(settings)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 })
  }
}
