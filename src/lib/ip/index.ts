import type { IpInfo } from "@/app/types"
export async function queryIPTarget(target: { type: string; url: string }) {
  try {
    const response = await fetch(target.url, { cache: "no-store" })
    if (!response.ok) throw new Error("IP 查询失败")
    const data = await response.json()
    if (!data.ip) throw new Error("IP 查询失败")
    return await lookupIPGeo(data.ip, target.type)
  } catch {
    return null
  }
}

export async function lookupIPGeo(ip: string, type: string): Promise<IpInfo> {
  const providers = [
    {
      url: `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`,
      parse: (data: any): IpInfo => {
        if (!data.success) throw new Error("IP 归属地查询失败")
        return {
          ip: data.ip,
          type,
          country: data.country || "",
          region: data.region || "",
          city: data.city || "",
          isp: data.connection?.isp || data.connection?.org || "",
          org: data.connection?.org || "",
          timezone: data.timezone?.id || "",
          source: "ipwho.is",
        }
      },
    },
    {
      url: `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      parse: (data: any): IpInfo => {
        if (data.error) throw new Error("IP 归属地查询失败")
        return {
          ip: data.ip || ip,
          type,
          country: data.country_name || "",
          region: data.region || "",
          city: data.city || "",
          isp: data.org || "",
          org: data.org || "",
          timezone: data.timezone || "",
          source: "ipapi.co",
        }
      },
    },
    {
      url: `https://ipinfo.io/${encodeURIComponent(ip)}/json`,
      parse: (data: any): IpInfo => ({
        ip: data.ip || ip,
        type,
        country: data.country || "",
        region: data.region || "",
        city: data.city || "",
        isp: data.org || "",
        org: data.org || "",
        timezone: data.timezone || "",
        source: "ipinfo.io",
      }),
    },
  ]

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { cache: "no-store" })
      if (!response.ok) throw new Error("IP 归属地查询失败")
      return provider.parse(await response.json())
    } catch {
      // Try the next provider.
    }
  }
  return {
    ip,
    type,
    country: "",
    region: "",
    city: "",
    isp: "",
    org: "",
    timezone: "",
    source: "仅 IP",
  }
}

export function getIPType(ip: string) {
  if (!ip) return "未知"
  if (ip.includes(":")) return "IPv6"
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return "IPv4"
  return "未知"
}

export function formatIpInfo(infos: IpInfo[]) {
  return infos
    .map((info) =>
      [
        `IP：${info.ip || ""}`,
        `IP 类型：${info.type || getIPType(info.ip)}`,
        `国家/地区：${info.country || "—"}`,
        `省/州：${info.region || "—"}`,
        `城市：${info.city || "—"}`,
        `运营商：${info.isp || "—"}`,
        `组织：${info.org || "—"}`,
        `时区：${info.timezone || "—"}`,
        `数据接口：${info.source}`,
      ].join("\n")
    )
    .join("\n\n")
}
