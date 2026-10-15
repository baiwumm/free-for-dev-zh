const DEFAULT_README_URL =
  'https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md'
const DEFAULT_ATOM_URL = 'https://github.com/ripienaar/free-for-dev/commits/master.atom'

/**
 * 拉取上游 README。支持本地文件（测试/离线）与网络两种来源。
 * 网络来源会附带拉取上游最新 commit 信息（GitHub Atom feed，无需 token、不受 API 限流影响）。
 */
export async function fetchUpstream({ readmePath, readmeUrl } = {}) {
  if (readmePath) {
    const { readFile } = await import('node:fs/promises')
    const text = await readFile(readmePath, 'utf8')
    return { text, source: `file:${readmePath}`, sha: null, commitDate: null }
  }

  const url = readmeUrl ?? DEFAULT_README_URL
  const text = await fetchText(url, { attempts: 3 })
  const meta = await fetchCommitMeta().catch(() => ({ sha: null, commitDate: null }))
  return { text, source: url, ...meta }
}

async function fetchText(url, { attempts }) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { 'user-agent': 'free-for-dev-zh-sync' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const text = await res.text()
      if (!text || text.length < 1000) {
        throw new Error(`上游内容异常（长度 ${text.length}），疑似空文件或错误页`)
      }
      return text
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await sleep(1000 * (i + 1))
    }
  }
  throw new Error(`拉取上游 README 失败（已重试 ${attempts} 次）：${lastErr?.message}`)
}

async function fetchCommitMeta() {
  const res = await fetch(DEFAULT_ATOM_URL, {
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'free-for-dev-zh-sync' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const sha = xml.match(/Commit\/([0-9a-f]{40})/)?.[1] ?? null
  const updated = xml.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? null
  return { sha, commitDate: updated }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
