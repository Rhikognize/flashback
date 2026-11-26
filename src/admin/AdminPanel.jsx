import { useState } from 'react'
import AdminGames from './AdminGames'
import AdminCategories from './AdminCategories'

const TABS = [
  { id: 'games', label: 'Games' },
  { id: 'categories', label: 'Categories' },
  { id: 'users', label: 'Users' },
]

export default function AdminPanel({ onClose, onDataChange }) {
  const [tab, setTab] = useState('games')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Admin panel</h2>
          <button type="button" className="close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="admin-panel-tabs chips" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`chip ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="admin-panel-body">
          {tab === 'games' && <AdminGames onDataChange={onDataChange} />}
          {tab === 'categories' && <AdminCategories onDataChange={onDataChange} />}
          {tab === 'users' && <p className="hint">Coming soon.</p>}
        </div>
      </div>
    </div>
  )
}