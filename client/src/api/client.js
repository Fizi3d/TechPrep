// Shared wrapper around fetch for talking to the Express API.
// In dev VITE_API_URL is blank and Vite proxies /api to the server.
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
  }
  return data
}

export const get = (endpoint) => request(endpoint)
export const post = (endpoint, payload) =>
  request(endpoint, { method: 'POST', body: payload })
export const put = (endpoint, payload) =>
  request(endpoint, { method: 'PUT', body: payload })
export const del = (endpoint) => request(endpoint, { method: 'DELETE' })
