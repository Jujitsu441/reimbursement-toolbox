export function parseMoneyCents(raw: string) {
  const value = String(raw).trim().replace(/[￥¥,\s]/g, "")
  if (!value) return null
  if (!/^(0|[1-9]\d*)(\.\d{0,2})?$/.test(value)) {
    throw new Error("请输入大于或等于 0 的金额，最多保留两位小数")
  }
  const [yuan, fraction = ""] = value.split(".")
  const cents = BigInt(yuan) * 100n + BigInt((fraction + "00").slice(0, 2))
  if (cents > 99999999999999n) {
    throw new Error("金额不能超过 999999999999.99")
  }
  return cents
}

export function groupToRMBUpper(value: number) {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"]
  const units = ["", "拾", "佰", "仟"]
  let output = ""
  let hasZero = false
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position
    const digit = Math.floor(value / divisor) % 10
    if (!digit) {
      if (output) hasZero = true
      continue
    }
    if (hasZero) output += "零"
    output += digits[digit] + units[position]
    hasZero = false
  }
  return output
}

export function integerToRMBUpper(integerText: string) {
  const groupUnits = ["", "万", "亿", "兆"]
  const groups: number[] = []
  for (let end = integerText.length; end > 0; end -= 4) {
    groups.push(Number(integerText.slice(Math.max(0, end - 4), end)))
  }
  let output = ""
  let needZero = false
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (!group) {
      if (output) needZero = true
      continue
    }
    if (output && (needZero || group < 1000)) output += "零"
    output += groupToRMBUpper(group) + groupUnits[index]
    needZero = false
  }
  return output || "零"
}

export function amountToRMBUpper(raw: string) {
  const cents = parseMoneyCents(raw)
  if (cents === null) return ""
  if (cents === 0n) return "零元整"
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"]
  const yuan = cents / 100n
  const jiao = Number((cents % 100n) / 10n)
  const fen = Number(cents % 10n)
  let output = integerToRMBUpper(yuan.toString()) + "元"
  if (!jiao && !fen) return output + "整"
  if (jiao) output += digits[jiao] + "角"
  else if (yuan > 0n && fen) output += "零"
  if (fen) output += digits[fen] + "分"
  return output
}
