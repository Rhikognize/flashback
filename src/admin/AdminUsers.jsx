import { useEffect, useMemo, useState } from 'react'
import { ROLES, listUsersAdmin, setUserRole, setUserBlocked, deleteUser } from './usersAdmin'
import ConfirmDialog from './ConfirmDialog'

export default function AdminUsers({ currentUserId }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [busyId, setBusyId] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [userToDelete, setUserToDelete] = useState(null)
    const [userToBlock, setUserToBlock] = useState(null)

    const reload = async () => {
        setLoading(true)
        try {
            setUsers(await listUsersAdmin())
        } catch (err) {
            console.error(err)
            setError(err.message || 'Could not load users.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { reload() }, [])

    const visibleUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users
        return users.filter((u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
    }, [users, search])

    const patchUser = (id, patch) =>
        setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)))

    const handleRoleChange = async (u, role) => {
        if (role === u.role) return
        setError('')
        setBusyId(u.id)
        try {
            await setUserRole(u.id, role)
            patchUser(u.id, { role })
        } catch (err) {
            console.error(err)
            setError(err.message || 'Could not change the role.')
        } finally {
            setBusyId(null)
        }
    }

    const applyBlock = async (u, blocked) => {
        setError('')
        setBusyId(u.id)
        try {
            await setUserBlocked(u.id, blocked)
            patchUser(u.id, { isBlocked: blocked })
        } catch (err) {
            console.error(err)
            setError(err.message || 'Could not update the user.')
        } finally {
            setBusyId(null)
        }
    }

    const handleBlockClick = (u) => {
        if (u.isBlocked) applyBlock(u, false)
        else setUserToBlock(u)
    }

    const handleConfirmBlock = async () => {
        if (!userToBlock) return
        setBusy(true)
        await applyBlock(userToBlock, true)
        setBusy(false)
        setUserToBlock(null)
    }

    const handleDelete = async () => {
        if (!userToDelete) return
        setBusy(true)
        setError('')
        try {
            await deleteUser(userToDelete.id)
            setUsers((list) => list.filter((u) => u.id !== userToDelete.id))
            setUserToDelete(null)
        } catch (err) {
            console.error(err)
            setError(err.message || 'Delete failed.')
            setUserToDelete(null)
        } finally {
            setBusy(false)
        }
    }

    if (loading) return <p className="hint">Loading...</p>

    return (
        <div className="admin">
            <div className="admin-list">
                <div className="admin-list-head">
                    <h3>All users ({users.length})</h3>
                    <input
                        className="user-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or ID"
                    />
                </div>

                {error && <p className="form-error" role="alert">! {error}</p>}

                <ul>
                    {visibleUsers.map((u) => {
                        const isSelf = u.id === currentUserId
                        const rowBusy = busyId === u.id
                        return (
                            <li key={u.id} className={u.isBlocked ? 'is-blocked' : ''}>
                                <div className="admin-item-info">
                                    <strong>
                                        {u.name}
                                        {isSelf && ' (you)'}
                                    </strong>
                                    <span>{u.id}</span>
                                </div>

                                {u.isBlocked && <span className="role-badge blocked">Blocked</span>}

                                <select
                                    className="user-role-select"
                                    value={u.role}
                                    disabled={isSelf || rowBusy}
                                    onChange={(e) => handleRoleChange(u, e.target.value)}
                                    aria-label={`Role of ${u.name}`}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={isSelf || rowBusy}
                                    onClick={() => handleBlockClick(u)}
                                >
                                    {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={isSelf || rowBusy}
                                    onClick={() => setUserToDelete(u)}
                                >
                                    Delete
                                </button>
                            </li>
                        )
                    })}
                    {visibleUsers.length === 0 && <li className="hint">No users found.</li>}
                </ul>
            </div>

            {userToBlock && (
                <ConfirmDialog
                    title="Block user"
                    message={`Block "${userToBlock.name}"? They will be logged out and won't be able to log in or leave reviews until unblocked.`}
                    confirmLabel="Block"
                    busyLabel="Blocking..."
                    onConfirm={handleConfirmBlock}
                    onCancel={() => setUserToBlock(null)}
                    busy={busy}
                />
            )}

            {userToDelete && (
                <ConfirmDialog
                    title="Delete user"
                    message={`Delete "${userToDelete.name}"? Their profile, avatar and all their reviews will be removed. This can't be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setUserToDelete(null)}
                    busy={busy}
                />
            )}
        </div>
    )
}
