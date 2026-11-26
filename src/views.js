import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from './firebase/firebase'

export function registerView(gameId) {
  return updateDoc(doc(db, 'games', gameId), { Views: increment(1) })
}

export function registerLaunch(gameId) {
  return updateDoc(doc(db, 'games', gameId), { Launches: increment(1) })
}