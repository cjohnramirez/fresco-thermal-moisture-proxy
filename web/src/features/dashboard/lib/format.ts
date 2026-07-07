import { CHANNELS } from "@/lib/experiment/types"

export function labelForChannel(channelId: string) {
  if (channelId === "water") {
    return "Water"
  }

  return CHANNELS.find((channel) => channel.id === channelId)?.label ?? channelId
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value.toFixed(2)
}

// MM:SS countdown label (checkpoints are at most 10 minutes apart).
export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
