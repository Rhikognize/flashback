import { useEffect, useState } from 'react'
import { login, register } from './auth'

export default function AuthModal({ initialMode = 'login', onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ identifier: '', username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const switchMode = (m) => {
    setMode(m)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'register' && form.password !== form.confirm) {
      setError('Parolele nu coincid.')
      return
    }
    setBusy(true)
    try {
      const user =
        mode === 'login'
          ? await login({ identifier: form.identifier, password: form.password })
          : await register({ username: form.username, email: form.email, password: form.password })
      onSuccess(user)
    } catch (err) {
      setError(err.message || 'A apărut o eroare.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Autentificare" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'login' ? 'Autentificare' : 'Cont nou'}</h2>
          <button type="button" className="close" onClick={onClose} aria-label="Închide">
            ✕
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'login' ? (
            <label>
              Utilizator sau email
              <input value={form.identifier} onChange={set('identifier')} autoComplete="username" required autoFocus />
            </label>
          ) : (
            <>
              <label>
                Nume utilizator
                <input value={form.username} onChange={set('username')} autoComplete="username" required autoFocus />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              </label>
            </>
          )}

          <label>
            Parolă
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {mode === 'register' && (
            <label>
              Confirmă parola
              <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
            </label>
          )}

          {error && (
            <p className="form-error" role="alert">
              ! {error}
            </p>
          )}

          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Se verifică...' : mode === 'login' ? 'Intră' : 'Creează cont'}
          </button>

          <p className="auth-switch">
            {mode === 'login' ? 'Nu ai cont? ' : 'Ai deja cont? '}
            <button type="button" className="link" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Înregistrează-te' : 'Autentifică-te'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
