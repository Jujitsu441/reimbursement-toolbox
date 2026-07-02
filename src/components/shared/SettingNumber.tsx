import { Input } from "@/components/ui/input"
export function SettingNumber(props: {
  label: string
  desc: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        <div className="text-xs text-muted-foreground">{props.desc}</div>
      </div>
      <Input
        className="w-20"
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  )
}
