import { describe, expect, it } from "vitest"

import { amountToRMBUpper } from "@/lib/money"

describe("amountToRMBUpper", () => {
  it("converts common reimbursement amounts", () => {
    expect(amountToRMBUpper("0")).toBe("零元整")
    expect(amountToRMBUpper("0.01")).toBe("零元壹分")
    expect(amountToRMBUpper("128")).toBe("壹佰贰拾捌元整")
    expect(amountToRMBUpper("1001")).toBe("壹仟零壹元整")
    expect(amountToRMBUpper("1000000.5")).toBe("壹佰万元伍角")
  })

  it("rejects invalid amounts with user-facing messages", () => {
    expect(() => amountToRMBUpper("-1")).toThrow("请输入大于或等于 0 的金额，最多保留两位小数")
    expect(() => amountToRMBUpper("1.234")).toThrow("请输入大于或等于 0 的金额，最多保留两位小数")
    expect(() => amountToRMBUpper("1000000000000")).toThrow("金额不能超过 999999999999.99")
  })
})
