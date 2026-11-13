import { useEffect, useMemo, useState } from 'react'
import AuthModal from './AuthModal'
import { getSession, logout } from './auth'
import './App.css'
import { auth, db } from "./firebase/firebase";

const CATEGORIES = ['All', 'Action', 'Adventure', 'Puzzle', 'Sports', 'Strategy', 'Arcade']
const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

// Sample cards, only for the look of the page. You can replace them when you add real content.
const PLACEHOLDERS = [
  { id: 1, title: 'Game title', category: 'Action', emoji: '🚀', description: 'Short description of the game.' },
  { id: 2, title: 'Game title', category: 'Adventure', emoji: '🗡️', description: 'Short description of the game.' },
  { id: 3, title: 'Game title', category: 'Puzzle', emoji: '🧩', description: 'Short description of the game.' },
  { id: 4, title: 'Game title', category: 'Sports', emoji: '⚽', description: 'Short description of the game.' },
  { id: 5, title: 'Game title', category: 'Strategy', emoji: '🏰', description: 'Short description of the game.' },
  { id: 6, title: 'Game title', category: 'Arcade', emoji: '🐍', description: 'Short description of the game.' },
  { id: 7, title: 'Game title', category: 'Action', emoji: '🥷', description: 'Short description of the game.' },
  { id: 8, title: 'Game title', category: 'Adventure', emoji: '🏝️', description: 'Short description of the game.' },
]

function Card({ item }) {
  return (
    <article className="card">
      <div className="thumb">
        <span aria-hidden="true">{item.emoji}</span>
      </div>
      <div className="card-body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <span className="tag">{item.category}</span>
      </div>
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [user, setUser] = useState(getSession)
  const [authMode, setAuthMode] = useState(null) // null | 'login' | 'register'

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PLACEHOLDERS.filter(
      (g) =>
        (category === 'All' || g.category === category) &&
        (!q || g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)),
    )
  }, [query, category])

  const [workerStatus, setWorkerStatus] = useState('Checking...')

  useEffect(() => {
    async function checkWorker() {
      try {
        const response = await fetch(WORKER_URL)

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`)
        }

        const result = await response.text()
        setWorkerStatus(result)
      } catch (error) {
        console.error('Worker connection error:', error)
        setWorkerStatus('Connection failed')
      }
    }

    checkWorker()
  }, [])

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <span className="logo-mark" aria-hidden="true">🕹️</span>
            Flashback
          </a>
          <input
            className="search"
            type="search"
            placeholder="Search for a game..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for a game"
          />
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-chip">👤 {user.username}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAuthMode('login')}>
                  Log in
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setAuthMode('register')}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero container">
          <h1>
            Flash games <span>aren&apos;t dead.</span>
          </h1>
          <p>
            {user
              ? `Welcome back, ${user.username}! Press START.`
              : 'Play your favorite classics right in your browser. Press START.'}
          </p>
          <div className="hero-actions">
            <a className="btn" href="#jocuri">
              ▶ Start
            </a>
          </div>
        </section>

        <section className="container" id="jocuri">
          <div className="section-head">
            <h2>All games</h2>
            <div className="chips" role="tablist" aria-label="Categories">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={category === c}
                  className={`chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid">
            {filtered.length ? (
              filtered.map((g) => <Card key={g.id} item={g} />)
            ) : (
              <p className="empty">Nothing found. Try another search or category.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">

        <div className="container">Flashback</div>
        <div>
          <p>Temporary</p>
          <p>Firebase initialized successfully!</p>
          <p>Authentication: {auth ? "Connected" : "Error"}</p>
          <p>Firestore: {db ? "Connected" : "Error"}</p>
          <p>Cloudflare Worker: {workerStatus}</p>
        </div>

      </footer>

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(u) => {
            setUser(u)
            setAuthMode(null)
          }}
        />
      )}
    </>
  )
}

export default App