import { useMemo, useState } from 'react'
import AuthModal from './AuthModal'
import { getSession, logout } from './auth'
import './App.css'
import { auth, db } from "./firebase/firebase";

const CATEGORIES = ['Toate', 'Acțiune', 'Aventură', 'Puzzle', 'Sport', 'Strategie', 'Arcade']

// Carduri de exemplu, doar pentru aspectul paginii. Le poți înlocui când adaugi conținut real.
const PLACEHOLDERS = [
  { id: 1, title: 'Titlu joc', category: 'Acțiune', emoji: '🚀', description: 'Descriere scurtă a jocului.' },
  { id: 2, title: 'Titlu joc', category: 'Aventură', emoji: '🗡️', description: 'Descriere scurtă a jocului.' },
  { id: 3, title: 'Titlu joc', category: 'Puzzle', emoji: '🧩', description: 'Descriere scurtă a jocului.' },
  { id: 4, title: 'Titlu joc', category: 'Sport', emoji: '⚽', description: 'Descriere scurtă a jocului.' },
  { id: 5, title: 'Titlu joc', category: 'Strategie', emoji: '🏰', description: 'Descriere scurtă a jocului.' },
  { id: 6, title: 'Titlu joc', category: 'Arcade', emoji: '🐍', description: 'Descriere scurtă a jocului.' },
  { id: 7, title: 'Titlu joc', category: 'Acțiune', emoji: '🥷', description: 'Descriere scurtă a jocului.' },
  { id: 8, title: 'Titlu joc', category: 'Aventură', emoji: '🏝️', description: 'Descriere scurtă a jocului.' },
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
  const [category, setCategory] = useState('Toate')
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
        (category === 'Toate' || g.category === category) &&
        (!q || g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)),
    )
  }, [query, category])

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
            <a className="btn" href="#jocuri">
              ▶ Start
            </a>
          </div>
        </section>

        <section className="container" id="jocuri">
          <div className="section-head">
            <h2>Toate jocurile</h2>
            <div className="chips" role="tablist" aria-label="Categorii">
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