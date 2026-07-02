import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleToolLayout } from "@/components/layout/SimpleToolLayout"
import { dateOnly, daysBetween, formatDateCN, parseLocalDate } from "@/lib/date"
import { HOLIDAYS_2026, holidayStatus } from "@/lib/holiday"
import { cn } from "@/lib/utils"
export function HolidayTool() {
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
