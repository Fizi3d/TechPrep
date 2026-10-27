import PageHeader from '../components/PageHeader.jsx'
import { EmptyState } from '../components/Status.jsx'

function PlanPage() {
  return (
    <section>
      <PageHeader
        title="Prep Plan"
        description="A personalized practice plan built from your job postings."
      />
      <div className="card">
        <EmptyState message="No prep plan generated yet." />
      </div>
    </section>
  )
}

export default PlanPage
