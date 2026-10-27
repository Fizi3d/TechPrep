// Reusable states for pages that load data from the API.

export function Loading({ message = 'Loading...' }) {
  return <p className="status">{message}</p>
}

export function ErrorMessage({ message = 'unable to load data' }) {
  return <p className="status status-error">Error: {message}</p>
}

export function EmptyState({ message = 'Nothing here yet.' }) {
  return <p className="status">{message}</p>
}
