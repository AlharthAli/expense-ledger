import styles from './DriftBanner.module.css'

export default function DriftBanner({ drift }) {
  if (!drift || !drift.drift_detected) return null

  const isOver = drift.direction === 'overpaying'
  const drifts = drift.recent_drifts || []
  const maxAbs = Math.max(...drifts.map(d => Math.abs(d)), 1)

  return (
    <div className={`${styles.banner} ${isOver ? styles.bannerGreen : styles.bannerRed}`}>
      <div className={styles.left}>
        <span className={`${styles.arrow} ${isOver ? styles.arrowGreen : styles.arrowRed}`}>
          {isOver ? '↑' : '↓'}
        </span>
        <div className={styles.text}>
          <span className={styles.label}>
            FAIRNESS DRIFT — {isOver ? 'OVERPAYING' : 'UNDERPAYING'}
          </span>
          <p className={styles.reason}>{drift.reason}</p>
        </div>
      </div>

      {drifts.length > 0 && (
        <div className={styles.sparks} aria-hidden="true">
          {drifts.map((d, i) => (
            <div
              key={i}
              className={`${styles.spark} ${d >= 0 ? styles.sparkGreen : styles.sparkRed}`}
              style={{ height: `${Math.max(3, (Math.abs(d) / maxAbs) * 24)}px` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
