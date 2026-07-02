export function createSessionId() {
  return `session-${new Date().toISOString().replace(/[:.]/g, "-")}`
}
