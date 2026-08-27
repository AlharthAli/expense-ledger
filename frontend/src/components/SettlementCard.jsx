import { useState } from 'react'
import { api } from '../api'
import styles from './SettlementCard.module.css'

function fmt(n) {
  return Number(n).toFixed(2)
}

export default function SettlementCard({ settlement, currentUserId, groupId, onSettled }) {
  const [settlingIdx, setSettlingIdx] = useState(null)
  const [settledIdx, setSettledIdx] = useState(null)
  const [settleError, setSettleError] = useState('')

  if (!settlement) return null

  const { settlement: txns } = settlement

  if (!txns || txns.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>SETTLEMENT</span>
        </div>
        <div className={styles.settled}>
          <span className={styles.settledIcon}>✓</span>
          <p className={styles.settledMsg}>All settled up</p>
          <p className={styles.settledSub}>No outstanding debts in this group.</p>
        </div>
      </div>
    )
  }

  const myTxns = txns.filter(
    t => t.from_user === currentUserId || t.to_user === currentUserId
  )
  const otherTxns = txns.filter(
    t => t.from_user !== currentUserId && t.to_user !== currentUserId
  )

  async function handleSettle(t, idx) {
    setSettlingIdx(idx)
    setSettleError('')
    try {
      await api.settle(groupId, t.from_user, t.to_user, t.amount)
      setSettledIdx(idx)
      setTimeout(() => {
        setSettledIdx(null)
        onSettled?.()
      }, 900)
    } catch (err) {
      setSettleError(err.message)
    } finally {
      setSettlingIdx(null)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>SETTLEMENT PLAN</span>
        <span className={styles.subtitle}>{txns.length} payment{txns.length !== 1 ? 's' : ''} needed</span>
      </div>
      <div className={styles.dash} />

      {myTxns.length > 0 && (
        <>
          <p className={styles.sectionLabel}>INVOLVES YOU</p>
          {myTxns.map((t, i) => {
            const youPay = t.from_user === currentUserId
            const isSettling = settlingIdx === i
            const isSettled = settledIdx === i
            return (
              <div
                key={i}
                className={`${styles.txn} ${youPay ? styles.txnOwe : styles.txnOwed}`}
              >
                <div className={styles.txnArrow}>
                  <span className={styles.txnDirection}>
                    {youPay ? 'YOU PAY' : 'YOU RECEIVE'}
                  </span>
                  <span className={`${styles.txnAmt} ${youPay ? styles.red : styles.green}`}>
                    ${fmt(t.amount)}
                  </span>
                </div>
                <div className={styles.txnBottom}>
                  <span className={styles.txnParties}>
                    {youPay ? `→ ${t.to_name}` : `← ${t.from_name}`}
                  </span>
                  <button
                    className={`${styles.settleBtn} ${isSettled ? styles.settleBtnDone : ''}`}
                    onClick={() => handleSettle(t, i)}
                    disabled={isSettling || isSettled}
                  >
                    {isSettled ? '✓ DONE' : isSettling ? '…' : youPay ? 'SETTLE UP' : 'MARK RECEIVED'}
                  </button>
                </div>
              </div>
            )
          })}
          {settleError && <p className={styles.settleError}>{settleError}</p>}
          <div className={styles.dash} />
        </>
      )}

      {otherTxns.length > 0 && (
        <>
          <p className={styles.sectionLabel}>OTHER PAYMENTS</p>
          {otherTxns.map((t, i) => (
            <div key={i} className={`${styles.txn} ${styles.txnNeutral}`}>
              <div className={styles.txnArrow}>
                <span className={styles.txnDirection}>
                  {t.from_name} → {t.to_name}
                </span>
                <span className={styles.txnAmt}>${fmt(t.amount)}</span>
              </div>
            </div>
          ))}
        </>
      )}

      <div className={styles.dash} />
      <p className={styles.hint}>
        Minimum transactions to settle all debts.
      </p>
    </div>
  )
}
