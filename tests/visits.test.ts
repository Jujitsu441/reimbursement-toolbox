import { describe, expect, it } from "vitest"

import { formatVisitCount, isVisitResponse } from "@/lib/visits"

describe("visit helpers", () => {
  it("accepts only numeric visit responses", () => {
    expect(isVisitResponse({ total: 12 })).toBe(true)
    expect(isVisitResponse({ total: null })).toBe(false)
    expect(isVisitResponse({ total: "12" })).toBe(false)
  })

  it("formats visit count for Chinese locale", () => {
    expect(formatVisitCount(12345)).toBe("12,345")
  })
})
