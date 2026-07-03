import { NextResponse } from "next/server"

import {
  fetchRainGaugeJson,
  rainGaugeBaseUrlFromRequest,
  rainGaugeProxyError,
} from "@/lib/rain-gauge/proxy"
import { parseRainGaugeReading } from "@/lib/rain-gauge/parser"

export async function GET(request: Request) {
  try {
    const baseUrl = rainGaugeBaseUrlFromRequest(request)
    const reading = parseRainGaugeReading(
      await fetchRainGaugeJson(baseUrl, "/api/readings")
    )
    return NextResponse.json({ ok: true, reading })
  } catch (error) {
    return rainGaugeProxyError(error)
  }
}
