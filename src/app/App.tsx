import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { ProgressOverlay } from "@/components/shared/ProgressOverlay"
import { ToolShell } from "@/components/layout/ToolShell"
import { HomeView } from "@/features/home/HomeView"
import { InvoiceTool } from "@/features/invoice/InvoiceTool"
import { ScreenshotTool } from "@/features/screenshot/ScreenshotTool"
import { MoneyTool } from "@/features/money/MoneyTool"
import { HolidayTool } from "@/features/holiday/HolidayTool"
import { IpTool } from "@/features/ip/IpTool"
import { DEFAULT_PREVIEW_ZOOM } from "@/app/constants"
import type { IpInfo, IpStatus, MaterialFile, ProgressState, ThemeMode, ThemeToggleOrigin, View } from "@/app/types"
import { chunk } from "@/lib/collections"
import { copyText, downloadBytes, readImageFile } from "@/lib/files"
import { amountToRMBUpper } from "@/lib/money"
import { buildPdfFromJpegs, renderInvoicePage, renderPdfFile, renderScreenshotPage } from "@/lib/pdf"
import { formatIpInfo, queryIPTarget } from "@/lib/ip"
import { readThemeMode, toggleThemeModeWithTransition, writeThemeMode } from "@/lib/theme"
import { today } from "@/lib/date"
function App() {
  const [view, setView] = useState<View>("home")
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode())
  const [invoiceFiles, setInvoiceFiles] = useState<MaterialFile[]>([])
  const [screenshotFiles, setScreenshotFiles] = useState<MaterialFile[]>([])
  const [invoiceMargin, setInvoiceMargin] = useState(8)
  const [screenshotMargin, setScreenshotMargin] = useState(8)
  const [screenshotGap, setScreenshotGap] = useState(2)
  const [showInvoiceGuide, setShowInvoiceGuide] = useState(true)
  const [exportInvoiceGuide, setExportInvoiceGuide] = useState(false)
  const [showScreenshotGuide, setShowScreenshotGuide] = useState(true)
  const [moneyInput, setMoneyInput] = useState("")
  const [ipStatus, setIpStatus] = useState<IpStatus>("idle")
  const [ipInfos, setIpInfos] = useState<IpInfo[]>([])
  const [previewZoom, setPreviewZoom] = useState(DEFAULT_PREVIEW_ZOOM)
  const [progress, setProgress] = useState<ProgressState>({
    open: false,
    value: 0,
    text: "",
  })

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark")
    writeThemeMode(themeMode)
  }, [themeMode])

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault()
    document.addEventListener("dragover", prevent)
    document.addEventListener("drop", prevent)
    return () => {
      document.removeEventListener("dragover", prevent)
      document.removeEventListener("drop", prevent)
    }
  }, [])

  const invoiceSequence = useMemo(() => {
    const copies = invoiceFiles
      .filter((file) => file.double)
      .map((file) => ({ ...file, id: `${file.id}-copy`, isCopy: true }))
    return [...invoiceFiles, ...copies]
  }, [invoiceFiles])

  const invoicePages = chunk(invoiceSequence, 2)
  const screenshotPages = chunk(screenshotFiles, 6)

  async function addInvoiceFiles(fileList: FileList | File[]) {
    try {
      setProgress({ open: true, value: 5, text: "正在读取文件…" })
      const loaded: MaterialFile[] = []
      const files = Array.from(fileList)
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        setProgress({
          open: true,
          value: 5 + (index / files.length) * 85,
          text: `正在处理 ${file.name}…`,
        })
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          loaded.push(...(await renderPdfFile(file)))
        } else {
          loaded.push(await readImageFile(file))
        }
      }
      setInvoiceFiles((current) => [...current, ...loaded])
      setProgress({ open: true, value: 100, text: "添加完成" })
      window.setTimeout(() => setProgress((p) => ({ ...p, open: false })), 500)
    } catch {
      setProgress((p) => ({ ...p, open: false }))
      toast.error("添加发票失败，请检查文件是否损坏后重试")
    }
  }

  async function addScreenshotFiles(fileList: FileList | File[]) {
    try {
      const loaded = await Promise.all(Array.from(fileList).map(readImageFile))
      setScreenshotFiles((current) => [...current, ...loaded])
    } catch {
      toast.error("添加付款截图失败，请检查图片格式后重试")
    }
  }

  function toggleInvoiceCopy(id: string) {
    setInvoiceFiles((files) =>
      files.map((file) =>
        file.id === id ? { ...file, double: !file.double } : file
      )
    )
  }

  async function exportInvoicePdf() {
    if (!invoiceSequence.length) return
    try {
      setProgress({ open: true, value: 5, text: "正在加载发票…" })
      const jpgs: string[] = []
      for (let index = 0; index < invoicePages.length; index += 1) {
        setProgress({
          open: true,
          value: 10 + (index / invoicePages.length) * 80,
          text: `正在渲染第 ${index + 1}/${invoicePages.length} 页…`,
        })
        jpgs.push(
          await renderInvoicePage(
            invoicePages[index],
            invoiceMargin,
            exportInvoiceGuide
          )
        )
      }
      setProgress({ open: true, value: 92, text: "正在生成 PDF…" })
      const bytes = await buildPdfFromJpegs(jpgs)
      downloadBytes(bytes, `发票_${invoiceFiles.length}张_${today()}.pdf`)
      setProgress({ open: true, value: 100, text: "导出完成" })
      window.setTimeout(() => setProgress((p) => ({ ...p, open: false })), 600)
    } catch {
      setProgress((p) => ({ ...p, open: false }))
      toast.error("导出发票 PDF 失败，请刷新页面后重试。如果仍然失败，请减少一次导出的文件数量")
    }
  }

  async function exportScreenshotPdf() {
    if (!screenshotFiles.length) return
    try {
      setProgress({ open: true, value: 5, text: "正在加载付款截图…" })
      const jpgs: string[] = []
      for (let index = 0; index < screenshotPages.length; index += 1) {
        setProgress({
          open: true,
          value: 10 + (index / screenshotPages.length) * 80,
          text: `正在渲染第 ${index + 1}/${screenshotPages.length} 页…`,
        })
        jpgs.push(
          await renderScreenshotPage(
            screenshotPages[index],
            screenshotMargin,
            screenshotGap
          )
        )
      }
      setProgress({ open: true, value: 92, text: "正在生成 PDF…" })
      const bytes = await buildPdfFromJpegs(jpgs)
      downloadBytes(bytes, `付款截图_${screenshotFiles.length}张_${today()}.pdf`)
      setProgress({ open: true, value: 100, text: "导出完成" })
      window.setTimeout(() => setProgress((p) => ({ ...p, open: false })), 600)
    } catch {
      setProgress((p) => ({ ...p, open: false }))
      toast.error("导出付款截图 PDF 失败，请刷新页面后重试。如果仍然失败，请减少一次导出的图片数量")
    }
  }

  const moneyResult = useMemo(() => {
    try {
      return { text: amountToRMBUpper(moneyInput), error: "" }
    } catch (error) {
      return {
        text: "",
        error: error instanceof Error ? error.message : "金额格式不正确，请检查后重试",
      }
    }
  }, [moneyInput])

  async function copyMoneyUpper() {
    if (!moneyResult.text) return
    try {
      await copyText(moneyResult.text)
      toast.success("已复制大写金额")
    } catch {
      toast.error("复制失败，请手动选择大写金额")
    }
  }

  async function queryMyIP() {
    setIpStatus("loading")
    setIpInfos([])
    const targets = [
      { type: "IPv4", url: "https://api.ipify.org?format=json" },
      { type: "IPv6", url: "https://api6.ipify.org?format=json" },
    ]
    const results = (await Promise.all(targets.map(queryIPTarget))).filter(
      Boolean
    ) as IpInfo[]
    if (!results.length) {
      setIpStatus("error")
      toast.error("查询 IP 失败，请检查网络后重试")
      return
    }
    setIpInfos(results)
    setIpStatus("done")
  }

  async function copyIPInfo() {
    if (!ipInfos.length) {
      toast.info("先查询 IP 信息")
      return
    }
    try {
      await copyText(formatIpInfo(ipInfos))
      toast.success("已复制 IP 信息")
    } catch {
      toast.error("复制失败，请手动选择 IP 信息")
    }
  }

  const toggleThemeMode = (origin: ThemeToggleOrigin) => {
    toggleThemeModeWithTransition({
      currentMode: themeMode,
      origin,
      setThemeMode,
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      {view === "home" ? (
        <HomeView
          setView={setView}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        />
      ) : view === "invoice" ? (
        <ToolShell
          title="发票排版"
          badge="A4 · 每页 2 张"
          onHome={() => setView("home")}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        >
          <InvoiceTool
            files={invoiceFiles}
            pages={invoicePages}
            previewZoom={previewZoom}
            setPreviewZoom={setPreviewZoom}
            sequenceLength={invoiceSequence.length}
            margin={invoiceMargin}
            setMargin={setInvoiceMargin}
            showGuide={showInvoiceGuide}
            setShowGuide={setShowInvoiceGuide}
            exportGuide={exportInvoiceGuide}
            setExportGuide={setExportInvoiceGuide}
            onAdd={addInvoiceFiles}
            onToggleCopy={toggleInvoiceCopy}
            onRemove={(id) =>
              setInvoiceFiles((files) => files.filter((file) => file.id !== id))
            }
            onClear={() => setInvoiceFiles([])}
            onExport={exportInvoicePdf}
          />
        </ToolShell>
      ) : view === "screenshot" ? (
        <ToolShell
          title="付款截图排版"
          badge="A4 · 2 行 × 3 列"
          onHome={() => setView("home")}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        >
          <ScreenshotTool
            files={screenshotFiles}
            pages={screenshotPages}
            previewZoom={previewZoom}
            setPreviewZoom={setPreviewZoom}
            margin={screenshotMargin}
            setMargin={setScreenshotMargin}
            gap={screenshotGap}
            setGap={setScreenshotGap}
            showGuide={showScreenshotGuide}
            setShowGuide={setShowScreenshotGuide}
            onAdd={addScreenshotFiles}
            onRemove={(id) =>
              setScreenshotFiles((files) => files.filter((file) => file.id !== id))
            }
            onClear={() => setScreenshotFiles([])}
            onExport={exportScreenshotPdf}
          />
        </ToolShell>
      ) : view === "money" ? (
        <ToolShell
          title="人民币大写"
          badge="金额 · 大写"
          onHome={() => setView("home")}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        >
          <MoneyTool
            value={moneyInput}
            setValue={setMoneyInput}
            result={moneyResult.text}
            error={moneyResult.error}
            onCopy={copyMoneyUpper}
          />
        </ToolShell>
      ) : view === "holiday" ? (
        <ToolShell
          title="2026 放假安排"
          badge="节假日 · 调休"
          onHome={() => setView("home")}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        >
          <HolidayTool />
        </ToolShell>
      ) : (
        <ToolShell
          title="IP 地址查询"
          badge="公网 IP · 归属地"
          onHome={() => setView("home")}
          themeMode={themeMode}
          onToggleTheme={toggleThemeMode}
        >
          <IpTool
            status={ipStatus}
            infos={ipInfos}
            onQuery={queryMyIP}
            onCopy={copyIPInfo}
          />
        </ToolShell>
      )}
      {progress.open ? <ProgressOverlay progress={progress} /> : null}
    </div>
  )
}
export default App
