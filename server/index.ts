import { handleApiRequest } from './handlers'

const PORT = Number(process.env.PORT) || 3000

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // API routes
    if (url.pathname.startsWith('/api/')) {
      let params: Record<string, unknown> = {}
      if (req.method === 'POST') {
        try {
          params = (await req.json()) as Record<string, unknown>
        } catch {
          params = {}
        }
      }

      const result = await handleApiRequest(url.pathname, req.method, params)
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Static files from dist/
    const filePath = url.pathname === '/' ? '/index.html' : url.pathname
    const file = Bun.file(`./dist${filePath}`)

    if (await file.exists()) {
      return new Response(file)
    }

    // SPA fallback - serve index.html for all unmatched routes
    return new Response(Bun.file('./dist/index.html'))
  },
})

console.log(`Social Publisher server running on http://localhost:${server.port}`)
