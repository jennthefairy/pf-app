export const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
export const bad = (msg = "Bad Request", code = 400) => json({ error: msg }, { status: code });
