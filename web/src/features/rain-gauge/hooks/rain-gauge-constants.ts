import type {
  CalibrationTrial,
  RainGaugeReading,
} from "@/lib/rain-gauge/types"

export const DEFAULT_AP_BASE_URL = "http://192.168.4.1"
export const AP_URL_KEY = "fresco-rain-gauge-ap-url"
export const SESSION_ID_KEY = "fresco-rain-gauge-session-id"
export const PAGE_SIZE = 100

// Stable empty references so consumers don't re-render on fresh [] literals.
export const EMPTY_READINGS: RainGaugeReading[] = []
export const EMPTY_TRIALS: CalibrationTrial[] = []
export const EMPTY_PACKETS: string[] = []
