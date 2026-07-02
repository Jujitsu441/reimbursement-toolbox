import { parseLocalDate } from "@/lib/date"
export const HOLIDAYS_2026 = [
  { name: "元旦", start: "2026-01-01", end: "2026-01-03", range: "01月01日~01月03日", workdays: ["01月04日（周日）上班"], days: 3 },
  { name: "春节", start: "2026-02-15", end: "2026-02-23", range: "02月15日~02月23日", workdays: ["02月14日（周六）上班", "02月28日（周六）上班"], days: 9 },
  { name: "清明节", start: "2026-04-04", end: "2026-04-06", range: "04月04日~04月06日", workdays: [], days: 3 },
  { name: "劳动节", start: "2026-05-01", end: "2026-05-05", range: "05月01日~05月05日", workdays: ["05月09日（周六）上班"], days: 5 },
  { name: "端午节", start: "2026-06-19", end: "2026-06-21", range: "06月19日~06月21日", workdays: [], days: 3 },
  { name: "中秋节", start: "2026-09-25", end: "2026-09-27", range: "09月25日~09月27日", workdays: [], days: 3 },
  { name: "国庆节", start: "2026-10-01", end: "2026-10-07", range: "10月01日~10月07日", workdays: ["09月20日（周日）上班", "10月10日（周六）上班"], days: 7 },
]

export function holidayStatus(
  item: (typeof HOLIDAYS_2026)[number],
  todayDate: Date
) {
  const start = parseLocalDate(item.start)
  const end = parseLocalDate(item.end)
  if (todayDate > end) return "past"
  if (todayDate >= start && todayDate <= end) return "current"
  return "upcoming"
}
