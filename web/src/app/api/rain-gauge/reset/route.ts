import { NextResponse } from "next/server"

import {
  rainGaugeBaseUrlFromRequest,
  rainGaugeProxyError,
} from "@/lib/rain-gauge/proxy"

export async function POST(request: Request) {
  try {
    const baseUrl = rainGaugeBaseUrlFromRequest(request)
    const response = await fetch(`${baseUrl}/api/reset`, {
      method: "POST",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    const body = await response.text()

    if (!response.ok) {
      throw new Error(body || `Rain gauge reset failed with ${response.status}.`)
    }

    return NextResponse.json({ ok: true, result: JSON.parse(body) as unknown })
  } catch (error) {
    return rainGaugeProxyError(error)
  }
}
