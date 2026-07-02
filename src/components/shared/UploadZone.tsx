import { useEffect, useRef } from "react"
import type { LucideIcon } from "lucide-react"
export function UploadZone({
  id,
  icon: Icon,
  title,
  desc,
  accept,
  onFiles,
}: {
  id: string
  icon: LucideIcon
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
