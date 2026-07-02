export type View = "home" | "invoice" | "screenshot" | "money" | "holiday" | "ip"
export type MaterialFile = { id: string; name: string; dataUrl: string; width: number; height: number; double?: boolean; isCopy?: boolean }
export type ProgressState = { open: boolean; value: number; text: string }
export type IpInfo = { ip: string; type: string; country: string; region: string; city: string; isp: string; org: string; timezone: string; source: string }
export type IpStatus = "idle" | "loading" | "done" | "error"
export type ThemeMode = "light" | "dark"
export type ThemeToggleOrigin = HTMLElement | null
export type ViewTransitionDocument = Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } }
