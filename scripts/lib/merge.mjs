import { normalizeText } from './diff.mjs'

/**
 * 合并本次解析结果与上一版数据：
 * - active 条目按上游文档顺序输出；
 * - first_seen 沿用首次出现日期；
 * - 描述未变时沿用旧译文（desc_zh），变了则置空待重翻；
 * - 上一版 active 但本次消失的条目降级为 removed（保留在数据中，不展示）。
 */
export function mergeEntries(parsed, previous, today) {
  const prevById = new Map((previous?.entries ?? []).map((e) => [e.id, e]))
  const seen = new Set()
  const out = []

  for (const rec of parsed.entries) {
    seen.add(rec.id)
    const prev = prevById.get(rec.id)
    const changed =
      !!prev &&
      (normalizeText(prev.desc_en) !== normalizeText(rec.desc_en) ||
        (prev.name ?? null) !== (rec.name ?? null))
    out.push({
      id: rec.id,
      kind: rec.kind,
      name: rec.name,
      url: rec.url,
      category: rec.category,
      parent: rec.parent,
      desc_en: rec.desc_en,
      desc_zh: changed ? null : (prev?.desc_zh ?? null),
      status: 'active',
      first_seen: prev?.first_seen ?? today,
      updated_at: changed ? today : (prev?.updated_at ?? today),
    })
  }

  for (const prev of previous?.entries ?? []) {
    if (seen.has(prev.id)) continue
    out.push(prev.status === 'active' ? { ...prev, status: 'removed', updated_at: today } : prev)
  }

  return out
}
