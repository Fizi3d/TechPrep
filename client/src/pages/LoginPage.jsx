
import { useState } from 'react'
import { post } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'

function LoginPage() {
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    // Get the email and password from the form
    const form = e.currentTarget
    const data = new FormData(form)
    const email = data.get('email').trim().toLowerCase()
    const password = data.get('password')

    // Check password when creating an account
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
      // Use the correct API for login or registration
      const url = register ? '/api/register' : '/api/login'

      await post(url, { email, password })

      if (register) {
        setMessage('Account created successfully!')
      } else {
        setMessage('Logged in successfully!')
      }

      form.reset()

    } catch (err) {
      if (err.message === 'Email already exists') {
        setError('Email already registered. Try logging in.')
      } else if (err.message === 'Invalid email or password') {
        setError('Incorrect email or password.')
      } else {
        setError(err.message)
      }
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
        title={register ? 'Create Account' : 'Log in'}
        description="Welcome to TechPrep."
      />

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" required />
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
    </section>
  )
}

export default LoginPage
