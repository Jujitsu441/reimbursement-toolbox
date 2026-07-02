export function shouldTrackVisit() {
  if (typeof window === "undefined") return false
  const { hostname, protocol } = window.location
  return protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1"
}

export function isVisitResponse(value: unknown): value is { total: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "total" in value &&
    typeof value.total === "number" &&
    Number.isFinite(value.total)
  )
}

export function formatVisitCount(total: number) {
  return new Intl.NumberFormat("zh-CN").format(total)
}

export function readVisitCountCache() {
  try {
    const raw = window.sessionStorage.getItem("reimbursement.visitCount")
    if (!raw) return null
    const total = Number.parseInt(raw, 10)
    return Number.isFinite(total) ? total : null
  } catch {
    return null
  }
}

export function writeVisitCountCache(total: number) {
  try {
    window.sessionStorage.setItem("reimbursement.visitCount", String(total))
  } catch {
    // sessionStorage 不可用时只影响重复计数保护，不影响主要功能。
  }
}
