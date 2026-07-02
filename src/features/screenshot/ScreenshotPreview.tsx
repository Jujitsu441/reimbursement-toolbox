import { EmptyPreview } from "@/components/shared/EmptyPreview"
import { A4_MM, MM_TO_PX } from "@/app/constants"
import type { MaterialFile } from "@/app/types"
export function ScreenshotPreview({
  pages,
  zoom,
  margin,
  gap,
  showGuide,
}: {
  pages: MaterialFile[][]
  zoom: number
  margin: number
  gap: number
  showGuide: boolean
}) {
  if (!pages.length) return <EmptyPreview text="添加付款截图后在这里预览排版效果" />
  const width = A4_MM.width * MM_TO_PX * zoom
  const height = A4_MM.height * MM_TO_PX * zoom
  const mg = margin * MM_TO_PX * zoom
  const gp = gap * MM_TO_PX * zoom
  const cellW = (width - mg * 2 - gp * 2) / 3
  const cellH = (height - mg * 2 - gp) / 2

  return (
    <>
      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="relative shrink-0 bg-white shadow-lg"
          style={{ width, height }}
        >
          <div
            className="absolute grid"
            style={{
              left: mg,
              top: mg,
              width: width - mg * 2,
              height: height - mg * 2,
              gridTemplateColumns: `repeat(3, ${cellW}px)`,
              gridTemplateRows: `repeat(2, ${cellH}px)`,
              gap: gp,
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const file = page[index]
              return (
                <div key={index} className="flex items-center justify-center overflow-hidden">
                  {file ? (
                    <img src={file.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : null}
                </div>
              )
            })}
          </div>
          {showGuide ? (
            <>
              <div className="absolute bottom-0 top-0 border-l border-dashed border-muted-foreground/40" style={{ left: "50%" }} />
              <div className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/40" style={{ top: "50%" }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-white px-2 text-[10px] text-muted-foreground">
                对折
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
