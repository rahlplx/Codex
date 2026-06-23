export interface CallRecord {
  ts: string
  method: string
  url: string
  reqBody: unknown
  status: number
  resBody: unknown
  latencyMs: number
  headers: Record<string, string>
}

export class SimClient {
  readonly baseUrl: string
  readonly calls: CallRecord[] = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request(
    method: string,
    path: string,
    opts: { body?: unknown; token?: string } = {},
  ): Promise<{ status: number; body: unknown; headers: Headers; text: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`

    const start = Date.now()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
    const latencyMs = Date.now() - start
    const text = await res.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text }

    const resHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { resHeaders[k] = v })

    this.calls.push({
      ts: new Date().toISOString(),
      method,
      url: path,
      reqBody: opts.body,
      status: res.status,
      resBody: body,
      latencyMs,
      headers: resHeaders,
    })

    return { status: res.status, body, headers: res.headers, text }
  }

  get(path: string, token?: string) { return this.request('GET', path, { token }) }
  post(path: string, body: unknown, token?: string) { return this.request('POST', path, { body, token }) }
  patch(path: string, body: unknown, token?: string) { return this.request('PATCH', path, { body, token }) }
  put(path: string, body: unknown, token?: string) { return this.request('PUT', path, { body, token }) }
  delete(path: string, token?: string) { return this.request('DELETE', path, { token }) }
}
