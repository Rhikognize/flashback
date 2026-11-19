import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import AuthModal from './AuthModal'
import { useCatalog } from './useCatalog'
import { getReviews } from './reviews'
import './App.css'
import { auth, db } from './firebase/firebase'

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL

function Stars({ value }) {
  if (value == null) {
    return <span className="stars">— no ratings yet</span>
  }

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
    <article
      className="card"
      onClick={() => onPlay(item)}
      style={{ cursor: 'pointer' }}
    >
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
      .then((result) => {
        if (!cancelled) {
          setReviews(result || [])
        }
      })
      .catch((err) => {
        console.error('Reviews load error:', err)
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingReviews(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [game.id])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{game.title}</h2>

          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="game-details">
          <p>{game.description}</p>
          <span className="tag">{game.category}</span>
          <Stars value={game.rating} />

          <h3>Reviews</h3>

          {loadingReviews ? (
            <p>Loading reviews...</p>
          ) : reviews.length > 0 ? (
            <p>{reviews.length} reviews</p>
          ) : (
            <p>No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [authMode, setAuthMode] = useState(null)
  const [activeGame, setActiveGame] = useState(null)

  const {
    games: loadedGames,
    categories,
    loading,
    error,
  } = useCatalog()

  const [games, setGames] = useState([])

  // Restore Firebase authentication after page reload
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setAuthLoading(false)
        return
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)

        const data = userSnap.exists() ? userSnap.data() : {}

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username:
            data.Name ||
            firebaseUser.displayName ||
            firebaseUser.email,
          role: data.Role || 'User',
        })
      } catch (err) {
        console.error('Error restoring user session:', err)

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.displayName || firebaseUser.email,
          role: 'User',
        })
      } finally {
        setAuthLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    setGames(loadedGames)
  }, [loadedGames])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return games.filter(
      (game) =>
        (category === 'all' || game.categoryId === category) &&
        (
          !q ||
          game.title?.toLowerCase().includes(q) ||
          game.description?.toLowerCase().includes(q)
        )
    )
  }, [games, query, category])

  const [workerStatus, setWorkerStatus] = useState('Checking...')

  useEffect(() => {
    let cancelled = false

    async function checkWorker() {
      try {
        const response = await fetch(WORKER_URL)

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`)
        }

        const result = await response.text()

        if (!cancelled) {
          setWorkerStatus(result)
        }
      } catch (err) {
        console.error('Worker connection error:', err)

        if (!cancelled) {
          setWorkerStatus('Connection failed')
        }
      }
    }

    checkWorker()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <span className="logo-mark" aria-hidden="true">
              🕹️
            </span>
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
            {authLoading ? (
              <span className="user-chip">Loading...</span>
            ) : user ? (
              <span className="user-chip">
                👤 {user.username}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAuthMode('login')}
                >
                  Log in
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setAuthMode('register')}
                >
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
              ? `Welcome, ${user.username}! Press START.`
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

            <div
              className="chips"
              role="tablist"
              aria-label="Categories"
            >
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
            ) : filtered.length > 0 ? (
              filtered.map((game) => (
                <Card
                  key={game.id}
                  item={game}
                  onPlay={setActiveGame}
                />
              ))
            ) : (
              <p className="empty">
                Nothing found. Try another search or category.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          Flashback
        </div>

        <div>
          <p>Temporary</p>
          <p>Firebase initialized successfully!</p>
          <p>Authentication: {auth ? 'Connected' : 'Error'}</p>
          <p>Firestore: {db ? 'Connected' : 'Error'}</p>
          <p>Cloudflare Worker: {workerStatus}</p>
        </div>
      </footer>

      {activeGame && (
        <GameModal
          game={activeGame}
          onClose={() => setActiveGame(null)}
        />
      )}

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(authenticatedUser) => {
            setUser(authenticatedUser)
            setAuthMode(null)
          }}
        />
      )}
    </>
  )
}

export default App