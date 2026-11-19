import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'

import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase/firebase'

const DEFAULT_ROLE = 'User'

function friendlyError(err) {
  const errors = {
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/invalid-email': 'Invalid email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  return new Error(
    errors[err.code] || err.message || 'Something went wrong.'
  )
}

export async function register({ username, email, password }) {
  username = username.trim()
  email = email.trim().toLowerCase()

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters.')
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Invalid email.')
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }

  try {
    const { user: fbUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    )

    await updateProfile(fbUser, {
      displayName: username,
    })

    await setDoc(doc(db, 'users', fbUser.uid), {
      Name: username,
      Role: DEFAULT_ROLE,
    })

    return {
      id: fbUser.uid,
      email: fbUser.email,
      username,
      role: DEFAULT_ROLE,
    }

  } catch (err) {
    console.error('Registration error:', err)
    throw friendlyError(err)
  }
}