const BASE = (import.meta.env.VITE_R2_WORKER_URL || '').replace(/\/$/, '')
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY

export const r2Url = (key) => `${BASE}/files/${key.replace(/^\/+/, '')}`

export async function r2List(prefix) {
  const res = await fetch(`${BASE}/list/${encodeURIComponent(prefix).replace(/%2F/g, '/')}`)
  if (!res.ok) return []
  return res.json()
}

export async function r2Upload(key, file) {
  const res = await fetch(`${BASE}/files/${key.replace(/^\/+/, '')}`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Admin-Key': ADMIN_KEY,
    },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return res.json()
}

export async function r2DeletePrefix(prefix) {
  const res = await fetch(`${BASE}/prefix/${encodeURIComponent(prefix).replace(/%2F/g, '/')}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': ADMIN_KEY },
  })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
  return res.json()
}