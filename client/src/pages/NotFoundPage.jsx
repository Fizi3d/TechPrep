import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'

function NotFoundPage() {
  return (
    <section>
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist."
      />
      <Link to="/" className="button">
        Back to dashboard
      </Link>
    </section>
  )
}

export default NotFoundPage
