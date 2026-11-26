import { useEffect, useMemo, useState } from 'react'
import { listCategoriesAdmin, createCategory, renameCategory, deleteCategory } from './categoriesAdmin'
import ConfirmDialog from './ConfirmDialog'

export default function AdminCategories({ onDataChange }) {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingName, setEditingName] = useState('')
    const [busy, setBusy] = useState(false)
    const [addError, setAddError] = useState('')
    const [addSuccess, setAddSuccess] = useState('')
    const [listError, setListError] = useState('')
    const [categoryToDelete, setCategoryToDelete] = useState(null)
    const [search, setSearch] = useState('')

    const reload = async () => {
        setLoading(true)
        setCategories(await listCategoriesAdmin())
        setLoading(false)
    }

    useEffect(() => { reload() }, [])

    const visibleCategories = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return categories
        return categories.filter((c) => c.name.toLowerCase().includes(q))
    }, [categories, search])

    const nameTaken = (name, excludeId = null) =>
        categories.some((c) => c.id !== excludeId && c.name.toLowerCase() === name.toLowerCase())

    const submitNew = async (e) => {
        e.preventDefault()
        setAddError('')
        setAddSuccess('')
        const name = newName.trim()
        if (!name) {
            setAddError('Enter a category name.')
            return
        }
        if (nameTaken(name)) {
            setAddError('A category with this name already exists.')
            return
        }

        setBusy(true)
        try {
            await createCategory(name)
            await reload()
            await onDataChange?.()
            setAddSuccess('Category added.')
            setNewName('')
        } catch (err) {
            console.error(err)
            setAddError(err.message || 'Something went wrong.')
        } finally {
            setBusy(false)
        }
    }

    const startEdit = (c) => {
        setEditingId(c.id)
        setEditingName(c.name)
        setListError('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditingName('')
    }

    const saveEdit = async (e) => {
        e.preventDefault()
        setListError('')
        const name = editingName.trim()
        if (!name) {
            setListError('Enter a category name.')
            return
        }
        if (nameTaken(name, editingId)) {
            setListError('A category with this name already exists.')
            return
        }

        setBusy(true)
        try {
            await renameCategory(editingId, name)
            await reload()
            await onDataChange?.()
            cancelEdit()
        } catch (err) {
            console.error(err)
            setListError(err.message || 'Something went wrong.')
        } finally {
            setBusy(false)
        }
    }

    const confirmDelete = (c) => setCategoryToDelete(c)

    const handleDelete = async () => {
        if (!categoryToDelete) return
        setBusy(true)
        setListError('')
        try {
            await deleteCategory(categoryToDelete.id)
            await reload()
            await onDataChange?.()
            if (editingId === categoryToDelete.id) cancelEdit()
            setCategoryToDelete(null)
        } catch (err) {
            console.error(err)
            setListError(err.message || 'Delete failed.')
            setCategoryToDelete(null)
        } finally {
            setBusy(false)
        }
    }

    if (loading) return <p className="hint">Loading...</p>

    return (
        <div className="admin">
            <div className="admin-layout">
                <div className="admin-form">
                    <form className="auth-form" onSubmit={submitNew}>
                        <h3>Add category</h3>

                        <label>
                            Name
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Puzzle"
                            />
                        </label>

                        {addError && <p className="form-error" role="alert">! {addError}</p>}
                        {addSuccess && <p className="form-ok">{addSuccess}</p>}

                        <div className="admin-form-actions">
                            <button type="submit" className="btn" disabled={busy}>
                                {busy ? 'Saving...' : 'Add category'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="admin-list">
                    <div className="admin-list-head">
                        <h3>All categories ({categories.length})</h3>
                        <input
                            className="user-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name"
                        />
                    </div>

                    {listError && <p className="form-error" role="alert">! {listError}</p>}

                    <ul>
                        {visibleCategories.map((c) => (
                            <li key={c.id}>
                                {editingId === c.id ? (
                                    <form className="category-edit-form" onSubmit={saveEdit}>
                                        <input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="submit" className="btn btn-ghost btn-sm" disabled={busy}>
                                            Save
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={busy}>
                                            Cancel
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="admin-item-info">
                                            <strong>{c.name}</strong>
                                        </div>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>
                                            Rename
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirmDelete(c)}>
                                            Delete
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                        {visibleCategories.length === 0 && (
                            <li className="hint">{categories.length === 0 ? 'No categories yet.' : 'No categories found.'}</li>
                        )}
                    </ul>
                </div>
            </div>

            {categoryToDelete && (
                <ConfirmDialog
                    title="Delete category"
                    message={`Delete "${categoryToDelete.name}"? Games using it must be reassigned first.`}
                    onConfirm={handleDelete}
                    onCancel={() => setCategoryToDelete(null)}
                    busy={busy}
                />
            )}
        </div>
    )
}