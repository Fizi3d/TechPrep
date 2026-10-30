import { useState, useEffect } from 'react'
import { get, post } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'

function LoginPage() {
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    async function checkLogin() {
      try {
        const result = await get('/api/me')
        setUser(result.user)
      } catch (err) {
        setUser(null)
      }
      setCheckingSession(false)
    }
    checkLogin()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    const form = e.currentTarget
    const data = new FormData(form)
    const email = data.get('email').trim().toLowerCase()
    const password = data.get('password')
    const username = register ? data.get('username').trim().toLowerCase() : ''

    if (register) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }

      if (password !== data.get('confirmPassword')) {
        setError('Passwords do not match.')
        return
      }
    }
    setLoading(true)

    try {
      const url = register ? '/api/register' : '/api/login'

      if (register) {
        const result = await post(url, { username, email, password })
        setUser(result.user)
        setMessage('Account created successfully!')
      } else {
        const result = await post(url, { email, password })
        setUser(result.user)
        setMessage('Logged in successfully!')
      }
      form.reset()
    } catch (err) {
      if (err.message === 'Email already exists') {
        setError('Email already registered. Try logging in.')
      } else if (err.message === 'Username already exists') {
        setError('Username already taken. Try another one.')
      } else if (err.message === 'Invalid username/email or password' || err.message === 'Invalid email or password') {
        setError('Incorrect username/email or password.')
      } else {
        setError(err.message)
      }
    }
    setLoading(false)
  }
  async function handleLogout() {
    setError('')
    setLoading(true)

    try {
      await post('/api/logout')
      setUser(null)
      setRegister(false)
      setMessage('Logged out successfully!')
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }
  function switchForm() {
    setRegister(!register)
    setError('')
    setMessage('')
  }

  return (
    <section className="narrow">
      <PageHeader
        title={user ? 'My Account' : register ? 'Create Account' : 'Log in'}
        description="Welcome to TechPrep."
      />
      {checkingSession && <p>Checking login...</p>}
      {user && !checkingSession && (
        <div className="card">
          <h2>Welcome, {user.username || user.email}!</h2>
          <p>{message || 'You are logged in to TechPrep.'}</p>

          {error && <p className="status-error">{error}</p>}
          <button
            className="button"
            type="button"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      )}

      {!user && !checkingSession && (
        <form className="card form" onSubmit={handleSubmit}>
          {register && (
            <label>
              Username
              <input
                type="text"
                name="username"
                minLength="3"
                maxLength="30"
                pattern="[a-zA-Z0-9_]+"
                required
              />
            </label>
          )}
          <label>
            {register ? 'Email' : 'Username or Email'}
            <input type={register ? 'email' : 'text'} name="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>

          {register && (
            <label>
              Confirm Password
              <input type="password" name="confirmPassword" required />
            </label>
          )}
          {error && <p className="status-error">{error}</p>}
          {message && <p className="badge">{message}</p>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : register ? 'Create Account' : 'Log in'}
          </button>
          <button className="button" type="button" onClick={switchForm}>
            {register ? 'Already have an account? Log in' : 'New user? Create Account'}
          </button>
        </form>
      )}
    </section>
  )
}
export default LoginPage
