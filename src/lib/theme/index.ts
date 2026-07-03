import { flushSync } from "react-dom"
import type { ThemeMode, ThemeToggleOrigin, ViewTransitionDocument } from "@/app/types"
export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light"
  try {
    return window.localStorage.getItem("reimbursement.theme") === "dark"
      ? "dark"
      : "light"
  } catch {
    return "light"
  }
}

export function writeThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem("reimbursement.theme", mode)
  } catch {
    // 外观偏好保存失败时，只影响下次打开的默认主题。
  }
}

export function toggleThemeModeWithTransition({
  currentMode,
  origin,
  setThemeMode,
  documentRef = document,
  windowRef = window,
}: {
  currentMode: ThemeMode
  origin: ThemeToggleOrigin
  setThemeMode: (mode: ThemeMode) => void
  documentRef?: Document
  windowRef?: Window
}) {
  const nextMode = currentMode === "dark" ? "light" : "dark"
  const viewTransitionDocument = documentRef as ViewTransitionDocument
  if (
    !viewTransitionDocument.startViewTransition ||
    windowRef.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    setThemeMode(nextMode)
    return
  }

  const isElementOrigin =
    origin &&
    "getBoundingClientRect" in origin &&
    typeof origin.getBoundingClientRect === "function"
  const rect = isElementOrigin ? origin.getBoundingClientRect() : null
  const point =
    !isElementOrigin &&
    origin &&
    "x" in origin &&
    "y" in origin &&
    typeof origin.x === "number" &&
    typeof origin.y === "number"
      ? origin
      : null
  const cssX = rect
    ? rect.left + rect.width / 2
    : point
      ? point.x
      : windowRef.innerWidth / 2
  const cssY = rect
    ? rect.top + rect.height / 2
    : point
      ? point.y
      : windowRef.innerHeight / 2
  const scale = Math.max(1, windowRef.devicePixelRatio || 1)
  const x = cssX * scale
  const y = cssY * scale
  const viewportWidth = windowRef.innerWidth * scale
  const viewportHeight = windowRef.innerHeight * scale
  const endRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y)
  )

  const transition = viewTransitionDocument.startViewTransition(() => {
    flushSync(() => {
      setThemeMode(nextMode)
    })
  })

  void transition.ready.then(() => {
    documentRef.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  })
}
