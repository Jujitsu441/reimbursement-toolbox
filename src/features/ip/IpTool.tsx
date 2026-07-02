import { Copy, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleToolLayout } from "@/components/layout/SimpleToolLayout"
import type { IpInfo, IpStatus } from "@/app/types"
import { getIPType } from "@/lib/ip"
export function IpTool({
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
