import PageHeader from '../components/PageHeader.jsx'

// Placeholder form; wiring it to the auth API is T07.
function LoginPage() {
  return (
    <section className="narrow">
      <PageHeader title="Log in" description="Sign in to continue your prep." />
      <form className="card form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input type="password" name="password" />
        </label>
        <button type="submit" className="button" disabled>
          Log in
        </button>
        <p className="muted">Login is not connected yet.</p>
      </form>
    </section>
  )
}

export default LoginPage
