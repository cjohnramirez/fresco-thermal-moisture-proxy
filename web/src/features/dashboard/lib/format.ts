import { CHANNELS } from "@/lib/experiment/types"

export function labelForChannel(channelId: string) {
  return CHANNELS.find((channel) => channel.id === channelId)?.label ?? channelId
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value.toFixed(2)
}
