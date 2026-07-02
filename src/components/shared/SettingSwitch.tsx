import { Switch } from "@/components/ui/switch"
export function SettingSwitch(props: {
  label: string
  desc: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        <div className="text-xs text-muted-foreground">{props.desc}</div>
      </div>
      <Switch
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  )
}
