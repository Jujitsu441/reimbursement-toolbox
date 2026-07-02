import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileList } from "@/components/shared/FileList"
import { SettingNumber } from "@/components/shared/SettingNumber"
import { SettingSwitch } from "@/components/shared/SettingSwitch"
import { UploadZone } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/layout/ToolLayout"
import type { MaterialFile } from "@/app/types"
import { InvoicePreview } from "@/features/invoice/InvoicePreview"
export function InvoiceTool(props: {
  files: MaterialFile[]
  pages: MaterialFile[][]
  previewZoom: number
  setPreviewZoom: (value: number) => void
  sequenceLength: number
  margin: number
  setMargin: (value: number) => void
  showGuide: boolean
  setShowGuide: (value: boolean) => void
  exportGuide: boolean
  setExportGuide: (value: boolean) => void
  onAdd: (files: FileList | File[]) => void
  onToggleCopy: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  onExport: () => void
}) {
  return (
    <ToolLayout
      sidebar={
        <>
          <UploadZone
            id="invoice-upload"
            icon={FileText}
            title="选择或拖入发票文件"
            desc="支持 PDF、JPG、PNG、WEBP，可一次添加多个文件"
            accept="application/pdf,image/*"
            onFiles={props.onAdd}
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
            label="显示撕开线"
            desc="仅影响预览"
            checked={props.showGuide}
            onCheckedChange={props.setShowGuide}
          />
          <SettingSwitch
            label="导出撕开线"
            desc="PDF 中保留虚线"
            checked={props.exportGuide}
            onCheckedChange={props.setExportGuide}
          />
          <FileList
            title="发票列表"
            count={
              props.files.length
                ? `共 ${props.files.length} 张 · 打印 ${props.sequenceLength} 份`
                : ""
            }
            empty="从上方添加发票文件"
            files={props.files}
            renderExtra={(file) => (
              <Button
                variant={file.double ? "default" : "outline"}
                size="xs"
                onClick={() => props.onToggleCopy(file.id)}
              >
                {file.double ? "已加印一份" : "加印一份"}
              </Button>
            )}
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
        <InvoicePreview
          pages={props.pages}
          zoom={props.previewZoom}
          margin={props.margin}
          showGuide={props.showGuide}
        />
      }
      zoom={props.previewZoom}
      setZoom={props.setPreviewZoom}
      meta={
        props.files.length
          ? `共 ${props.pages.length} 页 · ${props.files.length} 张发票`
          : "添加发票后在这里预览排版效果"
      }
    />
  )
}
