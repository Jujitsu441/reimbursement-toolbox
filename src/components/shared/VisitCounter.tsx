import { Eye } from "lucide-react"
import { formatVisitCount } from "@/lib/visits"
export function VisitCounter({ total }: { total: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">
      <Eye className="size-3.5" />
      累计 {formatVisitCount(total)} 次访问
    </span>
  )
}
