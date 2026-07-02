import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Banknote, CalendarDays, Coffee, FileText, Globe2, Grid2X2 } from "lucide-react"
import rewardQr from "@/assets/wechat-reward.png"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { VisitCounter } from "@/components/shared/VisitCounter"
import type { ThemeMode, ThemeToggleOrigin, View } from "@/app/types"
import { isVisitResponse, readVisitCountCache, shouldTrackVisit, writeVisitCountCache } from "@/lib/visits"
import { cn } from "@/lib/utils"
export function HomeView({
  setView,
  themeMode,
  onToggleTheme,
}: {
  setView: (view: View) => void
  themeMode: ThemeMode
  onToggleTheme: (origin: ThemeToggleOrigin) => void
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
