import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { saveUser } from '../auth'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const res = await api.signup(form.name, form.email, form.password)
        if (res.message !== 'User created successfully') {
          setError(res.message || 'Signup failed')
          setLoading(false)
          return
        }
        // After signup, log them in
      }
      const res = await api.login(form.email, form.password)
      if (!res.user_id) {
        setError(res.message || 'Invalid credentials')
        setLoading(false)
        return
      }
      saveUser({ id: res.user_id, email: form.email, name: form.name || form.email })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wordmark}>
        <span className={styles.wordmarkText}>Ledger</span>
        <span className={styles.wordmarkRule} aria-hidden="true" />
        <span className={styles.wordmarkSub}>split expenses honestly</span>
      </div>

      <div className={styles.card}>
        {/* torn-top edge */}
        <div className={styles.tornTop} aria-hidden="true" />

        <div className={styles.cardInner}>
          <div className={styles.receiptHeader}>
            <span className={styles.receiptTitle}>
              {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </span>
            <span className={styles.receiptDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
          </div>
          <div className={styles.dividerDash} aria-hidden="true" />

          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'signup' && (
              <label className={styles.field}>
                <span className={styles.label}>NAME</span>
                <input
                  className={styles.input}
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </label>
            )}
            <label className={styles.field}>
              <span className={styles.label}>EMAIL</span>
              <input
                className={styles.input}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>PASSWORD</span>
              <input
                className={styles.input}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.dividerDash} aria-hidden="true" />

            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? 'PROCESSING…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className={styles.dividerDash} aria-hidden="true" />
          <button
            className={styles.switchLink}
            type="button"
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          <div className={styles.receiptFooter}>
            <span>* * *</span>
          </div>
        </div>

        {/* torn-bottom edge */}
        <div className={styles.tornBottom} aria-hidden="true" />
      </div>
    </div>
  )
}
