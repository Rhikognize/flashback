import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from './firebase/firebase'

const KEY = 'flashback:viewed'

function readSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function registerView(gameId) {
  const seen = readSeen()
  if (seen.has(gameId)) return false
  seen.add(gameId)
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...seen]))
  } catch {}
  updateDoc(doc(db, 'games', gameId), { Views: increment(1) }).catch((err) =>
    console.error('View count error:', err),
  )
  return true
}

export function registerLaunch(gameId) {
  updateDoc(doc(db, 'games', gameId), { Launches: increment(1) }).catch((err) =>
    console.error('Launch count error:', err),
  )
}
