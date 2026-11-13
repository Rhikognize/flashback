import { useEffect, useMemo, useState } from 'react'
import AuthModal from './AuthModal'
import { getSession, logout } from './auth'
import './App.css'
import { auth, db } from "./firebase/firebase";
import { useCatalog } from './useCatalog'

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

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
      </div>
    </article>
  )
}

function GameModal({ game, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="game-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-ghost btn-sm game-close" onClick={onClose}>
          ✕
        </button>
        <h2>{game.title}</h2>
        <p className="game-meta">{game.developer} · {game.category}</p>
        <FlashPlayer src={game.fileUrl} />
        <p>{game.description}</p>
        {game.thumbnails.length > 0 && (
          <div className="thumbs">
            {game.thumbnails.map((t) => (
              <img key={t} src={t} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all') // id категории или 'all'
  const [user, setUser] = useState(getSession)
  const [authMode, setAuthMode] = useState(null)
  const [activeGame, setActiveGame] = useState(null)

  const { games, categories, loading, error } = useCatalog()

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
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
        setWorkerStatus(await response.text())
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
            placeholder="Caută un joc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Caută un joc"
          />
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-chip">👤 {user.username}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Ieși
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAuthMode('login')}>
                  Intră
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setAuthMode('register')}>
                  Cont nou
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero container">
          <h1>
            Jocurile Flash <span>nu au murit.</span>
          </h1>
          <p>
            {user
              ? `Bine ai revenit, ${user.username}! Apasă START.`
              : 'Joacă clasicele tale preferate direct în browser. Apasă START.'}
          </p>
          <div className="hero-actions">
            <a className="btn" href="#jocuri">▶ Start</a>
          </div>
        </section>

        <section className="container" id="jocuri">
          <div className="section-head">
            <h2>Toate jocurile</h2>
            <div className="chips" role="tablist" aria-label="Categorii">
              <button
                type="button"
                role="tab"
                aria-selected={category === 'all'}
                className={`chip ${category === 'all' ? 'active' : ''}`}
                onClick={() => setCategory('all')}
              >
                Toate
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
              <p className="empty">Se încarcă...</p>
            ) : error ? (
              <p className="empty">Eroare la încărcarea jocurilor.</p>
            ) : filtered.length ? (
              filtered.map((g) => <Card key={g.id} item={g} onPlay={setActiveGame} />)
            ) : (
              <p className="empty">Nimic găsit. Încearcă altă căutare sau altă categorie.</p>
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