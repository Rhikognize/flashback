import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase/firebase'

const DEFAULT_ROLE = 'User'

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
  const data = snap.exists() ? snap.data() : {}
  return {
    id: fbUser.uid,
    email: fbUser.email,
    username: data.Name || fbUser.displayName || fbUser.email,
    role: data.Role || DEFAULT_ROLE,
  }
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null)
      return
    }
    try {
      callback(await loadProfile(fbUser))
    } catch (err) {
      console.error('Profile load error:', err)
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

  try {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(fbUser, { displayName: username })
    await setDoc(doc(db, 'users', fbUser.uid), {
      Name: username,
      Role: DEFAULT_ROLE,
    })
    return { id: fbUser.uid, email: fbUser.email, username, role: DEFAULT_ROLE }
  } catch (err) {
    throw friendlyError(err)
  }
}