import type { ReactNode } from "react"
export function SimpleToolLayout({
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
