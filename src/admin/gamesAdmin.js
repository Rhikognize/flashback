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

async function uploadGameFiles(id, files, onProgress) {
  const items = []
  if (files.swf) items.push({ key: `games/${id}/file.swf`, file: files.swf })
  if (files.icon) items.push({ key: `games/${id}/icon.png`, file: files.icon })

  if (files.thumbnails?.length) {
    await r2DeletePrefix(`games/${id}/Thumbnails/`)
    files.thumbnails.forEach((f, i) => {
      items.push({ key: `games/${id}/Thumbnails/${i + 1}.png`, file: f })
    })
  }

  if (items.length === 0) return

  const totalBytes = items.reduce((sum, it) => sum + it.file.size, 0)
  const loadedBytes = new Array(items.length).fill(0)

  const report = () => {
    if (!onProgress) return
    const loaded = loadedBytes.reduce((a, b) => a + b, 0)
    onProgress(totalBytes ? loaded / totalBytes : 1)
  }

  await Promise.all(
    items.map((item, idx) =>
      r2Upload(item.key, item.file, (fraction) => {
        loadedBytes[idx] = fraction * item.file.size
        report()
      }),
    ),
  )
}

export async function createGame({ data, files }, onProgress) {
  if (!files.swf) throw new Error('Add a .swf file for the game.')
  const id = crypto.randomUUID()
  await uploadGameFiles(id, files, onProgress)
  await setDoc(doc(db, 'games', id), {
    Title: data.title,
    Description: data.description,
    IdCategory: data.categoryId,
    Tags: data.tags,
    Rating: null,
  })
  return id
}

export async function updateGame(id, { data, files }, onProgress) {
  await uploadGameFiles(id, files, onProgress)
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