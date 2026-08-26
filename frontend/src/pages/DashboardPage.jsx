import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../auth'
import { api } from '../api'
import ReceiptCard from '../components/ReceiptCard'
import SettlementCard from '../components/SettlementCard'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = getUser()

  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [balances, setBalances] = useState(null)
  const [settlement, setSettlement] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load user's groups
  useEffect(() => {
    setGroupsLoading(true)
    api.getUserGroups(user.id)
      .then(rows => {
        // rows = [[id, name], ...]
        setGroups(rows.map(r => ({ id: r[0], name: r[1] })))
      })
      .catch(err => setError(err.message))
      .finally(() => setGroupsLoading(false))
  }, [user.id])

  const loadGroup = useCallback(async (groupId) => {
    setLoading(true)
    setError('')
    setBalances(null)
    setSettlement(null)
    setExpenses([])
    try {
      const [bal, settle, exp] = await Promise.all([
        api.getGroupBalances(groupId),
        api.getGroupSettlement(groupId),
        api.getGroupExpenses(groupId),
      ])
      setBalances(bal)
      setSettlement(settle)
      // rows = [[id, group_id, user_id, cost, description, date], ...]
      setExpenses(exp.map(r => ({
        id: r[0],
        group_id: r[1],
        user_id: r[2],
        cost: r[3],
        description: r[4],
        date: r[5],
      })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  function selectGroup(group) {
    setSelectedGroup(group)
    loadGroup(group.id)
  }

  function handleLogout() {
    clearUser()
    navigate('/auth')
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brandMark}>
            <span className={styles.brandName}>Ledger</span>
          </div>
          <div className={styles.userLine}>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        </div>

        <nav className={styles.groupNav}>
          <p className={styles.navLabel}>YOUR GROUPS</p>
          {groupsLoading ? (
            <p className={styles.navHint}>Loading…</p>
          ) : groups.length === 0 ? (
            <p className={styles.navHint}>No groups yet.</p>
          ) : (
            <ul className={styles.groupList}>
              {groups.map(g => (
                <li key={g.id}>
                  <button
                    className={`${styles.groupItem} ${selectedGroup?.id === g.id ? styles.groupItemActive : ''}`}
                    onClick={() => selectGroup(g)}
                  >
                    <span className={styles.groupItemHash}>#</span>
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {!selectedGroup ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⌗</span>
            <p className={styles.emptyTitle}>Select a group</p>
            <p className={styles.emptyHint}>Pick a group from the sidebar to view its ledger.</p>
          </div>
        ) : loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyHint}>Fetching ledger…</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p className={styles.errorMsg}>{error}</p>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.contentHeader}>
              <h1 className={styles.groupTitle}>{selectedGroup.name}</h1>
              <span className={styles.groupId}>Group #{selectedGroup.id}</span>
            </div>

            <div className={styles.panels}>
              <ReceiptCard
                groupName={selectedGroup.name}
                balances={balances}
                expenses={expenses}
                currentUserId={user.id}
              />
              <SettlementCard
                settlement={settlement}
                currentUserId={user.id}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
