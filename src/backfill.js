import { doc, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from './firebase/firebase'

const DEFAULTS = {
  CreatedAt: () => Timestamp.now(),
  Title: () => 'Untitled',
  Rating: () => null,
  Views: () => 0,
  Launches: () => 0,
}

const LOCAL_PATCH = {
  CreatedAt: (v) => ({ createdAt: v.toMillis() }),
  Title: (v) => ({ title: v }),
  Rating: (v) => ({ rating: v }),
  Views: (v) => ({ views: v }),
  Launches: (v) => ({ launches: v }),
}

export const SORT_FIELD = {
  newest: 'CreatedAt',
  oldest: 'CreatedAt',
  az: 'Title',
  za: 'Title',
  'rating-desc': 'Rating',
  'rating-asc': 'Rating',
  'views-desc': 'Views',
  'views-asc': 'Views',
  'launches-desc': 'Launches',
  'launches-asc': 'Launches',
}

export async function backfillField(gameIds, field) {
  const value = DEFAULTS[field]()
  for (let i = 0; i < gameIds.length; i += 400) {
    const batch = writeBatch(db)
    gameIds.slice(i, i + 400).forEach((id) => batch.update(doc(db, 'games', id), { [field]: value }))
    await batch.commit()
  }
  return (game) => ({
    ...game,
    ...LOCAL_PATCH[field](value),
    missing: game.missing.filter((f) => f !== field),
  })
}