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

export function toggleThemeModeWithTransition({ currentMode, origin, setThemeMode, documentRef = document, windowRef = window }: { currentMode: ThemeMode; origin: ThemeToggleOrigin; setThemeMode: (mode: ThemeMode) => void; documentRef?: Document; windowRef?: Window }) {
  const nextMode = currentMode === "dark" ? "light" : "dark"
  const viewTransitionDocument = documentRef as ViewTransitionDocument
  if (!viewTransitionDocument.startViewTransition || windowRef.matchMedia("(prefers-reduced-motion: reduce)").matches) { setThemeMode(nextMode); return }
  const rect = origin?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : windowRef.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : windowRef.innerHeight / 2
  const endRadius = Math.hypot(Math.max(x, windowRef.innerWidth - x), Math.max(y, windowRef.innerHeight - y))
  const transition = viewTransitionDocument.startViewTransition(() => { flushSync(() => { setThemeMode(nextMode) }) })
  void transition.ready.then(() => { documentRef.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] }, { duration: 500, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }) })
}
