import { Card, CardHeader } from "@/components/ui/card"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import type { ProgressState } from "@/app/types"
export function ProgressOverlay({ progress }: { progress: ProgressState }) {
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
