import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase/firebase'
import { r2Url } from './r2'

const toMap = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data().Name]))

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : [])

export function useCatalog() {
  const [state, setState] = useState({ games: [], categories: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [gSnap, cSnap, dSnap] = await Promise.all([
          getDocs(collection(db, 'games')),
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'developers')),
        ])

        const catNames = toMap(cSnap)
        const devNames = toMap(dSnap)

        const games = gSnap.docs.map((d) => {
          const g = d.data()
          return {
            id: d.id,
            title: g.Name,
            description: g.Description,
            categoryId: g.IdCategory,
            category: catNames[g.IdCategory] ?? '—',
            developer: devNames[g.IdDeveloper] ?? '—',
            fileUrl: r2Url(g.LinkToFile),
            iconUrl: r2Url(g.LinkToIcon),
            thumbnails: toArray(g.LinkToThumbnails).map(r2Url),
          }
        })

        const categories = cSnap.docs
          .map((d) => ({ id: d.id, name: d.data().Name }))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (!cancelled) setState({ games, categories, loading: false, error: null })
      } catch (error) {
        console.error('Catalog load error:', error)
        if (!cancelled) setState((s) => ({ ...s, loading: false, error }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}