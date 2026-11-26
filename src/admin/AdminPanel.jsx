import { useState } from 'react'
import AdminGames from './AdminGames'
import AdminCategories from './AdminCategories'
import AdminUsers from './AdminUsers'

const TABS = [
  { id: 'games', label: 'Games' },
  { id: 'categories', label: 'Categories' },
  { id: 'users', label: 'Users' },
]

export default function AdminPanel({ onClose, onDataChange, currentUserId }) {
  const [tab, setTab] = useState('games')

  return (
    <div
      className="modal-backdrop"
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.querySelector('.modal-scroll')?.scrollBy(0, e.deltaY)
      }}
    >
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-panel-top">
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
        </div>

        <div className="modal-scroll admin-panel-body">
          {tab === 'games' && <AdminGames onDataChange={onDataChange} />}
          {tab === 'categories' && <AdminCategories onDataChange={onDataChange} />}
          {tab === 'users' && <AdminUsers currentUserId={currentUserId} />}
        </div>
      </div>
    </div>
  )
}