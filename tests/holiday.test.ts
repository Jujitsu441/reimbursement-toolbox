import { describe, expect, it } from "vitest"

import { daysBetween, parseLocalDate } from "@/lib/date"
import { HOLIDAYS_2026, holidayStatus } from "@/lib/holiday"

describe("holidayStatus", () => {
  const springFestival = HOLIDAYS_2026.find((item) => item.name === "春节")!

  it("marks past, current, and upcoming holidays", () => {
    expect(holidayStatus(springFestival, parseLocalDate("2026-02-01"))).toBe("upcoming")
    expect(holidayStatus(springFestival, parseLocalDate("2026-02-18"))).toBe("current")
    expect(holidayStatus(springFestival, parseLocalDate("2026-03-01"))).toBe("past")
  })

  it("calculates countdown days by local date", () => {
    expect(daysBetween(parseLocalDate("2026-02-01"), parseLocalDate("2026-02-15"))).toBe(14)
  })
})
