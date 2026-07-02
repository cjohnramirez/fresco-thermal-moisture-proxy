import { describe, expect, it, vi } from "vitest"

import { GET } from "./route"

describe("GET /api/readings", () => {
  it("returns not_configured when Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")

    const response = await GET(new Request("http://localhost/api/readings"))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ ok: false, code: "not_configured" })
  })
})
