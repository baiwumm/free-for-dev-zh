import categoriesData from '../../data/categories.json'
import entriesData from '../../data/entries.json'
import overridesData from '../../data/overrides.json'

export type EntryKind = 'entry' | 'note'

interface RawEntry {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  category: string
  parent: string | null
  desc_en: string
  desc_zh: string | null
  status: 'active' | 'removed'
  first_seen: string
  updated_at: string
}

export interface SiteEntry {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  category: string
  parent: string | null
  descEn: string
  descZh: string | null
  firstSeen: string
  updatedAt: string
}

export interface SiteCategory {
  id: string
  nameEn: string
  nameZh: string
  /** 该分类 active 的链接条目数（不含备注） */
  count: number
}

export interface ExplorerItem {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  domain: string | null
  descEn: string
  descZh: string | null
  /** 0 = 顶级条目，1 = 子条目/备注 */
  depth: number
  childCount: number
}

const overrides = overridesData as Record<string, { desc_zh?: string }>

export const entries: SiteEntry[] = (entriesData.entries as RawEntry[])
  .filter((e) => e.status === 'active')
  .map((e) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    url: e.url,
    category: e.category,
    parent: e.parent,
    descEn: e.desc_en,
    descZh: overrides[e.id]?.desc_zh ?? e.desc_zh,
    firstSeen: e.first_seen,
    updatedAt: e.updated_at,
  }))

export const siteMeta = entriesData.meta

const zhById = new Map(categoriesData.categories.map((c) => [c.id, c.name_zh]))

export const categories: SiteCategory[] = entriesData.categories.map((c) => {
  const inCategory = entries.filter((e) => e.category === c.id)
  return {
    id: c.id,
    nameEn: c.name_en,
    nameZh: zhById.get(c.id) ?? c.name_en,
    count: inCategory.filter((e) => e.kind === 'entry').length,
  }
})

export const categoryById = new Map(categories.map((c) => [c.id, c]))

export const entryById = new Map(
  entries.filter((e) => e.kind === 'entry' && e.url).map((e) => [e.id, e]),
)

export const stats = {
  services: entries.filter((e) => e.kind === 'entry').length,
  notes: entries.filter((e) => e.kind === 'note').length,
  categories: categories.length,
  translated: entries.filter((e) => e.descZh).length,
  total: entries.length,
}

export interface RecentUpdate {
  /** 窗口内发生变化的条目总数 */
  total: number
  added: number
  updated: number
  /** 按更新时间降序、用于展示的条目（最多 limit 条） */
  items: SiteEntry[]
}

/** 近 N 天新增 / 更新速览（以站点同步日期为基准，构建期确定，跨构建稳定）。 */
export function getRecentUpdates(days = 7, limit = 3): RecentUpdate {
  const anchor = siteMeta.synced_at.slice(0, 10)
  const since = new Date(Date.parse(`${anchor}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
  const changed = entries.filter(
    (e) => e.kind === 'entry' && e.name !== null && e.updatedAt >= since,
  )
  const added = changed.filter((e) => e.firstSeen >= since).length
  const items = [...changed].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit)
  return { total: changed.length, added, updated: changed.length - added, items }
}

export function domainOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** 分类页数据：顶级条目按上游顺序，子条目/备注紧随其父。 */
export function getExplorerItems(categoryId: string): ExplorerItem[] | null {
  if (!categoryById.has(categoryId)) return null
  const inCategory = entries.filter((e) => e.category === categoryId)
  const childrenOf = new Map<string, SiteEntry[]>()
  for (const e of inCategory) {
    if (!e.parent) continue
    const list = childrenOf.get(e.parent) ?? []
    list.push(e)
    childrenOf.set(e.parent, list)
  }

  const items: ExplorerItem[] = []
  for (const top of inCategory.filter((e) => !e.parent)) {
    const children = childrenOf.get(top.id) ?? []
    items.push(toItem(top, 0, children.length))
    for (const child of children) {
      items.push(toItem(child, 1, 0))
    }
  }
  return items
}

function toItem(e: SiteEntry, depth: number, childCount: number): ExplorerItem {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    url: e.url,
    domain: domainOf(e.url),
    descEn: e.descEn,
    descZh: e.descZh,
    depth,
    childCount,
  }
}

/** 详情页的上下文：所属分类、（可选）父条目。 */
export function getEntryContext(id: string): {
  entry: SiteEntry
  category: SiteCategory
  parent: SiteEntry | null
} | null {
  const entry = entryById.get(id)
  if (!entry) return null
  const category = categoryById.get(entry.category)
  if (!category) return null
  const parent = entry.parent ? (entryById.get(entry.parent) ?? null) : null
  return { entry, category, parent }
}

/** 父条目下的 note 子项：上游用缩进备注给出的免费额度明细。 */
export function getEntryNotes(parentId: string): SiteEntry[] {
  return entries.filter((e) => e.kind === 'note' && e.parent === parentId)
}

/** 同分类相关条目：优先同父兄弟，其次同分类顶级条目，数量固定以保证构建稳定。 */
export function getRelatedEntries(id: string, limit = 4): SiteEntry[] {
  const entry = entryById.get(id)
  if (!entry) return []
  const pool = [...entryById.values()].filter((e) => e.category === entry.category && e.id !== id)
  const siblings = pool.filter((e) => entry.parent !== null && e.parent === entry.parent)
  const rest = pool.filter((e) => !siblings.includes(e))
  const ordered = [
    ...siblings,
    ...rest.filter((e) => e.parent === null),
    ...rest.filter((e) => e.parent !== null),
  ]
  return ordered.slice(0, limit)
}

/** 元描述用：去掉 markdown 行内语法（链接、代码、加粗）并压缩空白。 */
export function plainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 按字符截断，尽量不把英文单词或收尾标点留在断口。 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/[\s(（,，、;；:：—–-]+$/, '')}…`
}

/**
 * 条目 meta description：英文/中文原文先转纯文本；过短或无描述时用
 * 「名称 + 分类 + 同步说明」补足，控制在 80–158 字符。
 */
export function entryDescription(entry: SiteEntry, category: SiteCategory, noteCount = 0): string {
  const rawText = plainText(entry.descZh ?? entry.descEn)
  const raw = rawText && !/[。.!！?？]$/.test(rawText) ? `${rawText}。` : rawText
  if (raw.length >= 80) return truncate(raw, 150)
  const notes = noteCount > 0 ? `，附 ${noteCount} 项免费额度明细` : ''
  const tail = `${entry.name ?? '该服务'} 是免费资源清单「${category.nameZh}（${category.nameEn}）」分类收录的开发者免费资源${notes}，中文说明每日自动同步自 free-for-dev 上游清单。`
  return truncate(`${raw}${tail}`, 150)
}

/** 分类页 meta description。 */
export function categoryDescription(category: SiteCategory): string {
  return `free-for-dev 中文版「${category.nameZh}」分类：收录 ${category.count} 个 ${category.nameEn} 方向的免费开发服务与资源，附中文说明与上游免费额度，支持页内筛选与站内搜索，每日自动同步上游清单。`
}

/** 标题保持唯一且为模板后缀留余量（` | 免费开发资源` 共 9 字符）。 */
export function entryTitle(entry: SiteEntry, category: SiteCategory): string {
  const combined = `${entry.name} —— ${category.nameZh}`
  return combined.length <= 48 ? combined : (entry.name ?? '')
}

export function categoryTitle(category: SiteCategory): string {
  const combined = `${category.nameZh} · ${category.nameEn}`
  return combined.length <= 48 ? combined : category.nameZh
}

/** 搜索索引（构建期生成，/search-index.json 静态输出）。 */
export interface SearchRecord {
  id: string
  n: string
  u: string
  c: string
  cz: string
  d: string
}

export function buildSearchIndex(): SearchRecord[] {
  return entries
    .filter((e) => e.kind === 'entry' && e.url)
    .map((e) => ({
      id: e.id,
      n: e.name ?? '',
      u: e.url ?? '',
      c: e.category,
      cz: categoryById.get(e.category)?.nameZh ?? '',
      d: (e.descZh ?? e.descEn).slice(0, 96),
    }))
}
