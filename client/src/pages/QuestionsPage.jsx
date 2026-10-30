
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'

function QuestionsPage() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await get('/api/questions')
        setQuestions(data)
      } catch (err) {
        if (err.message === 'Please log in first' || err.message.includes('401')) {
          navigate('/login')
        } else {
          setError(err.message)
        }
      }
      setLoading(false)
    }

    loadQuestions()
  }, [navigate])

  return (
    <section>
      <PageHeader
        title="Question Bank"
        description="Browse technical interview questions."
      />
      {loading && <p>Loading questions...</p>}
      {error && <p className="status-error">{error}</p>}
      {!loading && !error && (
        <div>
          {questions.map((question) => (
            <div className="card" key={question.id}>
              <h3>Question {question.id}</h3>
              <p>{question.question_text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
export default QuestionsPage
