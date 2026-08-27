import { useState } from 'react'
import { api } from '../api'
import styles from './MembersPanel.module.css'

export default function MembersPanel({ groupId, balances, onMemberAdded }) {
  const [form, setForm] = useState({ user_id: '', split_ratio: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // balances is [{user_id, name, balance}] from the updated API
  const members = balances
    ? balances.map(b => ({ uid: b.user_id, name: b.name, bal: Number(b.balance) }))
    : []

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const userId = parseInt(form.user_id, 10)
    const ratio = parseFloat(form.split_ratio)

    if (isNaN(userId) || userId <= 0) {
      setError('Enter a valid user ID.')
      return
    }
    if (isNaN(ratio) || ratio <= 0 || ratio > 1) {
      setError('Split ratio must be between 0 and 1 (e.g. 0.5 for 50%).')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.addGroupMember(groupId, userId, ratio)
      setSuccess(true)
      setForm({ user_id: '', split_ratio: '' })
      onMemberAdded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.layout}>
      {/* Current members list */}
      <div className={styles.wrapper}>
        <div className={styles.tornTop} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>CURRENT MEMBERS</span>
            <span className={styles.sectionSub}>{members.length} MEMBER{members.length !== 1 ? 'S' : ''}</span>
          </div>
          <div className={styles.dash} />

          {members.length === 0 ? (
            <p className={styles.empty}>No members with recorded activity.</p>
          ) : (
            <>
              <div className={styles.memberHeaderRow}>
                <span className={styles.colLabel}>USER</span>
                <span className={styles.colLabel}>NET BALANCE</span>
              </div>
              {members.map(({ uid, name, bal }) => (
                <div key={uid} className={styles.memberRow}>
                  <span className={styles.memberId}>{name}</span>
                  <span className={`${styles.memberBal} ${bal >= 0 ? styles.green : styles.red}`}>
                    {bal >= 0 ? '+' : ''}{bal.toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className={styles.dash} />
          <p className={styles.hint}>
            Members shown are those with recorded expenses or splits.
          </p>
        </div>
        <div className={styles.tornBottom} aria-hidden="true" />
      </div>

      {/* Add member form */}
      <div className={styles.wrapper}>
        <div className={styles.tornTop} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>ADD MEMBER</span>
          </div>
          <div className={styles.dash} />

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>USER ID</span>
              <input
                className={`${styles.input} ${styles.mono}`}
                name="user_id"
                type="number"
                min="1"
                step="1"
                value={form.user_id}
                onChange={handleChange}
                placeholder="e.g. 4"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>SPLIT RATIO (0 – 1)</span>
              <input
                className={`${styles.input} ${styles.mono}`}
                name="split_ratio"
                type="number"
                min="0.01"
                max="1"
                step="0.01"
                value={form.split_ratio}
                onChange={handleChange}
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

          <div className={styles.dash} />
          <div className={styles.footer}>* * *</div>
        </div>
        <div className={styles.tornBottom} aria-hidden="true" />
      </div>
    </div>
  )
}
