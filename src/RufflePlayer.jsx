import { useEffect, useRef, useState } from 'react'

const RUFFLE_SRC = 'https://unpkg.com/@ruffle-rs/ruffle'
let ruffleLoading = null

const PLAYER_CONFIG = {
  autoplay: 'on',
  unmuteOverlay: 'hidden',
  splashScreen: false,
  letterbox: 'on',
  scale: 'showAll',
  forceScale: true,
  forceAlign: true,
  backgroundColor: '#000000',
  contextMenu: 'rightClickOnly',
}

function loadRuffle() {
  if (window.RufflePlayer?.newest) return Promise.resolve(window.RufflePlayer)
  if (ruffleLoading) return ruffleLoading

  window.RufflePlayer = window.RufflePlayer || {}
  window.RufflePlayer.config = {
    ...PLAYER_CONFIG,
    ...(window.RufflePlayer.config || {}),
  }

  ruffleLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = RUFFLE_SRC
    script.async = true
    script.onload = () => {
      if (window.RufflePlayer?.newest) resolve(window.RufflePlayer)
      else reject(new Error('Ruffle did not initialise.'))
    }
    script.onerror = () => reject(new Error('Could not download Ruffle.'))
    document.head.appendChild(script)
  }).catch((err) => {
    ruffleLoading = null
    throw err
  })

  return ruffleLoading
}

export default function RufflePlayer({ url, onLaunch }) {
  const holderRef = useRef(null)
  const playerRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [ratio, setRatio] = useState(16 / 10)

  const destroy = () => {
    playerRef.current?.remove()
    playerRef.current = null
  }

  useEffect(() => destroy, [])

  const start = async () => {
    if (status === 'loading' || status === 'playing') return
    setError('')
    setStatus('loading')
    try {
      const ruffle = await loadRuffle()
      destroy()
      const player = ruffle.newest().createPlayer()
      player.style.display = 'block'
      player.style.width = '100%'
      player.style.height = '100%'
      player.style.background = '#000'

      const applyRatio = () => {
        const m = player.metadata
        if (m?.width > 0 && m?.height > 0) setRatio(m.width / m.height)
      }
      player.addEventListener('loadedmetadata', applyRatio)

      holderRef.current.appendChild(player)
      playerRef.current = player
      await player.ruffle().load({ url, ...PLAYER_CONFIG })
      applyRatio()
      setStatus('playing')
      onLaunch?.()
    } catch (err) {
      console.error('Ruffle error:', err)
      destroy()
      setError(err?.message || 'Could not start the game.')
      setStatus('error')
    }
  }

  const fullscreen = () => {
    const player = playerRef.current
    if (!player) return
    if (typeof player.enterFullscreen === 'function') {
      player.enterFullscreen()
    } else {
      const el = holderRef.current
      ;(el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
    }
  }

  return (
    <>
    <div
      className={`player player-${status}`}
      style={{ aspectRatio: ratio, maxHeight: '75vh' }}
    >
      <div className="player-stage" ref={holderRef} />

      {status !== 'playing' && (
        <button type="button" className="player-overlay" onClick={start} disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <span className="player-spinner" aria-hidden="true" />
              <p>Loading...</p>
            </>
          ) : (
            <>
              <span className="player-triangle" aria-hidden="true">▶</span>
              <p>{status === 'error' ? 'Try again' : 'Play'}</p>
              {status === 'error' && <small className="player-error">! {error}</small>}
            </>
          )}
        </button>
      )}
    </div>

    <div className="player-bar">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={fullscreen}
        disabled={status !== 'playing'}
      >
        ⛶ Full Screen
      </button>
    </div>
    </>
  )
}