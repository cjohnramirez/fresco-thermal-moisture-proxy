import * as React from "react"

const MOBILE_BREAKPOINT = 768

function getSnapshot() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const mediaQueryList = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
  )
  mediaQueryList.addEventListener("change", callback)

  return () => mediaQueryList.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
