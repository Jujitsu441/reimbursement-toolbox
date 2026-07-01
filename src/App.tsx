import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs"
import { PDFDocument } from "pdf-lib"
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Coffee,
  Copy,
  Eye,
  FileText,
  Globe2,
  Grid2X2,
  Home,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Trash2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import rewardQr from "@/assets/wechat-reward.png"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Switch } from "@/components/ui/switch"
import { CMAP_DATA } from "@/lib/cmap-data"
import { cn } from "@/lib/utils"

type View = "home" | "invoice" | "screenshot" | "money" | "holiday" | "ip"

type MaterialFile = {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
  double?: boolean
  isCopy?: boolean
}

type ProgressState = {
  open: boolean
  value: number
  text: string
}

type IpInfo = {
  ip: string
  type: string
  country: string
  region: string
  city: string
  isp: string
  org: string
  timezone: string
  source: string
}

type IpStatus = "idle" | "loading" | "done" | "error"
type ThemeMode = "light" | "dark"

const MM_TO_PX = 3.7795275591
const A4_MM = { width: 210, height: 297 }
const A4_PT = { width: 595.28, height: 841.89 }
const DEFAULT_PREVIEW_ZOOM = 0.76
const MIN_PREVIEW_ZOOM = 0.5
const MAX_PREVIEW_ZOOM = 1
const PREVIEW_ZOOM_STEP = 0.05

;(globalThis as typeof globalThis & {
  pdfjsWorker?: { WorkerMessageHandler: unknown }
}).pdfjsWorker = { WorkerMessageHandler }

class InlineBinaryDataFactory {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    if (kind !== "cMapUrl") {
      throw new Error("Unsupported binary data")
    }
    const name = filename.replace(/\.bcmap$/i, "")
    const b64 = CMAP_DATA[name]
    if (!b64) throw new Error("cMap not found")
    const raw = atob(b64)
    const cMapData = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i += 1) {
      cMapData[i] = raw.charCodeAt(i)
    }
    return cMapData
  }
}

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

  useEffect(() => {
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

  const toggleThemeMode = () => {
    setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))
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

function HomeView({
  setView,
  themeMode,
  onToggleTheme,
}: {
  setView: (view: View) => void
  themeMode: ThemeMode
  onToggleTheme: () => void
}) {
  const [visitCount, setVisitCount] = useState<number | null>(null)

  useEffect(() => {
    if (!shouldTrackVisit()) return

    const cachedCount = readVisitCountCache()
    if (cachedCount !== null) {
      setVisitCount(cachedCount)
      return
    }

    let cancelled = false
    fetch("/api/visits", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (cancelled || !isVisitResponse(data)) return
        writeVisitCountCache(data.total)
        setVisitCount(data.total)
      })
      .catch(() => {
        // 访问量是附加信息，统计失败时不打断工具使用。
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-10">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-primary" />
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                报销工具箱
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              把报销材料整理成能直接打印、粘贴、填写的格式。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {visitCount === null ? null : <VisitCounter total={visitCount} />}
            <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
            <Popover>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                <Coffee data-icon="inline-start" />
                请喝咖啡
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-4 text-center">
                <img
                  src={rewardQr}
                  alt="微信赞赏收款码"
                  className="mx-auto mb-3 h-auto w-40 rounded-lg border border-border"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  如果这个工具帮到了你
                  <br />
                  可以请开发者喝杯咖啡
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <section className="grid items-stretch gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardDescription>你现在要处理什么？</CardDescription>
          </CardHeader>
          <CardContent className="grid p-0">
            <HomeAction
              icon={FileText}
              title="发票排版"
              desc="把发票排成 A4 上下两张；酒店专票、火车票可勾选加印一份，自动排到最后。"
              onClick={() => setView("invoice")}
            />
            <Separator />
            <HomeAction
              icon={Grid2X2}
              title="付款截图排版"
              desc="把支付宝、微信付款截图按 2 行 × 3 列排版，中间保留对折线。"
              onClick={() => setView("screenshot")}
            />
            <Separator />
            <HomeAction
              icon={Banknote}
              title="人民币大写"
              desc="输入数字金额，一键复制可直接填在费用报销单上的大写格式。"
              onClick={() => setView("money")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>粘贴顺序</CardTitle>
            <CardDescription>打印后按这个顺序整理。</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3 text-sm">
              {[
                "费用报销单",
                "发票",
                "付款截图",
                "打车行程单",
                "钉钉差旅报销单",
                "钉钉出差申请单",
                "加印发票（酒店专票、火车/高铁票）",
              ].map((item, index) => (
                <li className="flex gap-3" key={item}>
                  <Badge
                    variant={index === 6 ? "default" : "outline"}
                    className="h-6 min-w-6 justify-center rounded-full"
                  >
                    {index + 1}
                  </Badge>
                  <span className={cn(index === 6 && "font-medium text-primary")}>
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <UtilityAction
          icon={CalendarDays}
          title="2026 放假安排"
          desc="节假日、调休、倒计时"
          onClick={() => setView("holiday")}
        />
        <UtilityAction
          icon={Globe2}
          title="IP 地址查询"
          desc="公网 IP、归属地、一键复制"
          onClick={() => setView("ip")}
        />
      </section>
    </main>
  )
}

function VisitCounter({ total }: { total: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">
      <Eye className="size-3.5" />
      累计 {formatVisitCount(total)} 次访问
    </span>
  )
}

function ThemeToggle({
  mode,
  onToggle,
  compact = false,
}: {
  mode: ThemeMode
  onToggle: () => void
  compact?: boolean
}) {
  const isDark = mode === "dark"
  const label = isDark ? "浅色模式" : "深色模式"
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      <Icon data-icon={compact ? undefined : "inline-start"} />
      {compact ? null : label}
    </Button>
  )
}

function HomeAction({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: LucideIcon
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid grid-cols-[44px_1fr_auto] items-center gap-4 px-6 py-6 text-left transition hover:bg-muted/60"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold">{title}</span>
        <span className="text-xs leading-6 text-muted-foreground">{desc}</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-sm text-muted-foreground">
        打开
        <ArrowRight data-icon="inline-end" />
      </span>
    </button>
  )
}

function UtilityAction({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: LucideIcon
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-muted/60"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs leading-5 text-muted-foreground">
          {desc}
        </span>
      </span>
      <ArrowRight className="text-muted-foreground" />
    </button>
  )
}

function ToolShell({
  title,
  badge,
  onHome,
  themeMode,
  onToggleTheme,
  children,
}: {
  title: string
  badge: string
  onHome: () => void
  themeMode: ThemeMode
  onToggleTheme: () => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
        <Button
          className="!h-[22px] !gap-1 !rounded-md !px-1.5 !text-[11px] !font-normal !leading-none [&_svg]:!size-3"
          variant="outline"
          size="xs"
          onClick={onHome}
        >
          <Home data-icon="inline-start" />
          首页
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <strong>{title}</strong>
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <ThemeToggle mode={themeMode} onToggle={onToggleTheme} compact />
      </header>
      {children}
    </div>
  )
}

function InvoiceTool(props: {
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

function ScreenshotTool(props: {
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

function MoneyTool({
  value,
  setValue,
  result,
  error,
  onCopy,
}: {
  value: string
  setValue: (value: string) => void
  result: string
  error: string
  onCopy: () => void
}) {
  const examples = ["0", "1000", "1001.05", "123456.78"]
  return (
    <SimpleToolLayout
      title="金额转大写"
      desc="输入阿拉伯数字金额，复制费用报销单可直接填写的大写格式。"
      aside={
        <Card>
          <CardHeader>
            <CardTitle>输入金额</CardTitle>
            <CardDescription>最多保留两位小数</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Input
              value={value}
              inputMode="decimal"
              placeholder="例如 123456.78"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onCopy()
              }}
            />
            <div className="flex flex-wrap gap-2">
              {examples.map((item) => (
                <Button
                  key={item}
                  variant="outline"
                  size="xs"
                  onClick={() => setValue(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button disabled={!result} onClick={onCopy}>
                <Copy data-icon="inline-start" />
                复制大写金额
              </Button>
              <Button variant="outline" onClick={() => setValue("")}>
                <RotateCcw data-icon="inline-start" />
                清空金额
              </Button>
            </div>
          </CardContent>
        </Card>
      }
    >
      <Card className="min-h-64">
        <CardHeader>
          <CardTitle>人民币大写</CardTitle>
          <CardDescription>结果会实时更新</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="rounded-xl border border-border bg-background p-6 text-2xl font-semibold leading-relaxed">
              {result}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
              输入金额后显示大写
            </div>
          )}
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    </SimpleToolLayout>
  )
}

function HolidayTool() {
  const today = dateOnly(new Date())
  const next = HOLIDAYS_2026.find((holiday) => parseLocalDate(holiday.end) >= today)
  const todayText = `今天是 ${formatDateCN(today)}`
  let summary = "2026 年法定节假日已全部结束"
  if (next) {
    const start = parseLocalDate(next.start)
    const end = parseLocalDate(next.end)
    summary =
      today >= start && today <= end
        ? `今天是 ${next.name} 假期`
        : `距离 ${next.name} 还有 ${daysBetween(today, start)} 天`
  }

  return (
    <SimpleToolLayout
      title="2026 年放假安排"
      desc="查看全年法定节假日、调休上班日和放假天数。"
      aside={
        <Card>
          <CardHeader>
            <CardTitle>节日提醒</CardTitle>
            <CardDescription>{todayText}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-background p-4 text-lg font-semibold">
              {summary}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              倒计时按本机日期计算。
              <span className="text-muted-foreground">灰色表示已过去</span>，
              <span className="text-primary">红色表示当前假期</span>，
              <span className="text-[var(--local-green)]">绿色表示尚未到来</span>。
            </p>
          </CardContent>
        </Card>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>全年安排</CardTitle>
          <CardDescription>数据来源：国务院办公厅</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
                <th className="px-3 py-3 font-medium">节日</th>
                <th className="px-3 py-3 font-medium">放假时间</th>
                <th className="px-3 py-3 font-medium">调休上班日期</th>
                <th className="px-3 py-3 text-center font-medium">天数</th>
              </tr>
            </thead>
            <tbody>
              {HOLIDAYS_2026.map((holiday) => {
                const status = holidayStatus(holiday, today)
                return (
                  <tr
                    key={holiday.name}
                    className={cn(
                      "border-b border-border last:border-0",
                      status === "past" && "text-muted-foreground opacity-70",
                      status === "current" && "bg-accent/60 text-primary",
                      status === "upcoming" && "bg-card text-[var(--local-green)]"
                    )}
                  >
                    <td className="px-3 py-3">
                      <Badge
                        variant={status === "current" ? "default" : "secondary"}
                        className={cn(
                          status === "past" && "text-muted-foreground",
                          status === "upcoming" &&
                            "bg-[color-mix(in_oklch,var(--local-green),transparent_88%)] text-[var(--local-green)]"
                        )}
                      >
                        {holiday.name}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{holiday.range}</td>
                    <td className="px-3 py-3">
                      {holiday.workdays.length ? holiday.workdays.join("、") : "无调休"}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">
                      {holiday.days} 天
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SimpleToolLayout>
  )
}

function IpTool({
  status,
  infos,
  onQuery,
  onCopy,
}: {
  status: IpStatus
  infos: IpInfo[]
  onQuery: () => void
  onCopy: () => void
}) {
  return (
    <SimpleToolLayout
      title="本机 IP 查询"
      desc="查询当前网络出口的公网 IP，并展示国家、省市、运营商和时区信息。"
      aside={
        <Card>
          <CardHeader>
            <CardTitle>当前网络</CardTitle>
            <CardDescription>点击后查询公网 IP 和归属地</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={status === "loading"} onClick={onQuery}>
              <Search data-icon="inline-start" />
              {status === "loading" ? "正在查询…" : "查询本机 IP"}
            </Button>
            <Button variant="outline" disabled={!infos.length} onClick={onCopy}>
              <Copy data-icon="inline-start" />
              复制 IP 信息
            </Button>
          </CardContent>
        </Card>
      }
    >
      <Card className="min-h-80">
        <CardHeader>
          <CardTitle>查询结果</CardTitle>
          <CardDescription>
            {status === "idle"
              ? "等待查询"
              : status === "loading"
                ? "正在查询 IPv4 和 IPv6…"
                : status === "error"
                  ? "查询未完成"
                  : `查询完成（${infos.map((info) => info.type).join("、")}）`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!infos.length ? (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
              {status === "loading"
                ? "正在查询网络信息…"
                : status === "error"
                  ? "无法获取 IP 信息，请检查网络后重试"
                  : "点击“查询本机 IP”查看当前网络信息"}
            </div>
          ) : (
            <div className="grid gap-4">
              {infos.map((info) => (
                <div key={`${info.type}-${info.ip}`} className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="break-all text-lg font-semibold">{info.ip || "—"}</div>
                    <Badge variant="secondary">{info.type || getIPType(info.ip)}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ["国家/地区", info.country || "—"],
                      ["省/州", info.region || "—"],
                      ["城市", info.city || "—"],
                      ["运营商", info.isp || "—"],
                      ["组织", info.org || "—"],
                      ["时区", info.timezone || "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-1 text-xs text-muted-foreground">{label}</div>
                        <div className="break-all text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    数据接口：{info.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SimpleToolLayout>
  )
}

function SimpleToolLayout({
  title,
  desc,
  aside,
  children,
}: {
  title: string
  desc: string
  aside: ReactNode
  children: ReactNode
}) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
      <aside className="grid content-start gap-4">{aside}</aside>
      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
        </div>
        {children}
      </section>
    </main>
  )
}

function ToolLayout({
  sidebar,
  preview,
  meta,
  zoom,
  setZoom,
}: {
  sidebar: React.ReactNode
  preview: React.ReactNode
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

function UploadZone({
  id,
  icon: Icon,
  title,
  desc,
  accept,
  onFiles,
}: {
  id: string
  icon: typeof FileText
  title: string
  desc: string
  accept: string
  onFiles: (files: FileList | File[]) => void
}) {
  const labelRef = useRef<HTMLLabelElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const handleFiles = () => {
      if (input.files?.length) onFiles(input.files)
      input.value = ""
    }
    input.addEventListener("input", handleFiles)
    input.addEventListener("change", handleFiles)
    return () => {
      input.removeEventListener("input", handleFiles)
      input.removeEventListener("change", handleFiles)
    }
  }, [onFiles])

  useEffect(() => {
    const label = labelRef.current
    if (!label) return
    const handleDragOver = (event: DragEvent) => event.preventDefault()
    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer?.files.length) onFiles(event.dataTransfer.files)
    }
    label.addEventListener("dragover", handleDragOver)
    label.addEventListener("drop", handleDrop)
    return () => {
      label.removeEventListener("dragover", handleDragOver)
      label.removeEventListener("drop", handleDrop)
    }
  }, [onFiles])

  return (
    <label
      ref={labelRef}
      htmlFor={id}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background p-6 text-center transition hover:bg-muted/60"
    >
      <Icon className="text-primary" />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs leading-5 text-muted-foreground">{desc}</span>
      <input
        ref={inputRef}
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        multiple
      />
    </label>
  )
}

function SettingNumber(props: {
  label: string
  desc: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        <div className="text-xs text-muted-foreground">{props.desc}</div>
      </div>
      <Input
        className="w-20"
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  )
}

function SettingSwitch(props: {
  label: string
  desc: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        <div className="text-xs text-muted-foreground">{props.desc}</div>
      </div>
      <Switch
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  )
}

function FileList({
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
  renderExtra?: (file: MaterialFile) => React.ReactNode
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

function InvoicePreview({
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

function ScreenshotPreview({
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

function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="grid min-h-[calc(100vh-160px)] flex-1 place-items-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function ProgressOverlay({ progress }: { progress: ProgressState }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
      <Card className="w-80">
        <CardHeader>
          <Progress value={progress.value}>
            <ProgressLabel>{progress.text}</ProgressLabel>
          </Progress>
        </CardHeader>
      </Card>
    </div>
  )
}

async function readImageFile(file: File): Promise<MaterialFile> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}

async function renderPdfFile(file: File): Promise<MaterialFile[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({
    data,
    BinaryDataFactory: InlineBinaryDataFactory,
    cMapUrl: "inline-cmaps/",
    cMapPacked: true,
    disableWorker: true,
  } as unknown as Parameters<typeof pdfjsLib.getDocument>[0]).promise
  const pages: MaterialFile[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unavailable")
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      renderInteractiveForms: true,
    } as unknown as Parameters<typeof page.render>[0]).promise
    pages.push({
      id: crypto.randomUUID(),
      name: pdf.numPages > 1 ? `${file.name} · 第 ${pageNumber} 页` : file.name,
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    })
  }
  return pages
}

async function renderInvoicePage(
  page: MaterialFile[],
  margin: number,
  exportGuide: boolean
) {
  const scale = 3
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(A4_PT.width * (96 / 72) * scale)
  canvas.height = Math.round(A4_PT.height * (96 / 72) * scale)
  const ctx = requireCanvasContext(canvas)
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const px = (96 / 72) * scale
  const mg = margin * 2.8346
  const half = A4_PT.height / 2
  const areaW = A4_PT.width - mg * 2
  const areaH = half - mg * 2

  for (let row = 0; row < 2; row += 1) {
    const file = page[row]
    if (!file) continue
    const img = await loadImage(file.dataUrl)
    const sc = Math.min(areaW / file.width, areaH / file.height)
    const w = file.width * sc
    const h = file.height * sc
    const x = (mg + (areaW - w) / 2) * px
    const y = (mg + row * half + (areaH - h) / 2) * px
    ctx.drawImage(img, x, y, w * px, h * px)
  }

  if (exportGuide) {
    const y = Math.round((A4_PT.height / 2) * px)
    ctx.save()
    ctx.setLineDash([6 * px, 4 * px])
    ctx.strokeStyle = "#bbbbbb"
    ctx.lineWidth = 0.8 * px
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.font = `${9 * px}px sans-serif`
    ctx.fillStyle = "#bbbbbb"
    ctx.textAlign = "right"
    ctx.fillText("沿虚线撕开", canvas.width - 8 * px, y - 4 * px)
    ctx.restore()
  }

  return canvas.toDataURL("image/jpeg", 0.92)
}

async function renderScreenshotPage(
  page: MaterialFile[],
  margin: number,
  gap: number
) {
  const scale = 3
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(A4_PT.width * (96 / 72) * scale)
  canvas.height = Math.round(A4_PT.height * (96 / 72) * scale)
  const ctx = requireCanvasContext(canvas)
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const px = (96 / 72) * scale
  const mg = margin * 2.8346
  const gp = gap * 2.8346
  const areaW = A4_PT.width - mg * 2
  const areaH = A4_PT.height - mg * 2
  const cellW = Math.floor((areaW - gp * 2) / 3)
  const cellH = Math.floor((areaH - gp) / 2)

  for (let index = 0; index < page.length; index += 1) {
    const file = page[index]
    const img = await loadImage(file.dataUrl)
    const row = Math.floor(index / 3)
    const col = index % 3
    const x = (mg + col * (cellW + gp)) * px
    const y = (mg + row * (cellH + gp)) * px
    const sc = Math.min((cellW * px) / file.width, (cellH * px) / file.height)
    const w = file.width * sc
    const h = file.height * sc
    ctx.drawImage(img, x + (cellW * px - w) / 2, y + (cellH * px - h) / 2, w, h)
  }

  return canvas.toDataURL("image/jpeg", 0.92)
}

async function buildPdfFromJpegs(jpegUrls: string[]) {
  const pdf = await PDFDocument.create()
  for (const url of jpegUrls) {
    const image = await pdf.embedJpg(dataUrlToBytes(url))
    const page = pdf.addPage([A4_PT.width, A4_PT.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: A4_PT.width,
      height: A4_PT.height,
    })
  }
  return pdf.save()
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function dataUrlToBytes(dataUrl: string) {
  const b64 = dataUrl.split(",")[1]
  const raw = atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function downloadBytes(bytes: Uint8Array, name: string) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const blob = new Blob([buffer], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function requireCanvasContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  return ctx
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size))
  }
  return pages
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}

function shouldTrackVisit() {
  if (typeof window === "undefined") return false
  const { hostname, protocol } = window.location
  return protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1"
}

function isVisitResponse(value: unknown): value is { total: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "total" in value &&
    typeof value.total === "number" &&
    Number.isFinite(value.total)
  )
}

function formatVisitCount(total: number) {
  return new Intl.NumberFormat("zh-CN").format(total)
}

function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light"
  try {
    return window.localStorage.getItem("reimbursement.theme") === "dark"
      ? "dark"
      : "light"
  } catch {
    return "light"
  }
}

function writeThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem("reimbursement.theme", mode)
  } catch {
    // 外观偏好保存失败时，只影响下次打开的默认主题。
  }
}

function readVisitCountCache() {
  try {
    const raw = window.sessionStorage.getItem("reimbursement.visitCount")
    if (!raw) return null
    const total = Number.parseInt(raw, 10)
    return Number.isFinite(total) ? total : null
  } catch {
    return null
  }
}

function writeVisitCountCache(total: number) {
  try {
    window.sessionStorage.setItem("reimbursement.visitCount", String(total))
  } catch {
    // sessionStorage 不可用时只影响重复计数保护，不影响主要功能。
  }
}

const HOLIDAYS_2026 = [
  { name: "元旦", start: "2026-01-01", end: "2026-01-03", range: "01月01日~01月03日", workdays: ["01月04日（周日）上班"], days: 3 },
  { name: "春节", start: "2026-02-15", end: "2026-02-23", range: "02月15日~02月23日", workdays: ["02月14日（周六）上班", "02月28日（周六）上班"], days: 9 },
  { name: "清明节", start: "2026-04-04", end: "2026-04-06", range: "04月04日~04月06日", workdays: [], days: 3 },
  { name: "劳动节", start: "2026-05-01", end: "2026-05-05", range: "05月01日~05月05日", workdays: ["05月09日（周六）上班"], days: 5 },
  { name: "端午节", start: "2026-06-19", end: "2026-06-21", range: "06月19日~06月21日", workdays: [], days: 3 },
  { name: "中秋节", start: "2026-09-25", end: "2026-09-27", range: "09月25日~09月27日", workdays: [], days: 3 },
  { name: "国庆节", start: "2026-10-01", end: "2026-10-07", range: "10月01日~10月07日", workdays: ["09月20日（周日）上班", "10月10日（周六）上班"], days: 7 },
]

function parseMoneyCents(raw: string) {
  const value = String(raw).trim().replace(/[￥¥,\s]/g, "")
  if (!value) return null
  if (!/^(0|[1-9]\d*)(\.\d{0,2})?$/.test(value)) {
    throw new Error("请输入大于或等于 0 的金额，最多保留两位小数")
  }
  const [yuan, fraction = ""] = value.split(".")
  const cents = BigInt(yuan) * 100n + BigInt((fraction + "00").slice(0, 2))
  if (cents > 99999999999999n) {
    throw new Error("金额不能超过 999999999999.99")
  }
  return cents
}

function groupToRMBUpper(value: number) {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"]
  const units = ["", "拾", "佰", "仟"]
  let output = ""
  let hasZero = false
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position
    const digit = Math.floor(value / divisor) % 10
    if (!digit) {
      if (output) hasZero = true
      continue
    }
    if (hasZero) output += "零"
    output += digits[digit] + units[position]
    hasZero = false
  }
  return output
}

function integerToRMBUpper(integerText: string) {
  const groupUnits = ["", "万", "亿", "兆"]
  const groups: number[] = []
  for (let end = integerText.length; end > 0; end -= 4) {
    groups.push(Number(integerText.slice(Math.max(0, end - 4), end)))
  }
  let output = ""
  let needZero = false
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (!group) {
      if (output) needZero = true
      continue
    }
    if (output && (needZero || group < 1000)) output += "零"
    output += groupToRMBUpper(group) + groupUnits[index]
    needZero = false
  }
  return output || "零"
}

function amountToRMBUpper(raw: string) {
  const cents = parseMoneyCents(raw)
  if (cents === null) return ""
  if (cents === 0n) return "零元整"
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"]
  const yuan = cents / 100n
  const jiao = Number((cents % 100n) / 10n)
  const fen = Number(cents % 10n)
  let output = integerToRMBUpper(yuan.toString()) + "元"
  if (!jiao && !fen) return output + "整"
  if (jiao) output += digits[jiao] + "角"
  else if (yuan > 0n && fen) output += "零"
  if (fen) output += digits[fen] + "分"
  return output
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function daysBetween(a: Date, b: Date) {
  return Math.round((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000)
}

function formatDateCN(date: Date) {
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${week}`
}

function holidayStatus(
  item: (typeof HOLIDAYS_2026)[number],
  todayDate: Date
) {
  const start = parseLocalDate(item.start)
  const end = parseLocalDate(item.end)
  if (todayDate > end) return "past"
  if (todayDate >= start && todayDate <= end) return "current"
  return "upcoming"
}

async function queryIPTarget(target: { type: string; url: string }) {
  try {
    const response = await fetch(target.url, { cache: "no-store" })
    if (!response.ok) throw new Error("IP 查询失败")
    const data = await response.json()
    if (!data.ip) throw new Error("IP 查询失败")
    return await lookupIPGeo(data.ip, target.type)
  } catch {
    return null
  }
}

async function lookupIPGeo(ip: string, type: string): Promise<IpInfo> {
  const providers = [
    {
      url: `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`,
      parse: (data: any): IpInfo => {
        if (!data.success) throw new Error("IP 归属地查询失败")
        return {
          ip: data.ip,
          type,
          country: data.country || "",
          region: data.region || "",
          city: data.city || "",
          isp: data.connection?.isp || data.connection?.org || "",
          org: data.connection?.org || "",
          timezone: data.timezone?.id || "",
          source: "ipwho.is",
        }
      },
    },
    {
      url: `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      parse: (data: any): IpInfo => {
        if (data.error) throw new Error("IP 归属地查询失败")
        return {
          ip: data.ip || ip,
          type,
          country: data.country_name || "",
          region: data.region || "",
          city: data.city || "",
          isp: data.org || "",
          org: data.org || "",
          timezone: data.timezone || "",
          source: "ipapi.co",
        }
      },
    },
    {
      url: `https://ipinfo.io/${encodeURIComponent(ip)}/json`,
      parse: (data: any): IpInfo => ({
        ip: data.ip || ip,
        type,
        country: data.country || "",
        region: data.region || "",
        city: data.city || "",
        isp: data.org || "",
        org: data.org || "",
        timezone: data.timezone || "",
        source: "ipinfo.io",
      }),
    },
  ]

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { cache: "no-store" })
      if (!response.ok) throw new Error("IP 归属地查询失败")
      return provider.parse(await response.json())
    } catch {
      // Try the next provider.
    }
  }
  return {
    ip,
    type,
    country: "",
    region: "",
    city: "",
    isp: "",
    org: "",
    timezone: "",
    source: "仅 IP",
  }
}

function getIPType(ip: string) {
  if (!ip) return "未知"
  if (ip.includes(":")) return "IPv6"
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return "IPv4"
  return "未知"
}

function formatIpInfo(infos: IpInfo[]) {
  return infos
    .map((info) =>
      [
        `IP：${info.ip || ""}`,
        `IP 类型：${info.type || getIPType(info.ip)}`,
        `国家/地区：${info.country || "—"}`,
        `省/州：${info.region || "—"}`,
        `城市：${info.city || "—"}`,
        `运营商：${info.isp || "—"}`,
        `组织：${info.org || "—"}`,
        `时区：${info.timezone || "—"}`,
        `数据接口：${info.source}`,
      ].join("\n")
    )
    .join("\n\n")
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
  }
}

export default App
