import PageHeader from '../components/PageHeader.jsx'
import { EmptyState } from '../components/Status.jsx'

function JobsPage() {
  return (
    <section>
      <PageHeader
        title="Job Postings"
        description="Save the roles you are applying for to tailor your prep."
      />
      <div className="card">
        <EmptyState message="No job postings saved yet." />
      </div>
    </section>
  )
}

export default JobsPage
