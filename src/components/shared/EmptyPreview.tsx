export function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="grid min-h-[calc(100vh-160px)] flex-1 place-items-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
      {text}
    </div>
  )
}
