import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { r2Upload, r2DeletePrefix } from '../r2'

export async function listCategoriesAdmin() {
  const snap = await getDocs(collection(db, 'categories'))
  return snap.docs
    .map((d) => ({ id: d.id, name: d.data().Name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listGamesAdmin() {
  const snap = await getDocs(collection(db, 'games'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function uploadGameFiles(id, files) {
  if (files.swf) await r2Upload(`games/${id}/file.swf`, files.swf)
  if (files.icon) await r2Upload(`games/${id}/icon.png`, files.icon)
  if (files.thumbnails?.length) {
    await r2DeletePrefix(`games/${id}/Thumbnails/`)
    await Promise.all(
      files.thumbnails.map((f, i) => r2Upload(`games/${id}/Thumbnails/${i + 1}.png`, f)),
    )
  }
}

export async function createGame({ data, files }) {
  if (!files.swf) throw new Error('Add a .swf file for the game.')
  const id = crypto.randomUUID()
  await uploadGameFiles(id, files)
  await setDoc(doc(db, 'games', id), {
    Title: data.title,
    Description: data.description,
    IdCategory: data.categoryId,
    Tags: data.tags,
    Rating: null,
  })
  return id
}

export async function updateGame(id, { data, files }) {
  await uploadGameFiles(id, files)
  await updateDoc(doc(db, 'games', id), {
    Title: data.title,
    Description: data.description,
    IdCategory: data.categoryId,
    Tags: data.tags,
  })
}

export async function deleteGame(id) {
  await r2DeletePrefix(`games/${id}/`)
  await deleteDoc(doc(db, 'games', id))
}