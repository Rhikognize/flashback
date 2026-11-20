import { useEffect, useState } from 'react'
import DropZone from './DropZone'
import { useFilePreviews } from './useFilePreviews'
import { listCategoriesAdmin, listGamesAdmin, createGame, updateGame, deleteGame } from './gamesAdmin'
import ConfirmDialog from './ConfirmDialog'
import CategorySelect from './CategorySelect'

const emptyForm = { title: '', description: '', categoryId: '', tagsText: '' }

export default function AdminGames({ onDataChange }) {
    const [games, setGames] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [swfFile, setSwfFile] = useState(null)
    const [iconFile, setIconFile] = useState(null)
    const [thumbFiles, setThumbFiles] = useState([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [gameToDelete, setGameToDelete] = useState(null)

    const iconPreviews = useFilePreviews(iconFile)
    const thumbPreviews = useFilePreviews(thumbFiles)

    const reload = async () => {
        setLoading(true)
        const [g, c] = await Promise.all([listGamesAdmin(), listCategoriesAdmin()])
        setGames(g)
        setCategories(c)
        setLoading(false)
    }

    useEffect(() => { reload() }, [])

    const resetForm = () => {
        setEditingId(null)
        setForm(emptyForm)
        setSwfFile(null)
        setIconFile(null)
        setThumbFiles([])
        setError('')
    }

    const startEdit = (game) => {
        setEditingId(game.id)
        setForm({
            title: game.Title || '',
            description: game.Description || '',
            categoryId: game.IdCategory || '',
            tagsText: (game.Tags || []).join(', '),
        })
        setSwfFile(null)
        setIconFile(null)
        setThumbFiles([])
        setError('')
        setSuccess('')
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!editingId && !swfFile) {
            setError('Add a .swf file for a new game.')
            return
        }
        if (!form.categoryId) {
            setError('Select a category.')
            return
        }

        setBusy(true)
        try {
            const data = {
                title: form.title.trim(),
                description: form.description.trim(),
                categoryId: form.categoryId,
                tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
            }
            const files = { swf: swfFile, icon: iconFile, thumbnails: thumbFiles }

            if (editingId) await updateGame(editingId, { data, files })
            else await createGame({ data, files })

            await reload()
            await onDataChange?.()
            setSuccess(editingId ? 'Changes saved.' : 'Game added.')
            resetForm()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Something went wrong.')
        } finally {
            setBusy(false)
        }
    }

    const confirmDelete = (game) => setGameToDelete(game)

    const handleDelete = async () => {
        if (!gameToDelete) return
        setBusy(true)
        setError('')
        try {
            await deleteGame(gameToDelete.id)
            await reload()
            await onDataChange?.()
            if (editingId === gameToDelete.id) resetForm()
            setGameToDelete(null)
        } catch (err) {
            console.error(err)
            setError(err.message || 'Delete failed.')
        } finally {
            setBusy(false)
        }
    }

    if (loading) return <p className="hint">Loading...</p>

    return (
        <div className="admin">
            <div className="admin-layout">
                <div className="admin-form">
                    <form className="auth-form" onSubmit={submit}>
                        <h3>{editingId ? 'Edit game' : 'Add game'}</h3>

                        <label>
                            Title
                            <input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                required
                            />
                        </label>

                        <label>
                            Description
                            <textarea
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </label>

                        <label>
                            Category
                            <CategorySelect
                                categories={categories}
                                value={form.categoryId}
                                onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
                            />
                        </label>

                        <label>
                            Tags (comma separated)
                            <input
                                value={form.tagsText}
                                onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                                placeholder="action, retro, singleplayer"
                            />
                        </label>

                        <DropZone
                            label={swfFile ? `Selected: ${swfFile.name}` : editingId ? 'Drop a new .swf to replace it (optional)' : 'Drop the .swf file here'}
                            accept=".swf"
                            onFiles={setSwfFile}
                        />

                        <DropZone
                            label={iconFile ? `Selected: ${iconFile.name}` : editingId ? 'Drop a new icon to replace it (optional)' : 'Drop the icon here'}
                            accept="image/*"
                            onFiles={setIconFile}
                            previewUrls={iconPreviews}
                        />

                        <DropZone
                            label={thumbFiles.length ? `${thumbFiles.length} screenshot(s) selected` : editingId ? 'Drop new screenshots to replace old ones (optional)' : 'Drop screenshots here'}
                            accept="image/*"
                            multiple
                            onFiles={setThumbFiles}
                            previewUrls={thumbPreviews}
                        />

                        {error && <p className="form-error" role="alert">! {error}</p>}
                        {success && <p className="form-ok">{success}</p>}

                        <div className="admin-form-actions">
                            <button type="submit" className="btn" disabled={busy}>
                                {busy ? 'Saving...' : editingId ? 'Save changes' : 'Add game'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={busy}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="admin-list">
                    <div className="admin-list-head">
                        <h3>All games ({games.length})</h3>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm} disabled={busy}>
                            + Add game
                        </button>
                    </div>
                    <ul>
                        {games.map((g) => (
                            <li key={g.id}>
                                <div className="admin-item-info">
                                    <strong>{g.Title}</strong>
                                    <span className="category-pill">
                                        {categories.find((c) => c.id === g.IdCategory)?.name ?? '—'}
                                    </span>
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(g)}>
                                    Edit
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirmDelete(g)}>
                                    Delete
                                </button>
                            </li>
                        ))}
                        {games.length === 0 && <li className="hint">No games yet.</li>}
                    </ul>
                </div>
            </div>

            {gameToDelete && (
                <ConfirmDialog
                    title="Delete game"
                    message={`Delete "${gameToDelete.Title}" and all its files? This cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setGameToDelete(null)}
                    busy={busy}
                />
            )}
        </div>
    )
}