import { NextResponse } from "next/server"

const DEFAULT_AP_BASE_URL = "http://192.168.4.1"

export function rainGaugeBaseUrlFromRequest(request: Request) {
  const url = new URL(request.url)
  return validateRainGaugeBaseUrl(url.searchParams.get("baseUrl") ?? DEFAULT_AP_BASE_URL)
}

export function validateRainGaugeBaseUrl(value: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error("Invalid rain gauge URL.")
  }

  if (url.protocol !== "http:") {
    throw new Error("Rain gauge URL must use http.")
  }

  const isDefaultAp = url.hostname === "192.168.4.1"
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1"

  if (!isDefaultAp && !isLocalhost) {
    throw new Error("Rain gauge URL must be the AP address or localhost.")
  }

  url.pathname = ""
  url.search = ""
  url.hash = ""
  return url.toString().replace(/\/$/, "")
}

export function rainGaugeProxyError(error: unknown) {
  return NextResponse.json(
    {
      ok: false,
      code: "rain_gauge_proxy_error",
      message:
        error instanceof Error
          ? error.message
          : "The rain gauge access point could not be reached.",
    },
    { status: 502 }
  )
}

export async function fetchRainGaugeJson(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(body || `Rain gauge responded with ${response.status}.`)
  }

  return JSON.parse(body) as unknown
}
