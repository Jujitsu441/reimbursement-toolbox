import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ThemeMode, ThemeToggleOrigin } from "@/app/types"
export function ThemeToggle({
  mode,
  onToggle,
  compact = false,
}: {
  mode: ThemeMode
  onToggle: (origin: ThemeToggleOrigin) => void
  compact?: boolean
}) {
  const isDark = mode === "dark"
  const label = isDark ? "浅色模式" : "深色模式"
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={(event) => onToggle({ x: event.clientX, y: event.clientY })}
      title={label}
      aria-label={label}
    >
      <Icon data-icon={compact ? undefined : "inline-start"} />
      {compact ? null : label}
    </Button>
  )
}
