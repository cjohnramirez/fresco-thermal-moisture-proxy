import { createRainGaugeSessionId } from "@/lib/rain-gauge/storage"
import type { RainGaugeSession } from "@/lib/rain-gauge/types"

// Discriminated response shape returned by every /api/rain-gauge/* route.
export type RainGaugeApiResponse<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; code?: string }

export function readLocalStorage(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback
  }

  return window.localStorage.getItem(key) ?? fallback
}

export function writeLocalStorage(key: string, value: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value)
  }
}

// Fetches JSON from a rain-gauge proxy route and unwraps the `ok` envelope,
// throwing a single Error on either transport or application failure.
export async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const payload = (await response.json()) as RainGaugeApiResponse<T>

  if (!payload.ok) {
    throw new Error(payload.message || "Rain gauge request failed.")
  }
  if (!response.ok) {
    throw new Error("Rain gauge request failed.")
  }

  return payload
}

// The browser never talks to the ESP32 directly; it proxies through local Next
// routes that forward to `baseUrl`, sidestepping the AP's CORS behavior.
function withBaseUrl(path: string, apBaseUrl: string) {
  return `/api/rain-gauge/${path}?baseUrl=${encodeURIComponent(apBaseUrl)}`
}

export function buildStatusUrl(apBaseUrl: string) {
  return withBaseUrl("status", apBaseUrl)
}

export function buildReadingsUrl(apBaseUrl: string) {
  return withBaseUrl("readings", apBaseUrl)
}

export function buildEventsUrl(apBaseUrl: string) {
  return withBaseUrl("events", apBaseUrl)
}

export function buildResetUrl(apBaseUrl: string) {
  return withBaseUrl("reset", apBaseUrl)
}

export function createSession(
  apBaseUrl: string,
  id = createRainGaugeSessionId()
): RainGaugeSession {
  const startedAt = new Date().toISOString()
  return {
    id,
    label: `Rain Gauge ${new Date(startedAt).toLocaleString()}`,
    source: "ap",
    startedAt,
    apBaseUrl,
    mlPerTip: null,
    catchmentAreaCm2: null,
  }
}
