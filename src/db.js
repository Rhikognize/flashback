// Local storage for games, in IndexedDB (handles large files, unlike localStorage).
// The data stays in this browser only. No backend.

const DB_NAME = 'flashback'
const STORE = 'games'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(req?.result)
    }
    tx.onerror = tx.onabort = () => {
      db.close()
      reject(tx.error || new Error('Could not save (not enough browser storage?).'))
    }
  })
}

export async function getAllGames() {
  const list = await run('readonly', (s) => s.getAll())
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export const saveGame = (game) => run('readwrite', (s) => s.put(game))

export const deleteGame = (id) => run('readwrite', (s) => s.delete(id))
