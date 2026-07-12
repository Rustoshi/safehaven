"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    smartsupp?: ((...args: unknown[]) => void) & { _: unknown[] }
    _smartsupp?: Record<string, unknown>
  }
}

const SMARTSUPP_KEY = process.env.NEXT_PUBLIC_SMARTSUPP_KEY || "2b3a10db76888494109c3309804e2004c1d415aa"

/**
 * Loads the Smartsupp live-chat widget.
 * Uses NEXT_PUBLIC_SMARTSUPP_KEY env variable or falls back to hardcoded key.
 */
export function SmartsuppChat() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Prevent double-init
    if (window.smartsupp) return

    window._smartsupp = window._smartsupp || {}
    window._smartsupp.key = SMARTSUPP_KEY

    window.smartsupp = function (...args: unknown[]) {
      window.smartsupp!._.push(args)
    } as Window["smartsupp"]
    window.smartsupp!._ = []

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.async = true
    script.src = "https://www.smartsuppchat.com/loader.js?"
    document.head.appendChild(script)
  }, [])

  return null
}
