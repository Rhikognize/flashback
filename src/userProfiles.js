import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase/firebase'
import { r2List, r2Url } from './r2'

const cache = new Map()

export async function getUserProfile(uid) {
  if (cache.has(uid)) return cache.get(uid)

  const promise = (async () => {
    let name = 'Unknown user'
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) name = snap.data().Name || name
    } catch (err) {
      console.error('User profile load error:', err)
    }

    let avatarUrl = null
    try {
      const keys = await r2List(`users/${uid}/Icon/`)
      if (keys.length) avatarUrl = r2Url(keys[0])
    } catch (err) {
      console.error('Avatar load error:', err)
    }

    return { name, avatarUrl }
  })()

  cache.set(uid, promise)
  return promise
}