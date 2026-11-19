const BASE = (import.meta.env.VITE_R2_WORKER_URL || '').replace(/\/$/, '')

export const r2Url = (key) => `${BASE}/files/${key.replace(/^\/+/, '')}`

export async function r2List(prefix) {
  const res = await fetch(`${BASE}/list/${encodeURIComponent(prefix).replace(/%2F/g, '/')}`)
  if (!res.ok) return []
  return res.json()
}