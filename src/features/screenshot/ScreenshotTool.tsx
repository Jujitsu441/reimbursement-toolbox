import { Grid2X2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "@/components/shared/FileList"
import { SettingNumber } from "@/components/shared/SettingNumber"
import { SettingSwitch } from "@/components/shared/SettingSwitch"
import { UploadZone } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/layout/ToolLayout"
import type { MaterialFile } from "@/app/types"
import { ScreenshotPreview } from "@/features/screenshot/ScreenshotPreview"
export function ScreenshotTool(props: {
  files: MaterialFile[]
  pages: MaterialFile[][]
  previewZoom: number
  setPreviewZoom: (value: number) => void
  margin: number
  setMargin: (value: number) => void
  gap: number
  setGap: (value: number) => void
  showGuide: boolean
  setShowGuide: (value: boolean) => void
  onAdd: (files: FileList | File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onExport: () => void
}) {
  return (
    <ToolLayout
      sidebar={
        <>
          <UploadZone
            id="screenshot-upload"
            icon={Grid2X2}
            title="选择或拖入付款截图"
            desc="支持 JPG、PNG、WEBP，可一次添加多张"
            accept="image/*"
            onFiles={props.onAdd}
          />
          <SettingNumber
            label="图片间距"
            desc="单位：mm"
            value={props.gap}
            min={0}
            max={10}
            step={0.5}
            onChange={props.setGap}
          />
          <SettingNumber
            label="页边距"
            desc="单位：mm"
            value={props.margin}
            min={0}
            max={20}
            step={1}
            onChange={props.setMargin}
          />
          <SettingSwitch
            label="显示折叠线"
            desc="仅影响预览"
            checked={props.showGuide}
            onCheckedChange={props.setShowGuide}
          />
          <FileList
            title="付款截图列表"
            count={props.files.length ? `共 ${props.files.length} 张` : ""}
            empty="从上方添加付款截图"
            files={props.files}
            onRemove={props.onRemove}
            onClear={props.onClear}
          />
          <Button
            className="w-full"
            disabled={!props.files.length}
            onClick={props.onExport}
          >
            导出为 PDF
          </Button>
        </>
      }
      preview={
        <ScreenshotPreview
          pages={props.pages}
          zoom={props.previewZoom}
          margin={props.margin}
          gap={props.gap}
          showGuide={props.showGuide}
        />
      }
      zoom={props.previewZoom}
      setZoom={props.setPreviewZoom}
      meta={
        props.files.length
          ? `共 ${props.pages.length} 页 · ${props.files.length} 张付款截图`
          : "添加付款截图后在这里预览排版效果"
      }
    />
  )
}
