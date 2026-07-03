import { describe, expect, it } from "vitest"

import { GET } from "./route"

describe("GET /api/project-docs/[slug]", () => {
  it("returns allowlisted project docs", async () => {
    const response = await GET(new Request("http://localhost/api/project-docs/readme"), {
      params: Promise.resolve({ slug: "readme" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      doc: { slug: "readme" },
    })
    expect(payload.content).toContain("ESP32")
  })

  it("rejects non-allowlisted paths", async () => {
    const response = await GET(
      new Request("http://localhost/api/project-docs/../../package.json"),
      { params: Promise.resolve({ slug: "..%2F..%2Fpackage.json" }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ ok: false, code: "not_found" })
  })
})
