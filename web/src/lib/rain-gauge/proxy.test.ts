import { describe, expect, it } from "vitest"

import { validateRainGaugeBaseUrl } from "./proxy"

describe("rain gauge proxy URL validation", () => {
  it("allows the flashed AP URL", () => {
    expect(validateRainGaugeBaseUrl("http://192.168.4.1")).toBe(
      "http://192.168.4.1"
    )
  })

  it("allows localhost mock URLs", () => {
    expect(validateRainGaugeBaseUrl("http://localhost:4545/mock")).toBe(
      "http://localhost:4545"
    )
  })

  it("rejects non-local URLs", () => {
    expect(() => validateRainGaugeBaseUrl("https://example.com")).toThrow(
      "Rain gauge URL must use http."
    )
    expect(() => validateRainGaugeBaseUrl("http://example.com")).toThrow(
      "Rain gauge URL must be the AP address or localhost."
    )
  })
})
