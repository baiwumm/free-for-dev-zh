import { makeEntryId, makeNoteId } from './ids.mjs'
import { slugify } from './slug.mjs'

const LINK_RE = /^\[([^\]]+)\]\(([^)\s]+)\)(.*)$/
const BULLET_RE = /^(\s*)[*-]\s+(.*)$/

/**
 * 状态机解析上游 README。规则（2026-10-15 按真实样本校准，见 docs/02 DS-2）：
 * - 只解析第一个 `##` 标题之后的内容（自动跳过 `# Table of Contents` 段）；
 * - 分类只从 `##` 标题取，slug 作为分类 ID；
 * - 行首 bullet（* 或 -）即条目/备注；缩进 <= 2（含 0）为顶级，>= 4 挂到最近顶级条目；
 * - 描述分隔符兼容 ` - `、`—`（em dash）、无分隔符三种形态；
 * - 无链接的 bullet 作为备注（kind: "note"），挂到最近顶级条目。
 */
export function parseReadme(markdown) {
  const lines = markdown.split(/\r?\n/)
  const categories = []
  const entries = []
  let current = null
  let lastTop = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      const name = h2[1].trim()
      current = { id: slugify(name), nameEn: name }
      categories.push(current)
      lastTop = null
      continue
    }

    // 任意 H1（含 `# Table of Contents`）之后、下一个 `##` 之前的内容全部跳过
    if (/^#\s/.test(line)) {
      current = null
      lastTop = null
      continue
    }

    if (!current) continue

    const bullet = line.match(BULLET_RE)
    if (!bullet) continue
    const indent = bullet[1].length
    const content = bullet[2].trim()
    if (!content) continue

    const link = content.match(LINK_RE)
    if (link) {
      const name = link[1].trim()
      const url = link[2].trim()
      if (!name || !url) continue
      const isTop = indent <= 2
      const rec = {
        kind: 'entry',
        id: makeEntryId(url, current.id),
        name,
        url,
        category: current.id,
        parent: isTop ? null : (lastTop?.id ?? null),
        desc_en: stripLeadingDash(link[3]),
      }
      entries.push(rec)
      if (isTop) lastTop = rec
    } else {
      const rec = {
        kind: 'note',
        id: makeNoteId(lastTop?.id ?? null, content, current.id),
        name: null,
        url: null,
        category: current.id,
        parent: lastTop?.id ?? null,
        desc_en: content,
      }
      entries.push(rec)
    }
  }

  return { categories, entries }
}

/** 去掉描述前的分隔符：` - `、`—`（含直接紧跟 URL 的形态），无分隔符则原样返回。 */
function stripLeadingDash(rest) {
  const t = rest.trim()
  if (!t) return ''
  if (t.startsWith('—') || t.startsWith('–')) return t.slice(1).trim()
  if (t.startsWith('-')) return t.replace(/^-\s*/, '').trim()
  return t
}

/**
 * ID 唯一性断言：同一 ID 出现多次即失败（防静默丢条）。
 * 返回重复 ID 的列表（空数组为通过）。
 */
export function findDuplicateIds(entries) {
  const seen = new Map()
  for (const e of entries) {
    seen.set(e.id, (seen.get(e.id) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
}
