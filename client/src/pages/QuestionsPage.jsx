import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { get } from '../api/client.js'
import PageHeader from '../components/PageHeader.jsx'
import Pagination from '../components/Pagination.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import QuestionFilters from '../components/QuestionFilters.jsx'
import { EmptyState, ErrorMessage, Loading } from '../components/Status.jsx'

const FILTER_KEYS = ['search', 'type', 'difficulty', 'tag']
const PAGE_SIZE = 20

function QuestionsPage() {
  // Filters and page live in the URL so refresh, back and shared links keep them
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || '']))
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1)

  // Each response remembers which query it answered, so a query with no response yet is loading
  const [response, setResponse] = useState({ query: null, data: null, error: '' })
  const [tags, setTags] = useState([])
  const navigate = useNavigate()

  // Only pass known, cleaned-up params to the API
  const apiParams = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    if (filters[key]) {
      apiParams.set(key, filters[key])
    }
  }
  apiParams.set('page', page)
  apiParams.set('limit', PAGE_SIZE)
  const apiQuery = apiParams.toString()

  const loading = response.query !== apiQuery
  const result = response.data
  const error = loading ? '' : response.error

  useEffect(() => {
    // Ignore responses from older requests if the filters changed in the meantime
    let ignore = false

    get(`/api/questions?${apiQuery}`)
      .then((data) => {
        if (!ignore) setResponse({ query: apiQuery, data, error: '' })
      })
      .catch((err) => {
        if (ignore) return
        if (err.status === 401) {
          navigate('/login')
        } else {
          setResponse({ query: apiQuery, data: null, error: err.message })
        }
      })

    return () => {
      ignore = true
    }
  }, [apiQuery, navigate])

  useEffect(() => {
    // The tag dropdown is optional: without the tags API it stays hidden
    get('/api/tags')
      .then((data) => setTags((data?.tags || []).map((tag) => tag.name)))
      .catch(() => setTags([]))
  }, [])

  const updateFilters = useCallback(
    (changes) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        }
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => setSearchParams({}), [setSearchParams])

  function goToPage(nextPage) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextPage > 1) {
        next.set('page', nextPage)
      } else {
        next.delete('page')
      }
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderResults() {
    if (error) {
      return <ErrorMessage message={error} />
    }
    if (!result) {
      return <Loading message="Loading questions..." />
    }
    if (result.total === 0) {
      return (
        <div className="card empty-results">
          <EmptyState message="No questions match these filters." />
          <button type="button" className="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )
    }
    if (result.questions.length === 0) {
      return (
        <div className="card empty-results">
          <EmptyState message="This page is past the end of the results." />
          <button type="button" className="button" onClick={() => goToPage(1)}>
            Back to page 1
          </button>
        </div>
      )
    }

    const first = (result.page - 1) * result.limit + 1
    const last = first + result.questions.length - 1

    return (
      <div className={loading ? 'results is-loading' : 'results'}>
        <p className="muted result-count">
          Showing {first}–{last} of {result.total} questions
        </p>
        {result.questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onTagClick={(tag) => updateFilters({ tag })}
          />
        ))}
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={goToPage} />
      </div>
    )
  }

  return (
    <section>
      <PageHeader
        title="Question Bank"
        description="Browse technical and behavioral interview questions."
      />
      <QuestionFilters
        filters={filters}
        tags={tags}
        onChange={updateFilters}
        onClear={clearFilters}
      />
      {renderResults()}
    </section>
  )
}

export default QuestionsPage
