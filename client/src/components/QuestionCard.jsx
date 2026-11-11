import { typeLabel } from '../constants/questions.js'

function QuestionCard({ question, onTagClick }) {
  return (
    <article className="card question-card">
      <div className="question-meta">
        {question.difficulty && (
          <span className={`badge badge-${question.difficulty}`}>{question.difficulty}</span>
        )}
        <span className="muted">{typeLabel(question.question_type)}</span>
      </div>
      <p className="question-text">{question.question_text}</p>
      {question.tags.length > 0 && (
        <div className="tag-list">
          {question.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-chip"
              title={`Show questions tagged ${tag}`}
              onClick={() => onTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

export default QuestionCard
