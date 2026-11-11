import { useEffect, useState } from 'react'
import { DIFFICULTIES, QUESTION_TYPES } from '../constants/questions.js'

const SEARCH_DELAY_MS = 300

function QuestionFilters({ filters, tags, onChange, onClear }) {
  // Keep the search box responsive and only update the URL once typing pauses
  const [searchText, setSearchText] = useState(filters.search)
  const [syncedSearch, setSyncedSearch] = useState(filters.search)

  // When the URL's search changes from outside (e.g. Clear filters), reset the box to match
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search)
    setSearchText(filters.search)
  }

  useEffect(() => {
    if (searchText.trim() === filters.search) {
      return
    }
    const timer = setTimeout(() => onChange({ search: searchText.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchText, filters.search, onChange])

  // Keep a selected tag visible even if the tags list doesn't include it
  const tagOptions = filters.tag && !tags.includes(filters.tag) ? [filters.tag, ...tags] : tags
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="card filters">
      <label className="filter-search">
        Search
        <input
          type="search"
          placeholder="Search question text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </label>
      <label>
        Type
        <select value={filters.type} onChange={(e) => onChange({ type: e.target.value })}>
          <option value="">All types</option>
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Difficulty
        <select value={filters.difficulty} onChange={(e) => onChange({ difficulty: e.target.value })}>
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
      </label>
      {tagOptions.length > 0 && (
        <label>
          Tag
          <select value={filters.tag} onChange={(e) => onChange({ tag: e.target.value })}>
            <option value="">All tags</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="button" className="button button-secondary" onClick={onClear} disabled={!hasFilters}>
        Clear filters
      </button>
    </div>
  )
}

export default QuestionFilters
