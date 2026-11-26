import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { r2List, r2DeletePrefix } from '../r2'
import { deleteReview } from '../reviews'

export const ROLES = ['User', 'Admin']

export async function listUsersAdmin() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((d) => {
      const u = d.data()
      return {
        id: d.id,
        name: u.Name || 'Unknown user',
        role: u.Role || 'User',
        isBlocked: u.IsBlocked === true,
      }
    })
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'Admin' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export async function setUserRole(id, role) {
  if (!ROLES.includes(role)) throw new Error('Unknown role.')
  await updateDoc(doc(db, 'users', id), { Role: role })
}

export async function setUserBlocked(id, blocked) {
  await updateDoc(doc(db, 'users', id), { IsBlocked: blocked })
}

export async function deleteUser(id) {
  const gamesSnap = await getDocs(collection(db, 'games'))
  for (const g of gamesSnap.docs) {
    const review = await getDoc(doc(db, 'games', g.id, 'Reviews', id))
    if (review.exists()) await deleteReview(g.id, id)
  }

  const files = await r2List(`users/${id}/`)
  if (files.length) await r2DeletePrefix(`users/${id}/`)

  await deleteDoc(doc(db, 'users', id))
}