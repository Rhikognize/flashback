// Frontend-only authentication, stored in localStorage.
// WARNING: this is not real security. Anyone can read the data in the browser.
// A real site needs server-side authentication.

const USERS_KEY = 'flashback_users'
const SESSION_KEY = 'flashback_session'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error('Could not save in the browser (localStorage is blocked).')
  }
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function makeSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// The first account created is the admin. Old accounts without a "role" field are treated the same way.
const publicUser = (u, users) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  role: u.role || (users[0]?.id === u.id ? 'admin' : 'user'),
})

export function getSession() {
  const session = readJSON(SESSION_KEY, null)
  if (!session) return null
  const users = readJSON(USERS_KEY, [])
  const user = users.find((u) => u.id === session.id)
  return user ? publicUser(user, users) : null
}

export async function register({ username, email, password }) {
  username = username.trim()
  email = email.trim().toLowerCase()

  if (username.length < 3) throw new Error('Username must be at least 3 characters.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')

  const users = readJSON(USERS_KEY, [])
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('That username is already taken.')
  }
  if (users.some((u) => u.email === email)) throw new Error('An account with that email already exists.')

  const salt = makeSalt()
  const user = {
    id: crypto.randomUUID(),
    username,
    email,
    salt,
    passwordHash: await hashPassword(password, salt),
    role: users.length === 0 ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  }
  const all = [...users, user]
  writeJSON(USERS_KEY, all)
  writeJSON(SESSION_KEY, { id: user.id })
  return publicUser(user, all)
}

export async function login({ identifier, password }) {
  const id = identifier.trim().toLowerCase()
  const users = readJSON(USERS_KEY, [])
  const user = users.find((u) => u.email === id || u.username.toLowerCase() === id)
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new Error('Wrong username or password.')
  }
  writeJSON(SESSION_KEY, { id: user.id })
  return publicUser(user, users)
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignored */
  }
}
