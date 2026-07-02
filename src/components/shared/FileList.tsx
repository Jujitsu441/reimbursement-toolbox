import type { ReactNode } from "react"
import { BadgeCheck, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MaterialFile } from "@/app/types"
export function FileList({
  title,
  count,
  empty,
  files,
  renderExtra,
  onRemove,
  onClear,
}: {
  title: string
  count: string
  empty: string
  files: MaterialFile[]
  renderExtra?: (file: MaterialFile) => ReactNode
  onRemove: (id: string) => void
  onClear: () => void
}) {
  return (
    <Card className="min-h-0 flex-1">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {count ? <CardDescription>{count}</CardDescription> : null}
        </div>
        {files.length ? (
          <Button
            variant="destructive"
            size="xs"
            onClick={() => {
              if (window.confirm(`清空 ${files.length} 个文件？此操作不会删除本机原文件。`)) {
                onClear()
              }
            }}
          >
            <Trash2 data-icon="inline-start" />
            清空列表
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex max-h-[42vh] flex-col gap-2 overflow-auto">
        {files.length ? (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
            >
              <img
                src={file.dataUrl}
                alt=""
                className="size-10 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{file.name}</div>
                {file.double ? (
                  <Badge className="mt-1" variant="secondary">
                    <BadgeCheck data-icon="inline-start" />
                    加印
                  </Badge>
                ) : null}
              </div>
              {renderExtra?.(file)}
              <Button
                variant="ghost"
                size="icon-sm"
                title="移除文件"
                onClick={() => onRemove(file.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        ) : (
          <div className="grid min-h-24 place-items-center text-sm text-muted-foreground">
            {empty}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
