import styles from './ReceiptCard.module.css'

function fmt(n) {
  return Math.abs(n).toFixed(2)
}

function pad(str, width) {
  const s = String(str)
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

// balances is now [{user_id, name, balance}]
export default function ReceiptCard({ groupName, balances, expenses, currentUserId }) {
  if (!balances) return null

  const entries = balances.map(b => ({
    uid:  b.user_id,
    name: b.name,
    bal:  Number(b.balance),
  }))

  const myEntry = balances.find(b => b.user_id === currentUserId)
  const myBalance = myEntry !== undefined ? Number(myEntry.balance) : null

  const totalSpend = expenses.reduce((s, e) => s + Number(e.cost), 0)

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase()
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className={styles.wrapper}>
      {/* torn top */}
      <div className={styles.tornTop} aria-hidden="true" />

      <div className={styles.receipt}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.storeName}>LEDGER</div>
          <div className={styles.storeTagline}>EXPENSE RECORD</div>
          <div className={styles.meta}>
            <span>{dateStr}</span>
            <span>{timeStr}</span>
          </div>
        </div>

        <div className={styles.dash} />

        {/* Group info */}
        <div className={styles.row}>
          <span className={styles.rowLabel}>GROUP</span>
          <span className={styles.rowValue}>{groupName.toUpperCase()}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>MEMBERS</span>
          <span className={styles.rowValue}>{entries.length}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>TRANSACTIONS</span>
          <span className={styles.rowValue}>{expenses.length}</span>
        </div>

        <div className={styles.dash} />

        {/* Expense line items */}
        {expenses.length > 0 && (
          <>
            <div className={styles.sectionLabel}>RECENT EXPENSES</div>
            {expenses.slice(-8).map(exp => (
              <div key={exp.id} className={styles.lineItem}>
                <div className={styles.lineItemDesc}>
                  {exp.description.slice(0, 22).toUpperCase()}
                </div>
                <div className={styles.lineItemRight}>
                  <span className={styles.lineItemCost}>${fmt(exp.cost)}</span>
                </div>
              </div>
            ))}
            <div className={styles.dash} />
          </>
        )}

        {/* Total */}
        <div className={`${styles.row} ${styles.totalRow}`}>
          <span className={styles.totalLabel}>TOTAL SPEND</span>
          <span className={styles.totalAmount}>${totalSpend.toFixed(2)}</span>
        </div>

        <div className={styles.dash} />
        <div className={styles.sectionLabel}>MEMBER BALANCES</div>

        {/* Balance per member */}
        {entries.map(({ uid, name, bal }) => {
          const isMe = uid === currentUserId
          const positive = bal >= 0
          return (
            <div
              key={uid}
              className={`${styles.balanceRow} ${isMe ? styles.balanceRowMe : ''}`}
            >
              <span className={styles.balanceUid}>
                {isMe ? `▶ ${name.toUpperCase()}` : name.toUpperCase()}
              </span>
              <span className={`${styles.balanceAmt} ${positive ? styles.green : styles.red}`}>
                {positive ? '+' : '-'}${fmt(bal)}
              </span>
            </div>
          )
        })}

        <div className={styles.dash} />

        {/* My net */}
        {myBalance !== null && (
          <div className={styles.myNet}>
            <span className={styles.myNetLabel}>YOUR NET</span>
            <div className={`${styles.myNetAmt} ${myBalance >= 0 ? styles.greenBig : styles.redBig}`}>
              {myBalance >= 0 ? '+' : '-'}${fmt(myBalance)}
            </div>
            <div className={`${styles.myNetStatus} ${myBalance >= 0 ? styles.greenLabel : styles.redLabel}`}>
              {myBalance > 0.01
                ? 'YOU ARE OWED MONEY'
                : myBalance < -0.01
                ? 'YOU OWE MONEY'
                : 'ALL SETTLED UP'}
            </div>
          </div>
        )}

        <div className={styles.dash} />
        <div className={styles.footer}>
          <div>* * * THANK YOU * * *</div>
          <div className={styles.footerSmall}>KEEP THIS RECEIPT FOR YOUR RECORDS</div>
        </div>
      </div>

      {/* torn bottom */}
      <div className={styles.tornBottom} aria-hidden="true" />
    </div>
  )
}
