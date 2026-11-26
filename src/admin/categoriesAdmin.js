import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

export async function listCategoriesAdmin() {
  const snap = await getDocs(collection(db, 'categories'))
  return snap.docs
    .map((d) => ({ id: d.id, name: d.data().Name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function countGamesInCategory(categoryId) {
  const snap = await getDocs(collection(db, 'games'))
  return snap.docs.filter((d) => d.data().IdCategory === categoryId).length
}

export async function createCategory(name) {
  const id = crypto.randomUUID()
  await setDoc(doc(db, 'categories', id), { Name: name.trim() })
  return id
}

export async function renameCategory(id, name) {
  await updateDoc(doc(db, 'categories', id), { Name: name.trim() })
}

export async function deleteCategory(id) {
  const inUse = await countGamesInCategory(id)
  if (inUse > 0) {
    throw new Error(`Can't delete: ${inUse} game(s) still use this category.`)
  }
  await deleteDoc(doc(db, 'categories', id))
}