export function today() {
  const date = new Date()
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}

export function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000)
}

export function formatDateCN(date: Date) {
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${week}`
}
