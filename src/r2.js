const BASE = (import.meta.env.VITE_R2_WORKER_URL || '').replace(/\/$/, '')
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY

export const r2Url = (key) => `${BASE}/files/${key.replace(/^\/+/, '')}`

export async function r2List(prefix) {
  const res = await fetch(`${BASE}/list/${encodeURIComponent(prefix).replace(/%2F/g, '/')}`)
  if (!res.ok) return []
  return res.json()
}

export function r2Upload(key, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `${BASE}/files/${key.replace(/^\/+/, '')}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('X-Admin-Key', ADMIN_KEY)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          resolve(null)
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed (network error)'))

    xhr.send(file)
  })
}

export async function r2DeletePrefix(prefix) {
  const res = await fetch(`${BASE}/prefix/${encodeURIComponent(prefix).replace(/%2F/g, '/')}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': ADMIN_KEY },
  })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
  return res.json()
}