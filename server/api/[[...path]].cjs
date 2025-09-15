export async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const BASE_URL = "https://yardstick-assignment-9nqx.onrender.com";

  const resp = await fetch(${BASE_URL}/api${path}, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    const err = new Error(data.error || data.message || HTTP ${resp.status});
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return resp.json();
}
