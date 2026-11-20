import { useEffect, useMemo, useState } from 'react'
import AuthModal from './AuthModal'
import { subscribeAuth, logout } from './auth'
import { useCatalog } from './useCatalog'
import { getReviews, submitReview } from './reviews'
import { getUserProfile } from './userProfiles'
import logoImg from './assets/pixil-frame-1.png'
import './App.css'
import { auth, db } from "./firebase/firebase";
import AdminPanel from './admin/AdminPanel'

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

function ReviewItem({ review, profile }) {
  const rating = review.Rating
  return (
    <li className="review-item">
      <div className="review-header">
        <div className="review-avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} loading="lazy" />
          ) : (
            <span aria-hidden="true">👤</span>
          )}
        </div>
        <div className="review-author">
          <span className="review-name">{profile?.name ?? 'Loading...'}</span>
          <span className="review-stars">
            {'★'.repeat(rating)}
            {'☆'.repeat(5 - rating)}
          </span>
        </div>
      </div>
      <p className="review-comment">{review.Comment}</p>
    </li>
  )
}

function GameModal({ game, user, onClose, onRatingChange }) {
  const [reviews, setReviews] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingReviews(true)
    getReviews(game.id)
      .then(async (r) => {
        if (cancelled) return
        setReviews(r)
        const uniqueIds = [...new Set(r.map((rv) => rv.IdUser))]
        const entries = await Promise.all(
          uniqueIds.map(async (uid) => [uid, await getUserProfile(uid)]),
        )
        if (!cancelled) setProfiles(Object.fromEntries(entries))
      })
      .catch((err) => console.error('Reviews load error:', err))
      .finally(() => !cancelled && setLoadingReviews(false))
    return () => { cancelled = true }
  }, [game.id])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const avg = await submitReview(game.id, {
        userId: user.id,
        rating: Number(myRating),
        comment: myComment,
      })
      const newReview = { IdUser: user.id, Rating: Number(myRating), Comment: myComment }
      setReviews((rs) => [...rs.filter((r) => r.IdUser !== user.id), newReview])
      setProfiles((p) => ({
        ...p,
        [user.id]: { name: user.username, avatarUrl: p[user.id]?.avatarUrl ?? null },
      }))
      onRatingChange?.(game.id, avg)
      setMyComment('')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="game-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-ghost btn-sm game-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="game-modal-head">
          {game.iconUrl && <img className="game-modal-icon" src={game.iconUrl} alt="" />}
          <div>
            <h2>{game.title}</h2>
            <p className="game-meta">
              <span className="tag">{game.category}</span> <Stars value={game.rating} />
            </p>
          </div>
        </div>

        <p className="game-description">{game.description}</p>

        {game.tags.length > 0 && (
          <div className="chips">
            {game.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}

        {game.thumbnails.length > 0 && (
          <div className="thumbs">
            {game.thumbnails.map((t) => (
              <img key={t} src={t} alt="" loading="lazy" />
            ))}
          </div>
        )}

        <div className="player-placeholder">
          <span aria-hidden="true">▶</span>
          <p>Player coming soon</p>
        </div>

        <h3>Reviews</h3>
        {loadingReviews ? (
          <p>Loading...</p>
        ) : reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <ul className="review-list">
            {reviews.map((r) => (
              <ReviewItem key={r.id ?? r.IdUser} review={r} profile={profiles[r.IdUser]} />
            ))}
          </ul>
        )}

        {user ? (
          <form className="review-form" onSubmit={submit}>
            <label>
              Rating
              <select value={myRating} onChange={(e) => setMyRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Your comment..."
              required
            />
            {error && (
              <p className="form-error" role="alert">
                ! {error}
              </p>
            )}
            <button type="submit" className="btn btn-sm" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit review'}
            </button>
          </form>
        ) : (
          <p className="hint">Log in to leave a review.</p>
        )}
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
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeAuth((u) => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  const { games: loadedGames, categories, loading, error, refetch } = useCatalog()
  const [games, setGames] = useState([])

  useEffect(() => {
    setGames(loadedGames)
  }, [loadedGames])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleRatingChange = (gameId, rating) => {
    setGames((gs) => gs.map((g) => (g.id === gameId ? { ...g, rating } : g)))
    setActiveGame((g) => (g && g.id === gameId ? { ...g, rating } : g))
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
            <img
              src={logoImg}
              alt=""
              className="logo-mark"
              aria-hidden="true"
            />
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
              <>
                <span className="user-chip">
                  <span className="user-icon">👤</span>
                  <span className="username">{user.username}</span>
                  <span className={`role-badge ${user.role?.toLowerCase()}`}>{user.role}</span>
                </span>
                {user.role === 'Admin' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdmin(true)}>
                    Admin
                  </button>
                )}
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
            {authLoading
              ? '\u00A0'
              : user
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

      {activeGame && (
        <GameModal
          game={activeGame}
          user={user}
          onClose={() => setActiveGame(null)}
          onRatingChange={handleRatingChange}
        />
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onDataChange={refetch} />}

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