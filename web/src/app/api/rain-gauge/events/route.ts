import {
  rainGaugeBaseUrlFromRequest,
  rainGaugeProxyError,
} from "@/lib/rain-gauge/proxy"

export async function GET(request: Request) {
  try {
    const baseUrl = rainGaugeBaseUrlFromRequest(request)
    const upstream = await fetch(`${baseUrl}/events`, {
      cache: "no-store",
      headers: { Accept: "text/event-stream" },
    })

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Rain gauge event stream failed with ${upstream.status}.`)
    }

    return new Response(upstream.body, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    return rainGaugeProxyError(error)
  }
}
