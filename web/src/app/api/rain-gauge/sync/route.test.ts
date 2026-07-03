import { describe, expect, it, vi } from "vitest"

import { POST } from "./route"

describe("POST /api/rain-gauge/sync", () => {
  it("returns not_configured when Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")

    const response = await POST(
      new Request("http://localhost/api/rain-gauge/sync", {
        method: "POST",
        body: JSON.stringify({ session: {}, readings: [] }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ ok: false, code: "not_configured" })
  })
})
