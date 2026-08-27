import { useState } from 'react'
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
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cost = parseFloat(form.cost)
    if (isNaN(cost) || cost <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (!form.desc.trim()) {
      setError('Description is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.createExpense(
        Number(form.group_id),
        currentUserId,
        cost,
        form.desc.trim(),
        form.date,
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

          <div className={styles.payerLine}>
            <span className={styles.label}>PAID BY</span>
            <span className={styles.payerValue}>YOU (User {currentUserId})</span>
          </div>

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
