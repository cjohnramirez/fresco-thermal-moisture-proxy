"use client"

import * as React from "react"

// Ticking clock for live countdowns. Uses useSyncExternalStore so the server and
// the hydration render both read the stable server snapshot (null) — no
// hydration mismatch — then it reads the live clock and ticks on the client
// only. `now` is set inside subscribe (a client-only callback) so no impure
// Date.now() runs during render. Kept in its own hook so just the component that
// needs a per-second re-render subscribes to it.
export function useNow(intervalMs = 1000): number | null {
  const nowRef = React.useRef<number | null>(null)

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      nowRef.current = Date.now()
      const id = window.setInterval(() => {
        nowRef.current = Date.now()
        onStoreChange()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
    [intervalMs]
  )

  return React.useSyncExternalStore<number | null>(
    subscribe,
    () => nowRef.current,
    () => null
  )
}
