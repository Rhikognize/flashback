import { useEffect, useMemo, useState } from 'react'
import AuthModal from './AuthModal'
import { getSession, logout } from './auth'
import { useCatalog } from './useCatalog'
import { getReviews } from './reviews'
import './App.css'
import { auth, db } from "./firebase/firebase";

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

function Stars({ value }) {
  if (value == null) return <span className="stars">— no ratings yet</span>
  const rounded = Math.round(value)
  return (
    <span className="stars">
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)} ({value.toFixed(1)})
    </span>
  )
}

function Card({ item, onPlay }) {
  return (
    <article className="card" onClick={() => onPlay(item)} style={{ cursor: 'pointer' }}>
      <div className="thumb">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={item.title} loading="lazy" />
        ) : (
          <span aria-hidden="true">🎮</span>
        )}
      </div>
      <div className="card-body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <span className="tag">{item.category}</span>
        <Stars value={item.rating} />
      </div>
    </article>
  )
}

function GameModal({ game, onClose }) {
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingReviews(true)
    getReviews(game.id)
      .then((r) => !cancelled && setReviews(r))
      .catch((err) => console.error('Reviews load error:', err))
      .finally(() => !cancelled && setLoadingReviews(false))
    return () => { cancelled = true }
  }, [game.id])

}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [user, setUser] = useState(getSession)
  const [authMode, setAuthMode] = useState(null)
  const [activeGame, setActiveGame] = useState(null)

  const { games: loadedGames, categories, loading, error } = useCatalog()
  const [games, setGames] = useState([])

  useEffect(() => {
    setGames(loadedGames)
  }, [loadedGames])

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games.filter(
      (g) =>
        (category === 'all' || g.categoryId === category) &&
        (!q ||
          g.title?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)),
    )
  }, [games, query, category])

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
              <button
                type="button"
                role="tab"
                aria-selected={category === 'all'}
                className={`chip ${category === 'all' ? 'active' : ''}`}
                onClick={() => setCategory('all')}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  className={`chip ${category === c.id ? 'active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid">
            {loading ? (
              <p className="empty">Loading...</p>
            ) : error ? (
              <p className="empty">Error loading games.</p>
            ) : filtered.length ? (
              filtered.map((g) => <Card key={g.id} item={g} onPlay={setActiveGame} />)
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

      {activeGame && <GameModal game={activeGame} onClose={() => setActiveGame(null)} />}

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