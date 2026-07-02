import { describe, expect, it } from "vitest"

import { dataUrlToBytes } from "@/lib/files"

describe("file helpers", () => {
  it("converts data URLs to bytes", () => {
    expect(Array.from(dataUrlToBytes("data:text/plain;base64,5rWL6K+V"))).toEqual([
      230, 181, 139, 232, 175, 149,
    ])
  })
})
