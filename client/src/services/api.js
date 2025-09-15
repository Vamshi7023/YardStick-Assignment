export async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const base = import.meta?.env?.VITE_API_BASE_URL || ''
  const url = `${base}/api${path}`
  const resp = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!resp.ok) {
    const text = await resp.text()
    let data
    try { data = JSON.parse(text) } catch { data = { message: text } }
    const err = new Error(data.error || data.message || `HTTP ${resp.status}`)
    err.status = resp.status
    err.data = data
    throw err
  }
  return resp.json()
}
