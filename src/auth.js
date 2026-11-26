import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase/firebase'
import { getAvatarUrl, recoverGameSessions } from './userProfiles'

const DEFAULT_ROLE = 'User'

let registering = false

function accountError(message) {
  const err = new Error(message)
  err.isAccountError = true
  return err
}

function friendlyError(err) {
  const map = {
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/invalid-email': 'Invalid email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  }
  return new Error(map[err.code] || err.message || 'Something went wrong.')
}

async function loadProfile(fbUser) {
  const snap = await getDoc(doc(db, 'users', fbUser.uid))
  if (!snap.exists()) throw accountError('This account has been deleted.')
  const data = snap.data()
  if (data.IsBlocked === true) throw accountError('Your account has been blocked.')
  const avatarUrl = await getAvatarUrl(fbUser.uid, data.Image || fbUser.photoURL || null)
  const launchHistory = await recoverGameSessions(fbUser.uid).catch((err) => {
    console.error('Previous game session recovery error:', err)
    return Array.isArray(data.LaunchHistory) ? data.LaunchHistory : []
  })
  return {
    id: fbUser.uid,
    email: fbUser.email,
    username: data.Name || fbUser.displayName || fbUser.email,
    avatarUrl,
    role: data.Role || DEFAULT_ROLE,
    favorites: Array.isArray(data.Favorites) ? data.Favorites : [],
    launchHistory,
  }
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null)
      return
    }
    if (registering) return
    try {
      callback(await loadProfile(fbUser))
    } catch (err) {
      console.error('Profile load error:', err)
      if (err.isAccountError) await signOut(auth).catch(() => {})
      callback(null)
    }
  })
}

export async function register({ username, email, password }) {
  username = username.trim()
  email = email.trim().toLowerCase()

  if (username.length < 3) throw new Error('Username must be at least 3 characters.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')

  registering = true
  let fbUser = null
  try {
    ;({ user: fbUser } = await createUserWithEmailAndPassword(auth, email, password))
    await updateProfile(fbUser, { displayName: username })
    await setDoc(doc(db, 'users', fbUser.uid), {
      Name: username,
      Role: DEFAULT_ROLE,
      IsBlocked: false,
    })
    return { id: fbUser.uid, email: fbUser.email, username, avatarUrl: null, favorites: [], launchHistory: [], role: DEFAULT_ROLE }
  } catch (err) {
    if (fbUser) await fbUser.delete().catch(() => {})
    throw friendlyError(err)
  } finally {
    registering = false
  }
}

export async function login({ email, password }) {
  try {
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
    try {
      return await loadProfile(fbUser)
    } catch (err) {
      if (err.isAccountError) await signOut(auth).catch(() => {})
      throw err
    }
  } catch (err) {
    throw friendlyError(err)
  }
}

export function logout() {
  return signOut(auth)
}