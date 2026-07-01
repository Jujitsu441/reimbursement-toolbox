const COUNTER_KEY = "site:visits"

export async function onRequestPost({ env }) {
  if (!env.VISIT_COUNTER) {
    return json({ total: null })
  }

  const currentText = await env.VISIT_COUNTER.get(COUNTER_KEY)
  const current = Number.parseInt(currentText || "0", 10)
  const total = Number.isFinite(current) ? current + 1 : 1

  await env.VISIT_COUNTER.put(COUNTER_KEY, String(total))

  return json({ total })
}

function json(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  })
}
