import PageHeader from '../components/PageHeader.jsx'

function AdminPage() {
  return (
    <section>
      <PageHeader
        title="Admin"
        description="Manage questions, tags and users."
      />
      <div className="grid">
        <div className="card">
          <h2>Questions</h2>
          <p className="muted">Create, edit and delete questions.</p>
        </div>
        <div className="card">
          <h2>Tags</h2>
          <p className="muted">Manage the tag taxonomy.</p>
        </div>
      </div>
    </section>
  )
}

export default AdminPage
