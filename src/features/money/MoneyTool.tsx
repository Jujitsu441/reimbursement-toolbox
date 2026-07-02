import { Copy, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SimpleToolLayout } from "@/components/layout/SimpleToolLayout"
export function MoneyTool({
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
