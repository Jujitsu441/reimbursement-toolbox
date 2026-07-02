import { beforeEach, describe, expect, it, vi } from "vitest"

import { readThemeMode, toggleThemeModeWithTransition, writeThemeMode } from "@/lib/theme"

describe("theme persistence", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("reads light mode by default and persists dark mode", () => {
    expect(readThemeMode()).toBe("light")
    writeThemeMode("dark")
    expect(readThemeMode()).toBe("dark")
  })
})

describe("toggleThemeModeWithTransition", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    document.documentElement.animate = vi.fn()
  })

  it("skips animation when reduced motion is enabled", () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const setThemeMode = vi.fn()

    toggleThemeModeWithTransition({
      currentMode: "light",
      origin: null,
      setThemeMode,
    })

    expect(setThemeMode).toHaveBeenCalledWith("dark")
    expect(document.documentElement.animate).not.toHaveBeenCalled()
  })

  it("uses View Transition when supported", async () => {
    const setThemeMode = vi.fn()
    const startViewTransition = vi.fn((callback: () => void) => {
      callback()
      return { ready: Promise.resolve() }
    })
    const documentRef = Object.assign(document, { startViewTransition })

    toggleThemeModeWithTransition({
      currentMode: "dark",
      origin: null,
      setThemeMode,
      documentRef,
    })

    await Promise.resolve()

    expect(startViewTransition).toHaveBeenCalled()
    expect(setThemeMode).toHaveBeenCalledWith("light")
    expect(document.documentElement.animate).toHaveBeenCalled()
  })

  it("starts animation from the trigger center", async () => {
    const setThemeMode = vi.fn()
    const startViewTransition = vi.fn((callback: () => void) => {
      callback()
      return { ready: Promise.resolve() }
    })
    const documentRef = Object.assign(document, { startViewTransition })
    const origin = document.createElement("button")
    origin.getBoundingClientRect = vi.fn(() => ({
      left: 150,
      top: 40,
      width: 120,
      height: 32,
      right: 270,
      bottom: 72,
      x: 150,
      y: 40,
      toJSON: () => ({}),
    }))

    toggleThemeModeWithTransition({
      currentMode: "light",
      origin,
      setThemeMode,
      documentRef,
    })

    await Promise.resolve()

    expect(document.documentElement.animate).toHaveBeenCalledWith(
      expect.objectContaining({
        clipPath: expect.arrayContaining(["circle(0px at 210px 56px)"]),
      }),
      expect.any(Object)
    )
  })
})
