/** 空白归一化：diff 与哈希比对前统一（避免上游空格/换行微调触发无谓翻译）。 */
export function normalizeText(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * DS-5 差异比对：按条目 ID（归一化 URL + 分类）分三组。
 * - added：本次新解析出、上一版不存在（或此前为 removed）的条目；
 * - changed：ID 相同但名称或描述（空白归一化后）变化的条目；
 * - removed：上一版 active 但本次未出现（或解析缺失）的条目。
 */
export function diffEntries(previous, parsed) {
  const prevActive = new Map(
    (previous?.entries ?? []).filter((e) => e.status === 'active').map((e) => [e.id, e]),
  )
  const seen = new Set()
  const added = []
  const changed = []

  for (const rec of parsed.entries) {
    seen.add(rec.id)
    const prev = prevActive.get(rec.id)
    if (!prev) {
      added.push(rec)
      continue
    }
    const contentChanged =
      normalizeText(prev.desc_en) !== normalizeText(rec.desc_en) ||
      (prev.name ?? null) !== (rec.name ?? null)
    if (contentChanged) changed.push({ rec, prev })
  }

  const removed = [...prevActive.values()].filter((e) => !seen.has(e.id))
  return { added, changed, removed }
}
