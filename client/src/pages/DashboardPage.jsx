import { useEffect, useState } from 'react'
import { get } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'

function DashboardPage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    get('/api/health')
      .then(setHealth)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Your interview prep at a glance."
      />
      <div className="grid">
        <div className="card">
          <h2>API status</h2>
          {error ? (
            <ErrorMessage message={error} />
          ) : health ? (
            <p>
              <span className="badge">{health.status}</span> {health.message}
            </p>
          ) : (
            <Loading />
          )}
        </div>
        <div className="card">
          <h2>Recent practice</h2>
          <p className="muted">Your recent attempts will show up here.</p>
        </div>
        <div className="card">
          <h2>Prep plan progress</h2>
          <p className="muted">Progress on your current plan will show up here.</p>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
