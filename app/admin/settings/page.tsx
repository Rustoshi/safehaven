import type { Metadata }     from "next"
import { auth }               from "@/lib/auth"
import { redirect }           from "next/navigation"
import { getAppSettings }     from "@/lib/services/settings.service"
import { getSettingsHistory } from "@/lib/services/settings.service"
import { SettingsClient }     from "@/components/admin/settings/SettingsClient"

export const metadata: Metadata = { title: "App Settings" }
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") redirect("/admin/login")

  const [settings, history] = await Promise.all([
    getAppSettings().catch(() => ({})),
    getSettingsHistory(10).catch(() => []),
  ])

  return (
    <div className="px-6 py-8 max-w-screen-xl mx-auto">
      <SettingsClient
        settings={settings as Record<string, unknown>}
        history={history as Record<string, unknown>[]}
      />
    </div>
  )
}
