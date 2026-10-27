import PageHeader from '../components/PageHeader.jsx'
import { EmptyState } from '../components/Status.jsx'

function QuestionsPage() {
  return (
    <section>
      <PageHeader
        title="Question Bank"
        description="Browse technical and behavioral interview questions."
      />
      <div className="card">
        <h2>Filters</h2>
        <p className="muted">Type, tag, difficulty and search filters will go here.</p>
      </div>
      <div className="card">
        <EmptyState message="No questions loaded yet." />
      </div>
    </section>
  )
}

export default QuestionsPage
