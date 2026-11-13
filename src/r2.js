const BASE = (import.meta.env.VITE_R2_WORKER_URL || '').replace(/\/$/, '')

export const r2Url = (key) => {
  if (!key) return null
  if (/^https?:\/\//.test(key)) return key
  return `${BASE}/files/${key.replace(/^\/+/, '')}`
}