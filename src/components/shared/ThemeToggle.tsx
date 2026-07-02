import { useRef } from "react"
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
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isDark = mode === "dark"
  const label = isDark ? "浅色模式" : "深色模式"
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={() => onToggle(buttonRef.current)}
      title={label}
      aria-label={label}
    >
      <Icon data-icon={compact ? undefined : "inline-start"} />
      {compact ? null : label}
    </Button>
  )
}
