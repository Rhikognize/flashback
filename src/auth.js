// Autentificare doar în frontend, salvată în localStorage.
// ATENȚIE: nu este securitate reală. Oricine poate vedea datele din browser.
// Pentru un site real, autentificarea trebuie făcută pe un server.

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
    throw new Error('Nu se poate salva în browser (localStorage este blocat).')
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

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email })

export function getSession() {
  const session = readJSON(SESSION_KEY, null)
  if (!session) return null
  const user = readJSON(USERS_KEY, []).find((u) => u.id === session.id)
  return user ? publicUser(user) : null
}

export async function register({ username, email, password }) {
  username = username.trim()
  email = email.trim().toLowerCase()

  if (username.length < 3) throw new Error('Numele de utilizator trebuie să aibă minim 3 caractere.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email invalid.')
  if (password.length < 6) throw new Error('Parola trebuie să aibă minim 6 caractere.')

  const users = readJSON(USERS_KEY, [])
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Numele de utilizator este deja folosit.')
  }
  if (users.some((u) => u.email === email)) throw new Error('Există deja un cont cu acest email.')

  const salt = makeSalt()
  const user = {
    id: crypto.randomUUID(),
    username,
    email,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  }
  writeJSON(USERS_KEY, [...users, user])
  writeJSON(SESSION_KEY, { id: user.id })
  return publicUser(user)
}

export async function login({ identifier, password }) {
  const id = identifier.trim().toLowerCase()
  const user = readJSON(USERS_KEY, []).find((u) => u.email === id || u.username.toLowerCase() === id)
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new Error('Utilizator sau parolă greșită.')
  }
  writeJSON(SESSION_KEY, { id: user.id })
  return publicUser(user)
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignorat */
  }
}
