import type { ReactNode } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM, PREVIEW_ZOOM_STEP } from "@/app/constants"
export function ToolLayout({
  sidebar,
  preview,
  meta,
  zoom,
  setZoom,
}: {
  sidebar: ReactNode
  preview: ReactNode
  meta: string
  zoom: number
  setZoom: (value: number) => void
}) {
  const canZoomOut = zoom > MIN_PREVIEW_ZOOM
  const canZoomIn = zoom < MAX_PREVIEW_ZOOM
  const updateZoom = (next: number) => {
    setZoom(Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, next)))
  }

  return (
    <main className="grid min-h-[calc(100vh-56px)] lg:grid-cols-[330px_1fr]">
      <aside className="flex flex-col gap-4 border-b border-border bg-card p-4 lg:border-b-0 lg:border-r">
        {sidebar}
      </aside>
      <section className="flex min-w-0 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4 text-sm text-muted-foreground">
          <span>{meta}</span>
          <div className="flex items-center gap-2">
            <span>预览缩放</span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={!canZoomOut}
              onClick={() => updateZoom(zoom - PREVIEW_ZOOM_STEP)}
              title="缩小预览"
            >
              <Minus />
            </Button>
            <span className="min-w-10 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={!canZoomIn}
              onClick={() => updateZoom(zoom + PREVIEW_ZOOM_STEP)}
              title="放大预览"
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 gap-5 overflow-auto p-6">{preview}</div>
      </section>
    </main>
  )
}
