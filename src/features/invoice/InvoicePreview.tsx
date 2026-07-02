import { Badge } from "@/components/ui/badge"
import { EmptyPreview } from "@/components/shared/EmptyPreview"
import { A4_MM, MM_TO_PX } from "@/app/constants"
import type { MaterialFile } from "@/app/types"
export function InvoicePreview({
  pages,
  zoom,
  margin,
  showGuide,
}: {
  pages: MaterialFile[][]
  zoom: number
  margin: number
  showGuide: boolean
}) {
  if (!pages.length) return <EmptyPreview text="添加发票后在这里预览排版效果" />
  const width = A4_MM.width * MM_TO_PX * zoom
  const height = A4_MM.height * MM_TO_PX * zoom
  const half = height / 2
  const mg = margin * MM_TO_PX * zoom
  const areaW = width - mg * 2
  const areaH = half - mg * 2

  return (
    <>
      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="relative shrink-0 bg-white shadow-lg"
          style={{ width, height }}
        >
          {[0, 1].map((row) => {
            const file = page[row]
            if (!file) return null
            const scale = Math.min(areaW / file.width, areaH / file.height)
            const w = file.width * scale
            const h = file.height * scale
            return (
              <div
                key={`${file.id}-${row}`}
                className="absolute flex items-center justify-center overflow-hidden"
                style={{
                  left: mg,
                  top: mg + row * half,
                  width: areaW,
                  height: areaH,
                }}
              >
                <img src={file.dataUrl} alt="" style={{ width: w, height: h }} />
                {file.isCopy ? (
                  <Badge className="absolute right-1 top-1" variant="secondary">
                    副本
                  </Badge>
                ) : null}
              </div>
            )
          })}
          {showGuide ? (
            <>
              <div className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/50" style={{ top: half }} />
              <div className="absolute right-3 bg-white px-2 text-[10px] text-muted-foreground" style={{ top: half - 9 }}>
                沿此线撕开
              </div>
            </>
          ) : null}
          <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
            第 {pageIndex + 1} / {pages.length} 页
          </div>
        </div>
      ))}
    </>
  )
}
