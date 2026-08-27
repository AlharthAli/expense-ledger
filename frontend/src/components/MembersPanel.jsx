import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import styles from './MembersPanel.module.css'

export default function MembersPanel({ groupId, balances, onMemberAdded }) {
  const [mode, setMode] = useState('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [splitRatio, setSplitRatio] = useState('')
  const [resolved, setResolved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editRatio, setEditRatio] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Build a balance lookup from the balances prop
  const balanceMap = {}
  if (balances) {
    balances.forEach(b => { balanceMap[b.user_id] = Number(b.balance) })
  }

  const fetchMembers = useCallback(() => {
    setMembersLoading(true)
    api.getGroupMembers(groupId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setMembersLoading(false))
  }, [groupId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  function startEdit(uid, currentRatio) {
    setEditingId(uid)
    setEditRatio(String(currentRatio))
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null); setEditRatio(''); setEditError('')
  }

  async function saveEdit(uid) {
    const ratio = parseFloat(editRatio)
    if (isNaN(ratio) || ratio <= 0 || ratio > 1) {
      setEditError('Must be between 0 and 1.')
      return
    }
    setEditLoading(true); setEditError('')
    try {
      await api.updateMemberSplit(groupId, uid, ratio)
      cancelEdit()
      fetchMembers()
      onMemberAdded?.()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  function reset() {
    setName(''); setEmail(''); setSplitRatio('')
    setResolved(null); setError(''); setSuccess(false)
  }

  function switchMode(m) { setMode(m); reset() }

  async function handleAddByName(e) {
    e.preventDefault()
    const ratio = parseFloat(splitRatio)
    if (!name.trim()) { setError('Enter a name.'); return }
    if (isNaN(ratio) || ratio <= 0 || ratio > 1) {
      setError('Split ratio must be between 0 and 1 (e.g. 0.5 for 50%).')
      return
    }
    setLoading(true); setError('')
    try {
      const guest = await api.createGuestUser(name.trim())
      await api.addGroupMember(groupId, guest.user_id, ratio)
      setSuccess(true)
      reset()
      fetchMembers()
      onMemberAdded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLookup(e) {
    e.preventDefault()
    setLoading(true); setError(''); setResolved(null)
    try {
      const result = await api.lookupUser(email.trim())
      setResolved(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddResolved(e) {
    e.preventDefault()
    const ratio = parseFloat(splitRatio)
    if (isNaN(ratio) || ratio <= 0 || ratio > 1) {
      setError('Split ratio must be between 0 and 1.')
      return
    }
    setLoading(true); setError('')
    try {
      await api.addGroupMember(groupId, resolved.user_id, ratio)
      setSuccess(true)
      reset()
      fetchMembers()
      onMemberAdded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.layout}>
      {/* Current members */}
      <div className={styles.wrapper}>
        <div className={styles.tornTop} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>CURRENT MEMBERS</span>
            <span className={styles.sectionSub}>{members.length} MEMBER{members.length !== 1 ? 'S' : ''}</span>
          </div>
          <div className={styles.dash} />
          {membersLoading ? (
            <p className={styles.empty}>Loading…</p>
          ) : members.length === 0 ? (
            <p className={styles.empty}>No members yet.</p>
          ) : (
            <>
              <div className={styles.memberHeaderRow}>
                <span className={styles.colLabel}>NAME</span>
                <span className={styles.colLabel}>SPLIT / BALANCE</span>
              </div>
              {members.map(({ user_id, name: n, split_ratio }) => {
                const bal = balanceMap[user_id]
                const isEditing = editingId === user_id
                return (
                  <div key={user_id} className={styles.memberRow}>
                    <span className={styles.memberId}>{n}</span>
                    {isEditing ? (
                      <span className={styles.memberRight}>
                        <input
                          className={styles.editInput}
                          type="number"
                          min="0.01" max="1" step="0.01"
                          value={editRatio}
                          onChange={e => { setEditRatio(e.target.value); setEditError('') }}
                          autoFocus
                        />
                        <button className={styles.editSave} onClick={() => saveEdit(user_id)} disabled={editLoading}>✓</button>
                        <button className={styles.editCancel} onClick={cancelEdit}>✕</button>
                      </span>
                    ) : (
                      <span className={styles.memberRight}>
                        <button className={styles.splitBadge} onClick={() => startEdit(user_id, split_ratio)}>
                          {Math.round(split_ratio * 100)}%
                        </button>
                        {bal !== undefined && (
                          <span className={`${styles.memberBal} ${bal >= 0 ? styles.green : styles.red}`}>
                            {bal >= 0 ? '+' : ''}{bal.toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )
              })}
              {editError && <p className={styles.error}>{editError}</p>}
            </>
          )}
          <div className={styles.dash} />
          <p className={styles.hint}>Balance shown once expenses are recorded.</p>
        </div>
        <div className={styles.tornBottom} aria-hidden="true" />
      </div>

      {/* Add member */}
      <div className={styles.wrapper}>
        <div className={styles.tornTop} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>ADD MEMBER</span>
          </div>
          <div className={styles.dash} />

          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'name' ? styles.modeBtnActive : ''}`}
              type="button"
              onClick={() => switchMode('name')}
            >
              By name
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'email' ? styles.modeBtnActive : ''}`}
              type="button"
              onClick={() => switchMode('email')}
            >
              By email
            </button>
          </div>

          {mode === 'name' && (
            <form onSubmit={handleAddByName} className={styles.form}>
              <p className={styles.modeHint}>
                Type any name — they don't need a Ledger account.
              </p>
              <label className={styles.field}>
                <span className={styles.label}>NAME</span>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="e.g. John, Mum, Flatmate"
                  autoComplete="off"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>SPLIT RATIO (0 – 1)</span>
                <input
                  className={`${styles.input} ${styles.mono}`}
                  type="number"
                  min="0.01" max="1" step="0.01"
                  value={splitRatio}
                  onChange={e => { setSplitRatio(e.target.value); setError('') }}
                  placeholder="e.g. 0.5 for 50%"
                  required
                />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.successMsg}>✓ MEMBER ADDED</p>}
              <div className={styles.dash} />
              <button className={styles.btn} type="submit" disabled={loading}>
                {loading ? 'ADDING…' : 'ADD MEMBER'}
              </button>
            </form>
          )}

          {mode === 'email' && !resolved && (
            <form onSubmit={handleLookup} className={styles.form}>
              <p className={styles.modeHint}>
                Find someone who already has a Ledger account.
              </p>
              <label className={styles.field}>
                <span className={styles.label}>THEIR EMAIL</span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="friend@example.com"
                  autoComplete="off"
                  required
                />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.dash} />
              <button className={styles.btn} type="submit" disabled={loading}>
                {loading ? 'LOOKING UP…' : 'FIND USER'}
              </button>
            </form>
          )}

          {mode === 'email' && resolved && (
            <form onSubmit={handleAddResolved} className={styles.form}>
              <div className={styles.resolvedCard}>
                <span className={styles.resolvedCheck}>✓</span>
                <div>
                  <p className={styles.resolvedName}>{resolved.name}</p>
                  <p className={styles.resolvedEmail}>{email}</p>
                </div>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>SPLIT RATIO (0 – 1)</span>
                <input
                  className={`${styles.input} ${styles.mono}`}
                  type="number"
                  min="0.01" max="1" step="0.01"
                  value={splitRatio}
                  onChange={e => { setSplitRatio(e.target.value); setError('') }}
                  placeholder="e.g. 0.5 for 50%"
                  required
                />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.successMsg}>✓ MEMBER ADDED</p>}
              <div className={styles.dash} />
              <div className={styles.twoButtons}>
                <button className={styles.btnSecondary} type="button"
                  onClick={() => { setResolved(null); setError('') }}>
                  BACK
                </button>
                <button className={styles.btn} type="submit" disabled={loading}>
                  {loading ? 'ADDING…' : 'ADD MEMBER'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.dash} />
          <div className={styles.footer}>* * *</div>
        </div>
        <div className={styles.tornBottom} aria-hidden="true" />
      </div>
    </div>
  )
}
