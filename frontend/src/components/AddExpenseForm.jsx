import { useState, useEffect } from 'react'
import { api } from '../api'
import styles from './AddExpenseForm.module.css'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AddExpenseForm({ groups, defaultGroupId, currentUserId, onSuccess }) {
  const [form, setForm] = useState({
    group_id: defaultGroupId ?? (groups[0]?.id ?? ''),
    cost: '',
    desc: '',
    date: todayISO(),
    paid_by: currentUserId,
  })
  const [members, setMembers] = useState([])
  // splits: { [user_id]: ratio_string }
  const [splits, setSplits] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch members whenever group changes
  useEffect(() => {
    if (!form.group_id) return
    api.getGroupMembers(Number(form.group_id)).then(ms => {
      setMembers(ms)
      // Initialise splits from each member's default ratio
      const init = {}
      ms.forEach(m => { init[m.user_id] = String(m.split_ratio) })
      setSplits(init)
    }).catch(() => {})
  }, [form.group_id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
    setSuccess(false)
  }

  function handleSplitChange(uid, val) {
    setSplits(s => ({ ...s, [uid]: val }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cost = parseFloat(form.cost)
    if (isNaN(cost) || cost <= 0) { setError('Enter a valid amount greater than zero.'); return }
    if (!form.desc.trim()) { setError('Description is required.'); return }

    // Validate splits
    for (const m of members) {
      const r = parseFloat(splits[m.user_id])
      if (isNaN(r) || r < 0 || r > 1) {
        setError(`Split ratio for ${m.name} must be between 0 and 1.`)
        return
      }
    }

    const splitsPayload = members.map(m => ({
      user_id: m.user_id,
      split_ratio: parseFloat(splits[m.user_id] ?? m.split_ratio),
    }))

    setLoading(true)
    setError('')
    try {
      await api.createExpense(
        Number(form.group_id),
        Number(form.paid_by),
        cost,
        form.desc.trim(),
        form.date,
        splitsPayload,
      )
      setSuccess(true)
      setForm(f => ({ ...f, cost: '', desc: '', date: todayISO() }))
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const paidByMember = members.find(m => m.user_id === Number(form.paid_by))

  return (
    <div className={styles.wrapper}>
      <div className={styles.tornTop} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.receiptHeader}>
          <span className={styles.receiptTitle}>NEW EXPENSE</span>
          <span className={styles.receiptDate}>{todayISO()}</span>
        </div>
        <div className={styles.dash} />

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>GROUP</span>
            <select
              className={styles.input}
              name="group_id"
              value={form.group_id}
              onChange={handleChange}
              required
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>AMOUNT ($)</span>
            <input
              className={`${styles.input} ${styles.mono}`}
              name="cost"
              type="number"
              min="0.01"
              step="0.01"
              value={form.cost}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>DESCRIPTION</span>
            <input
              className={styles.input}
              name="desc"
              type="text"
              value={form.desc}
              onChange={handleChange}
              placeholder="e.g. Dinner, Hotel, Gas"
              autoComplete="off"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>DATE</span>
            <input
              className={`${styles.input} ${styles.mono}`}
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>PAID BY</span>
            <select
              className={styles.input}
              name="paid_by"
              value={form.paid_by}
              onChange={handleChange}
              required
            >
              {members.length === 0 && (
                <option value={currentUserId}>You</option>
              )}
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_id === currentUserId ? `${m.name} (you)` : m.name}
                </option>
              ))}
            </select>
          </label>

          {members.length > 0 && (
            <div className={styles.splitsSection}>
              <span className={styles.label}>SPLIT RATIOS</span>
              <div className={styles.splitHint}>
                What fraction of this expense each person owes — not who paid.
                e.g. set both to 0.5 for a 50/50 split.
              </div>
              {members.map(m => (
                <div key={m.user_id} className={styles.splitRow}>
                  <span className={styles.splitName}>
                    {m.name}{m.user_id === currentUserId ? ' (you)' : ''}
                  </span>
                  <input
                    className={`${styles.splitInput} ${styles.mono}`}
                    type="number"
                    min="0" max="1" step="0.01"
                    value={splits[m.user_id] ?? ''}
                    onChange={e => handleSplitChange(m.user_id, e.target.value)}
                    placeholder="0.5"
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>✓ EXPENSE RECORDED</p>}

          <div className={styles.dash} />

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'RECORDING…' : 'RECORD EXPENSE'}
          </button>
        </form>

        <div className={styles.dash} />
        <div className={styles.footer}>* * *</div>
      </div>

      <div className={styles.tornBottom} aria-hidden="true" />
    </div>
  )
}
