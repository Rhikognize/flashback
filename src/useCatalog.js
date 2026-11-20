import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase/firebase'
import { r2Url, r2List } from './r2'

const toMap = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data().Name]))

export function useCatalog() {
  const [state, setState] = useState({ games: [], categories: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [gSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'games')),
        getDocs(collection(db, 'categories')),
      ])

      const catNames = toMap(cSnap)

      const games = await Promise.all(
        gSnap.docs.map(async (d) => {
          const g = d.data()
          const thumbKeys = await r2List(`games/${d.id}/Thumbnails/`)
          return {
            id: d.id,
            title: g.Title,
            description: g.Description,
            categoryId: g.IdCategory,
            category: catNames[g.IdCategory] ?? '—',
            tags: Array.isArray(g.Tags) ? g.Tags : [],
            rating: typeof g.Rating === 'number' ? g.Rating : null,
            fileUrl: r2Url(`games/${d.id}/file.swf`),
            iconUrl: r2Url(`games/${d.id}/icon.png`),
            thumbnails: thumbKeys.map(r2Url),
          }
        })
      )

      const categories = cSnap.docs
        .map((d) => ({ id: d.id, name: d.data().Name }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setState({ games, categories, loading: false, error: null })
    } catch (error) {
      console.error('Catalog load error:', error)
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}