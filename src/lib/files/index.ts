import type { MaterialFile } from "@/app/types"
export async function readImageFile(file: File): Promise<MaterialFile> {
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

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

export function dataUrlToBytes(dataUrl: string) {
  const b64 = dataUrl.split(",")[1]
  const raw = atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function downloadBytes(bytes: Uint8Array, name: string) {
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

export function requireCanvasContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  return ctx
}

export async function copyText(text: string) {
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
