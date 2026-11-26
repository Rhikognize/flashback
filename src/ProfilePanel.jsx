import { useMemo, useRef, useState } from 'react'
import { updateMyProfile, toggleFavorite } from './userProfiles'
import { r2Upload, r2Url } from './r2'

export default function ProfilePanel({ user, games, onClose, onUpdateUser, onPlay }) {
  const [name, setName] = useState(user.username || '')
  const [imageUrl, setImageUrl] = useState(user.avatarUrl || '')
  const [favorites, setFavorites] = useState(user.favorites || [])
  const [tab, setTab] = useState('favorites')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games])
  const listedGames = tab === 'favorites'
    ? favorites.map((id) => gamesById.get(id)).filter(Boolean)
    : (user.launchHistory || []).map((entry) => gamesById.get(entry.GameId)).filter(Boolean)

  const playedLabel = (milliseconds = 0) => {
    const totalSeconds = Math.min(10_000_000 * 60 * 60, Math.floor((Number(milliseconds) || 0) / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const save = async (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 3) { setError('Name must be at least 3 characters.'); return }
    setBusy(true); setError('')
    try {
      await updateMyProfile(user.id, { name: cleanName, imageUrl: imageUrl.trim() })
      onUpdateUser({ ...user, username: cleanName, avatarUrl: imageUrl.trim() || null, favorites })
    } catch (err) { setError(err.message || 'Could not save profile.') }
    finally { setBusy(false) }
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be smaller than 5 MB.'); return }
    setBusy(true); setError('')
    try {
      await r2Upload(`users/${user.id}/Icon/avatar`, file)
      const uploadedUrl = `${r2Url(`users/${user.id}/Icon/avatar`)}?v=${Date.now()}`
      await updateMyProfile(user.id, { name: name.trim() || user.username, imageUrl: uploadedUrl })
      setImageUrl(uploadedUrl)
      onUpdateUser({ ...user, username: name.trim() || user.username, avatarUrl: uploadedUrl })
    } catch (err) { setError(err.message || 'Could not upload image.') }
    finally { setBusy(false) }
  }

  const removeFavorite = async (gameId) => {
    try {
      await toggleFavorite(user.id, gameId, false)
      const next = favorites.filter((id) => id !== gameId)
      setFavorites(next)
      onUpdateUser({ ...user, favorites: next })
    } catch (err) { setError(err.message || 'Could not update favorites.') }
  }

  return (
    <div className="modal-backdrop">
      <section className="profile-panel" onClick={(event) => event.stopPropagation()} aria-label="User profile">
        <header className="profile-head">
          <h2>Your profile</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-scroll profile-body">
          <form className="profile-card" onSubmit={save}>
            <button type="button" className="profile-avatar profile-avatar-button" onClick={() => fileInputRef.current?.click()} disabled={busy} aria-label="Choose profile picture">
              {imageUrl ? <img src={imageUrl} alt="Profile" /> : <span>👤</span>}
              <span className="profile-avatar-hint">{busy ? 'Uploading…' : 'Change photo'}</span>
            </button>
            <input ref={fileInputRef} className="profile-file-input" type="file" accept="image/*" disabled={busy} onChange={(event) => { uploadAvatar(event.target.files?.[0]); event.target.value = '' }} />
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required /></label>
            <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
            {error && <p className="form-error" role="alert">! {error}</p>}
          </form>
          <nav className="profile-tabs" aria-label="Profile library">
            <button type="button" className={tab === 'favorites' ? 'active' : ''} onClick={() => setTab('favorites')}>★ Favorites</button>
            <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>▶ Launch history</button>
          </nav>
          <div className="profile-game-list">
            {listedGames.length ? listedGames.map((game) => (
              <div className="profile-game" key={game.id}>
                <button type="button" className="profile-game-open" onClick={() => { onClose(); onPlay(game) }}>
                  {game.iconUrl ? <img src={game.iconUrl} alt="" /> : <span>🎮</span>}
                  <span className="profile-game-label">
                    <strong>{game.title}</strong>
                    {tab === 'history' && <small>{playedLabel((user.launchHistory || []).find((entry) => entry.GameId === game.id)?.PlayTimeMs)}</small>}
                  </span>
                </button>
                {tab === 'favorites' && <button type="button" className="favorite-remove" onClick={() => removeFavorite(game.id)} aria-label={`Remove ${game.title} from favorites`}>★</button>}
              </div>
            )) : <p className="hint">{tab === 'favorites' ? 'No favorite games yet.' : 'No games launched yet.'}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
