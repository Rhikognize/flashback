import { useEffect, useMemo, useRef, useState } from 'react'
import AuthModal from './AuthModal'
import { subscribeAuth, logout } from './auth'
import { useCatalog } from './useCatalog'
import { getReviews, submitReview, editReview, deleteReview } from './reviews'
import { getUserProfile } from './userProfiles'
import logoImg from './assets/pixil-frame-1.png'
import './App.css'
import { auth, db } from "./firebase/firebase";
import AdminPanel from './admin/AdminPanel'
import ConfirmDialog from './admin/ConfirmDialog'
import RufflePlayer from './RufflePlayer'
import Dropdown from './Dropdown'
import { registerView, registerLaunch } from './views'
import { backfillField, SORT_FIELD } from './backfill'

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  return value instanceof Date ? value : new Date(value)
}

function formatReviewDate(value) {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title A → Z' },
  { value: 'za', label: 'Title Z → A' },
  { value: 'rating-desc', label: 'Rating: high → low' },
  { value: 'rating-asc', label: 'Rating: low → high' },
  { value: 'views-desc', label: 'Views: most first' },
  { value: 'views-asc', label: 'Views: least first' },
  { value: 'launches-desc', label: 'Launches: most first' },
  { value: 'launches-asc', label: 'Launches: least first' },
]

const byRating = (dir) => (a, b) => {
  if (a.rating == null && b.rating == null) return 0
  if (a.rating == null) return 1
  if (b.rating == null) return -1
  return dir * (a.rating - b.rating)
}

const COMPARATORS = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  az: (a, b) => (a.title ?? '').localeCompare(b.title ?? ''),
  za: (a, b) => (b.title ?? '').localeCompare(a.title ?? ''),
  'rating-desc': byRating(-1),
  'rating-asc': byRating(1),
  'views-desc': (a, b) => b.views - a.views,
  'views-asc': (a, b) => a.views - b.views,
  'launches-desc': (a, b) => b.launches - a.launches,
  'launches-asc': (a, b) => a.launches - b.launches,
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
  </svg>
)

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
)

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
        <div className="card-stats">
          <span className="stat" title="Views">
            <EyeIcon /> {item.views}
          </span>
          <span className="stat" title="Launches">
            <PlayIcon /> {item.launches}
          </span>
        </div>
      </div>
    </article>
  )
}

function ReviewItem({ review, profile, isOwn, busy, onSave, onRequestDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editRating, setEditRating] = useState(review.Rating)
  const [editComment, setEditComment] = useState(review.Comment)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const rating = review.Rating
  const createdAt = toDate(review.CreatedAt)
  const updatedAt = toDate(review.UpdatedAt)
  const isEdited = createdAt && updatedAt && updatedAt.getTime() !== createdAt.getTime()
  const dateLabel = isEdited ? formatReviewDate(review.UpdatedAt) : formatReviewDate(review.CreatedAt)

  const startEdit = () => {
    setEditRating(review.Rating)
    setEditComment(review.Comment)
    setError('')
    setIsEditing(true)
    setMenuOpen(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setError('')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(Number(editRating), editComment)
      setIsEditing(false)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="review-item">
      <div className="review-top">
        <span className="review-date">
          {dateLabel}
          {isEdited && ' (edited)'}
        </span>
      </div>

      {isOwn && (
        <div className="review-menu" ref={menuRef}>
          <button
            type="button"
            className="review-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Review options"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="review-menu-dropdown">
              <button type="button" onClick={startEdit}>Edit</button>
              <button type="button" onClick={() => { setMenuOpen(false); onRequestDelete() }}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

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

      {isEditing ? (
        <form className="review-edit-form" onSubmit={saveEdit}>
          <label>
            Rating
            <select value={editRating} onChange={(e) => setEditRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} required />
          {error && <p className="form-error" role="alert">! {error}</p>}
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-sm" disabled={saving || busy}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="review-comment">{review.Comment}</p>
      )}
    </li>
  )
}

function GameModal({ game, user, onClose, onRatingChange, onLaunch }) {
  const [reviews, setReviews] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reviewToDelete, setReviewToDelete] = useState(null)

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

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const ta = toDate(a.CreatedAt)?.getTime() ?? 0
      const tb = toDate(b.CreatedAt)?.getTime() ?? 0
      return tb - ta
    })
  }, [reviews])

  const myReview = useMemo(
    () => reviews.find((r) => user && r.IdUser === user.id),
    [reviews, user],
  )

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
      const now = new Date()
      const newReview = {
        IdUser: user.id,
        Rating: Number(myRating),
        Comment: myComment,
        CreatedAt: now,
        UpdatedAt: now,
      }
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

  const handleEditReview = async (rating, comment) => {
    const avg = await editReview(game.id, user.id, { rating, comment })
    const now = new Date()
    setReviews((rs) =>
      rs.map((r) => (r.IdUser === user.id ? { ...r, Rating: rating, Comment: comment, UpdatedAt: now } : r)),
    )
    onRatingChange?.(game.id, avg)
  }

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return
    setBusy(true)
    try {
      const avg = await deleteReview(game.id, reviewToDelete.IdUser)
      setReviews((rs) => rs.filter((r) => r.IdUser !== reviewToDelete.IdUser))
      onRatingChange?.(game.id, avg)
      setReviewToDelete(null)
    } catch (err) {
      console.error('Delete review error:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="modal-backdrop"
        onWheel={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.querySelector('.modal-scroll')?.scrollBy(0, e.deltaY)
        }}
      >
        <div className="game-modal" onClick={(e) => e.stopPropagation()}>
          <div className="game-modal-head">
            {game.iconUrl && <img className="game-modal-icon" src={game.iconUrl} alt="" />}
            <div className="game-modal-title">
              <h2>{game.title}</h2>
              <p className="game-meta">
                <span className="tag">{game.category}</span> <Stars value={game.rating} />
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm game-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="modal-scroll game-modal-body">
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

          <RufflePlayer key={game.id} url={game.fileUrl} onLaunch={() => onLaunch?.(game.id)} />

          <h3>Leave a review</h3>
          {!user ? (
            <p className="hint">Log in to leave a review.</p>
          ) : myReview ? (
            <p className="hint">You've already reviewed this game. Use the ⋮ menu on your review below to edit or delete it.</p>
          ) : (
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
          )}

          <h3>Reviews ({reviews.length})</h3>
          {loadingReviews ? (
            <p>Loading...</p>
          ) : sortedReviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <ul className="review-list">
              {sortedReviews.map((r) => (
                <ReviewItem
                  key={r.id ?? r.IdUser}
                  review={r}
                  profile={profiles[r.IdUser]}
                  isOwn={user?.id === r.IdUser}
                  busy={busy}
                  onSave={handleEditReview}
                  onRequestDelete={() => setReviewToDelete(r)}
                />
              ))}
            </ul>
          )}
          </div>
        </div>
      </div>

      {reviewToDelete && (
        <ConfirmDialog
          title="Delete review"
          message="Delete your review? This cannot be undone."
          onConfirm={handleDeleteReview}
          onCancel={() => setReviewToDelete(null)}
          busy={busy}
        />
      )}
    </>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
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

  const handlePlay = (game) => {
    setActiveGame(game)
    // counted once per game per session; update the local list so the sort by views stays current
    if (registerView(game.id)) {
      setGames((gs) => gs.map((g) => (g.id === game.id ? { ...g, views: g.views + 1 } : g)))
    }
  }

  const handleLaunch = (gameId) => {
    registerLaunch(gameId)
    setGames((gs) => gs.map((g) => (g.id === gameId ? { ...g, launches: g.launches + 1 } : g)))
  }

  const backfillBusy = useRef(new Set())
  useEffect(() => {
    const field = SORT_FIELD[sort]
    if (!field || user?.role !== 'Admin' || loading) return
    const ids = games.filter((g) => g.missing?.includes(field)).map((g) => g.id)
    if (!ids.length || backfillBusy.current.has(field)) return
    backfillBusy.current.add(field)
    backfillField(ids, field)
      .then((patch) => {
        const done = new Set(ids)
        setGames((gs) => gs.map((g) => (done.has(g.id) ? patch(g) : g)))
        backfillBusy.current.delete(field)
      })
      .catch((err) => console.error(`Backfill ${field} error:`, err))
  }, [sort, games, user, loading])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const compare = COMPARATORS[sort] ?? COMPARATORS.newest
    return games
      .filter(
        (g) =>
          (category === 'all' || g.categoryId === category) &&
          (!q ||
            g.title?.toLowerCase().includes(q) ||
            g.description?.toLowerCase().includes(q)),
      )
      .sort((a, b) => compare(a, b) || (a.title ?? '').localeCompare(b.title ?? ''))
  }, [games, query, category, sort])

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  )

  const headerRef = useRef(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
      <header className="header" ref={headerRef}>
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
            <input
              className="search"
              type="search"
              placeholder="Search for a game..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search for a game"
            />
            <Dropdown
              className="filter-select"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              ariaLabel="Filter by category"
            />
            <Dropdown
              className="sort-select"
              options={SORT_OPTIONS}
              value={sort}
              onChange={setSort}
              ariaLabel="Sort games"
              align="right"
            />
          </div>

          <div className="grid">
            {loading ? (
              <p className="empty">Loading...</p>
            ) : error ? (
              <p className="empty">Error loading games.</p>
            ) : filtered.length ? (
              filtered.map((g) => <Card key={g.id} item={g} onPlay={handlePlay} />)
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
          onLaunch={handleLaunch}
        />
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onDataChange={refetch} currentUserId={user.id} />}

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