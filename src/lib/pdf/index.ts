import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs"
import { PDFDocument } from "pdf-lib"
import type { MaterialFile } from "@/app/types"
import { A4_PT } from "@/app/constants"
import { CMAP_DATA } from "@/lib/cmap-data"
import { dataUrlToBytes, loadImage, requireCanvasContext } from "@/lib/files"
;(globalThis as typeof globalThis & { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker = { WorkerMessageHandler }
export class InlineBinaryDataFactory {
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

export async function renderPdfFile(file: File): Promise<MaterialFile[]> {
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

export async function renderInvoicePage(
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

export async function renderScreenshotPage(
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

export async function buildPdfFromJpegs(jpegUrls: string[]) {
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
