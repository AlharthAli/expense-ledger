import styles from './ExpenseFeed.module.css'

function fmt(n) {
  return Number(n).toFixed(2)
}

function formatDate(raw) {
  if (!raw) return ''
  // raw may be "2026-08-20" or a full datetime string
  const d = new Date(raw)
  if (isNaN(d)) return String(raw)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

export default function ExpenseFeed({ expenses, currentUserId }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyMsg}>No expenses recorded yet.</p>
      </div>
    )
  }

  // Sort newest first
  const sorted = [...expenses].sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date)
    return db - da || b.id - a.id
  })

  return (
    <div className={styles.wrapper}>
      {/* torn top */}
      <div className={styles.tornTop} aria-hidden="true" />

      <div className={styles.feed}>
        <div className={styles.feedHeader}>
          <span className={styles.feedTitle}>EXPENSE RECORD</span>
          <span className={styles.feedCount}>{expenses.length} ENTRIES</span>
        </div>
        <div className={styles.dash} />

        {sorted.map((exp, i) => {
          const isMe = exp.user_id === currentUserId
          return (
            <div key={exp.id} className={styles.entry}>
              <div className={styles.entryTop}>
                <span className={styles.entryDesc}>
                  {exp.description.toUpperCase()}
                </span>
                <span className={styles.entryCost}>${fmt(exp.cost)}</span>
              </div>
              <div className={styles.entryMeta}>
                <span className={styles.entryDate}>{formatDate(exp.date)}</span>
                <span className={`${styles.entryPayer} ${isMe ? styles.entryPayerMe : ''}`}>
                  {isMe ? 'YOU' : `USER ${exp.user_id}`}
                </span>
              </div>
              {i < sorted.length - 1 && (
                <div className={styles.entryRule} aria-hidden="true" />
              )}
            </div>
          )
        })}

        <div className={styles.dash} />
        <div className={styles.total}>
          <span className={styles.totalLabel}>TOTAL</span>
          <span className={styles.totalAmt}>
            ${expenses.reduce((s, e) => s + Number(e.cost), 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* torn bottom */}
      <div className={styles.tornBottom} aria-hidden="true" />
    </div>
  )
}
