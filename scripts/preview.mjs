#!/usr/bin/env node
/**
 * 本地预览 `out/` 静态产物（`pnpm preview`，需先 `pnpm build`）。
 *
 * 只做一件事：按 EdgeOne Pages 的实际解析规则把 URL 映射到 out/ 下的文件——
 * `/docs` → docs.html → docs/index.html，带尾斜杠的路径不做补全（线上同样 404），
 * 未命中则返回 404.html 且状态码为 404。托管本身由 EdgeOne Pages 的 Git 集成完成，
 * 仓库内不再有部署脚本。
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'out')
const port = Number(process.argv.find((a) => a.startsWith('--port='))?.slice(7)) || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

if (!existsSync(join(outDir, 'index.html'))) {
  console.error('缺少 out/index.html，请先执行 pnpm build')
  process.exit(1)
}

/** URL 路径 → out/ 下的候选文件；越界或非文件返回 null */
function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '')
  const abs = join(outDir, rel)
  if (abs !== outDir && !abs.startsWith(outDir + sep)) return null
  const candidates = [abs, `${abs}.html`, join(abs, 'index.html')]
  for (const file of candidates) {
    if (existsSync(file) && statSync(file).isFile()) return file
  }
  return null
}

const notFound = join(outDir, '404.html')

createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname
  const file = urlPath === '/' ? join(outDir, 'index.html') : resolveFile(urlPath)

  if (!file) {
    if (!existsSync(notFound)) {
      res.writeHead(404).end('Not Found')
      return
    }
    res.writeHead(404, { 'Content-Type': MIME['.html'] })
    createReadStream(notFound).pipe(res)
    return
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`预览 out/：http://localhost:${port}（Ctrl+C 停止）`)
})
