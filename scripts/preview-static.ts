import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript',
  '.css': 'text/css', '.txt': 'text/plain', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
}

export function createPreviewServer(directory = 'out') {
  const root = path.resolve(directory)
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end()
      return
    }
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const relative = decodeURIComponent(url.pathname).replace(/^\/market-ai-horizon(?=\/|$)/, '')
      let target = path.resolve(root, `.${relative || '/'}`)
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end()
        return
      }
      try {
        if ((await stat(target)).isDirectory()) {
          const index = path.join(target, 'index.html')
          try {
            await stat(index)
            target = index
          } catch {
            target += '.html'
          }
        }
      } catch {
        target += '.html'
      }
      const body = await readFile(target)
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream' })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.argv.find((argument) => argument.startsWith('--port='))?.split('=')[1] ?? 3010)
  void stat('out/index.html').then(() => {
    createPreviewServer().listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}/market-ai-horizon/`))
  }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}