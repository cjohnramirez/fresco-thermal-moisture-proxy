import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "./route"

describe("GET /api/rain-gauge/status", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("proxies and validates the AP status packet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            type: "rain_gauge",
            device: "nodemcu-32s",
            uptimeMs: 100,
            sessionStartMs: 50,
            ssid: "FrescoRainGauge",
            ip: "192.168.4.1",
            clients: 1,
            sseClients: 1,
            tipPin: 34,
            debounceMs: 50,
            countsBothEdges: true,
            mlPerTip: 2.3695,
            catchmentAreaCm2: null,
            mmPerTip: null,
            edges: 2,
            tips: 1,
          }),
          { status: 200 }
        )
      })
    )

    const response = await GET(
      new Request("http://localhost/api/rain-gauge/status?baseUrl=http://192.168.4.1")
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toMatchObject({ tipPin: 34, countsBothEdges: true })
  })

  it("rejects unsafe base urls", async () => {
    const response = await GET(
      new Request("http://localhost/api/rain-gauge/status?baseUrl=http://example.com")
    )
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.message).toContain("AP address or localhost")
  })
})
