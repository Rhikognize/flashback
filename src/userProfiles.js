import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore'
import { db } from './firebase/firebase'
import { r2List, r2Url } from './r2'
import { updateProfile } from 'firebase/auth'
import { auth } from './firebase/firebase'

const cache = new Map()

export async function getUserProfile(uid) {
  if (cache.has(uid)) return cache.get(uid)

  const promise = (async () => {
    let name = 'Unknown user'
    let image = null
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) {
        name = snap.data().Name || name
        image = snap.data().Image || null
      }
    } catch (err) {
      console.error('User profile load error:', err)
    }

    let avatarUrl = image
    try {
      if (!avatarUrl) {
        const keys = await r2List(`users/${uid}/Icon/`)
        const key = keys.find((item) => item.endsWith('/avatar')) || keys[0]
        if (key) avatarUrl = r2Url(key)
      }
    } catch (err) {
      console.error('Avatar load error:', err)
    }

    return { name, avatarUrl }
  })()

  cache.set(uid, promise)
  return promise
}

export async function getAvatarUrl(uid, savedUrl = null) {
  if (savedUrl) return savedUrl
  try {
    const keys = await r2List(`users/${uid}/Icon/`)
    const key = keys.find((item) => item.endsWith('/avatar')) || keys[0]
    return key ? r2Url(key) : null
  } catch (err) {
    console.error('Avatar load error:', err)
    return null
  }
}

export async function updateMyProfile(uid, { name, imageUrl }) {
  await updateDoc(doc(db, 'users', uid), { Name: name, Image: imageUrl || '' })
  if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name, photoURL: imageUrl || null })
  cache.delete(uid)
}

export async function toggleFavorite(uid, gameId, favorite) {
  await updateDoc(doc(db, 'users', uid), { Favorites: favorite ? arrayUnion(gameId) : arrayRemove(gameId) })
}

function nextSessionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function recoverEntry(entry, now) {
  if (!entry?.ActiveSession) return entry
  const last = Number(entry.ActiveSession.LastHeartbeatAt) || Number(entry.ActiveSession.StartedAt) || now
  const tail = Math.max(0, Math.min(15_000, now - last))
  const rest = { ...entry }
  delete rest.ActiveSession
  return { ...rest, PlayTimeMs: (Number(entry.PlayTimeMs) || 0) + tail }
}

export async function recoverGameSessions(uid) {
  const ref = doc(db, 'users', uid)
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) return []
    const original = Array.isArray(snap.data().LaunchHistory) ? snap.data().LaunchHistory : []
    const now = Date.now()
    const history = original.map((entry) => recoverEntry(entry, now))
    if (history.some((entry, index) => entry !== original[index])) transaction.update(ref, { LaunchHistory: history })
    return history
  })
}

export async function beginGameSession(uid, gameId, sessionId = nextSessionId()) {
  const ref = doc(db, 'users', uid)
  const now = Date.now()
  const history = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) throw new Error('User profile was not found.')
    const entries = Array.isArray(snap.data().LaunchHistory) ? snap.data().LaunchHistory : []
    const next = entries.map((entry) => recoverEntry(entry, now))
    const previous = next.find((entry) => entry.GameId === gameId) || { GameId: gameId, PlayTimeMs: 0 }
    const updated = {
      ...previous,
      GameId: gameId,
      LaunchedAt: now,
      PlayTimeMs: Number(previous.PlayTimeMs) || 0,
      ActiveSession: { Id: sessionId, StartedAt: now, LastHeartbeatAt: now },
    }
    const result = [updated, ...next.filter((entry) => entry.GameId !== gameId)]
    transaction.update(ref, { LaunchHistory: result })
    return result
  })
  return { sessionId, history }
}

export async function checkpointGameSession(uid, gameId, sessionId, finish = false) {
  const ref = doc(db, 'users', uid)
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) return null
    const history = Array.isArray(snap.data().LaunchHistory) ? snap.data().LaunchHistory : []
    let changed = false
    const now = Date.now()
    const next = history.map((entry) => {
      if (entry.GameId !== gameId || entry.ActiveSession?.Id !== sessionId) return entry
      changed = true
      const last = Number(entry.ActiveSession.LastHeartbeatAt) || now
      const delta = Math.max(0, now - last)
      const { ActiveSession, ...rest } = entry
      return finish
        ? { ...rest, PlayTimeMs: (Number(entry.PlayTimeMs) || 0) + delta }
        : { ...entry, PlayTimeMs: (Number(entry.PlayTimeMs) || 0) + delta, ActiveSession: { ...ActiveSession, LastHeartbeatAt: now } }
    })
    if (changed) transaction.update(ref, { LaunchHistory: next })
    return changed ? next : null
  })
}