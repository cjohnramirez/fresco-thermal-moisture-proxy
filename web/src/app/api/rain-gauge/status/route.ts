import { NextResponse } from "next/server"

import {
  fetchRainGaugeJson,
  rainGaugeBaseUrlFromRequest,
  rainGaugeProxyError,
} from "@/lib/rain-gauge/proxy"
import { parseRainGaugeStatus } from "@/lib/rain-gauge/parser"

export async function GET(request: Request) {
  try {
    const baseUrl = rainGaugeBaseUrlFromRequest(request)
    const packet = parseRainGaugeStatus(
      await fetchRainGaugeJson(baseUrl, "/api/status")
    )
    return NextResponse.json({ ok: true, status: packet })
  } catch (error) {
    return rainGaugeProxyError(error)
  }
}
