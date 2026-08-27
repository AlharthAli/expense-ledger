import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../auth'
import { api } from '../api'
import ReceiptCard from '../components/ReceiptCard'
import SettlementCard from '../components/SettlementCard'
import ExpenseFeed from '../components/ExpenseFeed'
import AddExpenseForm from '../components/AddExpenseForm'
import MembersPanel from '../components/MembersPanel'
import styles from './DashboardPage.module.css'

const TABS = [
  { id: 'overview',     label: 'OVERVIEW' },
  { id: 'feed',         label: 'EXPENSES' },
  { id: 'add-expense',  label: 'ADD EXPENSE' },
  { id: 'members',      label: 'MEMBERS' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = getUser()

  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const [balances, setBalances] = useState(null)
  const [settlement, setSettlement] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLoading, setNewGroupLoading] = useState(false)
  const [newGroupError, setNewGroupError] = useState('')

  useEffect(() => {
    setGroupsLoading(true)
    api.getUserGroups(user.id)
      .then(rows => setGroups(rows.map(r => ({ id: r[0], name: r[1] }))))
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
      setExpenses(exp.map(r => ({
        id: r[0], group_id: r[1], user_id: r[2],
        cost: r[3], description: r[4], date: r[5],
      })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  function selectGroup(group) {
    setSelectedGroup(group)
    setActiveTab('overview')
    loadGroup(group.id)
  }

  // Called by AddExpenseForm after a successful post
  function handleExpenseAdded() {
    loadGroup(selectedGroup.id)
    setActiveTab('feed')
  }

  // Called by MembersPanel after a successful add
  function handleMemberAdded() {
    loadGroup(selectedGroup.id)
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    setNewGroupLoading(true)
    setNewGroupError('')
    try {
      // POST /groups returns no ID. Infer it: the DB uses a serial PK so the
      // new group's ID will be max(all known group IDs across user's memberships) + 1.
      // We snapshot all current groups first, including any the user is already in.
      const allKnownIds = groups.map(g => g.id)
      const guessedId = allKnownIds.length > 0 ? Math.max(...allKnownIds) + 1 : 1

      await api.createGroup(name)
      // Add creator as member so the group appears in their list
      await api.addGroupMember(guessedId, user.id, 1.0)

      // Refetch groups — new group now shows up because user is a member
      const rows = await api.getUserGroups(user.id)
      const updated = rows.map(r => ({ id: r[0], name: r[1] }))
      setGroups(updated)

      const newGroup = updated.find(g => g.id === guessedId)
      setShowNewGroup(false)
      setNewGroupName('')
      if (newGroup) selectGroup(newGroup)
    } catch (err) {
      setNewGroupError(err.message)
    } finally {
      setNewGroupLoading(false)
    }
  }

  function handleLogout() {
    clearUser()
    navigate('/auth')
  }

  return (
    <div className={styles.layout}>
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

        {/* Create group */}
        {showNewGroup ? (
          <form onSubmit={handleCreateGroup} className={styles.newGroupForm}>
            <input
              className={styles.newGroupInput}
              value={newGroupName}
              onChange={e => { setNewGroupName(e.target.value); setNewGroupError('') }}
              placeholder="Group name"
              autoFocus
              required
            />
            {newGroupError && <p className={styles.newGroupError}>{newGroupError}</p>}
            <div className={styles.newGroupActions}>
              <button className={styles.newGroupSubmit} type="submit" disabled={newGroupLoading}>
                {newGroupLoading ? '…' : 'Create'}
              </button>
              <button
                className={styles.newGroupCancel}
                type="button"
                onClick={() => { setShowNewGroup(false); setNewGroupName(''); setNewGroupError('') }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className={styles.newGroupBtn} onClick={() => setShowNewGroup(true)}>
            + New group
          </button>
        )}

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </aside>

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
              <div className={styles.contentTitleRow}>
                <h1 className={styles.groupTitle}>{selectedGroup.name}</h1>
                <span className={styles.groupId}>Group #{selectedGroup.id}</span>
              </div>

              <nav className={styles.tabBar}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'overview' && (
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
              )}

              {activeTab === 'feed' && (
                <ExpenseFeed expenses={expenses} currentUserId={user.id} />
              )}

              {activeTab === 'add-expense' && (
                <AddExpenseForm
                  groups={groups}
                  defaultGroupId={selectedGroup.id}
                  currentUserId={user.id}
                  onSuccess={handleExpenseAdded}
                />
              )}

              {activeTab === 'members' && (
                <MembersPanel
                  groupId={selectedGroup.id}
                  balances={balances}
                  onMemberAdded={handleMemberAdded}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
