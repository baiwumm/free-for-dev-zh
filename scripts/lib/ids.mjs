import { createHash } from 'node:crypto'

/**
 * URL 归一化：https 化、host 小写、去 fragment、去尾斜杠（根路径除外）。
 * 仅用于生成稳定 ID 与 diff 比对，不改变展示用的原始 URL。
 */
export function normalizeUrl(url) {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    u.host = u.host.toLowerCase()
    if (u.protocol === 'http:') u.protocol = 'https:'
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return url.trim()
  }
}

/**
 * 条目 ID：sha1(归一化 url + "|" + 分类 slug) 前 12 位。
 * 带分类是因为同一 URL 可能出现在多个分类（实测 ipgeolocation.io、codemagic.io）。
 */
export function makeEntryId(url, category) {
  return sha1(`${normalizeUrl(url)}|${category}`)
}

/** 备注（无链接子项）ID：基于父条目 + 文本，父条目缺失时基于分类。 */
export function makeNoteId(parentId, desc, category) {
  return sha1(`note|${parentId ?? ''}|${category ?? ''}|${desc.trim()}`)
}

function sha1(input) {
  return createHash('sha1').update(input, 'utf8').digest('hex').slice(0, 12)
}
