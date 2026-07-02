import type { ReactNode } from "react"
import { Home } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import type { ThemeMode, ThemeToggleOrigin } from "@/app/types"
export function ToolShell({
  title,
  badge,
  onHome,
  themeMode,
  onToggleTheme,
  children,
}: {
  title: string
  badge: string
  onHome: () => void
  themeMode: ThemeMode
  onToggleTheme: (origin: ThemeToggleOrigin) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
        <Button
          className="!h-[22px] !gap-1 !rounded-md !px-1.5 !text-[11px] !font-normal !leading-none [&_svg]:!size-3"
          variant="outline"
          size="xs"
          onClick={onHome}
        >
          <Home data-icon="inline-start" />
          首页
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <strong>{title}</strong>
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <ThemeToggle mode={themeMode} onToggle={onToggleTheme} compact />
      </header>
      {children}
    </div>
  )
}
