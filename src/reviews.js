import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase/firebase'

export async function getReviews(gameId) {
  const snap = await getDocs(collection(db, 'games', gameId, 'Reviews'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function recalcRating(gameId) {
  const all = await getReviews(gameId)
  const avg = all.length ? all.reduce((sum, r) => sum + r.Rating, 0) / all.length : null
  await updateDoc(doc(db, 'games', gameId), { Rating: avg })
  return avg
}

export async function submitReview(gameId, { userId, rating, comment }) {
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')

  await setDoc(doc(db, 'games', gameId, 'Reviews', userId), {
    IdUser: userId,
    Rating: rating,
    Comment: comment.trim(),
    CreatedAt: serverTimestamp(),
    UpdatedAt: serverTimestamp(),
  })

  return recalcRating(gameId)
}

export async function editReview(gameId, userId, { rating, comment }) {
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')

  await updateDoc(doc(db, 'games', gameId, 'Reviews', userId), {
    Rating: rating,
    Comment: comment.trim(),
    UpdatedAt: serverTimestamp(),
  })

  return recalcRating(gameId)
}

export async function deleteReview(gameId, userId) {
  await deleteDoc(doc(db, 'games', gameId, 'Reviews', userId))
  return recalcRating(gameId)
}